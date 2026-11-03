// Synchronisation d'un joueur (COACH-005) : nouvelles ranked → métriques → objectif. Idempotente : une partie déjà
// calculée avec la version courante des métriques n'est ni retéléchargée ni recalculée ; une partie déjà téléchargée
// mais calculée avec une ancienne version est recalculée depuis le JSON brut, sans rappeler Riot.

import { normalizeMatch } from "../normalize.mjs";
import { computeMetrics, METRIC_VERSION } from "../metrics.mjs";
import { proposeGoal, evaluateGoal, transition, RULES } from "../goals.mjs";
import { hasPlayer } from "./scrub.mjs";

// Repères par rang (test privé) : { MASTER: { BOTTOM: { cs_at_10: {…} } }, … }. Le joueur vise le rang au-dessus du sien
// (un Diamant vise le Master, un Challenger reste au niveau Challenger). Sans rang solo/duo : seuils pédagogiques du catalogue.
// Des repères non découpés par rang (tests, ancien format) sont rendus tels quels.
export const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
export async function refsForPlayer(riot, player, references) {
  if (!references || !Object.keys(references).some(k => TIERS.includes(k))) return { references, tier: null, target: null };
  const entries = await riot.call("league", { platform: player.platform, puuid: player.puuid }).catch(e => { if (e.code === "riot-cle-refusee") throw e; return []; });
  const tier = (entries || []).find(e => e.queueType === "RANKED_SOLO_5x5")?.tier || null;
  const i = TIERS.indexOf(tier);
  if (i < 0) return { references: null, tier: null, target: null };
  const target = TIERS[Math.min(i + 1, TIERS.length - 1)];
  return { references: references[target] || null, tier, target };
}

// Rôle principal : le plus joué parmi les parties valides récentes
// Poste de l'objectif : parmi les postes qui ont assez de parties pour un objectif, celui des 10 dernières parties d'abord,
// puis celui des 30 dernières (banc du 31/10 : 4 objectifs sur 82 visaient un poste que le joueur ne jouait plus)
export function mainRole(metrics) {
  const valid = metrics.filter(m => m.valid && m.role);
  const count = list => list.reduce((n, m) => ((n[m.role] = (n[m.role] || 0) + 1), n), {});
  const recent = count(valid.slice(0, 10)), wide = count(valid.slice(0, 30)), all = count(valid.slice(0, RULES.historyMax));
  const enough = r => (all[r] || 0) >= RULES.minGames;
  return Object.keys(wide).sort((a, b) => enough(b) - enough(a) || (recent[b] || 0) - (recent[a] || 0) || wide[b] - wide[a] || a.localeCompare(b))[0] || null;
}

// budget : nombre maximal de parties téléchargées ou recalculées par appel. Le Worker gratuit de Cloudflare limite chaque requête
// à 50 appels sortants (environ 7 par partie) : au-delà, il est coupé net. more = true si des parties restent à traiter.
export async function syncPlayer({ store, riot, playerId, count = RULES.historyMax, references = null, now = Date.now(), budget = Infinity }) {
  const player = await store.getPlayer(playerId);
  if (!player) throw Object.assign(new Error("Joueur inconnu."), { code: "joueur-inconnu", status: 404 });
  const ids = await riot.call("matchIds", { platform: player.platform, puuid: player.puuid, count });
  const known = new Map((await store.listMetrics(playerId)).map(m => [m.match_id, m.metric_version]));
  let fetched = 0, recomputed = 0, skipped = 0, worked = 0, more = false;
  for (const id of ids) {
    if (known.get(id) === METRIC_VERSION) { skipped++; continue; }
    if (worked >= budget) { more = true; break; }
    worked++;
    let raw = (await store.hasMatch(id)) ? await store.rawMatch(id) : null;
    // Copie dont le joueur a été retiré (suppression de compte puis réinscription) : relue chez Riot
    if (raw && !hasPlayer(raw, player.puuid)) raw = null;
    if (raw) recomputed++;
    else {
      const match = await riot.call("match", { platform: player.platform, matchId: id });
      // Timeline absente ou en erreur : la partie reste utilisable pour les métriques de fin de partie
      const timeline = await riot.call("timeline", { platform: player.platform, matchId: id }).catch(e => { if (e.code === "riot-cle-refusee") throw e; return null; });
      raw = { match, timeline };
      const n = normalizeMatch(match, timeline);
      await store.putMatch({ match_id: n.match_id || id, platform: n.platform, queue: n.queue, game_version: n.version, duration_s: n.duration_s, start_ms: n.start_ms, timeline_status: n.timeline_status, normalizer_version: n.normalizer_version }, raw);
      fetched++;
    }
    let m;
    try { m = computeMetrics(raw.match, raw.timeline, player.puuid); } catch (e) { if (e.code === "joueur-absent") continue; throw e; }
    await store.putMetrics(playerId, { ...m, match_id: m.match_id || id });
  }
  const goal = more ? null : await advanceGoals({ store, playerId, references: (await refsForPlayer(riot, player, references)).references, now });
  return { matches: ids.length, fetched, recomputed, skipped, goal, more };
}

// Objectif : évalue celui en cours ; une fois tranché, il est archivé et le suivant est proposé
export async function advanceGoals({ store, playerId, references = null, now = Date.now() }) {
  const metrics = await store.listMetrics(playerId);
  const goals = await store.listGoals(playerId);
  let open = goals.find(g => ["active", "evaluating"].includes(g.status));
  if (open) {
    const ev = evaluateGoal(open, metrics, now);
    await store.putEvaluations(open.id, ev.evaluations.filter(r => r.match_id));
    open = await store.putGoal(playerId, ev.goal);
    if (!ev.outcome) return { status: open.status, goal: open };
    await store.putGoal(playerId, transition(open, "archived", now));
  } else {
    const proposed = goals.find(g => g.status === "proposed");
    if (proposed) return { status: "proposed", goal: proposed };
  }
  const role = mainRole(metrics);
  if (!role) return { status: "aucune-partie", goal: null };
  const past = await store.listGoals(playerId);
  const { goal, diagnostic } = proposeGoal(metrics, role, { references, pastGoals: past, now });
  if (!goal) return { status: "pas-d-objectif", goal: null, diagnostic };
  return { status: "proposed", goal: await store.putGoal(playerId, goal) };
}
