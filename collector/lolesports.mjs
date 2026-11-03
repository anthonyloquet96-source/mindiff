// LoL Esports (API officielle) : tournois, phases, matchs, classements,
// et champions joués par les pros dans chaque partie (flux livestats officiel).

import { fetchJson } from "./lib.mjs";
import { fetchStory } from "../story.mjs";
import { LOL_LEAGUES } from "./sources.mjs";

const KEY = { "x-api-key": "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z" }; // clé publique du site lolesports.com
const API = "https://esports-api.lolesports.com/persisted/gw";
const FEED = "https://feed.lolesports.com/livestats/v1";
const api = path => fetchJson(`${API}/${path}&hl=fr-FR`, KEY);
const https = u => u?.replace(/^http:/, "https:");
const daysAgo = d => (Date.now() - new Date(d)) / 864e5;
const today = () => new Date().toISOString().slice(0, 10);

const ACRONYMS = /^(lec|lck|lpl|lcs|lcp|lfl|msi|emea|cblol|lta|na|eu)$/i;
function prettify(slug, leagueSlug) {
  const year = slug.match(/20\d\d/)?.[0] || "";
  if (leagueSlug === "worlds") return `Worlds ${year}`.trim();
  return slug.split(/[_-]/).map(w => (ACRONYMS.test(w) ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))).join(" ");
}

const team = t => ({
  id: t.id, name: t.name, code: t.code, image: https(t.image),
  score: t.result?.gameWins ?? null, outcome: t.result?.outcome ?? null,
});
const isTbd = t => !t || t.code === "TBD" || t.id === "0";

// ---------- Détail d'un match : picks + vainqueur de chaque partie ----------

async function windowAt(gameId, iso) {
  const url = iso ? `${FEED}/window/${gameId}?startingTime=${iso}` : `${FEED}/window/${gameId}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (res.status !== 200) return null;
  return res.json();
}
const roundTo10s = ms => new Date(Math.floor(ms / 10000) * 10000).toISOString();
const pickFinal = x => ({ totalKills: x.totalKills, totalGold: x.totalGold, towers: x.towers, inhibitors: x.inhibitors, barons: x.barons, dragons: x.dragons || [] });

async function gameDetail(game) {
  const first = await windowAt(game.id);
  if (!first?.gameMetadata) return null;
  const meta = first.gameMetadata;
  const side = m => ({
    teamId: m.esportsTeamId,
    picks: m.participantMetadata.map(p => ({ champ: p.championId, role: p.role, player: p.summonerName })),
  });
  // Dernière image de la partie : on avance jusqu'à trouver l'état "finished"
  let last = null;
  const t0 = new Date(first.frames?.[0]?.rfc460Timestamp || 0).getTime();
  for (const mins of [70, 100, 140]) {
    const w = t0 ? await windowAt(game.id, roundTo10s(t0 + mins * 60000)) : null;
    const f = w?.frames?.at(-1);
    if (f) last = f;
    if (f?.gameState === "finished") break;
  }
  // Vainqueur déduit de l'image finale par guessSide (voir plus bas), puis confronté au score officiel dans assignWinners
  const vod = (game.vods || []).find(v => v.locale === "fr-FR") || (game.vods || []).find(v => v.locale === "en-US") || game.vods?.[0];
  return {
    n: game.number, id: game.id, patch: meta.patchVersion?.split(".").slice(0, 2).join("."),
    blue: side(meta.blueTeamMetadata), red: side(meta.redTeamMetadata),
    kills: last ? { blue: last.blueTeam.totalKills, red: last.redTeam.totalKills } : null,
    // Bandeau récapitulatif de fin de partie (comme celui de la diffusion)
    final: last?.gameState === "finished" ? {
      duration: Math.max(0, Math.round((new Date(last.rfc460Timestamp).getTime() - t0) / 1000)),
      blue: pickFinal(last.blueTeam), red: pickFinal(last.redTeam),
    } : null,
    // Relevé minute par minute pour le résumé de la partie (story.mjs)
    story: await fetchStory(game.id).catch(() => null),
    vod: vod?.provider === "youtube" ? `https://www.youtube.com/watch?v=${vod.parameter}&t=${Math.round((vod.startMillis || 0) / 1000)}` : null,
  };
}

