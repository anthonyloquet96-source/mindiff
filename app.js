/* Tryhard Meta — application cliente (vanilla JS, sans dépendance).
   Promesse : comprendre ce qui change, savoir quoi jouer, suivre la compétition.

   Organisation du fichier :
   1. Configuration et préférences locales      5. Composants communs
   2. Données (chargement, cache, fusion)        6. Écrans
   3. Fiabilité et fraîcheur des contenus        7. Routeur et événements
   4. Utilitaires d'affichage                    8. Démarrage */

// ============================================================ 1. Configuration et préférences

// Jeux affichés pour l'instant (les autres restent collectés mais masqués)
const ENABLED_GAMES = ["lol", "val"];
const GAMES_ON = GAMES.filter(g => ENABLED_GAMES.includes(g.id));
const gameById = Object.fromEntries(GAMES.map(g => [g.id, g]));
const SHORT = { lol: "LoL", val: "Valorant", cs2: "CS2", fn: "Fortnite", rl: "Rocket League", fc: "EA FC" };

const NAV = [
  { id: "home", label: "Accueil", icon: "home" },
  { id: "matchs", label: "Matchs", icon: "trophy" },
  { id: "actus", label: "Actus", icon: "news" },
  { id: "tier", label: "Tier lists", icon: "tiers" },
  { id: "strats", label: "Stratégies", icon: "compass" },
];
const T_TABS = [["situation", "Situation"], ["calendrier", "Calendrier"], ["classement", "Classement"], ["equipes", "Équipes"], ["meta", "Méta pro"]];
const ROLES = [["all", "Tous les rôles"], ["top", "Top"], ["jungle", "Jungle"], ["mid", "Mid"], ["bottom", "ADC"], ["support", "Support"]];
const ROLE_LABEL = Object.fromEntries(ROLES);
const MATCH_STATE = { unstarted: "À venir", inProgress: "En cours", completed: "Terminé", postponed: "Reporté", unneeded: "Annulé" };
const REFRESH_NOTE = "Données actualisées toutes les 30 minutes environ";

const PREF_KEY = "tm-prefs-v1";
function loadPrefs() {
  const base = { game: null, favGames: [], favTeams: [], saved: [], noSpoil: false, visits: {} };
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || "null");
    if (p) return { ...base, ...p };
    const legacy = localStorage.getItem("tm-game"); // ancienne version de l'appli
    if (legacy && gameById[legacy]) base.game = legacy;
  } catch { /* stockage indisponible : préférences de session seulement */ }
  return base;
}
const prefs = loadPrefs();
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* ignoré */ } }
// Date de la visite précédente, figée au démarrage : sert à « nouveau depuis votre dernière visite »
const PREV_VISIT = { ...prefs.visits };
const revealed = new Set(); // résultats dévoilés volontairement en mode sans spoilers (session)

// État d'interface (non persistant)
const ui = {
  type: "all", query: "", sort: "importance", onlyNew: false, limit: 25,
  matchFilter: "next", tstage: null, tteam: "", tfilter: "all", metaRole: "all", metaSort: "picks",
};
let route = { game: null, view: "select", rest: [] };

// ============================================================ 2. Données

let AUTO = null;
let EDITORIAL = { topics: {}, matches: {}, tournaments: {}, briefings: {} };
let dataLoaded = false;
let dataError = null;        // { at, cachedAt } si la dernière synchronisation a échoué
let serverStatus = null;
const ONLINE = location.protocol.startsWith("http");
let HAS_SERVER = ONLINE;     // serveur Node local (API + SSE) ; sur GitHub Pages, bascule sur les fichiers statiques
const CACHE_KEY = "tm-cache-v1";

async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok || !r.headers.get("content-type")?.includes("json")) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function loadData() {
  try {
    if (ONLINE) {
      let auto = null;
      if (HAS_SERVER) auto = await fetchJson("api/data").catch(() => { HAS_SERVER = false; return null; });
      if (!auto) auto = await fetchJson(`data/auto.json?t=${Date.now()}`);
      const ed = await fetchJson(`data/editorial.json?t=${Date.now()}`).catch(() => null);
      AUTO = auto;
      if (ed) EDITORIAL = { topics: {}, matches: {}, tournaments: {}, briefings: {}, ...ed };
      dataError = null;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), auto: AUTO, editorial: EDITORIAL })); } catch { /* quota : pas de cache */ }
    } else {
      await new Promise(resolve => {
        const s = document.createElement("script");
        s.src = `data/auto.js?t=${Date.now()}`;
        s.onload = s.onerror = () => { s.remove(); resolve(); };
        document.body.appendChild(s);
      });
      if (window.AUTO) AUTO = window.AUTO;
    }
  } catch (e) {
    // Échec réseau : on garde les données déjà affichées, ou la dernière copie locale, en le signalant
    dataError = { at: new Date().toISOString(), message: e.message };
    if (!AUTO) {
      try {
        const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (c) { AUTO = c.auto; EDITORIAL = c.editorial; dataError.cachedAt = c.savedAt; }
      } catch { /* pas de cache */ }
    }
  }
  dataLoaded = true;
}

// Fusion : actus collectées + fiches vérifiées à la main (sauf celles qu'un sujet collecté et rédigé remplace)
function allNews() {
  const auto = AUTO?.news || [];
  const autoIds = new Set(auto.filter(n => EDITORIAL.topics?.[n.id]).map(n => n.id));
  const manual = ITEMS.filter(i => !(i.duplicateOf || []).some(id => autoIds.has(id)));
  return [...auto, ...manual].filter(i => ENABLED_GAMES.includes(i.game));
}

