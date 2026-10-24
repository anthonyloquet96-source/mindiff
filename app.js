/* MINDIFF — application cliente (JavaScript sans dépendance, compatible GitHub Pages).

   1. Configuration et préférences       5. Composants
   2. Données                            6. Écrans
   3. Fiabilité, fraîcheur, entités      7. Panneaux (fiche, sources)
   4. Utilitaires d'affichage            8. Routeur, événements, démarrage */

// ============================================================ 1. Configuration et préférences

const ENABLED_GAMES = ["lol", "val"]; // les autres jeux restent collectés mais ne sont pas affichés
const GAMES_ON = GAMES.filter(g => ENABLED_GAMES.includes(g.id));
const gameById = Object.fromEntries(GAMES.map(g => [g.id, g]));
const SHORT = { lol: "LoL", val: "Valorant", cs2: "CS2", fn: "Fortnite", rl: "Rocket League", fc: "EA FC" };
// Jeux visibles mais verrouillés : MINDIFF se concentre sur League of Legends, on laisse entrevoir la suite
const LOCKED = ["val"];
const SOON = [["val", "Valorant"], ["cs2", "Counter-Strike 2"], ["fn", "Fortnite"], ["rl", "Rocket League"], ["fc", "EA FC"]];

const NAV = [
  { id: "home", label: "Accueil", icon: "home" },
  { id: "competitions", label: "Compétitions", icon: "trophy" },
  { id: "coach", label: "Coach", icon: "target" }, // au centre, mis en avant dans la barre du bas
  { id: "meta", label: "Méta", icon: "tiers" },
  { id: "actus", label: "Actus", icon: "news" },
];
const T_TABS = [["apercu", "Vue d'ensemble"], ["matchs", "Matchs"], ["classement", "Classement"], ["equipes", "Équipes"], ["meta", "Méta"]];
const LOL_ROLES = [["top", "Top"], ["jungle", "Jungle"], ["mid", "Mid"], ["bottom", "ADC"], ["support", "Support"]];
const ROLE_LABEL = Object.fromEntries(LOL_ROLES);
const MATCH_STATE = { unstarted: "À venir", inProgress: "En cours", completed: "Terminé", postponed: "Reporté", unneeded: "Annulé" };
const VAL_ROLE_FR = { Duelist: "Duelliste", Initiator: "Initiateur", Controller: "Contrôleur", Sentinel: "Sentinelle" };

const PREF_KEY = "tm-prefs-v1";
function loadPrefs() {
  const base = { game: null, favGames: [], favTeams: [], saved: [], noSpoil: false, visits: {}, tz: null, theme: "auto" };
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || "null");
    if (p) return { ...base, ...p };
    const legacy = localStorage.getItem("tm-game");
    if (legacy && gameById[legacy]) base.game = legacy;
  } catch { /* stockage indisponible */ }
  return base;
}
const prefs = loadPrefs();
// Thème : « auto » suit le téléphone ; « light » / « dark » forcent le thème (attribut data-theme lu par la feuille de style)
const THEMES = { auto: ["contrast", "Thème : automatique, comme le téléphone. Toucher pour passer en clair"], light: ["sun", "Thème : clair. Toucher pour passer en sombre"], dark: ["moon", "Thème : sombre. Toucher pour revenir en automatique"] };
function applyTheme() {
  const t = prefs.theme === "light" || prefs.theme === "dark" ? prefs.theme : null;
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  const dark = t ? t === "dark" : !matchMedia("(prefers-color-scheme: light)").matches;
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) m.content = dark ? "#000000" : "#f2f2f7";
}
applyTheme();
matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", applyTheme);
function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* ignoré */ } }
const PREV_VISIT = { ...prefs.visits };
const revealed = new Set();

// État d'interface (non persistant)
const ui = {
  tFilter: null, day: null, comp: "", favOnly: false,
  metaScope: null, metaRole: "all",
  newsType: "all", query: "", limit: 20,
  stratKind: "all",
  tStage: null, tMetaRole: "all", tMetaSort: "picks",
};
let route = { game: null, view: "select", rest: [], sheet: null };

// ============================================================ 2. Données

let AUTO = null;
let EDITORIAL = { topics: {}, matches: {}, tournaments: {}, briefings: {} };
let dataLoaded = false;
let dataError = null;
const ONLINE = location.protocol.startsWith("http");
let HAS_SERVER = ONLINE && !/\.github\.io$/.test(location.hostname);
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
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), auto: AUTO, editorial: EDITORIAL })); } catch { /* quota */ }
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
    dataError = { at: new Date().toISOString(), message: e.message };
    if (!AUTO) {
      try {
        const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (c) { AUTO = c.auto; EDITORIAL = c.editorial; dataError.cachedAt = c.savedAt; }
      } catch { /* pas de cache */ }
    }
  }
  await loadCoach();
  dataLoaded = true;
}

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
    teams: [],
    tables: STANDINGS.filter(s => s.game === ev.game && s.title.toLowerCase().startsWith(ev.name.toLowerCase().split(" ").slice(0, 2).join(" "))),
    analysis: { resume: ev.summary, faits_marquants: [], equipes_en_forme: [], meta_pro: "", a_suivre: [] },
    sources: ev.sources,
  }));
}
const allTournaments = () => [...(AUTO?.tournaments || []), ...manualTournaments()].filter(t => ENABLED_GAMES.includes(t.game));
const findTournament = id => allTournaments().find(t => t.id === id);
const tMatches = t => t.stages.flatMap(s => s.sections.flatMap(x => x.matches));
const forGame = (list, g = route.game) => list.filter(x => (g === "all" ? ENABLED_GAMES.includes(x.game) : x.game === g));
const known = m => m.teams.every(x => x.code !== "TBD" && x.name !== "TBD");

// ============================================================ 3. Fiabilité, fraîcheur, entités

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
const pubDate = i => i.publishedAt || (i.date?.length === 10 ? i.date + "T12:00:00" : i.date);
const isEstimated = i => i.dateEstimated || (i.sources || []).every(s => /actus en jeu/i.test(s.name));
function natureOf(i) {
  if ((i.sources || []).some(s => s.kind === "officiel")) return { label: "Officiel", cls: "official" };
  if (i.status === "contradictoire") return { label: "Contradictoire", cls: "bad" };
  if (i.status === "non-confirme") return { label: "Non confirmé", cls: "warn" };
  if (i.status === "confirme") return { label: "Confirmé", cls: "" };
  return { label: "Média", cls: "" };
}
function patchOf(i, e) {
  if (e?.patch) return e.patch;
  const m = `${e?.titre || ""} ${i.title || ""}`.match(/\b(?:patch|notes de patch|mise à jour)\s*v?(\d{1,2}\.\d{1,2}[a-z]?)\b/i);
  return m ? m[1] : null;
}
const TYPE_LABEL = { patch: "Patch", esport: "Esport", meta: "Méta", annonce: "Annonce" };
const IMPACT_SCORE = { fort: 3, moyen: 2, faible: 0 };
function importance(i) {
  const e = editOf(i);
  const age = (Date.now() - new Date(pubDate(i))) / 864e5;
  return (IMPACT_SCORE[e?.impact] ?? 1) + (i.status === "confirme" || natureOf(i).cls === "official" ? 1 : 0) - Math.min(age, 21) / 5;
}
const isNewSinceVisit = (i, g = i.game) => PREV_VISIT[g] && !isEstimated(i) && new Date(pubDate(i)) > new Date(PREV_VISIT[g]);
function latestPatch(g) {
  return forGame(AUTO?.news || [], g)
    .filter(n => n.type === "patch" && natureOf(n).cls === "official" && /notes de patch|patch notes/i.test(n.title))
    .sort((a, b) => pubDate(b).localeCompare(pubDate(a)))[0] || null;
}
const hidden = id => prefs.noSpoil && !revealed.has(id);

// Prestige des compétitions : le Mondial passe avant les ligues régionales
const PRESTIGE = [/^worlds$|champions/i, /^msi$/i, /^first_stand$/i, /^(lck|lpl|lec|lcs|lcp)$/i, /^(cblol-brazil|lfl)$/i];
const prestige = t => { const k = t.leagueSlug || t.name; const i = PRESTIGE.findIndex(re => re.test(k)); return i < 0 ? PRESTIGE.length : i; };
function featuredTournament(ts) {
  const live = ts.filter(t => t.status === "live").sort((a, b) => prestige(a) - prestige(b));
  if (live[0]) return live[0];
  const up = ts.filter(t => t.status === "upcoming").sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
  return up[0] || [...ts].sort((a, b) => prestige(a) - prestige(b))[0] || null;
}
function currentStage(t) {
  const active = t.stages.map((s, i) => [i, s.sections.flatMap(x => x.matches)])
    .filter(([, ms]) => ms.some(m => m.state === "completed" || known(m)));
  return active.length ? active.at(-1)[0] : 0;
}
const nextMatchOf = t => tMatches(t).filter(m => (m.state === "unstarted" || m.state === "inProgress") && m.start && known(m)).sort((a, b) => (a.state === "inProgress" ? -1 : 0) - (b.state === "inProgress" ? -1 : 0) || a.start.localeCompare(b.start))[0];
const tAnalysis = t => EDITORIAL.tournaments?.[t.id] || t.analysis || null;
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

// Entités : champions (LoL, identifiant Data Dragon) et agents (Valorant, nom)
const rosters = { lol: null, val: null };
let lolVersion = "16.20.1";
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
function entity(game, key) {
  if (game === "lol") {
    const c = rosters.lol?.find(x => x.id === key || norm(x.name) === norm(key));
    return { game, key: c?.id || key, name: c?.name || key, img: `https://ddragon.leagueoflegends.com/cdn/${lolVersion}/img/champion/${c?.id || key}.png`, sub: c?.tags?.join(" · ") || "" };
  }
  const a = rosters.val?.find(x => norm(x.name) === norm(key));
  return { game, key: a?.name || key, name: a?.name || key, img: a?.icon || null, portrait: a?.portrait || null, sub: VAL_ROLE_FR[a?.role] || a?.role || "" };
}
const entKey = x => (typeof x === "string" ? x : x.id || x.name);

// Classements où l'entité apparaît (tier lists sourcées + méta pro calculée)
function tierPlacements(game, key) {
  const out = [];
  for (const t of TIERLISTS.filter(t => t.game === game)) {
    for (const gr of t.groups) for (const [tier, ents] of Object.entries(gr.tiers)) for (const e of ents) {
      if (norm(e.id || e.name) === norm(key)) out.push({ list: t, group: gr.name, tier, e });
    }
  }
  return out;
}
function proStats(game, key) {
  return (AUTO?.tournaments || []).filter(t => t.game === game && t.stats?.totalGames)
    .map(t => ({ t, c: t.stats.champions.find(c => norm(c.champ) === norm(key)) })).filter(x => x.c)
    .sort((a, b) => prestige(a.t) - prestige(b.t));
}
// Notes de patch qui citent explicitement l'entité (association établie par le texte)
function patchMentions(game, ent) {
  const re = new RegExp(`(^|[^\\p{L}])${ent.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "u");
  return forGame(allNews(), game).filter(i => i.type === "patch").map(i => ({ i, e: editOf(i) }))
    .filter(({ e }) => e && re.test([...(e.article || []), ...(e.points || [])].join(" ")));
}
function relatedStrats(game, key) {
  return STRATS.filter(s => s.game === game && [...(s.lineup || []), ...(s.maps || []).flatMap(m => m.lineup)].some(x => norm(entKey(x)) === norm(key)));
}
// Champions ou agents cités dans un article de patch
function mentionedEntities(i, e) {
  const roster = rosters[i.game];
  if (!roster || i.type !== "patch") return [];
  const text = [...(e.article || []), ...(e.points || [])].join(" ");
  return roster.filter(r => new RegExp(`(^|[^\\p{L}])${r.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "u").test(text)).slice(0, 24);
}

// ============================================================ 4. Utilitaires d'affichage

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDay = d => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const fmtDate = d => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
// Heures des matchs : fuseau de l'appareil, ou celui choisi par l'utilisateur (prefs.tz)
const tzOpt = () => (prefs.tz ? { timeZone: prefs.tz } : {});
const fmtTime = d => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", ...tzOpt() });
const fmtDayTime = d => new Date(d).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", ...tzOpt() });
const fmtWeekday = d => new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", ...tzOpt() });
// Jour « AAAA-MM-JJ » (déjà dans le bon fuseau) : affiché tel quel
const fmtDayKey = k => new Date(k + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const pct = x => (x == null ? "—" : x > 0 && x < .005 ? "< 1 %" : `${Math.round(x * 100)} %`);
const localDay = d => new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", ...tzOpt() });
function ago(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  if (m < 48 * 60) return `il y a ${Math.round(m / 60)} h`;
  return `il y a ${Math.round(m / 1440)} j`;
}
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; } })();
// Fuseaux proposés : celui de l'appareil, puis les villes des grandes compétitions
const TZ_LIST = [["Europe/Paris", "Paris"], ["Europe/London", "Londres"], ["Europe/Berlin", "Berlin"], ["America/Montreal", "Montréal"], ["America/New_York", "New York"], ["America/Los_Angeles", "Los Angeles"], ["America/Sao_Paulo", "São Paulo"], ["Africa/Casablanca", "Casablanca"], ["Indian/Reunion", "La Réunion"], ["Asia/Seoul", "Séoul"], ["Asia/Shanghai", "Shanghai"], ["Asia/Tokyo", "Tokyo"], ["Australia/Sydney", "Sydney"]];
// « Paris (UTC+2) » : ville et décalage du fuseau affiché
function tzLabel(at = Date.now()) {
  const z = prefs.tz || TZ;
  let off = "";
  try { off = new Intl.DateTimeFormat("fr-FR", { timeZone: z || undefined, timeZoneName: "shortOffset" }).formatToParts(new Date(at)).find(p => p.type === "timeZoneName")?.value.replace("GMT", "UTC") || ""; } catch { /* navigateur ancien */ }
  if (off === "UTC") off = "UTC+0";
  const city = TZ_LIST.find(([id]) => id === z)?.[1] || (z ? z.split("/").pop().replace(/_/g, " ") : "");
  return city ? `${city}${off ? ` (${off})` : ""}` : off;
}
// Rappel du fuseau, avec choix d'un autre fuseau (voyage, VPN, appareil mal réglé)
const tzPicker = () => `<p class="fine tz">${icon("clock")}<span>Heures de ${esc(tzLabel())}${prefs.tz ? "" : " · fuseau de votre appareil"}</span>${sel("tz", [["", `Automatique${TZ ? ` (${TZ.split("/").pop().replace(/_/g, " ")})` : ""}`], ...TZ_LIST.filter(([id]) => id !== TZ)], prefs.tz || "", "Fuseau horaire")}</p>`;
const href = (...parts) => "#/" + parts.filter(p => p != null && p !== "").map(encodeURIComponent).join("/");
const sheetHref = (game, key) => location.hash.replace(/\/fiche\/[^/]*$/, "") + "/fiche/" + encodeURIComponent(key);

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  trophy: '<path d="M7 4h10v4a5 5 0 0 1-10 0V4zM12 13v4M8 21h8M10 17h4M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/>',
  news: '<path d="M4 5h12v14H6a2 2 0 0 1-2-2V5zM16 9h4v8a2 2 0 0 1-2 2M8 9h4M8 13h4"/>',
  tiers: '<path d="M4 6h2M10 6h10M4 12h2M10 12h7M4 18h2M10 18h4"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  bookmark: '<path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4-6 4V4.5a1 1 0 0 1 1-1z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',
  play: '<path d="M8 5.5v13l10-6.5z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3 6"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  bracket: '<path d="M4 5h5v6H4M4 13h5v6H4M9 8h4v8h-4M13 12h7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  tower: '<path d="M8 21h8M9 21l1-11h4l1 11M8 10h8l-1-4h-6zM10 6V3h4v3"/>',
  coin: '<ellipse cx="12" cy="12" rx="8" ry="6"/><path d="M4 12v3c0 3.3 3.6 6 8 6s8-2.7 8-6v-3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
};
// Logo MINDIFF : un D et un 1 dont la silhouette commune forme un M (mêmes tracés que logo.svg)
const BRAND_MARK = `<svg class="brand-mark" viewBox="8 8 50 48" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M12 51V13C22 13 30 26 32 51ZM19 46V24.5c4.6 4 7.1 10.5 8.1 21.5Z"/><path fill="var(--accent)" d="M32 51 47 13h7v38h-7V33.5L39 51Z"/></svg>`;
const icon = (name, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;

function initials(name) {
  const words = String(name).replace(/[^\p{L}\p{N} ]/gu, " ").trim().split(/\s+/);
  return ((words.length > 1 ? words[0][0] + words[1][0] : words[0]?.slice(0, 3)) || "?").toUpperCase();
}
// Logo ou portrait, avec repli propre sur les initiales si l'image manque
const logo = (name, url, cls = "") => `<span class="logo ${cls}" aria-hidden="true"><span class="logo-txt">${esc(initials(name))}</span>${url ? `<img src="${esc(url)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}</span>`;
const portrait = (ent, cls = "") => `<span class="portrait ${cls}" aria-hidden="true"><span class="logo-txt">${esc(initials(ent.name))}</span>${ent.img ? `<img src="${esc(ent.img)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}</span>`;

async function loadRosters() {
  try {
    const versions = await (await fetch("https://ddragon.leagueoflegends.com/api/versions.json")).json();
    lolVersion = versions[0];
    const champs = await (await fetch(`https://ddragon.leagueoflegends.com/cdn/${lolVersion}/data/fr_FR/champion.json`)).json();
    const TAG = { Fighter: "Combattant", Tank: "Tank", Mage: "Mage", Assassin: "Assassin", Marksman: "Tireur", Support: "Support" };
    rosters.lol = Object.values(champs.data).map(c => ({ id: c.id, name: c.name, tags: c.tags.map(t => TAG[t] || t) })).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  } catch (e) { console.warn("Liste des champions indisponible", e); }
  try {
    const res = await (await fetch("https://valorant-api.com/v1/agents?isPlayableCharacter=true")).json();
    rosters.val = res.data.map(a => ({ name: a.displayName, icon: a.displayIcon, portrait: a.fullPortrait, role: a.role?.displayName })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) { console.warn("Liste des agents indisponible", e); }
  render(false);
}

const STEAM_ART = { cs2: 730, rl: 252950 };
function gameArt(id) {
  if (STEAM_ART[id]) return `https://cdn.cloudflare.steamstatic.com/steam/apps/${STEAM_ART[id]}/library_600x900_2x.jpg`;
  const official = (AUTO?.news || []).filter(n => n.game === id && n.image && natureOf(n).cls === "official" && !n.image.includes("clan.akamai"));
  return official[0]?.image || null;
}
// Visuel d'un tournoi : image d'une actu officielle qui le nomme explicitement, sinon aucun visuel (pas d'image inventée)
function tournamentImage(t) {
  // Le nom du jeu ne suffit pas : l'actu doit citer la compétition elle-même
  const gameWords = norm(gameById[t.game].name + " " + SHORT[t.game]);
  const words = t.name.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !/^\d+$/.test(w) && !gameWords.includes(norm(w)));
  if (!words.length) return null;
  const hit = (AUTO?.news || []).find(n => n.game === t.game && n.image && natureOf(n).cls === "official" && words.some(w => n.title.toLowerCase().includes(w)));
  return hit?.image || null;
}

// ============================================================ 5. Composants

const chip = (text, cls = "") => text ? `<span class="chip ${cls}">${esc(text)}</span>` : "";
const statusChip = s => ({ live: `<span class="chip live"><span class="live-dot"></span>En cours</span>`, upcoming: chip("À venir", "soft"), finished: chip("Terminé", "soft") }[s] || "");
const bullets = items => items?.length ? `<ul class="bullets">${items.map(p => `<li>${esc(p)}</li>`).join("")}</ul>` : "";
const empty = (title, text = "", action = "") => `<div class="empty"><p class="empty-title">${esc(title)}</p>${text ? `<p class="empty-text">${esc(text)}</p>` : ""}${action}</div>`;
const KIND_LABEL = { officiel: "Officiel", media: "Média", communaute: "Communauté", suspect: "Douteux" };
function sourceList(srcs, extra = "") {
  if (!srcs?.length) return "";
  return `<div class="sources"><p class="label">Sources${extra}</p><ul>${srcs.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener"><span class="src-kind ${s.kind}">${KIND_LABEL[s.kind] || ""}</span><span class="src-name">${esc(s.name)}</span>${icon("external", "ext")}</a></li>`).join("")}</ul></div>`;
}
const notes = ws => (ws || []).map(w => `<p class="note warn">${icon("alert")}<span>${esc(w)}</span></p>`).join("");
const secHead = (title, link = "") => `<div class="sec-head"><h2 class="sec-title">${title}</h2>${link}</div>`;
const seeAll = (to, label = "Tout voir") => `<a class="see-all" href="${to}">${esc(label)}${icon("chevron")}</a>`;
const seg = (action, options, value, label, cls = "") => `<div class="seg ${cls}" role="group" aria-label="${esc(label)}">${options.map(([v, l, n]) => `<button type="button" class="seg-btn" data-action="${action}" data-id="${esc(v)}" aria-pressed="${String(v) === String(value)}">${esc(l)}${n != null ? `<span class="count">${n}</span>` : ""}</button>`).join("")}</div>`;
const sel = (action, options, value, label) => `<label class="sel"><span class="sr">${esc(label)}</span><select data-action="${action}" aria-label="${esc(label)}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>${icon("down", "sel-ic")}</label>`;
const skeleton = () => `<div class="skeleton" aria-busy="true" aria-label="Chargement"><span class="sk sk-card"></span><span class="sk-row"><span class="sk"></span><span class="sk"></span><span class="sk"></span><span class="sk"></span></span><span class="sk sk-line"></span><span class="sk sk-line"></span><span class="sk sk-line short"></span></div>`;

