# Journal du coach

Chaque passage d'amélioration y est consigné : ce qui a été lu, ajouté et corrigé, ce qui reste incertain, et les changements de règles proposés (jamais appliqués sans votre relecture).

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