function manualTournaments() {
  const autoGames = new Set((AUTO?.tournaments || []).map(t => t.game));
  return EVENTS.filter(ev => !autoGames.has(ev.game)).map(ev => ({
    id: "m-" + ev.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    game: ev.game, manual: true, name: ev.name, league: ev.place, status: "finished", dates: ev.dates, prize: ev.prize,
    verifiedStatus: ev.status, warnings: ev.warnings, asOf: UPDATED_AT,
    stages: [{ name: "Phase finale", sections: [{ name: "Matchs", standings: [], matches: ev.matches.map((m, i) => ({
      id: `${ev.name}-${i}`.replace(/\s+/g, "-"), state: "completed", block: m.stage, maps: m.maps, summary: m.summary,
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
const allTournaments = () => [...(AUTO?.tournaments || []), ...manualTournaments()].filter(t => ENABLED_GAMES.includes(t.game));
const findTournament = id => allTournaments().find(t => t.id === id);
const tMatches = t => t.stages.flatMap(s => s.sections.flatMap(x => x.matches));
const forGame = (list, g = route.game) => list.filter(x => (g === "all" ? ENABLED_GAMES.includes(x.game) : x.game === g));

// ============================================================ 3. Fiabilité et fraîcheur

// Synthèse affichée : rédaction > analyse Claude > fiche vérifiée à la main > texte déjà en français. null = pas encore synthétisé.
function editOf(i) {
  const e = i.id && EDITORIAL.topics?.[i.id];
  if (e) return e;
  const a = i.analysis;
  if (a && typeof a === "object") return { titre: a.titre, resume: a.essentiel, points: a.points_cles, article: [], analyse: a.analyse, impact: a.impact, a_surveiller: a.a_surveiller };
  if (!i.auto) return { titre: i.title, resume: i.summary, points: i.points || [], article: [], analyse: typeof a === "string" ? a : "", impact: i.impact || (i.type === "patch" ? "fort" : "moyen"), manual: true };
  if (i.lang === "fr" && i.summary) return { titre: i.title, resume: i.summary, points: (i.points || []).slice(0, 5), article: [], analyse: "", impact: null, raw: true };
  return null;
}
const keyOf = i => i.id || ("m-" + i.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60));

// Date de publication réelle (et non date de collecte)
const pubDate = i => i.publishedAt || (i.date?.length === 10 ? i.date + "T12:00:00" : i.date);
const isEstimated = i => i.dateEstimated || (i.sources || []).every(s => /actus en jeu/i.test(s.name));

// Nature de l'information : distingue annonce officielle, information rapportée et rumeur
function natureOf(i) {
  if ((i.sources || []).some(s => s.kind === "officiel")) return { label: "Officiel", cls: "official" };
  if (i.status === "contradictoire") return { label: "Sources contradictoires", cls: "bad" };
  if (i.status === "non-confirme") return { label: "Non confirmé", cls: "warn" };
  if (i.status === "confirme") return { label: "Confirmé par plusieurs sources", cls: "" };
  return { label: "Rapporté par un média", cls: "" };
}

// Patch concerné, déduit du titre quand il est explicite (26.20, 13.08, v2.76…)
function patchOf(i, e) {
  if (e?.patch) return e.patch;
  const m = `${e?.titre || ""} ${i.title || ""}`.match(/\b(?:patch|notes de patch|mise à jour)\s*v?(\d{1,2}\.\d{1,2}[a-z]?)\b|\bv?(\d{1,2}\.\d{2})\b(?=.*(?:patch|notes))/i);
  return m ? m[1] || m[2] : null;
}

const IMPACT_SCORE = { fort: 3, moyen: 2, faible: 0 };
function importance(i) {
  const e = editOf(i);
  const age = (Date.now() - new Date(pubDate(i))) / 864e5;
  return (IMPACT_SCORE[e?.impact] ?? 1) + (i.status === "confirme" || natureOf(i).cls === "official" ? 1 : 0) - Math.min(age, 21) / 5;
}
const isNewSinceVisit = (i, g = i.game) => PREV_VISIT[g] && !isEstimated(i) && new Date(pubDate(i)) > new Date(PREV_VISIT[g]);

// Le dernier patch officiel du jeu (notes de patch publiées par l'éditeur)
function latestPatch(g) {
  return forGame(AUTO?.news || [], g)
    .filter(n => n.type === "patch" && natureOf(n).cls === "official" && /notes de patch|patch notes/i.test(n.title))
    .sort((a, b) => pubDate(b).localeCompare(pubDate(a)))[0] || null;
}

// Spoilers : un résultat n'est montré que si le mode est coupé ou si l'utilisateur l'a dévoilé
const hidden = id => prefs.noSpoil && !revealed.has(id);

// ============================================================ 4. Utilitaires d'affichage

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDay = d => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const fmtDate = d => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const fmtTime = d => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const fmtDayTime = d => new Date(d).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const pct = x => (x == null ? "—" : `${Math.round(x * 100)} %`);
function ago(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  if (m < 48 * 60) return `il y a ${Math.round(m / 60)} h`;
  return `il y a ${Math.round(m / 1440)} j`;
}
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; } })();
const href = (...parts) => "#/" + parts.filter(p => p != null && p !== "").map(encodeURIComponent).join("/");

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  trophy: '<path d="M7 4h10v4a5 5 0 0 1-10 0V4zM12 13v4M8 21h8M10 17h4M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/>',
  news: '<path d="M4 5h12v14H6a2 2 0 0 1-2-2V5zM16 9h4v8a2 2 0 0 1-2 2M8 9h4M8 13h4"/>',
  tiers: '<path d="M4 6h2M10 6h10M4 12h2M10 12h7M4 18h2M10 18h4"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  bookmark: '<path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4-6 4V4.5a1 1 0 0 1 1-1z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',
  play: '<path d="M8 5.5v13l10-6.5z"/>',
};
const icon = (name, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

// Médaillons (champions, agents, équipes)
const rosters = { lol: null, val: null };
let lolVersion = "16.20.1";
function initials(name) {
  const words = String(name).replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/);
  return ((words.length > 1 ? words[0][0] + words[1][0] : words[0]?.slice(0, 2)) || "?").toUpperCase();
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
  return `<span class="av ${cls}" aria-hidden="true">${esc(initials(ent.name))}${url ? `<img src="${esc(url)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}</span>`;
}
const champName = id => rosters.lol?.find(c => c.id === id)?.name || id;
const champ = (id, cls = "sm") => avatar("lol", { id, name: champName(id) }, cls);

async function loadRosters() {
  try {
    const versions = await (await fetch("https://ddragon.leagueoflegends.com/api/versions.json")).json();
    lolVersion = versions[0];
    const champs = await (await fetch(`https://ddragon.leagueoflegends.com/cdn/${lolVersion}/data/fr_FR/champion.json`)).json();
    rosters.lol = Object.values(champs.data).map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  } catch (e) { console.warn("Liste des champions indisponible", e); }
  try {
    const res = await (await fetch("https://valorant-api.com/v1/agents?isPlayableCharacter=true")).json();
    rosters.val = res.data.map(a => ({ name: a.displayName, icon: a.displayIcon })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) { console.warn("Liste des agents indisponible", e); }
  render(false);
}

// Visuels : jaquette Steam quand elle existe, sinon l'image d'une actu officielle récente (pas de bannière texte Steam)
const STEAM_ART = { cs2: 730, rl: 252950 };
function gameArt(id) {
  if (STEAM_ART[id]) return `https://cdn.cloudflare.steamstatic.com/steam/apps/${STEAM_ART[id]}/library_600x900_2x.jpg`;
  const official = (AUTO?.news || []).filter(n => n.game === id && n.image && natureOf(n).cls === "official" && !n.image.includes("clan.akamai"));
  return official[0]?.image || null;
}

// ============================================================ 5. Composants communs

const sel = (action, options, value, label) => `<label class="sel"><span class="sr">${esc(label)}</span><select data-action="${action}" aria-label="${esc(label)}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>${icon("down", "sel-ic")}</label>`;
const seg = (action, options, value, label) => `<div class="seg" role="tablist" aria-label="${esc(label)}">${options.map(([v, l]) => `<button role="tab" class="seg-btn" data-action="${action}" data-id="${esc(v)}" aria-selected="${String(v) === String(value)}">${esc(l)}</button>`).join("")}</div>`;
const list = items => items?.length ? `<ul class="bullets">${items.map(p => `<li>${esc(p)}</li>`).join("")}</ul>` : "";
const section = (title, body, extra = "") => body ? `<section class="block"><div class="block-head"><h2 class="eyebrow">${title}</h2>${extra}</div>${body}</section>` : "";
const moreLink = (to, label) => `<a class="more-link" href="${to}">${esc(label)}${icon("chevron")}</a>`;
const emptyState = (title, text = "", action = "") => `<div class="empty"><p class="empty-title">${esc(title)}</p>${text ? `<p class="empty-text">${esc(text)}</p>` : ""}${action}</div>`;
const KIND_LABEL = { officiel: "Officiel", media: "Média", communaute: "Communauté", suspect: "Douteux" };
function sourceList(srcs, extra = "") {
  if (!srcs?.length) return "";
  return `<div class="sources"><p class="sources-title">Sources${extra}</p><ul>${srcs.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener"><span class="src-kind ${s.kind}">${KIND_LABEL[s.kind] || ""}</span>${esc(s.name)}${icon("external", "ext")}</a></li>`).join("")}</ul></div>`;
}
const warningsBox = ws => (ws || []).map(w => `<p class="note warn">${icon("alert")}<span>${esc(w)}</span></p>`).join("");
const chip = (text, cls = "") => text ? `<span class="chip ${cls}">${esc(text)}</span>` : "";

function syncFooter() {
  if (!AUTO) return "";
  const ok = AUTO.sources.filter(s => s.ok).length;
  const failed = AUTO.sources.filter(s => !s.ok);
  return `<footer class="sync">
    <p><span class="dot ${failed.length ? "warn" : "ok"}"></span>Synchronisation des sources ${ago(AUTO.generatedAt)} · ${ok}/${AUTO.sources.length} en ligne${dataError ? " · <b>échec de la dernière mise à jour</b>" : ""}</p>
    <details><summary>Détail des sources</summary><ul>${AUTO.sources.map(s => `<li><span class="dot ${s.ok ? "ok" : "warn"}"></span>${esc(s.name)} <span class="muted">${s.ok ? `${s.count} éléments` : esc(s.error)}${s.keptFrom ? ` · données du ${fmtDay(s.keptFrom)} conservées` : ""}</span></li>`).join("")}</ul>
      <p class="muted">La date de synchronisation indique quand le site a vérifié les sources ; chaque contenu affiche sa propre date de publication.</p>
      ${HAS_SERVER ? `<button class="btn ghost small" data-action="collect">Lancer une collecte</button>` : ""}
    </details>
  </footer>`;
}

function errorBanner() {
  if (!dataError) return "";
  return `<div class="banner warn" role="status">${icon("alert")}<span>Impossible de récupérer les dernières données.${dataError.cachedAt ? ` Affichage de la copie du ${fmtDayTime(dataError.cachedAt)}.` : AUTO ? ` Affichage des données synchronisées ${ago(AUTO.generatedAt)}.` : ""}</span><button class="btn ghost small" data-action="retry">${icon("refresh")}Réessayer</button></div>`;
}

const skeleton = () => `<div class="skeleton" aria-busy="true" aria-label="Chargement"><span class="sk sk-title"></span><span class="sk"></span><span class="sk"></span><span class="sk short"></span><span class="sk-gap"></span><span class="sk"></span><span class="sk"></span></div>`;

// --- Actus

function storyRow(i, { open = false } = {}) {
  const e = editOf(i);
  const k = keyOf(i);
  const g = i.game;
  const nat = natureOf(i);
  const patch = patchOf(i, e);
  const est = isEstimated(i);
  const saved = prefs.saved.includes(k);
  const spoiler = i.type === "esport" && hidden("n-" + k);
  const isNew = isNewSinceVisit(i);
  const meta = [
    route.game === "all" ? esc(gameById[g].name) : "",
    `<span class="nat ${nat.cls}">${nat.label}</span>`,
    patch ? `Patch ${esc(patch)}` : "",
    est ? `vu le ${fmtDay(i.firstSeen || pubDate(i))} · date de publication inconnue` : `<time datetime="${esc(pubDate(i))}">${fmtDay(pubDate(i))}</time>`,
  ].filter(Boolean).join('<span class="sep">·</span>');
  const title = spoiler ? "Résultat masqué" : esc(e.titre);
  return `<article class="story ${open ? "open" : ""}" id="s-${esc(k)}">
    <div class="story-grid">
      <div class="story-main">
        <p class="meta">${isNew ? '<span class="new">Nouveau</span>' : ""}${meta}</p>
        <h3 class="story-title"><a href="${open ? href(route.game, "actus") : href(route.game, "actus", k)}" aria-expanded="${open}">${title}</a></h3>
        ${spoiler ? `<button class="reveal" data-action="reveal" data-id="n-${esc(k)}">${icon("eye")}Afficher ce résultat</button>` : e.resume ? `<p class="dek">${esc(e.resume)}</p>` : ""}
      </div>
      ${i.image && !spoiler ? `<a class="thumb" href="${href(route.game, "actus", k)}" tabindex="-1" aria-hidden="true"><img src="${esc(i.image)}" alt="" loading="lazy" decoding="async" width="104" height="78" onerror="this.parentNode.remove()"></a>` : ""}
    </div>
    <div class="story-actions">
      <a class="text-btn" href="${open ? href(route.game, "actus") : href(route.game, "actus", k)}">${open ? "Réduire" : "Lire la synthèse"}</a>
      <button class="icon-btn ${saved ? "on" : ""}" data-action="save" data-id="${esc(k)}" aria-pressed="${saved}" aria-label="${saved ? "Retirer des enregistrements" : "Enregistrer"}">${icon("bookmark")}</button>
    </div>
    ${open && !spoiler ? storyDetail(i, e) : ""}
  </article>`;
}

function storyDetail(i, e) {
  const facts = [...(e.article || []).map(p => `<p>${esc(p)}</p>`)].join("");
  const edDate = EDITORIAL.topics?.[i.id]?.at;
  return `<div class="story-detail">
    ${facts || e.points?.length ? `<h4 class="eyebrow">Les faits</h4>${facts}${list(e.points)}` : ""}
    ${e.analyse ? `<div class="reading"><h4 class="eyebrow">Notre lecture</h4><p>${esc(e.analyse)}</p><p class="reading-note">Interprétation de la rédaction, fondée sur les sources ci-dessous.</p></div>` : ""}
    ${e.a_surveiller ? `<p class="note">${icon("eye")}<span>À surveiller : ${esc(e.a_surveiller)}</span></p>` : ""}
    ${warningsBox(i.warnings)}
    ${e.raw ? `<p class="note">${icon("alert")}<span>Texte de la source officielle, pas encore synthétisé par la rédaction.</span></p>` : ""}
    ${sourceList(i.sources, ` · publié le ${fmtDate(pubDate(i))}${edDate ? ` · synthèse du ${fmtDay(edDate)}` : ""}`)}
  </div>`;
}

// --- Matchs

function matchSide(m, x) {
  const done = m.state === "completed";
  const show = done && !hidden(m.id);
  return `<span class="team-line ${show && x.outcome === "win" ? "win" : ""}">${avatar("", { name: x.name }, "xs", x.image)}<span class="tn">${esc(x.name)}</span>${show && x.score != null ? `<b class="score">${x.score}</b>` : ""}</span>`;
}
const isFavTeam = name => prefs.favTeams.includes(name);

function matchRow(m, t, { summary = false } = {}) {
  const done = m.state === "completed";
  const when = m.state === "inProgress" ? `<span class="live">En cours</span>`
    : !done && m.start ? `<span class="when-d">${new Date(m.start).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}</span><span>${fmtTime(m.start)}</span>`
    : done && m.start ? `<span class="when-d">${fmtDay(m.start)}</span>` : `<span>${MATCH_STATE[m.state] || "—"}</span>`;
  const hide = done && hidden(m.id);
  const line = summary && done && !hide ? (EDITORIAL.matches?.[m.id]?.resume || autoSummary(m) || m.summary || "") : "";
  const fav = m.teams.some(x => isFavTeam(x.name));
  return `<a class="match-row ${fav ? "fav" : ""}" href="${href(t.game, "tournoi", t.id, "calendrier", m.id)}">
    <span class="when">${when}</span>
    <span class="match-body">
      ${matchSide(m, m.teams[0])}${matchSide(m, m.teams[1])}
      <span class="comp">${esc(t.name)}${m.block ? ` · ${esc(m.block)}` : ""}${m.bo ? ` · Bo${m.bo}` : ""}${hide ? " · score masqué" : ""}</span>
      ${line ? `<span class="match-line">${esc(line)}</span>` : ""}
    </span>
    ${icon("chevron", "row-ic")}
  </a>`;
}

// Résumé factuel calculé à partir des données officielles (toujours disponible)
function autoSummary(m) {
  if (m.state !== "completed") return "";
  const [a, b] = m.teams;
  const w = a.outcome === "win" ? a : b;
  const l = w === a ? b : a;
  let s = `${w.name} bat ${l.name}${w.score != null ? ` ${w.score}–${l.score}` : ""}.`;
  if (m.games?.length && m.verified && w.id) {
    const k = id => m.games.reduce((n, g) => n + (g.kills ? (g.blue.teamId === id ? g.kills.blue : g.kills.red) : 0), 0);
    s += ` ${k(w.id)} kills à ${k(l.id)} sur la série.`;
  }
  return s;
}

// Prestige des compétitions : le Mondial passe avant les ligues régionales et les circuits secondaires
const PRESTIGE = [/^worlds$|champions/i, /^msi$/i, /^first_stand$/i, /^(lck|lpl|lec|lcs|lcp)$/i, /^(cblol-brazil|lfl)$/i];
const prestige = t => { const k = t.leagueSlug || t.name; const i = PRESTIGE.findIndex(re => re.test(k)); return i < 0 ? PRESTIGE.length : i; };
function featuredTournament(ts) {
  return ts.filter(t => t.status === "live").sort((a, b) => prestige(a) - prestige(b))[0] || null;
}
function currentStage(t) {
  const active = t.stages.map((s, i) => [i, s.sections.flatMap(x => x.matches)])
    .filter(([, ms]) => ms.some(m => m.state === "completed" || m.teams.every(x => x.code !== "TBD")));
  return active.length ? active.at(-1)[0] : 0;
}
const nextMatchOf = t => tMatches(t).filter(m => m.state === "unstarted" && m.start && m.teams.every(x => x.code !== "TBD")).sort((a, b) => a.start.localeCompare(b.start))[0];
const tAnalysis = t => EDITORIAL.tournaments?.[t.id] || t.analysis || null;

// ============================================================ 6. Écrans

// --- Choix du jeu
function viewSelect() {
  const games = [...GAMES_ON].sort((a, b) => prefs.favGames.includes(b.id) - prefs.favGames.includes(a.id));
  return `<section class="select">
    <p class="eyebrow">Tryhard Meta</p>
    <h1 class="display" tabindex="-1">Comprendre ce qui change.<br>Savoir quoi jouer.<br><em>Suivre la compétition.</em></h1>
    <div class="game-grid">${games.map(g => {
      const art = gameArt(g.id);
      const p = latestPatch(g.id);
      const live = featuredTournament(allTournaments().filter(t => t.game === g.id));
      const fresh = PREV_VISIT[g.id] ? allNews().filter(n => n.game === g.id && editOf(n) && isNewSinceVisit(n, g.id)).length : 0;
      const fav = prefs.favGames.includes(g.id);
      const signals = [
        live ? `<li><span class="live-dot"></span>${esc(live.name)} en cours</li>` : "",
        p ? `<li>Patch ${esc(patchOf(p, editOf(p)) || "")} · ${fmtDay(pubDate(p))}</li>` : "",
        fresh ? `<li>${fresh} nouveauté${fresh > 1 ? "s" : ""} depuis votre visite</li>` : "",
      ].join("");
      return `<div class="tile">
        <a class="tile-link" href="${href(g.id)}">
          <span class="tile-media">${art ? `<img src="${esc(art)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}</span>
          <span class="tile-body"><span class="tile-name">${esc(g.name)}</span>${signals ? `<ul class="tile-signals">${signals}</ul>` : ""}</span>
        </a>
        <button class="tile-fav icon-btn ${fav ? "on" : ""}" data-action="fav-game" data-id="${g.id}" aria-pressed="${fav}" aria-label="${fav ? "Retirer des favoris" : "Ajouter aux favoris"} : ${esc(g.name)}">${icon("star")}</button>
      </div>`;
    }).join("")}</div>
    <a class="all-games" href="${href("all")}">${icon("grid")}Tous les jeux suivis</a>
    <p class="fine">CS2, Fortnite, Rocket League et EA FC 27 reviendront quand leur couverture sera du même niveau.</p>
  </section>`;
}

// --- Accueil d'un jeu : ce qui a changé et ce qu'il faut savoir avant de jouer
function viewHome() {
  const g = route.game;
  const name = g === "all" ? "Tous les jeux" : gameById[g].name;
  const news = forGame(allNews()).filter(editOf);
  const ts = forGame(allTournaments());
  const lead = featuredTournament(ts);
  const fresh = news.filter(n => isNewSinceVisit(n)).length;

  // À retenir : l'essentiel de la rédaction, sinon les trois sujets les plus importants
  const brief = g !== "all" ? EDITORIAL.briefings?.[g] : null;
  const top3 = [...news].sort((a, b) => importance(b) - importance(a)).slice(0, 3);
  const retenir = brief?.a_retenir?.length
    ? `<ol class="keypoints">${brief.a_retenir.slice(0, 3).map(p => `<li>${esc(p)}</li>`).join("")}</ol><p class="fine">Synthèse de la rédaction · ${fmtDay(brief.at)}</p>`
    : top3.length ? `<ol class="keypoints">${top3.map(i => `<li><a href="${href(g, "actus", keyOf(i))}">${esc(i.type === "esport" && hidden("n-" + keyOf(i)) ? "Résultat masqué" : editOf(i).titre)}</a></li>`).join("")}</ol>` : "";

  // Méta du moment : dernier patch officiel + ce que jouent les pros
  const games = g === "all" ? ENABLED_GAMES : [g];
  const metaHtml = games.map(gg => {
    const p = latestPatch(gg);
    const pe = p && editOf(p);
    const proT = (AUTO?.tournaments || []).filter(t => t.game === gg && t.stats?.totalGames >= 10).sort((a, b) => prestige(a) - prestige(b) || b.stats.totalGames - a.stats.totalGames)[0];
    const pro = proT ? proT.stats.champions.slice(0, 6) : [];
    const ranked = TIERLISTS.find(t => t.game === gg && t.scope === "ranked");
    // Un même champion peut être classé dans deux rôles : on ne l'affiche qu'une fois
    const S = (ranked?.groups.flatMap(gr => gr.tiers.S || []) || []).filter((x, i, arr) => arr.findIndex(y => (y.id || y.name) === (x.id || x.name)) === i).slice(0, 6);
    if (!p && !pro.length && !S.length) return "";
    return `<div class="meta-card">
      ${g === "all" ? `<p class="eyebrow small">${esc(gameById[gg].name)}</p>` : ""}
      ${p ? `<a class="patch" href="${href(gg, "actus", keyOf(p))}">
        <span class="patch-num">${esc(patchOf(p, pe) || "Patch")}</span>
        <span class="patch-body"><span class="patch-title">${esc(pe ? pe.titre : p.title)}</span>
        <span class="fine">Notes officielles · ${fmtDate(pubDate(p))}${pe?.raw ? " · synthèse en attente" : ""}</span>
        ${pe?.analyse ? `<span class="patch-why">${esc(pe.analyse)}</span>` : ""}</span></a>` : ""}
      ${pro.length ? `<div class="pro-strip"><p class="fine">Les plus joués · ${esc(proT.name)} · ${proT.stats.totalGames} parties officielles</p>
        <div class="pro-row">${pro.map(c => `<span class="pro-pick">${champ(c.champ, "")}<span>${esc(champName(c.champ))}</span><span class="fine">${pct(c.presence)}</span></span>`).join("")}</div></div>` : ""}
      ${S.length ? `<div class="pro-strip"><p class="fine">En haut de la tier list ranked · patch ${esc(ranked.patch)}</p>
        <div class="pro-row">${S.map(x => `<span class="pro-pick">${avatar(gg, x)}<span>${esc(x.name)}</span>${x.stat ? `<span class="fine">${esc(x.stat)}</span>` : ""}</span>`).join("")}</div></div>` : ""}
    </div>`;
  }).join("");

  // Compétition : tournoi majeur, matchs en cours et à venir
  const all = ts.flatMap(t => tMatches(t).map(m => ({ m, t })));
  const live = all.filter(x => x.m.state === "inProgress");
  const next = all.filter(x => x.m.state === "unstarted" && x.m.start && x.m.teams.every(tm => tm.code !== "TBD")).sort((a, b) => a.m.start.localeCompare(b.m.start)).slice(0, 3);
  let compHtml = "";
  if (lead || live.length || next.length) {
    const st = lead ? lead.stages[currentStage(lead)] : null;
    compHtml = `${lead ? `<a class="event" href="${href(lead.game, "tournoi", lead.id)}">
        <span class="event-kicker"><span class="live-dot"></span>En cours${st ? ` · ${esc(st.name)}` : ""}</span>
        <span class="event-name">${esc(lead.name)}</span>
        ${lead.progress ? `<span class="progress" aria-label="${lead.progress.done} matchs joués sur ${lead.progress.total}"><span style="width:${Math.round(lead.progress.done / Math.max(lead.progress.total, 1) * 100)}%"></span></span><span class="fine">${lead.progress.done} matchs joués sur ${lead.progress.total}</span>` : ""}
      </a>` : ""}
      <div class="rows">${[...live, ...next].map(x => matchRow(x.m, x.t)).join("")}</div>`;
  }

  const strats = forGame(STRATS).slice(0, 3);
  const stratHtml = strats.length ? `<div class="rows">${strats.map(s => `<a class="link-row" href="${href(s.game, "strats", s.id || "")}"><span><span class="fine">${esc(s.kind)}${s.patch && !/non précisé/.test(s.patch) ? ` · patch ${esc(s.patch)}` : ""}</span><span class="link-row-title">${esc(s.title)}</span></span>${icon("chevron", "row-ic")}</a>`).join("")}</div>` : "";

  const blocks = [
    ["retenir", section("À retenir", retenir)],
    ["meta", section("Méta du moment", metaHtml, moreLink(href(g, "tier"), "Tier lists"))],
    ["comp", section("Compétition", compHtml, moreLink(href(g, "matchs"), "Tous les matchs"))],
    ["strat", section("Analyses et stratégies", stratHtml, moreLink(href(g, "strats"), "Tout voir"))],
  ];
  // Un match en cours passe avant tout le reste
  if (live.length) blocks.unshift(blocks.splice(2, 1)[0]);

  const body = blocks.map(b => b[1]).join("");
  return `<header class="page-head">
      <p class="eyebrow">Accueil</p>
      <h1 class="page-title" tabindex="-1">${esc(name)}</h1>
      ${fresh ? `<a class="since" href="${href(g, "actus")}" data-action="only-new">${fresh} nouveauté${fresh > 1 ? "s" : ""} depuis votre dernière visite (${fmtDay(PREV_VISIT[g])})${icon("chevron")}</a>` : ""}
    </header>
    ${body || emptyState("Rien à signaler pour l'instant", "Aucune information vérifiée n'est disponible pour ce jeu.")}`;
}

// --- Matchs
function viewMatches() {
  const g = route.game;
  const ts = forGame(allTournaments());
  const all = ts.flatMap(t => tMatches(t).map(m => ({ m, t })));
  const known = x => x.m.teams.every(tm => tm.code !== "TBD" && tm.name !== "TBD");
  const filters = [["next", "À venir"], ["done", "Résultats"]];
  if (prefs.favTeams.length) filters.push(["fav", "Mes équipes"]);
  if (!filters.some(f => f[0] === ui.matchFilter)) ui.matchFilter = "next";
  let rows = [];
  if (ui.matchFilter === "next") rows = all.filter(x => (x.m.state === "unstarted" || x.m.state === "inProgress") && x.m.start && known(x)).sort((a, b) => a.m.start.localeCompare(b.m.start)).slice(0, 40);
  else if (ui.matchFilter === "done") rows = all.filter(x => x.m.state === "completed").sort((a, b) => (b.m.start || "").localeCompare(a.m.start || "")).slice(0, 40);
  else rows = all.filter(x => x.m.teams.some(tm => isFavTeam(tm.name))).sort((a, b) => (b.m.start || "").localeCompare(a.m.start || ""));

  // Regroupement par jour (fuseau de l'utilisateur)
  const days = new Map();
  for (const x of rows) {
    const k = x.m.start ? new Date(x.m.start).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "Date non communiquée";
    if (!days.has(k)) days.set(k, []);
    days.get(k).push(x);
  }
  const noAuto = g === "val" || (g === "all" && !all.some(x => x.t.game === "val"));
  const listHtml = rows.length
    ? [...days].map(([d, xs]) => `<h3 class="day">${esc(d)}</h3><div class="rows">${xs.map(x => matchRow(x.m, x.t, { summary: ui.matchFilter !== "next" })).join("")}</div>`).join("")
    : emptyState(ui.matchFilter === "next" ? "Aucun match programmé" : "Aucun résultat",
        g === "val" ? "Le calendrier Valorant n'est pas encore relié à une source automatique fiable. Les résultats des Champions 2026 ont été vérifiés à la main." : ui.matchFilter === "fav" ? "Aucun match pour vos équipes favorites dans les compétitions suivies." : "");

  const tlist = [...ts].sort((a, b) => (a.status === "live" ? 0 : 1) - (b.status === "live" ? 0 : 1) || (b.lastMatch || "").localeCompare(a.lastMatch || ""));
  return `<header class="page-head">
      <p class="eyebrow">Compétition</p>
      <h1 class="page-title" tabindex="-1">Matchs</h1>
      <p class="fine">Horaires dans votre fuseau${TZ ? ` (${esc(TZ)})` : ""} · ${REFRESH_NOTE}${noAuto && g !== "val" ? " · calendrier Valorant non disponible" : ""}</p>
    </header>
    ${seg("match-filter", filters, ui.matchFilter, "Filtrer les matchs")}
    ${listHtml}
    ${section("Compétitions", tlist.length ? `<div class="rows">${tlist.map(tournamentRow).join("")}</div>` : "")}`;
}

function tournamentRow(t) {
  const lbl = { live: "En cours", finished: "Terminé", upcoming: "À venir" }[t.status] || "";
  const p = t.progress ? Math.round((t.progress.done / Math.max(t.progress.total, 1)) * 100) : null;
  return `<a class="link-row" href="${href(t.game, "tournoi", t.id)}">
    <span><span class="link-row-title serif">${esc(t.name)}</span>
    <span class="fine">${route.game === "all" ? `${esc(gameById[t.game].name)} · ` : ""}${esc(t.dates || `${fmtDay(t.startDate)} – ${fmtDay(t.endDate)}`)}${t.manual ? " · vérifié à la main" : ""}</span></span>
    <span class="status ${t.status}">${t.status === "live" ? '<span class="live-dot"></span>' : ""}${lbl}${p != null && t.status === "live" ? ` · ${p} %` : ""}</span>
  </a>`;
}

// --- Actus
function viewNews() {
  const g = route.game;
  const openKey = route.rest[0] || null;
  const TYPES_UI = [["all", "Tout"], ["patch", "Patchs"], ["esport", "Esport"], ["meta", "Méta"], ["annonce", "Annonces"], ["saved", "Enregistrés"]];
  const base = forGame(allNews());
  const pending = base.filter(i => !editOf(i)).length;
  let items = base.filter(editOf);
  if (ui.type === "saved") items = items.filter(i => prefs.saved.includes(keyOf(i)));
  else if (ui.type !== "all") items = items.filter(i => i.type === ui.type);
  if (ui.onlyNew) items = items.filter(i => isNewSinceVisit(i));
  if (ui.query) items = items.filter(i => { const e = editOf(i); return [e.titre, e.resume, ...(e.points || []), ...(e.article || []), e.analyse].join(" ").toLowerCase().includes(ui.query); });
  items.sort(ui.sort === "importance" ? (a, b) => importance(b) - importance(a) : (a, b) => pubDate(b).localeCompare(pubDate(a)));
  // L'article ouvert par lien direct reste visible même s'il est hors des filtres
  if (openKey && !items.some(i => keyOf(i) === openKey)) { const it = base.find(i => keyOf(i) === openKey && editOf(i)); if (it) items.unshift(it); }
  const shown = items.slice(0, ui.limit);
  const freshCount = base.filter(i => editOf(i) && isNewSinceVisit(i)).length;
  return `<header class="page-head">
      <p class="eyebrow">Actualités</p>
      <h1 class="page-title" tabindex="-1">Actus</h1>
    </header>
    <div class="filters">
      ${seg("type", TYPES_UI, ui.type, "Rubrique")}
      <div class="filters-row">
        <label class="search"><span class="sr">Rechercher</span><input type="search" id="search" placeholder="Rechercher un champion, une équipe…" value="${esc(ui.query)}"></label>
        ${sel("sort", [["importance", "Par importance"], ["date", "Plus récentes"]], ui.sort, "Trier")}
      </div>
      ${freshCount ? `<button class="toggle ${ui.onlyNew ? "on" : ""}" data-action="only-new" aria-pressed="${ui.onlyNew}">${freshCount} nouveauté${freshCount > 1 ? "s" : ""} depuis votre visite</button>` : ""}
    </div>
    ${shown.length ? `<div class="stories">${shown.map(i => storyRow(i, { open: keyOf(i) === openKey })).join("")}</div>`
      : emptyState(ui.type === "saved" ? "Aucun article enregistré" : "Aucune actu pour ce filtre", ui.type === "saved" ? "Touchez l'icône d'enregistrement sur un article pour le retrouver ici." : "")}
    ${items.length > shown.length ? `<button class="btn" data-action="more">Afficher plus (${items.length - shown.length})</button>` : ""}
    ${pending ? `<p class="fine">${pending} article${pending > 1 ? "s" : ""} en langue étrangère ou sans résumé ${pending > 1 ? "sont" : "est"} en attente de synthèse et ne ${pending > 1 ? "sont" : "est"} pas encore affiché${pending > 1 ? "s" : ""}.</p>` : ""}`;
}

// --- Tier lists
function tierItem(game, ent, why) {
  return `<button class="ti" data-action="tier-note" data-note="${esc(why)}" aria-label="${esc(ent.name)} : ${esc(why)}">
    ${avatar(game, ent)}<span class="ti-name">${esc(ent.name)}</span>${ent.stat ? `<span class="ti-stat">${esc(ent.stat)}</span>` : ""}
  </button>`;
}
// Tiers S et A visibles, les suivants repliés pour garder la page lisible
function tierRows(entries) {
  const row = ([k, items]) => `<div class="tier"><span class="tl t-${k}">${k}</span><div class="tis">${items.join("")}</div></div>`;
  const filled = entries.filter(([, items]) => items.length);
  const top = filled.filter(([k]) => k === "S" || k === "A");
  const rest = filled.filter(([k]) => k !== "S" && k !== "A");
  const count = rest.reduce((n, [, items]) => n + items.length, 0);
  return `<div class="tiers">${(top.length ? top : filled).map(row).join("")}</div>
    ${top.length && rest.length ? `<details class="more-tiers"><summary>Voir les tiers ${rest.map(([k]) => k).join(" et ")} (${count})${icon("down")}</summary><div class="tiers">${rest.map(row).join("")}</div></details>` : ""}`;
}
function tierHead({ title, scope, patch, context, dated, updated, status, extra = "" }) {
  const stale = updated && (Date.now() - new Date(updated)) / 864e5 > 14;
  return `<div class="list-head">
    <div class="chips">${chip(scope === "pro" ? "Compétition pro" : "Ranked", scope)}${patch ? chip(`Patch ${patch}`) : ""}${status && status !== "confirme" ? `<span class="chip ${natureOf({ status }).cls}">${natureOf({ status }).label}</span>` : ""}</div>
    <h2 class="list-title">${esc(title)}</h2>
    <p class="fine">${esc(context || "")}${dated ? ` · sources du ${esc(dated)}` : ""}${updated ? ` · relevé le ${fmtDay(updated)}` : ""}</p>
    ${stale ? `<p class="note warn">${icon("alert")}<span>Données de plus de deux semaines : la méta a pu évoluer depuis.</span></p>` : ""}
    ${extra}
  </div>`;
}
function viewTier() {
  const g = route.game;
  const proTs = (AUTO?.tournaments || []).filter(t => ENABLED_GAMES.includes(t.game) && t.stats?.totalGames >= 10 && (g === "all" || t.game === g))
    .sort((a, b) => prestige(a) - prestige(b) || b.stats.totalGames - a.stats.totalGames).slice(0, 1);
  const pro = proTs.map(t => {
    const versions = [...new Set(tMatches(t).flatMap(m => (m.games || []).map(x => x.patch)).filter(Boolean))];
    const tiers = { S: [], A: [], B: [], C: [] };
    for (const c of t.stats.champions.filter(c => c.picks >= 3)) {
      const k = c.presence >= 0.25 ? "S" : c.presence >= 0.15 ? "A" : c.presence >= 0.08 ? "B" : "C";
      tiers[k].push([{ id: c.champ, name: champName(c.champ), stat: pct(c.presence) },
        `Joué dans ${pct(c.presence)} des parties (${c.picks} sur ${t.stats.totalGames}), surtout en ${ROLE_LABEL[c.role] || c.role}. ${c.known >= 3 ? `${pct(c.winrate)} de victoires sur ${c.known} parties.` : "Taux de victoire non significatif (moins de 3 parties vérifiées)."}`]);
    }
    return `<section class="tierlist">
      ${tierHead({ title: `Méta pro — ${t.name}`, scope: "pro", patch: null, context: `Calculé sur ${t.stats.totalGames} parties officielles (LoL Esports) · version de jeu ${versions.join(", ") || "inconnue"}`, updated: t.asOf || AUTO.generatedAt,
        extra: `<p class="fine">Classement par présence : S ≥ 25 %, A ≥ 15 %, B ≥ 8 %. Les bans ne sont pas fournis par l'API officielle.</p>` })}
      ${tierRows(Object.entries(tiers).map(([k, e]) => [k, e.map(([x, why]) => tierItem(t.game, x, why))]))}
      <p class="ti-detail" aria-live="polite">Touchez un champion pour voir pourquoi il est classé ici.</p>
      <a class="more-link" href="${href(t.game, "tournoi", t.id, "meta")}">Statistiques complètes${icon("chevron")}</a>
    </section>`;
  }).join("");

  const lists = forGame(TIERLISTS).map(t => {
    const ranked = new Set();
    t.groups.forEach(gr => Object.values(gr.tiers).flat().forEach(e => ranked.add((e.id || e.name).toLowerCase())));
    const roster = t.roster && rosters[t.roster];
    const others = roster ? roster.filter(r => !ranked.has((r.id || r.name).toLowerCase()) && !ranked.has(r.name.toLowerCase())) : [];
    return `<section class="tierlist">
      ${tierHead({ title: t.title, scope: t.scope, patch: t.patch, context: t.context || t.basis, dated: t.sourcesDated, updated: t.updated, status: t.status, extra: t.context ? `<p class="fine">${esc(t.basis)}</p>` : "" })}
      ${t.groups.map(gr => `${t.groups.length > 1 ? `<h3 class="eyebrow small">${esc(gr.name)}</h3>` : ""}
        ${tierRows(Object.entries(gr.tiers).map(([k, ents]) => [k, ents.map(e => tierItem(t.game, e, [e.stat ? `${e.stat} de victoires` : "", e.note].filter(Boolean).join(" · ") || "Classement de la source, sans justification chiffrée."))]))}`).join("")}
      <p class="ti-detail" aria-live="polite">Touchez un élément pour voir pourquoi il est classé ici.</p>
      ${warningsBox(t.warnings)}
      ${t.roster ? `<details class="others"><summary>${roster ? `${others.length} autres non classés : pas assez de données` : "Chargement de la liste complète…"}</summary><div class="tis">${others.map(e => tierItem(t.game, e, "Pas assez de données dans les sources pour le classer.")).join("")}</div></details>` : ""}
      ${sourceList(t.sources)}
    </section>`;
  }).join("");
  return `<header class="page-head"><p class="eyebrow">Méta</p><h1 class="page-title" tabindex="-1">Tier lists</h1>
      <p class="fine">Chaque liste indique son contexte. Aucun taux n'est estimé : ils viennent des sources ou des parties officielles.</p></header>
    ${pro + lists || emptyState("Pas de tier list fiable pour l'instant", "Aucune source vérifiée ne fournit encore de classement exploitable pour ce jeu.")}`;
}

// --- Stratégies
const CONTEXT_ORDER = ["Carte", "Rôles", "Rôle", "Mode", "Niveau"];
function stratCard(s, open) {
  const saved = prefs.saved.includes("st-" + s.id);
  const lineup = (l) => `<div class="lineup">${l.map(x => { const ent = typeof x === "string" ? { name: x } : x; return `<span class="pro-pick">${avatar(s.game, ent)}<span>${esc(ent.name)}</span></span>`; }).join("")}</div>`;
  const ctx = Object.entries(s.context || {}).sort((a, b) => CONTEXT_ORDER.indexOf(a[0]) - CONTEXT_ORDER.indexOf(b[0]));
  const field = (label, html) => html ? `<div class="field"><h4 class="eyebrow small">${label}</h4>${html}</div>` : "";
  return `<article class="strat" id="st-${esc(s.id || "")}">
    <div class="chips">${chip(s.kind)}${chip(s.nature)}${s.patch ? chip(/non précisé/.test(s.patch) ? "Patch non précisé" : `Patch ${s.patch}`) : ""}${s.status && s.status !== "confirme" ? `<span class="chip ${natureOf({ status: s.status }).cls}">${natureOf({ status: s.status }).label}</span>` : ""}</div>
    <h2 class="strat-title">${esc(s.title)}</h2>
    ${ctx.length ? `<dl class="ctx">${ctx.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
    ${s.objectif ? `<p class="lede">${esc(s.objectif)}</p>` : ""}
    ${s.lineup ? lineup(s.lineup) : ""}
    ${field("Quand l'utiliser", s.quand ? `<p>${esc(s.quand)}</p>` : "")}
    ${field("Conditions", list(s.conditions))}
    ${s.maps ? field("Par carte", s.maps.map(m => `<div class="map-row"><b>${esc(m.map)}</b>${lineup(m.lineup)}<p class="fine">${esc(m.note)}</p></div>`).join("")) : ""}
    ${field("Étapes", s.etapes?.length ? `<ol class="steps">${s.etapes.map(x => `<li>${esc(x)}</li>`).join("")}</ol>` : "")}
    ${field("Ce que disent les sources", list(s.faits || s.points))}
    ${field("Erreurs fréquentes", list(s.erreurs))}
    ${field("Limites et réponses adverses", list(s.limites))}
    ${s.lecture || (typeof s.analysis === "string" && s.analysis) ? `<div class="reading"><h4 class="eyebrow">Notre lecture</h4><p>${esc(s.lecture || s.analysis)}</p><p class="reading-note">Interprétation de la rédaction.</p></div>` : ""}
    ${warningsBox(s.warnings)}
    ${sourceList(s.sources, s.updated ? ` · relevé le ${fmtDay(s.updated)}` : "")}
    <div class="story-actions"><span></span>${s.id ? `<button class="icon-btn ${saved ? "on" : ""}" data-action="save" data-id="st-${esc(s.id)}" aria-pressed="${saved}" aria-label="${saved ? "Retirer des enregistrements" : "Enregistrer"}">${icon("bookmark")}</button>` : ""}</div>
  </article>`;
}
function viewStrats() {
  const items = forGame(STRATS);
  return `<header class="page-head"><p class="eyebrow">Jouer mieux</p><h1 class="page-title" tabindex="-1">Stratégies</h1>
      <p class="fine">Fiches construites uniquement à partir de sources citées. Les rubriques sans source ne sont pas affichées.</p></header>
    ${items.length ? `<div class="strats">${items.map(s => stratCard(s)).join("")}</div>` : emptyState("Pas encore de fiche vérifiée", "Aucune stratégie sourcée n'est disponible pour ce jeu.")}`;
}

// --- Enregistrés
function viewSaved() {
  const news = allNews().filter(i => editOf(i) && prefs.saved.includes(keyOf(i)));
  const strats = STRATS.filter(s => ENABLED_GAMES.includes(s.game) && prefs.saved.includes("st-" + s.id));
  return `<header class="page-head"><p class="eyebrow">Sur cet appareil</p><h1 class="page-title" tabindex="-1">Enregistrés</h1>
      <p class="fine">Vos enregistrements restent dans ce navigateur, sans compte.</p></header>
    ${news.length ? section("Articles", `<div class="stories">${news.map(i => storyRow(i)).join("")}</div>`) : ""}
    ${strats.length ? section("Stratégies", `<div class="strats">${strats.map(s => stratCard(s)).join("")}</div>`) : ""}
    ${!news.length && !strats.length ? emptyState("Rien d'enregistré pour l'instant", "Utilisez l'icône d'enregistrement sur un article ou une stratégie.") : ""}`;
}

// --- Tournoi
function viewTournament() {
  const [tid, tabArg, matchId] = route.rest;
  const t = findTournament(tid);
  if (!t) return emptyState("Tournoi introuvable", "Il n'est peut-être plus suivi ou le lien est ancien.", `<a class="btn" href="${href(route.game, "matchs")}">Voir les matchs</a>`);
  const tabs = T_TABS.filter(([id]) => (id !== "meta" || t.stats?.totalGames) && (id !== "equipes" || t.teams?.length) && (id !== "classement" || t.stages.some(s => s.sections.some(x => x.standings?.length)) || t.tables?.length));
  const tab = tabs.some(([id]) => id === tabArg) ? tabArg : "situation";
  if (ui.tstage == null || ui.tstage >= t.stages.length) ui.tstage = currentStage(t);
  if (matchId) { const i = t.stages.findIndex(s => s.sections.some(x => x.matches.some(m => m.id === matchId))); if (i >= 0) ui.tstage = i; }
  const lbl = { live: "En cours", finished: "Terminé", upcoming: "À venir" }[t.status];
  const body = { situation: tSituation, calendrier: tCalendar, classement: tStandings, equipes: tTeams, meta: tMeta }[tab](t, matchId);
  return `<header class="page-head">
      <a class="back" href="${href(route.game, "matchs")}">${icon("back")}Matchs</a>
      <p class="eyebrow">${t.status === "live" ? '<span class="live-dot"></span>' : ""}${lbl}${t.league && t.league !== t.name ? ` · ${esc(t.league)}` : ""}</p>
      <h1 class="page-title" tabindex="-1">${esc(t.name)}</h1>
      <p class="fine">${esc(t.dates || `${fmtDate(t.startDate)} – ${fmtDate(t.endDate)}`)}${t.progress ? ` · ${t.progress.done} matchs joués sur ${t.progress.total}` : ""} · ${t.manual ? `vérifié à la main le ${fmtDay(t.asOf)}` : `données du ${fmtDayTime(t.asOf || AUTO.generatedAt)}`}</p>
      ${t.stale ? `<p class="note warn">${icon("alert")}<span>La source officielle n'a pas répondu à la dernière synchronisation : ces données sont celles du ${fmtDayTime(t.asOf)}.</span></p>` : ""}
    </header>
    <nav class="tabs" aria-label="Sections du tournoi">${tabs.map(([id, l]) => `<a class="tab" href="${href(route.game, "tournoi", t.id, id)}" ${tab === id ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
    ${body}
    ${sourceList(t.sources)}`;
}

function spoilerGate(id, label, html) {
  if (!hidden(id)) return html;
  return `<div class="spoiler-gate"><p>${icon("eyeOff")}<span>${esc(label)} masqué (mode sans spoilers)</span></p><button class="btn ghost small" data-action="reveal" data-id="${esc(id)}">Afficher</button></div>`;
}

function tSituation(t) {
  const a = tAnalysis(t);
  const st = t.stages[currentStage(t)];
  const nxt = nextMatchOf(t);
  const ms = tMatches(t);
  const done = ms.filter(m => m.state === "completed").sort((x, y) => (y.start || "").localeCompare(x.start || ""));
  const upcoming = ms.filter(m => m.state !== "completed" && m.teams.every(x => x.code !== "TBD")).sort((x, y) => (x.start || "").localeCompare(y.start || ""));
  const facts = `<dl class="facts">
    ${st ? `<div><dt>Phase en cours</dt><dd>${esc(st.name)}</dd></div>` : ""}
    ${t.progress ? `<div><dt>Avancement</dt><dd>${t.progress.done} / ${t.progress.total} matchs</dd></div>` : ""}
    ${nxt ? `<div><dt>Prochain match</dt><dd>${esc(nxt.teams[0].name)} – ${esc(nxt.teams[1].name)}<br><span class="fine">${fmtDayTime(nxt.start)}</span></dd></div>` : ""}
  </dl>`;
  const story = a ? spoilerGate("t-" + t.id, "Résumé du tournoi", `<div class="t-story">
      <p class="lede">${esc(a.resume)}</p>
      ${a.faits_marquants?.length ? `<h3 class="eyebrow small">Faits marquants</h3>${list(a.faits_marquants)}` : ""}
      ${a.equipes_en_forme?.length ? `<h3 class="eyebrow small">Forme des équipes</h3>${list(a.equipes_en_forme)}` : ""}
      ${a.meta_pro ? `<h3 class="eyebrow small">Méta pro</h3><p>${esc(a.meta_pro)}</p>` : ""}
      ${a.a_suivre?.length ? `<h3 class="eyebrow small">À suivre</h3>${list(a.a_suivre)}` : ""}
      <p class="fine">${t.manual ? "Synthèse vérifiée à la main" : `Synthèse de la rédaction${EDITORIAL.tournaments?.[t.id]?.at ? ` · ${fmtDayTime(EDITORIAL.tournaments[t.id].at)}` : ""}`} · faits issus des résultats officiels</p>
    </div>`) : "";
  return `${facts}${story}
    ${section("Prochains matchs", upcoming.length ? `<div class="rows">${upcoming.slice(0, 5).map(m => matchRow(m, t)).join("")}</div>` : "")}
    ${section("Derniers résultats", done.length ? `<div class="rows">${done.slice(0, 5).map(m => matchRow(m, t, { summary: true })).join("")}</div>` : "")}
    ${warningsBox(t.warnings)}`;
}

function tCalendar(t, openId) {
  const stages = t.stages.map((s, i) => [i, s.name]);
  const stage = t.stages[ui.tstage];
  const teams = [["", "Toutes les équipes"], ...(t.teams || []).map(x => [x.team, x.team])];
  const filt = m => (ui.tfilter === "all" || (ui.tfilter === "done" ? m.state === "completed" : m.state !== "completed")) && (!ui.tteam || m.teams.some(x => x.name === ui.tteam));
  const ms = stage.sections.flatMap(sec => sec.matches.filter(filt).map(m => ({ m, sec }))).sort((a, b) => (a.m.start || "").localeCompare(b.m.start || ""));
  const body = ms.length ? `<div class="match-cards">${ms.map(({ m, sec }) => matchCard(m, t, m.id === openId, stage.sections.length > 1 ? sec.name : "")).join("")}</div>` : emptyState("Aucun match pour ce filtre");
  return `<div class="filters-row">
      ${stages.length > 1 ? sel("tstage", stages, ui.tstage, "Phase") : ""}
      ${teams.length > 2 ? sel("tteam", teams, ui.tteam, "Équipe") : ""}
      ${sel("tfilter", [["all", "Tous les matchs"], ["done", "Terminés"], ["next", "À venir"]], ui.tfilter, "Statut")}
    </div>${body}`;
}

function matchCard(m, t, open, group) {
  const done = m.state === "completed";
  const status = m.state === "inProgress" ? `<span class="live">En cours</span> <span class="fine">(${REFRESH_NOTE.toLowerCase()})</span>` : esc(MATCH_STATE[m.state] || "Statut inconnu");
  const when = m.start ? fmtDayTime(m.start) : "Horaire non communiqué";
  const hasDetail = done && (m.games?.length || m.maps || m.summary);
  return `<article class="match-card ${open ? "open" : ""}" id="m-${esc(m.id)}">
    <a class="mc-head" href="${open ? href(t.game, "tournoi", t.id, "calendrier") : href(t.game, "tournoi", t.id, "calendrier", m.id)}" aria-expanded="${open}">
      <span class="fine">${group ? `${esc(group)} · ` : ""}${esc(m.block || "")}${m.bo ? ` · Bo${m.bo}` : ""} · ${status} · ${esc(when)}</span>
      ${matchSide(m, m.teams[0])}${matchSide(m, m.teams[1])}
      ${hasDetail ? `<span class="text-btn">${open ? "Réduire" : m.games?.length ? `Résumé, analyse et picks (${m.games.length} parties)` : "Résumé"}</span>` : ""}
    </a>
    ${done && hidden(m.id) ? `<button class="reveal" data-action="reveal" data-id="${esc(m.id)}">${icon("eye")}Afficher le score</button>` : ""}
    ${open && hasDetail ? (hidden(m.id) ? spoilerGate(m.id, "Résultat du match", "") : matchDetail(m)) : ""}
    ${open && !done ? `<div class="mc-detail">${t.sources?.[0] ? `<a class="btn ghost small" href="${esc(t.sources[0].url)}" target="_blank" rel="noopener">${icon("play")}Suivre sur ${esc(t.sources[0].name)}</a>` : ""}</div>` : ""}
  </article>`;
}

function matchDetail(m) {
  const e = EDITORIAL.matches?.[m.id];
  const story = `<div class="m-story">
    <h4 class="eyebrow small">Résumé</h4><p>${esc(e?.resume || m.summary || autoSummary(m))}</p>
    ${e?.cles?.length ? `<h4 class="eyebrow small">Moments clés</h4>${list(e.cles)}` : ""}
    ${e?.analyse ? `<div class="reading"><h4 class="eyebrow small">Analyse esport</h4><p>${esc(e.analyse)}</p><p class="reading-note">Interprétation de la rédaction à partir des picks, kills et scores officiels.</p></div>` : `<p class="fine">Analyse en cours de rédaction. Le résumé ci-dessus est calculé à partir des données officielles.</p>`}
  </div>`;
  if (m.maps) return `<div class="mc-detail">${story}<h4 class="eyebrow small">Cartes</h4><div class="maps">${m.maps.map(([n, x, y]) => `<span>${esc(n)} <b>${x}–${y}</b></span>`).join("")}</div></div>`;
  if (!m.games?.length) return `<div class="mc-detail">${story}</div>`;
  const name = id => m.teams.find(x => x.id === id)?.name || "?";
  return `<div class="mc-detail">${story}
    <h4 class="eyebrow small">Partie par partie</h4>
    ${m.verified === false ? `<p class="note warn">${icon("alert")}<span>Vainqueur de chaque partie non vérifié : le décompte ne correspond pas au score officiel.</span></p>` : ""}
    ${m.games.map(g => `<div class="game">
      <p class="game-head"><b>Partie ${g.n}</b>${g.winnerTeamId ? ` · victoire ${esc(name(g.winnerTeamId))}` : ""}${g.kills ? ` · ${g.kills.blue}–${g.kills.red} kills` : ""}${g.patch ? ` · version ${esc(g.patch)}` : ""}
        ${g.vod ? `<a class="vod" href="${esc(g.vod)}" target="_blank" rel="noopener">${icon("play")}Revoir</a>` : ""}</p>
      ${["blue", "red"].map(sd => `<div class="pick-row ${g.winnerTeamId === g[sd].teamId ? "win" : ""}">
        <span class="side">${esc(name(g[sd].teamId))}</span>
        <span class="picks">${g[sd].picks.map(p => `<span class="pk" title="${esc(p.player)} · ${esc(champName(p.champ))} · ${esc(ROLE_LABEL[p.role] || p.role)}">${champ(p.champ, "xs")}<small>${esc(p.player.replace(/^\S+\s/, ""))}</small></span>`).join("")}</span>
      </div>`).join("")}
    </div>`).join("")}
  </div>`;
}

function tStandings(t) {
  const tables = t.stages.flatMap(s => s.sections.filter(x => x.standings?.length).map(x => ({ title: s.sections.length > 1 ? `${s.name} · ${x.name}` : s.name, rows: x.standings })));
  const html = tables.map(tb => `<section class="block"><h2 class="eyebrow">${esc(tb.title)}</h2><div class="table-wrap"><table>
    <thead><tr><th scope="col">#</th><th scope="col">Équipe</th><th scope="col">Bilan</th>${tb.rows.some(r => r.gw != null) ? '<th scope="col">Parties</th>' : ""}</tr></thead>
    <tbody>${tb.rows.map((r, i) => `<tr><td>${r.rank ?? i + 1}</td><td><a class="cell-team" href="${href(t.game, "tournoi", t.id, "equipes")}" data-action="pick-team" data-id="${esc(r.team)}">${avatar("", { name: r.team }, "xs", r.image)}${esc(r.team)}${isFavTeam(r.team) ? icon("star", "fav-ic") : ""}</a></td><td><b>${r.w}–${r.l}</b></td>${r.gw != null ? `<td class="muted">${r.gw}–${r.gl}</td>` : ""}</tr>`).join("")}</tbody>
  </table></div></section>`).join("");
  const manual = (t.tables || []).map(tb => `<section class="block"><h2 class="eyebrow">${esc(tb.title)}</h2><div class="table-wrap"><table><thead><tr>${tb.columns.map(c => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>${tb.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${sourceList(tb.sources)}</section>`).join("");
  return spoilerGate("t-" + t.id, "Classement", (html + manual) || emptyState("Pas de classement disponible"));
}

function tTeams(t) {
  const selT = ui.tteam && t.teams.find(x => x.team === ui.tteam);
  const grid = `<div class="team-grid">${t.teams.map(x => `<button class="team-card ${ui.tteam === x.team ? "on" : ""}" data-action="pick-team" data-id="${esc(x.team)}" aria-pressed="${ui.tteam === x.team}">
    ${avatar("", { name: x.team }, "", x.image)}<span>${esc(x.team)}</span>${isFavTeam(x.team) ? icon("star", "fav-ic") : ""}</button>`).join("")}</div>`;
  if (!selT) return `<p class="fine">Choisissez une équipe pour voir ses matchs et les champions de ses joueurs. L'étoile l'ajoute à vos équipes favorites.</p>${grid}`;
  const ms = tMatches(t).filter(m => m.teams.some(x => x.name === selT.team)).sort((a, b) => (b.start || "").localeCompare(a.start || ""));
  const players = (t.stats?.players || []).filter(p => p.team === selT.team).sort((a, b) => ROLES.findIndex(r => r[0] === a.role) - ROLES.findIndex(r => r[0] === b.role));
  const fav = isFavTeam(selT.team);
  return `${grid}
    <section class="team-detail">
      <div class="team-head">${avatar("", { name: selT.team }, "lg", selT.image)}<div><h2 class="list-title">${esc(selT.team)}</h2>
        <p class="fine">${hidden("t-" + t.id) ? "Bilan masqué (mode sans spoilers)" : `Bilan ${selT.w}–${selT.l}${selT.gw != null ? ` · parties ${selT.gw}–${selT.gl}` : ""}`}</p></div>
        <button class="icon-btn ${fav ? "on" : ""}" data-action="fav-team" data-id="${esc(selT.team)}" aria-pressed="${fav}" aria-label="${fav ? "Retirer des équipes favorites" : "Ajouter aux équipes favorites"}">${icon("star")}</button></div>
      ${players.length ? `<h3 class="eyebrow small">Champions joués</h3><div class="players">${players.map(p => `<div class="player"><span class="fine">${esc(ROLE_LABEL[p.role] || p.role)}</span><b>${esc(p.player)}</b>
        <span class="picks">${Object.entries(p.champs).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<span class="pk" title="${esc(champName(c))} · ${n} partie(s)">${champ(c, "xs")}<small>×${n}</small></span>`).join("")}</span></div>`).join("")}</div>` : ""}
      <h3 class="eyebrow small">Matchs</h3><div class="rows">${ms.map(m => matchRow(m, t)).join("")}</div>
    </section>`;
}

function tMeta(t) {
  const s = t.stats;
  let rows = s.champions.filter(c => ui.metaRole === "all" || c.role === ui.metaRole);
  const key = { picks: c => -c.picks, presence: c => -c.presence, winrate: c => -(c.known >= 3 ? c.winrate : -1) }[ui.metaSort];
  rows = [...rows].sort((a, b) => key(a) - key(b));
  const unverified = tMatches(t).filter(m => m.verified === false).length;
  return `<p class="fine">${s.totalGames} parties officielles. Présence = part des parties où le champion est joué (les bans ne sont pas fournis). Taux de victoire affiché à partir de 3 parties vérifiées.</p>
    ${unverified ? `<p class="note warn">${icon("alert")}<span>${unverified} match(s) exclus des taux de victoire : vainqueur des parties non vérifiable.</span></p>` : ""}
    <div class="filters-row">${sel("metaRole", ROLES, ui.metaRole, "Rôle")}${sel("metaSort", [["picks", "Plus joués"], ["presence", "Présence"], ["winrate", "Taux de victoire"]], ui.metaSort, "Trier")}</div>
    <div class="table-wrap"><table class="meta-table">
      <thead><tr><th scope="col">Champion</th><th scope="col">Rôle</th><th scope="col">Picks</th><th scope="col">Présence</th><th scope="col">Victoires</th></tr></thead>
      <tbody>${rows.map(c => `<tr>
        <td><span class="cell-team">${champ(c.champ, "xs")}${esc(champName(c.champ))}</span></td>
        <td class="muted">${esc(ROLE_LABEL[c.role] || c.role)}</td><td>${c.picks}</td>
        <td><span class="bar"><span style="width:${Math.round(c.presence * 100)}%"></span></span>${pct(c.presence)}</td>
        <td>${c.known >= 3 && !hidden("t-" + t.id) ? `${pct(c.winrate)} <span class="muted">(${c.known})</span>` : '<span class="muted">—</span>'}</td>
      </tr>`).join("")}</tbody></table></div>`;
}

// ============================================================ 7. Routeur, rendu et événements

function parseRoute() {
  const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const parts = raw.split("/").filter(Boolean);
  // Anciennes adresses (#tournois/lol/… , #actus/val…)
  const LEGACY = { tournois: "matchs", matchs: "matchs", classements: "matchs", actus: "actus", tier: "tier", strats: "strats", accueil: null };
  if (parts[0] in LEGACY) {
    const [v, g, tid, tab] = parts;
    if (v === "accueil" || !g) return { game: null, view: "select", rest: [] };
    if (v === "tournois" && tid) return { game: g, view: "tournoi", rest: [tid, tab === "resume" ? "situation" : tab === "matchs" ? "calendrier" : tab] };
    return { game: g, view: LEGACY[v], rest: [] };
  }
  const [g, view = "home", ...rest] = parts;
  if (!g || !(g === "all" || ENABLED_GAMES.includes(g))) return { game: null, view: "select", rest: [] };
  return { game: g, view: ["home", "matchs", "actus", "tier", "strats", "tournoi", "enregistres"].includes(view) ? view : "home", rest };
}

const VIEWS = { select: viewSelect, home: viewHome, matchs: viewMatches, actus: viewNews, tier: viewTier, strats: viewStrats, tournoi: viewTournament, enregistres: viewSaved };

function renderHeader() {
  const g = route.game ? gameById[route.game] : null;
  const art = g && gameArt(g.id);
  const navView = route.view === "tournoi" ? "matchs" : route.view;
  const navItems = NAV.map(n => `<a class="nav-item" href="${href(route.game, n.id === "home" ? "" : n.id)}" ${navView === n.id ? 'aria-current="page"' : ""}>${icon(n.icon)}<span>${n.label}</span></a>`).join("");
  document.getElementById("top").innerHTML = `<div class="wrap top-inner">
      <a class="brand" href="${route.game ? href(route.game) : "#/"}" aria-label="Tryhard Meta, accueil">Tryhard <span>Meta</span></a>
      ${route.game ? `<a class="switch" href="#/" aria-label="Changer de jeu (actuel : ${esc(g?.name || "tous les jeux")})">
        <span class="switch-thumb">${art ? `<img src="${esc(art)}" alt="" width="22" height="22" onerror="this.remove()">` : icon("grid")}</span>
        <span class="switch-name"><span class="long">${esc(g?.name || "Tous les jeux")}</span><span class="short">${esc(SHORT[g?.id] || "Tous")}</span></span>${icon("down")}</a>` : ""}
      <div class="top-actions">
        <button class="icon-btn ${prefs.noSpoil ? "on" : ""}" data-action="spoil" aria-pressed="${prefs.noSpoil}" title="${prefs.noSpoil ? "Mode sans spoilers activé" : "Activer le mode sans spoilers"}" aria-label="Mode sans spoilers">${icon(prefs.noSpoil ? "eyeOff" : "eye")}</button>
        ${route.game ? `<a class="icon-btn" href="${href(route.game, "enregistres")}" aria-label="Enregistrés" ${route.view === "enregistres" ? 'aria-current="page"' : ""}>${icon("bookmark")}</a>` : ""}
      </div>
    </div>
    ${route.game ? `<nav class="wrap nav-top" aria-label="Rubriques">${navItems}</nav>` : ""}`;
  const bottom = document.getElementById("bottom");
  bottom.innerHTML = route.game ? navItems : "";
  bottom.hidden = !route.game;
  document.body.classList.toggle("has-nav", !!route.game);
}

function render(fromRoute = true) {
  renderHeader();
  const main = document.getElementById("view");
  const needsData = route.view !== "select" || !dataLoaded;
  main.innerHTML = !dataLoaded && needsData ? skeleton()
    : !AUTO && route.view !== "select" ? emptyState("Données indisponibles", "La connexion aux données a échoué et aucune copie locale n'existe encore.", `<button class="btn" data-action="retry">Réessayer</button>`)
    : errorBanner() + VIEWS[route.view]() + (route.view !== "select" ? syncFooter() : "");
  const search = document.getElementById("search");
  if (search) search.oninput = e => {
    ui.query = e.target.value.trim().toLowerCase();
    const pos = e.target.selectionStart;
    render(false);
    const s = document.getElementById("search");
    s.focus();
    s.setSelectionRange(pos, pos);
  };
  if (fromRoute) {
    // Ouverture d'un article ou d'un match par lien direct : on fait défiler jusqu'à lui ; sinon, haut de page
    const target = route.view === "actus" && route.rest[0] ? document.getElementById("s-" + route.rest[0])
      : route.view === "tournoi" && route.rest[2] ? document.getElementById("m-" + route.rest[2])
      : route.view === "strats" && route.rest[0] ? document.getElementById("st-" + route.rest[0]) : null;
    if (target) target.scrollIntoView({ block: "start" });
    else window.scrollTo(0, 0);
    document.querySelector("[tabindex='-1'].page-title, [tabindex='-1'].display")?.focus({ preventScroll: true });
  }
}

function onRoute() {
  const prev = route;
  route = parseRoute();
  // Changement de jeu : on mémorise le choix et la date de visite (la précédente reste utilisée pendant la session)
  if (route.game && route.game !== prefs.game) { prefs.game = route.game; }
  if (route.game) { prefs.visits[route.game] = new Date().toISOString(); savePrefs(); }
  if (prev.game !== route.game || prev.rest[0] !== route.rest[0] && route.view === "tournoi") { ui.tstage = null; ui.tteam = ""; ui.tfilter = "all"; }
  if (prev.view !== route.view) ui.limit = 25;
  const sameList = prev.view === route.view && route.view === "actus";
  render(!sameList || !!route.rest[0]);
}
window.addEventListener("hashchange", onRoute);

document.addEventListener("click", e => {
  const el = e.target.closest("[data-action]");
  if (!el || el.tagName === "SELECT") return;
  const id = el.dataset.id;
  switch (el.dataset.action) {
    case "spoil": prefs.noSpoil = !prefs.noSpoil; savePrefs(); revealed.clear(); break;
    case "reveal": revealed.add(id); break;
    case "fav-game": prefs.favGames = prefs.favGames.includes(id) ? prefs.favGames.filter(x => x !== id) : [...prefs.favGames, id]; savePrefs(); break;
    case "fav-team": prefs.favTeams = prefs.favTeams.includes(id) ? prefs.favTeams.filter(x => x !== id) : [...prefs.favTeams, id]; savePrefs(); break;
    case "save": prefs.saved = prefs.saved.includes(id) ? prefs.saved.filter(x => x !== id) : [...prefs.saved, id]; savePrefs(); break;
    case "type": ui.type = id; ui.limit = 25; break;
    case "match-filter": ui.matchFilter = id; break;
    case "only-new": ui.onlyNew = !ui.onlyNew; if (el.tagName === "A") { ui.onlyNew = true; return; } break;
    case "more": ui.limit += 25; break;
    case "pick-team": if (el.tagName === "A") { ui.tteam = id; return; } ui.tteam = ui.tteam === id ? "" : id; break;
    case "tier-note": el.closest(".tierlist").querySelector(".ti-detail").textContent = `${el.querySelector(".ti-name").textContent} : ${el.dataset.note}`; return;
    case "skip": document.getElementById("view").focus(); return;
    case "retry": dataLoaded = false; render(false); loadData().then(() => render(false)); return;
    case "collect": triggerCollect(el); return;
    default: return;
  }
  e.preventDefault();
  render(false);
});

document.addEventListener("change", e => {
  const action = e.target.dataset.action;
  if (!action) return;
  const v = e.target.value;
  if (action === "tstage") ui.tstage = Number(v);
  else if (action in ui) ui[action] = v;
  ui.limit = 25;
  render(false);
});

async function triggerCollect(btn) {
  btn.disabled = true;
  btn.textContent = "Collecte lancée…";
  const r = await fetch("api/collect", { method: "POST" }).catch(() => null);
  if (!r?.ok) btn.textContent = r?.status === 403 ? "Possible seulement depuis l'ordinateur serveur" : "Collecte déjà en cours";
}

// Ne redessine pas pendant que l'utilisateur tape une recherche
const safeRender = () => { if (document.activeElement?.id !== "search") render(false); };

function connectLive() {
  if (!HAS_SERVER || !window.EventSource || new URLSearchParams(location.search).has("nolive")) {
    // Hébergement statique : on consulte un petit fichier toutes les 3 min et on ne recharge que s'il a changé
    return setInterval(async () => {
      const s = ONLINE ? await fetch(`data/status.json?t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()).catch(() => null) : null;
      if (ONLINE && s?.generatedAt === AUTO?.generatedAt) return;
      await loadData();
      safeRender();
    }, 3 * 60 * 1000);
  }
  const es = new EventSource("api/stream");
  es.addEventListener("status", e => { serverStatus = JSON.parse(e.data); });
  es.addEventListener("update", async () => { await loadData(); safeRender(); });
}

// ============================================================ 8. Démarrage

// Sans adresse : on reprend le dernier jeu choisi, sinon l'écran de choix
if (!location.hash && prefs.game && (prefs.game === "all" || ENABLED_GAMES.includes(prefs.game))) history.replaceState(null, "", href(prefs.game));
route = parseRoute();
render();
loadData().then(() => { onRoute(); connectLive(); });
loadRosters();
