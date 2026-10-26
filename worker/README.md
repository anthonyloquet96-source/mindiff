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
