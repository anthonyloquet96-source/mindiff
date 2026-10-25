// Choix de l'objectif (COACH-007) et cycle de vie (COACH-008) du coach V1. Déterministe, sans LLM, testé.
// Entrées : les sorties de computeMetrics (coach/metrics.mjs) d'un joueur, plus récentes en premier.
//
// Score S = 100 × G × I × F × A × C, chaque facteur dans [0, 1] :
//   G gravité = clamp(max(0, écart orienté) / (2·s)) ; écart = cible de référence − médiane personnelle ;
//     s = 1,4826 × MAD des parties du joueur (plancher par métrique)
//   I impact, A actionnabilité : constantes du catalogue
//   F fréquence : part des parties du joueur moins bonnes que la référence
//   C confiance : part d'observations valides × min(1, observations / 20)
// Référence : metric_references (mesurées, échantillon suffisant) sinon le seuil pédagogique du catalogue.
// L'historique personnel donne le point de départ (baseline) et la marche suivante : la cible n'est jamais la
// référence d'un coup, mais au plus une marche d'un écart typique (s) au-dessus de la médiane du joueur.

import { CATALOG, formatMetric } from "./metrics.mjs";

export const GOAL_VERSION = "coach-v1";
export const RULES = { minGames: 8, minValidShare: 0.7, historyMax: 50, baselineGames: 20, minRefSample: 200, evaluationGames: 5, minimumValid: 4, successRequired: 3, maxFailures: 2 };
const FLOOR = { cs_at_10: 4, cs_at_15: 6, cs_per_min: 0.4, early_deaths: 0.75, kill_participation: 0.05, vision_per_min: 0.1 };

const median = a => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
const mad = a => { const m = median(a); return m == null ? null : median(a.map(v => Math.abs(v - m))); };
const clamp01 = x => Math.max(0, Math.min(1, x));
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

// Référence d'une métrique pour un rôle : mesurée si l'échantillon suffit, sinon seuil pédagogique
export function referenceFor(key, role, references = null) {
  const r = references?.[role]?.[key];
  if (r && r.n >= RULES.minRefSample && r.p50 != null) return { value: r.p50, source: "metric_references", n: r.n, level: r.level || null };
  const p = CATALOG[key]?.pedagogical?.[role];
  return p == null ? null : { value: p, source: "seuil-pedagogique", n: null, level: null };
}

// Diagnostic : toutes les métriques entraînables du rôle, notées ; la première est l'objectif proposé
export function prioritize(games, role, { references = null, exclude = [], stepFactor = 1 } = {}) {
  const comparable = games.filter(g => g.valid && g.role === role).slice(0, RULES.historyMax);
  const out = [];
  for (const [key, c] of Object.entries(CATALOG)) {
    if (!c.trainable || !c.roles.includes(role)) continue;
    const obs = comparable.map(g => g.metrics[key]?.value ?? null);
    const valid = obs.filter(v => v != null);
    const share = comparable.length ? valid.length / comparable.length : 0;
    const row = { metric: key, label: c.label, games: comparable.length, valid: valid.length, eligible: false, reason: null };
    if (comparable.length < RULES.minGames) { out.push({ ...row, reason: `moins de ${RULES.minGames} parties comparables` }); continue; }
    if (share < RULES.minValidShare) { out.push({ ...row, reason: `moins de ${Math.round(RULES.minValidShare * 100)} % d'observations valides` }); continue; }
    if (exclude.includes(key)) { out.push({ ...row, reason: "deux échecs de suite : mise de côté jusqu'au prochain diagnostic" }); continue; }
    const ref = referenceFor(key, role, references);
    if (!ref) { out.push({ ...row, reason: "aucune référence pour ce rôle" }); continue; }
    const dir = c.direction === "higher" ? 1 : -1;
    const recent = valid.slice(0, RULES.baselineGames);
    const baseline = median(recent);
    const s = Math.max(1.4826 * mad(recent), FLOOR[key] ?? 0);
    const gap = dir * (ref.value - baseline);
    const G = clamp01(Math.max(0, gap) / (2 * s));
    const F = valid.filter(v => dir * (ref.value - v) > 0).length / valid.length;
    const C = share * Math.min(1, valid.length / 20);
    const score = 100 * G * c.impact * F * c.actionability * C;
    // Marche suivante, calée sur le joueur lui-même : le niveau qu'il atteint déjà dans environ une partie sur trois
    // (65e centile de ses parties récentes ; 60e après un échec), au moins une unité de mieux que sa médiane, jamais au-delà
    // de la référence. Batterie du 26/10 sur de vrais joueurs : « médiane + un écart typique » n'était atteint que dans
    // 8 à 33 % de leurs propres parties, et 5 objectifs tranchés sur 6 étaient ratés.
    const unit = 10 ** -(c.percent ? 2 : c.decimals ?? 0), dec = c.percent ? 2 : c.decimals ?? 0;
    const pq = stepFactor < 1 ? 0.6 : 0.65;
    const sorted = [...recent].sort((x, y) => x - y);
    const personal = c.direction === "higher" ? sorted[Math.floor(pq * (sorted.length - 1))] : sorted[Math.ceil((1 - pq) * (sorted.length - 1))];
    let target = dir > 0 ? Math.min(ref.value, Math.max(personal, baseline + unit)) : Math.max(ref.value, Math.min(personal, baseline - unit));
    target = c.direction === "lower" ? Math.floor(target + 1e-9) : round(target, dec);
    if (dir * (target - baseline) <= 0) target = round(baseline + dir * unit, dec);
    out.push({ ...row, eligible: gap > 0, reason: gap > 0 ? null : "déjà au niveau de la référence", baseline: round(baseline, 3), spread: round(s, 3), reference: ref, target,
      factors: { G: round(G, 3), I: c.impact, F: round(F, 3), A: c.actionability, C: round(C, 3) }, score: round(score, 2) });
  }
  return out.sort((a, b) => (b.eligible - a.eligible) || ((b.score ?? -1) - (a.score ?? -1)) || a.metric.localeCompare(b.metric));
}

