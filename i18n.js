/* MINDIFF — version anglaise : traduction à l'affichage.
   La langue vient du choix enregistré (prefs.lang), sinon de la langue du téléphone (français → fr, sinon en).
   En anglais, chaque texte affiché est traduit à partir du dictionnaire ci-dessous :
   phrase entière d'abord, puis motifs (dates, durées), puis morceaux de phrase dans les textes courts.
   Les contenus rédigés en français (actus, raisons des tier lists, conseils sourcés) ne sont pas traduits. */
(function () {
  let lang = null;
  try { const p = JSON.parse(localStorage.getItem("tm-prefs-v1") || "{}"); if (p.lang === "fr" || p.lang === "en") lang = p.lang; } catch (e) { /* ignoré */ }
  if (!lang) lang = /^fr\b/i.test(navigator.language || "fr") ? "fr" : "en";
  window.LANG = lang;
  document.documentElement.lang = lang;
  if (lang !== "en") return;

  // Formats de date et de nombre : « 23 Oct », « 1,200 » au lieu de « 23 oct. », « 1 200 »
  const swap = l => (l === "fr-FR" || l === "fr" ? "en-GB" : Array.isArray(l) && l[0] === "fr" ? ["en"] : l);
  const D_ = Date.prototype;
  for (const k of ["toLocaleString", "toLocaleDateString", "toLocaleTimeString"]) { const f = D_[k]; D_[k] = function (l, o) { return f.call(this, swap(l), o); }; }
  const nls = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function (l, o) { return nls.call(this, l === "fr-FR" ? "en-US" : l, o); };
  const NF = Intl.NumberFormat, DTF = Intl.DateTimeFormat, DN = Intl.DisplayNames;
  Intl.NumberFormat = function (l, o) { return new NF(l === "fr-FR" ? "en-US" : l, o); };
  Intl.NumberFormat.prototype = NF.prototype;
  Intl.DateTimeFormat = function (l, o) { return new DTF(swap(l), o); };
  Intl.DateTimeFormat.prototype = DTF.prototype;
  Intl.DateTimeFormat.supportedLocalesOf = DTF.supportedLocalesOf;
  if (DN) { Intl.DisplayNames = function (l, o) { return new DN(swap(l), o); }; Intl.DisplayNames.prototype = DN.prototype; }

  const T = {
    // ---- Navigation, en-tête, commun
    "Accueil": "Home", "Compétitions": "Competitions", "Méta": "Meta", "Actus": "News", "Coach": "Coach", "Favoris": "Favorites",
    "Rubriques": "Sections", "Jeu": "Game", "Mode sans spoilers": "Spoiler-free mode", "Sources et synchronisation": "Sources and sync",
    "MINDIFF, accueil": "MINDIFF, home", "Fermer": "Close", "Réessayer": "Try again", "Tout voir": "See all", "Toutes": "All", "Tous": "All", "Tout": "All",
    "Thème : automatique, comme le téléphone. Toucher pour passer en clair": "Theme: automatic, like your phone. Tap for light",
    "Thème : clair. Toucher pour passer en sombre": "Theme: light. Tap for dark",
    "Thème : sombre. Toucher pour revenir en automatique": "Theme: dark. Tap for automatic",
    "Confidentialité et conditions": "Privacy and terms", "Ancien coach": "Previous coach",
    "Choisissez votre jeu": "Choose your game", "Compétitions, méta et stratégies, à partir de sources vérifiées.": "Competitions, meta and strategies, from verified sources.",
    "Données indisponibles": "Data unavailable", "La connexion aux données a échoué et aucune copie locale n'existe encore.": "Could not load the data, and no local copy exists yet.",
    "Aucune donnée chargée.": "No data loaded.", "Données": "Data", "Dernière vérification": "Last check", "Sources en ligne": "Sources online",
    "La synchronisation indique quand le site a interrogé les sources. Chaque contenu affiche sa propre date de publication.": "Sync shows when the site last checked its sources. Each item shows its own publication date.",
    "conservées": "kept", "Collecte lancée…": "Collection started…", "Collecte déjà en cours": "Collection already running", "Possible seulement depuis l'ordinateur serveur": "Only possible from the server computer",
    "Lancer une collecte": "Run a collection", "Chargement": "Loading", "Rechercher": "Search", "Champion, équipe, patch…": "Champion, team, patch…",
    "La source officielle des matchs LoL n'a pas répondu : les résultats affichés datent de la synchronisation précédente.": "The official LoL match source did not respond: results shown are from the previous sync.",
    "Langue": "Language",
    "Statistiques en direct…": "Live stats…", "Entre deux parties : le direct reprend au début de la prochaine.": "Between games: live stats resume when the next one starts.", "Tours": "Towers", "Match terminé : le résultat s'affiche à la prochaine mise à jour.": "Match over: the result appears at the next update.", "Inhibiteurs": "Inhibitors", "Terminée": "Finished", "En direct, environ 1 min de décalage · LoL Esports": "Live, about 1 min delay · LoL Esports",
    "Bilan d'une partie : Yone contre Viktor, victoire, 7/2/4, 258 sbires, et l'écart avec l'adversaire en phase de lane (+41 golds à 10 minutes, +677 à 15 minutes)": "Game review: Yone vs Viktor, win, 7/2/4, 258 CS, and the laning gap with the opponent (+41 gold at 10 minutes, +677 at 15 minutes)",
    "Replay de la partie sur la minimap, arrêté sur un moment clé avec ce qui aurait été mieux": "Game replay on the minimap, with the fights and objectives of the moment", "contre": "vs",
    "· Système suisse": "· Swiss stage", "· Phase finale": "· Playoffs", "· Play-ins": "· Play-In", "Play-ins": "Play-In", "Maître Yi": "Master Yi", "K'Santé": "K'Sante", "Nunu et Willump": "Nunu & Willump", "Bientôt disponible": "Coming soon", "Bientôt": "Soon", "Revenir à League of Legends": "Back to League of Legends",
    "MINDIFF se concentre d'abord sur League of Legends. Les autres jeux arrivent ensuite : touche l'étoile de ceux qui t'intéressent, on commencera par les plus demandés.": "MINDIFF focuses on League of Legends first. Other games come next: star the ones you're interested in, and we'll start with the most requested.",
    // ---- Accueil
    "Tournoi à la une": "Featured tournament", "Explorer le tournoi": "Explore the tournament", "Tournois": "Tournaments", "Matchs": "Matches", "Tier lists": "Tier lists",
    "Accès rapides": "Quick links", "Prochain match": "Next match", "Prochains matchs": "Upcoming matches", "Méta du moment": "Current meta", "Méta en bref": "Meta at a glance",
    "À retenir": "Highlights", "Actu": "News", "Patch": "Patch", "Tier list": "Tier list", "Changements du patch": "Patch changes",
    "Les plus joués": "Most played", "Les plus joués ·": "Most played ·", "Taux de sélection sur": "Pick rate over", "parties officielles": "official games",
    "Mon coach": "My coach", "Le bilan de tes parties classées, un objectif à la fois": "Reviews of your ranked games, one goal at a time",
    "Nouvelle partie à relire :": "New game to review:", "Bilan de tes dernières parties": "Review of your recent games",
    // ---- Matchs, tournois
    "En cours": "Live", "Terminé": "Finished", "Terminés": "Finished", "Prochain": "Next", "Reporté": "Postponed", "Annulé": "Cancelled",
    "Score masqué": "Score hidden", "Résultat masqué": "Result hidden", "Résultat masqué (mode sans spoilers)": "Result hidden (spoiler-free mode)", "masqué": "hidden", "Afficher": "Show",
    "Bilan masqué": "Record hidden", "Aujourd'hui": "Today", "Demain": "Tomorrow", "Hier": "Yesterday", "Date non communiquée": "Date not announced",
    "Choisir une date": "Pick a date", "Jour de matchs précédent": "Previous match day", "Jour de matchs suivant": "Next match day",
    "« En cours » uniquement si la source officielle le confirme.": "“Live” only when the official source confirms it.", "Voir les compétitions": "See competitions",
    "Aucune compétition suivie": "No competition followed", "Aucun tournoi n'est disponible dans les données pour ce jeu.": "No tournament is available for this game yet.",
    "Aucun tournoi suivi": "No tournament followed", "Les données ne contiennent pas encore de compétition pour ce jeu.": "The data has no competition for this game yet.",
    "Statut des tournois": "Tournament status", "Toutes les compétitions": "All competitions", "Compétition": "Competition", "Aucun calendrier disponible": "No schedule available",
    "Le calendrier Valorant n'est pas encore relié à une source automatique. Les résultats des Champions 2026 sont dans l'onglet Tournois.": "The Valorant schedule is not connected to an automatic source yet. Champions 2026 results are in the Tournaments tab.",
    "Les compétitions suivies ne fournissent pas d'horaires.": "The competitions followed do not provide times.", "Aucun match ce jour": "No match that day",
    "Aucun match de vos équipes favorites ce jour-là.": "None of your favorite teams play that day.", "Tournoi introuvable": "Tournament not found",
    "Il n'est peut-être plus suivi ou le lien est ancien.": "It may no longer be followed, or the link is old.", "Calendrier": "Schedule", "Calendrier du tournoi": "Tournament schedule",
    "Derniers résultats": "Latest results", "Tous les matchs": "All matches", "Complet": "See all", "Méta observée": "Observed meta", "Statistiques": "Stats",
    "Champions les plus joués": "Most played champions", "Le point de la rédaction": "Editor's take", "Résumé du tournoi": "Tournament summary", "Tour": "Round",
    "Aucun match dans cette phase": "No match in this stage", "Phase": "Stage", "Qualifiées": "Qualified", "Éliminées": "Eliminated", "Pas de classement disponible": "No standings available",
    "Vue d'ensemble": "Overview", "Classement": "Standings", "Équipes": "Teams", "Équipe": "Team", "Phase finale": "Playoffs", "Système suisse": "Swiss stage",
    "Onglets précédents": "Previous tabs", "Sections du tournoi": "Tournament sections", "Onglets suivants": "Next tabs", "Bilans ·": "Records ·", "Classement ·": "Standings ·",
    "Faits marquants": "Highlights", "Forme des équipes": "Team form", "Méta pro": "Pro meta", "À suivre": "To watch", "Tableau final, défilement horizontal": "Playoff bracket, scroll sideways",
    "Comment marche le système suisse ?": "How does the Swiss stage work?",
    "Pas de groupes fixes : à chaque ronde, une équipe affronte une adversaire": "No fixed groups: each round, a team faces an opponent",
    "qui a le même bilan qu'elle": "with the same record",
    "(2 victoires contre 2 victoires, 1–1 contre 1–1…). Les adversaires changent à chaque ronde et ne se croisent pas deux fois.": "(2 wins vs 2 wins, 1–1 vs 1–1…). Opponents change every round and never meet twice.",
    "Pourquoi ce format : chaque équipe joue plusieurs adversaires de son niveau, et un seul mauvais match ne suffit pas à l'éliminer.": "Why this format: every team plays several opponents of its level, and one bad match is not enough to knock it out.",
    "Faits marquants, forme et enjeux": "Highlights, form and stakes", "Phase": "Stage", "Matchs joués": "Matches played", "Parties analysées": "Games analyzed", "Équipes listées": "Teams listed",
    "V–D": "W–L", "parties officielles · bans non fournis par l'API": "official games · bans not provided by the API", "Picks": "Picks", "Sélection": "Pick rate", "Victoires": "Wins",
    "Score": "Score", "Moments clés": "Key moments", "Analyse esport": "Esports analysis", "Interprétation de la rédaction à partir des picks, kills et scores officiels.": "Editor's interpretation based on official picks, kills and scores.",
    "Analyse en cours de rédaction · résumé calculé à partir des données officielles.": "Analysis being written · summary computed from official data.",
    "Victoire": "Win", "Défaite": "Loss", "victoire": "win", "défaite": "loss", "Revoir": "Watch again", "Qualifiée pour": "Qualified for", "Dernier titre :": "Last title:", "Dans ce tournoi :": "In this tournament:",
    "Équipes du tournoi": "Tournament teams", "en parties": "in games", "Match introuvable": "Match not found", "Résumé et détails": "Summary and details", "Résumé": "Summary", "Cartes": "Maps",
    "Partie par partie": "Game by game", "Championne du monde": "World champion", "Équipe introuvable": "Team not found", "Présentation": "About", "Palmarès": "Achievements",
    "Draft dans ce tournoi": "Draft in this tournament", "Effectif": "Roster", "Joueurs et champions joués": "Players and champions played", "Vérifié à la main": "Checked by hand",
    "· résultats vérifiés à la main": "· results checked by hand", "kills à": "kills to", "sur la série.": "in the series.", "Heures de": "Times in",
    "Fuseau horaire": "Time zone", "· fuseau de votre appareil": "· your device's time zone", "Londres": "London", "Montréal": "Montreal", "Séoul": "Seoul", "La Réunion": "Réunion",
    "Finaliste des Worlds en": "Worlds finalist in", ", sans titre mondial.": ", without a world title.", "aux Worlds jusqu'en": "at Worlds up to", ", sans finale.": ", no final.", "Vainqueur du MSI en": "MSI winner in",
    "Rôle": "Role", "Plus joués": "Most played", "Taux de sélection": "Pick rate", "Taux de victoire": "Win rate", "Trier": "Sort",
    // ---- Méta
    "Pas de tier list fiable": "No reliable tier list", "Aucune source vérifiée ne fournit de classement pour ce jeu.": "No verified source provides a ranking for this game.",
    "Compétition pro": "Pro play", "Ranked": "Ranked", "Contexte": "Context", "Version du jeu non fournie par la source.": "Game version not provided by the source.",
    "25 % et plus": "25% and more", "15 à 25 %": "15 to 25%", "8 à 15 %": "8 to 15%", "Moins de 8 %": "Under 8%", "Taux global non communiqué": "Overall rate not published", "Agents": "Agents",
    "Patch non précisé": "Patch not specified", "patch non précisé": "patch not specified", "Compétition pro · fréquence de sélection": "Pro play · pick rate", "Données officielles du": "Official data from",
    "Comment est calculé ce classement ?": "How is this ranking computed?", "Relevé le": "Collected on", "· relevé le": "· collected on", "Tier list ranked": "Ranked tier list", "Tier": "Tier",
    "Comment est établie cette tier list ?": "How is this tier list built?", "Ce taux mesure la fréquence de sélection chez les pros, pas la puissance.": "This rate measures how often pros pick it, not how strong it is.",
    "Pour chaque champion, on compte les parties officielles où il a été choisi, divisé par le nombre total de parties analysées (": "For each champion, we count the official games where it was picked, divided by the total number of games analyzed (",
    "). Un champion ne peut être choisi qu'une fois par partie : ce taux de sélection va donc de 0 à 100 %.": "). A champion can only be picked once per game, so this pick rate ranges from 0 to 100%.",
    "Il mesure la popularité chez les pros, pas la puissance : un champion peut être très joué sans beaucoup gagner. Les bans ne sont pas fournis par l'API officielle et ne sont donc pas comptés. Seuls les champions choisis au moins 3 fois sont affichés.": "It measures popularity among pros, not strength: a champion can be played a lot without winning much. Bans are not provided by the official API, so they are not counted. Only champions picked at least 3 times are shown.",
    "statistiques du tournoi": "tournament stats", "Aucun élément pour ce filtre.": "Nothing for this filter.", "Touchez un": "Tap a", "pour voir ses classements, ses stats et les contenus liés.": "to see its rankings, stats and related content.",
    "pour voir le chiffre et la raison.": "to see the figure and the reason.", "Les parties sont jouées en version client": "Games are played on client version",
    "Liste des champions indisponible": "Champion list unavailable", "Liste des agents indisponible": "Agent list unavailable",
    "Combattant": "Fighter", "Tireur": "Marksman", "Duelliste": "Duelist", "Initiateur": "Initiator", "Contrôleur": "Controller", "Sentinelle": "Sentinel",
    "Classements": "Rankings", "Classement de la source, sans justification chiffrée.": "Source ranking, without figures.", "Chez les pros": "In pro play", "Cité dans les notes de patch": "Mentioned in patch notes",
    "Stratégies associées": "Related strategies", "Agent": "Agent", "Champion": "Champion", "Champions": "Champions",
    // ---- Actus, stratégies, favoris
    "Toutes les actus": "All news", "Voir la méta": "See the meta", "Les faits en détail": "The facts in detail", "Notre lecture": "Our take",
    "Interprétation de la rédaction, fondée sur les sources ci-dessous.": "Editor's interpretation, based on the sources below.", "À surveiller :": "To watch:",
    "Texte de la source officielle, pas encore synthétisé par la rédaction.": "Text from the official source, not yet summarized by the editors.", "· synthèse du": "· summary from",
    "Stratégies": "Strategies", "Fiches construites uniquement à partir de sources citées.": "Guides built only from cited sources.", "Toutes les stratégies": "All strategies",
    "Rubrique": "Category", "Aucune actu pour ce filtre": "No news for this filter", "Article introuvable": "Article not found", "Il a peut-être été retiré des sources.": "It may have been removed from the sources.",
    "Contenu": "Content", "Enregistré": "Saved", "Enregistrer": "Save", "Enregistrée": "Saved", "Concernés par ce patch": "Affected by this patch", "Type": "Type",
    "Pas encore de fiche vérifiée": "No verified guide yet", "Aucune stratégie sourcée n'est disponible pour ce jeu.": "No sourced strategy is available for this game.", "Stratégie introuvable": "Strategy not found",
    "Objectif": "Goal", "Composition": "Composition", "Conditions": "Conditions", "Par carte": "By map", "Exécution": "Execution", "Limites": "Limits",
    "Officiel": "Official", "Contradictoire": "Conflicting", "Non confirmé": "Unconfirmed", "Confirmé": "Confirmed", "Média": "Media", "Esport": "Esports", "Annonce": "Announcement", "Communauté": "Community", "Douteux": "Doubtful",
    "Enregistrés dans ce navigateur, sans compte.": "Saved in this browser, no account needed.", "Équipes suivies": "Followed teams", "À venir": "Upcoming", "Derniers matchs": "Latest matches",
    "Articles enregistrés": "Saved articles", "Stratégies enregistrées": "Saved strategies", "Aucun article enregistré.": "No saved article.", "Aucune stratégie enregistrée.": "No saved strategy.",
    "Rechercher une équipe": "Search for a team", "Suivre une autre équipe": "Follow another team",
    "Touche une équipe pour la suivre : ses prochains matchs et ses résultats apparaîtront ici.": "Tap a team to follow it: its upcoming matches and results will show up here.",
    "Ajouter aux équipes favorites": "Add to favorite teams", "Retirer des équipes favorites": "Remove from favorite teams",
    // ---- Coach : onglets et accueil
    "Mon suivi": "My progress", "Mes parties": "My games", "Préparer": "Prepare", "Bilan de partie": "Game review", "Mon bilan complet": "My full review",
    "Tes erreurs qui reviennent, tes forces et les adversaires à préparer, sur tes 20 dernières parties": "Your recurring mistakes, your strengths and the opponents to prepare for, over your last 20 games",
    "Bientôt disponible": "Coming soon", "La lecture de tes parties arrive dès la validation de la clé Riot": "Reading your games arrives as soon as Riot approves the key",
    "Le coach est prêt et testé. Il attend l'accord de Riot Games pour lire les parties de tout le monde. Voici ce qu'il te montrera, sur une vraie partie.": "The coach is ready and tested. It is waiting for Riot Games' approval to read everyone's games. Here is what it will show you, on a real game.",
    "Chaque partie résumée : tes chiffres et ta phase de lane face à ton adversaire.": "Every game summed up: your numbers and your laning phase against your opponent.",
    "Le replay sur la minimap s'arrête sur tes erreurs et explique ce qui aurait été mieux.": "The minimap replay stops on your mistakes and explains what would have been better.",
    "Ta priorité": "Your priority", ": l'erreur qui te coûte le plus de parties, avec quoi faire.": ": the mistake that costs you the most games, and what to do.",
    "Je suis en partie": "I'm in game", ": ton face-à-face, des conseils contre ton adversaire et ton build adapté à son équipe.": ": your matchup, tips against your opponent and a build adapted to their team.",
    "Comparé aux meilleurs": "Compared with the best", ": tout est mesuré face aux joueurs Diamant et plus de ton poste.": ": everything is measured against Diamond+ players in your role.",
    "Déjà disponibles : le face-à-face et les fiches champions, dans les onglets Préparer et Champions.": "Already available: matchups and champion pages, in the Prepare and Champions tabs.",
    "Tes vraies parties, un objectif à la fois": "Your real games, one goal at a time", "Connecte ton compte": "Connect your account", "avec ton Riot ID : rien à installer.": "with your Riot ID: nothing to install.",
    "Bilan de chaque partie": "Review of every game", ": morts, backs, objectifs, comparés aux joueurs Diamant+ de ton rôle.": ": deaths, backs, objectives, compared with Diamond+ players in your role.",
    "Un seul objectif": "Just one goal", "suivi de partie en partie, avec les vidéos de coachs qui l'expliquent.": "tracked game after game, with coaching videos that explain it.",
    "Ton coach personnel": "Your personal coach", "Comptes récents": "Recent accounts", "Annuler": "Cancel", "Actualiser mes parties": "Refresh my games", "Changer de Riot ID": "Change Riot ID",
    "Voir ce compte": "View this account", "Analyser mes parties": "Analyze my games", "Région": "Region", "Riot ID": "Riot ID",
    "Seules des données de jeu publiques sont lues. Ton Riot ID reste sur cet appareil.": "Only public game data is read. Your Riot ID stays on this device.",
    "Riot ID attendu sous la forme Pseudo#TAG (le TAG est visible dans le client, sous ton pseudo).": "Riot ID expected as Name#TAG (the TAG is shown in the client, under your name).",
    "Non classé en solo/duo": "Unranked in solo/duo", "Lecture de tes dernières parties…": "Reading your recent games…", "Dernières parties": "Recent games", "Nouveau": "New",
    "Ta dernière partie est prête": "Your last game is ready", "· voir le bilan": "· see the review", "· contre": "· vs",
    "Choisir un point à améliorer": "Pick something to improve", "Ton objectif": "Your goal", "Rôle suivi": "Role followed",
    "Référence indisponible : l'objectif ne peut pas être calculé pour l'instant.": "Reference unavailable: the goal can't be calculated right now.",
    "pour que le coach te propose un objectif.": "so the coach can suggest a goal.", "Ta priorité ·": "Your priority ·", "D'après ton bilan sur": "From your review over",
    "Voir le détail et les parties concernées": "See details and the games involved", "Aucune erreur qui revient": "No recurring mistake",
    "Trouve ce qui te coûte des parties": "Find what costs you games", "Lancer mon bilan (environ 1 minute)": "Run my review (about 1 minute)",
    ": combats, objectifs, morts. Il en tire ta priorité.": ": fights, objectives, deaths. It works out your priority.",
    "Objectif atteint ·": "Goal reached ·", "Objectif atteint": "Goal reached", "de tes 5 dernières parties. Bravo !": "of your last 5 games. Well done!", "Toi en ce moment": "You right now", "Ta cible": "Your target",
    "(Diamant et plus)": "(Diamond+)", "en progrès,": "improving,", "· niveau 2": "· level 2", "Ce qu'il faut faire": "What to do",
    "Aucune partie classée récente": "No recent ranked game", "Le bilan porte sur les parties classées, ou à défaut normales (hors ARAM).": "The review covers ranked games, or normal games if there are none (no ARAM).",
    "Recherche d'une partie en cours…": "Looking for a live game…", "Aucune partie en cours.": "No live game.", "Partie en cours ·": "Live game ·", "Compte non connecté": "Account not connected",
    "Connecter mon compte": "Connect my account", "Lecture de la partie…": "Reading the game…", "Base du coach indisponible": "Coach data unavailable",
    "Les connaissances du coach n'ont pas pu être chargées.": "The coach's knowledge could not be loaded.",
    "Pas de connexion au service du coach. Vérifie ta connexion et réessaie.": "Can't reach the coach service. Check your connection and try again.",
    "Réponse illisible du service.": "Unreadable response from the service.", "Le service du coach est momentanément indisponible. Réessaie dans quelques minutes.": "The coach service is temporarily unavailable. Try again in a few minutes.",
    "Analyser les compositions": "Analyze the team comps", "Face-à-face complet": "Full matchup", "Rôles estimés : Riot ne les donne pas pendant la partie.": "Estimated roles: Riot doesn't provide them during the game.",
    "Ton build pour cette partie": "Your build for this game", "Build des Diamant+ sur": "Diamond+ build on",
    "Pourcentage : part des parties Diamant+ où l'item est dans l'inventaire en fin de partie.": "Percentage: share of Diamond+ games where the item is in the inventory at the end.",
    "Composition adverse sans menace marquée : garde ce build.": "Enemy team has no clear threat: keep this build.", "À adapter face à cette équipe": "To adapt against this team",
    // ---- Coach : bilan de partie et replay
    "Sbires": "CS", "Par min": "Per min", "KDA": "KDA", "Golds": "Gold", "XP": "XP", "Phase de lane": "Laning phase", "L'essentiel": "Overview", "Replay": "Replay", "Chiffres": "Numbers", "Vue": "View",
    "En bref": "In short", "À travailler": "To work on", "Point fort": "Strength", "Ce qui a pesé": "What mattered", "Constat": "Finding", "Toi face aux bons joueurs": "You vs good players",
    "Aucun écart net avec la référence Diamant+ sur cette partie.": "No clear gap with the Diamond+ reference in this game.", "à revoir en replay": "to rewatch in replay",
    "La partie rejouée sur la minimap, avec ce qui aurait été mieux": "The game replayed on the minimap, with what would have been better", "Ton build face aux Diamant+": "Your build vs Diamond+",
    "Voir la fiche": "See the page", "La partie en replay": "Game replay",
    "Lance la lecture : elle s'arrête d'elle-même sur tes morts et sur les erreurs relevées, avec ce qui aurait été mieux. Les points de la frise sont cliquables.": "Press play: it stops by itself on your deaths and on the mistakes found, with what would have been better. The dots on the timeline are clickable.",
    "Moment clé ·": "Key moment ·", "Ce qui aurait été mieux": "What would have been better", "Rien de marquant à cet instant. Lance la lecture ou saute au moment clé suivant.": "Nothing notable right now. Press play or jump to the next key moment.",
    "Trajet suivi :": "Path shown:", ", 2 dernières minutes. Touche un champion pour suivre le sien.": ", last 2 minutes. Tap a champion to follow theirs.", "(toi)": "(you)",
    "Moment de la partie": "Game time", "ton équipe devant ▲": "your team ahead ▲", "▼ derrière": "▼ behind", "Moment clé précédent": "Previous key moment", "Moment clé suivant": "Next key moment",
    "Vitesse de lecture": "Playback speed", "Moments affichés": "Moments shown", "ton équipe": "your team", "adversaires": "enemies", "erreur relevée": "mistake found", "ta mort": "your death",
    "objectif": "objective", "combat": "fight", "Pause": "Pause", "Lire": "Play", "Mes moments": "My moments", "Combats": "Fights", "Objectifs": "Objectives", "Revoir ce moment": "Rewatch this moment",
    "combats proches de toi auxquels tu as participé": "nearby fights you took part in", "objectifs où tu étais présent": "objectives where you were present",
    "morts seul face à plusieurs adversaires": "deaths alone against several enemies", "morts sur un gank avant 14 min": "deaths to a gank before 14 min",
    ") et interactions": ") and interactions", "Entre deux relevés, le trajet affiché est une ligne droite.": "Between two snapshots, the path shown is a straight line.",
    "Les tournants de la partie": "Turning points of the game", "pour ton équipe": "for your team", "T'ont éliminé le plus": "Killed you the most", "Tu as éliminé le plus": "You killed the most", "Tes kills avec": "Your kills with",
    "gagné": "won", "perdu": "lost", "égal": "even", "avec toi": "with you", "tu étais tout près": "you were very close", "tu étais à quelques secondes": "you were a few seconds away",
    "tu étais loin": "you were far", "tu étais à l'autre bout de la carte": "you were on the other side of the map", ", gagné": ", won", ", perdu": ", lost", "(avec toi)": "(with you)",
    ", aucun allié autour": ", no ally around", ", tu étais loin": ", you were far", "Achats après la mort": "Items bought after death", "Back": "Back", "achats après une mort": "items bought after a death",
    "Déroulé": "Timeline", "objectif pris": "objective taken", "objectif perdu": "objective lost", "Détail :": "Details:", "Temps passé mort": "Time spent dead", "réussi": "achieved",
    "Taux de victoire du champion de ton équipe dans chaque duel, avec la marge d'erreur à 95 %.": "Win rate of your team's champion in each matchup, with the 95% margin of error.",
    // ---- Coach : préparer, champions, bilan complet
    "Ma partie (draft)": "My game (draft)", "Face-à-face": "Matchup", "Je joue": "I play", "Adversaire": "Opponent", "Adversaires": "Enemies", "Préparer le face-à-face": "Prepare the matchup",
    "Ex. Ahri": "e.g. Ahri", "Ex. Zed": "e.g. Zed", "Rechercher un champion": "Search for a champion", "Le jouer": "Playing it", "L'affronter": "Facing it", "Préparer un face-à-face": "Prepare a matchup",
    "Conseils officiels de Riot et avis attribués de coachs, contrôlés avant publication. Les statistiques de matchup ne sont pas encore publiées.": "Official Riot tips and attributed coach advice, checked before publishing. Matchup stats are not published yet.",
    "Les statistiques de matchups arrivent avec la version en ligne du coach.": "Matchup stats arrive with the online version of the coach.",
    "Duels par lane · joueurs Diamant+": "Lane matchups · Diamond+ players", "Bot lane à 2 contre 2": "Bot lane 2v2", "dans cette partie": "in this game", "Compositions": "Team comps",
    "Mes champions dans cette partie": "My champions in this game", "Mon rôle": "My role", "Mon équipe": "My team", "Analyser": "Analyze", "Tout effacer": "Clear all",
    "Renseigne les champions au fil de la sélection : l'analyse se met à jour avec ce qui est connu.": "Fill in champions during champ select: the analysis updates with what is known.",
    "Mes champions en": "My champions in", "Ajouter": "Add", "Ajouter un champion": "Add a champion", "Joués récemment :": "Played recently:",
    "Ajoute les champions que tu joues dans ce rôle : le coach les compare pour chaque partie.": "Add the champions you play in this role: the coach compares them for each game.",
    "Composition et matchups": "Team comp and matchups", "Analyse de la draft…": "Analyzing the draft…", "Statistiques Diamant+…": "Diamond+ stats…", "Données Diamant+…": "Diamond+ data…",
    "Ce que jouent les Diamant+ · patch": "What Diamond+ players run · patch", "Rune clé": "Keystone", "Items": "Items", "Sorts": "Spells",
    "Part des parties où l'item est dans l'inventaire en fin de partie, sur de vraies parties classées Diamant+ (EUW).": "Share of games where the item is in the inventory at the end, from real Diamond+ ranked games (EUW).",
    "Synthèse du coach ·": "Coach summary ·", "parties relues": "games reviewed", "Avant chaque partie": "Before each game", "Après chaque partie": "After each game", "prépare la draft": "prepare the draft",
    "pour connaître ton duel et les compositions.": "to know your matchup and the team comps.", ": ouvre la carte de la partie et vérifie ta priorité.": ": open the game's map and check your priority.",
    "Relecture de tes parties": "Reviewing your games", "Parties concernées :": "Games involved:", "Pas encore de point fort net sur ces parties.": "No clear strength in these games yet.",
    "Aucun point faible qui revient dans plusieurs parties.": "No weakness that comes back across several games.", "Aucun point faible récurrent : garde ce qui marche": "No recurring weakness: keep what works",
    "Adversaires à préparer": "Opponents to prepare for", "Ta prochaine session": "Your next session", "Aucune partie": "No game", "Voir la partie": "See the game",
    "Adversaires rencontrés plusieurs fois": "Opponents met several times", "Ce qui t'a coûté des parties": "What cost you games",
    "Des erreurs qui font souvent perdre la partie où elles arrivent.": "Mistakes that often lose the game they happen in.", "Les habitudes des bons joueurs qui te manquent": "Good players' habits you're missing",
    "Plus rares chez les Diamant et plus : à travailler dans le temps, partie après partie.": "Rarer among Diamond+ players: to work on over time, game after game.", "Forces": "Strengths", "Profil": "Profile", "À corriger en priorité :": "Fix first:",
    "Ensuite": "Then", "Top": "Top", "Jungle": "Jungle", "Mid": "Mid", "ADC": "ADC", "Support": "Support",
    "Fer": "Iron", "Argent": "Silver", "Or": "Gold", "Platine": "Platinum", "Émeraude": "Emerald", "Diamant": "Diamond", "Maître": "Master", "Grand Maître": "Grandmaster", "Grand maître": "Grandmaster",
    // ---- Coach : objectifs et conseils (textes du coach)
    "Mieux farmer en début de partie": "Farm better early", "Farm en début de partie": "Early farm", "Farmer davantage sur toute la partie": "Farm more over the whole game", "Farm": "Farm",
    "Mourir moins": "Die less", "Morts": "Deaths", "Mieux éclairer la carte": "Improve your vision", "Vision": "Vision", "Poser des control wards": "Place control wards", "Control wards": "Control wards",
    "Participer à plus de combats": "Join more fights", "Participation aux combats": "Fight participation",
    "En jungle, le farm, ce sont les camps de monstres que tu tues. Plus tu en fais, plus vite tu gagnes de l'or et des niveaux.": "In the jungle, farm means the monster camps you clear. The more you clear, the faster you gain gold and levels.",
    "Les sbires sont les petits soldats qui avancent dans les lanes. Donner le last hit à un sbire rapporte de l'or : c'est ta première source d'or pour acheter tes items.": "Minions are the small soldiers walking down the lanes. Last-hitting a minion gives gold: it's your main source of gold to buy items.",
    "Enchaîne tes camps sans temps mort : chaque camp tué, c'est de l'or et de l'expérience.": "Chain your camps without downtime: every camp cleared is gold and XP.",
    "Entre deux attaques sur une lane, reviens prendre tes camps.": "Between ganks, come back to clear your camps.", "Garde le même ordre de camps à chaque partie pour gagner en rythme.": "Keep the same camp order every game to build rhythm.",
    "Ne frappe un sbire que lorsqu'il est presque mort : seul le last hit donne l'or.": "Only hit a minion when it's almost dead: only the last hit gives gold.",
    "Avant de rentrer à la base, tue d'abord les sbires adverses pour perdre le moins de farm possible.": "Before backing, kill the enemy minions first to lose as little farm as possible.",
    "Entraîne-toi 5 minutes en mode Entraînement : vise 70 sbires à 10 minutes.": "Spend 5 minutes in Practice Tool: aim for 70 CS at 10 minutes.",
    "Le nombre de sbires et de monstres que tu achèves par minute, du début à la fin. Plus de farm, c'est plus d'or, donc de meilleurs items.": "The number of minions and monsters you last-hit per minute, start to finish. More farm means more gold, so better items.",
    "Après la phase de lane (vers 14 min), continue à prendre les waves de sbires proches de toi entre deux combats.": "After laning (around 14 min), keep taking minion waves near you between fights.",
    "Quand il ne se passe rien, va chercher une wave sur une lane de côté plutôt que d'attendre.": "When nothing is happening, go take a wave in a side lane instead of waiting.",
    "Ne laisse jamais une wave mourir sous ta tourelle sans la prendre.": "Never let a wave die under your turret without taking it.",
    "Chaque mort te fait attendre sans jouer, donne de l'or à l'adversaire et lui laisse le temps de prendre des objectifs.": "Every death makes you wait without playing, gives gold to the enemy and gives them time to take objectives.",
    "Quand ton adversaire disparaît de la carte, recule : il arrive peut-être avec d'autres.": "When your opponent disappears from the map, back off: they may be coming with others.",
    "Avant d'avancer seul, regarde la minimap et compte les adversaires visibles.": "Before pushing forward alone, check the minimap and count the visible enemies.",
    "Après chaque mort, demande-toi ce que tu ne voyais pas : c'est souvent la même erreur qui revient.": "After every death, ask yourself what you couldn't see: it's often the same mistake coming back.",
    "Le score de vision compte ce que tu fais pour voir la carte : wards posées, wards adverses détruites. Voir l'adversaire venir évite des morts et aide à prendre les objectifs.": "Vision score counts what you do to see the map: wards placed, enemy wards destroyed. Seeing the enemy coming prevents deaths and helps take objectives.",
    "Pose ta ward gratuite (le trinket, touche 4) dès qu'elle est rechargée.": "Place your free ward (the trinket, key 4) as soon as it's recharged.", "Achète une control ward (75 golds) à chaque back.": "Buy a control ward (75 gold) every back.",
    "Place tes wards là où l'adversaire passe : rivière, entrées de jungle, et autour du dragon une minute avant qu'il apparaisse.": "Place your wards where the enemy walks: river, jungle entrances, and around the dragon pit a minute before it spawns.",
    "La control ward (75 golds) révèle les wards adverses autour d'elle. C'est l'un des achats les plus rentables du jeu.": "The control ward (75 gold) reveals enemy wards around it. It's one of the best-value purchases in the game.",
    "Achètes-en une à chaque back.": "Buy one every back.", "Pose-la dans un buisson de la rivière ou près d'un objectif (dragon, Baron).": "Place it in a river bush or near an objective (dragon, Baron).",
    "Garde toujours une place libre pour elle dans ton inventaire.": "Always keep a free slot for it in your inventory.",
    "La part des kills de ton équipe auxquelles tu participes. Être là quand ton équipe se bat change le rapport de force.": "The share of your team's kills you take part in. Being there when your team fights changes the balance of power.",
    "Après avoir poussé ta wave, regarde la minimap : si un combat se prépare près de toi, rejoins-le.": "After pushing your wave, check the minimap: if a fight is building near you, join it.",
    "Avant un dragon ou un Baron, rejoins ton équipe une minute avant.": "Before a dragon or Baron, join your team a minute early.", "Évite de farmer seul à l'autre bout de la carte quand ton équipe est regroupée.": "Avoid farming alone on the other side of the map when your team is grouped.",
    "Vise la référence Diamant+ à 10 min : chaque wave perdue, ce sont 6 sbires et leur or.": "Aim for the Diamond+ reference at 10 min: every lost wave is 6 minions and their gold.",
    "Après la phase de lane, continue à prendre les waves proches de toi entre deux combats.": "After laning, keep taking the waves near you between fights.",
    "Pour chaque mort, note ce que tu ne voyais pas (adversaires absents de la minimap, vision) : ouvre le bilan de la partie, chaque mort y est datée.": "For each death, note what you couldn't see (enemies missing from the minimap, vision): open the game review, every death is timestamped there.",
    "Pose une ward à chaque retour et utilise ton trinket dès qu'il est rechargé.": "Place a ward every back and use your trinket as soon as it's recharged.",
    "Une control ward à chaque back : c'est 75 golds, et souvent un objectif sauvé.": "A control ward every back: it's 75 gold, and often an objective saved.",
    "Après avoir poussé ta wave, regarde la minimap : rejoins les combats qui ont lieu près de toi.": "After pushing your wave, check the minimap: join the fights happening near you.",
    "Dans la minute qui précède un dragon ou un Baron, rejoins ton équipe et évite de mourir seul loin de l'objectif : l'adversaire le prendrait en surnombre.": "In the minute before a dragon or Baron, join your team and avoid dying alone far from the objective: the enemy would take it with numbers.",
    "Avant de quitter ta lane (back, aide à un combat), pousse ta wave vers la tourelle adverse : elle ne s'écrasera pas sous la tienne pendant ton absence.": "Before leaving your lane (back, helping a fight), push your wave into the enemy turret: it won't crash under yours while you're away.",
    "Quand ton adversaire a l'avantage, joue la sécurité : prends les sbires près de ta tourelle, signale-le à ton jungler et ne te bats qu'avec un avantage net.": "When your opponent is ahead, play safe: farm near your turret, ping your jungler and only fight with a clear advantage.",
    "En phase de lane, recule quand ton adversaire disparaît de la carte ou que son jungler est vu de ton côté : la plupart des morts précoces viennent d'un adversaire non vu.": "In lane, back off when your opponent disappears from the map or their jungler is seen on your side: most early deaths come from an unseen enemy.",
    "Rentre à la base dès que tu peux acheter un composant important, de préférence après avoir poussé ta wave.": "Back as soon as you can buy an important component, ideally after pushing your wave.",
    "Après la phase de lane, ne pousse pas seul dans la moitié adverse quand plusieurs adversaires ne sont pas visibles : reste à portée de ton équipe ou replie-toi avant leur arrivée.": "After laning, don't push alone on the enemy half when several enemies are missing: stay within reach of your team or fall back before they arrive.",
    "Environ une minute avant un dragon ou un Baron, pousse ta wave puis rejoins ton équipe : l'adversaire prend les objectifs quand vous êtes moins nombreux.": "About a minute before a dragon or Baron, push your wave then join your team: the enemy takes objectives when you have fewer players.",
    "Si un allié est mort ou absent, cède l'objectif et prends plutôt une tourelle ou une wave de l'autre côté de la carte, au lieu de combattre en infériorité.": "If an ally is dead or missing, give up the objective and take a turret or a wave on the other side of the map instead of fighting outnumbered.",
    "Après ton premier retour, échange ton trinket jaune contre la Lentille de l'oracle (trinket rouge, gratuit à la boutique) : active-la en passant près d'un buisson de rivière ou d'une entrée de jungle, ou pose une control ward, et détruis les wards adverses que tu trouves.": "After your first back, swap your yellow trinket for Oracle Lens (red trinket, free in the shop): activate it near river bushes or jungle entrances, or place a control ward, and destroy the enemy wards you find.",
    "Rentre à la base dès que tu as l'or d'un composant, juste après avoir poussé tes sbires vers la tourelle adverse (en jungle : après un camp ou un gank) : tu reviens à temps et avec un item de plus.": "Back as soon as you have the gold for a component, right after pushing your minions into the enemy turret (in the jungle: after a camp or a gank): you come back on time and with one more item.",
    "Vise ton premier grand item vers 11 min : prends chaque sbire possible et rentre dès que tu as l'or d'un composant, plutôt que de rester sur la carte avec peu de points de vie.": "Aim for your first big item around 11 min: take every minion you can and back as soon as you have the gold for a component, rather than staying on the map at low health.",
    "Achète une control ward à chaque back et pose-la près du prochain objectif (dragon, Larves, Héraut) ou dans ta jungle. Tu ne peux en poser qu'une à la fois : si l'ancienne est encore en place, déplace-la vers le prochain objectif.": "Buy a control ward every back and place it near the next objective (dragon, Grubs, Herald) or in your jungle. You can only have one at a time: if the old one is still up, move it to the next objective.",
    "Pour aller plus loin": "Learn more", "en français": "in French", "en coréen": "in Korean", "en anglais": "in English",
  };
  // Motifs : durées, compteurs et dates composées
  const R = [
    [/^il y a (\d+) min$/, "$1 min ago"], [/^il y a (\d+) h$/, "$1 h ago"], [/^il y a (\d+) j$/, "$1 d ago"], [/il y a (\d+) min\b/g, "$1 min ago"], [/il y a (\d+) h\b/g, "$1 h ago"], [/il y a (\d+) j\b/g, "$1 d ago"],
    [/\bà l'instant\b/g, "just now"], [/^Aujourd'hui · /, "Today · "],
    [/^(\d+),(\d)$/, "$1.$2"], [/(\d+),(\d) (sbires|CS) par minute/g, "$1.$2 CS per minute"],
    [/^(\d+) parties? réussies? sur les (\d+) dernières$/, "$1 successful games out of the last $2"], [/(\d+) d'affilée/g, "$1 in a row"],
    [/^(\d+) moments? clés? à revoir en replay$/, "$1 key moment(s) to rewatch in replay"],
    [/^Données synchronisées (.*) : elles peuvent être en retard\.$/, "Data synced $1: it may be out of date."],
    [/^Réussi dans (\d+) de tes 5 dernières parties\. Bravo !$/, "Achieved in $1 of your last 5 games. Well done!"],
    [/^Joue au moins 3 parties en (.+) pour que le coach te propose un objectif\.$/, "Play at least 3 games as $1 so the coach can suggest a goal."],
    [/^(\d+) parties$/, "$1 games"], [/(\d+) victoires? sur les (\d+) parties relues/g, "$1 wins out of the $2 games reviewed"],
    [/^Mid · contre /, "Mid · vs "],
    // Accueil, compétitions, méta
    [/^Ajouter aux favoris : (.+)$/, "Add to favorites: $1"], [/^Retirer des favoris : (.+)$/, "Remove from favorites: $1"], [/^Retirer (.+) des favoris$/, "Remove $1 from favorites"], [/^Suivre (?!le trajet)(.+)$/, "Follow $1"],
    [/^(Champions les plus joués|Les plus joués) · (.+)$/, (m, k, x) => (k === "Les plus joués" ? "Most played · " : "Most played champions · ") + x],
    [/^Taux de sélection sur (\d+) parties officielles$/, "Pick rate over $1 official games"],
    [/^En cours : /, "Live: "], [/^Prochain : /, "Next: "],
    [/^Heures de (.+?) \((UTC[^)]*)\)( · fuseau de votre appareil)?$/, (m, c, u, d) => `Times in ${c} (${u})${d ? " · your device's time zone" : ""}`],
    [/^Données officielles du (.+?)( ·)?$/, "Official data from $1$2"], [/^Notes du (.+)$/, "Notes from $1"], [/^Patch (.+) : notes officielles du (.+)$/, "Patch $1: official notes from $2"],
    [/^Pour chaque champion, on compte les parties officielles où il a été choisi, divisé par le nombre total de parties analysées \((\d+)\)\. Un champion ne peut être choisi qu'une fois par partie : ce taux de sélection va donc de 0 à 100 %\.$/, "For each champion, we count the official games where it was picked, divided by the total number of games analyzed ($1). A champion can only be picked once per game, so this pick rate ranges from 0 to 100%."],
    [/^Versions client des parties \(numéro technique du jeu\) : (.+)\. Riot ne publie pas leur correspondance avec les noms de patch\.$/, "Client versions of the games (technical game number): $1. Riot does not publish how they map to patch names."],
    [/^Taux de victoire, rôles et détail par champion :$/, "Win rate, roles and per-champion details:"],
    [/^Touchez un (champion|agent) pour voir ses classements, ses stats et les contenus liés\.$/, "Tap a $1 to see its rankings, stats and related content."],
    [/^Afficher plus \((\d+)\)$/, "Show more ($1)"], [/^(.+) : (\d+) séries? gagnées? sur (\d+)$/, "$1: $2 series won out of $3"],
    [/^Taux de sélection : part des parties où le champion est choisi\.$/, "Pick rate: share of games where the champion is picked."],
    [/^3 victoires et c'est la qualification$/, "3 wins means qualification"], [/^pour la phase finale,$/, "for the playoffs,"], [/^3 défaites et c'est l'élimination$/, "3 losses means elimination"],
    [/^\. Personne ne joue plus de 5 matchs\.$/, ". Nobody plays more than 5 matches."], [/^Règlement des Worlds :$/, "Worlds rules:"],
    [/^Les matchs qui décident d'une qualification ou d'une élimination se jouent au meilleur des 3 manches \(BO3\), les autres en une seule manche \(BO1\) : un faux pas en BO1 ne condamne pas, mais il oblige à gagner les suivants\.$/, "Matches that decide a qualification or an elimination are best of 3 (BO3), the others a single game (BO1): a slip-up in a BO1 is not fatal, but it means winning the next ones."],
    // Coach
    [/^(Victoire|Défaite) avec (.+?) · (.+?) · voir le bilan$/, (m, w, c, t) => `${w === "Victoire" ? "Win" : "Loss"} with ${c} · ${t} · see the review`],
    [/^Ta priorité · (.+)$/, "Your priority · $1"], [/^Objectif atteint · (.+)$/, "Goal reached · $1"],
    [/^Tes bases sont au niveau \(farm, morts, vision\)\. Le coach peut maintenant relire tes 20 dernières parties en (.+) : combats, objectifs, morts\. Il en tire ta priorité\.$/, "Your basics are on par (farm, deaths, vision). The coach can now review your last 20 games as $1: fights, objectives, deaths. It works out your priority from them."],
    [/^Données officielles de Riot Games · référence : (\d+) parties Diamant et plus \(patch (.+)\)$/, "Official Riot Games data · reference: $1 Diamond+ games (patch $2)"], [/^Données officielles de Riot Games$/, "Official Riot Games data"],
    [/^(\d+) parties? classées? récentes? · (\d+) victoires?\. Touche une partie pour son bilan\.$/, "$1 recent ranked games · $2 wins. Tap a game for its review."],
    [/^(\d+) parties? récentes? · (\d+) victoires?\. Touche une partie pour son bilan\.$/, "$1 recent games · $2 wins. Tap a game for its review."],
    [/^Synthèse du coach · (.+?) · (\d+) victoires? sur les (\d+) parties relues$/, "Coach summary · $1 · $2 wins out of the $3 games reviewed"],
    [/^Phase de lane · écart avec (.+)$/, "Laning phase · gap with $1"], [/^Phase de lane \(avec ton duo\)$/, "Laning phase (with your duo)"],
    [/^ ?\(toi\), 2 dernières minutes\. Touche un champion pour suivre le sien\.$/, " (you), last 2 minutes. Tap a champion to follow theirs."],
    [/^Tous les combats \((\d+)\) et interactions$/, "All fights ($1) and interactions"],
    [/^\((\d+) adversaires? éliminés?, (\d+) alliés?\) · (avec toi|sans toi \((.+)\))$/, (m, e, a2, w, why) => `(${e} ${e > 1 ? "enemies" : "enemy"} killed, ${a2} ${a2 > 1 ? "allies" : "ally"} lost) · ${w === "avec toi" ? "with you" : "without you (" + ({ "tu étais tout près": "you were very close", "tu étais à quelques secondes": "you were a few seconds away", "tu étais loin": "you were far", "tu étais à l'autre bout de la carte": "you were on the other side of the map" }[why] || why) + ")"}`],
    [/^Suivre le trajet de (.+) \((toi|adversaire|allié)\)$/, (m, c, w) => `Show ${c}'s path (${{ toi: "you", adversaire: "enemy", "allié": "ally" }[w]})`],
    [/^Tu meurs \((.+?)\) : tué par (.+?)(?:, (\d+) adversaires sur toi)?(, aucun allié autour)?$/, (m, z, k, n, al) => `You die (${ZONE(z)}): killed by ${k}${n ? `, ${n} enemies on you` : ""}${al ? ", no ally around" : ""}`],
    [/^Combat (.+?) : (\d+) contre (\d+)(, gagné|, perdu)?( \(avec toi\))?$/, (m, z, a2, b2, r, me) => `Fight (${ZONE(z)}): ${a2} vs ${b2}${r === ", gagné" ? ", won" : r ? ", lost" : ""}${me ? " (with you)" : ""}`],
    [/^(Dragon|Baron|Héraut|Larves du Néant|Atakhan) (pris|perdu) : (\d+) contre (\d+) autour(, tu étais loin)?$/, (m, k, w, a2, b2, far) => `${OBJ(k)} ${w === "pris" ? "taken" : "lost"}: ${a2} vs ${b2} around${far ? ", you were far" : ""}`],
    [/^(\d+:\d\d) (:|·) (.+)$/, (m, t, sep, rest) => `${t} ${sep} ${tr(rest).trim()}`],
    [/^Nunu et Willump$/, "Nunu & Willump"], [/^(.+) · (Système suisse|Phase finale|Play-ins)$/, (m, a2, b2) => `${a2} · ${{ "Système suisse": "Swiss stage", "Phase finale": "Playoffs", "Play-ins": "Play-In" }[b2]}`], [/^(.+) arrive bientôt$/, "$1 is coming soon"], [/^(.+), bientôt disponible$/, "$1, coming soon"], [/^Ça m'intéresse : (.+)$/, "I'm interested: $1"], [/^Ne plus suivre : (.+)$/, "Stop following: $1"], [/^Coach, partie en cours$/, "Coach, live game"], [/^Coach, nouvelle partie à relire$/, "Coach, new game to review"],
    [/^(Golds|Sbires|XP) à (\d+) min$/, (m, k, n) => `${{ Golds: "Gold", Sbires: "CS", XP: "XP" }[k]} at ${n} min`], [/^Constat (\d+)$/, "Finding $1"],
    [/^gagnée : (ton duo a )?(.+?) golds d'avance sur (.+) à 10 min$/, (m, d, n, o) => `won: ${d ? "your duo was " : ""}${n} gold ahead of ${o} at 10 min`],
    [/^difficile : (ton duo a )?(.+?) golds de retard sur (.+) à 10 min$/, (m, d, n, o) => `tough: ${d ? "your duo was " : ""}${n} gold behind ${o} at 10 min`],
    [/^équilibrée face à (.+) \((.+?) golds à 10 min\)$/, "even against $1 ($2 gold at 10 min)"],
    [/^(\d+) min, soit (\d+) % de la partie$/, "$1 min, $2% of the game"],
    [/^(Top|Jungle|Mid|ADC|Bot|Support) · contre /, "$1 · vs "], [/^(.+) · toi$/, "$1 · you"], [/^Mes champions en (.+)$/, "My champions as $1"],
    [/^Bilans · (.+)$/, "Records · $1"], [/^Classement · (.+)$/, "Standings · $1"], [/^(.+) \(officiel\)$/, "$1 (official)"], [/^Version client (.+)$/, "Client version $1"], [/^Partie (\d+) · (.+)$/, "Game $1 · $2"], [/^Partie (\d+) · $/, "Game $1 · "], [/^Patch (\S+) · (.+)$/, "Patch $1 · $2"],
    [/^(.+) · (\d+) contre (\d+) ·$/, (m, z, a2, b2) => `${ZONE(z)} · ${a2} vs ${b2} ·`], [/^(\d+) parties · (\d+) matchs$/, "$1 games · $2 matches"],
  ];
  const ZONE = z => ({ "ta base": "your base", "base adverse": "enemy base", "rivière": "river", "ta jungle": "your jungle", "jungle adverse": "enemy jungle", "inconnue": "unknown" }[z] || z);
  const OBJ = k => ({ "Héraut": "Herald", "Larves du Néant": "Void Grubs" }[k] || k);
  const SKIP = ".nrow-title, .nrow-dek, .article-title, .reading, .summary, .brief-title, .scard-title, .scard-dek, .place-why, .c2-videos, [translate=no], script, style, code";
  function tr(s) {
    const t0 = s.trim(), t = t0.replace(/[\s\u00a0\u202f]+/g, " "); // espaces insécables normalisés
    if (/^\d+,\d+$/.test(t)) return s.replace(t0, t.replace(",", "."));
    if (!t || !/[A-Za-zÀ-ÿ]/.test(t)) return s;
    const en = v => v.replace(/^\s+([:;,.!?)])/, "$1").replace(/ ([:;!?])(?=\s|$)/g, "$1");
    if (T[t] != null) return en(s.replace(t0, T[t]));
    // Motifs appliqués au texte sans ses espaces de bord (les nœuds de texte gardent souvent un espace autour)
    let r = t;
    for (const [re, rep] of R) r = r.replace(re, rep);
    r = r === t ? s : en(s.replace(t0, r));
    // Pas de remplacement par morceaux : il mélangeait les langues dans les phrases du coach (« Combat lost à 13:47 »)
    return r;
  }
  const ATTRS = ["aria-label", "title", "placeholder", "alt", "aria-valuetext"];
  function walk(root) {
    if (root.nodeType === 3) { const p = root.parentElement; if (p && !p.closest(SKIP)) { const v = tr(root.data); if (v !== root.data) root.data = v; } return; }
    if (root.nodeType !== 1 || root.closest?.(SKIP)) return;
    for (const a of ATTRS) { const v = root.getAttribute?.(a); if (v) { const n = tr(v); if (n !== v) root.setAttribute(a, n); } }
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (n.nodeType === 1) { if (n.matches(SKIP)) { const nx = n.nextSibling; continue; } for (const a of ATTRS) { const v = n.getAttribute(a); if (v) { const x = tr(v); if (x !== v) n.setAttribute(a, x); } } continue; }
      const p = n.parentElement; if (!p || p.closest(SKIP)) continue;
      const v = tr(n.data); if (v !== n.data) n.data = v;
    }
  }
  window.i18nTr = tr;
  const start = () => {
    walk(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === "characterData") walk(m.target); else if (m.type === "attributes") walk(m.target); else m.addedNodes.forEach(walk); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  document.title = document.title.replace(/esport[s]? et coach/i, "esports and coach");
})();
