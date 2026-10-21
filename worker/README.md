# Service en ligne du coach (Cloudflare Workers)

Il rend la lecture des parties disponible sur la version en ligne (GitHub Pages), sans exposer la clé Riot.

## Mise en route (une fois)

1. Créer un compte gratuit sur https://dash.cloudflare.com (aucune carte bancaire).
2. Depuis ce dossier : `npx wrangler login`
3. Référence Diamant+ : `node --env-file=../.env ../coach/benchmarks.mjs`, puis copier `../coach/cache/benchmarks.json` dans ce dossier (fichier non versionné).
4. Clé Riot : `npx wrangler secret put RIOT_API_KEY` (clé **production** une fois validée par Riot ; la clé de développement expire toutes les 24 h et n'est pas autorisée pour un produit public).
5. `npx wrangler deploy` : l'adresse affichée (`https://mindiff-coach.<compte>.workers.dev`) est à renseigner dans `index.html` (`window.MINDIFF_API`).

## Limites
- Offre gratuite : 100 000 requêtes par jour. Un profil coûte 13 requêtes Riot, un bilan 2.
- Limite par visiteur : 30 demandes par 5 minutes (coach/coach-api.mjs).
