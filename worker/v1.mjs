// Routes /api/v1 du coach dans le Worker Cloudflare (COACH-004) : mêmes routes métier que le serveur local
// (coach/v1/api.mjs), stockage Supabase, et ce que le serveur local n'a pas besoin de faire :
//   - jeton Supabase vérifié auprès de Supabase (/auth/v1/user) pour toute route sauf /health ;
//   - autorisation par ressource : un utilisateur n'agit que sur ses propres joueurs, synchronisations et questions ;
//   - quotas par utilisateur et par jour (synchronisations, questions au tuteur) et par adresse IP ;
//   - CORS limité au site ; journaux sans secret ni jeton.
// Mode test privé (par défaut, correctifs du 26/10/2026) : seuls les volontaires inscrits dans pilot_testers, non révoqués,
// utilisent le coach (403 sinon). COACH_ACCESS = "public" lèvera cette limite, après la clé de production et RSO.
// Inscription : POST /api/v1/pilot/join avec le code d'invitation (secret PILOT_CODE), l'âge et l'accord ; GET /api/v1/pilot/me.
// Secrets du Worker : RIOT_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, PILOT_CODE, GEMINI_API_KEY (facultatif).
// Limite connue : quotas et limite de débit Riot tenus en mémoire par instance du Worker ; un Durable Object les rendra
// globaux avant l'ouverture publique.
// Liaison compte MINDIFF ↔ compte Riot : la première personne qui résout un Riot ID le lie à son compte. En production,
// cette liaison doit passer par Riot Sign-On (RSO) : sans lui, rien ne prouve que la personne possède ce compte Riot.

import { handleV1, syncWorker } from "../coach/v1/api.mjs";
import { createRiotV1 } from "../coach/v1/riot.mjs";
import { METRIC_VERSION } from "../coach/metrics.mjs";
import { createSupabaseRest, createSupabaseStore } from "../coach/v1/store-supabase.mjs";

export const ORIGINS = ["https://anthonyloquet96-source.github.io", "http://localhost:3000"];
export const QUOTAS = { sync: 20, chat: 20, resolve: 30, join: 5, ipPer5min: 120 };
// Version des conditions du test privé acceptées à l'inscription (texte affiché par coach2.js)
const TIER_LABEL = { IRON: "Fer", BRONZE: "Bronze", SILVER: "Argent", GOLD: "Or", PLATINUM: "Platine", EMERALD: "Émeraude", DIAMOND: "Diamant", MASTER: "Maître", GRANDMASTER: "Grand Maître", CHALLENGER: "Challenger" };
export const CONSENT_VERSION = "test-prive-2026-10-27";
const json = (status, body, cors) => new Response(body == null ? null : JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const err = (status, code, message, cors) => json(status, { error: { code, message } }, cors);

// Jeton Supabase vérifié par Supabase lui-même : identifiant, undefined sans jeton, null si refusé
export async function userId(request, env, fetchImpl = fetch) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !env.SUPABASE_URL) return undefined;
  const who = await fetchImpl(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  return who?.id || null;
}
export const tester = async (rest, uid) => (await rest.rest("GET", `pilot_testers?user_id=eq.${encodeURIComponent(uid)}&select=user_id,revoked_at`).catch(() => []))?.[0] || null;
// Ancien coach (/api/coach) pendant le test privé : mêmes conditions que /api/v1 (volontaire connecté et inscrit)
export async function isTester(request, env, { fetchImpl = fetch, sb = null } = {}) {
  const uid = await userId(request, env, fetchImpl);
  if (!uid) return false;
  const t = await tester(sb || createSupabaseRest({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_KEY, fetchImpl }), uid);
  return !!t && !t.revoked_at;
}

