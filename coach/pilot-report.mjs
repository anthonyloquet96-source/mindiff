// Rapport du test privé (5 à 10 volontaires inscrits) : ce que le coach a réellement produit pour des joueurs qui suivaient
// leur objectif, à comparer au rejeu (coach/replay-goals.mjs), où personne ne suivait d'objectif.
// Pour chaque cycle terminé du moteur goals-2 : fenêtre de départ (15 à 20 parties, vérifiée antérieure à l'évaluation),
// 5 parties évaluées, maîtrise, progrès (Δ en écarts typiques personnels), garde-fous, avis du testeur (pertinence, effets
// indésirables). Comparaison : maîtrise attendue par hasard (mêmes parties de départ), et ce que l'ancien moteur (goals-1)
// aurait proposé avec les mêmes parties connues à l'activation, évalué sur les mêmes parties.
// Testeurs pseudonymisés (testeur-1…) : ni PUUID, ni Riot ID, ni identifiant de compte dans le rapport.
// Usage : node --env-file=.env coach/pilot-report.mjs --supabase   (SUPABASE_URL, SUPABASE_SERVICE_KEY)
//         node coach/pilot-report.mjs --local coach/cache/v1/store.json   (serveur local)
//   → coach/cache/pilot/rapport.json (privé)

import { mkdir, writeFile } from "node:fs/promises";
import { CATALOG } from "./metrics.mjs";
import * as NEW from "./goals.mjs";
import * as OLD from "./goals-v1.mjs";

const median = a => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const r2 = v => (v == null ? null : Math.round(v * 100) / 100);
const binomAtLeast = (n, k, p) => { let s = 0; for (let i = k; i <= n; i++) { let c = 1; for (let j = 0; j < i; j++) c = c * (n - j) / (j + 1); s += c * p ** i * (1 - p) ** (n - i); } return s; };
const count = list => list.reduce((o, k) => ({ ...o, [k]: (o[k] || 0) + 1 }), {});

// Un cycle terminé : goal (avec progress, baseline_window, active_at), evaluations, feedback ; games = toutes les parties du testeur
export function cycleRow(goal, evaluations, feedback, games, references = null) {
  const byId = new Map(games.map(g => [g.match_id, g]));
  const counted = evaluations.filter(e => e.counted).map(e => byId.get(e.match_id)).filter(Boolean).sort((a, b) => a.start_ms - b.start_ms);
  const end = goal.baseline_window?.to_ms ?? null;
  const baseIds = goal.baseline_window?.match_ids || [];
  const baseline = baseIds.map(id => byId.get(id)).filter(Boolean);
  const chrono = end != null && counted.length > 0 && counted.every(g => g.start_ms > end) && baseline.every(g => g.start_ms <= end);
  const dir = goal.direction === "higher" ? 1 : -1;
  const baseVals = baseline.map(g => g.metrics[goal.metric]?.value).filter(v => v != null);
  const p = baseVals.length ? baseVals.filter(v => dir * (v - goal.target) >= 0).length / baseVals.length : null;
  // Ancien moteur : mêmes parties connues à l'activation (jusqu'à la fin de la fenêtre de départ), mêmes parties évaluées
  let old = null;
  if (end != null) {
    const known = games.filter(g => g.start_ms != null && g.start_ms <= end).sort((a, b) => b.start_ms - a.start_ms);
    const { goal: og } = OLD.proposeGoal(known, goal.role, { references, now: end + 1 });
    if (og) {
      const ev = OLD.evaluateGoal(OLD.transition(og, "active", end + 1), counted, end + 2);
      old = { metric: og.metric, baseline: og.baseline, target: og.target, outcome: ev.outcome, met: ev.goal.progress?.met ?? null, same_metric: og.metric === goal.metric };
    } else old = { metric: null };
  }
  return {
    chain_id: goal.chain_id || goal.id, cycle: goal.cycle || 1, metric: goal.metric, family: CATALOG[goal.metric]?.family || goal.metric, role: goal.role,
    baseline: goal.baseline, target: goal.target, target_quantile: goal.target_quantile ?? null,
    baseline_games: baseline.length, chronology_ok: chrono, evaluated_games: counted.length,
    outcome: goal.outcome || goal.status, met: goal.progress?.met ?? null, delta_sd: goal.progress?.delta_sd ?? null,
    guardrail_breach: Object.entries(goal.progress?.guardrails || {}).filter(([, r]) => r.breach).map(([k]) => k),
    chance_mastery: p == null ? null : r2(binomAtLeast(5, 3, p)),
    relevance: feedback?.relevance ?? null, side_effects: feedback?.side_effects || [], comment: feedback?.comment || null,
    old,
  };
}

