// Choix de l'objectif (COACH-007) et cycle de vie (COACH-008) du coach V1. Déterministe, sans LLM, testé.
// Entrées : les sorties de computeMetrics (coach/metrics.mjs) d'un joueur, plus récentes en premier.
//
// Score S = 100 × G × I × F × A × C, chaque facteur dans [0, 1] (inchangé depuis goals-1) :
//   G gravité = clamp(max(0, écart orienté) / (2·s)) ; écart = cible de référence − médiane personnelle ;
//     s = 1,4826 × MAD des parties du joueur (plancher par métrique)
//   I impact, A actionnabilité : constantes du catalogue
//   F fréquence : part des parties du joueur moins bonnes que la référence
//   C confiance : part d'observations valides × min(1, observations / 20)
// Référence : metric_references (mesurées, échantillon suffisant) sinon le seuil pédagogique du catalogue.
//
// goals-2 (correctifs prioritaires d'Anthony, 26/10/2026) :
//   - fenêtre de départ : les 15 à 20 dernières parties valides au poste, toutes antérieures à l'activation ;
//   - cible : 55e centile personnel (60e après une maîtrise de la même métrique), au moins une unité de mieux que la
//     médiane, jamais au-delà de la référence ; maîtrise = cible atteinte dans 3 des 5 parties suivantes ;
//   - progrès mesuré sur ces 5 parties futures, distinctes du départ : médiane future − médiane de départ, en écarts
//     typiques personnels (s) ; progrès à partir de 0,25·s ;
//   - garde-fous par poste (sbires et XP à 10 min, activité) : une dégradation nette refuse la validation ;
//   - un cycle sans maîtrise n'est pas un échec : improving ou stable, puis un nouveau cycle sur le même objectif ;
//     échec seulement après deux cycles de suite sans maîtrise ni progrès ;
//   - morts avant 14 min : plus proposées automatiquement (risque de jeu passif), visibles au diagnostic.

import { CATALOG, GUARDRAILS } from "./metrics.mjs";

export const GOAL_VERSION = "goals-2";
export const RULES = {
  minGames: 15, baselineGames: 20, minValidShare: 0.7, historyMax: 50, minRefSample: 200,
  evaluationGames: 5, minimumValid: 4, successRequired: 3,
  targetQuantile: 0.55, targetQuantileAfterMastery: 0.6,
  progressSd: 0.25, guardrailSd: 0.5, guardrailGames: 3,
};
const FLOOR = { cs_at_10: 4, cs_at_15: 6, cs_per_min: 0.4, early_deaths: 0.75, kill_participation: 0.05, vision_per_min: 0.1, xp_at_10: 150, objective_participation: 0.1 };
// Résultats d'un cycle d'évaluation
export const OUTCOMES = ["achieved", "improving", "stable", "needs_review", "failed", "inconclusive"];

const median = a => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
const mad = a => { const m = median(a); return m == null ? null : median(a.map(v => Math.abs(v - m))); };
const clamp01 = x => Math.max(0, Math.min(1, x));
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const fam = k => CATALOG[k]?.family || k;
// Écart typique personnel robuste, avec plancher (une série trop régulière ne doit pas rendre tout progrès « énorme »)
export const personalSd = (key, values) => Math.max(1.4826 * (mad(values) ?? 0), FLOOR[key] ?? 0);
// Centile d'une série triée, orienté : pour « plus bas = mieux », le 55e centile de performance est le 45e des valeurs
function quantileOf(sorted, q, direction) { return direction === "higher" ? sorted[Math.floor(q * (sorted.length - 1))] : sorted[Math.ceil((1 - q) * (sorted.length - 1))]; }

// Référence d'une métrique pour un rôle : mesurée si l'échantillon suffit, sinon seuil pédagogique
// Joueur déjà au niveau de la médiane : marche suivante = le quart supérieur de la même référence (p75, ou p25 quand
// « plus bas = mieux »), pour qu'un joueur Diamant+ ait aussi un objectif mesuré
export function referenceFor(key, role, references = null, baseline = null) {
  const r = references?.[role]?.[key];
  if (r && r.n >= RULES.minRefSample && r.p50 != null) {
    const dir = CATALOG[key]?.direction === "lower" ? -1 : 1;
    const upper = dir > 0 ? r.p75 : r.p25;
    if (baseline != null && dir * (r.p50 - baseline) <= 0 && upper != null && dir * (upper - baseline) > 0) return { value: upper, source: "metric_references", quantile: dir > 0 ? "p75" : "p25", n: r.n, level: r.level || null };
    return { value: r.p50, source: "metric_references", quantile: "p50", n: r.n, level: r.level || null };
  }
  const p = CATALOG[key]?.pedagogical?.[role];
  return p == null ? null : { value: p, source: "seuil-pedagogique", n: null, level: null };
}

