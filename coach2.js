// Lexique LoL (décision d'Anthony, 27/10/2026) : le coach garde le vocabulaire des joueurs (back, wave, freeze…) et l'explique
// au toucher. Un terme est souligné en pointillé ; un clic ouvre une bulle courte. Seule la première apparition d'un terme
// dans un texte est soulignée, pour ne pas surcharger. Les définitions restent simples, comme à un joueur qui débute.

const GLOSSARY = [
  ["back", /\b(?:backs?|backe[nrsz]?t?|recall)\b/i, "Back", "Retourner à la base (touche B) pour acheter des items et récupérer ses PV et son mana."],
  ["wave", /\bwaves?\b/i, "Wave", "Groupe de sbires qui arrive dans chaque lane toutes les 30 secondes."],
  ["freeze", /\bfreez\w*/i, "Freeze", "Garder la wave au même endroit, près de sa tourelle, en ne tuant que le strict nécessaire : l'adversaire doit s'avancer, loin de sa tourelle, pour farmer."],
  ["slowpush", /\bslow ?push\w*/i, "Slow push", "Laisser grossir sa wave en tuant peu de sbires adverses, pour qu'elle arrive énorme sur la tourelle adverse."],
  ["push", /\bpush\b/i, "Push", "Faire avancer ta wave vers la tourelle adverse en tuant les sbires adverses plus vite qu'eux ne tuent les tiens."],
  ["fastpush", /\bfast ?push\w*/i, "Fast push", "Tuer la wave adverse le plus vite possible pour envoyer la tienne vers la tourelle adverse."],
  ["crash", /\bcrash\w*/i, "Crash", "Envoyer sa wave jusqu'à la tourelle adverse : l'adversaire doit la farmer sous sa tourelle pendant que tu es libre."],
  ["lasthit", /\blast ?hits?\b/i, "Last hit", "Donner le dernier coup à un sbire : c'est ce coup-là qui rapporte l'or."],
  ["cs", /\bCS\b/, "CS", "Nombre de sbires et de monstres tués. C'est la mesure du farm."],
  ["farm", /\bfarm\w*/i, "Farm", "Tuer des sbires et des monstres pour gagner de l'or et de l'XP."],
  ["fullclear", /\bfull ?clear\w*/i, "Full clear", "En jungle : tuer tous ses camps avant de faire autre chose."],
  ["clear", /\bclear\w*/i, "Clear", "Tuer toute une wave, ou, en jungle, faire le tour de ses camps."],
  ["deadtime", /\bdead time\b/i, "Dead time", "Moment où il n'y a rien à farmer (wave pas encore arrivée, camps pas réapparus) : le bon moment pour back ou roam."],
  ["gank", /\bgank\w*/i, "Gank", "Attaque surprise d'un joueur venu d'ailleurs, souvent le jungler, pour tuer l'adversaire d'une lane."],
  ["roam", /\broam\w*/i, "Roam", "Quitter sa lane un moment pour aller aider ailleurs sur la carte."],
  ["sidelane", /\bside ?lanes?\b/i, "Side lane", "Les lanes du haut et du bas (top et bot), par opposition au mid."],
  ["lane", /\blanes?\b/i, "Lane", "Une des trois routes de la carte : top, mid et bot."],
  ["controlward", /\bcontrol wards?\b/i, "Control ward", "Ward achetable (75 golds) qui révèle et désactive les wards adverses autour d'elle."],
  ["ward", /\bwards?\b/i, "Ward", "Objet posé au sol qui donne la vision d'une zone."],
  ["trinket", /\btrinkets?\b/i, "Trinket", "L'objet gratuit (touche 4) qui pose une ward ou cherche les wards adverses."],
  ["poke", /\bpok\w*/i, "Poke", "Toucher l'adversaire de loin avec des sorts, sans s'engager, pour lui retirer des PV."],
  ["trade", /\btrades?\b/i, "Trade", "Échange de coups avec ton adversaire de lane : un bon trade, c'est lui faire plus de dégâts qu'il ne t'en fait."],
  ["dive", /\bdives?\b/i, "Dive", "Aller tuer un adversaire sous sa propre tourelle, en prenant ses tirs."],
  ["invade", /\binvad\w*/i, "Invade", "Entrer dans la jungle adverse pour voler des camps ou surprendre l'adversaire."],
  ["scuttle", /\bscuttle\b/i, "Scuttle", "Le crabe de la rivière : il donne de l'or, de l'XP et la vision de la rivière."],
  ["tempo", /\btempo\b/i, "Tempo", "Avoir un temps d'avance : être prêt avant l'adversaire pour la prochaine action (objectif, gank, combat)."],
  ["prio", /\bprio(?:rité de lane)?\b/i, "Prio", "Ta wave pousse vers l'adversaire : il doit la farmer, toi tu peux bouger en premier."],
  ["skirmish", /\bskirmish\w*/i, "Skirmish", "Petit combat à deux ou trois joueurs, avant un vrai teamfight."],
  ["teamfight", /\bteamfights?\b/i, "Teamfight", "Combat entre les deux équipes au complet, ou presque."],
  ["cooldown", /\bcooldowns?\b/i, "Cooldown", "Temps d'attente avant de pouvoir réutiliser un sort."],
  ["ult", /\bult\b/i, "Ult", "Le sort ultime du champion (touche R), en général le plus puissant."],
  ["summoner", /\bsummoners?\b/i, "Summoners", "Les deux sorts d'invocateur, comme Flash ou Téléportation (touches D et F)."],
  ["mapcontrol", /\bmap control\b/i, "Map control", "Avoir la vision et la présence sur une zone de la carte pour y jouer en sécurité."],
  ["splitpush", /\bsplit ?push\w*/i, "Split push", "Pousser seul une side lane pendant que ton équipe occupe l'adversaire ailleurs."],
  ["peel", /\bpeel\w*/i, "Peel", "Protéger un allié, souvent l'ADC, des adversaires qui lui foncent dessus."],
  ["engage", /\bengag(?:e|er|es)\b/i, "Engage", "Lancer le combat, souvent avec un sort qui immobilise."],
  ["kite", /\bkit(?:e|er|es|ing)\b/i, "Kite", "Attaquer puis reculer entre deux attaques pour garder la distance."],
  ["snowball", /\bsnowball\w*/i, "Snowball", "Transformer une petite avance en avance de plus en plus grande."],
  ["pathing", /\bpathing\b/i, "Pathing", "L'ordre dans lequel le jungler fait ses camps."],
  ["plates", /\bplaques?\b/i, "Plaques", "Protections des tourelles avant 14 min : chaque plaque détruite donne de l'or."],
  ["reset", /\breset\b/i, "Reset", "Back pour acheter, puis revenir, souvent juste après une action."],
];

// Souligne les termes du lexique dans un texte déjà échappé (pas de balises dedans) ; première apparition seulement
// used : ensemble partagé entre plusieurs textes d'un même bloc (un conseil et son mode d'emploi)
function gloss(escaped, used = new Set()) {
  if (window.LANG === "en" || !escaped) return escaped;
  const parts = [];
  let s = String(escaped);
  // Une seule passe : on cherche, à chaque tour, le terme qui apparaît le plus tôt
  for (;;) {
    let best = null;
    for (const [key, re] of GLOSSARY) {
      if (used.has(key)) continue;
      const m = re.exec(s);
      if (m && (!best || m.index < best.m.index || (m.index === best.m.index && m[0].length > best.m[0].length))) best = { key, m };
    }
    if (!best) break;
    used.add(best.key);
    parts.push(s.slice(0, best.m.index), `<button type="button" class="gl" data-gl="${best.key}">${best.m[0]}</button>`);
    s = s.slice(best.m.index + best.m[0].length);
  }
  return parts.join("") + s;
}

