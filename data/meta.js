// Tier lists et stratégies, vérifiées le 20/10/2026.
// "id" = identifiant d'image (Data Dragon pour LoL). Valorant : images trouvées par nom via valorant-api.com.
// "roster" : la liste complète est chargée en ligne, les personnages non classés s'affichent en bas.

const TIERLISTS = [
  {
    game: "lol", title: "Solo queue — patch 26.20", roster: "lol", status: "media",
    scope: "ranked", patch: "26.20", context: "Solo queue · rang non précisé par la source", sourcesDated: "11–19 oct. 2026", updated: "2026-10-20",
    basis: "Win rate et pick rate metabot.gg, mis à jour entre le 11 et le 19 octobre. Les champions avec trop peu de parties sont exclus.",
    groups: [
      { name: "Top", tiers: {
        S: [{ id: "Chogath", name: "Cho'Gath", stat: "53,7 %" }, { id: "Malphite", name: "Malphite" }, { id: "Mordekaiser", name: "Mordekaiser" }],
        A: [{ id: "Quinn", name: "Quinn", stat: "53,9 %*", note: "Classée 1re par MOBA Trainer seulement" }],
      } },
      { name: "Jungle", tiers: {
        S: [{ id: "Rammus", name: "Rammus", stat: "53,8 %" }, { id: "Shyvana", name: "Shyvana", stat: "54,6 %" }, { id: "Chogath", name: "Cho'Gath", stat: "53,8 %" }, { id: "MonkeyKing", name: "Wukong", stat: "53,0 %" }],
      } },
      { name: "Mid", tiers: {
        S: [{ id: "Ekko", name: "Ekko", stat: "52,8 %" }, { id: "Fizz", name: "Fizz", stat: "52,4 %" }, { id: "Lux", name: "Lux", stat: "51,8 %" }, { id: "Yasuo", name: "Yasuo", stat: "51,7 %" }, { id: "Yone", name: "Yone", stat: "51,6 %" }],
      } },
      { name: "ADC", tiers: {
        S: [{ id: "Smolder", name: "Smolder", stat: "52,0 %" }, { id: "Jinx", name: "Jinx", stat: "51,7 %" }, { id: "Teemo", name: "Teemo", stat: "51,5 %" }],
        A: [{ id: "Sivir", name: "Sivir", stat: "52,2 %", note: "Peu jouée (1,4 %)" }],
      } },
      { name: "Support", tiers: {
        S: [{ id: "Milio", name: "Milio", stat: "53,6 %" }, { id: "Leona", name: "Leona", stat: "52,4 %" }, { id: "Rell", name: "Rell", stat: "52,3 %" }, { id: "Nami", name: "Nami", stat: "52,0 %" }],
      } },
    ],
    warnings: ["Les sites ne sont pas d'accord sur certains chiffres (Rammus : 53,8 % sur metabot, 55,2 % sur MOBA Trainer). Gwen à 57 % sur LoLValue a été exclue : seulement 537 parties."],
    sources: [
      { name: "metabot.gg", url: "https://metabot.gg/en/league/champions/tier-list", kind: "media" },
      { name: "MOBA Trainer", url: "https://www.mobatrainer.com/lol/tier-list", kind: "media" },
      { name: "LoLValue", url: "https://lolvalue.com/lol-tier-list", kind: "media" },
    ],
  },
  {
    game: "val", title: "Pro — Champions 2026", roster: "val", status: "confirme",
    scope: "pro", patch: "non précisé par la source", context: "VCT Champions Shanghai · 172 maps d'équipe", sourcesDated: "24 sept. – 18 oct. 2026", updated: "2026-10-20",
    basis: "Taux de pick par map jouée sur les 172 maps d'équipe des Champions Shanghai.",
    groups: [
      { name: "Taux de pick", tiers: {
        S: [{ name: "Omen", stat: "77,3 %" }, { name: "Neon", stat: "64,5 %" }],
        A: [{ name: "Chamber", stat: "51,7 %" }, { name: "Fade", stat: "51,2 %" }],
        B: [{ name: "Viper", note: "Dans la compo la plus jouée" }, { name: "Sova", note: "Très joué sur Ascent et Abyss" }, { name: "Harbor", note: "Spécialiste d'Abyss" }, { name: "Sage", note: "Présente sur Summit" }],
      } },
    ],
    sources: [
      { name: "VCT Reference", url: "https://vct-reference.com/events/vct-2026-champions-2766", kind: "communaute" },
      { name: "VLR.gg", url: "https://www.vlr.gg/event/agents/2766/valorant-champions-2026", kind: "communaute" },
    ],
  },
  {
    game: "val", title: "Ranked — patch 13.08", roster: "val", status: "contradictoire",
    scope: "ranked", patch: "13.08", context: "Compétition · Platine et plus", sourcesDated: "18 oct. 2026 (valking.gg)", updated: "2026-10-20",
    basis: "Win rate Platine+ (valking.gg, 18 octobre), croisé avec Overgear et lfcarry.",
    groups: [
      { name: "Ranked", tiers: {
        S: [{ name: "Clove", stat: "52,7 %", note: "N°1 sur toutes les sources" }],
        A: [{ name: "Sage" }, { name: "Phoenix" }, { name: "Jett", note: "S selon plusieurs guides" }, { name: "Killjoy" }],
        B: [{ name: "Sova", note: "S chez Overgear, A chez lfcarry" }, { name: "Chamber", note: "Le plus joué, pas le plus gagnant" }],
      } },
    ],
    warnings: ["Les sites ne sont pas d'accord sur Sova, Phoenix, Sage et Killjoy. Seul valking.gg cite explicitement le patch 13.08."],
    sources: [
      { name: "valking.gg", url: "https://valking.gg/en/agents", kind: "media" },
      { name: "Overgear", url: "https://overgear.com/guides/valorant/agents-tier-list/", kind: "suspect" },
      { name: "lfcarry", url: "https://lfcarry.com/guides/valorant-tier-list", kind: "suspect" },
    ],
  },
  {
    game: "cs2", title: "Armes — consensus 2026", roster: "cs2", status: "media",
    basis: "Croisement de 6 tier lists publiées entre juillet et octobre 2026. « Contesté » = les sources sont en désaccord.",
    groups: [
      { name: "Armes", tiers: {
        S: [{ name: "AK-47", note: "One-shot casque à quasi toute distance" }, { name: "M4A1-S", note: "Fusil CT par défaut" }, { name: "M4A4" }, { name: "AWP" }],
        A: [{ name: "Desert Eagle", note: "Contesté (S à B)" }, { name: "MAC-10", note: "Contesté (S ou A)" }, { name: "Galil AR", note: "Contesté (A ou B)" }, { name: "FAMAS", note: "Contesté (A ou B)" }, { name: "MP9", note: "Contesté (A ou B)" }],
        B: [{ name: "Tec-9", note: "Contesté" }, { name: "Five-SeveN", note: "Contesté" }, { name: "AUG", note: "Rechargement −0,5 s (patch du 8 oct., à confirmer)" }],
      } },
    ],
    warnings: ["Prix de la M4A4 différent selon les sources (2 900 $ ou 3 100 $). Plusieurs sites de tier lists vendent des skins."],
    sources: [
      { name: "cs2pedia", url: "https://cs2pedia.com/guides/cs2-weapon-tier-list/", kind: "media" },
      { name: "cs2hype", url: "https://cs2hype.com/guides/weapon-meta", kind: "media" },
      { name: "skin.land (vend des skins)", url: "https://skin.land/blog/cs2-weapon-and-guns-tier-list/", kind: "suspect" },
    ],
  },
  {
    game: "fn", title: "Armes — Chapitre 7 Saison 4", roster: "fn", status: "contradictoire",
    basis: "Nombre de sources (sur 7) qui placent l'arme en haut de leur classement.",
    groups: [
      { name: "Armes", tiers: {
        S: [{ name: "Chef-d'œuvre de Midas", note: "Top 1 sur 4 sources — profitez-en avant un nerf" }, { name: "Fusil à pompe", note: "205 dégâts tête en légendaire" }, { name: "Fusil d'assaut", note: "S sur 2 sources" }],
        A: [{ name: "Drum Gun", note: "Meilleure arme de spray" }, { name: "Ranger AR", note: "Contesté" }, { name: "Mega Buster" }],
        B: [{ name: "Fusil à pompe 8-Bit", note: "De S à B selon les sources" }, { name: "Striker AR" }, { name: "Frenzy Auto Shotgun" }, { name: "Thunder Burst SMG" }, { name: "Pistolet tactique" }, { name: "Reaper Sniper" }, { name: "Minigun" }],
      } },
    ],
    warnings: ["Classements très différents d'un site à l'autre, et loot pool non vérifié dans les notes officielles d'Epic."],
    sources: [
      { name: "Dexerto", url: "https://www.dexerto.com/fortnite/best-weapons-fortnite-ultimate-gun-tier-list-1535100/", kind: "media" },
      { name: "Game Rant", url: "https://gamerant.com/fortnite-override-chapter-7-season-4-best-weapons-items-meta-tier-list/", kind: "media" },
      { name: "Beebom", url: "https://beebom.com/fortnite-weapons-tier-list/", kind: "media" },
      { name: "Hotspawn", url: "https://www.hotspawn.com/fortnite/guide/best-weapons-in-fortnite", kind: "media" },
    ],
  },
  {
    game: "fc", title: "Formations — Ultimate Team", status: "contradictoire",
    basis: "Popularité selon les données FUT.GG reprises par plusieurs guides.",
    groups: [
      { name: "Formations", tiers: {
        S: [{ name: "4-2-1-3", stat: "27 %", note: "~1/5 des pros" }, { name: "4-4-1-1", stat: "31 %*", note: "Chiffre d'une autre source" }],
        A: [{ name: "4-2-3-1 Large", note: "Pour tenir un score" }, { name: "4-1-2-1-2 Étroit", note: "Jeu rapide dans l'axe" }],
      } },
    ],
    warnings: ["Deux sources citent FUT.GG mais ne sont pas d'accord sur la formation n°1."],
    sources: [
      { name: "Dexerto", url: "https://www.dexerto.com/wikis/ea-fc-27/best-formations-and-custom-tactics/", kind: "media" },
      { name: "KeenGamer", url: "https://www.keengamer.com/articles/guides/ea-sports-fc-27-best-meta-tactics-and-formations/", kind: "media" },
    ],
  },
  {
    game: "fc", title: "Joueurs pas chers — début de saison", status: "non-confirme",
    basis: "Prix de la semaine de lancement : ils évoluent tous les jours, vérifiez sur le marché.",
    groups: [
      { name: "Petit budget", tiers: {
        S: [{ name: "Kim Little", stat: "~2 500", note: "MC, note méta 87,2" }, { name: "Mario Gila", note: "DC" }, { name: "Andrei Rațiu", note: "DD" }],
        A: [{ name: "Racheal Kundananji", note: "Ailière" }, { name: "Chloé Kelly", stat: "~4 500", note: "Ailière" }, { name: "David de Gea", note: "GB" }],
        B: [{ name: "Yui Hasegawa", stat: "~25 000", note: "MC premium" }],
      } },
    ],
    sources: [
      { name: "EasySBC", url: "https://www.easysbc.io/news/fc-27-best-starter-players/", kind: "media" },
      { name: "Eldorado (vend des crédits)", url: "https://www.eldorado.gg/blog/ea-fc-27-en/ea-fc-27-best-cheap-players/", kind: "suspect" },
    ],
  },
];

