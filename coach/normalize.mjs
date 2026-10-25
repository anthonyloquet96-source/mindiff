// Normaliseur Match-V5 + Timeline (COACH-002, coach v1).
// Une forme stable pour tout le reste du coach : champs absents = null (jamais 0), division par zéro = null,
// lecture de la timeline par instant et non par indice de frame.
//
// Instant T : F(p, T) = dernière frame dont le timestamp est ≤ T + tolérance. Riot enregistre la frame « 10:00 »
// un peu après 10:00 (de 64 à 354 ms sur 200 parties Diamant+ mesurées le 25/10/2026) : sans tolérance, la frame de
// 10:00 serait écartée au profit de celle de 9:00. La tolérance par défaut (5 s) reste très inférieure à l'intervalle
// entre deux frames (60 s) ; chaque lecture renvoie l'instant réellement observé et l'écart à T.

export const NORMALIZER_VERSION = "normalize-1";
const POS = { TOP: "TOP", JUNGLE: "JUNGLE", MIDDLE: "MIDDLE", BOTTOM: "BOTTOM", UTILITY: "UTILITY" };
export const DEFAULT_TOLERANCE_MS = 5000;

// Nombre fini, sinon null ; texte non vide, sinon null
export const num = x => (typeof x === "number" && Number.isFinite(x) ? x : null);
const str = x => (typeof x === "string" && x.trim() ? x : null);
export const ratio = (a, b) => (num(a) == null || num(b) == null || b === 0 ? null : a / b);

// Durée : Riot donne gameDuration en secondes depuis l'ajout de gameEndTimestamp, en millisecondes avant
function durationSeconds(info) {
  const d = num(info?.gameDuration);
  if (d == null) return null;
  return num(info.gameEndTimestamp) != null ? d : d / 1000;
}

export function normalizeMatch(match, timeline = null) {
  const info = match?.info;
  if (!info || !Array.isArray(info.participants)) throw Object.assign(new Error("Réponse Match-V5 invalide : info.participants absent."), { code: "match-invalide" });
  const matchId = str(match.metadata?.matchId);
  const duration = durationSeconds(info);
  const participants = info.participants.map(p => ({
    participant_id: num(p.participantId),
    puuid: str(p.puuid),
    team_id: num(p.teamId),
    // teamPosition vide (remake, mode sans rôles) : rôle inconnu, pas de déduction
    role: POS[p.teamPosition] || null,
    champion: str(p.championName),
    won: typeof p.win === "boolean" ? p.win : null,
    kills: num(p.kills), deaths: num(p.deaths), assists: num(p.assists),
    cs_lane: num(p.totalMinionsKilled), cs_jungle: num(p.neutralMinionsKilled),
    gold_earned: num(p.goldEarned),
    damage_to_champions: num(p.totalDamageDealtToChampions),
    vision_score: num(p.visionScore), wards_placed: num(p.wardsPlaced), wards_killed: num(p.wardsKilled),
    early_surrender: typeof p.gameEndedInEarlySurrender === "boolean" ? p.gameEndedInEarlySurrender : null,
  }));
  const teams = (info.teams || []).map(t => ({
    team_id: num(t.teamId),
    won: typeof t.win === "boolean" ? t.win : null,
    champion_kills: num(t.objectives?.champion?.kills),
    dragons: num(t.objectives?.dragon?.kills),
    barons: num(t.objectives?.baron?.kills),
  }));
  return {
    normalizer_version: NORMALIZER_VERSION,
    match_id: matchId,
    platform: matchId ? matchId.split("_")[0].toLowerCase() : null,
    queue: num(info.queueId),
    version: str(info.gameVersion),
    patch: str(info.gameVersion) ? info.gameVersion.split(".").slice(0, 2).join(".") : null,
    start_ms: num(info.gameStartTimestamp),
    duration_s: duration,
    remake: participants.some(p => p.early_surrender === true),
    participants, teams,
    timeline_status: timelineStatus(timeline, info),
    frame_interval_ms: num(timeline?.info?.frameInterval),
  };
}

// La timeline doit avoir des frames et les mêmes participants que la partie
function timelineStatus(timeline, info) {
  if (timeline == null) return "absente";
  const frames = timeline?.info?.frames;
  if (!Array.isArray(frames) || !frames.length) return "invalide";
  const ids = new Set(Object.keys(frames[0].participantFrames || {}));
  return info.participants.every(p => ids.has(String(p.participantId))) ? "ok" : "invalide";
}

// F(p, T) : dernière frame ≤ T + tolérance, avec l'instant observé et l'écart à T (précision)
export function frameAt(timeline, T, toleranceMs = DEFAULT_TOLERANCE_MS) {
  const frames = timeline?.info?.frames;
  if (!Array.isArray(frames) || num(T) == null || T < 0) return null;
  let best = null;
  for (const f of frames) { if (num(f.timestamp) != null && f.timestamp <= T + toleranceMs) best = f; else if (num(f.timestamp) != null && f.timestamp > T + toleranceMs) break; }
  return best ? { frame: best, observed_at_ms: best.timestamp, precision_ms: Math.abs(T - best.timestamp) } : null;
}

// État d'un participant à l'instant T (participantFrames est indexé par l'identifiant en texte)
export function participantAt(timeline, participantId, T, toleranceMs = DEFAULT_TOLERANCE_MS) {
  const f = frameAt(timeline, T, toleranceMs);
  const pf = f?.frame.participantFrames?.[String(participantId)];
  if (!pf) return null;
  const lane = num(pf.minionsKilled), jungle = num(pf.jungleMinionsKilled);
  return {
    observed_at_ms: f.observed_at_ms, precision_ms: f.precision_ms,
    cs: lane == null || jungle == null ? null : lane + jungle,
    gold: num(pf.totalGold), current_gold: num(pf.currentGold), xp: num(pf.xp), level: num(pf.level),
    position: pf.position && num(pf.position.x) != null && num(pf.position.y) != null ? { x: pf.position.x, y: pf.position.y } : null,
  };
}

// Adversaire de lane : même poste dans l'autre équipe. Confiance « haute » seulement s'il est unique et que le poste est connu ;
// sinon « faible », sans adversaire, et aucune métrique d'écart ne doit être calculée
export function laneOpponent(norm, participantId) {
  const me = norm.participants.find(p => p.participant_id === participantId);
  if (!me || !me.role || me.team_id == null) return { participant_id: null, confidence: "faible" };
  const sameRoleMine = norm.participants.filter(p => p.team_id === me.team_id && p.role === me.role);
  const opp = norm.participants.filter(p => p.team_id != null && p.team_id !== me.team_id && p.role === me.role);
  return opp.length === 1 && sameRoleMine.length === 1 ? { participant_id: opp[0].participant_id, confidence: "haute" } : { participant_id: null, confidence: "faible" };
}

// Événements d'un type, triés par temps (la timeline les range par frame)
export function eventsOf(timeline, ...types) {
  const frames = timeline?.info?.frames;
  if (!Array.isArray(frames)) return [];
  return frames.flatMap(f => f.events || []).filter(e => types.includes(e.type)).sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
}
