const VIEWS = [
  { id: "actus", label: "Actus", icon: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2V5zm13 4h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5"/>' },
  { id: "tournois", label: "Tournois", icon: '<path d="M6 4h12v4a6 6 0 0 1-12 0V4zm6 10v4m-4 2h8M6 6H3v1a3 3 0 0 0 3 3m12-4h3v1a3 3 0 0 1-3 3"/>' },
  { id: "tier", label: "Tier lists", icon: '<path d="M4 6h3m4 0h9M4 12h3m4 0h6M4 18h3m4 0h3"/>' },
  { id: "strats", label: "Stratégies", icon: '<path d="M5 19l5-5m0 0l4 4 5-5M10 14V5m0 0L7 8m3-3l3 3"/>' },
];
const T_TABS = [["resume", "Résumé"], ["matchs", "Matchs"], ["classement", "Classement"], ["equipes", "Équipes"], ["meta", "Méta pro"]];
const ROLES = [["all", "Tous les rôles"], ["top", "Top"], ["jungle", "Jungle"], ["mid", "Mid"], ["bottom", "ADC"], ["support", "Support"]];
const ROLE_LABEL = Object.fromEntries(ROLES);

const state = {
  view: "actus", game: "all", type: "all", query: "", limit: 30, sort: "date",
  tournament: null, ttab: "resume", tstage: null, tteam: "", tfilter: "all", openMatch: null,
  metaRole: "all", metaSort: "picks",
};

// ---------- Données ----------
// Servi par le serveur : /api/data + mises à jour en direct (SSE). Ouvert en fichier : data/auto.js.
let AUTO = null;
let dataLoaded = false;
let serverStatus = null;
const ONLINE = location.protocol.startsWith("http");
// true = notre serveur Node (API + direct) ; false = hébergement statique (GitHub Pages) qui sert data/auto.json
let HAS_SERVER = ONLINE;
const today = () => new Date().toISOString().slice(0, 10);
const allNews = () => [...(AUTO?.news || []), ...ITEMS];
const allUpcoming = () => [...UPCOMING, ...(AUTO?.upcoming || [])]
  .filter(u => u.date >= today())
  .sort((a, b) => (a.time || a.date).localeCompare(b.time || b.date));

// Tournois saisis à la main (jeux sans source officielle automatique) mis au même format que les tournois collectés.
function manualTournaments() {
  const autoGames = new Set((AUTO?.tournaments || []).map(t => t.game));
  return EVENTS.filter(ev => !autoGames.has(ev.game)).map(ev => ({
    id: "m-" + ev.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    game: ev.game, manual: true, name: ev.name, league: ev.place, status: "finished", dates: ev.dates, prize: ev.prize,
    verifiedStatus: ev.status, warnings: ev.warnings,
    stages: [{ name: "Phase finale", sections: [{ name: "Matchs", standings: [], matches: ev.matches.map((m, i) => ({
      id: `${ev.name}-${i}`, state: "completed", block: m.stage, maps: m.maps, summary: m.summary,
      teams: [
        { name: m.a, score: m.sa, outcome: (m.sa != null ? m.sa > m.sb : m.winner === "a") ? "win" : "loss" },
        { name: m.b, score: m.sb, outcome: (m.sa != null ? m.sb > m.sa : m.winner === "b") ? "win" : "loss" },
      ],
    })) }] }],
    tables: STANDINGS.filter(s => s.game === ev.game && s.title.toLowerCase().startsWith(ev.name.toLowerCase().split(" ").slice(0, 2).join(" "))),
    analysis: { resume: ev.summary, faits_marquants: [], equipes_en_forme: [], meta_pro: "", a_suivre: [] },
    sources: ev.sources,
  }));
}
const allTournaments = () => [...(AUTO?.tournaments || []), ...manualTournaments()];
const findTournament = id => allTournaments().find(t => t.id === id);
const tMatches = t => t.stages.flatMap(s => s.sections.flatMap(x => x.matches));

// ---------- Utilitaires ----------
const rosters = { lol: null, val: null, cs2: (STATIC_ROSTERS.cs2 || []).map(name => ({ name })) };
let lolVersion = "16.20.1";
const gameById = Object.fromEntries(GAMES.map(g => [g.id, g]));
const KIND_LABEL = { officiel: "Officiel", media: "Média", communaute: "Communauté", suspect: "Douteux" };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = d => new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const fmtShort = d => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const fmtTime = d => new Date(d).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const pct = x => (x == null ? "—" : `${Math.round(x * 100)} %`);
const byGame = list => list.filter(x => state.game === "all" || x.game === state.game);
const sel = (action, options, value, label) => `<label class="sel"><span>${esc(label)}</span><select data-action="${action}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;

function initials(name) {
  const words = String(name).replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/);
  return ((words.length > 1 ? words[0][0] + words[1][0] : words[0]?.slice(0, 2)) || "?").toUpperCase();
}
function hue(name) {
  let h = 0;
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}
function imageUrl(game, ent) {
  if (game === "lol") {
    const id = ent.id || rosters.lol?.find(c => c.name === ent.name)?.id;
    return id ? `https://ddragon.leagueoflegends.com/cdn/${lolVersion}/img/champion/${id}.png` : null;
  }
  if (game === "val") return rosters.val?.find(a => a.name.toLowerCase() === ent.name.toLowerCase())?.icon || null;
  return null;
}
function avatar(game, ent, cls = "", forcedUrl = null) {
  const url = forcedUrl || imageUrl(game, ent);
  return `<span class="av ${cls}" style="--h:${hue(ent.name)}">${esc(initials(ent.name))}${url ? `<img src="${esc(url)}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>`;
}
const champ = (id, cls = "sm") => avatar("lol", { id, name: rosters.lol?.find(c => c.id === id)?.name || id }, cls);
const champName = id => rosters.lol?.find(c => c.id === id)?.name || id;