// Liste complète des armes (pas d'API publique) pour afficher aussi les non classées.
const STATIC_ROSTERS = {
  cs2: ["Glock-18", "USP-S", "P2000", "P250", "Five-SeveN", "Tec-9", "CZ75-Auto", "Dual Berettas", "Desert Eagle", "R8 Revolver",
    "MAC-10", "MP9", "MP7", "MP5-SD", "UMP-45", "P90", "PP-Bizon",
    "Galil AR", "FAMAS", "AK-47", "M4A4", "M4A1-S", "SG 553", "AUG", "SSG 08", "AWP", "G3SG1", "SCAR-20",
    "Nova", "XM1014", "Sawed-Off", "MAG-7", "M249", "Negev"],
};

const STRATS = [
  // Format fiche (LoL et Valorant) : seuls les champs étayés par les sources sont remplis.
  // « faits » = rapporté par les sources ; « lecture » = interprétation de la rédaction, affichée comme telle.
  {
    id: "val-lotus-champions", game: "val", kind: "Composition", nature: "Données pro", status: "confirme",
    title: "Lotus : la composition la plus jouée aux Champions",
    patch: "non précisé par la source", updated: "2026-10-20",
    context: { "Carte": "Lotus", "Niveau": "Pro · VCT Champions 2026" },
    lineup: ["Chamber", "Fade", "Neon", "Omen", "Viper"],
    objectif: "Reprendre la composition que les équipes pros ont le plus alignée sur Lotus pendant les Champions.",
    conditions: ["Un duelliste : Neon", "Deux contrôleurs : Omen et Viper", "Un initiateur : Fade, et une sentinelle : Chamber"],
    faits: [
      "Composition jouée 10 fois sur Lotus, la plus fréquente du tournoi sur une même carte",
      "Toutes cartes confondues, la structure la plus courante est différente : 2 duellistes, 1 initiateur, 1 contrôleur, 1 sentinelle (33,1 % des maps, 43,9 % de victoires)",
      "Lotus n'est pas concernée par la rotation du patch 13.08 (Ascent et Split quittent le classé)",
    ],
    limites: ["10 maps seulement : échantillon réduit", "La source ne donne pas le taux de victoire de cette composition précise"],
    lecture: "La composition la plus jouée n'est pas forcément la plus gagnante : la structure la plus répandue du tournoi ne gagne que 43,9 % de ses maps.",
    sources: [{ name: "VCT Reference", url: "https://vct-reference.com/events/vct-2026-champions-2766", kind: "communaute" }],
  },
  {
    id: "val-agents-par-carte", game: "val", kind: "Agents par carte", nature: "Données pro · source unique", status: "non-confirme",
    title: "Les agents incontournables carte par carte chez les pros",
    patch: "non précisé par la source", updated: "2026-10-20",
    context: { "Niveau": "Pro · VCT Champions 2026" },
    objectif: "Savoir quels agents les pros considèrent comme indispensables sur chaque carte.",
    maps: [
      { map: "Haven", lineup: ["Omen", "Neon", "Fade", "Chamber"], note: "Omen 100 %, Neon 77 %, Fade 73 %, Chamber 64 %" },
      { map: "Abyss", lineup: ["Sova", "Harbor"], note: "Sova 100 %, Harbor 81 %" },
      { map: "Summit", lineup: ["Neon", "Fade", "Chamber", "Sage"], note: "Neon et Fade 79 %, Chamber 61 %, Sage 54 %" },
      { map: "Ascent", lineup: ["Omen", "Sova"], note: "100 % tous les deux · Ascent n'est plus en Compétition depuis le patch 13.08" },
    ],
    limites: ["Une seule source, dont la méthode de calcul n'est pas documentée", "Ascent et Split ont quitté les files Compétition au patch 13.08"],
    sources: [
      { name: "valorant-spind.de", url: "https://www.valorant-spind.de/en/valorant-agenten-pickrates.html", kind: "communaute" },
      { name: "Notes de patch 13.08 (officiel)", url: "https://playvalorant.com/fr-fr/news/game-updates/valorant-patch-notes-13-08", kind: "officiel" },
    ],
  },
  {
    id: "lol-botlane-2620", game: "lol", kind: "Bot lane", nature: "Statistiques ranked", status: "media",
    title: "Patch 26.20 : Smolder et Milio en bot lane",
    patch: "26.20", updated: "2026-10-20",
    context: { "Rôles": "ADC + support", "Mode": "Solo queue · rang non précisé" },
    lineup: [{ id: "Smolder", name: "Smolder" }, { id: "Milio", name: "Milio" }],
    objectif: "Profiter des changements du patch 26.20 en bot lane.",
    faits: [
      "Smolder fait partie des champions buffés au patch 26.20",
      "Ashe et Yunara sont nerfées au même patch, pour leur force en bot lane",
      "Smolder : 52,0 % de victoires en ADC ; Milio : 53,6 %, meilleur support (metabot.gg, 11–19 oct.)",
    ],
    limites: ["Taux de victoire mesurés séparément : la source ne donne pas celui du duo", "Rang des parties non précisé par la source"],
    lecture: "Smolder gagne en puissance au fil de la partie grâce à ses cumuls ; un support protecteur comme Milio lui laisse le temps d'y arriver.",
    sources: [
      { name: "metabot.gg", url: "https://metabot.gg/en/league/champions/tier-list", kind: "media" },
      { name: "Notes de patch 26.20 (officiel)", url: "https://www.leagueoflegends.com/fr-fr/news/game-updates/league-of-legends-patch-26-20-notes", kind: "officiel" },
    ],
  },
  {
    game: "cs2", kind: "Économie", status: "media",
    title: "Achats de base pour gagner en régularité",
    points: [
      "T : AK-47 dès que possible, c'est la seule arme qui one-shot casqué à toute distance",
      "CT : M4A1-S par défaut (environ 3 rounds sur 4 en haut niveau, selon une source)",
      "Rounds éco : MAC-10 côté T, MP9 côté CT",
      "AUG : si le buff du rechargement se confirme, testez-la en retake",
    ],
    sources: [
      { name: "cs2pedia", url: "https://cs2pedia.com/guides/cs2-weapon-tier-list/", kind: "media" },
      { name: "TalkEsport (AUG)", url: "https://www.talkesport.com/news/cs2/cs2-update-aug-reload-defuse-kit-ping/", kind: "media" },
    ],
  },
  {
    game: "fn", kind: "Loadout ranked", status: "media",
    title: "Loadout recommandé en ranked",
    points: [
      "Un fusil à pompe (priorité absolue en Builds)",
      "Un fusil d'assaut : Ranger AR ou Fusil d'assaut",
      "Une arme de spray : Drum Gun ou Mega Buster",
      "Chef-d'œuvre de Midas dès que vous le trouvez : un nerf est attendu",
    ],
    sources: [
      { name: "Sticky Keys", url: "https://stickykeys.ca/blogs/fortnite-tips/best-guns-in-fortnite-the-best-weapons-in-chapter-7-season-4", kind: "media" },
      { name: "Game Rant", url: "https://gamerant.com/fortnite-override-chapter-7-season-4-best-weapons-items-meta-tier-list/", kind: "media" },
    ],
  },
  {
    game: "fc", kind: "Tactique", status: "contradictoire",
    title: "4-2-1-3 : les réglages qui marchent",
    points: [
      "Deux MDC pour compenser le pressing d'équipe, qui faiblit dans votre tiers défensif",
      "Milieux : un Récupérateur et un Box Crasher",
      "Ailiers en attaquants intérieurs",
      "Construction : Contre-attaque, approche défensive 55 (source 1) ou Équilibrée, ligne à 60 (source 2)",
    ],
    analysis: "Les deux réglages se valent sur le papier : testez les deux en Division Rivals et gardez celui où vous encaissez le moins de contres.",
    sources: [
      { name: "Dexerto", url: "https://www.dexerto.com/wikis/ea-fc-27/best-formations-and-custom-tactics/", kind: "media" },
      { name: "games.gg", url: "https://games.gg/ea-sports-fc-27/guides/ea-fc-27-best-formations-and-custom-tactics-guide/", kind: "media" },
    ],
  },
  {
    game: "fc", kind: "Gameplay", status: "confirme",
    title: "Défendez à la main",
    points: [
      "EA a fortement nerfé les tacles automatiques de l'IA",
      "La défense manuelle et le jockey ont été buffés",
      "Les appels de balle en attaque sont plus intelligents : passes en profondeur au bon moment",
    ],
    sources: [{ name: "EA (officiel)", url: "https://www.ea.com/games/ea-sports-fc/fc-27/news/fc-27-closed-beta-feedback-update", kind: "officiel" }],
  },
];
