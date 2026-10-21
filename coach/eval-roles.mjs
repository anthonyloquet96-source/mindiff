// Mesure la justesse des rôles estimés en direct (coach/review.mjs, assignRoles) sur des parties terminées,
// où Riot donne le vrai rôle. Parties de joueurs Émeraude à Or, absentes de l'échantillon Diamant+ qui sert à estimer.
// Usage : node --env-file=.env coach/eval-roles.mjs [--matches 40]

import { readJson } from "./lib.mjs";
import { assignRoles, POS } from "./review.mjs";

const wait = ms => new Promise(r => setTimeout(r, ms));
const riot = async url => { await wait(1250); const r = await fetch(url, { headers: { "X-Riot-Token": process.env.RIOT_API_KEY.trim() } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); };
const want = Number(process.argv[process.argv.indexOf("--matches") + 1]) || 40;

const champstats = await readJson("coach/cache/champstats.json");
const [v] = await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(r => r.json());
const dd = Object.fromEntries(Object.values((await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/en_US/champion.json`).then(r => r.json())).data).map(c => [Number(c.key), { id: c.id, tags: c.tags }]));
const entries = [...await riot("https://euw1.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/EMERALD/II?page=2"), ...await riot("https://euw1.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/GOLD/I?page=2")].sort(() => Math.random() - 0.5);
const ids = new Set();
for (const e of entries) { if (ids.size >= want) break; for (const id of await riot(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${e.puuid}/ids?queue=420&count=1`)) ids.add(id); }
let ok = 0, total = 0, sureOk = 0, sure = 0, laneOk = 0, lanes = 0;
for (const id of ids) {
  const m = await riot(`https://europe.api.riotgames.com/lol/match/v5/matches/${id}`);
  if (m.info.gameDuration < 900) continue;
  for (const teamId of [100, 200]) {
    const team = m.info.participants.filter(p => p.teamId === teamId);
    if (team.some(p => !POS[p.teamPosition])) continue;
    const guess = assignRoles(team.map(p => ({ championId: p.championId, spells: [p.summoner1Id, p.summoner2Id] })), champstats, dd);
    team.forEach((p, i) => { const good = guess[i].role === POS[p.teamPosition]; total++; ok += good; if (guess[i].sure) { sure++; sureOk += good; } });
  }
  // Adversaire direct bien trouvé : même rôle estimé des deux côtés que le vrai
  const all = m.info.participants;
  const gA = assignRoles(all.filter(p => p.teamId === 100).map(p => ({ championId: p.championId, spells: [p.summoner1Id, p.summoner2Id] })), champstats, dd);
  const gB = assignRoles(all.filter(p => p.teamId === 200).map(p => ({ championId: p.championId, spells: [p.summoner1Id, p.summoner2Id] })), champstats, dd);
  const A = all.filter(p => p.teamId === 100), B = all.filter(p => p.teamId === 200);
  A.forEach((p, i) => { const j = gB.findIndex(x => x.role === gA[i].role); if (j >= 0) { lanes++; laneOk += B[j].teamPosition === p.teamPosition; } });
}
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
console.log(`Rôles estimés justes : ${ok}/${total} (${pct(ok, total)} %) ; marqués « sûrs » : ${sure} dont ${pct(sureOk, sure)} % justes ; adversaire direct juste : ${pct(laneOk, lanes)} % (${ids.size} parties).`);