// Alerte visible si les données sont anciennes ou si la dernière synchronisation a échoué
function freshnessAlert() {
  if (!AUTO) return "";
  const failed = AUTO.sources.filter(s => !s.ok);
  let msg = "";
  if (dataError) msg = `Connexion impossible : affichage ${dataError.cachedAt ? `de la copie du ${fmtDayTime(dataError.cachedAt)}` : "des dernières données reçues"}.`;
  // Plus d'avertissement « données synchronisées il y a X h » : l'heure reste consultable dans la fiche Sources
  else if (failed.some(s => s.id === "lolesports")) msg = "La source officielle des matchs LoL n'a pas répondu : les résultats affichés datent de la synchronisation précédente.";
  if (!msg) return "";
  return `<div class="alert" role="status">${icon("alert")}<span>${esc(msg)}</span>${dataError ? `<button class="btn ghost sm" data-action="retry">${icon("refresh")}Réessayer</button>` : `<button class="btn ghost sm" data-action="sync-panel">Détails</button>`}</div>`;
}

// --- Matchs : carte compacte, équipes de part et d'autre, heure ou score au centre
// Jour relatif dans le fuseau de l'utilisateur : « Aujourd'hui », « Demain », « Hier », sinon « ven. 23 oct. »
function dayLabel(d) {
  const k = localDay(d);
  if (k === localDay(Date.now())) return "Aujourd'hui";
  if (k === localDay(Date.now() + 864e5)) return "Demain";
  if (k === localDay(Date.now() - 864e5)) return "Hier";
  const l = new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  return l.charAt(0).toUpperCase() + l.slice(1);
}

// day = false seulement quand le jour est déjà donné par l'écran (sélecteur de date de Compétitions → Matchs)
function matchCard(m, t, { withComp = true, line = false, day = true } = {}) {
  if (m.state === "unstarted" && LIVE_IDS.has(m.id)) m = { ...m, state: "inProgress" };
  const done = m.state === "completed";
  const hide = done && hidden(m.id);
  const [a, b] = m.teams;
  const center = m.state === "inProgress" ? `<span class="mc-live">En cours</span>`
    : done ? (hide ? `<span class="mc-hidden">Score masqué</span>` : a.score != null ? `<span class="mc-score"><b class="${a.outcome === "win" ? "w" : ""}">${a.score}</b><i>–</i><b class="${b.outcome === "win" ? "w" : ""}">${b.score}</b></span>` : `<span class="mc-score">Terminé</span>`)
    : m.start ? `${day ? `<span class="mc-day">${esc(dayLabel(m.start))}</span>` : ""}<span class="mc-time">${fmtTime(m.start)}</span>` : `<span class="mc-time small">${esc(MATCH_STATE[m.state] || "—")}</span>`;
  const fmt = [done && day && m.start ? fmtDay(m.start) : "", m.bo ? `Bo${m.bo}` : ""].filter(Boolean).join(" · ");
  const label = `${a.name} contre ${b.name}, ${MATCH_STATE[m.state] || ""}${done ? (hide ? ", score masqué" : a.score != null ? `, ${a.score} à ${b.score}` : "") : m.start ? `, ${fmtDayTime(m.start)}` : ""}, ${t.name}`;
  const side = (x, cls) => `<span class="mc-team ${cls} ${done && !hide && x.outcome === "win" ? "win" : ""} ${done && !hide && x.outcome === "loss" ? "loss" : ""}">${logo(x.name, x.image)}<span class="mc-name">${esc(x.name)}</span>${prefs.favTeams.includes(x.name) ? icon("star", "fav-ic") : ""}</span>`;
  const summary = line && done && !hide ? (EDITORIAL.matches?.[m.id]?.resume || autoSummary(m) || m.summary || "") : "";
  return `<a class="mcard" href="${href(t.game, "tournoi", t.id, "matchs", m.id)}" aria-label="${esc(label)}">
    ${side(a, "a")}
    <span class="mc-center">${center}${fmt ? `<span class="mc-fmt">${fmt}</span>` : ""}</span>
    ${side(b, "b")}
    ${withComp ? `<span class="mc-comp">${esc(t.name)}${m.block ? ` · ${esc(m.block)}` : ""}</span>` : m.block ? `<span class="mc-comp">${esc(m.block)}</span>` : ""}
    ${summary ? `<span class="mc-line">${esc(summary)}</span>` : ""}
    ${m.state === "inProgress" && t.game === "lol" && !prefs.noSpoil ? liveStrip(m.id) : ""}
  </a>`;
}

// ---------- Partie en cours : score en direct (flux public de LoL Esports, comme le bandeau de la diffusion)
// kills, tours, golds, dragons, barons, inhibiteurs ; relu toutes les 10 s tant qu'un bandeau est affiché
const LIVE = {};
const LOLE_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z"; // clé publique du site LoL Esports (déjà utilisée par la collecte)
let liveTimer = null;
const liveStrip = (id, big = false) => `<span class="livestrip${big ? " big" : ""}" data-live-match="${esc(id)}">${liveStripInner(id)}</span>`;
const kfmt = n => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",")}k` : String(n));
const DRAKE = { infernal: "#ff5a2e", ocean: "#3d9df0", mountain: "#a07a4f", cloud: "#cfd8e3", hextech: "#36c6d6", chemtech: "#6ccf3a", elder: "#b47cff" };
const mmss = secs => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
function liveStripInner(id) {
  const L = LIVE[id];
  if (!L?.f) return `<span class="ls-wait">${L?.over ? "Match terminé : le résultat s'affiche à la prochaine mise à jour." : L?.none ? "Entre deux parties : le direct reprend au début de la prochaine." : "Statistiques en direct…"}</span>`;
  const f = L.f, bm = L.meta?.blueTeamMetadata, rm = L.meta?.redTeamMetadata;
  const team = tid => L.teams?.find(x => x.id === tid) || {};
  const secs = L.start ? Math.max(0, Math.round((Date.parse(f.rfc460Timestamp) - L.start) / 1000)) : null;
  const state = f.gameState === "paused" ? "Pause" : f.gameState === "finished" ? "Terminée" : secs == null ? "" : mmss(secs);
  return scoreStrip(team(bm?.esportsTeamId), team(rm?.esportsTeamId), f.blueTeam, f.redTeam, `${L.gameNo ? `Partie ${L.gameNo} · ` : ""}${state}`, "En direct, environ 30 s de décalage · LoL Esports");
}
// Bandeau commun : direct (flux) et récap de fin de partie (score final enregistré par la collecte)
function scoreStrip(B, R, b, r, clockText, note) {
  const diff = b.totalGold - r.totalGold;
  const drakes = list => (list || []).map(d => `<i class="ls-drake" style="background:${DRAKE[d] || "#999"}" title="${esc(d)}"></i>`).join("");
  const side = (t, x, cls) => `<span class="ls-side ${cls}">
      <span class="ls-team">${logo(t.name || "", t.image)}<b>${esc(t.code || "?")}</b></span>
      <span class="ls-stat" title="Tours">${icon("tower")}${x.towers}</span>
      <span class="ls-stat" title="Golds">${icon("coin")}${kfmt(x.totalGold)}</span>
      <span class="ls-objs">${drakes(x.dragons)}${x.barons ? `<span class="ls-baron" title="Barons">B${x.barons > 1 ? x.barons : ""}</span>` : ""}${x.inhibitors ? `<span class="ls-inhib" title="Inhibiteurs">I${x.inhibitors > 1 ? x.inhibitors : ""}</span>` : ""}</span>
    </span>`;
  return `<span class="ls-grid">
    ${side(B, b, "blue")}
    <span class="ls-mid"><span class="ls-kills">${b.totalKills}<i>–</i>${r.totalKills}</span><span class="ls-clock">${esc(clockText)}</span>${diff ? `<span class="ls-diff ${diff > 0 ? "blue" : "red"}">+${kfmt(Math.abs(diff))} ${esc((diff > 0 ? B : R).code || "")}</span>` : ""}</span>
    ${side(R, r, "red")}
  </span>${note ? `<span class="ls-note">${esc(note)}</span>` : ""}`;
}
// ---------- Résumé d'une partie : faits relevés minute par minute dans le flux officiel (story.mjs), sans texte inventé
// Déjà calculé par la collecte (g.story), sinon calculé ici dès la fin de la partie, puis gardé sur l'appareil
const STORY = {}, STORY_KEY = "mindiff-stories-v1";
try { Object.assign(STORY, JSON.parse(localStorage.getItem(STORY_KEY) || "{}")); } catch { /* ignoré */ }
const storyTeams = (st, m) => Object.fromEntries(["blue", "red"].map(s => { const id = st.players.find(p => p.side === s)?.teamId; const x = m.teams.find(y => y.id === id) || {}; return [s, { name: x.name, code: x.code || x.name }]; }));
function storyHtml(st, m) {
  if (!window.storyLines) return "";
  const lines = window.storyLines(st, { teams: storyTeams(st, m), winner: st.winner, lang: window.LANG || "fr", tagsOf: c => rosters.lol?.find(x => x.id === c)?.tags || [], champName: c => entity("lol", c).name });
  return `<ul class="story" translate="no">${lines.map(l => `<li class="st-${l.k}">${esc(l.t)}</li>`).join("")}</ul><p class="fine st-note" translate="no">${window.LANG === "en" ? "Facts measured minute by minute in the official LoL Esports feed." : "Faits relevés minute par minute dans le flux officiel de LoL Esports."}</p>`;
}
// Relevé le plus complet disponible : celui de la collecte, ou celui calculé sur l'appareil (v2 : kills à la seconde, stats finales)
const gameStory = (gameId, m) => { const a = m.games?.find(g => g.id === gameId)?.story, b = STORY[gameId]; return (b?.v || 0) > (a?.v || 0) ? b : a || b || null; };
function storyBox(gameId, m) {
  const st = gameStory(gameId, m);
  if (st) return st.v >= 2 ? storyHtml(st, m) : `<div data-story="${esc(gameId)}" data-match="${esc(m.id)}" data-upgrade="1">${storyHtml(st, m)}</div>`;
  return `<div class="story-wait" data-story="${esc(gameId)}" data-match="${esc(m.id)}">${window.LANG === "en" ? "Preparing the game summary…" : "Résumé de la partie en préparation…"}</div>`;
}
function storyMatchInner(m) {
  const ids = STORY_GAMES[m.id];
  if (!ids) return `<div class="story-wait" data-story-list="${esc(m.id)}">${window.LANG === "en" ? "Preparing the game summary…" : "Résumé de la partie en préparation…"}</div>`;
  return ids.map((id, i) => { const st = gameStory(id, m); return `${ids.length > 1 ? `<p class="label">Partie ${i + 1}</p>` : ""}${storyBox(id, m)}${st?.fin ? `${["blue", "red"].map(sd => `<div class="draft ${st.winner === sd ? "win" : ""}"><span class="draft-team">${esc(storyTeams(st, m)[sd].name || "")}</span><div class="draft-picks">${st.players.map((p, j) => p.side === sd ? ppPick(id, j, p.champ, p.name, p.role) : "").join("")}</div></div>`).join("")}${ppPanel(id, m)}` : ""}`; }).join("");
}