async function loadRosters() {
  try {
    const versions = await (await fetch("https://ddragon.leagueoflegends.com/api/versions.json")).json();
    lolVersion = versions[0];
    const champs = await (await fetch(`https://ddragon.leagueoflegends.com/cdn/${lolVersion}/data/fr_FR/champion.json`)).json();
    rosters.lol = Object.values(champs.data).map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  } catch (e) { console.warn("Roster LoL indisponible", e); }
  try {
    const res = await (await fetch("https://valorant-api.com/v1/agents?isPlayableCharacter=true")).json();
    rosters.val = res.data.map(a => ({ name: a.displayName, icon: a.displayIcon, role: a.role?.displayName })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) { console.warn("Roster Valorant indisponible", e); }
  render();
}

// ---------- Blocs communs ----------
const badge = s => STATUS[s] ? `<span class="badge s-${s}" title="${esc(STATUS[s].help)}">${STATUS[s].label}</span>` : "";
const gameTag = id => `<span class="tag" style="--c:${gameById[id].color}">${esc(gameById[id].name)}</span>`;
const warnings = list => (list || []).map(w => `<div class="warning">⚠ ${esc(w)}</div>`).join("");
const advice = a => a ? `<div class="analysis"><strong>Ce que ça change pour vous :</strong> ${esc(a)}</div>` : "";
const points = list => list?.length ? `<ul class="points">${list.map(p => `<li>${esc(p)}</li>`).join("")}</ul>` : "";
const sources = list => `<div class="sources">${(list || []).map(s =>
  `<a class="src" href="${esc(s.url)}" target="_blank" rel="noopener"><span class="k ${s.kind}">${KIND_LABEL[s.kind]}</span>${esc(s.name)}</a>`).join("")}</div>`;
const empty = msg => `<div class="empty">${esc(msg)}</div>`;
const claudeTag = `<span class="pill claude" title="Résumé et analyse rédigés par Claude à partir des sources vérifiées">Analyse Claude</span>`;

// ---------- Actus ----------
const IMPACT_RANK = { fort: 0, moyen: 1, faible: 2 };

function briefingPanel() {
  const b = AUTO?.briefings || {};
  const games = (state.game === "all" ? GAMES.map(g => g.id) : [state.game]).filter(g => b[g]);
  if (!games.length) return "";
  return `<section class="briefings">${games.map(g => `
    <article class="briefing" style="--c:${gameById[g].color}">
      <div class="card-meta">${gameTag(g)}<span class="pill claude">L'essentiel</span><span>${fmtShort(b[g].at)}</span></div>
      <p class="b-resume">${esc(b[g].resume)}</p>
      ${state.game !== "all" ? `${points(b[g].a_retenir)}${b[g].conseils?.length ? `<div class="analysis"><strong>Pour grimper en ce moment :</strong>${points(b[g].conseils)}</div>` : ""}` : `<ul class="points">${b[g].a_retenir.slice(0, 2).map(p => `<li>${esc(p)}</li>`).join("")}</ul>`}
    </article>`).join("")}</section>`;
}

function newsCard(i, feature = false) {
  // Analyse Claude = objet ; les fiches vérifiées à la main ont un simple texte « ce que ça change »
  const a = typeof i.analysis === "object" ? i.analysis : null;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  feature = feature && !!i.image;
  return `
  <article class="card ${feature ? "feature" : ""}" style="--c:${gameById[i.game].color}">
    ${i.image ? `<div class="hero"><img src="${esc(i.image)}" alt="" loading="lazy" onerror="this.parentNode.remove()"></div>` : ""}
    ${feature ? `<div class="feature-body">` : ""}
    <div class="card-meta">${gameTag(i.game)}<span class="type">${TYPES[i.type] || esc(i.type)}</span><span>${fmtDate(i.date)}</span>${badge(i.status)}
      ${i.date >= yesterday && i.date <= today() ? `<span class="pill new">Nouveau</span>` : ""}
      ${a ? `<span class="pill impact-${a.impact}">Impact ${a.impact}</span>` : ""}
      ${!a && i.lang === "en" ? `<span class="pill" title="Article en anglais">EN</span>` : ""}
      ${i.auto ? "" : `<span class="pill manual">Vérifié main</span>`}</div>
    <h3>${esc(a?.titre || i.title)}</h3>
    ${a ? `
      <p class="essentiel">${esc(a.essentiel)}</p>
      ${points(a.points_cles)}
      <div class="analysis">${claudeTag} ${esc(a.analyse)}</div>
      ${a.a_surveiller ? `<p class="small muted">👁 À surveiller : ${esc(a.a_surveiller)}</p>` : ""}
      <details class="small"><summary class="muted">Texte d'origine</summary><p><b>${esc(i.title)}</b></p>${i.summary ? `<p>${esc(i.summary)}</p>` : ""}${points(i.points)}</details>`
    : `${i.summary ? `<p>${esc(i.summary)}</p>` : ""}${points(i.points)}${advice(typeof i.analysis === "string" ? i.analysis : "")}`}
    ${warnings(i.warnings)}${sources(i.sources)}
    ${feature ? `</div>` : ""}
  </article>`;
}

function viewActus() {
  const tabs = [["all", "Tout"], ...Object.entries(TYPES)];
  const q = state.query;
  const text = i => [i.title, i.summary, ...(i.points || []), typeof i.analysis === "string" ? i.analysis : Object.values(i.analysis || {}).flat().join(" ")].join(" ").toLowerCase();
  let all = byGame(allNews())
    .filter(i => state.type === "all" || i.type === state.type)
    .filter(i => !q || text(i).includes(q));
  if (state.sort === "impact") all = all.filter(i => i.analysis?.impact).sort((a, b) => IMPACT_RANK[a.analysis.impact] - IMPACT_RANK[b.analysis.impact] || b.date.localeCompare(a.date));
  else if (state.sort === "confirme") all = all.filter(i => i.status === "confirme").sort((a, b) => b.date.localeCompare(a.date));
  else all.sort((a, b) => b.date.localeCompare(a.date));
  const items = all.slice(0, state.limit);
  const upcoming = byGame(allUpcoming()).slice(0, 10);

  return `
  ${briefingPanel()}
  <div class="toolbar">
    <div class="tabs" data-action="type">${tabs.map(([id, l]) => `<button class="tab" data-id="${id}" aria-selected="${state.type === id}">${l}</button>`).join("")}</div>
    <div class="toolbar-right">
      ${sel("sort", [["date", "Plus récent"], ["impact", "Plus d'impact"], ["confirme", "Confirmé seulement"]], state.sort, "Trier")}
      <input type="search" id="search" placeholder="Rechercher…" value="${esc(state.query)}" aria-label="Rechercher">
    </div>
  </div>
  <div class="layout">
    <div class="feed">${items.length ? items.map((i, k) => newsCard(i, k === 0)).join("") : empty("Aucune info pour ce filtre pour l'instant.")}
      ${all.length > items.length ? `<button class="more" data-action="more">Voir plus (${all.length - items.length})</button>` : ""}
    </div>
    <aside class="side">
      ${sourcesPanel()}
      <div class="panel">
        <h2>À venir</h2>
        <ol class="upcoming">${upcoming.length ? upcoming.map(u => {
          const d = new Date(u.time || u.date + "T12:00:00");
          return `<li><div class="d">${d.getDate()}<small>${d.toLocaleDateString("fr-FR", { month: "short" })}</small></div>
            <div class="l">${gameTag(u.game)}<span>${esc(u.label)}</span>${u.time ? `<span class="muted small">${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>` : ""}</div></li>`;
        }).join("") : `<li class="muted small">Rien de prévu pour l'instant.</li>`}</ol>
      </div>
      <div class="panel">
        <h2>Indice de fiabilité</h2>
        <ul class="legend">${Object.keys(STATUS).map(s => `<li>${badge(s)}<span class="muted">${esc(STATUS[s].help)}</span></li>`).join("")}</ul>
      </div>
    </aside>
  </div>`;
}

function sourcesPanel() {
  if (!AUTO) return `<div class="panel"><h2>Collecte automatique</h2><p class="muted small">Pas encore de données. Lancez le serveur avec <code>npm start</code>.</p></div>`;
  const ok = AUTO.sources.filter(s => s.ok).length;
  const mins = Math.round((Date.now() - new Date(AUTO.generatedAt)) / 60000);
  const ago = mins < 1 ? "à l'instant" : mins < 60 ? `il y a ${mins} min` : `il y a ${Math.round(mins / 60)} h`;
  const an = AUTO.analysis;
  return `<div class="panel">
    <h2>Collecte automatique</h2>
    <p class="small"><b>${ago}</b> · ${ok}/${AUTO.sources.length} sources en ligne${mins > 90 ? ` <span class="s-non-confirme">(en retard)</span>` : ""}</p>
    ${serverStatus?.running ? `<p class="small s-media">● Collecte en cours…</p>` : serverStatus?.nextRun ? `<p class="small muted">Prochaine collecte : ${new Date(serverStatus.nextRun).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>` : ""}
    <p class="small ${an?.enabled ? "" : "muted"}">${an?.enabled ? `Analyse Claude active · ${AUTO.news.filter(n => n.analysis).length} sujets analysés${an.pending ? `, ${an.pending} en attente` : ""}` : esc(an?.reason || "Analyse Claude inactive")}</p>
    ${HAS_SERVER ? `<button class="more small-btn" data-action="collect">Lancer une collecte</button>` : ""}
    <details class="small"><summary class="muted">Détail des sources</summary>
      <ul class="src-health">${AUTO.sources.map(s => `<li><span class="${s.ok ? "s-confirme" : "s-contradictoire"}">${s.ok ? "●" : "✕"}</span> ${esc(s.name)} <span class="muted">${s.ok ? s.count : esc(s.error)}</span></li>`).join("")}</ul>
    </details>
  </div>`;
}

// ---------- Tournois : liste ----------
const T_STATUS = { live: ["En cours", "s-confirme"], finished: ["Terminé", "muted"], upcoming: ["À venir", "s-media"] };

function viewTournois() {
  if (state.tournament) {
    const t = findTournament(state.tournament);
    if (t) return viewTournoi(t);
    if (!dataLoaded) return empty("Chargement du tournoi…");
    state.tournament = null;
  }
  const list = byGame(allTournaments()).sort((a, b) => (a.status === "live" ? 0 : 1) - (b.status === "live" ? 0 : 1) || (b.lastMatch || "").localeCompare(a.lastMatch || ""));
  // Classements saisis à la main : seulement pour les jeux sans données officielles automatiques
  const autoGames = new Set((AUTO?.tournaments || []).map(t => t.game));
  const extra = byGame(STANDINGS).filter(s => !autoGames.has(s.game) && !list.some(t => t.tables?.includes(s)));
  if (!list.length && !extra.length) return empty("Pas de tournoi suivi pour ce jeu pour l'instant.");
  return `
  <div class="t-grid">${list.map(t => {
    const [label, cls] = T_STATUS[t.status] || ["", ""];
    const next = tMatches(t).filter(m => m.state !== "completed" && m.start && m.teams.every(x => x.code !== "TBD")).sort((a, b) => a.start.localeCompare(b.start))[0];
    return `<button class="card t-card" data-action="open-t" data-id="${esc(t.id)}" style="--c:${gameById[t.game].color}">
      <div class="card-meta">${gameTag(t.game)}<span class="${cls}"><b>● ${label}</b></span>${t.manual ? `<span class="pill manual">Vérifié main</span>` : `<span class="pill">Officiel</span>`}</div>
      <h3>${esc(t.name)}</h3>
      <p class="muted small">${esc(t.dates || `${fmtShort(t.startDate)} – ${fmtShort(t.endDate)}`)}${t.prize ? ` · ${esc(t.prize)}` : ""}</p>
      ${t.progress ? `<div class="progress"><span style="width:${Math.round((t.progress.done / Math.max(t.progress.total, 1)) * 100)}%"></span></div><p class="small muted">${t.progress.done}/${t.progress.total} matchs joués${t.stats?.totalGames ? ` · ${t.stats.totalGames} parties analysées` : ""}</p>` : ""}
      ${next ? `<p class="small">Prochain : <b>${esc(next.teams[0].name)} vs ${esc(next.teams[1].name)}</b> · ${fmtTime(next.start)}</p>` : ""}
      ${t.analysis?.resume ? `<p class="small t-teaser">${esc(t.analysis.resume)}</p>` : ""}
    </button>`;
  }).join("")}</div>
  ${extra.map(standingsTable).join("")}`;
}

function standingsTable(t) {
  return `<section class="card" style="--c:${gameById[t.game].color}">
    <div class="card-meta">${gameTag(t.game)}${badge(t.status)}</div>
    <h3>${esc(t.title)}</h3><p class="muted small">${esc(t.subtitle)}</p>
    <div class="table-wrap"><table><thead><tr>${t.columns.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead>
    <tbody>${t.rows.map(r => `<tr>${r.map((c, i) => `<td>${t.columns[i] === "Équipe" ? `<span class="cell-team">${avatar("", { name: c }, "xs")}${esc(c)}</span>` : esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    ${warnings(t.warnings)}${sources(t.sources)}
  </section>`;
}

// ---------- Tournois : détail ----------
function viewTournoi(t) {
  const [label, cls] = T_STATUS[t.status] || ["", ""];
  const tabs = T_TABS.filter(([id]) => id !== "meta" || t.stats?.totalGames).filter(([id]) => id !== "equipes" || t.teams?.length);
  if (!tabs.some(([id]) => id === state.ttab)) state.ttab = "resume";
  const body = { resume: tResume, matchs: tMatchs, classement: tClassement, equipes: tEquipes, meta: tMeta }[state.ttab](t);
  return `
  <div class="t-head" style="--c:${gameById[t.game].color}">
    <button class="back" data-action="close-t">← Tous les tournois</button>
    <div class="card-meta">${gameTag(t.game)}<span class="${cls}"><b>● ${label}</b></span>${t.league ? `<span>${esc(t.league)}</span>` : ""}</div>
    <h2>${esc(t.name)}</h2>
    <p class="muted small">${esc(t.dates || `${fmtDate(t.startDate)} – ${fmtDate(t.endDate)}`)}${t.progress ? ` · ${t.progress.done}/${t.progress.total} matchs joués` : ""}</p>
    <div class="tabs sub-tabs" data-action="ttab">${tabs.map(([id, l]) => `<button class="tab" data-id="${id}" aria-selected="${state.ttab === id}">${l}</button>`).join("")}</div>
  </div>
  ${body}
  ${sources(t.sources)}`;
}

function tResume(t) {
  const a = t.analysis;
  const matches = tMatches(t);
  const done = matches.filter(m => m.state === "completed").sort((x, y) => (y.start || "").localeCompare(x.start || ""));
  const next = matches.filter(m => m.state !== "completed" && m.teams.every(x => x.code !== "TBD")).sort((x, y) => (x.start || "").localeCompare(y.start || ""));
  return `
  ${a ? `<section class="card">
    <div class="card-meta">${t.manual ? `<span class="pill manual">Vérifié main</span>` : claudeTag}</div>
    <p class="essentiel">${esc(a.resume)}</p>
    ${a.faits_marquants?.length ? `<h4>Faits marquants</h4>${points(a.faits_marquants)}` : ""}
    ${a.equipes_en_forme?.length ? `<h4>Forme des équipes</h4>${points(a.equipes_en_forme)}` : ""}
    ${a.meta_pro ? `<h4>Méta pro</h4><p>${esc(a.meta_pro)}</p>` : ""}
    ${a.a_suivre?.length ? `<h4>À suivre</h4>${points(a.a_suivre)}` : ""}
  </section>` : `<section class="card"><p class="muted small">L'analyse Claude de ce tournoi sera disponible après la prochaine collecte (clé API requise).</p></section>`}
  ${warnings(t.warnings)}
  <div class="two-col">
    <section class="card"><h4>Derniers résultats</h4><div class="m-list">${done.slice(0, 6).map(m => matchRow(m, t)).join("") || empty("Aucun match joué.")}</div>
      ${done.length > 6 ? `<button class="more" data-action="ttab-go" data-id="matchs">Tous les matchs</button>` : ""}</section>
    <section class="card"><h4>Prochains matchs</h4><div class="m-list">${next.slice(0, 6).map(m => matchRow(m, t)).join("") || empty("Aucun match à venir.")}</div></section>
  </div>
  ${t.stats?.totalGames ? `<section class="card"><h4>Champions les plus joués</h4><div class="lineup">${t.stats.champions.slice(0, 10).map(c => `<div class="lu">${champ(c.champ, "")}<span>${esc(champName(c.champ))}</span><span class="ti-stat">${c.picks} picks</span></div>`).join("")}</div>
    <button class="more" data-action="ttab-go" data-id="meta">Voir toute la méta pro</button></section>` : ""}`;
}

function matchRow(m, t) {
  const open = state.openMatch === m.id;
  const [a, b] = m.teams;
  const stateLbl = m.state === "completed" ? "" : m.state === "inProgress" ? `<span class="pill new">En direct</span>` : m.start ? `<span class="muted small">${fmtTime(m.start)}</span>` : `<span class="muted small">À venir</span>`;
  const side = x => `<div class="team ${x.outcome === "win" ? "win" : ""}">${avatar("", { name: x.name }, "sm", x.image)}<span class="tn">${esc(x.name)}</span><span class="sc">${m.state === "completed" ? (x.score ?? (x.outcome === "win" ? "V" : "D")) : ""}</span></div>`;
  const hasDetail = m.games?.length || m.maps || m.summary;
  return `<div class="match ${open ? "open" : ""}">
    <button class="match-head" data-action="${hasDetail ? "toggle-m" : ""}" data-id="${esc(m.id)}">
      <div class="stage">${esc(m.block || "")}${m.bo ? ` · Bo${m.bo}` : ""}${m.start && m.state === "completed" ? ` · ${fmtShort(m.start)}` : ""} ${stateLbl}</div>
      ${side(a)}${side(b)}
      ${hasDetail ? `<span class="chev">${open ? "▲" : "▼"} ${m.games?.length ? `${m.games.length} parties` : "Détails"}</span>` : ""}
    </button>
    ${open ? matchDetail(m, t) : ""}
  </div>`;
}

function matchDetail(m, t) {
  if (m.maps || m.summary) {
    return `<div class="m-detail">${m.maps ? `<div class="maps">${m.maps.map(([n, x, y]) => `<span class="map ${x > y ? "a" : "b"}">${esc(n)} <b>${x}–${y}</b></span>`).join("")}</div>` : ""}${m.summary ? `<p class="small">${esc(m.summary)}</p>` : ""}</div>`;
  }
  const name = id => m.teams.find(x => x.id === id)?.name || "?";
  return `<div class="m-detail">
    ${m.verified === false ? `<div class="warning small">⚠ Vainqueur de chaque partie non vérifié (le décompte ne correspond pas au score officiel).</div>` : ""}
    ${m.games.map(g => `<div class="game">
      <div class="g-head"><b>Partie ${g.n}</b>${g.winnerTeamId ? ` · victoire <b>${esc(name(g.winnerTeamId))}</b>` : ""}${g.kills ? ` · ${g.kills.blue}–${g.kills.red} kills` : ""}${g.patch ? ` · patch ${esc(g.patch)}` : ""}
        ${g.vod ? `<a href="${esc(g.vod)}" target="_blank" rel="noopener" class="vod">▶ Revoir</a>` : ""}</div>
      ${["blue", "red"].map(sd => `<div class="pick-row ${g.winnerTeamId === g[sd].teamId ? "win" : ""}">
        <span class="side ${sd}">${esc(name(g[sd].teamId))}</span>
        <div class="picks">${g[sd].picks.map(p => `<span class="pk" title="${esc(p.player)} — ${esc(champName(p.champ))} (${esc(ROLE_LABEL[p.role] || p.role)})">${champ(p.champ, "xs")}<small>${esc(p.player.replace(/^\S+\s/, ""))}</small></span>`).join("")}</div>
      </div>`).join("")}
    </div>`).join("")}
  </div>`;
}

function tMatchs(t) {
  const stages = t.stages.map((s, i) => [i, s.name]);
  if (state.tstage == null || state.tstage >= t.stages.length) {
    // Phase en cours : la dernière qui a un match joué ou un match prochain avec des équipes connues
    const active = t.stages.map((s, i) => [i, s.sections.flatMap(x => x.matches)])
      .filter(([, ms]) => ms.some(m => m.state === "completed" || m.teams.every(x => x.code !== "TBD")));
    state.tstage = active.length ? active.at(-1)[0] : 0;
  }
  const stage = t.stages[state.tstage];
  const teams = [["", "Toutes les équipes"], ...(t.teams || []).map(x => [x.team, x.team])];
  const filt = m => (state.tfilter === "all" || (state.tfilter === "done" ? m.state === "completed" : m.state !== "completed"))
    && (!state.tteam || m.teams.some(x => x.name === state.tteam));
  const isBracket = /finale|play-?offs|knockout|élimination/i.test(stage.name) && !state.tteam;
  let body;
  if (isBracket) {
    // Tableau : une colonne par tour
    const rounds = new Map();
    for (const m of stage.sections.flatMap(x => x.matches).filter(filt)) {
      const k = m.block || "Tour";
      if (!rounds.has(k)) rounds.set(k, []);
      rounds.get(k).push(m);
    }
    body = `<div class="bracket">${[...rounds].map(([r, ms]) => `<div class="round"><h4>${esc(r)}</h4>${ms.map(m => matchRow(m, t)).join("")}</div>`).join("")}</div>`;
  } else {
    body = stage.sections.map(sec => {
      const ms = sec.matches.filter(filt).sort((a, b) => (a.start || "").localeCompare(b.start || ""));
      if (!ms.length) return "";
      return `${stage.sections.length > 1 ? `<h4>${esc(sec.name)}</h4>` : ""}<div class="m-grid">${ms.map(m => matchRow(m, t)).join("")}</div>`;
    }).join("") || empty("Aucun match pour ce filtre.");
  }
  return `<div class="filters">
      ${stages.length > 1 ? sel("tstage", stages, state.tstage, "Phase") : ""}
      ${teams.length > 2 ? sel("tteam", teams, state.tteam, "Équipe") : ""}
      ${sel("tfilter", [["all", "Tous"], ["done", "Terminés"], ["next", "À venir"]], state.tfilter, "Matchs")}
    </div>${body}`;
}

function tClassement(t) {
  const tables = t.stages.flatMap(s => s.sections.filter(x => x.standings?.length).map(x => ({ title: s.sections.length > 1 ? `${s.name} — ${x.name}` : s.name, rows: x.standings })));
  const html = tables.map(tb => `<section class="card"><h4>${esc(tb.title)}</h4><div class="table-wrap"><table>
    <thead><tr><th>#</th><th>Équipe</th><th>Bilan</th>${tb.rows.some(r => r.gw != null) ? "<th>Parties</th>" : ""}</tr></thead>
    <tbody>${tb.rows.map((r, i) => `<tr class="clickable" data-action="team-go" data-id="${esc(r.team)}"><td>${r.rank ?? i + 1}</td><td><span class="cell-team">${avatar("", { name: r.team }, "xs", r.image)}${esc(r.team)}</span></td><td><b>${r.w}–${r.l}</b></td>${r.gw != null ? `<td class="muted">${r.gw}–${r.gl}</td>` : ""}</tr>`).join("")}</tbody>
  </table></div></section>`).join("");
  return html + (t.tables || []).map(standingsTable).join("") || empty("Pas encore de classement pour ce tournoi.");
}

function tEquipes(t) {
  const sel_ = state.tteam && t.teams.find(x => x.team === state.tteam);
  const grid = `<div class="team-grid">${t.teams.map(x => `<button class="team-card ${state.tteam === x.team ? "active" : ""}" data-action="pick-team" data-id="${esc(x.team)}">
    ${avatar("", { name: x.team }, "", x.image)}<b>${esc(x.team)}</b><span class="muted small">${x.w}–${x.l}${x.gw != null ? ` · ${x.gw}–${x.gl} parties` : ""}</span></button>`).join("")}</div>`;
  if (!sel_) return `<p class="muted small">Choisissez une équipe pour voir ses matchs et ses champions.</p>${grid}`;
  const ms = tMatches(t).filter(m => m.teams.some(x => x.name === sel_.team)).sort((a, b) => (b.start || "").localeCompare(a.start || ""));
  const players = (t.stats?.players || []).filter(p => p.team === sel_.team);
  return `${grid}
  <section class="card">
    <div class="t-team-head">${avatar("", { name: sel_.team }, "", sel_.image)}<div><h3>${esc(sel_.team)}</h3><p class="muted small">Bilan ${sel_.w}–${sel_.l}${sel_.gw != null ? ` · parties ${sel_.gw}–${sel_.gl}` : ""}</p></div></div>
    ${players.length ? `<h4>Champions joués par joueur</h4><div class="players">${players.sort((a, b) => ROLES.findIndex(r => r[0] === a.role) - ROLES.findIndex(r => r[0] === b.role)).map(p => `<div class="player"><span class="muted small">${esc(ROLE_LABEL[p.role] || p.role)}</span><b>${esc(p.player)}</b>
      <div class="picks">${Object.entries(p.champs).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<span class="pk" title="${esc(champName(c))} — ${n} partie(s)">${champ(c, "xs")}<small>×${n}</small></span>`).join("")}</div></div>`).join("")}</div>` : ""}
    <h4>Matchs</h4><div class="m-grid">${ms.map(m => matchRow(m, t)).join("")}</div>
  </section>`;
}

function tMeta(t) {
  const s = t.stats;
  let list = s.champions.filter(c => state.metaRole === "all" || c.role === state.metaRole);
  const key = { picks: c => -c.picks, presence: c => -c.presence, winrate: c => -(c.known >= 3 ? c.winrate : -1) }[state.metaSort];
  list = [...list].sort((a, b) => key(a) - key(b));
  const unverified = tMatches(t).filter(m => m.verified === false).length;
  return `<section class="card">
    <p class="small muted">${s.totalGames} parties officielles analysées · présence = part des parties où le champion est joué (les bans ne sont pas fournis par l'API). Taux de victoire affiché à partir de 3 parties.</p>
    ${unverified ? `<div class="warning small">⚠ ${unverified} match(s) exclus du taux de victoire : vainqueur des parties non vérifiable.</div>` : ""}
    <div class="filters">${sel("metaRole", ROLES, state.metaRole, "Rôle")}${sel("metaSort", [["picks", "Plus joués"], ["presence", "Présence"], ["winrate", "Taux de victoire"]], state.metaSort, "Trier")}</div>
    <div class="table-wrap"><table class="meta-table">
      <thead><tr><th>Champion</th><th>Rôle</th><th>Picks</th><th>Présence</th><th>Victoires</th></tr></thead>
      <tbody>${list.map(c => `<tr>
        <td><span class="cell-team">${champ(c.champ, "xs")}${esc(champName(c.champ))}</span></td>
        <td class="muted">${esc(ROLE_LABEL[c.role] || c.role)}</td>
        <td><b>${c.picks}</b></td>
        <td><div class="bar"><span style="width:${Math.round(c.presence * 100)}%"></span></div>${pct(c.presence)}</td>
        <td class="${c.known >= 3 ? (c.winrate >= 0.55 ? "s-confirme" : c.winrate <= 0.45 ? "s-contradictoire" : "") : "muted"}">${c.known >= 3 ? `${pct(c.winrate)} <span class="muted small">(${c.known})</span>` : "—"}</td>
      </tr>`).join("")}</tbody>
    </table></div>
  </section>`;
}

// ---------- Tier lists & stratégies ----------
function tierItem(game, ent) {
  return `<button class="ti" data-note="${esc([ent.name, ent.stat, ent.note].filter(Boolean).join(" — "))}">
    ${avatar(game, ent)}<span class="ti-name">${esc(ent.name)}</span>${ent.stat ? `<span class="ti-stat">${esc(ent.stat)}</span>` : ""}
  </button>`;
}

function proMetaCards() {
  // Tier list "pro" calculée sur les parties officielles du tournoi international le plus récent
  const ts = (AUTO?.tournaments || []).filter(t => t.stats?.totalGames >= 10 && (state.game === "all" || state.game === t.game));
  return ts.slice(0, 2).map(t => {
    const top = t.stats.champions.filter(c => c.picks >= 3);
    const tier = c => (c.presence >= 0.25 ? "S" : c.presence >= 0.15 ? "A" : c.presence >= 0.08 ? "B" : "C");
    const tiers = { S: [], A: [], B: [], C: [] };
    for (const c of top) tiers[tier(c)].push({ id: c.champ, name: champName(c.champ), stat: pct(c.presence), note: `${c.picks} picks, ${c.known >= 3 ? `${pct(c.winrate)} de victoires` : "taux de victoire non significatif"}` });
    return `<section class="card tier-card" style="--c:${gameById[t.game].color}">
      <div class="card-meta">${gameTag(t.game)}${badge("confirme")}<span class="pill">Calculé automatiquement</span></div>
      <h3>Méta pro — ${esc(t.name)}</h3>
      <p class="muted small">Présence sur ${t.stats.totalGames} parties officielles (S ≥ 25 %, A ≥ 15 %, B ≥ 8 %). Données LoL Esports.</p>
      <div class="tiers">${Object.entries(tiers).filter(([, e]) => e.length).map(([k, e]) => `<div class="tier"><div class="tl t-${k}">${k}</div><div class="tis">${e.map(x => tierItem(t.game, x)).join("")}</div></div>`).join("")}</div>
      <div class="ti-detail muted small">Touchez un champion pour voir le détail.</div>
      <button class="more" data-action="open-t" data-id="${esc(t.id)}" data-tab="meta">Statistiques complètes</button>
    </section>`;
  }).join("");
}

function viewTier() {
  const lists = byGame(TIERLISTS);
  const pro = proMetaCards();
  if (!lists.length && !pro) return empty("Pas encore de tier list fiable pour ce jeu : données en cours de collecte.");
  return pro + lists.map(t => {
    const ranked = new Set();
    t.groups.forEach(g => Object.values(g.tiers).flat().forEach(e => ranked.add((e.id || e.name).toLowerCase())));
    const roster = t.roster && rosters[t.roster];
    const others = roster ? roster.filter(r => !ranked.has((r.id || r.name).toLowerCase()) && !ranked.has(r.name.toLowerCase())) : [];
    return `
    <section class="card tier-card" style="--c:${gameById[t.game].color}">
      <div class="card-meta">${gameTag(t.game)}${badge(t.status)}</div>
      <h3>${esc(t.title)}</h3>
      <p class="muted small">${esc(t.basis)}</p>
      ${t.groups.map(g => `
        ${t.groups.length > 1 ? `<h4>${esc(g.name)}</h4>` : ""}
        <div class="tiers">${Object.entries(g.tiers).map(([tier, ents]) => `
          <div class="tier"><div class="tl t-${tier}">${tier}</div><div class="tis">${ents.map(e => tierItem(t.game, e)).join("")}</div></div>`).join("")}
        </div>`).join("")}
      <div class="ti-detail muted small">Touchez un élément pour voir le détail.</div>
      ${t.roster ? `<details class="others"><summary>${roster ? `Autres (${others.length}) — pas assez de données pour les classer` : "Liste complète en cours de chargement…"}</summary>
        <div class="tis">${others.map(e => tierItem(t.game, e)).join("")}</div></details>` : ""}
      ${warnings(t.warnings)}${sources(t.sources)}
    </section>`;
  }).join("");
}

function viewStrats() {
  const list = byGame(STRATS);
  if (!list.length) return empty("Pas encore de stratégie vérifiée pour ce jeu.");
  const lineup = (game, l) => `<div class="lineup">${l.map(x => {
    const ent = typeof x === "string" ? { name: x } : x;
    return `<div class="lu">${avatar(game, ent)}<span>${esc(ent.name)}</span></div>`;
  }).join("")}</div>`;
  return list.map(s => `
    <section class="card" style="--c:${gameById[s.game].color}">
      <div class="card-meta">${gameTag(s.game)}<span class="type">${esc(s.kind)}</span>${badge(s.status)}</div>
      <h3>${esc(s.title)}</h3>
      ${s.lineup ? lineup(s.game, s.lineup) : ""}
      ${s.maps ? s.maps.map(m => `<div class="map-row"><b>${esc(m.map)}</b>${lineup(s.game, m.lineup)}<span class="muted small">${esc(m.note)}</span></div>`).join("") : ""}
      ${points(s.points)}${advice(s.analysis)}${warnings(s.warnings)}${sources(s.sources)}
    </section>`).join("");
}

// ---------- Accueil : choix du jeu ----------
// Visuel de chaque tuile : jaquette officielle Steam quand elle existe, sinon l'image de la dernière actu officielle du jeu.
const STEAM_ART = { cs2: 730, rl: 252950 };
function gameArt(id) {
  if (STEAM_ART[id]) return `https://cdn.cloudflare.steamstatic.com/steam/apps/${STEAM_ART[id]}/library_600x900_2x.jpg`;
  // Les images des annonces Steam (clan.akamai) sont souvent des bannières de texte : on préfère le site de l'éditeur
  const official = (AUTO?.news || []).filter(n => n.game === id && n.image && n.sources.some(s => s.kind === "officiel"));
  return (official.find(n => !n.image.includes("clan.akamai")) || official[0])?.image || null;
}

function viewAccueil() {
  const live = id => allTournaments().filter(t => t.game === id && t.status === "live");
  const fresh = id => allNews().filter(n => n.game === id && (Date.now() - new Date(n.date)) / 864e5 <= 2).length;
  return `
  <section class="home">
    <p class="home-kicker">Bienvenue</p>
    <h1 class="home-title">Choisissez votre <em>jeu</em></h1>
    <p class="muted home-sub">Patchnotes, tournois et méta du moment, vérifiés et résumés pour vous.</p>
    <div class="game-grid">${GAMES.map(g => {
      const art = gameArt(g.id);
      const l = live(g.id);
      const f = fresh(g.id);
      return `<button class="game-tile ${state.game === g.id ? "active" : ""}" data-action="choose" data-id="${g.id}" style="--c:${g.color}">
        ${art ? `<img src="${esc(art)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
        <span class="gt-shade"></span>
        <span class="gt-body">
          ${l.length ? `<span class="gt-live">● ${esc(l[0].name)}</span>` : ""}
          <span class="gt-name">${esc(g.name)}</span>
          <span class="gt-info">${f ? `${f} actu${f > 1 ? "s" : ""} récente${f > 1 ? "s" : ""}` : "Voir la méta"}</span>
        </span>
      </button>`;
    }).join("")}</div>
    <button class="home-all ${state.game === "all" ? "active" : ""}" data-action="choose" data-id="all">Tous les jeux</button>
  </section>`;
}

const RENDERERS = { accueil: viewAccueil, actus: viewActus, tournois: viewTournois, tier: viewTier, strats: viewStrats };

// ---------- Rendu & navigation ----------
function renderNav() {
  // Un seul bouton pour le jeu choisi : il ramène à l'écran de choix
  const g = gameById[state.game];
  const art = g && gameArt(g.id);
  document.getElementById("games").innerHTML = state.view === "accueil" ? "" :
    `<button class="current-game" data-action="home" style="--c:${g?.color || "var(--accent)"}">
      <span class="cg-thumb">${art ? `<img src="${esc(art)}" alt="" onerror="this.remove()">` : ""}</span>
      <span class="cg-name">${esc(g?.name || "Tous les jeux")}</span>
      <span class="cg-change">Changer de jeu</span>
    </button>`;
  const navHtml = VIEWS.map(v =>
    `<button class="nav-btn" data-id="${v.id}" aria-current="${state.view === v.id}"><svg viewBox="0 0 24 24" aria-hidden="true">${v.icon}</svg><span>${v.label}</span></button>`).join("");
  document.getElementById("views-top").innerHTML = navHtml;
  document.getElementById("views-bottom").innerHTML = navHtml;
}

function render() {
  renderNav();
  document.getElementById("view").innerHTML = RENDERERS[state.view]();
  const search = document.getElementById("search");
  if (search) search.oninput = e => {
    state.query = e.target.value.trim().toLowerCase();
    const pos = e.target.selectionStart;
    render();
    const s = document.getElementById("search");
    s.focus();
    s.setSelectionRange(pos, pos);
  };
}

function saveHash() {
  const parts = [state.view, state.game];
  if (state.view === "tournois" && state.tournament) parts.push(state.tournament, state.ttab);
  history.replaceState(null, "", "#" + parts.map(encodeURIComponent).join("/"));
}
function readHash() {
  const [view, game, tid, ttab] = location.hash.slice(1).split("/").map(decodeURIComponent);
  if (view === "matchs" || view === "classements") state.view = "tournois";
  else if (RENDERERS[view]) state.view = view;
  if (game === "all" || gameById[game]) state.game = game;
  if (tid) { state.tournament = tid; state.ttab = ttab || "resume"; }
}

function openTournament(id, tab = "resume") {
  Object.assign(state, { view: "tournois", tournament: id, ttab: tab, tstage: null, tteam: "", tfilter: "all", openMatch: null });
  window.scrollTo(0, 0);
}

document.addEventListener("click", e => {
  const tab = e.target.closest(".tab");
  const el = tab || e.target.closest("[data-action], .game-btn, .nav-btn, .ti");
  if (!el || el.tagName === "SELECT") return;
  const action = el.dataset.action;
  const tabGroup = tab?.parentElement.dataset.action;
  if (tabGroup === "type") { state.type = tab.dataset.id; state.limit = 30; }
  else if (tabGroup === "ttab") { state.ttab = tab.dataset.id; state.openMatch = null; }
  else if (el.classList.contains("game-btn")) { state.game = el.dataset.id; state.limit = 30; state.tournament = null; }
  else if (el.classList.contains("nav-btn")) { state.view = el.dataset.id; state.tournament = null; window.scrollTo(0, 0); }
  else if (el.classList.contains("ti")) { el.closest(".tier-card").querySelector(".ti-detail").textContent = el.dataset.note; return; }
  else if (action === "home") { state.view = "accueil"; state.tournament = null; window.scrollTo(0, 0); }
  else if (action === "choose") {
    Object.assign(state, { game: el.dataset.id, view: "actus", tournament: null, limit: 30 });
    try { localStorage.setItem("tm-game", state.game); } catch { /* stockage indisponible */ }
    window.scrollTo(0, 0);
  }
  else if (action === "more") state.limit += 30;
  else if (action === "open-t") openTournament(el.dataset.id, el.dataset.tab);
  else if (action === "close-t") state.tournament = null;
  else if (action === "ttab-go") state.ttab = el.dataset.id;
  else if (action === "toggle-m") state.openMatch = state.openMatch === el.dataset.id ? null : el.dataset.id;
  else if (action === "pick-team") state.tteam = state.tteam === el.dataset.id ? "" : el.dataset.id;
  else if (action === "team-go") { state.tteam = el.dataset.id; state.ttab = "equipes"; }
  else if (action === "collect") { triggerCollect(el); return; }
  else return;
  saveHash();
  render();
});

document.addEventListener("change", e => {
  const action = e.target.dataset.action;
  if (!action) return;
  const v = e.target.value;
  if (action === "tstage") { state.tstage = Number(v); state.openMatch = null; }
  else if (action in state) state[action] = v;
  state.limit = 30;
  render();
});

async function triggerCollect(btn) {
  btn.disabled = true;
  btn.textContent = "Collecte lancée…";
  const r = await fetch("api/collect", { method: "POST" }).catch(() => null);
  if (!r?.ok) btn.textContent = r?.status === 403 ? "Seulement depuis le PC serveur" : "Collecte déjà en cours";
}

function setUpdated() {
  const d = AUTO ? new Date(AUTO.generatedAt) : new Date(UPDATED_AT + "T12:00:00");
  document.getElementById("updated").textContent = "MAJ " + d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: AUTO ? "2-digit" : undefined, minute: AUTO ? "2-digit" : undefined });
}

// Ne redessine pas pendant que l'utilisateur tape une recherche
const safeRender = () => { if (document.activeElement?.id !== "search") render(); };

async function loadData() {
  if (ONLINE) {
    try {
      let r = HAS_SERVER ? await fetch("api/data", { cache: "no-store" }).catch(() => null) : null;
      if (!r?.ok || !r.headers.get("content-type")?.includes("json")) {
        HAS_SERVER = false;
        r = await fetch(`data/auto.json?t=${Date.now()}`, { cache: "no-store" });
      }
      if (r.ok) AUTO = await r.json();
    } catch { /* indisponible : on garde les données actuelles */ }
  } else {
    await new Promise(resolve => {
      const s = document.createElement("script");
      s.src = `data/auto.js?t=${Date.now()}`;
      s.onload = s.onerror = () => { s.remove(); resolve(); };
      document.body.appendChild(s);
    });
    if (window.AUTO) AUTO = window.AUTO;
  }
  dataLoaded = true;
  setUpdated();
}

function connectLive() {
  if (!HAS_SERVER || !window.EventSource || new URLSearchParams(location.search).has("nolive")) {
    // Sans serveur : on regarde toutes les 3 min un petit fichier, et on ne recharge tout que s'il a changé
    return setInterval(async () => {
      const s = ONLINE ? await fetch(`data/status.json?t=${Date.now()}`).then(r => r.json()).catch(() => null) : null;
      if (ONLINE && s?.generatedAt === AUTO?.generatedAt) return;
      await loadData();
      safeRender();
    }, 3 * 60 * 1000);
  }
  const es = new EventSource("api/stream");
  es.addEventListener("status", e => { serverStatus = JSON.parse(e.data); if (state.view === "actus") safeRender(); });
  es.addEventListener("update", async () => { await loadData(); safeRender(); });
}

// Premier lancement : écran de choix du jeu. Ensuite, on revient directement sur le jeu choisi.
let savedGame = null;
try { savedGame = localStorage.getItem("tm-game"); } catch { /* stockage indisponible */ }
if (location.hash) readHash();
else if (savedGame && (savedGame === "all" || gameById[savedGame])) state.game = savedGame;
else state.view = "accueil";
render();
loadData().then(() => { render(); connectLive(); });
loadRosters();
