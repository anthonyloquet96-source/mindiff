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

import { CATALOG, GUARDRAILS, PATCH_BREAKS } from "./metrics.mjs";

export const GOAL_VERSION = "goals-3";
export const RULES = {
  minGames: 15, baselineGames: 20, minValidShare: 0.7, historyMax: 50, minRefSample: 200,
  evaluationGames: 5, minimumValid: 4, successRequired: 3,
  targetQuantile: 0.55, targetQuantileAfterMastery: 0.6,
  progressSd: 0.25, regressionSd: 0.75, guardrailSd: 0.75, guardrailGames: 4,
  // Après une maîtrise, le départ du palier suivant = médiane des parties jouées depuis le début de l'objectif maîtrisé (au moins
  // evaluationGames), si elle est meilleure que la médiane des 20 dernières (démo du 31/10 : 63 de moyenne, « Toi aujourd'hui 58 »)
  freshAfterMastery: true, freshWeight: 0.5,
  // Rotation anti-monotonie (brainstorm du 01/11/2026 avec GPT-6) : bonus de score pour une catégorie jamais travaillée, pour une
  // catégorie absente des 3 derniers cycles ; la catégorie (sinon la famille) du dernier cycle est écartée dès qu'un autre candidat
  // atteint 70 % du meilleur score de base. Sous ce seuil on consolide : jamais un objectif secondaire juste pour varier.
  rotationNewCategory: 0.25, rotationRestedCategory: 0.15, rotationFloor: 0.7,
};
const FLOOR = { cs_at_10: 4, cs_at_15: 6, cs_per_min: 0.4, early_deaths: 0.75, kill_participation: 0.05, vision_per_min: 0.1, xp_at_10: 150, objective_participation: 0.1,
  ward_kills_20: 0.75, control_wards_20: 0.5, first_item_min: 0.5, gold_idle_share: 0.03, dead_share: 0.02, vision_per_ward: 0.3 };
// Marche minimale visible pour le joueur (tour de test du 03/11 : « sbires à 10 min 59 → 60 », une cible qu'aucun joueur ne prend
// au sérieux). Si la référence est plus proche que cette marche, on vise le palier suivant (quart supérieur) ; sinon pas d'objectif.
export const VISIBLE_STEP = { cs_at_10: 3, cs_at_15: 5, cs_per_min: 0.3, farm_15_25: 0.3, xp_at_10: 150, vision_per_min: 0.1, control_wards_20: 1,
  early_deaths: 1, ward_kills_20: 1, first_item_min: 0.5 };
const categoryOf = k => CATALOG[k]?.category || "poste";
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
export function referenceFor(key, role, references = null, baseline = null, minGap = 0) {
  const r = references?.[role]?.[key];
  if (r && r.n >= RULES.minRefSample && r.p50 != null) {
    const dir = CATALOG[key]?.direction === "lower" ? -1 : 1;
    const upper = dir > 0 ? r.p75 : r.p25;
    if (baseline != null && dir * (r.p50 - baseline) < Math.max(minGap, 1e-12) && upper != null && dir * (upper - baseline) > 0) return { value: upper, source: "metric_references", quantile: dir > 0 ? "p75" : "p25", n: r.n, level: r.level || null };
    return { value: r.p50, source: "metric_references", quantile: "p50", n: r.n, level: r.level || null };
  }
  const p = CATALOG[key]?.pedagogical?.[role];
  return p == null ? null : { value: p, source: "seuil-pedagogique", n: null, level: null };
}

