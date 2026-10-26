// Catalogue de métriques du coach V1 (COACH-006), versionné. Formules du brief, calculées sur la forme normalisée
// (coach/normalize.mjs) : absent = null, division par zéro = null, chaque lecture de timeline garde son instant.
// I (impact) et A (actionnabilité) sont des constantes du catalogue, fixées ici et jamais par une IA.
// Seules les métriques « trainable » (un exercice mesurable associé) peuvent devenir un objectif.

import { normalizeMatch, participantAt, laneOpponent, eventsOf, ratio, num } from "./normalize.mjs";

export const METRIC_VERSION = "metrics-1";
const MIN = 60000;

// Conseils de la base montrés avec un objectif (kbMatch, kbMatchRole pour un poste, kbAvoid) : le conseil doit parler du
// geste mesuré dans son énoncé ou son « quand », et ne pas porter sur la fin de partie (Baron, inhibiteurs…).
// Mêmes motifs côté site (coach2.js, C2_V1_TIPS), vérifiés par les tests.
const LATE = /baron|nashor|inhib|atakhan|ancien|elder/i;
// Farm : « vague » seule ne suffit pas (presque tous les conseils de lane la citent) ; un conseil de ward n'est pas un conseil de farm
const FARM_KB = { kbMatch: /\b(cs|farm\w*|sbires?|last[- ]?hit\w*|freeze|slow ?push|camps?|clear)\b/i, kbMatchRole: { JUNGLE: /\b(camps?|clear\w*|farm\w*|pathing|chemin|full ?clear|cs)\b/i }, kbThemesRole: { JUNGLE: ["lane", "vagues", "jungle"] }, kbAvoid: /baron|nashor|inhib|atakhan|ancien|elder|teamfight|siège|\bwards?\b|balise|jungler adverse/i };

