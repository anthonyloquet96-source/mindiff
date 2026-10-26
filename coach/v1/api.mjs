// Routes métier du coach V1 (COACH-004), communes au serveur local et au futur Worker : on y passe un stockage, un
// client Riot et les références. Erreurs normalisées { error: { code, message } }. Le serveur local n'a pas de comptes
// (un seul utilisateur, 127.0.0.1) ; le Worker vérifiera le jeton Supabase avant d'appeler ces routes.
//   GET  /api/v1/health
//   GET  /api/v1/players/resolve?riot_id=Nom%23TAG&platform=euw1
//   POST /api/v1/players/:id/sync              → 202 { job_id }
//   GET  /api/v1/jobs/:id
//   GET  /api/v1/players/:id/matches
//   GET  /api/v1/players/:id/diagnostic
//   GET  /api/v1/players/:id/goals/active
//   POST /api/v1/players/:id/goals/:goalId/start (proposé → actif)
//   GET  /api/v1/players/:id/progress
//   POST /api/v1/players/:id/goals/:goalId/feedback (test privé : pertinence 1 à 5, effets indésirables, commentaire)
//   DELETE /api/v1/players/:id                 (suppression RGPD)
//   POST /api/v1/coach/chat                    (COACH-010)

import { PLATFORMS } from "./riot.mjs";
import { syncPlayer, mainRole } from "./sync.mjs";
import { prioritize, transition, GOAL_VERSION, OUTCOMES } from "../goals.mjs";
import { CATALOG, METRIC_VERSION, formatMetric } from "../metrics.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const fail = (status, code, message) => ({ status, body: { error: { code, message } } });
// Effets indésirables proposés au testeur après un cycle (pilot_feedback.side_effects)
export const SIDE_EFFECTS = ["jeu-plus-passif", "moins-de-farm", "moins-de-kills", "stress", "moins-de-plaisir", "conseil-inadapte", "objectif-incompris"];

// File de synchronisation en mémoire : une à la fois, dans l'ordre d'arrivée
export function createQueue(work) {
  let chain = Promise.resolve();
  return { push: job => { chain = chain.then(() => work(job)).catch(() => {}); return chain; }, idle: () => chain };
}

