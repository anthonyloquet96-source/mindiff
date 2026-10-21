# Journal du coach

Chaque passage d'amélioration y est consigné : ce qui a été lu, ajouté et corrigé, ce qui reste incertain, et les changements de règles proposés (jamais appliqués sans votre relecture).

## 2026-10-21, 19 h 30 — coach restructuré, plus simple (branche `coach-v2-suite`, à valider)
- **Demande d'Anthony** : une organisation à l'image du reste de l'application ; aujourd'hui il y a trop d'informations partout, on s'y perd.
- **4 onglets**, comme Compétitions :
  - **Suivi** : profil sur une ligne, partie en cours, partie à relire, objectif, accès au bilan général, 3 dernières parties ;
  - **Parties** : la liste, avec un filtre par rôle ;
  - **Préparer** : draft ou face-à-face, en pastilles ;
  - **Champions**.
- **Bilan d'une partie** : 3 vues en pastilles.
  - **Résumé** : en bref, constats, accès aux moments clés.
  - **Carte** : relecture tactique.
  - **Détails** : frise, référence Diamant+, build, composition.
  
  Chaque partie s'ouvre sur le Résumé.
- **Bilan général** :
  - sujet choisi en pastilles (rôle ou champion) ;
  - synthèse courte : la priorité, comment la travailler, les priorités suivantes, les forces ;
  - puis 4 vues : À travailler, Forces, Profil (indicateurs tactiques, adversaires à préparer, prochaine session), Champions.
- **Allègement** :
  - le choix d'un objectif est replié ;
  - la grille d'outils en bas d'accueil est supprimée (remplacée par les onglets) ;
  - les composants de l'application sont réutilisés (onglets, pastilles, titres de section).
- **Hauteur des pages sur téléphone** : accueil d'environ 3 600 à 1 350 px, bilan d'une partie d'environ 6 500 à 1 860 px pour le Résumé.
- **Vérifié**
  - parcours complet à 360, 390 et 1280 px : 0 erreur, aucun débordement, les 4 onglets visibles à 360 px ;
  - 32 tests réussis sur 33 (1 ignoré faute de cache) ;
  - non-régression de l'application : 0 erreur.

## 2026-10-21, 18 h 30 — relecture tactique et synthèse du joueur (branche `coach-v2-suite`, à valider)
- **Demande d'Anthony** : laisser la rediffusion de côté et partir des données publiques. Le coach doit analyser chacune des dernières parties, avec les interactions entre joueurs, puis tout condenser en un résumé du joueur pour le coacher.
- **Moteur** (`coach/tactics.mjs`), sur la chronologie officielle Riot, sans IA :
  - mini-carte : position et points de vie des 10 joueurs à chaque minute ;
  - combats : éliminations proches dans le temps (20 s) et l'espace (3 000 unités), avec au moins 3 joueurs impliqués ;
  - objectifs : qui était autour, au relevé le plus proche dans le temps ;
  - morts : alliés présents et attaquants ; un allié compte comme présent s'il est proche au relevé ou impliqué dans une élimination toute proche (positions exactes) ; ganks avant 14 min ;
  - interactions : qui t'élimine, qui tu élimines, avec qui ;
  - présence sur la carte par phase de jeu.
- **« Ce qui aurait été mieux »** : 5 règles de fondamentaux, appliquées seulement à des faits mesurés :
  - absent sur un objectif perdu en infériorité ;
  - objectif disputé en infériorité, avec un combat perdu autour ;
  - mort seul face à plusieurs adversaires après 14 min ;
  - gank subi avant 14 min ;
  - combat perdu près du joueur, sans lui.
- **Garde-fous, ajoutés après relecture critique sur une vraie partie Challenger** :
  - un allié mort est noté « mort, en attente de réapparition » et non « absent » ;
  - aucun reproche quand le joueur était lui-même mort ;
  - un objectif cédé sans combat n'est pas une erreur ;
  - un duel n'est pas un combat ;
  - le relevé d'avant (jusqu'à 59 s plus tôt) donnait des comptes faux, par exemple « Baron 3 contre 0 » ; on prend désormais le relevé le plus proche.
- **Critère d'isolement durci** : le premier critère classait 40 morts sur 84 comme isolées, ce qui était faux. Le critère retenu en compte 7.
- **Bilan de partie** : section « Relecture tactique » avec mini-carte animée (curseur par minute, bouton Lire, combats et objectifs sur la carte), 4 indicateurs, les leçons et un bouton « Voir sur la carte », tous les combats et les interactions.
- **Bilan général** : tendances tactiques sur jusqu'à 20 parties. La « Synthèse du coach » donne :
  - ce qui coûte le plus, avec 3 priorités et pour chacune comment la travailler ;
  - les forces ;
  - le profil tactique (participation aux combats proches, présence aux objectifs, morts isolées, ganks) ;
  - les adversaires à préparer, avec un lien vers le face-à-face ;
  - un plan avant et après chaque partie.