// Seuil pédagogique fixe : utilisé tant qu'aucune référence mesurée (metric_references) n'existe pour ce rôle.
// Valeurs prudentes, arrondies, à remplacer par les références mesurées dès qu'elles passent leur seuil d'échantillon.
export const CATALOG = {
  cs_at_10: {
    label: "Sbires à 10 min", family: "farm", unit: "sbires", direction: "higher", roles: ["MIDDLE", "JUNGLE", "TOP", "BOTTOM"], trainable: true, impact: 0.8, actionability: 0.9,
    pedagogical: { MIDDLE: 70, TOP: 65, BOTTOM: 70, JUNGLE: 55 }, decimals: 0, kbThemes: ["lane", "vagues"], ...FARM_KB,
    exercise: t => `Vise ${t} sbires à 10:00. Repère intermédiaire : environ ${Math.round(t / 2)} à 5:00 ; si tu es en dessous, ne force pas d'échange qui te fait rater des sbires.`,
  },
  cs_at_15: {
    label: "Sbires à 15 min", family: "farm", unit: "sbires", direction: "higher", roles: ["MIDDLE", "JUNGLE", "TOP", "BOTTOM"], trainable: true, impact: 0.7, actionability: 0.8,
    pedagogical: { MIDDLE: 110, TOP: 100, BOTTOM: 110, JUNGLE: 90 }, decimals: 0, kbThemes: ["lane", "vagues"], ...FARM_KB,
    exercise: t => `Vise ${t} sbires à 15:00 : après chaque retour en base, reviens prendre la wave avant de chercher un combat.`,
  },
  cs_per_min: {
    label: "Sbires par minute", family: "farm", unit: "/min", direction: "higher", roles: ["MIDDLE", "JUNGLE", "TOP", "BOTTOM"], trainable: true, impact: 0.6, actionability: 0.7,
    pedagogical: { MIDDLE: 7, TOP: 6.5, BOTTOM: 7, JUNGLE: 5.5 }, decimals: 1, kbThemes: ["lane", "vagues"], ...FARM_KB,
    exercise: t => `Vise ${String(t).replace(".", ",")} sbires par minute sur toute la partie : entre deux combats, prends les waves proches de toi.`,
  },
  gold_at_10: { label: "Or à 10 min", unit: "or", direction: "higher", roles: ["MIDDLE", "JUNGLE", "TOP", "BOTTOM", "UTILITY"], trainable: false, impact: 0.6, actionability: 0.4, decimals: 0 },
  xp_at_10: { label: "Expérience à 10 min", unit: "XP", direction: "higher", roles: ["JUNGLE", "MIDDLE"], trainable: false, impact: 0.6, actionability: 0.5, decimals: 0 },
  gold_diff_at_15: { label: "Écart d'or à 15 min face à ton adversaire", unit: "or", direction: "higher", roles: ["MIDDLE", "TOP", "BOTTOM"], trainable: false, impact: 0.8, actionability: 0.4, decimals: 0, needsOpponent: true },
  xp_diff_at_15: { label: "Écart d'XP à 15 min face à ton adversaire", unit: "XP", direction: "higher", roles: ["MIDDLE", "TOP", "BOTTOM"], trainable: false, impact: 0.7, actionability: 0.4, decimals: 0, needsOpponent: true },
  early_deaths: {
    label: "Morts avant 14 min", unit: "morts", direction: "lower", roles: ["MIDDLE", "JUNGLE", "TOP", "BOTTOM", "UTILITY"], trainable: true, impact: 0.9, actionability: 0.8,
    // Suspendu comme objectif automatique (correctifs du 26/10) : viser moins de morts pousse au jeu passif ; reste au diagnostic
    autoPropose: false,
    // Médiane mesurée chez les Diamant+ : 2 morts avant 14 min (3 pour les ADC), sur 8 008 joueurs par rôle (25/10/2026)
    pedagogical: { MIDDLE: 2, JUNGLE: 2, TOP: 2, BOTTOM: 3, UTILITY: 2 }, decimals: 0, kbThemes: ["survie", "methode"],
    kbMatch: /gank|\bmort|mourir|meurs|survi|recul|jungler adverse|track|danger|flash|minimap|dispara|\bmia\b|missing/i, kbAvoid: LATE,
    exercise: t => `Au plus ${t} mort${t > 1 ? "s" : ""} avant 14:00 : quand ton adversaire disparaît de la carte ou que leur jungler est vu de ton côté, recule avant de pousser.`,
  },
  kill_participation: {
    label: "Participation aux kills", unit: "%", direction: "higher", roles: ["MIDDLE", "JUNGLE", "UTILITY"], trainable: true, impact: 0.6, actionability: 0.6, percent: true,
    pedagogical: { MIDDLE: 0.5, JUNGLE: 0.55, UTILITY: 0.55 }, decimals: 0, kbThemes: ["teamfight", "macro"],
    kbMatch: /roam|rejoin|escarmouche|skirmish|combat|teamfight|gank|\baide|\bkills?\b|minimap/i, kbAvoid: LATE,
    exercise: t => `Vise ${Math.round(t * 100)} % de participation aux kills : après avoir poussé ta wave, regarde la minimap et rejoins les combats proches.`,
  },
  vision_per_min: {
    label: "Score de vision par minute", unit: "/min", direction: "higher", roles: ["JUNGLE", "UTILITY", "MIDDLE"], trainable: true, impact: 0.5, actionability: 0.8,
    pedagogical: { JUNGLE: 0.8, UTILITY: 1.6, MIDDLE: 0.6 }, decimals: 2, kbThemes: ["vision", "methode"],
    kbMatch: /\bwards?\b|vision|balise|trinket|contr[ôo]le|sweep|oracle|lentille/i,
    exercise: t => `Vise un score de vision de ${String(t).replace(".", ",")} par minute : une ward à chaque retour et ton trinket dès qu'il est rechargé.`,
  },
  wards_per_min: { label: "Wards posées par minute", unit: "/min", direction: "higher", roles: ["JUNGLE", "UTILITY"], trainable: false, impact: 0.4, actionability: 0.7, decimals: 2 },
  // Diagnostic seulement (brief) : dépendent trop du champion et de l'issue de la partie pour devenir un objectif
  damage_per_gold: { label: "Dégâts aux champions par or", unit: "", direction: "higher", roles: ["MIDDLE", "TOP", "BOTTOM"], trainable: false, impact: 0.4, actionability: 0.2, decimals: 2, diagnosticOnly: true },
  damage_per_min: { label: "Dégâts aux champions par minute", unit: "/min", direction: "higher", roles: ["MIDDLE", "TOP", "BOTTOM"], trainable: false, impact: 0.4, actionability: 0.2, decimals: 0, diagnosticOnly: true },
  // Présence aux objectifs du jungler : participation (kill ou assist) aux dragons, Barons, Héraut et larves prises par son équipe.
  // Prudence : être là ne veut pas dire que l'objectif était un bon choix
  objective_participation: { label: "Participation aux objectifs de ton équipe", unit: "%", direction: "higher", roles: ["JUNGLE"], trainable: false, impact: 0.6, actionability: 0.5, percent: true, decimals: 0 },
};

