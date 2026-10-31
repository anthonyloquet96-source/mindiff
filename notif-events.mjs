// Notifications : moments forts d'un match LoL en direct et rappels du coach, pour les notifications (site ouvert : app.js ; site fermé : worker/push.mjs).
// Entrées : flux public de LoL Esports, le même que le bandeau du direct.
//   - gameEvents : deux relevés successifs d'une partie (livestats « window ») → first blood, première tour, dragon, Baron,
//     inhibiteur, ace. Les compteurs sont cumulés : rien n'est perdu entre deux relevés, même espacés d'une minute.
//     L'ace est lu sur les images du relevé (5 joueurs morts au même instant) : un ace très bref peut passer entre deux images.
//   - matchEvents : début de chaque game, games et match gagnés (getEventDetails : games[].state, teams[].result.gameWins).
// Le premier relevé d'une partie sert de point de départ : on ne notifie pas ce qui s'est passé avant.

const DRAGON = { infernal: "infernal", ocean: "de l'océan", mountain: "de la montagne", cloud: "des nuages", hextech: "hextech", chemtech: "chemtech", elder: "ancestral" };
const DRAGON_EN = { infernal: "Infernal", ocean: "Ocean", mountain: "Mountain", cloud: "Cloud", hextech: "Hextech", chemtech: "Chemtech", elder: "Elder" };

// Résumé d'un relevé : ce qu'il faut comparer au suivant
export function gameSnapshot(frames) {
  const f = frames?.at(-1);
  if (!f?.blueTeam) return null;
  const side = s => ({
    kills: s.totalKills || 0, towers: s.towers || 0, inhibs: s.inhibitors || 0, barons: s.barons || 0, dragons: [...(s.dragons || [])],
    pk: Object.fromEntries((s.participants || []).map(p => [p.participantId, p.kills || 0])),
  });
  // Ace : une image où les 5 joueurs d'une équipe sont morts en même temps (avant le début, PV max à 0 : ignoré).
  // Dans le flux, un joueur mort garde parfois quelques PV (1 à 8 relevés sur KC-CFO aux Worlds) : mort = 10 PV ou moins.
  const dead = s => (s.participants || []).length === 5 && s.participants.every(p => p.maxHealth > 0 && p.currentHealth <= 10);
  return { blue: side(f.blueTeam), red: side(f.redTeam), aced: { blue: frames.some(x => x.blueTeam && dead(x.blueTeam)), red: frames.some(x => x.redTeam && dead(x.redTeam)) }, state: f.gameState };
}