- **Mesure** (compte Challenger, 20 parties mid) :
  - présent dans 68 % des combats proches et 67 % des objectifs ;
  - 21 morts sur 84 sur des ganks avant 14 min (12 parties sur 20) ;
  - 7 morts isolées ;
  - adversaires à préparer : Yone, Thresh, Locke.
- **Limites affichées** : une position par minute ; ni vision, ni sorts, ni position des balises.
- **Vérifié**
  - 32 tests réussis sur 33 (1 ignoré faute de cache), dont la relecture tactique (dragon perdu à 2 contre 5 avec jungler mort, combat au dragon, mort isolée, duel non compté) ;
  - navigateur à 390 et 1280 px : 0 erreur, aucun débordement ;
  - non-régression de l'application : 0 erreur.

## 2026-10-21, 16 h 30 — inventaire des vidéos pédagogiques (toutes langues) pour chiffrer Gemini payant
- **Outil** : `coach/inventory.mjs` (pages publiques de YouTube, sans clé ni IA). Il cherche les chaînes par langue, lit le catalogue complet de chaque chaîne (titre, durée, âge) et estime le coût au tarif Gemini 3.8 Flash. Résultats privés : `coach/cache/inventory.json`, sélections dans `inventory-selection.json`.
- **Périmètre**
  - 290 chaînes trouvées dans 10 langues.
  - 87 retenues (5 000 abonnés au moins, profil haut niveau, coaching ou guides, aucun autre jeu) dans 9 langues ; le vietnamien n'a rien donné d'utile sur YouTube.
  - 79 chaînes ont du contenu pédagogique sur les 24 derniers mois.
- **Volumes et coûts estimés**, hors vidéos de plus de 60 min et contenus pour débutants ou bas niveau :

| Sélection | Vidéos | Heures | Coût 2026 | Coût 2027 |
|---|---|---|---|---|
| Tout le pédagogique sur 24 mois | 5 497 | 2 530 | ~895 $ | ~1 790 $ |
| Les 25 plus vues par chaîne | 1 480 | 603 | ~222 $ | ~444 $ |
| Les 15 plus vues par chaîne sur 12 mois | 887 | 369 | ~135 $ | ~270 $ |
| Suivi des nouvelles vidéos | ~230 par mois | | ~37 $ par mois | ~74 $ par mois |

- **Limites**
  - Le tri « pédagogique » se fait sur les titres (mots-clés en 10 langues) : c'est une estimation.
  - Le coût par vidéo est estimé (90 tokens par seconde de vidéo, plus l'analyse) ; à mesurer sur les premières lectures payantes.
  - Le mode « Batch » (moitié prix) n'est pas encore vérifié pour les vidéos YouTube.

## 2026-10-21, 15 h 45 — bilan approfondi : plus de parties quand le sujet l'exige (branche `coach-v2-suite`)
- **Demande d'Anthony** : analyser beaucoup plus de parties du joueur quand un sujet le demande.
- **Bilan général par rôle** : jusqu'à 20 parties relues en détail, choisies parmi les 40 dernières parties classées (le profil n'en lit que 10). Tous les rôles sont proposés, même secondaires.
- **Bilan par champion** : on remonte jusqu'aux 60 dernières parties classées pour trouver celles jouées avec ce champion.
- **Adversaires rencontrés plusieurs fois** : bilan du joueur contre eux, par exemple Ahri 1 victoire sur 4. Les champions et les duels sont comptés sur toutes les parties retenues.
- **Seuil d'une tendance** : au moins 3 parties et au moins un quart des parties relues (5 sur 20).
- **Clé de développement partagée** : la collecte passe à 80 requêtes par 2 minutes pour laisser de la marge à l'application, et le service fait jusqu'à 6 essais quand Riot le freine.
- **Mesure réelle** (compte Challenger) : 20 parties mid relues en 13 s ; 8 parties Sylas trouvées parmi 60 en 4 s.

## 2026-10-21, 15 h 30 — préparation de partie, matchups, bilan général, contradictions (branche `coach-v2-suite`, à valider)
- **Demande d'Anthony**
  - une analyse de chaque partie à partir des connaissances ;
  - un bilan général (quoi améliorer, comment, points forts et points faibles) ;
  - la composition et des commentaires sur tous les matchups, y compris support contre support, support contre ADC et la bot lane à 2 contre 2 ;
  - la force d'un champion dans une composition, indépendamment de son vis-à-vis ;
  - la préparation de la partie (draft, taux de victoire, champions joués habituellement).