// Garde-fous anti-passivité (coach/goals.mjs, checkGuardrails) : surveillés pendant tout objectif ; une dégradation nette
// refuse la validation. Sbires et XP à 10 min pour la phase de lane, activité selon le poste (validés par Anthony, 26/10).
// L'XP à 10 min est calculée à tous les postes, même si elle n'est un indicateur de diagnostic qu'en jungle et au mid.
export const GUARDRAILS = {
  TOP: ["cs_at_10", "xp_at_10", "kill_participation"],
  MIDDLE: ["cs_at_10", "xp_at_10", "kill_participation"],
  BOTTOM: ["cs_at_10", "xp_at_10", "kill_participation"],
  JUNGLE: ["cs_at_10", "xp_at_10", "kill_participation", "objective_participation"],
  UTILITY: ["xp_at_10", "kill_participation", "vision_per_min"],
};

// Une partie compte pour le coach : classée solo (420), pas de remake, au moins 15 min, rôle connu
export function gameValidity(n, me) {
  if (n.queue !== 420) return "file-non-classee";
  if (n.remake) return "remake";
  if (n.duration_s == null || n.duration_s < 900) return "trop-courte";
  if (!me?.role) return "role-inconnu";
  return null;
}

// Toutes les métriques d'un joueur sur une partie, avec leur qualité
export function computeMetrics(match, timeline, puuid) {
  const n = normalizeMatch(match, timeline);
  const me = n.participants.find(p => p.puuid === puuid);
  if (!me) throw Object.assign(new Error("Joueur absent de cette partie."), { code: "joueur-absent" });
  const invalid = gameValidity(n, me);
  const tlOk = n.timeline_status === "ok";
  const minutes = n.duration_s == null ? null : n.duration_s / 60;
  const team = n.teams.find(t => t.team_id === me.team_id);
  const opp = laneOpponent(n, me.participant_id);
  const at = T => (tlOk ? participantAt(timeline, me.participant_id, T) : null);
  const oppAt = T => (tlOk && opp.confidence === "haute" ? participantAt(timeline, opp.participant_id, T) : null);
  const q = (value, read = null, extra = {}) => ({ value: num(value), observed_at_ms: read?.observed_at_ms ?? null, precision_ms: read?.precision_ms ?? null, ...extra });
  const m10 = at(10 * MIN), m15 = at(15 * MIN), o15 = oppAt(15 * MIN);
  const cs = me.cs_lane == null || me.cs_jungle == null ? null : me.cs_lane + me.cs_jungle;
  const kills = tlOk ? eventsOf(timeline, "CHAMPION_KILL") : [];
  const elite = tlOk ? eventsOf(timeline, "ELITE_MONSTER_KILL") : [];
  const teamElite = elite.filter(e => (e.killerTeamId ?? n.participants.find(p => p.participant_id === e.killerId)?.team_id) === me.team_id);
  const took = e => e.killerId === me.participant_id || (e.assistingParticipantIds || []).includes(me.participant_id);
  const enoughTime = T => n.duration_s != null && n.duration_s * 1000 >= T;
  const metrics = {
    cs_per_min: q(ratio(cs, minutes)),
    cs_at_10: q(m10?.cs, m10),
    cs_at_15: q(enoughTime(15 * MIN) ? m15?.cs : null, m15),
    gold_at_10: q(m10?.gold, m10),
    xp_at_10: q(m10?.xp, m10),
    gold_diff_at_15: q(enoughTime(15 * MIN) && m15?.gold != null && o15?.gold != null ? m15.gold - o15.gold : null, m15, { opponent_confidence: opp.confidence }),
    xp_diff_at_15: q(enoughTime(15 * MIN) && m15?.xp != null && o15?.xp != null ? m15.xp - o15.xp : null, m15, { opponent_confidence: opp.confidence }),
    early_deaths: q(tlOk ? kills.filter(e => e.victimId === me.participant_id && e.timestamp < 14 * MIN).length : null),
    kill_participation: q(me.kills == null || me.assists == null ? null : ratio(me.kills + me.assists, team?.champion_kills)),
    vision_per_min: q(ratio(me.vision_score, minutes)),
    wards_per_min: q(ratio(me.wards_placed, minutes)),
    damage_per_gold: q(ratio(me.damage_to_champions, me.gold_earned)),
    damage_per_min: q(ratio(me.damage_to_champions, minutes)),
    objective_participation: q(tlOk && teamElite.length ? teamElite.filter(took).length / teamElite.length : null, null, { objectives: tlOk ? teamElite.length : null }),
  };
  return { match_id: n.match_id, patch: n.patch, start_ms: n.start_ms, role: me.role, champion: me.champion, won: me.won, metric_version: METRIC_VERSION, valid: !invalid, invalid_reason: invalid, timeline_status: n.timeline_status, opponent_confidence: opp.confidence, metrics };
}

// Affichage d'une valeur selon le catalogue
export function formatMetric(key, v) {
  const c = CATALOG[key];
  if (v == null || !c) return "—";
  if (c.percent) return `${Math.round(v * 100)} %`;
  return v.toFixed(c.decimals ?? 0).replace(".", ",");
}
