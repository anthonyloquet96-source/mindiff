// Fiches équipes des tournois suivis :
//   - API officielle LoL Esports : nom complet, ligue d'origine, effectif ;
//   - Liquipedia (licence CC BY-SA, source citée) : seed (page du tournoi international), pays, date de création, palmarès.
// Liquipedia limite son API : 1 requête toutes les 2 s, et 1 « parse » (page rendue) toutes les 30 s.
// Chaque fiche est gardée 7 jours ; au plus PER_RUN pages d'équipe sont lues par collecte, le reste à la suivante.

import { fetchJson } from "./lib.mjs";

const LQ = "https://liquipedia.net/leagueoflegends";
const UA = { "User-Agent": "MINDIFF/1.0 (https://anthonyloquet96-source.github.io/mindiff/)", "Accept-Encoding": "gzip" };
const KEY = { "x-api-key": "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z" }; // clé publique du site lolesports.com
const TTL_DAYS = 7, PER_RUN = Number(process.env.TEAMINFO_PER_RUN || 4);
const wait = ms => new Promise(r => setTimeout(r, ms));
const daysAgo = d => (Date.now() - new Date(d)) / 864e5;
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\b(esports?|gaming|team|club)\b/g, "").replace(/[^a-z0-9]/g, "");
const decode = s => String(s).replace(/&#160;|&nbsp;/g, " ").replace(/&#58;/g, ":").replace(/&#95;/g, "_").replace(/&amp;/g, "&").replace(/&#39;|&#039;/g, "'").replace(/&quot;/g, '"');
const text = h => decode(String(h).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

let lastLq = 0;
async function lq(params, parse = false) {
  const gap = (parse ? 31000 : 2100) - (Date.now() - lastLq);
  if (gap > 0) await wait(gap);
  lastLq = Date.now();
  return fetchJson(`${LQ}/api.php?format=json&${params}`, UA);
}

// Page Liquipedia d'un tournoi international : équipes et place qualificative (seed)
const LQ_EVENT = { worlds: "World_Championship", msi: "Mid-Season_Invitational", first_stand: "First_Stand" };
async function eventSeeds(t) {
  const base = LQ_EVENT[t.leagueSlug], year = t.name.match(/20\d\d/)?.[0];
  if (!base || !year) return null;
  const page = `${base}/${year}`;
  const j = await lq(`action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(page)}`);
  const wt = Object.values(j.query.pages)[0]?.revisions?.[0]?.slots?.main?.["*"];
  if (!wt) return null;
  const out = [];
  for (const block of wt.split("{{Opponent|").slice(1)) {
    const name = block.match(/^([^\n|}]+)/)?.[1].trim();
    const q = block.match(/qualification=\{\{Qualification\|([^}]*)\}\}/)?.[1];
    if (!name || !q) continue;
    const f = Object.fromEntries(q.split("|").map(x => x.split("=")).filter(x => x.length === 2));
    const captain = block.match(/\{\{Person\|([^|}]+)\|[^}]*role=[^|}]*captain/)?.[1] || null;
    out.push({ name, page: f.page || null, placement: Number(f.placement) || null, captain });
  }
  return { page, url: `${LQ}/${page}`, teams: out };
}
// « LCK/2026 », placement 1 → seed lisible
function seedLabel(q) {
  if (!q?.page) return null;
  const [league, ...rest] = q.page.split("/");
  const year = rest[0];
  if (/Mid-Season Invitational/.test(league)) return q.placement === 1 ? `Championne du MSI ${year}` : `MSI ${year}`;
  if (/First Stand/.test(league)) return q.placement === 1 ? `Championne du First Stand ${year}` : `First Stand ${year}`;
  const via = rest.slice(1).join(" ").replace("Championship Points", "points de championnat").replace("Regional Finals", "finale régionale").replace(/^Split (\d)$/, "split $1").replace(/^Summer$/, "été");
  return `Seed n°${q.placement} de la ${league}${via ? ` (${via})` : ""}`;
}

