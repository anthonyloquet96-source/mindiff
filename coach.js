/* MINDIFF — onglet Coach : Ma session, Stratégies, Mes ressources (LoL), Stratégies seules (Valorant).
   Le profil est une déclaration du joueur, gardée sur cet appareil. Les conseils viennent de data/coach.json,
   déjà analysés et contrôlés en amont ; la sélection est faite par coach-select.js (aucun appel payant ici). */

let COACH = null;
const CS = window.CoachSelect;
const COACH_KEY = "mindiff-coach-v1";

function loadCoachStore() {
  const base = { profile: null, focus: null, ally: "", vs: "", history: [], metrics: { days: [], prepared: 0, resourceOpened: 0, tried: 0, feedback: 0, useful: { oui: 0, "un-peu": 0, non: 0 } } };
  try { const s = JSON.parse(localStorage.getItem(COACH_KEY) || "null"); if (s) return { ...base, ...s, metrics: { ...base.metrics, ...s.metrics } }; } catch { /* stockage indisponible */ }
  return base;
}
const coach = loadCoachStore();
function saveCoach() { try { localStorage.setItem(COACH_KEY, JSON.stringify(coach)); } catch { /* ignoré */ } }
function coachMetric(k) {
  const d = new Date().toISOString().slice(0, 10);
  if (!coach.metrics.days.includes(d)) coach.metrics.days = [...coach.metrics.days, d].slice(-60);
  if (k) coach.metrics[k] = (coach.metrics[k] || 0) + 1;
  saveCoach();
}

async function loadCoach() {
  try {
    if (location.protocol.startsWith("http")) COACH = await fetchJson(`data/coach.json?t=${Date.now()}`);
    else await new Promise(r => { const s = document.createElement("script"); s.src = "data/coach.js"; s.onload = s.onerror = () => { s.remove(); r(); }; document.body.appendChild(s); }).then(() => { COACH = window.COACH || null; });
  } catch { COACH = COACH || null; }
}

const NATURE_FR = { officiel: ["Officiel", "official"], opinion: ["Avis attribué", ""], statistique: ["Statistique", ""], analyse: ["Analyse MINDIFF", ""] };
const STATUS_FR = { exploitable: null, provisoire: ["Provisoire", "warn"], contradictoire: ["Sources divergentes", "bad"], "a-revalider": ["À revalider", "warn"], obsolete: ["Obsolète", "bad"], retire: ["Retiré", "bad"] };
const ACCESS_FR = { "texte-integral": "Texte lu en entier", "api-json": "Données officielles lues", metadonnees: "Métadonnées seules", transcription: "Transcription analysée", "transcription+visuel": "Transcription et images analysées", inaccessible: "Contenu inaccessible" };
const LANG_FR = { fr: "Français", en: "Anglais", ko: "Coréen" };
const coachHref = (...p) => href(route.game, "coach", ...p);
const stratHref = (game, id) => href(game, "coach", "strategies", id);
const contentOf = id => COACH?.contents.find(c => c.id === id);
const unitTags = u => `${chip(NATURE_FR[u.nature][0], NATURE_FR[u.nature][1])}${STATUS_FR[u.status] ? chip(STATUS_FR[u.status][0], STATUS_FR[u.status][1]) : ""}${u.patch?.known ? chip(`Patch ${u.patch.value}`, "soft") : chip("Patch non daté", "soft")}`;