// Fenêtre de départ : les parties valides au poste, plus récentes d'abord, au plus baselineGames
export function baselineWindow(games, role) {
  const w = games.filter(g => g.valid && g.role === role).slice(0, RULES.baselineGames);
  const ts = w.map(g => g.start_ms).filter(v => v != null);
  return { games: w, info: { games: w.length, from_ms: ts.length ? Math.min(...ts) : null, to_ms: ts.length ? Math.max(...ts) : null, match_ids: w.map(g => g.match_id) } };
}

// Garde-fous du poste pour un objectif : niveau de départ (médiane, écart typique, quart bas orienté) sur la fenêtre de départ.
// La métrique visée et sa famille (sbires à 10 min pour un objectif de sbires à 15 min) n'en font pas partie.
export function guardrailBaseline(windowGames, role, metric) {
  const out = {};
  for (const k of GUARDRAILS[role] || []) {
    if (k === metric || fam(k) === fam(metric)) continue;
    const v = windowGames.map(g => g.metrics[k]?.value).filter(x => x != null);
    if (v.length < RULES.minimumValid) continue;
    const s = [...v].sort((a, b) => a - b);
    out[k] = { median: round(median(v), 4), sd: round(personalSd(k, v), 4), low: quantileOf(s, 0.25, CATALOG[k].direction), n: v.length };
  }
  return out;
}

// Diagnostic : toutes les métriques entraînables du rôle, notées ; la première éligible est l'objectif proposé
export function prioritize(games, role, { references = null, exclude = [], quantileFor = () => RULES.targetQuantile } = {}) {
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
    if (exclude.includes(key)) { out.push({ ...row, reason: "mise de côté après un échec ou une alerte, jusqu'au prochain diagnostic" }); continue; }
    const dir = c.direction === "higher" ? 1 : -1;
    const recent = comparable.slice(0, RULES.baselineGames).map(g => g.metrics[key]?.value).filter(v => v != null);
    const baseline = median(recent);
    const ref = referenceFor(key, role, references, baseline);
    if (!ref) { out.push({ ...row, reason: "aucune référence pour ce rôle" }); continue; }
    const s = personalSd(key, recent);
    const gap = dir * (ref.value - baseline);
    const G = clamp01(Math.max(0, gap) / (2 * s));
    const F = valid.filter(v => dir * (ref.value - v) > 0).length / valid.length;
    const C = share * Math.min(1, valid.length / 20);
    const score = 100 * G * c.impact * F * c.actionability * C;
    // Cible : centile personnel (55e, 60e après une maîtrise), au moins une unité de mieux que la médiane, jamais au-delà de la référence
    const q = quantileFor(key);
    const unit = 10 ** -(c.percent ? 2 : c.decimals ?? 0), dec = c.percent ? 2 : c.decimals ?? 0;
    const personal = quantileOf([...recent].sort((x, y) => x - y), q, c.direction);
    let target = dir > 0 ? Math.min(ref.value, Math.max(personal, baseline + unit)) : Math.max(ref.value, Math.min(personal, baseline - unit));
    target = c.direction === "lower" ? Math.floor(target + 1e-9) : round(target, dec);
    if (dir * (target - baseline) <= 0) target = round(baseline + dir * unit, dec);
    // L'arrondi ne doit pas faire passer la cible au-delà de la référence (0,5187 arrondi à 0,52)
    if (dir > 0 && target > ref.value) target = Math.floor(ref.value * 10 ** dec + 1e-9) / 10 ** dec;
    if (dir < 0 && target < ref.value) target = Math.ceil(ref.value * 10 ** dec - 1e-9) / 10 ** dec;
    // Proposition automatique suspendue (catalogue : autoPropose false) : la métrique reste au diagnostic
    const auto = c.autoPropose !== false;
    const eligible = gap > 0 && auto;
    out.push({ ...row, eligible, reason: gap <= 0 ? "déjà au niveau de la référence" : auto ? null : "objectif automatique suspendu (risque de jeu passif)", baseline: round(baseline, 3), spread: round(s, 3), reference: ref, target, target_quantile: q,
      factors: { G: round(G, 3), I: c.impact, F: round(F, 3), A: c.actionability, C: round(C, 3) }, score: round(score, 2) });
  }
  return out.sort((a, b) => (b.eligible - a.eligible) || ((b.score ?? -1) - (a.score ?? -1)) || a.metric.localeCompare(b.metric));
}