export function createV1Worker({ fetchImpl = fetch, now = () => Date.now(), sb = null, log = console.log } = {}) {
  const counters = new Map();
  const hit = (key, limit, windowMs) => {
    const t = now(), list = (counters.get(key) || []).filter(x => t - x < windowMs);
    if (list.length >= limit) { counters.set(key, list); return false; }
    list.push(t); counters.set(key, list);
    if (counters.size > 20000) counters.clear();
    return true;
  };
  let refsCache = null;
  return async function handle(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = { "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0], "Access-Control-Allow-Methods": "GET, POST, DELETE", "Access-Control-Allow-Headers": "Authorization, Content-Type", Vary: "Origin" };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (url.pathname === "/api/v1/health") return json(200, { ok: true, riot: !!env.RIOT_API_KEY, supabase: !!env.SUPABASE_URL }, cors);
    const ip = request.headers.get("CF-Connecting-IP") || "?";
    if (!hit(`ip:${ip}`, QUOTAS.ipPer5min, 300000)) return err(429, "trop-de-demandes", "Trop de demandes : réessaie dans quelques minutes.", cors);
    const uid = await userId(request, env, fetchImpl);
    if (!uid) return err(401, uid === null ? "jeton-invalide" : "non-connecte", uid === null ? "Session expirée : reconnecte-toi." : "Connexion requise.", cors);
    const rest = sb || createSupabaseRest({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_KEY, fetchImpl });
    let body = null;
    if (request.method === "POST") { try { body = await request.json(); } catch { body = null; } }
    // Inscription au test privé : code d'invitation (secret PILOT_CODE), accord et âge confirmés par le volontaire
    if (url.pathname === "/api/v1/pilot/me") { const t = await tester(rest, uid); return json(200, { tester: !!t && !t.revoked_at, revoked: !!t?.revoked_at, consent_version: CONSENT_VERSION }, cors); }
    if (url.pathname === "/api/v1/pilot/join" && request.method === "POST") {
      if (!hit(`join:${uid}`, QUOTAS.join, 864e5)) return err(429, "quota-invitation", "Trop d'essais aujourd'hui : redemande le code à la personne qui t'a invité.", cors);
      if (!env.PILOT_CODE || String(body?.code || "").trim().toUpperCase() !== String(env.PILOT_CODE).toUpperCase()) return err(403, "code-invalide", "Code d'invitation incorrect.", cors);
      if (body?.age_confirmed !== true || body?.consent_version !== CONSENT_VERSION) return err(400, "accord-requis", "Il faut confirmer ton âge et accepter les conditions du test.", cors);
      const t = await tester(rest, uid);
      if (t?.revoked_at) return err(403, "test-quitte", "Tu as quitté le test : demande à la personne qui t'a invité pour revenir.", cors);
      if (!t) await rest.rest("POST", "pilot_testers", { body: { user_id: uid, invited_by: "code", consent_at: new Date(now()).toISOString(), consent_version: CONSENT_VERSION, age_confirmed: true } });
      return json(200, { tester: true }, cors);
    }
    if (env.COACH_ACCESS !== "public") {
      const t = await tester(rest, uid);
      if (!t || t.revoked_at) return err(403, "test-prive", "Le coach est en test privé, sur invitation.", cors);
    }
    const store = createSupabaseStore(rest);
    // Autorisation par ressource
    const pm = url.pathname.match(/^\/api\/v1\/players\/([0-9a-f-]{36})(\/|$)/);
    const jm = url.pathname.match(/^\/api\/v1\/jobs\/([0-9a-f-]{36})$/);
    const owned = async playerId => { const p = await store.getPlayer(playerId); return p && p.user_id === uid ? p : null; };
    if (pm && !(await owned(pm[1]))) return err(404, "joueur-inconnu", "Joueur inconnu.", cors);
    if (jm) { const j = await store.getJob(jm[1]); if (!j || !(await owned(j.player_id))) return err(404, "introuvable", "Synchronisation inconnue.", cors); }
    if (url.pathname === "/api/v1/coach/chat") {
      if (!body?.player_id || !(await owned(String(body.player_id)))) return err(404, "joueur-inconnu", "Joueur inconnu.", cors);
      if (!hit(`chat:${uid}`, QUOTAS.chat, 864e5)) return err(429, "quota-tuteur", `Limite de ${QUOTAS.chat} questions par jour atteinte.`, cors);
    }
    if (pm && url.pathname.endsWith("/sync") && !hit(`sync:${uid}`, QUOTAS.sync, 864e5)) return err(429, "quota-sync", `Limite de ${QUOTAS.sync} mises à jour par jour atteinte.`, cors);
    // Résolution : liaison au compte de l'utilisateur, refusée si le Riot ID est déjà lié à quelqu'un d'autre
    const resolving = url.pathname === "/api/v1/players/resolve";
    if (resolving && !hit(`resolve:${uid}`, QUOTAS.resolve, 864e5)) return err(429, "quota-resolve", "Trop de recherches de comptes aujourd'hui.", cors);
    const linkStore = resolving ? { ...store, async upsertPlayer(p) {
      const existing = await store.findPlayerByPuuid(p.puuid);
      if (existing?.user_id && existing.user_id !== uid) throw Object.assign(new Error("Ce compte Riot est déjà lié à un autre compte MINDIFF."), { code: "compte-deja-lie", status: 403 });
      return store.upsertPlayer({ ...p, user_id: uid });
    } } : store;
    // Repères par rang (test privé, décision d'Anthony du 27/10) : { MASTER: { BOTTOM: { cs_at_10: {…} } } } ; le joueur vise le rang au-dessus du sien
    if (!refsCache) refsCache = await rest.rest("GET", `metric_references?metric_version=eq.${METRIC_VERSION}&select=*`).then(rows => rows.filter(r => TIER_LABEL[r.level]).reduce((m, r) => ((((m[r.level] ||= {})[r.role] ||= {})[r.metric] = { n: r.n, p25: Number(r.p25), p50: Number(r.p50), p75: Number(r.p75), level: TIER_LABEL[r.level] }), m), {})).catch(() => null);
    const riot = env.RIOT_API_KEY ? createRiotV1(env.RIOT_API_KEY, { fetchImpl }) : null;
    // 3 parties par requête : environ 25 appels sortants, sous la limite de 50 du Worker gratuit
    const v1ctx = { store: linkStore, riot, references: refsCache, syncBudget: 3 };
    // Synchronisation après la réponse (202), sans bloquer le joueur
    v1ctx.queue = { push: job => ctx.waitUntil(syncWorker(v1ctx)(job)) };
    const r = await handleV1({ method: request.method, path: url.pathname, query: Object.fromEntries(url.searchParams), body }, v1ctx);
    log(JSON.stringify({ route: url.pathname.replace(/[0-9a-f-]{36}/g, ":id"), status: r.status })); // ni jeton ni identifiant
    return json(r.status, r.body, cors);
  };
}
