// API du coach (profil et bilan de partie), commune au serveur local et au service en ligne (Cloudflare Worker).
// La clé Riot ne quitte jamais le serveur ; les réponses ne contiennent que des données de jeu publiques.
//   GET /api/coach/profile?id=Pseudo%23TAG&platform=euw1
//   GET /api/coach/review?match=EUW1_123&puuid=…&platform=euw1
//   GET /api/coach/live?puuid=…&platform=euw1       partie en cours (rôles estimés)
//   GET /api/coach/champion?id=Ahri                  objets, runes, sorts Diamant+ (au moins 30 parties)

//   GET /api/coach/draft?me=mid:Ahri&allies=top:Garen,…&enemies=mid:Zed,…&pool=Ahri,Syndra   matchups, bot lane, compositions, pool
//   GET /api/coach/report?puuid=…&platform=euw1&role=mid (ou &champion=Ahri)   bilan général : jusqu'à 20 parties relues, choisies parmi les 40 (60 pour un champion) dernières

import { createRiot, profile, review, live, championCard, parseRiotId, PLATFORMS, ddChampions, report } from "./review.mjs";
import { analyzeDraft } from "./draft.mjs";

const ROLES = ["top", "jungle", "mid", "bottom", "support"];
// Draft : identifiants Data Dragon (« Ahri ») ↔ numéros des agrégats
async function draftApi(params, matchups) {
  const dd = await ddChampions();
  const byName = Object.fromEntries(Object.entries(dd).map(([k, v]) => [v.id.toLowerCase(), k]));
  const parse = s => String(s || "").split(",").filter(Boolean).slice(0, 10).map(x => {
    const [role, name] = x.includes(":") ? x.split(":") : [null, x];
    return { role: ROLES.includes(role) ? role : null, c: byName[String(name).toLowerCase()] || null };
  }).filter(x => x.c);
  const me = parse(params.get("me"))[0] || null;
  const res = analyzeDraft(matchups, { allies: parse(params.get("allies")).slice(0, 5), enemies: parse(params.get("enemies")).slice(0, 5), me, pool: parse(params.get("pool")).map(x => x.c) });
  const name = c => dd[c]?.id || String(c);
  const rename = o => (Array.isArray(o) ? o.map(rename) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, ["ally", "enemy", "c"].includes(k) ? name(v) : rename(v)])) : o);
  return rename(res);
}

let riot = null, riotKey = null;
const hits = new Map(); // limite par visiteur : 30 requêtes par 5 minutes

export async function coachApi(path, params, { key, benchmarks, champstats, matchups = null, visitor = "?" }) {
  const now = Date.now();
  const h = (hits.get(visitor) || []).filter(t => now - t < 300e3);
  // La draft ne coûte aucune requête Riot : limite plus large
  const cap = path === "/api/coach/draft" ? 120 : 30;
  if (h.length >= cap) return { status: 429, body: { error: "Trop de demandes : réessayez dans quelques minutes." } };
  hits.set(visitor, [...h, now]);
  if (hits.size > 5000) hits.clear();
  if (path === "/api/coach/draft") {
    if (!matchups) return { status: 503, body: { error: "Statistiques de matchups indisponibles pour l'instant." } };
    return { status: 200, body: await draftApi(params, matchups) };
  }
  if (!key) return { status: 503, body: { error: "Service Riot non configuré : la connexion des comptes arrive bientôt." } };
  if (key !== riotKey) { riot = createRiot(key); riotKey = key; }
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
    if (path === "/api/coach/report") {
      // role : parties du rôle ; champion : parties du champion (on remonte plus loin dans l'historique) ; ids : liste imposée
      const puuid = String(params.get("puuid") || ""), ids = String(params.get("ids") || "").split(",").filter(id => /^[A-Z0-9]+_\d+$/.test(id)).slice(0, 20);
      const role = ROLES.includes(params.get("role")) ? params.get("role") : null, champion = /^[A-Za-z]{2,20}$/.test(params.get("champion") || "") ? params.get("champion") : null;
      if (!/^[\w-]{40,90}$/.test(puuid) || (!ids.length && !role && !champion)) return { status: 400, body: { error: "Joueur ou parties invalides." } };
      return { status: 200, body: await report(riot, { puuid, region: PLATFORMS[platform][0], ids, role, champion, benchmarks, champstats }) };
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