// Noms : « KC Canna » → « Canna » ; code d'équipe depuis la liste des équipes du match
function namer(meta, teams) {
  const code = side => teams?.find(t => t.id === meta?.[`${side}TeamMetadata`]?.esportsTeamId)?.code || (side === "blue" ? "Bleu" : "Rouge");
  const player = (side, pid) => {
    const p = meta?.[`${side}TeamMetadata`]?.participantMetadata?.find(x => x.participantId === Number(pid));
    if (!p) return null;
    const c = code(side);
    return String(p.summonerName || "").replace(new RegExp(`^${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i"), "") || null;
  };
  return { code, player };
}

// Événements entre deux résumés ; prev null = point de départ (aucun événement)
export function gameEvents(prev, cur, meta, teams, lang = "fr") {
  if (!prev || !cur) return [];
  const en = lang === "en", N = namer(meta, teams), out = [];
  const other = s => (s === "blue" ? "red" : "blue");
  const total = x => x.blue.kills + x.red.kills;
  if (total(prev) === 0 && total(cur) > 0) {
    // Équipe du first blood : celle qui a des kills ; si les deux en ont (relevé espacé), on ne peut pas trancher
    const sides = ["blue", "red"].filter(s => cur[s].kills > 0);
    if (sides.length === 1) {
      const s = sides[0], up = Object.entries(cur[s].pk).filter(([id, k]) => k > (prev[s].pk[id] || 0));
      const who = up.length === 1 ? N.player(s, up[0][0]) : null;
      out.push({ kind: "first_blood", side: s, text: en ? `First blood${who ? ` for ${who}` : ""} (${N.code(s)})` : `First blood${who ? ` : ${who}` : ""} (${N.code(s)})` });
    }
  }
  if (prev.blue.towers + prev.red.towers === 0 && cur.blue.towers + cur.red.towers > 0) {
    const sides = ["blue", "red"].filter(s => cur[s].towers > 0);
    if (sides.length === 1) out.push({ kind: "first_tower", side: sides[0], text: en ? `First tower for ${N.code(sides[0])}` : `Première tour pour ${N.code(sides[0])}` });
  }
  for (const s of ["blue", "red"]) {
    for (const d of cur[s].dragons.slice(prev[s].dragons.length)) {
      out.push({ kind: d === "elder" ? "elder" : "dragon", side: s, text: en ? `${N.code(s)} takes the ${DRAGON_EN[d] || ""} Drake`.replace("  ", " ") : `${N.code(s)} prend le dragon ${DRAGON[d] || ""}`.trim() });
    }
    if (cur[s].barons > prev[s].barons) out.push({ kind: "baron", side: s, text: en ? `${N.code(s)} takes Baron Nashor` : `${N.code(s)} prend le Baron Nashor` });
    const ih = cur[s].inhibs - prev[s].inhibs;
    if (ih > 0) out.push({ kind: "inhib", side: s, text: en ? `${N.code(s)} destroys ${ih > 1 ? `${ih} inhibitors` : "an inhibitor"}` : `${N.code(s)} détruit ${ih > 1 ? `${ih} inhibiteurs` : "un inhibiteur"}` });
    // Ace de l'équipe d'en face : notifié une fois, tant qu'elle ne revient pas en vie
    if (cur.aced[other(s)] && !prev.aced[other(s)]) out.push({ kind: "ace", side: s, text: en ? `ACE for ${N.code(s)}: all 5 ${N.code(other(s))} players are dead` : `ACE pour ${N.code(s)} : les 5 joueurs de ${N.code(other(s))} sont morts` });
    // Niveau « détaillé » (detail: true) : chaque tour après la première, avec le score des tours. Le flux ne dit pas
    // laquelle tombe (voie, position) : seulement le nombre de tours détruites par équipe.
    const tw = cur[s].towers - prev[s].towers;
    if (tw > 0 && prev.blue.towers + prev.red.towers > 0) out.push({ kind: "tower", side: s, detail: true, text: en ? `${N.code(s)} destroys ${tw > 1 ? `${tw} towers` : "a tower"}` : `${N.code(s)} détruit ${tw > 1 ? `${tw} tours` : "une tour"}` });
    // Combat gagné : au moins 3 kills pour une équipe et au plus 1 en face depuis le relevé précédent (10 à 15 s)
    const ks = cur[s].kills - prev[s].kills, ko = cur[other(s)].kills - prev[other(s)].kills;
    if (ks >= 3 && ko <= 1 && total(prev) > 0) out.push({ kind: "fight", side: s, detail: true, text: en ? `${N.code(s)} wins a fight: ${ks} kills to ${ko}` : `${N.code(s)} gagne un combat : ${ks} kills à ${ko}` });
  }
  // Scores dans l'ordre du titre de la notification (« KC vs CFO ») : tours pour les tours, kills pour les objectifs
  const sideOf = id => (meta?.blueTeamMetadata?.esportsTeamId === id ? "blue" : meta?.redTeamMetadata?.esportsTeamId === id ? "red" : null);
  const [sa, sb] = (teams || []).slice(0, 2).map(t => sideOf(t.id));
  // Chaque score avec le nom de son équipe (« Kills KC 9-7 CFO », format choisi par Anthony) : un score seul prête à confusion (retour d'Anthony, 29/10)
  const [ca, cb] = (teams || []).map(t => t.code);
  const score = (label, k) => ` · ${label} ${ca} ${cur[sa][k]}-${cur[sb][k]} ${cb}`;
  if (sa && sb) for (const e of out) {
    if (e.kind === "tower" || e.kind === "first_tower") e.text += score(en ? "Towers" : "Tours", "towers");
    if (!["first_blood", "fight"].includes(e.kind)) e.text += score("Kills", "kills");
  }
  return out;
}

// État d'un match entre deux lectures (getEventDetails → data.event.match) : victoires par équipe, game en cours
export const matchState = m => ({ wins: Object.fromEntries((m?.teams || []).map(t => [t.id, t.result?.gameWins || 0])), game: m?.games?.find(g => g.state === "inProgress")?.number || null });
// Début de game, game gagnée, match gagné ; prev null = point de départ (aucun événement)
export function matchEvents(prev, m, lang = "fr") {
  if (!prev || !m?.teams?.length) return [];
  const en = lang === "en", out = [], cur = matchState(m), [A, B] = m.teams;
  const w = m.teams.map(t => cur.wins[t.id]), need = Math.ceil((m.strategy?.count || 1) / 2);
  m.teams.forEach((t, i) => {
    if (w[i] > (prev.wins[t.id] || 0)) {
      const score = `${w[i]}-${w[1 - i]}`;
      if (w[i] >= need) out.push({ kind: "match_win", team: t.code, text: en ? `${t.code} wins the match ${score}!` : `${t.code} remporte le match ${score} !` });
      else out.push({ kind: "game_win", team: t.code, text: en ? `${t.code} wins game ${w[0] + w[1]} (${score})` : `${t.code} remporte la game ${w[0] + w[1]} (${score})` });
    }
  });
  if (cur.game && cur.game !== prev.game) {
    const bo = m.strategy?.count > 1 ? ` (Bo${m.strategy.count})` : "";
    out.push({ kind: "game_start", text: cur.game === 1
      ? (en ? `The match starts: ${A.code} vs ${B.code}${bo}` : `Le match commence : ${A.code} vs ${B.code}${bo}`)
      : (en ? `Game ${cur.game} starts: ${A.code} vs ${B.code} (${w[0]}-${w[1]})` : `La game ${cur.game} commence : ${A.code} vs ${B.code} (${w[0]}-${w[1]})`) });
  }
  return out;
}

// Matchs suivis : « big » = compétitions internationales et ligues majeures, plus les équipes favorites ; « fav » = favorites seules
export const BIG = /^(worlds|msi|first_stand|lck|lpl|lec|lcs|lcp)$/i;
// Niveau de détail d'un appareil pour un match : « detaille » demandé, ou une de ses équipes favorites joue
export const detailed = (level, teamNames, favTeams = []) => level === "detaille" || teamNames.some(n => favTeams.includes(n));
export function followed(mode, leagueSlug, teamNames, favTeams = []) {
  if (!mode || mode === "off") return false;
  const fav = teamNames.some(n => favTeams.includes(n));
  return mode === "fav" ? fav : fav || BIG.test(leagueSlug || "");
}

// Rappels du coach (notification site fermé, et bandeau à l'ouverture du site) : à partir du résumé de l'objectif,
// sans chiffre inventé ; goal.left = parties restantes dans le cycle de l'objectif (null : compteurs inconnus).
// Objectif fini (ni proposé, ni en cours) : annoncé une fois, puis plus rien (status « notified », null renvoyé).
export const goalDone = g => !!g && g.status !== "proposed" && g.status !== "notified" && (!["active", "evaluating", ""].includes(g.status || "") || g.left === 0);
const ROLE = { TOP: "top", JUNGLE: "jungle", MIDDLE: "mid", BOTTOM: "ADC", UTILITY: "support" };
export function coachMessage(goal, day, lang = "fr") {
  const en = lang === "en";
  if (!goal) return en ? "Your coach is waiting: review your last game and get your next goal." : "Ton coach t'attend : relis ta dernière partie et découvre ton prochain objectif.";
  if (goal.status === "proposed") return en ? "Your coach is waiting: your next goal is ready." : "Ton coach t'attend : ton prochain objectif est prêt.";
  if (goal.status === "notified") return null;
  if (goalDone(goal)) return en ? "Your goal is complete: open your coach to see the verdict." : "Ton objectif est terminé : ouvre ton coach pour voir le bilan.";
  const unit = goal.unit && goal.unit !== "%" ? ` ${goal.unit === "/min" ? "/ min" : goal.unit}` : "", left = goal.left, role = ROLE[goal.role] || goal.role;
  const games = n => `${n} game${n > 1 ? "s" : ""}`;
  const list = en ? [
    `${games(left)} left for your goal: ${goal.label}, aim for ${goal.target}${unit}.`,
    `One ranked tonight? Your ${role} goal: ${goal.target}${unit}. One thing at a time.`,
    `Every game counts: ${games(left)} to go on ${goal.label}.`,
  ] : [
    `Encore ${games(left)} pour ton objectif : ${goal.label}, vise ${goal.target}${unit}.`,
    `Une ranked ce soir ? Ton objectif en ${role} : ${goal.target}${unit}. Une seule chose à la fois.`,
    `Chaque game compte : encore ${games(left)} sur ${goal.label}.`,
  ];
  if (!(left > 0)) return en ? `Your ${role} goal: ${goal.label}, aim for ${goal.target}${unit}. One thing at a time.` : `Ton objectif en ${role} : ${goal.label}, vise ${goal.target}${unit}. Une seule chose à la fois.`;
  return list[day % list.length];
}
