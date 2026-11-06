// Rejeu du moteur d'objectifs (goals.mjs, catalogue courant) sur les parties brutes par joueur (coach/battery-raw.mjs) :
// part des objectifs de farm, répartition par catégorie et par poste, maîtrise observée contre maîtrise par hasard.
// Même découpe que coach/replay-goals.mjs : évaluation = 5 dernières parties valides au poste principal, départ = tout ce qui
// précède. Les repères Diamant+ viennent de coach/cache/metric-references.json s'il existe (sinon seuils pédagogiques).
// --activer a,b,c : active en plus ces métriques (autoPropose) pour mesurer l'effet avant de changer le catalogue.
// Usage : node coach/replay-raw.mjs [--activer ward_kills_20,control_wards_20,first_item_min,gold_idle_share]

import { readdir, readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { computeMetrics, CATALOG } from "./metrics.mjs";
import { proposeGoal, transition, evaluateGoal, RULES } from "./goals.mjs";

// --dossier : autre série de parties brutes (par exemple coach/cache/battery-perso, clé personnelle)
const DIR = process.argv.includes("--dossier") ? process.argv[process.argv.indexOf("--dossier") + 1] : "coach/cache/battery-raw", EVAL = 5, MIN_BASE = 15;
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
if (arg("--plancher")) RULES.rotationFloor = Number(arg("--plancher"));
for (const k of (arg("--activer") || "").split(",").filter(Boolean)) { if (!CATALOG[k]) throw new Error(`métrique inconnue : ${k}`); CATALOG[k].autoPropose = true; }
const refs = await readFile("coach/cache/metric-references.json", "utf8").then(j => JSON.parse(j).references).catch(() => null);
const binomAtLeast = (n, k, p) => { let s = 0; for (let i = k; i <= n; i++) { let c = 1; for (let j = 0; j < i; j++) c = c * (n - j) / (j + 1); s += c * p ** i * (1 - p) ** (n - i); } return s; };

const rows = [];
for (const d of (await readdir(DIR).catch(() => [])).filter(d => /^[A-Z]+-\d+$/.test(d))) {
  const games = [];
  for (const f of (await readdir(`${DIR}/${d}`)).filter(f => f.endsWith(".json.gz"))) {
    let g; try { g = JSON.parse(gunzipSync(await readFile(`${DIR}/${d}/${f}`)).toString()); } catch { continue; }
    try { games.push(computeMetrics(g.match, g.timeline, g.me)); } catch { /* joueur absent */ }
  }
  const by = {}; for (const g of games) if (g.valid && g.role) by[g.role] = (by[g.role] || 0) + 1;
  const role = Object.entries(by).sort((a, b) => b[1] - a[1])[0]?.[0];
  const chrono = games.filter(g => g.start_ms != null).sort((a, b) => a.start_ms - b.start_ms);
  const inRole = chrono.filter(g => g.valid && g.role === role);
  if (!role || inRole.length < MIN_BASE + EVAL) { rows.push({ tier: d.split("-")[0], role, skipped: `${inRole.length} parties au poste` }); continue; }
  const cut = inRole[inRole.length - EVAL].start_ms;
  const history = chrono.filter(g => g.start_ms < cut).reverse(), future = chrono.filter(g => g.start_ms >= cut);
  const { goal, diagnostic } = proposeGoal(history, role, { references: refs, now: cut - 2 });
  if (!goal) { rows.push({ tier: d.split("-")[0], role, skipped: diagnostic.find(x => x.reason)?.reason || "aucune métrique éligible" }); continue; }
  const ev = evaluateGoal(transition(goal, "active", cut - 1), future, cut);
  const dir = goal.direction === "higher" ? 1 : -1;
  const base = history.filter(g => g.valid && g.role === role).slice(0, 20).map(g => g.metrics[goal.metric]?.value).filter(v => v != null);
  const p = base.length ? base.filter(v => dir * (v - goal.target) >= 0).length / base.length : null;
  // Cycle suivant : que proposerait le moteur après ce premier objectif (archivé avec son issue), sur le même historique ? Mesure la rotation.
  const closed = { ...goal, status: "archived", outcome: ev.outcome || "achieved", active_at: cut - 1, created_at: cut - 2 };
  const next = proposeGoal(history, role, { references: refs, pastGoals: [closed], now: cut }).goal;
  rows.push({ tier: d.split("-")[0], role, metric: goal.metric, category: goal.category, family: CATALOG[goal.metric].family || goal.metric, outcome: ev.outcome, chance: p == null ? null : binomAtLeast(EVAL, 3, p),
    next: next ? { metric: next.metric, category: next.category, family: CATALOG[next.metric].family || next.metric, sameFamily: (CATALOG[next.metric].family || next.metric) === (CATALOG[goal.metric].family || goal.metric) } : null,
    second: diagnostic.filter(x => x.eligible && x.metric !== goal.metric).slice(0, 1).map(x => `${x.metric} ${x.adjusted_score ?? x.score}`)[0] || null });
}
const done = rows.filter(r => r.metric);
const count = f => done.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
const farm = done.filter(r => r.family === "farm").length;
console.log(`${rows.length} joueurs, ${done.length} objectifs (${rows.length - done.length} sans objectif) · farm ${farm}/${done.length} = ${Math.round(100 * farm / Math.max(1, done.length))} %`);
console.log("par catégorie :", JSON.stringify(count(r => r.category)));
console.log("par métrique  :", JSON.stringify(count(r => r.metric)));
for (const role of ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"]) { const rr = done.filter(r => r.role === role); console.log(role.padEnd(8), rr.length, JSON.stringify(count.call(null, r => r.category) && rr.reduce((m, r) => ((m[r.metric] = (m[r.metric] || 0) + 1), m), {}))); }
const decided = done.filter(r => r.outcome && r.outcome !== "inconclusive"), mastered = decided.filter(r => r.outcome === "achieved").length;
const chance = decided.map(r => r.chance).filter(v => v != null);
console.log(`maîtrise observée ${decided.length ? Math.round(100 * mastered / decided.length) : "—"} % · par hasard ${chance.length ? Math.round(100 * chance.reduce((a, b) => a + b, 0) / chance.length) : "—"} % · issues ${JSON.stringify(count(r => r.outcome || "en-cours"))}`);
const nexts = done.filter(r => r.next);
console.log(`cycle 2 : ${nexts.filter(r => r.next.sameFamily).length}/${nexts.length} restent sur la même famille · catégories suivantes ${JSON.stringify(nexts.reduce((m, r) => ((m[r.next.category] = (m[r.next.category] || 0) + 1), m), {}))} · farm au cycle 2 : ${Math.round(100 * nexts.filter(r => r.next.family === "farm").length / Math.max(1, nexts.length))} %`);
console.log("sans objectif :", JSON.stringify(rows.filter(r => !r.metric).reduce((m, r) => ((m[r.skipped] = (m[r.skipped] || 0) + 1), m), {})));
