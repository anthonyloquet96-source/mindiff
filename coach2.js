/* MINDIFF — nouveau coach (aperçu) : #/lol/coach/beta
   1. Mon coach : compte Riot → rang, dernières parties, un objectif suivi de partie en partie
   2. Bilan d'une partie : faits officiels de Riot (morts, retours à la base, objectifs, écarts), comparés au Diamant+
   3. Face-à-face : mon champion contre le sien, conseils sourcés
   4. Champions : les 173 champions et ce que le coach sait de chacun
   Aucun appel d'IA ici : les faits viennent de Riot (via /api/coach, clé gardée côté serveur), les conseils de data/coach.json. */

const C2_KEY = "mindiff-coach2-v1";
const C2 = (() => {
  const base = { account: null, profile: null, profileAt: 0, reviews: {}, face: { me: "", vs: "", role: "" } };
  try { return { ...base, ...JSON.parse(localStorage.getItem(C2_KEY) || "null") }; } catch { return base; }
})();
const c2Save = () => { try { localStorage.setItem(C2_KEY, JSON.stringify({ ...C2, reviews: Object.fromEntries(Object.entries(C2.reviews).slice(-8)) })); } catch { /* stockage indisponible */ } };
const c2ui = { loading: null, error: null, q: "" };
// Service : le serveur local sert l'API ; en ligne, l'adresse du service est fixée par window.MINDIFF_API
const C2_API = window.MINDIFF_API ?? (/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname) ? "" : null);
const c2Href = (...p) => href("lol", "coach", "beta", ...p);

const C2_REGIONS = [["euw1", "EUW"], ["eun1", "EUNE"], ["na1", "NA"], ["kr", "KR"], ["br1", "BR"], ["la1", "LAN"], ["la2", "LAS"], ["tr1", "TR"], ["jp1", "JP"], ["oc1", "OCE"], ["me1", "ME"], ["ru", "RU"]];
const C2_ROLE = { top: "Top", jungle: "Jungle", mid: "Mid", bottom: "ADC", support: "Support" };
const C2_TIER = { IRON: "Fer", BRONZE: "Bronze", SILVER: "Argent", GOLD: "Or", PLATINUM: "Platine", EMERALD: "Émeraude", DIAMOND: "Diamant", MASTER: "Maître", GRANDMASTER: "Grand Maître", CHALLENGER: "Challenger" };
// Comment progresser sur chaque indicateur : thèmes de la base et mots-clés des vidéos de coachs
const C2_LEARN = {
  cs10: { themes: ["lane"], re: /wave|vague|trading|farm|\bcs\b|last ?hit|clear|jungle path|tempo/i, tip: "Visez la référence Diamant+ à 10 min : chaque vague perdue, c'est environ 125 pièces d'or (6 sbires)." },
  csMin: { themes: ["lane"], re: /wave|vague|farm|\bcs\b|tempo/i, tip: "Après la phase de ligne, continuez à prendre les vagues proches de vous entre deux combats." },
  deaths30: { themes: ["survie", "methode"], re: /mort|death|dying|surviv|position|dans la t[eê]te|mistake|erreur/i, tip: "Pour chaque mort, notez ce que vous ne voyiez pas : le coach part de vos morts, pas de vos victoires." },
  visionMin: { themes: ["methode"], re: /vision|ward|balise|track/i, tip: "Posez votre balise à chaque retour et utilisez votre trinket dès qu'il est rechargé." },
  controlWards: { themes: ["methode"], re: /vision|ward|balise|control/i, tip: "Une balise de contrôle à chaque retour à la base : c'est 75 pièces d'or, et souvent un objectif sauvé." },
  kp: { themes: ["teamfight"], re: /roam|gank|tempo|teamfight|skirmish|escarmouche|jungle/i, tip: "Après avoir poussé votre vague, regardez la mini-carte : rejoignez les combats qui ont lieu près de vous." },
};

