/* MINDIFF — nouveau coach (aperçu) : #/lol/coach/beta
   1. Mon coach : compte Riot → rang, dernières parties, un objectif suivi de partie en partie
   2. Bilan d'une partie : faits officiels de Riot (morts, backs, objectifs, écarts), comparés au Diamant+
   3. Face-à-face : mon champion contre le sien, conseils sourcés
   4. Champions : les 173 champions et ce que le coach sait de chacun
   Aucun appel d'IA ici : les faits viennent de Riot (via /api/coach, clé gardée côté serveur), les conseils de data/coach.json. */

const C2_KEY = "mindiff-coach2-v1";
const C2 = (() => {
  // history : parties déjà vues (au-delà des 10 dernières) ; goals : objectif suivi par rôle ; seen : bilans ouverts
  const base = { account: null, profile: null, profileAt: 0, reviews: {}, face: { me: "", vs: "", role: "" }, history: {}, goals: {}, role: null, seen: null, pool: {}, draft: null };
  try { return { ...base, ...JSON.parse(localStorage.getItem(C2_KEY) || "null") }; } catch { return base; }
})();
const c2Save = () => { try { localStorage.setItem(C2_KEY, JSON.stringify({ ...C2, reviews: Object.fromEntries(Object.entries(C2.reviews).slice(-8)) })); } catch { /* stockage indisponible */ } };
const c2ui = { loading: null, error: null, q: "", live: null, liveAt: 0, liveBusy: false, champ: {} };
// Service : le serveur local sert l'API ; en ligne, l'adresse du service est fixée par window.MINDIFF_API
const C2_API = window.MINDIFF_API ?? (/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname) ? "" : null);
const c2Href = (...p) => href("lol", "coach", "beta", ...p);

const C2_REGIONS = [["euw1", "EUW"], ["eun1", "EUNE"], ["na1", "NA"], ["kr", "KR"], ["br1", "BR"], ["la1", "LAN"], ["la2", "LAS"], ["tr1", "TR"], ["jp1", "JP"], ["oc1", "OCE"], ["me1", "ME"], ["ru", "RU"]];
const C2_ROLE = { top: "Top", jungle: "Jungle", mid: "Mid", bottom: "ADC", support: "Support" };
const C2_TIER = { IRON: "Fer", BRONZE: "Bronze", SILVER: "Argent", GOLD: "Or", PLATINUM: "Platine", EMERALD: "Émeraude", DIAMOND: "Diamant", MASTER: "Maître", GRANDMASTER: "Grand Maître", CHALLENGER: "Challenger" };
// Comment progresser sur chaque indicateur : thèmes de la base et mots-clés des vidéos de coachs
const C2_LEARN = {
  cs10: { themes: ["lane"], re: /wave|vague|trading|farm|\bcs\b|last ?hit|clear|jungle path|tempo/i, tip: "Vise la référence Diamant+ à 10 min : chaque wave perdue, ce sont 6 sbires et leur or." },
  csMin: { themes: ["lane"], re: /wave|vague|farm|\bcs\b|tempo/i, tip: "Après la phase de lane, continue à prendre les waves proches de toi entre deux combats." },
  deaths30: { themes: ["survie", "methode"], re: /mort|death|dying|surviv|position|dans la t[eê]te|mistake|erreur/i, tip: "Pour chaque mort, note ce que tu ne voyais pas (adversaires absents de la minimap, vision) : ouvre le bilan de la partie, chaque mort y est datée." },
  visionMin: { themes: ["methode"], re: /vision|ward|balise|track/i, tip: "Pose une ward à chaque retour et utilise ton trinket dès qu'il est rechargé." },
  controlWards: { themes: ["methode"], re: /vision|ward|balise|control/i, tip: "Une control ward à chaque back : c'est 75 golds, et souvent un objectif sauvé." },
  kp: { themes: ["teamfight"], re: /roam|gank|tempo|teamfight|skirmish|escarmouche|jungle/i, tip: "Après avoir poussé ta wave, regarde la minimap : rejoins les combats qui ont lieu près de toi." },
};
// Conseil de méthode propre à chaque type de constat (plus précis que celui de l'indicateur)
const C2_KIND_TIP = {
  "mort-avant-objectif": "Dans la minute qui précède un dragon ou un Baron, rejoins ton équipe et évite de mourir seul loin de l'objectif : l'adversaire le prendrait en surnombre.",
  "plaques-perdues": "Avant de quitter ta lane (back, aide à un combat), pousse ta wave vers la tourelle adverse : elle ne s'écrasera pas sous la tienne pendant ton absence.",
  "retard-en-ligne": "Quand ton adversaire a l'avantage, joue la sécurité : prends les sbires près de ta tourelle, signale-le à ton jungler et ne te bats qu'avec un avantage net.",
  "morts-phase-de-ligne": "En phase de lane, recule quand ton adversaire disparaît de la carte ou que son jungler est vu de ton côté : la plupart des morts précoces viennent d'un adversaire non vu.",
  "or-non-depense": "Rentre à la base dès que tu peux acheter un composant important, de préférence après avoir poussé ta wave.",
  "mort-isolee": "Après la phase de lane, ne pousse pas seul dans la moitié adverse quand plusieurs adversaires ne sont pas visibles : reste à portée de ton équipe ou replie-toi avant leur arrivée.",
  "gank-subi": "En phase de lane, quand le jungler adverse n'a pas été vu depuis un moment et que ta wave est poussée, rapproche-toi de ta tourelle ; une ward dans la rivière te montre son arrivée.",
  "absent-objectif": "Environ une minute avant un dragon ou un Baron, pousse ta wave puis rejoins ton équipe : l'adversaire prend les objectifs quand vous êtes moins nombreux.",
  "objectif-inferiorite": "Si un allié est mort ou absent, cède l'objectif et prends plutôt une tourelle ou une wave de l'autre côté de la carte, au lieu de combattre en infériorité.",
  "combat-sans-toi": "Garde un œil sur la minimap : quand ton équipe se bat près de toi, la rejoindre change le rapport de force ; sinon, signale de ne pas engager.",
  "aucune-balise-detruite": "Après ton premier retour, échange ton trinket jaune contre la Lentille de l'oracle (trinket rouge, gratuit à la boutique) : active-la en passant près d'un buisson de rivière ou d'une entrée de jungle, ou pose une control ward, et détruis les wards adverses que tu trouves.",
  "peu-de-retours": "Rentre à la base dès que tu as l'or d'un composant, juste après avoir poussé tes sbires vers la tourelle adverse (en jungle : après un camp ou un gank) : tu reviens à temps et avec un item de plus.",
  "premier-objet-tardif": "Vise ton premier grand item vers 11 min : prends chaque sbire possible et rentre dès que tu as l'or d'un composant, plutôt que de rester sur la carte avec peu de points de vie.",
  "balises-controle": "Achète une control ward à chaque back et pose-la près du prochain objectif (dragon, Larves, Héraut) ou dans ta jungle. Tu ne peux en poser qu'une à la fois : si l'ancienne est encore en place, déplace-la vers le prochain objectif.",
  "temps-mort": "Moins de morts, c'est plus de temps pour farmer et peser sur les objectifs : Commence par les morts après 20 min : tu attends plus longtemps avant de revenir, et l'adversaire en profite pour prendre un objectif.",
};
const c2TipOf = f => C2_KIND_TIP[f.kind] || C2_PLAIN[f.metric]?.steps(C2.profile ? c2Role(C2.profile) : null)?.[0] || C2_LEARN[f.metric]?.tip || "";

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
const c2Ago = t => { const h = (Date.now() - t) / 36e5; return h < 1 / 12 ? "à l'instant" : h < 1 ? `il y a ${Math.round(h * 60)} min` : h < 24 ? `il y a ${Math.round(h)} h` : `il y a ${Math.round(h / 24)} j`; };

// ---------- Appels au service
async function c2Fetch(path, params) {
  const r = await fetch(`${C2_API}/api/coach/${path}?${new URLSearchParams(params)}`).catch(() => null);
  if (!r) throw new Error("Pas de connexion au service du coach. Vérifie ta connexion et réessaie.");
  const j = await r.json().catch(() => ({ error: "Réponse illisible du service." }));
  // Panne côté service (clé Riot expirée, API Riot indisponible) : message compréhensible pour le joueur
  if (r.status >= 500 || /clé Riot/.test(j.error || "")) throw new Error("Le service du coach est momentanément indisponible. Réessaie dans quelques minutes.");
  if (!r.ok) throw new Error(j.error || `Erreur ${r.status}`);
  return j;
}
// Historique local : chaque partie vue est gardée (80 au plus) pour suivre la progression au-delà des 10 dernières
function c2Remember(p) {
  C2.history ||= {};
  for (const g of p.games) C2.history[g.id] = { at: g.at, role: g.role, champion: g.champion, win: g.win, metrics: g.metrics };
  Object.keys(C2.history).sort((a, b) => C2.history[b].at - C2.history[a].at).slice(80).forEach(id => delete C2.history[id]);
  // Première connexion : les parties déjà jouées ne sont pas « nouvelles »
  if (!Array.isArray(C2.seen)) C2.seen = p.games.map(g => g.id);
}
// Changer de Riot ID : la progression de chaque compte est mise de côté et retrouvée au retour (5 comptes récents)
function c2SwitchTo(riotId, platform) {
  const key = id => id.toLowerCase();
  C2.accounts ||= {};
  if (C2.account?.riotId) C2.accounts[key(C2.account.riotId)] = { history: C2.history, goals: C2.goals, seen: C2.seen, role: C2.role, reports: C2.reports };
  const saved = C2.accounts[key(riotId)] || {};
  const prev = C2.account?.riotId && C2.profile ? [{ riotId: C2.account.riotId, platform: C2.account.platform }] : [];
  Object.assign(C2, { account: { riotId, platform }, profile: null, profileAt: 0, reviews: {}, history: saved.history || {}, goals: saved.goals || {}, seen: saved.seen ?? null, role: saved.role || null, reports: saved.reports || {} });
  C2.recent = [{ riotId, platform }, ...prev, ...(C2.recent || [])].filter((r, i, all) => all.findIndex(x => key(x.riotId) === key(r.riotId)) === i).slice(0, 5);
  for (const k of Object.keys(C2.accounts)) if (!C2.recent.some(r => key(r.riotId) === k)) delete C2.accounts[k];
  Object.assign(c2ui, { error: null, switching: false, live: null, liveAt: 0 });
  c2Save();
  c2LoadProfile(true);
}
async function c2LoadProfile(force = false) {
  if (!C2.account || c2ui.loading || (!force && c2ui.error)) return;
  if (!force && C2.profile && Date.now() - C2.profileAt < 120e3) return;
  c2ui.loading = "profile"; c2ui.error = null; render(false);
  try {
    C2.profile = await c2Fetch("profile", { id: C2.account.riotId, platform: C2.account.platform });
    C2.account = { riotId: C2.profile.riotId, platform: C2.profile.platform, puuid: C2.profile.puuid };
    C2.profileAt = Date.now();
    // Orthographe officielle du Riot ID dans la liste des comptes récents
    C2.recent = (C2.recent || []).map(r => (r.riotId.toLowerCase() === C2.profile.riotId.toLowerCase() ? { ...r, riotId: C2.profile.riotId } : r));
    c2Remember(C2.profile);
    c2Save();
  } catch (e) {
    c2ui.error = e.message;
    // Compte inexistant : retiré des comptes récents
    if (/^Aucun compte/.test(e.message)) { C2.recent = (C2.recent || []).filter(r => r.riotId.toLowerCase() !== C2.account.riotId.toLowerCase()); c2Save(); }
  }
  c2ui.loading = null; render(false);
}
// Partie en cours : vérifiée à l'ouverture du coach, puis à la demande (au plus une fois par minute)
async function c2LoadLive(force = false) {
  if (!C2.account?.puuid || c2ui.liveBusy || (!force && Date.now() - c2ui.liveAt < 60e3)) return;
  c2ui.liveBusy = true;
  const was = c2ui.live?.inGame;
  try { c2ui.live = await c2Fetch("live", { puuid: C2.account.puuid, platform: C2.account.platform }); } catch { c2ui.live = null; }
  c2ui.liveAt = Date.now(); c2ui.liveBusy = false;
  // Partie terminée depuis la dernière vérification : on recharge les parties pour proposer le bilan
  if (was && c2ui.live && !c2ui.live.inGame) { render(false); return c2LoadProfile(true); }
  render(false);
}
// Fiche Diamant+ d'un champion (items, runes, sorts) : données du serveur, pas encore publiées en ligne
async function c2LoadChamp(id) {
  if (C2_API == null || id in c2ui.champ) return;
  c2ui.champ[id] = null;
  try { c2ui.champ[id] = await c2Fetch("champion", { id }); } catch { c2ui.champ[id] = { error: true }; }
  render(false);
}
async function c2LoadReview(id) {
  if (C2.reviews[id]?.tactics?.kills || c2ui.loading) return; // bilans plus anciens (sans relecture tactique ou sans les kills du replay) : relus
  c2ui.loading = id; c2ui.error = null; render(false);
  try { C2.reviews[id] = await c2Fetch("review", { match: id, puuid: C2.account.puuid, platform: C2.account.platform }); c2MarkSeen(id); c2Save(); } catch (e) { c2ui.error = e.message; }
  c2ui.loading = null; render(false);
}

