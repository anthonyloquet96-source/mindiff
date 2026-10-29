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
const FARM_KB = { kbMatch: /\b(cs|farm\w*|sbires?|last[- ]?hit\w*|freeze|slow ?push|camps?|clear)\b/i, kbMatchRole: { JUNGLE: /\b(camps?|clear\w*|farm\w*|pathing|chemin|full ?clear|cs)\b/i }, kbThemesRole: { JUNGLE: ["lane", "vagues", "jungle"] }, kbAvoid: /baron|nashor|inhib|atakhan|ancien|elder|teamfight|siège|\bwards?\b|balise|jungler adverse|saute|sauter|skip/i };

// Niveau atteint avec une quantité d'XP (paliers cumulés de League of Legends, niveaux 2 à 11)
const XP_LEVELS = [280, 660, 1140, 1720, 2400, 3180, 4060, 5040, 6120, 7300];
const levelFor = xp => 1 + XP_LEVELS.filter(x => xp >= x).length;

// Seuil pédagogique fixe : utilisé tant qu'aucune référence mesurée (metric_references) n'existe pour ce rôle.
// Valeurs prudentes, arrondies, à remplacer par les références mesurées dès qu'elles passent leur seuil d'échantillon.
export const CATALOG = {
  cs_at_10: {
    label: "Sbires à 10 min", family: "farm", unit: "sbires", direction: "higher", roles: ["MIDDLE", "JUNGLE", "TOP", "BOTTOM"], trainable: true, impact: 0.8, actionability: 0.9,
    pedagogical: { MIDDLE: 70, TOP: 65, BOTTOM: 70, JUNGLE: 55 }, decimals: 0, kbThemes: ["lane", "vagues"], ...FARM_KB,
    // Jungle : le compteur inclut les monstres (audit du 29/10 : les textes parlaient de wave et d'échanges en lane). Repère à 5:00 mesuré
    // sur 30 000 joueurs Diamant+ : 44 % du farm de 10 min en lane, 48 % en jungle (et non la moitié)
    labelRole: { JUNGLE: "CS à 10 min (sbires et monstres)" }, unitRole: { JUNGLE: "CS" },
    exercise: (t, role) => role === "JUNGLE"
      ? `Vise ${t} CS à 10:00, sbires et monstres. Repère intermédiaire : environ ${Math.round(t * 0.48)} à 5:00 ; enchaîne tes camps et, après un gank ou un combat, reprends tout de suite tes camps.`
      : `Vise ${t} sbires à 10:00. Repère intermédiaire : environ ${Math.round(t * 0.44)} à 5:00 ; si tu es en dessous, ne force pas d'échange qui te fait rater des sbires.`,
  },
  cs_at_15: {
    label: "Sbires à 15 min", family: "farm", unit: "sbires", direction: "higher", roles: ["MIDDLE", "JUNGLE", "TOP", "BOTTOM"], trainable: true, impact: 0.7, actionability: 0.8,
    pedagogical: { MIDDLE: 110, TOP: 100, BOTTOM: 110, JUNGLE: 90 }, decimals: 0, kbThemes: ["lane", "vagues"], ...FARM_KB,
    labelRole: { JUNGLE: "CS à 15 min (sbires et monstres)" }, unitRole: { JUNGLE: "CS" },
    exercise: (t, role) => role === "JUNGLE"
      ? `Vise ${t} CS à 15:00, sbires et monstres : après chaque back, refais les camps sur ton chemin avant de chercher un combat.`
      : `Vise ${t} sbires à 15:00 : après chaque back, reviens prendre la wave avant de chercher un combat.`,
  },
  cs_per_min: {
    label: "Sbires par minute", family: "farm", unit: "/min", direction: "higher", roles: ["MIDDLE", "JUNGLE", "TOP", "BOTTOM"], trainable: true, impact: 0.6, actionability: 0.7,
    pedagogical: { MIDDLE: 7, TOP: 6.5, BOTTOM: 7, JUNGLE: 5.5 }, decimals: 1, kbThemes: ["lane", "vagues"], ...FARM_KB,
    labelRole: { JUNGLE: "CS par minute (sbires et monstres)" }, unitRole: { JUNGLE: "CS / min" },
    exercise: (t, role) => role === "JUNGLE"
      ? `Vise ${String(t).replace(".", ",")} CS par minute sur toute la partie, sbires et monstres : entre deux combats ou objectifs, refais les camps réapparus.`
      : `Vise ${String(t).replace(".", ",")} sbires par minute sur toute la partie : entre deux combats, prends les waves proches de toi.`,
  },
  farm_15_25: {
    label: "Farm entre 15 et 25 min", family: "farm", unit: "/min", direction: "higher", roles: ["MIDDLE", "JUNGLE", "TOP", "BOTTOM"], trainable: true, impact: 0.7, actionability: 0.7,
    // Seuils sous le quart bas mesuré chez les Diamant+ (top 6,4 ; jungle 6,0 ; mid 6,2 ; bot 7,1 par minute ; 18 026 parties, non publié).
    // Garde-fou : participation aux kills (GUARDRAILS), pour ne pas récompenser un joueur qui farme loin de son équipe pendant les combats
    pedagogical: { TOP: 6, JUNGLE: 5.5, MIDDLE: 6, BOTTOM: 7 }, decimals: 1, kbThemes: ["vagues", "macro", "lane"], kbThemesRole: { JUNGLE: ["jungle", "macro", "vagues"] },
    kbMatch: /^(?=.*\b(farm\w*|sbires?|cs|vagues?|camps?)\b)(?=.*(phase de lane|milieu de partie|mid[- ]?game|side ?lanes?|lanes? de côté|lanes? latérales?|voies latérales|vagues latérales|dead time|temps mort))/i, kbMatchRole: { JUNGLE: /^(?=.*\b(camps?|clear\w*|farm\w*)\b)(?=.*(dead time|temps mort|refais|après avoir fini|milieu de partie|lanes? de côté|vagues? latérales?))/i },
    kbAvoid: /baron|nashor|inhib|atakhan|ancien|elder|\bwards?\b|balise|jungler adverse|half roam|demi-décalage|rage split\w*/i,
    exercise: (t, role) => `Vise ${String(t).replace(".", ",")} ${role === "JUNGLE" ? "sbires et monstres" : "sbires"} par minute entre 15:00 et 25:00. ${role === "JUNGLE"
      ? "Entre deux combats ou objectifs, refais tes camps au lieu d'attendre ; rejoins ton équipe dès qu'un combat se prépare."
      : "Entre deux combats, va prendre la wave la plus proche, de préférence sur une side lane ; rejoins ton équipe dès qu'elle part sur un objectif."}`,
  },
  gold_at_10: { label: "Or à 10 min", unit: "or", direction: "higher", roles: ["MIDDLE", "JUNGLE", "TOP", "BOTTOM", "UTILITY"], trainable: false, impact: 0.6, actionability: 0.4, decimals: 0 },
  // Objectif entraînable en jungle et au mid (décision d'Anthony, 27/10) ; garde-fous : sbires à 10 min, participation aux kills.
  // Seuils sous le quart bas mesuré chez les Diamant+ (jungle 3 719, mid 4 549 XP, 19 652 parties, clé de développement, non publié)
  xp_at_10: {
    label: "Expérience à 10 min", unit: "XP", direction: "higher", roles: ["JUNGLE", "MIDDLE"], trainable: true, impact: 0.6, actionability: 0.5,
    pedagogical: { JUNGLE: 3700, MIDDLE: 4500 }, decimals: 0, kbThemes: ["lane", "vagues", "macro"], kbThemesRole: { JUNGLE: ["jungle", "lane"] },
    kbMatch: /\b(xp|exp[ée]rience)\b/i, kbMatchRole: { JUNGLE: /\b(xp|exp[ée]rience|niveaux?|levels?|camps?|clear\w*|full ?clear|pathing|chemin)\b/i },
    kbAvoid: /baron|nashor|inhib|atakhan|ancien|elder|teamfight|siège|\bwards?\b|balise|jungler adverse|saute|skip|freez\w*|congel\w*|pings?\b/i,
    exercise: (t, role) => `Vise ${t} XP à 10:00, soit environ le niveau ${levelFor(t)}. ${role === "JUNGLE"
      ? "Enchaîne tes camps sans temps mort et, après un gank, reprends tout de suite tes camps au lieu de rester sur la lane."
      : "Reste sur ta lane pour prendre l'expérience de chaque wave ; ne quitte ta lane qu'après avoir poussé ta wave."}`,
  },
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
    // Geste par poste : un support ne pousse pas sa wave, un jungler n'en a pas (audit du 29/10)
    exercise: (t, role) => `Vise ${Math.round(t * 100)} % de participation aux kills : ${role === "UTILITY" ? "quand ton ADC est en sécurité ou rentre à la base, suis ton jungler ou ton mid vers les combats proches au lieu de rester seul en bot lane."
      : role === "JUNGLE" ? "après chaque clear, regarde la minimap et va là où un combat se prépare (gank, contre-gank, escarmouche)."
      : "après avoir poussé ta wave, regarde la minimap et rejoins les combats proches."}`,
  },
  vision_per_min: {
    label: "Score de vision par minute", unit: "/min", direction: "higher", roles: ["JUNGLE", "UTILITY", "MIDDLE"], trainable: true, impact: 0.5, actionability: 0.8,
    pedagogical: { JUNGLE: 0.8, UTILITY: 1.6, MIDDLE: 0.6 }, decimals: 2, kbThemes: ["vision", "methode"],
    kbMatch: /\bwards?\b|vision|balise|trinket|contr[ôo]le|sweep|oracle|lentille/i,
    exercise: (t, role) => `Vise un score de vision de ${String(t).replace(".", ",")} par minute : ${role === "UTILITY" ? "pose les wards de ton item de support dès qu'elles sont disponibles et achète une control ward à chaque back." : "une control ward à chaque back et ton trinket dès qu'il est rechargé."}`,
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
  // Farm après la phase de lane : de 15:00 à 25:00, ou jusqu'à la fin pour une partie de 20 à 25 min (92 % des parties Diamant+ durent 20 min ou plus)
  const m25 = n.duration_s != null && n.duration_s >= 1200 ? at(Math.min(25 * MIN, n.duration_s * 1000)) : null;
  const span = m15 && m25 ? (m25.observed_at_ms - m15.observed_at_ms) / MIN : null;
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
    farm_15_25: q(span != null && span >= 4.5 && m15.cs != null && m25.cs != null ? (m25.cs - m15.cs) / span : null, m25, { window_min: span == null ? null : Math.round(span * 10) / 10 }),
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
// Nom et unité d'une métrique pour un poste (en jungle, le farm compte aussi les monstres)
export const labelOf = (key, role) => CATALOG[key]?.labelRole?.[role] || CATALOG[key]?.label || key;
export const unitOf = (key, role) => CATALOG[key]?.unitRole?.[role] ?? CATALOG[key]?.unit ?? "";
export function formatMetric(key, v) {
  const c = CATALOG[key];
  if (v == null || !c) return "—";
  if (c.percent) return `${Math.round(v * 100)} %`;
  return v.toFixed(c.decimals ?? 0).replace(".", ",");
}
