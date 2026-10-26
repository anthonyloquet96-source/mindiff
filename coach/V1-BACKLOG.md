# Coach V1 — file de travail (branche coach-v1)

Brief : `Downloads/mindiff_prompt_claude_code.md` (tickets COACH-001 à 010). Cap : le brief donne les fondations, la base de conseils et les plans de jeu en sont le contenu (exercices). Une case cochée = fait, testé, committé.

## Fait
- [x] COACH-001 Audit (rendu dans la conversation du 25/10)
- [x] COACH-002 Normaliseur (`coach/normalize.mjs`)
- [x] COACH-006 Catalogue de métriques (`coach/metrics.mjs`) + job `coach/references.mjs`
- [x] COACH-007 Choix de l'objectif (`coach/goals.mjs`)
- [x] COACH-008 Cycle de vie (`coach/goals.mjs`)

## À faire, dans l'ordre
1. [x] Batterie de tests sur de vrais joueurs (clé de développement, privé) : historique de 30 ranked mid/jungle, diagnostic, objectif, évaluation rejouée sur les parties suivantes. Noter chaque incohérence et corriger.
2. [x] Brancher l'ancien code sur le normaliseur (review.mjs, situations.mjs, styles.mjs, tactics.mjs lisent `frames[i]`).
3. [x] COACH-003 Migration Supabase (SQL + RLS) et tests d'autorisation locaux (Postgres embarqué), sans compte.
4. [x] COACH-004/005 Routes `/api/v1` : d'abord dans le serveur local avec un stockage fichier (même contrat que le Worker), file de synchronisation idempotente, limite de débit Riot (en-têtes, Retry-After), puis le Worker.
5. [x] COACH-009 Tableau de bord de l'objectif (accueil du coach) ; Préparer et la carte en partie masqués derrière un drapeau.
6. [x] Exercices tirés de la base de conseils (conseils sourcés par thème de la métrique) et des plans de jeu.
7. [x] COACH-010 Tuteur IA (cite le diagnostic, admet ses limites).

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
- 01:00 — COACH-010 : tuteur (coach/v1/tutor.mjs), route POST /api/v1/coach/chat. Essai réel impossible ce soir : quota gratuit Gemini épuisé (réponse 503 propre). À refaire après la remise à zéro (~9 h).
- 01:10 — Batterie, 20 joueurs Fer → Diamant : la moitié sans objectif, mais surtout un défaut de la batterie (20 parties d'historique, rôle forcé mid/jungle même pour un joueur qui n'y joue presque pas) → 40 parties et rôle principal sur tous les postes. Défauts du coach corrigés : cible arrondie au-delà de la référence (0,5187 → 0,52) ; joueur déjà au-dessus de la médiane Diamant+ sans objectif possible → marche suivante = quart supérieur (p75, p25 pour les morts).

- 00:20 — Série 1 terminée (30 joueurs Fer → Challenger). Rejouée avec le moteur corrigé : tous les joueurs Master+ ont maintenant un objectif (marche au quart supérieur). Bilan : 7 réussis, 13 ratés, 1 inconclusif, 4 en cours, 5 sans objectif. À lire avec prudence : ces joueurs ne suivaient pas le coach ; avec une cible au 65e centile personnel, la réussite « par hasard » (3 parties sur 5) tourne autour de 25 %, ce qui correspond à ce qu'on observe (35 %). Ajout : progrès minimal d'un quart d'écart typique (0,504 → 0,51 de vision était atteint sans effort). Série 2 lancée (40 parties, rôle principal réel).

- 00:25 — Répartition des objectifs (séries 1 et 2 rejouées, 28 objectifs) : sbires 14 (10 min 10, 15 min 3, par minute 1), vision 7, morts 6, participation 1 ; la domination de « sbires à 10 min » s'est réduite avec la marche au quart supérieur. Les trois métriques de sbires forment désormais une famille : deux échecs de suite mettent de côté toute la famille, pas une seule métrique.

- 01:00 — Séries 1 et 2 terminées (60 joueurs, Fer → Challenger), rejouées avec le moteur actuel : 52 objectifs ; 18 réussis, 25 ratés, 2 inconclusifs, 7 en cours, 8 sans objectif (tous « moins de 8 parties au même poste » sur l'historique de test). Les cibles sont atteintes dans 25 à 50 % des parties passées du joueur (médiane 41 %) : ni trop faciles, ni hors de portée. Réussite sans suivre le coach : 42 % des objectifs tranchés. Objectifs : sbires 29 (10 min 19, 15 min 7, par minute 3), morts 11, vision 10, participation 2.

- 01:20 — Stockage Supabase (coach/v1/store-supabase.mjs, API REST + Storage) au même contrat que le stockage local ; migration ajustée (identifiant d'objectif en texte, colonnes extra, start_ms). Testé sur le vrai schéma dans Postgres embarqué : parcours complet, second objectif ouvert refusé par l'index, recalcul depuis les JSON bruts, suppression en cascade.

- 01:35 — Worker /api/v1 (worker/v1.mjs, branché dans worker/index.mjs) : jeton vérifié auprès de Supabase, autorisation par joueur, compte Riot lié à un seul compte MINDIFF, quotas (synchronisations, tuteur, IP), synchronisation après la réponse (waitUntil), CORS limité, journaux sans secret. Testé de bout en bout sur le vrai schéma. Mise en route décrite dans worker/README.md (étapes pour Anthony).

- 01:45 — Assemblage du Worker vérifié (wrangler deploy --dry-run, 585 Ko) : le code commun importe node:fs et node:zlib (plans de jeu, situations) → indicateur nodejs_compat ajouté, sans quoi le Worker planterait au démarrage. Attention : sur main, la route plan (25/10) a le même import ; ne pas redéployer le Worker depuis main sans cet indicateur. worker/builds.json ajouté au .gitignore (copié au déploiement comme les autres références).

- 02:05 — Série 3 (moteur final, 30 nouveaux joueurs) : 28 objectifs, 9 réussis, 16 ratés, 3 en cours. Morts avant 14 min devient l'objectif le plus fréquent (11/28), surtout via la marche au quart supérieur (2 → 1 mort) ; au-dessus de Diamant, 9 objectifs tranchés sur 10 sont ratés : ces joueurs sont proches du plafond et ne suivaient pas le coach. Pas de correction sans données de joueurs qui suivent vraiment l'objectif ; à surveiller.

## Pistes suivantes (à trier)
- Au-dessus de Diamant : une marche « 2 → 1 mort » est peut-être trop dure (palier entier) ; envisager des métriques plus fines (morts en lane seule, morts avant objectif) quand les premières vraies données de suivi arriveront.
- Déployer le Worker V1 (bloqué : projet Supabase et secrets à créer par Anthony, voir worker/README.md).
- Avant ouverture publique : RSO, quotas globaux (Durable Object), références recalculées avec la clé de production.