// Vainqueur d'une partie d'après son bandeau final : inhibiteurs détruits, puis ÉCART D'OR (le flux s'arrête souvent avant que
// les dernières tours du nexus soient comptées : à BLG–HLE, Worlds 2026, le perdant avait 8 tours contre 7 et l'ancienne formule
// « tours avant or » se trompait de vainqueur), puis tours, puis kills. marge : confiance de la déduction (or, en milliers).
export function guessSide(final) {
  if (!final?.blue || !final?.red) return { side: null, margin: 0 };
  const b = final.blue, r = final.red;
  const pick = d => (d > 0 ? "blue" : d < 0 ? "red" : null);
  const inh = pick(b.inhibitors - r.inhibitors);
  const gold = (b.totalGold ?? 0) - (r.totalGold ?? 0), g = pick(gold);
  // Inhibiteur et or d'accord : déduction sûre ; en désaccord (le flux s'est arrêté avant les derniers coups) : fragile
  if (inh) return { side: inh, margin: g && g !== inh ? Math.abs(gold) / 1000 : 100 + Math.abs(gold) / 1000 };
  if (g) return { side: g, margin: Math.abs(gold) / 1000 };
  const t = pick(b.towers - r.towers); if (t) return { side: t, margin: 0.5 };
  return { side: pick(b.totalKills - r.totalKills), margin: 0.1 };
}

// Vainqueurs d'une série : déduction par partie, puis confrontation au score officiel. Si le décompte ne colle pas, on retourne
// d'abord les parties déduites avec la plus faible marge (moins de 3 000 or, sans inhibiteur décisif) jusqu'à retrouver le score officiel.
// Sans partie exploitable ou si aucune correction ne redonne le score, verified = false et aucun vainqueur affiché.
export function assignWinners(games, officialTeams) {
  const rows = games.map(g => ({ g, ...guessSide(g.final) }));
  const target = Object.fromEntries((officialTeams || []).map(t => [t.id, t.score ?? null]));
  const ids = Object.keys(target);
  const count = () => { const w = {}; for (const r of rows) if (r.side) { const id = r.g[r.side].teamId; w[id] = (w[id] || 0) + 1; } return w; };
  const ok = () => { const w = count(); return ids.length > 0 && ids.every(id => target[id] != null && (w[id] || 0) === target[id]); };
  let corrected = 0;
  // Score officiel sans appel (2-0, 3-0) : toutes les parties vont au vainqueur de la série, quoi qu'en dise le flux
  // (même si une partie manque encore au relevé : celles qu'on a sont forcément à lui)
  const sweep = ids.length === 2 && ids.find(id => target[id] > 0 && ids.every(o => o === id || target[o] === 0));
  if (sweep && rows.length && rows.length <= target[sweep]) {
    for (const r of rows) { const side = r.g.blue.teamId === sweep ? "blue" : r.g.red.teamId === sweep ? "red" : null; if (side && r.side !== side) corrected++; if (side) r.side = side; }
    const verified = rows.every(r => r.side && r.g[r.side].teamId === sweep);
    for (const r of rows) { r.g.winnerTeamId = verified ? sweep : null; delete r.g.winnerSide; }
    return { verified, corrected };
  }
  if (rows.length && !ok()) {
    // Seules les déductions fragiles sont retournées : pas d'inhibiteur décisif et moins de 3 000 or d'écart
    for (const r of rows.filter(r => r.side && r.margin <= 3).sort((a, b) => a.margin - b.margin)) {
      const w = count(), from = r.g[r.side].teamId, to = r.g[r.side === "blue" ? "red" : "blue"].teamId;
      if ((w[from] || 0) > (target[from] ?? 0) && (w[to] || 0) < (target[to] ?? 0)) { r.side = r.side === "blue" ? "red" : "blue"; corrected++; }
      if (ok()) break;
    }
  }
  const verified = ok();
  for (const r of rows) { r.g.winnerTeamId = verified && r.side ? r.g[r.side].teamId : null; delete r.g.winnerSide; }
  return { verified, corrected };
}

async function matchDetail(matchId, officialTeams) {
  const ev = (await api(`getEventDetails?id=${matchId}`)).data.event;
  const games = [];
  for (const g of ev.match.games.filter(g => g.state === "completed")) {
    const d = await gameDetail(g).catch(() => null);
    if (d) games.push(d);
  }
  const { verified } = assignWinners(games, officialTeams);
  return { games, verified };
}

// ---------- Statistiques d'un tournoi ----------

