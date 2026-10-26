// Stockage du coach V1 sur Supabase (Worker), même interface que coach/v1/store.mjs.
// Passe par l'API REST de Supabase (PostgREST) avec la clé service_role, secret du Worker, jamais côté client ;
// la RLS protège les lectures directes des clients, le Worker vérifie lui-même que le joueur appartient à l'utilisateur.
// JSON Riot bruts : bucket privé « riot-raw » de Supabase Storage, gzip, avec empreinte SHA-256.

const TS = ["created_at", "active_at", "evaluating_at", "achieved_at", "failed_at", "inconclusive_at", "archived_at"];
const GOAL_COLS = ["id", "player_id", "metric", "role", "direction", "baseline", "target", "reference", "evaluation_games", "minimum_valid_games", "success_required", "version", "status", "outcome", "score", "factors", "exercise", ...TS.slice(1)];
const toIso = v => (v == null ? null : new Date(v).toISOString());
const toMs = v => (v == null ? null : Date.parse(v));

// rest(method, path, { body, prefer }) → JSON ; fourni par createSupabaseRest (production) ou par les tests
export function createSupabaseRest({ url, serviceKey, fetchImpl = fetch }) {
  if (!url || !serviceKey) throw Object.assign(new Error("Supabase non configuré."), { code: "supabase-non-configure", status: 503 });
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  return {
    async rest(method, path, { body, prefer } = {}) {
      const r = await fetchImpl(`${url}/rest/v1/${path}`, { method, headers: { ...headers, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) }, body: body == null ? undefined : JSON.stringify(body) });
      const text = await r.text();
      if (!r.ok) { const j = (() => { try { return JSON.parse(text); } catch { return {}; } })(); throw Object.assign(new Error(j.message || `Supabase ${r.status}`), { code: j.code === "23505" ? "conflit" : "supabase-erreur", status: j.code === "23505" ? 409 : 502 }); }
      return text ? JSON.parse(text) : null;
    },
    async putObject(key, bytes) { const r = await fetchImpl(`${url}/storage/v1/object/riot-raw/${key}`, { method: "POST", headers: { ...headers, "Content-Type": "application/gzip", "x-upsert": "true" }, body: bytes }); if (!r.ok) throw Object.assign(new Error(`Stockage ${r.status}`), { code: "stockage-erreur", status: 502 }); },
    async getObject(key) { const r = await fetchImpl(`${url}/storage/v1/object/riot-raw/${key}`, { headers }); return r.ok ? new Uint8Array(await r.arrayBuffer()) : null; },
  };
}