- **Données**
  - Nouvelle grande collecte Diamant+ en cours (environ 2 100 parties par heure, jusqu'à l'expiration de la clé de développement), sauvegardée au fil de l'eau.
  - Chaque partie garde maintenant les équipes et, par joueur, le profil de dégâts (physiques, magiques, bruts), le contrôle, l'encaissement et le KDA.
  - `coach/matchups.mjs` calcule :
    - les duels par voie ;
    - la bot lane : support contre ADC, ADC contre support, et le duo allié ;
    - chaque champion contre et avec chaque autre, tous rôles confondus ;
    - les profils de champions, dont les victoires selon la durée de partie.
- **Règle de prudence**
  - Tout taux de victoire est donné avec sa marge d'erreur à 95 % et le nombre de parties.
  - Sous 30 parties, aucun verdict.
  - Les champions du pool sont classés sur le taux de victoire moins la marge.
- **Préparer ma partie** (`#/lol/coach/beta/draft`)
  - Saisie des 10 champions, ou reprise de la partie en cours avec les rôles estimés.
  - Mon rôle, et mes champions (pool) par rôle.
  - Analyse : duels par voie, bot lane, mon champion face à toute la composition adverse et avec ses alliés, profils de composition, conseils vérifiés contre mon vis-à-vis, classement de mon pool.
- **Bilan de partie** : nouvelle section « Composition et matchups », avec les mêmes statistiques et les conseils « Bien jouer » du champion.
- **Bilan général** (`#/lol/coach/beta/bilan`)
  - Relecture des 10 dernières parties du rôle suivi (`/api/coach/report`).
  - Points à améliorer présents dans au moins 3 parties, avec les parties concernées et la façon de progresser.
  - Points forts, champions joués, duels rencontrés.
  - Un plan pour la prochaine session : une priorité, un champion, la draft à préparer.
- **Conseils** : un conseil de méthode propre à chaque type de constat, et le tutoiement partout.
- **Contradictions** (`coach/contradictions.mjs`, appliqué par `coach/kb.mjs`)
  - Détecte « prends X » contre « évite X » (objet, rune, sort), et un duel dit « favorable » d'un côté et « difficile » de l'autre.
  - Départage, dans l'ordre : la source officielle Riot, puis les données Diamant+, puis le conseil le plus récent.
  - Le conseil écarté passe « contradictoire » ; les cas non départagés sont listés dans `coach/kb/contradictions.json`, à vérifier à la source (consigne ajoutée au contrôle critique).
  - Base actuelle : 0 contradiction. Seules 2 unités sur 831 contiennent une consigne d'objet ou de rune ; la détection servira à mesure que la base grandit.
- **Vérifié**
  - 31 tests réussis sur 32 (1 ignoré faute de cache), dont la draft (marge, bot lane, compositions, aucun verdict sous 30 parties) et les contradictions.
  - Navigateur à 390 et 1280 px : 0 erreur, aucun débordement.
  - Non-régression de l'application : 0 erreur.

## 2026-10-21, 14 h — nouveau coach : progression, objectifs par rôle, bilan enrichi (branche `coach-v2-suite`, à valider)
- **Progression** : chaque partie vue est gardée sur l'appareil (80 au plus). L'objectif ne change plus à chaque actualisation : il est suivi jusqu'à 4 parties réussies sur les 5 dernières, avec une courbe partie par partie, la série en cours et l'évolution (valeur médiane avant et sur les 5 dernières).
- **Paliers** : palier 1, sortir du quart le plus faible des Diamant+ ; palier 2, atteindre leur médiane ; ensuite l'objectif suivant. Si rien n'est à corriger, le joueur choisit un point à travailler, avec la médiane Diamant+ comme cible. Les indicateurs dont la médiane Diamant+ vaut 0 ne sont pas proposés.
- **Choix du rôle** : un objectif par rôle joué (3 parties au moins).
- **Bilan de partie**
  - Encart « En bref » : phase de ligne, point clé, point fort, temps passé mort, objectif réussi ou manqué.
  - Deux nouveaux constats : retard de 1 000 or ou plus à 10 min, et 3 plaques ou plus perdues avant 14 min. Les événements de plaques existent aussi après 14 min dans les données Riot : seuls ceux d'avant 14 min sont comptés.
  - Section « Ton build face aux Diamant+ » : la part de chaque objet et de la rune clé chez les Diamant+ du champion, et les objets très joués absents. Formulation neutre : un objet rare peut être un bon choix.
