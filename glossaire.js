// Lexique LoL (décision d'Anthony, 27/10/2026) : le coach garde le vocabulaire des joueurs (back, wave, freeze…) et l'explique
// au toucher. Un terme est souligné en pointillé ; un clic ouvre une bulle courte. Seule la première apparition d'un terme
// dans un texte est soulignée, pour ne pas surcharger. Les définitions restent simples, comme à un joueur qui débute.

const GLOSSARY = [
  ["back", /\b(?:backs?|backe[nrsz]?t?|recall)\b/i, "Back", "Retourner à la base (touche B) pour acheter des items et récupérer ses PV et son mana."],
  ["wave", /\bwaves?\b/i, "Wave", "Groupe de sbires qui arrive dans chaque lane toutes les 30 secondes."],
  ["freeze", /\bfreez\w*/i, "Freeze", "Garder la wave au même endroit, près de sa tourelle, en ne tuant que le strict nécessaire : l'adversaire doit s'avancer, loin de sa tourelle, pour farmer."],
  ["slowpush", /\bslow ?push\w*/i, "Slow push", "Laisser grossir sa wave en tuant peu de sbires adverses, pour qu'elle arrive énorme sur la tourelle adverse."],
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