// ---------- Champions (noms français, images Data Dragon)
let c2Champs = null;
function c2ChampList() {
  if (c2Champs || !COACH) return c2Champs || [];
  c2Champs = COACH.contents.filter(c => c.sourceId === "riot-data-dragon").map(c => ({ id: c.url.match(/champion\/(\w+)\.json/)?.[1], name: c.title.split(" — ")[0] })).filter((c, i, a) => c.id && a.findIndex(x => x.id === c.id) === i).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return c2Champs;
}
const c2Name = id => c2ChampList().find(c => c.id === id)?.name || id;
const c2Id = name => c2ChampList().find(c => c.name.toLowerCase() === String(name).toLowerCase() || c.id.toLowerCase() === String(name).toLowerCase())?.id || null;
const c2Img = (id, cls = "c2-av") => id ? `<img class="${cls}" src="https://ddragon.leagueoflegends.com/cdn/${esc(COACH?.ddragonVersion || "16.21.1")}/img/champion/${esc(id)}.png" alt="" loading="lazy" width="40" height="40">` : `<span class="${cls} c2-av-empty"></span>`;
const c2n = v => (typeof v === "number" ? v.toLocaleString("fr-FR") : v ?? "—");
const c2Ago = t => { const h = (Date.now() - t) / 36e5; return h < 1 ? "à l'instant" : h < 24 ? `il y a ${Math.round(h)} h` : `il y a ${Math.round(h / 24)} j`; };

// ---------- Appels au service
async function c2Fetch(path, params) {
  const r = await fetch(`${C2_API}/api/coach/${path}?${new URLSearchParams(params)}`);
  const j = await r.json().catch(() => ({ error: "Réponse illisible du service." }));
  if (!r.ok) throw new Error(j.error || `Erreur ${r.status}`);
  return j;
}
async function c2LoadProfile(force = false) {
  if (!C2.account || c2ui.loading || (!force && c2ui.error)) return;
  if (!force && C2.profile && Date.now() - C2.profileAt < 120e3) return;
  c2ui.loading = "profile"; c2ui.error = null; render(false);
  try {
    C2.profile = await c2Fetch("profile", { id: C2.account.riotId, platform: C2.account.platform });
    C2.account = { riotId: C2.profile.riotId, platform: C2.profile.platform, puuid: C2.profile.puuid };
    C2.profileAt = Date.now();
    c2Save();
  } catch (e) { c2ui.error = e.message; }
  c2ui.loading = null; render(false);
}
async function c2LoadReview(id) {
  if (C2.reviews[id] || c2ui.loading) return;
  c2ui.loading = id; c2ui.error = null; render(false);
  try { C2.reviews[id] = await c2Fetch("review", { match: id, puuid: C2.account.puuid, platform: C2.account.platform }); c2Save(); } catch (e) { c2ui.error = e.message; }
  c2ui.loading = null; render(false);
}

