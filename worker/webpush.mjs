// Web Push sans bibliothèque (Cloudflare Workers et Node, WebCrypto) : chiffrement aes128gcm (RFC 8291 / RFC 8188)
// et identification du serveur par VAPID (RFC 8292). Vérifié sur le vecteur de test de la RFC 8291 (coach/tests/run.mjs).
// Clés VAPID : secrets du Worker VAPID_PUBLIC_KEY (point P-256 non compressé, 65 octets) et VAPID_PRIVATE_KEY (32 octets),
// en base64url ; générées une fois par worker/vapid-keys.mjs, jamais dans le dépôt.

const te = new TextEncoder();
export const b64u = {
  enc: bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0)),
};
const cat = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let i = 0; for (const p of parts) { out.set(p, i); i += p.length; } return out; };
const hmac = async (key, data) => new Uint8Array(await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), data));
// Clé privée P-256 depuis d (32 octets) et le point public (65 octets)
const jwk = (pub, d) => ({ kty: "EC", crv: "P-256", x: b64u.enc(pub.slice(1, 33)), y: b64u.enc(pub.slice(33, 65)), ...(d ? { d: b64u.enc(d) } : {}) });

// Corps chiffré pour un abonnement { keys: { p256dh, auth } } ; test : clé éphémère et sel imposés
export async function encrypt(payload, sub, { asPublic, asPrivate, salt } = {}) {
  const ua = b64u.dec(sub.keys.p256dh), auth = b64u.dec(sub.keys.auth);
  let asPriv, asPub;
  if (asPrivate) {
    asPub = asPublic;
    asPriv = await crypto.subtle.importKey("jwk", jwk(asPublic, asPrivate), { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
  } else {
    const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    asPriv = kp.privateKey; asPub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  }
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asPriv, 256));
  const ikm = await hmac(await hmac(auth, ecdh), cat(te.encode("WebPush: info\0"), ua, asPub, new Uint8Array([1])));
  salt ||= crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, te.encode("Content-Encoding: aes128gcm\0\x01"))).slice(0, 16);
  const nonce = (await hmac(prk, te.encode("Content-Encoding: nonce\0\x01"))).slice(0, 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const body = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, cat(te.encode(payload), new Uint8Array([2]))));
  // En-tête : sel, taille d'enregistrement (4096), longueur de la clé, clé publique éphémère
  return cat(salt, new Uint8Array([0, 0, 16, 0, 65]), asPub, body);
}

// En-tête Authorization VAPID pour le service de push de l'abonnement (jeton valable 12 h)
export async function vapidHeader(endpoint, { publicKey, privateKey, subject }) {
  const pub = b64u.dec(publicKey);
  const key = await crypto.subtle.importKey("jwk", jwk(pub, b64u.dec(privateKey)), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const part = o => b64u.enc(te.encode(JSON.stringify(o)));
  const unsigned = `${part({ typ: "JWT", alg: "ES256" })}.${part({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })}`;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(unsigned));
  return `vapid t=${unsigned}.${b64u.enc(sig)}, k=${publicKey}`;
}

// Envoi : statut du service de push (201 reçu ; 404 et 410 = abonnement expiré, à supprimer)
export async function sendPush(sub, message, vapid, { ttl = 600, urgency = "high", fetchImpl = fetch } = {}) {
  const body = await encrypt(JSON.stringify(message), sub);
  const r = await fetchImpl(sub.endpoint, {
    method: "POST", body,
    headers: { Authorization: await vapidHeader(sub.endpoint, vapid), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: String(ttl), Urgency: urgency },
  });
  return r.status;
}