async function gzip(text) { const s = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip")); return new Uint8Array(await new Response(s).arrayBuffer()); }
async function gunzip(bytes) { const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")); return new Response(s).text(); }
async function sha256(bytes) { return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(b => b.toString(16).padStart(2, "0")).join(""); }
const q = v => encodeURIComponent(v);

export function createSupabaseStore(sb) {
  const one = async path => (await sb.rest("GET", path))?.[0] || null;
  const goalIn = (playerId, g) => {
    const row = Object.fromEntries(GOAL_COLS.filter(k => k in g).map(k => [k, TS.includes(k) ? toIso(g[k]) : g[k]]));
    const extra = Object.fromEntries(Object.entries(g).filter(([k]) => !GOAL_COLS.includes(k) && k !== "created_at" && k !== "player_id"));
    return { ...row, player_id: playerId, created_at: toIso(g.created_at) || new Date().toISOString(), extra };
  };
  const goalOut = r => r && ({ ...(r.extra || {}), ...Object.fromEntries(Object.entries(r).filter(([k]) => k !== "extra").map(([k, v]) => [k, TS.includes(k) ? toMs(v) : ["baseline", "target", "score"].includes(k) && v != null ? Number(v) : v])) });
  const metricsOut = r => r && ({ ...(r.extra || {}), match_id: r.match_id, player_id: r.player_id, role: r.role, champion: r.champion, won: r.won, valid: r.valid, invalid_reason: r.invalid_reason, metrics: r.metrics, metric_version: r.metric_version, start_ms: r.start_ms == null ? null : Number(r.start_ms) });
  return {
    getPlayer: id => one(`players?id=eq.${q(id)}&select=*`),
    findPlayerByPuuid: puuid => one(`players?puuid=eq.${q(puuid)}&select=*`),
    async upsertPlayer({ puuid, platform, game_name = null, tag_line = null, user_id }) {
      const row = { puuid, platform, game_name, tag_line, ...(user_id !== undefined ? { user_id } : {}) };
      return (await sb.rest("POST", "players?on_conflict=puuid", { body: row, prefer: "resolution=merge-duplicates,return=representation" }))[0];
    },
    // Suppression RGPD : la base supprime en cascade métriques, objectifs, évaluations et synchronisations
    deletePlayer: async id => { await sb.rest("DELETE", `players?id=eq.${q(id)}`); },
    hasMatch: async id => !!(await one(`matches?match_id=eq.${q(id)}&select=match_id`)),
    async putMatch(meta, raw = null) {
      let extra = {};
      if (raw && sb.putObject) { const bytes = await gzip(JSON.stringify(raw)); await sb.putObject(`${meta.match_id}.json.gz`, bytes); extra = { raw_match_path: `riot-raw/${meta.match_id}.json.gz`, checksum: await sha256(bytes) }; }
      const row = { match_id: meta.match_id, platform: meta.platform, queue: meta.queue, game_version: meta.game_version, duration_s: meta.duration_s == null ? null : Math.round(meta.duration_s), start_ms: meta.start_ms, timeline_status: meta.timeline_status, normalizer_version: meta.normalizer_version, ...extra };
      await sb.rest("POST", "matches?on_conflict=match_id", { body: row, prefer: "resolution=merge-duplicates" });
    },
    async rawMatch(id) { if (!sb.getObject) return null; const b = await sb.getObject(`${id}.json.gz`); return b ? JSON.parse(await gunzip(b)) : null; },
    getMetrics: async (matchId, playerId) => metricsOut(await one(`match_metrics?match_id=eq.${q(matchId)}&player_id=eq.${q(playerId)}&select=*`)),
    async putMetrics(playerId, m) {
      const { match_id, role, champion, won, valid, invalid_reason, metrics, metric_version, start_ms, ...rest } = m;
      delete rest.player_id; delete rest.computed_at;
      await sb.rest("POST", "match_metrics?on_conflict=match_id,player_id", { body: { match_id, player_id: playerId, role, champion, won, valid, invalid_reason, metrics, metric_version, start_ms, extra: rest }, prefer: "resolution=merge-duplicates" });
    },
    listMetrics: async playerId => (await sb.rest("GET", `match_metrics?player_id=eq.${q(playerId)}&select=*&order=start_ms.desc.nullslast`)).map(metricsOut),
    listGoals: async playerId => (await sb.rest("GET", `coaching_goals?player_id=eq.${q(playerId)}&select=*&order=created_at.desc`)).map(goalOut),
    async putGoal(playerId, goal) {
      // L'index unique partiel de la base refuse un deuxième objectif ouvert (409)
      const r = await sb.rest("POST", "coaching_goals?on_conflict=id", { body: goalIn(playerId, goal), prefer: "resolution=merge-duplicates,return=representation" })
        .catch(e => { throw e.code === "conflit" ? Object.assign(new Error("Un objectif est déjà en cours."), { code: "objectif-multiple", status: 409 }) : e; });
      return goalOut(r[0]);
    },
    putEvaluations: async (goalId, rows) => { if (rows.length) await sb.rest("POST", "goal_evaluations?on_conflict=goal_id,match_id", { body: rows.map(r => ({ goal_id: goalId, match_id: r.match_id, counted: !!r.counted, value: r.value ?? null, met: r.met ?? null, reason: r.reason ?? null })), prefer: "resolution=merge-duplicates" }); },
    listEvaluations: async goalId => (await sb.rest("GET", `goal_evaluations?goal_id=eq.${q(goalId)}&select=*&order=evaluated_at.asc`)).map(e => ({ ...e, value: e.value == null ? null : Number(e.value) })),
    async openJob(playerId) {
      const open = await one(`sync_jobs?player_id=eq.${q(playerId)}&status=in.(queued,running)&select=*`);
      if (open) return { job: open, existing: true };
      try { return { job: (await sb.rest("POST", "sync_jobs", { body: { player_id: playerId, status: "queued" }, prefer: "return=representation" }))[0], existing: false }; }
      catch (e) { if (e.code !== "conflit") throw e; return { job: await one(`sync_jobs?player_id=eq.${q(playerId)}&status=in.(queued,running)&select=*`), existing: true }; }
    },
    getJob: id => one(`sync_jobs?id=eq.${q(id)}&select=*`),
    async updateJob(id, patch) {
      const cols = ["status", "started_at", "finished_at", "matches_added", "error"];
      const body = Object.fromEntries(Object.entries(patch).filter(([k]) => cols.includes(k)));
      const extra = Object.fromEntries(Object.entries(patch).filter(([k]) => !cols.includes(k)));
      if (Object.keys(extra).length) body.extra = extra;
      return (await sb.rest("PATCH", `sync_jobs?id=eq.${q(id)}`, { body, prefer: "return=representation" }))[0];
    },
    flush: async () => {},
  };
}