function tournamentStats(matches) {
  const champs = new Map();
  const players = new Map();
  let totalGames = 0;
  for (const m of matches) {
    for (const g of m.games || []) {
      totalGames++;
      for (const sideKey of ["blue", "red"]) {
        const s = g[sideKey];
        const won = g.winnerTeamId ? g.winnerTeamId === s.teamId : null;
        const teamName = m.teams.find(t => t.id === s.teamId)?.name;
        for (const p of s.picks) {
          const c = champs.get(p.champ) || { champ: p.champ, picks: 0, wins: 0, known: 0, roles: {}, blue: 0, red: 0 };
          c.picks++;
          c[sideKey]++;
          c.roles[p.role] = (c.roles[p.role] || 0) + 1;
          if (won !== null) { c.known++; if (won) c.wins++; }
          champs.set(p.champ, c);
          const pl = players.get(p.player) || { player: p.player, team: teamName, role: p.role, games: 0, champs: {} };
          pl.games++;
          pl.champs[p.champ] = (pl.champs[p.champ] || 0) + 1;
          players.set(p.player, pl);
        }
      }
    }
  }
  const list = [...champs.values()].map(c => ({
    ...c,
    role: Object.entries(c.roles).sort((a, b) => b[1] - a[1])[0][0],
    presence: totalGames ? c.picks / totalGames : 0,
    winrate: c.known ? c.wins / c.known : null,
  })).sort((a, b) => b.picks - a.picks);
  return { totalGames, champions: list, players: [...players.values()].sort((a, b) => b.games - a.games) };
}

function standingsFromMatches(matches) {
  const tally = new Map();
  for (const m of matches) {
    for (const t of m.teams) {
      if (isTbd(t)) continue;
      const r = tally.get(t.name) || { team: t.name, code: t.code, image: t.image, w: 0, l: 0, gw: 0, gl: 0 };
      if (m.state === "completed") {
        const opp = m.teams.find(x => x !== t);
        if (t.outcome === "win") r.w++;
        if (t.outcome === "loss") r.l++;
        r.gw += t.score || 0;
        r.gl += opp?.score || 0;
      }
      tally.set(t.name, r);
    }
  }
  return [...tally.values()].sort((a, b) => b.w - a.w || a.l - b.l || (b.gw - b.gl) - (a.gw - a.gl));
}

// ---------- Collecte principale ----------