// ---------- Leçons : conseils déjà vérifiés de la base, puis vidéos de coachs sur le sujet
// Vidéos générales sur le sujet, ou propres au champion joué : jamais un guide d'un autre champion
function c2OtherChamp(title, mine) {
  const t = ` ${String(title).toLowerCase().replace(/[^a-zà-ÿ0-9' ]+/g, " ")} `;
  return c2ChampList().some(c => c.name.length > 3 && c.id !== mine && t.includes(` ${c.name.toLowerCase()} `));
}
// ---------- Langage clair : chaque indicateur expliqué comme à un joueur qui débute, avec des actions concrètes
const C2_GOOD = { top: "les bons toplaners", jungle: "les bons junglers", mid: "les bons midlaners", bottom: "les bons ADC", support: "les bons supports" };
const C2_PLAIN = {
  cs10: {
    goal: "Mieux farmer en début de partie", name: "Farm en début de partie",
    say: v => `${c2n(v)} sbires à 10 min`,
    what: role => role === "jungle"
      ? "En jungle, le farm, ce sont les camps de monstres que tu tues. Plus tu en fais, plus vite tu gagnes de l'or et des niveaux."
      : "Les sbires sont les petits soldats qui avancent dans les lanes. Donner le last hit à un sbire rapporte de l'or : c'est ta première source d'or pour acheter tes items.",
    steps: role => role === "jungle"
      ? ["Enchaîne tes camps sans temps mort : chaque camp tué, c'est de l'or et de l'expérience.", "Entre deux attaques sur une lane, reviens prendre tes camps.", "Garde le même ordre de camps à chaque partie pour gagner en rythme."]
      : ["Ne frappe un sbire que lorsqu'il est presque mort : seul le last hit donne l'or.", "Avant de rentrer à la base, tue d'abord les sbires adverses pour perdre le moins de farm possible.", "Entraîne-toi 5 minutes en mode Entraînement : vise 70 sbires à 10 minutes."],
  },
  csMin: {
    goal: "Farmer davantage sur toute la partie", name: "Farm",
    say: v => `${c2n(Math.round(v * 10) / 10)} sbires par minute`,
    what: () => "Le nombre de sbires et de monstres que tu achèves par minute, du début à la fin. Plus de farm, c'est plus d'or, donc de meilleurs items.",
    steps: () => ["Après la phase de lane (vers 14 min), continue à prendre les waves de sbires proches de toi entre deux combats.", "Quand il ne se passe rien, va chercher une wave sur une lane de côté plutôt que d'attendre.", "Ne laisse jamais une wave mourir sous ta tourelle sans la prendre."],
  },
  deaths30: {
    goal: "Mourir moins", name: "Morts",
    say: v => `${c2n(Math.round(v * 10) / 10)} morts par tranche de 30 min`,
    what: () => "Chaque mort te fait attendre sans jouer, donne de l'or à l'adversaire et lui laisse le temps de prendre des objectifs.",
    steps: () => ["Quand ton adversaire disparaît de la carte, recule : il arrive peut-être avec d'autres.", "Avant d'avancer seul, regarde la minimap et compte les adversaires visibles.", "Après chaque mort, demande-toi ce que tu ne voyais pas : c'est souvent la même erreur qui revient."],
  },
  visionMin: {
    goal: "Mieux éclairer la carte", name: "Vision",
    say: v => `${c2n(Math.round(v * 10) / 10)} de score de vision par minute`,
    what: () => "Le score de vision compte ce que tu fais pour voir la carte : wards posées, wards adverses détruites. Voir l'adversaire venir évite des morts et aide à prendre les objectifs.",
    steps: role => [...(role === "support" ? ["Termine vite la quête de ton item de support : il te donne des wards à poser ; pose-les dès qu'elles sont disponibles."] : []), "Pose ta ward gratuite (le trinket, touche 4) dès qu'elle est rechargée.", "Achète une control ward (75 golds) à chaque back.", "Place tes wards là où l'adversaire passe : rivière, entrées de jungle, et autour du dragon une minute avant qu'il apparaisse."],
  },
  controlWards: {
    goal: "Poser des control wards", name: "Control wards",
    say: v => `${c2n(v)} ward${v > 1 ? "s" : ""} de contrôle par partie`,
    what: () => "La control ward (75 golds) révèle les wards adverses autour d'elle. C'est l'un des achats les plus rentables du jeu.",
    steps: () => ["Achètes-en une à chaque back.", "Pose-la dans un buisson de la rivière ou près d'un objectif (dragon, Baron).", "Garde toujours une place libre pour elle dans ton inventaire."],
  },
  kp: {
    goal: "Participer à plus de combats", name: "Participation aux combats",
    say: v => `${c2n(Math.round(v))} % des kills de ton équipe`,
    what: () => "La part des kills de ton équipe auxquelles tu participes. Être là quand ton équipe se bat change le rapport de force.",
    steps: () => ["Après avoir poussé ta wave, regarde la minimap : si un combat se prépare près de toi, rejoins-le.", "Avant un dragon ou un Baron, rejoins ton équipe une minute avant.", "Évite de farmer seul à l'autre bout de la carte quand ton équipe est regroupée."],
  },
};
// Vidéos pour aller plus loin : 2 au plus, langue indiquée, jamais le guide d'un autre champion
const C2_LANG = { fr: "en français", en: "en anglais", es: "en espagnol", pt: "en portugais", de: "en allemand", ko: "en coréen", ja: "en japonais", pl: "en polonais", tr: "en turc" };
function c2Videos(metric, role, champ = null) {
  const L = C2_LEARN[metric];
  if (!L || !COACH) return [];
  const roleOk = s => { const src = COACH.sources.find(x => x.id === s); return !src || src.roles.includes("all") || src.roles.includes(role); };
  const ROLE_RE = { top: /\btop(lane|laner)?\b/i, jungle: /jungl|\bjg\b/i, mid: /\bmid(lane|laner)?\b/i, bottom: /\badc\b|\bbot ?lane\b|marksman/i, support: /support|\bsupp?\b/i };
  const otherRole = t => Object.entries(ROLE_RE).some(([r, re]) => r !== role && re.test(t)) && !(ROLE_RE[role]?.test(t));
  return COACH.contents.filter(c => c.type === "video" && L.re.test(c.title) && !(c.triage?.entertainment || []).length && roleOk(c.sourceId) && !c2OtherChamp(c.title, champ) && !(role && otherRole(c.title)))
    .sort((a, b) => (b.lang === "fr") - (a.lang === "fr") || (b.analysis === "analysee") - (a.analysis === "analysee") || (b.triage?.score || 0) - (a.triage?.score || 0)).slice(0, 2);
}
// « Comment progresser » : des actions concrètes, puis une ou deux vidéos (sans détail de provenance : il reste dans la page de contrôle)
function c2LessonsHtml(metric, role, champ = null, steps = true) {
  const P = steps ? C2_PLAIN[metric] : null;
  const vids = c2Videos(metric, role, champ);
  return `<div class="c2-lessons">
    ${P ? `<ol class="c2-howto">${P.steps(role).map(x => `<li>${esc(x)}</li>`).join("")}</ol>` : ""}
    ${vids.length ? `<p class="label">Pour aller plus loin</p><ul class="c2-videos">${vids.map(c => `<li><a href="${esc(c.url)}" target="_blank" rel="noopener">${icon("play")}<span><b>${esc(c.title)}</b><span class="fine">Vidéo ${C2_LANG[c.lang] || ""} · ${esc(c.author)}</span></span></a></li>`).join("")}</ul>` : ""}
  </div>`;
}

