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

La seconde passe n'est pas une garantie : toute unité reste « relecture humaine en attente » jusqu'à `node coach/admin.mjs valider <unité> "<nom>"`. Une personne peut aussi contester, retirer ou corriger une unité ; tout est historisé (`coach/kb/corrections.json`).

Vérifier ensuite : `node coach/tests/run.mjs`.