// Page d'équipe rendue : pays, création, gains, palmarès (onglet « Achievements » : podiums des tournois S et A)
async function teamPage(title) {
  const j = await lq(`action=parse&prop=text&redirects=1&page=${encodeURIComponent(title)}`, true);
  const h = j.parse?.text?.["*"];
  if (!h) return null;
  const cell = label => { const i = h.indexOf(`infobox-description">${label}:</div>`); return i < 0 ? null : h.slice(i, i + 1500).match(/<\/div><div>([\s\S]*?)<\/div><\/div>/)?.[1] || null; };
  const loc = cell("Location");
  const flag = loc?.match(/\/([A-Za-z]{2})_hd\.png/)?.[1];
  const created = text(cell("Created") || "").match(/\d{4}(-\d{2}-\d{2})?/)?.[0] || null;
  const winnings = Number(text(cell("Approx. Total Winnings") || "").replace(/[^\d]/g, "")) || null;
  const a = h.indexOf("<span>Achievements</span>");
  const tab = a < 0 ? "" : h.slice(a, h.indexOf('data-count="2"', a) > 0 ? h.indexOf('data-count="2"', a) : a + 60000);
  const results = [];
  for (const row of tab.split('table2&#95;&#95;row--body').slice(1)) {
    const tds = row.split("<td").slice(1).map(x => "<td" + x);
    const date = text(tds[0] || "").match(/\d{4}-\d{2}-\d{2}/)?.[0];
    const place = Number(row.match(/placement-(\d+)/)?.[1]) || null;
    const tier = text(tds[2] || "");
    const event = text(tds[4] || "") || text(tds[3] || "");
    const score = text(tds[5] || "");
    const vs = tds[6]?.match(/title="([^"]+)"/)?.[1] || null;
    if (date && place && event) results.push({ date, place, tier, event, score, vs });
  }
  return { page: j.parse.title, url: `${LQ}/${encodeURIComponent(j.parse.title.replace(/ /g, "_"))}`, country: flag ? flag.toUpperCase() : null, created, winnings, results: results.slice(0, 30) };
}

// Historique d'une compétition internationale (tableau « Results by year » de Liquipedia) :
// pour chaque équipe, années de titre, de finale, meilleur résultat et nombre de participations.
const SERIES = { worlds: "World_Championships", msi: "Mid-Season_Invitational" };
// Lignée d'une même organisation séparée en plusieurs lignes par Liquipedia
// (clé : nom normalisé ; valeurs : identifiants Liquipedia des noms précédents de la même organisation)
const LINEAGE = { t1: ["sk telecom t1 k", "sk telecom t1"], dplus: ["damwon gaming"], dpluskia: ["damwon gaming"] };
async function seriesHistory(page) {
  const j = await lq(`action=query&prop=revisions&rvprop=content&rvslots=main&titles=${encodeURIComponent(page)}`);
  const wt = Object.values(j.query.pages)[0]?.revisions?.[0]?.slots?.main?.["*"] || "";
  const start = wt.indexOf("Results by year");
  if (start < 0) return null;
  const table = wt.slice(start, wt.indexOf("|}", start));
  const parts = table.split(/\n\|-\s*\n/);
  const years = [...parts[0].matchAll(/^!\s*(20\d\d)\s*$/gm)].map(m => Number(m[1]));
  const teams = {};
  for (const row of parts.slice(1)) {
    const id = row.match(/\{\{Team\|([^}|]+)/)?.[1]?.trim().toLowerCase();
    if (!id) continue;
    const cells = row.split("||").slice(1).map(c => c.match(/Placement(?:\||\/)([^}]*)\}\}/)?.[1] || c.replace(/[^\w()-]/g, ""));
    const [best, , total, ...per] = cells;
    const at = p => per.map((x, i) => (x === p ? years[i] : null)).filter(Boolean);
    teams[id] = { best: best || null, apps: Number(String(total).match(/\d+/)?.[0]) || 0, titles: at("1"), finals: at("2") };
  }
  return { url: `${LQ}/${page}`, upTo: years.at(-1) || null, teams };
}
function seriesFor(hist, names) {
  if (!hist) return null;
  const keys = names.filter(Boolean).map(norm);
  const alias = keys.flatMap(k => LINEAGE[k] || []);
  const ids = Object.keys(hist.teams).filter(k => keys.includes(norm(k)) || alias.includes(k));
  if (!ids.length) return null;
  const rows = ids.map(k => hist.teams[k]);
  const rank = x => Number(String(x || "").match(/d+/)?.[0]) || 99;
  const best = rows.map(x => x.best).sort((x, y) => rank(x) - rank(y))[0] || null;
  return { best, titles: [...new Set(rows.flatMap(x => x.titles))].sort(), finals: [...new Set(rows.flatMap(x => x.finals))].sort(), apps: rows.reduce((n, x) => n + x.apps, 0), url: hist.url, upTo: hist.upTo };
}