// ---------- Animation d'arrivée : chiffres qui défilent jusqu'à leur valeur
function c2Animate() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const fmt = new Intl.NumberFormat("fr-FR");
  for (const k of document.querySelectorAll(".c2-enter .c2-k, .c2-enter .c2-ring b")) {
    const node = k.firstChild;
    const m = node?.nodeType === 3 && node.data.replace(/[\s\u202f\u00a0]/g, "").match(/^([+−-]?)(\d+)$/);
    if (!m || Number(m[2]) < 2) continue;
    const sign = m[1], to = Number(m[2]), t0 = performance.now(), dur = Math.min(1100, 500 + to);
    const step = now => {
      if (!node.isConnected) return;
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      node.data = sign + fmt.format(Math.round(to * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

// ---------- Écrans
function viewCoach2(rest = []) {
  if (!COACH) return empty("Base du coach indisponible", "Les connaissances du coach n'ont pas pu être chargées.", `<button class="btn" data-action="retry">Réessayer</button>`);
  const [sub, arg] = rest;
  const enter = c2ui.lastHash !== location.hash;
  c2ui.lastHash = location.hash;
  let slide = "";
  // Écran qui charge d'abord : l'animation d'arrivée attend que le contenu soit là
  const screen = html => {
    const loading = html.includes("c2-loading"), go = (enter || c2ui.pendEnter) && !loading;
    c2ui.pendEnter = loading && (enter || c2ui.pendEnter);
    if (go) requestAnimationFrame(c2Animate);
    return `<div class="c2-screen${go ? " c2-enter" : ""}${slide}">${html}</div>`;
  };
  // Pages de détail : retour vers l'onglet d'origine, sans onglets
  const back = (title, to, label) => `<header class="c2-head"><a class="back" href="${to}">${icon("left")}${esc(label)}</a><h1 class="page-title" tabindex="-1">${esc(title)}</h1></header>`;
  if (sub === "partie" && arg) return back("Bilan de partie", c2Href("parties"), "Mes parties") + screen(c2Game(arg));
  if (sub === "bilan") return back("Mon bilan complet", c2Href(), "Mon suivi") + screen(c2Report());
  if (sub === "champions" && arg) return back(c2Name(arg), c2Href("champions"), "Champions") + screen(c2Champion(arg));
  // Onglets principaux, comme le reste de l'application
  const tab = { parties: "parties", preparer: "preparer", draft: "preparer", face: "preparer", champions: "champions" }[sub] || "suivi";
  if (sub === "face") c2ui.prep = "face";
  if (sub === "draft") c2ui.prep = "draft";
  const tabs = [["suivi", "Mon suivi", "target", c2Href()], ["parties", "Mes parties", "list", c2Href("parties")], ["preparer", "Préparer", "bracket", c2Href("preparer")], ["champions", "Champions", "users", c2Href("champions")]];
  const ti = tabs.findIndex(x => x[0] === tab);
  if (enter && c2ui.lastTab != null && c2ui.lastTab !== ti) slide = ti > c2ui.lastTab ? " c2-from-r" : " c2-from-l";
  c2ui.lastTab = ti;
  const nav = `<nav class="tabs c2-tabs" aria-label="Coach">${tabs.map(([k, l, ic, to]) => `<a class="tab" href="${to}" ${k === tab ? 'aria-current="page"' : ""}>${icon(ic)}${l}</a>`).join("")}</nav>`;
  const body = tab === "parties" ? c2GamesTab() : tab === "preparer" ? c2Prepare() : tab === "champions" ? c2Champions() : c2Home();
  return `<header class="c2-head"><h1 class="page-title" tabindex="-1">Coach</h1><span class="chip soft">Aperçu</span></header>${nav}${screen(body)}<p class="fine c2-foot">${RIOT_LEGAL}</p>`;
}

// Onglet « Parties » : toutes les parties lues, filtre par rôle
function c2GamesTab() {
  const p = c2NeedProfile();
  if (typeof p === "string") return p;
  const roles = [...new Set(p.games.map(g => g.role).filter(Boolean))];
  const f = roles.includes(c2ui.gameRole) ? c2ui.gameRole : "all";
  const games = f === "all" ? p.games : p.games.filter(g => g.role === f);
  const wins = games.filter(g => g.win).length;
  return `${roles.length > 1 ? `<div class="filters">${seg("c2-game-role", [["all", "Tous"], ...roles.map(r => [r, C2_ROLE[r] || r])], f, "Rôle", "small")}</div>` : ""}
    <p class="fine">${games.length} partie${games.length > 1 ? "s" : ""} classée${games.length > 1 ? "s" : ""} récente${games.length > 1 ? "s" : ""} · ${wins} victoire${wins > 1 ? "s" : ""}. Touche une partie pour son bilan.</p>
    ${c2Games({ ...p, games })}`;
}
// Onglet « Préparer » : draft ou face-à-face
function c2Prepare() {
  const mode = c2ui.prep === "face" ? "face" : "draft";
  return `<div class="filters">${seg("c2-prep", [["draft", "Ma partie (draft)"], ["face", "Face-à-face"]], mode, "Préparer")}</div>${mode === "face" ? c2Face() : c2Draft()}`;
}
// Compte connecté et profil chargé, sinon l'écran adapté (connexion, chargement, erreur)
function c2NeedProfile() {
  if (!C2.account) return c2Connect();
  if (C2_API == null) return `<p class="note">${icon("info")}<span>La lecture des parties arrive bientôt sur la version en ligne : elle attend la clé Riot de production.</span></p>`;
  setTimeout(() => c2LoadProfile(), 0);
  const p = C2.profile;
  if (!p && c2ui.error && !c2ui.loading) return c2Connect();
  if (!p) return `<div class="c2-card c2-loading">${c2ui.loading ? "Lecture de tes dernières parties…" : ""}</div>`;
  return p;
}

// Onglet « Mon suivi » : l'essentiel, dans l'ordre d'usage (partie en cours, partie à relire, objectif, priorité, dernières parties)
function c2Home() {
  const p = c2NeedProfile();
  if (typeof p === "string") return p;
  const err = c2ui.error ? `<div class="note warn">${icon("alert")}<span>${esc(c2ui.error)}</span><button class="btn ghost sm" data-action="c2-refresh">Réessayer</button></div>` : "";
  setTimeout(() => c2LoadLive(), 0);
  const recent = p.games.slice(0, 3);
  return `${c2ui.switching ? c2Connect(true) : ""}${err}${c2ProfileCard(p)}${c2Live(p)}${c2Ready(p)}${c2Goal(p)}
    <a class="c2-ready c2-bilan-link" href="${c2Href("bilan")}">${icon("tiers")}<span><b>Mon bilan complet</b><span class="fine">Tes erreurs qui reviennent, tes forces et les adversaires à préparer, sur tes 20 dernières parties</span></span>${icon("chevron")}</a>
    ${recent.length ? `<section class="sec">${secHead("Dernières parties", seeAll(c2Href("parties"), "Toutes"))}${c2Games({ ...p, games: recent })}</section>` : ""}
    <p class="fine c2-foot">Données officielles de Riot Games${p.benchmark ? ` · référence : ${p.benchmark.games} parties ${esc(p.benchmark.level)} (patch ${esc(p.benchmark.patch)})` : ""}</p>`;
}

function c2Connect(switching = false) {
  const off = C2_API == null;
  const recent = (C2.recent || []).filter(r => r.riotId.toLowerCase() !== (C2.profile?.riotId || "").toLowerCase());
  const intro = switching ? "" : `<h2 class="c2-hero-title">Tes vraies parties, un objectif à la fois</h2>
    <ol class="c2-steps"><li><b>Connecte ton compte</b> avec ton Riot ID : rien à installer.</li><li><b>Bilan de chaque partie</b> : morts, backs, objectifs, comparés aux joueurs Diamant+ de ton rôle.</li><li><b>Un seul objectif</b> suivi de partie en partie, avec les vidéos de coachs qui l'expliquent.</li></ol>`;
  const chips = recent.length && !off ? `<div class="c2-recent"><span class="fine">Comptes récents</span>${recent.map(r => `<button class="pill-btn" data-action="c2-use" data-id="${esc(r.riotId)}" data-platform="${esc(r.platform)}">${esc(r.riotId)}</button>`).join("")}</div>` : "";
  return `<section class="c2-hero ${switching ? "compact" : ""}">
    <p class="label">${switching ? "Changer de Riot ID" : "Ton coach personnel"}</p>
    ${intro}${chips}
    ${off ? `<p class="note">${icon("info")}<span>Bientôt disponible en ligne : la connexion des comptes attend la validation de la clé Riot de production. Le face-à-face et les fiches champions fonctionnent déjà.</span></p>` : `<form id="c2-connect" class="c2-form" novalidate>
      <label class="field"><span>Riot ID</span><input name="riotid" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Pseudo#TAG" value="${switching ? "" : esc(C2.account?.riotId || "")}" required></label>
      <label class="field c2-region"><span>Région</span><select name="platform">${C2_REGIONS.map(([v, l]) => `<option value="${v}" ${v === (C2.account?.platform || "euw1") ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <button class="btn primary" type="submit">${switching ? "Voir ce compte" : "Analyser mes parties"}</button>
      ${switching ? `<button class="btn ghost" type="button" data-action="c2-switch">Annuler</button>` : ""}
      <p class="form-msg fine" role="status" aria-live="polite">${c2ui.error ? esc(c2ui.error) : ""}</p>
    </form>
    <p class="fine">Seules des données de jeu publiques sont lues. Ton Riot ID reste sur cet appareil.</p>`}
  </section>`;
}

function c2ProfileCard(p) {
  const r = p.rank;
  const rank = r ? `${esc(C2_TIER[r.tier] || r.tier)}${["MASTER", "GRANDMASTER", "CHALLENGER"].includes(r.tier) ? "" : ` ${esc(r.division)}`} · ${r.lp} LP` : "Non classé en solo/duo";
  return `<section class="c2-me">
    ${c2Img(c2Id(p.champions[0]?.[0]) || p.champions[0]?.[0], "c2-av")}
    <div class="c2-me-txt"><b>${esc(p.riotId)}</b><span class="fine">${rank} · ${esc(p.platformLabel)}</span></div>
    <button class="icon-btn" data-action="c2-refresh" aria-label="Actualiser mes parties">${icon("refresh")}</button>
    <button class="icon-btn" data-action="c2-switch" aria-expanded="${!!c2ui.switching}" aria-label="Changer de Riot ID">${icon("users")}</button>
  </section>
  ${c2Roles(p)}
  ${p.ranked === false && p.games.length ? `<p class="fine">Pas de partie classée récente : le coach lit tes parties normales.</p>` : ""}`;
}

// ---------- Objectif suivi dans le temps
// Un objectif par rôle, gardé tant qu'il n'est pas atteint (4 parties réussies sur les 5 dernières).
// Palier 1 : sortir du quart le plus faible des Diamant+ ; palier 2 : atteindre leur médiane ; puis objectif suivant.
const c2Role = p => (C2.role && p.byRole?.[C2.role] ? C2.role : p.mainRole);
function c2GoalState(p, role) {
  const R = p?.byRole?.[role];
  if (!R) return null;
  C2.goals ||= {};
  let st = C2.goals[role];
  if (!st?.metric || !R.tally.some(t => t.metric === st.metric)) {
    if (!R.goal) return { role, R, none: true, done: st?.done || [] };
    st = C2.goals[role] = { metric: R.goal.metric, level: 1, since: Date.now(), done: st?.done || [] };
    c2Save();
  }
  const t = R.tally.find(x => x.metric === st.metric);
  const target = st.level === 2 ? t.p50 : t.target;
  const ok = v => (t.better === "high" ? v >= target : v <= target);
  const games = Object.entries(C2.history || {}).filter(([, g]) => g.role === role && g.metrics?.[st.metric] != null)
    .map(([id, g]) => ({ id, at: g.at, champion: g.champion, win: g.win, v: g.metrics[st.metric] })).sort((a, b) => a.at - b.at);
  games.forEach(g => (g.ok = ok(g.v)));
  const last5 = games.slice(-5), okN = last5.filter(g => g.ok).length;
  let streak = 0;
  for (let i = games.length - 1; i >= 0 && games[i].ok; i--) streak++;
  const med = list => { const v = list.map(g => g.v).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
  const next = R.tally.filter(x => x.metric !== st.metric && !st.done.includes(x.metric) && x.sous > 0 && (x.p50 > 0 || x.better === "low")).sort((a, b) => b.sous / b.games - a.sous / a.games)[0] || null;
  return { role, R, t, st, target, games, last5, okN, streak, reached: last5.length >= 5 && okN >= 4, next,
    before: games.length >= 8 ? med(games.slice(0, -5)) : null, now: med(last5) };
}
// Courbe de l'indicateur partie après partie : points positionnés en HTML (pas de déformation), seuil en pointillés
function c2Spark(g) {
  const list = g.games.slice(-15);
  if (list.length < 2) return "";
  const vals = [...list.map(x => x.v), g.target, g.t.p50];
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const y = v => (hi === lo ? 50 : 8 + ((v - lo) / (hi - lo)) * 84);
  const x = i => (list.length === 1 ? 50 : 4 + (i / (list.length - 1)) * 92);
  return `<div class="c2-spark" role="img" aria-label="${esc(g.t.label)} sur tes ${list.length} dernières parties : ${list.filter(v => v.ok).length} au niveau de l'objectif">
    <span class="c2-sp-target" style="bottom:${y(g.target).toFixed(1)}%"><i>objectif ${c2n(Math.round(g.target * 10) / 10)}</i></span>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline pathLength="100" points="${list.map((p, i) => `${x(i).toFixed(1)},${(100 - y(p.v)).toFixed(1)}`).join(" ")}" vector-effect="non-scaling-stroke"/></svg>
    ${list.map((p, i) => `<a class="c2-sp-dot ${p.ok ? "ok" : ""}" href="${c2Href("partie", p.id)}" style="left:${x(i).toFixed(1)}%;bottom:${y(p.v).toFixed(1)}%;--i:${i}" title="${esc(c2Name(p.champion))} : ${c2n(p.v)}${esc(g.t.unit)}"></a>`).join("")}
  </div>`;
}
function c2Goal(p) {
  if (!p.benchmark) return `<p class="note">${icon("info")}<span>Référence indisponible : l'objectif ne peut pas être calculé pour l'instant.</span></p>`;
  const role = c2Role(p);
  const g = c2GoalState(p, role);
  const roleName = esc(C2_ROLE[role] || "—");
  const good = C2_GOOD[role] || "les bons joueurs";
  const P = m => C2_PLAIN[m] || { goal: m, name: m, say: v => c2n(v), what: () => "", steps: () => [] };
  const picker = all => { const list = all.filter(t => t.p50 > 0 || t.better === "low"); return list.length ? `<details class="more c2-pick"><summary>Choisir un point à améliorer</summary><div class="c2-pick-list">${list.map(t => `<button class="pill-btn" data-action="c2-goal-pick" data-role="${esc(role)}" data-metric="${esc(t.metric)}">${esc(P(t.metric).goal)}</button>`).join("")}</div></details>` : ""; };
  if (!g) return `<section class="c2-card c2-goal ok"><p class="label">Ton objectif</p><p class="fine">Joue au moins 3 parties en ${roleName} pour que le coach te propose un objectif.</p></section>`;
  if (g.none) {
    const S = C2.reports?.[role], top = S?.top;
    if (top) return `<section class="c2-card c2-goal"><p class="label">Ta priorité · ${roleName}</p><h2 class="c2-goal-title">${esc(top.title)}</h2>
      <p class="fine">${esc(top.detail || "")}</p>
      ${c2TipOf(top) ? `<p class="c2-better"><b>Ce qu'il faut faire</b> ${esc(c2TipOf(top))}</p>` : ""}
      <p class="fine">D'après ton bilan sur ${S.games} parties (${c2Ago(S.at)})${S.more > 0 ? ` · ${S.more} autre${S.more > 1 ? "s" : ""} point${S.more > 1 ? "s" : ""} à travailler ensuite` : ""}.</p>
      <a class="btn ghost" href="${c2Href("bilan")}">Voir le détail et les parties concernées</a></section>`;
    if (S) return `<section class="c2-card c2-goal ok"><p class="label">Ta priorité · ${roleName}</p><h2 class="c2-goal-title">Aucune erreur qui revient</h2><p class="fine">Ton bilan sur ${S.games} parties (${c2Ago(S.at)}) ne trouve aucune erreur répétée : garde ce qui marche.</p>${picker(g.R.tally)}</section>`;
    return `<section class="c2-card c2-goal"><p class="label">Ta priorité · ${roleName}</p><h2 class="c2-goal-title">Trouve ce qui te coûte des parties</h2>
      <p class="fine">Tes bases sont au niveau (farm, morts, vision). Le coach peut maintenant relire tes 20 dernières parties en ${roleName} : combats, objectifs, morts. Il en tire ta priorité.</p>
      <a class="btn primary" href="${c2Href("bilan")}">Lancer mon bilan (environ 1 minute)</a>${picker(g.R.tally)}</section>`;
  }
  const { t, st } = g, M = P(t.metric);
  const head = g.reached
    ? `<div class="c2-goalhead"><div><p class="label">${icon("check")}Objectif atteint · ${roleName}</p><h2 class="c2-goal-title">${esc(M.goal)}</h2></div>${c2Ring(g.okN, 5, "gold")}</div><p class="fine">Réussi dans ${g.okN} de tes 5 dernières parties. Bravo !</p>`
    : `<div class="c2-goalhead"><div><p class="label">Ta priorité · ${roleName}${st.level === 2 ? " · niveau 2" : ""}</p><h2 class="c2-goal-title">${esc(M.goal)}</h2></div>${c2Ring(g.okN, 5)}</div><p class="fine">${esc(M.what(role))}</p>`;
  const better = t.better === "high" ? g.now != null && g.before != null && g.now > g.before : g.now != null && g.before != null && g.now < g.before;
  const numbers = `<div class="c2-goalnums">
      <div><span class="fine">Toi en ce moment</span><b>${g.now != null ? esc(M.say(g.now)) : "—"}</b>${g.before != null ? `<span class="fine ${better ? "up" : ""}">${better ? "en progrès, " : ""}avant : ${esc(M.say(g.before))}</span>` : ""}</div>
      <div><span class="fine">Ta cible</span><b>${t.better === "high" ? "au moins" : "au plus"} ${esc(M.say(g.target))}</b></div>
      <div><span class="fine">${esc(good[0].toUpperCase() + good.slice(1))} (Diamant et plus)</span><b>${esc(M.say(t.p50))}</b></div>
    </div>`;
  const after = g.reached ? `<div class="c2-goalbtns">
      ${st.level !== 2 && g.target !== t.p50 ? `<button class="btn primary" data-action="c2-goal-up" data-role="${esc(role)}">Viser le niveau des bons joueurs : ${esc(M.say(t.p50))}</button>` : ""}
      ${g.next ? `<button class="btn ${st.level === 2 ? "primary" : "ghost"}" data-action="c2-goal-next" data-role="${esc(role)}" data-metric="${esc(g.next.metric)}">Objectif suivant : ${esc(P(g.next.metric).goal.toLowerCase())}</button>` : ""}
    </div>` : "";
  const key = `${role}:${t.metric}:${st.level || 1}`, party = g.reached && !(c2ui.partied ||= new Set()).has(key);
  if (party) c2ui.partied.add(key);
  return `<section class="c2-card c2-goal ${g.reached ? "ok" : ""}${party ? " c2-party" : ""}">
    ${party ? `<div class="c2-confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>` : ""}
    ${head}
    ${numbers}
    ${c2Spark(g)}
    <div class="c2-dots" aria-label="${g.okN} partie${g.okN > 1 ? "s" : ""} réussie${g.okN > 1 ? "s" : ""} sur les ${g.last5.length} dernières">${g.last5.map(s => `<a href="${c2Href("partie", s.id)}" class="c2-dot ${s.ok ? "ok" : ""}" title="${esc(c2Name(s.champion))} : ${esc(M.say(s.v))}"></a>`).join("")}<span class="fine">${g.okN} partie${g.okN > 1 ? "s" : ""} réussie${g.okN > 1 ? "s" : ""} sur les ${g.last5.length} dernières${g.streak >= 2 ? ` · ${g.streak} d'affilée` : ""}</span></div>
    ${after}
    ${g.reached ? "" : `<details class="more" open><summary>Ce qu'il faut faire</summary>${c2LessonsHtml(t.metric, role)}</details>`}
    ${st.done.length ? `<p class="fine">Déjà atteint : ${st.done.map(m => esc(P(m).goal.toLowerCase())).join(", ")}.</p>` : ""}
  </section>`;
}
// Anneau : parties réussies sur les 5 dernières (4 sur 5 = objectif atteint)
function c2Ring(n, total, cls = "") {
  return `<div class="c2-ring ${cls}" role="img" aria-label="${n} partie${n > 1 ? "s" : ""} réussie${n > 1 ? "s" : ""} sur ${total}" style="--p:${(n / total).toFixed(2)}">
    <svg viewBox="0 0 36 36" aria-hidden="true"><circle class="bg" cx="18" cy="18" r="15.9"/><circle class="v" cx="18" cy="18" r="15.9" pathLength="100"/></svg>
    <b>${n}<small>/${total}</small></b></div>`;
}
function c2MarkSeen(id) {
  if (!Array.isArray(C2.seen)) C2.seen = [];
  if (!C2.seen.includes(id)) C2.seen = [...C2.seen, id].slice(-120);
}
// Choix du rôle quand le joueur en joue plusieurs (au moins 3 parties dans le rôle)
function c2Roles(p) {
  const roles = Object.keys(p.byRole || {});
  if (roles.length < 2) return "";
  const cur = c2Role(p);
  return `<div class="filters">${seg("c2-role", roles.map(r => [r, C2_ROLE[r] || r, p.byRole[r].games]), cur, "Rôle suivi", "small")}</div>`;
}
// Dernière partie pas encore relue : le coach la propose en premier
function c2Ready(p) {
  const g = p.games[0];
  if (!g || !Array.isArray(C2.seen) || C2.seen.includes(g.id) || Date.now() - g.at > 3 * 864e5) return "";
  return `<a class="c2-ready" href="${c2Href("partie", g.id)}">${c2Img(g.champion)}<span><b>Ta dernière partie est prête</b><span class="fine">${g.win ? "Victoire" : "Défaite"} avec ${esc(c2Name(g.champion))} · ${c2Ago(g.at)} · voir le bilan</span></span>${icon("chevron")}</a>`;
}

function c2Games(p) {
  if (!p.games.length) return empty("Aucune partie classée récente", "Le bilan porte sur les parties classées, ou à défaut normales (hors ARAM).");
  return `<ul class="c2-games">${p.games.map(g => `<li><a class="c2-game ${g.win ? "win" : "loss"}" href="${c2Href("partie", g.id)}">
      ${c2Img(g.champion)}<span class="c2-g-main"><b>${esc(c2Name(g.champion))}${Array.isArray(C2.seen) && !C2.seen.includes(g.id) ? ` <span class="chip live">Nouveau</span>` : ""}</b><span class="fine">${esc(C2_ROLE[g.role] || "")}${g.opponent ? ` · contre ${esc(c2Name(g.opponent))}` : ""} · ${c2Ago(g.at)}</span></span>
      <span class="c2-g-kda"><b>${g.k}/${g.d}/${g.a}</b><span class="fine">${g.cs} sbires · ${Math.round(g.minutes)} min</span></span>
      <span class="c2-g-res">${g.win ? "V" : "D"}</span></a></li>`).join("")}</ul>`;
}

// ---------- Partie en cours : face-à-face immédiat, objectif rappelé
function c2Live(p) {
  const l = c2ui.live;
  if (!l?.inGame) return `<div class="c2-livebar"><span class="fine">${c2ui.liveBusy ? "Recherche d'une partie en cours…" : l?.otherMode ? `Partie en cours en ${esc(l.otherMode)} : le coach ne suit que les parties 5 contre 5 sur la Faille.` : l ? "Aucune partie en cours." : ""}</span><button class="btn ghost sm" data-action="c2-live">${icon("play")}Je suis en partie</button></div>`;
  const mins = Math.max(0, Math.floor((l.length + (Date.now() - c2ui.liveAt) / 1000) / 60));
  const me = l.me, op = l.opponent;
  const opName = op ? c2Name(op.champion) : null;
  const tips = opName ? c2TipsFor(opName).against.slice(0, 3) : [];
  const g = p.goal && p.mainRole === me.role ? p.goal : null;
  const ORDER = ["top", "jungle", "mid", "bottom", "support"];
  const team = (list, side) => `<div class="c2-team ${side}">${[...list].sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role)).map(x => `<span class="c2-tm ${x.champion === me.champion && side === "ally" ? "me" : ""}">${c2Img(x.champion)}<i>${esc(C2_ROLE[x.role] || "")}${x.sure ? "" : "?"}</i></span>`).join("")}</div>`;
  return `<section class="c2-card c2-live">
    <p class="label"><span class="live-dot"></span>Partie en cours · ${esc(l.queue)} · ${mins} min</p>
    <div class="c2-duel">${c2Img(me.champion, "c2-av xl")}<span class="c2-vs-sep">VS</span>${op ? c2Img(op.champion, "c2-av xl") : c2Img(null, "c2-av xl")}</div>
    <p class="c2-live-title">${esc(c2Name(me.champion))} ${esc(C2_ROLE[me.role] || "")}${op ? ` contre ${esc(opName)}` : ""}</p>
    ${!me.sure || (op && !op.sure) ? `<p class="fine">Rôles estimés : Riot ne les donne pas pendant la partie.</p>` : ""}
    ${g ? `<div class="c2-remind"><p class="label">Ton objectif</p><p><b>${esc(g.label)}</b> : ${g.better === "high" ? "au moins" : "au plus"} ${c2n(g.target)}${esc(g.unit)}</p></div>` : ""}
    ${tips.length ? `<div><p class="label">Contre ${esc(opName)}</p><ul class="c2-tiplist">${tips.map(c2Tip).join("")}</ul></div>` : ""}
    ${team(l.allies, "ally")}${team(l.enemies, "enemy")}
    ${c2LiveBuild(l.build, me.champion)}
    <a class="btn primary" href="${c2Href("draft")}" data-action="c2-draft-live">Analyser les compositions</a>
    ${op ? `<a class="btn ghost" href="${c2Href("face")}" data-action="c2-face-live" data-me="${esc(c2Name(me.champion))}" data-vs="${esc(opName)}">Face-à-face complet</a>` : ""}
  </section>`;
}

// ---------- Build pour la partie en cours : build habituel, puis ce qui change face à cette équipe adverse
function c2LiveBuild(b, champ) {
  if (!b?.core && !b?.threats?.length) return "";
  const V = b.ddVersion || COACH.ddragonVersion;
  const img = (id, label) => `<img src="https://ddragon.leagueoflegends.com/cdn/${esc(V)}/img/item/${esc(id)}.png" alt="" title="${esc(label)}" loading="lazy">`;
  const core = b.core ? `<div class="c2-brow"><span class="label">Build des Diamant+ sur ${esc(c2Name(champ))}</span>
      <div class="c2-icons">${[...b.core.items, ...b.core.boots].map(x => `<span class="c2-ic">${img(x.id, x.name)}<i>${x.share} %</i></span>`).join("")}</div>
      <p class="fine">${[...b.core.items, ...b.core.boots].map(x => esc(x.name)).join(" · ")}${b.core.keystone ? ` · rune ${esc(b.core.keystone.name)}` : ""}</p>
      <p class="fine">Pourcentage : part des parties Diamant+ où l'item est dans l'inventaire en fin de partie.</p></div>` : "";
  const threats = b.threats.map(t => {
    const list = t.measured?.items.length ? t.measured.items.map(x => `<li>${img(x.id, x.name)}<span><b>${esc(x.name)}</b><small>chez les Diamant+ : dans ${x.on} % des parties face à ce type d'équipe, contre ${x.off} % face aux autres</small></span></li>`).join("")
      : t.options.map(x => `<li>${img(x.id, x.name)}<span><b>${esc(x.name)}</b><small>option déjà jouée sur ${esc(c2Name(champ))} (${x.share} % des parties)</small></span></li>`).join("");
    return `<div class="c2-threat"><p><b>${esc(t.label)}</b> : ${esc(t.why)}${t.champions.length ? ` (${t.champions.map(c => esc(c2Name(c))).join(", ")})` : ""}.</p>
      ${list ? `<ul class="c2-swap">${list}</ul>` : `<p class="fine">Pas d'item de rechange repéré sur ${esc(c2Name(champ))} face à cette menace : garde ce build.</p>`}</div>`;
  }).join("");
  return `<div class="c2-livebuild"><p class="label">Ton build pour cette partie</p>${core}
    ${b.threats.length ? `<p class="label">À adapter face à cette équipe${b.shape ? ` · en moyenne ${b.shape.magic} % de dégâts magiques, ${b.shape.phys} % physiques (le reste : dégâts bruts, qui ignorent armure et résistance magique)` : ""}</p>${threats}` : `<p class="fine">Composition adverse sans menace marquée : garde ce build.</p>`}
    <p class="fine">Mesuré sur ${c2n(b.games)} parties Diamant+ de ce champion${b.core ? `, patch ${esc(b.core.patch)}` : ""}. « Dans X % face à ce type d'équipe » : comparé aux parties sans cette menace, et l'item y répond d'après sa description officielle. « Option déjà jouée » : item qui répond à la menace d'après sa description, sans mesure face à elle.</p></div>`;
}

// ---------- Ce que jouent les Diamant+ (items, runes, sorts), d'après de vraies parties
function c2Builds(id) {
  if (C2_API == null) return "";
  const s = c2ui.champ[id];
  if (!s) return s === null ? `<div class="c2-card c2-loading">Données Diamant+…</div>` : "";
  if (s.error) return "";
  if (!s.enough) return `<p class="note">${icon("info")}<span>Pas encore assez de parties Diamant+ pour ce champion au patch ${esc(s.patch || "—")} (${s.games} sur ${s.minGames} nécessaires). L'échantillon grandit chaque jour.</span></p>`;
  const V = s.items[0]?.ddVersion || s.spells[0]?.ddVersion || COACH.ddragonVersion;
  const ic = (kind, file, label, share) => `<span class="c2-ic" title="${esc(label)} : ${share} % des parties"><img src="https://ddragon.leagueoflegends.com/cdn/${kind === "rune" ? "img" : `${esc(V)}/img/${kind}`}/${esc(file)}" alt="" loading="lazy"><i>${share} %</i></span>`;
  return `<section class="c2-card c2-builds">
    <p class="label">Ce que jouent les Diamant+ · patch ${esc(s.patch)}</p>
    <p class="fine">${s.games} parties · ${s.games >= 100 ? `${c2n(s.winrate)} % de victoires (± ${c2n(s.margin)} points)` : "taux de victoire non significatif sous 100 parties"}${s.roles.length ? ` · ${s.roles.map(r => `${esc(C2_ROLE[r.role] || r.role)} ${r.share} %`).join(", ")}` : ""}</p>
    <div class="c2-brow"><span class="label">Rune clé</span><div class="c2-icons">${s.keystones.map(k => ic("rune", k.icon, k.name, k.share)).join("")}</div><p class="fine">${s.keystones.map(k => esc(k.name)).join(" · ")}</p></div>
    <div class="c2-brow"><span class="label">Items</span><div class="c2-icons">${s.items.map(x => ic("item", `${x.id}.png`, x.name, x.share)).join("")}${s.boots.map(x => ic("item", `${x.id}.png`, x.name, x.share)).join("")}</div><p class="fine">${[...s.items, ...s.boots].map(x => esc(x.name)).join(" · ")}</p></div>
    <div class="c2-brow"><span class="label">Sorts</span><div class="c2-icons">${s.spells.slice(0, 2).map(x => `<span class="c2-pair">${x.ids.map((sid, i) => `<img src="https://ddragon.leagueoflegends.com/cdn/${esc(V)}/img/spell/${esc(sid)}.png" alt="${esc(x.names[i])}" title="${esc(x.names[i])}" loading="lazy">`).join("")}<i>${x.share} %</i></span>`).join("")}</div></div>
    <p class="fine">${s.trees.map(t => `${esc(t.name)} ${t.share} %`).join(" · ")}</p>
    <p class="fine">Part des parties où l'item est dans l'inventaire en fin de partie, sur de vraies parties classées Diamant+ (EUW).</p>
  </section>`;
}

// ---------- Bilan d'une partie
function c2Game(id) {
  if (!C2.account) return empty("Compte non connecté", "", `<a class="btn" href="${c2Href()}">Connecter mon compte</a>`);
  const r = C2.reviews[id]?.tactics ? C2.reviews[id] : null;
  // Bilan déjà lu avant le replay (sans les kills) : relu une fois en arrière-plan
  if (r && !r.tactics.kills && C2_API != null && !(c2ui.refreshed ||= new Set()).has(id)) { c2ui.refreshed.add(id); setTimeout(() => c2LoadReview(id), 0); }
  if (!r && !C2.account.puuid) { setTimeout(() => c2LoadProfile(), 0); return `<div class="c2-card c2-loading">Lecture de la partie…</div>`; }
  if (!r) {
    if (C2_API != null && !c2ui.error) setTimeout(() => c2LoadReview(id), 0);
    return c2ui.error ? `<p class="note warn">${icon("alert")}<span>${esc(c2ui.error)}</span></p>` : `<div class="c2-card c2-loading">Lecture de la partie…</div>`;
  }
  const s = r.summary;
  const view = c2ui.gviewFor === id && ["resume", "carte", "details"].includes(c2ui.gview) ? c2ui.gview : "resume";
  if (!C2.seen?.includes(id)) { c2MarkSeen(id); c2Save(); }
  const vsName = r.lane.duo ? "le duo adverse" : esc(c2Name(r.lane.opponent));
  // Barre d'écart : centrée sur 0, vers la droite quand tu es devant (échelle propre à chaque mesure)
  const bar = (what, at, v, scale) => `<div class="c2-lb ${v > 0 ? "up" : v < 0 ? "down" : ""}"><span class="c2-lb-l">${what} à ${at} min</span><span class="c2-lb-t" aria-hidden="true"><i style="--w:${Math.min(50, (Math.abs(v) / scale) * 50).toFixed(1)}%"></i></span><span class="c2-k">${v > 0 ? "+" : ""}${c2n(v)}</span></div>`;
  return `<section class="c2-card c2-match ${s.win ? "win" : "loss"}">
      <div class="c2-prow">${c2Img(s.champion, "c2-av lg")}<div><p class="c2-name">${esc(c2Name(s.champion))}${s.opponent ? ` <span class="muted">contre</span> ${esc(c2Name(s.opponent))}` : ""}</p><p class="fine">${esc(C2_ROLE[s.role] || "")} · ${Math.round(s.minutes)} min · patch ${esc(s.patch)}</p></div><span class="c2-res ${s.win ? "win" : "loss"}">${s.win ? "Victoire" : "Défaite"}</span></div>
      <div class="c2-stats"><div><span class="label">KDA</span><b class="c2-k">${s.k}/${s.d}/${s.a}</b></div><div><span class="label">Sbires</span><b class="c2-k">${s.cs}</b></div><div><span class="label">Par min</span><b>${String(Math.round((s.cs / Math.max(1, s.minutes)) * 10) / 10).replace(".", ",")}</b></div></div>
      ${r.lane.at10 ? `<div class="c2-lanebars"><p class="label">Phase de lane · écart avec ${esc(vsName)}</p>${bar("Golds", 10, r.lane.at10.gold, 1000)}${r.lane.at10.cs != null ? bar("Sbires", 10, r.lane.at10.cs, 20) : ""}${r.lane.at15 ? bar("Golds", 15, r.lane.at15.gold, 2000) : ""}${r.lane.at15 ? bar("XP", 15, r.lane.at15.xp, 1500) : ""}</div>` : ""}
    </section>
    <div class="filters">${seg("c2-gview", [["resume", "L'essentiel"], ["carte", "Replay"], ["details", "Chiffres"]], view, "Vue")}</div>
    ${view === "carte" ? c2Tactics(r, id) : view === "details" ? `${c2Timeline(r)}
      ${r.comparisons.length ? `<section class="sec"><div class="sec-head"><h2 class="sec-title">Toi face aux bons joueurs</h2></div><div class="c2-card">${r.comparisons.map(c2Bar).join("")}<p class="fine">Le point, c'est toi sur cette partie. La zone claire montre où se situe la moitié des joueurs Diamant et plus à ton poste, et le trait leur niveau habituel. Vert : mieux qu'eux ; rouge : en dessous.</p></div></section>` : ""}
      ${c2BuildCmp(r)}
      ${c2GameDraft(r, id)}` : `${c2Brief(r, id)}
      <section class="sec"><div class="sec-head"><h2 class="sec-title">Ce qui a pesé</h2></div>
        ${r.findings.length ? r.findings.map((f, i) => `<article class="c2-card c2-finding"><p class="label">Constat ${i + 1}</p><h3 class="c2-f-title">${esc(f.title)}</h3>${bullets(f.facts)}
          ${f.metric || C2_KIND_TIP[f.kind] ? `<details class="more"><summary>Ce qu'il faut faire</summary>${C2_KIND_TIP[f.kind] || !f.metric ? `<p>${esc(c2TipOf(f))}</p>` : ""}${f.metric ? c2LessonsHtml(f.metric, s.role, s.champion, !C2_KIND_TIP[f.kind]) : ""}</details>` : ""}</article>`).join("") : `<p class="inline-empty">Aucun écart net avec la référence Diamant+ sur cette partie.</p>`}
      </section>
      ${r.tactics?.lessons?.length ? `<button class="c2-ready" data-action="c2-gview" data-id="carte">${icon("compass")}<span><b>${r.tactics.lessons.length} moment${r.tactics.lessons.length > 1 ? "s" : ""} clé${r.tactics.lessons.length > 1 ? "s" : ""} à revoir en replay</b><span class="fine">La partie rejouée sur la minimap, avec ce qui aurait été mieux</span></span>${icon("chevron")}</button>` : ""}`}
    <p class="fine c2-foot">${esc(r.note)}${r.benchmark ? ` Référence : ${r.benchmark.games} parties ${esc(r.benchmark.level)}, patch ${esc(r.benchmark.patch)}.` : ""}</p>`;
}

// L'essentiel de la partie en quatre lignes : phase de lane, point clé, point fort, objectif
function c2Brief(r, id) {
  const s = r.summary, a = r.lane.at10, rows = [];
  if (a && r.lane.opponent) {
    const opp = r.lane.duo ? "le duo adverse" : esc(c2Name(r.lane.opponent)), who = r.lane.duo ? "ton duo a " : "";
    rows.push(a.gold >= 500 ? ["up", "Phase de lane", `gagnée : ${who}${c2n(a.gold)} golds d'avance sur ${opp} à 10 min`]
      : a.gold <= -500 ? ["down", "Phase de lane", `difficile : ${who}${c2n(-a.gold)} golds de retard sur ${opp} à 10 min`]
      : ["", "Phase de lane", `équilibrée face à ${opp} (${a.gold > 0 ? "+" : ""}${c2n(a.gold)} golds à 10 min)`]);
  }
  if (r.findings[0]) rows.push(["down", "À travailler", esc(r.findings[0].title)]);
  if (r.strengths[0]) rows.push(["up", "Point fort", esc(r.strengths[0])]);
  if (s.deadSeconds != null && s.deadSeconds / (r.duration || 1) >= 0.1) rows.push(["down", "Temps passé mort", `${Math.round(s.deadSeconds / 60)} min, soit ${Math.round((s.deadSeconds / r.duration) * 100)} % de la partie`]);
  // Objectif du joueur dans ce rôle : réussi ou non sur cette partie
  const g = C2.profile && s.role ? c2GoalState(C2.profile, s.role) : null;
  const v = g?.t ? s.metrics?.[g.t.metric] : null;
  if (v != null) {
    const ok = g.t.better === "high" ? v >= g.target : v <= g.target;
    rows.push([ok ? "up" : "down", "Ton objectif", `${esc((C2_PLAIN[g.t.metric]?.goal || g.t.label))} : ${ok ? "réussi" : "pas encore"} (${esc(C2_PLAIN[g.t.metric] ? C2_PLAIN[g.t.metric].say(v) : c2n(v))}, cible ${esc(C2_PLAIN[g.t.metric] ? C2_PLAIN[g.t.metric].say(g.target) : c2n(g.target))})`]);
  }
  if (!rows.length) return "";
  return `<section class="c2-card c2-brief"><p class="label">En bref</p><ul>${rows.map(([k, t, x]) => `<li class="${k}"><b>${t}</b><span>${x}</span></li>`).join("")}</ul></section>`;
}
// Build du joueur face aux Diamant+ sur le même champion : des faits (parts), pas un jugement
function c2BuildCmp(r) {
  const b = r.build;
  if (!b || (!b.items.length && !b.keystone)) return "";
  const V = b.ddVersion || COACH.ddragonVersion;
  const it = x => `<span class="c2-ic ${x.share < 5 ? "rare" : ""}" title="${esc(x.name)} : ${x.share} % des parties Diamant+"><img src="https://ddragon.leagueoflegends.com/cdn/${esc(V)}/img/item/${esc(x.id)}.png" alt="" loading="lazy"><i>${x.share} %</i></span>`;
  const rare = b.items.filter(x => x.share < 5);
  const k = b.keystone;
  return `<section class="sec"><div class="sec-head"><h2 class="sec-title">Ton build face aux Diamant+</h2></div><div class="c2-card c2-buildcmp">
    ${k ? `<div class="c2-brow"><span class="label">Rune clé</span><p class="c2-kline"><img src="https://ddragon.leagueoflegends.com/cdn/img/${esc(k.icon || "")}" alt="" loading="lazy"><span><b>${esc(k.name)}</b> : ${k.share} % des Diamant+${k.top ? `. La plus jouée : ${esc(k.top.name)} (${k.top.share} %)` : ", c'est la plus jouée"}</span></p></div>` : ""}
    ${b.items.length ? `<div class="c2-brow"><span class="label">Tes items terminés</span><div class="c2-icons">${b.items.map(it).join("")}</div><p class="fine">${b.items.map(x => esc(x.name)).join(" · ")}</p></div>` : ""}
    ${b.missing.length ? `<div class="c2-brow"><span class="label">Très joués par les Diamant+, absents chez toi</span><div class="c2-icons">${b.missing.map(it).join("")}</div><p class="fine">${b.missing.map(x => esc(x.name)).join(" · ")}</p></div>` : ""}
    ${rare.length ? `<p class="fine">${rare.map(x => esc(x.name)).join(", ")} : rare chez les Diamant+ sur ${esc(c2Name(r.summary.champion))}. Ça peut être un bon choix selon la partie ; compare avec la fiche du champion.</p>` : ""}
    ${r.summary.patch && b.patch && r.summary.patch !== b.patch ? `<p class="note">${icon("info")}<span>Ta partie date du patch ${esc(r.summary.patch)}, la référence du patch ${esc(b.patch)} : les items ont pu changer entre-temps.</span></p>` : ""}
    <p class="fine">Part des parties Diamant+ (${b.games} parties, patch ${esc(b.patch)}) où l'item est dans l'inventaire final. <a href="${c2Href("champions", r.summary.champion)}">Voir la fiche ${esc(c2Name(r.summary.champion))}</a></p>
  </div></section>`;
}

// ---------- Relecture tactique : la partie en replay sur la minimap, frise cliquable, arrêts aux moments clés (données Riot, sans IA)
// Riot donne une position par minute : entre deux relevés, les champions glissent en ligne droite (trajet approximatif, dit au joueur).
const C2_MAP = 14870;
const c2Pct = v => ((v / C2_MAP) * 100).toFixed(2);
const c2Clock = t => `${Math.floor(t / 60000)}:${String(Math.floor(t / 1000) % 60).padStart(2, "0")}`;
const C2_SVG = {
  pause: `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>`,
  prev: `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M18 6l-8 6 8 6z"/></svg>`,
  next: `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M6 6l8 6-8 6z"/></svg>`,
};
// Durée de la partie (ms) et instant affiché
const c2Dur = T => (T.map.length - 1) * 60000;
const c2TimeOf = (T, id) => Math.max(0, Math.min(c2Dur(T), c2ui.tt?.[id] ?? Math.min(10, T.map.length - 1) * 60000));
// Position d'un joueur à l'instant t : interpolée entre les deux relevés de minute
function c2PosAt(T, i, t) {
  const last = T.map.length - 1, m = t / 60000, a = Math.min(last, Math.floor(m)), b = Math.min(last, a + 1), f = m - a;
  const A = T.map[a]?.[i], B = T.map[b]?.[i];
  if (!A || !B || a === b) return A || B || null;
  return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, f < 0.5 ? A[2] : B[2]];
}
// Mort à l'instant t : d'après les kills exacts quand ils sont là, sinon d'après les points de vie du relevé
function c2DeadAt(T, i, t, q) {
  if (T.kills) return T.kills.some(k => k.v === i && t >= k.t && t - k.t < (k.t < 15 * 60000 ? 30000 : 50000));
  return q?.[2] === 0;
}
// Moments de la partie : erreurs relevées, tes morts, objectifs, combats
function c2Moments(T) {
  const L = [];
  T.lessons.forEach((l, n) => L.push({ t: l.t, type: "lesson", key: true, n, title: l.title, text: l.better, facts: l.facts, at: l.at }));
  for (const d of T.deaths || []) L.push({ t: d.t, type: "death", key: true, mine: true, x: d.x, y: d.y, text: `Tu meurs (${d.zone}) : tué par ${c2Name(d.killer)}${d.attackers?.length > 1 ? `, ${d.attackers.length} adversaires sur toi` : ""}${d.alliesNear?.length ? "" : ", aucun allié autour"}` });
  for (const o of T.objectives) L.push({ t: o.t, type: "obj", key: true, good: o.ours, x: o.x, y: o.y, letter: (o.kind || "?")[0], text: `${o.kind} ${o.ours ? "pris" : "perdu"} : ${o.allies} contre ${o.enemies} autour${o.myDist > 6000 ? ", tu étais loin" : ""}` });
  for (const f of T.fights) L.push({ t: f.t, type: "fight", mine: f.me, good: f.won, x: f.x, y: f.y, text: `Combat ${f.zone} : ${f.allies} contre ${f.enemies}${f.won === true ? ", gagné" : f.won === false ? ", perdu" : ""}${f.me ? " (avec toi)" : ""}` });
  return L.sort((a, b) => a.t - b.t);
}
const C2_TF = [["all", "Tout"], ["me", "Mes moments"], ["fight", "Combats"], ["obj", "Objectifs"]];
const c2Keep = (m, f) => f === "all" || (f === "me" ? m.mine || m.type === "lesson" : m.type === f);
// Contenu de la carte qui change avec le temps : pions, trajet suivi, marqueurs d'événements, horloge
function c2MapState(T, id, t) {
  const sel = c2ui.tsel?.[id] ?? T.players.findIndex(p => p.me);
  const dots = T.players.map((p, i) => {
    const q = c2PosAt(T, i, t);
    return { i, q, dead: q && c2DeadAt(T, i, t, q), sel: i === sel };
  });
  // Trajet des 2 dernières minutes du joueur suivi (un point toutes les 10 s)
  const pts = [];
  for (let s = Math.max(0, t - 120000); s <= t; s += 10000) { const q = c2PosAt(T, sel, s); if (q) pts.push(`${c2Pct(q[0])},${(100 - c2Pct(q[1])).toFixed(2)}`); }
  const q = c2PosAt(T, sel, t); if (q) pts.push(`${c2Pct(q[0])},${(100 - c2Pct(q[1])).toFixed(2)}`);
  const f = c2ui.tf?.[id] || "all";
  const marks = c2Moments(T).filter(m => m.x != null && c2Keep(m, f) && t >= m.t - 10000 && t - m.t < 25000);
  return { sel, dots, trail: pts.join(" "), marks };
}
function c2MarkHtml(m) {
  const cls = `c2-mev ${m.type}${m.good === true ? " won" : m.good === false ? " lost" : ""}`;
  const inner = m.type === "obj" ? esc(m.letter) : m.type === "death" ? "✕" : "";
  return `<span class="${cls}" style="left:${c2Pct(m.x)}%;bottom:${c2Pct(m.y)}%" title="${esc(c2Clock(m.t))} · ${esc(m.text)}">${inner}</span>`;
}
// Panneau « en ce moment » : l'erreur relevée à cet instant (avec ce qui aurait été mieux), sinon ce qui se passe
function c2NowHtml(T, id, t) {
  const L = c2Moments(T), f = c2ui.tf?.[id] || "all";
  const lesson = L.find(m => m.type === "lesson" && t >= m.t - 40000 && t <= m.t + 20000);
  if (lesson) return `<div class="c2-now-lesson"><p class="label">Moment clé · ${esc(lesson.at)}</p><p class="c2-now-title">${esc(lesson.title)}</p>${bullets(lesson.facts.slice(0, 2))}<p class="c2-better"><b>Ce qui aurait été mieux</b> ${esc(lesson.text)}</p></div>`;
  const near = L.filter(m => m.type !== "lesson" && c2Keep(m, f) && Math.abs(m.t - t) <= 30000);
  if (near.length) return `<ul class="c2-now-list">${near.map(m => `<li class="${m.type}${m.good === true ? " won" : m.good === false ? " lost" : ""}"><b>${c2Clock(m.t)}</b> ${esc(m.text)}</li>`).join("")}</ul>`;
  return `<p class="fine">Rien de marquant à cet instant. Lance la lecture ou saute au moment clé suivant.</p>`;
}
function c2Replay(T, id) {
  const t = c2TimeOf(T, id), dur = c2Dur(T), S = c2MapState(T, id, t), f = c2ui.tf?.[id] || "all", ID = esc(id);
  const speed = c2ui.tspeed || 1, playing = c2ui.tplay?.id === id;
  const selP = T.players[S.sel];
  // Frise : écart d'or entre les équipes (au-dessus : ton équipe devant), et les moments cliquables
  const g = T.goldDiff || [], max = Math.max(1000, ...g.map(Math.abs));
  const gx = i => ((i / Math.max(1, g.length - 1)) * 100).toFixed(2), gy = v => (20 - (v / max) * 18).toFixed(2);
  const area = g.length > 1 ? `M0,20 ${g.map((v, i) => `L${gx(i)},${gy(v)}`).join(" ")} L100,20 Z` : "";
  const marks = c2Moments(T).filter(m => c2Keep(m, f) && (m.key || f !== "all"));
  return `<div class="c2-card c2-replay" id="c2-rp-${ID}">
    <div class="c2-map" id="c2-map-${ID}" style="background-image:url(https://ddragon.leagueoflegends.com/cdn/${esc(COACH?.ddragonVersion || "16.21.1")}/img/map/map11.png)">
      <svg class="c2-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${S.trail}" vector-effect="non-scaling-stroke"/></svg>
      ${T.players.map((p, i) => { const d = S.dots[i]; return `<button class="c2-mp ${p.team}${p.me ? " me" : ""}${d.dead ? " dead" : ""}${d.sel ? " sel" : ""}" data-action="c2-tsel" data-id="${ID}" data-i="${i}"${d.q ? ` style="left:${c2Pct(d.q[0])}%;bottom:${c2Pct(d.q[1])}%"` : " hidden"} aria-label="Suivre le trajet de ${esc(c2Name(p.champion))}${p.me ? " (toi)" : p.team === "enemy" ? " (adversaire)" : " (allié)"}">${c2Img(p.champion, "c2-av")}</button>`; }).join("")}
      <div class="c2-mlayer">${S.marks.map(c2MarkHtml).join("")}</div>
      <span class="c2-mclock">${c2Clock(t)}</span>
    </div>
    <p class="fine c2-follow">Trajet suivi : <b>${esc(c2Name(selP.champion))}</b>${selP.me ? " (toi)" : ""}, 2 dernières minutes. Touche un champion pour suivre le sien.</p>
    <div class="c2-tl">
      <svg class="c2-tl-gold" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="c2-gg-${ID}" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="var(--ok)" stop-opacity=".45"/><stop offset=".5" stop-color="var(--ok)" stop-opacity=".12"/><stop offset=".5" stop-color="var(--bad)" stop-opacity=".12"/><stop offset="1" stop-color="var(--bad)" stop-opacity=".45"/></linearGradient></defs>
        <line x1="0" y1="20" x2="100" y2="20" class="zero" vector-effect="non-scaling-stroke"/>
        ${area ? `<path d="${area}" fill="url(#c2-gg-${ID})"/>` : ""}
      </svg>
      <input class="c2-tl-range" type="range" min="0" max="${dur}" step="1000" value="${Math.round(t)}" data-c2-tt="${ID}" aria-label="Moment de la partie" aria-valuetext="${c2Clock(t)}">
      <span class="c2-tl-head" style="left:${((t / dur) * 100).toFixed(2)}%"></span>
      ${marks.map(m => `<button class="c2-tl-m ${m.type}${m.good === true ? " won" : m.good === false ? " lost" : ""}" style="left:${((m.t / dur) * 100).toFixed(2)}%" data-action="c2-tgo" data-id="${ID}" data-t="${m.t}" aria-label="${esc(c2Clock(m.t))} : ${esc(m.title || m.text)}" title="${esc(c2Clock(m.t))} · ${esc(m.title || m.text)}"></button>`).join("")}
    </div>
    <div class="c2-tl-axis fine"><span>0:00</span><span class="up">ton équipe devant ▲</span><span class="down">▼ derrière</span><span>${c2Clock(dur)}</span></div>
    <div class="c2-mctl">
      <button class="btn ghost sm icon-only" data-action="c2-tstep" data-id="${ID}" data-d="-1" aria-label="Moment clé précédent">${C2_SVG.prev}</button>
      <button class="btn primary sm c2-tplay" data-action="c2-tplay" data-id="${ID}">${playing ? `${C2_SVG.pause}Pause` : `${icon("play")}Lire`}</button>
      <button class="btn ghost sm icon-only" data-action="c2-tstep" data-id="${ID}" data-d="1" aria-label="Moment clé suivant">${C2_SVG.next}</button>
      <button class="btn ghost sm c2-tspeed" data-action="c2-tspeed" aria-label="Vitesse de lecture">×${speed}</button>
    </div>
    <div class="seg small" role="group" aria-label="Moments affichés">${C2_TF.map(([k, l]) => `<button class="seg-btn" data-action="c2-tf" data-id="${ID}" data-f="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
    <div class="c2-now" aria-live="polite">${c2NowHtml(T, id, t)}</div>
    <p class="c2-legend fine"><span><i class="lg base"></i>ton équipe</span><span><i class="lg theirs"></i>adversaires</span><span><i class="lg lessonm"></i>erreur relevée</span><span><i class="lg deathm"></i>ta mort</span><span><i class="lg objd"></i>objectif</span><span><i class="lg fight"></i>combat</span></p>
  </div>`;
}
// Met la carte à l'instant t sans tout redessiner (la lecture tourne à 60 images par seconde)
function c2RpAt(id, t) {
  const T = C2.reviews[id]?.tactics, el = document.getElementById(`c2-map-${id}`);
  if (!T || !el) return false;
  t = Math.max(0, Math.min(c2Dur(T), t));
  (c2ui.tt ||= {})[id] = t;
  const S = c2MapState(T, id, t);
  for (const b of el.querySelectorAll(".c2-mp")) {
    const d = S.dots[Number(b.dataset.i)];
    b.hidden = !d.q;
    if (!d.q) continue;
    b.style.left = `${c2Pct(d.q[0])}%`; b.style.bottom = `${c2Pct(d.q[1])}%`;
    b.classList.toggle("dead", !!d.dead); b.classList.toggle("sel", d.sel);
  }
  el.querySelector(".c2-trail polyline")?.setAttribute("points", S.trail);
  const layer = el.querySelector(".c2-mlayer"), mk = S.marks.map(m => m.t + m.type).join();
  if (layer && layer.dataset.k !== mk) { layer.dataset.k = mk; layer.innerHTML = S.marks.map(c2MarkHtml).join(""); }
  el.querySelector(".c2-mclock").textContent = c2Clock(t);
  const rp = document.getElementById(`c2-rp-${id}`);
  const r = rp?.querySelector(".c2-tl-range");
  if (r && document.activeElement !== r) r.value = Math.round(t);
  r?.setAttribute("aria-valuetext", c2Clock(t));
  const head = rp?.querySelector(".c2-tl-head");
  if (head) head.style.left = `${((t / c2Dur(T)) * 100).toFixed(2)}%`;
  const now = rp?.querySelector(".c2-now"), html = c2NowHtml(T, id, t);
  if (now && now.dataset.h !== html) { now.dataset.h = html; now.innerHTML = html; }
  return true;
}
// Lecture : 1 seconde = 1 minute de jeu (×1), pause automatique sur tes morts et les erreurs relevées
function c2PlayBtn(id, on) {
  const b = document.querySelector(`#c2-rp-${CSS.escape(id)} .c2-tplay`);
  if (b) b.innerHTML = on ? `${C2_SVG.pause}Pause` : `${icon("play")}Lire`;
}
function c2Stop() { if (c2ui.tplay) { cancelAnimationFrame(c2ui.tplay.raf); const id = c2ui.tplay.id; c2ui.tplay = null; c2PlayBtn(id, false); } }
function c2Play(id) {
  const T = C2.reviews[id]?.tactics;
  if (!T) return;
  c2Stop();
  let t = c2TimeOf(T, id);
  if (t >= c2Dur(T) - 1000) t = 0;
  const stops = c2Moments(T).filter(m => m.type === "lesson" || m.type === "death").map(m => m.t);
  const P = c2ui.tplay = { id, last: performance.now(), raf: 0 };
  c2PlayBtn(id, true);
  const step = now => {
    if (c2ui.tplay !== P) return;
    const nt = t + (now - P.last) * 60 * (c2ui.tspeed || 1);
    P.last = now;
    const stop = stops.find(s => s > t + 1 && s <= nt);
    t = stop ?? nt;
    if (!c2RpAt(id, t)) { c2ui.tplay = null; return; }
    if (stop != null || t >= c2Dur(T)) { c2Stop(); return; }
    P.raf = requestAnimationFrame(step);
  };
  P.raf = requestAnimationFrame(step);
}
// Saut vers un instant : les champions glissent jusqu'à la nouvelle position (0,45 s)
function c2Seek(id, to) {
  const T = C2.reviews[id]?.tactics;
  if (!T) return;
  c2Stop();
  const from = c2TimeOf(T, id), t0 = performance.now();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(to - from) < 2000) { c2RpAt(id, to); return; }
  const P = c2ui.tseek = {};
  const step = now => {
    if (c2ui.tseek !== P) return;
    const p = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - p, 3);
    c2RpAt(id, from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
document.addEventListener("input", e => { const id = e.target.dataset?.c2Tt; if (id) { c2Stop(); c2ui.tseek = null; c2RpAt(id, Number(e.target.value)); } });
document.addEventListener("click", e => {
  const a = e.target.closest("[data-action]");
  if (!a) return;
  const id = a.dataset.id, T = id && C2.reviews[id]?.tactics;
  if (a.dataset.action === "c2-tgo" && T) {
    // Un moment s'affiche un peu avant : on voit la mise en place
    const t = a.dataset.t != null ? Math.max(0, Number(a.dataset.t) - 8000) : Number(a.dataset.m) * 60000;
    document.getElementById(`c2-rp-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    c2Seek(id, t);
  }
  if (a.dataset.action === "c2-tplay") { if (c2ui.tplay?.id === id) c2Stop(); else c2Play(id); }
  if (a.dataset.action === "c2-tstep" && T) {
    const cur = c2TimeOf(T, id), d = Number(a.dataset.d);
    const keys = c2Moments(T).filter(m => m.key && c2Keep(m, c2ui.tf?.[id] || "all")).map(m => Math.max(0, m.t - 8000));
    const to = d > 0 ? keys.find(k => k > cur + 1000) : [...keys].reverse().find(k => k < cur - 1000);
    if (to != null) c2Seek(id, to);
  }
  if (a.dataset.action === "c2-tspeed") { c2ui.tspeed = { 1: 2, 2: 4, 4: 1 }[c2ui.tspeed || 1]; a.textContent = `×${c2ui.tspeed}`; }
  if (a.dataset.action === "c2-tsel" && T) { (c2ui.tsel ||= {})[id] = Number(a.dataset.i); c2RpAt(id, c2TimeOf(T, id)); const f = a.closest(".c2-replay")?.querySelector(".c2-follow"), p = T.players[Number(a.dataset.i)]; if (f) f.innerHTML = `Trajet suivi : <b>${esc(c2Name(p.champion))}</b>${p.me ? " (toi)" : ""}, 2 dernières minutes. Touche un champion pour suivre le sien.`; }
  if (a.dataset.action === "c2-tf" && T) { (c2ui.tf ||= {})[id] = a.dataset.f; const rp = document.getElementById(`c2-rp-${id}`); if (rp) { const playing = c2ui.tplay?.id === id; rp.outerHTML = c2Replay(T, id); if (playing) c2PlayBtn(id, true); } }
});
function c2Tactics(r, id) {
  const T = r.tactics;
  if (!T?.map?.length) return "";
  const S = T.summary;
  const near = T.fights.filter(f => f.me || f.myDist < 6000);
  const chips = (list, label) => list.length ? `<div><p class="label">${label}</p><div class="c2-chiprow">${list.slice(0, 5).map(x => `<span class="c2-cchip">${c2Img(x.champion, "c2-av xs")}${esc(c2Name(x.champion))} · ${x.n}</span>`).join("")}</div></div>` : "";
  return `<section class="sec"><div class="sec-head"><h2 class="sec-title">La partie en replay</h2></div>
    <p class="fine">Lance la lecture : elle s'arrête d'elle-même sur tes morts et sur les erreurs relevées, avec ce qui aurait été mieux. Les points de la frise sont cliquables.</p>
    ${c2Replay(T, id)}
    <div class="c2-tiles">
      <div class="c2-tile"><span class="c2-k">${S.fightsWithMe}<small>/${near.length}</small></span><span class="fine">combats proches de toi auxquels tu as participé</span></div>
      <div class="c2-tile"><span class="c2-k">${S.objectivesPresent}<small>/${S.objectivesTaken + S.objectivesLost}</small></span><span class="fine">objectifs où tu étais présent</span></div>
      <div class="c2-tile ${S.deathsIsolated ? "down" : ""}"><span class="c2-k">${S.deathsIsolated}</span><span class="fine">morts seul face à plusieurs adversaires</span></div>
      <div class="c2-tile ${S.deathsGank ? "down" : ""}"><span class="c2-k">${S.deathsGank}</span><span class="fine">morts sur un gank avant 14 min</span></div>
    </div>
    ${c2Turns(T, id)}
    ${T.lessons.length ? T.lessons.map(l => `<article class="c2-card c2-finding"><p class="label">À ${esc(l.at)}</p><h3 class="c2-f-title">${esc(l.title)}</h3>${bullets(l.facts)}<p class="c2-better"><b>Ce qui aurait été mieux</b> ${esc(l.better)}</p><button class="btn ghost sm" data-action="c2-tgo" data-id="${esc(id)}" data-t="${l.t}">Revoir ce moment</button></article>`).join("")
      : `<p class="inline-empty">Aucune erreur de placement nette relevée sur cette partie (objectifs, morts, combats).</p>`}
    <details class="more c2-card"><summary>Tous les combats (${T.fights.length}) et interactions</summary>
      <ul class="c2-events">${T.fights.map(f => `<li><b>${f.at}</b> ${esc(f.zone)} · ${f.allies} contre ${f.enemies} · <span class="${f.won === true ? "up" : f.won === false ? "bad" : ""}">${f.won === true ? "gagné" : f.won === false ? "perdu" : "égal"}</span> (${f.enemiesDead} adversaire${f.enemiesDead > 1 ? "s" : ""} éliminé${f.enemiesDead > 1 ? "s" : ""}, ${f.alliesDead} allié${f.alliesDead > 1 ? "s" : ""}) · ${f.me ? "avec toi" : `sans toi (${f.myDist < 2500 ? "tu étais tout près" : f.myDist < 6000 ? "tu étais à quelques secondes" : f.myDist < 9000 ? "tu étais loin" : "tu étais à l'autre bout de la carte"})`} <button class="linkish" data-action="c2-tgo" data-id="${esc(id)}" data-t="${f.t}">revoir</button></li>`).join("")}</ul>
      ${chips(T.interactions.killedBy, "T'ont éliminé le plus")}${chips(T.interactions.killed, "Tu as éliminé le plus")}${chips(T.interactions.with, "Tes kills avec")}
    </details>
    <p class="fine">${esc(T.limits)} Entre deux relevés, le trajet affiché est une ligne droite.</p>
  </section>`;
}
// Tournants de la partie : les moments où l'écart d'or bascule (la courbe est dans la frise du replay)
function c2Turns(T, id) {
  if (!T.turns?.length) return "";
  return `<section class="c2-card"><p class="label">Les tournants de la partie</p>
    <ul class="c2-turns">${T.turns.map(tr => `<li class="${tr.gold > 0 ? "up" : "down"}"><button class="linkish" data-action="c2-tgo" data-id="${esc(id)}" data-t="${tr.t}"><b>${tr.at} → ${tr.to}</b></button> <b class="${tr.gold > 0 ? "up" : "down"}">${tr.gold > 0 ? "+" : "−"}${c2n(Math.abs(Math.round(tr.gold / 100) * 100))} golds</b> pour ton équipe${tr.what.length ? ` : ${esc(tr.what.join(" ; "))}` : ""}</li>`).join("")}</ul>
  </section>`;
}

function c2Bar(c) {
  const lo = Math.min(c.value, c.p25) * 0.85, hi = Math.max(c.value, c.p75) * 1.1 || 1;
  const x = v => Math.max(0, Math.min(100, ((v - lo) / (hi - lo || 1)) * 100));
  return `<div class="c2-bar ${c.level}"><div class="c2-bar-head"><span>${esc(C2_PLAIN[c.metric]?.name || c.label)}</span><b>${esc(C2_PLAIN[c.metric] ? C2_PLAIN[c.metric].say(c.value) : c2n(c.value))}</b></div>
    <div class="c2-bar-track"><span class="c2-bar-band" style="left:${x(c.p25)}%;width:${x(c.p75) - x(c.p25)}%"></span><span class="c2-bar-med" style="left:${x(c.p50)}%"></span><span class="c2-bar-me" style="left:${x(c.value)}%"></span></div></div>`;
}

// Ligne de temps : objectifs en haut, backs et morts du joueur en bas
function c2Timeline(r) {
  const max = r.duration * 1000;
  const x = t => `left:${((t / max) * 100).toFixed(2)}%`;
  const ticks = [];
  for (let m = 5; m * 60000 < max; m += 5) ticks.push(`<span class="tl-tick" style="${x(m * 60000)}"><i>${m}</i></span>`);
  const obj = r.objectives.map(o => `<span class="tl-m tl-obj ${o.ours ? "ours" : "theirs"}" style="${x(o.t)}" title="${esc(o.kind)} ${o.ours ? "pris" : "perdu"} à ${o.at}"></span>`).join("");
  const bases = r.bases.map(b => `<span class="tl-m tl-b ${b.afterDeath ? "shop" : ""}" style="${x(b.t)}" title="${b.afterDeath ? "Achats après une mort" : "Back"} à ${b.at} : ${esc(b.items.join(", "))}"></span>`).join("");
  const deaths = r.deaths.map(d => `<span class="tl-m tl-d" style="${x(d.t)}" title="Mort à ${d.at}, tué par ${esc(c2Name(d.killer))}${d.beforeObjective ? ` (${esc(d.beforeObjective)})` : ""}"></span>`).join("");
  return `<section class="sec"><div class="sec-head"><h2 class="sec-title">Déroulé</h2></div>
    <div class="c2-card"><div class="c2-tl" role="img" aria-label="Ligne de temps : ${r.objectives.length} objectifs, ${r.bases.length} passages en boutique, ${r.deaths.length} morts">${ticks.join("")}<div class="tl-row">${obj}</div><div class="tl-row tl-me">${bases}${deaths}</div></div>
    <p class="c2-legend fine"><span><i class="lg ours"></i>objectif pris</span><span><i class="lg theirs"></i>objectif perdu</span><span><i class="lg base"></i>back</span><span><i class="lg shop"></i>achats après une mort</span><span><i class="lg death"></i>mort</span></p>
    <details class="more"><summary>Détail : ${r.deaths.length} mort${r.deaths.length > 1 ? "s" : ""}, ${r.bases.filter(b => !b.afterDeath).length} backs</summary>
      <ul class="c2-events">${[...r.deaths.map(d => ({ t: d.t, html: `<b>${d.at}</b> Mort, tué par ${esc(c2Name(d.killer))}${d.helpers ? ` (+${d.helpers})` : ""}${d.beforeObjective ? ` · <span class="bad">${esc(d.beforeObjective)}</span>` : ""}` })),
        ...r.bases.map(b => ({ t: b.t, html: `<b>${b.at}</b> ${b.afterDeath ? "Achats après la mort" : "Back"} : ${esc(b.items.join(", "))}${!b.afterDeath && b.goldBefore != null ? ` <span class="fine">(${b.goldBefore} or en poche une minute avant)</span>` : ""}` }))].sort((a, b) => a.t - b.t).map(e => `<li>${e.html}</li>`).join("")}</ul></details></div></section>`;
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
  setTimeout(() => c2LoadChamp(id), 0);
  return `<div class="c2-duel">${c2Img(id, "c2-av xl")}</div>${c2Builds(id)}
    ${coaching.length ? `<section class="c2-card"><p class="label">Ce qu'en disent les coachs</p><ul class="c2-tiplist">${coaching.map(c2Tip).join("")}</ul></section>` : ""}
    <section class="c2-card"><p class="label">Le jouer</p>${t.play.filter(u => u.nature === "officiel").length ? `<ul class="c2-tiplist">${t.play.filter(u => u.nature === "officiel").map(c2Tip).join("")}</ul>` : `<p class="fine">Riot ne publie pas de conseils officiels pour ${esc(name)}. Des pages officielles sont en cours d'analyse.</p>`}</section>
    <section class="c2-card"><p class="label">L'affronter</p>${t.against.length ? `<ul class="c2-tiplist">${t.against.map(c2Tip).join("")}</ul>` : `<p class="fine">Pas encore de conseil vérifié.</p>`}</section>
    ${vids.length ? `<section class="sec"><div class="sec-head"><h2 class="sec-title">Vidéos</h2></div>${c2VideoList(vids)}</section>` : ""}
    <div class="sheet-actions"><a class="btn" href="${c2Href("face")}" data-action="c2-face-with" data-champ="${esc(name)}">Préparer un face-à-face</a></div>`;
}

// ---------- Statistiques Diamant+ de draft : taux de victoire toujours avec marge et nombre de parties
const C2_ORDER = ["top", "jungle", "mid", "bottom", "support"];
function c2Rate(r, short = false) {
  if (!r || !r.enough) return `<span class="c2-rate none">${r?.games ? `${r.games} partie${r.games > 1 ? "s" : ""} : pas assez` : "aucune donnée"}</span>`;
  return `<span class="c2-rate ${r.verdict === "favorable" ? "up" : r.verdict === "défavorable" ? "down" : ""}"><b>${c2n(r.winrate)} %</b>${short ? "" : ` <span class="fine">± ${c2n(r.margin)} · ${c2n(r.games)} parties</span>`}</span>`;
}
const C2_VERDICT = { favorable: "favorable", défavorable: "défavorable", équilibré: "équilibré (dans la marge d'erreur)" };
async function c2LoadDraft(key, params) {
  if (c2ui.draft?.[key]) return;
  (c2ui.draft ||= {})[key] = { loading: true };
  try { c2ui.draft[key] = { data: await c2Fetch("draft", params) }; } catch (e) { c2ui.draft[key] = { error: e.message }; }
  render(false);
}
const c2Pick = list => C2_ORDER.map(r => list[r] ? `${r}:${list[r]}` : null).filter(Boolean).join(",");
// Affichage commun (préparation de partie et bilan d'une partie passée)
function c2DraftResult(d, { myRole = null, compact = false } = {}) {
  if (!d) return "";
  const vsTxt = (a, b) => `${c2Img(a, "c2-av sm")}<span class="c2-vs-sep">contre</span>${c2Img(b, "c2-av sm")}`;
  const myLane = d.lanes.find(l => l.role === myRole);
  const lanes = d.lanes.length ? `<section class="c2-card"><p class="label">Duels par lane · joueurs Diamant+</p><ul class="c2-mu">${d.lanes.map(l => `<li class="${l.role === myRole ? "me" : ""}">
      <span class="c2-mu-role">${esc(C2_ROLE[l.role])}</span><span class="c2-mu-duel">${vsTxt(l.ally, l.enemy)}</span>
      <span class="c2-mu-stat">${c2Rate(l)}${l.enough ? `<span class="fine">${C2_VERDICT[l.verdict]}${l.cs10 != null ? ` · sbires à 10 min ${l.cs10 > 0 ? "+" : ""}${c2n(l.cs10)}` : ""}</span>` : ""}</span></li>`).join("")}</ul>
      <p class="fine">Taux de victoire du champion de ton équipe dans chaque duel, avec la marge d'erreur à 95 %.</p></section>` : "";
  const BOT = { "support-bottom": "Ton support contre leur ADC", "bottom-support": "Ton ADC contre leur support", duo: "Votre duo ADC + support ensemble" };
  const bot = d.bot.length ? `<section class="c2-card"><p class="label">Bot lane à 2 contre 2</p><ul class="c2-mu">${d.bot.map(b => `<li><span class="c2-mu-role wide">${BOT[b.kind]}</span><span class="c2-mu-duel">${b.kind === "duo" ? `${c2Img(b.ally, "c2-av sm")}<span class="c2-vs-sep">+</span>${c2Img(b.enemy, "c2-av sm")}` : vsTxt(b.ally, b.enemy)}</span><span class="c2-mu-stat">${c2Rate(b)}</span></li>`).join("")}</ul></section>` : "";
  const me = d.me ? `<section class="c2-card"><p class="label">${esc(c2Name(d.me.c))} dans cette partie</p>
      <p class="fine">Tous rôles confondus : un champion peut profiter d'une composition sans dépendre de son vis-à-vis. Taux de victoire Diamant+ de ${esc(c2Name(d.me.c))} : ${c2Rate(d.me.overall)}</p>
      ${d.me.vs.length ? `<p class="label">Face à leurs champions</p><div class="c2-chiprow">${d.me.vs.map(x => `<span class="c2-cchip">${c2Img(x.c, "c2-av xs")}${c2Rate(x, true)}</span>`).join("")}</div>` : ""}
      ${d.me.with.length ? `<p class="label">Avec tes alliés</p><div class="c2-chiprow">${d.me.with.map(x => `<span class="c2-cchip">${c2Img(x.c, "c2-av xs")}${c2Rate(x, true)}</span>`).join("")}</div>` : ""}
    </section>` : "";
  const comp = (c, title) => `<div class="c2-comp"><p class="label">${title}</p>${c?.enough ? `<div class="c2-dmg" aria-label="Dégâts : ${c.dmg[0]} % physiques, ${c.dmg[1]} % magiques, ${c.dmg[2]} % bruts"><span class="ad" style="width:${c.dmg[0]}%"></span><span class="ap" style="width:${c.dmg[1]}%"></span><span class="tr" style="width:${c.dmg[2]}%"></span></div><ul>${c.notes.map(n => `<li>${esc(n.text)}</li>`).join("")}</ul>` : `<p class="fine">Pas assez de champions connus (${c?.known || 0} sur 3 au minimum).</p>`}</div>`;
  const comps = `<section class="c2-card"><p class="label">Compositions</p><div class="c2-comps">${comp(d.comps.allies, "Ton équipe")}${comp(d.comps.enemies, "Adversaires")}</div><p class="c2-legend fine"><span><i class="lg ad"></i>physiques</span><span><i class="lg ap"></i>magiques</span><span><i class="lg tr"></i>bruts</span></p></section>`;
  // Conseils vérifiés de la base pour ton duel
  const tips = myLane ? c2TipsFor(c2Name(myLane.enemy)).against.slice(0, 3) : [];
  const kb = tips.length ? `<section class="c2-card"><p class="label">Contre ${esc(c2Name(myLane.enemy))} : ce qu'en disent les coachs</p><ul class="c2-tiplist">${tips.map(c2Tip).join("")}</ul></section>` : "";
  const pool = !compact && d.pool.length ? `<section class="c2-card"><p class="label">Mes champions dans cette partie</p><ul class="c2-mu">${d.pool.map((x, i) => `<li class="${i === 0 && (x.lane?.enough || x.vsComp?.enough) ? "me" : ""}"><span class="c2-mu-duel">${c2Img(x.c, "c2-av sm")}<b>${esc(c2Name(x.c))}</b></span>
      <span class="c2-mu-stat"><span class="fine">duel</span>${x.lane ? c2Rate(x.lane, true) : `<span class="c2-rate none">—</span>`}<span class="fine">contre leur compo</span>${c2Rate(x.vsComp, true)}</span></li>`).join("")}</ul>
      <p class="fine">Classés du plus sûr au moins sûr (taux de victoire moins la marge d'erreur). Sans assez de parties, aucun champion n'est mis en avant.</p></section>` : "";
  return `${lanes}${bot}${me}${kb}${comps}${pool}<p class="fine c2-foot">Statistiques sur ${c2n(d.games)} parties classées Diamant+ (EUW) des ${d.days} derniers jours. Sous ${d.minGames} parties, le coach ne donne pas de verdict.</p>`;
}

// ---------- Préparer ma partie : draft (saisie libre ou partie en cours), pool de champions
function c2Draft() {
  const D = (C2.draft ||= { role: c2Role(C2.profile || {}) || "mid", allies: {}, enemies: {} });
  const role = D.role;
  const pool = (C2.pool ||= {})[role] || [];
  const names = c2ChampList();
  const slot = (side, r) => `<label class="c2-slot ${side === "allies" && r === role ? "me" : ""}"><span>${esc(C2_ROLE[r])}${side === "allies" && r === role ? " · toi" : ""}</span><input name="${side}-${r}" list="c2-champs" autocomplete="off" placeholder="—" value="${esc(D[side][r] ? c2Name(D[side][r]) : "")}"></label>`;
  const params = { me: D.allies[role] ? `${role}:${D.allies[role]}` : "", allies: c2Pick(D.allies), enemies: c2Pick(D.enemies), pool: pool.join(",") };
  const key = JSON.stringify(params);
  const any = Object.keys(D.allies).length + Object.keys(D.enemies).length + pool.length;
  if (any && C2_API != null) setTimeout(() => c2LoadDraft(key, params), 0);
  const res = c2ui.draft?.[key];
  return `<datalist id="c2-champs">${names.map(c => `<option value="${esc(c.name)}">`).join("")}</datalist>
    <form id="c2-draft" class="c2-card" novalidate>
      <div class="c2-roles" role="group" aria-label="Mon rôle">${C2_ORDER.map(r => `<button type="button" class="pill-btn ${r === role ? "on" : ""}" data-action="c2-draft-role" data-role="${r}" aria-pressed="${r === role}">${esc(C2_ROLE[r])}</button>`).join("")}</div>
      <div class="c2-teams"><fieldset><legend>Mon équipe</legend>${C2_ORDER.map(r => slot("allies", r)).join("")}</fieldset><fieldset><legend>Adversaires</legend>${C2_ORDER.map(r => slot("enemies", r)).join("")}</fieldset></div>
      <div class="c2-goalbtns"><button class="btn primary" type="submit">Analyser</button><button class="btn ghost" type="button" data-action="c2-draft-clear">Tout effacer</button></div>
      <p class="fine">Renseigne les champions au fil de la sélection : l'analyse se met à jour avec ce qui est connu.</p>
    </form>
    <section class="c2-card"><p class="label">Mes champions en ${esc(C2_ROLE[role])}</p>
      <div class="c2-chiprow">${pool.map(c => `<span class="c2-cchip">${c2Img(c, "c2-av xs")}${esc(c2Name(c))}<button class="linkish" data-action="c2-pool-del" data-c="${esc(c)}" aria-label="Retirer ${esc(c2Name(c))}">×</button></span>`).join("") || `<span class="fine">Ajoute les champions que tu joues dans ce rôle : le coach les compare pour chaque partie.</span>`}</div>
      <form id="c2-pool" class="c2-poolform"><input name="c" list="c2-champs" autocomplete="off" placeholder="Ajouter un champion"><button class="btn ghost sm" type="submit">Ajouter</button></form>
      ${C2.profile ? (() => { const sug = C2.profile.champions.map(([c]) => c2Id(c) || c).filter(c => !pool.includes(c)).slice(0, 4); return sug.length ? `<p class="fine">Joués récemment : ${sug.map(c => `<button class="linkish" data-action="c2-pool-add" data-c="${esc(c)}">${esc(c2Name(c))}</button>`).join(", ")}</p>` : ""; })() : ""}
    </section>
    ${C2_API == null ? `<p class="note">${icon("info")}<span>Les statistiques de matchups arrivent avec la version en ligne du coach.</span></p>` : !any ? "" : !res || res.loading ? `<div class="c2-card c2-loading">Analyse de la draft…</div>` : res.error ? `<p class="note warn">${icon("alert")}<span>${esc(res.error)}</span></p>` : c2DraftResult(res.data, { myRole: role })}`;
}

// Composition et matchups d'une partie passée, et lecture du coach (conseils vérifiés) pour ce duel
function c2GameDraft(r, id) {
  if (!r.teams || C2_API == null) return "";
  const s = r.summary;
  const side = list => Object.fromEntries(list.filter(p => p.role).map(p => [p.role, p.champion]));
  const params = { me: s.role ? `${s.role}:${s.champion}` : "", allies: c2Pick(side(r.teams.allies)), enemies: c2Pick(side(r.teams.enemies)) };
  const key = JSON.stringify(params);
  setTimeout(() => c2LoadDraft(key, params), 0);
  const res = c2ui.draft?.[key];
  const play = c2TipsFor(c2Name(s.champion)).play.slice(0, 3);
  return `<section class="sec"><div class="sec-head"><h2 class="sec-title">Composition et matchups</h2></div>
    ${!res || res.loading ? `<div class="c2-card c2-loading">Statistiques Diamant+…</div>` : res.error ? `<p class="note">${icon("info")}<span>${esc(res.error)}</span></p>` : c2DraftResult(res.data, { myRole: s.role, compact: true })}
    ${play.length ? `<section class="c2-card"><p class="label">Bien jouer ${esc(c2Name(s.champion))}</p><ul class="c2-tiplist">${play.map(c2Tip).join("")}</ul></section>` : ""}
  </section>`;
}

// ---------- Bilan général : tendances sur les dernières parties du rôle suivi, priorités et plan de session
async function c2LoadReport(key, params) {
  if (c2ui.report?.key === key) return;
  c2ui.report = { key, loading: true };
  try { c2ui.report = { key, data: await c2Fetch("report", { puuid: C2.account.puuid, platform: C2.account.platform, ...params }) }; } catch (e) { c2ui.report = { key, error: e.message }; }
  const d = c2ui.report.data;
  if (d?.games >= 3 && params.role) {
    const m = d.minus[0];
    (C2.reports ||= {})[params.role] = { at: Date.now(), games: d.games, top: m ? { title: m.title, kind: m.kind, metric: m.metric, detail: m.detail } : null, more: d.minus.length - 1 };
    c2Save();
  }
  render(false);
}
// Sujet du bilan : un rôle (jusqu'à 20 parties relues parmi les 40 dernières) ou un champion (parmi les 60 dernières)
// Sujet du bilan : un rôle ou un champion (pastilles, comme les filtres du reste de l'application)
function c2ReportPicker(p, role, champ) {
  const champs = [...new Set([...p.champions.map(([c]) => c2Id(c) || c), ...((C2.pool || {})[role] || [])])].slice(0, 8);
  return `<div class="filters">
    ${seg("c2-report-role", C2_ORDER.map(r => [r, C2_ROLE[r]]), champ ? "" : role, "Rôle", "small")}
    ${champs.length ? seg("c2-report-champ", champs.map(c => [c, c2Name(c)]), champ || "", "Champion", "small") : ""}
  </div>`;
}
// Résumé global : la priorité n° 1 et comment la travailler, les priorités suivantes, les forces
function c2Synthesis(d, { role, champ }) {
  const top = d.minus.slice(0, 3);
  const short = t => t.replace(/ dans \d+ parties sur \d+$/, "");
  return `<section class="c2-card c2-plan"><p class="label">Synthèse du coach · ${champ ? esc(c2Name(champ)) : esc(C2_ROLE[role])} · ${d.winsReviewed ?? d.wins} victoire${(d.winsReviewed ?? d.wins) > 1 ? "s" : ""} sur les ${d.games} parties relues</p>
      <h2 class="c2-goal-title">${top.length ? `À corriger en priorité : ${esc(short(top[0].title).replace(/^./, c => c.toLowerCase()))}` : "Aucun point faible récurrent : garde ce qui marche"}</h2>
      ${top.length ? `<p class="c2-better"><b>Ce qu'il faut faire</b> ${esc(c2TipOf(top[0]) || top[0].detail)}</p>` : ""}
      ${top.length > 1 ? `<p class="fine"><b>Ensuite</b> : ${top.slice(1).map(m => esc(short(m.title))).join(" · ")}.</p>` : ""}
      ${d.plus.length ? `<p class="fine"><b>Tes forces</b> : ${d.plus.map(x => esc(x.title)).join(" · ")}.</p>` : ""}
    </section>`;
}
// Vue « Profil » : indicateurs tactiques, adversaires à préparer, plan de session
function c2Profile(d, best) {
  const t = d.tactical;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
  const foes = [...(t?.nemesis || []).map(x => ({ c: x.champion, why: `t'a éliminé ${x.n} fois` })), ...(d.rivals || []).filter(o => o.wins * 2 < o.games).map(o => ({ c: o.opponent, why: `${o.wins} victoire${o.wins > 1 ? "s" : ""} sur ${o.games} en duel` }))].filter((x, i, a) => a.findIndex(y => y.c === x.c) === i).slice(0, 4);
  return `${t?.games ? `<div class="c2-tiles">
      <div class="c2-tile"><span class="c2-k">${pct(t.fights.joined, t.fights.near) ?? "—"}<small> %</small></span><span class="fine">des combats proches de toi auxquels tu participes</span></div>
      <div class="c2-tile"><span class="c2-k">${pct(t.objectives.present, t.objectives.total) ?? "—"}<small> %</small></span><span class="fine">des objectifs où tu es présent</span></div>
      <div class="c2-tile ${t.deaths.isolated ? "down" : ""}"><span class="c2-k">${t.deaths.isolated}<small>/${t.deaths.total}</small></span><span class="fine">morts seul face à plusieurs adversaires</span></div>
      <div class="c2-tile ${t.deaths.ganks ? "down" : ""}"><span class="c2-k">${t.deaths.ganks}<small>/${t.deaths.total}</small></span><span class="fine">morts sur un gank avant 14 min</span></div>
    </div>` : ""}
    ${foes.length ? `<section class="sec">${secHead("Adversaires à préparer")}<div class="c2-chiprow">${foes.map(f => `<a class="c2-cchip" href="${c2Href("face")}" data-action="c2-face-with-vs" data-vs="${esc(c2Name(f.c))}">${c2Img(f.c, "c2-av xs")}${esc(c2Name(f.c))} · ${esc(f.why)}</a>`).join("")}</div><p class="fine">Touche un champion pour préparer le face-à-face.</p></section>` : ""}
    <section class="sec">${secHead("Ta prochaine session")}<ol class="c2-steps">
      ${best ? `<li><b>Champion</b> : ${esc(c2Name(best.champion))}, ${best.wins} victoire${best.wins > 1 ? "s" : ""} sur ${best.games} récemment (KDA ${c2n(best.kda)}).</li>` : ""}
      <li><b>Avant chaque partie</b> : <a href="${c2Href("preparer")}">prépare la draft</a> pour connaître ton duel et les compositions.</li>
      <li><b>Après chaque partie</b> : ouvre la carte de la partie et vérifie ta priorité.</li>
    </ol></section>`;
}
function c2Report() {
  const p = C2.profile;
  if (!p || C2_API == null) return empty("Compte non connecté", "", `<a class="btn" href="${c2Href()}">Connecter mon compte</a>`);
  const champ = c2ui.reportChamp || null;
  const role = c2ui.reportRole || c2Role(p);
  const params = champ ? { champion: champ } : { role };
  const key = `${C2.account.puuid}|${role}|${champ || ""}`;
  setTimeout(() => c2LoadReport(key, params), 0);
  const R = c2ui.report?.key === key ? c2ui.report : null;
  const pick = c2ReportPicker(p, role, champ);
  const subject = champ ? `avec ${esc(c2Name(champ))}` : `en ${esc(C2_ROLE[role])}`;
  if (!R || R.loading) return `${pick}<div class="c2-card c2-loading">Relecture de tes parties ${subject} (jusqu'à 20, parmi tes ${champ ? 60 : 40} dernières parties classées)…</div>`;
  if (R.error) return `${pick}<div class="note warn">${icon("alert")}<span>${esc(R.error)}</span><button class="btn ghost sm" data-action="c2-report-retry">Réessayer</button></div>`;
  if (R.data.games < 3) return (R.data.found ?? 0) >= 3
    ? `${pick}<div class="note warn">${icon("alert")}<span>Le coach n'a pu relire que ${R.data.games} de tes ${R.data.found} parties ${subject} : le service de Riot était saturé. Réessaie dans une minute.</span><button class="btn ghost sm" data-action="c2-report-retry">Réessayer</button></div>`
    : `${pick}<p class="note">${icon("info")}<span>${R.data.found ? `Seulement ${R.data.found} partie${R.data.found > 1 ? "s" : ""}` : "Aucune partie"} ${subject} parmi tes ${R.data.scanned ?? "dernières"} dernières parties classées : il en faut au moins 3 pour un bilan.</span></p>`;
  const d = R.data;
  // Champion conseillé : meilleurs résultats récents du joueur (2 parties au moins)
  const best = [...d.champions].filter(c => c.games >= 2).sort((a, b) => b.wins / b.games - a.wins / a.games || b.kda - a.kda)[0];
  const dots = list => list?.length ? `<div class="c2-dots"><span class="fine">Parties concernées :</span>${list.map(gid => `<a class="c2-dot" href="${c2Href("partie", gid)}" title="Voir la partie"></a>`).join("")}</div>` : "";
  const view = ["travailler", "forces", "profil", "champions"].includes(c2ui.bview) ? c2ui.bview : "travailler";
  const body = view === "forces"
    ? (d.plus.length ? `<ul class="c2-plus">${d.plus.map(x => `<li><b>${esc(x.title)}</b>${x.detail ? `<span class="fine">${esc(x.detail)}</span>` : ""}</li>`).join("")}</ul>` : `<p class="inline-empty">Pas encore de point fort net sur ces parties.</p>`)
    : view === "profil" ? c2Profile(d, best)
    : view === "champions" ? `<ul class="c2-games">${d.champions.map(c => `<li><div class="c2-game ${c.wins * 2 >= c.games ? "win" : "loss"}">${c2Img(c.champion)}<span class="c2-g-main"><b>${esc(c2Name(c.champion))}</b><span class="fine">${c.games} partie${c.games > 1 ? "s" : ""} · ${c.wins} victoire${c.wins > 1 ? "s" : ""}</span></span><span class="c2-g-kda"><b>${c.k}/${c.d}/${c.a}</b><span class="fine">KDA ${c2n(c.kda)}</span></span><span></span></div></li>`).join("")}</ul>
      ${d.rivals?.length ? `<section class="sec">${secHead("Adversaires rencontrés plusieurs fois")}<div class="c2-chiprow">${d.rivals.map(o => `<span class="c2-cchip">${c2Img(o.opponent, "c2-av xs")}${esc(c2Name(o.opponent))} : ${o.wins}/${o.games}</span>`).join("")}</div></section>` : ""}`
    : (d.minus.length ? [["decision", "Ce qui t'a coûté des parties", "Des erreurs qui font souvent perdre la partie où elles arrivent."], ["niveau", "Les habitudes des bons joueurs qui te manquent", "Plus rares chez les Diamant et plus : à travailler dans le temps, partie après partie."]].map(([fam, title, sub]) => {
        const list = d.minus.filter(m => (m.family || "decision") === fam);
        return list.length ? `<section class="sec">${secHead(title)}<p class="fine">${sub}</p>${list.map(m => `<article class="c2-card c2-finding ${fam}"><h3 class="c2-f-title">${esc(m.title)}</h3><p class="fine">${esc(m.detail)}</p>${m.evidence ? `<p class="c2-evidence">${esc(m.evidence)}</p>` : ""}${dots(m.games)}
        <details class="more"><summary>Ce qu'il faut faire</summary>${C2_KIND_TIP[m.kind] || !m.metric ? `<p>${esc(c2TipOf(m))}</p>` : ""}${m.metric ? c2LessonsHtml(m.metric, role, d.champions[0]?.champion, !C2_KIND_TIP[m.kind]) : ""}</details></article>`).join("")}</section>` : "";
      }).join("") : `<p class="inline-empty">Aucun point faible qui revient dans plusieurs parties.</p>`);
  return `${pick}
    ${c2Synthesis(d, { role, champ })}
    <div class="filters">${seg("c2-bview", [["travailler", "À travailler", d.minus.length || null], ["forces", "Forces", d.plus.length || null], ["profil", "Profil"], ["champions", "Champions"]], view, "Vue")}</div>
    ${body}
    <p class="fine c2-foot">${esc(d.note)}</p>`;
}

// ---------- Événements
document.addEventListener("submit", e => {
  if (e.target.id === "c2-connect") {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = String(fd.get("riotid") || "").trim();
    if (!/^.{3,16}#[A-Za-z0-9]{2,5}$/.test(id)) { e.target.querySelector(".form-msg").textContent = "Riot ID attendu sous la forme Pseudo#TAG (le TAG est visible dans le client, sous ton pseudo)."; return; }
    c2SwitchTo(id, String(fd.get("platform")));
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
  if (a.dataset.action === "c2-switch") { c2ui.switching = !c2ui.switching; render(false); if (c2ui.switching) document.querySelector("#c2-connect input")?.focus(); }
  if (a.dataset.action === "c2-use") c2SwitchTo(a.dataset.id, a.dataset.platform);
  if (a.dataset.action === "c2-face-with") { C2.face = { ...C2.face, me: a.dataset.champ }; c2Save(); }
  if (a.dataset.action === "c2-face-with-vs") { C2.face = { ...C2.face, vs: a.dataset.vs }; c2Save(); }
  if (a.dataset.action === "c2-face-live") { C2.face = { ...C2.face, me: a.dataset.me, vs: a.dataset.vs }; c2Save(); }
  if (a.dataset.action === "c2-live") c2LoadLive(true);
  // Objectifs : choix du rôle, choix libre, palier suivant, objectif suivant
  const role = a.dataset.role, G = (C2.goals ||= {});
  if (a.dataset.action === "c2-role") { C2.role = a.dataset.id || role; c2Save(); render(false); }
  if (a.dataset.action === "c2-goal-pick" || a.dataset.action === "c2-goal-next") {
    const t = C2.profile?.byRole?.[role]?.tally.find(x => x.metric === a.dataset.metric);
    if (!t) return;
    const done = [...(G[role]?.done || []), ...(a.dataset.action === "c2-goal-next" && G[role]?.metric ? [G[role].metric] : [])];
    // Un point déjà au niveau du premier palier se travaille directement vers la médiane Diamant+
    G[role] = { metric: t.metric, level: t.sous / (t.games || 1) >= 0.5 ? 1 : 2, since: Date.now(), done: [...new Set(done)].filter(m => m !== t.metric) };
    c2Save(); render(false);
  }
  if (a.dataset.action === "c2-goal-up" && G[role]) { G[role] = { ...G[role], level: 2, since: Date.now() }; c2Save(); render(false); }
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

// Préparer ma partie : saisie de la draft, pool de champions
function c2DraftRead(form) {
  const D = C2.draft;
  for (const side of ["allies", "enemies"]) for (const r of C2_ORDER) {
    const v = form.elements[`${side}-${r}`]?.value.trim();
    const id = v ? c2Id(v) : null;
    if (id) D[side][r] = id; else delete D[side][r];
  }
  c2Save(); render(false);
}
document.addEventListener("change", e => { const f = e.target.closest?.("#c2-draft"); if (f && e.target.name) c2DraftRead(f); });
document.addEventListener("submit", e => {
  if (e.target.id === "c2-draft") { e.preventDefault(); c2DraftRead(e.target); }
  if (e.target.id === "c2-pool") {
    e.preventDefault();
    const id = c2Id(String(new FormData(e.target).get("c") || "").trim());
    if (!id) return;
    const role = C2.draft.role, list = ((C2.pool ||= {})[role] ||= []);
    if (!list.includes(id)) list.push(id);
    c2Save(); render(false);
  }
});
document.addEventListener("click", e => {
  const a = e.target.closest("[data-action]");
  if (!a || !a.dataset.action.startsWith("c2-")) return;
  const D = C2.draft, act = a.dataset.action;
  // Filtres en pastilles (même composant que le reste de l'application : data-id porte la valeur)
  if (act === "c2-gview") { c2ui.gview = a.dataset.id; c2ui.gviewFor = decodeURIComponent(location.hash.split("/").pop()); render(false); window.scrollTo({ top: 0 }); }
  if (act === "c2-game-role") { c2ui.gameRole = a.dataset.id; render(false); }
  if (act === "c2-prep") { c2ui.prep = a.dataset.id; render(false); }
  if (act === "c2-bview") { c2ui.bview = a.dataset.id; render(false); }
  if (act === "c2-draft-role") { D.role = a.dataset.role; c2Save(); render(false); }
  // Bilan général : sujet (rôle ou champion), nouvel essai
  if (act === "c2-report-role") { c2ui.reportRole = a.dataset.id || a.dataset.role; c2ui.reportChamp = null; render(false); }
  if (act === "c2-report-champ") { const c = a.dataset.id || a.dataset.c; c2ui.reportChamp = c2ui.reportChamp === c ? null : c; render(false); }
  if (act === "c2-report-retry") { c2ui.report = null; render(false); }
  if (act === "c2-draft-clear") { D.allies = {}; D.enemies = {}; c2Save(); render(false); }
  if (act === "c2-pool-del" || act === "c2-pool-add") {
    const list = ((C2.pool ||= {})[D.role] ||= []);
    C2.pool[D.role] = act === "c2-pool-del" ? list.filter(c => c !== a.dataset.c) : [...new Set([...list, a.dataset.c])];
    c2Save(); render(false);
  }
  // Partie en cours : compositions et rôles estimés reportés dans la préparation
  if (act === "c2-draft-live" && c2ui.live?.inGame) {
    const side = list => Object.fromEntries(list.filter(p => p.role).map(p => [p.role, p.champion]));
    C2.draft = { role: c2ui.live.me.role, allies: side(c2ui.live.allies), enemies: side(c2ui.live.enemies) };
    c2Save();
  }
});
