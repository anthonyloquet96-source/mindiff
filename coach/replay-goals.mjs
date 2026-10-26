// Rejeu ancien (goals-1) / nouveau (goals-2) moteur d'objectifs sur les joueurs de la batterie (coach/battery.mjs), sans
// aucun appel à Riot : mesures partie par partie déjà en cache (identifiants brouillés, aucun Riot ID).
// Séparation chronologique stricte, par joueur : évaluation = les 5 dernières parties valides au poste principal ;
// départ = tout ce qui précède la première d'entre elles (fenêtre de 15 à 20 parties au poste pour goals-2).
// Repères Diamant+ recalculés pour chaque joueur sur les seules parties antérieures à sa première partie évaluée (pas de fuite).
// Ces joueurs ne suivaient aucun objectif : le rejeu mesure la calibration (difficulté des cibles, garde-fous), pas l'effet
// du coach. Chaque taux de maîtrise est comparé au taux attendu par hasard : P(au moins 3 cibles sur 5) avec p = part des
// parties de départ du joueur qui atteignent déjà la cible. Pour goals-2, chaque état (maîtrise, progrès, stable, alerte) est
// aussi comparé à sa fréquence par hasard : 400 tirages de 5 parties parmi les parties de départ du joueur (graine fixe).
// Usage : node coach/replay-goals.mjs   → coach/cache/battery/rapport-goals-2.json (privé : données de la clé DEV)

import { readdir, readFile, writeFile } from "node:fs/promises";
import { CATALOG } from "./metrics.mjs";
import * as NEW from "./goals.mjs";
import * as OLD from "./goals-v1.mjs";
import { loadReferenceRows, referencesFrom } from "./references.mjs";

const DIRS = ["coach/cache/battery", "coach/cache/battery-2", "coach/cache/battery-3"];
const EVAL = 5, MIN_BASE = 15;
const median = a => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
const binomAtLeast = (n, k, p) => { let s = 0; for (let i = k; i <= n; i++) { let c = 1; for (let j = 0; j < i; j++) c = c * (n - j) / (j + 1); s += c * p ** i * (1 - p) ** (n - i); } return s; };
const r2 = v => (v == null ? null : Math.round(v * 100) / 100);
const fam = k => CATALOG[k]?.family || k;

export async function loadPlayers() {
  const out = [];
  for (const d of DIRS) for (const f of (await readdir(d).catch(() => [])).filter(f => /^[A-Z]+-\d+\.json$/.test(f))) {
    const j = JSON.parse(await readFile(`${d}/${f}`, "utf8"));
    out.push({ tier: j.tier, player: j.player, games: j.detail || [] });
  }
  return out;
}

// Découpe chronologique d'un joueur : null s'il n'a pas assez de parties au poste principal
export function split(games) {
  const by = {};
  for (const g of games) if (g.valid && g.role) by[g.role] = (by[g.role] || 0) + 1;
  const role = Object.entries(by).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
  if (!role) return { role: null, reason: "aucune partie valide" };
  const chrono = games.filter(g => g.start_ms != null).sort((a, b) => a.start_ms - b.start_ms);
  const inRole = chrono.filter(g => g.valid && g.role === role);
  if (inRole.length < MIN_BASE + EVAL) return { role, reason: `${inRole.length} parties au poste principal (il en faut ${MIN_BASE + EVAL})` };
  const cut = inRole[inRole.length - EVAL].start_ms;
  const history = chrono.filter(g => g.start_ms < cut).reverse(); // plus récentes d'abord, comme le coach
  const future = chrono.filter(g => g.start_ms >= cut);
  if (history.some(g => g.start_ms >= cut) || future.some(g => g.start_ms < cut)) throw new Error("fuite chronologique");
  return { role, cut, history, future };
}

// Taux de maîtrise attendu par hasard pour une cible, d'après les parties de départ au poste
function chance(goal, history) {
  const dir = goal.direction === "higher" ? 1 : -1;
  const base = history.filter(g => g.valid && g.role === goal.role).slice(0, 20).map(g => g.metrics[goal.metric]?.value).filter(v => v != null);
  if (!base.length) return null;
  const p = base.filter(v => dir * (v - goal.target) >= 0).length / base.length;
  return { p: r2(p), mastery: binomAtLeast(EVAL, 3, p) };
}

