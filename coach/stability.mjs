// Stabilité intra-joueur des indicateurs candidats à un objectif (brainstorm du 01/11/2026, avec GPT-6).
// Lit coach/cache/battery-raw/<palier>-<n>/ (parties brutes anonymisées par joueur, coach/battery-raw.mjs), calcule pour chaque
// partie du joueur suivi une série d'indicateurs (nos métriques actuelles + candidats), puis la fiabilité par poste :
//   fiabilité = variance entre joueurs / (entre + intra). 1 = le niveau du joueur explique tout ; 0 = le hasard de la partie.
// Un objectif évalué sur 5 parties n'a de sens qu'avec une fiabilité suffisante (nos objectifs de farm sont vers 0,8 ;
// la participation aux kills à 0,15 est surtout du bruit). Aussi : part des parties où l'indicateur est mesurable, et part de zéros.
// Usage : node coach/stability.mjs [--min-parties 10]   → coach/cache/battery-raw/stabilite.json et un tableau à l'écran

import { readdir, readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { computeMetrics } from "./metrics.mjs";
import { items } from "./review.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const MIN = arg("--min-parties", 10);
// --dossier : autre série de parties brutes (par exemple coach/cache/battery-perso, clé personnelle)
const DIR = process.argv.includes("--dossier") ? process.argv[process.argv.indexOf("--dossier") + 1] : "coach/cache/battery-raw";
const ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const variance = a => { const m = mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, a.length - 1); };

// Indicateurs d'une partie pour le joueur suivi (alias p<k>). Les champs manquants donnent null (jamais 0).
export function indicators(match, timeline, alias, itemDb) {
  const info = match.info, p = info.participants.find(x => x.puuid === alias);
  if (!p || !p.teamPosition) return null;
  const pid = p.participantId, team = p.teamId, min = info.gameDuration / 60;
  const frames = timeline.info.frames, events = frames.flatMap(f => f.events || []);
  const kills = events.filter(e => e.type === "CHAMPION_KILL");
  const myDeaths = kills.filter(e => e.victimId === pid);
  const F = t => frames[t]?.participantFrames?.[pid] || null;
  const opp = info.participants.find(o => o.teamId !== team && o.teamPosition === p.teamPosition);
  const O = t => (opp ? frames[t]?.participantFrames?.[opp.participantId] : null) || null;
  const C = k => (typeof p.challenges?.[k] === "number" ? p.challenges[k] : null);
  const out = { role: p.teamPosition, won: !!p.win, minutes: min };
  // Nos métriques actuelles, pour référence
  let m = null; try { m = computeMetrics(match, timeline, alias); } catch { /* partie invalide */ }
  if (m?.valid) for (const [k, v] of Object.entries(m.metrics)) out["cur." + k] = v.value;
  // Vision
  const wardKills = events.filter(e => e.type === "WARD_KILL" && e.killerId === pid);
  out.wardKills20 = wardKills.filter(e => e.timestamp < 1200000).length;
  const myWards = events.filter(e => e.type === "WARD_PLACED" && e.creatorId === pid);
  out.controlWards20 = myWards.filter(e => e.wardType === "CONTROL_WARD" && e.timestamp < 1200000).length;
  out.controlWardsPerGame = myWards.filter(e => e.wardType === "CONTROL_WARD").length;
  out.visionPerMin = p.visionScore != null ? p.visionScore / min : null;
  out.wardsPerMin = p.wardsPlaced != null ? p.wardsPlaced / min : null;
  // Tempo et économie
  const visits = [];
  for (const e of events.filter(e => e.participantId === pid && ["ITEM_PURCHASED", "ITEM_UNDO"].includes(e.type) && e.timestamp > 90000)) {
    const last = visits.at(-1);
    if (last && e.timestamp - last.end <= 25000) { last.end = e.timestamp; last.n++; } else visits.push({ start: e.timestamp, end: e.timestamp, n: 1 });
  }
  const backs = visits.filter(v => !myDeaths.some(d => d.timestamp < v.start && v.start - d.timestamp < 75000));
  out.firstBackMin = backs[0] ? backs[0].start / 60000 : null;
  out.backs14 = backs.filter(v => v.start < 14 * 60000).length;
  const legendary = events.find(e => e.type === "ITEM_PURCHASED" && e.participantId === pid && itemDb[e.itemId]?.final && !itemDb[e.itemId]?.boots);
  out.firstItemMin = legendary ? legendary.timestamp / 60000 : null;
  const span = []; for (let t = 10; t <= Math.min(25, Math.floor(min)); t++) { const f = F(t); if (f) span.push(f.currentGold); }
  out.goldIdleShare = span.length >= 5 ? span.filter(g => g >= 1300).length / span.length : null;
  const unspent = myDeaths.map(d => F(Math.floor(d.timestamp / 60000))?.currentGold).filter(v => v != null);
  out.goldUnspentAtDeath = unspent.length ? median(unspent) : null;
  const f15 = F(15), f20 = F(20);
  out.goldPerMin15to20 = f15 && f20 ? (f20.totalGold - f15.totalGold) / 5 : null;
  // Lane
  const f10 = F(10), o10 = O(10);
  out.csDiff10 = f10 && o10 ? f10.minionsKilled + f10.jungleMinionsKilled - o10.minionsKilled - o10.jungleMinionsKilled : null;
  out.dmgChamp10 = f10?.damageStats?.totalDamageDoneToChampions ?? null;
  // Survie
  out.deadShare = p.totalTimeSpentDead != null ? p.totalTimeSpentDead / (min * 60) : null;
  out.deathsAfter25 = min >= 30 ? myDeaths.filter(d => d.timestamp > 25 * 60000).length : null;
  out.deathsTotal = p.deaths;
  // Communication
  out.miaPingsPerMin = p.enemyMissingPings != null ? p.enemyMissingPings / min : null;
  out.pingsPerMin = ["allInPings", "assistMePings", "basicPings", "commandPings", "dangerPings", "enemyMissingPings", "enemyVisionPings", "getBackPings", "holdPings", "needVisionPings", "onMyWayPings", "pushPings", "retreatPings", "visionClearedPings"].reduce((s, k) => s + (p[k] || 0), 0) / min;
  // Poste
  out.scuttles = C("scuttleCrabKills");
  out.ccKills = C("immobilizeAndKillWithAlly");
  out.soloKills = C("soloKills");
  out.turretDmgPerMin = p.damageDealtToTurrets != null ? p.damageDealtToTurrets / min : null;
  out.takedownsEarly = C("takedownsFirstXMinutes");
  return out;
}

