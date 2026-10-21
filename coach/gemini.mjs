// Client minimal de l'API Gemini (Google) : lecture de vidéos YouTube publiques et sorties JSON.
// Clé : GEMINI_API_KEY (fichier .env local, ou secret du workflow). Repli sur le modèle suivant si un modèle est saturé ou retiré.

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const wait = ms => new Promise(r => setTimeout(r, ms));

export const hasGeminiKey = () => !!process.env.GEMINI_API_KEY?.trim();

export async function countTokens(model, parts) {
  const r = await fetch(`${API}/${model}:countTokens`, { method: "POST", headers: headers(), body: JSON.stringify({ contents: [{ parts }] }) });
  const j = await r.json();
  if (!r.ok) throw new Error(`countTokens ${r.status} : ${j.error?.message || ""}`);
  return j.totalTokens;
}
const headers = () => ({ "x-goog-api-key": process.env.GEMINI_API_KEY.trim(), "content-type": "application/json" });

// parts : [{ fileData: { fileUri } }, { text }] ; schema : JSON Schema de la réponse
export async function gemini({ models, parts, system, schema, maxOutputTokens = 32000, timeoutMs = 600000 }) {
  let last = null;
  if (models.every(m => quotaHit.has(m))) throw new QuotaError();
  for (const model of models.filter(m => !quotaHit.has(m))) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const body = {
        contents: [{ role: "user", parts }],
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: { responseMimeType: "application/json", ...(schema ? { responseJsonSchema: schema } : {}), maxOutputTokens, temperature: 0.2 },
      };
      let r, j;
      try {
        r = await fetch(`${API}/${model}:generateContent`, { method: "POST", headers: headers(), body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
        j = await r.json();
      } catch (e) { last = new Error(`${model} : ${e.message}`); await wait(5000); continue; }
      if (r.ok) {
        const c = j.candidates?.[0];
        if (!c || c.finishReason === "SAFETY" || c.finishReason === "PROHIBITED_CONTENT") throw new Error(`${model} : réponse refusée (${c?.finishReason || "vide"})`);
        if (c.finishReason === "MAX_TOKENS") throw new Error(`${model} : réponse tronquée`);
        const text = (c.content?.parts || []).filter(p => !p.thought).map(p => p.text || "").join("");
        return { json: JSON.parse(text), model, usage: j.usageMetadata || {} };
      }
      last = new Error(`${model} HTTP ${r.status} : ${j.error?.message || ""}`);
      if (r.status === 404) break;                       // modèle retiré : suivant
      // Quota journalier épuisé : inutile de réessayer ce modèle aujourd'hui, on passe au suivant
      if (r.status === 429 && /quota|billing|free_tier/i.test(j.error?.message || "")) { quotaHit.add(model, j.error?.message); break; }
      if (r.status === 429 || r.status >= 500) { await wait([5000, 20000, 45000][attempt]); continue; }
      throw last;                                          // 400, 403 : inutile d'insister
    }
  }
  if (models.every(m => quotaHit.has(m))) throw new QuotaError();
  // Modèles saturés (503) ou à quota épuisé, sans autre erreur : indisponibilité passagère, pas un échec du contenu
  if (last && /HTTP (429|503)\b/.test(last.message) && models.some(m => quotaHit.has(m))) throw Object.assign(new QuotaError(), { message: `Gemini indisponible (quota ou saturation) : ${last.message.slice(0, 80)}` });
  throw last || new Error("aucun modèle Gemini disponible");
}

// Quota gratuit épuisé sur tous les modèles : ce n'est pas un échec du contenu, on s'arrête jusqu'au lendemain
// Un serveur qui tourne plusieurs jours doit oublier le quota épuisé à sa remise à zéro : délai annoncé par Google (« retry in 6h51m38s »), sinon 1 h
export const quotaHit = {
  until: new Map(),
  has(model) { const t = this.until.get(model); if (t && t <= Date.now()) this.until.delete(model); return this.until.has(model); },
  add(model, message = "") {
    const m = String(message).match(/retry in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i);
    const ms = m && (m[1] || m[2] || m[3]) ? ((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0)) * 1000 : 3600e3;
    this.until.set(model, Date.now() + ms);
  },
};
export class QuotaError extends Error {
  constructor() { super("quota gratuit de Gemini épuisé pour aujourd'hui (environ 20 requêtes par jour et par modèle) : reprise au prochain passage après sa remise à zéro"); this.quota = true; }
}