// Bulle d'explication : une seule à la fois, fermée au clic ailleurs, à Échap ou au défilement
(function () {
  let pop = null;
  const close = () => { pop?.remove(); pop = null; };
  document.addEventListener("click", e => {
    const b = e.target.closest?.(".gl");
    if (!b) { if (!e.target.closest?.(".gl-pop")) close(); return; }
    e.preventDefault(); e.stopPropagation();
    const t = GLOSSARY.find(g => g[0] === b.dataset.gl);
    if (!t) return;
    const same = pop?.dataset.for === t[0] && pop.anchor === b;
    close();
    if (same) return;
    pop = document.createElement("div");
    pop.className = "gl-pop"; pop.dataset.for = t[0]; pop.anchor = b; pop.setAttribute("role", "tooltip");
    pop.innerHTML = `<b>${t[2]}</b><span>${t[3]}</span>`;
    document.body.appendChild(pop);
    const r = b.getBoundingClientRect(), w = Math.min(300, window.innerWidth - 32);
    pop.style.width = w + "px";
    pop.style.left = Math.max(16, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 16)) + "px";
    const below = r.bottom + 8 + pop.offsetHeight < window.innerHeight;
    pop.style.top = (below ? r.bottom + 8 : r.top - pop.offsetHeight - 8) + "px";
    pop.classList.add(below ? "below" : "above");
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  window.addEventListener("scroll", close, { passive: true });
  window.addEventListener("resize", close);
})();

/* MINDIFF — nouveau coach (aperçu) : #/lol/coach (ancien coach : #/lol/coach/ancien)
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
const C2_BASE_API = window.MINDIFF_API ?? (/^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname) ? "" : null);
// Test privé (clé Riot personnelle) : window.MINDIFF_PILOT = { api, supabase, anon }. Le service n'est ouvert qu'aux
// volontaires connectés (Supabase Auth, e-mail et mot de passe) et inscrits avec le code d'invitation.
const C2_PILOT = C2_BASE_API == null ? window.MINDIFF_PILOT || null : null;
const C2_SESSION_KEY = "mindiff-pilot-session";
let c2Session = (() => { try { return C2_PILOT ? JSON.parse(localStorage.getItem(C2_SESSION_KEY) || "null") : null; } catch { return null; } })();
let C2_API = C2_BASE_API ?? (c2Session?.tester ? C2_PILOT.api : null);
// Coach V1 : après la partie seulement. Préparer et la carte « partie en cours » restent dans le code, masqués ;
// localStorage « mindiff-extras » = « 1 » les réaffiche (tests, version suivante)
const C2_EXTRAS = (() => { try { return localStorage.getItem("mindiff-extras") === "1"; } catch { return false; } })();
const c2Href = (...p) => href("lol", "coach", ...p);

const C2_REGIONS = [["euw1", "EUW"], ["eun1", "EUNE"], ["na1", "NA"], ["kr", "KR"], ["br1", "BR"], ["la1", "LAN"], ["la2", "LAS"], ["tr1", "TR"], ["jp1", "JP"], ["oc1", "OCE"], ["me1", "ME"], ["ru", "RU"]];
const C2_ROLE = { top: "Top", jungle: "Jungle", mid: "Mid", bottom: "ADC", support: "Support" };
const C2_TIER = { IRON: "Fer", BRONZE: "Bronze", SILVER: "Argent", GOLD: "Or", PLATINUM: "Platine", EMERALD: "Émeraude", DIAMOND: "Diamant", MASTER: "Master", GRANDMASTER: "Grandmaster", CHALLENGER: "Challenger" };
// Comment progresser sur chaque indicateur : thèmes de la base et mots-clés des vidéos de coachs
const C2_LEARN = {
  cs10: { themes: ["lane", "vagues"], re: /wave|vague|trading|farm|\bcs\b|last ?hit|clear|jungle path|tempo/i, tip: "Vise la référence Diamant+ à 10 min : chaque wave perdue, ce sont 6 sbires et leur or." },
  csMin: { themes: ["lane", "vagues"], re: /wave|vague|farm|\bcs\b|tempo/i, tip: "Après la phase de lane, continue à prendre les waves proches de toi entre deux combats." },
  deaths30: { themes: ["survie", "methode"], re: /mort|death|dying|surviv|position|dans la t[eê]te|mistake|erreur/i, tip: "Ouvre le bilan de la partie : chaque mort y est datée, avec qui t'a tué et combien d'adversaires étaient là. Revois ces minutes avant d'en tirer une conclusion." },
  visionMin: { themes: ["methode", "vision"], re: /vision|ward|balise|track/i, tip: "Pose une ward à chaque back et utilise ton trinket dès qu'il est rechargé." },
  controlWards: { themes: ["methode", "vision"], re: /vision|\bwards?\b|balise|control ward|pink ward/i, tip: "Une control ward à chaque back : c'est 75 golds, et souvent un objectif sauvé." },
  kp: { themes: ["teamfight", "macro"], re: /roam|gank|tempo|teamfight|skirmish|escarmouche|jungle/i, tip: "Après avoir poussé ta wave, regarde la minimap : rejoins les combats qui ont lieu près de toi." },
};
// Conseil de méthode propre à chaque type de constat (plus précis que celui de l'indicateur)
const C2_KIND_TIP = {
  "mort-avant-objectif": "Dans la minute qui précède un dragon ou un Baron, rejoins ton équipe et évite de mourir seul loin de l'objectif : l'adversaire le prendrait en surnombre.",
  "plaques-perdues": "Avant de quitter ta lane (back, aide à un combat), pousse ta wave vers la tourelle adverse : elle ne s'écrasera pas sous la tienne pendant ton absence.",
  // Un conseil par poste quand le geste diffère (audit des rôles du 29/10 : un jungler ou un support recevait des conseils de laner)
  "retard-en-ligne": {
    default: "Quand ton adversaire a l'avantage, joue la sécurité : prends les sbires près de ta tourelle, signale-le à ton jungler et ne te bats qu'avec un avantage net.",
    jungle: "Quand le jungler adverse a pris de l'avance, ne le défie pas seul : farme du côté opposé au sien, joue autour des lanes qui ont l'avantage et ne conteste un objectif qu'avec tes laners à côté.",
    support: "Quand le duo adverse a l'avantage, reste près de ton ADC, pose une ward dans la rivière contre les ganks et n'engage que si l'adversaire a utilisé ses sorts importants.",
  },
  "morts-phase-de-ligne": {
    default: "En phase de lane, recule quand ton adversaire disparaît de la carte ou que son jungler est vu de ton côté.",
    jungle: "Avant 14 min, n'entre dans la jungle adverse ou ne gank une lane que si tu sais où est le jungler adverse et que tes laners peuvent te suivre ; sinon, reste dans ta jungle.",
    support: "En phase de lane, ne pars pas seul poser une ward quand le jungler adverse n'est pas visible : va-y avec ton ADC ou quand ta wave pousse vers l'adversaire.",
  },
  "or-non-depense": "Back dès que tu peux acheter un composant important, de préférence après avoir poussé ta wave.",
  "mort-isolee": "Après la phase de lane, ne pousse pas seul dans la moitié adverse quand plusieurs adversaires ne sont pas visibles : reste à portée de ton équipe ou replie-toi avant leur arrivée.",
  "gank-subi": "En phase de lane, quand le jungler adverse n'a pas été vu depuis un moment et que ta wave est poussée, rapproche-toi de ta tourelle ; une ward dans la rivière te montre son arrivée.",
  "absent-objectif": "Environ une minute avant un dragon ou un Baron, pousse ta wave puis rejoins ton équipe : l'adversaire prend les objectifs quand vous êtes moins nombreux.",
  "objectif-inferiorite": "Si un allié est mort ou absent, cède l'objectif et prends plutôt une tourelle ou une wave de l'autre côté de la carte, au lieu de combattre en infériorité.",
  "combat-sans-toi": "Garde un œil sur la minimap : quand ton équipe se bat près de toi, la rejoindre change le rapport de force ; sinon, signale de ne pas engager.",
  "aucune-balise-detruite": {
    default: "Après ton premier retour, échange ton trinket jaune contre la Lentille de l'oracle (trinket rouge, gratuit à la boutique) : active-la en passant près d'un buisson de rivière ou d'une entrée de jungle, ou pose une control ward, et détruis les wards adverses que tu trouves.",
    // ADC : garde son trinket jaune ; la control ward révèle et désactive les wards adverses autour d'elle
    bottom: "Achète une control ward à chaque back et pose-la dans la rivière près du dragon ou dans un buisson de ta lane : elle révèle les wards adverses autour d'elle, que tu peux alors détruire.",
  },
  "peu-de-retours": "Back dès que tu as l'or d'un composant, juste après avoir poussé tes sbires vers la tourelle adverse (en jungle : après un camp ou un gank) : tu reviens à temps et avec un item de plus.",
  "premier-objet-tardif": {
    default: "Vise ton premier grand item vers 11 min : prends chaque sbire possible et back dès que tu as l'or d'un composant, plutôt que de rester sur la carte avec peu de points de vie.",
    jungle: "Vise ton premier grand item vers 11 min : enchaîne tes camps entre deux ganks et back dès que tu as l'or d'un composant, plutôt que de rester sur la carte avec peu de points de vie.",
  },
  "balises-controle": "Achète une control ward à chaque back et pose-la près du prochain objectif (dragon, Larves, Héraut) ou dans ta jungle. Tu ne peux en poser qu'une à la fois : si l'ancienne est encore en place, déplace-la vers le prochain objectif.",
  "temps-mort": "Moins de morts, c'est plus de temps pour farmer et peser sur les objectifs. Commence par les morts après 20 min : tu attends plus longtemps avant de revenir, et l'adversaire en profite pour prendre un objectif.",
};
const c2TipOf = (f, role = C2.profile ? c2Role(C2.profile) : null) => {
  const t = C2_KIND_TIP[f.kind];
  return (typeof t === "object" ? t[role] || t.default : t) || C2_PLAIN[f.metric]?.steps(role)?.[0] || C2_LEARN[f.metric]?.tip || "";
};

// ---------- Champions (noms français, images Data Dragon)
let c2Champs = null;
function c2ChampList() {
  if (c2Champs || !COACH) return c2Champs || [];
  c2Champs = COACH.contents.filter(c => c.sourceId === "riot-data-dragon").map(c => ({ id: c.url.match(/champion\/(\w+)\.json/)?.[1], name: c.title.split(" — ")[0] })).filter((c, i, a) => c.id && a.findIndex(x => x.id === c.id) === i).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return c2Champs;
}
// Site anglais : nom officiel anglais (Seraphine, Master Yi), dès que i18n.js a chargé les noms de Data Dragon
const c2NameEn = n => (window.LANG === "en" && window.i18nName ? window.i18nName(n) : n);
const c2Name = id => c2NameEn(c2ChampList().find(c => c.id === id || c.id.toLowerCase() === String(id).toLowerCase())?.name || id);
const c2Id = name => c2ChampList().find(c => [c.name, c.id, c2NameEn(c.name)].some(x => x.toLowerCase() === String(name).toLowerCase()))?.id || null;
const c2Img = (id, cls = "c2-av") => id ? `<img class="${cls}" src="https://ddragon.leagueoflegends.com/cdn/${esc(COACH?.ddragonVersion || "16.21.1")}/img/champion/${esc(id)}.png" alt="" loading="lazy" width="40" height="40">` : `<span class="${cls} c2-av-empty"></span>`;
// Version du client (16.20) → numéro de patch affiché par Riot (26.20)
const c2Patch = p => String(p ?? "").replace(/^1([56])./, "2$1.");
const c2n = v => (typeof v === "number" ? v.toLocaleString("fr-FR") : v ?? "—");
const c2Ago = t => { const h = (Date.now() - t) / 36e5; return h < 1 / 12 ? "à l'instant" : h < 1 ? `il y a ${Math.round(h * 60)} min` : h < 24 ? `il y a ${Math.round(h)} h` : `il y a ${Math.round(h / 24)} j`; };

// ---------- Test privé : compte et inscription (API REST de Supabase Auth, sans bibliothèque)
// Même version que CONSENT_VERSION dans worker/v1.mjs : la changer impose une nouvelle acceptation
const C2_CONSENT = "test-prive-2026-10-27";
const c2SessionSave = () => { try { c2Session ? localStorage.setItem(C2_SESSION_KEY, JSON.stringify(c2Session)) : localStorage.removeItem(C2_SESSION_KEY); } catch { /* stockage indisponible */ } };
async function c2SbAuth(path, body) {
  const r = await fetch(`${C2_PILOT.supabase}/auth/v1/${path}`, { method: "POST", headers: { apikey: C2_PILOT.anon, "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  if (!r) throw new Error("Pas de connexion : réessaie dans un instant.");
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(/invalid login|invalid_credentials/i.test(j.error_code || j.msg || j.error_description || "") ? "E-mail ou mot de passe incorrect." : /already registered|user_already_exists/i.test(j.error_code || j.msg || "") ? "Un compte existe déjà avec cet e-mail : connecte-toi." : /weak|at least/i.test(j.error_code || j.msg || "") ? "Mot de passe trop court : 8 caractères au moins." : j.msg || j.error_description || `Erreur ${r.status}`);
  return j;
}
const c2SessionFrom = (j, prev = {}) => ({ ...prev, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (j.expires_in || 3600) });
async function c2AuthHeaders() {
  if (!C2_PILOT || !c2Session?.access_token) return {};
  if (c2Session.expires_at * 1000 < Date.now() + 60000) {
    try { c2Session = c2SessionFrom(await c2SbAuth("token?grant_type=refresh_token", { refresh_token: c2Session.refresh_token }), c2Session); c2SessionSave(); } catch { /* jeton refusé : le service répondra 401 */ }
  }
  return { Authorization: `Bearer ${c2Session.access_token}` };
}
// Statut de testeur demandé au service ; ouvre le coach si l'inscription est faite
async function c2PilotCheck() {
  const r = await fetch(`${C2_PILOT.api}/api/v1/pilot/me`, { headers: await c2AuthHeaders() }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  if (r?.status === 401) { c2Session = null; c2SessionSave(); throw new Error("Session expirée : reconnecte-toi."); }
  if (!r?.ok) throw new Error("Le service du coach ne répond pas : réessaie dans quelques minutes.");
  c2Session.tester = !!j.tester; c2Session.revoked = !!j.revoked; c2SessionSave();
  C2_API = c2Session.tester ? C2_PILOT.api : null;
}
function c2PilotLost() { if (c2Session) { c2Session.tester = false; c2SessionSave(); } C2_API = null; render(false); }
function c2PilotGate() {
  if (!C2_PILOT) return c2Showcase();
  const P = (c2ui.pilot ||= { mode: "signup" }), msg = `<p class="form-msg fine" role="status" aria-live="polite">${P.error ? esc(P.error) : ""}</p>`;
  const head = `<p class="label">Test privé</p><h2 class="c2-show-title">Le coach est en test, sur invitation</h2>`;
  if (!c2Session?.access_token) return `<section class="c2-card c2-pilot">${head}
    <p class="fine">Tu as reçu un code d'invitation ? ${P.mode === "signup" ? "Crée ton compte" : "Connecte-toi"} avec ton e-mail, puis entre le code.</p>
    <form id="c2-pilot-auth" class="c2-form" novalidate>
      <label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="email" required></label>
      <label class="field"><span>Mot de passe</span><input name="password" type="password" minlength="8" autocomplete="${P.mode === "signup" ? "new-password" : "current-password"}" required></label>
      <button class="btn primary" type="submit" ${P.busy ? "disabled" : ""}>${P.mode === "signup" ? "Créer mon compte" : "Me connecter"}</button>
      <button class="btn ghost" type="button" data-action="c2-pilot-mode">${P.mode === "signup" ? "J'ai déjà un compte" : "Créer un compte"}</button>
      ${msg}
    </form></section>${c2Showcase()}`;
  if (c2Session.revoked) return `<section class="c2-card c2-pilot">${head}<p>Tu as quitté le test. Pour revenir, demande à la personne qui t'a invité.</p><button class="btn ghost sm" data-action="c2-pilot-out">Me déconnecter</button></section>`;
  return `<section class="c2-card c2-pilot">${head}
    <form id="c2-pilot-join" class="c2-form" novalidate>
      <label class="field"><span>Code d'invitation</span><input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" required></label>
      <details class="c2-pilot-terms"><summary>Conditions du test (à lire)</summary><ul>
        <li>Test privé d'environ deux semaines, réservé aux personnes majeures invitées.</li>
        <li>À partir de ton Riot ID, le coach lit tes parties classées via l'API de Riot Games et les garde pour te proposer un objectif et le suivre sur tes parties suivantes.</li>
        <li>Données gardées : ton e-mail (pour te connecter), ton Riot ID, tes parties, tes objectifs et tes avis. Hébergées en Europe (Supabase, Irlande), visibles par toi seul, jamais vendues ni partagées, sans publicité, et aucune n'est envoyée à un service d'IA.</li>
        <li>Le bouton « Supprimer mes données du coach » efface tout à tout moment. Tout est effacé à la fin du test.</li>
        <li>MINDIFF n'est ni approuvé ni soutenu par Riot Games.</li>
      </ul></details>
      <label class="check"><input type="checkbox" name="age"> J'ai 18 ans ou plus</label>
      <label class="check"><input type="checkbox" name="consent"> J'ai lu et j'accepte les conditions du test</label>
      <button class="btn primary" type="submit" ${P.busy ? "disabled" : ""}>Rejoindre le test</button>
      <button class="btn ghost" type="button" data-action="c2-pilot-out">Me déconnecter</button>
      ${msg}
    </form></section>`;
}
async function c2PilotRun(fn) {
  const P = (c2ui.pilot ||= {});
  P.busy = true; P.error = null; render(false);
  try { await fn(); } catch (e) { P.error = e.message; }
  P.busy = false; render(false);
}
// Au chargement : session gardée mais statut à revérifier (testeur retiré, session expirée)
if (C2_PILOT && c2Session?.access_token) setTimeout(() => c2PilotCheck().catch(() => {}).then(() => render(false)), 0);

// ---------- Appels au service
async function c2Fetch(path, params) {
  const r = await fetch(`${C2_API}/api/coach/${path}?${new URLSearchParams(params)}`, { headers: await c2AuthHeaders() }).catch(() => null);
  if (r?.status === 403 && C2_PILOT) { c2PilotLost(); throw new Error("Le coach est en test privé, sur invitation."); }
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
  if (C2.account?.riotId) C2.accounts[key(C2.account.riotId)] = { history: C2.history, goals: C2.goals, seen: C2.seen, role: C2.role, reports: C2.reports, habitLog: C2.habitLog, path: C2.path || null };
  const saved = C2.accounts[key(riotId)] || {};
  const prev = C2.account?.riotId && C2.profile ? [{ riotId: C2.account.riotId, platform: C2.account.platform }] : [];
  Object.assign(C2, { account: { riotId, platform }, profile: null, profileAt: 0, reviews: {}, history: saved.history || {}, goals: saved.goals || {}, seen: saved.seen ?? null, role: saved.role || null, reports: saved.reports || {}, habitLog: saved.habitLog || {}, path: saved.path || null });
  C2.recent = [{ riotId, platform }, ...prev, ...(C2.recent || [])].filter((r, i, all) => all.findIndex(x => key(x.riotId) === key(r.riotId)) === i).slice(0, 5);
  for (const k of Object.keys(C2.accounts)) if (!C2.recent.some(r => key(r.riotId) === k)) delete C2.accounts[k];
  // Changement de compte : tout ce que le coach V1 avait chargé pour l'ancien compte (objectif, progression, fiches champion, bilan)
  // est oublié ; sinon l'objectif de la personne d'avant restait affiché (retour d'Anthony, 01/11)
  Object.assign(c2ui, { error: null, switching: false, live: null, liveAt: 0, v1: {}, champMe: {}, report: null, tt: {}, tsel: {}, tf: {}, matches: null });
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
  if ((C2.reviews[id]?.tactics?.kills && C2.reviews[id]?.textVersion >= 4) || c2ui.loading) return; // bilans plus anciens (sans relecture tactique ou sans les kills du replay) : relus
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
      : ["Ne frappe un sbire que lorsqu'il est presque mort : seul le last hit donne l'or.", "Avant de back, tue d'abord les sbires adverses pour perdre le moins de farm possible.", "Entraîne-toi 5 minutes en mode Entraînement : vise 70 sbires à 10 minutes."],
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
    steps: () => ["Quand ton adversaire disparaît de la carte, recule : il arrive peut-être avec d'autres.", "Avant d'avancer seul, regarde la minimap et compte les adversaires visibles.", "Après chaque mort, revois sa minute dans le bilan : qui t'a tué, avec combien d'aides, à quel endroit."],
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
    steps: role => role === "support" ? ["Après chaque back, suis ton jungler ou ton mid vers le prochain combat ou objectif au lieu de rester seul en bot lane.", "Avant un dragon ou un Baron, rejoins ton équipe une minute avant, avec une ward pour l'objectif.", "Quand ton ADC est en sécurité sous sa tourelle, va aider là où un combat se prépare."]
      : ["Après avoir poussé ta wave, regarde la minimap : si un combat se prépare près de toi, rejoins-le.", "Avant un dragon ou un Baron, rejoins ton équipe une minute avant.", "Évite de farmer seul à l'autre bout de la carte quand ton équipe est regroupée."],
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
  const seen = (c2ui.vidSeen ||= new Set());
  const list = COACH.contents.filter(c => c.type === "video" && ["fr", "en"].includes(c.lang) && !seen.has(c.id) && L.re.test(c.title) && !(c.triage?.entertainment || []).length && roleOk(c.sourceId) && !c2OtherChamp(c.title, champ) && !(role && otherRole(c.title)))
    .sort((a, b) => (b.lang === "fr") - (a.lang === "fr") || (b.analysis === "analysee") - (a.analysis === "analysee") || (b.triage?.score || 0) - (a.triage?.score || 0)).slice(0, 2);
  list.forEach(c => seen.add(c.id)); // une vidéo n'apparaît qu'une fois par page
  return list;
}
// Conseils de coachs de la base (sans champion) sur le thème de l'indicateur et pour le poste du joueur : 2 au plus,
// les exploitables d'abord, les conseils anciens nuancés en dernier ; un conseil n'apparaît qu'une fois par page
const C2_KIND_TOPIC = {
  "mort-avant-objectif": /dragon|baron|héraut|objectif/i, "objectif-inferiorite": /dragon|baron|héraut|objectif|en vie|nombre/i,
  "morts-phase-de-ligne": /gank|jungler|ward/i, "mort-isolee": /lane de côté|split|seul|carte/i, "combat-sans-toi": /combat|rejoin|regroup/i,
  "retard-en-ligne": /vague|gank|jungler/i, "peu-de-retours": /retour|base/i, "premier-objet-tardif": /retour|vague|farm|sbires/i,
  "ecart-visionMin": /ward|vision/i, "ecart-controlWards": /ward|vision/i, "balises-controle": /ward|vision/i, "aucune-balise-detruite": /ward|vision/i,
  "ecart-cs10": /vague|sbires|farm/i, "ecart-csMin": /vague|sbires|farm|pousse/i, "ecart-kp": /combat|rejoin|objectif/i,
};
// Conseil marqué jungle + tous postes mais adressé au jungler (« en jungle, reste près de sa lane ») : pas pour un laner
const C2_TO_JUNGLER = /\ben jungle\b|en tant que jungler|quand tu jungles?|\btes camps\b|\bton clear\b|\bton pathing\b/i;
function c2CoachTips(metric, role, kind = null) {
  const L = C2_LEARN[metric];
  if (!L || !COACH) return [];
  const seen = (c2ui.tipSeen ||= new Set());
  const list = COACH.units.filter(u => ["exploitable", "provisoire"].includes(u.status) && u.usage !== "correction" && u.nature !== "officiel" && !u.champions?.length && u.use?.when
      && u.context?.queue !== "competition" && u.themes?.some(t => L.themes.includes(t)) && (!role || u.roles?.includes("all") || u.roles?.includes(role)) && !seen.has(u.id)
      && (!role || role === "jungle" || !(u.roles?.includes("jungle") && C2_TO_JUNGLER.test(u.claim))))
    .map(u => ({ u, hit: C2_KIND_TOPIC[kind]?.test(`${u.claim} ${u.use?.when || ""}`) ? 1 : 0, own: role && u.roles?.includes(role) ? 1 : 0 }))
    // Avec un constat précis, seuls les conseils qui parlent de sa situation ; sinon, les plus sûrs du thème
    .filter(x => !C2_KIND_TOPIC[kind] || x.hit)
    .sort((a, b) => b.hit - a.hit || b.own - a.own || (a.u.status !== "exploitable") - (b.u.status !== "exploitable") || !!a.u.nuance - !!b.u.nuance).slice(0, 2).map(x => x.u);
  list.forEach(u => seen.add(u.id));
  return list;
}
// « Comment progresser » : des actions concrètes, puis une ou deux vidéos (sans détail de provenance : il reste dans la page de contrôle)
function c2LessonsHtml(metric, role, champ = null, steps = true, kind = null) {
  const P = steps ? C2_PLAIN[metric] : null;
  const vids = c2Videos(metric, role, champ), tips = c2CoachTips(metric, role, kind);
  return `<div class="c2-lessons">
    ${P ? `<ol class="c2-howto">${P.steps(role).map(x => `<li>${esc(x)}</li>`).join("")}</ol>` : ""}
    ${tips.length ? `<p class="label">Conseils de coachs</p><ul class="c2-tiplist">${tips.map(c2Tip).join("")}</ul>` : ""}
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
  c2ui.vidSeen = new Set(); // une vidéo n'est proposée qu'une fois par écran
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
  const tabs = [["suivi", "Mon suivi", "target", c2Href()], ["parties", "Mes parties", "list", c2Href("parties")], ["preparer", "Préparer", "bracket", c2Href("preparer")], ["champions", "Champions", "users", c2Href("champions")]].filter(t => C2_EXTRAS || t[0] !== "preparer");
  const ti = tabs.findIndex(x => x[0] === tab);
  if (enter && c2ui.lastTab != null && c2ui.lastTab !== ti) slide = ti > c2ui.lastTab ? " c2-from-r" : " c2-from-l";
  c2ui.lastTab = ti;
  const nav = `<nav class="tabs c2-tabs" aria-label="Coach">${tabs.map(([k, l, ic, to]) => `<a class="tab" href="${to}" ${k === tab ? 'aria-current="page"' : ""}>${icon(ic)}${l}</a>`).join("")}</nav>`;
  const body = tab === "parties" ? c2GamesTab() : tab === "preparer" ? c2Prepare() : tab === "champions" ? c2Champions() : c2Home();
  return `<header class="c2-head"><h1 class="page-title" tabindex="-1">Coach</h1></header>${nav}${screen(body)}<p class="fine c2-foot"><a href="confidentialite.html" style="text-decoration: underline">Confidentialité et conditions</a> · ${RIOT_LEGAL}</p>`;
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
  if (C2_API == null) return C2_PILOT ? c2PilotGate() : C2.account ? c2Showcase() : c2Connect();
  if (!C2.account) return c2Connect();
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
  if (C2_EXTRAS) setTimeout(() => c2LoadLive(), 0);
  const recent = p.games.slice(0, 3);
  return `${c2ui.switching ? c2Connect(true) : ""}${err}${c2ProfileCard(p)}${C2_EXTRAS ? c2Live(p) : ""}${c2V1Card(p)}${c2V1Progress()}${c2PathLine()}${c2Ready(p)}${C2_EXTRAS ? c2Goal(p) : ""}
    <a class="c2-ready c2-bilan-link" href="${c2Href("bilan")}">${icon("tiers")}<span><b>Mon bilan complet</b><span class="fine">Tes erreurs qui reviennent, tes forces et les adversaires à préparer, sur une vingtaine de tes dernières parties</span></span>${icon("chevron")}</a>
    ${recent.length ? `<section class="sec">${secHead("Dernières parties", seeAll(c2Href("parties"), "Toutes"))}${c2Games({ ...p, games: recent })}</section>` : ""}
    <p class="fine c2-foot">Données officielles de Riot Games${p.benchmark ? ` · référence : ${c2n(p.benchmark.games)} parties ${esc(p.benchmark.level)} (patch ${esc(c2Patch(p.benchmark.patch))})` : ""}</p>`;
}

// ---------- Coach V1 : un objectif mesurable à la fois (routes /api/v1, calcul côté serveur, sans IA)
async function c2V1(path, method = "GET", body = null) {
  const auth = await c2AuthHeaders();
  const r = await fetch(`${C2_API}/api/v1${path}`, body ? { method, headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(body) } : { method, headers: auth }).catch(() => null);
  if (!r) throw new Error("Pas de connexion au service du coach.");
  const j = r.status === 204 ? {} : await r.json().catch(() => ({}));
  if (C2_PILOT && (r.status === 401 || j.error?.code === "test-prive")) c2PilotLost();
  if (!r.ok) throw new Error(j.error?.message || `Erreur ${r.status}`);
  return j;
}
async function c2V1Load(force = false) {
  const V = (c2ui.v1 ||= {});
  if (!C2.account?.riotId || V.busy || V.deleted === C2.account.riotId || (!force && V.forId === C2.account.riotId)) return;
  V.busy = true; V.forId = C2.account.riotId; V.error = null; render(false);
  try {
    if (!V.pid || V.pidFor !== C2.account.riotId) { const r = await c2V1(`/players/resolve?riot_id=${encodeURIComponent(C2.account.riotId)}&platform=${encodeURIComponent(C2.account.platform || "euw1")}`); V.pid = r.player_id; V.pidFor = C2.account.riotId; }
    // Objectif déjà connu affiché tout de suite ; la mise à jour des parties continue derrière (retour d'Anthony, 01/11 :
    // la carte restait sur « Lecture de tes dernières ranked » pendant toute la synchronisation)
    if (!V.goal) await Promise.all([c2V1(`/players/${V.pid}/goals/active`), c2V1(`/players/${V.pid}/progress`)])
      .then(([active, progress]) => Object.assign(V, { goal: active.goal, evaluations: active.evaluations, history: progress.goals, series: progress.series })).catch(() => {});
    // Synchronisation : nouvelles ranked, métriques, objectif (évalué ou proposé)
    V.syncing = true; render(false);
    const job = await c2V1(`/players/${V.pid}/sync`, "POST");
    for (let i = 0; i < 100; i++) { const j = await c2V1(`/jobs/${job.job_id}`); if (j.status === "done" || j.status === "failed") { if (j.status === "failed") V.error = j.error === "riot-cle-refusee" ? "Clé Riot refusée ou expirée : les parties ne peuvent pas être mises à jour." : "La mise à jour des parties a échoué."; break; } await new Promise(r => setTimeout(r, 2000)); }
    V.syncing = false;
    const [active, progress, diag] = await Promise.all([c2V1(`/players/${V.pid}/goals/active`), c2V1(`/players/${V.pid}/progress`), c2V1(`/players/${V.pid}/diagnostic`)]);
    Object.assign(V, { goal: active.goal, evaluations: active.evaluations, history: progress.goals, series: progress.series, diagnostic: diag });
    c2ui.matches = null; // nouvelles parties : l'apprentissage de champion relit la liste
    c2LoadProfile(true); // et « Dernières parties » aussi, sans attendre les 2 minutes du cache
    // Résumé gardé sur l'appareil pour la carte de l'Accueil (sans relancer de synchronisation à chaque ouverture)
    const g = active.goal, evs = (active.evaluations || []).filter(e => e.counted);
    if (c2ui.v1 !== V) return; // compte changé pendant la synchronisation
    C2.v1Snap = g ? { for: C2.account.riotId, label: g.label, role: g.role, target: g.target_text, unit: g.unit, status: g.status, met: evs.filter(e => e.met).length, counted: evs.length, need: g.success_required, of: g.evaluation_games, week: c2Week(V) } : null;
    c2Save();
    if (typeof pushSync === "function") pushSync(true); // résumé de la semaine à jour pour la notification du lundi
  } catch (e) { V.error = e.message; V.syncing = false; }
  V.busy = false; render(false);
}
const C2_V1_ROLE = { TOP: "top", JUNGLE: "jungle", MIDDLE: "mid", BOTTOM: "ADC", UTILITY: "support" };
// Catégories de compétences des objectifs (coach/metrics.mjs, CATEGORIES) : affichées sur la carte, un objectif = une compétence
const C2_V1_CATEGORY = { lane: "Lane & ressources", survie: "Survie & combats", vision: "Vision & information", tempo: "Tempo & économie", carte: "Carte & objectifs", poste: "Maîtrise du poste" };
// « en tant que top », « en tant qu'ADC » : l'objectif est toujours donné pour un poste précis (retour d'Anthony, 29/10)
// Site anglais : « as <b>mid</b> », le texte qui précède est traduit par i18n.js (« Ton objectif » → « Your goal »)
const c2AsRole = r => { const n = C2_V1_ROLE[r] || r || "ce poste"; if (window.LANG === "en") return `<span>as <b>${esc(C2_V1_ROLE[r] || r || "this role")}</b></span>`; return `en tant ${/^[aeiouy]/i.test(n) ? "qu'" : "que "}<b>${esc(n)}</b>`; };
// Motion design de la carte objectif : entrée en cascade, chiffres qui défilent, bordure lumineuse, onde au lancement.
// Rejoué seulement quand l'objectif ou son statut change ; coupé si le joueur a réduit les animations (style.css).
const c2Seen = new Set();
function c2CountUp() {
  for (const el of document.querySelectorAll(".c2-v1-enter [data-count]:not([data-counted])")) {
    el.dataset.counted = "1";
    const final = el.textContent, m = final.match(/^(-?\d+)(?:,(\d+))?(.*)$/);
    if (!m) continue;
    const dec = m[2]?.length || 0, to = Number(m[1] + "." + (m[2] || "0")), rest = m[3], t0 = performance.now(), dur = 900;
    const step = now => {
      const k = Math.min(1, (now - t0 - (Number(el.dataset.delay) || 0)) / dur);
      if (k < 0) return requestAnimationFrame(step);
      const e = 1 - Math.pow(2, -10 * k);
      el.textContent = (to * e).toFixed(dec).replace(".", ",") + rest;
      if (k < 1) requestAnimationFrame(step); else el.textContent = final;
    };
    requestAnimationFrame(step);
  }
}
// Onde de choc et étincelles autour d'un bouton (lancement d'un objectif)
function c2Burst(btn, cls = "") {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = btn.getBoundingClientRect(), b = document.createElement("div");
  b.className = "c2-burst " + cls; b.setAttribute("aria-hidden", "true");
  b.style.left = r.left + r.width / 2 + "px"; b.style.top = r.top + r.height / 2 + "px";
  b.innerHTML = "<span class=\"ring\"></span><span class=\"ring r2\"></span>" + Array.from({ length: 16 }, (_, i) => `<i style="--a:${i * 22.5}deg;--d:${60 + (i % 4) * 18}px"></i>`).join("");
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 1100);
}
// Bouton Coach de la barre du bas : onde, étincelles et halo au toucher, puis la page du coach entre en « warp ».
// L'effet est posé sur la page (et non sur le bouton) car la barre est redessinée à chaque navigation.
document.addEventListener("pointerdown", e => {
  const a = e.target.closest?.(".bottom-nav .nav-coach");
  if (!a || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  c2Burst(a.querySelector(".ic") || a, "nav");
}, { passive: true });
// Au clic (pas au toucher : l'écran posé sous le doigt avalerait le clic et la navigation) : venant d'une autre rubrique,
// écran « Bienvenue dans le coach » ; déjà sur le coach, simple warp de la page
document.addEventListener("click", e => {
  const a = e.target.closest?.(".bottom-nav .nav-coach");
  if (!a || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (a.getAttribute("aria-current") === "page") c2Warp(); else c2Intro(a);
});
// Venant de l'intro, la page est déjà cachée (coach-hold) : on la révèle dans la même image que le warp, sans délai,
// sinon on la voit un instant avant l'animation
function c2Warp(now) {
  const v = document.getElementById("view");
  if (!v) return;
  const go = () => { v.classList.remove("coach-warp"); void v.offsetWidth; v.classList.add("coach-warp"); v.classList.remove("coach-hold"); setTimeout(() => v.classList.remove("coach-warp"), 900); };
  now ? go() : setTimeout(go, 40);
}
// Écran d'accueil du coach (1,6 s, un toucher le passe) : fond qui s'ouvre depuis le bouton, icône qui tourne, anneau,
// « COACH » lettre par lettre, puis l'écran se retire vers le haut et la page entre en warp
function c2Intro(from) {
  document.querySelector(".coach-intro")?.remove();
  // La page du coach se dessine juste derrière : on la cache tout de suite pour qu'elle n'apparaisse pas avant l'intro
  const v = document.getElementById("view");
  v?.classList.add("coach-hold");
  setTimeout(() => v?.classList.remove("coach-hold"), 3000);
  const r = from.getBoundingClientRect(), o = document.createElement("div");
  o.className = "coach-intro"; o.setAttribute("aria-hidden", "true");
  o.style.setProperty("--x", r.left + r.width / 2 + "px"); o.style.setProperty("--y", r.top + r.height / 2 + "px");
  o.innerHTML = `<div class="ci-stage"><span class="ci-ring"></span><span class="ci-ring r2"></span><span class="ci-icon">${typeof icon === "function" ? icon("target") : ""}</span>
    <p class="ci-kicker">Bienvenue dans</p><h2 class="ci-title">${[..."COACH"].map((c, i) => `<span style="--i:${i}">${c}</span>`).join("")}</h2><p class="ci-sub">Un objectif à la fois.</p></div>`;
  document.body.appendChild(o);
  const done = () => { if (!o.isConnected || o.classList.contains("out")) return; o.classList.add("out"); c2Warp(true); setTimeout(() => o.remove(), 500); };
  o.addEventListener("pointerdown", done);
  setTimeout(done, 1600);
}
// Grands écrans de l'objectif (demande d'Anthony, 31/10), joués une fois par objectif et mémorisés sur l'appareil :
// « Objectif rempli » (trophée, ondes, éclats, lettres) puis « Nouvel objectif » (cible, chiffres avant → cible).
// Attendent la fin de l'écran « Bienvenue dans le coach » ; un toucher les passe ; coupés si les animations sont réduites.
function c2Fx(kind, g, extra = {}) {
  const key = (kind === "win" ? "w:" : "n:") + g.id;
  if ((C2.fx ||= {})[key]) return;
  if (document.querySelector(".coach-intro, .c2-fx")) return void setTimeout(() => c2Fx(kind, g, extra), 450);
  C2.fx[key] = Date.now(); c2Save();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const win = kind === "win", o = document.createElement("div");
  o.className = `c2-fx ${win ? "win" : "new"}`; o.setAttribute("aria-hidden", "true");
  const en = window.LANG === "en", word = win ? (en ? "DONE" : "REMPLI") : (en ? "GOAL" : "OBJECTIF");
  const sparks = win ? Array.from({ length: 28 }, (_, i) => `<i style="--a:${(i * 360) / 28 + (i % 3) * 4}deg;--d:${110 + (i % 5) * 34}px;--s:${4 + (i % 3) * 2}px;--t:${(i % 4) * 60}ms"></i>`).join("") : "";
  const unit = g.unit && g.unit !== "%" ? ` ${g.unit === "/min" ? "/ min" : g.unit}` : "";
  const sub = win ? `<span>${esc(g.label)}</span> · ${g.progress?.met ?? "?"}/${g.progress?.counted ?? "?"} ${en ? "games" : "parties"}` : `<span>${esc(g.label)}</span>${extra.tier > 1 ? ` · ${en ? "level" : "palier"} ${extra.tier}` : ""}`;
  const nums = win ? "" : `<p class="fx-nums"><span>${esc(g.baseline_text)}${esc(unit)}</span><b>→</b><span class="to">${esc(g.target_text)}${esc(unit)}</span></p>`;
  o.innerHTML = `<div class="fx-rays"></div><div class="fx-stage">
    <span class="fx-ring"></span><span class="fx-ring r2"></span><span class="fx-ring r3"></span><span class="fx-sparks">${sparks}</span>
    <span class="fx-icon">${icon(win ? "trophy" : "target")}</span>
    <p class="fx-kicker">${win ? (en ? "Goal" : "Objectif") : (en ? "New" : "Nouvel")}</p>
    <h2 class="fx-title">${[...word].map((c, i) => `<span style="--i:${i}">${c}</span>`).join("")}</h2>
    <p class="fx-sub">${sub}</p>${nums}<p class="fx-tap">${en ? "Tap to continue" : "Touche pour continuer"}</p></div>`;
  document.body.appendChild(o);
  if (win) navigator.vibrate?.([40, 60, 90]);
  const done = () => { if (!o.isConnected || o.classList.contains("out")) return; o.classList.add("out"); c2Warp(true); setTimeout(() => o.remove(), 600); };
  o.addEventListener("pointerdown", () => setTimeout(done, 0));
  setTimeout(done, win ? 3600 : 2800);
}
function c2V1Card(p) {
  if (C2_API == null) return "";
  setTimeout(() => c2V1Load(), 0);
  const V = c2ui.v1 || {};
  if (V.deleted && V.deleted === C2.account?.riotId) return `<section class="c2-card c2-v1"><p class="label">Mon objectif</p><p>Tes données du coach ont été supprimées : parties, mesures, objectifs et avis.</p><button class="btn ghost sm" data-action="c2-v1-restart">Recommencer avec le coach</button></section>`;
  if (V.error && !V.goal) return `<section class="c2-card c2-v1"><p class="label">Mon objectif</p><p class="note warn">${icon("alert")}<span>${esc(V.error)}</span></p><button class="btn ghost sm" data-action="c2-v1-sync">Réessayer</button>${c2V1Erase()}</section>`;
  if (!V.goal && (V.busy || !V.diagnostic)) return `<section class="c2-card c2-v1 c2-loading c2-scan"><span class="c2-scan-beam" aria-hidden="true"></span><span>${V.syncing ? "Lecture de tes dernières ranked" : "Ton objectif"}<span class="c2-wait" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></span></section>`;
  const last = V.history?.[0];
  const lastTxt = last ? `<p class="c2-v1-last ${last.outcome}">${C2_V1_OUTCOME[last.outcome] || "Objectif précédent sans verdict"} : ${esc(last.label)}, cible ${esc(last.target_text)} (${last.progress?.met ?? "?"}/${last.progress?.counted ?? "?"} parties)${last.progress?.review ? ` ; ${esc(last.progress.review)}` : last.outcome === "inconclusive" ? " ; pas assez de parties au même poste" : ""}.</p>${c2V1Feedback(last)}` : "";
  // Objectif tout juste maîtrisé : compte rendu avant de passer au suivant (demande d'Anthony, 31/10)
  if (last?.outcome === "achieved" && !C2.wins?.[last.id]) { setTimeout(() => c2Fx("win", last), 0); return c2V1Win(last, V.history); }
  const g = V.goal;
  // Un seul objectif à la fois (brief V1), sur le poste principal : si un autre poste est choisi au-dessus, on le dit au lieu de
  // montrer l'objectif du top sous l'onglet Jungle (retour d'Anthony, 29/10)
  const V1_POS = { top: "TOP", jungle: "JUNGLE", mid: "MIDDLE", bottom: "BOTTOM", support: "UTILITY" }, picked = V1_POS[C2.role];
  if (g && picked && picked !== g.role) {
    const n = p?.byRole?.[C2.role]?.games ?? 0;
    return `<section class="c2-card c2-v1"><p class="label">Mon objectif · ${esc(C2_ROLE[C2.role] || C2.role)}</p><p>Ton objectif en cours t'est donné ${c2AsRole(g.role)}, ton poste principal : le coach te fait travailler une seule chose à la fois.</p><p class="fine">${esc(C2_ROLE[C2.role] || C2.role)} : ${n} partie${n > 1 ? "s" : ""} classée${n > 1 ? "s" : ""} récente${n > 1 ? "s" : ""}. Quand ce poste deviendra ton poste principal, ton prochain objectif y sera adapté (ses champions, ses repères).</p><button class="btn ghost sm" data-action="c2-role" data-id="${esc(Object.keys(V1_POS).find(k => V1_POS[k] === g.role) || "")}">Voir mon objectif ${esc(C2_V1_ROLE[g.role] || g.role)}</button></section>`;
  }
  if (!g) {
    const rows = V.diagnostic?.rows || [], why = rows.find(r => r.reason)?.reason;
    // Déjà au niveau sur tout : pas d'objectif à proposer, ce n'est pas un manque de parties
    const atLevel = rows.length && rows.some(r => r.reason === "déjà au niveau de la référence") && rows.every(r => r.reason === "déjà au niveau de la référence" || /suspendu/.test(r.reason || ""));
    const msg = atLevel ? `Pas d'objectif à te proposer : tu es déjà au niveau des repères du coach sur tout ce qu'il suit à ce poste${V.diagnostic?.target_tier ? ` (meilleurs joueurs ${esc(C2_TIER[V.diagnostic.target_tier] || V.diagnostic.target_tier)})` : ""}.`
      : why ? `Pas encore d'objectif : ${esc(why)}.` : "Pas encore d'objectif : joue quelques ranked de plus.";
    return `<section class="c2-card c2-v1"><p class="label">Mon objectif</p>${lastTxt}<p>${msg}</p>${atLevel || why ? "" : `<p class="fine">Il faut au moins 15 parties classées au même poste.</p>`}${c2V1Erase()}</section>`;
  }
  // Carte aérée (demande d'Anthony, 27/10) : l'essentiel d'abord (objectif, deux chiffres, ce qu'il faut faire en partie),
  // le détail (repère, règle de réussite, conseils de coachs) replié
  const ref = g.reference?.source === "metric_references" ? `Repère : joueurs ${esc(g.reference.level || "Diamant+")} à ce poste, ${g.reference.quantile === "p50" ? "médiane" : "quart des meilleurs"} ${esc(c2V1Fmt(g, g.reference.value))} (${c2n(g.reference.n)} parties).` : "Repère pédagogique du coach, en attendant assez de données mesurées.";
  const evs = (V.evaluations || []).filter(e => e.counted);
  const dots = Array.from({ length: g.evaluation_games }, (_, i) => { const e = evs[i]; return `<span class="c2-v1-dot ${!e ? "todo" : e.met ? "ok" : e.met === false ? "ko" : "na"}" title="${e ? (e.value == null ? "donnée manquante" : esc(c2V1Fmt(g, e.value))) : "à jouer"}"></span>`; }).join("");
  // L'exercice commence par la cible (« Vise 7,8 … ») déjà affichée en grand : on ne garde que le geste à faire
  const how = (g.exercise || "").replace(/^Vise [^.]*\.\s*/, "") || g.exercise || "";
  const unit = g.unit && g.unit !== "%" ? `<small>${esc(g.unit === "/min" ? " / min" : " " + g.unit)}</small>` : "";
  const seenKey = `${g.id}:${g.status}`, enter = !c2Seen.has(seenKey);
  if (enter) { c2Seen.add(seenKey); setTimeout(c2CountUp, 0); }
  const tier = c2V1Won(V.history).filter(x => x.metric === g.metric && x.role === g.role).length + 1;
  if (g.status === "proposed") setTimeout(() => c2Fx("new", g, { tier }), 0);
  const head = `<p class="label">${g.status === "proposed" ? "Ton prochain objectif" : "Ton objectif en cours"} ${c2AsRole(g.role)}${tier > 1 ? ` · palier ${tier}` : ""}</p>${C2_V1_CATEGORY[g.category] ? `<p class="c2-v1-cat">${esc(C2_V1_CATEGORY[g.category])}</p>` : ""}
    <h3 class="c2-v1-title">${esc(g.label)}</h3>
    <div class="c2-v1-nums"><div><span class="fine">Toi aujourd'hui</span><b><span data-count>${esc(g.baseline_text)}</span>${unit}</b></div><span class="c2-v1-arrow" aria-hidden="true">→</span><div class="goal"><span class="fine">${g.direction === "lower" ? "Au plus" : "Ta cible"}</span><b><span data-count data-delay="250">${esc(g.target_text)}</span>${unit}</b></div></div>`;
  // Conseils sourcés rédigés en français (non traduits) : en anglais, le bloc entier reste en français, annoncé comme tel,
  // plutôt que « When: Ta wave est freezée… »
  const tips = c2V1Tips(g);
  const more = `<details class="more c2-fold" data-fold="v1-why"${c2ui.fold?.["v1-why"] ? " open" : ""}><summary>Pourquoi cette cible</summary><ul class="c2-v1-why"><li><b>${esc(g.baseline_text)}</b><span>C'est ce que tu fais d'habitude (tes dernières ranked ${esc(C2_V1_ROLE[g.role] || "à ce poste")}).</span></li><li><b>${g.reference?.source === "metric_references" ? esc(c2V1Fmt(g, g.reference.value)) : esc(g.target_text)}</b><span>${g.reference?.source === "metric_references" ? `C'est ce que font les joueurs ${esc(g.reference.level || "Diamant+")} ${g.reference.quantile === "p50" ? "en moyenne" : "les plus forts"}. On y va par petites marches : ${esc(g.target_text)} d'abord.` : "C'est le repère du coach pour ce poste."}</span></li><li><b>${g.success_required}/${g.evaluation_games}</b><span>L'objectif est réussi si tu atteins ${esc(g.target_text)} dans ${g.success_required} de tes ${g.evaluation_games} prochaines ranked. Gagner ou perdre ne compte pas.</span></li></ul></details>
    ${tips.length ? `<details class="more c2-fold" data-fold="v1-tips"${c2ui.fold?.["v1-tips"] ? " open" : ""}><summary>Ce qu'en disent les coachs (${tips.length})</summary><ul class="c2-tiplist"${window.LANG === "en" ? ' lang="fr" translate="no"' : ""}>${tips.map(c2Tip).join("")}</ul></details>` : ""}`;
  const howHtml = how ? `<div class="c2-v1-ex"><span class="label">En partie, ${c2AsRole(g.role)}</span><p>${gloss(esc(how))}</p></div>` : "";
  const body = g.status === "proposed"
    ? `${howHtml}<button class="btn primary" data-action="c2-v1-start" data-id="${esc(g.id)}">Je commence</button>${more}`
    : `<div class="c2-v1-prog"><div class="c2-v1-dots" aria-label="${evs.filter(e => e.met).length} cibles atteintes sur ${evs.length} parties">${dots}</div>
      <p class="fine">${evs.filter(e => e.met).length} / ${g.success_required} réussites · ${evs.length} / ${g.evaluation_games} parties</p>${c2V1Verdict(g, evs)}</div>
      ${howHtml}${more}
      <button class="btn ghost sm" data-action="c2-v1-sync"${V.busy ? " disabled" : ""}>${V.busy ? "Mise à jour…" : "Mettre à jour mes parties"}</button>`;
  return `<section class="c2-card c2-v1 c2-v1-live${enter ? " c2-v1-enter" : ""}">${lastTxt}${head}${body}${V.error ? `<p class="fine">${esc(V.error)}</p>` : ""}${c2V1Trophies(V.history)}${c2V1Erase()}</section>`;
}
// Ce que chaque geste rapporte en partie, dit sans chiffre inventé (écran de validation)
const C2_V1_WHY = {
  farm: "Les sbires sont ta source d'or la plus sûre : chaque sbire tué, c'est de l'or gagné sans prendre de risque, donc tes objets plus tôt.",
  xp_at_10: "L'expérience te donne tes niveaux : un niveau d'avance en début de partie pèse dans chaque échange et chaque combat.",
  early_deaths: "Chaque mort donne de l'or à l'adversaire et te fait rater sbires et expérience pendant que tu attends de réapparaître.",
  kill_participation: "Participer aux kills, c'est être là quand ton équipe se bat : tu prends ta part de l'or et ton équipe joue à plus.",
  vision_per_min: "La vision te montre où sont les adversaires : tu vois venir les ganks et ton équipe prépare les objectifs sans surprise.",
};
const c2V1Why = m => C2_V1_WHY[m] || (/^(cs_|farm_)/.test(m) ? C2_V1_WHY.farm : "");
// Objectifs maîtrisés, du plus ancien au plus récent : palier = combien de fois ce geste a été validé à ce poste
const c2V1Won = (history = []) => history.filter(h => h.outcome === "achieved").sort((a, b) => (a.created_at || 0) - (b.created_at || 0))
  .map((h, i, all) => ({ ...h, tier: all.slice(0, i + 1).filter(x => x.metric === h.metric && x.role === h.role).length }));
function c2V1Win(h, history) {
  const won = c2V1Won(history), me = won.find(x => x.id === h.id) || { tier: 1 };
  const evs = (h.evaluations || []).filter(e => e.counted), vals = evs.map(e => e.value).filter(v => v != null);
  const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  const unit = h.unit && h.unit !== "%" ? `<small>${esc(h.unit === "/min" ? " / min" : " " + h.unit)}</small>` : "";
  const dots = evs.map(e => `<span class="c2-v1-dot ${e.met ? "ok" : e.met === false ? "ko" : "na"}"></span>`).join("");
  const met = evs.filter(e => e.met).length;
  const guard = Object.values(h.progress?.guardrails || {}).filter(r => r.n);
  const ref = h.reference?.source === "metric_references" ? h.reference : null;
  const why = c2V1Why(h.metric);
  return `<section class="c2-card c2-v1 c2-v1-win c2-v1-enter">
    <p class="label">Objectif validé${me.tier > 1 ? ` · palier ${me.tier}` : ""}</p>
    <h3 class="c2-v1-title">${esc(h.label)}</h3>
    <p class="fine">${c2AsRole(h.role)}</p>
    <div class="c2-v1-nums"><div><span class="fine">Avant</span><b>${esc(h.baseline_text)}${unit}</b></div><span class="c2-v1-arrow" aria-hidden="true">→</span><div class="goal"><span class="fine">Pendant l'objectif</span><b>${esc(c2V1Fmt(h, avg))}${unit}</b></div></div>
    <p class="fine">Moyenne de tes ${vals.length} parties, pour une cible de ${esc(h.target_text)}.</p>
    <div class="c2-v1-dots" aria-label="${met} cibles atteintes sur ${evs.length} parties">${dots}</div>
    <p class="fine">Cible atteinte dans ${met} parties sur ${evs.length}.</p>
    ${why ? `<div class="c2-v1-ex"><span class="label">Pourquoi c'est important</span><p>${esc(why)}</p>${ref ? `<p class="fine">Repère : joueurs ${esc(ref.level || "Diamant+")} à ce poste, ${esc(c2V1Fmt(h, ref.value))}.</p>` : ""}</div>` : ""}
    ${guard.length && !guard.some(r => r.breach) ? `<p class="fine">Tes autres chiffres suivis n'ont pas baissé pendant ces parties : le progrès ne s'est pas fait au détriment du reste.</p>` : ""}
    <div class="c2-v1-ex"><span class="label">Ce que tu gardes</span><p>Ajouté à ton palmarès : ${won.length} objectif${won.length > 1 ? "s" : ""} validé${won.length > 1 ? "s" : ""}. ${me.tier > 1 ? `Tu as validé ce geste ${me.tier} fois, chaque fois avec une cible plus haute.` : "Si ce geste reste ta priorité, le prochain objectif le reprend avec une cible plus haute."}</p></div>
    <button class="btn primary" data-action="c2-v1-win-ok" data-id="${esc(h.id)}">Voir mon prochain objectif</button>
    ${c2V1Feedback(h)}
  </section>`;
}
// Palmarès gardé sur le compte du coach : objectifs maîtrisés, plus récent d'abord
function c2V1Trophies(history) {
  const won = c2V1Won(history).reverse();
  if (!won.length) return "";
  return `<details class="more c2-fold" data-fold="v1-wins"${c2ui.fold?.["v1-wins"] ? " open" : ""}><summary>Mes objectifs validés (${won.length})</summary><ul class="c2-v1-wins">${won.map(h =>
    `<li><b>${esc(h.label)}</b><span class="fine">${esc(C2_V1_ROLE[h.role] || h.role)}${h.tier > 1 ? ` · palier ${h.tier}` : ""} · cible ${esc(h.target_text)} · ${h.progress?.met ?? "?"}/${h.progress?.counted ?? "?"} parties</span></li>`).join("")}</ul></details>`;
}
// Où en est le cycle, dit dès qu'on le sait (banc d'essai du 31/10 : réussite acquise avant la 5e partie dans 22 objectifs sur 82,
// devenue impossible dans 28, sans que la carte le dise). Le verdict officiel reste donné après la dernière partie (garde-fous)
function c2V1Verdict(g, evs) {
  const met = evs.filter(e => e.met).length, left = Math.max(0, g.evaluation_games - evs.length), need = g.success_required;
  const games = n => `${n} partie${n > 1 ? "s" : ""}`;
  const state = !left ? ""
    : met >= need ? `<p class="c2-v1-last achieved">Cible atteinte ${met} fois : c'est assez. Joue encore ${games(left)} pour valider l'objectif.</p>`
    : met + left < need ? `<p class="c2-v1-last">Ce cycle ne sera pas réussi : il reste ${games(left)} et il faudrait encore ${need - met} réussite${need - met > 1 ? "s" : ""}. Ce n'est pas un échec : finis-le, le coach mesure aussi ton progrès et peut relancer le même objectif.</p>`
    : "";
  return `${state}<p class="fine">Seules tes ranked ${c2AsRole(g.role)} comptent : les parties à un autre poste ne font pas avancer le compteur.</p>`;
}
// Suppression RGPD de tout ce que le coach garde sur le joueur (DELETE /players/:id), confirmée dans la page
function c2V1Erase() {
  const V = c2ui.v1 || {};
  if (!V.pid) return "";
  if (!V.erase) return `<button class="btn ghost sm c2-v1-erase" data-action="c2-v1-erase">Supprimer mes données du coach</button>`;
  return `<div class="c2-v1-erase-confirm"><p class="fine">Tes parties, mesures, objectifs et avis seront effacés définitivement. Ton Riot ID reste enregistré sur cet appareil.</p>
    <button class="btn primary sm" data-action="c2-v1-erase-yes">Oui, tout supprimer</button> <button class="btn ghost sm" data-action="c2-v1-erase-no">Annuler</button></div>`;
}
// Exercice sourcé : conseils de coachs vérifiés de notre base qui parlent du geste mesuré. Même sélection que le tuteur
// (coach/v1/tutor.mjs, tipsForGoal) avec les motifs du catalogue (coach/metrics.mjs : kbThemes, kbMatch, kbMatchRole, kbAvoid),
// recopiés ici et comparés par les tests. Aucun conseil plutôt qu'un conseil hors sujet.
const C2_V1_LATE = /baron|nashor|inhib|atakhan|ancien|elder/i;
const C2_V1_FARM = { themes: ["lane", "vagues"], match: /\b(cs|farm\w*|sbires?|last[- ]?hit\w*|freeze|slow ?push|camps?|clear)\b/i, matchRole: { JUNGLE: /\b(camps?|clear\w*|farm\w*|pathing|chemin|full ?clear|cs)\b/i }, themesRole: { JUNGLE: ["lane", "vagues", "jungle"] }, avoid: /baron|nashor|inhib|atakhan|ancien|elder|teamfight|siège|\bwards?\b|balise|jungler adverse|saute|sauter|skip/i };
const C2_V1_TIPS = {
  cs_at_10: C2_V1_FARM, cs_at_15: C2_V1_FARM, cs_per_min: C2_V1_FARM,
  early_deaths: { themes: ["survie", "methode"], match: /gank|\bmort|mourir|meurs|survi|recul|jungler adverse|track|danger|flash|minimap|dispara|\bmia\b|missing/i, avoid: C2_V1_LATE },
  kill_participation: { themes: ["teamfight", "macro"], match: /roam|rejoin|escarmouche|skirmish|combat|teamfight|gank|\baide|\bkills?\b|minimap/i, avoid: C2_V1_LATE },
  vision_per_min: { themes: ["vision", "methode"], match: /\bwards?\b|vision|balise|trinket|contr[ôo]le|sweep|oracle|lentille/i },
  farm_15_25: { themes: ["vagues", "macro", "lane"], themesRole: { JUNGLE: ["jungle", "macro", "vagues"] }, match: /^(?=.*\b(farm\w*|sbires?|cs|vagues?|camps?)\b)(?=.*(phase de lane|milieu de partie|mid[- ]?game|side ?lanes?|lanes? de côté|lanes? latérales?|voies latérales|vagues latérales|dead time|temps mort))/i, matchRole: { JUNGLE: /^(?=.*\b(camps?|clear\w*|farm\w*)\b)(?=.*(dead time|temps mort|refais|après avoir fini|milieu de partie|lanes? de côté|vagues? latérales?))/i }, avoid: /baron|nashor|inhib|atakhan|ancien|elder|\bwards?\b|balise|jungler adverse|half roam|demi-décalage|rage split\w*/i },
  // Nouveaux objectifs du 01/11 (catalogue metrics-2), mêmes motifs que coach/metrics.mjs
  ward_kills_20: { themes: ["vision", "methode"], match: /\bwards?\b|vision|balise|trinket|oracle|lentille|sweep|contr[ôo]le/i },
  control_wards_20: { themes: ["vision", "methode"], match: /control ward|pink|balise de contr[ôo]le|\bwards?\b|vision/i },
  first_item_min: { themes: ["lane", "vagues", "build"], match: /\bback\b|retour|recall|objet|item|achat|tempo|\bor\b|gold/i, avoid: C2_V1_LATE },
  gold_idle_share: { themes: ["lane", "vagues", "macro"], match: /\bback\b|retour|recall|achat|tempo|\bor\b|gold/i, avoid: C2_V1_LATE },
  xp_at_10: { themes: ["lane", "vagues", "macro"], themesRole: { JUNGLE: ["jungle", "lane"] }, match: /\b(xp|exp[ée]rience)\b/i, matchRole: { JUNGLE: /\b(xp|exp[ée]rience|niveaux?|levels?|camps?|clear\w*|full ?clear|pathing|chemin)\b/i }, avoid: /baron|nashor|inhib|atakhan|ancien|elder|teamfight|siège|\bwards?\b|balise|jungler adverse|saute|skip|freez\w*|congel\w*|pings?\b/i },
};
// Résultat d'un cycle de 5 parties (moteur goals-2) : un cycle sans maîtrise n'est pas un échec
const C2_V1_OUTCOME = {
  achieved: "Objectif précédent maîtrisé",
  improving: "Tu progresses sur l'objectif précédent, on continue",
  stable: "Pas encore de progrès net sur l'objectif précédent, on continue",
  needs_review: "Objectif précédent mis en pause pour vérification",
  failed: "Objectif précédent mis de côté après deux séries sans progrès",
  inconclusive: "Objectif précédent sans verdict",
};
// Test privé : avis du testeur sur le cycle terminé (pertinence, effets indésirables), une fois par objectif
const C2_V1_SIDE = { "jeu-plus-passif": "J'ai joué plus passif", "moins-de-farm": "J'ai moins farmé", "moins-de-kills": "J'ai moins participé aux kills", stress: "Plus de stress", "moins-de-plaisir": "Moins de plaisir", "conseil-inadapte": "Conseils pas adaptés", "objectif-incompris": "Je n'ai pas compris l'objectif" };
function c2V1Feedback(g) {
  if (g.feedback) return `<p class="fine">Merci pour ton avis sur cet objectif.</p>`;
  const F = c2ui.v1?.fb?.[g.id] || {};
  return `<details class="more c2-v1-fb"${c2ui.v1?.fbOpen ? " open" : ""}><summary>Ton avis sur cet objectif (test privé)</summary>
    <p class="fine">Utile pour ton jeu ? 1 = pas du tout, 5 = beaucoup</p>
    <div class="c2-v1-rel">${[1, 2, 3, 4, 5].map(n => `<button class="btn ${F.relevance === n ? "primary" : "ghost"} sm" data-action="c2-v1-rel" data-id="${esc(g.id)}" data-n="${n}">${n}</button>`).join("")}</div>
    <p class="fine">Effets indésirables pendant ces parties :</p>
    <div class="c2-v1-side">${Object.entries(C2_V1_SIDE).map(([k, t]) => `<label><input type="checkbox" data-action="c2-v1-side" data-id="${esc(g.id)}" data-k="${k}"${F.side?.includes(k) ? " checked" : ""}> ${t}</label>`).join("")}</div>
    <textarea class="c2-v1-comment" data-id="${esc(g.id)}" maxlength="1000" rows="2" placeholder="Un commentaire ? (facultatif)">${esc(F.comment || "")}</textarea>
    <button class="btn primary sm" data-action="c2-v1-fb-send" data-id="${esc(g.id)}"${F.relevance || F.side?.length ? "" : " disabled"}>Envoyer</button></details>`;
}
function c2V1Tips(g) {
  const L = C2_V1_TIPS[g.metric], role = { TOP: "top", JUNGLE: "jungle", MIDDLE: "mid", BOTTOM: "bottom", UTILITY: "support" }[g.role];
  if (!L || !COACH) return [];
  const match = L.matchRole?.[g.role] || L.match;
  return COACH.units.filter(u => ["exploitable", "provisoire"].includes(u.status) && u.usage !== "correction" && u.nature !== "officiel" && !u.champions?.length && u.use?.when
      && u.context?.queue !== "competition" && u.themes?.some(t => (L.themesRole?.[g.role] || L.themes).includes(t)) && (u.roles?.includes("all") || u.roles?.includes(role))
      && !L.avoid?.test(`${u.claim} ${u.use.when}`) && match.test(u.claim))
    .map(u => ({ u, score: 2 + (u.roles?.includes(role) ? 1 : 0) }))
    .sort((a, b) => b.score - a.score || (a.u.status !== "exploitable") - (b.u.status !== "exploitable") || a.u.id.localeCompare(b.u.id)).slice(0, 2).map(x => x.u);
}
// Gestes travaillés (métrique + poste) : niveau de départ, niveau récent et écart en écart-type personnel ;
// partagé par « Ta progression » et « Ta semaine »
function c2V1Skills(V) {
  const hist = (V.history || []).filter(h => h.metric && h.baseline != null);
  if (!hist.length || !V.series) return [];
  const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
  const skills = new Map();
  for (const h of [...hist].sort((a, b) => (a.created_at || 0) - (b.created_at || 0))) {
    const k = `${h.metric}|${h.role}`;
    const s = skills.get(k) || { first: h, last: h, cycles: 0, mastered: 0 };
    s.cycles++; if (h.outcome === "achieved") s.mastered++; s.last = h; skills.set(k, s);
  }
  return [...skills.values()].sort((a, b) => (b.last.created_at || 0) - (a.last.created_at || 0)).map(s => {
    const g = s.first, pts = (V.series[g.metric] || []).filter(x => x.role === g.role), recent = pts.slice(-5).map(x => x.value);
    const now = recent.length >= 3 ? median(recent) : null, sd = g.personal_sd || null, dir = g.direction === "lower" ? -1 : 1;
    return { ...s, g, pts, now, z: now != null && sd ? dir * (now - g.baseline) / sd : null };
  });
}
const c2V1Unit = g => (g.unit && g.unit !== "%" ? ` ${g.unit === "/min" ? "/ min" : g.unit}` : "");
// Ta semaine (résumé du lundi, reporté au tour 4 du brainstorm, demandé par Anthony le 01/11) : les 7 derniers jours, tirés
// des mêmes données que « Ta progression », rien de nouveau n'est mesuré. Un geste en progrès, un à travailler, la meilleure
// partie sur le geste en cours. Une ligne en tête de « Ta progression » (pas de carte en plus) et la notification du lundi.
function c2Week(V, now = Date.now()) {
  const since = now - 7 * 864e5, S = V.series || {};
  const games = new Set(Object.values(S).flat().filter(x => x.start_ms >= since).map(x => x.start_ms)).size;
  if (!games) return null;
  const skills = c2V1Skills(V), live = V.goal && ["active", "evaluating", "proposed"].includes(V.goal.status) ? V.goal : null;
  const up = skills.filter(s => s.z >= 0.25).sort((a, b) => b.z - a.z)[0];
  const down = skills.filter(s => s.z != null && s.z <= -0.25).sort((a, b) => a.z - b.z)[0];
  // Ce qui coince encore : un geste en baisse, sinon l'objectif en cours s'il ne progresse pas déjà
  const work = down?.g || (live && live.label !== up?.g.label ? live : null);
  // Meilleure partie de la semaine sur le geste travaillé : au moins 2 parties à ce poste pour que « meilleure » ait un sens
  const ref = live || up?.g || null, dir = ref?.direction === "lower" ? -1 : 1;
  const week = ref ? (S[ref.metric] || []).filter(x => x.start_ms >= since && x.role === ref.role) : [];
  const best = week.length >= 2 ? week.reduce((a, b) => (dir * (b.value - a.value) > 0 ? b : a)) : null;
  return { at: now, games, up: up ? up.g.label : null, work: work ? work.label : null,
    best: best ? `${c2V1Fmt(ref, best.value)}${c2V1Unit(ref)}` : null, bestLabel: best ? ref.label : null };
}
function c2WeekLine(W) {
  if (!W) return "";
  const item = (k, v) => `<span><span class="fine">${k}</span> <b>${esc(v)}</b></span>`;
  return `<div class="c2-week"><span class="label">Ta semaine</span><span>${W.games} partie${W.games > 1 ? "s" : ""} en 7 jours</span>${W.up ? item("En progrès", W.up) : ""}${W.work ? item("Ce qui coince encore", W.work) : ""}${W.best ? item(`Meilleure partie, ${esc(W.bestLabel)}`, W.best) : ""}</div>`;
}
// Ta progression (bloc D de la todo du 01/11 : « prouver la progression ») : pour chaque geste déjà travaillé (métrique + poste),
// ton niveau avant le premier objectif, ton niveau sur tes 5 dernières parties à ce poste, l'écart lu en écart-type personnel
// (même seuils que le moteur : 0,25 σ = progrès), et tes 30 dernières parties en courbe. Données : /progress (series, goals).
// Honnête : 5 parties restent peu, et la mesure ne dit pas pourquoi ça a bougé.
function c2V1Progress() {
  const V = c2ui.v1 || {};
  const skills = c2V1Skills(V);
  if (!skills.length) return "";
  const rows = skills.map(s => {
    const { g, pts, now, z } = s;
    const [cls, word] = z == null ? ["", "pas encore assez de parties récentes à ce poste"] : z >= 0.5 ? ["up", "net progrès"] : z >= 0.25 ? ["up", "léger progrès"] : z > -0.25 ? ["", "pas de changement net"] : ["down", "en baisse"];
    const unit = c2V1Unit(g);
    // Courbe : 30 dernières parties, ligne du niveau de départ et de la dernière cible
    const vals = pts.map(x => x.value), W = 240, H = 44;
    let spark = "";
    if (vals.length >= 4) {
      const lo = Math.min(...vals, g.baseline, s.last.target ?? g.baseline), hi = Math.max(...vals, g.baseline, s.last.target ?? g.baseline), span = hi - lo || 1;
      const y = v => (H - 4 - ((v - lo) / span) * (H - 8)).toFixed(1), x = i => ((i / (vals.length - 1)) * (W - 4) + 2).toFixed(1);
      spark = `<svg class="c2-prog-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Tes ${vals.length} dernières parties"><line x1="0" x2="${W}" y1="${y(g.baseline)}" y2="${y(g.baseline)}" class="base"/>${s.last.target != null ? `<line x1="0" x2="${W}" y1="${y(s.last.target)}" y2="${y(s.last.target)}" class="goal"/>` : ""}<polyline points="${vals.map((v, i) => `${x(i)},${y(v)}`).join(" ")}"/></svg>`;
    }
    return `<li class="c2-prog-row ${cls}"><div class="c2-prog-head"><b>${esc(g.label)}</b><span class="fine">${esc(C2_V1_ROLE[g.role] || g.role)} · ${s.cycles} cycle${s.cycles > 1 ? "s" : ""}${s.mastered ? ` · ${s.mastered} validé${s.mastered > 1 ? "s" : ""}` : ""}</span></div>
      <div class="c2-prog-nums"><div><span class="fine">Avant</span><b>${esc(c2V1Fmt(g, g.baseline))}${esc(unit)}</b></div><span aria-hidden="true">→</span><div><span class="fine">Tes 5 dernières</span><b>${esc(c2V1Fmt(g, now))}${now != null ? esc(unit) : ""}</b></div></div>
      <p class="c2-prog-verdict">${word}</p>${spark}</li>`;
  });
  return `<section class="c2-card c2-prog"><p class="label">Ta progression</p>${c2WeekLine(c2Week(V))}<p class="fine">Pour chaque point travaillé : ton niveau avant de commencer, et ton niveau sur tes 5 dernières parties au même poste.</p>
    <ul class="c2-prog-list">${rows.join("")}</ul>
    <p class="fine">Courbe : tes 30 dernières parties ; ligne grise, ton niveau de départ ; ligne orange, ta dernière cible. Sur 5 parties, un changement peut encore venir du hasard : c'est la tendance sur plusieurs cycles qui compte.</p></section>`;
}
const c2V1Fmt = (g, v) => (v == null ? "—" : g.unit === "%" ? `${Math.round(v * 100)} %` : (Math.round(v * 100) / 100).toString().replace(".", ","));

// Version en ligne sans clé Riot de production : ce que fera le coach, montré sur une vraie partie (captures de la version de test)
function c2Showcase() {
  return `<section class="c2-card c2-show">
    ${C2_PILOT ? `<p class="label">Aperçu</p>
    <h2 class="c2-show-title">Ce que le coach te montrera</h2>
    <p class="fine">Une fois dans le test, entre ton Riot ID : le coach lit tes parties classées. Voici ce qu'il te montrera, sur une vraie partie.</p>` : `<p class="label">Bientôt disponible</p>
    <h2 class="c2-show-title">La lecture de tes parties arrive dès la validation de la clé Riot</h2>
    <p class="fine">Le coach est prêt et testé. Il attend l'accord de Riot Games pour lire les parties de tout le monde. Voici ce qu'il te montrera, sur une vraie partie.</p>`}
    <figure><img src="coach-apercu-bilan${window.LANG === "en" ? "-en" : ""}.png" alt="Bilan d'une partie : Yone contre Viktor, victoire, 7/2/4, 258 sbires, et l'écart avec l'adversaire en phase de lane (+41 golds à 10 minutes, +677 à 15 minutes)" loading="lazy" width="358" height="338"><figcaption>Chaque partie résumée : tes chiffres et ta phase de lane face à ton adversaire.</figcaption></figure>
    <figure><img src="coach-apercu-replay${window.LANG === "en" ? "-en" : ""}.png" alt="Replay de la partie sur la minimap, arrêté sur un moment clé avec ce qui aurait été mieux" loading="lazy"><figcaption>Le replay sur la minimap s'arrête sur tes erreurs et explique ce qui aurait été mieux.</figcaption></figure>
    <ul class="c2-show-list"><li><b>Ta priorité</b> : l'erreur qui te coûte le plus de parties, avec quoi faire.</li><li><b>Je suis en partie</b> : ton face-à-face, des conseils contre ton adversaire et ton build adapté à son équipe.</li><li><b>Comparé aux meilleurs</b> : tout est mesuré face aux joueurs Diamant et plus de ton poste.</li></ul>
    <p class="fine">Déjà disponibles : le face-à-face et les fiches champions, dans les onglets Préparer et Champions.</p>
  </section>`;
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
    ${off ? c2Showcase() : `<form id="c2-connect" class="c2-form" novalidate>
      ${(() => { const [n, t] = switching ? ["", ""] : String(C2.account?.riotId || "").split("#"); return `<label class="field c2-f-name"><span>Pseudo</span><input name="gamename" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Pseudo" maxlength="40" value="${esc(n || "")}" required></label>
      <label class="field c2-f-tag"><span>Tag</span><span class="c2-tagbox"><span aria-hidden="true">#</span><input name="tagline" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="EUW" maxlength="5" value="${esc(t || "")}" required></span></label>`; })()}
      <label class="field c2-region"><span>Serveur</span><select name="platform">${C2_REGIONS.map(([v, l]) => `<option value="${v}" ${v === (C2.account?.platform || "euw1") ? "selected" : ""}>${l}</option>`).join("")}</select></label>
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
      ${c2TipOf(top) ? `<p class="c2-better"><b>Ce qu'il faut faire</b> ${esc(c2TipOf(top, role))}</p>` : ""}
      <p class="fine">D'après ton bilan sur ${S.games} parties (${c2Ago(S.at)})${S.more > 0 ? ` · ${S.more} autre${S.more > 1 ? "s" : ""} point${S.more > 1 ? "s" : ""} à travailler ensuite` : ""}.</p></section>`;
    if (S) return `<section class="c2-card c2-goal ok"><p class="label">Ta priorité · ${roleName}</p><h2 class="c2-goal-title">Aucune erreur qui revient</h2><p class="fine">Ton bilan sur ${S.games} parties (${c2Ago(S.at)}) ne trouve aucune erreur répétée : garde ce qui marche.</p>${picker(g.R.tally)}</section>`;
    return `<section class="c2-card c2-goal"><p class="label">Ta priorité · ${roleName}</p><h2 class="c2-goal-title">Trouve ce qui te coûte des parties</h2>
      <p class="fine">Tes bases sont au niveau (farm, morts, vision). Le coach peut maintenant relire une vingtaine de tes dernières parties en ${roleName} : combats, objectifs, morts. Il en tire ta priorité.</p>
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
      <span class="c2-g-res">${g.win ? (window.LANG === "en" ? "W" : "V") : (window.LANG === "en" ? "L" : "D")}</span></a></li>`).join("")}</ul>`;
}

// ---------- Partie en cours : face-à-face immédiat, objectif rappelé
function c2Live(p) {
  const l = c2ui.live;
  if (!l?.inGame) return `<div class="c2-livebar"><span class="fine">${c2ui.liveBusy ? "Recherche d'une partie en cours…" : l?.otherMode ? `Partie en cours en ${esc(l.otherMode)} : le coach ne suit que les parties 5 contre 5 sur la Faille.` : l ? "Aucune partie en cours." : ""}</span><button class="btn ghost sm" data-action="c2-live">${icon("play")}Je suis en partie</button></div>`;
  const mins = Math.max(0, Math.floor((l.length + (Date.now() - c2ui.liveAt) / 1000) / 60));
  const me = l.me, op = l.opponent;
  const opName = op ? c2Name(op.champion) : null;
  const tips = opName ? c2TipsFor(opName).against.slice(0, 3) : [];
  setTimeout(() => c2LoadPlan(me.champion, me.role), 0);
  const plan = c2ui.plan?.[`${me.champion}|${me.role}`]?.data;
  const g = p.goal && p.mainRole === me.role ? p.goal : null;
  const ORDER = ["top", "jungle", "mid", "bottom", "support"];
  const team = (list, side) => `<div class="c2-team ${side}">${[...list].sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role)).map(x => `<span class="c2-tm ${x.champion === me.champion && side === "ally" ? "me" : ""}">${c2Img(x.champion)}<i>${esc(C2_ROLE[x.role] || "")}${x.sure ? "" : "?"}</i></span>`).join("")}</div>`;
  return `<section class="c2-card c2-live">
    <p class="label"><span class="live-dot"></span>Partie en cours · ${esc(l.queue)} · ${mins} min</p>
    <div class="c2-duel compact">${c2Img(me.champion, "c2-av lg")}<p class="c2-live-title">${esc(c2Name(me.champion))} ${esc(C2_ROLE[me.role] || "")}${op ? `<span class="muted"> contre </span>${esc(opName)}` : ""}</p>${op ? c2Img(op.champion, "c2-av lg") : c2Img(null, "c2-av lg")}</div>
    ${!me.sure || (op && !op.sure) ? `<p class="fine">Rôles estimés : Riot ne les donne pas pendant la partie.</p>` : ""}
    ${g ? `<div class="c2-remind"><p class="label">Ton objectif</p><p><b>${esc(g.label)}</b> : ${g.better === "high" ? "au moins" : "au plus"} ${c2n(g.target)}${esc(g.unit)}</p></div>` : ""}
    ${c2PlanLive(plan, mins, me.champion)}
    ${tips.length ? `<div><p class="label">Coachs sur ce duel</p><ul class="c2-tiplist">${c2Tip(tips[0])}</ul>${tips.length > 1 ? `<details class="more c2-fold" data-fold="live-tips"${c2ui.fold?.["live-tips"] ? " open" : ""}><summary>${tips.length - 1} autre${tips.length > 2 ? "s" : ""} conseil${tips.length > 2 ? "s" : ""} contre ${esc(opName)}</summary><ul class="c2-tiplist">${tips.slice(1).map(c2Tip).join("")}</ul></details>` : ""}</div>` : ""}
    <div class="c2-live-teams">${team(l.allies, "ally")}${team(l.enemies, "enemy")}</div>
    ${c2LiveBuild(l.build, me.champion)}
    <div class="c2-actions"><a class="btn primary" href="${c2Href("draft")}" data-action="c2-draft-live">Compositions</a>
    ${op ? `<a class="btn ghost" href="${c2Href("face")}" data-action="c2-face-live" data-me="${esc(c2Name(me.champion))}" data-vs="${esc(opName)}">Face-à-face</a>` : ""}</div>
  </section>`;
}

// ---------- Plan de jeu d'un champion à un poste (mesuré sur les parties Diamant+, serveur du coach)
async function c2LoadPlan(champ, role) {
  const k = `${champ}|${role}`;
  if (!champ || !role || C2_API == null || c2ui.plan?.[k]) return;
  (c2ui.plan ||= {})[k] = { loading: true };
  try { c2ui.plan[k] = { data: await c2Fetch("plan", { champion: champ, role, name: c2Name(champ) }) }; } catch (e) { c2ui.plan[k] = { error: e.message }; }
  render(false);
}
// Minutes décimales en m:ss (3,9 → 3:54)
const c2Min = m => c2Clock(Math.round(m * 60) * 1000);
// Rythme : premier retour, backs avant 14 min, premier grand item (médiane et trois quarts)
function c2Rhythm(r) {
  if (!r) return "";
  const who = r.level === "champion" ? "ce champion à ce poste" : "ce poste";
  return `<div class="c2-rhythm">
    <div><b>${c2Min(r.firstBack.p50)}</b><span>1er back${r.firstBackGold ? `, avec environ ${c2n(Math.round(r.firstBackGold / 10) * 10)} or` : ""}</span></div>
    <div><b>×${c2n(r.backs14)}</b><span>backs avant 14 min</span></div>
    <div><b>${c2Min(r.legendaryMin.p50)}</b><span>1er grand item ; les trois quarts l'ont avant ${c2Min(r.legendaryMin.p75)}</span></div>
    <p class="fine">Diamant+ sur ${who} · ${c2n(r.n)} parties</p></div>`;
}
function c2PlanCard(champ, role) {
  if (C2_API == null) return ""; // version publiée sans serveur du coach : pas de plan
  setTimeout(() => c2LoadPlan(champ, role), 0);
  const res = c2ui.plan?.[`${champ}|${role}`];
  if (!res || res.loading) return `<div class="c2-card c2-loading">Plan de jeu…</div>`;
  if (res.error || !res.data) return "";
  const d = res.data;
  return `<section class="c2-card c2-plan"><p class="label">Ton plan sur ${esc(c2Name(champ))} ${esc(C2_ROLE[role] || "")}</p>
    ${d.lines.length ? `<ul class="c2-planlist">${d.lines.map(l => `<li>${esc(l.text)}</li>`).join("")}</ul>` : `<p class="fine">Pas encore assez de parties Diamant+ pour décrire un style propre à ce champion (${c2n(d.n)} parties, il en faut ${c2n(d.minGames || 80)} et des écarts nets).</p>`}
    ${d.rhythm ? `<p class="label">Ton rythme</p>${c2Rhythm(d.rhythm)}` : ""}
  </section>`;
}
// En partie : le prochain repère selon le chrono (Riot ne donne ni l'or ni les items), puis la ligne de plan la plus marquée
function c2PlanLive(d, mins, champ) {
  if (!d) return "";
  const r = d.rhythm;
  const next = !r ? null : mins < r.firstBack.p50 ? { at: r.firstBack.p50, what: "1er back" } : mins < r.legendaryMin.p75 ? { at: r.legendaryMin.p50, what: "1er grand item", note: `les trois quarts l'ont avant ${c2Min(r.legendaryMin.p75)}` } : null;
  const pct = next ? Math.min(100, Math.round(100 * mins / next.at)) : 0;
  return `${next ? `<div class="c2-next"><p class="label">Prochain repère</p><div class="c2-next-bar"><span style="width:${pct}%"></span></div>
      <p><b>${c2Min(next.at)}</b> · ${esc(next.what)}${next.note ? ` <span class="fine">(${esc(next.note)})</span>` : ""}</p>
      <p class="fine">Médiane des Diamant+ sur ${r.level === "champion" ? esc(c2Name(champ)) + " à ce poste" : "ce poste"}.</p></div>` : ""}
    ${d.lines.length ? `<div><p class="label">Ton plan</p><ul class="c2-planlist"><li>${esc(d.lines[0].text)}</li></ul>${d.lines.length > 1 ? `<details class="more c2-fold" data-fold="live-plan"${c2ui.fold?.["live-plan"] ? " open" : ""}><summary>${d.lines.length - 1} autre${d.lines.length > 2 ? "s" : ""} point${d.lines.length > 2 ? "s" : ""} du plan</summary><ul class="c2-planlist">${d.lines.slice(1).map(l => `<li>${esc(l.text)}</li>`).join("")}</ul></details>` : ""}</div>` : ""}`;
}

