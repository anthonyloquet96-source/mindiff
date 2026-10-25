// Synchronisation d'un joueur (COACH-005) : nouvelles ranked → métriques → objectif. Idempotente : une partie déjà
// calculée avec la version courante des métriques n'est ni retéléchargée ni recalculée ; une partie déjà téléchargée
// mais calculée avec une ancienne version est recalculée depuis le JSON brut, sans rappeler Riot.

import { normalizeMatch } from "../normalize.mjs";
import { computeMetrics, METRIC_VERSION } from "../metrics.mjs";
import { proposeGoal, evaluateGoal, transition } from "../goals.mjs";

// Rôle principal : le plus joué parmi les parties valides récentes
export function mainRole(metrics) {
  const n = {};
  for (const m of metrics.slice(0, 30)) if (m.valid && m.role) n[m.role] = (n[m.role] || 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;
}

export async function syncPlayer({ store, riot, playerId, count = 30, references = null, now = Date.now() }) {
  const player = await store.getPlayer(playerId);
  if (!player) throw Object.assign(new Error("Joueur inconnu."), { code: "joueur-inconnu", status: 404 });
  const ids = await riot.call("matchIds", { platform: player.platform, puuid: player.puuid, count });
  let fetched = 0, recomputed = 0, skipped = 0;
  for (const id of ids) {
    const have = await store.getMetrics(id, playerId);
    if (have?.metric_version === METRIC_VERSION) { skipped++; continue; }
    let raw = (await store.hasMatch(id)) ? await store.rawMatch(id) : null;
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
  const goal = await advanceGoals({ store, playerId, references, now });
  return { matches: ids.length, fetched, recomputed, skipped, goal };
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