// Contrat d'objectif. Après un cycle « improving » ou « stable », le même objectif repart pour un nouveau cycle (même cible,
// même départ) ; après une maîtrise, la métrique repart au 60e centile ; après un échec ou une alerte, sa famille est mise de côté.
export function proposeGoal(games, role, { references = null, pastGoals = [], now = Date.now() } = {}) {
  const closed = pastGoals.filter(g => g.role === role && g.outcome).sort((a, b) => b.created_at - a.created_at);
  const last = closed[0];
  if (last && ["improving", "stable"].includes(last.outcome)) {
    const c = CATALOG[last.metric];
    return {
      diagnostic: prioritize(games, role, { references }),
      goal: { ...pick(last), id: `${role}-${last.metric}-${now}`, cycle: (last.cycle || 1) + 1, chain_id: last.chain_id || last.id, previous_outcome: last.outcome,
        status: "proposed", created_at: now, exercise: c.exercise ? c.exercise(last.target) : null },
    };
  }
  const exclude = last && ["failed", "needs_review"].includes(last.outcome) ? Object.keys(CATALOG).filter(k => fam(k) === fam(last.metric)) : [];
  const mastered = new Set(closed.filter(g => g.outcome === "achieved").map(g => g.metric));
  const rows = prioritize(games, role, { references, exclude, quantileFor: k => (mastered.has(k) ? RULES.targetQuantileAfterMastery : RULES.targetQuantile) });
  const best = rows.find(r => r.eligible);
  if (!best) return { goal: null, diagnostic: rows };
  const c = CATALOG[best.metric];
  const win = baselineWindow(games, role);
  const id = `${role}-${best.metric}-${now}`;
  return {
    diagnostic: rows,
    goal: {
      id, chain_id: id, cycle: 1, metric: best.metric, role, direction: c.direction,
      baseline: best.baseline, target: best.target, target_quantile: best.target_quantile, personal_sd: best.spread, reference: best.reference,
      baseline_window: win.info, guardrails: guardrailBaseline(win.games, role, best.metric),
      evaluation_games: RULES.evaluationGames, minimum_valid_games: RULES.minimumValid, success_required: RULES.successRequired,
      version: GOAL_VERSION, engine_version: GOAL_VERSION, status: "proposed", created_at: now, score: best.score, factors: best.factors,
      exercise: c.exercise ? c.exercise(best.target) : null,
      kbThemes: c.kbThemes || [],
    },
  };
}
const pick = g => Object.fromEntries(["metric", "role", "direction", "baseline", "target", "target_quantile", "personal_sd", "reference", "baseline_window", "guardrails",
  "evaluation_games", "minimum_valid_games", "success_required", "version", "engine_version", "score", "factors", "kbThemes"].filter(k => k in g).map(k => [k, g[k]]));

// Transitions autorisées
const NEXT = { proposed: ["active"], active: ["evaluating"], evaluating: OUTCOMES, ...Object.fromEntries(OUTCOMES.map(o => [o, ["archived"]])) };
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

// Garde-fous sur les parties évaluées : dégradation nette = médiane en baisse d'au moins 0,5·s ET au moins 3 parties sous le
// quart bas personnel (dans le sens de la métrique). Une seule mauvaise partie ne suffit pas.
export function checkGuardrails(guardrails = {}, evalGames) {
  const out = {};
  for (const [k, b] of Object.entries(guardrails)) {
    const dir = CATALOG[k]?.direction === "lower" ? -1 : 1;
    const v = evalGames.map(g => g.metrics[k]?.value).filter(x => x != null);
    if (!v.length) { out[k] = { n: 0, breach: false }; continue; }
    const m = median(v), drop = dir * (m - b.median) / b.sd, below = v.filter(x => dir * (x - b.low) < 0).length;
    out[k] = { n: v.length, median: round(m, 4), delta_sd: round(drop, 2), below_low: below, breach: drop <= -RULES.guardrailSd && below >= RULES.guardrailGames };
  }
  return out;
}