// Passages qui soutiennent une unité : citation courte, attribuée, lien vers l'original
function evidenceHtml(u) {
  return `<ul class="evid">${u.evidence.map(e => {
    const c = contentOf(e.content);
    return `<li><q lang="${esc(e.lang)}">${esc(e.passage)}</q><span class="fine">${esc(c?.author || "")} · ${esc(e.locator)}${c?.published ? ` · ${fmtDay(c.published)}` : ""}${e.lang !== "fr" ? ` · ${esc(LANG_FR[e.lang] || e.lang)}` : ""} · <a href="${esc(c?.url || "#")}" target="_blank" rel="noopener">original${icon("external", "ext")}</a></span></li>`;
  }).join("")}</ul>
  ${u.translation ? `<p class="note">${icon("info")}<span>Traduction : ${esc(u.translation.note)}</span></p>` : ""}
  ${u.nature === "analyse" ? `<p class="fine">Analyse MINDIFF : déduction à partir des passages ci-dessus, pas une citation.</p>` : u.nature === "opinion" ? `<p class="fine">Avis de l'auteur, présenté comme tel.</p>` : ""}`;
}
function unitDetails(u, why = [], title = "Pourquoi, limites et sources") {
  const limits = [...(u.limits || [])];
  return `<details class="more"><summary>${esc(title)}</summary>
    ${why.length ? `<p class="label">Pourquoi pour vous</p>${bullets(why)}` : ""}
    ${u.detail ? `<p>${esc(u.detail)}</p>` : ""}
    ${u.conditions?.length ? `<p class="label">Conditions</p>${bullets(u.conditions)}` : ""}
    ${limits.length ? `<p class="label">Quand ça ne convient pas · limites</p>${bullets(limits)}` : ""}
    ${u.observe ? `<p class="label">Comment l'observer</p><p>${esc(u.observe)}</p>` : ""}
    <p class="label">Ce qui le soutient</p>${evidenceHtml(u)}
    <p class="fine">Analysé le ${fmtDay(u.analyzedAt)}${u.review?.human === "validée" ? " · relu par une personne" : " · relecture humaine en attente"}.</p>
  </details>`;
}

function coachTabs(cur) {
  const tabs = route.game === "lol" ? [["", "Ma session"], ["strategies", "Stratégies"], ["ressources", "Mes ressources"]] : [["strategies", "Stratégies"]];
  return `<nav class="tabs" aria-label="Coach">${tabs.map(([id, l]) => `<a class="tab" href="${coachHref(id)}" ${cur === id ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</nav>`;
}

function viewCoach() {
  const sub = route.rest[0] || "";
  if (route.game !== "lol") {
    const inner = viewStrats(sub === "strategies" ? route.rest.slice(1) : []);
    return `<header class="page-head"><h1 class="page-title" tabindex="-1">Coach</h1></header>${coachTabs("strategies")}
      <p class="note">${icon("info")}<span>La préparation personnalisée des sessions concerne League of Legends pour l'instant. Les stratégies Valorant restent disponibles ici.</span></p>${inner.replace(/<header class="page-head">[\s\S]*?<\/header>/, "")}`;
  }
  if (sub === "avec" && route.rest[1]) {
    coach.focus = route.rest[1];
    if (coach.profile && !coach.profile.champions.includes(coach.focus)) coach.profile.champions = [coach.focus, ...coach.profile.champions].slice(0, 3);
    coach.ally = ""; coach.vs = "";
    saveCoach();
    history.replaceState(history.state, "", coachHref());
    route.rest = [];
    return viewCoach();
  }
  if (!COACH) return `<header class="page-head"><h1 class="page-title" tabindex="-1">Coach</h1></header>${coachTabs(sub)}${empty("Base du coach indisponible", "Les connaissances du coach n'ont pas pu être chargées.", `<button class="btn" data-action="retry">Réessayer</button>`)}`;
  const body = sub === "strategies" ? viewStrats(route.rest.slice(1)).replace(/<header class="page-head">[\s\S]*?<\/header>/, "")
    : sub === "ressources" ? coachResources()
    : sub === "profil" ? coachProfileForm()
    : coachSession();
  const isDetail = sub === "strategies" && route.rest[1];
  return isDetail ? body : `<header class="page-head"><h1 class="page-title" tabindex="-1">Coach</h1></header>${coachTabs(sub === "profil" ? "" : sub)}${body}`;
}

// ---------- Profil (déclaratif, local, supprimable)
function coachProfileForm() {
  const p = coach.profile || { role: "bottom", role2: "", rank: "non-precise", champions: [], mode: "solo", goal: "lane", time: 15 };
  const covered = Object.values(COACH.pilot.champions).flat();
  const names = rosters.lol?.map(c => c.name) || covered;
  const pilotRoles = COACH.pilot.roles;
  const goalAvail = g => (COACH.coverage.themes[g] || 0) > 0;
  const radios = (name, list, value, mark = () => "") => `<div class="radios" role="radiogroup">${list.map(([v, l]) => `<label class="radio-pill"><input type="radio" name="${name}" value="${esc(v)}" ${String(v) === String(value) ? "checked" : ""} ${mark(v) === "off" ? "disabled" : ""}><span>${esc(l)}${mark(v) === "pilote" ? " ·" : ""}</span></label>`).join("")}</div>`;
  return `<form id="coach-profile" class="cform" novalidate>
    <p class="fine">Ces informations sont des <b>déclarations</b> : elles restent sur cet appareil, sans compte. Sans partie ni replay analysés, le coach ne connaît pas vos erreurs.</p>
    <fieldset><legend>Rôle principal</legend>${radios("role", CS.ROLES, p.role)}<p class="fine">Couverts par le pilote : ${pilotRoles.map(r => CS.label(CS.ROLES, r)).join(" et ")}. Les autres rôles ne reçoivent que des conseils de méthode.</p></fieldset>
    <label class="field"><span>Rôle secondaire (facultatif)</span><select name="role2"><option value="">Aucun</option>${CS.ROLES.map(([v, l]) => `<option value="${v}" ${p.role2 === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <label class="field"><span>Rang déclaré</span><select name="rank">${CS.RANKS.map(([v, l]) => `<option value="${v}" ${p.rank === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <fieldset><legend>Champions principaux (3 au maximum)</legend>
      <datalist id="champ-list">${names.map(n => `<option value="${esc(n)}">`).join("")}</datalist>
      <div class="champ-inputs">${[0, 1, 2].map(i => `<input name="champ${i}" list="champ-list" autocomplete="off" placeholder="${i ? "Facultatif" : "Ex. Lucian"}" value="${esc(p.champions[i] || "")}" aria-label="Champion ${i + 1}">`).join("")}</div>
      <p class="fine">Champions couverts : ${covered.join(", ")}${COACH.pilot.partial?.length ? ` · partiel : ${COACH.pilot.partial.join(", ")}` : ""}.</p></fieldset>
    <fieldset><legend>Vous jouez</legend>${radios("mode", CS.MODES, p.mode)}</fieldset>
    <fieldset><legend>Objectif de travail</legend>${radios("goal", CS.GOALS, p.goal, v => (goalAvail(v) ? "" : "off"))}
      <p class="fine">Grisés : pas encore couverts par des contenus analysés (${CS.GOALS.filter(([g]) => !goalAvail(g)).map(([, l]) => l.toLowerCase()).join(", ")}).</p></fieldset>
    <fieldset><legend>Temps pour vous préparer</legend>${radios("time", CS.TIMES, p.time)}</fieldset>
    <div class="cform-actions"><button class="btn primary" type="submit">Enregistrer et préparer ma session</button>${coach.profile ? `<a class="btn ghost" href="${coachHref()}">Annuler</a>` : ""}</div>
    <p class="form-msg fine" role="status" aria-live="polite"></p>
  </form>
  ${coach.profile || coach.history.length ? `<details class="more"><summary>Mes données sur cet appareil</summary><p>Profil, historique de ${coach.history.length} session${coach.history.length > 1 ? "s" : ""} et mesures du pilote, conservés dans ce navigateur uniquement.</p><button class="btn ghost sm danger" type="button" data-action="coach-erase">Effacer mes données du coach</button></details>` : ""}`;
}

// ---------- Ma session
function coachSession() {
  if (!coach.profile) return `<section class="ccard intro">
      <p class="label">Préparer ma session</p>
      <h2 class="ccard-title">Un objectif, un plan, une ressource</h2>
      <p class="fine">Indiquez votre rôle, vos champions et ce que vous voulez travailler. Le coach choisit parmi des conseils déjà analysés, avec leurs sources.</p>
      <a class="btn primary" href="${coachHref("profil")}">Créer mon profil</a>
      <p class="fine">Pilote : ADC et support (${Object.values(COACH.pilot.champions).flat().join(", ")}).</p>
    </section>`;
  const p = coach.profile;
  const focus = coach.focus && p.champions.includes(coach.focus) ? coach.focus : p.champions[0] || null;
  const opts = CS.options(COACH, focus, p.role);
  if (coach.ally && !opts.allies.includes(coach.ally)) coach.ally = "";
  if (coach.vs && !opts.opponents.includes(coach.vs)) coach.vs = "";
  const r = CS.prepare(COACH, p, { champion: focus, ally: coach.ally || null, vs: coach.vs || null });
  if (!ui.coachCounted) { ui.coachCounted = true; coachMetric("prepared"); }
  const summary = [focus, CS.label(CS.ROLES, p.role), CS.label(CS.RANKS, p.rank), CS.label(CS.MODES, p.mode), `${p.time} min`].filter(Boolean);
  const res = r.resource?.content;
  return `<section class="cprofile">
      <div class="cprofile-row">${focus ? portrait(entity("lol", focus), "sm") : ""}<p class="cprofile-txt"><b>${esc(summary.join(" · "))}</b><span class="fine">Objectif : ${esc(CS.label(CS.GOALS, p.goal))} · profil déclaré, aucune partie analysée</span></p><a class="btn ghost sm" href="${coachHref("profil")}">Modifier</a></div>
      ${p.champions.length > 1 ? seg("coach-focus", p.champions.map(c => [c, c]), focus, "Champion de la session", "wrap small") : ""}
      ${opts.allies.length || opts.opponents.length ? `<div class="cctx">
        ${opts.allies.length ? `<label class="field inline"><span>Avec</span><select data-action="coach-ally"><option value="">Allié non précisé</option>${opts.allies.map(a => `<option ${coach.ally === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></label>` : ""}
        ${opts.opponents.length ? `<label class="field inline"><span>Contre</span><select data-action="coach-vs"><option value="">Adversaire non précisé</option>${opts.opponents.map(a => `<option ${coach.vs === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></label>` : ""}
      </div><p class="fine">Seuls les alliés et adversaires pour lesquels la base contient un contenu analysé sont proposés.</p>` : ""}
    </section>
    ${r.coverage.note ? `<p class="note warn">${icon("alert")}<span>${esc(r.coverage.note)}</span></p>` : ""}

    <section class="ccard" aria-labelledby="c-a"><p class="label" id="c-a">A · Ce qui change pour moi</p>
      ${r.changes.length ? `<ul class="clist">${r.changes.map(u => `<li><div class="crow-tags">${chip(`Patch ${u.patch.value}`)}${chip("Officiel", "official")}</div><p>${esc(firstSentence(u.claim))}</p>${unitDetails({ ...u, detail: u.claim === firstSentence(u.claim) ? u.detail : u.claim }, [], "Valeurs et source")}</li>`).join("")}</ul>`
        : `<p class="inline-empty">${esc(r.changesNote)}</p>`}
    </section>

    <section class="ccard goal" aria-labelledby="c-b"><p class="label" id="c-b">B · Mon objectif de session</p>
      ${r.goalNote ? `<p class="fine">${esc(r.goalNote)}</p>` : ""}
      ${r.goal ? `<p class="goal-action">${esc(r.goal.unit.action)}</p><div class="crow-tags">${unitTags(r.goal.unit)}</div>
        ${r.goal.unit.observe ? `<p class="fine">À observer : ${esc(r.goal.unit.observe)}</p>` : ""}
        ${unitDetails(r.goal.unit, r.goal.why)}` : `<p class="inline-empty">Pas assez d'informations analysées pour proposer un objectif.</p>`}
    </section>

    <section class="ccard" aria-labelledby="c-c"><p class="label" id="c-c">C · Mon plan de jeu</p>
      ${r.plan.length ? `<ul class="clist">${r.plan.map(x => `<li><p>${esc(x.unit.action || x.unit.claim)}</p><div class="crow-tags">${unitTags(x.unit)}</div>${unitDetails(x.unit, x.why, "Détails")}</li>`).join("")}</ul>`
        : `<p class="inline-empty">Pas d'autre consigne analysée pour ${esc(focus || "ce profil")}. Le coach ne complète pas avec des conseils non sourcés.</p>`}
      ${!coach.vs && opts.opponents.length ? `<p class="fine">Aucun adversaire choisi : pas de consigne propre à un adversaire.</p>` : ""}
      ${r.stats.length ? `<details class="more"><summary>Ce que disent les statistiques</summary>${r.stats.map(s => `<p><b>${esc(s.line)}</b></p><div class="crow-tags">${unitTags(s.unit)}</div><p>${esc(s.unit.claim)}</p>${s.unit.detail ? `<p>${esc(s.unit.detail)}</p>` : ""}${bullets(s.unit.limits)}${evidenceHtml(s.unit)}`).join("")}
        <p class="fine">Contexte retenu selon votre rang déclaré : ${s0(r.stats).bucket === "emeraude+" ? "Émeraude et plus" : "tous rangs"}. Une statistique mesure le champion dans un contexte, pas votre maîtrise ni sa valeur dans votre équipe.</p></details>` : ""}
    </section>

    <section class="ccard" aria-labelledby="c-d"><p class="label" id="c-d">D · Une ressource pour comprendre</p>
      ${res ? `<div class="cres"><p class="cres-title">${esc(res.title)}</p>
        <p class="fine">${esc(res.author)} · ${res.published ? fmtDate(res.published) : "non daté"} · ${esc(LANG_FR[res.lang] || res.lang)} · ${res.patch ? `patch ${esc(res.patch)}` : "contexte : sans patch (fondamental)"} · ${esc(ACCESS_FR[res.access] || res.access)}</p>
        <p>${esc(res.learn)}</p>
        ${res.quality ? `<p class="fine">Qualité du contenu : ${esc(res.quality.level)} — ${esc(res.quality.why)}</p>` : ""}
        <div class="cform-actions"><a class="btn ghost sm" href="${esc(res.readerUrl || res.url)}" target="_blank" rel="noopener" data-action="coach-open-res">${icon("external")}Ouvrir l'original</a>${res.readerUrl ? `<a class="btn ghost sm" href="${esc(res.url)}" target="_blank" rel="noopener" data-action="coach-open-res">Données brutes</a>` : ""}</div>
        ${res.readerNote ? `<p class="fine">${esc(res.readerNote)}</p>` : ""}</div>`
        : `<p class="inline-empty">Aucune ressource analysée ne correspond à cet objectif.</p>`}
    </section>

    ${coachFeedback(r, focus)}`;
}
const s0 = a => a[0];
const firstSentence = t => (t.match(/^.+?[.!?](?=\s|$)/) || [t])[0].replace(/^Patch \d+\.\d+ : /, "");

function coachFeedback(r, focus) {
  const last = coach.history.slice(-5).reverse();
  return `<section class="ccard" aria-labelledby="c-e"><p class="label" id="c-e">E · Après ma session</p>
    <form id="coach-feedback" class="cform compact" novalidate>
      <input type="hidden" name="unit" value="${esc(r.goal?.unit.id || "")}"><input type="hidden" name="champion" value="${esc(focus || "")}">
      <fieldset><legend>Avez-vous appliqué l'objectif ?</legend><div class="radios">${[["oui", "Oui"], ["en-partie", "En partie"], ["non", "Non"]].map(([v, l]) => `<label class="radio-pill"><input type="radio" name="applied" value="${v}"><span>${l}</span></label>`).join("")}</div></fieldset>
      <label class="field"><span>Qu'est-ce qui a été difficile ? (facultatif)</span><textarea name="hard" rows="2" maxlength="280"></textarea></label>
      <fieldset><legend>Ce conseil vous a-t-il été utile ?</legend><div class="radios">${[["oui", "Oui"], ["un-peu", "Un peu"], ["non", "Non"]].map(([v, l]) => `<label class="radio-pill"><input type="radio" name="useful" value="${v}"><span>${l}</span></label>`).join("")}</div></fieldset>
      <button class="btn" type="submit">Enregistrer mon retour</button>
      <p class="form-msg fine" role="status" aria-live="polite"></p>
    </form>
    <p class="fine">Votre ressenti ou une victoire ne prouvent pas un progrès : ce journal sert à suivre ce que vous avez travaillé.</p>
    ${last.length ? `<details class="more"><summary>Mon historique de travail (${coach.history.length})</summary><ul class="hist">${last.map(h => `<li><b>${fmtDay(h.at)}</b> · ${esc(h.champion || "—")} · ${esc(unitAction(h.unit))}<span class="fine">Appliqué : ${esc({ oui: "oui", "en-partie": "en partie", non: "non" }[h.applied] || "—")} · utile : ${esc({ oui: "oui", "un-peu": "un peu", non: "non" }[h.useful] || "—")}${h.hard ? ` · « ${esc(h.hard)} »` : ""}</span></li>`).join("")}</ul></details>` : ""}
  </section>`;
}
const unitAction = id => { const u = COACH?.units.find(x => x.id === id); return u ? (u.action || u.claim).slice(0, 90) : "objectif"; };

// ---------- Mes ressources
function coachResources() {
  const p = coach.profile;
  const usable = COACH.units.filter(u => CS.USABLE.includes(u.status));
  const mine = p ? usable.filter(u => u.champions.some(c => p.champions.includes(c)) || u.synergy?.with?.some(c => p.champions.includes(c)) || u.roles.includes("all") || (u.roles.includes(p.role) && !u.champions.length && !u.matchup)) : usable;
  const ids = [...new Set(mine.flatMap(u => u.evidence.map(e => e.content)))];
  const analysed = COACH.contents.filter(c => ids.includes(c.id) && c.analysis === "analysee" && c.learn)
    .sort((a, b) => (b.type === "article") - (a.type === "article") || String(b.published || "").localeCompare(String(a.published || "")));
  const videos = COACH.contents.filter(c => c.type === "video" && c.access === "metadonnees" && (c.triage?.score || 0) > 0)
    .sort((a, b) => (b.triage.score - a.triage.score) || String(b.published).localeCompare(String(a.published))).slice(0, 6);
  const m = coach.metrics;
  const srcName = id => COACH.sources.find(s => s.id === id)?.name || id;
  return `${p ? "" : `<p class="note">${icon("info")}<span>Sans profil, toutes les ressources analysées sont listées. <a href="${coachHref("profil")}">Créer mon profil</a></span></p>`}
    <section class="sec">${secHead("Analysées pour vous")}
      <div class="rlist">${analysed.map(c => `<a class="rcard" href="${esc(c.readerUrl || c.url)}" target="_blank" rel="noopener" data-action="coach-open-res">
        <span class="rcard-meta">${chip(ACCESS_FR[c.access] || c.access, "official")}<span>${esc(LANG_FR[c.lang] || c.lang)}</span><span>${c.published ? fmtDay(c.published) : "non daté"}</span></span>
        <span class="rcard-title">${esc(c.title)}</span><span class="fine">${esc(c.author)}${c.patch ? ` · patch ${esc(c.patch)}` : ""}</span><span class="rcard-learn">${esc(c.learn)}</span></a>`).join("") || `<p class="inline-empty">Aucune ressource analysée pour ce profil.</p>`}</div>
    </section>
    ${videos.length ? `<section class="sec">${secHead("Repérées, non analysées")}
      <p class="fine">Vidéos des chaînes suivies, triées sur leur titre et leur description. <b>Métadonnées seules</b> : le coach n'en a pas lu ni vu le contenu (pas de transcription autorisée), il n'en tire donc aucun conseil.</p>
      <div class="rlist">${videos.map(c => `<a class="rcard" href="${esc(c.url)}" target="_blank" rel="noopener" data-action="coach-open-res"><span class="rcard-meta">${chip("Non analysée", "warn")}<span>${esc(srcName(c.sourceId))}</span><span>${fmtDay(c.published)}</span></span><span class="rcard-title">${esc(c.title)}</span></a>`).join("")}</div>
    </section>` : ""}
    <details class="more"><summary>Sources suivies par le coach (${COACH.sources.filter(s => s.active).length})</summary>
      <ul class="srcreg">${COACH.sources.map(s => `<li><b>${esc(s.name)}</b>${s.active ? "" : chip("Inactive", "soft")}<span class="fine">${esc(s.author)} · ${s.langs.map(l => LANG_FR[l] || l).join(", ")} · accès : ${esc(s.access.mode === "rss-metadonnees" ? "métadonnées seules" : s.access.mode === "bloque" ? "bloqué, lien seulement" : s.access.mode === "api-json" ? "données officielles" : "texte lisible")} · crédibilité : ${esc(s.credibility.level)}</span><span class="fine">${esc(s.credibility.why)}</span></li>`).join("")}</ul>
      <p class="fine">Aucune de ces sources n'est partenaire de MINDIFF. Crédibilité de la source, qualité d'un contenu et pertinence pour vous sont évaluées séparément.</p>
    </details>
    <details class="more"><summary>Mesures du pilote sur cet appareil</summary>
      <dl class="kpis compact"><div><dt>Jours avec le coach</dt><dd>${m.days.length}</dd></div><div><dt>Préparations ouvertes</dt><dd>${m.prepared}</dd></div><div><dt>Ressources ouvertes</dt><dd>${m.resourceOpened}</dd></div><div><dt>Conseils essayés</dt><dd>${m.tried}</dd></div><div><dt>Jugés utiles</dt><dd>${m.useful.oui} / ${m.feedback}</dd></div></dl>
      <p class="fine">Ces chiffres décrivent l'usage, pas une progression. Ils restent dans ce navigateur.</p>
    </details>`;
}

// ---------- Liens depuis le reste de l'application
function coachHomeCard() {
  if (!COACH) return "";
  const p = coach.profile;
  return `<a class="cstrip" href="${href("lol", "coach")}">${icon("target")}<span class="cstrip-txt"><b>Préparer ma session</b><span class="fine">${p ? esc([p.champions[0], CS.label(CS.ROLES, p.role), CS.label(CS.GOALS, p.goal)].filter(Boolean).join(" · ")) : "Un objectif et un plan pour votre prochaine session"}</span></span>${icon("chevron")}</a>`;
}
// Patch : changements des champions du profil, d'après la lecture des notes officielles
function coachPatchBlock(patch) {
  if (!COACH || !coach.profile?.champions.length || !patch) return "";
  const units = COACH.units.filter(u => u.nature === "officiel" && u.themes.includes("patch") && u.patch?.value === patch && u.champions.some(c => coach.profile.champions.includes(c)) && CS.USABLE.includes(u.status));
  const parsed = COACH.patchEntities?.[patch];
  if (!parsed) return "";
  const touched = coach.profile.champions.filter(c => parsed.some(e => e.startsWith(c + "/")));
  const untouched = coach.profile.champions.filter(c => !touched.includes(c));
  return `<section class="sec ccard">${secHead("Pour vos champions")}
    ${units.map(u => `<p>${esc(u.claim)}</p>`).join("")}
    ${touched.filter(c => !units.some(u => u.champions.includes(c))).map(c => `<p>${esc(c)} est modifié dans ce patch (voir les faits ci-dessous).</p>`).join("")}
    ${untouched.length ? `<p class="fine">Non modifié${untouched.length > 1 ? "s" : ""} dans ce patch : ${esc(untouched.join(", "))}.</p>` : ""}
    ${touched.length ? `<a class="btn ghost sm" href="${href("lol", "coach", "avec", touched[0])}">${icon("target")}Préparer ma session avec ${esc(touched[0])}</a>` : ""}
  </section>`;
}
// Fiche champion et stratégie : préparation proposée seulement si le champion est couvert
const coachCovered = name => !!COACH?.coverage.champions[name] && !COACH.coverage.champions[name].partial;
function coachPrepLink(name, label = "Préparer avec ce champion") {
  if (!COACH) return "";
  return `<a class="btn ghost sm" href="${href("lol", "coach", "avec", name)}">${icon("target")}${esc(label)}</a>${coachCovered(name) ? "" : `<span class="fine">${esc(name)} n'est pas encore couvert par le coach : conseils de méthode seulement.</span>`}`;
}

// ---------- Événements propres au coach
document.addEventListener("click", e => {
  const el = e.target.closest("[data-action^='coach-']");
  if (!el) return;
  const a = el.dataset.action;
  if (a === "coach-open-res") { coachMetric("resourceOpened"); return; }
  if (a === "coach-focus") { coach.focus = el.dataset.id; coach.ally = ""; coach.vs = ""; saveCoach(); render(false); return; }
  if (a === "coach-erase") {
    if (!confirm("Effacer le profil, l'historique et les mesures du coach sur cet appareil ?")) return;
    try { localStorage.removeItem(COACH_KEY); } catch { /* ignoré */ }
    Object.assign(coach, loadCoachStore(), { profile: null, history: [] });
    location.hash = coachHref();
  }
});
document.addEventListener("change", e => {
  const a = e.target.dataset?.action;
  if (a === "coach-ally") { coach.ally = e.target.value; saveCoach(); render(false); }
  if (a === "coach-vs") { coach.vs = e.target.value; saveCoach(); render(false); }
});
document.addEventListener("submit", e => {
  const f = e.target;
  if (f.id === "coach-profile") {
    e.preventDefault();
    const d = new FormData(f);
    const names = rosters.lol?.map(c => c.name);
    const champs = [0, 1, 2].map(i => String(d.get(`champ${i}`) || "").trim()).filter(Boolean)
      .map(n => names?.find(x => norm(x) === norm(n)) || n).filter((x, i, a) => a.indexOf(x) === i);
    const unknown = names ? champs.filter(c => !names.includes(c)) : [];
    if (unknown.length) { f.querySelector(".form-msg").textContent = `Champion inconnu : ${unknown.join(", ")}.`; return; }
    coach.profile = { role: d.get("role"), role2: d.get("role2") || "", rank: d.get("rank"), champions: champs, mode: d.get("mode"), goal: d.get("goal"), time: Number(d.get("time")), updatedAt: new Date().toISOString() };
    coach.focus = champs[0] || null; coach.ally = ""; coach.vs = "";
    saveCoach();
    location.hash = coachHref();
  }
  if (f.id === "coach-feedback") {
    e.preventDefault();
    const d = new FormData(f);
    if (!d.get("applied") && !d.get("useful")) { f.querySelector(".form-msg").textContent = "Indiquez au moins si vous avez appliqué l'objectif."; return; }
    coach.history.push({ at: new Date().toISOString(), unit: d.get("unit"), champion: d.get("champion"), applied: d.get("applied"), hard: String(d.get("hard") || "").slice(0, 280), useful: d.get("useful") });
    coach.history = coach.history.slice(-100);
    coach.metrics.feedback++;
    if (["oui", "en-partie"].includes(d.get("applied"))) coach.metrics.tried++;
    if (d.get("useful")) coach.metrics.useful[d.get("useful")]++;
    coachMetric();
    render(false);
    document.querySelector("#coach-feedback .form-msg")?.replaceChildren("Retour enregistré sur cet appareil.");
  }
});