export function summarize(rows) {
  const decided = rows.filter(r => !["inconclusive", null, undefined].includes(r.outcome));
  const rel = rows.map(r => r.relevance).filter(v => v != null);
  const oldDecided = rows.filter(r => r.old?.outcome && r.old.outcome !== "inconclusive");
  return {
    cycles: rows.length,
    chronology_violations: rows.filter(r => !r.chronology_ok).length,
    outcomes: count(rows.map(r => r.outcome)),
    mastery_rate: decided.length ? r2(decided.filter(r => r.outcome === "achieved").length / decided.length) : null,
    chance_mastery_rate: r2(mean(decided.map(r => r.chance_mastery).filter(v => v != null))),
    median_delta_sd: r2(median(rows.map(r => r.delta_sd).filter(v => v != null))),
    guardrail_breaches: rows.filter(r => r.guardrail_breach.length).length,
    feedback: { answered: rows.filter(r => r.relevance != null || r.side_effects.length).length, mean_relevance: r2(mean(rel)), relevance: count(rel), side_effects: count(rows.flatMap(r => r.side_effects)) },
    old_engine: { cycles: oldDecided.length, outcomes: count(rows.map(r => r.old?.outcome || "aucun objectif")), mastery_rate: oldDecided.length ? r2(oldDecided.filter(r => r.old.outcome === "achieved").length / oldDecided.length) : null, same_metric: rows.filter(r => r.old?.same_metric).length },
  };
}

// testers : [{ games, goals: [{ ...goal, evaluations, feedback }] }] ; l'ordre donne les pseudonymes
export function pilotReport(testers, { references = null } = {}) {
  const per = testers.map((t, i) => {
    const done = t.goals.filter(g => g.engine_version === NEW.GOAL_VERSION && (NEW.OUTCOMES.includes(g.status) || (g.status === "archived" && g.outcome)));
    const rows = done.sort((a, b) => (a.active_at || 0) - (b.active_at || 0)).map(g => cycleRow(g, g.evaluations || [], g.feedback || null, t.games, references));
    return { tester: `testeur-${i + 1}`, games: t.games.length, rows };
  });
  const all = per.flatMap(p => p.rows.map(r => ({ tester: p.tester, ...r })));
  const groups = key => Object.fromEntries([...new Set(all.map(r => r[key]))].sort().map(k => [k, summarize(all.filter(r => r[key] === k))]));
  return {
    at: new Date().toISOString(),
    method: "Cycles terminés du moteur goals-2 chez les testeurs inscrits. Hasard : P(au moins 3 cibles sur 5) avec la part des parties de départ qui atteignent déjà la cible. Ancien moteur : proposé sur les parties connues à l'activation, évalué sur les mêmes 5 parties.",
    testers: per.length, all: summarize(all), by_role: groups("role"), by_family: groups("family"), per_tester: per,
  };
}

async function loadLocal(file) {
  const { createStore } = await import("./v1/store.mjs");
  const { readFile } = await import("node:fs/promises");
  const store = createStore({ file });
  const ids = Object.keys(JSON.parse(await readFile(file, "utf8")).players || {});
  return Promise.all(ids.map(id => loadTester(store, id)));
}
async function loadSupabase() {
  const { createSupabaseRest, createSupabaseStore } = await import("./v1/store-supabase.mjs");
  const rest = createSupabaseRest({ url: process.env.SUPABASE_URL, serviceKey: process.env.SUPABASE_SERVICE_KEY });
  const store = createSupabaseStore(rest);
  const testers = (await rest.rest("GET", "pilot_testers?select=user_id&revoked_at=is.null")).map(r => r.user_id);
  if (!testers.length) return [];
  const players = await rest.rest("GET", `players?user_id=in.(${testers.map(encodeURIComponent).join(",")})&select=id`);
  return Promise.all(players.map(p => loadTester(store, p.id)));
}
async function loadTester(store, id) {
  const [games, goals] = await Promise.all([store.listMetrics(id), store.listGoals(id)]);
  return { games, goals: await Promise.all(goals.map(async g => ({ ...g, evaluations: await store.listEvaluations(g.id), feedback: store.getFeedback ? await store.getFeedback(g.id) : null }))) };
}

if (process.argv[1]?.endsWith("pilot-report.mjs")) {
  const i = process.argv.indexOf("--local");
  const testers = i > 0 ? await loadLocal(process.argv[i + 1]) : process.argv.includes("--supabase") ? await loadSupabase() : null;
  if (!testers) { console.error("Usage : node coach/pilot-report.mjs --local <store.json> | --supabase"); process.exit(1); }
  let references = null;
  try { const { readFile } = await import("node:fs/promises"); references = JSON.parse(await readFile("coach/cache/metric-references.json", "utf8")).references || null; } catch {}
  const r = pilotReport(testers, { references });
  await mkdir("coach/cache/pilot", { recursive: true });
  await writeFile("coach/cache/pilot/rapport.json", JSON.stringify(r, null, 1));
  console.log(`${r.testers} testeurs, ${r.all.cycles} cycles terminés.`, JSON.stringify(r.all));
}