// ---------- Fiche d'un joueur dans une partie : stats finales, objets, face à son vis-à-vis, kills et morts à la seconde
const PP = {}; // partie → joueur ouvert
let ppData = null, ppLoading = false; // noms des objets et runes (Data Dragon), chargés à la première ouverture
async function ppLoad() {
  if (ppData || ppLoading) return;
  ppLoading = true;
  const loc = window.LANG === "en" ? "en_US" : "fr_FR";
  try {
    const [it, ru] = await Promise.all([fetch(`https://ddragon.leagueoflegends.com/cdn/${lolVersion}/data/${loc}/item.json`).then(r => r.json()), fetch(`https://ddragon.leagueoflegends.com/cdn/${lolVersion}/data/${loc}/runesReforged.json`).then(r => r.json())]);
    const runes = {};
    for (const s of ru) { runes[s.id] = { name: s.name, icon: s.icon }; for (const sl of s.slots) for (const r of sl.runes) runes[r.id] = { name: r.name, icon: r.icon }; }
    ppData = { items: Object.fromEntries(Object.entries(it.data).map(([k, v]) => [k, v.name])), runes };
    if (Object.values(PP).some(x => x != null)) render(false);
  } catch { /* noms indisponibles : les icônes restent */ }
  ppLoading = false;
}
// Portrait d'un joueur : ouvre sa fiche de la partie quand le relevé détaillé existe, sinon la fiche du champion
function ppPick(gameId, idx, champ, player, role) {
  const ent = entity("lol", champ), short = player.replace(/^\S+\s/, "");
  const label = `${ent.name}, ${player}${role ? `, ${ROLE_LABEL[role] || role}` : ""}`;
  if (idx < 0) return `<a class="pick" href="${sheetHref("lol", ent.key)}" aria-label="${esc(label)}">${portrait(ent, "sm")}<small>${esc(short)}</small></a>`;
  const on = PP[gameId] === idx;
  return `<button type="button" class="pick ${on ? "on" : ""}" data-action="pp" data-id="${esc(gameId)}|${idx}" aria-pressed="${on}" aria-label="${esc(label)}">${portrait(ent, "sm")}<small>${esc(short)}</small></button>`;
}
function ppPanel(gameId, m) {
  const st = gameStory(gameId, m), i = PP[gameId];
  if (i == null || !st?.fin?.[i]) return "";
  if (!ppData) ppLoad();
  const en = window.LANG === "en", P = st.players, p = P[i], f = st.fin[i], K = st.mins.at(-1).k?.[i] || [0, 0, 0];
  const nf = n => n.toLocaleString(en ? "en-US" : "fr-FR");
  const dec = n => n.toLocaleString(en ? "en-US" : "fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const nm = j => P[j].name.replace(/^\S+\s/, ""), ch = j => entity("lol", P[j].champ).name, who = j => `${nm(j)} (${ch(j)})`;
  const team = storyTeams(st, m), mins = st.duration / 60, ent = entity("lol", p.champ);
  const ratio = (K[0] + K[2]) / Math.max(1, K[1]);
  const tile = (v, l, s) => `<div class="pp-stat"><b>${v}</b><span>${esc(l)}</span>${s ? `<small>${esc(s)}</small>` : ""}</div>`;
  const V = lolVersion;
  const items = f.it.map(id => `<img src="https://ddragon.leagueoflegends.com/cdn/${esc(V)}/img/item/${esc(id)}.png" alt="${esc(ppData?.items[id] || "")}" title="${esc(ppData?.items[id] || "")}" loading="lazy" width="32" height="32">`).join("");
  const rk = f.rk && ppData?.runes[f.rk], rs = f.rs?.[1] && ppData?.runes[f.rs[1]];
  // Vis-à-vis : même rôle dans l'équipe adverse
  const o = P.findIndex(q => q.side !== p.side && q.role === p.role);
  const sg = n => `${n > 0 ? "+" : n < 0 ? "−" : ""}${nf(Math.abs(n))}`;
  const vsRows = o < 0 ? [] : [...[10, 15, 20].filter(t => st.snap?.[t]).map(t => [`${t} min`, st.snap[t][i], st.snap[t][o]]), [en ? "End" : "Fin", [f.g, f.cs, f.lv], [st.fin[o].g, st.fin[o].cs, st.fin[o].lv]]];
  const vs = vsRows.length ? `<p class="label">${en ? `Against ${esc(who(o))}` : `Face à ${esc(who(o))}`}</p>
    <div class="pp-vs" role="table"><div role="row" class="pp-vs-h"><span role="columnheader"></span><span role="columnheader">${en ? "Gold" : "Golds"}</span><span role="columnheader">CS</span><span role="columnheader">${en ? "Level" : "Niveau"}</span></div>
    ${vsRows.map(([l, a, b]) => `<div role="row"><span role="rowheader">${l}</span>${[0, 1, 2].map(k => `<span role="cell" class="${a[k] > b[k] ? "up" : a[k] < b[k] ? "down" : ""}">${sg(a[k] - b[k])}</span>`).join("")}</div>`).join("")}</div>` : "";
  // Champion pool : parties officielles du joueur dans les tournois suivis (vainqueur vérifié pour le bilan)
  const pool = {};
  const tours = new Set();
  for (const t of allTournaments()) if (t.game === "lol") for (const mm of tMatches(t)) if (mm.state === "completed") for (const g of mm.games || []) for (const sd of ["blue", "red"]) {
    const pk = g[sd]?.picks?.find(x => x.player === p.name);
    if (!pk) continue;
    const c = (pool[pk.champ] ||= { n: 0, w: 0, l: 0 });
    c.n++; tours.add(t.name);
    if (mm.verified !== false && g.winnerTeamId) g.winnerTeamId === g[sd].teamId ? c.w++ : c.l++;
  }
  const poolRows = Object.entries(pool).sort((a, b) => b[1].n - a[1].n || b[1].w - a[1].w);
  const total = poolRows.reduce((s, [, c]) => s + c.n, 0);
  const poolHtml = poolRows.length ? `<p class="label">Champion pool</p>
    <ul class="pp-pool">${poolRows.map(([c, x]) => { const e2 = entity("lol", c), known = x.w + x.l; return `<li><a href="${sheetHref("lol", e2.key)}">${portrait(e2, "sm")}<span class="pp-pn"><b>${esc(e2.name)}</b><small>${x.n} ${en ? (x.n > 1 ? "games" : "game") : (x.n > 1 ? "parties" : "partie")}${known ? ` · ${x.w}${en ? "W" : " V"} – ${x.l}${en ? "L" : " D"}` : ""}</small></span>${known >= 3 ? `<i class="${x.w / known >= .5 ? "up" : "down"}">${Math.round((x.w / known) * 100)}${en ? "%" : " %"}</i>` : ""}</a></li>`; }).join("")}</ul>
    <p class="fine">${en ? `${total} official ${total > 1 ? "games" : "game"} tracked by MINDIFF (${esc([...tours].join(", "))}). Win rate shown from 3 games.` : `${total} ${total > 1 ? "parties officielles suivies" : "partie officielle suivie"} par MINDIFF (${esc([...tours].join(", "))}). Taux de victoire affiché à partir de 3 parties.`}</p>` : "";
  // Chronologie : kills, morts et aides du joueur, à la seconde
  const ev = (st.ev || []).filter(e => e[1] === i || e[2] === i || e[3].includes(i));
  const myKills = (st.ev || []).filter(e => e[1] === i).map(e => e[0]);
  // Multi-kill (moins de 10 s entre deux kills) : indiqué sur le dernier kill de la série
  const multi = {};
  for (let k = 0, n = 1; k < myKills.length; k++, n++) { if (k + 1 < myKills.length && myKills[k + 1] - myKills[k] <= 10) continue; if (n >= 2) multi[k] = n; n = 0; }
  const MK = [, , "Double kill", "Triple kill", "Quadra kill", "Penta kill"];
  const help = (a, x) => { const h = a.filter(j => j !== x); return h.length ? (en ? `Assists: ${h.map(nm).join(", ")}` : `Aides : ${h.map(nm).join(", ")}`) : (en ? "No assist" : "Sans aide"); };
  let kc = 0;
  const row = e => {
    const [t, k, v, a] = e;
    if (k === i) { const kn = kc++; return `<li class="k"><time>${mmss(t)}</time><span><b>${v != null ? (en ? `Kill on ${esc(who(v))}` : `Kill sur ${esc(who(v))}`) : "Kill"}</b>${multi[kn] ? `<em>${MK[Math.min(5, multi[kn])]}</em>` : ""}<small>${esc(help(a, k))}</small></span></li>`; }
    if (v === i) return `<li class="d"><time>${mmss(t)}</time><span><b>${k != null ? (en ? `Killed by ${esc(who(k))}` : `Tué par ${esc(who(k))}`) : (en ? "Death" : "Mort")}</b><small>${k != null ? esc(help(a, k)) : en ? "No enemy kill recorded at that moment (turret, monster or several kills at once)" : "Aucun kill adverse au même instant (tourelle, monstre ou plusieurs kills à la fois)"}</small></span></li>`;
    return `<li class="a"><time>${mmss(t)}</time><span><b>${en ? "Assist" : "Aide"}</b><small>${en ? `${esc(who(k))}'s kill${v != null ? ` on ${esc(who(v))}` : ""}` : `Kill de ${esc(who(k))}${v != null ? ` sur ${esc(who(v))}` : ""}`}</small></span></li>`;
  };
  const dot = e => `<i class="${e[1] === i ? "k" : e[2] === i ? "d" : "a"}" style="left:${Math.min(100, (e[0] / st.duration) * 100).toFixed(2)}%"></i>`;
  const ticks = [10, 20, 30, 40, 50].filter(x => x * 60 < st.duration).map(x => `<span style="left:${((x * 60) / st.duration) * 100}%">${x}</span>`).join("");
  return `<section class="pp" translate="no" aria-label="${esc(`${p.name}, ${ent.name}`)}">
    <div class="pp-head">${portrait(ent)}<div class="pp-id"><b>${esc(p.name.replace(/^\S+\s/, ""))}</b><span>${esc(team[p.side].name || "")} · ${esc(ROLE_LABEL[p.role] || p.role)} · ${esc(ent.name)}</span></div>
      <button type="button" class="icon-btn" data-action="pp" data-id="${esc(gameId)}|${i}" aria-label="${en ? "Close" : "Fermer"}">${icon("close")}</button></div>
    <div class="pp-stats">
      ${tile(`${K[0]}/${K[1]}/${K[2]}`, "KDA", `${dec(ratio)} ${en ? "ratio" : "de ratio"}`)}
      ${tile(nf(f.cs), en ? "CS" : "Sbires", `${dec(f.cs / mins)}${en ? "/min" : " par min"}`)}
      ${tile(f.g >= 1000 ? `${dec(f.g / 1000)}k` : nf(f.g), en ? "Gold" : "Golds", `${nf(Math.round(f.g / mins))}${en ? "/min" : " par min"}`)}
      ${tile(f.lv, en ? "Level" : "Niveau")}
      ${f.kp != null ? tile(`${Math.round(f.kp * 100)}${en ? "%" : " %"}`, en ? "Kill participation" : "Participation aux kills") : ""}
      ${f.dmg != null ? tile(`${Math.round(f.dmg * 100)}${en ? "%" : " %"}`, en ? "Of team damage" : "Des dégâts de l'équipe") : ""}
      ${f.wp != null ? tile(`${f.wp}<i>·</i>${f.wd}`, en ? "Wards placed · destroyed" : "Wards posées · détruites") : ""}
    </div>
    ${items || rk ? `<div class="pp-build">${rk ? `<span class="pp-rune" title="${esc(rk.name)}"><img src="https://ddragon.leagueoflegends.com/cdn/img/${esc(rk.icon)}" alt="" width="32" height="32"><span><b>${esc(rk.name)}</b>${rs ? `<small>${esc(rs.name)}</small>` : ""}</span></span>` : ""}<span class="pp-items" aria-label="${en ? "Final items" : "Objets en fin de partie"}">${items}</span></div>` : ""}
    ${vs}
    ${poolHtml}
    ${st.ev ? `<p class="label">${en ? "Kills, deaths and assists" : "Kills, morts et aides"}</p>
      <div class="pp-tbar" aria-hidden="true"><div class="pp-track">${ev.map(dot).join("")}</div><div class="pp-ticks">${ticks}</div></div>
      ${ev.length ? `<ol class="pp-tl">${ev.map(row).join("")}</ol>` : `<p class="fine">${en ? "No kill, death or assist this game." : "Aucun kill, aucune mort ni aide dans cette partie."}</p>`}
      <p class="fine">${en ? "Game times computed from the official LoL Esports feed, to the second (a pause in the game shifts the times that follow)." : "Temps de jeu calculés à partir du flux officiel de LoL Esports, à la seconde (une pause dans la partie décale les temps qui suivent)."}</p>`
    : `<p class="fine">${en ? "Kill timeline being prepared…" : "Chronologie des kills en préparation…"}</p>`}
    <a class="btn ghost sm" href="${sheetHref("lol", ent.key)}">${en ? `${esc(ent.name)} page` : `Fiche de ${esc(ent.name)}`}</a>
  </section>`;
}
const STORY_GAMES = {}, STORY_TRIED = {};
let storyBusy = false;
async function storyFill() {
  if (storyBusy || !window.fetchStory) return;
  storyBusy = true;
  try {
    // Match terminé que la collecte n'a pas encore détaillé : liste officielle de ses parties
    for (const el of document.querySelectorAll("[data-story-list]")) {
      const id = el.dataset.storyList;
      if (!STORY_GAMES[id]) {
        const ev = await (await fetch(`https://esports-api.lolesports.com/persisted/gw/getEventDetails?hl=fr-FR&id=${encodeURIComponent(id)}`, { headers: { "x-api-key": LOLE_KEY } })).json();
        STORY_GAMES[id] = (ev?.data?.event?.match?.games || []).filter(g => g.state === "completed").map(g => g.id);
      }
      const m = allTournaments().flatMap(tMatches).find(x => x.id === id);
      if (m) document.querySelectorAll(`[data-story-match="${CSS.escape(id)}"]`).forEach(x => { x.innerHTML = storyMatchInner(m); });
    }
    let changed = false;
    for (const el of [...document.querySelectorAll("[data-story]")]) {
      const gid = el.dataset.story;
      if ((STORY[gid]?.v || 0) < 2) {
        if (STORY_TRIED[gid] > Date.now() - 60000) continue; // relevé indisponible il y a moins d'une minute
        STORY_TRIED[gid] = Date.now();
        const st = await window.fetchStory(gid);
        if (!st) { if (!el.dataset.upgrade) el.textContent = window.LANG === "en" ? "Summary not available yet." : "Résumé pas encore disponible."; continue; }
        STORY[gid] = st;
        try { const keep = Object.fromEntries(Object.entries(STORY).slice(-30)); localStorage.setItem(STORY_KEY, JSON.stringify(keep)); } catch { /* ignoré */ }
      }
      changed = true;
    }
    if (changed) { storyBusy = false; render(false); return; }
  } catch { /* flux indisponible : réessayé à l'affichage suivant */ }
  storyBusy = false;
}
// Récap d'une partie terminée, à partir du score final enregistré par la collecte
function recapStrip(g, m) {
  if (!g.final) return "";
  const team = tid => { const x = m.teams.find(y => y.id === tid) || {}; return { name: x.name, code: x.code || x.name, image: x.image }; };
  return `<span class="livestrip recap">${scoreStrip(team(g.blue.teamId), team(g.red.teamId), g.final.blue, g.final.red, `Fin · ${mmss(g.final.duration)}`, "")}</span>`;
}
async function liveTick() {
  liveTimer = null;
  const ids = [...new Set([...document.querySelectorAll("[data-live-match]")].map(e => e.dataset.liveMatch))];
  if (!ids.length) return;
  for (const id of ids) {
    const L = (LIVE[id] ||= {});
    try {
      if (!L.evAt || Date.now() - L.evAt > 60000) {
        const ev = await (await fetch(`https://esports-api.lolesports.com/persisted/gw/getEventDetails?hl=fr-FR&id=${encodeURIComponent(id)}`, { headers: { "x-api-key": LOLE_KEY } })).json();
        const mt = ev?.data?.event?.match, g = mt?.games?.find(x => x.state === "inProgress");
        L.teams = mt?.teams; L.evAt = Date.now();
        if (g?.id !== L.game) Object.assign(L, { game: g?.id || null, gameNo: g?.number || null, start: null, f: null });
        L.none = !g; L.over = !g && !!mt?.games?.length && mt.games.every(x => x.state !== "unstarted" && x.state !== "inProgress");
      }
      if (L.game) {
        if (!L.start) { const w0 = await (await fetch(`https://feed.lolesports.com/livestats/v1/window/${L.game}`)).json(); L.start = Date.parse(w0?.frames?.[0]?.rfc460Timestamp) || null; }
        // Décalage adaptatif : le plus court que le flux accepte (il refuse une image trop récente), entre 20 et 60 s
        L.lag ||= 20000;
        const t = new Date(Date.now() - L.lag); t.setUTCSeconds(Math.floor(t.getUTCSeconds() / 10) * 10, 0);
        const res = await fetch(`https://feed.lolesports.com/livestats/v1/window/${L.game}?startingTime=${t.toISOString()}`);
        const w = res.status === 200 ? await res.json() : null, f = w?.frames?.at(-1);
        if (f) { L.f = f; L.meta = w.gameMetadata; L.ok = (L.ok || 0) + 1; if (L.ok > 30 && L.lag > 20000) { L.lag -= 10000; L.ok = 0; } }
        else { L.lag = Math.min(60000, L.lag + 10000); L.ok = 0; }
      }
    } catch { /* flux momentanément indisponible : on garde le dernier relevé */ }
    for (const el of document.querySelectorAll(`[data-live-match="${CSS.escape(id)}"]`)) el.innerHTML = liveStripInner(id);
  }
  liveTimer = setTimeout(liveTick, 10000);
}
// Matchs qui démarrent entre deux collectes : la liste officielle des matchs en cours est relue chaque minute
const LIVE_IDS = new Set();
let liveListAt = 0;
async function liveList() {
  if (Date.now() - liveListAt < 60000) return;
  liveListAt = Date.now();
  try {
    const j = await (await fetch("https://esports-api.lolesports.com/persisted/gw/getLive?hl=fr-FR", { headers: { "x-api-key": LOLE_KEY } })).json();
    const ids = (j?.data?.schedule?.events || []).filter(e => e.type === "match" && e.match?.id && e.state === "inProgress").map(e => e.match.id);
    const changed = ids.length !== LIVE_IDS.size || ids.some(id => !LIVE_IDS.has(id));
    LIVE_IDS.clear(); ids.forEach(id => LIVE_IDS.add(id));
    if (changed) render(false);
  } catch { /* liste indisponible : on garde l'état de la collecte */ }
}
setInterval(() => { if (route.game === "lol" && document.visibilityState === "visible") liveList(); }, 60000);

// --- Tournoi : carte identifiable
function tournamentCard(t) {
  const img = tournamentImage(t);
  const st = t.stages[currentStage(t)];
  const nxt = nextMatchOf(t);
  return `<a class="tcard" href="${href(t.game, "tournoi", t.id)}">
    <span class="tcard-media">${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}<span class="tcard-mono">${esc(initials(t.name))}</span></span>
    <span class="tcard-body">
      <span class="tcard-top">${statusChip(t.status)}${t.manual ? chip("Vérifié à la main", "soft") : ""}</span>
      <span class="tcard-name">${esc(t.name)}</span>
      <span class="tcard-meta">${esc(t.dates || `${fmtDay(t.startDate)} – ${fmtDay(t.endDate)}`)}${t.status === "live" && st ? ` · ${esc(st.name)}` : ""}</span>
      ${nxt ? `<span class="tcard-next">${nxt.state === "inProgress" ? "En cours" : "Prochain"} : ${esc(nxt.teams[0].code || nxt.teams[0].name)} – ${esc(nxt.teams[1].code || nxt.teams[1].name)} · ${nxt.state === "inProgress" ? "" : fmtDayTime(nxt.start)}</span>` : ""}
    </span>
  </a>`;
}

// --- Rangée de portraits (défilement explicite si elle déborde)
function portraitRow(ents, { game, stat = () => "", label = "Champions" } = {}) {
  if (!ents.length) return "";
  return `<div class="prow" role="list" aria-label="${esc(label)}">${ents.map(x => {
    const ent = entity(game, entKey(x));
    return `<a role="listitem" class="pcell" href="${sheetHref(game, ent.key)}" aria-label="${esc(ent.name)}${stat(x) ? `, ${esc(stat(x))}` : ""}">${portrait(ent)}<span class="pname">${esc(ent.name)}</span>${stat(x) ? `<span class="pstat">${esc(stat(x))}</span>` : ""}</a>`;
  }).join("")}</div>`;
}

// ============================================================ 6. Écrans

// --- Choix du jeu (premier lancement)
// Jeu verrouillé : la page reste visible en flou derrière une carte « bientôt », avec les jeux à venir à suivre
function lockedView(inner) {
  const name = SHORT[route.game] || "Ce jeu";
  return `<div class="locked-view">
    <div class="locked-blur" inert aria-hidden="true">${inner}</div>
    <section class="locked-card" aria-labelledby="locked-title">
      <span class="locked-ic">${icon("lock")}</span>
      <p class="label">Bientôt disponible</p>
      <h1 class="locked-title" id="locked-title" tabindex="-1">${esc(name)} arrive bientôt</h1>
      <p class="fine">MINDIFF se concentre d'abord sur League of Legends. Les autres jeux arrivent ensuite : touche l'étoile de ceux qui t'intéressent, on commencera par les plus demandés.</p>
      <ul class="soon-list">${SOON.map(([id, n]) => { const on = prefs.favGames.includes(id); return `<li><span>${esc(n)}</span><button class="icon-btn ${on ? "on" : ""}" data-action="fav-game" data-id="${id}" aria-pressed="${on}" aria-label="${on ? "Ne plus suivre" : "Ça m'intéresse"} : ${esc(n)}">${icon("star")}</button></li>`; }).join("")}</ul>
      <a class="btn primary" href="${href("lol")}">Revenir à League of Legends</a>
    </section>
  </div>`;
}
function viewSelect() {
  const games = [...GAMES_ON].sort((a, b) => prefs.favGames.includes(b.id) - prefs.favGames.includes(a.id));
  return `<section class="select">
    <h1 class="select-title" tabindex="-1">Choisissez votre jeu</h1>
    <p class="select-sub">Compétitions, méta et stratégies, à partir de sources vérifiées.</p>
    <div class="game-grid">${games.map(g => {
      const art = gameArt(g.id);
      const p = latestPatch(g.id);
      const live = allTournaments().filter(t => t.game === g.id && t.status === "live").sort((a, b) => prestige(a) - prestige(b))[0];
      const fav = prefs.favGames.includes(g.id);
      return `<div class="gtile${LOCKED.includes(g.id) ? " locked" : ""}">
        <a class="gtile-link" href="${href(g.id)}">
          <span class="gtile-media">${art ? `<img src="${esc(art)}" alt="" decoding="async" onerror="this.remove()">` : ""}</span>
          ${LOCKED.includes(g.id) ? `<span class="gtile-lock">${icon("lock")}Bientôt</span>` : ""}<span class="gtile-body"><span class="gtile-name">${esc(g.name)}</span>
            <span class="gtile-tags">${live ? `<span class="chip live"><span class="live-dot"></span>${esc(live.name)}</span>` : ""}${p ? chip(`Patch ${patchOf(p, editOf(p)) || ""}`, "soft") : ""}</span></span>
        </a>
        <button class="gtile-fav icon-btn ${fav ? "on" : ""}" data-action="fav-game" data-id="${g.id}" aria-pressed="${fav}" aria-label="${fav ? "Retirer des favoris" : "Ajouter aux favoris"} : ${esc(g.name)}">${icon("star")}</button>
      </div>`;
    }).join("")}</div>
  </section>`;
}

// --- Accueil : tableau de bord
function viewHome() {
  const g = route.game;
  const ts = forGame(allTournaments());
  const lead = featuredTournament(ts);

  // 1. Tournoi à la une
  let leadHtml = "";
  if (lead) {
    const img = tournamentImage(lead);
    const st = lead.stages[currentStage(lead)];
    const nxt = nextMatchOf(lead);
    leadHtml = `<section class="hero" aria-label="Tournoi à la une">
      <div class="hero-media">${img ? `<img src="${esc(img)}" alt="" decoding="async" onerror="this.remove()">` : `<span class="hero-mono">${esc(initials(lead.name))}</span>`}</div>
      <div class="hero-body">
        <div class="hero-top">${statusChip(lead.status)}${st && lead.status !== "finished" ? `<span class="hero-phase">${esc(st.name)}</span>` : ""}</div>
        <h1 class="hero-title" tabindex="-1">${esc(lead.name)}</h1>
        ${nxt ? `<div class="hero-next"><span class="label">${nxt.state === "inProgress" ? "En cours" : "Prochain match"}</span>${matchCard(nxt, lead, { withComp: false })}</div>`
          : lead.status === "finished" ? `<p class="hero-note">Compétition terminée${lead.manual ? " · résultats vérifiés à la main" : ""}.</p>` : ""}
        <a class="btn primary" href="${href(lead.game, "tournoi", lead.id)}">Explorer le tournoi${icon("chevron")}</a>
      </div>
    </section>`;
  }

  // 2. Accès rapides
  const quick = `<nav class="quick" aria-label="Accès rapides">
    <a class="qcell" href="${href(g, "competitions")}">${icon("trophy")}<span>Tournois</span></a>
    <a class="qcell" href="${href(g, "competitions", "matchs")}">${icon("calendar")}<span>Matchs</span></a>
    <a class="qcell" href="${href(g, "meta")}">${icon("tiers")}<span>Tier lists</span></a>
    <a class="qcell" href="${href(g, "coach")}">${icon("target")}<span>Coach</span></a>
  </nav>`;

  // 3. Prochains matchs (2 ou 3)
  const heroMatch = lead && nextMatchOf(lead);
  const upcoming = ts.flatMap(t => tMatches(t).map(m => ({ m, t }))).filter(x => (x.m.state === "unstarted" || x.m.state === "inProgress") && x.m.start && known(x.m) && x.m.id !== heroMatch?.id)
    .sort((a, b) => (a.m.state === "inProgress" ? -1 : 0) - (b.m.state === "inProgress" ? -1 : 0) || a.m.start.localeCompare(b.m.start)).slice(0, 3);
  const nextHtml = `<section class="sec">${secHead("Prochains matchs", seeAll(href(g, "competitions", "matchs")))}
    ${upcoming.length ? `<div class="mlist">${upcoming.map(x => matchCard(x.m, x.t)).join("")}</div>` : `<p class="inline-empty">Aucun match programmé dans les données${g === "val" ? " : le calendrier Valorant n'est pas encore relié à une source automatique" : ""}.</p>`}
  </section>`;

  // 4. Méta en bref
  const metaHtml = (g === "all" ? ENABLED_GAMES : [g]).map(gg => {
    const p = latestPatch(gg);
    const pe = p && editOf(p);
    const proT = (AUTO?.tournaments || []).filter(t => t.game === gg && t.stats?.totalGames >= 10).sort((a, b) => prestige(a) - prestige(b))[0];
    const ranked = TIERLISTS.find(t => t.game === gg && t.scope === "ranked");
    const S = (ranked?.groups.flatMap(gr => gr.tiers.S || []) || []).filter((x, i, arr) => arr.findIndex(y => entKey(y) === entKey(x)) === i);
    // Sans statistiques pros automatiques : tier list pro sourcée (S puis A), sinon le haut du ranked
    const proTl = !proT && TIERLISTS.find(t => t.game === gg && t.scope === "pro");
    const proTlEnts = proTl ? proTl.groups.flatMap(gr => [...(gr.tiers.S || []), ...(gr.tiers.A || [])]) : [];
    const ents = proT ? proT.stats.champions.slice(0, 5).map(c => ({ id: c.champ, stat: pct(c.presence) })) : proTlEnts.length ? proTlEnts.slice(0, 5) : S.slice(0, 5);
    if (!p && !ents.length) return "";
    return `<div class="metabox">
      <div class="metabox-head">
        ${p ? `<a class="patch-badge" href="${href(gg, "actus", keyOf(p))}"><span class="label">Patch</span><b>${esc(patchOf(p, pe) || "—")}</b></a>` : ""}
        <div class="metabox-txt"><p class="metabox-title">${proT ? `Les plus joués · ${esc(proT.name)}` : proTlEnts.length ? `Les plus joués · ${esc(proTl.title.replace(/^Pro\s*—\s*/, ""))}` : ranked ? `En haut du classement ranked` : ""}</p>
          <p class="fine">${proT ? `Taux de sélection sur ${proT.stats.totalGames} parties officielles` : proTlEnts.length ? esc(proTl.context || "") : ranked ? esc(ranked.context || "") : ""}${g === "all" ? ` · ${esc(SHORT[gg])}` : ""}</p></div>
      </div>
      ${portraitRow(ents, { game: gg, stat: x => x.stat || "", label: "Méta du moment" })}
      <div class="metabox-links"><a class="btn ghost sm" href="${href(gg, "meta")}">Tier list</a>${p ? `<a class="btn ghost sm" href="${href(gg, "actus", keyOf(p))}">Changements du patch</a>` : ""}</div>
    </div>`;
  }).join("");

  // 5. À retenir : trois brèves
  const news = forGame(allNews()).filter(editOf).sort((a, b) => importance(b) - importance(a)).slice(0, 3);
  const briefs = news.length ? `<section class="sec">${secHead("À retenir", seeAll(href(g, "actus")))}
    <div class="briefs">${news.map(i => {
      const e = editOf(i);
      const spoil = i.type === "esport" && hidden("n-" + keyOf(i));
      return `<a class="brief" href="${href(i.game, "actus", keyOf(i))}"><span class="brief-cat">${esc(TYPE_LABEL[i.type] || "Actu")}</span><span class="brief-title">${spoil ? "Résultat masqué (mode sans spoilers)" : esc(e.titre)}</span><span class="brief-date">${isEstimated(i) ? "date inconnue" : fmtDay(pubDate(i))}</span></a>`;
    }).join("")}</div></section>` : "";

  return `<div class="home">
    <div class="home-main">${leadHtml || empty("Aucune compétition suivie", "Aucun tournoi n'est disponible dans les données pour ce jeu.")}${g === "lol" ? coachHomeCard() : ""}${quick}</div>
    <div class="home-side">${nextHtml}${metaHtml ? `<section class="sec">${secHead("Méta en bref", seeAll(href(g, "meta")))}${metaHtml}</section>` : ""}${briefs}</div>
  </div>`;
}

// --- Compétitions : Tournois (par défaut) et Matchs
function viewCompetitions() {
  const g = route.game;
  const tab = route.rest[0] === "matchs" ? "matchs" : "tournois";
  return `<header class="page-head"><h1 class="page-title" tabindex="-1">Compétitions</h1></header>
    <nav class="tabs" aria-label="Compétitions">
      <a class="tab" href="${href(g, "competitions")}" ${tab === "tournois" ? 'aria-current="page"' : ""}>${icon("trophy")}Tournois</a>
      <a class="tab" href="${href(g, "competitions", "matchs")}" ${tab === "matchs" ? 'aria-current="page"' : ""}>${icon("calendar")}Matchs</a>
    </nav>
    ${tab === "tournois" ? tournamentsTab() : matchesTab()}`;
}

function tournamentsTab() {
  const ts = forGame(allTournaments());
  const groups = [["live", "En cours"], ["upcoming", "À venir"], ["finished", "Terminés"]].map(([k, l]) => [k, l, ts.filter(t => t.status === k).length]).filter(x => x[2]);
  if (!groups.length) return empty("Aucun tournoi suivi", "Les données ne contiennent pas encore de compétition pour ce jeu.");
  if (!groups.some(x => x[0] === ui.tFilter)) ui.tFilter = groups[0][0];
  const list = ts.filter(t => t.status === ui.tFilter).sort((a, b) => prestige(a) - prestige(b) || (b.lastMatch || "").localeCompare(a.lastMatch || ""));
  return `${seg("t-filter", groups, ui.tFilter, "Statut des tournois")}
    <div class="tgrid">${list.map(tournamentCard).join("")}</div>
    ${route.game === "val" ? `<p class="note">${icon("info")}<span>Valorant : seuls les résultats vérifiés à la main sont disponibles. Aucune source officielle accessible ne fournit encore le calendrier.</span></p>` : ""}`;
}

function matchesTab() {
  const ts = forGame(allTournaments());
  let all = ts.flatMap(t => tMatches(t).map(m => ({ m, t }))).filter(x => x.m.start && known(x.m));
  if (ui.comp) all = all.filter(x => x.t.id === ui.comp);
  if (ui.favOnly) all = all.filter(x => x.m.teams.some(tm => prefs.favTeams.includes(tm.name)));
  const days = [...new Set(all.map(x => localDay(x.m.start)))].sort();
  const today = localDay(new Date());
  if (!ui.day || !days.includes(ui.day)) ui.day = days.find(d => d >= today) || days.at(-1) || today;
  const i = days.indexOf(ui.day);
  const prev = i > 0 ? days[i - 1] : null;
  const next = i >= 0 && i < days.length - 1 ? days[i + 1] : null;
  const dayMatches = all.filter(x => localDay(x.m.start) === ui.day).sort((a, b) => a.m.start.localeCompare(b.m.start));
  const byComp = new Map();
  for (const x of dayMatches) { if (!byComp.has(x.t.id)) byComp.set(x.t.id, { t: x.t, ms: [] }); byComp.get(x.t.id).ms.push(x.m); }
  const comps = ts.filter(t => tMatches(t).some(m => m.start)).map(t => [t.id, t.name]);
  const noDated = !ts.some(t => tMatches(t).some(m => m.start));
  const dayLabel = ui.day === today ? "Aujourd'hui" : ui.day === localDay(Date.now() + 864e5) ? "Demain" : ui.day === localDay(Date.now() - 864e5) ? "Hier" : fmtDayKey(ui.day);
  return `<div class="datebar" role="group" aria-label="Choisir une date">
      <button class="icon-btn" data-action="day" data-id="${prev || ""}" ${prev ? "" : "disabled"} aria-label="Jour de matchs précédent">${icon("left")}</button>
      <div class="datebar-mid"><span class="datebar-label">${esc(dayLabel)}</span><span class="fine">${ui.day === today ? fmtDayKey(ui.day) : `${dayMatches.length} match${dayMatches.length > 1 ? "s" : ""}`}</span></div>
      <button class="icon-btn" data-action="day" data-id="${next || ""}" ${next ? "" : "disabled"} aria-label="Jour de matchs suivant">${icon("chevron")}</button>
    </div>
    <div class="toolbar">
      ${days.length ? `<button class="pill-btn" data-action="day" data-id="${days.find(d => d >= today) || days.at(-1)}">${days.includes(today) ? "Aujourd'hui" : days.some(d => d > today) ? "Prochains matchs" : "Derniers matchs"}</button>` : ""}
      <label class="date-pick"><span class="sr">Choisir une date</span><input type="date" data-action="day-pick" value="${ui.day}" ${days[0] ? `min="${days[0]}" max="${days.at(-1)}"` : ""}></label>
      ${comps.length > 1 ? sel("comp", [["", "Toutes les compétitions"], ...comps], ui.comp, "Compétition") : ""}
      ${prefs.favTeams.length ? `<button class="pill-btn ${ui.favOnly ? "on" : ""}" data-action="fav-only" aria-pressed="${ui.favOnly}">${icon("star")}Favoris</button>` : ""}
    </div>
    ${tzPicker()}<p class="fine">« En cours » uniquement si la source officielle le confirme.</p>
    ${noDated ? empty("Aucun calendrier disponible", route.game === "val" ? "Le calendrier Valorant n'est pas encore relié à une source automatique. Les résultats des Champions 2026 sont dans l'onglet Tournois." : "Les compétitions suivies ne fournissent pas d'horaires.")
      : byComp.size ? [...byComp.values()].map(({ t, ms }) => `<section class="sec"><div class="sec-head"><a class="comp-link" href="${href(t.game, "tournoi", t.id)}">${esc(t.name)}${icon("chevron")}</a></div><div class="mlist">${ms.map(m => matchCard(m, t, { withComp: false, line: true, day: false })).join("")}</div></section>`).join("")
      : empty("Aucun match ce jour", ui.favOnly ? "Aucun match de vos équipes favorites ce jour-là." : "")}`;
}

// --- Espace tournoi
function viewTournament() {
  const [tid, tabArg, sub] = route.rest;
  const t = findTournament(tid);
  if (!t) return empty("Tournoi introuvable", "Il n'est peut-être plus suivi ou le lien est ancien.", `<a class="btn" href="${href(route.game, "competitions")}">Voir les compétitions</a>`);
  const hasStandings = t.stages.some(s => s.sections.some(x => x.standings?.length)) || t.tables?.length;
  const tabs = T_TABS.filter(([id]) => (id !== "meta" || t.stats?.totalGames) && (id !== "equipes" || t.teams?.length) && (id !== "classement" || hasStandings));
  const tab = tabs.some(([id]) => id === tabArg) ? tabArg : "apercu";
  if (ui.tStage == null || ui.tStage >= t.stages.length) ui.tStage = currentStage(t);
  // Sous-pages : un match ou une équipe
  if (tab === "matchs" && sub) return matchPage(t, sub);
  if (tab === "equipes" && sub) return teamPage(t, sub);
  const img = tournamentImage(t);
  const st = t.stages[currentStage(t)];
  const body = { apercu: tOverview, matchs: tMatches_, classement: tStandings, equipes: tTeams, meta: tMeta }[tab](t);
  return `<header class="t-head">
      <a class="back" href="${href(route.game, "competitions")}">${icon("left")}Compétitions</a>
      <div class="t-id">
        ${logo(t.name, tournamentImage(t), "t-logo")}
        <div class="t-id-txt">
          <h1 class="page-title" tabindex="-1">${esc(t.name)}</h1>
          <p class="t-meta">${statusChip(t.status)}<span>${esc(t.dates || `${fmtDay(t.startDate)} – ${fmtDay(t.endDate)}`)}</span>${t.status === "live" && st ? `<span>· ${esc(st.name)}</span>` : ""}</p>
        </div>
      </div>
      ${t.stale ? `<p class="note warn">${icon("alert")}<span>Source officielle indisponible : données du ${fmtDayTime(t.asOf)}.</span></p>` : ""}
    </header>
    <div class="tabs-wrap">
      <button class="tabs-arrow prev" type="button" data-action="tabs-scroll" data-id="-1" aria-label="Onglets précédents" hidden>${icon("left")}</button>
      <nav class="tabs scroll" aria-label="Sections du tournoi">${tabs.map(([id, l]) => `<a class="tab" href="${href(route.game, "tournoi", t.id, id)}" ${tab === id ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
      <button class="tabs-arrow next" type="button" data-action="tabs-scroll" data-id="1" aria-label="Onglets suivants" hidden>${icon("chevron")}</button>
    </div>
    ${body}
    <p class="fine provenance">${t.manual ? `Résultats vérifiés à la main le ${fmtDay(t.asOf)}` : `Données officielles du ${fmtDayTime(t.asOf || AUTO.generatedAt)}`}${t.sources?.[0] ? ` · <a href="${esc(t.sources[0].url)}" target="_blank" rel="noopener">${esc(t.sources[0].name)}</a>` : ""}</p>`;
}

function spoilerGate(id, label, html) {
  if (!hidden(id)) return html;
  return `<div class="spoiler">${icon("eyeOff")}<span>${esc(label)} masqué</span><button class="btn ghost sm" data-action="reveal" data-id="${esc(id)}">Afficher</button></div>`;
}

function tOverview(t) {
  const ms = tMatches(t);
  const nxt = ms.filter(m => (m.state === "unstarted" || m.state === "inProgress") && known(m)).sort((a, b) => (a.state === "inProgress" ? -1 : 0) - (b.state === "inProgress" ? -1 : 0) || (a.start || "").localeCompare(b.start || "")).slice(0, 3);
  const done = ms.filter(m => m.state === "completed").sort((a, b) => (b.start || "").localeCompare(a.start || "")).slice(0, 3);
  const st = t.stages[currentStage(t)];
  const standings = st?.sections.find(x => x.standings?.length)?.standings || [];
  const a = tAnalysis(t);
  const meta = t.stats?.totalGames ? t.stats.champions.slice(0, 6) : [];
  const teamCount = new Set(ms.flatMap(m => m.teams.filter(x => x.code !== "TBD").map(x => x.name))).size;
  return `<div class="t-grid">
    <div class="t-col">
      <dl class="kpis">
        ${st ? `<div><dt>Phase</dt><dd>${esc(st.name)}</dd></div>` : ""}
        ${t.progress ? `<div><dt>Matchs joués</dt><dd>${t.progress.done}<small> / ${t.progress.total}</small></dd></div>` : ms.length ? `<div><dt>Matchs joués</dt><dd>${ms.filter(m => m.state === "completed").length}<small> / ${ms.length} listés</small></dd></div>` : ""}
        ${t.teams?.length ? `<div><dt>Équipes</dt><dd>${t.teams.length}</dd></div>` : teamCount ? `<div><dt>Équipes listées</dt><dd>${teamCount}</dd></div>` : ""}
        ${t.stats?.totalGames ? `<div><dt>Parties analysées</dt><dd>${t.stats.totalGames}</dd></div>` : ""}
      </dl>
      ${nxt.length ? `<section class="sec">${secHead("À venir", seeAll(href(t.game, "tournoi", t.id, "matchs"), "Calendrier"))}<div class="mlist">${nxt.map(m => matchCard(m, t, { withComp: false })).join("")}</div></section>` : ""}
      ${done.length ? `<section class="sec">${secHead("Derniers résultats", seeAll(href(t.game, "tournoi", t.id, "matchs"), "Tous les matchs"))}<div class="mlist">${done.map(m => matchCard(m, t, { withComp: false })).join("")}</div></section>` : ""}
    </div>
    <div class="t-col">
      ${isSwiss(st) ? `${secHead(`Bilans · ${esc(st.name)}`, seeAll(href(t.game, "tournoi", t.id, "classement"), "Complet"))}${swissCard(t, st)}` : ""}
      ${standings.length && !isSwiss(st) ? `<section class="sec">${secHead(`Classement · ${esc(st.name)}`, seeAll(href(t.game, "tournoi", t.id, "classement"), "Complet"))}${spoilerGate("t-" + t.id, "Classement", standingsTable(t, standings.slice(0, 6)))}</section>` : ""}
      ${meta.length ? `<section class="sec">${secHead("Méta observée", seeAll(href(t.game, "tournoi", t.id, "meta"), "Statistiques"))}${portraitRow(meta.map(c => ({ id: c.champ, stat: pct(c.presence) })), { game: t.game, stat: x => x.stat, label: "Champions les plus joués" })}<p class="fine">Taux de sélection : part des parties où le champion est choisi.</p></section>` : ""}
      ${a?.resume ? `<section class="sec">${secHead("Le point de la rédaction")}${spoilerGate("t-" + t.id, "Résumé du tournoi", `<p class="summary">${esc(a.resume)}</p>
        ${a.faits_marquants?.length || a.equipes_en_forme?.length || a.a_suivre?.length ? `<details class="more"><summary>Faits marquants, forme et enjeux</summary>
          ${a.faits_marquants?.length ? `<p class="label">Faits marquants</p>${bullets(a.faits_marquants)}` : ""}
          ${a.equipes_en_forme?.length ? `<p class="label">Forme des équipes</p>${bullets(a.equipes_en_forme)}` : ""}
          ${a.meta_pro ? `<p class="label">Méta pro</p><p>${esc(a.meta_pro)}</p>` : ""}
          ${a.a_suivre?.length ? `<p class="label">À suivre</p>${bullets(a.a_suivre)}` : ""}
        </details>` : ""}`)}</section>` : ""}
      ${notes(t.warnings)}
    </div>
  </div>`;
}

function tMatches_(t) {
  const stages = t.stages.map((s, i) => [i, s.name]);
  const stage = t.stages[ui.tStage];
  const ms = stage.sections.flatMap(sec => sec.matches.map(m => ({ m, sec })));
  const isBracket = /finale|play-?offs|knockout|élimination/i.test(stage.name) && ms.every(x => x.m.block);
  let body;
  if (isBracket) {
    const rounds = new Map();
    for (const { m } of ms) { const k = m.block || "Tour"; if (!rounds.has(k)) rounds.set(k, []); rounds.get(k).push(m); }
    body = `<div class="bracket" role="region" aria-label="Tableau final, défilement horizontal" tabindex="0">${[...rounds].map(([r, list]) => `<div class="round"><p class="label">${esc(r)}</p>${list.map(m => matchCard(m, t, { withComp: false })).join("")}</div>`).join("")}</div>`;
  } else {
    const days = new Map();
    for (const { m, sec } of ms.sort((a, b) => (a.m.start || "").localeCompare(b.m.start || ""))) {
      const k = m.start ? fmtWeekday(m.start) : (stage.sections.length > 1 ? sec.name : "Date non communiquée");
      if (!days.has(k)) days.set(k, []);
      days.get(k).push(m);
    }
    body = [...days].map(([d, list]) => `<section class="sec"><p class="day">${esc(d)}</p><div class="mlist">${list.map(m => matchCard(m, t, { withComp: false })).join("")}</div></section>`).join("") || empty("Aucun match dans cette phase");
  }
  return `${stages.length > 1 ? seg("t-stage", stages, ui.tStage, "Phase", "wrap") : ""}${isSwiss(stage) ? swissCard(t, stage) : ""}${isBracket ? "" : tzPicker()}${body}`;
}

// --- Système suisse : explication et groupes par bilan
const isSwiss = s => /suisse|swiss/i.test(s?.name || "");
function swissCard(t, stage) {
  const rows = stage.sections.flatMap(x => x.standings || []);
  const n = rows.length;
  const bos = [...new Set(stage.sections.flatMap(x => x.matches.map(m => m.bo)).filter(Boolean))].sort();
  // 16 équipes et 5 rondes au plus : qualifié à 3 victoires, éliminé à 3 défaites (format des Worlds et du MSI)
  const cut = n === 16 ? 3 : null;
  const groups = new Map();
  for (const r of rows) { const k = `${r.w}–${r.l}`; if (!groups.has(k)) groups.set(k, { w: r.w, l: r.l, teams: [] }); groups.get(k).teams.push(r); }
  const pools = [...groups.values()].sort((a, b) => b.w - a.w || a.l - b.l);
  const state = g => (cut && g.w >= cut ? "up" : cut && g.l >= cut ? "down" : "");
  return `<section class="sec swiss">
    <details class="more"><summary>${icon("info")}Comment marche le système suisse ?</summary>
      <p>Pas de groupes fixes : à chaque ronde, une équipe affronte une adversaire <b>qui a le même bilan qu'elle</b> (2 victoires contre 2 victoires, 1–1 contre 1–1…). Les adversaires changent à chaque ronde et ne se croisent pas deux fois.</p>
      ${cut ? `<p>Ici, ${n} équipes : <b>${cut} victoires et c'est la qualification</b> pour la phase finale, <b>${cut} défaites et c'est l'élimination</b>. Personne ne joue plus de 5 matchs.</p>` : `<p>Une équipe avance dès qu'elle atteint le nombre de victoires requis et sort dès qu'elle atteint le nombre de défaites fixé par le règlement du tournoi.</p>`}
      ${bos.includes(1) && bos.includes(3) && /^(worlds|msi)$/.test(t.leagueSlug) ? `<p>Les matchs qui décident d'une qualification ou d'une élimination se jouent au meilleur des 3 manches (BO3), les autres en une seule manche (BO1) : un faux pas en BO1 ne condamne pas, mais il oblige à gagner les suivants.</p>` : bos.length === 1 ? `<p>Tous les matchs de cette phase se jouent en BO${bos[0]}.</p>` : ""}
      ${bos.length > 1 && !/^(worlds|msi)$/.test(t.leagueSlug) ? `<p>Selon la ronde, les matchs se jouent en ${bos.map(b => `BO${b}`).join(" ou ")}.</p>` : ""}
      <p>Pourquoi ce format : chaque équipe joue plusieurs adversaires de son niveau, et un seul mauvais match ne suffit pas à l'éliminer.</p>
      ${t.leagueSlug === "worlds" ? `<p class="fine">Règlement des Worlds : <a href="https://liquipedia.net/leagueoflegends/World_Championship/${esc(t.name.match(/20\d\d/)?.[0] || "")}" target="_blank" rel="noopener">format détaillé (Liquipedia)</a>.</p>` : ""}
    </details>
    ${n && !hidden("t-" + t.id) ? `<div class="pools">${pools.map(g => `<div class="pool ${state(g)}"><p class="pool-head"><b>${g.w}–${g.l}</b>${state(g) === "up" ? "<span>Qualifiées</span>" : state(g) === "down" ? "<span>Éliminées</span>" : ""}</p>
      <div class="pool-teams">${g.teams.map(r => `<a href="${href(t.game, "tournoi", t.id, "equipes", r.team)}" title="${esc(r.team)}">${logo(r.team, r.image, "sm")}<span>${esc(r.code || r.team)}</span></a>`).join("")}</div></div>`).join("")}</div>` : ""}
  </section>`;
}

function standingsTable(t, rows) {
  const games = rows.some(r => r.gw != null);
  return `<div class="table-wrap"><table class="standings">
    <thead><tr><th scope="col">#</th><th scope="col">Équipe</th><th scope="col" class="num">V–D</th>${games ? '<th scope="col" class="num">Parties</th>' : ""}</tr></thead>
    <tbody>${rows.map((r, i) => `<tr><td class="rank">${r.rank ?? i + 1}</td><td><a class="cell-team" href="${href(t.game, "tournoi", t.id, "equipes", r.team)}">${logo(r.team, r.image, "sm")}<span>${esc(r.team)}</span>${prefs.favTeams.includes(r.team) ? icon("star", "fav-ic") : ""}</a></td><td class="num"><b>${r.w}–${r.l}</b></td>${games ? `<td class="num muted">${r.gw}–${r.gl}</td>` : ""}</tr>`).join("")}</tbody>
  </table></div>`;
}

function tStandings(t) {
  const tables = t.stages.flatMap(s => s.sections.filter(x => x.standings?.length).map(x => ({ title: s.sections.length > 1 ? `${s.name} · ${x.name}` : s.name, rows: x.standings })));
  const manual = (t.tables || []).map(tb => `<section class="sec">${secHead(esc(tb.title))}<div class="table-wrap"><table class="standings"><thead><tr>${tb.columns.map(c => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>${tb.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${sourceList(tb.sources)}</section>`).join("");
  return spoilerGate("t-" + t.id, "Classement", tables.map(tb => `<section class="sec">${secHead(esc(tb.title))}${standingsTable(t, tb.rows)}</section>`).join("") + manual || empty("Pas de classement disponible"));
}

function tTeams(t) {
  return `<div class="teamgrid">${t.teams.map(x => `<a class="teamcell" href="${href(t.game, "tournoi", t.id, "equipes", x.team)}">${logo(x.team, x.image, "lg")}<span class="teamcell-name">${esc(x.team)}</span>${teamInfo(x.team)?.seed?.[t.id]?.short ? `<span class="fine">${esc(teamInfo(x.team).seed[t.id].short)}</span>` : ""}${hidden("t-" + t.id) ? "" : `<span class="fine">${x.w}–${x.l}</span>`}${prefs.favTeams.includes(x.team) ? icon("star", "fav-ic corner") : ""}</a>`).join("")}</div>`;
}

function tMeta(t) {
  const s = t.stats;
  let rows = s.champions.filter(c => ui.tMetaRole === "all" || c.role === ui.tMetaRole);
  const key = { picks: c => -c.picks, presence: c => -c.presence, winrate: c => -(c.known >= 3 ? c.winrate : -1) }[ui.tMetaSort];
  rows = [...rows].sort((a, b) => key(a) - key(b));
  const roles = [["all", "Tous"], ...LOL_ROLES.filter(([r]) => s.champions.some(c => c.role === r))];
  return `${seg("t-meta-role", roles, ui.tMetaRole, "Rôle", "wrap")}
    <div class="toolbar">${sel("t-meta-sort", [["picks", "Plus joués"], ["presence", "Taux de sélection"], ["winrate", "Taux de victoire"]], ui.tMetaSort, "Trier")}<span class="fine">${s.totalGames} parties officielles · bans non fournis par l'API</span></div>
    <div class="table-wrap"><table class="meta-table">
      <thead><tr><th scope="col">Champion</th><th scope="col" class="num">Picks</th><th scope="col">Sélection</th><th scope="col" class="num">Victoires</th></tr></thead>
      <tbody>${rows.map(c => { const ent = entity(t.game, c.champ); return `<tr>
        <td><a class="cell-team" href="${sheetHref(t.game, ent.key)}">${portrait(ent, "sm")}<span><b>${esc(ent.name)}</b><small>${esc(ROLE_LABEL[c.role] || c.role)}</small></span></a></td>
        <td class="num">${c.picks}</td>
        <td><span class="bar"><span style="width:${Math.round(c.presence * 100)}%"></span></span>${pct(c.presence)}</td>
        <td class="num">${c.known >= 3 && !hidden("t-" + t.id) ? `${pct(c.winrate)}<small> (${c.known})</small>` : '<span class="muted">—</span>'}</td>
      </tr>`; }).join("")}</tbody></table></div>
    ${tMatches(t).some(m => m.verified === false) ? `<p class="note warn">${icon("alert")}<span>Certains matchs sont exclus des taux de victoire : vainqueur des parties non vérifiable.</span></p>` : ""}`;
}

// --- Page d'un match
function matchPage(t, mid) {
  let m = tMatches(t).find(x => x.id === mid);
  if (m?.state === "unstarted" && LIVE_IDS.has(m.id)) m = { ...m, state: "inProgress" }; // démarré depuis la dernière collecte
  if (!m) return empty("Match introuvable", "", `<a class="btn" href="${href(t.game, "tournoi", t.id, "matchs")}">Calendrier du tournoi</a>`);
  const done = m.state === "completed";
  const hide = done && hidden(m.id);
  const [a, b] = m.teams;
  const e = EDITORIAL.matches?.[m.id];
  const teamLink = x => t.teams?.some(y => y.team === x.name) ? href(t.game, "tournoi", t.id, "equipes", x.name) : null;
  const side = (x) => { const to = teamLink(x); const inner = `${logo(x.name, x.image, "xl")}<span class="sb-name">${esc(x.name)}</span>`; return to ? `<a class="sb-team ${done && !hide && x.outcome === "win" ? "win" : ""}" href="${to}">${inner}</a>` : `<span class="sb-team ${done && !hide && x.outcome === "win" ? "win" : ""}">${inner}</span>`; };
  const name = id => m.teams.find(x => x.id === id)?.name || "?";
  return `<header class="t-head">
      <a class="back" href="${href(t.game, "tournoi", t.id, "matchs")}">${icon("left")}${esc(t.name)}</a>
    </header>
    <section class="scoreboard" aria-label="Score">
      <p class="sb-meta">${esc(m.block || "")}${m.bo ? ` · Bo${m.bo}` : ""} · ${esc(MATCH_STATE[m.state] || "")}${m.start ? ` · ${fmtDayTime(m.start)} (heure de ${esc(tzLabel(m.start))})` : ""}</p>
      <div class="sb-row">
        ${side(a)}
        <div class="sb-center">${m.state === "inProgress" ? `<span class="mc-live">En cours</span>` : done ? (hide ? `<button class="btn ghost sm" data-action="reveal" data-id="${esc(m.id)}">${icon("eye")}Afficher le score</button>` : `<span class="sb-score"><b class="${a.outcome === "win" ? "w" : ""}">${a.score ?? "V"}</b><i>–</i><b class="${b.outcome === "win" ? "w" : ""}">${b.score ?? "D"}</b></span>`) : m.start ? `<span class="sb-time">${fmtTime(m.start)}</span>` : ""}</div>
        ${side(b)}
      </div>
    </section>
    ${m.state === "inProgress" && t.game === "lol" && !prefs.noSpoil ? liveStrip(m.id, true) : ""}
    ${!done && t.sources?.[0] ? `<a class="btn ghost" href="${esc(t.sources[0].url)}" target="_blank" rel="noopener">${icon("play")}Suivre sur ${esc(t.sources[0].name)}</a>` : ""}
    ${done && !hide && !m.games?.length && t.game === "lol" ? `<section class="sec">${secHead("Résumé de la partie")}<div data-story-match="${esc(m.id)}">${storyMatchInner(m)}</div></section>` : ""}
    ${done ? (hide ? spoilerGate(m.id, "Résumé et détails", "") : `
      <section class="sec">${secHead("Résumé")}<p class="summary">${esc(e?.resume || m.summary || autoSummary(m))}</p>
        ${e?.cles?.length ? `<p class="label">Moments clés</p>${bullets(e.cles)}` : ""}
        ${e?.analyse ? `<details class="more"><summary>Analyse esport</summary><p>${esc(e.analyse)}</p><p class="fine">Interprétation de la rédaction à partir des picks, kills et scores officiels.</p></details>` : `<p class="fine">${t.game === "lol" ? "Le déroulé de chaque partie (tournant, objectifs, joueurs décisifs) est détaillé ci-dessous, d'après les données officielles." : "Analyse en cours de rédaction · résumé calculé à partir des données officielles."}</p>`}
      </section>
      ${m.maps ? `<section class="sec">${secHead("Cartes")}<div class="maps">${m.maps.map(([n, x, y]) => `<span class="map"><span>${esc(n)}</span><b>${x}–${y}</b></span>`).join("")}</div></section>` : ""}
      ${m.games?.length ? `<section class="sec">${secHead("Partie par partie")}
        ${m.verified === false ? `<p class="note warn">${icon("alert")}<span>Vainqueur de chaque partie non vérifié : le décompte ne correspond pas au score officiel.</span></p>` : ""}
        <div class="games">${m.games.map(g => `<article class="game">
          <div class="game-head"><b>Partie ${g.n}</b>${g.winnerTeamId ? `<span class="chip">Victoire ${esc(name(g.winnerTeamId))}</span>` : ""}${g.kills ? `<span class="fine">${g.kills.blue}–${g.kills.red} kills</span>` : ""}${g.vod ? `<a class="vod" href="${esc(g.vod)}" target="_blank" rel="noopener">${icon("play")}Revoir</a>` : ""}</div>
          ${recapStrip(g, m)}
          ${storyBox(g.id, m)}
          ${["blue", "red"].map(sd => `<div class="draft ${g.winnerTeamId === g[sd].teamId ? "win" : ""}"><span class="draft-team">${esc(name(g[sd].teamId))}</span>
            <div class="draft-picks">${g[sd].picks.map(p => { const st = gameStory(g.id, m); const j = st?.fin ? st.players.findIndex(q => q.side === sd && (q.champ === p.champ || q.name === p.player)) : -1; return ppPick(g.id, j, p.champ, p.player, p.role); }).join("")}</div></div>`).join("")}
          ${gameStory(g.id, m)?.fin ? `<p class="fine pp-hint">${window.LANG === "en" ? "Tap a player to see their game: KDA, kills to the second, items." : "Touche un joueur pour voir sa partie : KDA, kills à la seconde, objets."}</p>` : ""}
          ${ppPanel(g.id, m)}
        </article>`).join("")}</div></section>` : ""}`) : ""}`;
}

// --- Fiche d'une équipe : identité, présentation rédigée à partir des faits, palmarès, draft
const COUNTRY = (() => { try { return new Intl.DisplayNames(["fr"], { type: "region" }); } catch { return null; } })();
const MONTH = d => new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const ordFr = n => (n === 1 ? "1re" : `${n}e`);
const listFr = a => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} et ${a.at(-1)}`);
const placeFr = p => (p === 1 ? "vainqueur" : p === 2 ? "finaliste" : `${ordFr(p)} place`);
// « en France », « au Brésil », « aux États-Unis », « à Taïwan »
const inCountry = c => (/^(Brésil|Viêt Nam|Vietnam|Japon|Canada|Mexique|Chili|Pérou|Danemark|Portugal|Royaume-Uni|Luxembourg|Maroc)$/.test(c) ? `au ${c}` : /^(États-Unis|Pays-Bas|Émirats arabes unis)$/.test(c) ? `aux ${c}` : /^(Taïwan|Singapour|Hong Kong|Macao)$/.test(c) ? `à ${c}` : `en ${c}`);
const teamInfo = name => AUTO?.teams?.[name] || null;

// Champions et côtés joués par l'équipe dans ce tournoi (picks officiels de chaque partie)
function teamDraft(t, x) {
  const champs = new Map(), sides = { blue: { n: 0, w: 0 }, red: { n: 0, w: 0 } };
  let n = 0;
  for (const m of tMatches(t)) {
    const me = m.teams.find(y => y.name === x.team);
    if (!me || !m.games?.length) continue;
    for (const g of m.games) {
      const side = g.blue?.teamId === me.id ? "blue" : g.red?.teamId === me.id ? "red" : null;
      if (!side) continue;
      const won = m.verified !== false && g.winnerTeamId ? g.winnerTeamId === me.id : null;
      n++; sides[side].n++; if (won) sides[side].w++;
      for (const p of g[side].picks) { const c = champs.get(p.champ) || { champ: p.champ, role: p.role, n: 0, w: 0 }; c.n++; if (won) c.w++; champs.set(p.champ, c); }
    }
  }
  return { n, sides, champs: [...champs.values()].sort((a, b) => b.n - a.n || b.w - a.w) };
}

// Présentation courte : uniquement des faits sourcés (API officielle, Liquipedia), reformulés
function teamBrief(t, x, info, draft) {
  const out = [];
  const lq = info?.lq;
  const country = lq?.country && COUNTRY ? COUNTRY.of(lq.country) : null;
  const year = lq?.created?.slice(0, 4);
  if (country || year || info?.league) out.push(`Équipe${country ? ` basée ${inCountry(country)}` : ""}${year ? `, fondée en ${year}` : ""}${info?.league ? `, qui dispute la ${info.league}` : ""}.`);
  const seed = info?.seed?.[t.id]?.label;
  if (seed) out.push(`Qualifiée pour ${t.name} : ${seed.charAt(0).toLowerCase() + seed.slice(1)}.`);
  const W = info?.intl?.worlds, M = info?.intl?.msi;
  if (W?.titles.length) out.push(`${W.titles.length > 1 ? `${W.titles.length} fois championne du monde` : "Championne du monde"} (${listFr(W.titles.map(String))}).`);
  else if (W?.finals.length) out.push(`Finaliste des Worlds en ${listFr(W.finals.map(String))}, sans titre mondial.`);
  else if (W?.apps) out.push(`${W.apps} participation${W.apps > 1 ? "s" : ""} aux Worlds jusqu'en ${W.upTo}, sans finale.`);
  if (M?.titles.length) out.push(`Vainqueur du MSI en ${listFr(M.titles.map(String))}.`);
  const res = (lq?.results || []).filter(r => r.place <= 2);
  const lastTitle = res.find(r => r.place === 1);
  const recent = res.filter(r => (Date.now() - new Date(r.date)) / 864e5 < 365);
  if (recent.length) out.push(`Sur les douze derniers mois : ${listFr(recent.slice(0, 3).map(r => `${r.event} (${placeFr(r.place)}, ${MONTH(r.date)})`))}.`);
  else if (lastTitle) out.push(`Dernier titre : ${lastTitle.event} (${MONTH(lastTitle.date)}).`);
  if (!hidden("t-" + t.id) && (x.w || x.l)) {
    const top = draft.champs.slice(0, 3).map(c => entity(t.game, c.champ).name);
    out.push(`Dans ce tournoi : ${x.w} victoire${x.w > 1 ? "s" : ""} pour ${x.l} défaite${x.l > 1 ? "s" : ""}${top.length && draft.n >= 3 ? ` ; champions les plus choisis : ${listFr(top)}` : ""}.`);
  }
  return out;
}

function teamPage(t, teamName) {
  const x = t.teams?.find(y => y.team === teamName);
  if (!x) return empty("Équipe introuvable", "", `<a class="btn" href="${href(t.game, "tournoi", t.id, "equipes")}">Équipes du tournoi</a>`);
  const ms = tMatches(t).filter(m => m.teams.some(y => y.name === x.team)).sort((a, b) => (b.start || "").localeCompare(a.start || ""));
  const players = (t.stats?.players || []).filter(p => p.team === x.team).sort((a, b) => LOL_ROLES.findIndex(r => r[0] === a.role) - LOL_ROLES.findIndex(r => r[0] === b.role));
  const fav = prefs.favTeams.includes(x.team);
  const info = teamInfo(x.team), lq = info?.lq, seed = info?.seed?.[t.id];
  const draft = teamDraft(t, x);
  const brief = teamBrief(t, x, info, draft);
  const spoil = hidden("t-" + t.id);
  const W = info?.intl?.worlds, M = info?.intl?.msi;
  const podiums = (lq?.results || []).filter(r => r.place <= 3);
  const roster = (info?.players || []).sort((a, b) => LOL_ROLES.findIndex(r => r[0] === a.role) - LOL_ROLES.findIndex(r => r[0] === b.role));
  const winTxt = (w, n) => (spoil || !n ? "" : ` · ${w} V – ${n - w} D`);
  return `<header class="t-head">
      <a class="back" href="${href(t.game, "tournoi", t.id, "equipes")}">${icon("left")}${esc(t.name)}</a>
      <div class="t-id">${logo(x.team, x.image, "xl")}<div class="t-id-txt"><h1 class="page-title" tabindex="-1">${esc(x.team)}</h1>
        <p class="t-meta">${x.code ? `<span class="chip soft">${esc(x.code)}</span>` : ""}${info?.league ? `<span>${esc(info.league)}</span>` : ""}${seed ? `<span class="chip">${esc(seed.label)}</span>` : ""}</p>
        <p class="t-meta">${spoil ? "Bilan masqué" : `<b>${x.w}–${x.l}</b><span>en séries</span>${x.gw != null ? `<span>· ${x.gw}–${x.gl} en parties</span>` : ""}`}</p></div>
        <button class="icon-btn ${fav ? "on" : ""}" data-action="fav-team" data-id="${esc(x.team)}" aria-pressed="${fav}" aria-label="${fav ? "Retirer des équipes favorites" : "Ajouter aux équipes favorites"}">${icon("star")}</button></div>
    </header>
    ${brief.length ? `<section class="sec">${secHead("Présentation")}<p class="summary">${brief.map(esc).join(" ")}</p></section>` : ""}
    ${W || M || podiums.length ? `<section class="sec">${secHead("Palmarès")}
      ${W || M?.titles.length ? `<dl class="kpis">${W ? `<div><dt>Titres mondiaux</dt><dd>${W.titles.length}</dd></div><div><dt>Worlds disputés</dt><dd>${W.apps}<small> jusqu'en ${W.upTo}</small></dd></div>` : ""}${M?.titles.length ? `<div><dt>Titres au MSI</dt><dd>${M.titles.length}</dd></div>` : ""}</dl>` : ""}
      ${podiums.length ? `<ul class="palmares">${podiums.slice(0, 8).map(r => `<li><span class="pl pl-${r.place}">${r.place === 1 ? icon("trophy") : ordFr(r.place)}</span><span><b>${esc(r.event)}</b><small>${esc(MONTH(r.date))}${r.vs ? ` · ${r.place <= 2 ? "finale" : "dernier match"} contre ${esc(r.vs)}${r.score ? ` (${esc(r.score.replace(/\s/g, ""))})` : ""}` : ""}</small></span></li>`).join("")}</ul>
        ${podiums.length > 8 ? `<details class="more"><summary>${podiums.length - 8} autres podiums</summary><ul class="palmares">${podiums.slice(8).map(r => `<li><span class="pl pl-${r.place}">${r.place === 1 ? icon("trophy") : ordFr(r.place)}</span><span><b>${esc(r.event)}</b><small>${esc(MONTH(r.date))}</small></span></li>`).join("")}</ul></details>` : ""}` : ""}
      <p class="fine">Podiums des tournois majeurs (rangs S et A). Source : <a href="${esc(lq?.url || W?.url || "https://liquipedia.net/leagueoflegends")}" target="_blank" rel="noopener">Liquipedia</a> (CC BY-SA)${lq?.at ? `, relu le ${fmtDay(lq.at)}` : ""}.</p>
    </section>` : ""}
    ${draft.n ? `<section class="sec">${secHead("Draft dans ce tournoi")}
      <p class="fine">${draft.n} partie${draft.n > 1 ? "s" : ""} · côté bleu ${draft.sides.blue.n}${winTxt(draft.sides.blue.w, draft.sides.blue.n)} · côté rouge ${draft.sides.red.n}${winTxt(draft.sides.red.w, draft.sides.red.n)}</p>
      <div class="player-picks">${draft.champs.slice(0, 10).map(c => { const ent = entity(t.game, c.champ); return `<a class="pick" href="${sheetHref(t.game, ent.key)}" aria-label="${esc(ent.name)}, ${esc(ROLE_LABEL[c.role] || c.role)}, choisi ${c.n} fois${spoil ? "" : `, ${c.w} victoire${c.w > 1 ? "s" : ""}`}">${portrait(ent, "sm")}<small>×${c.n}${spoil ? "" : ` · ${c.w}V`}</small></a>`; }).join("")}</div>
      <p class="fine">Champions choisis par l'équipe, du plus fréquent au moins fréquent. Les bannissements ne sont pas fournis par l'API officielle.</p>
    </section>` : ""}
    ${!players.length && roster.length ? `<section class="sec">${secHead("Effectif")}<div class="players">${roster.map(p => `<div class="player"><p class="player-head"><b>${esc(p.name)}</b>${seed?.captain && seed.captain.toLowerCase() === p.name.toLowerCase() ? '<span class="chip">Capitaine</span>' : ""}<span class="chip soft">${esc(ROLE_LABEL[p.role] || p.role)}</span></p>${p.first ? `<p class="fine">${esc(`${p.first} ${p.last || ""}`.trim())}</p>` : ""}</div>`).join("")}</div><p class="fine">Effectif déclaré sur LoL Esports (officiel).</p></section>` : ""}
    ${players.length ? `<section class="sec">${secHead("Joueurs et champions joués")}<div class="players">${players.map(p => `<div class="player"><p class="player-head"><b>${esc(p.player)}</b><span class="chip soft">${esc(ROLE_LABEL[p.role] || p.role)}</span></p>
      <div class="player-picks">${Object.entries(p.champs).sort((a, b) => b[1] - a[1]).map(([c, n]) => { const ent = entity(t.game, c); return `<a class="pick" href="${sheetHref(t.game, ent.key)}" aria-label="${esc(ent.name)}, ${n} partie${n > 1 ? "s" : ""}">${portrait(ent, "sm")}<small>×${n}</small></a>`; }).join("")}</div></div>`).join("")}</div></section>` : ""}
    <section class="sec">${secHead("Matchs")}<div class="mlist">${ms.map(m => matchCard(m, t, { withComp: false })).join("")}</div></section>`;
}

// --- Méta : tier lists et tendances
function metaSources(g) {
  const out = [];
  const proT = (AUTO?.tournaments || []).filter(t => t.game === g && t.stats?.totalGames >= 10).sort((a, b) => prestige(a) - prestige(b) || b.stats.totalGames - a.stats.totalGames)[0];
  if (proT) out.push({ id: "pro-auto", scope: "pro", t: proT });
  for (const tl of TIERLISTS.filter(t => t.game === g)) out.push({ id: "tl-" + TIERLISTS.indexOf(tl), scope: tl.scope || "ranked", tl });
  return out;
}
function viewMeta() {
  const g = route.game === "all" ? (prefs.game && prefs.game !== "all" ? prefs.game : "lol") : route.game;
  const lists = metaSources(g);
  if (!lists.length) return `<header class="page-head"><h1 class="page-title" tabindex="-1">Méta</h1></header>${empty("Pas de tier list fiable", "Aucune source vérifiée ne fournit de classement pour ce jeu.")}`;
  const scopes = [["pro", "Compétition pro"], ["ranked", "Ranked"]].filter(([s]) => lists.some(l => l.scope === s));
  if (!scopes.some(s => s[0] === ui.metaScope)) ui.metaScope = scopes[0][0];
  const inScope = lists.filter(l => l.scope === ui.metaScope);
  const p = latestPatch(g);
  const pe = p && editOf(p);

  const unit = g === "lol" ? "champion" : "agent";
  const blocks = inScope.map(L => L.scope === "pro" ? proBlock(g, L) : rankedBlock(g, L.tl)).join("");
  const roleOpts = g === "lol" ? [["all", "Tous"], ...LOL_ROLES] : [["all", "Tous"], ...[...new Set((rosters.val || []).map(a => VAL_ROLE_FR[a.role] || a.role).filter(Boolean))].map(r => [r, r])];
  return `<header class="page-head meta-head"><h1 class="page-title" tabindex="-1">Méta</h1>
      ${p ? `<a class="patchchip" href="${href(g, "actus", keyOf(p))}" aria-label="Patch ${esc(patchOf(p, pe) || "")} : notes officielles du ${fmtDate(pubDate(p))}"><span class="patchchip-num">Patch ${esc(patchOf(p, pe) || "—")}</span><span class="patchchip-txt">Notes du ${fmtDay(pubDate(p))}</span>${icon("chevron")}</a>` : ""}
    </header>
    <div class="filters">
      ${scopes.length > 1 ? seg("meta-scope", scopes, ui.metaScope, "Contexte") : ""}
      ${roleOpts.length > 2 ? seg("meta-role", roleOpts, ui.metaRole, "Rôle", "wrap small") : ""}
    </div>
    ${blocks}
    <p class="fine">Touchez un ${unit} pour voir ses classements, ses stats et les contenus liés.</p>`;
}

// Version technique du client (flux des parties officielles) et lien, non officiel, avec le patch destiné aux joueurs
function clientVersions(t) {
  return [...new Set(tMatches(t).flatMap(m => (m.games || []).map(x => x.patch)).filter(Boolean))].sort();
}
function versionNote(g, versions) {
  const p = latestPatch(g);
  const num = p && patchOf(p, editOf(p));
  const probable = num && versions.length === 1 && versions[0].split(".")[1] === num.split(".")[1];
  return probable
    ? `Les parties sont jouées en version client ${versions[0]}, le numéro technique du jeu. Elle correspond très probablement au patch ${num} (même numéro de cycle, et Riot présente le ${num} comme patch du tournoi), mais Riot ne publie pas cette correspondance : elle n'est pas confirmée.`
    : versions.length ? `Versions client des parties (numéro technique du jeu) : ${versions.join(", ")}. Riot ne publie pas leur correspondance avec les noms de patch.` : "Version du jeu non fournie par la source.";
}

// Tranches de taux de sélection : une lecture de fréquence, pas un classement de puissance
const BANDS = [[0.25, "25 % et plus"], [0.15, "15 à 25 %"], [0.08, "8 à 15 %"], [0, "Moins de 8 %"]];
const parseRate = s => { const m = String(s || "").match(/(\d+(?:[.,]\d+)?)\s*%/); return m ? parseFloat(m[1].replace(",", ".")) / 100 : null; };
function bandRows(g, ents, rateOf) {
  const groups = new Map([...BANDS.map(([, l]) => [l, []]), ["Taux global non communiqué", []]]);
  for (const e of ents) { const r = rateOf(e); groups.get(r == null ? "Taux global non communiqué" : BANDS.find(([min]) => r >= min)[1]).push(e); }
  const filled = [...groups].filter(([, list]) => list.length);
  return filled.length ? filled.map(([label, list]) => `<div class="band"><p class="band-label">${esc(label)}</p>${portraitRow(list, { game: g, stat: x => x.stat || "", label }).replace('class="prow"', 'class="prow wrap"')}</div>`).join("") : `<p class="inline-empty">Aucun élément pour ce filtre.</p>`;
}

function proBlock(g, L) {
  const unitPl = g === "lol" ? "Champions" : "Agents";
  if (L.t) {
    const t = L.t, s = t.stats;
    const versions = clientVersions(t);
    const rows = s.champions.filter(c => c.picks >= 3 && (ui.metaRole === "all" || c.role === ui.metaRole)).map(c => ({ id: c.champ, stat: pct(c.presence), rate: c.presence }));
    const matches = tMatches(t).filter(m => m.games?.length).length;
    return `<section class="tierlist">
      <div class="tl-head"><p class="label">Compétition pro · fréquence de sélection</p><h2 class="tl-title">${unitPl} les plus joués · ${esc(t.name)}</h2>
        <p class="tl-meta">${chip(`${s.totalGames} parties · ${matches} matchs`)}${versions.length ? chip(`Version client ${versions.join(", ")}`, "soft") : ""}<span class="fine">Données officielles du ${fmtDay(t.asOf || AUTO.generatedAt)}</span></p></div>
      ${bandRows(g, rows, e => e.rate)}
      <details class="more"><summary>Comment est calculé ce classement ?</summary>
        <p>Pour chaque champion, on compte les parties officielles où il a été choisi, divisé par le nombre total de parties analysées (${s.totalGames}). Un champion ne peut être choisi qu'une fois par partie : ce taux de sélection va donc de 0 à 100 %.</p>
        <p>Il mesure la popularité chez les pros, pas la puissance : un champion peut être très joué sans beaucoup gagner. Les bans ne sont pas fournis par l'API officielle et ne sont donc pas comptés. Seuls les champions choisis au moins 3 fois sont affichés.</p>
        <p>${esc(versionNote(g, versions))}</p>
        <p>Taux de victoire, rôles et détail par champion : <a href="${href(g, "tournoi", t.id, "meta")}">statistiques du tournoi</a>.</p>
      </details>
      ${sourceList(t.sources)}
    </section>`;
  }
  // Liste pro sourcée (ex. Valorant Champions) : taux rapportés par la source
  const tl = L.tl;
  let ents = tl.groups.flatMap(gr => Object.values(gr.tiers).flat());
  if (g === "val" && ui.metaRole !== "all") ents = ents.filter(e => norm(entity("val", entKey(e)).sub) === norm(ui.metaRole));
  return `<section class="tierlist">
    <div class="tl-head"><p class="label">Compétition pro · fréquence de sélection</p><h2 class="tl-title">${unitPl} les plus joués · ${esc(tl.title.replace(/^Pro\s*—\s*/, ""))}</h2>
      <p class="tl-meta">${chip(tl.context || "")}${tl.patch ? chip(/non précisé/.test(tl.patch) ? "Patch non précisé" : `Patch ${tl.patch}`, "soft") : ""}<span class="fine">Relevé le ${fmtDay(tl.updated)}</span></p></div>
    ${bandRows(g, ents, e => parseRate(e.stat))}
    <details class="more"><summary>Comment est calculé ce classement ?</summary>
      <p>${esc(tl.basis)} Ce taux mesure la fréquence de sélection chez les pros, pas la puissance.</p>
      <p>Les agents sans taux global sont cités par la source pour leur usage sur certaines cartes ; touchez-les pour voir le détail.</p>
    </details>
    ${notes(tl.warnings)}${sourceList(tl.sources)}
  </section>`;
}

function rankedBlock(g, tl) {
  const groups = tl.groups.filter(gr => ui.metaRole === "all" || norm(gr.name) === norm(ROLE_LABEL[ui.metaRole] || ui.metaRole) || (ui.metaRole === "bottom" && norm(gr.name) === "adc"));
  const tiers = {};
  for (const gr of groups) for (const [k, ents] of Object.entries(gr.tiers)) { tiers[k] ||= []; for (const e of ents) if (!tiers[k].some(x => entKey(x) === entKey(e))) tiers[k].push(e); }
  if (g === "val" && ui.metaRole !== "all") for (const k of Object.keys(tiers)) tiers[k] = tiers[k].filter(e => norm(entity("val", entKey(e)).sub) === norm(ui.metaRole));
  const stale = tl.updated && (Date.now() - new Date(tl.updated)) / 864e5 > 14;
  const filled = Object.entries(tiers).filter(([, e]) => e.length);
  return `<section class="tierlist">
    <div class="tl-head"><p class="label">Tier list ranked</p><h2 class="tl-title">${esc(tl.title)}</h2>
      <p class="tl-meta">${tl.patch ? chip(`Patch ${tl.patch}`) : ""}${tl.status && tl.status !== "confirme" ? chip(natureOf({ status: tl.status }).label, natureOf({ status: tl.status }).cls) : ""}<span class="fine">${esc(tl.context || "")} · relevé le ${fmtDay(tl.updated)}</span></p>
      ${stale ? `<p class="note warn">${icon("alert")}<span>Données de plus de deux semaines.</span></p>` : ""}</div>
    ${filled.length ? filled.map(([k, ents]) => `<div class="tier"><span class="tier-letter t-${k}">${k}</span>${portraitRow(ents, { game: g, stat: x => x.stat || "", label: `Tier ${k}` }).replace('class="prow"', 'class="prow wrap"')}</div>`).join("") : `<p class="inline-empty">Aucun élément pour ce filtre.</p>`}
    <details class="more"><summary>Comment est établie cette tier list ?</summary><p>${esc(tl.basis)}</p><p>Les lettres reprennent le classement des sources citées ; touchez un ${g === "lol" ? "champion" : "agent"} pour voir le chiffre et la raison.</p></details>
    ${notes(tl.warnings)}${sourceList(tl.sources)}
  </section>`;
}

// --- Actus : liste compacte et page de détail
function viewNews() {
  if (route.rest[0]) return newsDetail(route.rest[0]);
  const base = forGame(allNews());
  const ready = base.filter(editOf);
  const types = [["all", "Tout", ready.length], ...Object.entries(TYPE_LABEL).map(([k, l]) => [k, l, ready.filter(i => i.type === k).length]).filter(x => x[2])];
  if (!types.some(t => t[0] === ui.newsType)) ui.newsType = "all";
  let items = ui.newsType === "all" ? ready : ready.filter(i => i.type === ui.newsType);
  if (ui.query) items = items.filter(i => { const e = editOf(i); return [e.titre, e.resume, ...(e.points || []), ...(e.article || [])].join(" ").toLowerCase().includes(ui.query); });
  items = [...items].sort((a, b) => importance(b) - importance(a));
  const shown = items.slice(0, ui.limit);
  const pending = base.length - ready.length;
  return `<header class="page-head"><h1 class="page-title" tabindex="-1">Actus</h1></header>
    <div class="filters">
      ${seg("news-type", types, ui.newsType, "Rubrique", "wrap small")}
      <label class="search">${icon("list")}<span class="sr">Rechercher</span><input type="search" id="search" placeholder="Champion, équipe, patch…" value="${esc(ui.query)}"></label>
    </div>
    ${shown.length ? `<div class="nlist">${shown.map(newsRow).join("")}</div>` : empty("Aucune actu pour ce filtre")}
    ${items.length > shown.length ? `<button class="btn ghost" data-action="more">Afficher plus (${items.length - shown.length})</button>` : ""}
    ${pending ? `<p class="fine">${pending} article${pending > 1 ? "s" : ""} en attente de synthèse ne ${pending > 1 ? "sont" : "est"} pas affiché${pending > 1 ? "s" : ""}.</p>` : ""}`;
}
function newsRow(i) {
  const e = editOf(i);
  const k = keyOf(i);
  const nat = natureOf(i);
  const spoil = i.type === "esport" && hidden("n-" + k);
  const patch = patchOf(i, e);
  return `<a class="nrow" href="${href(i.game, "actus", k)}">
    <span class="nrow-txt">
      <span class="nrow-meta"><span class="cat">${esc(TYPE_LABEL[i.type] || "Actu")}</span>${patch ? `<span>Patch ${esc(patch)}</span>` : ""}<span class="nat ${nat.cls}">${nat.label}</span><span>${isEstimated(i) ? "date inconnue" : fmtDay(pubDate(i))}</span>${isNewSinceVisit(i) ? '<span class="new">Nouveau</span>' : ""}${prefs.saved.includes(k) ? icon("bookmark", "saved-ic") : ""}</span>
      <span class="nrow-title">${spoil ? "Résultat masqué (mode sans spoilers)" : esc(e.titre)}</span>
      ${!spoil && e.resume ? `<span class="nrow-dek">${esc(e.resume)}</span>` : ""}
    </span>
    ${i.image && !spoil ? `<span class="nrow-thumb"><img src="${esc(i.image)}" alt="" loading="lazy" decoding="async" width="88" height="66" onerror="this.parentNode.remove()"></span>` : ""}
  </a>`;
}
function newsDetail(k) {
  const i = forGame(allNews()).find(x => keyOf(x) === k && editOf(x));
  if (!i) return empty("Article introuvable", "Il a peut-être été retiré des sources.", `<a class="btn" href="${href(route.game, "actus")}">Toutes les actus</a>`);
  const e = editOf(i);
  const nat = natureOf(i);
  const patch = patchOf(i, e);
  const spoil = i.type === "esport" && hidden("n-" + k);
  const saved = prefs.saved.includes(k);
  const ents = mentionedEntities(i, e);
  const edAt = EDITORIAL.topics?.[i.id]?.at;
  return `<header class="t-head"><a class="back" href="${href(route.game, "actus")}">${icon("left")}Actus</a></header>
    <article class="article">
      <p class="nrow-meta"><span class="cat">${esc(TYPE_LABEL[i.type] || "Actu")}</span>${patch ? `<span>Patch ${esc(patch)}</span>` : ""}<span class="nat ${nat.cls}">${nat.label}</span><span>${isEstimated(i) ? `vu le ${fmtDay(i.firstSeen || pubDate(i))} · date de publication inconnue` : `publié le ${fmtDate(pubDate(i))}`}</span></p>
      <h1 class="article-title" tabindex="-1">${spoil ? "Résultat masqué" : esc(e.titre)}</h1>
      ${spoil ? spoilerGate("n-" + k, "Contenu", "") : `
      ${e.resume ? `<p class="summary">${esc(e.resume)}</p>` : ""}
      <div class="article-actions"><button class="btn ghost sm ${saved ? "on" : ""}" data-action="save" data-id="${esc(k)}" aria-pressed="${saved}">${icon("bookmark")}${saved ? "Enregistré" : "Enregistrer"}</button>${i.type === "patch" ? `<a class="btn ghost sm" href="${href(i.game, "meta")}">${icon("tiers")}Voir la méta</a>` : ""}</div>
      ${e.points?.length ? `<section class="sec">${secHead("À retenir")}${bullets(e.points)}</section>` : ""}
      ${i.game === "lol" && i.type === "patch" ? coachPatchBlock(patch) : ""}
      ${ents.length ? `<section class="sec">${secHead(`${i.game === "lol" ? "Champions" : "Agents"} concernés`)}${portraitRow(ents.map(x => x.id || x.name), { game: i.game, label: "Concernés par ce patch" })}</section>` : ""}
      ${e.article?.length ? `<details class="more" ${e.points?.length ? "" : "open"}><summary>Les faits en détail</summary>${e.article.map(p => `<p>${esc(p)}</p>`).join("")}</details>` : ""}
      ${e.analyse ? `<section class="reading"><p class="label">Notre lecture</p><p>${esc(e.analyse)}</p><p class="fine">Interprétation de la rédaction, fondée sur les sources ci-dessous.</p></section>` : ""}
      ${e.a_surveiller ? `<p class="note">${icon("eye")}<span>À surveiller : ${esc(e.a_surveiller)}</span></p>` : ""}
      ${notes(i.warnings)}
      ${e.raw ? `<p class="note">${icon("info")}<span>Texte de la source officielle, pas encore synthétisé par la rédaction.</span></p>` : ""}
      ${sourceList(i.sources, edAt ? ` · synthèse du ${fmtDay(edAt)}` : "")}`}
    </article>`;
}

// --- Stratégies : cartes et fiches
function viewStrats(rest = route.rest) {
  if (rest[0]) return stratDetail(rest[0]);
  const items = forGame(STRATS);
  const kinds = [["all", "Toutes", items.length], ...[...new Set(items.map(s => s.kind))].map(k => [k, k, items.filter(s => s.kind === k).length])];
  if (!kinds.some(k => k[0] === ui.stratKind)) ui.stratKind = "all";
  const list = ui.stratKind === "all" ? items : items.filter(s => s.kind === ui.stratKind);
  return `<header class="page-head"><h1 class="page-title" tabindex="-1">Stratégies</h1><p class="fine">Fiches construites uniquement à partir de sources citées.</p></header>
    ${kinds.length > 2 ? seg("strat-kind", kinds, ui.stratKind, "Type", "wrap small") : ""}
    ${list.length ? `<div class="sgrid">${list.map(stratCard).join("")}</div>` : empty("Pas encore de fiche vérifiée", "Aucune stratégie sourcée n'est disponible pour ce jeu.")}`;
}
function stratCard(s) {
  const lineup = s.lineup || s.maps?.[0]?.lineup || [];
  return `<a class="scard" href="${stratHref(s.game, s.id)}">
    <span class="scard-visual">${lineup.slice(0, 5).map(x => portrait(entity(s.game, entKey(x)), "sm")).join("")}</span>
    <span class="scard-body"><span class="scard-tags">${chip(s.kind)}${s.patch && !/non précisé/.test(s.patch) ? chip(`Patch ${s.patch}`, "soft") : ""}${s.status && s.status !== "confirme" ? chip(natureOf({ status: s.status }).label, natureOf({ status: s.status }).cls) : ""}</span>
      <span class="scard-title">${esc(s.title)}</span>
      ${s.objectif ? `<span class="scard-dek">${esc(s.objectif)}</span>` : ""}</span>
    ${prefs.saved.includes("st-" + s.id) ? icon("bookmark", "saved-ic corner") : ""}
  </a>`;
}
function stratDetail(id) {
  const s = STRATS.find(x => x.id === id && ENABLED_GAMES.includes(x.game));
  if (!s) return empty("Stratégie introuvable", "", `<a class="btn" href="${href(route.game, "coach", "strategies")}">Toutes les stratégies</a>`);
  const saved = prefs.saved.includes("st-" + s.id);
  const ctx = Object.entries(s.context || {});
  // Préparation proposée seulement si la stratégie nomme un champion couvert par le coach
  const prepWith = s.game === "lol" ? (s.lineup || []).map(x => entity("lol", entKey(x)).name).find(coachCovered) : null;
  return `<header class="t-head"><a class="back" href="${href(route.game, "coach", "strategies")}">${icon("left")}Stratégies</a></header>
    <article class="article">
      <p class="nrow-meta"><span class="cat">${esc(s.kind)}</span><span>${esc(s.nature || "")}</span>${s.patch ? `<span>${/non précisé/.test(s.patch) ? "patch non précisé" : `Patch ${esc(s.patch)}`}</span>` : ""}${s.status && s.status !== "confirme" ? `<span class="nat ${natureOf({ status: s.status }).cls}">${natureOf({ status: s.status }).label}</span>` : ""}</p>
      <h1 class="article-title" tabindex="-1">${esc(s.title)}</h1>
      ${ctx.length ? `<dl class="kpis compact">${ctx.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
      <div class="article-actions"><button class="btn ghost sm ${saved ? "on" : ""}" data-action="save" data-id="st-${esc(s.id)}" aria-pressed="${saved}">${icon("bookmark")}${saved ? "Enregistrée" : "Enregistrer"}</button>${prepWith ? coachPrepLink(prepWith, `Préparer ma session avec ${prepWith}`) : ""}</div>
      ${s.objectif ? `<section class="sec">${secHead("Objectif")}<p class="summary">${esc(s.objectif)}</p></section>` : ""}
      ${s.lineup ? `<section class="sec">${secHead("Composition")}${portraitRow(s.lineup, { game: s.game, label: "Composition" })}</section>` : ""}
      ${s.conditions?.length ? `<section class="sec">${secHead("Conditions")}${bullets(s.conditions)}</section>` : ""}
      ${s.maps ? `<section class="sec">${secHead("Par carte")}${s.maps.map(m => `<div class="maprow"><p class="maprow-name">${esc(m.map)}</p>${portraitRow(m.lineup, { game: s.game, label: m.map })}<p class="fine">${esc(m.note)}</p></div>`).join("")}</section>` : ""}
      ${s.etapes?.length ? `<section class="sec">${secHead("Exécution")}<ol class="steps">${s.etapes.map(x => `<li>${esc(x)}</li>`).join("")}</ol></section>` : ""}
      ${s.limites?.length ? `<section class="sec">${secHead("Limites")}${bullets(s.limites)}</section>` : ""}
      ${(s.faits || s.points)?.length ? `<details class="more"><summary>Ce que disent les sources</summary>${bullets(s.faits || s.points)}</details>` : ""}
      ${s.erreurs?.length ? `<details class="more"><summary>Erreurs fréquentes</summary>${bullets(s.erreurs)}</details>` : ""}
      ${s.lecture ? `<section class="reading"><p class="label">Notre lecture</p><p>${esc(s.lecture)}</p><p class="fine">Interprétation de la rédaction.</p></section>` : ""}
      ${notes(s.warnings)}
      ${sourceList(s.sources, s.updated ? ` · relevé le ${fmtDay(s.updated)}` : "")}
    </article>`;
}

// --- Favoris : équipes, articles et stratégies enregistrés
// Choix des équipes à suivre directement depuis les favoris : toutes les équipes des tournois du jeu, recherche par nom
function teamPicker(favs) {
  const seen = new Map();
  const ts = forGame(allTournaments()).sort((a, b) => (b.status === "inProgress") - (a.status === "inProgress"));
  for (const t of ts) {
    for (const x of t.teams || []) if (x.team && !seen.has(x.team)) seen.set(x.team, x.image);
    for (const m of tMatches(t)) for (const x of m.teams) if (x.name && !/^(TBD|À déterminer)$/i.test(x.name) && !seen.has(x.name)) seen.set(x.name, x.image || x.logo);
  }
  const list = [...seen].filter(([n]) => !favs.includes(n)).sort((a, b) => a[0].localeCompare(b[0], "fr"));
  if (!list.length) return "";
  const grid = `<label class="search fav-search">${icon("list")}<span class="sr">Rechercher une équipe</span><input type="search" data-fav-filter placeholder="Rechercher une équipe" autocomplete="off"></label>
    <div class="teamgrid fav-pick">${list.map(([n, img]) => `<button class="teamcell" data-action="fav-team" data-id="${esc(n)}" data-name="${esc(n.toLowerCase())}" aria-label="Suivre ${esc(n)}">${logo(n, img, "lg")}<span class="teamcell-name">${esc(n)}</span><span class="fav-add" aria-hidden="true">${icon("star")}</span></button>`).join("")}</div>`;
  return favs.length
    ? `<details class="more fav-more"><summary>Suivre une autre équipe</summary>${grid}</details>`
    : `<p class="fine">Touche une équipe pour la suivre : ses prochains matchs et ses résultats apparaîtront ici.</p>${grid}`;
}
document.addEventListener("input", e => {
  if (!e.target.matches?.("[data-fav-filter]")) return;
  const q = e.target.value.trim().toLowerCase();
  for (const b of e.target.closest(".sec").querySelectorAll(".fav-pick .teamcell")) b.hidden = q && !b.dataset.name.includes(q);
});
function viewFavorites() {
  const teams = prefs.favTeams;
  const ts = allTournaments();
  const teamMatches = ts.flatMap(t => tMatches(t).filter(m => m.teams.some(x => teams.includes(x.name))).map(m => ({ m, t })));
  const next = teamMatches.filter(x => x.m.state !== "completed" && x.m.start).sort((a, b) => a.m.start.localeCompare(b.m.start)).slice(0, 5);
  const last = teamMatches.filter(x => x.m.state === "completed").sort((a, b) => (b.m.start || "").localeCompare(a.m.start || "")).slice(0, 5);
  const news = allNews().filter(i => editOf(i) && prefs.saved.includes(keyOf(i)));
  const strats = STRATS.filter(s => ENABLED_GAMES.includes(s.game) && prefs.saved.includes("st-" + s.id));
  return `<header class="page-head"><h1 class="page-title" tabindex="-1">Favoris</h1><p class="fine">Enregistrés dans ce navigateur, sans compte.</p></header>
    <section class="sec">${secHead("Équipes suivies")}
      ${teams.length ? `<div class="chips-row">${teams.map(n => `<button class="pill-btn on" data-action="fav-team" data-id="${esc(n)}" aria-label="Retirer ${esc(n)} des favoris">${icon("star")}${esc(n)}${icon("close")}</button>`).join("")}</div>
        ${next.length ? `<p class="label">À venir</p><div class="mlist">${next.map(x => matchCard(x.m, x.t)).join("")}</div>` : ""}
        ${last.length ? `<p class="label">Derniers matchs</p><div class="mlist">${last.map(x => matchCard(x.m, x.t)).join("")}</div>` : ""}`
        : ""}
      ${teamPicker(teams)}
    </section>
    <section class="sec">${secHead("Articles enregistrés")}${news.length ? `<div class="nlist">${news.map(newsRow).join("")}</div>` : `<p class="inline-empty">Aucun article enregistré.</p>`}</section>
    <section class="sec">${secHead("Stratégies enregistrées")}${strats.length ? `<div class="sgrid">${strats.map(stratCard).join("")}</div>` : `<p class="inline-empty">Aucune stratégie enregistrée.</p>`}</section>`;
}

// ============================================================ 7. Panneaux

// Fiche champion ou agent : classements et raisons, stats pros, patchs qui le citent, stratégies associées
function sheetHtml(game, key) {
  const ent = entity(game, key);
  const places = tierPlacements(game, ent.key);
  const pro = proStats(game, ent.key);
  const patches = patchMentions(game, ent);
  const strats = relatedStrats(game, ent.key);
  return `<div class="sheet-head">${portrait(ent, "xl")}<div><p class="label">${game === "lol" ? "Champion" : "Agent"}${ent.sub ? ` · ${esc(ent.sub)}` : ""}</p><h2 class="sheet-title" id="sheet-title">${esc(ent.name)}</h2></div>
      <button class="icon-btn" data-action="close-sheet" aria-label="Fermer">${icon("close")}</button></div>
    <div class="sheet-body">
      ${game === "lol" ? `<div class="sheet-actions">${coachPrepLink(ent.name)}</div>` : ""}
      ${places.length ? `<section class="sec">${secHead("Classements")}${places.map(({ list, group, tier, e }) => `<div class="place">${list.scope === "pro" ? `<span class="tier-letter rate">${esc(e.stat || "—")}</span>` : `<span class="tier-letter t-${tier}">${tier}</span>`}<div><p class="place-title">${list.scope === "pro" ? "Les plus joués · " + esc(list.title.replace(/^Pros*—s*/, "")) : esc(list.title)}${group && list.groups.length > 1 ? ` · ${esc(group)}` : ""}</p>
        <p class="fine">${list.patch ? `Patch ${esc(list.patch)} · ` : ""}${esc(list.context || "")}</p>
        <p class="place-why">${esc([e.stat ? `${e.stat} de victoires` : "", e.note].filter(Boolean).join(" · ") || "Classement de la source, sans justification chiffrée.")}</p>
        <p class="fine">Source : ${list.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(", ")}</p></div></div>`).join("")}</section>` : ""}
      ${pro.length ? `<section class="sec">${secHead("Chez les pros")}${pro.map(({ t, c }) => `<a class="prostat" href="${href(game, "tournoi", t.id, "meta")}"><span class="prostat-name">${esc(t.name)}</span>
        <span class="prostat-nums"><span><b>${c.picks}</b> pick${c.picks > 1 ? "s" : ""}</span><span><b>${pct(c.presence)}</b> des parties</span><span>${c.known >= 3 && !hidden("t-" + t.id) ? `<b>${pct(c.winrate)}</b> victoires (${c.known})` : "victoires : —"}</span></span></a>`).join("")}<p class="fine">Parties officielles LoL Esports.</p></section>` : ""}
      ${patches.length ? `<section class="sec">${secHead("Cité dans les notes de patch")}${patches.map(({ i, e }) => `<a class="link-row" href="${href(game, "actus", keyOf(i))}"><span><b>${esc(e.titre)}</b><span class="fine">${fmtDay(pubDate(i))}</span></span>${icon("chevron")}</a>`).join("")}</section>` : ""}
      ${strats.length ? `<section class="sec">${secHead("Stratégies associées")}${strats.map(s => `<a class="link-row" href="${stratHref(game, s.id)}"><span><b>${esc(s.title)}</b><span class="fine">${esc(s.kind)}</span></span>${icon("chevron")}</a>`).join("")}</section>` : ""}
      ${!places.length && !pro.length && !patches.length && !strats.length ? `<p class="inline-empty">Aucune donnée vérifiée sur ${esc(ent.name)} dans les sources actuelles.</p>` : ""}
    </div>`;
}

function syncPanelHtml() {
  if (!AUTO) return `<div class="sheet-head"><h2 class="sheet-title" id="sheet-title">Sources</h2><button class="icon-btn" data-action="close-sheet" aria-label="Fermer">${icon("close")}</button></div><p class="inline-empty">Aucune donnée chargée.</p>`;
  return `<div class="sheet-head"><div><p class="label">Données</p><h2 class="sheet-title" id="sheet-title">Sources et synchronisation</h2></div><button class="icon-btn" data-action="close-sheet" aria-label="Fermer">${icon("close")}</button></div>
    <div class="sheet-body">
      <dl class="kpis compact"><div><dt>Dernière vérification</dt><dd>${ago(AUTO.generatedAt)}</dd></div><div><dt>Sources en ligne</dt><dd>${AUTO.sources.filter(s => s.ok).length} / ${AUTO.sources.length}</dd></div></dl>
      <p class="fine">La synchronisation indique quand le site a interrogé les sources. Chaque contenu affiche sa propre date de publication.</p>
      <ul class="srclist">${AUTO.sources.map(s => `<li><span class="dot ${s.ok ? "ok" : "warn"}"></span><span>${esc(s.name)}</span><span class="fine">${s.ok ? `${s.count}` : esc(s.error)}${s.keptFrom ? ` · données du ${fmtDay(s.keptFrom)} conservées` : ""}</span></li>`).join("")}</ul>
      <div class="lang-pick"><p class="label">Langue · Language</p><div class="seg small">${[["fr", "Français"], ["en", "English"]].map(([k, l]) => `<button class="seg-btn" data-action="lang" data-id="${k}" aria-pressed="${(window.LANG || "fr") === k}" translate="no">${l}</button>`).join("")}</div></div>
      ${HAS_SERVER ? `<button class="btn ghost sm" data-action="collect">Lancer une collecte</button>` : ""}
      <p class="fine">${RIOT_LEGAL}</p>
      <p class="fine"><a href="confidentialite.html" style="text-decoration: underline">Confidentialité et conditions</a></p>
    </div>`;
}
// Mention exigée par Riot Games pour les produits utilisant son API (texte officiel, en anglais)
const RIOT_LEGAL = "MINDIFF isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.";

let sheetOpener = null;
function syncSheet() {
  const dlg = document.getElementById("sheet");
  const want = route.sheet;
  if (want) {
    dlg.innerHTML = want === "__sync" ? syncPanelHtml() : sheetHtml(route.sheetGame || route.game, want);
    if (!dlg.open) { sheetOpener = document.activeElement; dlg.showModal(); }
    dlg.querySelector('[data-action="close-sheet"]')?.focus();
  } else if (dlg.open) {
    dlg.close();
    sheetOpener?.focus?.();
  }
}
function closeSheet() {
  if (route.sheet === "__sync") { route.sheet = null; syncSheet(); return; }
  // La fiche fait partie de l'adresse : la fermer revient à l'écran d'origine
  if (history.state?.sheetFromApp) history.back();
  else location.hash = location.hash.replace(/\/fiche\/[^/]*$/, "");
}

// ============================================================ 8. Routeur, rendu, événements

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, "");
  let parts = raw.split("/").filter(Boolean).map(p => { try { return decodeURIComponent(p); } catch { return p; } });
  let sheet = null;
  const fi = parts.indexOf("fiche");
  if (fi >= 0) { sheet = parts[fi + 1] || null; parts = parts.slice(0, fi); }
  // Anciennes adresses : #tournois/lol/… , #actus/val …, puis #/lol/matchs, #/lol/tier, #/lol/enregistres
  const LEGACY_V1 = { tournois: "competitions", matchs: "competitions", classements: "competitions", actus: "actus", tier: "meta", strats: "coach", accueil: null };
  if (parts[0] in LEGACY_V1) {
    const [v, g, tid, tab] = parts;
    if (v === "accueil" || !g) return { game: null, view: "select", rest: [], sheet };
    if (v === "tournois" && tid) return { game: g, view: "tournoi", rest: [tid, { resume: "apercu", matchs: "matchs" }[tab] || tab], sheet, redirect: true };
    return { game: g, view: LEGACY_V1[v], rest: v === "matchs" ? ["matchs"] : v === "strats" ? ["strategies"] : [], sheet, redirect: true };
  }
  let [g, view = "home", ...rest] = parts;
  if (!g || !(g === "all" || ENABLED_GAMES.includes(g))) return { game: null, view: "select", rest: [], sheet: null };
  const V2 = { matchs: ["competitions", ["matchs"]], tier: ["meta", []], enregistres: ["favoris", []] };
  if (V2[view]) return { game: g, view: V2[view][0], rest: V2[view][1], sheet, redirect: true };
  // Les stratégies sont passées dans l'onglet Coach : les anciennes adresses restent valables
  if (view === "strats") return { game: g, view: "coach", rest: ["strategies", ...rest], sheet, redirect: true };
  let redirect = false;
  const OLD_TABS = { situation: "apercu", calendrier: "matchs" };
  if (view === "tournoi" && OLD_TABS[rest[1]]) { rest = [rest[0], OLD_TABS[rest[1]], rest[2]].filter(x => x != null); redirect = true; }
  const VIEWS_OK = ["home", "competitions", "meta", "actus", "coach", "tournoi", "favoris"];
  return { game: g, view: VIEWS_OK.includes(view) ? view : "home", rest, sheet, redirect };
}
function routeToHash(r) {
  if (!r.game) return "#/";
  const base = r.view === "home" ? [r.game] : [r.game, r.view, ...r.rest];
  return href(...base) + (r.sheet ? "/fiche/" + encodeURIComponent(r.sheet) : "");
}

const VIEWS = { select: viewSelect, home: viewHome, competitions: viewCompetitions, meta: viewMeta, actus: viewNews, coach: viewCoach, tournoi: viewTournament, favoris: viewFavorites };

function renderHeader() {
  const g = route.game;
  const navView = route.view === "tournoi" ? "competitions" : route.view;
  // Changer de jeu conserve la rubrique en cours (sauf les pages propres à un tournoi ou un contenu)
  const switchTo = id => {
    const keep = { competitions: route.rest[0] === "matchs" ? ["competitions", "matchs"] : ["competitions"], meta: ["meta"], actus: ["actus"], coach: ["coach", ...(route.rest[0] === "strategies" ? ["strategies"] : [])], favoris: ["favoris"] }[route.view];
    return href(id, ...(route.view === "tournoi" ? ["competitions"] : keep || []));
  };
  // Pastille sur Coach : partie en cours (en direct) ou dernière partie pas encore relue
  const c2live = typeof c2ui !== "undefined" && c2ui.live?.inGame, last = typeof C2 !== "undefined" ? C2.profile?.games?.[0] : null;
  const c2new = !!last && Array.isArray(C2.seen) && !C2.seen.includes(last.id);
  const badge = id => id !== "coach" || g !== "lol" ? "" : c2live ? `<i class="nav-badge live" aria-hidden="true">LIVE</i>` : c2new ? `<i class="nav-dot" aria-hidden="true"></i>` : "";
  const navItems = NAV.map(n => `<a class="nav-item nav-${n.id}" href="${href(g, n.id === "home" ? "" : n.id)}" ${navView === n.id ? 'aria-current="page"' : ""}${n.id === "coach" && (c2live || c2new) ? ` aria-label="${n.label}, ${c2live ? "partie en cours" : "nouvelle partie à relire"}"` : ""}>${icon(n.icon)}<span>${n.label}</span>${badge(n.id)}</a>`).join("");
  document.getElementById("top").innerHTML = `<div class="wrap top-inner">
      <a class="brand" href="${g ? href(g) : "#/"}" aria-label="MINDIFF, accueil">${BRAND_MARK}<span class="brand-name">MINDIFF</span></a>
      ${g ? `<div class="gswitch" role="group" aria-label="Jeu">${GAMES_ON.map(x => `<a class="gs-btn${LOCKED.includes(x.id) ? " locked" : ""}" href="${switchTo(x.id)}" ${g === x.id ? 'aria-current="true"' : ""}${LOCKED.includes(x.id) ? ` aria-label="${esc(SHORT[x.id])}, bientôt disponible"` : ""}>${LOCKED.includes(x.id) ? icon("lock") : ""}<span class="gs-txt">${esc(SHORT[x.id])}</span></a>`).join("")}</div>` : ""}
      <div class="top-actions">
        ${g ? `<button class="icon-btn ${prefs.noSpoil ? "on" : ""}" data-action="spoil" aria-pressed="${prefs.noSpoil}" aria-label="Mode sans spoilers${prefs.noSpoil ? " activé" : ""}" title="Mode sans spoilers">${icon(prefs.noSpoil ? "eyeOff" : "eye")}</button>
        <a class="icon-btn" href="${href(g, "favoris")}" aria-label="Favoris" ${route.view === "favoris" ? 'aria-current="page"' : ""}>${icon("star")}</a>
        <button class="icon-btn" data-action="sync-panel" aria-label="Sources et synchronisation">${icon("info")}</button>` : ""}
        <button class="icon-btn lang-btn" data-action="lang" data-id="${window.LANG === "en" ? "fr" : "en"}" aria-label="${window.LANG === "en" ? "Language: English. Switch to French" : "Langue : français. Passer en anglais"}" title="${window.LANG === "en" ? "Français" : "English"}" translate="no">${window.LANG === "en" ? "EN" : "FR"}</button>
        <button class="icon-btn" data-action="theme" aria-label="${THEMES[prefs.theme]?.[1] || THEMES.auto[1]}" title="${THEMES[prefs.theme]?.[1] || THEMES.auto[1]}">${icon(THEMES[prefs.theme]?.[0] || "contrast")}</button>
      </div>
    </div>
    ${g ? `<nav class="wrap nav-top" aria-label="Rubriques">${navItems}</nav>` : ""}`;
  const bottom = document.getElementById("bottom");
  bottom.innerHTML = g ? navItems : "";
  bottom.hidden = !g;
  document.body.classList.toggle("has-nav", !!g);
}

function render(fromRoute = true) {
  renderHeader();
  const main = document.getElementById("view");
  main.innerHTML = !dataLoaded ? skeleton()
    : !AUTO && route.view !== "select" ? empty("Données indisponibles", "La connexion aux données a échoué et aucune copie locale n'existe encore.", `<button class="btn" data-action="retry">Réessayer</button>`)
    : LOCKED.includes(route.game) ? lockedView(VIEWS[route.view]())
    : (route.view !== "select" ? freshnessAlert() : "") + VIEWS[route.view]();
  const search = document.getElementById("search");
  if (search) search.oninput = e => {
    ui.query = e.target.value.trim().toLowerCase();
    const pos = e.target.selectionStart;
    render(false);
    const s = document.getElementById("search");
    s.focus();
    s.setSelectionRange(pos, pos);
  };
  if (dataLoaded) syncSheet();
  if (!liveTimer && document.querySelector("[data-live-match]")) liveTick();
  if (document.querySelector("[data-story], [data-story-list]")) setTimeout(storyFill, 0);
  if (route.game === "lol") liveList();
  syncTabs();
  if (fromRoute) {
    window.scrollTo(0, 0);
    document.querySelector("#view [tabindex='-1']")?.focus({ preventScroll: true });
  }
}

// Onglets défilants : l'onglet sélectionné est ramené en vue, flèches et dégradés signalent la suite
function syncTabs() {
  for (const wrap of document.querySelectorAll(".tabs-wrap")) {
    const nav = wrap.querySelector(".tabs");
    const cur = nav.querySelector('[aria-current="page"]');
    if (cur) {
      const pad = 28;
      if (cur.offsetLeft - pad < nav.scrollLeft) nav.scrollLeft = Math.max(0, cur.offsetLeft - pad);
      else if (cur.offsetLeft + cur.offsetWidth + pad > nav.scrollLeft + nav.clientWidth) nav.scrollLeft = cur.offsetLeft + cur.offsetWidth + pad - nav.clientWidth;
    }
    const update = () => {
      const left = nav.scrollLeft > 2, right = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2;
      wrap.classList.toggle("more-left", left);
      wrap.classList.toggle("more-right", right);
      wrap.querySelector(".prev").hidden = !left;
      wrap.querySelector(".next").hidden = !right;
    };
    nav.onscroll = update;
    update();
  }
}
window.addEventListener("resize", () => syncTabs());

let lastBase = "";
function onRoute() {
  const prev = route;
  route = parseRoute();
  if (route.redirect) { history.replaceState(history.state, "", routeToHash(route)); route.redirect = false; }
  if (route.game) { prefs.game = route.game; prefs.visits[route.game] = new Date().toISOString(); savePrefs(); }
  if (prev.game !== route.game || (route.view === "tournoi" && prev.rest[0] !== route.rest[0])) { ui.tStage = null; ui.day = null; ui.comp = ""; }
  if (prev.view !== route.view) ui.limit = 20;
  // Ouvrir ou fermer une fiche ne change pas l'écran de fond : on ne le redessine pas et on ne remonte pas en haut
  const base = routeToHash({ ...route, sheet: null });
  const onlySheet = base === lastBase && dataLoaded;
  // Retour en arrière (bouton du téléphone ou lien « ‹ » vers la page d'avant) : on revient là où on était dans la page
  if (!onlySheet && lastBase) SCROLL_AT.set(lastBase, window.scrollY);
  const back = !onlySheet && NAV_STACK.length >= 2 && NAV_STACK[NAV_STACK.length - 2] === base;
  if (back) NAV_STACK.pop(); else if (!onlySheet && NAV_STACK.at(-1) !== base) NAV_STACK.push(base);
  if (NAV_STACK.length > 50) NAV_STACK.shift();
  lastBase = base;
  if (onlySheet) syncSheet();
  else {
    render(true);
    const y = back ? SCROLL_AT.get(base) : null;
    // Deux essais : tout de suite, puis quand les images et contenus chargés ont pris leur place
    if (y) { requestAnimationFrame(() => window.scrollTo(0, y)); setTimeout(() => { if (Math.abs(window.scrollY - y) > 40) window.scrollTo(0, y); }, 350); }
  }
}
const SCROLL_AT = new Map(), NAV_STACK = [];
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.addEventListener("hashchange", onRoute);

document.addEventListener("click", e => {
  // Lien vers une fiche : on mémorise que l'appli l'a ouverte (pour que « fermer » revienne en arrière)
  const a = e.target.closest('a[href*="/fiche/"]');
  if (a && !e.metaKey && !e.ctrlKey) { e.preventDefault(); history.pushState({ sheetFromApp: true }, "", a.getAttribute("href")); onRoute(); return; }
  const el = e.target.closest("[data-action]");
  if (!el || el.tagName === "SELECT" || el.tagName === "INPUT") return;
  const id = el.dataset.id;
  switch (el.dataset.action) {
    case "spoil": prefs.noSpoil = !prefs.noSpoil; savePrefs(); revealed.clear(); break;
    case "lang": prefs.lang = id; savePrefs(); location.reload(); return;
    case "theme": prefs.theme = { auto: "light", light: "dark", dark: "auto" }[prefs.theme] || "light"; savePrefs(); applyTheme(); break;
    case "reveal": revealed.add(id); break;
    case "pp": { const [g, j] = id.split("|"); PP[g] = PP[g] === Number(j) ? null : Number(j); break; }
    case "fav-game": prefs.favGames = prefs.favGames.includes(id) ? prefs.favGames.filter(x => x !== id) : [...prefs.favGames, id]; savePrefs(); break;
    case "fav-team": prefs.favTeams = prefs.favTeams.includes(id) ? prefs.favTeams.filter(x => x !== id) : [...prefs.favTeams, id]; savePrefs(); break;
    case "save": prefs.saved = prefs.saved.includes(id) ? prefs.saved.filter(x => x !== id) : [...prefs.saved, id]; savePrefs(); break;
    case "t-filter": ui.tFilter = id; break;
    case "t-stage": ui.tStage = Number(id); break;
    case "t-meta-role": ui.tMetaRole = id; break;
    case "day": if (!id) return; ui.day = id; break;
    case "fav-only": ui.favOnly = !ui.favOnly; break;
    case "meta-scope": ui.metaScope = id; ui.metaRole = "all"; break;
    case "meta-role": ui.metaRole = id; break;
    case "news-type": ui.newsType = id; ui.limit = 20; break;
    case "strat-kind": ui.stratKind = id; break;
    case "more": ui.limit += 20; break;
    case "tabs-scroll": { const nav = el.parentElement.querySelector(".tabs"); nav.scrollBy({ left: Number(id) * nav.clientWidth * 0.6, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); return; }
    case "sync-panel": route.sheet = "__sync"; syncSheet(); return;
    case "close-sheet": closeSheet(); return;
    case "skip": document.getElementById("view").focus(); return;
    case "retry": dataLoaded = false; render(false); loadData().then(() => render(false)); return;
    case "collect": triggerCollect(el); return;
    default: return;
  }
  e.preventDefault();
  render(false);
});
document.addEventListener("change", e => {
  const a = e.target.dataset.action;
  if (!a) return;
  if (a === "comp") { ui.comp = e.target.value; ui.day = null; }
  else if (a === "day-pick") { if (e.target.value) ui.day = e.target.value; }
  else if (a === "t-meta-sort") ui.tMetaSort = e.target.value;
  else if (a === "tz") { prefs.tz = e.target.value || null; savePrefs(); }
  else return;
  render(false);
});
// Échap ou clic hors du panneau : fermeture
document.getElementById("sheet").addEventListener("cancel", e => { e.preventDefault(); closeSheet(); });
document.getElementById("sheet").addEventListener("click", e => { if (e.target.id === "sheet") closeSheet(); });

async function triggerCollect(btn) {
  btn.disabled = true;
  btn.textContent = "Collecte lancée…";
  const r = await fetch("api/collect", { method: "POST" }).catch(() => null);
  if (!r?.ok) btn.textContent = r?.status === 403 ? "Possible seulement depuis l'ordinateur serveur" : "Collecte déjà en cours";
}
const safeRender = () => { if (document.activeElement?.id !== "search" && !document.getElementById("sheet").open) render(false); };
function connectLive() {
  if (!HAS_SERVER || !window.EventSource || new URLSearchParams(location.search).has("nolive")) {
    return setInterval(async () => {
      const s = ONLINE ? await fetch(`data/status.json?t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()).catch(() => null) : null;
      if (ONLINE && s?.generatedAt === AUTO?.generatedAt) return;
      await loadData();
      safeRender();
    }, 3 * 60 * 1000);
  }
  const es = new EventSource("api/stream");
  es.addEventListener("update", async () => { await loadData(); safeRender(); });
}

if (!location.hash && prefs.game && (prefs.game === "all" || ENABLED_GAMES.includes(prefs.game))) history.replaceState(null, "", href(prefs.game));
route = parseRoute();
render();
loadData().then(() => { lastBase = ""; onRoute(); connectLive(); });
loadRosters();
