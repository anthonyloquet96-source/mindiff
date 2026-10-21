# Journal du coach

Chaque passage d'amélioration y est consigné : ce qui a été lu, ajouté et corrigé, ce qui reste incertain, et les changements de règles proposés (jamais appliqués sans votre relecture).

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