// Fréquence de chaque résultat par hasard : 5 parties tirées (avec remise) parmi les parties de départ, datées après l'activation
const rng = seed => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
function chanceOutcomes(E, active, s, seedText, draws = 400) {
  const base = s.history.filter(g => g.valid && g.role === active.role).slice(0, 20);
  const rand = rng([...seedText].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
  const n = {};
  for (let d = 0; d < draws; d++) {
    const pick = Array.from({ length: EVAL }, (_, i) => ({ ...base[Math.floor(rand() * base.length)], match_id: `x${i}`, start_ms: s.cut + i }));
    const o = E.evaluateGoal(active, pick, s.cut).outcome || "en-cours";
    n[o] = (n[o] || 0) + 1 / draws;
  }
  return Object.fromEntries(Object.entries(n).map(([k, v]) => [k, r2(v)]));
}

function runEngine(E, s, refs, seedText) {
  const { goal, diagnostic } = E.proposeGoal(s.history, s.role, { references: refs, now: s.cut - 2 });
  if (!goal) return { goal: null, why: diagnostic.find(d => d.reason)?.reason || "aucune métrique éligible" };
  const active = E.transition(goal, "active", s.cut - 1);
  if (goal.baseline_window && !(goal.baseline_window.to_ms < s.cut)) throw new Error("fenêtre de départ qui chevauche l'évaluation");
  const ev = E.evaluateGoal(active, s.future, s.cut);
  const vals = ev.evaluations.filter(e => e.counted && e.value != null).map(e => e.value);
  const sd = goal.personal_sd || null;
  const dir = goal.direction === "higher" ? 1 : -1;
  return { metric: goal.metric, family: fam(goal.metric), baseline: goal.baseline, target: goal.target, outcome: ev.outcome,
    met: ev.goal.progress.met, delta_sd: ev.goal.progress.delta_sd ?? (sd && vals.length ? r2(dir * (median(vals) - goal.baseline) / sd) : null),
    breach: Object.entries(ev.goal.progress.guardrails || {}).filter(([, r]) => r.breach).map(([k]) => k), chance: chance(goal, s.history),
    chance_outcomes: chanceOutcomes(E, active, s, seedText) };
}

function summarize(rows) {
  const goals = rows.filter(r => r.metric);
  const decided = goals.filter(r => r.outcome && r.outcome !== "inconclusive");
  const count = Object.fromEntries([...new Set(goals.map(r => r.outcome || "en-cours"))].map(o => [o, goals.filter(r => (r.outcome || "en-cours") === o).length]));
  const mastered = decided.filter(r => r.outcome === "achieved").length;
  const exp = decided.map(r => r.chance?.mastery).filter(v => v != null);
  return { players: rows.length, goals: goals.length, outcomes: count,
    mastery_rate: decided.length ? r2(mastered / decided.length) : null,
    chance_mastery_rate: exp.length ? r2(exp.reduce((a, b) => a + b, 0) / exp.length) : null,
    median_delta_sd: r2(median(goals.map(r => r.delta_sd).filter(v => v != null))),
    guardrail_breaches: goals.filter(r => r.breach?.length).length,
    // Fréquence attendue par hasard de chaque résultat (moyenne des tirages), à comparer à outcomes / goals
    chance_outcomes: Object.fromEntries([...new Set(goals.flatMap(r => Object.keys(r.chance_outcomes || {})))].map(k => [k, r2(goals.reduce((a, r) => a + (r.chance_outcomes?.[k] || 0), 0))])) };
}

export async function run() {
  const players = await loadPlayers();
  const splits = players.map(p => ({ ...p, s: split(p.games) }));
  const used = splits.filter(p => p.s.cut);
  const refRows = await loadReferenceRows();
  const rows = { old: [], new: [] }, refInfo = [];
  for (const p of used) {
    const r = referencesFrom(refRows, { before: p.s.cut });
    refInfo.push({ games: r.games, sample_games: r.sample_games });
    for (const [name, E] of [["old", OLD], ["new", NEW]]) rows[name].push({ tier: p.tier, role: p.s.role, ...runEngine(E, p.s, r.references, p.player) });
  }
  const groups = (key, list) => Object.fromEntries([...new Set(list.map(r => r[key]).filter(Boolean))].sort().map(k => [k, summarize(list.filter(r => r[key] === k))]));
  const report = {
    at: new Date().toISOString(),
    method: "Évaluation = 5 dernières parties valides au poste principal ; départ = parties antérieures ; repères Diamant+ antérieurs à la plus ancienne partie évaluée. Joueurs qui ne suivaient aucun objectif : calibration, pas effet du coach.",
    players: { total: players.length, used: used.length, excluded: splits.filter(p => !p.s.cut).map(p => ({ tier: p.tier, reason: p.s.reason })) },
    references: { per_player: true, median_games: median(refInfo.map(r => r.games)), median_sample_games: median(refInfo.map(r => r.sample_games)), players_without_measured_reference: refInfo.filter(r => r.games + r.sample_games === 0).length },
    engines: Object.fromEntries(Object.entries(rows).map(([name, list]) => [name, { all: summarize(list), by_tier: groups("tier", list), by_role: groups("role", list), by_family: groups("family", list.filter(r => r.metric)) }])),
    rows,
  };
  await writeFile("coach/cache/battery/rapport-goals-2.json", JSON.stringify(report, null, 1));
  return report;
}

if (process.argv[1]?.endsWith("replay-goals.mjs")) run().then(r => {
  console.log(`${r.players.used} joueurs rejoués sur ${r.players.total} ; repères par joueur (médiane ${r.references.median_games} parties minute par minute, ${r.references.median_sample_games} fins de partie ; ${r.references.players_without_measured_reference} joueurs sans repère mesuré)`);
  for (const [name, e] of Object.entries(r.engines)) {
    console.log(`\n== ${name === "old" ? "Ancien moteur (goals-1)" : "Nouveau moteur (goals-2)"} ==`, JSON.stringify(e.all));
    for (const g of ["by_tier", "by_role", "by_family"]) { console.log(` ${g}`); for (const [k, v] of Object.entries(e[g])) console.log(`   ${k.padEnd(14)} objectifs ${v.goals}, maîtrise ${v.mastery_rate} (hasard ${v.chance_mastery_rate}), Δ médian ${v.median_delta_sd} s, alertes garde-fous ${v.guardrail_breaches}`, JSON.stringify(v.outcomes), "hasard", JSON.stringify(v.chance_outcomes)); }
  }
}, e => { console.error(e.stack); process.exit(1); });