// Fenêtre de départ : les parties valides au poste, plus récentes d'abord, au plus baselineGames
export function baselineWindow(games, role) {
  const w = games.filter(g => g.valid && g.role === role).slice(0, RULES.baselineGames);
  const ts = w.map(g => g.start_ms).filter(v => v != null);
  const patches = w.map(g => g.patch).filter(Boolean).sort((a, b) => patchNum(a) - patchNum(b));
  return { games: w, info: { games: w.length, from_ms: ts.length ? Math.min(...ts) : null, to_ms: ts.length ? Math.max(...ts) : null, match_ids: w.map(g => g.match_id), patch: patches.at(-1) || null } };
}
// « 16.22 » → 16022, pour comparer des patchs ; affichage au format du jeu (« 26.22 »)
const patchNum = p => { const [a, b] = String(p).split(".").map(Number); return a * 1000 + (b || 0); };
const patchName = p => String(p).replace(/^1([56])\./, "2$1.");
// Premier patch qui casse la mesure de l'objectif entre sa fenêtre de départ et cette partie (null si aucun, ou départ inconnu)
export function patchBreak(goal, game) {
  const base = goal.baseline_window?.patch;
  if (!base || !game.patch) return null;
  return Object.keys(PATCH_BREAKS).filter(p => PATCH_BREAKS[p].includes(goal.metric) && patchNum(p) > patchNum(base) && patchNum(game.patch) >= patchNum(p)).sort((a, b) => patchNum(a) - patchNum(b))[0] || null;
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
export function prioritize(games, role, { references = null, exclude = [], quantileFor = () => RULES.targetQuantile, masteredTarget = () => null, masteredSince = () => null } = {}) {
  const comparable = games.filter(g => g.valid && g.role === role).slice(0, RULES.historyMax);
  const out = [];
  for (const [key, c] of Object.entries(CATALOG)) {
    if (!c.trainable || !c.roles.includes(role)) continue;
    const obs = comparable.map(g => g.metrics[key]?.value ?? null);
    const valid = obs.filter(v => v != null);
    const share = comparable.length ? valid.length / comparable.length : 0;
    const row = { metric: key, label: c.labelRole?.[role] || c.label, category: c.category, games: comparable.length, valid: valid.length, eligible: false, reason: null };
    if (comparable.length < RULES.minGames) { out.push({ ...row, reason: `moins de ${RULES.minGames} parties comparables` }); continue; }
    if (share < RULES.minValidShare) { out.push({ ...row, reason: `moins de ${Math.round(RULES.minValidShare * 100)} % d'observations valides` }); continue; }
    if (exclude.includes(key)) { out.push({ ...row, reason: "mise de côté après un échec ou une alerte, jusqu'au prochain diagnostic" }); continue; }
    const dir = c.direction === "higher" ? 1 : -1;
    const recent = comparable.slice(0, RULES.baselineGames).map(g => g.metrics[key]?.value).filter(v => v != null);
    const windowBaseline = median(recent);
    let baseline = windowBaseline;
    const since = RULES.freshAfterMastery ? masteredSince(key) : null;
    if (since != null) {
      const fresh = comparable.filter(g => g.start_ms > since).map(g => g.metrics[key]?.value).filter(v => v != null);
      if (fresh.length >= RULES.evaluationGames && dir * (median(fresh) - baseline) > 0) baseline += RULES.freshWeight * (median(fresh) - baseline);
    }
    const ref = referenceFor(key, role, references, baseline, VISIBLE_STEP[key] ?? 0);
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
    // Marche minimale : 0,25·s, le seuil où le moteur parle de progrès (banc d'essai du 31/10 : avec une seule unité, 80 objectifs
    // sur 82 demandaient moins, « 62 → 63 sbires », et la cible était déjà atteinte dans 45 % des parties de départ)
    const minStep = Math.max(unit, RULES.progressSd * s, VISIBLE_STEP[key] ?? 0);
    let target = dir > 0 ? Math.min(ref.value, Math.max(personal, baseline + minStep)) : Math.max(ref.value, Math.min(personal, baseline - minStep));
    // Métrique « moins c'est mieux » en entiers (morts) : arrondi vers le bas ; avec décimales ou en pourcentage, arrondi normal
    target = c.direction === "lower" && dec === 0 && !c.percent ? Math.floor(target + 1e-9) : round(target, dec);
    if (dir * (target - baseline) <= 0) target = round(baseline + dir * unit, dec);
    // Après une maîtrise : la cible suivante dépasse l'ancienne d'au moins 0,25·s (une unité au minimum). Sinon, 5 bonnes
    // parties sur 20 ne déplacent presque pas la médiane et le même objectif revient avec la même cible.
    const prev = masteredTarget(key);
    if (prev != null) {
      const step = Math.max(unit, RULES.progressSd * s);
      const floor = c.direction === "lower" ? Math.floor((prev - step) * 10 ** dec + 1e-9) / 10 ** dec : Math.ceil((prev + step) * 10 ** dec - 1e-9) / 10 ** dec;
      if (dir * (floor - target) > 0) target = floor;
    }
    // L'arrondi ne doit pas faire passer la cible au-delà de la référence (0,5187 arrondi à 0,52)
    if (dir > 0 && target > ref.value) target = Math.floor(ref.value * 10 ** dec + 1e-9) / 10 ** dec;
    if (dir < 0 && target < ref.value) target = Math.ceil(ref.value * 10 ** dec - 1e-9) / 10 ** dec;
    // Pourcentages affichés au point près : la cible doit se lire au moins un point au-delà du départ (relecture du 31/10 :
    // « Toi aujourd'hui 50 % → Ta cible 50 % ») ; si la référence est à moins d'un point, l'écart est trop petit pour un objectif
    const shown = v => Math.round(v * 100);
    if (c.percent && dir * (shown(target) - shown(baseline)) <= 0) target = (shown(baseline) + dir) / 100;
    const visible = !c.percent || dir * (ref.value - target) >= -1e-9;
    // Proposition automatique suspendue (catalogue : autoPropose false) : la métrique reste au diagnostic
    const auto = c.autoPropose !== false;
    const step = dir * (target - baseline), wide = c.percent || step >= (VISIBLE_STEP[key] ?? 0) - 1e-9;
    const eligible = gap > 0 && auto && visible && wide;
    out.push({ ...row, eligible, reason: gap <= 0 ? "déjà au niveau de la référence" : !visible ? "à moins d'un point de la référence" : !wide ? "référence trop proche pour une marche visible" : auto ? null : c.autoReason || "objectif automatique suspendu (risque de jeu passif)", baseline: round(baseline, 3), ...(baseline !== windowBaseline ? { window_baseline: round(windowBaseline, 3) } : {}), spread: round(s, 3), reference: ref, target, target_quantile: q,
      factors: { G: round(G, 3), I: c.impact, F: round(F, 3), A: c.actionability, C: round(C, 3) }, score: round(score, 2) });
  }
  return out.sort((a, b) => (b.eligible - a.eligible) || ((b.score ?? -1) - (a.score ?? -1)) || a.metric.localeCompare(b.metric));
}

// Contrat d'objectif. Après un cycle « improving », le même objectif repart pour un nouveau cycle (même cible, même départ) ;
// après un cycle « stable », il repart aussi, sauf si une autre catégorie (ou famille) vaut la rotation (RULES.rotationFloor) :
// on ne fait pas tourner un joueur en rond sur le même geste (01/11). Après une maîtrise, la métrique repart au 60e centile ;
// après un échec ou une alerte, sa famille est mise de côté.
export function proposeGoal(games, role, { references = null, pastGoals = [], now = Date.now() } = {}) {
  const closed = pastGoals.filter(g => g.role === role && g.outcome).sort((a, b) => b.created_at - a.created_at);
  const last = closed[0];
  const repeat = () => {
    const c = CATALOG[last.metric];
    return {
      diagnostic: prioritize(games, role, { references }),
      goal: { ...pick(last), id: `${role}-${last.metric}-${now}`, cycle: (last.cycle || 1) + 1, chain_id: last.chain_id || last.id, previous_outcome: last.outcome,
        status: "proposed", created_at: now, exercise: c.exercise ? c.exercise(last.target, last.role) : null },
    };
  };
  if (last?.outcome === "improving") return repeat();
  if (last?.outcome === "stable") {
    const rows = prioritize(games, role, { references, exclude: [] });
    const { rotation } = rotate(rows, closed);
    if (!rotation?.excluded) return repeat();
  }
  const exclude = last && ["failed", "needs_review"].includes(last.outcome) ? Object.keys(CATALOG).filter(k => fam(k) === fam(last.metric)) : [];
  const mastered = new Set(closed.filter(g => g.outcome === "achieved").map(g => g.metric));
  const lastMastered = k => closed.find(g => g.outcome === "achieved" && g.metric === k)?.target ?? null;
  const lastMasteredAt = k => closed.find(g => g.outcome === "achieved" && g.metric === k)?.active_at ?? null;
  const rows = prioritize(games, role, { references, exclude, quantileFor: k => (mastered.has(k) ? RULES.targetQuantileAfterMastery : RULES.targetQuantile), masteredTarget: lastMastered, masteredSince: lastMasteredAt });
  const { best, rotation } = rotate(rows, closed);
  if (!best) return { goal: null, diagnostic: rows };
  const c = CATALOG[best.metric];
  const win = baselineWindow(games, role);
  const id = `${role}-${best.metric}-${now}`;
  return {
    diagnostic: rows,
    goal: {
      id, chain_id: id, cycle: 1, metric: best.metric, role, direction: c.direction,
      baseline: best.baseline, ...(best.window_baseline != null ? { regress_baseline: best.window_baseline } : {}), target: best.target, target_quantile: best.target_quantile, personal_sd: best.spread, reference: best.reference,
      baseline_window: win.info, guardrails: guardrailBaseline(win.games, role, best.metric),
      evaluation_games: RULES.evaluationGames, minimum_valid_games: RULES.minimumValid, success_required: RULES.successRequired,
      version: GOAL_VERSION, engine_version: GOAL_VERSION, status: "proposed", created_at: now, score: best.score, factors: best.factors,
      exercise: c.exercise ? c.exercise(best.target, role) : null,
      kbThemes: c.kbThemes || [], category: c.category, rotation,
    },
  };
}

// Rotation anti-monotonie sur les candidats éligibles (RULES.rotation*). Les lignes reçoivent adjusted_score et rotation_bonus
// pour le diagnostic. Renvoie le candidat retenu et la trace de la décision (catégorie écartée, bonus).
export function rotate(rows, closed = []) {
  const eligible = rows.filter(r => r.eligible);
  if (!eligible.length) return { best: null, rotation: null };
  const last = closed[0] || null;
  const lastCat = last ? categoryOf(last.metric) : null, lastFam = last ? fam(last.metric) : null;
  const worked = new Set(closed.map(g => categoryOf(g.metric))), recent = new Set(closed.slice(0, 3).map(g => categoryOf(g.metric)));
  for (const r of eligible) {
    r.rotation_bonus = !worked.has(r.category) ? RULES.rotationNewCategory : !recent.has(r.category) ? RULES.rotationRestedCategory : 0;
    r.adjusted_score = round(r.score * (1 + r.rotation_bonus), 2);
  }
  const bestBase = Math.max(...eligible.map(r => r.score));
  let pool = eligible, excluded = null;
  if (lastCat) {
    const otherCat = eligible.filter(r => r.category !== lastCat && r.score >= RULES.rotationFloor * bestBase);
    const otherFam = eligible.filter(r => fam(r.metric) !== lastFam && r.score >= RULES.rotationFloor * bestBase);
    if (otherCat.length) { pool = otherCat; excluded = { category: lastCat }; }
    else if (otherFam.length) { pool = otherFam; excluded = { family: lastFam }; }
  }
  const best = [...pool].sort((a, b) => b.adjusted_score - a.adjusted_score || b.score - a.score || a.metric.localeCompare(b.metric))[0];
  return { best, rotation: { bonus: best.rotation_bonus, excluded, worked: [...worked] } };
}
const pick = g => Object.fromEntries(["metric", "role", "direction", "baseline", "regress_baseline", "target", "category", "target_quantile", "personal_sd", "reference", "baseline_window", "guardrails",
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

// Garde-fous sur les parties évaluées : dégradation nette = médiane en baisse d'au moins 0,75·s ET au moins 4 parties sous le
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
//   recul d'au moins 0,75·s → needs_review ; progrès d'au moins 0,25·s → improving ; sinon stable,
//   ou failed si le cycle précédent du même objectif était déjà stable (deux cycles sans maîtrise ni progrès).
export function evaluateGoal(goal, games, now = Date.now()) {
  if (!["active", "evaluating"].includes(goal.status)) throw Object.assign(new Error("Objectif non actif."), { code: "objectif-inactif" });
  const after = games.filter(g => g.start_ms != null && g.start_ms > goal.active_at).sort((a, b) => a.start_ms - b.start_ms);
  const end = goal.baseline_window?.to_ms;
  if (end != null && after.some(g => g.start_ms <= end)) throw Object.assign(new Error("Partie d'évaluation antérieure à la fin de la fenêtre de départ."), { code: "fuite-chronologique" });
  const dir = goal.direction === "higher" ? 1 : -1;
  const rows = [], counted = [];
  let inRole = 0, offRole = 0, validObs = 0, met = 0, broken = null;
  for (const g of after) {
    if (!g.valid) { rows.push({ match_id: g.match_id, counted: false, reason: g.invalid_reason }); continue; }
    // Le jeu a changé la mesure : les parties suivantes ne sont plus comparables au départ, le cycle s'arrête ici
    if ((broken = patchBreak(goal, g))) { rows.push({ match_id: g.match_id, counted: false, reason: "patch" }); break; }
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
  // Palier relevé après une maîtrise : le recul se mesure depuis le niveau habituel (20 dernières), pas depuis le départ relevé
  const regressSd = values.length && goal.regress_baseline != null ? round(dir * (median(values) - goal.regress_baseline) / sd, 2) : deltaSd;
  const guard = checkGuardrails(goal.guardrails, counted);
  const breach = Object.entries(guard).filter(([, r]) => r.breach).map(([k]) => k);
  let outcome = null;
  if (inRole >= goal.evaluation_games) {
    if (validObs < goal.minimum_valid_games) outcome = "inconclusive";
    else if (breach.length) outcome = "needs_review";
    else if (met >= goal.success_required) outcome = "achieved";
    else if (regressSd <= -RULES.regressionSd) outcome = "needs_review";
    else if (deltaSd >= RULES.progressSd) outcome = "improving";
    else outcome = goal.previous_outcome === "stable" ? "failed" : "stable";
  } else if (broken || (offRole >= goal.evaluation_games && inRole === 0)) outcome = "inconclusive";
  for (const r of rows) if (r.counted) r.guardrail_breach = breach.length > 0;
  let next = goal;
  if ((inRole || offRole) && goal.status === "active") next = transition(goal, "evaluating", now);
  if (outcome) next = { ...transition(next.status === "evaluating" ? next : transition(next, "evaluating", now), outcome, now), outcome };
  const review = outcome === "needs_review" ? (breach.length ? `garde-fou dégradé : ${breach.map(k => CATALOG[k].label.toLowerCase()).join(", ")}` : "recul sur la métrique travaillée")
    : outcome === "inconclusive" ? (broken ? `le patch ${patchName(broken)} a changé cette mesure, la comparaison avec ton départ ne serait pas juste` : "pas assez de parties valides au même poste") : null;
  return { goal: { ...next, progress: { counted: inRole, valid: validObs, met, needed: goal.success_required, window: goal.evaluation_games, delta_sd: deltaSd, guardrails: guard, review } }, evaluations: rows, outcome };
}
