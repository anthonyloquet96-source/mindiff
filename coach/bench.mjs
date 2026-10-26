// Banc d'essai du coach : l'analyse complète (bilan + relecture tactique) sur de vraies parties de tous les rangs, de Fer à Challenger.
// But : vérifier que chaque règle repère une vraie erreur (plus fréquente chez les joueurs faibles, liée aux défaites),
// écarter le bruit (règle qui se déclenche presque toujours) et trouver de nouveaux écarts nets entre bons et mauvais joueurs.
// Résultats privés (coach/cache/bench.json et coach/cache/bench-raw/), Riot ID retirés, mais PUUID et identifiants de partie encore présents dans bench-raw (voir coach/CONFORMITE.md).
// Usage : node --env-file=.env coach/bench.mjs [--par-rang 80]   puis   node coach/bench.mjs --rapport
//         node coach/bench.mjs --rejouer   (règles corrigées : réanalyse les parties gardées, sans requête Riot)

import { readFile, writeFile } from "node:fs/promises";
import { review } from "./review.mjs";
import { sha256 } from "./lib.mjs";

const OUT = "coach/cache/bench.json";
const wait = ms => new Promise(r => setTimeout(r, ms));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
export const GROUP = t => (["IRON", "BRONZE", "SILVER"].includes(t) ? "bas" : ["GOLD", "PLATINUM", "EMERALD"].includes(t) ? "moyen" : "haut");

// Appels Riot espacés (clé de développement : 100 requêtes par 2 minutes)
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

// Ligne compacte par partie analysée : ce que le coach a dit, et le résultat
function record(tier, r) {
  const s = r.summary, T = r.tactics;
  return {
    tier, group: GROUP(tier), role: s.role, win: s.win ? 1 : 0, min: s.minutes, k: s.k, d: s.d, a: s.a,
    findings: r.findingsAll || r.findings.map(f => f.kind), strengths: r.strengths.length, habits: r.habits || null,
    comparisons: Object.fromEntries(r.comparisons.map(c => [c.metric, { v: c.value, level: c.level }])),
    gold10: r.lane.at10?.gold ?? null, platesLost: r.lane.platesLost, deadShare: s.deadSeconds != null ? Math.round((s.deadSeconds / r.duration) * 100) : null,
    lessons: T ? T.lessons.map(l => l.kind) : [],
    tactics: T ? { ...T.summary, fightsNear: T.fights.filter(f => f.me || f.myDist < 6000).length, objLostOutnumbered: T.objectives.filter(o => !o.ours && o.allies < o.enemies).length } : null,
  };
}

