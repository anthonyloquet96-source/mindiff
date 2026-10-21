// Relecture tactique d'une partie, à partir de la chronologie officielle de Riot (match-v5 timeline). Sans IA, sans rediffusion.
// Données : position et points de vie des 10 joueurs à chaque minute, éliminations (position, tueur, aides), objectifs, tourelles.
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
  if (Math.abs(x - y) < 1700) return "voie du milieu";
  if (x < 2200 || y > MAP - 2200) return "voie du haut";
  if (y < 2200 || x > MAP - 2200) return "voie du bas";
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

  // Mini-carte : positions de tous les joueurs à chaque minute (et points de vie en %)
  const map = frames.map(f => players.map(p => { const pf = f.participantFrames?.[p.id]; return pf?.position ? [Math.round(pf.position.x), Math.round(pf.position.y), pf.championStats?.healthMax ? Math.round((pf.championStats.health / pf.championStats.healthMax) * 100) : null] : null; }));

  // Combats : éliminations proches dans le temps (20 s) et l'espace (3 000 unités)
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

  // Morts du joueur : isolé ? en infériorité ? loin de sa moitié de carte ? combien d'adversaires absents de leurs voies ?
  const deaths = kills.filter(k => k.victim === mine.id).map(k => {
    const t = k.t, at = near(mine.id, t) || k.pos;
    // Allié présent : proche au relevé de la minute, ou impliqué dans une élimination toute proche (15 s, 3 000 unités) — les éliminations ont une position exacte
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

  // Ce qui aurait été mieux : règles de fondamentaux sur des faits mesurés
  const lessons = [];
  const deadAt = t => deadAtId(mine.id, t); // temps de réapparition approximatif
  for (const o of objectives.filter(o => !o.ours)) {
    if (deadAt(o.t)) continue; // le joueur attendait de réapparaître
    if (o.allies < o.enemies && o.myDist >= R_OBJ * 1.6) lessons.push({ kind: "absent-objectif", t: o.t, at: o.at, title: `${o.kind} adverse à ${o.at} : vous étiez ${o.allies} contre ${o.enemies}, et tu étais loin (${o.myZone})`, better: "Regroupe-toi près de l'objectif environ une minute avant son apparition : pousse ta vague, puis rejoins la rivière avec ton équipe.", facts: [`Position une minute avant : ${o.myZone}, à ${Math.round(o.myDist / 100) * 100} unités.`, ...(o.absent.length ? [`Absents de ton équipe : ${o.absent.map(a => `${a.champion} (${a.zone})`).join(", ")}.`] : [])] });
    // Disputé en infériorité (combat autour, avec des pertes) ; céder un objectif sans combat n'est pas une erreur
    else if (o.allies >= 1 && o.allies < o.enemies && fightView.some(f => Math.abs(f.t - o.t) < 45000 && dist(f, o) < R_OBJ && f.alliesDead > 0)) lessons.push({ kind: "objectif-inferiorite", t: o.t, at: o.at, title: `${o.kind} adverse à ${o.at} : disputé à ${o.allies} contre ${o.enemies}, avec un combat perdu autour`, better: o.absent.some(x => x.dead) ? "Un allié était mort : sans lui, mieux valait céder l'objectif (ou prendre une compensation ailleurs) que combattre en infériorité numérique." : "Sans le nombre, mieux vaut céder l'objectif et prendre une compensation ailleurs (tourelle, vague, Larves) que s'engager en infériorité.", facts: o.absent.length ? [`Absents : ${o.absent.map(a => `${a.champion} (${a.zone})`).join(", ")}.`] : [] });
  }
  for (const d of deaths) {
    if (d.gank) lessons.push({ kind: "gank-subi", t: d.t, at: d.at, title: `Mort à ${d.at} sur un gank du jungler adverse (${d.zone})`, better: "En phase de ligne, quand le jungler adverse n'est pas visible et que ta vague est poussée, joue plus près de ta tourelle ; demande une balise dans la rivière.", facts: [`Attaquants : ${d.attackers.join(", ")}.`, ...(d.hpBefore != null ? [`Points de vie à la minute précédente : ${d.hpBefore} %.`] : [])] });
    else if (!d.alliesNear.length && d.attackers.length >= 2 && d.t >= 14 * 60000) lessons.push({ kind: "mort-isolee", t: d.t, at: d.at, title: `Mort seul à ${d.at} (${d.zone}), contre ${d.attackers.length} adversaires`, better: d.enemyHalf ? "Après la phase de ligne, éviter de pousser seul dans la moitié adverse quand plusieurs adversaires ne sont pas visibles : rester à portée de son équipe ou se replier." : "Aucun allié à portée : rester groupé ou se replier avant que plusieurs adversaires arrivent.", facts: [`Attaquants : ${d.attackers.join(", ")}.`, "Aucun allié à moins de 2 500 unités au moment de la mort."] });
  }
  for (const f of fightView.filter(f => f.won === false && !f.me && !deadAt(f.t) && f.allies >= 2 && f.allies < f.enemies && f.myDist < 6000)) lessons.push({ kind: "combat-sans-toi", t: f.t, at: f.at, title: `Combat perdu à ${f.at} (${f.zone}) : ${f.allies} contre ${f.enemies}, sans toi alors que tu étais à ${Math.round(f.myDist / 100) * 100} unités`, better: "Quand ton équipe se bat près de toi, la rejoindre change le rapport de force ; sinon, prévenir de ne pas engager.", facts: [`Pertes : ${f.alliesDead} de ton côté, ${f.enemiesDead} en face.`] });
  lessons.sort((a, b) => a.t - b.t);

  return {
    players: players.map(p => ({ champion: p.champion, role: p.role, team: p.team === myTeam ? "ally" : "enemy", me: p.me })),
    map, fights: fightView, objectives, deaths, interactions, presence, lessons,
    summary: { fights: fightView.length, fightsWithMe: fightView.filter(f => f.me).length, objectivesLost: objectives.filter(o => !o.ours).length, objectivesTaken: objectives.filter(o => o.ours).length, objectivesPresent: objectives.filter(o => o.myDist < R_OBJ).length,
      deathsIsolated: deaths.filter(d => !d.alliesNear.length && d.attackers.length >= 2 && d.t >= 14 * 60000).length, deathsGank: deaths.filter(d => d.gank).length, deaths: deaths.length,
      wards: events.filter(e => e.type === "WARD_PLACED" && e.creatorId === mine.id).length, wardsKilled: events.filter(e => e.type === "WARD_KILL" && e.killerId === mine.id).length },
    limits: "Positions relevées une fois par minute ; Riot ne fournit ni la vision, ni les sorts, ni la position des balises. Les conseils s'appuient sur ces faits mesurés.",
  };
}