// ---------- Leçons : conseils déjà vérifiés de la base, puis vidéos de coachs sur le sujet
// Vidéos générales sur le sujet, ou propres au champion joué : jamais un guide d'un autre champion
function c2OtherChamp(title, mine) {
  const t = ` ${String(title).toLowerCase().replace(/[^a-zà-ÿ0-9' ]+/g, " ")} `;
  return c2ChampList().some(c => c.name.length > 3 && c.id !== mine && t.includes(` ${c.name.toLowerCase()} `));
}
function c2Lessons(metric, role, champ = null) {
  const L = C2_LEARN[metric];
  if (!L || !COACH) return { units: [], videos: [] };
  const units = COACH.units.filter(u => ["exploitable", "provisoire"].includes(u.status) && u.usage !== "correction" && !u.id.startsWith("u-dd-") && u.themes.some(t => L.themes.includes(t)) && (u.roles.includes("all") || u.roles.includes(role))).slice(0, 2);
  const roleOk = s => { const src = COACH.sources.find(x => x.id === s); return !src || src.roles.includes("all") || src.roles.includes(role); };
  const videos = COACH.contents.filter(c => c.type === "video" && L.re.test(c.title) && !(c.triage?.entertainment || []).length && roleOk(c.sourceId) && !c2OtherChamp(c.title, champ))
    .sort((a, b) => (b.analysis === "analysee") - (a.analysis === "analysee") || (b.triage?.score || 0) - (a.triage?.score || 0)).slice(0, 3);
  return { units, videos };
}
function c2LessonsHtml(metric, role, champ = null) {
  const { units, videos } = c2Lessons(metric, role, champ);
  return `<div class="c2-lessons">
    ${units.map(u => `<div class="c2-lesson"><p>${esc(u.claim)}</p>${typeof unitDetails === "function" ? unitDetails(u, [], "Source et limites") : ""}</div>`).join("")}
    ${videos.length ? `<p class="label">À regarder</p><ul class="c2-videos">${videos.map(c => `<li><a href="${esc(c.url)}" target="_blank" rel="noopener">${icon("play")}<span><b>${esc(c.title)}</b><span class="fine">${esc(c.author)}${c.published ? ` · ${esc(c.published.slice(0, 4))}` : ""}${c.analysis === "analysee" ? " · analysée par le coach" : " · pas encore analysée par le coach"}</span></span></a></li>`).join("")}</ul>` : ""}
    ${!units.length && !videos.length ? `<p class="fine">Le coach n'a pas encore de contenu vérifié sur ce point.</p>` : ""}
  </div>`;
}

// ---------- Écrans
function viewCoach2(rest = []) {
  if (!COACH) return empty("Base du coach indisponible", "Les connaissances du coach n'ont pas pu être chargées.", `<button class="btn" data-action="retry">Réessayer</button>`);
  const [sub, arg] = rest;
  const head = (title, back) => `<header class="c2-head">${back ? `<a class="back" href="${back}">${icon("left")}Coach</a>` : ""}<h1 class="page-title" tabindex="-1">${esc(title)}</h1>${back ? "" : `<span class="chip soft">Aperçu</span>`}</header>`;
  if (sub === "partie" && arg) return head("Bilan de partie", c2Href()) + c2Game(arg);
  if (sub === "face") return head("Face-à-face", c2Href()) + c2Face();
  if (sub === "champions") return head(arg ? c2Name(arg) : "Champions", arg ? c2Href("champions") : c2Href()) + (arg ? c2Champion(arg) : c2Champions());
  return head("Coach") + c2Home();
}

function c2Home() {
  const tools = `<div class="c2-tools">
    <a class="c2-tool" href="${c2Href("face")}">${icon("users")}<span><b>Face-à-face</b><span class="fine">Mon champion contre le sien</span></span></a>
    <a class="c2-tool" href="${c2Href("champions")}">${icon("list")}<span><b>Champions</b><span class="fine">${c2ChampList().length} champions, conseils sourcés</span></span></a>
    <a class="c2-tool" href="${href("lol", "coach", "strategies")}">${icon("compass")}<span><b>Stratégies</b><span class="fine">Compositions et plans de jeu</span></span></a>
  </div>`;
  if (!C2.account) return `${c2Connect()}${tools}`;
  if (C2_API == null) return `<p class="note">${icon("info")}<span>La lecture des parties arrive bientôt sur la version en ligne : elle attend la clé Riot de production.</span></p>${tools}`;
  setTimeout(() => c2LoadProfile(), 0);
  const p = C2.profile;
  const err = c2ui.error ? `<p class="note warn">${icon("alert")}<span>${esc(c2ui.error)}</span></p>` : "";
  if (!p) return `${err}<div class="c2-card c2-loading">${c2ui.loading ? "Lecture de vos dernières parties…" : ""}</div>${tools}`;
  return `${err}${c2ProfileCard(p)}${c2Goal(p)}${c2Games(p)}${tools}
    <p class="fine c2-foot">Données officielles de Riot Games${p.benchmark ? ` · référence : ${p.benchmark.games} parties ${esc(p.benchmark.level)} (patch ${esc(p.benchmark.patch)})` : ""} · <button class="linkish" data-action="c2-logout">changer de compte</button></p>`;
}

function c2Connect() {
  const off = C2_API == null;
  return `<section class="c2-hero">
    <p class="label">Ton coach personnel</p>
    <h2 class="c2-hero-title">Tes vraies parties, un objectif à la fois</h2>
    <ol class="c2-steps"><li><b>Connecte ton compte</b> avec ton Riot ID : rien à installer.</li><li><b>Bilan de chaque partie</b> : morts, retours à la base, objectifs, comparés aux joueurs Diamant+ de ton rôle.</li><li><b>Un seul objectif</b> suivi de partie en partie, avec les vidéos de coachs qui l'expliquent.</li></ol>
    ${off ? `<p class="note">${icon("info")}<span>Bientôt disponible en ligne : la connexion des comptes attend la validation de la clé Riot de production. Le face-à-face et les fiches champions fonctionnent déjà.</span></p>` : `<form id="c2-connect" class="c2-form" novalidate>
      <label class="field"><span>Riot ID</span><input name="riotid" autocomplete="off" placeholder="Pseudo#TAG" value="${esc(C2.account?.riotId || "")}" required></label>
      <label class="field c2-region"><span>Région</span><select name="platform">${C2_REGIONS.map(([v, l]) => `<option value="${v}" ${v === (C2.account?.platform || "euw1") ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <button class="btn primary" type="submit">Analyser mes parties</button>
      <p class="form-msg fine" role="status" aria-live="polite">${c2ui.error ? esc(c2ui.error) : ""}</p>
    </form>
    <p class="fine">Seules des données de jeu publiques sont lues. Ton Riot ID reste sur cet appareil.</p>`}
  </section>`;
}

function c2ProfileCard(p) {
  const r = p.rank;
  const wins = p.games.filter(g => g.win).length;
  return `<section class="c2-card c2-profile">
    <div class="c2-prow">${c2Img(c2Id(p.champions[0]?.[0]) || p.champions[0]?.[0], "c2-av lg")}
      <div><p class="c2-name">${esc(p.riotId)}</p><p class="fine">${r ? `${esc(C2_TIER[r.tier] || r.tier)}${["MASTER", "GRANDMASTER", "CHALLENGER"].includes(r.tier) ? "" : ` ${esc(r.division)}`} · ${r.lp} LP · ${Math.round((r.wins / (r.wins + r.losses)) * 100)} % sur ${r.wins + r.losses} parties` : "Non classé en solo/duo"} · ${esc(p.platformLabel)}</p></div>
      <button class="icon-btn" data-action="c2-refresh" aria-label="Actualiser">${icon("refresh")}</button></div>
    <div class="c2-kpis">
      <div><span class="c2-k">${wins}<small>/${p.games.length}</small></span><span class="fine">victoires récentes</span></div>
      <div><span class="c2-k">${esc(C2_ROLE[p.mainRole] || "—")}</span><span class="fine">rôle principal</span></div>
      <div class="c2-champs">${p.champions.slice(0, 3).map(([c]) => c2Img(c)).join("")}<span class="fine">champions joués</span></div>
    </div>
  </section>`;
}

function c2Goal(p) {
  const g = p.goal;
  if (!p.benchmark) return `<p class="note">${icon("info")}<span>Référence Diamant+ indisponible : l'objectif ne peut pas être calculé.</span></p>`;
  if (!g) return `<section class="c2-card c2-goal ok"><p class="label">Ton objectif</p><h2 class="c2-goal-title">Rien de net à corriger</h2><p class="fine">Sur tes dernières parties en ${esc(C2_ROLE[p.mainRole] || "—")}, aucun indicateur n'est sous la référence Diamant+ plus d'une partie sur deux. Ouvre le bilan d'une partie pour le détail.</p></section>`;
  const okN = g.success.filter(s => s.ok).length;
  return `<section class="c2-card c2-goal">
    <p class="label">Ton objectif · ${esc(C2_ROLE[p.mainRole])}</p>
    <h2 class="c2-goal-title">${esc(g.label)} : viser ${g.better === "high" ? "au moins" : "au plus"} ${c2n(g.target)}${esc(g.unit)}</h2>
    <p class="fine">Ta valeur habituelle : <b>${c2n(g.median)}${esc(g.unit)}</b>. Joueurs Diamant+ du même rôle : médiane ${c2n(g.p50)}${esc(g.unit)} (${g.n} joueurs). Moins bien que la référence dans ${g.sous} partie${g.sous > 1 ? "s" : ""} sur ${g.games}.</p>
    <div class="c2-dots" aria-label="${okN} partie${okN > 1 ? "s" : ""} réussie${okN > 1 ? "s" : ""} sur ${g.success.length}">${g.success.map(s => `<a href="${c2Href("partie", s.id)}" class="c2-dot ${s.ok ? "ok" : ""}" title="${s.ok ? "Objectif atteint" : "Objectif manqué"}"></a>`).join("")}<span class="fine">${okN}/${g.success.length} réussies</span></div>
    <details class="more"><summary>Comment progresser</summary><p>${esc(C2_LEARN[g.metric]?.tip || "")}</p>${c2LessonsHtml(g.metric, p.mainRole)}</details>
  </section>`;
}

function c2Games(p) {
  if (!p.games.length) return empty("Aucune partie classée récente", "Le bilan porte sur les parties classées (solo/duo et flexible).");
  return `<section class="sec"><div class="sec-head"><h2 class="sec-title">Dernières parties</h2></div>
    <ul class="c2-games">${p.games.map(g => `<li><a class="c2-game ${g.win ? "win" : "loss"}" href="${c2Href("partie", g.id)}">
      ${c2Img(g.champion)}<span class="c2-g-main"><b>${esc(c2Name(g.champion))}</b><span class="fine">${esc(C2_ROLE[g.role] || "")}${g.opponent ? ` · contre ${esc(c2Name(g.opponent))}` : ""} · ${c2Ago(g.at)}</span></span>
      <span class="c2-g-kda"><b>${g.k}/${g.d}/${g.a}</b><span class="fine">${g.cs} sbires · ${Math.round(g.minutes)} min</span></span>
      <span class="c2-g-res">${g.win ? "V" : "D"}</span></a></li>`).join("")}</ul></section>`;
}

// ---------- Bilan d'une partie
function c2Game(id) {
  if (!C2.account) return empty("Compte non connecté", "", `<a class="btn" href="${c2Href()}">Connecter mon compte</a>`);
  const r = C2.reviews[id];
  if (!r) {
    if (C2_API != null && !c2ui.error) setTimeout(() => c2LoadReview(id), 0);
    return c2ui.error ? `<p class="note warn">${icon("alert")}<span>${esc(c2ui.error)}</span></p>` : `<div class="c2-card c2-loading">Lecture de la partie…</div>`;
  }
  const s = r.summary;
  const tile = (label, v, unit = "") => `<div class="c2-tile ${v > 0 ? "up" : v < 0 ? "down" : ""}"><span class="c2-k">${v > 0 ? "+" : ""}${v}${unit}</span><span class="fine">${label}</span></div>`;
  return `<section class="c2-card c2-match ${s.win ? "win" : "loss"}">
      <div class="c2-prow">${c2Img(s.champion, "c2-av lg")}<div><p class="c2-name">${s.win ? "Victoire" : "Défaite"} · ${esc(c2Name(s.champion))}</p><p class="fine">${esc(C2_ROLE[s.role] || "")}${s.opponent ? ` contre ${esc(c2Name(s.opponent))}` : ""} · ${s.k}/${s.d}/${s.a} · ${s.cs} sbires · ${Math.round(s.minutes)} min · patch ${esc(s.patch)}</p></div></div>
      ${r.lane.at10 ? `<div class="c2-tiles">${tile("or à 10 min", r.lane.at10.gold)}${tile("sbires à 10 min", r.lane.at10.cs)}${r.lane.at15 ? tile("or à 15 min", r.lane.at15.gold) : ""}${r.lane.at15 ? tile("expérience à 15 min", r.lane.at15.xp) : ""}</div><p class="fine">Écarts avec ${esc(c2Name(r.lane.opponent))}, ton adversaire direct.</p>` : ""}
    </section>
    ${c2Timeline(r)}
    <section class="sec"><div class="sec-head"><h2 class="sec-title">Ce qui a pesé</h2></div>
      ${r.findings.length ? r.findings.map((f, i) => `<article class="c2-card c2-finding"><p class="label">Constat ${i + 1}</p><h3 class="c2-f-title">${esc(f.title)}</h3>${bullets(f.facts)}
        ${f.metric ? `<details class="more"><summary>Comment progresser</summary><p>${esc(C2_LEARN[f.metric]?.tip || "")}</p>${c2LessonsHtml(f.metric, s.role, s.champion)}</details>` : ""}</article>`).join("") : `<p class="inline-empty">Aucun écart net avec la référence Diamant+ sur cette partie.</p>`}
    </section>
    ${r.strengths.length ? `<section class="sec"><div class="sec-head"><h2 class="sec-title">Points forts</h2></div>${bullets(r.strengths)}</section>` : ""}
    ${r.comparisons.length ? `<section class="sec"><div class="sec-head"><h2 class="sec-title">Face à la référence Diamant+</h2></div><div class="c2-card">${r.comparisons.map(c2Bar).join("")}<p class="fine">Barre : la moitié des joueurs Diamant+ ${esc(C2_ROLE[s.role] || "")} se situe dans la zone claire ; le trait marque la médiane, le point ta partie.</p></div></section>` : ""}
    <p class="fine c2-foot">${esc(r.note)}${r.benchmark ? ` Référence : ${r.benchmark.games} parties ${esc(r.benchmark.level)}, patch ${esc(r.benchmark.patch)}.` : ""}</p>`;
}

function c2Bar(c) {
  const lo = Math.min(c.value, c.p25) * 0.85, hi = Math.max(c.value, c.p75) * 1.1 || 1;
  const x = v => Math.max(0, Math.min(100, ((v - lo) / (hi - lo || 1)) * 100));
  return `<div class="c2-bar ${c.level}"><div class="c2-bar-head"><span>${esc(c.label)}</span><b>${c2n(c.value)}</b></div>
    <div class="c2-bar-track"><span class="c2-bar-band" style="left:${x(c.p25)}%;width:${x(c.p75) - x(c.p25)}%"></span><span class="c2-bar-med" style="left:${x(c.p50)}%"></span><span class="c2-bar-me" style="left:${x(c.value)}%"></span></div></div>`;
}

// Ligne de temps : objectifs en haut, retours à la base et morts du joueur en bas
function c2Timeline(r) {
  const max = r.duration * 1000;
  const x = t => `left:${((t / max) * 100).toFixed(2)}%`;
  const ticks = [];
  for (let m = 5; m * 60000 < max; m += 5) ticks.push(`<span class="tl-tick" style="${x(m * 60000)}"><i>${m}</i></span>`);
  const obj = r.objectives.map(o => `<span class="tl-m tl-obj ${o.ours ? "ours" : "theirs"}" style="${x(o.t)}" title="${esc(o.kind)} ${o.ours ? "pris" : "perdu"} à ${o.at}"></span>`).join("");
  const bases = r.bases.map(b => `<span class="tl-m tl-b ${b.afterDeath ? "shop" : ""}" style="${x(b.t)}" title="${b.afterDeath ? "Achats après une mort" : "Retour à la base"} à ${b.at} : ${esc(b.items.join(", "))}"></span>`).join("");
  const deaths = r.deaths.map(d => `<span class="tl-m tl-d" style="${x(d.t)}" title="Mort à ${d.at}, tué par ${esc(c2Name(d.killer))}${d.beforeObjective ? ` (${esc(d.beforeObjective)})` : ""}"></span>`).join("");
  return `<section class="sec"><div class="sec-head"><h2 class="sec-title">Déroulé</h2></div>
    <div class="c2-card"><div class="c2-tl" role="img" aria-label="Ligne de temps : ${r.objectives.length} objectifs, ${r.bases.length} passages en boutique, ${r.deaths.length} morts">${ticks.join("")}<div class="tl-row">${obj}</div><div class="tl-row tl-me">${bases}${deaths}</div></div>
    <p class="c2-legend fine"><span><i class="lg ours"></i>objectif pris</span><span><i class="lg theirs"></i>objectif perdu</span><span><i class="lg base"></i>retour à la base</span><span><i class="lg shop"></i>achats après une mort</span><span><i class="lg death"></i>mort</span></p>
    <details class="more"><summary>Détail : ${r.deaths.length} mort${r.deaths.length > 1 ? "s" : ""}, ${r.bases.filter(b => !b.afterDeath).length} retours à la base</summary>
      <ul class="c2-events">${[...r.deaths.map(d => ({ t: d.t, html: `<b>${d.at}</b> Mort, tué par ${esc(c2Name(d.killer))}${d.helpers ? ` (+${d.helpers})` : ""}${d.beforeObjective ? ` · <span class="bad">${esc(d.beforeObjective)}</span>` : ""}` })),
        ...r.bases.map(b => ({ t: b.t, html: `<b>${b.at}</b> ${b.afterDeath ? "Achats après la mort" : "Retour à la base"} : ${esc(b.items.join(", "))}${!b.afterDeath && b.goldBefore != null ? ` <span class="fine">(${b.goldBefore} or en poche une minute avant)</span>` : ""}` }))].sort((a, b) => a.t - b.t).map(e => `<li>${e.html}</li>`).join("")}</ul></details></div></section>`;
}

// ---------- Face-à-face et fiches champions (base du coach, sans compte)
function c2TipsFor(name) {
  const units = COACH.units.filter(u => ["exploitable", "provisoire"].includes(u.status) && u.usage !== "correction");
  return {
    play: units.filter(u => u.champions?.includes(name) && !u.matchup),
    against: units.filter(u => u.matchup?.vs === name),
  };
}
const c2Tip = u => `<li class="c2-tip">${esc(u.claim.replace(/^Contre [^:]+ : /, ""))}<span class="fine">${u.nature === "officiel" ? "Riot Games" : esc(contentOf(u.evidence[0]?.content)?.author || "")}${u.status === "provisoire" ? " · provisoire" : ""}</span></li>`;
function c2VideosFor(name) {
  const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return COACH.contents.filter(c => c.type === "video" && (re.test(c.title) || c.champions?.includes(name)) && !(c.triage?.entertainment || []).length).slice(0, 4);
}
const c2VideoList = list => list.length ? `<ul class="c2-videos">${list.map(c => `<li><a href="${esc(c.url)}" target="_blank" rel="noopener">${icon("play")}<span><b>${esc(c.title)}</b><span class="fine">${esc(c.author)}${c.published ? ` · ${esc(c.published.slice(0, 4))}` : ""}${c.analysis === "analysee" ? " · analysée" : ""}</span></span></a></li>`).join("")}</ul>` : "";

function c2Face() {
  const f = C2.face;
  const names = c2ChampList();
  const me = c2Id(f.me), vs = c2Id(f.vs);
  const form = `<form id="c2-face" class="c2-card c2-faceform" novalidate>
    <datalist id="c2-champs">${names.map(c => `<option value="${esc(c.name)}">`).join("")}</datalist>
    <div class="c2-vs">
      <label class="field"><span>Je joue</span><input name="me" list="c2-champs" autocomplete="off" placeholder="Ex. Ahri" value="${esc(f.me)}"></label>
      <span class="c2-vs-sep">contre</span>
      <label class="field"><span>Adversaire</span><input name="vs" list="c2-champs" autocomplete="off" placeholder="Ex. Zed" value="${esc(f.vs)}"></label>
    </div>
    <button class="btn primary" type="submit">Préparer le face-à-face</button></form>`;
  if (!me && !vs) return form;
  const meName = me ? c2Name(me) : null, vsName = vs ? c2Name(vs) : null;
  const a = meName ? c2TipsFor(meName) : null, b = vsName ? c2TipsFor(vsName) : null;
  const both = meName && vsName ? COACH.units.filter(u => u.status !== "retire" && u.champions?.includes(meName) && u.matchup?.vs === vsName) : [];
  const vids = [...(meName ? c2VideosFor(meName) : []), ...(vsName ? c2VideosFor(vsName) : [])].slice(0, 4);
  return `${form}
    <div class="c2-duel">${c2Img(me, "c2-av xl")}<span class="c2-vs-sep">VS</span>${c2Img(vs, "c2-av xl")}</div>
    ${both.length ? `<section class="c2-card"><p class="label">Ce matchup précis</p><ul class="c2-tiplist">${both.map(c2Tip).join("")}</ul></section>` : ""}
    ${b ? `<section class="c2-card"><p class="label">Contre ${esc(vsName)}</p>${b.against.length ? `<ul class="c2-tiplist">${b.against.map(c2Tip).join("")}</ul>` : `<p class="fine">Aucun conseil vérifié pour affronter ${esc(vsName)} pour l'instant.</p>`}</section>` : ""}
    ${a ? `<section class="c2-card"><p class="label">Bien jouer ${esc(meName)}</p>${a.play.length ? `<ul class="c2-tiplist">${a.play.slice(0, 6).map(c2Tip).join("")}</ul>` : `<p class="fine">Aucun conseil vérifié pour ${esc(meName)} pour l'instant.</p>`}</section>` : ""}
    ${vids.length ? `<section class="sec"><div class="sec-head"><h2 class="sec-title">Vidéos de coachs</h2></div>${c2VideoList(vids)}</section>` : ""}
    <p class="fine c2-foot">Conseils officiels de Riot et avis attribués de coachs, contrôlés avant publication. Les statistiques de matchup ne sont pas encore publiées.</p>`;
}

function c2Champions() {
  const q = c2ui.q.toLowerCase();
  const list = c2ChampList().filter(c => !q || c.name.toLowerCase().includes(q));
  return `<label class="field"><span class="sr">Rechercher un champion</span><input id="c2-search" class="search" type="search" placeholder="Rechercher un champion" value="${esc(c2ui.q)}" autocomplete="off"></label>
    <div class="c2-grid">${list.map(c => `<a class="c2-champ" href="${c2Href("champions", c.id)}">${c2Img(c.id)}<span>${esc(c.name)}</span></a>`).join("") || `<p class="fine">Aucun champion trouvé.</p>`}</div>`;
}
function c2Champion(id) {
  const name = c2Name(id);
  const t = c2TipsFor(name);
  const coaching = t.play.filter(u => u.nature !== "officiel");
  const vids = c2VideosFor(name);
  return `<div class="c2-duel">${c2Img(id, "c2-av xl")}</div>
    ${coaching.length ? `<section class="c2-card"><p class="label">Ce qu'en disent les coachs</p><ul class="c2-tiplist">${coaching.map(c2Tip).join("")}</ul></section>` : ""}
    <section class="c2-card"><p class="label">Le jouer</p>${t.play.filter(u => u.nature === "officiel").length ? `<ul class="c2-tiplist">${t.play.filter(u => u.nature === "officiel").map(c2Tip).join("")}</ul>` : `<p class="fine">Riot ne publie pas de conseils officiels pour ${esc(name)}. Des pages officielles sont en cours d'analyse.</p>`}</section>
    <section class="c2-card"><p class="label">L'affronter</p>${t.against.length ? `<ul class="c2-tiplist">${t.against.map(c2Tip).join("")}</ul>` : `<p class="fine">Pas encore de conseil vérifié.</p>`}</section>
    ${vids.length ? `<section class="sec"><div class="sec-head"><h2 class="sec-title">Vidéos</h2></div>${c2VideoList(vids)}</section>` : ""}
    <div class="sheet-actions"><a class="btn" href="${c2Href("face")}" data-action="c2-face-with" data-champ="${esc(name)}">Préparer un face-à-face</a></div>`;
}

// ---------- Événements
document.addEventListener("submit", e => {
  if (e.target.id === "c2-connect") {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = String(fd.get("riotid") || "").trim();
    if (!/^.{3,16}#[A-Za-z0-9]{2,5}$/.test(id)) { e.target.querySelector(".form-msg").textContent = "Riot ID attendu sous la forme Pseudo#TAG (le TAG est visible dans le client, sous ton pseudo)."; return; }
    C2.account = { riotId: id, platform: String(fd.get("platform")) };
    C2.profile = null; C2.reviews = {}; c2ui.error = null;
    c2Save();
    c2LoadProfile(true);
  }
  if (e.target.id === "c2-face") {
    e.preventDefault();
    const fd = new FormData(e.target);
    C2.face = { ...C2.face, me: String(fd.get("me") || "").trim(), vs: String(fd.get("vs") || "").trim() };
    c2Save(); render(false);
  }
});
document.addEventListener("click", e => {
  const a = e.target.closest("[data-action]");
  if (!a) return;
  if (a.dataset.action === "c2-refresh") c2LoadProfile(true);
  if (a.dataset.action === "c2-logout") { C2.account = null; C2.profile = null; C2.reviews = {}; c2ui.error = null; c2Save(); render(false); }
  if (a.dataset.action === "c2-face-with") { C2.face = { ...C2.face, me: a.dataset.champ }; c2Save(); }
});
window.addEventListener("hashchange", () => { c2ui.error = null; });
document.addEventListener("input", e => {
  if (e.target.id !== "c2-search") return;
  c2ui.q = e.target.value;
  const pos = e.target.selectionStart;
  render(false);
  const s = document.getElementById("c2-search");
  s?.focus(); s?.setSelectionRange(pos, pos);
});
