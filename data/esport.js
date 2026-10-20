// Résultats de matchs et classements, vérifiés le 20/10/2026.
// Score inconnu → sa/sb à null et "winner" indique le vainqueur.

const EVENTS = [
  {
    game: "val", name: "Valorant Champions 2026", place: "Shanghai", dates: "24 sept – 18 oct 2026",
    status: "confirme", prize: "2,25 M$",
    summary: "LOUD devient la première équipe à remporter deux fois les Champions. Vitality perd la finale pour la 2e année de suite contre une équipe des Amériques.",
    matches: [
      {
        stage: "Grande finale (Bo5)", a: "LOUD", b: "Team Vitality", sa: 3, sb: 1,
        maps: [["Summit", 13, 11], ["Lotus", 8, 13], ["Sunset", 13, 5], ["Haven", 13, 10]],
        summary: "LOUD prend Summit de justesse (13–11), Vitality répond sur son pick Lotus. LOUD écrase ensuite Sunset 13–5 et conclut sur Haven. erde est élu MVP.",
      },
      {
        stage: "Finale lower (Bo5)", a: "Team Vitality", b: "100 Thieves", sa: 3, sb: 1,
        maps: [["Split", 5, 13], ["Summit", 13, 10], ["Lotus", 13, 11], ["Ascent", 13, 9]],
        summary: "100 Thieves démarre fort sur Split, puis Vitality enchaîne trois maps serrées pour revenir en finale.",
      },
      {
        stage: "Finale upper", a: "Team Vitality", b: "LOUD", sa: 1, sb: 2,
        maps: [["Lotus", 13, 8], ["Summit", 5, 13], ["Haven", 11, 13]],
        summary: "Même scénario qu'en grande finale : Vitality gagne Lotus, LOUD prend Summit puis Haven au finish.",
      },
      {
        stage: "Demi-finale lower", a: "100 Thieves", b: "G2 Esports", sa: 2, sb: 1,
        maps: [["Lotus", 10, 13], ["Ascent", 13, 10], ["Summit", 13, 7]],
      },
      {
        stage: "Demi-finale upper", a: "NRG", b: "LOUD", sa: 1, sb: 2,
        maps: [["Haven", 9, 13], ["Sunset", 13, 10], ["Summit", 3, 13]],
      },
      {
        stage: "Demi-finale upper", a: "G2 Esports", b: "Team Vitality", sa: 0, sb: 2,
        maps: [["Abyss", 11, 13], ["Split", 4, 13]],
      },
      {
        stage: "Quart lower", a: "NRG", b: "100 Thieves", sa: 0, sb: 2,
        maps: [["Sunset", 12, 14], ["Haven", 4, 13]],
      },
      {
        stage: "Quart lower", a: "G2 Esports", b: "T1", sa: 2, sb: 1,
        maps: [["Lotus", 13, 11], ["Abyss", 10, 13], ["Ascent", 13, 6]],
      },
    ],
    sources: [
      { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/2026_Valorant_Champions", kind: "communaute" },
      { name: "THESPIKE.GG", url: "https://www.thespike.gg/valorant/news/loud-wins-valorant-champions-2026/9043", kind: "media" },
      { name: "VLR.gg", url: "https://www.vlr.gg/matches/results", kind: "communaute" },
    ],
  },
  {
    game: "lol", name: "Worlds 2026 — Play-In", place: "Los Angeles", dates: "15 – 19 oct 2026",
    status: "confirme",
    summary: "Karmine Corp, pour sa première participation, est la seule équipe à sortir des Play-In. Cloud9 termine 19e sans gagner une série.",
    matches: [
      { stage: "Finale Play-In", a: "Karmine Corp", b: "MVK Esports", sa: null, sb: null, winner: "a",
        summary: "KC se qualifie pour la phase suisse. Score exact pas encore recoupé." },
      { stage: "Match de qualification", a: "MVK Esports", b: "FURIA", sa: 3, sb: 1 },
      { stage: "Premier tour", a: "MVK Esports", b: "FURIA", sa: 3, sb: 0 },
    ],
    warnings: ["Les scores des matchs MVK–FURIA proviennent d'une seule source (esports.gg)."],
    sources: [
      { name: "Dot Esports", url: "https://dotesports.com/league-of-legends/news/karmine-corp-beat-mvk-worlds-2026-play-ins", kind: "media" },
      { name: "esports.gg — hub Worlds", url: "https://esports.gg/guides/league-of-legends/worlds-2026-hub/", kind: "media" },
    ],
  },
  {
    game: "cs2", name: "Thunderpick World Championship 2026", place: "Malte", dates: "14 – 18 oct 2026",
    status: "media",
    summary: "FURIA s'impose au bout du suspense en cinq maps.",
    matches: [
      { stage: "Grande finale (Bo5)", a: "FURIA", b: "BetBoom", sa: 3, sb: 2 },
    ],
    warnings: ["Source unique : à recouper avec HLTV."],
    sources: [
      { name: "esports.gg", url: "https://esports.gg/news/counter-strike-2/cs2-thunderpick-world-championship-2026-results/", kind: "media" },
    ],
  },
  {
    game: "cs2", name: "ESL Pro League Saison 24", place: "Katowice", dates: "3 – 11 oct 2026",
    status: "media",
    summary: "Vitality ne laisse aucune map à MOUZ en finale.",
    matches: [
      { stage: "Grande finale (Bo5)", a: "Team Vitality", b: "MOUZ", sa: 3, sb: 0 },
    ],
    sources: [
      { name: "BLAST.tv", url: "https://blast.tv/cs/tournaments/esl-pro-league-season-24-2026", kind: "media" },
    ],
  },
  {
    game: "rl", name: "RLCS World Championship 2026", place: "Fort Worth (Texas)", dates: "15 – 20 sept 2026",
    status: "confirme", prize: "1,2 M$",
    summary: "Team Falcons, partis des play-ins, enchaînent quatre séries en lower bracket puis écrasent Spacestation en finale. Premier titre mondial pour une équipe MENA.",
    matches: [
      { stage: "Grande finale (Bo7)", a: "Team Falcons", b: "Spacestation Gaming", sa: 4, sb: 0,
        summary: "Balayage complet. Kiileerrz est élu MVP du tournoi, dralii décroche son 2e titre mondial." },
      { stage: "Demi-finale", a: "Team Falcons", b: "Karmine Corp", sa: 4, sb: 2,
        summary: "Revanche de la phase de groupes, où KC avait battu Falcons." },
      { stage: "Finale 1v1", a: "nass", b: "Nwpo", sa: null, sb: null, winner: "a" },
    ],
    sources: [
      { name: "Sheep Esports", url: "https://www.sheepesports.com/en/articles/team-falcons-dismantle-spacestation-gaming-to-win-the-rlcs-2026-world-championship/en", kind: "media" },
      { name: "GINX", url: "https://www.ginx.tv/en/rlcs-2026-world-champions", kind: "media" },
      { name: "esports.gg", url: "https://esports.gg/news/rocket-league/rlcs-2026-world-championship-finals-overview-results/", kind: "media" },
    ],
  },
];

const STANDINGS = [
  {
    game: "lol", title: "Worlds 2026 — Phase suisse", subtitle: "Début le 23 octobre à Allen (Texas). Tous les bilans sont à 0–0.",
    status: "media",
    columns: ["Équipe", "Ligue", "Bilan"],
    rows: [
      ["Gen.G", "LCK", "0–0"], ["Hanwha Life Esports", "LCK", "0–0"], ["T1", "LCK", "0–0"], ["Dplus Kia", "LCK", "0–0"],
      ["Anyone's Legend", "LPL", "0–0"], ["Bilibili Gaming", "LPL", "0–0"], ["TOP Esports", "LPL", "0–0"], ["Invictus Gaming", "LPL", "0–0"],
      ["G2 Esports", "LEC", "0–0"], ["Movistar KOI", "LEC", "0–0"], ["Karmine Corp", "LEC", "0–0"],
      ["Team Liquid", "LCS", "0–0"], ["LYON", "LCS", "0–0"],
      ["Team Secret Whales", "LCP", "0–0"], ["CTBC Flying Oyster", "LCP", "0–0"],
      ["LOS", "CBLOL", "0–0"],
    ],
    sources: [{ name: "esports.gg — hub Worlds", url: "https://esports.gg/guides/league-of-legends/worlds-2026-hub/", kind: "media" }],
  },
  {
    game: "val", title: "Valorant Champions 2026 — Classement final", subtitle: "Cashprize total : 2,25 M$",
    status: "confirme",
    columns: ["#", "Équipe", "Gains"],
    rows: [
      ["1", "LOUD", "1 000 000 $"], ["2", "Team Vitality", "400 000 $"], ["3", "100 Thieves", "250 000 $"], ["4", "G2 Esports", "130 000 $"],
      ["5–6", "T1", "85 000 $"], ["5–6", "NRG", "85 000 $"], ["7–8", "Nongshim RedForce", "50 000 $"], ["7–8", "Paper Rex", "50 000 $"],
      ["9–12", "FUT Esports, Global Esports, Team Liquid, Karmine Corp", "30 000 $"],
      ["13–16", "JD Gaming, Edward Gaming, TYLOO, Xi Lai Gaming", "20 000 $"],
    ],
    sources: [{ name: "Wikipedia", url: "https://en.wikipedia.org/wiki/2026_Valorant_Champions", kind: "communaute" }],
  },
  {
    game: "cs2", title: "Classement mondial HLTV", subtitle: "Version du 5 octobre 2026 (mise à jour chaque semaine).",
    status: "media",
    columns: ["#", "Équipe", "Points"],
    rows: [
      ["1", "Team Spirit", "1000"], ["2", "Team Vitality", "686"], ["3", "MOUZ", "562"], ["4", "FURIA", "534"], ["5", "Falcons", "496"],
      ["6–8", "Non récupéré", "—"], ["9", "Aurora", "350"], ["10", "Natus Vincere", "241"],
    ],
    warnings: ["Les places 6 à 8 n'ont pas pu être lues, et le classement a pu changer depuis le 5 octobre (FURIA et Vitality ont gagné un tournoi depuis)."],
    sources: [{ name: "HLTV", url: "https://www.hltv.org/ranking/teams/2026/october/5", kind: "officiel" }],
  },
  {
    game: "rl", title: "RLCS World Championship 2026 — Podium", subtitle: "Fort Worth, 15–20 septembre",
    status: "confirme",
    columns: ["#", "Équipe"],
    rows: [["1", "Team Falcons"], ["2", "Spacestation Gaming"], ["3–4", "Karmine Corp"], ["3–4", "Non récupéré"]],
    sources: [{ name: "Sheep Esports", url: "https://www.sheepesports.com/en/articles/team-falcons-dismantle-spacestation-gaming-to-win-the-rlcs-2026-world-championship/en", kind: "media" }],
  },
];