// ---------- Build pour la partie en cours : build habituel, puis ce qui change face à cette équipe adverse
function c2LiveBuild(b, champ) {
  if (!b?.core && !b?.threats?.length) return "";
  const V = b.ddVersion || COACH.ddragonVersion;
  const img = (id, label) => `<img src="https://ddragon.leagueoflegends.com/cdn/${esc(V)}/img/item/${esc(id)}.png" alt="" title="${esc(label)}" loading="lazy">`;
  const core = b.core ? `<div class="c2-brow"><span class="label">Build des Diamant+ sur ${esc(c2Name(champ))}${b.core.role ? ` ${esc(C2_ROLE[b.core.role] || b.core.role)}` : ""}</span>
      <div class="c2-icons">${[...b.core.items, ...b.core.boots].map(x => `<span class="c2-ic">${img(x.id, x.name)}<i>${x.share} %</i></span>`).join("")}</div>
      <p class="fine">${[...b.core.items, ...b.core.boots].map(x => esc(x.name)).join(" · ")}${b.core.keystone ? ` · rune ${esc(b.core.keystone.name)}` : ""}</p>
      <p class="fine">Pourcentage : part des parties Diamant+ où l'item est dans l'inventaire en fin de partie.</p></div>` : "";
  const threats = b.threats.map(t => {
    const list = t.measured?.items.length ? t.measured.items.map(x => `<li>${img(x.id, x.name)}<span><b>${esc(x.name)}</b><small>chez les Diamant+ : dans ${x.on} % des parties face à ce type d'équipe, contre ${x.off} % face aux autres</small></span></li>`).join("")
      : t.options.map(x => `<li>${img(x.id, x.name)}<span><b>${esc(x.name)}</b><small>option déjà jouée sur ${esc(c2Name(champ))} (${x.share} % des parties)</small></span></li>`).join("");
    return `<div class="c2-threat"><p><b>${esc(t.label)}</b> : ${esc(t.why)}${t.champions.length ? ` (${t.champions.map(c => esc(c2Name(c))).join(", ")})` : ""}.</p>
      ${list ? `<ul class="c2-swap">${list}</ul>` : `<p class="fine">Pas d'item de rechange repéré sur ${esc(c2Name(champ))} face à cette menace : garde ce build.</p>`}</div>`;
  }).join("");
  // Replié par défaut : le résumé montre les items et ce qu'il faut adapter, le détail s'ouvre au toucher
  const preview = b.core ? `<span class="c2-icons mini">${[...b.core.items, ...b.core.boots].slice(0, 5).map(x => img(x.id, x.name)).join("")}</span>` : "";
  const swaps = b.threats.reduce((n, t) => n + (t.measured?.items.length || t.options.length || 0), 0);
  return `<details class="more c2-fold c2-livebuild" data-fold="live-build"${c2ui.fold?.["live-build"] ? " open" : ""}><summary><span class="c2-fold-head"><span>Ton build pour cette partie</span>${preview}<span class="fine">${swaps ? `${swaps} item${swaps > 1 ? "s" : ""} à adapter face à cette équipe` : "Rien à adapter face à cette équipe"}</span></span></summary>${core}
    ${b.threats.length ? `<p class="label">À adapter face à cette équipe${b.shape ? ` · en moyenne ${b.shape.magic} % de dégâts magiques, ${b.shape.phys} % physiques (le reste : dégâts bruts, qui ignorent armure et résistance magique)` : ""}</p>${threats}` : `<p class="fine">Composition adverse sans menace marquée : garde ce build.</p>`}
    <p class="fine">Mesuré sur ${c2n(b.games)} parties Diamant+ de ce champion à ce rôle${b.core ? `, patch ${esc(c2Patch(b.core.patch))}` : ""}. « Dans X % face à ce type d'équipe » : comparé aux parties sans cette menace, et l'item y répond d'après sa description officielle. « Option déjà jouée » : item qui répond à la menace d'après sa description, sans mesure face à elle.</p></details>`;
}

