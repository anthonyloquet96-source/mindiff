// Bilan de parties à partir des données officielles de Riot (match-v5 et sa chronologie) : faits exacts, sans IA.
// Module sans dépendance (fetch uniquement) : utilisé par le serveur local et par le service en ligne (Cloudflare Worker).
// Comparaisons : uniquement au niveau Diamant et plus, par rôle (coach/cache/benchmarks.json, construit par coach/benchmarks.mjs).

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
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetchImpl(url, { headers: { "X-Riot-Token": key } });
      if (r.ok) { const data = await r.json(); cache.set(url, { data, until: ttl ? Date.now() + ttl : 0 }); if (cache.size > 500) cache.delete(cache.keys().next().value); return data; }
      if (r.status === 429) { await new Promise(res => setTimeout(res, Math.min(10, Number(r.headers.get("retry-after")) || 2) * 1000)); continue; }
      throw Object.assign(new Error(r.status === 404 ? "introuvable" : r.status === 401 || r.status === 403 ? "clé Riot refusée ou expirée" : `API Riot : HTTP ${r.status}`), { status: r.status });
    }
    throw Object.assign(new Error("API Riot saturée, réessayez dans une minute"), { status: 429 });
  };
}

let itemsCache = null;
async function items(fetchImpl = fetch) {
  if (itemsCache) return itemsCache;
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
export async function review(riot, { matchId, puuid, region, benchmarks, fetchImpl = fetch }) {
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

  // Constats : écarts nets avec le Diamant+ du même rôle, triés par importance
  const bench = benchmarks?.roles?.[s.role];
  const comparisons = Object.keys(METRICS).filter(k => METRICS[k].roles.includes(s.role)).map(k => compare(k, s.metrics[k], bench)).filter(Boolean);
  const findings = [];
  const lateObj = deaths.filter(d => d.beforeObjective);
  if (lateObj.length) findings.push({ kind: "mort-avant-objectif", weight: 3 + lateObj.length, title: `${lateObj.length} mort${lateObj.length > 1 ? "s" : ""} juste avant un objectif adverse`, facts: lateObj.map(d => `${d.at} : tué par ${d.killer}, puis ${d.beforeObjective}`), metric: "deaths30" });
  const earlyDeaths = deaths.filter(d => d.t < 14 * 60000);
  if (earlyDeaths.length >= 2) findings.push({ kind: "morts-phase-de-ligne", weight: 1 + earlyDeaths.length, title: `${earlyDeaths.length} morts avant 14 min`, facts: earlyDeaths.map(d => `${d.at} : tué par ${d.killer}${d.helpers ? ` (+${d.helpers} aide${d.helpers > 1 ? "s" : ""})` : ""}${d.enemyHalf ? ", dans la moitié adverse" : ""}`), metric: "deaths30" });
  for (const c of comparisons.filter(c => c.level === "sous")) findings.push({ kind: `ecart-${c.metric}`, weight: 1 + c.gap, title: `${c.label} : ${fr(c.value)}${METRICS[c.metric].unit}, moins bien que 75 % des joueurs Diamant+ ${s.role === "bottom" ? "ADC" : s.role}`, facts: [`Diamant+ du même rôle : médiane ${fr(c.p50)}${METRICS[c.metric].unit} (la moitié des joueurs entre ${fr(c.p25)} et ${fr(c.p75)}), ${c.n} joueurs.`], metric: c.metric });
  const bigBank = bases.filter(b => !b.afterDeath && b.goldBefore >= 2500);
  if (bigBank.length) findings.push({ kind: "or-non-depense", weight: 1.5, title: `Retour${bigBank.length > 1 ? "s" : ""} tardif${bigBank.length > 1 ? "s" : ""} avec beaucoup d'or`, facts: bigBank.map(b => `Vers ${b.at} : environ ${b.goldBefore} pièces d'or en poche à la minute précédente.`), metric: null });
  findings.sort((a, b) => b.weight - a.weight);
  const strengths = comparisons.filter(c => c.level === "au-dessus" && c.p50 > 0).map(c => `${c.label} : ${fr(c.value)}${METRICS[c.metric].unit} (médiane Diamant+ ${fr(c.p50)})`);

  return {
    summary: s, lane, deaths, bases, objectives, comparisons, findings: findings.slice(0, 3), strengths,
    duration: info.gameDuration, benchmark: bench ? { patch: benchmarks.patch, games: benchmarks.games, level: "Diamant et plus" } : null,
    note: "Faits tirés des données officielles de Riot. Les retours à la base sont déduits des achats (on n'achète qu'en base) ; un retour sans achat n'apparaît pas.",
  };
}

// Profil : compte, rang, dernières parties ; objectif de la semaine sur plusieurs parties (plus fiable qu'une seule)
export async function profile(riot, { gameName, tagLine, platform, benchmarks, count = 10 }) {
  const [region, label] = PLATFORMS[platform] || [];
  if (!region) throw Object.assign(new Error("Région inconnue"), { status: 400 });
  const acc = await riot(`https://${region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`, { ttl: 3600e3 });
  const [entries, ids] = await Promise.all([
    riot(`https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${acc.puuid}`, { ttl: 300e3 }),
    riot(`https://${region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${acc.puuid}/ids?type=ranked&count=${count}`, { ttl: 120e3 }),
  ]);
  const games = (await Promise.all(ids.map(id => riot(`https://${region}.api.riotgames.com/lol/match/v5/matches/${id}`).then(m => summarize(m, acc.puuid)).catch(() => null)))).filter(g => g && !g.remake);
  const solo = entries.find(e => e.queueType === "RANKED_SOLO_5x5");
  const count1 = arr => Object.entries(arr.reduce((a, x) => (x ? ((a[x] = (a[x] || 0) + 1), a) : a), {})).sort((a, b) => b[1] - a[1]);
  const roles = count1(games.map(g => g.role));
  const mainRole = roles[0]?.[0] || null;
  // Objectif : l'indicateur le plus souvent sous le Diamant+ sur les parties du rôle principal
  const bench = benchmarks?.roles?.[mainRole];
  const inRole = games.filter(g => g.role === mainRole);
  const tally = Object.keys(METRICS).filter(k => METRICS[k].roles.includes(mainRole)).map(k => {
    const cmp = inRole.map(g => compare(k, g.metrics[k], bench)).filter(Boolean);
    const sous = cmp.filter(c => c.level === "sous").length;
    const vals = cmp.map(c => c.value).sort((a, b) => a - b);
    return { metric: k, label: METRICS[k].label, unit: METRICS[k].unit, better: METRICS[k].better, sous, games: cmp.length, median: vals.length ? vals[Math.floor(vals.length / 2)] : null, target: bench?.[k] ? (METRICS[k].better === "high" ? bench[k].p25 : bench[k].p75) : null, p50: bench?.[k]?.p50 ?? null, n: bench?.[k]?.n ?? 0 };
  }).filter(t => t.games >= 3);
  const goal = tally.filter(t => t.sous / t.games >= 0.5).sort((a, b) => b.sous / b.games - a.sous / a.games)[0] || null;
  return {
    riotId: `${acc.gameName}#${acc.tagLine}`, puuid: acc.puuid, platform, platformLabel: label, region,
    rank: solo ? { tier: solo.tier, division: solo.rank, lp: solo.leaguePoints, wins: solo.wins, losses: solo.losses } : null,
    games, roles, mainRole, champions: count1(games.map(g => g.champion)).slice(0, 5),
    goal: goal ? { ...goal, success: inRole.map(g => ({ id: g.id, ok: compare(goal.metric, g.metrics[goal.metric], bench)?.level !== "sous" })) } : null,
    tally, benchmark: bench ? { patch: benchmarks.patch, games: benchmarks.games, level: "Diamant et plus" } : null,
  };
}
