// Bilan de parties à partir des données officielles de Riot (match-v5 et sa chronologie) : faits exacts, sans IA.
// Module sans dépendance (fetch uniquement) : utilisé par le serveur local et par le service en ligne (Cloudflare Worker).
// Comparaisons : uniquement au niveau Diamant et plus, par rôle (coach/cache/benchmarks.json, construit par coach/benchmarks.mjs).
import { tactics } from "./tactics.mjs";

export const PLATFORMS = {
  euw1: ["europe", "EUW"], eun1: ["europe", "EUNE"], tr1: ["europe", "TR"], ru: ["europe", "RU"], me1: ["europe", "ME"],
  na1: ["americas", "NA"], br1: ["americas", "BR"], la1: ["americas", "LAN"], la2: ["americas", "LAS"],
  kr: ["asia", "KR"], jp1: ["asia", "JP"], oc1: ["sea", "OCE"], sg2: ["sea", "SEA"], tw2: ["sea", "TW"], vn2: ["sea", "VN"],
};
export const POS = { TOP: "top", JUNGLE: "jungle", MIDDLE: "mid", BOTTOM: "bottom", UTILITY: "support" };
const QUEUES = { 420: "Classée solo/duo", 440: "Classée flexible", 400: "Normale (draft)", 490: "Normale (rapide)", 450: "ARAM" };
const DD = "https://ddragon.leagueoflegends.com";

export function createRiot(key, { fetchImpl = fetch } = {}) {
  const cache = new Map();
  return async function riot(url, { ttl = 0 } = {}) {
    const hit = cache.get(url);
    if (hit && (!hit.until || hit.until > Date.now())) return hit.data;
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await fetchImpl(url, { headers: { "X-Riot-Token": key } });
      if (r.ok) { const data = await r.json(); cache.set(url, { data, until: ttl ? Date.now() + ttl : 0 }); if (cache.size > 500) cache.delete(cache.keys().next().value); return data; }
      if (r.status === 429) { await new Promise(res => setTimeout(res, Math.min(10, Number(r.headers.get("retry-after")) || 2) * 1000)); continue; }
      throw Object.assign(new Error(r.status === 404 ? "introuvable" : r.status === 401 || r.status === 403 ? "clé Riot refusée ou expirée" : `API Riot : HTTP ${r.status}`), { status: r.status });
    }
    throw Object.assign(new Error("API Riot saturée, réessayez dans une minute"), { status: 429 });
  };
}

let itemsCache = null, itemsFor = null; // cache par source (les tests injectent leur propre fetch)
export async function items(fetchImpl = fetch) {
  if (itemsCache && itemsFor === fetchImpl) return itemsCache;
  itemsFor = fetchImpl;
  const [v] = await fetchImpl(`${DD}/api/versions.json`).then(r => r.json());
  const j = await fetchImpl(`${DD}/cdn/${v}/data/fr_FR/item.json`).then(r => r.json());
  itemsCache = Object.fromEntries(Object.entries(j.data).map(([id, it]) => [id, { name: it.name, gold: it.gold.total, final: !it.into?.length && it.gold.total >= 2000, boots: it.tags?.includes("Boots") }]));
  return itemsCache;
}