export async function collectLolEsports(state) {
  // Matchs déjà en cache relus pour compléter leur relevé : 6 min au plus par collecte, tous tournois confondus (limite de 25 min du workflow)
  const refreshUntil = Date.now() + 6 * 60000;
  state.lolMatches ||= {};
  const ids = Object.values(LOL_LEAGUES).join(",");
  const first = (await api(`getSchedule?leagueId=${ids}`)).data.schedule;
  let events = first.events;
  if (first.pages?.older) events = (await api(`getSchedule?leagueId=${ids}&pageToken=${first.pages.older}`)).data.schedule.events.concat(events);
  const sched = new Map(events.filter(e => e.type === "match").map(e => [e.match.id, e]));

  const recent = [...sched.values()].filter(e => Math.abs(daysAgo(e.startTime)) <= 14);
  const activeLeagues = [...new Set(recent.map(e => e.league.slug))].filter(s => LOL_LEAGUES[s]);

  const tournaments = [];
  for (const slug of activeLeagues) {
    const league = (await api(`getTournamentsForLeague?leagueId=${LOL_LEAGUES[slug]}`)).data.leagues[0];
    const t = (league?.tournaments || []).find(t => t.startDate <= today() && today() <= t.endDate)
      || (league?.tournaments || []).filter(t => t.startDate <= today()).sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
    if (!t) continue;
    const st = (await api(`getStandings?tournamentId=${t.id}`)).data.standings[0];
    const leagueName = recent.find(e => e.league.slug === slug)?.league.name || slug;

    const allMatches = [];
    const stages = (st?.stages || []).map(stage => ({
      name: stage.name,
      sections: (stage.sections || []).map(sec => {
        const matches = (sec.matches || []).map(m => {
          const s = sched.get(m.id);
          const mm = {
            id: m.id, state: m.state, start: s?.startTime || null, block: s?.blockName || stage.name,
            bo: s?.match.strategy?.count || null, teams: m.teams.map(team),
            previous: m.previousMatchIds || [],
          };
          allMatches.push(mm);
          return mm;
        });
        const rankings = sec.rankings?.length
          ? sec.rankings.flatMap(r => r.teams.map(x => ({ team: x.name, code: x.code, image: https(x.image), w: x.record?.wins ?? 0, l: x.record?.losses ?? 0, rank: r.ordinal })))
          : standingsFromMatches(matches);
        return { name: sec.name, matches, standings: rankings };
      }),
    }));

    // Picks des pros : chaque match terminé n'est analysé qu'une fois (mis en cache)
    for (const m of allMatches.filter(m => m.state === "completed" && (!m.start || daysAgo(m.start) <= 45))) {
      // Relu s'il manque le score final ou le relevé détaillé des parties, tant que le budget de temps le permet
      const stale = Date.now() < refreshUntil && state.lolMatches[m.id]?.games?.some(g => g.final === undefined || g.story === undefined || (g.story && g.story.v < 2));
      if (!state.lolMatches[m.id] || stale) {
        try { state.lolMatches[m.id] = await matchDetail(m.id, m.teams); } catch { /* réessayé à la prochaine collecte */ }
      }
      Object.assign(m, state.lolMatches[m.id] || {});
      // Matchs déjà en cache : vainqueurs re-déduits avec la règle courante et le score officiel (aucune requête)
      if (m.games?.length && m.teams) m.verified = assignWinners(m.games, m.teams).verified;
    }

    const starts = allMatches.map(m => m.start).filter(Boolean).sort();
    const done = allMatches.filter(m => m.state === "completed").length;
    const status = t.startDate > today() ? "upcoming" : (done === allMatches.length && allMatches.length) || t.endDate < today() ? "finished" : "live";
    tournaments.push({
      id: `lol-${t.slug}`, game: "lol", auto: true, name: prettify(t.slug, slug), league: leagueName, leagueSlug: slug,
      startDate: t.startDate, endDate: t.endDate, status, firstMatch: starts[0] || null, lastMatch: starts.at(-1) || null,
      progress: { done, total: allMatches.length },
      stages,
      teams: standingsFromMatches(allMatches),
      stats: tournamentStats(allMatches),
      sources: [{ name: "LoL Esports (officiel)", url: `https://lolesports.com/fr-FR/leagues/${slug}`, kind: "officiel" }],
    });
  }

  // Ne garde en cache que les matchs encore utiles
  for (const id of Object.keys(state.lolMatches)) if (!sched.has(id) && !tournaments.some(t => t.stages.some(s => s.sections.some(x => x.matches.some(m => m.id === id))))) delete state.lolMatches[id];

  const upcoming = recent
    .filter(e => e.state !== "completed" && daysAgo(e.startTime) <= 0 && e.match.teams.every(t => !isTbd(t)))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 12)
    .map(e => ({ date: e.startTime.slice(0, 10), time: e.startTime, game: "lol", auto: true, label: `${e.match.teams[0].name} vs ${e.match.teams[1].name} — ${e.league.name}, ${e.blockName}` }));

  const officialMatches = recent.filter(e => e.state === "completed").map(e => ({ teams: e.match.teams.map(team) }));
  return { tournaments, upcoming, officialMatches };
}

// ---------- Actus de résultats : une actu par série terminée, écrite uniquement à partir des données officielles ----------
// (aucun texte inventé : vainqueur, score, phase, et le détail des parties seulement si les vainqueurs sont vérifiés)
const fmtMin = s => `${Math.round(s / 60)} min`;
export function resultNews(tournaments, days = 7) {
  const out = [];
  for (const t of tournaments) {
    for (const st of t.stages || []) for (const sec of st.sections || []) for (const m of sec.matches || []) {
      if (m.state !== "completed" || !m.start || daysAgo(m.start) > days || daysAgo(m.start) < 0) continue;
      const win = m.teams.find(x => x.outcome === "win"), loss = m.teams.find(x => x.outcome === "loss");
      if (!win || !loss || isTbd(win) || isTbd(loss) || win.score == null || loss.score == null) continue;
      const code = id => m.teams.find(x => x.id === id)?.code || "?";
      const games = m.verified ? (m.games || []).filter(g => g.winnerTeamId).sort((a, b) => a.n - b.n) : [];
      const detail = games.map(g => `partie ${g.n} pour ${code(g.winnerTeamId)}${g.final?.duration ? ` (${fmtMin(g.final.duration)})` : ""}`).join(", ");
      out.push({
        url: `https://lolesports.com/fr-FR/vod/${m.id}`,
        title: `${win.name} bat ${loss.name} ${win.score}–${loss.score}`,
        summary: `${t.name} · ${m.block || st.name}${m.bo ? ` · BO${m.bo}` : ""}. Résultat officiel LoL Esports${detail ? ` : ${detail}` : ""}.`,
        date: m.start, image: null, type: "esport", game: "lol", lang: "fr",
      });
    }
  }
  return out;
}