// ---------- Ce que jouent les Diamant+ (items, runes, sorts), d'après de vraies parties
function c2Builds(id) {
  if (C2_API == null) return "";
  const s = c2ui.champ[id];
  if (!s) return s === null ? `<div class="c2-card c2-loading">Données Diamant+…</div>` : "";
  if (s.error) return "";
  if (!s.enough) return `<p class="note">${icon("info")}<span>Pas encore assez de parties Diamant+ pour ce champion au patch ${esc(c2Patch(s.patch || "—"))} (${s.games} sur ${s.minGames} nécessaires). L'échantillon grandit chaque jour.</span></p>`;
  return [s, ...(s.others || [])].filter(x => x.enough).map((x, i) => c2BuildRole(x, i === 0 ? s : null)).join("");
}
// Un bloc par rôle : les items d'un Pantheon support ne sont pas ceux d'un Pantheon top
function c2BuildRole(s, all) {
  const V = s.items[0]?.ddVersion || s.spells[0]?.ddVersion || COACH.ddragonVersion;
  const ic = (kind, file, label, share) => `<span class="c2-ic" title="${esc(label)} : ${share} % des parties"><img src="https://ddragon.leagueoflegends.com/cdn/${kind === "rune" ? "img" : `${esc(V)}/img/${kind}`}/${esc(file)}" alt="" loading="lazy"><i>${share} %</i></span>`;
  return `<section class="c2-card c2-builds">
    <p class="label">Ce que jouent les Diamant+ en ${esc(C2_ROLE[s.role] || s.role)} · patch ${esc(c2Patch(s.patch))}</p>
    <p class="fine">${s.games} parties · ${s.games >= 100 ? `${c2n(s.winrate)} % de victoires` : "taux de victoire non significatif sous 100 parties"}</p>
    ${all && all.roles.length > 1 ? `<p class="fine">Rôles joués : ${all.roles.map(r => `${esc(C2_ROLE[r.role] || r.role)} ${r.share} %`).join(", ")}</p>` : ""}
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
  if (r && (!r.tactics.kills || !(r.textVersion >= 4)) && C2_API != null && !(c2ui.refreshed ||= new Set()).has(id)) { c2ui.refreshed.add(id); setTimeout(() => c2LoadReview(id), 0); }
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
      <div class="c2-prow">${c2Img(s.champion, "c2-av lg")}<div><p class="c2-name">${esc(c2Name(s.champion))}${s.opponent ? ` <span class="muted">contre</span> ${esc(c2Name(s.opponent))}` : ""}</p><p class="fine">${esc(C2_ROLE[s.role] || "")} · ${Math.round(s.minutes)} min · patch ${esc(c2Patch(s.patch))}</p></div><span class="c2-res ${s.win ? "win" : "loss"}">${s.win ? "Victoire" : "Défaite"}</span></div>
      <div class="c2-stats"><div><span class="label">KDA</span><b class="c2-k">${s.k}/${s.d}/${s.a}</b></div><div><span class="label">Sbires</span><b class="c2-k">${s.cs}</b></div><div><span class="label">Par min</span><b>${String(Math.round((s.cs / Math.max(1, s.minutes)) * 10) / 10).replace(".", ",")}</b></div></div>
      ${r.lane.at10 ? `<div class="c2-lanebars"><p class="label">${s.role === "jungle" ? "Début de partie" : "Phase de lane"} · écart avec ${esc(vsName)}</p>${bar("Golds", 10, r.lane.at10.gold, 1000)}${r.lane.at10.cs != null ? bar(s.role === "jungle" ? "Sbires et monstres" : "Sbires", 10, r.lane.at10.cs, 20) : ""}${r.lane.at15 ? bar("Golds", 15, r.lane.at15.gold, 2000) : ""}${r.lane.at15 ? bar("XP", 15, r.lane.at15.xp, 1500) : ""}</div>` : ""}
    </section>
    <div class="filters">${seg("c2-gview", [["resume", "L'essentiel"], ["carte", "Replay"], ["details", "Chiffres"]], view, "Vue")}</div>
    ${view === "carte" ? c2Tactics(r, id) : view === "details" ? `${c2Timeline(r)}
      ${r.comparisons.length ? `<section class="sec"><div class="sec-head"><h2 class="sec-title">Toi face aux bons joueurs</h2></div><div class="c2-card">${r.comparisons.map(c2Bar).join("")}<p class="fine">Le point, c'est toi sur cette partie. La zone claire montre où se situe la moitié des joueurs Diamant et plus à ton poste, et le trait leur niveau habituel. Vert : mieux qu'eux ; rouge : en dessous.</p></div></section>` : ""}
      ${c2BuildCmp(r)}
      ${c2GameDraft(r, id)}` : `${c2Brief(r, id)}
      ${r.absent ? `<p class="note">${icon("alert")}<span>Pas de conseil sur cette partie : tu semblais absent (aucun kill ni assist, presque aucun dégât ni sbire). Elle ne compte pas dans tes objectifs ni dans ton bilan.</span></p>` : ""}
      ${r.absent ? "" : `<section class="sec"><div class="sec-head"><h2 class="sec-title">Ce qui a pesé</h2></div>
        ${r.findings.length ? r.findings.map((f, i) => `${i === 1 ? `<details class="more c2-card c2-more-f"><summary>Autres constats (${r.findings.length - 1})</summary>` : ""}<article class="c2-card c2-finding"><p class="label">Constat ${i + 1}</p><h3 class="c2-f-title">${esc(f.title)}</h3>${bullets(f.facts)}
          ${f.metric || C2_KIND_TIP[f.kind] ? `<details class="more"${i === 0 ? " open" : ""}><summary>Ce qu'il faut faire</summary>${C2_KIND_TIP[f.kind] || !f.metric ? `<p>${esc(c2TipOf(f, s.role))}</p>` : ""}${f.metric ? c2LessonsHtml(f.metric, s.role, s.champion, !C2_KIND_TIP[f.kind], f.kind) : ""}</details>` : ""}</article>${i && i === r.findings.length - 1 ? "</details>" : ""}`).join("") : `<p class="inline-empty">Aucun écart net avec la référence Diamant+ sur cette partie.</p>`}
      </section>`}
      ${c2Moment(r, id) || (r.tactics?.lessons?.length ? `<button class="c2-ready" data-action="c2-gview" data-id="carte">${icon("compass")}<span><b>${r.tactics.lessons.length} moment${r.tactics.lessons.length > 1 ? "s" : ""} clé${r.tactics.lessons.length > 1 ? "s" : ""} à revoir en replay</b><span class="fine">La partie rejouée sur la minimap, avec ce qui aurait été mieux</span></span>${icon("chevron")}</button>` : "")}`}
    <p class="fine c2-foot">${esc(r.note)}${r.benchmark ? ` Référence : ${c2n(r.benchmark.games)} parties ${esc(r.benchmark.level)}, patch ${esc(c2Patch(r.benchmark.patch))}.` : ""}</p>`;
}

