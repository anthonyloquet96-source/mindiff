# Service en ligne du coach (Cloudflare Workers)

Il rend la lecture des parties disponible sur la version en ligne (GitHub Pages), sans exposer la clé Riot.

## Mise en route (une fois)

1. Créer un compte gratuit sur https://dash.cloudflare.com (aucune carte bancaire).
2. Depuis ce dossier : `npx wrangler login`
3. Échantillon Diamant+ : `node --env-file=../.env ../coach/benchmarks.mjs`, puis copier `../coach/cache/benchmarks.json`, `../coach/cache/champstats.json` et `../coach/cache/builds.json` dans ce dossier (fichiers non versionnés).
4. Clé Riot : `npx wrangler secret put RIOT_API_KEY` (clé **production** une fois validée par Riot ; la clé de développement expire toutes les 24 h et n'est pas autorisée pour un produit public).
5. `npx wrangler deploy` : déployé le 21/10/2026 à https://mindiff-coach.mindiff.workers.dev (sans clé Riot pour l'instant : répond « non configuré »). Une fois la clé de production posée, renseigner cette adresse dans `index.html` (`window.MINDIFF_API`).

## Limites
- Offre gratuite : 100 000 requêtes par jour. Un profil coûte 13 requêtes Riot, un bilan 2.
- Limite par visiteur : 30 demandes par 5 minutes (coach/coach-api.mjs).

## Coach V1 (/api/v1) : mise en route avec Supabase (à faire une fois)

1. **Supabase** : créer un projet gratuit « mindiff » sur https://supabase.com, région Europe (Paris ou Francfort).
2. **Base** : dans le tableau de bord, SQL Editor, coller et exécuter `supabase/migrations/20261026000000_coach_v1.sql` (tables, index, RLS).
3. **Stockage** : Storage, nouveau bucket **privé** nommé `riot-raw` (JSON Riot bruts, jamais publics).
4. **Secrets du Worker** (jamais dans le chat ni le dépôt), depuis ce dossier :
   `npx wrangler secret put SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` (Project Settings → API), `RIOT_API_KEY` (clé de production), `GEMINI_API_KEY` (facultatif, tuteur).
5. `npx wrangler deploy`, puis vérifier `https://mindiff-coach.mindiff.workers.dev/api/v1/health`.

Avant une ouverture publique :
- Riot Sign-On (RSO) pour lier un compte Riot à un compte MINDIFF : sans lui, la première personne qui saisit un Riot ID le lie à son compte ;
- quotas et limite de débit Riot globaux (Durable Object) : aujourd'hui en mémoire par instance du Worker ;
- références `metric_references` recalculées avec la clé de production (celles de la clé de développement restent privées).

## Test privé (27/10/2026) : ce qui est fait, ce qu'Anthony lance

Fait : projet Supabase « MINDIFF » (Irlande, gratuit), migrations et bucket `riot-raw` appliqués ; `.env` contient
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PILOT_CODE` (code d'invitation) et la clé Riot personnelle (app 897844).
Le site (`index.html`, `window.MINDIFF_PILOT`) affiche la connexion des volontaires puis le code d'invitation.

À lancer par Anthony (Claude Code n'a pas le droit de poser des secrets ni de déployer) :
1. Copier la clé `service_role` (Supabase → Project Settings → API Keys → Legacy) dans `.env` : `SUPABASE_SERVICE_KEY=…`
2. `node worker/put-secrets.mjs` (pose les 5 secrets sans les afficher ; Gemini n'est pas envoyé)
3. `cd worker && npx wrangler deploy`, puis vérifier `/api/v1/health` (`riot` et `supabase` à `true`)
4. Fusionner `coach-v1` dans `main` pour publier le site.

Pendant le test, l'ancien coach (/api/coach) n'est servi qu'aux volontaires inscrits, sans les repères Diamant+
de la clé de développement ; `COACH_ACCESS = "public"` rouvrira tout après la clé de production.

## Notifications (29/10/2026)

Site fermé : Web Push (`worker/push.mjs`, `worker/webpush.mjs`, `sw.js`), moments forts calculés par `notif-events.mjs`
(partagé avec le site, qui affiche les mêmes alertes en bandeau quand il est ouvert).
- Routes publiques : `GET /api/push/key`, `POST /api/push/subscribe` (choix, résumé d'objectif, `test: true` envoie une notification d'essai), `POST /api/push/unsubscribe`.
- Déclencheurs (`wrangler.toml`) : chaque minute les matchs en direct, à 17 h UTC les rappels du coach (tous les 2 jours au plus par appareil).
- Tables `push_subs` et `push_live` : `supabase/migrations/20261029000000_push.sql`.
- Clés VAPID : `node worker/vapid-keys.mjs` (fait le 29/10, dans `.env`), posées par `put-secrets.mjs`.
- iPhone : seulement depuis l'icône de l'écran d'accueil (iOS 16.4+), activation par un appui sur le bouton.
- Limite de l'offre gratuite : 50 appels sortants par passage, donc quelques dizaines d'appareils ; au-delà, envoyer par lots (file d'attente).

À lancer par Anthony :
1. Supabase → SQL Editor : coller et exécuter `supabase/migrations/20261029000000_push.sql`.
2. `node worker/put-secrets.mjs` (ajoute `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY`, sans les afficher).
3. `cd worker && npx wrangler deploy`.
