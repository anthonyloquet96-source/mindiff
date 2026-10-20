# Étape 3 — Recommandation personnalisée (v1)

Cette étape est **déterministe** : elle est exécutée par `coach-select.js`, dans le navigateur du joueur, à partir de la base déjà analysée. Aucune analyse coûteuse n'est faite à l'ouverture d'une page. Ce fichier décrit les règles que le code applique ; les tests (`coach/tests/run.mjs`) les vérifient. Une future conversation avec le coach devra respecter les mêmes règles.

## Entrées

- Profil déclaré : rôle principal (et secondaire), rang, jusqu'à trois champions, solo / duo / équipe, objectif de travail, temps de préparation.
- Contexte facultatif : allié ou adversaire, proposés **seulement** si la base contient une unité pertinente.
- Base : unités, contenus, couverture, patch courant.

Le profil est une **déclaration** du joueur. Sans parties ni replays analysés, le coach ne prétend jamais connaître ses erreurs.

## Sélection

1. Ne retenir que les unités `exploitable`, `provisoire` (signalée) ou `contradictoire` (présentée comme telle). Jamais `obsolete`, `a-revalider` ni `retire`.
2. **Ce qui change pour moi** : au plus trois changements officiels portant sur les champions du profil, du patch le plus récent au plus ancien de la fenêtre. S'il n'y en a pas : le dire.
3. **Objectif de session** : une seule unité avec une action observable, du thème choisi, en priorité propre au champion, puis au rôle, puis générique (méthode). Avec un allié choisi : la synergie d'abord. Avec un adversaire choisi : le matchup d'abord.
4. **Plan de jeu** : deux à quatre consignes (selon le temps disponible) pour le champion et le rôle. Aucune consigne propre à un adversaire si l'adversaire n'est pas renseigné.
5. **Ressource** : le contenu analysé qui soutient l'objectif, avec auteur, date, langue, patch, ce qu'on en apprend et le lien. Une vidéo non analysée n'est jamais présentée comme ressource pour comprendre.
6. Statistiques : celles du contexte qui correspond au rang déclaré (Émeraude+ pour Émeraude et au-dessus, sinon tous rangs), toujours avec leur contexte. Une statistique de compétition est présentée comme telle.

## Formulation

- Court d'abord, détails dépliables.
- Pour chaque conseil : pourquoi il convient à ce profil, et quand il ne convient pas.
- Distinguer maîtrise individuelle, popularité, puissance statistique et valeur en équipe.
- Préférer un conseil réaliste à une nouveauté spectaculaire.
- Si la base ne couvre pas le champion ou le rôle : le dire, et ne proposer que des conseils génériques de méthode.
- Ne jamais promettre de victoire ni de montée de rang. Un retour « ça m'a aidé » ou une victoire n'est pas une preuve de progrès.