// Évaluation sur les parties jouées après l'activation, dans l'ordre chronologique. Victoire ou défaite ne comptent pas.
// Fenêtre : les 5 premières parties valides au même rôle, toutes postérieures à la fenêtre de départ (vérifié).
// Moins de 4 observations valides, ou 5 parties valides à un autre rôle d'abord : inconclusif. Sinon, dans cet ordre :
//   garde-fou dégradé → needs_review (même si la cible est atteinte) ; 3 cibles sur 5 → achieved ;
//   recul d'au moins 0,25·s → needs_review ; progrès d'au moins 0,25·s → improving ; sinon stable,
//   ou failed si le cycle précédent du même objectif était déjà stable (deux cycles sans maîtrise ni progrès).
export function evaluateGoal(goal, games, now = Date.now()) {
  if (!["active", "evaluating"].includes(goal.status)) throw Object.assign(new Error("Objectif non actif."), { code: "objectif-inactif" });
  const after = games.filter(g => g.start_ms != null && g.start_ms > goal.active_at).sort((a, b) => a.start_ms - b.start_ms);
  const end = goal.baseline_window?.to_ms;
  if (end != null && after.some(g => g.start_ms <= end)) throw Object.assign(new Error("Partie d'évaluation antérieure à la fin de la fenêtre de départ."), { code: "fuite-chronologique" });
  const dir = goal.direction === "higher" ? 1 : -1;
  const rows = [], counted = [];
  let inRole = 0, offRole = 0, validObs = 0, met = 0;
  for (const g of after) {
    if (!g.valid) { rows.push({ match_id: g.match_id, counted: false, reason: g.invalid_reason }); continue; }
    if (g.role !== goal.role) { offRole++; rows.push({ match_id: g.match_id, counted: false, reason: "autre-role" }); if (offRole >= goal.evaluation_games && inRole === 0) break; continue; }
    if (inRole >= goal.evaluation_games) break;
    inRole++; counted.push(g);
    const v = g.metrics[goal.metric]?.value ?? null;
    const ok = v != null && dir * (v - goal.target) >= 0;
    if (v != null) { validObs++; if (ok) met++; }
    rows.push({ match_id: g.match_id, counted: true, value: v, met: v == null ? null : ok, won: g.won,
      guardrail_values: Object.fromEntries(Object.keys(goal.guardrails || {}).map(k => [k, g.metrics[k]?.value ?? null])) });
  }
  const values = counted.map(g => g.metrics[goal.metric]?.value).filter(v => v != null);
  const sd = goal.personal_sd || FLOOR[goal.metric] || 1;
  const deltaSd = values.length ? round(dir * (median(values) - goal.baseline) / sd, 2) : null;
  const guard = checkGuardrails(goal.guardrails, counted);
  const breach = Object.entries(guard).filter(([, r]) => r.breach).map(([k]) => k);
  let outcome = null;
  if (inRole >= goal.evaluation_games) {
    if (validObs < goal.minimum_valid_games) outcome = "inconclusive";
    else if (breach.length) outcome = "needs_review";
    else if (met >= goal.success_required) outcome = "achieved";
    else if (deltaSd <= -RULES.progressSd) outcome = "needs_review";
    else if (deltaSd >= RULES.progressSd) outcome = "improving";
    else outcome = goal.previous_outcome === "stable" ? "failed" : "stable";
  } else if (offRole >= goal.evaluation_games && inRole === 0) outcome = "inconclusive";
  for (const r of rows) if (r.counted) r.guardrail_breach = breach.length > 0;
  let next = goal;
  if ((inRole || offRole) && goal.status === "active") next = transition(goal, "evaluating", now);
  if (outcome) next = { ...transition(next.status === "evaluating" ? next : transition(next, "evaluating", now), outcome, now), outcome };
  const review = outcome === "needs_review" ? (breach.length ? `garde-fou dégradé : ${breach.map(k => CATALOG[k].label.toLowerCase()).join(", ")}` : "recul sur la métrique travaillée") : null;
  return { goal: { ...next, progress: { counted: inRole, valid: validObs, met, needed: goal.success_required, window: goal.evaluation_games, delta_sd: deltaSd, guardrails: guard, review } }, evaluations: rows, outcome };
}
