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
2. [ ] Brancher l'ancien code sur le normaliseur (review.mjs, situations.mjs, styles.mjs, tactics.mjs lisent `frames[i]`).
3. [ ] COACH-003 Migration Supabase (SQL + RLS) et tests d'autorisation locaux (Postgres embarqué), sans compte.
4. [ ] COACH-004/005 Routes `/api/v1` : d'abord dans le serveur local avec un stockage fichier (même contrat que le Worker), file de synchronisation idempotente, limite de débit Riot (en-têtes, Retry-After), puis le Worker.
5. [ ] COACH-009 Tableau de bord de l'objectif (accueil du coach) ; Préparer et la carte en partie masqués derrière un drapeau.
6. [ ] Exercices tirés de la base de conseils (conseils sourcés par thème de la métrique) et des plans de jeu.
7. [ ] COACH-010 Tuteur IA (cite le diagnostic, admet ses limites).

## À faire par Anthony (plus tard)
- Créer le projet Supabase (Europe) et le compte Cloudflare ; poser les clés hors du chat.
- Dossier de clé de production Riot.

## Journal de nuit
(rempli au fil des tours)