// Fiche officielle LoL Esports (recherche par nom d'équipe dans l'annuaire, mis en cache 7 jours)
async function officialTeams(state) {
  if (state.lolTeamsDir && daysAgo(state.lolTeamsDir.at) < TTL_DAYS) return state.lolTeamsDir.teams;
  const j = await fetchJson("https://esports-api.lolesports.com/persisted/gw/getTeams?hl=fr-FR", KEY);
  const teams = j.data.teams.filter(t => t.status === "active").map(t => ({
    name: t.name, code: t.code, slug: t.slug, league: t.homeLeague?.name || null, region: t.homeLeague?.region || null,
    players: (t.players || []).map(p => ({ name: p.summonerName, role: p.role, first: p.firstName, last: p.lastName })),
  }));
  state.lolTeamsDir = { at: new Date().toISOString(), teams };
  return teams;
}

// Fiches des équipes des tournois en cours ou à venir (les tournois terminés gardent la dernière fiche connue)
export async function collectTeamInfo(tournaments, state, log = () => {}) {
  state.teamInfo ||= {};
  state.eventSeeds ||= {};
  const active = tournaments.filter(t => t.game === "lol" && t.status !== "finished");
  let dir = [];
  try { dir = await officialTeams(state); } catch (e) { log(`Annuaire des équipes indisponible : ${e.message}`); dir = state.lolTeamsDir?.teams || []; }
  const findOfficial = name => dir.find(d => d.name === name) || dir.find(d => norm(d.name) === norm(name));

  // Historique des Worlds et du MSI, relu une fois par semaine
  state.series ||= {};
  for (const [k, page] of Object.entries(SERIES)) {
    if (state.series[k] && daysAgo(state.series[k].at) < TTL_DAYS) continue;
    try { const h = await seriesHistory(page); if (h) state.series[k] = { at: new Date().toISOString(), ...h }; } catch (e) { log(`Historique ${page} indisponible : ${e.message}`); }
  }
  let budget = PER_RUN;
  for (const t of active) {
    // Seeds : page du tournoi, relue une fois par jour
    let seeds = state.eventSeeds[t.id];
    if (LQ_EVENT[t.leagueSlug] && (!seeds || daysAgo(seeds.at) >= 1)) {
      try { const s = await eventSeeds(t); if (s) seeds = state.eventSeeds[t.id] = { at: new Date().toISOString(), ...s }; } catch (e) { log(`Seeds de ${t.name} indisponibles : ${e.message}`); }
    }
    for (const x of t.teams || []) {
      const q = seeds?.teams.find(o => o.name === x.team) || seeds?.teams.find(o => norm(o.name) === norm(x.team) || norm(o.name).includes(norm(x.team)) || norm(x.team).includes(norm(o.name)));
      const prev = state.teamInfo[x.team];
      const info = { ...(prev || {}), name: x.team, code: x.code };
      const off = findOfficial(x.team);
      if (off) Object.assign(info, { league: off.league, region: off.region, players: off.players });
      if (q) info.seed = { ...(prev?.seed || {}), [t.id]: { label: seedLabel(q), short: /Invitational|First Stand/.test(q.page) ? q.page.split("/")[0].replace("Mid-Season Invitational", "MSI") : `${q.page.split("/")[0]} #${q.placement}`, captain: q.captain, source: seeds.url } };
      if ((!prev?.lq || daysAgo(prev.lq.at) >= TTL_DAYS) && budget > 0) {
        budget--;
        try {
          const p = await teamPage(q?.name || x.team);
          if (p) info.lq = { at: new Date().toISOString(), ...p };
        } catch (e) { log(`Fiche Liquipedia de ${x.team} indisponible : ${e.message}`); if (prev?.lq) info.lq = { ...prev.lq, at: prev.lq.at }; }
      }
      const aka = [x.team, q?.name, info.lq?.page];
      info.intl = { worlds: seriesFor(state.series.worlds, aka), msi: seriesFor(state.series.msi, aka) };
      state.teamInfo[x.team] = info;
    }
  }
  // Fiches publiées : équipes des tournois listés
  const names = new Set(tournaments.flatMap(t => (t.teams || []).map(x => x.team)));
  return Object.fromEntries(Object.entries(state.teamInfo).filter(([n]) => names.has(n)));
}
