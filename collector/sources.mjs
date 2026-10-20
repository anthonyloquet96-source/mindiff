// Registre des sources autorisées. Seules ces sources sont collectées.
// kind : "officiel" (éditeur du jeu ou organisateur), "media" (rédaction reconnue), "communaute" (site tenu par la communauté).
// Les sites qui vendent des boosts, crédits ou skins ne sont volontairement pas dans la liste.

export const SOURCES = [
  // ---------- Officiels ----------
  { id: "riot-lol", name: "League of Legends (officiel)", kind: "officiel", game: "lol", type: "riot",
    urls: ["https://www.leagueoflegends.com/fr-fr/news/", "https://www.leagueoflegends.com/en-us/news/"] },
  { id: "riot-val", name: "Valorant (officiel)", kind: "officiel", game: "val", type: "riot",
    urls: ["https://playvalorant.com/fr-fr/news/", "https://playvalorant.com/en-us/news/"] },
  { id: "ea-fc", name: "EA SPORTS FC (officiel)", kind: "officiel", game: "fc", type: "ea",
    urls: ["https://www.ea.com/fr/games/ea-sports-fc/fc-27/news", "https://www.ea.com/games/ea-sports-fc/fc-27/news"] },
  { id: "steam-cs2", name: "Counter-Strike 2 — Steam (officiel)", kind: "officiel", game: "cs2", type: "steam", appid: 730 },
  { id: "steam-rl", name: "Rocket League — Steam (officiel)", kind: "officiel", game: "rl", type: "steam", appid: 252950 },
  { id: "steam-fc", name: "EA SPORTS FC 27 — Steam (officiel)", kind: "officiel", game: "fc", type: "steam", appid: 4080220 },
  { id: "lolesports", name: "LoL Esports (officiel)", kind: "officiel", game: "lol", type: "lolesports" },

  // Messages officiels affichés dans le jeu par Epic, relayés tels quels par fortnite-api.com.
  { id: "fortnite-api", name: "Fortnite — actus en jeu (Epic)", kind: "officiel", game: "fn", type: "fortnite" },

  // ---------- Communauté ----------
  { id: "vlr", name: "VLR.gg", kind: "communaute", game: "val", type: "rss", url: "https://www.vlr.gg/rss" },

  // ---------- Médias ----------
  { id: "hltv", name: "HLTV", kind: "media", game: "cs2", type: "rss", url: "https://www.hltv.org/rss/news" },
  { id: "dexerto-lol", name: "Dexerto", kind: "media", game: "lol", type: "rss", url: "https://www.dexerto.com/league-of-legends/feed/" },
  { id: "dexerto-val", name: "Dexerto", kind: "media", game: "val", type: "rss", url: "https://www.dexerto.com/valorant/feed/" },
  { id: "dexerto-fn", name: "Dexerto", kind: "media", game: "fn", type: "rss", url: "https://www.dexerto.com/fortnite/feed/" },
  { id: "dexerto-fc", name: "Dexerto", kind: "media", game: "fc", type: "rss", url: "https://www.dexerto.com/ea-sports-fc/feed/" },
  { id: "dexerto-rl", name: "Dexerto", kind: "media", game: "rl", type: "rss", url: "https://www.dexerto.com/rocket-league/feed/" },
  { id: "esportsgg", name: "esports.gg", kind: "media", game: null, type: "rss", url: "https://esports.gg/feed/" },
];

// Ligues LoL suivies via l'API officielle LoL Esports.
export const LOL_LEAGUES = {
  worlds: "98767975604431411",
  msi: "98767991325878492",
  first_stand: "113464388705111224",
  lec: "98767991302996019",
  lck: "98767991310872058",
  lpl: "98767991314006698",
  lcs: "98767991299243165",
  lcp: "113476371197627891",
  "cblol-brazil": "98767991332355509",
  lfl: "105266103462388553",
  emea_masters: "100695891328981122",
};
