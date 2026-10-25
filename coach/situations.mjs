// Situations de jeu mesurées sur les chronologies Diamant et plus (coach/cache/timelines, et les parties Diamant+ du banc d'essai).
// Mêmes définitions que le bilan (review.mjs) : un retour = un groupe d'achats en base qui ne suit pas une mort de moins de 75 s ;
// un grand item = objet final d'au moins 2 000 or, hors bottes. Références par poste, et par champion au poste dès 80 parties.
// Écrit coach/cache/situations.json : privé tant que riot.publish est faux (clé de développement).
// Usage : node coach/situations.mjs

import { readdir, readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { items } from "./review.mjs";

const DIRS = [["coach/cache/timelines", null], ["coach/cache/bench-raw", ["DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"]]];
const POS = { TOP: "top", JUNGLE: "jungle", MIDDLE: "mid", BOTTOM: "bottom", UTILITY: "support" };
const PIT = { x: 9866, y: 4414 }, NEAR = 3500;
export const MIN_CHAMP = 80;

// Une partie → une ligne par joueur
export function playerLines(match, timeline, itemDb) {
  const info = match.info, frames = timeline.info.frames, events = frames.flatMap(f => f.events);
  const kills = events.filter(e => e.type === "CHAMPION_KILL");
  return info.participants.filter(p => POS[p.teamPosition]).map(p => {
    const pid = p.participantId, role = POS[p.teamPosition];
    const deaths = kills.filter(e => e.victimId === pid).map(e => e.timestamp);
    const visits = [];
    for (const e of events.filter(e => e.participantId === pid && ["ITEM_PURCHASED", "ITEM_UNDO"].includes(e.type) && e.timestamp > 90000)) {
      const last = visits.at(-1);
      if (last && e.timestamp - last.end <= 25000) { last.end = e.timestamp; last.n++; } else visits.push({ start: e.timestamp, end: e.timestamp, n: 1 });
    }
    const backs = visits.filter(v => !deaths.some(d => d < v.start && v.start - d < 75000));
    const first = backs[0];
    const legendary = events.find(e => e.type === "ITEM_PURCHASED" && e.participantId === pid && itemDb[e.itemId]?.final && !itemDb[e.itemId]?.boots);
    const gank = role === "jungle" ? kills.find(e => (e.killerId === pid || (e.assistingParticipantIds || []).includes(pid)) && POS[info.participants.find(x => x.participantId === e.victimId)?.teamPosition] !== "jungle") : null;
    return {
      role, champion: p.championName, win: p.win ? 1 : 0, minutes: info.gameDuration / 60,
      firstBack: first ? first.start / 60000 : null,
      firstBackGold: first ? frames[Math.floor(first.start / 60000)]?.participantFrames[pid]?.currentGold ?? null : null,
      backs14: backs.filter(v => v.start < 14 * 60000).length,
      legendaryMin: legendary ? legendary.timestamp / 60000 : null,
      firstGank: gank ? gank.timestamp / 60000 : null,
    };
  });
}

// Dragons : 30 s avant chaque apparition, écart de joueurs près de la fosse et écart d'or entre les équipes
export function dragonLines(match, timeline) {
  const parts = match.info.participants, frames = timeline.info.frames;
  const kills = frames.flatMap(f => f.events).filter(e => e.type === "ELITE_MONSTER_KILL" && e.monsterType === "DRAGON");
  const out = []; let spawn = 300000;
  for (const k of kills) {
    const f = frames[Math.round((spawn - 30000) / 60000)];
    const taker = parts.find(p => p.participantId === k.killerId)?.teamId ?? k.killerTeamId;
    if (f && taker) {
      const near = { 100: 0, 200: 0 }, gold = { 100: 0, 200: 0 };
      for (const p of parts) { const pf = f.participantFrames[p.participantId]; if (!pf) continue; gold[p.teamId] += pf.totalGold; if (pf.position && Math.hypot(pf.position.x - PIT.x, pf.position.y - PIT.y) < NEAR) near[p.teamId]++; }
      out.push({ near: near[100] - near[200], gold: gold[100] - gold[200], blue: taker === 100 ? 1 : 0 });
    }
    spawn = k.timestamp + 300000;
  }
  return out;
}

const q = (a, p) => { const s = a.filter(x => x != null).sort((x, y) => x - y); return s.length ? Math.round(s[Math.floor(p * (s.length - 1))] * 10) / 10 : null; };
function stats(rows) {
  const r1 = x => Math.round(x * 10) / 10;
  return {
    n: rows.length,
    firstBack: { p25: q(rows.map(r => r.firstBack), .25), p50: q(rows.map(r => r.firstBack), .5), p75: q(rows.map(r => r.firstBack), .75) },
    firstBackGold: q(rows.map(r => r.firstBackGold), .5),
    backs14: q(rows.map(r => r.backs14), .5),
    legendaryMin: { p25: q(rows.map(r => r.legendaryMin), .25), p50: q(rows.map(r => r.legendaryMin), .5), p75: q(rows.map(r => r.legendaryMin), .75) },
    ...(rows[0]?.role === "jungle" ? { firstGank: { p25: q(rows.map(r => r.firstGank), .25), p50: q(rows.map(r => r.firstGank), .5), share4: r1(100 * rows.filter(r => r.firstGank != null && r.firstGank <= 4).length / rows.length) } } : {}),
  };
}

export async function run() {
  const itemDb = await items();
  const lines = [], dragons = [], patches = {};
  let games = 0;
  for (const [dir, tiers] of DIRS) {
    const files = (await readdir(dir).catch(() => [])).filter(f => f.endsWith(".json.gz"));
    for (const f of files) {
      let g; try { g = JSON.parse(gunzipSync(await readFile(`${dir}/${f}`)).toString()); } catch { continue; }
      if (tiers && !tiers.includes(g.tier)) continue;
      if (g.match.info.gameDuration < 900) continue;
      const v = g.match.info.gameVersion.split(".").slice(0, 2).join(".");
      patches[v] = (patches[v] || 0) + 1; games++;
      lines.push(...playerLines(g.match, g.timeline, itemDb));
      dragons.push(...dragonLines(g.match, g.timeline));
    }
  }
  const byRole = {}, byChamp = {};
  for (const role of Object.values(POS)) byRole[role] = stats(lines.filter(l => l.role === role));
  const groups = {};
  for (const l of lines) (groups[`${l.champion}|${l.role}`] ||= []).push(l);
  for (const [k, rows] of Object.entries(groups)) if (rows.length >= MIN_CHAMP) byChamp[k] = stats(rows);
  // Dragon : avantage de présence à or presque égal (écart de moins de 1 000 or), du point de vue de l'équipe la plus présente
  const dragon = {};
  for (const d of [1, 2, 3]) {
    const rows = dragons.filter(x => Math.abs(x.gold) < 1000 && Math.min(3, Math.abs(x.near)) === d);
    const won = rows.filter(x => (x.near > 0) === (x.blue === 1)).length;
    dragon[d] = { n: rows.length, takeRate: rows.length ? Math.round(1000 * won / rows.length) / 10 : null };
  }
  const out = { level: "Diamant et plus", at: new Date().toISOString(), games, patches, minChamp: MIN_CHAMP, byRole, byChamp, dragonEqualGold: dragon,
    method: "Chronologies de parties classées solo (EUW), anonymisées. Retour = groupe d'achats en base hors mort récente ; grand item = objet final d'au moins 2 000 or, hors bottes ; premier gank = premier kill ou assist du jungler sur un laner. Médianes et quartiles." };
  await writeFile("coach/cache/situations.json", JSON.stringify(out));
  return out;
}

if (process.argv[1]?.endsWith("situations.mjs")) run().then(o => {
  console.log(`${o.games} parties Diamant+ (${Object.entries(o.patches).sort().map(([p, n]) => `${p} : ${n}`).join(", ")})`);
  for (const [r, s] of Object.entries(o.byRole)) console.log(`${r.padEnd(8)} ${s.n} joueurs · 1er retour ${s.firstBack.p50} min (${s.firstBackGold} or) · ${s.backs14} retours avant 14 min · 1er grand item ${s.legendaryMin.p50} min${s.firstGank ? ` · 1er gank ${s.firstGank.p50} min (${s.firstGank.share4} % avant 4 min)` : ""}`);
  console.log(`${Object.keys(o.byChamp).length} couples champion-poste avec au moins ${o.minChamp} parties`);
  console.log("Dragon à or presque égal :", Object.entries(o.dragonEqualGold).map(([d, x]) => `+${d} joueur(s) → ${x.takeRate} % (${x.n})`).join(" · "));
}, e => { console.error(e.message); process.exit(1); });