const mmss = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
const r1 = x => Math.round(x * 10) / 10;
const fr = v => String(v).replace(".", ",");
export const parseRiotId = s => { const m = String(s || "").trim().match(/^(.{3,16})#([A-Za-z0-9]{2,5})$/); return m ? { gameName: m[1].trim(), tagLine: m[2] } : null; };

// Résumé d'une partie pour un joueur : uniquement des valeurs fournies par Riot
export function summarize(match, puuid) {
  const info = match.info;
  const me = info.participants.find(p => p.puuid === puuid);
  if (!me) return null;
  const minutes = info.gameDuration / 60;
  const role = POS[me.teamPosition] || null;
  const opp = role ? info.participants.find(p => p.teamId !== me.teamId && p.teamPosition === me.teamPosition) : null;
  const ch = me.challenges || {};
  return {
    id: match.metadata.matchId, at: info.gameStartTimestamp, queue: QUEUES[info.queueId] || `File ${info.queueId}`, queueId: info.queueId,
    patch: info.gameVersion.split(".").slice(0, 2).join("."), minutes: r1(minutes), remake: info.gameDuration < 300 || me.gameEndedInEarlySurrender,
    champion: me.championName, championId: me.championId, role, win: me.win, k: me.kills, d: me.deaths, a: me.assists,
    cs: me.totalMinionsKilled + me.neutralMinionsKilled, opponent: opp?.championName || null,
    metrics: metricsOf(me, minutes),
  };
}
// Indicateurs comparables au niveau Diamant+ (mêmes définitions pour le joueur et pour la référence)
export function metricsOf(p, minutes) {
  const ch = p.challenges || {};
  const role = POS[p.teamPosition];
  return {
    cs10: role === "support" ? null : (v => (v == null ? null : Math.round(v)))(role === "jungle" ? ch.jungleCsBefore10Minutes : ch.laneMinionsFirst10Minutes),
    csMin: role === "support" ? null : r1((p.totalMinionsKilled + p.neutralMinionsKilled) / minutes),
    deaths30: r1((p.deaths / minutes) * 30),
    visionMin: ch.visionScorePerMinute != null ? Math.round(ch.visionScorePerMinute * 100) / 100 : null,
    controlWards: p.challenges?.controlWardsPlaced ?? p.detectorWardsPlaced ?? null,
    kp: ch.killParticipation != null ? Math.round(ch.killParticipation * 100) : null,
    dmgShare: ch.teamDamagePercentage != null ? Math.round(ch.teamDamagePercentage * 100) : null,
  };
}

export const METRICS = {
  cs10: { label: "Sbires à 10 min", unit: "", better: "high", roles: ["top", "jungle", "mid", "bottom"], themes: ["lane"], learn: /wave|vague|trading|farm|\bcs\b|last ?hit|clear|jungle path/i },
  csMin: { label: "Sbires par minute", unit: "/min", better: "high", roles: ["top", "jungle", "mid", "bottom"], themes: ["lane"], learn: /wave|vague|farm|\bcs\b|tempo/i },
  deaths30: { label: "Morts (pour 30 min)", unit: "", better: "low", roles: ["top", "jungle", "mid", "bottom", "support"], themes: ["survie", "methode"], learn: /mort|death|dying|survi|position|dans la t[eê]te|mistake|erreur/i },
  visionMin: { label: "Score de vision par minute", unit: "/min", better: "high", roles: ["top", "jungle", "mid", "bottom", "support"], themes: ["methode"], learn: /vision|ward|balise|track/i },
  controlWards: { label: "Balises de contrôle posées", unit: "", better: "high", roles: ["top", "jungle", "mid", "bottom", "support"], themes: ["methode"], learn: /vision|ward|balise|control/i },
  kp: { label: "Participation aux éliminations", unit: " %", better: "high", roles: ["jungle", "mid", "support"], themes: ["teamfight"], learn: /roam|gank|tempo|teamfight|skirmish|escarmouche|jungle/i },
};

// Position d'une valeur par rapport aux joueurs Diamant+ du même rôle (quartiles)
export function compare(metric, value, bench) {
  const b = bench?.[metric];
  if (value == null || !b || b.n < 30) return null;
  const M = METRICS[metric];
  const below = M.better === "high" ? value < b.p25 : value > b.p75;
  const above = M.better === "high" ? value > b.p75 : value < b.p25;
  const gap = M.better === "high" ? (b.p50 - value) / (b.p75 - b.p25 || 1) : (value - b.p50) / (b.p75 - b.p25 || 1);
  return { metric, label: M.label, value, p25: b.p25, p50: b.p50, p75: b.p75, n: b.n, level: below ? "sous" : above ? "au-dessus" : "dans", gap: r1(gap) };
}

// Bilan d'une partie : chronologie des morts, retours à la base, objectifs ; constats comparés au Diamant+
export async function review(riot, { matchId, puuid, region, benchmarks, champstats = null, fetchImpl = fetch }) {
  const [match, timeline, itemDb] = await Promise.all([
    riot(`https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}`),
    riot(`https://${region}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`),
    items(fetchImpl),
  ]);
  const s = summarize(match, puuid);
  if (!s) throw Object.assign(new Error("Ce joueur n'est pas dans cette partie"), { status: 404 });
  const info = match.info;
  const me = info.participants.find(p => p.puuid === puuid);
  const pid = timeline.info.participants.find(p => p.puuid === puuid)?.participantId ?? me.participantId;
  const byId = Object.fromEntries(info.participants.map(p => [p.participantId, p]));
  const oppId = info.participants.find(p => p.teamId !== me.teamId && p.teamPosition === me.teamPosition && me.teamPosition)?.participantId;
  const events = timeline.info.frames.flatMap(f => f.events);
  const frameAt = min => timeline.info.frames[Math.min(min, timeline.info.frames.length - 1)]?.participantFrames || {};

  // Morts du joueur
  const deaths = events.filter(e => e.type === "CHAMPION_KILL" && e.victimId === pid).map(e => ({
    t: e.timestamp, at: mmss(e.timestamp), killer: byId[e.killerId]?.championName || "sbires ou tourelle",
    helpers: (e.assistingParticipantIds || []).length, x: e.position?.x, y: e.position?.y,
    enemyHalf: e.position ? (me.teamId === 100 ? e.position.x + e.position.y > 15000 : e.position.x + e.position.y < 14000) : null,
  }));
  // Objectifs majeurs
  const team = id => byId[id]?.teamId;
  const objectives = events.filter(e => e.type === "ELITE_MONSTER_KILL").map(e => ({
    t: e.timestamp, at: mmss(e.timestamp), kind: { DRAGON: "Dragon", BARON_NASHOR: "Baron", RIFTHERALD: "Héraut", HORDE: "Larves du Néant", ATAKHAN: "Atakhan" }[e.monsterType] || e.monsterType,
    ours: team(e.killerId) === me.teamId || (e.killerTeamId && e.killerTeamId === me.teamId), withMe: e.killerId === pid || (e.assistingParticipantIds || []).includes(pid),
  }));
  // Les Larves du Néant arrivent par groupes : un seul objectif par groupe et par équipe
  for (let i = objectives.length - 1; i > 0; i--) if (objectives[i].kind === objectives[i - 1].kind && objectives[i].ours === objectives[i - 1].ours && objectives[i].t - objectives[i - 1].t < 60000) { objectives[i - 1].withMe ||= objectives[i].withMe; objectives.splice(i, 1); }
  // Mort dans la minute qui précède un objectif pris par l'adversaire : fait vérifiable, pas une interprétation
  for (const d of deaths) {
    const o = objectives.find(o => !o.ours && o.t > d.t && o.t - d.t <= 60000);
    if (o) d.beforeObjective = `${o.kind} adverse à ${o.at}`;
  }
  // Retours à la base : groupes d'achats (on n'achète qu'en base) ; après une mort, ce n'est pas un retour choisi
  const buys = events.filter(e => e.participantId === pid && ["ITEM_PURCHASED", "ITEM_UNDO"].includes(e.type) && e.timestamp > 90000);
  const visits = [];
  for (const e of buys) {
    const last = visits.at(-1);
    if (last && e.timestamp - last.end <= 25000) { last.end = e.timestamp; last.events.push(e); } else visits.push({ start: e.timestamp, end: e.timestamp, events: [e] });
  }
  const bases = visits.map(v => {
    const bought = [];
    for (const e of v.events) {
      if (e.type === "ITEM_UNDO") { const i = bought.findIndex(b => b.id === String(e.beforeId)); if (i >= 0) bought.splice(i, 1); }
      else bought.push({ id: String(e.itemId), ...(itemDb[e.itemId] || { name: `Objet ${e.itemId}`, gold: 0 }) });
    }
    const afterDeath = deaths.find(d => d.t < v.start && v.start - d.t < 75000);
    const minute = Math.floor(v.start / 60000);
    const goldBefore = frameAt(minute)[pid]?.currentGold ?? null;
    return { t: v.start, at: mmss(v.start), afterDeath: !!afterDeath, goldBefore, items: bought.filter(b => b.gold > 0).map(b => b.name), finished: bought.filter(b => b.final).map(b => b.name) };
  }).filter(b => b.items.length);
  // Écarts avec l'adversaire direct à 10 et 15 min
  const diffAt = min => {
    const a = frameAt(min)[pid], b = oppId && frameAt(min)[oppId];
    if (!a || !b || timeline.info.frames.length <= min) return null;
    const cs = f => f.minionsKilled + f.jungleMinionsKilled;
    return { min, gold: a.totalGold - b.totalGold, cs: cs(a) - cs(b), xp: a.xp - b.xp };
  };
  const lane = { opponent: oppId ? byId[oppId].championName : null, at10: diffAt(10), at15: diffAt(15) };
  // Plaques de tourelle de sa voie (elles tombent à 14 min) : teamId = équipe propriétaire de la plaque
  const LANE = { top: "TOP_LANE", mid: "MID_LANE", bottom: "BOT_LANE", support: "BOT_LANE" }[s.role];
  const plates = events.filter(e => e.type === "TURRET_PLATE_DESTROYED" && LANE && e.laneType === LANE && e.timestamp < 14 * 60000);
  lane.platesLost = LANE ? plates.filter(e => e.teamId === me.teamId).length : null;
  lane.platesTaken = LANE ? plates.filter(e => e.teamId !== me.teamId).length : null;
  const firstTower = LANE && events.find(e => e.type === "BUILDING_KILL" && e.buildingType === "TOWER_BUILDING" && e.laneType === LANE && e.teamId === me.teamId);
  lane.towerLostAt = firstTower ? mmss(firstTower.timestamp) : null;

  // Constats : écarts nets avec le Diamant+ du même rôle, triés par importance
  const bench = benchmarks?.roles?.[s.role];
  const comparisons = Object.keys(METRICS).filter(k => METRICS[k].roles.includes(s.role)).map(k => compare(k, s.metrics[k], bench)).filter(Boolean);
  const findings = [];
  const lateObj = deaths.filter(d => d.beforeObjective);
  if (lateObj.length) findings.push({ kind: "mort-avant-objectif", weight: 3 + lateObj.length, title: `${lateObj.length} mort${lateObj.length > 1 ? "s" : ""} juste avant un objectif adverse`, facts: lateObj.map(d => `${d.at} : tué par ${d.killer}, puis ${d.beforeObjective}`), metric: "deaths30" });
  const earlyDeaths = deaths.filter(d => d.t < 14 * 60000);
  if (earlyDeaths.length >= 2) findings.push({ kind: "morts-phase-de-ligne", weight: 1 + earlyDeaths.length, title: `${earlyDeaths.length} morts avant 14 min`, facts: earlyDeaths.map(d => `${d.at} : tué par ${d.killer}${d.helpers ? ` (+${d.helpers} aide${d.helpers > 1 ? "s" : ""})` : ""}${d.enemyHalf ? ", dans la moitié adverse" : ""}`), metric: "deaths30" });
  for (const c of comparisons.filter(c => c.level === "sous")) findings.push({ kind: `ecart-${c.metric}`, weight: 1 + c.gap, title: `${c.label} : ${fr(c.value)}${METRICS[c.metric].unit}, moins bien que 75 % des joueurs Diamant+ ${s.role === "bottom" ? "ADC" : s.role}`, facts: [`Diamant+ du même rôle : médiane ${fr(c.p50)}${METRICS[c.metric].unit} (la moitié des joueurs entre ${fr(c.p25)} et ${fr(c.p75)}), ${c.n} joueurs.`], metric: c.metric });
  // Retard net en phase de ligne (environ une élimination et deux vagues) ou plaques perdues
  const a10 = lane.at10;
  if (a10 && a10.gold <= -1000) {
    const byOpp = deaths.filter(d => d.t < 10 * 60000 && d.killer === lane.opponent).length;
    findings.push({ kind: "retard-en-ligne", weight: 2 + Math.min(2, -a10.gold / 1000), title: `${fr(-a10.gold)} pièces d'or de retard sur ${lane.opponent} à 10 min`, facts: [`Sbires : ${a10.cs > 0 ? "+" : ""}${a10.cs} à 10 min.`, ...(byOpp ? [`${byOpp} mort${byOpp > 1 ? "s" : ""} contre ${lane.opponent} avant 10 min.`] : []), ...(lane.platesLost >= 2 ? [`${lane.platesLost} plaques de ta tourelle perdues avant 14 min.`] : [])], metric: a10.cs <= -10 ? "cs10" : "deaths30" });
  } else if (lane.platesLost >= 3) findings.push({ kind: "plaques-perdues", weight: 1.5 + lane.platesLost / 5, title: `${lane.platesLost} plaques de ta tourelle perdues avant 14 min`, facts: [`Plaques prises chez l'adversaire : ${lane.platesTaken}.`, ...(lane.towerLostAt ? [`Première tourelle de ta voie perdue à ${lane.towerLostAt}.`] : [])], metric: "csMin" });
  const bigBank = bases.filter(b => !b.afterDeath && b.goldBefore >= 2500);
  if (bigBank.length) findings.push({ kind: "or-non-depense", weight: 1.5, title: `Retour${bigBank.length > 1 ? "s" : ""} tardif${bigBank.length > 1 ? "s" : ""} avec beaucoup d'or`, facts: bigBank.map(b => `Vers ${b.at} : environ ${b.goldBefore} pièces d'or en poche à la minute précédente.`), metric: null });
  findings.sort((a, b) => b.weight - a.weight);
  const strengths = comparisons.filter(c => c.level === "au-dessus" && c.p50 > 0).map(c => `${c.label} : ${fr(c.value)}${METRICS[c.metric].unit} (médiane Diamant+ ${fr(c.p50)})`);
  if (a10 && a10.gold >= 1000) strengths.unshift(`Phase de ligne : ${fr(a10.gold)} pièces d'or d'avance sur ${lane.opponent} à 10 min`);
  if (lane.platesTaken >= 3) strengths.push(`${lane.platesTaken} plaques de tourelle prises sur ta voie`);

  return {
    summary: { ...s, deadSeconds: me.totalTimeSpentDead ?? null }, lane, deaths, bases, objectives, comparisons, findings: findings.slice(0, 3), strengths,
    build: await buildVsDiamond(me, champstats, itemDb, fetchImpl),
    // Compositions : champions et rôles (aucun Riot ID des autres joueurs)
    // Relecture tactique : mini-carte, combats, objectifs, morts, interactions, ce qui aurait été mieux (coach/tactics.mjs)
    tactics: (() => { try { return tactics(match, timeline, puuid); } catch { return null; } })(), // données incomplètes : le bilan reste disponible sans la relecture
    teams: { allies: info.participants.filter(p => p.teamId === me.teamId).map(p => ({ champion: p.championName, role: POS[p.teamPosition] || null })), enemies: info.participants.filter(p => p.teamId !== me.teamId).map(p => ({ champion: p.championName, role: POS[p.teamPosition] || null })) },
    duration: info.gameDuration, benchmark: bench ? { patch: benchmarks.patch, games: benchmarks.games, level: "Diamant et plus" } : null,
    note: "Faits tirés des données officielles de Riot. Les retours à la base sont déduits des achats (on n'achète qu'en base) ; un retour sans achat n'apparaît pas.",
  };
}

// Objets et rune clé du joueur, comparés à ce que jouent les Diamant+ sur le même champion (patch de référence)
async function buildVsDiamond(me, champstats, itemDb, fetchImpl) {
  const c = champstats?.champions?.[me.championId];
  if (!c || c.games < (champstats.minGames || 30)) return null;
  const nm = await ddNames(fetchImpl);
  const share = (list, id) => Math.round(((list.find(x => String(x.id) === String(id))?.games || 0) / c.games) * 100);
  const big = id => itemDb[id]?.gold >= 2000 && !itemDb[id]?.boots;
  const mine = [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5].map(String).filter(big);
  const ks = me.perks?.styles?.[0]?.selections?.[0]?.perk;
  const topKs = c.keystones[0];
  return {
    games: c.games, patch: champstats.patch, ddVersion: nm.v,
    items: mine.map(id => ({ id, name: itemDb[id].name, share: share(c.items, id) })),
    keystone: ks ? { name: nm.perk[ks]?.name || String(ks), icon: nm.perk[ks]?.icon, share: share(c.keystones, ks), top: topKs && String(topKs.id) !== String(ks) ? { name: nm.perk[topKs.id]?.name, icon: nm.perk[topKs.id]?.icon, share: Math.round((topKs.games / c.games) * 100) } : null } : null,
    // Objets les plus joués par les Diamant+ absents de l'inventaire final (seulement si la partie a duré assez pour finir 3 objets)
    missing: mine.length >= 2 ? c.items.filter(x => big(x.id)).slice(0, 3).filter(x => !mine.includes(String(x.id))).map(x => ({ id: x.id, name: itemDb[x.id].name, share: Math.round((x.games / c.games) * 100) })) : [],
  };
}

// ---------- Fiche champion Diamant+ : objets, runes, sorts réellement joués (échantillon coach/benchmarks.mjs)
let namesCache = null, namesFor = null;
export async function ddNames(fetchImpl = fetch) {
  if (namesCache && namesFor === fetchImpl) return namesCache;
  namesFor = fetchImpl;
  const [v] = await fetchImpl(`${DD}/api/versions.json`).then(r => r.json());
  const [runes, spells] = await Promise.all([`${DD}/cdn/${v}/data/fr_FR/runesReforged.json`, `${DD}/cdn/${v}/data/fr_FR/summoner.json`].map(u => fetchImpl(u).then(r => r.json())));
  const perk = {}, tree = {};
  for (const t of runes) { tree[t.id] = t.name; for (const s of t.slots) for (const r of s.runes) perk[r.id] = { name: r.name, icon: r.icon }; }
  namesCache = { v, perk, tree, spell: Object.fromEntries(Object.values(spells.data).map(s => [s.key, { name: s.name, id: s.id }])) };
  return namesCache;
}
const margin = (w, n) => Math.round(1.96 * Math.sqrt((w / n) * (1 - w / n) / n) * 1000) / 10;
export async function championCard(c, champstats, fetchImpl = fetch) {
  const base = { patch: champstats?.patch || null, level: "Diamant et plus", minGames: champstats?.minGames || 30 };
  if (!c || c.games < base.minGames) return { ...base, games: c?.games || 0, enough: false };
  const [it, nm] = await Promise.all([items(fetchImpl), ddNames(fetchImpl)]);
  const pct = x => ({ games: x.games, share: Math.round((x.games / c.games) * 100), winrate: Math.round((x.wins / x.games) * 1000) / 10 });
  return {
    ...base, enough: true, games: c.games, winrate: Math.round((c.wins / c.games) * 1000) / 10, margin: margin(c.wins, c.games),
    roles: Object.entries(c.roles).sort((a, b) => b[1] - a[1]).map(([r, n]) => ({ role: r, share: Math.round((n / c.games) * 100) })).filter(r => r.share >= 10),
    items: c.items.filter(x => it[x.id]?.gold >= 2000 && !it[x.id]?.boots).slice(0, 6).map(x => ({ id: x.id, name: it[x.id].name, ddVersion: nm.v, ...pct(x) })),
    boots: c.items.filter(x => it[x.id]?.boots && it[x.id]?.gold > 300).slice(0, 2).map(x => ({ id: x.id, name: it[x.id].name, ddVersion: nm.v, ...pct(x) })),
    keystones: c.keystones.map(x => ({ id: x.id, name: nm.perk[x.id]?.name || x.id, icon: nm.perk[x.id]?.icon, ...pct(x) })),
    trees: c.trees.map(x => { const [a, b] = x.id.split("-"); return { name: `${nm.tree[a] || a} + ${nm.tree[b] || b}`, ...pct(x) }; }),
    spells: c.spells.map(x => ({ names: x.id.split("-").map(k => nm.spell[k]?.name || k), ids: x.id.split("-").map(k => nm.spell[k]?.id), ddVersion: nm.v, ...pct(x) })),
  };
}

// ---------- Partie en cours (spectator-v5) : champions des deux équipes ; Riot ne donne pas les rôles, on les estime
let champsCache = null;
export async function ddChampions(fetchImpl = fetch) {
  if (champsCache) return champsCache;
  const [v] = await fetchImpl(`${DD}/api/versions.json`).then(r => r.json());
  const j = await fetchImpl(`${DD}/cdn/${v}/data/en_US/champion.json`).then(r => r.json());
  champsCache = Object.fromEntries(Object.values(j.data).map(c => [Number(c.key), { id: c.id, tags: c.tags }]));
  return champsCache;
}
const ROLES5 = ["top", "jungle", "mid", "bottom", "support"];
const TAG_PRIOR = { Marksman: { bottom: 3 }, Support: { support: 3 }, Mage: { mid: 2, support: 1 }, Assassin: { mid: 2, jungle: 1 }, Fighter: { top: 2, jungle: 1 }, Tank: { top: 2, support: 1, jungle: 1 } };
function permutations(a) { return a.length <= 1 ? [a] : a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p])); }
// Répartition la plus probable des 5 rôles dans une équipe : fréquences Diamant+ par champion, Châtiment = jungle
export function assignRoles(team, champstats, dd) {
  const score = team.map(p => {
    const seen = champstats?.champions?.[p.championId]?.rolesAll || {};
    const total = Object.values(seen).reduce((a, b) => a + b, 0);
    const prior = {};
    for (const t of dd[p.championId]?.tags || []) for (const [r, w] of Object.entries(TAG_PRIOR[t] || {})) prior[r] = (prior[r] || 0) + w;
    const smite = p.spells.includes(11);
    return Object.fromEntries(ROLES5.map(r => [r, Math.log(((seen[r] || 0) * 3 + (prior[r] || 0) + 0.5) / (total * 3 + 10)) + (smite ? (r === "jungle" ? 6 : -6) : r === "jungle" ? -2 : 0)]));
  });
  if (team.length !== 5) return team.map((p, i) => ({ role: ROLES5.reduce((b, r) => (score[i][r] > score[i][b] ? r : b), "top"), sure: false }));
  const perms = permutations(ROLES5).map(perm => ({ perm, s: perm.reduce((a, r, i) => a + score[i][r], 0) })).sort((a, b) => b.s - a.s);
  const best = perms[0];
  // Un rôle est « sûr » si toutes les répartitions presque aussi probables le donnent aussi
  const close = perms.filter(x => best.s - x.s < 1.5);
  return team.map((p, i) => ({ role: best.perm[i], sure: close.every(x => x.perm[i] === best.perm[i]) }));
}
export async function live(riot, { puuid, platform, champstats, fetchImpl = fetch, mainRole = null }) {
  let g;
  try { g = await riot(`https://${platform}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`, { ttl: 30e3 }); } catch (e) { if (e.status === 404) return { inGame: false }; throw e; }
  const dd = await ddChampions(fetchImpl);
  const parts = g.participants.map(p => ({ puuid: p.puuid, teamId: p.teamId, championId: p.championId, spells: [p.spell1Id, p.spell2Id] }));
  const me = parts.find(p => p.puuid === puuid);
  const out = [];
  for (const teamId of [100, 200]) {
    const team = parts.filter(p => p.teamId === teamId);
    const roles = assignRoles(team, champstats, dd);
    team.forEach((p, i) => out.push({ ...p, ...roles[i] }));
  }
  const view = p => ({ champion: dd[p.championId]?.id || String(p.championId), role: p.role, sure: p.sure, smite: p.spells.includes(11) });
  const mine = out.find(p => p.puuid === puuid);
  const opp = out.find(p => p.teamId !== me.teamId && p.role === mine.role);
  return {
    inGame: true, queue: QUEUES[g.gameQueueConfigId] || g.gameMode, queueId: g.gameQueueConfigId, startedAt: g.gameStartTime || null, length: g.gameLength,
    me: view(mine), opponent: opp ? view(opp) : null, mainRole,
    allies: out.filter(p => p.teamId === me.teamId).map(view), enemies: out.filter(p => p.teamId !== me.teamId).map(view),
    note: "Riot ne fournit pas les rôles pendant la partie : ils sont estimés d'après ce que jouent les joueurs Diamant+ et le Châtiment.",
  };
}

