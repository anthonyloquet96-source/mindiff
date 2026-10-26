// Mode démo du coach (lancement : MINDIFF_DEMO=1 PORT=3100 npm start) (vidéo pour Riot, présentations) : un joueur fictif « Démo#EUW » et des parties classées inventées,
// servies à la place de l'API Riot. Aucun appel à Riot, aucun vrai joueur : les dix participants sont fictifs.
// Les parties suivent le format Match-V5 (match + timeline) pour passer par le même code que les vraies.
// demoPlay() ajoute une nouvelle partie « jouée maintenant », pour montrer l'évaluation de l'objectif.

const PUUID = "demo-joueur-mindiff";
const NAME = "Démo", TAG = "EUW";
const POS = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
const CHAMPS = {
  TOP: [["Garen", 86], ["Darius", 122], ["Sett", 875], ["Ornn", 516]],
  JUNGLE: [["LeeSin", 64], ["Vi", 254], ["Amumu", 32], ["Hecarim", 120]],
  MIDDLE: [["Ahri", 103], ["Orianna", 61], ["Syndra", 134], ["Viktor", 112], ["Annie", 1]],
  BOTTOM: [["Jinx", 222], ["Caitlyn", 51], ["Ezreal", 81], ["MissFortune", 21]],
  UTILITY: [["Thresh", 412], ["Lulu", 117], ["Nautilus", 111], ["Leona", 89]],
};
const MY_CHAMPS = [["Ahri", 103], ["Orianna", 61], ["Syndra", 134]];
const ITEMS = { mage: [3020, 6655, 3089, 4645, 3157, 3135], fighter: [3047, 6631, 3053, 3071, 3065, 3742], adc: [3006, 6672, 3031, 3094, 3036, 3026], sup: [3860, 3117, 3190, 3109, 2065, 3222] };

// Générateur pseudo-aléatoire déterministe : la démo est identique à chaque lancement
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }

function makeGame(n, startMs, { cs10, win, deaths, seed }) {
  const r = rng(seed);
  const pick = list => list[Math.floor(r() * list.length)];
  const duration = 1500 + Math.floor(r() * 600);
  const min = duration / 60;
  const parts = [];
  for (let t = 0; t < 2; t++) for (let k = 0; k < 5; k++) {
    const id = t * 5 + k + 1, pos = POS[k], me = t === 0 && pos === "MIDDLE";
    const [champ, champId] = me ? MY_CHAMPS[n % MY_CHAMPS.length] : pick(CHAMPS[pos].filter(c => c[0] !== MY_CHAMPS[n % MY_CHAMPS.length][0]));
    const laneCs10 = me ? cs10 : pos === "UTILITY" ? 4 : pos === "JUNGLE" ? 0 : 58 + Math.floor(r() * 14);
    const jgCs10 = pos === "JUNGLE" ? 48 + Math.floor(r() * 12) : 0;
    const csMin = pos === "UTILITY" ? 1.2 : (laneCs10 + jgCs10) / 10 * 1.05;
    const d = me ? deaths : 2 + Math.floor(r() * 6);
    const kind = pos === "UTILITY" ? "sup" : pos === "BOTTOM" ? "adc" : pos === "MIDDLE" ? "mage" : "fighter";
    parts.push({
      participantId: id, puuid: me ? PUUID : `demo-p${id}`, riotIdGameName: me ? NAME : `Joueur ${id}`, riotIdTagline: TAG,
      teamId: t ? 200 : 100, teamPosition: pos, individualPosition: pos, championName: champ, championId: champId, champLevel: 14 + Math.floor(r() * 4),
      win: (t === 0) === win, kills: me ? 4 + Math.floor(r() * 6) : Math.floor(r() * 9), deaths: d, assists: 3 + Math.floor(r() * 10),
      totalMinionsKilled: Math.round(pos === "JUNGLE" ? 20 : csMin * min), neutralMinionsKilled: pos === "JUNGLE" ? Math.round(5.5 * min) : Math.floor(r() * 8),
      goldEarned: Math.round((pos === "UTILITY" ? 280 : 380) * min), totalDamageDealtToChampions: Math.round((pos === "UTILITY" ? 300 : 750) * min * (0.8 + r() * 0.4)),
      visionScore: Math.round((pos === "UTILITY" ? 2.1 : pos === "JUNGLE" ? 1.1 : 0.7) * min), wardsPlaced: Math.round((pos === "UTILITY" ? 1.2 : 0.4) * min), wardsKilled: Math.floor(r() * 6),
      detectorWardsPlaced: 1 + Math.floor(r() * 3), visionWardsBoughtInGame: 1 + Math.floor(r() * 3), totalTimeSpentDead: d * 25,
      summoner1Id: 4, summoner2Id: pos === "JUNGLE" ? 11 : pos === "UTILITY" ? 14 : 12,
      ...Object.fromEntries(ITEMS[kind].map((it, i) => [`item${i}`, it])), item6: 3340,
      perks: { styles: [{ style: 8100, selections: [{ perk: 8112 }, { perk: 8139 }, { perk: 8138 }, { perk: 8135 }] }, { style: 8000, selections: [{ perk: 9111 }, { perk: 8014 }] }] },
      gameEndedInEarlySurrender: false, timePlayed: duration,
      challenges: { laneMinionsFirst10Minutes: laneCs10, jungleCsBefore10Minutes: jgCs10, killParticipation: 0.4 + r() * 0.3, visionScorePerMinute: (pos === "UTILITY" ? 2.1 : 0.7), teamDamagePercentage: 0.15 + r() * 0.15, controlWardsPlaced: 1 + Math.floor(r() * 3), turretPlatesTaken: Math.floor(r() * 3) },
    });
  }
  const matchId = `EUW1_DEMO${String(n).padStart(3, "0")}`;
  const kills = t => parts.filter(p => p.teamId === t).reduce((s, p) => s + p.kills, 0);
  const match = {
    metadata: { dataVersion: "2", matchId, participants: parts.map(p => p.puuid) },
    info: { gameId: 0, platformId: "EUW1", queueId: 420, gameMode: "CLASSIC", gameVersion: "16.21.700.1234", gameCreation: startMs - 60000, gameStartTimestamp: startMs, gameEndTimestamp: startMs + duration * 1000, gameDuration: duration, participants: parts,
      teams: [100, 200].map(t => ({ teamId: t, win: (t === 100) === win, objectives: { champion: { kills: kills(t) }, dragon: { kills: 2 }, baron: { kills: t === 100 ? (win ? 1 : 0) : (win ? 0 : 1) }, tower: { kills: (t === 100) === win ? 8 : 3 } } })) },
  };
  // Timeline : une image par minute ; mes morts placées avant 14 min selon « deaths »
  const frames = [];
  const myDeaths = Array.from({ length: Math.min(deaths, 3) }, (_, i) => (4 + i * 4) * 60000 + 20000);
  for (let m = 0; m <= Math.ceil(min); m++) {
    const ts = m * 60000 + (m ? 300 : 0);
    const pf = {};
    for (const p of parts) {
      const pos = p.teamPosition, lane = p.challenges.laneMinionsFirst10Minutes, jg = p.challenges.jungleCsBefore10Minutes;
      const f = Math.min(m, 10) / 10, late = Math.max(0, m - 10);
      pf[p.participantId] = { participantId: p.participantId, minionsKilled: Math.round(lane * f + late * (pos === "UTILITY" ? 0.3 : 7)), jungleMinionsKilled: Math.round(jg * f + (pos === "JUNGLE" ? late * 5 : 0)),
        totalGold: 500 + Math.round(m * (pos === "UTILITY" ? 260 : 360 + (p.puuid === PUUID ? (cs10 - 60) * 2 : 0))), currentGold: 300, xp: Math.round(m * (pos === "UTILITY" ? 330 : 420)), level: Math.min(18, 1 + Math.floor(m / 1.6)),
        position: { x: 7400 + Math.round((r() - 0.5) * 3000), y: 7400 + Math.round((r() - 0.5) * 3000) } };
    }
    const events = [];
    for (const at of myDeaths) if (at > (m - 1) * 60000 && at <= ts && m) events.push({ type: "CHAMPION_KILL", timestamp: at, victimId: 3, killerId: 8, assistingParticipantIds: [7], position: { x: 7000, y: 7600 }, bounty: 300, shutdownBounty: 0 });
    if (m === 6) events.push({ type: "ITEM_PURCHASED", timestamp: ts - 5000, participantId: 3, itemId: 3802 });
    if (m === 12) events.push({ type: "ELITE_MONSTER_KILL", timestamp: ts - 8000, killerId: win ? 2 : 7, killerTeamId: win ? 100 : 200, monsterType: "DRAGON", monsterSubType: "FIRE_DRAGON", assistingParticipantIds: [], position: { x: 9866, y: 4414 } });
    if (m === Math.ceil(min)) events.push({ type: "GAME_END", timestamp: duration * 1000, winningTeam: win ? 100 : 200 });
    frames.push({ timestamp: ts, participantFrames: pf, events });
  }
  const timeline = { metadata: { dataVersion: "2", matchId, participants: parts.map(p => p.puuid) }, info: { frameInterval: 60000, frames, participants: parts.map(p => ({ participantId: p.participantId, puuid: p.puuid })) } };
  return { match, timeline };
}