// Contrat d'objectif proposé à partir de la ligne la mieux notée
export function proposeGoal(games, role, { references = null, pastGoals = [], now = Date.now() } = {}) {
  // Deux échecs de suite sur une métrique : on la met de côté ; un seul échec : même métrique, marche réduite de moitié
  const last = pastGoals.filter(g => ["achieved", "failed", "inconclusive", "archived"].includes(g.status) && g.role === role).sort((a, b) => b.created_at - a.created_at);
  const exclude = [...new Set(last.filter((g, i) => g.outcome === "failed" && last[i + 1]?.outcome === "failed" && last[i + 1]?.metric === g.metric).map(g => g.metric))];
  const failedOnce = last[0]?.outcome === "failed" && !exclude.includes(last[0].metric) ? last[0].metric : null;
  let rows = prioritize(games, role, { references, exclude });
  if (failedOnce) {
    const again = prioritize(games, role, { references, exclude, stepFactor: 0.5 }).find(r => r.metric === failedOnce && r.eligible);
    if (again) rows = [again, ...rows.filter(r => r.metric !== failedOnce)];
  }
  const best = rows.find(r => r.eligible);
  if (!best) return { goal: null, diagnostic: rows };
  const c = CATALOG[best.metric];
  return {
    diagnostic: rows,
    goal: {
      id: `${role}-${best.metric}-${now}`, metric: best.metric, role, direction: c.direction,
      baseline: best.baseline, target: best.target, reference: best.reference,
      evaluation_games: RULES.evaluationGames, minimum_valid_games: RULES.minimumValid, success_required: RULES.successRequired,
      version: GOAL_VERSION, status: "proposed", created_at: now, score: best.score, factors: best.factors,
      exercise: c.exercise ? c.exercise(best.target) : null,
      kbThemes: c.kbThemes || [],
    },
  };
}

// Transitions autorisées
const NEXT = { proposed: ["active"], active: ["evaluating"], evaluating: ["achieved", "failed", "inconclusive"], achieved: ["archived"], failed: ["archived"], inconclusive: ["archived"] };
export function transition(goal, to, now = Date.now()) {
  if (!NEXT[goal.status]?.includes(to)) throw Object.assign(new Error(`Transition interdite : ${goal.status} → ${to}`), { code: "transition-interdite" });
  return { ...goal, status: to, [`${to}_at`]: now };
}

// Un seul objectif actif ou en évaluation par joueur
export function assertSingleActive(goals) {
  const open = goals.filter(g => g.status === "active" || g.status === "evaluating");
  if (open.length > 1) throw Object.assign(new Error("Plusieurs objectifs ouverts pour ce joueur."), { code: "objectif-multiple" });
  return open[0] || null;
}

// Évaluation sur les parties jouées après l'activation, dans l'ordre chronologique. Victoire ou défaite ne comptent pas.
// Fenêtre : les 5 premières parties valides au même rôle. Au moins 4 observations valides : 3 cibles atteintes = réussite,
// sinon échec. Moins de 4 valides dans la fenêtre, ou 5 parties valides jouées à un autre rôle d'abord : inconclusif.
export function evaluateGoal(goal, games, now = Date.now()) {
  if (!["active", "evaluating"].includes(goal.status)) throw Object.assign(new Error("Objectif non actif."), { code: "objectif-inactif" });
  const after = games.filter(g => g.start_ms != null && g.start_ms > goal.active_at).sort((a, b) => a.start_ms - b.start_ms);
  const dir = goal.direction === "higher" ? 1 : -1;
  const rows = [];
  let inRole = 0, offRole = 0, validObs = 0, met = 0;
  for (const g of after) {
    if (!g.valid) { rows.push({ match_id: g.match_id, counted: false, reason: g.invalid_reason }); continue; }
    if (g.role !== goal.role) { offRole++; rows.push({ match_id: g.match_id, counted: false, reason: "autre-role" }); if (offRole >= goal.evaluation_games && inRole === 0) break; continue; }
    if (inRole >= goal.evaluation_games) break;
    inRole++;
    const v = g.metrics[goal.metric]?.value ?? null;
    const ok = v != null && dir * (v - goal.target) >= 0;
    if (v != null) { validObs++; if (ok) met++; }
    rows.push({ match_id: g.match_id, counted: true, value: v, met: v == null ? null : ok, won: g.won });
  }
  let status = inRole || offRole ? "evaluating" : goal.status;
  let outcome = null;
  if (inRole >= goal.evaluation_games) outcome = validObs < goal.minimum_valid_games ? "inconclusive" : met >= goal.success_required ? "achieved" : "failed";
  else if (offRole >= goal.evaluation_games && inRole === 0) outcome = "inconclusive";
  let next = goal;
  if (status === "evaluating" && goal.status === "active") next = transition(goal, "evaluating", now);
  if (outcome) next = { ...transition(next.status === "evaluating" ? next : transition(next, "evaluating", now), outcome, now), outcome };
  return { goal: { ...next, progress: { counted: inRole, valid: validObs, met, needed: goal.success_required, window: goal.evaluation_games } }, evaluations: rows, outcome };
}
