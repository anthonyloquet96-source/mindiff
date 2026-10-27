// Collecte des chronologies de parties Diamant et plus (positions, or et événements minute par minute).
// But : mesurer ce que font les bons joueurs dans une situation précise (premiers ganks, retours, placement avant un objectif)
// et confirmer ou nuancer les conseils écrits par des créateurs (règle « vérification croisée », FIABILITE v1.3).
// Parties anonymisées (aucun identifiant ni nom de joueur gardé), compressées, dans le cache privé coach/cache/timelines/.
// Privé tant que riot.publish est faux (clé de développement). Reprise possible : les parties déjà vues sont sautées.
// Usage : node --env-file=.env coach/timelines.mjs [--max 10000]

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { sha256 } from "./lib.mjs";

const wait = ms => new Promise(r => setTimeout(r, ms));
const sarg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const arg = (k, d) => Number(sarg(k, d));
// --dir et --tiers : collecte séparée, par exemple Master+ avec la clé personnelle pour le test privé
// (node --env-file=.env coach/timelines.mjs --dir coach/cache/timelines-perso --tiers MASTER,GRANDMASTER,CHALLENGER --max 1000)
const DIR = sarg("dir", "coach/cache/timelines"), SEEN = `${DIR}/seen.json`;
const TIERS = sarg("tiers", "DIAMOND,MASTER,GRANDMASTER,CHALLENGER").split(",");

// Clé de développement : 100 requêtes par 2 minutes, on reste en dessous
let used = 0;
async function riot(url) {
  for (let i = 0; i < 5; i++) {
    await wait(1300); used++;
    const r = await fetch(url, { headers: { "X-Riot-Token": process.env.RIOT_API_KEY.trim() } });
    if (r.ok) return r.json();
    if (r.status === 429) { await wait((Number(r.headers.get("retry-after")) || 10) * 1000); continue; }
    if (r.status >= 500) { await wait(3000); continue; }
    throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
  }
  throw new Error("API Riot indisponible");
}

function anonymize(match, timeline) {
  const alias = new Map(match.info.participants.map(p => [p.puuid, `p${p.participantId}`]));
  const m = structuredClone(match), t = structuredClone(timeline);
  m.metadata.participants = m.metadata.participants.map(x => alias.get(x) || "p?");
  delete m.metadata.matchId; delete m.info.gameId;
  for (const p of m.info.participants) { p.puuid = alias.get(p.puuid); for (const k of ["riotIdGameName", "riotIdTagline", "summonerName", "summonerId", "profileIcon"]) delete p[k]; }
  t.metadata.participants = t.metadata.participants.map(x => alias.get(x) || "p?");
  delete t.metadata.matchId;
  for (const p of t.info.participants) p.puuid = alias.get(p.puuid);
  return { match: m, timeline: t };
}

async function run() {
  const max = arg("max", 10000);
  await mkdir(DIR, { recursive: true });
  const seen = new Set(JSON.parse(await readFile(SEEN, "utf8").catch(() => "[]")));
  let n = (await readdir(DIR)).filter(f => f.endsWith(".json.gz")).length;
  const log = msg => console.log(`${new Date().toLocaleTimeString("fr-FR")} ${msg}`);
  log(`départ : ${n} parties déjà gardées, objectif ${max}`);
  while (n < max) {
    // Un tour : quelques joueurs de chaque palier, au hasard (divisions et pages tirées au sort pour le Diamant)
    for (const tier of TIERS) {
      const div = ["I", "II", "III", "IV"][Math.floor(Math.random() * 4)], page = 1 + Math.floor(Math.random() * 5);
      const players = tier === "DIAMOND"
        ? await riot(`https://euw1.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/DIAMOND/${div}?page=${page}`)
        : (await riot(`https://euw1.api.riotgames.com/lol/league/v4/${tier.toLowerCase()}leagues/by-queue/RANKED_SOLO_5x5`)).entries;
      // Le Diamant compte plus de joueurs : il reçoit plus de place dans chaque tour
      for (const p of players.sort(() => Math.random() - 0.5).slice(0, tier === "DIAMOND" ? 12 : 4)) {
        if (n >= max) break;
        const ids = await riot(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${p.puuid}/ids?queue=420&count=5`).catch(e => { if (e.status === 401 || e.status === 403) throw e; return []; });
        for (const id of ids.slice(0, 3)) {
          const h = sha256(id).slice(0, 16); // même partie vue par deux joueurs : gardée une fois
          if (seen.has(h) || n >= max) continue;
          seen.add(h);
          try {
            const match = await riot(`https://europe.api.riotgames.com/lol/match/v5/matches/${id}`);
            if (match.info.gameDuration < 900) continue; // parties écourtées (abandon, remake)
            const timeline = await riot(`https://europe.api.riotgames.com/lol/match/v5/matches/${id}/timeline`);
            const a = anonymize(match, timeline);
            await writeFile(`${DIR}/${h}.json.gz`, gzipSync(JSON.stringify({ tier, patch: match.info.gameVersion.split(".").slice(0, 2).join("."), at: match.info.gameCreation, ...a })));
            n++;
          } catch (e) { if (e.status === 401 || e.status === 403) throw e; }
        }
        await writeFile(SEEN, JSON.stringify([...seen]));
      }
      log(`${tier} : ${n} parties gardées (${used} requêtes)`);
    }
  }
  log(`terminé : ${n} parties`);
}

if (process.argv[1]?.endsWith("timelines.mjs")) run().catch(e => { console.error(e.status === 401 || e.status === 403 ? `Clé Riot refusée (HTTP ${e.status}) : clé expirée ? Arrêt, reprise possible avec une nouvelle clé.` : e.message); process.exit(1); });