export async function handleV1({ method, path, query = {}, body = null }, ctx) {
  const { store, riot, references = null, queue, chat = null } = ctx;
  try {
    if (path === "/api/v1/health") return { status: 200, body: { ok: true, metric_version: METRIC_VERSION, goal_version: GOAL_VERSION, riot: !!riot } };
    if (path === "/api/v1/players/resolve" && method === "GET") {
      const m = String(query.riot_id || "").match(/^(.{3,16})#([A-Za-z0-9]{2,5})$/u);
      const platform = String(query.platform || "euw1").toLowerCase();
      if (!m) return fail(400, "riot-id-invalide", "Riot ID attendu sous la forme Pseudo#TAG.");
      if (!PLATFORMS[platform]) return fail(400, "region-invalide", "Région inconnue.");
      if (!riot) return fail(503, "riot-non-configure", "Service Riot non configuré.");
      const acc = await riot.call("account", { platform, gameName: m[1].trim(), tagLine: m[2] });
      const p = await store.upsertPlayer({ puuid: acc.puuid, platform, game_name: acc.gameName, tag_line: acc.tagLine });
      return { status: 200, body: { player_id: p.id, game_name: p.game_name, tag_line: p.tag_line, platform } };
    }
    if (path === "/api/v1/coach/chat" && method === "POST") return chat ? chat(body, ctx) : fail(503, "ia-desactivee", "Le tuteur IA est désactivé : ton objectif, tes chiffres et les conseils sourcés restent disponibles.");
    const jm = path.match(/^\/api\/v1\/jobs\/([^/]+)$/);
    if (jm) { const j = UUID.test(jm[1]) && await store.getJob(jm[1]); return j ? { status: 200, body: j } : fail(404, "introuvable", "Synchronisation inconnue."); }
    const pm = path.match(/^\/api\/v1\/players\/([^/]+)(\/.*)?$/);
    if (!pm) return fail(404, "introuvable", "Route inconnue.");
    if (!UUID.test(pm[1])) return fail(400, "joueur-invalide", "Identifiant de joueur invalide.");
    const player = await store.getPlayer(pm[1]);
    if (!player) return fail(404, "joueur-inconnu", "Joueur inconnu : passe d'abord par /players/resolve.");
    const sub = pm[2] || "";
    if (sub === "" && method === "DELETE") { await store.deletePlayer(player.id); return { status: 204, body: null }; }
    if (sub === "/sync" && method === "POST") {
      if (!riot) return fail(503, "riot-non-configure", "Service Riot non configuré.");
      const { job, existing } = await store.openJob(player.id);
      if (!existing) queue.push(job);
      return { status: 202, body: { job_id: job.id, status: job.status, already_running: existing } };
    }
    const metrics = await store.listMetrics(player.id);
    if (sub === "/matches" && method === "GET")
      return { status: 200, body: { matches: metrics.map(m => ({ match_id: m.match_id, start_ms: m.start_ms, role: m.role, champion: m.champion, won: m.won, valid: m.valid, invalid_reason: m.invalid_reason, metrics: Object.fromEntries(Object.entries(m.metrics).map(([k, v]) => [k, v.value])) })) } };
    if (sub === "/diagnostic" && method === "GET") {
      const role = CATALOG && (query.role && /^(TOP|JUNGLE|MIDDLE|BOTTOM|UTILITY)$/.test(query.role) ? query.role : mainRole(metrics));
      if (!role) return { status: 200, body: { role: null, rows: [], note: "Aucune partie classée valide pour l'instant." } };
      return { status: 200, body: { role, metric_version: METRIC_VERSION, rows: prioritize(metrics, role, { references }) } };
    }
    const goals = await store.listGoals(player.id);
    if (sub === "/goals/active" && method === "GET") {
      const g = goals.find(x => ["active", "evaluating"].includes(x.status)) || goals.find(x => x.status === "proposed") || null;
      return { status: 200, body: { goal: g ? withLabels(g) : null, evaluations: g ? await store.listEvaluations(g.id) : [] } };
    }
    const sm = sub.match(/^\/goals\/([^/]+)\/start$/);
    if (sm && method === "POST") {
      const g = goals.find(x => x.id === sm[1]);
      if (!g) return fail(404, "objectif-inconnu", "Objectif inconnu.");
      if (g.status !== "proposed") return fail(409, "transition-interdite", "Cet objectif n'est pas en attente de démarrage.");
      // Démarré maintenant : seules les parties jouées ensuite comptent
      return { status: 200, body: { goal: withLabels(await store.putGoal(player.id, transition(g, "active", Date.now()))) } };
    }
    const fm = sub.match(/^\/goals\/([^/]+)\/feedback$/);
    if (fm && method === "POST") {
      const g = goals.find(x => x.id === fm[1]);
      if (!g) return fail(404, "objectif-inconnu", "Objectif inconnu.");
      // Retour seulement sur un cycle terminé : le joueur juge ce qu'il a vécu, pas ce qu'il va faire
      if (!(g.status === "archived" || OUTCOMES.includes(g.status))) return fail(409, "cycle-en-cours", "Donne ton avis une fois les 5 parties jouées.");
      const { relevance = null, side_effects = [], comment = null } = body || {};
      if (relevance != null && !(Number.isInteger(relevance) && relevance >= 1 && relevance <= 5)) return fail(400, "retour-invalide", "Pertinence : un entier de 1 à 5.");
      if (!Array.isArray(side_effects) || side_effects.some(x => !SIDE_EFFECTS.includes(x))) return fail(400, "retour-invalide", "Effet indésirable inconnu.");
      if (comment != null && (typeof comment !== "string" || comment.length > 1000)) return fail(400, "retour-invalide", "Commentaire : 1000 caractères au plus.");
      if (relevance == null && !side_effects.length && !comment?.trim()) return fail(400, "retour-vide", "Retour vide.");
      const fb = await store.putFeedback(g.id, { relevance, side_effects: [...new Set(side_effects)], comment: comment?.trim() || null });
      return { status: 200, body: { feedback: fb } };
    }
    if (sub === "/progress" && method === "GET") {
      const history = await Promise.all(goals.filter(g => g.status === "archived" || OUTCOMES.includes(g.status)).map(async g => ({ ...withLabels(g), evaluations: await store.listEvaluations(g.id), feedback: await store.getFeedback(g.id) })));
      const timeline = {};
      for (const k of new Set(goals.map(g => g.metric))) timeline[k] = metrics.filter(m => m.valid && m.metrics[k]?.value != null).slice(0, 30).map(m => ({ start_ms: m.start_ms, value: m.metrics[k].value, role: m.role })).reverse();
      return { status: 200, body: { goals: history, series: timeline } };
    }
    return fail(404, "introuvable", "Route inconnue.");
  } catch (e) {
    return fail(e.status && e.status >= 400 && e.status < 600 ? e.status : 500, e.code || "erreur", e.code ? e.message : "Erreur interne.");
  }
}

function withLabels(g) {
  const c = CATALOG[g.metric];
  return { ...g, label: c?.label || g.metric, unit: c?.unit || "", baseline_text: formatMetric(g.metric, g.baseline), target_text: formatMetric(g.metric, g.target) };
}

// Traitement d'une synchronisation (appelé par la file)
export function syncWorker(ctx) {
  return async job => {
    await ctx.store.updateJob(job.id, { status: "running", started_at: new Date().toISOString() });
    try {
      const r = await syncPlayer({ store: ctx.store, riot: ctx.riot, playerId: job.player_id, references: ctx.references });
      await ctx.store.updateJob(job.id, { status: "done", finished_at: new Date().toISOString(), matches_added: r.fetched + r.recomputed, goal_status: r.goal?.status || null });
    } catch (e) {
      await ctx.store.updateJob(job.id, { status: "failed", finished_at: new Date().toISOString(), error: e.code || "erreur" });
    }
  };
}