// Moment à revoir (tour 4 du brainstorm GPT-6, 01/11) : « après ta mort » et « où la partie a basculé » réunis en UNE carte dans
// L'essentiel. Priorité : ta mort ou ton erreur suivie de la plus grosse perte (or d'équipe, objectifs, 2 min), sinon une erreur relevée,
// sinon la bascule d'or la plus forte contre ton équipe. Ce qui suit est montré comme une suite, jamais comme une cause certaine.
function c2Moment(r, id) {
  const T = r.tactics;
  if (!T?.map?.length || r.absent) return "";
  const errs = (T.lessons || []).filter(l => !l.review);
  const hit = errs.filter(l => l.effect).sort((a, b) => a.effect.gold - b.effect.gold || b.effect.lost.length - a.effect.lost.length)[0];
  const turn = [...(T.turns || [])].filter(x => x.gold < 0).sort((a, b) => a.gold - b.gold)[0];
  let m = null;
  if (hit || errs[0]) { const l = hit || errs[0]; m = { t: l.t, at: l.at, title: l.title, then: l.effect ? `Dans les 2 minutes qui ont suivi : ${l.effect.text}.` : "", better: l.better }; }
  else if (turn) m = { t: turn.t, at: turn.at, title: `La partie a basculé entre ${turn.at} et ${turn.to} : ${c2n(Math.abs(Math.round(turn.gold / 100) * 100))} golds d'écart perdus`, then: turn.what.length ? `Pendant ce temps : ${turn.what.join(" ; ")}.` : "", better: "" };
  if (!m) return "";
  const more = (T.lessons || []).length - (hit || errs[0] ? 1 : 0);
  return `<section class="c2-card c2-moment"><p class="label">Moment à revoir · ${esc(m.at)}</p><h3 class="c2-f-title">${esc(m.title)}</h3>
    ${m.then ? `<p>${esc(m.then)}</p>` : ""}${m.better ? `<p class="c2-better"><b>À retenir</b> ${esc(m.better)}</p>` : ""}
    <button class="btn sm" data-action="c2-moment" data-id="${esc(id)}" data-t="${m.t}">${icon("compass")} Revoir sur la minimap</button>
    <p class="fine">Ce qui suit un moment n'en est pas forcément la conséquence : le coach ne voit ni les décisions de ton équipe ni la carte entre deux relevés.${more > 0 ? ` ${more} autre${more > 1 ? "s" : ""} moment${more > 1 ? "s" : ""} dans le Replay.` : ""}</p></section>`;
}
// L'essentiel de la partie en quatre lignes : phase de lane, point clé, point fort, objectif
function c2Brief(r, id) {
  const s = r.summary, a = r.lane.at10, rows = [];
  if (a && r.lane.opponent) {
    const opp = r.lane.duo ? "le duo adverse" : esc(c2Name(r.lane.opponent)), who = r.lane.duo ? "ton duo a " : "";
    rows.push(a.gold >= 500 ? ["up", "Phase de lane", `gagnée : ${who}${c2n(a.gold)} golds d'avance sur ${opp} à 10 min`]
      : a.gold <= -500 ? ["down", "Phase de lane", `difficile : ${who}${c2n(-a.gold)} golds de retard sur ${opp} à 10 min`]
      : ["", "Phase de lane", `équilibrée face à ${opp === "le duo adverse" ? "au duo adverse" : opp} (${a.gold > 0 ? "+" : ""}${c2n(a.gold)} golds à 10 min)`]);
  }
  if (r.findings[0]) rows.push(["down", "À travailler", esc(r.findings[0].title)]);
  if (r.strengths[0]) rows.push(["up", "Point fort", esc(r.strengths[0])]);
  if (s.deadSeconds != null && s.deadSeconds / (r.duration || 1) >= 0.1) rows.push(["down", "Temps passé mort", `${Math.round(s.deadSeconds / 60)} min, soit ${Math.round((s.deadSeconds / r.duration) * 100)} % de la partie`]);
  // Pas de ligne « Ton objectif » ici : l'ancien moteur en proposait un autre que la carte « Mon objectif » (relecture du 31/10),
  // et le coach V1 n'en donne qu'un seul à la fois
  if (!rows.length) return "";
  return `<section class="c2-card c2-brief"><p class="label">En bref</p><ul>${rows.map(([k, t, x]) => `<li class="${k}"><b>${t}</b><span>${x}</span></li>`).join("")}</ul></section>`;
}
// Build du joueur face aux Diamant+ sur le même champion : des faits (parts), pas un jugement
function c2BuildCmp(r) {
  const b = r.build;
  if (!b || (!b.items.length && !b.keystone)) return "";
  const V = b.ddVersion || COACH.ddragonVersion;
  const it = x => `<span class="c2-ic ${x.share == null || x.share < 5 ? "rare" : ""}" title="${esc(x.name)} : ${x.share == null ? "hors des 30 items les plus joués par les Diamant+" : `${x.share} % des parties Diamant+`}"><img src="https://ddragon.leagueoflegends.com/cdn/${esc(V)}/img/item/${esc(x.id)}.png" alt="" loading="lazy"><i>${x.share == null ? "rare" : `${x.share} %`}</i></span>`;
  const rare = b.items.filter(x => x.share == null || x.share < 5);
  const k = b.keystone;
  return `<section class="sec"><div class="sec-head"><h2 class="sec-title">Ton build face aux Diamant+</h2></div><div class="c2-card c2-buildcmp">
    ${k ? `<div class="c2-brow"><span class="label">Rune clé</span><p class="c2-kline"><img src="https://ddragon.leagueoflegends.com/cdn/img/${esc(k.icon || "")}" alt="" loading="lazy"><span><b>${esc(k.name)}</b> : ${k.share == null ? "rare chez les Diamant+" : `${k.share} % des Diamant+`}${k.top ? `. La plus jouée : ${esc(k.top.name)} (${k.top.share} %)` : ", c'est la plus jouée"}</span></p></div>` : ""}
    ${b.items.length ? `<div class="c2-brow"><span class="label">Tes items terminés</span><div class="c2-icons">${b.items.map(it).join("")}</div><p class="fine">${b.items.map(x => esc(x.name)).join(" · ")}</p></div>` : ""}
    ${b.missing.length ? `<div class="c2-brow"><span class="label">${b.role ? `Très joués par les Diamant+ en ${esc(C2_ROLE[b.role] || b.role)}, absents chez toi` : "Très joués par les Diamant+, absents chez toi"}</span><div class="c2-icons">${b.missing.map(it).join("")}</div><p class="fine">${b.missing.map(x => esc(x.name)).join(" · ")}</p></div>` : ""}
    ${rare.length ? `<p class="fine">${rare.map(x => esc(x.name)).join(", ")} : rare chez les Diamant+ sur ${esc(c2Name(r.summary.champion))}${b.role ? ` ${esc(C2_ROLE[b.role] || b.role)}` : ""}. Ça peut être un bon choix selon la partie ; compare avec la fiche du champion.</p>` : ""}
    ${r.summary.patch && b.patch && r.summary.patch !== b.patch ? `<p class="note">${icon("info")}<span>Ta partie date du patch ${esc(c2Patch(r.summary.patch))}, la référence du patch ${esc(c2Patch(b.patch))} : les items ont pu changer entre-temps.</span></p>` : ""}
    <p class="fine">Part des parties Diamant+${b.role ? ` en ${esc(C2_ROLE[b.role] || b.role)}` : ""} (${c2n(b.games)} parties, patch ${esc(c2Patch(b.patch))}) où l'item est dans l'inventaire final. <a href="${c2Href("champions", r.summary.champion)}">Voir la fiche ${esc(c2Name(r.summary.champion))}</a></p>
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
  T.lessons.forEach((l, n) => L.push({ t: l.t, type: "lesson", key: true, n, title: l.title, text: l.better, facts: l.facts, at: l.at, review: !!l.review }));
  for (const d of T.deaths || []) L.push({ t: d.t, type: "death", key: true, mine: true, x: d.x, y: d.y, text: `Tu meurs (${d.zone}) : tué par ${c2Name(d.killer)}${d.attackers?.length > 1 ? `, ${d.attackers.length} adversaires sur toi` : ""}${d.alliesNear?.length ? "" : ", aucun allié autour"}` });
  for (const o of T.objectives) L.push({ t: o.t, type: "obj", key: true, good: o.ours, x: o.x, y: o.y, letter: (o.kind || "?")[0], text: `${o.kind} ${/^Larves/.test(o.kind) ? (o.ours ? "prises" : "perdues") : o.ours ? "pris" : "perdu"} : ${o.allies} contre ${o.enemies} autour${o.myDist > 6000 ? ", tu étais loin" : ""}` });
  for (const f of T.fights) L.push({ t: f.t, type: "fight", mine: f.me, good: f.won, x: f.x, y: f.y, text: `Combat ${f.zone} : ${f.allies} contre ${f.enemies}${f.won === true ? ", gagné" : f.won === false ? ", perdu" : ""}${f.me ? " (avec toi)" : ""}` });
  return [...L, ...c2GoalMoments(T)].sort((a, b) => a.t - b.t);
}
// Filtre « Mon objectif » (bloc D, 01/11) : seulement ce qui touche à l'objectif en cours, et la lecture s'arrête sur ces moments.
// Faits Riot uniquement : sbires et XP relevés chaque minute, heure et type de chaque ward (pas leur position : frise seulement).
const C2_FARM_WIN = { cs_at_10: [0, 10], cs_at_15: [0, 15], farm_15_25: [15, 25], cs_per_min: [0, 99] };
const C2_WARD_NAME = { CONTROL_WARD: "control ward", YELLOW_TRINKET: "ward (totem)", SIGHT_WARD: "ward", BLUE_TRINKET: "ward (lentille bleue)" };
function c2GoalMoments(T) {
  const g = c2ui.v1?.goal, M = T.mine;
  if (!g || !M) return [];
  const L = [], n = M.cs.length - 1, fmt = v => c2V1Fmt(g, v), unitCs = g.role === "JUNGLE" ? "sbires et monstres" : "sbires";
  const deaths = (a, b, why) => (T.deaths || []).filter(d => d.t >= a * 60000 && d.t < b * 60000).forEach(d => L.push({ t: d.t, type: "death", key: true, mine: true, goal: true, x: d.x, y: d.y, text: `Tu meurs (${d.zone}) : ${why}` }));
  const win = C2_FARM_WIN[g.metric];
  if (win) {
    const a = win[0], b = Math.min(win[1], n);
    const pace = g.metric === "cs_at_10" ? g.target / 10 : g.metric === "cs_at_15" ? g.target / 15 : g.target;
    // Minutes creuses : moins de la moitié du rythme de ta cible (les 2 premières minutes, sans sbires, ne comptent pas)
    for (let m = Math.max(a + 1, 3); m <= b; m++) {
      const got = M.cs[m] != null && M.cs[m - 1] != null ? M.cs[m] - M.cs[m - 1] : null;
      if (got != null && got < pace * 0.5) L.push({ t: m * 60000 - 30000, type: "cs", key: true, goal: true, text: `De ${m - 1}:00 à ${m}:00 : ${got} ${unitCs} (ta cible demande environ ${fmt(pace)} par minute)` });
    }
    deaths(a, b, "pas de farm jusqu'à ta réapparition");
    if (b === win[1] && M.cs[b] != null) L.push({ t: b * 60000, type: "check", key: true, goal: true, text: g.metric === "farm_15_25" ? `De 15:00 à 25:00 : ${fmt((M.cs[25] - M.cs[15]) / 10)} ${unitCs} par minute (ta cible : ${fmt(g.target)})` : `À ${b}:00 : ${M.cs[b]} ${unitCs} (ta cible : ${fmt(g.target)})` });
  } else if (g.metric === "xp_at_10") {
    deaths(0, 10, "pas d'expérience jusqu'à ta réapparition");
    if (n >= 10 && M.xp[10] != null) L.push({ t: 600000, type: "check", key: true, goal: true, text: `À 10:00 : ${M.xp[10]} XP (ta cible : ${fmt(g.target)})` });
  } else if (g.metric === "control_wards_20" || g.metric === "vision_per_min") {
    const ctrlOnly = g.metric === "control_wards_20", end = ctrlOnly ? 20 * 60000 : Infinity;
    const W = M.wards.filter(w => w.t < end && (!ctrlOnly || w.type === "CONTROL_WARD"));
    for (const w of W) L.push({ t: w.t, type: "ward", ctrl: w.type === "CONTROL_WARD", key: w.type === "CONTROL_WARD" || w.kill, goal: true, text: w.kill ? `Tu détruis une ${C2_WARD_NAME[w.type] || "ward"} adverse` : `Tu poses une ${C2_WARD_NAME[w.type] || "ward"}` });
    const placed = W.filter(w => !w.kill);
    if (ctrlOnly && n >= 20) L.push({ t: 20 * 60000, type: "check", key: true, goal: true, text: `À 20:00 : ${placed.length} control ward${placed.length > 1 ? "s" : ""} posée${placed.length > 1 ? "s" : ""} (ta cible : ${fmt(g.target)})` });
    if (!ctrlOnly) L.push({ t: n * 60000, type: "check", key: true, goal: true, text: `Fin de partie : ${placed.length} ward${placed.length > 1 ? "s" : ""} posée${placed.length > 1 ? "s" : ""}, ${W.length - placed.length} détruite${W.length - placed.length > 1 ? "s" : ""}` });
  } else if (g.metric === "objective_participation") {
    for (const o of T.objectives) L.push({ t: o.t, type: "obj", key: true, goal: true, good: o.ours, x: o.x, y: o.y, letter: (o.kind || "?")[0], text: `${o.kind} ${o.ours ? "pris" : "perdu"} : ${o.myDist < 4500 ? "tu étais là" : "tu étais loin"}` });
  }
  return L;
}
const C2_TF = [["all", "Tout"], ["me", "Mes moments"], ["fight", "Combats"], ["obj", "Objectifs"]];
const c2Keep = (m, f) => (f === "goal" ? !!m.goal : !m.goal && (f === "all" || (f === "me" ? m.mine || m.type === "lesson" : m.type === f)));
// Résumé affiché sous les filtres quand « Mon objectif » est choisi
function c2GoalNote(T) {
  const g = c2ui.v1?.goal, myRole = { top: "TOP", jungle: "JUNGLE", mid: "MIDDLE", bottom: "BOTTOM", support: "UTILITY" }[T.players.find(p => p.me)?.role];
  if (!g) return "";
  const wards = g.metric === "control_wards_20" || g.metric === "vision_per_min";
  return `<p class="fine c2-goalnote">Ton objectif : <b>${esc(g.label)}</b>, cible ${esc(c2V1Fmt(g, g.target))}.${myRole && myRole !== g.role ? ` Il concerne ton poste principal (${esc(C2_V1_ROLE[g.role] || g.role)}), pas celui de cette partie.` : ""} Seuls les moments qui le concernent sont affichés, et la lecture s'arrête dessus.${wards ? " Riot donne l'heure de chaque ward, pas l'endroit : elles sont sur la frise, pas sur la carte." : ""}</p>`;
}
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
  const lesson = f !== "goal" && L.find(m => m.type === "lesson" && t >= m.t - 40000 && t <= m.t + 20000);
  if (lesson) return `<div class="c2-now-lesson"><p class="label">${lesson.review ? "Situation à revoir" : "Moment clé"} · ${esc(lesson.at)}</p><p class="c2-now-title">${esc(lesson.title)}</p>${bullets(lesson.facts.slice(0, 2))}<p class="c2-better"><b>${lesson.review ? "La question à te poser" : "Ce qui aurait été mieux"}</b> ${esc(lesson.text)}</p></div>`;
  const near = L.filter(m => m.type !== "lesson" && c2Keep(m, f) && Math.abs(m.t - t) <= 30000);
  if (near.length) return `<ul class="c2-now-list">${near.map(m => `<li class="${m.type}${m.goal ? " goal" : ""}${m.good === true ? " won" : m.good === false ? " lost" : ""}"><b>${c2Clock(m.t)}</b> ${esc(m.text)}</li>`).join("")}</ul>`;
  return `<p class="fine">${f === "goal" ? "Rien sur ton objectif à cet instant. Lance la lecture ou saute au moment suivant." : "Rien de marquant à cet instant. Lance la lecture ou saute au moment clé suivant."}</p>`;
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
  const tf = c2GoalMoments(T).length ? [...C2_TF, ["goal", "Mon objectif"]] : C2_TF;
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
      ${marks.map(m => `<button class="c2-tl-m ${m.type}${m.good === true ? " won" : m.good === false ? " lost" : ""}${m.ctrl ? " ctrl" : ""}" style="left:${((m.t / dur) * 100).toFixed(2)}%" data-action="c2-tgo" data-id="${ID}" data-t="${m.t}" aria-label="${esc(c2Clock(m.t))} : ${esc(m.title || m.text)}" title="${esc(c2Clock(m.t))} · ${esc(m.title || m.text)}"></button>`).join("")}
    </div>
    <div class="c2-tl-axis fine"><span>0:00</span><span class="up">écart d'or : ton équipe devant ▲</span><span class="down">▼ derrière</span><span>${c2Clock(dur)}</span></div>
    <div class="c2-mctl">
      <button class="btn ghost sm icon-only" data-action="c2-tstep" data-id="${ID}" data-d="-1" aria-label="Moment clé précédent">${C2_SVG.prev}</button>
      <button class="btn primary sm c2-tplay" data-action="c2-tplay" data-id="${ID}">${playing ? `${C2_SVG.pause}Pause` : `${icon("play")}Lire`}</button>
      <button class="btn ghost sm icon-only" data-action="c2-tstep" data-id="${ID}" data-d="1" aria-label="Moment clé suivant">${C2_SVG.next}</button>
      <button class="btn ghost sm c2-tspeed" data-action="c2-tspeed" aria-label="Vitesse de lecture">×${speed}</button>
    </div>
    <div class="seg small" role="group" aria-label="Moments affichés">${tf.map(([k, l]) => `<button class="seg-btn" data-action="c2-tf" data-id="${ID}" data-f="${k}" aria-pressed="${f === k}">${l}</button>`).join("")}</div>
    ${f === "goal" ? c2GoalNote(T) : ""}
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
  const stops = c2Moments(T).filter(c2ui.tf?.[id] === "goal" ? m => m.goal && m.key : m => !m.goal && (m.type === "lesson" || m.type === "death")).map(m => m.t);
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
document.addEventListener("input", e => {
  if (e.target.name !== "gamename" || !e.target.value.includes("#")) return;
  const [n, t] = e.target.value.split("#"), tag = e.target.form?.elements.tagline;
  e.target.value = n; if (tag && t) { tag.value = t.trim().slice(0, 5); tag.focus(); }
});
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
      <div class="c2-tile ${S.deathsIsolated ? "down" : ""}"><span class="c2-k">${S.deathsIsolated}</span><span class="fine">${S.deathsIsolated > 1 ? "morts" : "mort"} seul face à plusieurs adversaires après 14 min</span></div>
      <div class="c2-tile ${S.deathsGank ? "down" : ""}"><span class="c2-k">${S.deathsGank}</span><span class="fine">morts sur un gank avant 14 min</span></div>
    </div>
    ${c2Turns(T, id)}
    ${T.lessons.length ? T.lessons.map(l => `<article class="c2-card c2-finding"><p class="label">À ${esc(l.at)}${l.review ? " · situation à revoir" : ""}</p><h3 class="c2-f-title">${esc(l.title)}</h3>${bullets(l.facts)}<p class="c2-better"><b>${l.review ? "La question à te poser" : "Ce qui aurait été mieux"}</b> ${esc(l.better)}</p><button class="btn ghost sm" data-action="c2-tgo" data-id="${esc(id)}" data-t="${l.t}">Revoir ce moment</button></article>`).join("")
      : `<p class="inline-empty">Pas de moment clé à revoir sur la minimap pour cette partie. Tes constats sont dans L'essentiel.</p>`}
    <details class="more c2-card"><summary>Tous les combats (${T.fights.length}) et interactions</summary>
      <ul class="c2-events">${T.fights.map(f => `<li><b>${f.at}</b> ${esc(f.zone)} · ${f.allies} contre ${f.enemies} · <span class="${f.won === true ? "up" : f.won === false ? "bad" : ""}">${f.won === true ? "gagné" : f.won === false ? "perdu" : "égal"}</span> (${f.enemiesDead} adversaire${f.enemiesDead > 1 ? "s" : ""} éliminé${f.enemiesDead > 1 ? "s" : ""}, ${f.alliesDead} allié${f.alliesDead > 1 ? "s" : ""}) · ${f.me ? "avec toi" : `sans toi (${f.myDist < 2500 ? "tu étais tout près" : f.myDist < 6000 ? "tu étais à quelques secondes" : f.myDist < 9000 ? "tu étais loin" : "tu étais à l'autre bout de la carte"})`} <button class="linkish" data-action="c2-tgo" data-id="${esc(id)}" data-t="${f.t}">revoir</button></li>`).join("")}</ul>
      ${chips(T.interactions.killedBy, "Ont participé le plus à tes morts (kills et aides)")}${chips(T.interactions.killed, "Tes kills et aides, par adversaire")}${chips(T.interactions.with, "Tes kills et aides avec")}
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
        ...r.bases.map(b => ({ t: b.t, html: `<b>${b.at}</b> ${b.afterDeath ? "Achats après la mort" : "Back"} : ${esc(b.items.join(", "))}${!b.afterDeath && b.goldBefore != null ? ` <span class="fine">(tu avais environ ${b.goldBefore} golds juste avant)</span>` : ""}` }))].sort((a, b) => a.t - b.t).map(e => `<li>${e.html}</li>`).join("")}</ul></details></div></section>`;
}

// ---------- Face-à-face et fiches champions (base du coach, sans compte)
// Les astuces de la fiche officielle (Data Dragon, « attention à son ultime ») sont trop évidentes pour le coach :
// elles ne restent que sur la fiche du champion (withRiot)
function c2TipsFor(name, withRiot = false) {
  const units = COACH.units.filter(u => ["exploitable", "provisoire"].includes(u.status) && u.usage !== "correction" && (withRiot || !u.id?.startsWith("u-dd-")));
  return {
    play: units.filter(u => u.champions?.includes(name) && !u.matchup),
    against: units.filter(u => u.matchup?.vs === name),
  };
}
// Conseils officiels Riot sur le site anglais : texte anglais de Data Dragon (Riot publie les mêmes conseils, dans le même ordre)
const C2_TIP_EN = {};
function c2TipText(u) {
  const fr = u.claim.replace(/^Contre [^:]+ : /, "");
  const m = window.LANG === "en" && u.id?.match(/^u-dd-(.+)-([ae])(\d+)$/);
  const champ = m && c2ChampList().find(c => c.id.toLowerCase() === m[1]);
  if (!champ) return fr;
  if (!(champ.id in C2_TIP_EN)) {
    C2_TIP_EN[champ.id] = null;
    fetch(`https://ddragon.leagueoflegends.com/cdn/${COACH.ddragonVersion}/data/en_US/champion/${champ.id}.json`).then(r => r.json())
      .then(j => { const x = j.data[champ.id]; C2_TIP_EN[champ.id] = { a: x.allytips, e: x.enemytips }; render(false); }).catch(() => {});
  }
  return C2_TIP_EN[champ.id]?.[m[2]]?.[m[3] - 1] || fr;
}
// Contexte d'usage d'un conseil de coach (analyse v2) : quand, pour qui, comment, pourquoi, à éviter
// Termes LoL expliqués au toucher (lexique en tête de ce fichier) : soulignés une fois par conseil
const c2Use = (u, used = new Set()) => (u.use?.when ? `<details class="c2-use"><summary>Quand l'utiliser · Comment</summary><p><b>Quand :</b> ${gloss(esc(u.use.when), used)}</p>${u.use.who ? `<p><b>Pour qui :</b> ${esc(u.use.who)}</p>` : ""}${u.use.how?.length ? `<ol>${u.use.how.map(h => `<li>${gloss(esc(h), used)}</li>`).join("")}</ol>` : ""}${u.use.why ? `<p><b>Pourquoi :</b> ${gloss(esc(u.use.why), used)}</p>` : ""}${u.use.notWhen ? `<p><b>À éviter :</b> ${gloss(esc(u.use.notWhen), used)}</p>` : ""}</details>` : "");
const c2Tip = (u, used = new Set()) => `<li class="c2-tip"><span>${gloss(esc(c2TipText(u)), (used = new Set()))}</span>${u.nuance ? `<p class="c2-nuance">${esc(u.nuance)}</p>` : ""}${c2Use(u, used)}<span class="fine">${u.nature === "officiel" ? "Riot Games" : esc(contentOf(u.evidence[0]?.content)?.author || "")}${u.status === "provisoire" ? " · provisoire" : ""}</span></li>`;
function c2VideosFor(name) {
  const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return COACH.contents.filter(c => c.type === "video" && ["fr", "en"].includes(c.lang) && (re.test(c.title) || c.champions?.includes(name)) && !(c.triage?.entertainment || []).length).slice(0, 4);
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
    <p class="fine c2-foot">Avis attribués de coachs et notes de patch, contrôlés avant publication ; les astuces de base de Riot sont sur la fiche du champion. Les statistiques de ce duel sont dans « Ma partie (draft) ».</p>`;
}

function c2Champions() {
  const q = c2ui.q.toLowerCase();
  const list = c2ChampList().filter(c => !q || c.name.toLowerCase().includes(q));
  // Tes champions d'abord, du plus joué au moins joué (ranked récentes du profil), puis tous les autres (demande d'Anthony, 01/11)
  const played = new Map();
  // Sans connexion au service (session du test privé expirée ou absente), pas de « Tes champions » : c'était le profil
  // gardé dans le navigateur, affiché à côté du formulaire de connexion
  for (const g of (C2_API != null && C2.profile?.games) || []) { const id = c2Id(g.champion) || g.champion, s = played.get(id) || { n: 0, w: 0 }; s.n++; s.w += g.win ? 1 : 0; played.set(id, s); }
  const mine = list.filter(c => played.has(c.id)).sort((a, b) => played.get(b.id).n - played.get(a.id).n || played.get(b.id).w - played.get(a.id).w);
  const cell = c => { const s = played.get(c.id); return `<a class="c2-champ" href="${c2Href("champions", c.id)}">${c2Img(c.id)}<span>${esc(c.name)}</span>${s ? `<span class="c2-champ-n">${s.n}&nbsp;partie${s.n > 1 ? "s" : ""}<br>${Math.round(100 * s.w / s.n)}&nbsp;%</span>` : ""}</a>`; };
  const rest = list.filter(c => !played.has(c.id));
  return `<label class="field"><span class="sr">Rechercher un champion</span><input id="c2-search" class="search" type="search" placeholder="Rechercher un champion" value="${esc(c2ui.q)}" autocomplete="off"></label>
    ${mine.length ? `<p class="label">Tes champions</p><p class="fine">Du plus joué au moins joué sur tes ${C2.profile.games.length} dernières ranked, avec ton taux de victoires.</p><div class="c2-grid">${mine.map(cell).join("")}</div>${rest.length ? `<p class="label">Tous les champions</p>` : ""}` : ""}
    <div class="c2-grid">${rest.map(cell).join("") || (mine.length ? "" : `<p class="fine">Aucun champion trouvé.</p>`)}</div>`;
}
// Toi sur ce champion (test privé, coach V1) : tes ranked récentes sur ce champion, poste par poste, comparées aux joueurs Diamant+
// qui jouent le même champion au même poste (demande d'Anthony, 31/10 : « expliquer comment toi, tu joues ce champion »)
function c2ChampMe(id) {
  const V = c2ui.v1 || {};
  if (C2_API == null) return "";
  // Venu directement sur l'onglet Champions : le coach n'a pas encore résolu le joueur, on le fait (une fois par session)
  if (!V.pid) { if (C2.account?.riotId) setTimeout(() => c2V1Load(), 0); return ""; }
  const D = (c2ui.champMe ||= {});
  if (!(id in D)) { D[id] = null; c2V1(`/players/${V.pid}/champion?name=${encodeURIComponent(id)}`).then(r => { D[id] = r; render(false); }).catch(() => { D[id] = { error: true }; render(false); }); }
  const d = D[id];
  if (!d) return `<section class="c2-card c2-loading"><span>Tes parties sur ${esc(c2Name(id))}<span class="c2-wait" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></span></section>`;
  if (d.error) return "";
  const name = esc(c2Name(id));
  if (!d.roles?.length) {
    const r = d.ref_only;
    return `<section class="c2-card c2-cme"><p class="label">Toi sur ${name}</p><p>Pas de ranked récente sur ${name} dans tes parties suivies par le coach.</p>${r ? `<p class="fine">Repères des joueurs ${esc(r.level)} sur ${name} ${c2AsRole(r.role)} (${c2n(r.n)} parties) :</p><ul class="c2-cme-ref">${r.rows.slice(0, 6).map(x => `<li><span>${esc(x.label)}</span><b>${esc(x.p50_text)}</b></li>`).join("")}</ul><p class="fine">Joue quelques parties avec ce champion : le coach comparera tes chiffres à ceux-là.</p>` : ""}</section>`;
  }
  const pick = D[`${id}:role`] && d.roles.find(r => r.role === D[`${id}:role`]) || d.roles[0];
  const tabs = d.roles.length > 1 ? `<div class="c2-cme-roles">${d.roles.map(r => `<button class="pill-btn${r === pick ? " on" : ""}" data-action="c2-cme-role" data-id="${esc(id)}" data-role="${esc(r.role)}">${esc(C2_V1_ROLE[r.role] || r.role)} · ${r.games}</button>`).join("")}</div>` : "";
  // Place du joueur parmi les Diamant+ du même champion : quart haut, moitié haute, moitié basse, quart bas (dans le sens de la métrique)
  const place = x => { const r = x.ref; if (!r) return null; const d = x.direction === "lower" ? -1 : 1, v = x.me;
    return d * (v - r.p75) >= 0 ? ["top", "comme le quart des meilleurs"] : d * (v - r.p50) >= 0 ? ["up", "dans la moitié haute"] : d * (v - r.p25) >= 0 ? ["mid", "dans la moitié basse"] : ["down", "sous le quart le plus bas"]; };
  const gap = x => { const r = x.ref; if (!r) return 0; const d = x.direction === "lower" ? -1 : 1, spread = Math.abs(r.p75 - r.p25) || 1; return d * (x.me - r.p50) / spread; };
  const rows = [...pick.rows].sort((a, b) => !!b.ref - !!a.ref || gap(a) - gap(b)).slice(0, 8);
  const few = pick.games < 5;
  const wr = Math.round(100 * pick.wins / pick.games);
  return `<section class="c2-card c2-cme"><p class="label">Toi sur ${name} ${c2AsRole(pick.role)}</p>${tabs}
    <div class="c2-cme-head"><div><b>${pick.games}</b><span class="fine">partie${pick.games > 1 ? "s" : ""} classée${pick.games > 1 ? "s" : ""} récente${pick.games > 1 ? "s" : ""}</span></div><div><b>${wr} %</b><span class="fine">de victoires (${pick.wins})</span></div>${pick.ref ? `<div><b>${c2n(pick.ref.winrate)} %</b><span class="fine">chez les ${esc(pick.ref.level)}</span></div>` : ""}</div>
    ${c2Path(id, { ...pick, rows })}
    ${pick.ref ? `<p class="label">Comparé aux joueurs ${esc(pick.ref.level)} sur ${name}</p>
    <ul class="c2-cme-rows">${rows.map(x => { const p = place(x); return `<li class="${p ? p[0] : ""}"><span class="c2-cme-k">${esc(x.label)}</span><span class="c2-cme-v"><b>${esc(x.me_text)}</b>${x.ref ? `<span class="fine">vs ${esc(x.ref.p50_text)}</span>` : ""}</span>${p ? `<span class="c2-cme-p">${p[1]}</span>` : ""}</li>`; }).join("")}</ul>
    <p class="fine">Toi : la médiane de tes ${pick.games} partie${pick.games > 1 ? "s" : ""} sur ${name} à ce poste. Eux : la médiane de ${c2n(pick.ref.n)} parties ${esc(pick.ref.level)} sur ${name} au même poste (EUW, Corée, Amérique du Nord). Les points les plus éloignés sont en haut.${few ? " Avec moins de 5 parties, c'est encore une indication, pas un verdict." : ""}</p>`
    : `<p class="fine">Pas encore assez de parties ${esc("Diamant+")} sur ${name} à ce poste pour un repère fiable (il en faut 200).</p>`}
  </section>`;
}
// Apprendre un champion sur 10 parties (tour 4 du brainstorm GPT-6, 01/11) : un cadre autour du coach, pas un deuxième objectif.
// Parties 1 à 5 sur ce champion à ce poste = ton point de départ (aucun jugement) ; 6 à 10 = ce qui a bougé, comparé à ce départ.
// Un seul apprentissage à la fois, gardé sur l'appareil par compte. Parties lues dans /matches (déjà servi par le Worker).
const C2_PATH_N = 10, C2_PATH_BASE = 5;
function c2PathGames() {
  const P = C2.path, V = c2ui.v1 || {};
  if (!P || !V.pid) return null;
  if (!c2ui.matches) { c2ui.matches = "busy"; c2V1(`/players/${V.pid}/matches`).then(r => { c2ui.matches = r.matches || []; render(false); }).catch(() => { c2ui.matches = []; }); }
  if (!Array.isArray(c2ui.matches)) return null;
  return c2ui.matches.filter(m => m.valid && m.champion === P.champ && m.role === P.role && m.start_ms > P.at).sort((a, b) => a.start_ms - b.start_ms).slice(0, C2_PATH_N);
}
function c2Path(id, pick) {
  const P = C2.path, name = esc(c2Name(id)), role = C2_V1_ROLE[pick.role] || pick.role;
  if (!P || P.champ !== id || P.role !== pick.role) {
    const other = P ? ` Remplace ton apprentissage de ${esc(c2Name(P.champ))}.` : "";
    return `<div class="c2-path"><button class="btn ghost sm" data-action="c2-v1-path-start" data-id="${esc(id)}" data-role="${esc(pick.role)}">Apprendre ${name} en ${esc(role)} sur 10 parties</button><p class="fine">Tes 5 premières parties fixent ton point de départ, les 5 suivantes montrent ce qui bouge. Ton objectif en cours ne change pas.${other}</p></div>`;
  }
  const games = c2PathGames();
  if (!games) return `<div class="c2-path c2-loading"><span>Ton apprentissage de ${name}…</span></div>`;
  const n = games.length;
  const dots = `<div class="c2-path-dots" role="img" aria-label="${n} parties sur ${C2_PATH_N}">${Array.from({ length: C2_PATH_N }, (_, i) => `<i class="${i < n ? "on" : ""}${i === C2_PATH_BASE ? " cut" : ""}"></i>`).join("")}</div>`;
  const head = `<p class="label">Apprentissage · partie ${Math.min(n, C2_PATH_N)}/${C2_PATH_N}</p>${dots}`;
  const stop = `<button class="linkish" data-action="c2-v1-path-stop">Arrêter l'apprentissage</button>`;
  if (n < C2_PATH_BASE) return `<div class="c2-path">${head}<p>${n ? `Encore ${C2_PATH_BASE - n} partie${C2_PATH_BASE - n > 1 ? "s" : ""} en ${esc(role)} sur ${name} pour fixer ton point de départ.` : `Joue ${name} en ${esc(role)} en ranked : chaque partie compte ici.`} Pas de jugement pendant cette phase.</p>${stop}</div>`;
  // Trois gestes au plus, un par famille (pas trois mesures du farm) : celui de ton objectif s'il s'applique ici, puis les plus
  // éloignés des Diamant+ sur ce champion (ordre de la fiche)
  const goal = c2ui.v1?.goal, rowsBy = Object.fromEntries(pick.rows.map(r => [r.metric, r]));
  // Famille donnée par le Worker (champ family) ; avant son redéploiement, déduite du nom de la mesure
  const fam = k => rowsBy[k]?.family || (/^cs_|farm/.test(k) || /^(Sbires|Farm)/.test(rowsBy[k]?.label || "") ? "farm" : k), seen = new Set();
  const keys = [...(goal && goal.role === P.role && rowsBy[goal.metric] ? [goal.metric] : []), ...pick.rows.map(r => r.metric)]
    .filter(k => !seen.has(fam(k)) && seen.add(fam(k))).slice(0, 3);
  const med = a => { const s = a.filter(v => v != null).sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
  const fmt = (r, v) => (v == null ? "—" : `${c2V1Fmt(r, v)}${r.unit && r.unit !== "%" ? ` ${r.unit === "/min" ? "/ min" : r.unit}` : ""}`);
  const done = n >= C2_PATH_N;
  const rows = keys.map(k => {
    const r = rowsBy[k], vals = games.map(g => g.metrics?.[k] ?? null), base = med(vals.slice(0, C2_PATH_BASE)), now = med(vals.slice(C2_PATH_BASE));
    // Écart lu sur la dispersion de tes 10 parties : 5 contre 5, c'est peu, donc seuil large (0,5) et toujours « à confirmer »
    const all = vals.filter(v => v != null), mid = med(all), sd = all.length >= 6 ? 1.4826 * med(all.map(v => Math.abs(v - mid))) : 0;
    const z = !done || base == null || now == null ? null : sd > 0 ? (r.direction === "lower" ? -1 : 1) * (now - base) / sd : now === base ? 0 : null;
    const [cls, word] = z == null ? ["", ""] : z >= 0.5 ? ["up", "mieux"] : z <= -0.5 ? ["down", "moins bien"] : ["", "pareil"];
    return `<li class="${cls}"><span class="c2-cme-k">${esc(r.label)}${k === goal?.metric ? ` <span class="fine">(ton objectif)</span>` : ""}</span><span class="c2-cme-v"><b>${esc(fmt(r, done ? now : base))}</b><span class="fine">${done ? `départ ${esc(fmt(r, base))}` : "ton départ"}</span></span>${word ? `<span class="c2-cme-p">${word}</span>` : ""}</li>`;
  });
  const txt = done ? `Tes parties 6 à 10 comparées à tes 5 premières sur ${name}. Sur 5 parties, un écart peut encore venir du hasard : c'est une tendance à confirmer.`
    : `Ton point de départ sur ${name} (médiane de tes 5 premières parties). Encore ${C2_PATH_N - n} partie${C2_PATH_N - n > 1 ? "s" : ""} pour voir ce qui bouge.`;
  return `<div class="c2-path">${head}<ul class="c2-cme-rows">${rows.join("")}</ul><p class="fine">${txt}</p>${done ? `<button class="btn ghost sm" data-action="c2-v1-path-stop">Terminer</button>` : stop}</div>`;
}
// Rappel dans Mon suivi : une ligne, pas une carte de plus
function c2PathLine() {
  const P = C2.path;
  if (!P) return "";
  const games = c2PathGames(), n = games ? games.length : null;
  return `<a class="c2-ready" href="${c2Href("champions", P.champ)}">${c2Img(P.champ, "c2-av xs")}<span><b>Apprentissage de ${esc(c2Name(P.champ))} en ${esc(C2_V1_ROLE[P.role] || P.role)}</b><span class="fine">${n == null ? "…" : n >= C2_PATH_N ? "Terminé : vois ce qui a bougé" : `Partie ${n}/${C2_PATH_N}${n < C2_PATH_BASE ? " · point de départ en cours" : ""}`}</span></span>${icon("chevron")}</a>`;
}
function c2Champion(id) {
  const name = c2Name(id);
  const t = c2TipsFor(name, true);
  const coaching = t.play.filter(u => u.nature !== "officiel");
  const official = t.play.filter(u => u.nature === "officiel");
  const vids = c2VideosFor(name);
  setTimeout(() => c2LoadChamp(id), 0);
  // Trois cartes visibles au plus (tour 4 : lisibilité) : toi sur ce champion, son build, puis les conseils repliés par thème
  const fold = (title, n, body, open = false) => `<details class="more"${open ? " open" : ""}><summary>${title}${n ? ` (${n})` : ""}</summary>${body}</details>`;
  return `<div class="c2-duel">${c2Img(id, "c2-av xl")}</div>${c2ChampMe(id)}${c2Builds(id)}
    <section class="c2-card c2-learn"><p class="label">Apprendre ${esc(name)}</p>
      ${coaching.length ? fold("Astuces de Riot et des coachs", coaching.length, `<ul class="c2-tiplist">${coaching.map(c2Tip).join("")}</ul>`, true) : ""}
      ${fold("Le jouer", official.length, official.length ? `<ul class="c2-tiplist">${official.map(c2Tip).join("")}</ul>` : `<p class="fine">Riot ne publie pas de conseils officiels pour ${esc(name)}. Des pages officielles sont en cours d'analyse.</p>`)}
      ${fold("L'affronter", t.against.length, t.against.length ? `<ul class="c2-tiplist">${t.against.map(c2Tip).join("")}</ul>` : `<p class="fine">Pas encore de conseil vérifié.</p>`)}
      ${vids.length ? fold("Vidéos", vids.length, c2VideoList(vids)) : ""}
    </section>
    <div class="sheet-actions"><a class="btn" href="${c2Href("face")}" data-action="c2-face-with" data-champ="${esc(name)}">Préparer un face-à-face</a></div>`;
}

// ---------- Statistiques Diamant+ de draft : taux de victoire toujours avec marge et nombre de parties
const C2_ORDER = ["top", "jungle", "mid", "bottom", "support"];
function c2Rate(r, short = false) {
  if (!r || !r.enough) return `<span class="c2-rate none">${r?.games ? `${r.games} partie${r.games > 1 ? "s" : ""} : pas assez` : "aucune donnée"}</span>`;
  return `<span class="c2-rate ${r.verdict === "favorable" ? "up" : r.verdict === "défavorable" ? "down" : ""}"><b>${c2n(r.winrate)} %</b>${short ? "" : ` <span class="fine">sur ${c2n(r.games)} parties${r.games < 100 ? ", chiffre encore incertain" : ""}</span>`}</span>`;
}
const C2_VERDICT = { favorable: "favorable", défavorable: "défavorable", équilibré: "équilibré" };
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
      <span class="c2-mu-stat">${c2Rate(l, true)}<span class="fine">${l.enough ? C2_VERDICT[l.verdict] : `${c2n(l.games)} parties`}</span></span></li>`).join("")}</ul>
      <p class="fine">Part des parties gagnées par le champion de ton équipe dans chaque duel, chez les joueurs Diamant et plus.</p></section>` : "";
  const BOT = { "support-bottom": "Ton support contre leur ADC", "bottom-support": "Ton ADC contre leur support", duo: "Votre duo ADC + support ensemble" };
  const bot = d.bot.length ? `<section class="c2-card"><p class="label">Bot lane à 2 contre 2</p><ul class="c2-mu">${d.bot.map(b => `<li><span class="c2-mu-role wide">${BOT[b.kind]}</span><span class="c2-mu-duel">${b.kind === "duo" ? `${c2Img(b.ally, "c2-av sm")}<span class="c2-vs-sep">+</span>${c2Img(b.enemy, "c2-av sm")}` : vsTxt(b.ally, b.enemy)}</span><span class="c2-mu-stat">${c2Rate(b)}</span></li>`).join("")}</ul></section>` : "";
  const me = d.me ? `<section class="c2-card"><p class="label">${esc(c2Name(d.me.c))} dans cette partie</p>
      <p class="fine">Tous rôles confondus : un champion peut profiter d'une composition sans dépendre de son vis-à-vis. Taux de victoire Diamant+ ${/^[AEIOUYÉÈÊaeiouy]/.test(c2Name(d.me.c)) ? "d'" : "de "}${esc(c2Name(d.me.c))} : ${c2Rate(d.me.overall)}</p>
      ${d.me.vs.length ? `<p class="label">Face à leurs champions</p><div class="c2-chiprow">${d.me.vs.map(x => `<span class="c2-cchip">${c2Img(x.c, "c2-av xs")}${c2Rate(x, true)}</span>`).join("")}</div>` : ""}
      ${d.me.with.length ? `<p class="label">Avec tes alliés</p><div class="c2-chiprow">${d.me.with.map(x => `<span class="c2-cchip">${c2Img(x.c, "c2-av xs")}${c2Rate(x, true)}</span>`).join("")}</div>` : ""}
    </section>` : "";
  const comp = (c, title) => `<div class="c2-comp"><p class="label">${title}</p>${c?.enough ? `<div class="c2-dmg" aria-label="Dégâts : ${c.dmg[0]} % physiques, ${c.dmg[1]} % magiques, ${c.dmg[2]} % bruts"><span class="ad" style="width:${c.dmg[0]}%"></span><span class="ap" style="width:${c.dmg[1]}%"></span><span class="tr" style="width:${c.dmg[2]}%"></span></div><ul>${c.notes.map(n => `<li>${esc(n.text)}</li>`).join("")}</ul>` : `<p class="fine">Pas assez de champions connus (${c?.known || 0} sur 3 au minimum).</p>`}</div>`;
  const comps = `<section class="c2-card"><p class="label">Compositions</p><div class="c2-comps">${comp(d.comps.allies, "Ton équipe")}${comp(d.comps.enemies, "Adversaires")}</div><p class="c2-legend fine"><span><i class="lg ad"></i>physiques</span><span><i class="lg ap"></i>magiques</span><span><i class="lg tr"></i>bruts</span></p></section>`;
  // Conseils vérifiés de la base pour ton duel
  const tips = myLane ? c2TipsFor(c2Name(myLane.enemy)).against.slice(0, 3) : [];
  const kb = tips.length ? `<section class="c2-card"><p class="label">Coachs sur le duel contre ${esc(c2Name(myLane.enemy))}</p><ul class="c2-tiplist">${tips.map(c2Tip).join("")}</ul></section>` : "";
  // Verdict en une phrase : si tous les écarts tiennent dans la marge, rien ne départage les champions du pool
  const sure = d.pool.filter(x => x.vsComp?.enough);
  const spread = sure.length > 1 ? Math.max(...sure.map(x => x.vsComp.winrate)) - Math.min(...sure.map(x => x.vsComp.winrate)) : null;
  // Écart entre le premier et le dernier comparé à la marge de leur différence (les deux marges se combinent)
  const even = spread != null && spread <= Math.hypot(sure[0].vsComp.margin, sure.at(-1).vsComp.margin);
  const verdict = !compact && sure.length > 1 ? `<div class="c2-verdict"><p><b>${even ? `Tes ${sure.length} champions se valent face à cette équipe.` : `${esc(c2Name(sure[0].c))} s'en sort le mieux face à cette équipe.`}</b></p>
      <p>${even ? `Chez les Diamant+, leurs taux de victoire face à cette composition vont de ${c2n(Math.min(...sure.map(x => x.vsComp.winrate)))} à ${c2n(Math.max(...sure.map(x => x.vsComp.winrate)))} %, dans la marge d'erreur. Prends celui que tu maîtrises le mieux.` : `Chez les Diamant+ : ${c2n(sure[0].vsComp.winrate)} % face à cette composition, contre ${c2n(sure.at(-1).vsComp.winrate)} % pour ${esc(c2Name(sure.at(-1).c))}.`}</p></div>` : "";
  const pool = !compact && d.pool.length ? `${verdict}<section class="c2-card"><p class="label">Mes champions dans cette partie</p><ul class="c2-mu">${d.pool.map((x, i) => `<li class="${i === 0 && (x.lane?.enough || x.vsComp?.enough) ? "me" : ""}"><span class="c2-mu-duel">${c2Img(x.c, "c2-av sm")}<b>${esc(c2Name(x.c))}</b></span>
      <span class="c2-mu-stat">${c2Rate(x.vsComp, true)}<span class="fine">face à leur équipe${x.lane?.enough ? ` · duel ${c2n(x.lane.winrate)} %` : ""}</span></span></li>`).join("")}</ul>
      <p class="fine">Classés du plus sûr au moins sûr. Sans assez de parties, aucun champion n'est mis en avant.</p></section>` : "";
  const plan = !compact && d.me ? c2PlanCard(d.me.c, myRole) : "";
  return `${pool}${plan}${lanes}${bot}${me}${kb}${comps}<p class="fine c2-foot">Statistiques sur ${c2n(d.games)} parties classées Diamant+ (EUW) des ${d.days} derniers jours. Sous ${d.minGames} parties, le coach ne donne pas de verdict.</p>`;
}