// 22 parties passées (une par jour) : sbires à 10 min entre 49 et 63, quelques morts précoces
const games = [];
const DAY = 86400000;
export function createDemo(now = Date.now()) {
  games.length = 0;
  for (let i = 0; i < 22; i++) {
    const r = rng(1000 + i);
    games.push(makeGame(i, now - (22 - i) * DAY, { cs10: 49 + Math.floor(r() * 15), win: r() < 0.5, deaths: Math.floor(r() * 3), seed: 1000 + i }));
  }
  return { play: demoPlay, fetch: demoFetch, riotId: `${NAME}#${TAG}` };
}
// Une nouvelle ranked « jouée maintenant » : le joueur applique son objectif (plus de sbires à 10 min)
export function demoPlay() {
  const n = games.length, r = rng(5000 + n);
  games.push(makeGame(n, Date.now() + n, { cs10: 62 + Math.floor(r() * 8), win: r() < 0.55, deaths: Math.floor(r() * 2), seed: 5000 + n }));
  return games[games.length - 1].match.metadata.matchId;
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "X-App-Rate-Limit": "500:10", "X-App-Rate-Limit-Count": "1:10" } });
// Remplace l'API Riot : chaque URL *.api.riotgames.com reçoit une réponse fictive ; le reste (Data Dragon) passe
export async function demoFetch(url, opts, realFetch) {
  const u = new URL(String(url));
  if (!u.hostname.endsWith(".api.riotgames.com")) return realFetch(url, opts);
  const p = u.pathname;
  if (/\/riot\/account\/v1\/accounts\/by-riot-id\//.test(p)) return json({ puuid: PUUID, gameName: NAME, tagLine: TAG });
  if (/\/riot\/account\/v1\/accounts\/by-puuid\//.test(p)) return json({ puuid: PUUID, gameName: NAME, tagLine: TAG });
  if (/\/lol\/summoner\/v4\/summoners\/by-puuid\//.test(p)) return json({ puuid: PUUID, profileIconId: 29, summonerLevel: 187 });
  if (/\/lol\/league\/v4\/entries\/by-puuid\//.test(p)) return json([{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II", leaguePoints: 54, wins: 61, losses: 58 }]);
  if (/\/lol\/spectator\/v5\//.test(p)) return json({ status: { status_code: 404, message: "Data not found" } }, 404);
  if (/\/matches\/by-puuid\/[^/]+\/ids/.test(p)) {
    const type = u.searchParams.get("type"), count = Number(u.searchParams.get("count") || 20), start = Number(u.searchParams.get("start") || 0);
    if (type && type !== "ranked") return json([]);
    return json(games.map(g => g.match.metadata.matchId).reverse().slice(start, start + count));
  }
  const m = p.match(/\/lol\/match\/v5\/matches\/([^/]+)(\/timeline)?$/);
  if (m) { const g = games.find(x => x.match.metadata.matchId === m[1]); return g ? json(m[2] ? g.timeline : g.match) : json({ status: { status_code: 404 } }, 404); }
  return json({ status: { status_code: 404, message: "Route absente de la démo" } }, 404);
}