export async function run() {
  const itemDb = await items();
  const players = [];
  for (const d of (await readdir(DIR).catch(() => [])).filter(d => /^[A-Z]+-\d+$/.test(d))) {
    const files = (await readdir(`${DIR}/${d}`)).filter(f => f.endsWith(".json.gz"));
    const games = [];
    for (const f of files) {
      let g; try { g = JSON.parse(gunzipSync(await readFile(`${DIR}/${d}/${f}`)).toString()); } catch { continue; }
      if (g.match.info.gameDuration < 900) continue;
      const ind = indicators(g.match, g.timeline, g.me, itemDb);
      if (ind) games.push(ind);
    }
    if (games.length) players.push({ tier: d.split("-")[0], games });
  }
  const keys = [...new Set(players.flatMap(p => p.games.flatMap(g => Object.keys(g))))].filter(k => !["role", "won", "minutes"].includes(k));
  const result = {};
  for (const k of keys) {
    result[k] = {};
    for (const role of [...ROLES, "ALL"]) {
      const groups = [];
      let measurable = 0, total = 0, zeros = 0;
      for (const p of players) {
        const inRole = p.games.filter(g => role === "ALL" || g.role === role);
        if (role === "ALL") { // poste principal du joueur seulement, pour ne pas mélanger ses postes
          const by = {}; for (const g of p.games) by[g.role] = (by[g.role] || 0) + 1;
          const main = Object.entries(by).sort((a, b) => b[1] - a[1])[0]?.[0];
          inRole.splice(0, inRole.length, ...p.games.filter(g => g.role === main));
        }
        const vals = inRole.map(g => g[k]).filter(v => v != null);
        total += inRole.length; measurable += vals.length; zeros += vals.filter(v => v === 0).length;
        if (vals.length >= MIN) groups.push(vals);
      }
      if (groups.length < 6) { result[k][role] = { players: groups.length }; continue; }
      const within = mean(groups.map(variance)), means = groups.map(mean), n = mean(groups.map(g => g.length));
      const between = Math.max(0, variance(means) - within / n);
      result[k][role] = { icc: Math.round(100 * between / (between + within || 1)) / 100, players: groups.length, measurable: Math.round(100 * measurable / Math.max(1, total)), zeros: Math.round(100 * zeros / Math.max(1, measurable)) };
    }
  }
  await writeFile(`${DIR}/stabilite.json`, JSON.stringify({ at: new Date().toISOString(), players: players.length, games: players.reduce((s, p) => s + p.games.length, 0), result }, null, 1));
  return { players: players.length, result };
}

if (process.argv[1]?.endsWith("stability.mjs")) run().then(({ players, result }) => {
  console.log(`${players} joueurs`);
  console.log("indicateur".padEnd(28) + [...ROLES, "ALL"].map(r => r.slice(0, 4).padStart(9)).join("") + "   mesurable % · zéros %");
  for (const [k, byRole] of Object.entries(result)) {
    const cell = r => (byRole[r]?.icc != null ? `${byRole[r].icc.toFixed(2)}(${byRole[r].players})` : `—(${byRole[r]?.players ?? 0})`).padStart(9);
    const all = byRole.ALL || {};
    console.log(k.padEnd(28) + [...ROLES, "ALL"].map(cell).join("") + `   ${all.measurable ?? "—"} · ${all.zeros ?? "—"}`);
  }
});
