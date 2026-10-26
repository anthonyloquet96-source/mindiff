// Stockage du coach V1, même contrat que les tables Supabase (supabase/migrations) : joueurs, parties, métriques,
// objectifs, évaluations, synchronisations. Version fichier pour le serveur local (un JSON, écrit à chaque changement) ;
// la version Supabase du Worker reprendra ces méthodes une à une.
// Les JSON Riot bruts vont dans un dossier à part (rawDir), avec une empreinte, pour recalculer sans rappeler Riot.

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { scrubPlayer } from "./scrub.mjs";

export function createStore({ file = null, rawDir = null } = {}) {
  let db = { players: {}, matches: {}, metrics: {}, goals: {}, evaluations: {}, jobs: {}, feedback: {} };
  let loaded = !file;
  const load = async () => { if (loaded) return; loaded = true; try { db = { ...db, ...JSON.parse(await readFile(file, "utf8")) }; } catch {} };
  let saving = Promise.resolve();
  const save = () => { if (!file) return; const snapshot = JSON.stringify(db); saving = saving.then(async () => { await mkdir(dirname(file), { recursive: true }); await writeFile(file, snapshot); }); return saving; };
  const mkey = (matchId, playerId) => `${matchId}|${playerId}`;
  return {
    async getPlayer(id) { await load(); return db.players[id] || null; },
    async findPlayerByPuuid(puuid) { await load(); return Object.values(db.players).find(p => p.puuid === puuid) || null; },
    async upsertPlayer({ puuid, platform, game_name = null, tag_line = null }) {
      await load();
      const found = Object.values(db.players).find(p => p.puuid === puuid);
      const p = found ? { ...found, platform, game_name, tag_line } : { id: randomUUID(), puuid, platform, game_name, tag_line, user_id: null, created_at: new Date().toISOString() };
      db.players[p.id] = p; await save(); return p;
    },
    // Suppression RGPD : le joueur et tout ce qui le concerne
    async deletePlayer(id) {
      await load();
      const puuid = db.players[id]?.puuid;
      delete db.players[id];
      const mine = new Set(Object.values(db.metrics).filter(m => m.player_id === id).map(m => m.match_id));
      for (const k of Object.keys(db.metrics)) if (db.metrics[k].player_id === id) delete db.metrics[k];
      // Parties et JSON bruts sans autre joueur inscrit : supprimés aussi
      const kept = new Set(Object.values(db.metrics).map(m => m.match_id));
      for (const mid of mine) if (!kept.has(mid) && db.matches[mid]) { if (db.matches[mid].raw_path) await rm(db.matches[mid].raw_path, { force: true }); delete db.matches[mid]; }
      // Parties gardées pour un autre joueur : identifiants du joueur supprimé retirés du JSON brut
      for (const mid of mine) if (kept.has(mid) && db.matches[mid]?.raw_path && puuid) {
        const { raw, changed } = scrubPlayer(JSON.parse(gunzipSync(await readFile(db.matches[mid].raw_path)).toString()), puuid);
        if (!changed) continue;
        const body = gzipSync(JSON.stringify(raw));
        await writeFile(db.matches[mid].raw_path, body);
        db.matches[mid].checksum = createHash("sha256").update(body).digest("hex");
      }
      for (const g of Object.values(db.goals)) if (g.player_id === id) { delete db.goals[g.id]; for (const k of Object.keys(db.evaluations)) if (k.startsWith(g.id + "|")) delete db.evaluations[k]; delete db.feedback[g.id]; }
      for (const j of Object.values(db.jobs)) if (j.player_id === id) delete db.jobs[j.id];
      await save();
    },
    async hasMatch(matchId) { await load(); return !!db.matches[matchId]; },
    async putMatch(meta, raw = null) {
      await load();
      let paths = {};
      if (raw && rawDir) {
        await mkdir(rawDir, { recursive: true });
        const body = gzipSync(JSON.stringify(raw));
        paths = { raw_path: `${rawDir}/${meta.match_id}.json.gz`, checksum: createHash("sha256").update(body).digest("hex") };
        await writeFile(paths.raw_path, body);
      }
      db.matches[meta.match_id] = { ...meta, ...paths, fetched_at: new Date().toISOString() }; await save();
    },
    async rawMatch(matchId) { const m = db.matches[matchId]; if (!m?.raw_path) return null; return JSON.parse(gunzipSync(await readFile(m.raw_path)).toString()); },
    async getMetrics(matchId, playerId) { await load(); return db.metrics[mkey(matchId, playerId)] || null; },
    async putMetrics(playerId, m) { await load(); db.metrics[mkey(m.match_id, playerId)] = { ...m, player_id: playerId, computed_at: new Date().toISOString() }; await save(); },
    // Métriques d'un joueur, plus récentes en premier
    async listMetrics(playerId) { await load(); return Object.values(db.metrics).filter(m => m.player_id === playerId).sort((a, b) => (b.start_ms ?? 0) - (a.start_ms ?? 0)); },
    async listGoals(playerId) { await load(); return Object.values(db.goals).filter(g => g.player_id === playerId).sort((a, b) => b.created_at - a.created_at); },
    async putGoal(playerId, goal) {
      await load();
      // Un seul objectif actif ou en évaluation par joueur (comme l'index unique partiel de la base)
      if (["active", "evaluating"].includes(goal.status) && Object.values(db.goals).some(g => g.player_id === playerId && g.id !== goal.id && ["active", "evaluating"].includes(g.status)))
        throw Object.assign(new Error("Un objectif est déjà en cours."), { code: "objectif-multiple", status: 409 });
      db.goals[goal.id] = { ...goal, player_id: playerId }; await save(); return db.goals[goal.id];
    },
    async putEvaluations(goalId, rows) { await load(); for (const r of rows) db.evaluations[`${goalId}|${r.match_id}`] = { goal_id: goalId, ...r }; await save(); },
    async putFeedback(goalId, fb) { await load(); db.feedback[goalId] = { goal_id: goalId, ...fb, created_at: new Date().toISOString() }; await save(); return db.feedback[goalId]; },
    async getFeedback(goalId) { await load(); return db.feedback[goalId] || null; },
    async listEvaluations(goalId) { await load(); return Object.values(db.evaluations).filter(e => e.goal_id === goalId); },
    // Synchronisations : une seule en attente ou en cours par joueur (la deuxième demande renvoie la première)
    async openJob(playerId) {
      await load();
      const open = Object.values(db.jobs).find(j => j.player_id === playerId && ["queued", "running"].includes(j.status));
      if (open) return { job: open, existing: true };
      const job = { id: randomUUID(), player_id: playerId, status: "queued", requested_at: new Date().toISOString() };
      db.jobs[job.id] = job; await save(); return { job, existing: false };
    },
    async getJob(id) { await load(); return db.jobs[id] || null; },
    async updateJob(id, patch) { await load(); db.jobs[id] = { ...db.jobs[id], ...patch }; await save(); return db.jobs[id]; },
    flush: () => saving,
  };
}
