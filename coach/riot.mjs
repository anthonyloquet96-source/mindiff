// Statistiques MINDIFF calculées sur de vraies parties classées, via l'API officielle de Riot Games.
// Échantillon : joueurs tirés des divisions de chaque tranche de rang, leurs parties classées solo du patch courant.
// Seuls des agrégats sont conservés dans la base (aucun identifiant de joueur) ; les identifiants de parties déjà comptées
// restent dans le cache privé pour ne jamais compter deux fois la même partie.
// Usage : node --env-file-if-exists=.env coach/riot.mjs

import { P, readJson, writeJson, saveText, today } from "./lib.mjs";

const POS = { TOP: "top", JUNGLE: "jungle", MIDDLE: "mid", BOTTOM: "bottom", UTILITY: "support" };
const ROLE_FR = { top: "top", jungle: "jungle", mid: "mid", bottom: "ADC", support: "support" };
const BUCKET_FR = { "diamant+": "Diamant et plus" };
const wait = ms => new Promise(r => setTimeout(r, ms));

let used = 0, budget = 0;
async function riot(url) {
  if (used >= budget) throw Object.assign(new Error("budget de requêtes atteint"), { budget: true });
  for (let attempt = 0; attempt < 4; attempt++) {
    used++;
    await wait(1250); // clé de développement : 100 requêtes par 2 minutes
    const r = await fetch(url, { headers: { "X-Riot-Token": process.env.RIOT_API_KEY.trim() }, signal: AbortSignal.timeout(20000) }).catch(e => ({ ok: false, status: 0, e }));
    if (r.ok) return r.json();
    if (r.status === 429) { await wait((Number(r.headers.get("retry-after")) || 10) * 1000); continue; }
    if (r.status >= 500 || r.status === 0) { await wait(3000); continue; }
    throw new Error(`HTTP ${r.status} sur ${url.replace(/\?.*/, "")}`);
  }
  throw new Error("API Riot indisponible");
}

// Intervalle de confiance à 95 % d'un taux de victoire (approximation normale)
const margin = (w, n) => (n ? 1.96 * Math.sqrt((w / n) * (1 - w / n) / n) : null);
const pct1 = x => (x * 100).toFixed(1).replace(".", ",");

