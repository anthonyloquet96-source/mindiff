# Service en ligne du coach (Cloudflare Workers)

Il rend la lecture des parties disponible sur la version en ligne (GitHub Pages), sans exposer la clé Riot.

## Mise en route (une fois)

1. Créer un compte gratuit sur https://dash.cloudflare.com (aucune carte bancaire).
2. Depuis ce dossier : `npx wrangler login`
3. Échantillon Diamant+ : `node --env-file=../.env ../coach/benchmarks.mjs`, puis copier `../coach/cache/benchmarks.json` et `../coach/cache/champstats.json` dans ce dossier (fichiers non versionnés).
4. Clé Riot : `npx wrangler secret put RIOT_API_KEY` (clé **production** une fois validée par Riot ; la clé de développement expire toutes les 24 h et n'est pas autorisée pour un produit public).
5. `npx wrangler deploy` : déployé le 21/10/2026 à https://mindiff-coach.mindiff.workers.dev (sans clé Riot pour l'instant : répond « non configuré »). Une fois la clé de production posée, renseigner cette adresse dans `index.html` (`window.MINDIFF_API`).

## Limites
- Offre gratuite : 100 000 requêtes par jour. Un profil coûte 13 requêtes Riot, un bilan 2.
- Limite par visiteur : 30 demandes par 5 minutes (coach/coach-api.mjs).
