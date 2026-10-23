// Relecture tactique d'une partie, à partir de la chronologie officielle de Riot (match-v5 timeline). Sans IA, sans rediffusion.
// Données : position et points de vie des 10 joueurs à chaque minute, kills (position, tueur, aides), objectifs, tourelles.
// Limites, à rappeler au joueur : une position par minute ; ni vision, ni sorts, ni brouillard de guerre.
// Les « ce qui aurait été mieux » sont des règles de fondamentaux appliquées à des faits mesurés, jamais des suppositions.

const MAP = 14870;
const dist = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : Infinity);
const mmss = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
const OBJ = { DRAGON: "Dragon", BARON_NASHOR: "Baron", RIFTHERALD: "Héraut", HORDE: "Larves du Néant", ATAKHAN: "Atakhan" };
const R_NEAR = 2500;   // « à proximité » d'un combat ou d'une mort
const R_OBJ = 4500;    // zone d'un objectif (fosse et ses abords)

// Zone de la carte (bleu en bas à gauche, rouge en haut à droite)
export function zone(p, team) {
  if (!p) return "inconnue";
  const { x, y } = p;
  if (x < 2600 && y < 2600) return team === 100 ? "ta base" : "base adverse";
  if (x > MAP - 2600 && y > MAP - 2600) return team === 200 ? "ta base" : "base adverse";
  if (Math.abs(x - y) < 1700) return "mid lane";
  if (x < 2200 || y > MAP - 2200) return "top lane";
  if (y < 2200 || x > MAP - 2200) return "bot lane";
  if (Math.abs(x + y - MAP) < 1800) return x + y < MAP ? "rivière" : "rivière";
  const blueSide = x + y < MAP; // côté de la carte de l'équipe bleue (jungle)
  return blueSide === (team === 100) ? "ta jungle" : "jungle adverse";
}
const half = (p, team) => (team === 100 ? p.x + p.y > MAP + 600 : p.x + p.y < MAP - 600); // moitié adverse

