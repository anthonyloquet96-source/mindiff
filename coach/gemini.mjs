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
  for (const model of models) {
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
      if (r.status === 429 || r.status >= 500) { await wait([5000, 20000, 45000][attempt]); continue; }
      throw last;                                          // 400, 403 : inutile d'insister
    }
  }
  throw last || new Error("aucun modèle Gemini disponible");
}