// Profil : compte, rang, dernières parties ; objectif de la semaine sur plusieurs parties (plus fiable qu'une seule)
export async function profile(riot, { gameName, tagLine, platform, benchmarks, count = 10 }) {
  const [region, label] = PLATFORMS[platform] || [];
  if (!region) throw Object.assign(new Error("Région inconnue"), { status: 400 });
  const acc = await riot(`https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`, { ttl: 3600e3 });
  const idsOf = type => riot(`https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${acc.puuid}/ids?type=${type}&count=${count}`, { ttl: 120e3 });
  const [entries, rankedIds] = await Promise.all([riot(`https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${acc.puuid}`, { ttl: 300e3 }), idsOf("ranked")]);
  // Sans partie classée récente : parties normales avec des rôles (l'ARAM n'en a pas et est écartée)
  const ranked = rankedIds.length > 0;
  const ids = ranked ? rankedIds : await idsOf("normal");
  const games = (await Promise.all(ids.map(id => riot(`https://${region}.api.riotgames.com/lol/match/v5/matches/${id}`).then(m => summarize(m, acc.puuid)).catch(() => null)))).filter(g => g && !g.remake && (ranked || g.role));
  const solo = entries.find(e => e.queueType === "RANKED_SOLO_5x5");
  const count1 = arr => Object.entries(arr.reduce((a, x) => (x ? ((a[x] = (a[x] || 0) + 1), a) : a), {})).sort((a, b) => b[1] - a[1]);
  const roles = count1(games.map(g => g.role));
  const mainRole = roles[0]?.[0] || null;
  // Objectif : l'indicateur le plus souvent sous le Diamant+ sur les parties du rôle principal
  const byRole = Object.fromEntries(roles.filter(([, n]) => n >= 3).map(([r]) => [r, goalFor(games, r, benchmarks)]));
  const main = byRole[mainRole] || goalFor(games, mainRole, benchmarks);
  return {
    riotId: `${acc.gameName}#${acc.tagLine}`, puuid: acc.puuid, platform, platformLabel: label, region,
    rank: solo ? { tier: solo.tier, division: solo.rank, lp: solo.leaguePoints, wins: solo.wins, losses: solo.losses } : null,
    games, ranked, roles, mainRole, champions: count1(games.map(g => g.champion)).slice(0, 5),
    goal: main.goal, tally: main.tally, byRole,
    benchmark: benchmarks?.roles?.[mainRole] ? { patch: benchmarks.patch, games: benchmarks.games, level: "Diamant et plus" } : null,
  };
}

