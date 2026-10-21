// API du coach (profil et bilan de partie), commune au serveur local et au service en ligne (Cloudflare Worker).
// La clé Riot ne quitte jamais le serveur ; les réponses ne contiennent que des données de jeu publiques.
//   GET /api/coach/profile?id=Pseudo%23TAG&platform=euw1
//   GET /api/coach/review?match=EUW1_123&puuid=…&platform=euw1
//   GET /api/coach/live?puuid=…&platform=euw1       partie en cours (rôles estimés)
//   GET /api/coach/champion?id=Ahri                  objets, runes, sorts Diamant+ (au moins 30 parties)

import { createRiot, profile, review, live, championCard, parseRiotId, PLATFORMS } from "./review.mjs";

let riot = null, riotKey = null;
const hits = new Map(); // limite par visiteur : 30 requêtes par 5 minutes

export async function coachApi(path, params, { key, benchmarks, champstats, visitor = "?" }) {
  if (!key) return { status: 503, body: { error: "Service Riot non configuré : la connexion des comptes arrive bientôt." } };
  if (key !== riotKey) { riot = createRiot(key); riotKey = key; }
  const now = Date.now();
  const h = (hits.get(visitor) || []).filter(t => now - t < 300e3);
  if (h.length >= 30) return { status: 429, body: { error: "Trop de demandes : réessayez dans quelques minutes." } };
  hits.set(visitor, [...h, now]);
  if (hits.size > 5000) hits.clear();
  const platform = String(params.get("platform") || "euw1").toLowerCase();
  if (!PLATFORMS[platform]) return { status: 400, body: { error: "Région inconnue." } };
  try {
    if (path === "/api/coach/profile") {
      const id = parseRiotId(params.get("id"));
      if (!id) return { status: 400, body: { error: "Riot ID attendu sous la forme Pseudo#TAG." } };
      return { status: 200, body: await profile(riot, { ...id, platform, benchmarks }) };
    }
    if (path === "/api/coach/live") {
      const puuid = String(params.get("puuid") || "");
      if (!/^[\w-]{40,90}$/.test(puuid)) return { status: 400, body: { error: "Joueur invalide." } };
      return { status: 200, body: await live(riot, { puuid, platform, champstats }) };
    }
    if (path === "/api/coach/champion") {
      const id = String(params.get("id") || "");
      const c = Object.values(champstats?.champions || {}).find(x => x.name === id);
      return { status: 200, body: await championCard(c, champstats) };
    }
    if (path === "/api/coach/review") {
      const matchId = String(params.get("match") || ""), puuid = String(params.get("puuid") || "");
      if (!/^[A-Z0-9]+_\d+$/.test(matchId) || !/^[\w-]{40,90}$/.test(puuid)) return { status: 400, body: { error: "Partie ou joueur invalide." } };
      return { status: 200, body: await review(riot, { matchId, puuid, region: PLATFORMS[platform][0], benchmarks, champstats }) };
    }
    return { status: 404, body: { error: "Introuvable" } };
  } catch (e) {
    const status = e.status === 404 ? 404 : e.status === 429 ? 429 : e.status === 400 ? 400 : 502;
    return { status, body: { error: e.status === 404 ? (path.endsWith("profile") ? `Aucun compte « ${params.get("id")} ». Vérifie l'orthographe exacte et le TAG après le # (visible sous ton pseudo dans le client, par exemple #EUW ou #1234).` : "Partie introuvable.") : e.message } };
  }
}