// ---------- Préparer ma partie : draft (saisie libre ou partie en cours), pool de champions
function c2Draft() {
  const D = (C2.draft ||= { role: c2Role(C2.profile || {}) || "mid", allies: {}, enemies: {} });
  const role = D.role;
  const pool = (C2.pool ||= {})[role] || [];
  const names = c2ChampList();
  // Une case par champion ; la case choisie reçoit la recherche (deux lettres suffisent avec la liste)
  const sel = c2ui.slot || { side: "enemies", role };
  const slot = (side, r) => { const c = D[side][r], me = side === "allies" && r === role, on = sel.side === side && sel.role === r;
    return `<button type="button" class="c2-pslot${me ? " me" : ""}${on ? " on" : ""}" data-action="c2-slot" data-side="${side}" data-role="${r}" aria-pressed="${on}" aria-label="${side === "allies" ? (me ? "Toi" : "Ton") : "Leur"} ${esc(C2_ROLE[r])}${c ? ` : ${esc(c2Name(c))}` : ""}">${c ? c2Img(c, "c2-av") : `<span class="c2-pempty">${me ? "toi" : "+"}</span>`}<span>${esc(C2_ROLE[r])}</span></button>`; };
  const step = D.allies[role] ? 2 : 1;
  const params = { me: D.allies[role] ? `${role}:${D.allies[role]}` : "", allies: c2Pick(D.allies), enemies: c2Pick(D.enemies), pool: pool.join(",") };
  const key = JSON.stringify(params);
  const any = Object.keys(D.allies).length + Object.keys(D.enemies).length + pool.length;
  if (any && C2_API != null) setTimeout(() => c2LoadDraft(key, params), 0);
  const res = c2ui.draft?.[key];
  return `<datalist id="c2-champs">${names.map(c => `<option value="${esc(c.name)}">`).join("")}</datalist>
    <div class="c2-prepsteps" aria-label="Étapes"><span class="${step === 1 ? "on" : ""}">1 · Choisir</span><span class="${step === 2 ? "on" : ""}">2 · Mon plan</span><span>3 · En partie</span></div>
    <form id="c2-draft" class="c2-card" novalidate>
      <div class="c2-roles" role="group" aria-label="Mon rôle">${C2_ORDER.map(r => `<button type="button" class="pill-btn ${r === role ? "on" : ""}" data-action="c2-draft-role" data-role="${r}" aria-pressed="${r === role}">${esc(C2_ROLE[r])}</button>`).join("")}</div>
      <p class="label c2-foe">Leur équipe</p><div class="c2-prow">${C2_ORDER.map(r => slot("enemies", r)).join("")}</div>
      <p class="label">Mon équipe</p><div class="c2-prow">${C2_ORDER.map(r => slot("allies", r)).join("")}</div>
      <div class="c2-slotq"><input id="c2-slotq" list="c2-champs" autocomplete="off" enterkeyhint="done" aria-label="Champion pour la case choisie" placeholder="${sel.side === "allies" ? (sel.role === role ? "Ton champion" : `Ton ${esc(C2_ROLE[sel.role])}`) : `Leur ${esc(C2_ROLE[sel.role])}`} : tape 2 lettres…">${D[sel.side][sel.role] ? `<button type="button" class="btn ghost sm" data-action="c2-slot-clear">Retirer</button>` : ""}</div>
      <p class="fine">Touche une case puis tape le champion. Tout est facultatif : chaque champion ajouté affine le conseil. <button type="button" class="linkish" data-action="c2-draft-clear">Tout effacer</button></p>
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
  if (d?.games >= 3) c2ui.report.savedAt = c2HabitSave(params.champion ? `champ:${params.champion}` : params.role, d);
  if (d?.games >= 3 && params.role) {
    const m = d.minus[0];
    (C2.reports ||= {})[params.role] = { at: Date.now(), games: d.games, top: m ? { title: m.title, kind: m.kind, metric: m.metric, detail: m.detail } : null, more: d.minus.length - 1 };
    c2Save();
  }
  render(false);
}
// Évolution des habitudes (bloc D, 01/11 : « prouver la progression ») : chaque bilan est gardé sur l'appareil (6 derniers par sujet)
// et comparé à un bilan précédent qui porte sur au moins 5 parties différentes. Les nombres viennent des titres du bilan
// (« dans X parties sur Y », « N % de la partie ») ; un point qui disparaît est seulement passé sous le seuil d'affichage.
const c2HabitNums = t => { const m = /(\d+) parties sur (\d+)/.exec(t); if (m) return { hits: +m[1], pool: +m[2] }; const p = /^(\d+) %/.exec(t); return p ? { pct: +p[1] } : {}; };
const c2HabitTitle = t => (/^\d+ % de la partie passés mort/.test(t) ? "Temps passé mort (part de la partie)" : t.replace(/ dans \d+ parties sur \d+$/, ""));
const c2HabitIds = d => [...new Set([...(d.matchups || []).map(m => m.id), ...d.minus.flatMap(m => m.games || [])])];
function c2HabitSave(key, d) {
  const L = ((C2.habitLog ||= {})[key] ||= []), ids = c2HabitIds(d);
  const items = d.minus.map(m => ({ kind: m.kind, title: c2HabitTitle(m.title), family: m.family || "decision", ...c2HabitNums(m.title) }));
  const last = L[L.length - 1];
  // Même bilan rechargé (mêmes parties) : on remplace au lieu d'empiler
  if (last && last.ids.length === ids.length && ids.every(id => last.ids.includes(id))) { Object.assign(last, { items }); c2Save(); return last.at; }
  L.push({ at: Date.now(), games: d.games, ids, items }); L.splice(0, Math.max(0, L.length - 6)); c2Save();
  return L[L.length - 1].at;
}
function c2HabitTrend(key, d, savedAt) {
  const L = (C2.habitLog?.[key] || []).filter(x => x.at !== savedAt);
  if (!L.length) return "";
  const ids = c2HabitIds(d), fresh = x => ids.filter(id => !x.ids.includes(id)).length;
  const prev = [...L].reverse().find(x => fresh(x) >= 5);
  const date = x => new Date(x.at).toLocaleDateString(window.LANG === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long" });
  if (!prev) return `<p class="note">${icon("info")}<span>Ton bilan précédent (${date(L[L.length - 1])}) portait presque sur les mêmes parties. Joue au moins 5 nouvelles parties pour voir comment tes habitudes évoluent.</span></p>`;
  const now = d.minus.map(m => ({ kind: m.kind, title: c2HabitTitle(m.title), ...c2HabitNums(m.title) }));
  const share = x => (x.pool ? x.hits / x.pool : x.pct != null ? x.pct / 100 : null);
  const rows = [];
  for (const x of now) {
    const p = prev.items.find(y => y.kind === x.kind);
    if (!p) { rows.push(["new", x.title, "nouveau : n'apparaissait pas dans ton bilan précédent"]); continue; }
    const a = share(p), b = share(x), txt = v => (v.pool ? `${v.hits} parties sur ${v.pool}` : `${v.pct} %`);
    // Seuil : 15 points d'écart (et 2 parties de plus ou de moins), sinon c'est « à peu près pareil » (20 parties, c'est peu)
    const moved = a != null && b != null && Math.abs(b - a) >= 0.15 && (!x.pool || Math.abs(x.hits - p.hits) >= 2);
    rows.push([moved ? (b < a ? "down" : "up") : "same", x.title, `${txt(p)} → ${txt(x)} : ${moved ? (b < a ? "en baisse" : "en hausse") : "à peu près pareil"}`]);
  }
  for (const p of prev.items) if (!now.some(x => x.kind === p.kind)) rows.push(["gone", p.title, "n'apparaît plus : il revient dans moins de parties qu'avant"]);
  if (!rows.length) return "";
  const n = fresh(prev);
  return `<section class="c2-card c2-htrend"><p class="label">Tes habitudes depuis le ${date(prev)}</p>
    <ul class="c2-htrend-list">${rows.map(([c, t, v]) => `<li class="h-${c}"><b>${esc(t)}</b><span class="fine">${esc(v)}</span></li>`).join("")}</ul>
    <p class="fine">Comparé à ton bilan du ${date(prev)} : ${n} partie${n > 1 ? "s" : ""} nouvelle${n > 1 ? "s" : ""} depuis. Sur une vingtaine de parties, un petit écart peut venir du hasard : seuls les écarts nets sont marqués en hausse ou en baisse.</p></section>`;
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
  // Un titre par nœud de texte : i18n.js traduit chaque titre seul (sinon « Then : » suivi de titres restés en français)
  const list = a => a.map(x => `<span>${esc(x)}</span>`).join(" · "), colon = window.LANG === "en" ? ":" : " :";
  return `<section class="c2-card c2-plan"><p class="label">Synthèse du coach · ${champ ? esc(c2Name(champ)) : esc(C2_ROLE[role])} · ${d.winsReviewed ?? d.wins} victoire${(d.winsReviewed ?? d.wins) > 1 ? "s" : ""} sur les ${d.games} parties relues</p>
      <h2 class="c2-goal-title">${top.length ? `À corriger en priorité : ${esc(short(top[0].title).replace(/^./, c => c.toLowerCase()))}` : "Aucun point faible récurrent : garde ce qui marche"}</h2>
      ${top.length ? `<p class="c2-better"><b>Ce qu'il faut faire</b> ${esc(c2TipOf(top[0], role) || top[0].detail)}</p>` : ""}
      ${top.length > 1 ? `<p class="fine"><b>Ensuite</b>${colon} ${list(top.slice(1).map(m => short(m.title)))}.</p>` : ""}
      ${d.plus.length ? `<p class="fine"><b>Tes forces</b>${colon} ${list(d.plus.map(x => x.title))}.</p>` : ""}
    </section>`;
}
// Vue « Profil » : indicateurs tactiques, adversaires à préparer, plan de session
function c2Profile(d, best) {
  const t = d.tactical;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
  const foes = [...(t?.nemesis || []).map(x => ({ c: x.champion, why: `adverse, présent sur ${x.n} de tes morts` })), ...(d.rivals || []).filter(o => o.wins * 2 < o.games).map(o => ({ c: o.opponent, why: `${o.wins} victoire${o.wins > 1 ? "s" : ""} sur ${o.games} en duel` }))].filter((x, i, a) => a.findIndex(y => y.c === x.c) === i).slice(0, 4);
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
      <li><b>Après chaque partie</b> : ouvre son bilan et vérifie ta priorité.</li>
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
  const dots = list => list?.length ? `<div class="c2-dots"><span class="fine">Parties concernées (touche une pastille pour l'ouvrir) :</span>${list.map(gid => `<a class="c2-dot" href="${c2Href("partie", gid)}" title="Voir la partie"></a>`).join("")}</div>` : "";
  const view = ["travailler", "forces", "profil", "champions"].includes(c2ui.bview) ? c2ui.bview : "travailler";
  const body = view === "forces"
    ? (d.plus.length ? `<ul class="c2-plus">${d.plus.map(x => `<li><b>${esc(x.title)}</b>${x.detail ? `<span class="fine">${esc(x.detail)}</span>` : ""}</li>`).join("")}</ul>` : `<p class="inline-empty">Aucun point fort ne revient encore dans assez de parties pour être affiché.</p>`)
    : view === "profil" ? c2Profile(d, best)
    : view === "champions" ? `<ul class="c2-games">${d.champions.map(c => `<li><div class="c2-game ${c.wins * 2 >= c.games ? "win" : "loss"}">${c2Img(c.champion)}<span class="c2-g-main"><b>${esc(c2Name(c.champion))}</b><span class="fine">${c.games} partie${c.games > 1 ? "s" : ""} · ${c.wins} victoire${c.wins > 1 ? "s" : ""}</span></span><span class="c2-g-kda"><b>${c.k}/${c.d}/${c.a}</b><span class="fine">KDA ${c2n(c.kda)}</span></span><span></span></div></li>`).join("")}</ul>
      ${d.rivals?.length ? `<section class="sec">${secHead("Adversaires rencontrés plusieurs fois")}<div class="c2-chiprow">${d.rivals.map(o => `<span class="c2-cchip">${c2Img(o.opponent, "c2-av xs")}${esc(c2Name(o.opponent))} : ${o.wins}/${o.games}</span>`).join("")}</div></section>` : ""}`
    : (d.minus.length ? [["decision", "Ce qui t'a coûté des parties", "Des erreurs qui font souvent perdre la partie où elles arrivent."], ["niveau", "Les habitudes des bons joueurs qui te manquent", "Plus rares chez les Diamant et plus : à travailler dans le temps, partie après partie."]].map(([fam, title, sub]) => {
        const list = d.minus.filter(m => (m.family || "decision") === fam);
        return list.length ? `<section class="sec">${secHead(title)}<p class="fine">${sub}</p>${list.map(m => `<article class="c2-card c2-finding ${fam}"><h3 class="c2-f-title">${esc(m.title)}</h3><p class="fine">${esc(m.detail)}</p>${m.evidence ? `<p class="c2-evidence">${esc(m.evidence)}</p>` : ""}${dots(m.games)}
        <details class="more"><summary>Ce qu'il faut faire</summary>${C2_KIND_TIP[m.kind] || !m.metric ? `<p>${esc(c2TipOf(m, role))}</p>` : ""}${m.metric ? c2LessonsHtml(m.metric, role, d.champions[0]?.champion, !C2_KIND_TIP[m.kind], m.kind) : ""}</details></article>`).join("")}</section>` : "";
      }).join("") : `<p class="inline-empty">Aucun point faible qui revient dans plusieurs parties.</p>`);
  return `${pick}
    ${c2Synthesis(d, { role, champ })}
    ${c2HabitTrend(champ ? `champ:${champ}` : role, d, R.savedAt)}
    <div class="filters">${seg("c2-bview", [["travailler", "À travailler", d.minus.length || null], ["forces", "Forces", d.plus.length || null], ["profil", "Profil"], ["champions", "Champions"]], view, "Vue")}</div>
    ${body}
    <p class="fine c2-foot">${esc(d.note)}</p>`;
}

// ---------- Événements
document.addEventListener("submit", e => {
  if (e.target.id === "c2-pilot-auth") {
    e.preventDefault();
    const fd = new FormData(e.target), email = String(fd.get("email") || "").trim(), password = String(fd.get("password") || "");
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) { c2ui.pilot.error = "E-mail valide et mot de passe de 8 caractères au moins."; render(false); return; }
    const signup = c2ui.pilot.mode === "signup";
    c2PilotRun(async () => {
      const j = await c2SbAuth(signup ? "signup" : "token?grant_type=password", { email, password });
      if (!j.access_token) throw new Error("Compte créé : confirme ton e-mail puis connecte-toi.");
      c2Session = c2SessionFrom(j); c2SessionSave();
      await c2PilotCheck();
    });
  }
  if (e.target.id === "c2-pilot-join") {
    e.preventDefault();
    const fd = new FormData(e.target), code = String(fd.get("code") || "").trim();
    if (!code || !fd.get("age") || !fd.get("consent")) { c2ui.pilot.error = "Entre le code, confirme ton âge et accepte les conditions."; render(false); return; }
    c2PilotRun(async () => {
      const r = await fetch(`${C2_PILOT.api}/api/v1/pilot/join`, { method: "POST", headers: { ...(await c2AuthHeaders()), "Content-Type": "application/json" }, body: JSON.stringify({ code, age_confirmed: true, consent_version: C2_CONSENT }) }).catch(() => null);
      const j = r ? await r.json().catch(() => ({})) : {};
      if (!r?.ok) throw new Error(j.error?.message || "Le service du coach ne répond pas : réessaie dans quelques minutes.");
      await c2PilotCheck();
    });
  }
  if (e.target.id === "c2-connect") {
    e.preventDefault();
    const fd = new FormData(e.target);
    // Trois cases (demande d'Anthony, 01/11) : pseudo, tag, serveur. Un « Pseudo#TAG » collé dans la case pseudo est aussi accepté.
    let name = String(fd.get("gamename") || "").trim(), tag = String(fd.get("tagline") || "").trim().replace(/^#/, "");
    if (name.includes("#")) { const [n, t] = name.split("#"); name = n.trim(); tag ||= t.trim(); }
    const msg = e.target.querySelector(".form-msg");
    if (!/^.{3,16}$/.test(name)) { msg.textContent = "Pseudo attendu : de 3 à 16 caractères, tel qu'il apparaît dans le client."; return; }
    if (!/^[A-Za-z0-9]{2,5}$/.test(tag)) { msg.textContent = "Tag attendu : 2 à 5 lettres ou chiffres, sans le #. Il est visible dans le client, sous ton pseudo (par exemple EUW)."; return; }
    const id = `${name}#${tag}`;
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
  if (a.dataset.action === "c2-pilot-mode") { c2ui.pilot = { mode: c2ui.pilot?.mode === "signup" ? "login" : "signup" }; render(false); }
  // Déconnexion volontaire du test privé : le profil gardé dans le navigateur est oublié aussi (appareil partagé)
  if (a.dataset.action === "c2-pilot-out") { c2Session = null; c2SessionSave(); C2.account = null; C2.profile = null; C2.reviews = {}; c2Save(); C2_API = null; c2ui.pilot = { mode: "login" }; c2ui.v1 = {}; render(false); }
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
  const D = C2.draft, q = form.querySelector("#c2-slotq"), id = q?.value.trim() ? c2Id(q.value.trim()) : null;
  if (!id) return;
  const sel = c2ui.slot || { side: "enemies", role: D.role };
  D[sel.side][sel.role] = id;
  // Case suivante : d'abord les adversaires, puis ton équipe, en sautant les cases remplies
  const order = [...C2_ORDER.map(r => ["enemies", r]), ...C2_ORDER.map(r => ["allies", r])];
  const next = order.find(([s, r]) => !D[s][r]);
  c2ui.slot = next ? { side: next[0], role: next[1] } : sel;
  c2Save(); render(false);
  setTimeout(() => document.getElementById("c2-slotq")?.focus(), 0);
}
document.addEventListener("change", e => { if (e.target.id === "c2-slotq") c2DraftRead(e.target.closest("#c2-draft")); });
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
  if (act === "c2-moment") { const mid = a.dataset.id; (c2ui.tt ||= {})[mid] = Math.max(0, Number(a.dataset.t) - 8000); c2ui.gview = "carte"; c2ui.gviewFor = mid; render(false); requestAnimationFrame(() => document.getElementById(`c2-rp-${mid}`)?.scrollIntoView({ block: "start" })); }
  if (act === "c2-gview") { c2ui.gview = a.dataset.id; c2ui.gviewFor = decodeURIComponent(location.hash.split("/").pop()); render(false); window.scrollTo({ top: 0 }); }
  if (act === "c2-game-role") { c2ui.gameRole = a.dataset.id; render(false); }
  if (act === "c2-prep") { c2ui.prep = a.dataset.id; render(false); }
  if (act === "c2-bview") { c2ui.bview = a.dataset.id; render(false); }
  if (act === "c2-draft-role") { D.role = a.dataset.role; c2Save(); render(false); }
  // Bilan général : sujet (rôle ou champion), nouvel essai
  if (act === "c2-report-role") { c2ui.reportRole = a.dataset.id || a.dataset.role; c2ui.reportChamp = null; render(false); }
  if (act === "c2-report-champ") { const c = a.dataset.id || a.dataset.c; c2ui.reportChamp = c2ui.reportChamp === c ? null : c; render(false); }
  if (act === "c2-report-retry") { c2ui.report = null; render(false); }
  if (act === "c2-draft-clear") { D.allies = {}; D.enemies = {}; c2ui.slot = null; c2Save(); render(false); }
  if (act === "c2-slot") { c2ui.slot = { side: a.dataset.side, role: a.dataset.role }; render(false); setTimeout(() => document.getElementById("c2-slotq")?.focus(), 0); }
  if (act === "c2-slot-clear" && c2ui.slot) { delete D[c2ui.slot.side][c2ui.slot.role]; c2Save(); render(false); }
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

document.addEventListener("click", async e => {
  const a = e.target.closest?.("[data-action^=c2-v1-]");
  if (!a) return;
  const V = (c2ui.v1 ||= {});
  if (a.dataset.action === "c2-v1-sync") c2V1Load(true);
  if (a.dataset.action === "c2-v1-rel" || a.dataset.action === "c2-v1-side") {
    const F = ((V.fb ||= {})[a.dataset.id] ||= { side: [] });
    F.comment = document.querySelector(`.c2-v1-comment[data-id="${CSS.escape(a.dataset.id)}"]`)?.value || F.comment;
    if (a.dataset.n) F.relevance = +a.dataset.n;
    if (a.dataset.k) F.side = F.side.includes(a.dataset.k) ? F.side.filter(x => x !== a.dataset.k) : [...F.side, a.dataset.k];
    V.fbOpen = true; render(false);
  }
  if (a.dataset.action === "c2-v1-fb-send" && V.pid) {
    const F = V.fb?.[a.dataset.id] || {}, comment = document.querySelector(`.c2-v1-comment[data-id="${CSS.escape(a.dataset.id)}"]`)?.value.trim() || null;
    try {
      const r = await c2V1(`/players/${V.pid}/goals/${a.dataset.id}/feedback`, "POST", { relevance: F.relevance ?? null, side_effects: F.side || [], comment });
      const h = V.history?.find(x => x.id === a.dataset.id); if (h) h.feedback = r.feedback;
    } catch (err) { V.error = err.message; }
    render(false);
  }
  if (a.dataset.action === "c2-v1-erase" || a.dataset.action === "c2-v1-erase-no") { V.erase = a.dataset.action === "c2-v1-erase"; render(false); }
  if (a.dataset.action === "c2-v1-erase-yes" && V.pid && !V.busy) {
    try { await c2V1(`/players/${V.pid}`, "DELETE"); c2ui.v1 = { deleted: C2.account?.riotId }; } catch (err) { V.error = err.message; V.erase = false; }
    render(false);
  }
  if (a.dataset.action === "c2-v1-restart") { c2ui.v1 = {}; c2V1Load(true); }
  if (a.dataset.action === "c2-v1-path-start") { C2.path = { champ: a.dataset.id, role: a.dataset.role, at: Date.now() }; c2ui.matches = null; c2Save(); render(false); }
  if (a.dataset.action === "c2-v1-path-stop") { C2.path = null; c2Save(); render(false); }
  if (a.dataset.action === "c2-cme-role") { (c2ui.champMe ||= {})[`${a.dataset.id}:role`] = a.dataset.role; render(false); }
  if (a.dataset.action === "c2-v1-win-ok") { (C2.wins ||= {})[a.dataset.id] = Date.now(); c2Save(); render(false); }
  if (a.dataset.action === "c2-v1-start" && V.pid) {
    c2Burst(a);
    try { V.goal = (await c2V1(`/players/${V.pid}/goals/${a.dataset.id}/start`, "POST")).goal; V.evaluations = []; } catch (err) { V.error = err.message; }
    render(false);
  }
});
document.addEventListener("toggle", e => { const k = e.target?.dataset?.fold; if (k) (c2ui.fold ||= {})[k] = e.target.open; }, true);