// Objectif d'un rôle : l'indicateur le plus souvent sous la référence Diamant+ (au moins une partie sur deux)
export function goalFor(games, role, benchmarks) {
  const bench = benchmarks?.roles?.[role];
  const inRole = games.filter(g => g.role === role);
  const tally = Object.keys(METRICS).filter(k => METRICS[k].roles.includes(role)).map(k => {
    const cmp = inRole.map(g => compare(k, g.metrics[k], bench)).filter(Boolean);
    const sous = cmp.filter(c => c.level === "sous").length;
    const vals = cmp.map(c => c.value).sort((a, b) => a - b);
    return { metric: k, label: METRICS[k].label, unit: METRICS[k].unit, better: METRICS[k].better, sous, games: cmp.length, median: vals.length ? vals[Math.floor(vals.length / 2)] : null, target: bench?.[k] ? (METRICS[k].better === "high" ? bench[k].p25 : bench[k].p75) : null, p50: bench?.[k]?.p50 ?? null, n: bench?.[k]?.n ?? 0 };
  }).filter(t => t.games >= 3);
  const goal = tally.filter(t => t.sous / t.games >= 0.5).sort((a, b) => b.sous / b.games - a.sous / a.games)[0] || null;
  const ok = k => inRole.map(g => ({ id: g.id, ok: compare(k, g.metrics[k], bench)?.level !== "sous" }));
  return { role, games: inRole.length, goal: goal ? { ...goal, success: ok(goal.metric) } : null, tally: tally.map(t => ({ ...t, success: ok(t.metric) })) };
}

