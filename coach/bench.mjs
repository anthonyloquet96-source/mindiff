// Banc d'essai du coach : l'analyse complète (bilan + relecture tactique) sur de vraies parties de tous les rangs, de Fer à Challenger.
// But : vérifier que chaque règle repère une vraie erreur (plus fréquente chez les joueurs faibles, liée aux défaites),
// écarter le bruit (règle qui se déclenche presque toujours) et trouver de nouveaux écarts nets entre bons et mauvais joueurs.
// Résultats privés (coach/cache/bench.json), aucun identifiant de joueur gardé.
// Usage : node --env-file=.env coach/bench.mjs [--par-rang 80]   puis   node coach/bench.mjs --rapport

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
    findings: r.findings.map(f => f.kind), strengths: r.strengths.length,
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
  const wrap = async url => riot(url); // review() attend une fonction riot(url)
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
          const r = await review(wrap, { matchId: id, puuid: p.puuid, region: "europe", benchmarks, champstats });
          if (r.duration < 900) continue; // parties écourtées
          data.games.push(record(tier, r)); n++;
        } catch (e) { if (e.status === 401 || e.status === 403) throw e; }
      }
      data.seen = [...seen]; await writeFile(OUT, JSON.stringify(data));
    }
    console.log(`${new Date().toLocaleTimeString("fr-FR")} ${tier} : ${n} parties (${used} requêtes)`);
  }
  return data;
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
  if (process.argv.includes("--rapport")) {
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
