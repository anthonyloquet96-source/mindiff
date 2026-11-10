# Architecture (10/11/2026)

## Vue d'ensemble
| Couche | Quoi | Où ça tourne | Comment ça se met à jour |
|---|---|---|---|
| Site | `index.html`, `app.js` (esport, méta, actus, navigation), `coach2.js` (coach V1), `coach.js` (base de conseils, stratégies, carte d'accueil : pas l'ancien écran, retiré du parcours), `coach-select.js`, `i18n.js`, `story.mjs`, `notif-events.mjs`, `sw.js` | GitHub Pages | `collecte.yml` publie à chaque push sur `main` et toutes les 30 min |
| Données publiées | `data/auto.json` (esport), `data/news.js`, `data/esport.js`, `data/meta.js`, `data/coach.json` | GitHub Pages | collecte (`collector/`), veille (`veille.yml`, toutes les 6 h, Gemini gratuit, contenus publics) |
| Serveur du coach | `worker/` : Cloudflare Worker `mindiff-coach` (`index.mjs` → `/api/coach`, `/api/push`, `/api/v1`), `v1.mjs` (jeton, test privé, quotas), `push.mjs` | Cloudflare (offre gratuite) | `deploy-worker.yml` à chaque push sur `main` (tests, puis déploiement ; jeton Cloudflare dans les secrets GitHub depuis le 01/11). Déclencheurs du Worker : chaque minute (notifications des matchs en direct), `0 17 * * *` (rappel du coach), chaque heure à la minute 23 (`autoSync` : parties des testeurs dont l'objectif est démarré) |
| Base | Supabase (UE) : `players`, `matches`, `match_metrics`, `coaching_goals`, `goal_evaluations`, `pilot_testers`, `pilot_feedback`, `metric_references`, `sync_jobs`, `push_*` ; buckets privés `riot-raw` (JSON bruts) et `coach-data` (repères, builds, statistiques) | Supabase | migrations `supabase/migrations/*.sql` appliquées à la main dans l'éditeur SQL ; `worker/put-data.mjs` pour `coach-data` |
| Moteur du coach | `coach/normalize.mjs` → `metrics.mjs` → `goals.mjs` ; `review.mjs`, `tactics.mjs` (bilan et replay) ; `coach/v1/` (API, synchronisation, stockage) | partagé : Worker, serveur local (`server/server.mjs`), scripts | avec le site |
| Sécurité | RLS sur toutes les tables (lecture du propriétaire seulement, aucune écriture client), clé Riot et clé de service côté serveur, Content-Security-Policy sur la page, jeton Supabase vérifié par le Worker, quotas | | tour de sécurité du 01/11 (`coach/JOURNAL.md`) |

## Données privées du service
Les repères, les builds et les statistiques ne sont plus embarqués dans le Worker (depuis le 01/11). Ils sont dans le bucket privé Supabase `coach-data`, avec un manifeste `published: false`. `worker/data.mjs` les lit (cache de 15 min, ancienne version gardée si Supabase est en panne). `worker/put-data.mjs` les envoie après un recalcul, depuis le poste local. Les fichiers `worker/*.json` sont hors git.

## Flux d'une synchronisation
`POST /players/:id/sync` → tâche en file → Riot (match + timeline, 50 parties au plus, 3 parties par paquet, reprise après 20 s) → JSON brut gzip dans `riot-raw` → `computeMetrics` → `match_metrics` → `advanceGoals` (évaluer l'objectif ouvert, archiver, proposer le suivant) → l'appli relit `/goals/active`, `/progress`, `/diagnostic`, `/champion`.

## Scripts de données (poste local, cache privé)
`references.mjs` (Diamant+), `references-tiers.mjs --upload` (par rang → base), `champ-references.mjs` (par champion → `worker/champrefs.json`), `final-items-build.mjs` (objets complets, à chaque gros patch), `bench.mjs` (banc des constats), `battery-raw.mjs` + `stability.mjs` + `stability-chance.mjs` + `replay-raw.mjs` (validation d'une métrique), `pilot-report.mjs` (test privé). Après un recalcul : `worker/put-data.mjs`.

Depuis le 03/11, tout ce qui est servi aux testeurs vient de la clé personnelle : `timelines.mjs` (collecte, cache `timelines-perso`), puis `perso-sample.mjs` (fiches champions, builds, repères Diamant+, sans requête à Riot). `battery-raw.mjs` accepte `--dossier`, `--postes` et `--pace` ; `stability.mjs`, `stability-chance.mjs` et `replay-raw.mjs` acceptent `--dossier`.

## Base de conseils
`coach/kb/units.json` (conseils), `contents.json` (sources lues), `corrections.json` (corrections historisées, jamais d'édition directe d'un conseil), `changes.json` (ce que chaque patch modifie). `coach/critic.mjs` calcule le statut de chaque conseil selon `coach/rules/FIABILITE.md`. `coach/build.mjs` publie `data/coach.json`.

La veille (`veille.yml`, toutes les 6 h) écrit la base sur `main`, pas sur `coach-v1` : fusionner `origin/main` avant de compter ou de corriger des conseils.

## État du projet
`coach/ETAT.md` est le registre de ce qui est fait et de ce qui reste. `node --env-file=.env coach/etat.mjs` vérifie en direct les secrets (noms seulement), la clé Riot, le service, les testeurs, les cycles et le code publié.

## Automatisations (GitHub Actions)
| Fichier | Quand | Quoi |
|---|---|---|
| `collecte.yml` | à chaque push sur `main` et toutes les 30 min | collecte esport et actus, publication du site |
| `veille.yml` | toutes les 6 h | découverte et lecture des sources, revalidation après patch, base de conseils |
| `tests.yml` | à chaque push sur `main` et `coach-v1` | `coach/tests/run.mjs` |
| `deploy-worker.yml` | à chaque push sur `main` | tests, puis déploiement du Worker |
| `maintien.yml` | le 1er de chaque mois | commit vide, pour que GitHub ne coupe pas les tâches planifiées d'un dépôt sans activité |

## Tests
`node --env-file=.env coach/tests/run.mjs` : 61 tests (fixtures + tests sur cache privé, ignorés sans cache). Attendu : 60 réussis, 1 ignoré sans cache.

## Agents Claude (.claude/agents)
analyste-donnees (explore, propose), **statisticien-validateur** (valide ou refuse, indépendant), analyste-lol (base de conseils), chercheur-sources (trouve des sources), relecteur-joueur (lit comme un joueur Argent), testeur-site, testeur-service, motion-designer. Skills : veille-lol, analyse-contenu-lol, controle-critique-lol. Tous lisent `docs/` d'abord.
