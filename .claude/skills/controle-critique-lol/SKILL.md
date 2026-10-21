---
name: controle-critique-lol
description: Vérification critique des unités de connaissance du coach MINDIFF (étape 2) — patch, ranked et compétition, échantillon, origine des sources, contradictions, traduction, injection — avant leur entrée dans la base.
---

# Contrôle critique

Deux niveaux, complémentaires :

1. **Ta relecture** selon `coach/prompts/critique.v1.md` : verdict (garder, corriger, rejeter), statut proposé, signalements avec une phrase d'explication. En cas de désaccord entre sources, comparer les contextes (rang, région, file, patch, méthode, échantillon) et ne pas trancher à la majorité.
2. **Le contrôle déterministe** `coach/critic.mjs`, appliqué automatiquement par `coach/merge.mjs` et `coach/build.mjs` :
   - passage introuvable dans le texte consulté, ou sans chiffre pour une statistique → rejet ;
   - champion seulement cité en exemple → rejet ;
   - conclusion de solo queue tirée uniquement de la compétition (ou l'inverse) → rejet ;
   - titre ou métadonnées utilisés comme preuve → rejet ;
   - instruction dans un passage → rejet et quarantaine ;
   - petit échantillon non signalé, smurf ou partie unique, source unique, terme ambigu sans note → provisoire ;
   - classements divergents dans un même contexte → contradictoire ; dans des contextes différents → écart signalé ;
   - dépendance modifiée par un patch postérieur → à revalider ; valeur remplacée → obsolète ;
   - statistique ou partie de niveau inférieur à Diamant utilisée comme référence → rejet (`rang-sous-reference`). Admise seulement comme erreur à corriger (`usage: "correction"`), et jamais proposée comme consigne au joueur ;
   - patch pas encore sorti → provisoire (`patch-futur`) ; lecture vidéo par une IA → provisoire jusqu'à vérification humaine (`lecture-ia`) ; contenu publié il y a plus d'un an (`freshness.maxContentAgeDays`), par exemple un article de sortie de champion → provisoire (`contenu-ancien`), à confirmer sur le kit actuel.

3. **Les contradictions entre unités** (`coach/contradictions.mjs`, consigne d'Anthony du 21/10) sont appliquées à chaque recalcul des statuts (`coach/kb.mjs`).
   - **Ce qui est détecté** : « prends X » contre « évite X » (objet, rune, sort) pour un même champion et un même vis-à-vis, et un duel dit « favorable » d'un côté et « difficile » de l'autre.
   - **Départage, dans l'ordre** :
     1. la source officielle Riot ;
     2. les données Diamant+ (part de jeu de l'objet ou de la rune, taux de victoire du duel sur 100 parties au moins) ;
     3. le conseil le plus récent, à au moins 2 patchs d'écart.
   - **Effet** : le conseil écarté passe « contradictoire » et n'est plus montré au joueur. Chaque cas est listé dans `coach/kb/contradictions.json`.
   - **Cas « non départagé : à vérifier à la source »** : chercher l'information à la source avant toute autre tâche du coach, en plus des données :
     - notes de patch et pages officielles Riot ;
     - Data Dragon pour le kit ;
     - la vidéo ou l'article d'origine, au passage cité.
     
     Garder la version vérifiée et corriger l'autre avec `node coach/admin.mjs` (contester, retirer ou corriger), avec la source et la date dans la raison.

La seconde passe n'est pas une garantie : toute unité reste « relecture humaine en attente » jusqu'à `node coach/admin.mjs valider <unité> "<nom>"`. Une personne peut aussi contester, retirer ou corriger une unité ; tout est historisé (`coach/kb/corrections.json`).

Vérifier ensuite : `node coach/tests/run.mjs`.