export function tactics(match, timeline, puuid) {
  const info = match.info, frames = timeline.info.frames;
  const me = info.participants.find(p => p.puuid === puuid);
  const pidOf = p => timeline.info.participants.find(x => x.puuid === p.puuid)?.participantId ?? p.participantId;
  const players = info.participants.map(p => ({ id: pidOf(p), team: p.teamId, champion: p.championName, role: { TOP: "top", JUNGLE: "jungle", MIDDLE: "mid", BOTTOM: "bottom", UTILITY: "support" }[p.teamPosition] || null, me: p.puuid === puuid }));
  const byId = Object.fromEntries(players.map(p => [p.id, p]));
  const mine = byId[pidOf(me)], myTeam = me.teamId;
  const frameAt = t => frames[Math.min(frames.length - 1, Math.max(0, Math.floor(t / 60000)))];
  const posAt = (id, t) => frameAt(t)?.participantFrames?.[id]?.position;
  // Position la plus proche avant l'événement (instantané de la minute) et celle d'après : on garde la plus proche dans le temps
  const near = (id, t) => { const a = frames[Math.floor(t / 60000)], b = frames[Math.ceil(t / 60000)]; const w = (t % 60000) / 60000; return (w < 0.5 ? a : b || a)?.participantFrames?.[id]?.position; };
  const events = frames.flatMap(f => f.events);

  // Minimap : positions de tous les joueurs à chaque minute (et points de vie en %)
  const map = frames.map(f => players.map(p => { const pf = f.participantFrames?.[p.id]; return pf?.position ? [Math.round(pf.position.x), Math.round(pf.position.y), pf.championStats?.healthMax ? Math.round((pf.championStats.health / pf.championStats.healthMax) * 100) : null] : null; }));

  // Combats : kills proches dans le temps (20 s) et l'espace (3 000 unités)
  const kills = events.filter(e => e.type === "CHAMPION_KILL" && e.position).map(e => ({ t: e.timestamp, killer: e.killerId, victim: e.victimId, assists: e.assistingParticipantIds || [], pos: e.position }));
  const fights = [];
  for (const k of kills) {
    const f = fights.find(f => k.t - f.end <= 20000 && dist(k.pos, f.pos) < 3000);
    if (f) { f.kills.push(k); f.end = k.t; } else fights.push({ start: k.t, end: k.t, pos: k.pos, kills: [k] });
  }
  const fightView = fights.filter(f => new Set(f.kills.flatMap(k => [k.killer, k.victim, ...k.assists]).filter(id => byId[id])).size >= 3).map(f => {
    const involved = new Set(f.kills.flatMap(k => [k.killer, k.victim, ...k.assists]).filter(id => byId[id]));
    const side = t => [...involved].filter(id => byId[id].team === t);
    const ally = side(myTeam), enemy = side(myTeam === 100 ? 200 : 100);
    const lostAlly = f.kills.filter(k => byId[k.victim]?.team === myTeam).length, lostEnemy = f.kills.length - lostAlly;
    const meIn = involved.has(mine.id);
    const myDist = Math.round(dist(near(mine.id, f.start), f.pos));
    return { t: f.start, at: mmss(f.start), zone: zone(f.pos, myTeam), x: f.pos.x, y: f.pos.y, allies: ally.length, enemies: enemy.length, alliesDead: lostAlly, enemiesDead: lostEnemy,
      won: lostEnemy > lostAlly ? true : lostEnemy < lostAlly ? false : null, me: meIn, myDist, champions: { allies: ally.map(id => byId[id].champion), enemies: enemy.map(id => byId[id].champion) } };
  });

  const deadAtId = (id, t) => kills.some(k => k.victim === id && t - k.t >= 0 && t - k.t < (k.t < 15 * 60000 ? 30000 : 50000));
  // Objectifs : qui était dans la zone à l'instantané d'avant (mise en place) ; distance du joueur
  const objectives = events.filter(e => e.type === "ELITE_MONSTER_KILL").map(e => {
    const ours = (e.killerTeamId || byId[e.killerId]?.team) === myTeam;
    const setup = frames[Math.min(frames.length - 1, Math.round(e.timestamp / 60000))]; // relevé le plus proche dans le temps
    const count = t => players.filter(p => p.team === t && dist(setup?.participantFrames?.[p.id]?.position, e.position) < R_OBJ).length;
    const myPos = setup?.participantFrames?.[mine.id]?.position;
    const absent = players.filter(p => p.team === myTeam && dist(setup?.participantFrames?.[p.id]?.position, e.position) >= R_OBJ * 1.6).map(p => ({ champion: p.champion, role: p.role, zone: deadAtId(p.id, e.timestamp) ? "mort, en attente de réapparition" : zone(setup?.participantFrames?.[p.id]?.position, myTeam), dead: deadAtId(p.id, e.timestamp), me: p.me }));
    return { t: e.timestamp, at: mmss(e.timestamp), kind: OBJ[e.monsterType] || e.monsterType, ours, x: e.position?.x, y: e.position?.y,
      allies: count(myTeam), enemies: count(myTeam === 100 ? 200 : 100), myDist: Math.round(dist(myPos, e.position)), myZone: zone(myPos, myTeam), absent };
  });
  // Larves du Néant : une seule ligne par groupe
  for (let i = objectives.length - 1; i > 0; i--) if (objectives[i].kind === objectives[i - 1].kind && objectives[i].ours === objectives[i - 1].ours && objectives[i].t - objectives[i - 1].t < 60000) objectives.splice(i, 1);

  // Morts du joueur : isolé ? en infériorité ? loin de sa moitié de carte ? combien d'adversaires absents de leurs lanes ?
  const deaths = kills.filter(k => k.victim === mine.id).map(k => {
    const t = k.t, at = near(mine.id, t) || k.pos;
    // Allié présent : proche au relevé de la minute, ou impliqué dans une élimination toute proche (15 s, 3 000 unités) — les kills ont une position exacte
    const inFight = id => kills.some(o => Math.abs(o.t - t) <= 15000 && dist(o.pos, k.pos) < 3000 && [o.killer, o.victim, ...o.assists].includes(id));
    const alliesNear = players.filter(p => p.team === myTeam && !p.me && (dist(near(p.id, t), k.pos) < R_NEAR || inFight(p.id))).map(p => p.champion);
    const attackers = [k.killer, ...k.assists].filter(id => byId[id]).map(id => byId[id].champion);
    const enemyJg = players.find(p => p.team !== myTeam && p.role === "jungle");
    return { t, at: mmss(t), zone: zone(k.pos, myTeam), x: k.pos.x, y: k.pos.y, killer: byId[k.killer]?.champion || "sbires ou tourelle", attackers, alliesNear, enemyHalf: half(k.pos, myTeam),
      gank: t < 14 * 60000 && enemyJg && [k.killer, ...k.assists].includes(enemyJg.id), hpBefore: frames[Math.max(0, Math.floor(t / 60000))]?.participantFrames?.[mine.id]?.championStats ? Math.round((frames[Math.floor(t / 60000)].participantFrames[mine.id].championStats.health / frames[Math.floor(t / 60000)].participantFrames[mine.id].championStats.healthMax) * 100) : null };
  });

  // Interactions : contre qui le joueur meurt et tue le plus, avec qui il élimine le plus
  const tally = (list, key) => Object.entries(list.reduce((a, x) => ((a[x] = (a[x] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).map(([champion, n]) => ({ champion, n }));
  const interactions = {
    killedBy: tally(kills.filter(k => k.victim === mine.id).flatMap(k => [k.killer, ...k.assists]).filter(id => byId[id]).map(id => byId[id].champion), "c"),
    killed: tally(kills.filter(k => k.killer === mine.id || k.assists.includes(mine.id)).map(k => byId[k.victim]?.champion).filter(Boolean)),
    with: tally(kills.filter(k => k.killer === mine.id || k.assists.includes(mine.id)).flatMap(k => [k.killer, ...k.assists]).filter(id => id !== mine.id && byId[id]?.team === myTeam).map(id => byId[id].champion)),
  };

  // Présence sur la carte par phase (part des minutes passées dans chaque zone)
  const presence = {};
  frames.forEach((f, m) => {
    if (!m) return;
    const phase = m < 14 ? "début" : m < 25 ? "milieu" : "fin";
    const z = zone(f.participantFrames?.[mine.id]?.position, myTeam);
    ((presence[phase] ||= {})[z] = (presence[phase][z] || 0) + 1);
  });

  // Ce qui aurait été mieux : règles de fondamentaux sur des faits mesurés, adaptées au rôle (relecture « joueur Argent » du 21/10)
  const lessons = [];
  const deadAt = t => deadAtId(mine.id, t); // temps de réapparition approximatif
  const diedBefore = (t, span = 90000) => kills.find(k => k.victim === mine.id && t - k.t >= 0 && t - k.t < span);
  const role = mine.role;
  // Distances en repères compréhensibles plutôt qu'en unités du jeu
  const far = d => (d < 2500 ? "tout près" : d < 6000 ? "à quelques secondes" : d < 9000 ? "loin" : "à l'autre bout de la carte");
  // Liste des absents : le joueur est désigné par « toi »
  const absents = list => { const me = list.some(a => a.me), others = list.filter(a => !a.me).map(a => `${a.champion} (${a.zone})`); return [me ? "toi" : null, ...others].filter(Boolean).join(", "); };
  for (const o of objectives.filter(o => !o.ours)) {
    if (deadAt(o.t) || diedBefore(o.t)) continue; // le joueur réapparaissait : c'est sa mort d'avant qui compte, pas son absence
    const early = o.t < 14 * 60000;
    // Personne de l'équipe autour : décision d'équipe (céder), pas une erreur personnelle
    if (o.allies === 0) continue;
    // « Absent d'un objectif perdu » retiré au banc d'essai du 21/10 : sans effet au-delà de l'état de la partie (coût médian nul)
    // Disputé en infériorité (combat autour, avec des pertes) ; céder un objectif sans combat n'est pas une erreur
    if (o.allies < o.enemies && fightView.some(f => Math.abs(f.t - o.t) < 45000 && dist(f, o) < R_OBJ && f.alliesDead > 0)) lessons.push({ kind: "objectif-inferiorite", t: o.t, at: o.at, title: `${o.kind} adverse à ${o.at} : disputé à ${o.allies} contre ${o.enemies}, avec un combat perdu autour`,
      better: o.absent.some(x => x.dead) ? "Un allié était mort : sans lui, il valait mieux céder l'objectif et prendre une tourelle ou une wave de l'autre côté de la carte." : "En infériorité numérique, cède l'objectif et prends plutôt une tourelle ou une wave de l'autre côté de la carte.",
      facts: o.absent.length ? [`Absents : ${absents(o.absent)}.`] : [] });
  }
  for (const d of deaths) {
    const lowHp = d.hpBefore != null && d.hpBefore < 40 ? [`Il te restait ${d.hpBefore} % de tes points de vie une minute avant : rentrer à la base t'aurait évité ce risque.`] : [];
    // « Gank subi » retiré au banc d'essai du 21/10 : aussi fréquent à tous les rangs, sans lien avec la victoire
    if (!d.alliesNear.length && d.attackers.length >= 2 && d.t >= 14 * 60000) lessons.push({ kind: "mort-isolee", t: d.t, at: d.at, title: `Mort seul à ${d.at} (${d.zone}), contre ${d.attackers.length} adversaires`,
      better: ["top", "bottom"].includes(role) && /lane/.test(d.zone) ? "Sur une side lane, quand 2 adversaires ou plus disparaissent de la minimap, recule vers ta tourelle : ils arrivent peut-être sur toi."
        : d.enemyHalf ? "Évite d'avancer seul dans la moitié adverse quand plusieurs adversaires ne sont pas visibles : reste à portée de ton équipe ou replie-toi." : "Aucun allié n'était proche : replie-toi vers ton équipe avant que plusieurs adversaires arrivent.",
      facts: [`Tes adversaires : ${d.attackers.join(", ")}.`, "Aucun allié n'était tout près de toi.", ...lowHp] });
  }
  for (const f of fightView.filter(f => f.won === false && !f.me && !deadAt(f.t) && !diedBefore(f.t, 60000) && f.allies >= 2 && f.allies < f.enemies && f.myDist < 6000)) lessons.push({ kind: "combat-sans-toi", t: f.t, at: f.at, title: `Combat perdu à ${f.at} (${f.zone}) sans toi, alors que tu étais ${far(f.myDist)}`,
    better: "Quand ton équipe se bat près de toi, rejoins-la : un joueur de plus change le rapport de force. Sinon, signale-lui de ne pas engager.", facts: [`${f.allies} de ton équipe contre ${f.enemies} : ${f.alliesDead} perte${f.alliesDead > 1 ? "s" : ""} de ton côté, ${f.enemiesDead ? `${f.enemiesDead} en face` : "aucune en face"}.`] });
  lessons.sort((a, b) => a.t - b.t);

  // Ce qui a suivi (2 minutes) : écart d'or entre les équipes et ce qui a été perdu — présenté comme une suite, pas comme une cause certaine
  const teamGold = frames.map(f => players.reduce((s, p) => s + (p.team === myTeam ? 1 : -1) * (f.participantFrames?.[p.id]?.totalGold || 0), 0));
  const goldAt = t => teamGold[Math.min(teamGold.length - 1, Math.max(0, Math.floor(t / 60000)))];
  const buildings = events.filter(e => e.type === "BUILDING_KILL").map(e => ({ t: e.timestamp, ours: e.teamId !== myTeam, kind: e.buildingType === "INHIBITOR_BUILDING" ? "inhibiteur" : "tourelle" }));
  const gold = v => Math.abs(Math.round(v / 100) * 100).toLocaleString("fr-FR");
  // « 2 tourelles et 1 inhibiteur », « le Dragon et le Baron » : regroupés et accordés
  const losses = list => {
    const n = k => list.filter(x => x === k).length;
    const parts = [...new Set(list.filter(x => !["tourelle", "inhibiteur"].includes(x)))].map(k => `le ${k}`.replace("le Larves du Néant", "les Larves du Néant").replace("le Héraut", "le Héraut"));
    if (n("tourelle")) parts.push(n("tourelle") > 1 ? `${n("tourelle")} tourelles` : "une tourelle");
    if (n("inhibiteur")) parts.push(n("inhibiteur") > 1 ? `${n("inhibiteur")} inhibiteurs` : "un inhibiteur");
    return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} et ${parts.at(-1)}` : parts[0] || "";
  };
  const after = (t, span = 120000) => {
    const lost = [...objectives.filter(o => !o.ours && o.t > t && o.t - t <= span).map(o => o.kind), ...buildings.filter(b => !b.ours && b.t > t && b.t - t <= span).map(b => b.kind)];
    const swing = goldAt(t + span) - goldAt(t);
    const bits = [lost.length ? `ton équipe a perdu ${losses(lost)}` : null, swing <= -500 ? `l'écart d'or s'est creusé de ${gold(swing)} en faveur de l'adversaire` : null].filter(Boolean);
    return { gold: swing, lost, text: bits.join(", et ") };
  };
  for (const l of lessons) { const e = after(l.t); if (e.text) { l.effect = e; l.facts = [...l.facts, `Ensuite (sans lien certain avec ce seul moment) : ${e.text} dans les 2 minutes.`]; } }
  // Tournants : les minutes où l'écart d'or bascule le plus (au moins 1 500 en 2 minutes), avec ce qui s'est passé
  const turns = [];
  for (let m = 2; m < teamGold.length; m++) {
    const d = teamGold[m] - teamGold[m - 2];
    if (Math.abs(d) < 1500) continue;
    const t0 = (m - 2) * 60000, t1 = m * 60000;
    const inWin = t => t > t0 && t <= t1;
    const fights = fightView.filter(f => inWin(f.t)).map(f => `combat ${f.zone} (${f.enemiesDead ? `${f.enemiesDead} adversaire${f.enemiesDead > 1 ? "s" : ""} éliminé${f.enemiesDead > 1 ? "s" : ""}` : "aucun adversaire éliminé"}, ${f.alliesDead ? `${f.alliesDead} perte${f.alliesDead > 1 ? "s" : ""} de ton côté` : "aucune perte de ton côté"})`);
    const won = [...objectives.filter(o => inWin(o.t) && o.ours).map(o => o.kind), ...buildings.filter(b => inWin(b.t) && b.ours).map(b => b.kind)];
    const lost = [...objectives.filter(o => inWin(o.t) && !o.ours).map(o => o.kind), ...buildings.filter(b => inWin(b.t) && !b.ours).map(b => b.kind)];
    const what = [...fights.slice(0, 2), won.length ? `pris : ${losses(won).replace(/^le |^les /, m => m)}` : null, lost.length ? `perdu : ${losses(lost)}` : null, ...deaths.filter(x => inWin(x.t)).map(x => `ta mort à ${x.at}`)].filter(Boolean);
    turns.push({ t: t0, at: mmss(t0), to: mmss(t1), gold: d, what });
  }
  // On garde les tournants les plus forts sans chevauchement
  const keyTurns = [];
  for (const tr of turns.sort((a, b) => Math.abs(b.gold) - Math.abs(a.gold))) if (!keyTurns.some(k => Math.abs(k.t - tr.t) < 120000)) keyTurns.push(tr);
  keyTurns.splice(4); keyTurns.sort((a, b) => a.t - b.t);

  return {
    players: players.map(p => ({ champion: p.champion, role: p.role, team: p.team === myTeam ? "ally" : "enemy", me: p.me })),
    map, fights: fightView, objectives, deaths, interactions,
    kills: kills.map(k => ({ t: k.t, v: players.findIndex(p => p.id === k.victim), k: players.findIndex(p => p.id === k.killer) })), presence, lessons, turns: keyTurns, goldDiff: teamGold.map(g => Math.round(g / 100) * 100),
    summary: { fights: fightView.length, fightsWithMe: fightView.filter(f => f.me).length, objectivesLost: objectives.filter(o => !o.ours).length, objectivesTaken: objectives.filter(o => o.ours).length, objectivesPresent: objectives.filter(o => o.myDist < R_OBJ).length,
      deathsIsolated: deaths.filter(d => !d.alliesNear.length && d.attackers.length >= 2 && d.t >= 14 * 60000).length, deathsGank: deaths.filter(d => d.gank).length, deaths: deaths.length,
      wards: events.filter(e => e.type === "WARD_PLACED" && e.creatorId === mine.id).length, wardsKilled: events.filter(e => e.type === "WARD_KILL" && e.killerId === mine.id).length },
    limits: "Positions relevées une fois par minute ; Riot ne fournit ni la vision, ni les sorts, ni la position des wards. Les conseils s'appuient sur ces faits mesurés.",
  };
}