- **Nouvelle partie** : encart « Ta dernière partie est prête » (moins de 3 jours), étiquette « Nouveau », rechargement automatique quand une partie suivie en direct se termine.
- **Accueil de l'app** : la carte « Mon coach » remplace « Préparer ma session », seulement si le service est disponible et le compte connecté (donc rien ne change en ligne aujourd'hui).
- **Pannes** : un message compréhensible et un bouton « Réessayer » quand la clé Riot est expirée ou que le service est indisponible.
- **Vérifié**
  - 29 tests réussis sur 30, 1 ignoré, dont un nouveau test (retard en ligne, plaques, build, objectif par rôle).
  - Navigateur à 390 et 1280 px, comptes Challenger et Or : aucune erreur ni débordement.
  - Non-régression de l'application : aucune erreur.

## 2026-10-21, 12 h 30 — partie en cours et fiches Diamant+

- **Partie en cours** (`live`, spectator-v5) : quand le joueur est en partie, le coach affiche son champion contre son adversaire direct, l'objectif personnel rappelé, 3 conseils contre l'adversaire et les deux équipes. Riot ne donne pas les rôles en direct : ils sont estimés (fréquences Diamant+ par champion, Châtiment, répartition la plus probable des 5 rôles). Les rôles incertains sont signalés.
- **Mesure de l'estimation** (`coach/eval-roles.mjs`, 40 parties Émeraude–Or hors échantillon) : 95,1 % des rôles justes, 98 % quand le coach se dit sûr, adversaire direct juste dans 90,3 % des cas. Vérifié aussi sur une vraie partie en cours (Maître EUW).
- **Échantillon Diamant+ cumulatif** (`coach/benchmarks.mjs`) : 393 parties sur 30 jours (surtout 16.20), soit 786 joueurs par rôle. Les parties déjà vues ne sont jamais recomptées, et seules leurs empreintes sont gardées.
- **Fiches « Ce que jouent les Diamant+ »** : runes clés, objets, sorts et arbres, pour les champions qui ont au moins 30 parties au patch le plus joué (24 champions pour l'instant). Le taux de victoire n'est affiché qu'à partir de 100 parties, avec sa marge d'erreur. Ces données restent dans le cache privé et ne sont servies que par le serveur local, en attendant la clé de production.
- **Tests** : rôles estimés (le Châtiment l'emporte sur les fréquences), calcul des fiches (patch le plus joué, parties de plus de 30 jours écartées, aucun identifiant de joueur).
- **Limites** :
  - l'échantillon ne grandit que lorsque `coach/benchmarks.mjs` est lancé avec une clé valide, et la clé de développement expire toutes les 24 h ;
  - les données couvrent uniquement EUW.

## 2026-10-21, 11 h 30 — refonte du coach : aperçu `#/lol/coach/beta`

Décisions d'Anthony : données Riot avec serveur gratuit et demande de clé de production ; pas d'IA en direct ; aperçu séparé avant de remplacer l'ancien coach.

- **`coach/review.mjs`** (sans IA) : bilan d'une partie à partir de match-v5 et de sa chronologie. Il relève :
  - les morts, avec le tueur, la moitié de carte et l'éventuel objectif adverse dans la minute qui suit ;
  - les retours à la base, déduits des achats et distingués des achats après une mort ;
  - les objectifs pris et perdus ;
  - les écarts d'or, de sbires et d'expérience avec l'adversaire direct à 10 et 15 min ;
  - au plus 3 constats, classés par importance.
- **Profil** : rang, 10 dernières parties classées, rôle principal, et un objectif. C'est l'indicateur le plus souvent sous la référence Diamant+ du rôle, suivi partie par partie.
- **Référence Diamant+** (`coach/benchmarks.mjs`) : quartiles par rôle sur 114 parties Challenger à Diamant IV (EUW, surtout 16.20), soit 228 joueurs par rôle. Elle reste dans le cache privé tant que la clé de production n'est pas obtenue.
- **Interface** (`coach2.js`) : connexion par Riot ID, carte de profil, objectif avec pastilles de réussite, dernières parties, bilan (ligne de temps, constats, barres de comparaison), face-à-face, 173 fiches champions. Les leçons proposées viennent de la base vérifiée et des vidéos de coachs, en écartant les guides d'autres champions.
- **API** : `coach/coach-api.mjs`, commune au serveur local (`/api/coach/*`) et au service en ligne (`worker/`, Cloudflare Workers, non déployé). La clé reste côté serveur ; limite de 30 demandes par visiteur toutes les 5 min.
- **Contrôles** : test du bilan sur une partie fictive ; parcours complet vérifié dans le navigateur avec un compte Challenger et un compte Or, à 390 et 1280 px, sans erreur.
- **Limites** :
  - en ligne, la connexion des comptes attend le service et la clé de production ; le face-à-face et les fiches champions fonctionnent déjà ;
  - les retours à la base sans achat n'apparaissent pas ;
  - la référence Diamant+ ne couvre qu'EUW pour l'instant.

## Bilan de la nuit du 20 au 21/10/2026 (boucle locale, fin à 10 h 20)

- **Couverture** :
  - conseils officiels de Riot pour les **173 champions** (803 conseils) ;
  - **40 pages officielles** de Riot en file pour les 26 champions sans conseils ;
  - **9 nouvelles sources** de créateurs (Chreak, Sixen, perryjg, Coach Leo, Coach Kirei, WTL YouTube, LS, Dishake, plus 3 chaînes ajoutées hier soir) ;
  - environ 290 vidéos en file, dont les anciens guides de Chreak et perryjg.
- **Référence Diamant+** : appliquée par le contrôle critique ; 4 statistiques retirées ; échantillon Riot de 160 parties Diamant+ (16.20).
- **Nouveaux contrôles** :
  - `contenu-ancien` : contenu de plus d'un an → provisoire ;
  - organisation commune (un blog et une chaîne YouTube d'une même équipe ne comptent que pour une source) ;
  - tri des extraits de stream ;
  - vidéos pédagogiques jusqu'à 90 min.
- **Robustesse** :
  - Gemini oublie le quota épuisé à sa remise à zéro ;
  - une indisponibilité de Gemini (quota ou saturation) ne consomme plus d'essai ;
  - correction de la priorité des pages officielles.
- **Connaissances ajoutées par l'IA cette nuit : aucune.** Le quota gratuit de Gemini (environ 20 requêtes par jour et par modèle) a été épuisé dès 2 h, puis de nouveau à 10 h, en partie par l'essai du prototype « Mes parties ». C'est le principal frein : la file d'attente demandera plusieurs semaines avec l'offre gratuite.
- **Prototype « Mes parties »** (local, non publié) : la chaîne fonctionne de bout en bout, mais l'IA produit des faits contradictoires et des horodatages décalés. Compte rendu : `%LOCALAPPDATA%\MINDIFF\essai-1.md`.
- **Veille distante réactivée** (variable `COACH_LOCAL_LOOP` supprimée) : GitHub reprend la veille toutes les 6 h.
- **Tests** : 26 réussis sur 27 (1 ignoré faute de transcription locale) ; parcours mobile et non-régression sans erreur.
- **En attente de décision** : la règle Diamant+ à inscrire dans `FIABILITE.md` (« je valide la règle Diamant+ ») ; la demande de clé Riot « production ».

## 2026-10-21, 10 h 17 — dernier passage de la boucle

- **Vidéos** : 2 lues (`c-yt-qQNuoySpVMc`, « How To: Dominate with Zaahen », 15:30 ; `c-yt-S3F9CpeiSNE`, « Zaahen Champion Spotlight », 03:12) ; `c-yt-ynG4T9yLKFs` (Locke) a échoué parce que Gemini était saturé.
- **Analyse** : aucune. Gemini était saturé (503) ou à quota épuisé ; les 2 essais consommés ont été rendus, et le code est corrigé pour ne plus les consommer.
- **Unités** : aucune nouvelle ; rien à relire.

## 2026-10-21, 09 h 45 — nouveaux créateurs (Sixen et recherche internationale)

- **Demande d'Anthony** : ajouter Sixen et chercher dans le monde entier des créateurs pédagogiques de haut niveau. Leurs vidéos sont lues dans leur langue, et les connaissances sont rédigées en français.
- **Ajoutés** (crédibilité « à établir » pour tous ; niveau déclaré, non vérifié indépendamment) :
  - `yt-sixen` (fr) : ses analyses « #1 world » portent sur le haut niveau et servent de référence ; ses « Analyses délu » (Bronze–Platine) ne servent qu'à corriger.
  - `yt-perryjg` (en, jungle) : règles de jeu et VOD reviews ; 25 anciens guides en file.
  - `yt-coach-leo` (en, jungle) : parties commentées « Educational SoloQ » à plus de 1100 LP.
  - `yt-coach-kirei` (en, mid et jungle) : analyses de joueurs du haut du classement.
  - `yt-wtl` (en) : même organisation que `wtl-blog` (`organization: we-teach-league`). Le contrôle critique ne compte plus deux sources d'une même organisation comme indépendantes.
  - `yt-ls` (en) : coachings et fondamentaux, mêlés à du commentaire esport.
  - `yt-dishake` (es) : guides de macro par rôle.
- **Écartés après examen des titres récents** :
  - Vars : histoire du jeu, pas de cours.
  - Spear Shot : défis et classement.
  - Agurin : directs et extraits courts ; il est analysé par Coach Leo et Coach Kirei.
  - Midbeast : rediffusions commentées.
  - Phreak : aperçus de League Classic, pas la Faille actuelle.
  - CoreJJ : temps forts.
  - Nemesis : contenu mixte.
- **Non trouvé** : la recherche YouTube en coréen et en chinois ne renvoie aucune chaîne exploitable. Aucune chaîne coréenne n'est ajoutée sans vérification.
- **Corrections** :
  - `discovery.maxSources` passe de 12 à 25 : 3 sources n'étaient jamais vérifiées ;
  - l'outil `backfill` reconnaît désormais « VOD review », « #1 … world » et « educational ».
- **Prototype « Mes parties »** : le serveur expérimental gardait en mémoire le quota épuisé et n'essayait plus jamais Gemini. `coach/gemini.mjs` oublie désormais ce blocage après le délai indiqué par Google. Test ajouté.

## 2026-10-21, 09 h 25 — vidéos longues pédagogiques

- **Demande d'Anthony** : prendre en compte les vidéos longues quand elles sont pertinentes.
- **Règle** : une vidéo pédagogique (guide, tutoriel, coaching, étude de cas, page officielle, ancien guide ciblé) est lue jusqu'à 90 min (`video.maxMinutesLong`). Les autres vidéos (directs, discussions, divertissement) restent limitées à 40 min. La limite de réponse de Gemini est doublée pour ces vidéos, afin que la transcription ne soit pas coupée. Test ajouté.
- **Rouvertes** : 2 vidéos de Coach Curtis écartées cette nuit. Les 5 longs épisodes de Chreak (40 à 60 min) seront lus.
- **Vérification de la publication** : la base en ligne sur GitHub Pages est identique à la base locale (même date de génération, 831 unités).

## 2026-10-21, 09 h 15 — anciens guides de Chreak

- **Demande d'Anthony** : cibler les tutoriels de Chreak, y compris les anciens, jugés de qualité et universels.
- **`coach/backfill.mjs`** (réutilisable pour toute chaîne suivie) : recherche dans la chaîne YouTube, garde les guides et coachings, écarte les tier lists, notes de patch, extraits courts et annonces, puis met les vidéos en file avec leur vraie date. Test ajouté.
- **59 vidéos de Chreak en file**, priorité 12 : sous les pages officielles de Riot (20), au-dessus des nouveautés des créateurs.
  - Guides par champion mid, de la saison 11 à la saison 15 : Ahri, Akali, Yone, Hwei, Syndra, Zoé, Qiyana, Sylas, LeBlanc, Vex, Azir…
  - Série « Comment monter Challenger » : trading, choix des champions, gestion des vagues, suivi du jungler, tempo.
  - « Dans la tête d'un Challenger », épisodes 1 à 9.
  - Coachings, dont un coaching jungle par un joueur LEC.
- **Limites** :
  - 5 vidéos dépassent 40 min (`video.maxMinutes`) et seront ignorées tant que cette limite n'est pas relevée ;
  - les coachings de joueurs Or ou Argent ne serviront qu'à corriger des erreurs (règle Diamant+) ;
  - les guides de plus d'un an produiront des conseils « provisoires » (`contenu-ancien`) : un principe universel reste juste, mais un build, des runes ou des valeurs de 2022 ont pu changer. Une validation humaine les rend exploitables ;
  - au rythme du quota gratuit de Gemini, il faudra plusieurs semaines pour lire ces 59 vidéos et les 40 pages officielles.

## 2026-10-21, 09 h 10 — source Chreak

- **Ajout demandé par Anthony** : `yt-chreak`, chaîne principale de Chreak (UCxLdRA_ZOiUxKe592BUt8zA, en français, mid). Ancien pro mid et Challenger selon ses propres déclarations, non vérifié indépendamment (Leaguepedia répond « 403 »). Crédibilité « à établir ».
- **Constat** : ses 15 dernières vidéos (jusqu'au 15/06/2026) sont surtout des extraits de stream, plus des tier lists et des notes de patch 26.9–26.11, donc dépassées pour la méta actuelle. Sa chaîne « VOD et clips » (SoloQ Challenge) n'est pas suivie.
- **Correction du tri** : « #twitch », « #shorts », « scandale » et « pentakill » sont désormais traités comme du divertissement. Test ajouté.
- **Correction** : le recalcul de priorité écrasait celle des vidéos officielles de Riot ; elle est rétablie et protégée.

## 2026-10-21, 08 h 50 — champions sans conseils officiels

Demande d'Anthony : chercher sur Internet des informations sûres pour les champions récents que le coach ne connaît pas.

- **Source ajoutée** : `riot-champion-insights`, pages officielles de Riot trouvées par le plan du site (`sitemap_loc.xml`, robots.txt : « Allow: / »). Aucun site tiers n'a été retenu.
- **`coach/insights.mjs`** (également lancé par la veille distante) : pour les 26 champions sans conseils complets dans Data Dragon, il a mis en file **40 pages officielles**, 22 articles « Champion Insights » ou mises à jour de conception, et 18 vidéos « Champion Spotlight » ou « How To ». Chaque champion a au moins une page, y compris Locke, Zaahen, Yunara et Qiyana (vidéos seulement). Les pages de skins, de musique et de vitrines sont écartées. Les pages du site qui ne font que renvoyer vers YouTube sont traitées comme des vidéos.
- **Priorité** : ces pages passent avant les vidéos de créateurs. Elles seront analysées au fil des passages, dans les limites de `config.json` (8 analyses par jour) et du quota gratuit de Gemini, ce qui demandera plusieurs jours.
- **Nouveau contrôle `contenu-ancien`** : la plupart de ces pages datent de la sortie du champion, entre 2019 et 2025. Un conseil tiré d'un contenu de plus d'un an (`freshness.maxContentAgeDays: 365`) reste « provisoire » jusqu'à confirmation sur le kit actuel. Aucune unité existante n'est touchée. Un test a été ajouté.
- **Constat** : les notes du patch 26.21 sont publiées par Riot depuis le 20/10. La collecte devrait les récupérer.

## 2026-10-21, 08 h 17 — passage de nuit

- **Vidéos** : 1 lue (`c-yt-Zac9x7hg4d8`, guide de 14:55) ; 1 ignorée parce qu'elle atteint la limite de 40 min (`c-yt-raqdIQEJrUQ`). Analyse toujours en attente du quota gratuit de Gemini (3 vidéos lues attendent).
- **Unités** : aucune ajoutée, rejetée ni retirée ; rien à relire.
- **Tests** : 25 réussis sur 26, 1 ignoré faute de cache. Parcours mobile et non-régression sans erreur.

## 2026-10-21, 06 h 17 — passage de nuit

- **Vidéos** : 2 lues (`c-yt-KHioKQPZxIg`, guide de 33:21 ; `c-yt-VYyfXe5kU-I`, extrait de 00:48), 1 ignorée car elle dépasse 40 min (`c-yt-Z57tMUTcvos`, environ 61 min). Leur analyse attend la remise à zéro du quota gratuit de Gemini.
- **Unités** : aucune ajoutée, rejetée ni retirée. Aucune nouvelle unité `u-ai-*` à relire.
- **Sources** : le flux de PekinWoof répond toujours « 404 ».
- **Tests** : 25 réussis sur 26, 1 ignoré faute de cache. Parcours mobile et non-régression sans erreur.

## 2026-10-21, 04 h 17 — passage de nuit : tout le jeu, référence Diamant+

Consigne d'Anthony : le coach doit couvrir tout le jeu, s'appuyer sur des vidéos actuelles de coaching, d'analyse et de tutoriels, écarter les mauvaises, et ne prendre comme référence que le niveau Diamant et plus. Le bas niveau ne sert qu'à corriger.

- **Vidéos** : 1 lue (`c-yt-QwXHsqp6x9Y`, 16:08, guide Skill Capped). Analyse en attente : quota gratuit de Gemini épuisé jusqu'à sa remise à zéro.
- **Tout le jeu** : `coach/ddragon.mjs` enregistre les conseils officiels de Riot (Data Dragon 16.21.1) pour **173 champions**, soit **803 conseils** pour jouer chaque champion et pour l'affronter, sans IA ni quota. 26 champions récents n'ont aucun conseil officiel (dont Yunara, Zeri, Samira, Ambessa) : le coach l'annonce. Les 5 rôles sont désormais ouverts ; pour un champion qui n'a que le socle officiel, le coach le dit.
- **Référence Diamant+** :
  - le contrôle critique refuse comme référence toute statistique ou partie de niveau inférieur à Diamant (`rang-sous-reference`) ; elle reste admise comme erreur à corriger, jamais proposée comme consigne ;
  - 4 statistiques retirées (Milio, Smolder, Jinx, Lucian), car elles reposaient sur des données « tous rangs » ou « Émeraude+ » ;
  - metabot, MOBA Trainer et LoLValue sont désactivés comme références : leur filtre Diamant+ n'existe que dans le navigateur ;
  - l'échantillon Riot couvre désormais Diamant I–IV, Maître, Grand Maître et Challenger ; la tranche Argent–Platine est supprimée ;
  - les statistiques du coach sont toujours celles du Diamant+, quel que soit le rang du joueur.
- **Tri des mauvais contenus** : un contenu jugé de faible qualité par l'analyse n'apporte plus aucune connaissance. La priorité de lecture favorise les vidéos pédagogiques et la crédibilité de la source, et pénalise le divertissement (réactions, clips, directs).
- **Sources** : ajout de Veigar v2 (support), PekinWoof (mid) et AloisNL (top), crédibilité « à établir ». Le flux de PekinWoof répond « 404 » : nouvel essai planifié. Aucune chaîne jungle fiable trouvée pour l'instant.
- **Corrections** :
  - adversaires proposés : les conseils officiels valables pour tous les rôles étaient ignorés ;
  - page de contrôle : plantage quand une unité n'a aucun signalement ;
  - base publiée allégée de 1,3 Mo à 972 Ko ;
  - échantillon Riot : la version supposée (16.21) ne correspondait pas aux parties jouées (16.20). Chaque partie est désormais rangée selon sa vraie version. Les parties écartées par erreur ne seront pas recomptées : l'échantillon de cette nuit est plus petit.
- **Tests** : 25 réussis sur 26, 1 ignoré faute de transcription locale ; nouveaux tests sur la référence Diamant+ et la couverture de tous les champions. Parcours mobile et non-régression sans erreur.
- **Incertain** :
  - les notes du patch 26.21 ne sont pas encore collectées (Data Dragon est déjà en 16.21) ;
  - la crédibilité des nouveaux créateurs reste à vérifier.

**Proposé pour relecture (non appliqué, règles verrouillées)** :
1. Dans `coach/rules/FIABILITE.md`, une section « Niveau de référence » : « Le savoir du coach vient du niveau Diamant et plus, ou de la compétition. Un contenu ou une statistique de niveau inférieur ne sert qu'à illustrer une erreur à corriger. »
2. Dans `coach/prompts/extraction.v1.md`, décrire les champs `niveau_partie` et `usage`. Ils sont déjà demandés par le schéma de l'analyse automatique ; les décrire dans la consigne rendrait le tri plus fiable.

## 2026-10-21 — branchement de la lecture vidéo (Gemini)

- **Clés** : Gemini valide. Riot refusée (« Unknown apikey ») : à régénérer sur developer.riotgames.com.
- **Lecture vidéo** : `coach/video.mjs` lit les vidéos YouTube publiques avec Gemini (voie officielle de Google). Contrôle sur 3 vidéos de Skill Capped : durées lues 17:46, 26:58 et 11:37, contre 17:46, 26:59 et 11:36 sur YouTube. La lecture est donc réelle.
- **Règles** : passées en v1.1. Une connaissance tirée d'une lecture par IA reste au mieux « provisoire » jusqu'à vérification humaine via l'horodatage. Verrouillées par Claude Code : **à relire et signer** avec `node coach/admin.mjs lock-rules "<nom>"`.
- **Corrections après relecture des premières extractions** :
  - les avis de créateurs sont désormais attribués (« Selon … ») ;
  - un contenu de créateur ne peut plus être classé « Analyse MINDIFF » ;
  - une réanalyse remplace les unités précédentes au lieu de les accumuler ;
  - les noms composés (« Nunu et Willump ») sont reconnus ;
  - un patch pas encore sorti (26.21) est signalé comme prévision.
- **Publication** : poussé sur `main` (commit 2ce0aae), site vérifié en ligne (parcours coach complet à 390 px, sans erreur). Secret `GEMINI_API_KEY` ajouté au dépôt. La veille distante est mise en pause pendant la boucle locale (variable `COACH_LOCAL_LOOP`), à réactiver au dernier passage.
- **Veille distante testée à la main** : 3 nouvelles vidéos lues ; 1 analysée, avec 4 unités acceptées et toutes attribuées « Selon Skill Capped » ; 2 en échec à cause de la saturation de Gemini (503) ; tests distants 20 réussis sur 24, 4 ignorés faute de cache.
- **Règles v1.1 validées par Anthony** le 21/10/2026, verrouillage signé à son nom.
- **Clé Riot** mise à jour et valide : `coach/riot.mjs` calcule des statistiques sur de vraies parties EUW. Elles ne sont pas publiées tant que le produit n'a pas de clé personnelle (`riot.publish: false`).
- **Quota gratuit de Gemini épuisé vers 02 h** : environ 20 requêtes par jour et par modèle, remise à zéro vers 9 h (heure de Paris). Désormais, un quota épuisé arrête la lecture et l'analyse sans compter d'essai, et `gemini-3.6-flash` sert de modèle de repli supplémentaire. Pour un usage régulier, l'offre gratuite est trop juste : il faudrait l'offre payante de Google, ce qui est votre décision.
- **Transcriptions réutilisées** : une vidéo déjà lue sur ce PC n'est plus relue si la veille distante a réinitialisé son état.
- **Limite connue** : les transcriptions restent dans le cache privé de la machine qui a lu la vidéo. Une vidéo lue sur GitHub sera donc relue si elle doit être analysée sur ce PC, et inversement. Cela coûte du quota gratuit, mais aucune transcription n'est publiée.
