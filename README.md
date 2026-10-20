# MINDIFF

![MINDIFF](logo.svg)

Le logo : un **D** et un **1** dont la silhouette commune forme un **M**. Le D pour MINDIFF, le 1 (vermillon) pour le premier, le vainqueur.

**Comprendre ce qui change. Savoir quoi jouer. Suivre la compétition.**
Patchnotes, compétitions, méta et stratégies pour League of Legends et Valorant, à partir de sources vérifiées.

En ligne : https://anthonyloquet96-source.github.io/mindiff/ (GitHub Pages, collecte automatique toutes les 30 min via GitHub Actions).

## Utilisation locale

- `npm start` puis **http://localhost:3000** (tâche Windows **TryhardMeta-Serveur** au démarrage de session).
- Collecte seule : `npm run collect` · journaux : `collector/server.log`, `collector/collect.log`.

## L'application (`index.html`, `app.js`, `style.css`)

JavaScript sans framework ni étape de build, compatible GitHub Pages.

- **Adresses** : `#/` choix du jeu · `#/lol` accueil du jeu · `#/lol/matchs` · `#/lol/actus[/id]` · `#/lol/tier` · `#/lol/strats[/id]` · `#/lol/tournoi/<id>/<onglet>[/<match>]` · `#/lol/enregistres`. Le retour navigateur et les liens directs fonctionnent ; les anciennes adresses (`#tournois/…`) sont redirigées.
- **Jeux affichés** : constante `ENABLED_GAMES` en tête de `app.js` (LoL et Valorant). Les autres jeux restent collectés.
- **Préférences locales** (sans compte, clé `tm-prefs-v1`) : dernier jeu, jeux et équipes favoris, articles et stratégies enregistrés, mode sans spoilers, date de dernière visite par jeu (pour « nouveau depuis votre visite », calculé sur la date de publication réelle).
- **Mode sans spoilers** : masque scores, vainqueurs, classements, résumés de tournoi et titres d'actus esport jusqu'à « Afficher ».
- **Fiabilité** : chaque contenu affiche sa nature (officiel, confirmé, rapporté, non confirmé, contradictoire), sa date de publication, le patch quand il est identifiable et ses sources. Les synthèses séparent « Les faits » et « Notre lecture » (interprétation). Les dates inconnues sont signalées (« vu le … »).
- **Données** : `data/auto.json` (collecte) + `data/editorial.json` (synthèses rédigées) + `data/*.js` (fiches vérifiées à la main, datées). En cas d'échec réseau, la dernière copie locale est affichée avec un bandeau indiquant son âge.
- Système visuel : jetons CSS en tête de `style.css` (couleurs, espacements, rayons, typographie).

## Collecte (`collector/`)

| Fichier | Rôle |
|---|---|
| `sources.mjs` | Sources autorisées et niveau de confiance |
| `collect.mjs` | Récupère chaque source, écrit `data/auto.json` |
| `lolesports.mjs` | Tournois LoL officiels, matchs, classements, picks des pros |
| `verify.mjs` | Regroupe les articles par sujet (jamais deux articles d'une même source) et attribue la fiabilité |
| `analyze.mjs` | Analyses Claude optionnelles (clé `ANTHROPIC_API_KEY`) |

Si LoL Esports ne répond pas, la dernière version valide des tournois est conservée et marquée comme ancienne.

## Rédaction (`editorial/`)

`node editorial/pending.mjs` liste ce qui reste à synthétiser ; les synthèses sont écrites dans `editorial/batch.json` puis fusionnées avec `node editorial/merge.mjs` (format vérifié). Règles dans `editorial/LOOP.md` : uniquement des faits sourcés, interprétation signalée comme telle.

Règles de fiabilité :
- **Officiel** : publié par l'éditeur ou l'organisateur
- **Confirmé** : au moins 2 sources indépendantes
- **Rapporté par un média** : une seule source reconnue
- **Non confirmé** : fuite, rumeur ou source communautaire seule
- **Contradictoire** : un score annoncé ne correspond pas au résultat officiel