export async function run() {
  if (!process.env.RIOT_API_KEY?.trim()) return ["· RIOT_API_KEY absente : statistiques Riot non calculées."];
  const [config, changes] = await Promise.all([readJson(P.config), readJson("coach/kb/changes.json", {})]);
  const R = config.riot;
  budget = R.maxRequestsPerRun; used = 0;
  const client = changes.competitionVersion; // version client (ex. 16.20), correspond au patch courant
  const patch = changes.current;
  const seen = await readJson("coach/cache/riot-seen.json", { matches: {} });
  const stats = await readJson("coach/kb/riot-stats.json", { buckets: {} });
  delete stats.buckets; // ancien format (un seul échantillon) : remplacé par un échantillon par version de jeu
  // On ne garde que les deux versions les plus récentes
  const vs = Object.keys(stats.versions || {}).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  for (const v of vs.slice(2)) delete stats.versions[v];
  Object.assign(stats, { platform: R.platform, queue: R.queue, client, patch, method: "Joueurs tirés au hasard dans chaque division de la tranche ; parties classées solo de ces joueurs sur la version client courante ; chaque partie comptée une fois." });
  const since = Math.floor(new Date(changes.parsed?.[patch]?.at ? (await readJson(P.contents)).contents.find(c => c.id === changes.parsed[patch].contentId)?.published || today() : today()).getTime() / 1000);
  const log = [];
  try {
    for (const [bucket, divs] of Object.entries(R.buckets)) {
      for (const [tier, div] of divs) {
        // Maître, Grand Maître et Challenger n'ont pas de divisions : ligue unique par file
        const entries = div
          ? await riot(`https://${R.platform}.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/${tier}/${div}?page=${1 + Math.floor(Math.random() * 3)}`)
          : (await riot(`https://${R.platform}.api.riotgames.com/lol/league/v4/${tier.toLowerCase()}leagues/by-queue/RANKED_SOLO_5x5`)).entries;
        const players = entries.sort(() => Math.random() - 0.5).slice(0, R.playersPerDivision);
        for (const p of players) {
          const ids = await riot(`https://${R.region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${p.puuid}/ids?queue=${R.queue}&startTime=${since}&count=${R.matchesPerPlayer}`);
          for (const id of ids) {
            if (seen.matches[id]) continue;
            const m = await riot(`https://${R.region}.api.riotgames.com/lol/match/v5/matches/${id}`);
            seen.matches[id] = bucket;
            if (!m.info?.gameVersion || m.info.gameDuration < 300) continue; // partie écourtée (remake)
            // Chaque partie est rangée selon sa vraie version de jeu (16.20, 16.21…), jamais selon une version supposée
            const ver = m.info.gameVersion.split(".").slice(0, 2).join(".");
            const VB = ((stats.versions ||= {})[ver] ||= { buckets: {} }).buckets[bucket] ||= { matches: 0, champions: {} };
            VB.matches++;
            for (const x of m.info.participants) {
              const role = POS[x.teamPosition];
              if (!role) continue;
              const k = `${x.championName}|${role}`;
              const c = VB.champions[k] ||= { games: 0, wins: 0 };
              c.games++; if (x.win) c.wins++;
            }
          }
        }
      }
    }
  } catch (e) {
    if (!e.budget) log.push(`✘ ${e.message} — l'échantillon déjà compté est conservé`);
  }
  stats.updatedAt = new Date().toISOString();
  stats.requests = (stats.requests || 0) + used;
  await writeJson("coach/kb/riot-stats.json", stats);
  await writeJson("coach/cache/riot-seen.json", seen);
  for (const [v, V] of Object.entries(stats.versions || {})) for (const [b, B] of Object.entries(V.buckets)) log.push(`✔ ${BUCKET_FR[b]} : ${B.matches} parties comptées en version ${v}`);
  // Statistiques tirées de la version la mieux échantillonnée
  const total = V => Object.values(V.buckets).reduce((s, B) => s + B.matches, 0);
  const [useVer, use] = Object.entries(stats.versions || {}).sort((a, b) => total(b[1]) - total(a[1]))[0] || [client, { buckets: {} }];

  // Texte consulté (pour vérifier les passages) et unités pour les champions suivis
  const roleOf = Object.fromEntries(Object.entries(config.pilot.champions).flatMap(([r, cs]) => cs.map(c => [c, r])));
  const lines = [], units = [];
  const contentId = `c-riot-api-${useVer.replace(".", "-")}`;
  for (const [b, B] of Object.entries(use.buckets)) for (const [k, c] of Object.entries(B.champions)) {
    const [ch, role] = k.split("|");
    lines.push(`${BUCKET_FR[b]} · ${ch} ${ROLE_FR[role]} : ${c.games} parties, ${c.wins} victoires (${pct1(c.wins / c.games)} %)`);
    if (roleOf[ch] === role && c.games >= R.minGamesForUnit) {
      const m = margin(c.wins, c.games);
      units.push({
        id: `u-riot-${ch.toLowerCase()}-${b}-${client.replace(".", "-")}`,
        claim: `Échantillon MINDIFF (API Riot, EUW, ${BUCKET_FR[b]}, version ${useVer}) : ${ch} en ${ROLE_FR[role]}, ${pct1(c.wins / c.games)} % de victoires sur ${c.games} parties (marge à 95 % : ± ${pct1(m)} points).`,
        champions: [ch], roles: [role], themes: ["patch"],
        context: { queue: "solo", rank: b, region: "EUW" },
        patch: useVer === client ? { known: true, value: patch, client: useVer } : { known: false, client: useVer },
        metaDependent: true, dependsOn: [`${ch}/base`],
        conditions: [], limits: [`Échantillon de ${c.games} parties sur EUW seulement ; marge d'erreur de ± ${pct1(m)} points.`, "Un taux de victoire mesure le champion dans ce contexte, pas votre maîtrise."],
        nature: "statistique",
        evidence: [{ content: contentId, locator: `${BUCKET_FR[b]} · ${ch}`, lang: "fr", passage: `${BUCKET_FR[b]} · ${ch} ${ROLE_FR[role]} : ${c.games} parties, ${c.wins} victoires (${pct1(c.wins / c.games)} %)`, context: `solo-${b}`, sample: c.games }],
        published: today(),
      });
    }
  }
  await saveText(contentId, lines.join("\n"));
  log.push(`${units.length} statistique(s) de champions suivis prête(s) (${R.minGamesForUnit} parties minimum)${R.publish ? "" : " — non publiées : clé de développement (prototypage)"}.`);
  return { log, units, contentId, stats, publish: R.publish };
}

if (process.argv[1]?.endsWith("riot.mjs")) run().then(async r => {
  if (Array.isArray(r)) return console.log(r.join("\n"));
  if (r.publish && r.units.length) {
    const { mergeBatch } = await import("./kb.mjs");
    const contents = await readJson(P.contents);
    if (!contents.contents.some(c => c.id === r.contentId)) contents.contents.push({ id: r.contentId, sourceId: "riot-api", type: "donnees", url: "https://developer.riotgames.com/apis#match-v5", title: `Statistiques MINDIFF — API Riot, version ${r.stats.client}`, author: "MINDIFF (calcul sur l'API Riot)", lang: "fr", published: today(), retrievedAt: today(), patch: r.stats.patch, context: { queue: "solo", rank: "selon la tranche", region: "EUW" }, access: "api-json", analysis: "analysee", analyzedAt: today(), analyst: "Calcul déterministe (sans IA)", learn: "Les taux de victoire mesurés par MINDIFF sur de vraies parties, avec leur marge d'erreur.", quality: { level: "élevée", why: "Données officielles ; échantillon et marge affichés." } });
    await writeJson(P.contents, contents);
    const res = await mergeBatch({ units: r.units, analyst: "Calcul déterministe (API Riot)" }, { origin: "riot-api" });
    r.log.push(`${res.accepted.length} publiée(s), ${res.rejected.length} rejetée(s).`);
  }
  console.log(r.log.join("\n"));
}, e => { console.error(e.message); process.exit(1); });
