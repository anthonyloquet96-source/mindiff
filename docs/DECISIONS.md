# Décisions (acceptées, rejetées, et pourquoi)

Chaque ligne : date · décision · raison. Les détails sont dans `coach/JOURNAL.md` à la date indiquée.

## Acceptées
- 25/10 · Un seul objectif mesurable à la fois, évalué sur 5 parties, garde-fous anti-passivité · brief V1 d'Anthony.
- 26/10 · « Morts avant 14 min » suspendu comme objectif · poussait au jeu passif.
- 27/10 · Repères mesurés (clé dev) utilisés dans le test privé seulement, jamais sur le site public · conformité Riot.
- 28/10 · Repères Master+ : Corée, EUW et Amérique du Nord réunis · volume.
- 31/10 · Veille YouTube : lecture de la page « vidéos » autorisée, recherche automatique de chaînes arrêtée · robots.txt.
- 31/10 · Règles « objectif disputé en infériorité » et « combat perdu sans toi » remises comme **situations à revoir** (question, pas reproche) · demande d'Anthony, accord GPT.
- 31/10 · Cible d'un objectif au moins +0,25 σ au-dessus de la médiane · réussite par hasard 42 % → 34 %.
- 31/10 · Écrans « objectif validé », palmarès, paliers, « Objectif rempli » et « Nouvel objectif » animés · demande d'Anthony.
- 01/11 · Fiche champion « toi sur ce champion » comparée aux Diamant+ du même champion ; pas de récolte par champion et par rang pour l'instant · 50 000 parties par groupe de rangs nécessaires, non autorisées en production.
- 01/11 · Participation aux kills retirée des objectifs et des vetos · fiabilité intra-joueur 0,02-0,14.
- 01/11 · Control wards avant 20 min activé (support, jungle) · fiabilité 0,60-0,67, hasard 19 %.
- 01/11 · Six catégories de compétences et rotation anti-monotonie · demande d'Anthony : ne pas tourner en rond sur le farm.
- 01/11 · Vision/min gardé avec garde-fou « score par ward » · objection d'Anthony : une stat de quantité pousse au spam.
- 01/11 · Vainqueur d'une partie esport : inhibiteurs, puis écart d'or, puis tours ; le score officiel tranche les séries sans appel · BLG–HLE annoncé à l'envers.
- 01/11 · Données privées hors du bundle du Worker (bucket `coach-data`), déploiement depuis GitHub · supprimer le déploiement manuel.
- 01/11 · Tests en CI à chaque push.
- 01/11 · Jeton Cloudflare dans GitHub : le Worker se déploie tout seul à chaque publication.
- 03/11 · Tout ce que voient les testeurs vient de la clé personnelle ; plus aucune donnée de la clé de développement dans le produit · on déclare à Riot ce qui tourne réellement. Remplace la décision du 27/10.
- 03/11 · Anciens relevés de la clé de développement gardés dans le cache local, non utilisés · décision d'Anthony.
- 03/11 · `coach/ETAT.md` et `coach/etat.mjs` deviennent la source de vérité sur ce qui est fait · une note de mémoire fausse avait fait dire que la clé personnelle manquait.
- 03/11 · Marche minimale visible d'une cible (au moins 3 sbires à 10 min, 1 control ward…) · une cible « 59 → 60 sbires » n'est pas crédible.
- 03/11 · 50 parties synchronisées au lieu de 30, et synchronisation automatique chaque heure · 40 % des joueurs restaient sans objectif.
- 26/10 au 29/10 · « Confirm email » désactivé dans Supabase (voir `coach/ETAT.md`).
- 05/11 · Mention légale Riot en bas de chaque page · règles générales de Riot.
- 06/11 · Top et ADC : on garde le farm, la control ward avant 20 min est écartée · fiable (0,43 et 0,59) mais peu liée à la victoire (48 % contre 50 % pour l'ADC). À rouvrir avec les retours des testeurs.
- 07/11 · Tier list Ranked gardée et mise à jour à chaque patch, plutôt que cachée · demande d'Anthony.
- 10/11 · Règles de la base de conseils v1.4 : un conseil ancien qui ne décrit que des compétences redevient exploitable une fois comparé au kit actuel (Data Dragon) · 16 conseils officiels débloqués.

## Rejetées (pour l'instant)
- Objectifs : pings (très stables, aucun lien avec la victoire, risque de spam), wards détruites, premier grand objet, or qui dort, morts (toutes variantes), écarts face à l'adversaire de lane (hasard de la partie).
- Modèle de probabilité de victoire minute par minute : prototype de recherche au mieux ; calibré sur Diamant+, données de la clé dev.
- « Pourquoi tu as perdu » généré par IA, score global de jeu, capture vidéo, overlay, replays, assistant conversationnel permanent, cartes à collectionner, appli hors ligne.
- Récolte par champion × rang : après la clé de production, 20-30 champions populaires au plus.
- Veille Gemini hebdomadaire (proposition GPT) : refusée ; le frein est le quota, pas la cadence (2 335 vidéos en attente le 10/11).
- Objectifs hors farm pour Top et ADC (06/11) : control ward avant 20 min, premier objet, or qui dort, wards détruites, vision par minute.
- Bandes-annonces en animation 3D (Blender) : piste abandonnée.

## À trancher par Anthony
La liste à jour est dans `coach/ETAT.md` (« Ce qui attend Anthony »). Au 10/11 :
- Inviter les testeurs et les faire démarrer (« Je commence », puis 5 ranked).
- Clé de production : comment Riot essaiera le coach (code de démonstration ou vidéo du parcours).
- Tuile Valorant « Bientôt » : la garder ou la cacher.
- Documents RGPD : registre des traitements et durée de conservation.
- Le tuteur (IA conversationnelle) : l'activer ou non.
- Budget vidéo : Gemini payant pour lire toute la file (estimé à environ 150 $ en octobre pour 1 741 vidéos, à rechiffrer), ou gratuit sur plusieurs mois.
- Audit du face-à-face vis-à-vis des règles Riot (identification d'adversaires).