async function collect(perTier) {
  const benchmarks = JSON.parse(await readFile("coach/cache/benchmarks.json", "utf8"));
  const champstats = JSON.parse(await readFile("coach/cache/champstats.json", "utf8"));
  const data = JSON.parse(await readFile(OUT, "utf8").catch(() => '{"seen":[],"games":[]}'));
  const seen = new Set(data.seen);
  // review() attend une fonction riot(url) ; on garde aussi la partie et sa chronologie (anonymisées, compressées) pour rejouer l'analyse
  let last = {};
  const wrap = async url => { const j = await riot(url); if (url.endsWith("/timeline")) last.timeline = j; else if (/\/matches\/[A-Z0-9]+_\d+$/.test(url)) last.match = j; return j; };
  for (const tier of TIERS) {
    const have = data.games.filter(g => g.tier === tier).length;
    if (have >= perTier) continue;
    const page = 1 + Math.floor(Math.random() * 3), div = ["I", "II", "III", "IV"][Math.floor(Math.random() * 4)];
    const players = ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier)
      ? (await riot(`https://euw1.api.riotgames.com/lol/league/v4/${tier.toLowerCase()}leagues/by-queue/RANKED_SOLO_5x5`)).entries
      : await riot(`https://euw1.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/${tier}/${div}?page=${page}`);
    let n = have;
    for (const p of players.sort(() => Math.random() - 0.5)) {
      if (n >= perTier) break;
      const ids = await riot(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${p.puuid}/ids?queue=420&count=3`).catch(() => []);
      for (const id of ids.slice(0, 2)) {
        const h = sha256(id + p.puuid).slice(0, 16);
        if (seen.has(h) || n >= perTier) continue;
        seen.add(h);
        try {
          last = {};
          const r = await review(wrap, { matchId: id, puuid: p.puuid, region: "europe", benchmarks, champstats });
          if (r.duration < 900) continue; // parties écourtées
          data.games.push({ ...record(tier, r), raw: h }); n++;
          if (last.match && last.timeline) await saveRaw(h, tier, p.puuid, last.match, last.timeline);
        } catch (e) { if (e.status === 401 || e.status === 403) throw e; }
      }
      data.seen = [...seen]; await writeFile(OUT, JSON.stringify(data));
    }
    console.log(`${new Date().toLocaleTimeString("fr-FR")} ${tier} : ${n} parties (${used} requêtes)`);
  }
  return data;
}

// Parties gardées pour rejouer l'analyse après chaque correction des règles, sans redemander les données à Riot.
// Anonymisées : identifiants Riot remplacés par « p1 » à « p10 », noms et Riot ID retirés. Compressées (gzip).
const RAW = "coach/cache/bench-raw";
async function saveRaw(h, tier, puuid, match, timeline) {
  const { mkdir } = await import("node:fs/promises");
  const { gzipSync } = await import("node:zlib");
  await mkdir(RAW, { recursive: true });
  const alias = new Map(match.info.participants.map(p => [p.puuid, `p${p.participantId}`]));
  const m = structuredClone(match), t = structuredClone(timeline);
  m.metadata.participants = m.metadata.participants.map(x => alias.get(x) || "p?");
  for (const p of m.info.participants) { p.puuid = alias.get(p.puuid); for (const k of ["riotIdGameName", "riotIdTagline", "summonerName", "summonerId", "profileIcon"]) delete p[k]; }
  t.metadata.participants = t.metadata.participants.map(x => alias.get(x) || "p?");
  for (const p of t.info.participants) p.puuid = alias.get(p.puuid);
  await writeFile(`${RAW}/${h}.json.gz`, gzipSync(JSON.stringify({ tier, me: alias.get(puuid), match: m, timeline: t })));
}
// Rejoue l'analyse (règles actuelles) sur toutes les parties gardées : la boucle d'apprentissage ne coûte plus aucune requête
async function replay() {
  const { readdir } = await import("node:fs/promises");
  const { gunzipSync } = await import("node:zlib");
  const benchmarks = JSON.parse(await readFile("coach/cache/benchmarks.json", "utf8"));
  const champstats = JSON.parse(await readFile("coach/cache/champstats.json", "utf8"));
  const situations = process.argv.includes("--sans-situations") ? null : JSON.parse(await readFile("coach/cache/situations.json", "utf8").catch(() => "null"));
  const data = JSON.parse(await readFile(OUT, "utf8"));
  const files = (await readdir(RAW).catch(() => [])).filter(f => f.endsWith(".json.gz"));
  const games = [];
  for (const f of files) {
    const g = JSON.parse(gunzipSync(await readFile(`${RAW}/${f}`)).toString());
    const stub = async url => (url.endsWith("/timeline") ? g.timeline : g.match);
    try { games.push({ ...record(g.tier, await review(stub, { matchId: g.match.metadata.matchId, puuid: g.me, region: "europe", benchmarks, champstats, situations })), raw: f.replace(".json.gz", "") }); } catch (e) { console.error(`${f} : ${e.message}`); }
  }
  // Les parties sans copie (premier passage) gardent leur ancienne analyse
  const kept = data.games.filter(x => !x.raw || !files.includes(`${x.raw}.json.gz`));
  data.games = [...kept, ...games];
  await writeFile(OUT, JSON.stringify(data));
  return { replayed: games.length, kept: kept.length };
}

// Rapport : pour chaque règle, fréquence par groupe de rangs et lien avec la défaite (à rang égal)
export function analyse(games) {
  const kinds = new Set(games.flatMap(g => [...g.findings, ...g.lessons]));
  const rows = [];
  for (const k of kinds) {
    const has = g => g.findings.includes(k) || g.lessons.includes(k);
    const by = grp => { const G = games.filter(g => g.group === grp); return G.length ? Math.round((G.filter(has).length / G.length) * 100) : null; };
    // Victoires avec et sans la règle, en moyenne pondérée par rang (évite que le rang explique tout)
    let wIn = 0, nIn = 0, wOut = 0, nOut = 0;
    for (const tier of TIERS) {
      const G = games.filter(g => g.tier === tier), A = G.filter(has), B = G.filter(g => !has(g));
      if (!A.length || !B.length) continue;
      const w = Math.min(A.length, B.length);
      wIn += (A.reduce((s, g) => s + g.win, 0) / A.length) * w; nIn += w;
      wOut += (B.reduce((s, g) => s + g.win, 0) / B.length) * w; nOut += w;
    }
    const total = games.filter(has).length;
    rows.push({ kind: k, total, share: Math.round((total / games.length) * 100), bas: by("bas"), moyen: by("moyen"), haut: by("haut"),
      winWith: nIn ? Math.round((wIn / nIn) * 100) : null, winWithout: nOut ? Math.round((wOut / nOut) * 100) : null });
  }
  rows.sort((a, b) => b.total - a.total);
  return rows;
}

if (process.argv[1]?.endsWith("bench.mjs")) {
  if (process.argv.includes("--rejouer")) {
    const r = await replay();
    console.log(`Analyse rejouée sur ${r.replayed} parties gardées (${r.kept} parties du premier passage conservées telles quelles).`);
  } else if (process.argv.includes("--rapport")) {
    const { games } = JSON.parse(await readFile(OUT, "utf8"));
    const by = {}; for (const g of games) by[g.tier] = (by[g.tier] || 0) + 1;
    console.log(`${games.length} parties :`, JSON.stringify(by));
    console.log("règle | parties | part % | bas % | moyen % | haut % | victoires avec | sans");
    for (const r of analyse(games)) console.log([r.kind, r.total, r.share, r.bas, r.moyen, r.haut, r.winWith, r.winWithout].join(" | "));
  } else {
    const d = await collect(arg("par-rang", 80));
    console.log(`Banc d'essai : ${d.games.length} parties, ${used} requêtes.`);
  }
}
