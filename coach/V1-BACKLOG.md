# Coach V1 — file de travail (branche coach-v1)

Brief : `Downloads/mindiff_prompt_claude_code.md` (tickets COACH-001 à 010). Cap : le brief donne les fondations, la base de conseils et les plans de jeu en sont le contenu (exercices). Une case cochée = fait, testé, committé.

## Fait
- [x] COACH-001 Audit (rendu dans la conversation du 25/10)
- [x] COACH-002 Normaliseur (`coach/normalize.mjs`)
- [x] COACH-006 Catalogue de métriques (`coach/metrics.mjs`) + job `coach/references.mjs`
- [x] COACH-007 Choix de l'objectif (`coach/goals.mjs`)
- [x] COACH-008 Cycle de vie (`coach/goals.mjs`)

## À faire, dans l'ordre
1. [ ] Batterie de tests sur de vrais joueurs (clé de développement, privé) : historique de 30 ranked mid/jungle, diagnostic, objectif, évaluation rejouée sur les parties suivantes. Noter chaque incohérence et corriger.
2. [x] Brancher l'ancien code sur le normaliseur (review.mjs, situations.mjs, styles.mjs, tactics.mjs lisent `frames[i]`).
3. [x] COACH-003 Migration Supabase (SQL + RLS) et tests d'autorisation locaux (Postgres embarqué), sans compte.
4. [x] COACH-004/005 Routes `/api/v1` : d'abord dans le serveur local avec un stockage fichier (même contrat que le Worker), file de synchronisation idempotente, limite de débit Riot (en-têtes, Retry-After), puis le Worker.
5. [x] COACH-009 Tableau de bord de l'objectif (accueil du coach) ; Préparer et la carte en partie masqués derrière un drapeau.
6. [x] Exercices tirés de la base de conseils (conseils sourcés par thème de la métrique) et des plans de jeu.
7. [ ] COACH-010 Tuteur IA (cite le diagnostic, admet ses limites).

## À faire par Anthony (plus tard)
- Créer le projet Supabase (Europe) et le compte Cloudflare ; poser les clés hors du chat.
- Dossier de clé de production Riot.

## Journal de nuit
(rempli au fil des tours)
- 23:35 — Bilan (review.mjs) et plans de jeu (styles.mjs) lisent les minutes par horodatage via le normaliseur ; situations et tactics lisent déjà la dernière frame avant l'instant (floor), inchangés. Batterie de vrais joueurs relancée (erreurs par joueur tolérées).
- 00:05 — COACH-004/005 : `coach/v1/` (client Riot avec limites lues dans les en-têtes, Retry-After, recul sur 5xx, liste blanche ; stockage fichier au contrat Supabase ; synchronisation idempotente ; routes /api/v1 dans le serveur local). Essai réel : 30 parties synchronisées, objectif vision en support 1,66 → 2,00. Le Worker reprendra api.mjs avec un stockage Supabase quand le projet existera.
- 00:20 — COACH-009 : carte « Mon objectif » en tête de Mon suivi (synchronisation automatique, objectif proposé avec repère et exercice, « Je commence », 5 pastilles d'évaluation, résultat du précédent). Onglet Préparer et carte en partie masqués (localStorage mindiff-extras = 1 pour les revoir). Vérifié par capture téléphone sur un vrai compte.
- 00:35 — Batterie (12 joueurs Fer → Or) : la cible « médiane + un écart typique » n'était atteinte que dans 8 à 33 % des parties du joueur lui-même, 5 objectifs tranchés sur 6 ratés. Cible recalée sur le 65e centile personnel (60e après un échec), plafonnée à la référence. Rejeu : 2 réussis, 2 ratés (dont un joueur à 0/5 en net recul), cibles 64→65, 71→76, 53→56. Constat : la moitié des joueurs n'ont pas 8 parties au même poste sur 20 ; « sbires à 10 min » domine.
- 00:50 — Tâche 6 : la carte d'objectif ajoute « Ce qu'en disent les coachs » (2 conseils sourcés de la base, du thème de la métrique et du poste, ceux qui parlent du geste en premier, sélection stable). Vérifié : vision en support → Dignitas et sendo, avec quand / comment / pourquoi.
