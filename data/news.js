// Données de la maquette, collectées et vérifiées manuellement le 20/10/2026.
// À terme, ce fichier sera généré automatiquement par le serveur de collecte.

const UPDATED_AT = "2026-10-20";

const GAMES = [
  { id: "lol", name: "League of Legends", color: "#c89b3c" },
  { id: "val", name: "Valorant", color: "#ff4655" },
  { id: "cs2", name: "CS2", color: "#f5a524" },
  { id: "fn", name: "Fortnite", color: "#9d4dff" },
  { id: "rl", name: "Rocket League", color: "#1e90ff" },
  { id: "fc", name: "EA FC 27", color: "#2bd67b" },
];

// Statuts de fiabilité
const STATUS = {
  "confirme": { label: "Confirmé", help: "Source officielle ou au moins 2 sources indépendantes concordantes." },
  "media": { label: "Source unique fiable", help: "Un média reconnu, pas encore recoupé." },
  "non-confirme": { label: "Non confirmé", help: "Fuite, prédiction ou source peu fiable. À prendre avec recul." },
  "contradictoire": { label: "Sources contradictoires", help: "Les sources ne sont pas d'accord : on montre les deux versions." },
};

const TYPES = {
  patch: "Patchnote",
  esport: "Esport",
  meta: "Méta & stratégie",
  annonce: "Annonce",
};

