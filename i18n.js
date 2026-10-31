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
    "Langue": "Language", "Le déroulé de chaque partie (tournant, objectifs, joueurs décisifs) est détaillé ci-dessous, d'après les données officielles.": "How each game unfolded (turning point, objectives, key players) is detailed below, from official data.", "Résumé de la partie": "Game summary", "Résumé de la partie en préparation…": "Preparing the game summary…", "Résumé pas encore disponible.": "Summary not available yet.",
    "Statistiques en direct…": "Live stats…", "Entre deux parties : le direct reprend au début de la prochaine.": "Between games: live stats resume when the next one starts.", "Tours": "Towers", "Match terminé : le résultat s'affiche à la prochaine mise à jour.": "Match over: the result appears at the next update.", "Inhibiteurs": "Inhibitors", "Terminée": "Finished", "En direct, environ 30 s de décalage · LoL Esports": "Live, about 30 s delay · LoL Esports",
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
    "Comment est calculé ce classement ?": "How is this ranking computed?", "Relevé le": "Collected on", "· relevé le": "· collected on", "Tier list ranked": "Ranked tier list", "Tier": "Tier", "Touchez un champion pour voir son taux de victoire et le nombre de parties.": "Tap a champion to see its win rate and number of games.", "Quand l'utiliser · Comment": "When to use it · How", "Quand :": "When:", "Pour qui :": "For whom:", "Pourquoi :": "Why:", "À éviter :": "Avoid:", "Un écart de 1 ou 2 points entre deux champions peut venir du hasard, même sur plusieurs centaines de parties.": "A 1 or 2 point gap between two champions can be chance, even over several hundred games.",
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
    "Pas de conseil sur cette partie : tu semblais absent (aucun kill ni assist, presque aucun dégât ni sbire). Elle ne compte pas dans tes objectifs ni dans ton bilan.": "No advice for this game: you seem to have been away (no kills or assists, almost no damage or minions). It doesn't count towards your goals or your report.",
    "En bref": "In short","À travailler": "To work on", "Point fort": "Strength", "Ce qui a pesé": "What mattered", "Constat": "Finding", "Toi face aux bons joueurs": "You vs good players",
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
    "Mes champions dans cette partie": "My champions in this game", "aucune donnée": "no data", "Ton équipe": "Your team", "Parties": "Games", "Un objectif, un plan, une ressource": "One goal, one plan, one resource", "Analysées pour vous": "Analyzed for you", "Mesures du pilote sur cet appareil": "Pilot measurements on this device", "Temps pour vous préparer": "Time to prepare", "Gestion des vagues": "Wave management",
    "Indiquez votre rôle, vos champions et ce que vous voulez travailler. Le coach choisit parmi des conseils déjà analysés, avec leurs sources.": "Enter your role, your champions and what you want to work on. The coach picks from already analyzed tips, with their sources.",
    "Sans profil, toutes les ressources analysées sont listées.": "Without a profile, all analyzed resources are listed.", "Créer mon profil": "Create my profile",
    "Ces informations sont des déclarations : elles restent sur cet appareil, sans compte. Sans partie ni replay analysés, le coach ne connaît pas vos erreurs.": "This information is self-reported: it stays on this device, with no account. Without an analyzed game or replay, the coach doesn't know your mistakes.", "Ce que disent les sources": "What the sources say",
    "Interprétation de la rédaction, fondée sur les sources ci-dessous.": "Editorial interpretation, based on the sources below.", "Interprétation de la rédaction.": "Editorial interpretation.",
    "Interprétation de la rédaction à partir des picks, kills et scores officiels.": "Editorial interpretation based on official picks, kills and scores.",
    "Champions choisis par l'équipe, du plus fréquent au moins fréquent. Les bannissements ne sont pas fournis par l'API officielle.": "Champions picked by the team, from most to least frequent. Bans are not provided by the official API.",
    "Certains matchs sont exclus des taux de victoire : vainqueur des parties non vérifiable.": "Some matches are excluded from win rates: game winners can't be verified.",
    "Vainqueur de chaque partie non vérifié : le décompte ne correspond pas au score officiel.": "Winner of each game not verified: the count doesn't match the official score.",
    "Aucun match programmé dans les données.": "No scheduled match in the data.", "Aucun match programmé dans les données : le calendrier Valorant n'est pas encore relié à une source automatique.": "No scheduled match in the data: the Valorant schedule isn't connected to an automatic source yet.",
    "Valorant : seuls les résultats vérifiés à la main sont disponibles. Aucune source officielle accessible ne fournit encore le calendrier.": "Valorant: only hand-checked results are available. No accessible official source provides the schedule yet.",
    "La préparation personnalisée des sessions concerne League of Legends pour l'instant. Les stratégies Valorant restent disponibles ici.": "Personalized session prep covers League of Legends for now. Valorant strategies remain available here.", "Ton support contre leur ADC": "Your support vs their ADC", "Ton ADC contre leur support": "Your ADC vs their support", "Votre duo ADC + support ensemble": "Your ADC + support duo together", "Face à leurs champions": "Against their champions", "Avec tes alliés": "With your allies",
    "Le point, c'est toi sur cette partie. La zone claire montre où se situe la moitié des joueurs Diamant et plus à ton poste, et le trait leur niveau habituel. Vert : mieux qu'eux ; rouge : en dessous.": "The dot is you in this game. The light band shows where half of Diamond+ players in your role sit, and the line their usual level. Green: better than them; red: below.", "Mon rôle": "My role", "Mon équipe": "My team", "Analyser": "Analyze", "Tout effacer": "Clear all",
    "Renseigne les champions au fil de la sélection : l'analyse se met à jour avec ce qui est connu.": "Fill in champions during champ select: the analysis updates with what is known.",
    "Mes champions en": "My champions in", "Ajouter": "Add", "Ajouter un champion": "Add a champion", "Joués récemment :": "Played recently:",
    "Ajoute les champions que tu joues dans ce rôle : le coach les compare pour chaque partie.": "Add the champions you play in this role: the coach compares them for each game.",
    "Composition et matchups": "Team comp and matchups", "Analyse de la draft…": "Analyzing the draft…", "Statistiques Diamant+…": "Diamond+ stats…", "Données Diamant+…": "Diamond+ data…",
    "Ce que jouent les Diamant+ · patch": "What Diamond+ players run · patch", "Rune clé": "Keystone", "Items": "Items", "Sorts": "Spells",
    "Part des parties où l'item est dans l'inventaire en fin de partie, sur de vraies parties classées Diamant+ (EUW).": "Share of games where the item is in the inventory at the end, from real Diamond+ ranked games (EUW).",
    "Synthèse du coach ·": "Coach summary ·", "parties relues": "games reviewed", "Avant chaque partie": "Before each game", "Après chaque partie": "After each game", ": ouvre son bilan et vérifie ta priorité.": ": open its review and check your priority.", "prépare la draft": "prepare the draft",
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
    "Quand le jungler adverse a pris de l'avance, ne le défie pas seul : farme du côté opposé au sien, joue autour des lanes qui ont l'avantage et ne conteste un objectif qu'avec tes laners à côté.": "When the enemy jungler is ahead, don't fight them alone: farm on the opposite side, play around the lanes that are winning and only contest an objective with your laners nearby.",
    "Quand le duo adverse a l'avantage, reste près de ton ADC, pose une ward dans la rivière contre les ganks et n'engage que si l'adversaire a utilisé ses sorts importants.": "When the enemy duo is ahead, stay close to your ADC, ward the river against ganks and only engage once the enemy has used their key spells.",
    "En phase de lane, recule quand ton adversaire disparaît de la carte ou que son jungler est vu de ton côté.": "In lane, back off when your opponent disappears from the map or their jungler is seen on your side.",
    "Avant 14 min, n'entre dans la jungle adverse ou ne gank une lane que si tu sais où est le jungler adverse et que tes laners peuvent te suivre ; sinon, reste dans ta jungle.": "Before 14 min, only invade or gank when you know where the enemy jungler is and your laners can follow; otherwise stay in your own jungle.",
    "En phase de lane, ne pars pas seul poser une ward quand le jungler adverse n'est pas visible : va-y avec ton ADC ou quand ta wave pousse vers l'adversaire.": "In lane, don't go warding alone when the enemy jungler isn't visible: go with your ADC or when your wave is pushing towards the enemy.",
    "Achète une control ward à chaque back et pose-la dans la rivière près du dragon ou dans un buisson de ta lane : elle révèle les wards adverses autour d'elle, que tu peux alors détruire.": "Buy a control ward every back and place it in the river near dragon or in a bush of your lane: it reveals nearby enemy wards so you can destroy them.",
    "Vise ton premier grand item vers 11 min : prends chaque sbire possible et back dès que tu as l'or d'un composant, plutôt que de rester sur la carte avec peu de points de vie.": "Aim for your first legendary item around 11 min: take every minion you can and back as soon as you have gold for a component, rather than staying on the map with low health.",
    "Vise ton premier grand item vers 11 min : enchaîne tes camps entre deux ganks et back dès que tu as l'or d'un composant, plutôt que de rester sur la carte avec peu de points de vie.": "Aim for your first legendary item around 11 min: clear your camps between ganks and back as soon as you have gold for a component, rather than staying on the map with low health.",
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
    [/^(\d+) parties? : pas assez$/, (m, n) => `${n} game${n === "1" ? "" : "s"}: not enough`],
    [/^(.+) dans cette partie$/, "$1 in this game"],
    // Tour de l'app du 24/10 : phrases complètes restées en français
    [/^Couverts par le pilote : (.+). Les autres rôles ne reçoivent que des conseils de méthode.$/, (m, l) => `Covered by the pilot: ${l.replace(/ et /, " and ")}. Other roles only get method tips.`],
    [/^Grisés : pas encore couverts par des contenus analysés ((.+)).$/, (m, l) => `Greyed out: not yet covered by analyzed content (${l.replace("gestion des vagues", "wave management")}).`],
    [/^Suivre sur (.+)$/, (m, x) => `Follow on ${x.replace("(officiel)", "(official)")}`],
    [/^(Victoire|Défaite) avec (.+) · (.+) · voir le bilan$/, (m, r, c, ago) => `${r === "Victoire" ? "Win" : "Loss"} with ${c} · ${ago} · see the review`],
    [/^Victoire ([^:.,;·]{1,40})$/, (m, x) => (/^(avec|de|du|en|à|sur|contre) /.test(x) ? m : `${x} win`)],
    [/^· (\d+)–(\d+) en parties$/, "· $1–$2 in games"],
    [/^Taux de sélection sur (\d+) parties officielles · (.+)$/, "Pick rate over $1 official games · $2"],
    [/^([\d,]+) parties officielles · bans non fournis par l'API$/, "$1 official games · bans not provided by the API"],
    [/^Agents les plus joués · (.+)$/, "Most played agents · $1"],
    [/^(\d+) articles? en attente de synthèse ne (?:sont|est) pas affichés?\.$/, (m, n) => `${n} article${n === "1" ? "" : "s"} awaiting summary ${n === "1" ? "is" : "are"} not shown.`],
    [/^(.+) bat (.+) (\d+–\d+)\. (\d+) kills à (\d+) sur la série\.$/, "$1 beat $2 $3. $4 kills to $5 in the series."],
    [/^(.+) bat (.+) (\d+–\d+)\.$/, "$1 beat $2 $3."],
    [/^Nouvelle partie à relire : (.+), (victoire|défaite)$/, (m, c, r) => `New game to review: ${c}, ${r === "victoire" ? "win" : "loss"}`],
    [/^Préparer ma session avec (.+)$/, "Prepare my session with $1"],
    [/^D'après ton bilan sur (\d+) parties \((.+?)\)(?: · (\d+) autres? points? à travailler ensuite)?\.$/, (m, n, ago, more) => `From your review of ${n} games (${ago})${more ? ` · ${more} more point${more === "1" ? "" : "s"} to work on next` : ""}.`],
    [/^Synthèse du coach · (.+)$/, "Coach summary · $1"],
    [/^Sources · synthèse du (.+)$/, "Sources · summary of $1"],
    // Compositions (coach/draft.mjs) et pied de la draft
    [/^Dégâts surtout physiques \((\d+) %\) : l'adversaire peut se protéger avec de l'armure\.$/, "Mostly physical damage ($1%): the enemy can protect themselves with armor."],
    [/^Dégâts surtout magiques \((\d+) %\) : l'adversaire peut se protéger avec de la résistance magique\.$/, "Mostly magic damage ($1%): the enemy can protect themselves with magic resist."],
    [/^Dégâts mixtes \((\d+) % physiques, (\d+) % magiques\) : difficile à contrer avec un seul type de défense\.$/, "Mixed damage ($1% physical, $2% magic): hard to counter with a single type of defense."],
    [/^Peu de contrôles : (\d+) % de moins qu'une équipe moyenne\.$/, "Little crowd control: $1% less than an average team."],
    [/^Équipe qui encaisse beaucoup \(\+(\d+) % par rapport à la moyenne\)\.$/, "Team that soaks a lot of damage (+$1% vs average)."],
    [/^Équipe fragile : (\d+) % d'encaissement en moins que la moyenne\.$/, "Fragile team: soaks $1% less damage than average."],
    [/^Plus forte en fin de partie : elle gagne environ (\d+) parties sur 100 de plus quand la partie dépasse 32 min\.$/, "Stronger late: wins about $1 more games out of 100 when the game goes past 32 min."],
    [/^Plus forte en début de partie : elle gagne environ (\d+) parties sur 100 de moins quand la partie dépasse 32 min\. Joue la sécurité avant 20 min\.$/, "Stronger early: wins about $1 fewer games out of 100 when the game goes past 32 min. Play safe before 20 min."],
    [/^Statistiques sur ([\d,]+) parties classées Diamant\+ \(EUW\) des (\d+) derniers jours\. Sous (\d+) parties, le coach ne donne pas de verdict\.$/, "Stats from $1 Diamond+ ranked games (EUW) over the last $2 days. Under $3 games, the coach gives no verdict."],
    [/^Solo queue · Diamant et plus · ([\d,  ]+) parties(?: · relevé le (.+))?$/, (m, g, d) => `Solo queue · Diamond and above · ${g.replace(/[  ]/g, ",")} games${d ? ` · collected on ${d}` : ""}`],
    [/^([\d,  ]+) parties au poste$/, (m, g) => `${g.replace(/[  ]/g, ",")} games in this role`],
    [/^MINDIFF : ([\d,  ]+) parties classées Diamant\+ \(EUW\)$/, (m, g) => `MINDIFF: ${g.replace(/[  ]/g, ",")} Diamond+ ranked games (EUW)`],
    [/^Taux de victoire sur ([\d,  ]+) parties classées Diamant et plus \(EUW, patch ([\d.]+)\), relevées par MINDIFF avec l'API officielle de Riot\. Seuls les champions joués au moins (\d+) fois au poste sont classés\. Les lettres tiennent compte de la taille de l'échantillon : un champion peu joué doit gagner plus pour monter\. S : 52 % corrigé et plus, A : 51 à 52 %, B : 50 à 51 %\.$/, "Win rate over $1 Diamond+ ranked games (EUW, patch $2), collected by MINDIFF through Riot's official API. Only champions played at least $3 times in the role are ranked. Letters account for sample size: a rarely played champion must win more to rank higher. S: 52% adjusted and above, A: 51 to 52%, B: 50 to 51%."],
    [/^Détail : (\d+) morts?, (\d+) backs$/, (m, d, b) => `Details: ${d} death${d === "1" ? "" : "s"}, ${b} backs`],
    [/^([\d.,]+) sbires à 10 min$/, "$1 CS at 10 min"],
    // Mesures d'une partie (« Toi face aux bons joueurs »)
    [/^([\d.,]+) sbires par minute$/, "$1 CS per minute"], [/^([\d.,]+) morts par tranche de 30 min$/, "$1 deaths per 30 min"],
    [/^([\d.,]+) de score de vision par minute$/, "$1 vision score per minute"], [/^([\d.,]+) wards? de contrôle par partie$/, (m, n) => `${n} control ward${n === "1" ? "" : "s"} per game`],
    [/^([\d.,]+) % des kills de ton équipe$/, "$1% of your team's kills"],
    [/^Contre (.+) : ce qu'en disent les coachs$/, "Against $1: what coaches say"],
    [/^Tous rôles confondus : un champion peut profiter d'une composition sans dépendre de son vis-à-vis\. Taux de victoire Diamant\+ (?:d'|de )(.+) :$/, "All roles combined: a champion can benefit from a team comp regardless of its lane opponent. $1's Diamond+ winrate:"],
    // Références Diamant+ par rôle (coach)
    [/^Ce que jouent les Diamant\+ en (\S+) · patch ([\d.]+)$/, "What Diamond+ $1 players run · patch $2"], [/^Rôles joués : (.+)$/, (m, x) => `Roles played: ${x.replace(/ %/g, "%")}`],
    [/^Très joués par les Diamant\+ en (\S+), absents chez toi$/, "Common among Diamond+ $1 players, missing from yours"], [/^Très joués par les Diamant\+, absents chez toi$/, "Common among Diamond+ players, missing from yours"],
    [/^Part des parties Diamant\+(?: en (\S+))? \(([\d\s,.]+) parties, patch ([\d.]+)\) où l'item est dans l'inventaire final\.$/, (m, r, n, p) => `Share of Diamond+${r ? ` ${r}` : ""} games (${n} games, patch ${p}) where the item is in the final inventory.`],
    [/^Build des Diamant\+ sur (.+)$/, "Diamond+ build on $1"],
    [/^:\s*(\d+) % des Diamant\+\. La plus jouée : (.+) \((\d+) %\)$/, ": $1% of Diamond+ players. Most played: $2 ($3%)"], [/^:\s*(\d+) % des Diamant\+, c'est la plus jouée$/, ": $1% of Diamond+ players, the most played"],
    [/^:\s*rare chez les Diamant\+\. La plus jouée : (.+) \((\d+) %\)$/, ": rare among Diamond+ players. Most played: $1 ($2%)"], [/^:\s*rare chez les Diamant\+, c'est la plus jouée$/, ": rare among Diamond+ players"],
    [/^Tes items terminés$/, "Your completed items"], [/^Voir la fiche (.+)$/, "See the $1 page"],
    [/^Ta partie date du patch ([\d.]+), la référence du patch ([\d.]+) : les items ont pu changer entre-temps\.$/, "Your game is from patch $1, the reference from patch $2: items may have changed since."],
    [/^([\d\s,.]+) parties · ([\d.,]+) % de victoires$/, (m, n, w) => `${n} games · ${w.replace(",", ".")}% wins`], [/^([\d\s,.]+) parties · taux de victoire non significatif sous 100 parties$/, "$1 games · win rate not meaningful under 100 games"],
    [/^Pas encore assez de parties Diamant\+ pour ce champion au patch (.+) \((\d+) sur (\d+) nécessaires\)\. L'échantillon grandit chaque jour\.$/, "Not enough Diamond+ games for this champion on patch $1 yet ($2 of the $3 needed). The sample grows every day."],
    [/^chez les Diamant\+ : dans (\d+) % des parties face à ce type d'équipe, contre (\d+) % face aux autres$/, "among Diamond+ players: in $1% of games against this kind of team, versus $2% against others"],
    [/^option déjà jouée sur (.+) \((\d+) % des parties\)$/, "option already played on $1 ($2% of games)"],
    [/^Pas d'item de rechange repéré sur (.+) face à cette menace : garde ce build\.$/, "No replacement item found on $1 against this threat: keep this build."],
    [/^Composition adverse sans menace marquée : garde ce build\.$/, "Enemy team without a clear threat: keep this build."],
    [/^À adapter face à cette équipe · en moyenne (\d+) % de dégâts magiques, (\d+) % physiques \(le reste : dégâts bruts, qui ignorent armure et résistance magique\)$/, "To adapt against this team · on average $1% magic damage, $2% physical (the rest: true damage, which ignores armor and magic resist)"], [/^À adapter face à cette équipe$/, "To adapt against this team"],
    [/^(.+) : rare chez les Diamant\+ sur (.+)\. Ça peut être un bon choix selon la partie ; compare avec la fiche du champion\.$/, "$1: rare among Diamond+ players on $2. It can be a good choice depending on the game; compare with the champion page."],
    [/^Mesuré sur ([\d\s,.]+) parties Diamant\+ de ce champion à ce rôle(.*)$/, (m, n, rest) => `Measured over ${n} Diamond+ games of this champion in this role${rest.replace(/^, patch ([\d.]+)\./, ", patch $1.").replace(" « Dans X % face à ce type d'équipe » : comparé aux parties sans cette menace, et l'item y répond d'après sa description officielle. « Option déjà jouée » : item qui répond à la menace d'après sa description, sans mesure face à elle.", " \"In X% against this kind of team\": compared with games without this threat, and the item answers it according to its official description. \"Option already played\": an item that answers the threat according to its description, not measured against it.")}`],
    [/^il y a (\d+) min$/, "$1 min ago"], [/^il y a (\d+) h$/, "$1 h ago"], [/^il y a (\d+) j$/, "$1 d ago"], [/il y a (\d+) min\b/g, "$1 min ago"], [/il y a (\d+) h\b/g, "$1 h ago"], [/il y a (\d+) j\b/g, "$1 d ago"],
    [/\bà l'instant\b/g, "just now"], [/^Aujourd'hui · /, "Today · "],
    [/^(\d+),(\d)$/, "$1.$2"], [/^(\d+),(\d) (sbires|CS) par minute$/, "$1.$2 CS per minute"],
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
    [/^Heures de (.+?) \((UTC[^)]*)\)( · fuseau de votre appareil)?$/, (m, c, u, d) => `Times in ${CITY[c] || c} (${u})${d ? " · your device's time zone" : ""}`],
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
    [/^Tes bases sont au niveau \(farm, morts, vision\)\. Le coach peut maintenant relire une vingtaine de tes dernières parties en (.+) : combats, objectifs, morts\. Il en tire ta priorité\.$/, "Your basics are on par (farm, deaths, vision). The coach can now review about twenty of your recent games as $1: fights, objectives, deaths. It works out your priority from them."],
    [/^Données officielles de Riot Games · référence : (\d+) parties Diamant et plus \(patch (.+)\)$/, "Official Riot Games data · reference: $1 Diamond+ games (patch $2)"], [/^Données officielles de Riot Games$/, "Official Riot Games data"],
    [/^(\d+) parties? classées? récentes? · (\d+) victoires?\. Touche une partie pour son bilan\.$/, "$1 recent ranked games · $2 wins. Tap a game for its review."],
    [/^(\d+) parties? récentes? · (\d+) victoires?\. Touche une partie pour son bilan\.$/, "$1 recent games · $2 wins. Tap a game for its review."],
    [/^Synthèse du coach · (.+?) · (\d+) victoires? sur les (\d+) parties relues$/, "Coach summary · $1 · $2 wins out of the $3 games reviewed"],
    [/^(Phase de lane|Début de partie) · écart avec (.+)$/, (m, k, o) => `${k === "Phase de lane" ? "Laning phase" : "Early game"} · gap with ${(o => (o === "le duo adverse" || o === "au duo adverse" ? "the enemy duo" : o))(o)}`], [/^Phase de lane \(avec ton duo\)$/, "Laning phase (with your duo)"],
    [/^ ?\(toi\), 2 dernières minutes\. Touche un champion pour suivre le sien\.$/, " (you), last 2 minutes. Tap a champion to follow theirs."],
    [/^Tous les combats \((\d+)\) et interactions$/, "All fights ($1) and interactions"],
    [/^\((\d+) adversaires? éliminés?, (\d+) alliés?\) · (avec toi|sans toi \((.+)\))$/, (m, e, a2, w, why) => `(${e} ${e > 1 ? "enemies" : "enemy"} killed, ${a2} ${a2 > 1 ? "allies" : "ally"} lost) · ${w === "avec toi" ? "with you" : "without you (" + ({ "tu étais tout près": "you were very close", "tu étais à quelques secondes": "you were a few seconds away", "tu étais loin": "you were far", "tu étais à l'autre bout de la carte": "you were on the other side of the map" }[why] || why) + ")"}`],
    [/^Suivre le trajet de (.+) \((toi|adversaire|allié)\)$/, (m, c, w) => `Show ${c}'s path (${{ toi: "you", adversaire: "enemy", "allié": "ally" }[w]})`],
    [/^Tu meurs \((.+?)\) : tué par (.+?)(?:, (\d+) adversaires sur toi)?(, aucun allié autour)?$/, (m, z, k, n, al) => `You die (${ZONE(z)}): killed by ${k}${n ? `, ${n} enemies on you` : ""}${al ? ", no ally around" : ""}`],
    [/^Combat (.+?) : (\d+) contre (\d+)(, gagné|, perdu)?( \(avec toi\))?$/, (m, z, a2, b2, r, me) => `Fight (${ZONE(z)}): ${a2} vs ${b2}${r === ", gagné" ? ", won" : r ? ", lost" : ""}${me ? " (with you)" : ""}`],
    [/^(Dragon|Baron|Héraut|Larves du Néant|Atakhan) (pris|perdu) : (\d+) contre (\d+) autour(, tu étais loin)?$/, (m, k, w, a2, b2, far) => `${OBJ(k)} ${w === "pris" ? "taken" : "lost"}: ${a2} vs ${b2} around${far ? ", you were far" : ""}`],
    [/^(\d+:\d\d) (:|·) (.+)$/, (m, t, sep, rest) => `${t} ${sep} ${tr(rest).trim()}`],
    [/^Nunu et Willump$/, "Nunu & Willump"], [/^(.+) · (Système suisse|Phase finale|Play-ins)$/, (m, a2, b2) => `${a2} · ${{ "Système suisse": "Swiss stage", "Phase finale": "Playoffs", "Play-ins": "Play-In" }[b2]}`], [/^(.+) arrive bientôt$/, "$1 is coming soon"], [/^(.+), bientôt disponible$/, "$1, coming soon"], [/^Ça m'intéresse : (.+)$/, "I'm interested: $1"], [/^Ne plus suivre : (.+)$/, "Stop following: $1"], [/^Coach, partie en cours$/, "Coach, live game"], [/^Coach, nouvelle partie à relire$/, "Coach, new game to review"],
    [/^(Golds|Sbires et monstres|Sbires|XP) à (\d+) min$/, (m, k, n) => `${{ Golds: "Gold", "Sbires et monstres": "CS and monsters", Sbires: "CS", XP: "XP" }[k]} at ${n} min`], [/^Constat (\d+)$/, "Finding $1"],
    [/^gagnée : (ton duo a )?(.+?) golds d'avance sur (.+) à 10 min$/, (m, d, n, o) => `won: ${d ? "your duo was " : ""}${n} gold ahead of ${(o => (o === "le duo adverse" || o === "au duo adverse" ? "the enemy duo" : o))(o)} at 10 min`],
    [/^difficile : (ton duo a )?(.+?) golds de retard sur (.+) à 10 min$/, (m, d, n, o) => `tough: ${d ? "your duo was " : ""}${n} gold behind ${(o => (o === "le duo adverse" || o === "au duo adverse" ? "the enemy duo" : o))(o)} at 10 min`],
    [/^équilibrée face à (.+) \((.+?) golds à 10 min\)$/, (m, o, n) => `even against ${(o => (o === "le duo adverse" || o === "au duo adverse" ? "the enemy duo" : o))(o)} (${n} gold at 10 min)`],
    [/^(\d+) min, soit (\d+) % de la partie$/, "$1 min, $2% of the game"],
    [/^(Top|Jungle|Mid|ADC|Bot|Support) · contre /, "$1 · vs "], [/^(.+) · toi$/, "$1 · you"], [/^Mes champions en (.+)$/, "My champions as $1"],
    [/^Bilans · (.+)$/, "Records · $1"], [/^Classement · (.+)$/, "Standings · $1"], [/^(.+) \(officiel\)$/, "$1 (official)"], [/^Version client (.+)$/, "Client version $1"], [/^Partie (\d+) · (.+)$/, "Game $1 · $2"], [/^Partie (\d+) · $/, "Game $1 · "], [/^Fin · (.+)$/, "End · $1"], [/^Partie (\d+)$/, "Game $1"], [/^Patch (\S+) · (.+)$/, "Patch $1 · $2"],
    [/^(.+) · (\d+) contre (\d+) ·$/, (m, z, a2, b2) => `${ZONE(z)} · ${a2} vs ${b2} ·`], [/^(\d+) parties · (\d+) matchs$/, "$1 games · $2 matches"],
  ];
  const ZONE = z => ({ "ta base": "your base", "base adverse": "enemy base", "rivière": "river", "ta jungle": "your jungle", "jungle adverse": "enemy jungle", "inconnue": "unknown" }[z] || z);
  const OBJ = k => ({ "Héraut": "Herald", "Larves du Néant": "Void Grubs" }[k] || k);
  // ---- Analyses du coach (texte rédigé par le serveur : constats, preuves, moments clés, tournants), traduites phrase par phrase
  const PLAIN = { "Farm en début de partie": "Early farm", "Farm": "Farm", "Morts": "Deaths", "Vision": "Vision", "Control wards": "Control wards", "Participation aux combats": "Fight participation" };
  const plainEn = p => PLAIN[p] || p;
  const sayEn = v => v
    .replace(/^([\d.,]+) sbires à 10 min$/, "$1 CS at 10 min").replace(/^([\d.,]+) sbires par minute$/, "$1 CS per minute")
    .replace(/^([\d.,]+) morts par tranche de 30 min de jeu$/, "$1 deaths per 30 min of play").replace(/^score de vision de ([\d.,]+) par minute$/, "a vision score of $1 per minute")
    .replace(/^([\d.,]+) wards? de contrôle posées?$/, (m, n) => `${n} control ward${n === "1" ? "" : "s"} placed`).replace(/^([\d.,]+) % de participation aux kills de l'équipe$/, "$1% kill participation")
    .replace(/(\d),(\d)/g, "$1.$2");
  const objEn = k => ({ "Héraut": "Rift Herald", "Larves du Néant": "Voidgrubs", "dragon": "dragon" }[k] || k);
  const who = k => (k === "sbires ou tourelle" ? "minions or a turret" : k);
  const lossEn = s => s.split(/, | et /).map(x => x
    .replace(/^le (.+)$/, (m, k) => `the ${objEn(k)}`).replace(/^les Larves du Néant$/, "the Voidgrubs")
    .replace(/^une tourelle$/, "a turret").replace(/^(\d+) tourelles$/, "$1 turrets").replace(/^un inhibiteur$/, "an inhibitor").replace(/^(\d+) inhibiteurs$/, "$1 inhibitors"))
    .reduce((a, x, i, arr) => (i === 0 ? x : i === arr.length - 1 ? `${a} and ${x}` : `${a}, ${x}`), "");
  const farEn = f => ({ "tout près": "very close", "à quelques secondes": "a few seconds away", "loin": "far away", "à l'autre bout de la carte": "on the other side of the map" }[f] || f);
  const nGames = (n, m) => `in ${n} of ${m} games`;
  const HEAD = {
    "Au moins 2 morts juste avant un objectif adverse": "At least 2 deaths right before an enemy objective",
    "Au moins 500 golds de retard sur ton adversaire direct (le duo adverse pour la bot lane) à 10 min": "At least 500 gold behind your direct opponent (the enemy duo in bot lane) at 10 min",
    "Au moins 500 golds d'avance sur ton adversaire à 10 min": "At least 500 gold ahead of your opponent at 10 min",
    "Au moins 3 morts avant 14 min": "At least 3 deaths before 14 min",
    "Aucune ward adverse détruite avant 20 min": "No enemy ward destroyed before 20 min",
    "Au plus un retour volontaire à la base avant 14 min": "At most one planned back before 14 min",
    "Premier grand item terminé après 14 min": "First big item finished after 14 min",
    "Peu de control wards posées avant 20 min": "Few control wards placed before 20 min",
    "Morts seul face à plusieurs adversaires après 14 min": "Deaths alone against several enemies after 14 min",
    "Objectifs disputés en infériorité numérique": "Objectives contested while outnumbered",
    "Au plus une ward adverse détruite avant 20 min": "At most one enemy ward destroyed before 20 min",
    "En jungle, au moins 4 morts avant 14 min": "In the jungle, at least 4 deaths before 14 min",
  };
  const headEn = h => HEAD[h] || h.replace(/^(.+) : moins bien que les bons joueurs$/, (m, p) => `${plainEn(p)}: worse than good players`).replace(/^(.+) au niveau des meilleurs$/, (m, p) => `${plainEn(p)} on par with the best`);
  Object.assign(T, {
    // Phrases fixes du coach
    "Les bons joueurs détruisent en moyenne 1 à 2 wards adverses avant 20 min (d'après 800 parties analysées, de Fer à Challenger).": "Good players destroy 1 to 2 enemy wards on average before 20 min (based on 800 analyzed games, Iron to Challenger).",
    "Les bons joueurs rentrent environ 3 fois avant 14 min, au bon moment (d'après 800 parties analysées, de Fer à Challenger).": "Good players back about 3 times before 14 min, at the right moments (based on 800 analyzed games, Iron to Challenger).",
    "Les bons joueurs terminent leur premier grand item vers 11 min (d'après 800 parties analysées, de Fer à Challenger).": "Good players finish their first big item around 11 min (based on 800 analyzed games, Iron to Challenger).",
    "En jungle, les bons joueurs en posent au moins une avant 20 min pour sécuriser leurs camps et les objectifs.": "In the jungle, good players place at least one before 20 min to secure their camps and objectives.",
    "En support, les bons joueurs en posent au moins 2 avant 20 min.": "As support, good players place at least 2 before 20 min.",
    "Une seule ward adverse détruite avant 20 min": "Only one enemy ward destroyed before 20 min",
    "En support, les bons joueurs en détruisent au moins deux avant 20 min dans 86 % de leurs parties (parties Diamant+ analysées).": "As support, good players destroy at least two before 20 min in 86% of their games (Diamond+ games analyzed).",
    "En support, détruire les wards adverses (trinket rouge, control ward) prive l'adversaire de vision autour de la bot lane et des objectifs.": "As support, destroying enemy wards (red trinket, control ward) denies the enemy vision around bot lane and objectives.",
    "Chez les joueurs Diamant et plus, c'est arrivé dans 15 % des parties, contre 29 % chez les Fer à Argent (1 600 parties analysées).": "Among Diamond+ players this happened in 15% of games, versus 29% for Iron to Silver (1,600 games analyzed).",
    "Chaque mort en début de partie laisse à l'adversaire tes camps, tes ganks et les premiers objectifs.": "Every early death hands the enemy your camps, your ganks and the first objectives.",
    "Mesuré sur 1 600 parties, dont 289 en jungle : avec 4 morts ou plus avant 14 min, une partie de jungle est gagnée 13 fois sur 100, contre 49 sans.": "Measured over 1,600 games, 289 of them in the jungle: with 4 or more deaths before 14 min, a jungle game is won 13 times out of 100, versus 49 without.",
    "Aucune ward adverse détruite avant 20 min": "No enemy ward destroyed before 20 min", "Aucun grand item terminé": "No big item finished",
    "Un seul retour volontaire à la base avant 14 min": "Only one planned back before 14 min", "Aucun retour volontaire à la base avant 14 min": "No planned back before 14 min",
    "Une seule ward de contrôle posée avant 20 min": "Only one control ward placed before 20 min", "Aucune ward de contrôle posée avant 20 min": "No control ward placed before 20 min",
    "Chaque mort en phase de lane coûte des sbires, de l'expérience et souvent des plaques.": "Every death in laning costs CS, XP and often turret plates.",
    "D'après 800 parties analysées : une mort juste avant un objectif adverse fait prendre à l'adversaire environ 1 100 golds d'avance dans les 3 minutes, 5 fois plus qu'une autre mort. Avec 2 de ces morts, une partie est gagnée 22 fois sur 100 ; sans, 60 fois sur 100.": "Based on 800 analyzed games: a death right before an enemy objective gives the enemy about 1,100 gold of lead within 3 minutes, 5 times more than any other death. With 2 of these deaths, a game is won 22 times out of 100; without them, 60 times out of 100.",
    "Mesuré sur 800 parties : avec 3 morts ou plus avant 14 min, les parties sont gagnées 40 % du temps, contre 58 % sans.": "Measured over 800 games: with 3 or more deaths before 14 min, games are won 40% of the time, versus 58% without.",
    "Aucun allié n'était tout près au moment de la mort : souvent en poussant seul une lane sans savoir où sont les adversaires.": "No ally was nearby at the time of death: often while pushing a lane alone without knowing where the enemies are.",
    "Combat perdu autour d'un objectif alors que l'équipe était moins nombreuse (souvent avec un allié mort).": "Fight lost around an objective while your team had fewer players (often with an ally dead).",
    "Sur 800 parties analysées, une équipe qui dispute un objectif en étant moins nombreuse gagne environ 9 parties sur 100 de moins, qu'elle soit devant ou derrière.": "Across 800 analyzed games, a team that contests an objective while outnumbered wins about 9 fewer games out of 100, whether it is ahead or behind.",
    "Chaque mort en phase de lane coûte des sbires, de l'expérience et souvent les plaques de ta tourelle (l'or donné par ses protections avant 14 min).": "Every death in laning costs CS, XP and often your turret plates (the gold its armor plates give before 14 min).",
    "Tu étais loin : environ une minute avant l'objectif, rejoins ton équipe, ou signale-lui de le laisser et de prendre autre chose.": "You were far away: about a minute before the objective, join your team, or ping them to let it go and take something else.",
    "Pas de moment clé à revoir sur la minimap pour cette partie. Tes constats sont dans L'essentiel.": "No key moment to rewatch on the minimap for this game. Your findings are in Overview.",
    "Ont participé le plus à tes morts (kills et aides)": "Most involved in your deaths (kills and assists)", "Tes kills et aides, par adversaire": "Your kills and assists, by enemy", "Tes kills et aides avec": "Your kills and assists with",
    "Conseils officiels de Riot et avis attribués de coachs, contrôlés avant publication. Les statistiques de ce duel sont dans « Ma partie (draft) ».": "Official Riot tips and attributed coach advice, checked before publishing. The stats for this matchup are in “My game (draft)”.",
    "Astuces de Riot et des coachs": "Tips from Riot and coaches", "équilibré": "even", "favorable": "favorable", "défavorable": "unfavorable",
    "Part des parties gagnées par le champion de ton équipe dans chaque duel, chez les joueurs Diamant et plus.": "Share of games won by your team's champion in each matchup, among Diamond+ players.",
    "Classés du plus sûr au moins sûr.": "Ranked from safest to least safe.",
    "Aucun point fort ne revient encore dans assez de parties pour être affiché.": "No strength comes back in enough games to be shown yet.",
    "Parties concernées (touche une pastille pour l'ouvrir) :": "Games involved (tap a dot to open it):",
    "Début de partie": "Early game", "Sbires et monstres": "CS and monsters",
    "Tes erreurs qui reviennent, tes forces et les adversaires à préparer, sur une vingtaine de tes dernières parties": "Your recurring mistakes, your strengths and the opponents to prepare for, over about twenty of your recent games",
    "Après chaque back, suis ton jungler ou ton mid vers le prochain combat ou objectif au lieu de rester seul en bot lane.": "After each back, follow your jungler or mid to the next fight or objective instead of staying alone in bot lane.",
    "Avant un dragon ou un Baron, rejoins ton équipe une minute avant, avec une ward pour l'objectif.": "Before a dragon or Baron, join your team a minute early, with a ward for the objective.",
    "Quand ton ADC est en sécurité sous sa tourelle, va aider là où un combat se prépare.": "When your ADC is safe under their turret, go help where a fight is building.",
    "Moins de morts, c'est plus de temps pour farmer et peser sur les objectifs. Commence par les morts après 20 min : tu attends plus longtemps avant de revenir, et l'adversaire en profite pour prendre un objectif.": "Fewer deaths means more time to farm and pressure objectives. Start with deaths after 20 min: you wait longer to respawn, and the enemy uses it to take an objective.",
    "Détruire les wards adverses (trinket rouge, control ward) prive l'adversaire de vision et protège tes déplacements.": "Destroying enemy wards (red trinket, control ward) denies the enemy vision and protects your movements.",
    "Les bons joueurs rentrent environ 3 fois avant 14 min, au bon moment (sbires poussés, or suffisant).": "Good players back about 3 times before 14 min, at the right moments (wave pushed, enough gold).",
    "Les bons joueurs terminent leur premier grand item vers 11 min : plus de farm et des retours au bon moment.": "Good players finish their first big item around 11 min: more farm and well-timed backs.",
    "Une control ward (75 golds) reste posée jusqu'à ce qu'on la détruise : elle montre et coupe la vision adverse autour d'un objectif.": "A control ward (75 gold) stays until it is destroyed: it reveals and denies enemy vision around an objective.",
    "Jamais mort seul face à plusieurs adversaires après 14 min": "Never died alone against several enemies after 14 min",
    "Un allié était mort : sans lui, il valait mieux céder l'objectif et prendre une tourelle ou une wave de l'autre côté de la carte.": "An ally was dead: without them, it was better to give up the objective and take a turret or a wave on the other side of the map.",
    "En infériorité numérique, cède l'objectif et prends plutôt une tourelle ou une wave de l'autre côté de la carte.": "When outnumbered, give up the objective and take a turret or a wave on the other side of the map instead.",
    "Sur une side lane, quand 2 adversaires ou plus disparaissent de la minimap, recule vers ta tourelle : ils arrivent peut-être sur toi.": "In a side lane, when 2 or more enemies disappear from the minimap, fall back to your turret: they may be coming for you.",
    "Évite d'avancer seul dans la moitié adverse quand plusieurs adversaires ne sont pas visibles : reste à portée de ton équipe ou replie-toi.": "Avoid pushing alone into the enemy half when several enemies are missing: stay within reach of your team or fall back.",
    "Aucun allié n'était proche : replie-toi vers ton équipe avant que plusieurs adversaires arrivent.": "No ally was close: fall back toward your team before several enemies arrive.",
    "Aucun allié n'était tout près de toi.": "No ally was close to you.",
    "Quand ton équipe se bat près de toi, rejoins-la : un joueur de plus change le rapport de force. Sinon, signale-lui de ne pas engager.": "When your team fights near you, join it: one more player changes the balance of power. Otherwise, ping them not to engage.",
    "Faits tirés des données officielles de Riot. Les backs sont déduits des achats (on n'achète qu'en base) ; un retour sans achat n'apparaît pas.": "Facts from official Riot data. Backs are inferred from purchases (you can only buy in base); a back without a purchase doesn't show.",
    "Positions relevées une fois par minute ; Riot ne fournit ni la vision, ni les sorts, ni la position des wards. Les conseils s'appuient sur ces faits mesurés. Entre deux relevés, le trajet affiché est une ligne droite.": "Positions are recorded once per minute; Riot provides neither vision, nor spells, nor ward positions. The advice is based on these measured facts. Between two snapshots, the path shown is a straight line.",
  });
  R.push(
    [/^(\d+) mort(s?) seul face à plusieurs adversaires après 14 min$/, (m, n, p) => `${p ? "deaths" : "death"} alone against several enemies after 14 min`], [/^(morts?) seul face à plusieurs adversaires après 14 min$/, (m, w) => `${w === "mort" ? "death" : "deaths"} alone against several enemies after 14 min`],
    [/^\(tu avais environ (\d+) golds juste avant\)$/, "(you had about $1 gold just before)"],
    [/^adverse, présent sur (\d+) de tes morts$/, "enemy, involved in $1 of your deaths"],
    [/^(\d+) victoires? sur (\d+) en duel$/, "$1 of $2 matchups won"],
    [/^sur ([\d,]+) parties(, chiffre encore incertain)?$/, (m, n, u) => `over ${n} games${u ? ", still uncertain" : ""}`],
    [/^(even|favorable|unfavorable|équilibré|favorable|défavorable) · à 10 min, ton champion a en moyenne ([+−-]?[\d,.]+) sbires$/, (m, v, n) => `${({ "équilibré": "even", "défavorable": "unfavorable" })[v] || v} · at 10 min, your champion averages ${n.replace(",", ".")} CS`],
    [/^Beaucoup de contrôles \(étourdissements, ralentissements…\) : environ (.+) fois plus qu'une équipe moyenne\.$/, (m, n) => `Lots of crowd control (stuns, slows…): about ${n === "deux" ? "twice" : n.replace(",", ".") + " times"} as much as an average team.`],
    [/^Beaucoup de contrôles \(étourdissements, ralentissements…\) : (\d+) % de plus qu'une équipe moyenne\.$/, "Lots of crowd control (stuns, slows…): $1% more than an average team."],
    [/^Plus forte en fin de partie : elle gagne environ (\d+) parties sur 100 de plus quand la partie dépasse 32 min\.$/, "Stronger late: it wins about $1 more games out of 100 when the game goes past 32 min."],
    [/^Plus forte en début de partie : elle gagne environ (\d+) parties sur 100 de moins quand la partie dépasse 32 min\. Joue la sécurité avant 20 min\.$/, "Stronger early: it wins about $1 fewer games out of 100 when the game goes past 32 min. Play safe before 20 min."],
    [/^écart d'or : ton équipe devant ▲$/, "gold gap: your team ahead ▲"],
    [/^(Dragon|Baron|Héraut|Larves du Néant|Atakhan) (prises|perdues) : (\d+) contre (\d+) autour(, tu étais loin)?$/, (m, k, w, a2, b2, far) => `${OBJ(k)} ${w === "prises" ? "taken" : "lost"}: ${a2} vs ${b2} around${far ? ", you were far" : ""}`],
    [/^À (\d+:\d\d)$/, "At $1"], [/^([+−-]?[\d\s  ,.]+) golds$/, (m, n) => `${n.trim()} gold`],
    // Bilan d'une partie
    [/^(\d+) morts? juste avant un objectif adverse$/, (m, n) => `${n} death${n === "1" ? "" : "s"} right before an enemy objective`],
    [/^(\d+:\d\d) : tué par (.+?)(?: \(\+(\d+) aides?\))?, puis (.+) pris par l'adversaire à (\d+:\d\d)( \(à revoir dans le Replay\))?$/, (m, at, k, h, o, at2, map) => `${at}: killed by ${who(k)}${h ? ` (+${h} assist${h === "1" ? "" : "s"})` : ""}, then the enemy took the ${objEn(o)} at ${at2}${map ? " (rewatch it in Replay)" : ""}`],
    [/^(\d+) morts avant 14 min$/, "$1 deaths before 14 min"],
    [/^(\d+:\d\d) : tué par (.+?)(?: \(\+(\d+) aides?\))?(, dans la moitié adverse)?$/, (m, at, k, h, half) => `${at}: killed by ${who(k)}${h ? ` (+${h} assist${h === "1" ? "" : "s"})` : ""}${half ? ", on the enemy half" : ""}`],
    [/^(.+?) : (.+), moins bien que les bons joueurs \((.+)\)$/, (m, p, v, ref) => `${plainEn(p)}: ${sayEn(v)}, worse than good players (${sayEn(ref)})`],
    [/^(.+?) : (.+), au niveau des meilleurs$/, (m, p, v) => `${plainEn(p)}: ${sayEn(v)}, on par with the best`],
    [/^Les bons joueurs à ton poste \(Diamant et plus\) : (.+)\.$/, (m, v) => `Good players in your role (Diamond+): ${sayEn(v)}.`],
    [/^(Ton duo : )?([\d\s  ,.]+) golds de retard sur (.+) à 10 min$/, (m, d, n, o) => `${d ? "Your duo: " : ""}${n.trim()} gold behind ${o === "le duo adverse" ? "the enemy duo" : o} at 10 min`],
    [/^Sbires : ([+-]?\d+) à 10 min\.$/, "CS: $1 at 10 min."],
    [/^(\d+) morts? contre (.+) avant 10 min\.$/, (m, n, o) => `${n} death${n === "1" ? "" : "s"} to ${o} before 10 min.`],
    [/^(\d+) plaques de ta tourelle perdues avant 14 min\.$/, "$1 plates of your turret lost before 14 min."],
    [/^Premier grand item terminé à ([\d.,]+) min$/, (m, n) => `First big item finished at ${n.replace(",", ".")} min`],
    [/^Phase de lane : (ton duo avait )?([\d\s  ,.]+) golds d'avance sur (.+) à 10 min$/, (m, d, n, o) => `Laning phase: ${d ? "your duo was " : ""}${n.trim()} gold ahead of ${o === "le duo adverse" ? "the enemy duo" : o} at 10 min`],
    [/^(\d+) plaques de tourelle prises sur ta lane$/, "$1 turret plates taken in your lane"],
    // Bilan complet
    [/^(.+) dans (\d+) parties sur (\d+)$/, (m, h, n, t) => `${headEn(h)} ${nGames(n, t)}`],
    [/^(\d+) morts au total, chacune suivie dans la minute d'un objectif pris par l'adversaire \(dragon, Larves, Héraut, Atakhan ou Baron\)\.$/, "$1 deaths in total, each followed within a minute by an objective taken by the enemy (dragon, Voidgrubs, Herald, Atakhan or Baron)."],
    [/^Écart moyen : ([+-]?[\d\s  ,.]+) golds à 10 min\.$/, (m, n) => `Average gap: ${n.trim()} gold at 10 min.`],
    [/^(\d+) % de la partie passés mort en moyenne$/, "$1% of the game spent dead on average"],
    [/^(\d+) % de la partie passés mort$/, "$1% of the game spent dead"],
    [/^Environ (\d+) min sans pouvoir agir, sur (\d+) min de jeu\.$/, "About $1 min unable to play, out of $2 min of play."],
    [/^Sur une partie de 30 min, c'est environ (\d+) min sans pouvoir agir\.$/, "In a 30-minute game, that's about $1 min unable to play."],
    [/^Très peu de temps passé mort : (\d+) % de la partie en moyenne$/, "Very little time spent dead: $1% of the game on average"],
    [/^Toi, en général : (.+)\. Les joueurs Diamant et plus à ton poste : (.+)\.$/, (m, a, b) => `You, usually: ${sayEn(a)}. Diamond+ players in your role: ${sayEn(b)}.`],
    [/^D'après (\d+(?: \d{3})?) parties analysées, à poste égal : « (.+) » dans (\d+) % des parties des joueurs Fer à Argent, et seulement (\d+) % de celles des Diamant et plus\.$/, (m, g, t, lo, hi) => `Based on ${g.replace(" ", ",")} analyzed games, same role: “${headEn(t.charAt(0).toUpperCase() + t.slice(1))}” in ${lo}% of Iron to Silver players' games, and only ${hi}% of Diamond+ games.`],
    [/^Présent dans (\d+) % des combats qui ont lieu près de toi$/, "Present in $1% of the fights near you"],
    [/^(\d+) combats sur (\d+), sur (\d+) parties\.$/, "$1 fights out of $2, over $3 games."], [/^Sur (\d+) parties\.$/, "Over $1 games."],
    [/^Tendances calculées sur les données officielles de Riot : (\d+) parties relues en détail(?: \(sélectionnées parmi tes (\d+) dernières parties classées\))? ; un point n'apparaît que s'il revient dans au moins (\d+) parties\.$/, (m, n, s2, k) => `Trends computed from official Riot data: ${n} games reviewed in detail${s2 ? ` (selected from your last ${s2} ranked games)` : ""}; a point only shows if it comes back in at least ${k} games.`],
    [/^(.+) Référence : (\d+) parties Diamant et plus, patch (.+)\.$/, (m, a, n, p) => `${tr(a).trim()} Reference: ${n} Diamond+ games, patch ${p}.`],
    // Moments clés du replay
    [/^(.+) pris par l'adversaire à (\d+:\d\d) : disputé à (\d+) contre (\d+), après un combat perdu à (\d+:\d\d)$/, (m, k, at, a, b, at2) => `Enemy took the ${objEn(k)} at ${at}: contested ${a} vs ${b}, after a fight lost at ${at2}`],
    [/^Absents : (.+)\.$/, (m, l) => `Missing: ${l.split(", ").map(x => x === "toi" ? "you" : x.replace(/\((.+)\)$/, (mm, z) => `(${z === "mort, en attente de réapparition" ? "dead, waiting to respawn" : ZONE(z)})`)).join(", ")}.`],
    [/^Il te restait (\d+) % de tes points de vie une minute avant : (?:rentrer à la base|un back) t'aurait évité ce risque\.$/, "You had $1% of your health a minute before: backing would have avoided this risk."],
    [/^Mort seul à (\d+:\d\d) \((.+)\), contre (\d+) adversaires$/, (m, at, z, n) => `Died alone at ${at} (${ZONE(z)}), against ${n} enemies`],
    [/^Tes adversaires : (.+)\.$/, (m, l) => `Your attackers: ${l.split(", ").map(who).join(", ")}.`],
    [/^Combat perdu à (\d+:\d\d) \((.+)\) sans toi ; à ta dernière position connue, tu étais (.+)$/, (m, at, z, f) => `Fight lost at ${at} (${ZONE(z)}) without you; at your last known position, you were ${farEn(f)}`],
    [/^(\d+) de ton équipe contre (\d+) : (\d+) pertes? de ton côté, (?:(\d+) en face|aucune en face)\.$/, (m, a, b, l, e) => `${a} of your team vs ${b}: ${l} lost on your side, ${e ? `${e} on theirs` : "none on theirs"}.`],
    [/^Ensuite \(sans lien certain avec ce seul moment\) : (.+) dans les 2 minutes\.$/, (m, x) => `Then (not necessarily caused by this moment alone): ${x.split(", et ").map(p => p.replace(/^ton équipe a perdu (.+)$/, (mm, l) => `your team lost ${lossEn(l)}`).replace(/^l'écart d'or s'est creusé de (.+) en faveur de l'adversaire$/, (mm, g) => `the gold gap grew by ${g} in the enemy's favor`)).join(", and ")} within 2 minutes.`],
    [/^(\d+:\d\d) : (.+)$/, (m, at, rest) => { const x = tr(rest).trim(); return x === rest ? m : `${at}: ${x}`; }],
    // Tournants de la partie (liste après « pour ton équipe »)
    [/^pour ton équipe(?: : (.+))?$/, (m, l) => `for your team${l ? `: ${l.split(" ; ").map(p => p
      .replace(/^combat (.+?) \((?:(\d+) adversaires? éliminés?|aucun adversaire éliminé), (?:(\d+) pertes? de ton côté|aucune perte de ton côté)\)$/, (mm, z, e, a) => `fight ${ZONE(z)} (${e ? `${e} ${e === "1" ? "enemy" : "enemies"} killed` : "no enemy killed"}, ${a ? `${a} lost on your side` : "no loss on your side"})`)
      .replace(/^pris : (.+)$/, (mm, x) => `taken: ${lossEn(x)}`).replace(/^perdu : (.+)$/, (mm, x) => `lost: ${lossEn(x)}`).replace(/^ta mort à (.+)$/, "your death at $1")).join("; ")}` : ""}`],
  );
  // ---- Coach V1 (carte « Mon objectif », avis, test privé), notifications, carte d'objectif de l'Accueil (relecture du 31/10)
  const TIER_EN = { Fer: "Iron", Bronze: "Bronze", Argent: "Silver", Or: "Gold", Platine: "Platinum", "Émeraude": "Emerald", Diamant: "Diamond", Master: "Master", Grandmaster: "Grandmaster", Challenger: "Challenger" };
  const tierEn = s => s.replace(/^\p{L}+/u, w => TIER_EN[w] || w);
  const numEn = v => v.replace(/(\d),(\d)/g, "$1.$2").replace(/(\d)[\s  ]%/g, "$1%");
  const unitEn = v => numEn(v).replace(/ sbires$/, " CS").replace(/ morts?$/, " deaths").replace(/ or$/, " gold");
  // Intitulés des objectifs (coach/metrics.mjs, CATALOG : label et labelRole)
  const GOAL_EN = {
    "Sbires à 10 min": "CS at 10 min", "CS à 10 min (sbires et monstres)": "CS at 10 min (minions and monsters)",
    "Sbires à 15 min": "CS at 15 min", "CS à 15 min (sbires et monstres)": "CS at 15 min (minions and monsters)",
    "Sbires par minute": "CS per minute", "CS par minute (sbires et monstres)": "CS per minute (minions and monsters)",
    "Farm entre 15 et 25 min": "Farm between 15 and 25 min", "Or à 10 min": "Gold at 10 min", "Expérience à 10 min": "XP at 10 min",
    "Écart d'or à 15 min face à ton adversaire": "Gold difference at 15 min vs your opponent", "Écart d'XP à 15 min face à ton adversaire": "XP difference at 15 min vs your opponent",
    "Morts avant 14 min": "Deaths before 14 min", "Participation aux kills": "Kill participation", "Score de vision par minute": "Vision score per minute",
    "Wards posées par minute": "Wards placed per minute", "Dégâts aux champions par or": "Damage to champions per gold", "Dégâts aux champions par minute": "Damage to champions per minute",
    "Participation aux objectifs de ton équipe": "Participation in your team's objectives",
  };
  const goalEn = l => GOAL_EN[l] || Object.entries(GOAL_EN).find(([k]) => k.toLowerCase() === l.toLowerCase())?.[1] || null;
  const OUTCOME_EN = {
    "Objectif précédent maîtrisé": "Previous goal mastered", "Tu progresses sur l'objectif précédent, on continue": "You're improving on the previous goal, let's keep going",
    "Pas encore de progrès net sur l'objectif précédent, on continue": "No clear progress on the previous goal yet, let's keep going",
    "Objectif précédent mis en pause pour vérification": "Previous goal paused for review", "Objectif précédent mis de côté après deux séries sans progrès": "Previous goal set aside after two series without progress",
    "Objectif précédent sans verdict (pas assez de parties au même poste)": "No verdict on the previous goal (not enough games in the same role)", "Objectif précédent sans verdict": "No verdict on the previous goal",
  };
  // Raisons du diagnostic (coach/goals.mjs) : « Pas encore d'objectif : … »
  const reasonEn = r => r
    .replace(/^moins de (\d+) parties comparables$/, "fewer than $1 comparable games").replace(/^moins de (\d+) % d'observations valides$/, "less than $1% valid data")
    .replace(/^mise de côté après un échec ou une alerte, jusqu'au prochain diagnostic$/, "set aside after a failure or an alert, until the next diagnostic")
    .replace(/^deux échecs de suite : mise de côté jusqu'au prochain diagnostic$/, "two failures in a row: set aside until the next diagnostic")
    .replace(/^aucune référence pour ce rôle$/, "no benchmark for this role").replace(/^déjà au niveau de la référence$/, "already at the benchmark level")
    .replace(/^objectif automatique suspendu \(risque de jeu passif\)$/, "automatic goal suspended (risk of passive play)");
  // Exercices des objectifs (coach/metrics.mjs, champ exercise), traduits morceau par morceau ; la phrase n'est traduite que si
  // tous ses morceaux sont reconnus (jamais de phrase mi-française, mi-anglaise)
  const EX = [
    [/Vise ([\d.,]+) CS à (10|15):00, sbires et monstres ?([.:])/, (m, n, t, p) => `Aim for ${n} CS at ${t}:00, minions and monsters${p}`],
    [/Vise ([\d.,]+) sbires à (10|15):00 ?([.:])/, "Aim for $1 CS at $2:00$3"],
    [/Repère intermédiaire : environ (\d+) à 5:00 ;/, "Checkpoint: about $1 at 5:00;"],
    [/enchaîne tes camps et, après un gank ou un combat, reprends tout de suite tes camps\./, "chain your camps and, after a gank or a fight, go straight back to your camps."],
    [/si tu es en dessous, ne force pas d'échange qui te fait rater des sbires\./, "if you're below that, don't force trades that make you miss CS."],
    [/après chaque back, refais les camps sur ton chemin avant de chercher un combat\./, "after each back, clear the camps on your way before looking for a fight."],
    [/après chaque back, reviens prendre la wave avant de chercher un combat\./, "after each back, come back for the wave before looking for a fight."],
    [/Vise ([\d.,]+) CS par minute sur toute la partie, sbires et monstres :/, "Aim for $1 CS per minute over the whole game, minions and monsters:"],
    [/entre deux combats ou objectifs, refais les camps réapparus\./, "between fights or objectives, clear the camps that have respawned."],
    [/Vise ([\d.,]+) sbires par minute sur toute la partie :/, "Aim for $1 CS per minute over the whole game:"],
    [/entre deux combats, prends les waves proches de toi\./, "between fights, take the waves near you."],
    [/Vise ([\d.,]+) (?:sbires et monstres|sbires) par minute entre 15:00 et 25:00\./, "Aim for $1 CS per minute between 15:00 and 25:00."],
    [/Entre deux combats ou objectifs, refais tes camps au lieu d'attendre ; rejoins ton équipe dès qu'un combat se prépare\./, "Between fights or objectives, clear your camps instead of waiting; join your team as soon as a fight is building."],
    [/Entre deux combats, va prendre la wave la plus proche, de préférence sur une side lane ; rejoins ton équipe dès qu'elle part sur un objectif\./, "Between fights, take the closest wave, preferably in a side lane; join your team as soon as it heads for an objective."],
    [/Vise ([\d.,]+) XP à 10:00, soit environ le niveau (\d+)\./, "Aim for $1 XP at 10:00, about level $2."],
    [/Enchaîne tes camps sans temps mort et, après un gank, reprends tout de suite tes camps au lieu de rester sur la lane\./, "Chain your camps without downtime and, after a gank, go straight back to your camps instead of staying in lane."],
    [/Reste sur ta lane pour prendre l'expérience de chaque wave ; ne quitte ta lane qu'après avoir poussé ta wave\./, "Stay in lane to get the XP from every wave; only leave your lane after pushing your wave."],
    [/Au plus (\d+) morts? avant 14:00 :/, (m, n) => `At most ${n} death${n === "1" ? "" : "s"} before 14:00:`],
    [/quand ton adversaire disparaît de la carte ou que leur jungler est vu de ton côté, recule avant de pousser\./, "when your opponent goes missing or their jungler is seen on your side, back off before pushing."],
    [/Vise (\d+) % de participation aux kills :/, "Aim for $1% kill participation:"],
    [/quand ton ADC est en sécurité ou rentre à la base, suis ton jungler ou ton mid vers les combats proches au lieu de rester seul en bot lane\./, "when your ADC is safe or backing, follow your jungler or mid to nearby fights instead of staying alone in bot lane."],
    [/après chaque clear, regarde la minimap et va là où un combat se prépare \(gank, contre-gank, escarmouche\)\./, "after each clear, check the minimap and go where a fight is building (gank, counter-gank, skirmish)."],
    [/après avoir poussé ta wave, regarde la minimap et rejoins les combats proches\./, "after pushing your wave, check the minimap and join nearby fights."],
    [/Vise un score de vision de ([\d.,]+) par minute :/, "Aim for a vision score of $1 per minute:"],
    [/pose les wards de ton item de support dès qu'elles sont disponibles et achète une control ward à chaque back\./, "place your support item's wards as soon as they're available and buy a control ward every back."],
    [/une control ward à chaque back et ton trinket dès qu'il est rechargé\./, "a control ward every back and your trinket as soon as it's back up."],
  ];
  const exEn = s => {
    let r = s;
    for (const [re, rep] of EX) r = r.replace(re, (...a) => `\u0001${numEn(typeof rep === "function" ? rep(...a) : a[0].replace(re, rep))}\u0002`);
    return r !== s && !r.replace(/\u0001[^\u0002]*\u0002/g, "").trim() ? r.replace(/[\u0001\u0002]/g, "") : null;
  };
  // Titres du bilan complet (« À corriger en priorité : … ») : traduits seulement s'ils sont connus
  const titleEn = s => {
    const u = s.charAt(0).toUpperCase() + s.slice(1), e = HEAD[u] || T[u], m = u.match(/^(.+) (?:: moins bien que les bons joueurs|au niveau des meilleurs)$/);
    return e || (m && PLAIN[m[1]] ? headEn(u) : null);
  };
  const CITY = { Londres: "London", "Montréal": "Montreal", "La Réunion": "Réunion", "Séoul": "Seoul" };
  // Titres du bilan complet seuls dans leur nœud (synthèse : « Ensuite : <span>…</span> · <span>…</span> »)
  Object.assign(T, HEAD, GOAL_EN, OUTCOME_EN, {
    // Carte « Mon objectif »
    "Aller au contenu": "Skip to content", "Mon objectif": "My goal", "Tes données du coach ont été supprimées : parties, mesures, objectifs et avis.": "Your coach data has been deleted: games, measurements, goals and feedback.",
    "Recommencer avec le coach": "Start over with the coach", "Lecture de tes dernières ranked": "Reading your recent ranked games",
    "Clé Riot refusée ou expirée : les parties ne peuvent pas être mises à jour.": "Riot key refused or expired: your games can't be updated.",
    "La mise à jour des parties a échoué.": "Updating your games failed.", "Pas de connexion au service du coach.": "Can't reach the coach service.",
    "Ton prochain objectif": "Your next goal", "Ton objectif en cours": "Your current goal", "Ton objectif en cours t'est donné": "Your current goal is set",
    ", ton poste principal : le coach te fait travailler une seule chose à la fois.": ", your main role: the coach has you work on one thing at a time.",
    "Pas encore d'objectif : joue quelques ranked de plus.": "No goal yet: play a few more ranked games.",
    "Il faut au moins 15 parties classées au même poste.": "You need at least 15 ranked games in the same role.",
    "Seules tes ranked": "Only your ranked games", "comptent : les parties à un autre poste ne font pas avancer le compteur.": "count: games in another role don't move the counter.",
    "donnée manquante": "missing data", "à jouer": "to play", "Toi aujourd'hui": "You today", "sbires": "CS", "morts": "deaths", "or": "gold",
    "Pourquoi cette cible": "Why this target", "C'est le repère du coach pour ce poste.": "That's the coach's benchmark for this role.",
    "En partie,": "In game,", "Je commence": "Start", "Mise à jour…": "Updating…", "Mettre à jour mes parties": "Update my games",
    "Supprimer mes données du coach": "Delete my coach data", "Oui, tout supprimer": "Yes, delete everything",
    "Tes parties, mesures, objectifs et avis seront effacés définitivement. Ton Riot ID reste enregistré sur cet appareil.": "Your games, measurements, goals and feedback will be permanently deleted. Your Riot ID stays saved on this device.",
    "Merci pour ton avis sur cet objectif.": "Thanks for your feedback on this goal.", "Ton avis sur cet objectif (test privé)": "Your feedback on this goal (private test)",
    "Utile pour ton jeu ? 1 = pas du tout, 5 = beaucoup": "Useful for your game? 1 = not at all, 5 = a lot", "Effets indésirables pendant ces parties :": "Side effects during these games:",
    "J'ai joué plus passif": "I played more passively", "J'ai moins farmé": "I farmed less", "J'ai moins participé aux kills": "I took part in fewer kills", "Plus de stress": "More stress",
    "Moins de plaisir": "Less fun", "Conseils pas adaptés": "The tips didn't fit", "Je n'ai pas compris l'objectif": "I didn't understand the goal",
    "Un commentaire ? (facultatif)": "A comment? (optional)", "Envoyer": "Send", "Bienvenue dans": "Welcome to", "Un objectif à la fois.": "One goal at a time.",
    // Accès au test privé
    "Test privé": "Private test", "Le coach est en test, sur invitation": "The coach is in testing, by invitation",
    "Tu as reçu un code d'invitation ? Crée ton compte avec ton e-mail, puis entre le code.": "Got an invitation code? Create your account with your e-mail, then enter the code.",
    "Tu as reçu un code d'invitation ? Connecte-toi avec ton e-mail, puis entre le code.": "Got an invitation code? Log in with your e-mail, then enter the code.",
    "Mot de passe": "Password", "Créer mon compte": "Create my account", "Me connecter": "Log in", "J'ai déjà un compte": "I already have an account", "Créer un compte": "Create an account",
    "Tu as quitté le test. Pour revenir, demande à la personne qui t'a invité.": "You left the test. To come back, ask the person who invited you.", "Me déconnecter": "Log out",
    "Code d'invitation": "Invitation code", "Conditions du test (à lire)": "Test terms (please read)",
    "Test privé d'environ deux semaines, réservé aux personnes majeures invitées.": "Private test of about two weeks, for invited adults only.",
    "À partir de ton Riot ID, le coach lit tes parties classées via l'API de Riot Games et les garde pour te proposer un objectif et le suivre sur tes parties suivantes.": "From your Riot ID, the coach reads your ranked games through the Riot Games API and keeps them to suggest a goal and track it over your next games.",
    "Données gardées : ton e-mail (pour te connecter), ton Riot ID, tes parties, tes objectifs et tes avis. Hébergées en Europe (Supabase, Irlande), visibles par toi seul, jamais vendues ni partagées, sans publicité, et aucune n'est envoyée à un service d'IA.": "Data kept: your e-mail (to log in), your Riot ID, your games, your goals and your feedback. Hosted in Europe (Supabase, Ireland), visible only to you, never sold or shared, no ads, and none of it is sent to an AI service.",
    "Le bouton « Supprimer mes données du coach » efface tout à tout moment. Tout est effacé à la fin du test.": "The “Delete my coach data” button erases everything at any time. Everything is erased at the end of the test.",
    "MINDIFF n'est ni approuvé ni soutenu par Riot Games.": "MINDIFF isn't endorsed or sponsored by Riot Games.",
    "J'ai 18 ans ou plus": "I'm 18 or older", "J'ai lu et j'accepte les conditions du test": "I have read and accept the test terms", "Rejoindre le test": "Join the test",
    "Pas de connexion : réessaie dans un instant.": "No connection: try again in a moment.", "E-mail ou mot de passe incorrect.": "Incorrect e-mail or password.",
    "Un compte existe déjà avec cet e-mail : connecte-toi.": "An account already exists with this e-mail: log in.", "Mot de passe trop court : 8 caractères au moins.": "Password too short: at least 8 characters.",
    "Session expirée : reconnecte-toi.": "Session expired: log in again.", "Le service du coach ne répond pas : réessaie dans quelques minutes.": "The coach service isn't responding: try again in a few minutes.",
    "Le coach est en test privé, sur invitation.": "The coach is in private testing, by invitation.", "Compte créé : confirme ton e-mail puis connecte-toi.": "Account created: confirm your e-mail, then log in.",
    "E-mail valide et mot de passe de 8 caractères au moins.": "A valid e-mail and a password of at least 8 characters.", "Entre le code, confirme ton âge et accepte les conditions.": "Enter the code, confirm your age and accept the terms.",
    "Aperçu": "Preview", "Ce que le coach te montrera": "What the coach will show you",
    "Une fois dans le test, entre ton Riot ID : le coach lit tes parties classées. Voici ce qu'il te montrera, sur une vraie partie.": "Once in the test, enter your Riot ID: the coach reads your ranked games. Here's what it will show you, on a real game.",
    // Carte d'objectif de l'Accueil
    "Prêt à commencer : ouvre le coach": "Ready to start: open the coach",
    // Notifications (cloche)
    "Réglages": "Settings", "Matchs en direct": "Live matches", "Gros matchs": "Big matches", "Mes favoris": "My favorites", "Aucun": "None", "Matchs suivis": "Matches followed",
    "Début de chaque game, first blood, première tour, dragons, Baron, inhibiteurs, ace, game et match gagnés.": "Start of each game, first blood, first tower, dragons, Baron, inhibitors, ace, game and match won.",
    "Gros matchs : Worlds, MSI, First Stand, LCK, LPL, LEC, LCS et LCP, plus tes équipes favorites.": "Big matches: Worlds, MSI, First Stand, LCK, LPL, LEC, LCS and LCP, plus your favorite teams.",
    "Ajoute des équipes en favori (étoile sur leur fiche) pour suivre aussi leurs matchs.": "Add teams to your favorites (star on their page) to follow their matches too.",
    "Niveau de détail": "Level of detail", "Essentiel": "Essentials", "Détaillé": "Detailed",
    "En plus : chaque tour détruite et chaque combat gagné (3 kills ou plus d'affilée).": "Also: every tower destroyed and every fight won (3 or more kills in a row).",
    "Les moments clés, avec le score des kills. Tes équipes favorites sont toujours en détaillé : chaque tour et chaque combat gagné.": "Key moments, with the kill score. Your favorite teams are always detailed: every tower and every fight won.",
    "Mode sans spoilers activé : pas d'alerte de match dans le site.": "Spoiler-free mode on: no match alerts on the site.",
    "Rappels activés": "Reminders on", "Désactivés": "Off", "Rappels du coach": "Coach reminders",
    "Ton objectif, les games qui restent, un mot pour t'encourager. Un rappel tous les 2 jours au plus, en fin d'après-midi.": "Your goal, the games left, a word of encouragement. At most one reminder every 2 days, in the late afternoon.",
    "Sur cet appareil, site fermé": "On this device, site closed", "Service des notifications indisponible sur cette version du site.": "Notification service unavailable on this version of the site.",
    "Sur iPhone, les notifications marchent depuis l'icône de MINDIFF sur l'écran d'accueil : bouton Partager, puis « Sur l'écran d'accueil ». Ouvre ensuite MINDIFF depuis cette icône et reviens ici.": "On iPhone, notifications work from the MINDIFF icon on your home screen: Share button, then “Add to Home Screen”. Then open MINDIFF from that icon and come back here.",
    "Ce navigateur ne permet pas les notifications quand le site est fermé.": "This browser doesn't support notifications when the site is closed.",
    "Activées sur cet appareil": "On for this device", "Envoyer un test": "Send a test", "Désactiver": "Turn off", "Activation…": "Turning on…", "Activer les notifications": "Turn on notifications",
    "Les notifications de MINDIFF sont bloquées dans les réglages de l'appareil.": "MINDIFF notifications are blocked in your device settings.",
    "Sans activation, les alertes de match s'affichent en bandeau quand MINDIFF est ouvert.": "Without turning them on, match alerts show as a banner while MINDIFF is open.",
    "Le service garde seulement l'adresse technique des notifications de cet appareil, tes choix et, si les rappels sont activés, le résumé de ton objectif (intitulé, poste, cible, games restantes). Ni e-mail, ni compte Riot.": "The service only keeps this device's technical notification address, your choices and, if reminders are on, a summary of your goal (title, role, target, games left). No e-mail, no Riot account.",
    "Confidentialité": "Privacy",
    "Autorisation refusée. Tu peux la redonner dans les réglages du téléphone, rubrique Notifications.": "Permission denied. You can grant it again in your phone settings, under Notifications.",
    "Ce navigateur ne permet pas les notifications.": "This browser doesn't support notifications.", "Le service des notifications n'est pas encore en ligne.": "The notification service isn't online yet.",
    "Le service des notifications ne répond pas. Réessaie dans un moment.": "The notification service isn't responding. Try again in a moment.",
    "C'est activé : une notification de test arrive.": "Done: a test notification is on its way.", "Activation impossible.": "Couldn't turn them on.",
    "Notifications désactivées sur cet appareil.": "Notifications turned off on this device.",
    // Fiche champion, équipe, aide, ancien coach, synthèse du bilan
    "Préparer avec ce champion": "Prepare with this champion", "des parties": "of games", "victoires : —": "wins: —", "en séries": "in series",
    "Aide : visite de cette page": "Help: tour of this page", "Aide": "Help", "Mes ressources": "My resources", "Tes forces": "Your strengths",
  });
  R.push(
    [/^(.+?) : (.+), cible (.+) \(([\d?]+)\/([\d?]+) parties\)(?: ; (.+))?\.$/, (m, o, l, t, a, b, rv) => {
      const oe = OUTCOME_EN[o], le = goalEn(l);
      const re = rv && rv.replace(/^garde-fou dégradé : (.+)$/, (mm, x) => { const g = x.split(", ").map(goalEn); return g.every(Boolean) ? `guardrail worsened: ${g.map(y => y.charAt(0).toLowerCase() + y.slice(1)).join(", ")}` : mm; }).replace(/^recul sur la métrique travaillée$/, "regression on the metric being worked on");
      return oe && le && (!rv || re !== rv) ? `${oe}: ${le}, target ${numEn(t)} (${a}/${b} games)${rv ? `; ${re}` : ""}.` : m;
    }],
    [/^Mon objectif · (.+)$/, "My goal · $1"], [/^Voir mon objectif (.+)$/, "See my $1 goal"],
    [/^(Top|Jungle|Mid|ADC|Support) : (\d+) parties? classées? récentes?\. Quand ce poste deviendra ton poste principal, ton prochain objectif y sera adapté \(ses champions, ses repères\)\.$/, (m, r, n) => `${r}: ${n} recent ranked game${n === "1" ? "" : "s"}. When this becomes your main role, your next goal will be adapted to it (its champions, its benchmarks).`],
    [/^Pas d'objectif à te proposer : tu es déjà au niveau des repères du coach sur tout ce qu'il suit à ce poste(?: \(meilleurs joueurs (.+)\))?\.$/, (m, t) => `No goal to suggest: you're already at the coach's benchmarks on everything it tracks in this role${t ? ` (top ${tierEn(t)} players)` : ""}.`],
    [/^Pas encore d'objectif : (.+)\.$/, (m, r) => { const e = reasonEn(r); return e !== r ? `No goal yet: ${e}.` : m; }],
    [/^C'est ce que tu fais d'habitude \(tes dernières ranked (.+)\)\.$/, (m, r) => `That's what you usually do (your recent ranked games ${r === "à ce poste" ? "in this role" : `as ${r}`}).`],
    [/^C'est ce que font les joueurs (.+?) (en moyenne|les plus forts)\. On y va par petites marches : (.+) d'abord\.$/, (m, l, q, t) => `That's what ${q === "en moyenne" ? "" : "the best "}${tierEn(l)} players do${q === "en moyenne" ? " on average" : ""}. We'll get there in small steps: ${numEn(t)} first.`],
    [/^L'objectif est réussi si tu atteins (.+) dans (\d+) de tes (\d+) prochaines ranked\. Gagner ou perdre ne compte pas\.$/, (m, t, a, b) => `The goal is met if you reach ${numEn(t)} in ${a} of your next ${b} ranked games. Winning or losing doesn't count.`],
    [/^Ce qu'en disent les coachs \((\d+)\)$/, "What coaches say ($1, in French)"],
    [/^(\d+) cibles? atteintes? sur (\d+) parties?$/, (m, a, b) => `Target reached in ${a} of ${b} game${b === "1" ? "" : "s"}`],
    [/^(\d+) \/ (\d+) réussites? · (\d+) \/ (\d+) parties?$/, "$1 / $2 successes · $3 / $4 games"],
    [/^(?:Vise|Au plus|Repère intermédiaire) .+$/, m => exEn(m) || m],
    // Carte d'objectif de l'Accueil
    [/^(.+) : vise (.+)$/, (m, l, t) => { const e = goalEn(l); return e ? `${e}: aim for ${unitEn(t).replace(/ /g, " ")}` : m; }],
    [/^(\d+) réussites? sur (\d+) · (\d+) parties? à jouer$/, (m, a, b, n) => `${a} success${a === "1" ? "" : "es"} out of ${b} · ${n} game${n === "1" ? "" : "s"} to play`],
    [/^(\d+) réussites? sur (\d+) nécessaires$/, "$1 of $2 successes needed"],
    [/^Cible atteinte (\d+) fois : c'est assez\. Joue encore (\d+) parties? pour valider l'objectif\.$/, (m, a, n) => `Target hit ${a} times: that's enough. Play ${n} more game${n === "1" ? "" : "s"} to confirm the goal.`],
    [/^Ce cycle ne sera pas réussi : il reste (\d+) parties? et il faudrait encore (\d+) réussites?\. Ce n'est pas un échec : finis-le, le coach mesure aussi ton progrès et peut relancer le même objectif\.$/, (m, n, k) => `This cycle can't be passed anymore: ${n} game${n === "1" ? "" : "s"} left and you would still need ${k} success${k === "1" ? "" : "es"}. It's not a failure: finish it, the coach also measures your progress and may restart the same goal.`],
    [/^(Objectif atteint|Objectif) : (.+) · (\d+)\/(\d+) réussies$/, (m, o, l, a, b) => { const e = goalEn(l); return e ? `${o === "Objectif" ? "Goal" : "Goal reached"}: ${e} · ${a}/${b} successful` : m; }],
    // Fiche champion, page match, équipe, méta
    [/^victoires \((\d+)\)$/, "wins ($1)"], [/^(\d+) autres podiums$/, "$1 more podiums"],
    [/^heure de (.+?)( \(UTC[^)]*\))?$/, (m, c, u) => `${CITY[c] || c} time${u || ""}`],
    [/^Seed n°(\d+) de la (\S+)(?: \((.+)\))?$/, (m, n, l, x) => `${l} seed #${n}${x ? ` (${({ "été": "Summer", "finale régionale": "regional finals", "points de championnat": "championship points" })[x] || x.replace(/^split/, "Split")})` : ""}`],
    [/^(.+) · (\d+) maps d'équipe$/, "$1 · $2 team maps"],
    [/^(.+) n'est pas encore couvert par le coach : conseils de méthode seulement\.$/, "$1 isn't covered by the coach yet: method tips only."],
    [/^(.+) (?:: moins bien que les bons joueurs|au niveau des meilleurs)$/, (m, p) => (PLAIN[p] ? headEn(m) : m)],
    [/^(\d+) sbires · (\d+) min$/, "$1 CS · $2 min"],
    [/^À corriger en priorité : (.+)$/, (m, x) => { const e = titleEn(x); return e ? `Fix first: ${e.charAt(0).toLowerCase() + e.slice(1)}` : m; }],
  );
  const SKIP =".nrow-title, .nrow-dek, .article-title, .reading, .summary, .brief-title, .scard-title, .scard-dek, .place-why, .c2-videos, [translate=no], script, style, code";
  function tr(s) {
    const t0 = s.trim(), t = t0.replace(/[\s\u00a0\u202f]+/g, " "); // espaces insécables normalisés
    if (/^\d+,\d+$/.test(t)) return s.replace(t0, t.replace(",", "."));
    if (/^\d+(?:[.,]\d+)? %$/.test(t)) return s.replace(t0, t.replace(",", ".").replace(" %", "%"));
    if (!t || !/[A-Za-zÀ-ÿ]/.test(t)) return s;
    const en = v => v.replace(/^\s+([:;,.!?)])/, "$1").replace(/ ([:;!?])(?=\s|$)/g, "$1");
    if (T[t] != null) return en(s.replace(t0, T[t]));
    if (Object.hasOwn(NAMES, t) && !t.startsWith("~")) return s.replace(t0, NAMES[t]);
    // Motifs appliqués au texte sans ses espaces de bord (les nœuds de texte gardent souvent un espace autour)
    let r = t;
    for (const [re, rep] of R) r = r.replace(re, rep);
    r = r === t ? s : en(s.replace(t0, r));
    // Noms d'objets et de runes du coach (servis en français) : remplacés par leur nom officiel anglais
    if (NAME_RE) r = r.replace(NAME_RE, m => NAMES[m]);
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
  // Nom officiel anglais d'un champion, d'un objet ou d'une rune (nom français de Data Dragon), une fois les noms chargés
  window.i18nName = n => (Object.hasOwn(NAMES, n) ? NAMES[n] : n);
  // Noms officiels Riot (Data Dragon fr_FR → en_US) des objets, runes et sorts : chargés seulement pour le coach, gardés par patch
  let NAMES = {}, NAME_RE = null, namesLoading = false;
  const setNames = map => {
    NAMES = map;
    // Dans une phrase : objets et runes seulement (les sorts « Soins », « Fantôme »… sont aussi des mots courants)
    const list = Object.keys(map).filter(k => !map["~" + k] && k.length >= 4 && !k.startsWith("~")).sort((x, y) => y.length - x.length);
    NAME_RE = list.length ? new RegExp(`(?<![\\p{L}'’])(?:${list.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}'’])`, "gu") : null;
  };
  async function loadNames() {
    // Coach, ou Accueil d'un joueur connecté au coach (carte d'objectif, « Nouvelle partie à relire : Seraphine »)
    let coachUser = false;
    try { coachUser = /"riotId"/.test(localStorage.getItem("mindiff-coach2-v1") || ""); } catch (e) { /* ignoré */ }
    if (namesLoading || NAME_RE || !(/coach/.test(location.hash) || coachUser)) return;
    namesLoading = true;
    try {
      const v = (await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(r => r.json()))[0];
      let map = null;
      try { const c = JSON.parse(localStorage.getItem("tm-names-en2") || "null"); if (c?.v === v) map = c.map; } catch (e) { /* ignoré */ }
      if (!map) {
        const get = (l, f) => fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/${l}/${f}.json`).then(r => r.json());
        const [fi, ei, fr, er, fs, es] = await Promise.all([get("fr_FR", "item"), get("en_US", "item"), get("fr_FR", "runesReforged"), get("en_US", "runesReforged"), get("fr_FR", "summoner"), get("en_US", "summoner")]);
        // Champions : noms officiels anglais (Séraphine → Seraphine, Maître Yi → Master Yi)
        const [fc, ec] = await Promise.all([get("fr_FR", "champion"), get("en_US", "champion")]);
        map = {};
        const add = (f, e, spell) => { if (f && e && f !== e) { map[f] = e; if (spell) map["~" + f] = 1; } };
        for (const id in fi.data) add(fi.data[id].name, ei.data[id]?.name);
        const runes = list => Object.fromEntries(list.flatMap(t => [[t.id, t.name], ...t.slots.flatMap(sl => sl.runes.map(x => [x.id, x.name]))]));
        const rf = runes(fr), re = runes(er);
        for (const id in rf) add(rf[id], re[id]);
        for (const k in fs.data) add(fs.data[k].name, es.data[k]?.name, true);
        for (const k in fc.data) add(fc.data[k].name, ec.data[k]?.name);
        try { localStorage.setItem("tm-names-en2", JSON.stringify({ v, map })); } catch (e) { /* ignoré */ }
      }
      setNames(map);
      walk(document.body);
    } catch (e) { /* noms restés en français */ }
    namesLoading = false;
  }
  window.addEventListener("hashchange", loadNames);
  loadNames();
  const start = () => {
    walk(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === "characterData") walk(m.target); else if (m.type === "attributes") walk(m.target); else m.addedNodes.forEach(walk); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  document.title = document.title.replace(/esport[s]? et coach/i, "esports and coach");
})();