// ---------- Bilan général : relecture des dernières parties d'un rôle, tendances nettes seulement (au moins 3 parties concernées)
// Parties retenues : celles du rôle (et du champion) demandés, en remontant jusqu'à `scan` parties classées récentes.
// Plus de parties que le profil (10) quand le sujet l'exige : un champion peu joué, un rôle secondaire, des tendances plus sûres.
export async function selectGames(riot, { puuid, region, role = null, champion = null, scan = 40 }) {
  const ids = await riot(`https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?type=ranked&count=${Math.min(100, scan)}`, { ttl: 120e3 });
  const out = [];
  for (const id of ids) {
    const s = await riot(`https://${region}.api.riotgames.com/lol/match/v5/matches/${id}`).then(m => summarize(m, puuid)).catch(e => { if (e.status === 401 || e.status === 403) throw e; return null; });
    if (s && !s.remake && (!role || s.role === role) && (!champion || s.champion.toLowerCase() === champion.toLowerCase())) out.push(s);
  }
  return { scanned: ids.length, games: out };
}

export async function report(riot, { puuid, region, ids = null, role = null, champion = null, limit = 20, benchmarks, champstats = null }) {
  // Sans liste de parties : sélection par rôle ou champion, en remontant l'historique
  let scanned = null, pool = null;
  if (!ids?.length) {
    const sel = await selectGames(riot, { puuid, region, role, champion, scan: champion ? 60 : 40 });
    scanned = sel.scanned; pool = sel.games;
    ids = pool.map(g => g.id);
  }
  const reviews = [];
  for (const id of ids.slice(0, limit)) {
    try { reviews.push(await review(riot, { matchId: id, puuid, region, benchmarks, champstats })); } catch (e) { if (e.status === 401 || e.status === 403) throw e; }
  }
  const n = reviews.length;
  if (!n) return { games: 0, plus: [], minus: [], champions: [], matchups: [] };
  // Seuil d'une tendance : au moins 3 parties et au moins un quart des parties relues
  const need = Math.max(3, Math.ceil(n / 4));
  const minus = [], plus = [];
  // Morts avant un objectif adverse
  const objGames = reviews.filter(r => r.deaths.some(d => d.beforeObjective));
  const objDeaths = reviews.reduce((a, r) => a + r.deaths.filter(d => d.beforeObjective).length, 0);
  if (objGames.length >= need) minus.push({ kind: "mort-avant-objectif", metric: "deaths30", weight: 3 + objGames.length, title: `Morts juste avant un objectif adverse dans ${objGames.length} parties sur ${n}`, detail: `${objDeaths} morts au total suivies d'un dragon, d'un Héraut, de Larves ou d'un Baron adverse dans la minute.`, games: objGames.map(r => r.summary.id) });
  // Phase de ligne
  const lanes = reviews.filter(r => r.lane.at10);
  if (lanes.length >= 3) {
    const avg = Math.round(lanes.reduce((a, r) => a + r.lane.at10.gold, 0) / lanes.length);
    const behind = lanes.filter(r => r.lane.at10.gold <= -500), ahead = lanes.filter(r => r.lane.at10.gold >= 500);
    if (behind.length >= need && behind.length > ahead.length) minus.push({ kind: "retard-en-ligne", metric: "cs10", weight: 2 + behind.length, title: `En retard sur ton adversaire direct à 10 min dans ${behind.length} parties sur ${lanes.length}`, detail: `Écart moyen : ${avg > 0 ? "+" : ""}${fr(avg)} pièces d'or à 10 min.`, games: behind.map(r => r.summary.id) });
    if (ahead.length >= need && ahead.length > behind.length) plus.push({ kind: "avance-en-ligne", title: `En avance sur ton adversaire direct à 10 min dans ${ahead.length} parties sur ${lanes.length}`, detail: `Écart moyen : ${avg > 0 ? "+" : ""}${fr(avg)} pièces d'or à 10 min.` });
  }
  const early = reviews.filter(r => r.deaths.filter(d => d.t < 14 * 60000).length >= 2);
  if (early.length >= need) minus.push({ kind: "morts-phase-de-ligne", metric: "deaths30", weight: 1 + early.length, title: `Au moins 2 morts avant 14 min dans ${early.length} parties sur ${n}`, detail: "Chaque mort en phase de ligne coûte des sbires, de l'expérience et souvent des plaques.", games: early.map(r => r.summary.id) });
  const plates = reviews.filter(r => r.lane.platesLost >= 3);
  if (plates.length >= need) minus.push({ kind: "plaques-perdues", metric: "csMin", weight: 1 + plates.length, title: `3 plaques ou plus perdues avant 14 min dans ${plates.length} parties sur ${n}`, detail: "Une vague qui s'écrase sous ta tourelle pendant ton absence donne des plaques à l'adversaire.", games: plates.map(r => r.summary.id) });
  const bank = reviews.filter(r => r.bases.some(b => !b.afterDeath && b.goldBefore >= 2500));
  if (bank.length >= need) minus.push({ kind: "or-non-depense", metric: null, weight: 1 + bank.length / 2, title: `Retours tardifs avec plus de 2 500 pièces d'or dans ${bank.length} parties sur ${n}`, detail: "L'or non dépensé ne sert à rien en combat : rentrer plus tôt donne l'objet au bon moment.", games: bank.map(r => r.summary.id) });
  const dead = reviews.filter(r => r.summary.deadSeconds != null);
  if (dead.length >= 3) {
    const avg = dead.reduce((a, r) => a + r.summary.deadSeconds / r.duration, 0) / dead.length;
    if (avg >= 0.12) minus.push({ kind: "temps-mort", metric: "deaths30", weight: 1 + avg * 10, title: `${Math.round(avg * 100)} % de la partie passés mort en moyenne`, detail: "Sur une partie de 30 min, c'est environ " + Math.round(avg * 30) + " min sans pouvoir agir." });
    else if (avg <= 0.05) plus.push({ kind: "survie", title: `Très peu de temps passé mort : ${Math.round(avg * 100)} % de la partie en moyenne` });
  }
  // Indicateurs face au Diamant+ : sous ou au-dessus de la référence dans au moins la moitié des parties
  const byMetric = {};
  for (const r of reviews) for (const c of r.comparisons) (byMetric[c.metric] ||= []).push(c);
  for (const [k, list] of Object.entries(byMetric)) {
    if (list.length < 3) continue;
    const sous = list.filter(c => c.level === "sous").length, top = list.filter(c => c.level === "au-dessus").length;
    const vals = list.map(c => c.value).sort((a, b) => a - b), med = vals[Math.floor(vals.length / 2)];
    if (sous / list.length >= 0.5) minus.push({ kind: `ecart-${k}`, metric: k, weight: 1 + sous, title: `${METRICS[k].label} : moins bien que 75 % des Diamant+ dans ${sous} parties sur ${list.length}`, detail: `Ta valeur médiane : ${fr(med)}${METRICS[k].unit} ; médiane Diamant+ : ${fr(list[0].p50)}${METRICS[k].unit}.` });
    else if (top / list.length >= 0.5 && list[0].p50 > 0) plus.push({ kind: `fort-${k}`, title: `${METRICS[k].label} : mieux que 75 % des Diamant+ dans ${top} parties sur ${list.length}`, detail: `Ta valeur médiane : ${fr(med)}${METRICS[k].unit} ; médiane Diamant+ : ${fr(list[0].p50)}${METRICS[k].unit}.` });
  }
  // Habitudes tactiques sur l'ensemble des parties (relecture tactique de chaque partie)
  const T = reviews.map(r => r.tactics).filter(Boolean);
  const lessonGames = kind => reviews.filter(r => r.tactics?.lessons.some(l => l.kind === kind));
  const iso = lessonGames("mort-isolee"), ganks = lessonGames("gank-subi"), contested = lessonGames("objectif-inferiorite"), away = lessonGames("absent-objectif"), missed = lessonGames("combat-sans-toi");
  if (iso.length >= need) minus.push({ kind: "mort-isolee", metric: "deaths30", weight: 2 + iso.length, title: `Morts seul face à plusieurs adversaires après 14 min dans ${iso.length} parties sur ${n}`, detail: "Aucun allié à moins de 2 500 unités au moment de la mort : souvent en poussant seul une voie sans savoir où sont les adversaires.", games: iso.map(r => r.summary.id) });
  if (ganks.length >= need) minus.push({ kind: "gank-subi", metric: "deaths30", weight: 2 + ganks.length, title: `Morts sur un gank du jungler adverse avant 14 min dans ${ganks.length} parties sur ${n}`, detail: "Le jungler adverse participe à l'élimination pendant la phase de ligne.", games: ganks.map(r => r.summary.id) });
  if (away.length >= need) minus.push({ kind: "absent-objectif", metric: "kp", weight: 2 + away.length, title: `Loin de l'équipe sur un objectif perdu en infériorité dans ${away.length} parties sur ${n}`, detail: "L'adversaire a pris l'objectif en surnombre pendant que tu étais à l'autre bout de la carte.", games: away.map(r => r.summary.id) });
  if (contested.length >= need) minus.push({ kind: "objectif-inferiorite", metric: null, weight: 1.5 + contested.length, title: `Objectifs disputés en infériorité numérique dans ${contested.length} parties sur ${n}`, detail: "Combat perdu autour d'un objectif alors que l'équipe était moins nombreuse (souvent avec un allié mort).", games: contested.map(r => r.summary.id) });
  if (missed.length >= need) minus.push({ kind: "combat-sans-toi", metric: "kp", weight: 1 + missed.length, title: `Combats perdus près de toi, sans toi, dans ${missed.length} parties sur ${n}`, detail: "Ton équipe s'est battue en infériorité à moins de 6 000 unités de toi.", games: missed.map(r => r.summary.id) });
  // Participation aux combats et aux objectifs
  const near = T.flatMap(t => t.fights.filter(f => f.myDist < 6000 || f.me)), joined = near.filter(f => f.me);
  const objs = T.flatMap(t => t.objectives), present = objs.filter(o => o.myDist < 4500);
  if (near.length >= 10 && joined.length / near.length >= 0.7) plus.push({ kind: "presence-combats", title: `Présent dans ${Math.round((joined.length / near.length) * 100)} % des combats qui ont lieu près de toi`, detail: `${joined.length} combats sur ${near.length}, sur ${n} parties.` });
  if (iso.length === 0 && T.length >= need && T.reduce((a, t) => a + t.summary.deaths, 0) > 0) plus.push({ kind: "pas-isole", title: "Jamais mort seul face à plusieurs adversaires après 14 min", detail: `Sur ${n} parties.` });
  // Adversaires qui t'éliminent le plus (toutes parties)
  const foes = {};
  for (const t of T) for (const k of t.interactions.killedBy) foes[k.champion] = (foes[k.champion] || 0) + k.n;
  const tactical = {
    games: T.length,
    fights: { near: near.length, joined: joined.length },
    objectives: { total: objs.length, present: present.length, lostOutnumbered: objs.filter(o => !o.ours && o.allies < o.enemies).length },
    deaths: { total: T.reduce((a, t) => a + t.summary.deaths, 0), isolated: T.reduce((a, t) => a + t.summary.deathsIsolated, 0), ganks: T.reduce((a, t) => a + t.summary.deathsGank, 0) },
    nemesis: Object.entries(foes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([champion, n]) => ({ champion, n })),
    wardsPerGame: T.length ? Math.round((T.reduce((a, t) => a + t.summary.wards, 0) / T.length) * 10) / 10 : null,
  };
  minus.sort((a, b) => b.weight - a.weight);
  // Champions et vis-à-vis : sur toutes les parties retenues (résumés), au-delà de celles relues en détail
  const all = pool || reviews.map(r => r.summary);
  const champs = {};
  for (const g of all) { const c = (champs[g.champion] ||= { champion: g.champion, games: 0, wins: 0, k: 0, d: 0, a: 0 }); c.games++; c.wins += g.win ? 1 : 0; c.k += g.k; c.d += g.d; c.a += g.a; }
  const champions = Object.values(champs).sort((a, b) => b.games - a.games).map(c => ({ ...c, kda: Math.round(((c.k + c.a) / Math.max(1, c.d)) * 10) / 10 }));
  const gold = Object.fromEntries(reviews.map(r => [r.summary.id, r.lane.at10?.gold ?? null]));
  const matchups = all.filter(g => g.opponent).map(g => ({ id: g.id, champion: g.champion, opponent: g.opponent, win: g.win, gold10: gold[g.id] ?? null }));
  // Adversaires rencontrés plusieurs fois : bilan du joueur contre eux
  const opp = {};
  for (const m of matchups) { const o = (opp[m.opponent] ||= { opponent: m.opponent, games: 0, wins: 0 }); o.games++; o.wins += m.win ? 1 : 0; }
  const rivals = Object.values(opp).filter(o => o.games >= 2).sort((a, b) => b.games - a.games);
  return { games: n, found: all.length, scanned, role: role || reviews[0].summary.role, champion, plus, minus: minus.slice(0, 5), champions, matchups, rivals, tactical, wins: all.filter(g => g.win).length,
    note: `Tendances calculées sur les données officielles de Riot : ${n} parties relues en détail${scanned ? ` (sélectionnées parmi tes ${scanned} dernières parties classées)` : ""} ; un point n'apparaît que s'il revient dans au moins ${need} parties.` };
}