const ITEMS = [
  // ---------- League of Legends ----------
  {
    game: "lol", type: "patch", date: "2026-10-07", status: "confirme",
    image: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Smolder_0.jpg",
    title: "Patch 26.20 — le patch des Worlds",
    summary: "Dernier patch utilisé aux Worlds 2026. Riot se dit satisfait de la méta actuelle : changements ciblés.",
    points: [
      "Buffs : Lillia, Diana, Neeko, Smolder, Vayne",
      "Nerfs : Ashe et Yunara (trop fortes en bot lane)",
      "Objets : Hexplate expérimental et Ouragan de Runaan nerfés ; Ceinture-fusée retravaillée (plus de dégâts sur l'actif, moins de hâte)",
      "Replays : uniquement vos propres parties, fin du téléchargement par les sites tiers (sécurité anti-triche)",
    ],
    analysis: "Ashe et Yunara nerfées → la bot lane s'ouvre pour Smolder et Vayne (buffées). Bon moment pour les sortir en ranked avant que tout le monde s'adapte.",
    warnings: ["Date : un article indique le 6 octobre, le wiki officiel et Liquipedia le 7 octobre."],
    sources: [
      { name: "Wiki LoL officiel", url: "https://wiki.leagueoflegends.com/en-us/V26.20", kind: "officiel" },
      { name: "Liquipedia", url: "https://liquipedia.net/leagueoflegends/Patch_26.20", kind: "communaute" },
      { name: "Dot Esports", url: "https://dotesports.com/league-of-legends/guides/lol-patch-26-20-notes", kind: "media" },
    ],
  },
  {
    game: "lol", type: "esport", date: "2026-10-19", status: "confirme",
    title: "Karmine Corp sort des Play-In et rejoint la phase suisse",
    summary: "Pour leur première participation aux Worlds, les Français battent MVK Esports (LCP) en finale des Play-In. C'est la seule équipe des Play-In à passer.",
    points: [
      "MVK avait battu FURIA deux fois (3–0 puis 3–1) avant de tomber contre KC",
      "Cloud9 éliminé à la 19e place sans gagner une seule série",
      "Phase suisse à 16 équipes dès le 23 octobre à Allen (Texas)",
    ],
    sources: [
      { name: "Dot Esports", url: "https://dotesports.com/league-of-legends/news/karmine-corp-beat-mvk-worlds-2026-play-ins", kind: "media" },
      { name: "Yahoo Sports", url: "https://sports.yahoo.com/articles/worlds-2026-play-ins-karmine-035747243.html", kind: "media" },
      { name: "esports.gg — hub Worlds", url: "https://esports.gg/guides/league-of-legends/worlds-2026-hub/", kind: "media" },
    ],
  },
  {
    game: "lol", type: "esport", date: "2026-10-15", status: "media",
    title: "Worlds 2026 : c'est parti, T1 remet son titre en jeu",
    summary: "19 équipes qualifiées après le dernier qualificatif du CBLOL le 3 octobre. Cashprize annoncé : 5 M$.",
    points: [
      "Répartition : LCK 4, LPL 4, LEC 3, LCS 3, LCP 3, CBLOL 2",
      "Play-in à Los Angeles, phase suisse et élimination directe au Texas",
      "Finale annoncée le 14 novembre à Brooklyn (New York)",
    ],
    warnings: ["Lieux et dates finales proviennent d'une seule source : en attente de recoupement avec LoL Esports officiel."],
    sources: [
      { name: "esports.ru", url: "https://esports.ru/league-of-legends/news/vse-uchastniki-league-of-legends-world-championship-2026/", kind: "media" },
      { name: "rdy.gg", url: "https://rdy.gg/pt/lol/news/league-of-legends-lol-worlds-2026-details", kind: "media" },
    ],
  },
  // ---------- Valorant ----------
  {
    game: "val", type: "esport", date: "2026-10-18", status: "confirme",
    title: "LOUD champion du monde : premier double vainqueur de l'histoire des Champions",
    summary: "LOUD bat Team Vitality 3–1 en finale des Champions Shanghai 2026. Après 2022, l'équipe brésilienne devient la première à remporter deux fois les Champions.",
    points: [
      "Tournoi du 24 septembre au 18 octobre, Mercedes-Benz Arena (Shanghai)",
      "MVP : Roberto « erde » Lobos (LOUD)",
      "Vitality (EMEA) battue en finale par une équipe des Amériques pour la 2e année de suite",
    ],
    sources: [
      { name: "THESPIKE.GG", url: "https://www.thespike.gg/valorant/news/loud-wins-valorant-champions-2026/9043", kind: "media" },
      { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/2026_Valorant_Champions", kind: "communaute" },
    ],
  },
  {
    game: "val", type: "meta", date: "2026-09-15", status: "media",
    title: "Méta pro VCT 2026 : Omen, Neon et Sova au sommet",
    summary: "Sur le Stage 2, ce sont les agents les plus joués dans les trois régions (EMEA, Amériques, Pacifique).",
    points: [
      "Top picks : Omen, Neon, Sova (Neon nettement moins jouée en EMEA)",
      "Les moins joués : Tejo, Brimstone, Veto",
      "Masters Santiago : noyau Yoru / Viper / Omen ; la compo Omen-Viper-Yoru-Neon-Fade a cartonné",
    ],
    analysis: "Omen est la valeur sûre en ranked (présent dans toutes les méta de l'année). Le choix de la map compte autant que celui de l'agent : apprenez 2-3 agents par map plutôt qu'un seul main.",
    sources: [
      { name: "THESPIKE.GG — Stage 2", url: "https://www.thespike.gg/valorant/news/vct-stage-2-2026-agent-pick-rate-pacific-emea-americas/8814", kind: "media" },
      { name: "THESPIKE.GG — Santiago", url: "https://www.thespike.gg/valorant/news/viper-and-yoru-still-on-top-analysing-the-agent-meta-at-valorant-masters-santiago/7796", kind: "media" },
    ],
  },
  {
    game: "val", type: "patch", date: "2026-09-22", status: "confirme",
    title: "Patch 13.06 : nouveau fusil Warden et maîtrise des agents",
    summary: "Annoncé par GFinity avant les notes officielles, puis confirmé à la sortie : le fusil Warden et le système de maîtrise des agents sont bien arrivés.",
    warnings: ["GFinity annonçait une sortie les 15-16 septembre ; les notes officielles sont parues le 22 septembre."],
    sources: [
      { name: "Notes officielles Valorant", url: "https://playvalorant.com/fr-fr/news/game-updates/valorant-patch-notes-13-06", kind: "officiel" },
      { name: "Dexerto", url: "https://www.dexerto.com/valorant/valorant-adds-warden-rifle-and-agent-mastery-in-13-06-update-3409273/", kind: "media" },
      { name: "GFinity", url: "https://www.gfinityesports.com/article/valorant-patch-13-06", kind: "media" },
    ],
  },

  // ---------- CS2 ----------
  {
    game: "cs2", type: "patch", date: "2026-10-08", status: "contradictoire",
    title: "Mise à jour CS2 : reload de l'AUG raccourci",
    summary: "Une mise à jour du 8 octobre réduit le temps de rechargement de l'AUG de 0,5 s.",
    points: [
      "Icône de ping sur les kits de désamorçage lâchés",
      "Rechargement de l'AUG : −0,5 s",
      "Correction du son du Desert Eagle lors d'un rechargement silencieux",
      "Corrections de collisions sur les maps du mode Rush",
    ],
    analysis: "Si c'est confirmé, l'AUG devient plus jouable dans les retakes et les échanges longs côté CT. À tester en deathmatch avant de l'acheter en match officiel.",
    warnings: ["Un autre site décrit une mise à jour du 2 octobre au contenu différent (gants dans le menu d'achat, fonction « photobooth » introuvable ailleurs). Notes officielles Steam non encore trouvées."],
    sources: [
      { name: "TalkEsport", url: "https://www.talkesport.com/news/cs2/cs2-update-aug-reload-defuse-kit-ping/", kind: "media" },
      { name: "Timesaver (douteux)", url: "https://timesaver.gg/news/cs2-update-today-latest-patch-notes", kind: "suspect" },
      { name: "Actus Steam CS2", url: "https://store.steampowered.com/news/app/730", kind: "officiel" },
    ],
  },
  {
    game: "cs2", type: "esport", date: "2026-11-25", status: "confirme",
    title: "PGL Major Singapore : premier Major en Asie du Sud-Est",
    summary: "Deuxième Major CS2 de 2026, du 25 novembre au 13 décembre. 32 équipes, 1,25 M$.",
    points: [
      "Trois phases suisses, puis les playoffs",
      "Finales du 10 au 13 décembre au Singapore Indoor Stadium",
      "Liste des équipes : en attente de la fin des qualifications",
    ],
    sources: [
      { name: "The Kallang (lieu officiel)", url: "https://thekallang.com.sg/events/pgl-major-singapore-2026", kind: "officiel" },
      { name: "Sheep Esports", url: "https://www.sheepesports.com/articles/cs2-the-second-2026-major-will-be-organized-by-pgl-in-singapore/en", kind: "media" },
      { name: "esports.net", url: "https://www.esports.net/news/counter-strike/pgl-announces-cs2-major-singapore-2026-first-major-in-southeast-asia", kind: "media" },
    ],
  },

  {
    game: "cs2", type: "esport", date: "2026-10-18", status: "media",
    title: "FURIA remporte le Thunderpick World Championship",
    summary: "Victoire 3–2 contre BetBoom en finale à Malte (14–18 octobre). Une semaine plus tôt, Vitality gagnait l'ESL Pro League S24 3–0 face à MOUZ.",
    warnings: ["Une seule source détaillée pour le score de la finale de Malte : à recouper avec HLTV."],
    sources: [
      { name: "esports.gg", url: "https://esports.gg/news/counter-strike-2/cs2-thunderpick-world-championship-2026-results/", kind: "media" },
      { name: "BLAST.tv — EPL S24", url: "https://blast.tv/cs/tournaments/esl-pro-league-season-24-2026", kind: "media" },
    ],
  },

  // ---------- Fortnite ----------
  {
    game: "fn", type: "patch", date: "2026-10-15", status: "media",
    title: "v42.40 : dernière mise à jour de la saison « Override »",
    summary: "Chapitre 7 Saison 4 (lancée le 20 août avec la v42.00). La prochaine mise à jour, v43.00, est prévue le 31 octobre.",
    points: [
      "Fin de saison : 31 octobre ou 1er novembre selon la région",
      "v43.00 : annoncée sur la roadmap pour le 31 octobre",
    ],
    warnings: ["Mini-saison et Chapitre 8 : uniquement des fuites et dataminings. Rien de confirmé par Epic."],
    sources: [
      { name: "Dexerto", url: "https://www.dexerto.com/fortnite/when-is-the-next-fortnite-update-2453773/", kind: "media" },
      { name: "Beebom", url: "https://beebom.com/when-is-the-next-fortnite-update/", kind: "media" },
      { name: "Timesaver (fuites)", url: "https://timesaver.gg/blog/fortnite-next-season-mini-season-or-chapter-8", kind: "suspect" },
    ],
  },
  {
    game: "fn", type: "esport", date: "2026-09-27", status: "non-confirme",
    title: "FNCS Global Championship 2026 à Anvers",
    summary: "Le championnat du monde FNCS était annoncé les 26 et 27 septembre à Anvers, après des finales du Major 2 avancées aux 1er et 2 août.",
    warnings: ["Source unique, résultats non trouvés : à recouper avec le site compétitif d'Epic."],
    sources: [
      { name: "dotgg.gg", url: "https://dotgg.gg/?p=40028", kind: "media" },
    ],
  },

  // ---------- Rocket League ----------
  {
    game: "rl", type: "esport", date: "2026-09-20", status: "confirme",
    title: "Team Falcons champion du monde RLCS après un 4–0 sur Spacestation",
    summary: "Premier titre mondial pour Falcons, et première équipe de la région MENA à gagner les Worlds. Le tout après un long parcours en lower bracket.",
    points: [
      "Finale : Falcons 4–0 Spacestation Gaming, sans perdre un seul match",
      "Demi-finale : Falcons 4–2 Karmine Corp",
      "MVP : Kiileerrz ; 2e titre mondial pour dralii",
      "1v1 : nass remporte le titre contre Nwpo",
      "Dickies Arena (Fort Worth, Texas), 15–20 septembre, 20 équipes, 1,2 M$",
    ],
    sources: [
      { name: "Sheep Esports", url: "https://www.sheepesports.com/en/articles/team-falcons-dismantle-spacestation-gaming-to-win-the-rlcs-2026-world-championship/en", kind: "media" },
      { name: "GINX", url: "https://www.ginx.tv/en/rlcs-2026-world-champions", kind: "media" },
      { name: "esports.gg", url: "https://esports.gg/news/rocket-league/rlcs-2026-world-championship-finals-overview-results/", kind: "media" },
      { name: "Rocket League (officiel)", url: "https://www.rocketleague.com/news/2026-rocket-league-world-championship-primer", kind: "officiel" },
    ],
  },

  // ---------- EA FC 27 ----------
  {
    game: "fc", type: "patch", date: "2026-10-01", status: "contradictoire",
    title: "Première mise à jour FC 27 : correctifs, pas de rééquilibrage",
    summary: "EA confirme qu'aucun changement important d'équilibrage n'aura lieu dans les premières mises à jour.",
    points: [
      "8 corrections de bugs, 2 réglages",
      "Seul réglage gameplay : vitesse du jockey en Gameplay Authentique (Carrière et Coup d'envoi), pas en Ultimate Team",
      "Correctif du ping élevé limité à The Grounds",
    ],
    analysis: "La méta d'Ultimate Team ne bougera pas tout de suite : c'est le bon moment pour investir dans votre équipe et maîtriser la défense manuelle.",
    warnings: ["Numéro de version différent selon les sources : 1.04, 1.00.004 ou 1.0.1. Date exacte non confirmée."],
    sources: [
      { name: "MP1st", url: "https://mp1st.com/?p=315234", kind: "media" },
      { name: "Operation Sports", url: "https://www.operationsports.com/fc-27-patch-1-04-arrives-tomorrow-patch-notes/", kind: "media" },
      { name: "Timesaver", url: "https://timesaver.gg/blog/fc-27-update-1-0-1-patch-notes-what-ea-didnt-fix", kind: "media" },
    ],
  },
  {
    game: "fc", type: "meta", date: "2026-09-03", status: "confirme",
    title: "Méta FC 27 : la défense manuelle reprend le pouvoir",
    summary: "D'après les notes officielles d'EA après la bêta fermée, les changements de gameplay visent à récompenser le skill du joueur plutôt que l'IA.",
    points: [
      "Défense manuelle buffée, tacles automatiques de l'IA fortement nerfés",
      "Appels de balle offensifs plus intelligents",
      "Nerfs de plusieurs PlayStyles",
    ],
    analysis: "Le « laisser défendre l'IA » ne marche plus : entraînez le jockey et le placement. En attaque, exploitez les appels de balle avec des passes en profondeur au bon timing.",
    warnings: ["Un site annonce aussi des nerfs du pressing d'équipe et du PlayStyle Bruiser, mais il vend des crédits FC (conflit d'intérêts) : non retenu tant qu'EA ne le confirme pas."],
    sources: [
      { name: "EA (officiel)", url: "https://www.ea.com/games/ea-sports-fc/fc-27/news/fc-27-closed-beta-feedback-update", kind: "officiel" },
      { name: "FUT.GG", url: "https://www.fut.gg/news/the-5-biggest-gameplay-changes-coming-to-ea-fc-27/", kind: "media" },
      { name: "MMOexp (vend des crédits)", url: "https://www.mmoexp.com/News/ea-fc-27-closed-beta-pitch-notes-major-gameplay-changes-meta-adjustments-revealed.html", kind: "suspect" },
    ],
  },
];

const UPCOMING = [
  { date: "2026-10-21", game: "lol", label: "Patch 26.21 (selon le calendrier, notes pas encore publiées)" },
  { date: "2026-10-23", game: "lol", label: "Worlds : début de la phase suisse (date à confirmer)" },
  { date: "2026-10-31", game: "fn", label: "Mise à jour v43.00 et fin de la saison Override" },
  { date: "2026-11-14", game: "lol", label: "Finale des Worlds à Brooklyn (date à confirmer)" },
  { date: "2026-11-25", game: "cs2", label: "Début du PGL Major Singapore" },
];
