# Tryhard Meta

Patchnotes, esport et méta compétitive (LoL, Valorant, CS2, Fortnite, Rocket League, EA FC 27) : sources vérifiées, analyses de Claude, mode tournoi.

## Utilisation

- Ouvrir **http://localhost:3000** (le serveur démarre tout seul à l'ouverture de session Windows : tâche **TryhardMeta-Serveur**).
- Démarrer à la main : `npm start` · collecte seule : `npm run collect`
- Journaux : `collector/server.log` (serveur) et `collector/collect.log` (collectes)
- Arrêter le démarrage automatique : `Disable-ScheduledTask -TaskName TryhardMeta-Serveur`

### Activer les analyses Claude

1. Créer une clé sur https://platform.claude.com (rubrique API Keys).
2. Copier `.env.example` en `.env` et coller la clé après `ANTHROPIC_API_KEY=`.
3. Redémarrer le serveur (fermer la session Windows ou `Stop-ScheduledTask` puis `Start-ScheduledTask -TaskName TryhardMeta-Serveur`).

`TRYHARD_MAX_ANALYSES` (dans `.env`) limite le nombre d'analyses par collecte pour maîtriser le coût.

### Sur le téléphone

Mettre `HOST=0.0.0.0` dans `.env`, redémarrer, puis ouvrir l'adresse affichée dans `collector/server.log` (même Wi-Fi). Windows demandera d'autoriser Node.js dans le pare-feu. Depuis le navigateur du téléphone : « Ajouter à l'écran d'accueil » pour l'installer comme une appli.

## Fonctionnement

| Fichier | Rôle |
|---|---|
| `server/server.mjs` | Sert l'appli, l'API (`/api/data`, `/api/status`, `/api/stream` en direct, `/api/collect`) et relance la collecte toutes les 30 min |
| `collector/sources.mjs` | Sources autorisées et leur niveau de confiance |
| `collector/collect.mjs` | Récupère chaque source |
| `collector/lolesports.mjs` | Tournois LoL officiels : phases, matchs, classements, champions joués par les pros |
| `collector/verify.mjs` | Regroupe les articles par sujet et attribue le statut de fiabilité |
| `collector/analyze.mjs` | Analyses Claude : sujets, tournois, « l'essentiel » par jeu (mises en cache) |
| `data/news.js`, `esport.js`, `meta.js` | Données vérifiées à la main |

Règles de fiabilité :
- **Confirmé** : source officielle, ou au moins 2 sites indépendants
- **Source unique fiable** : un seul média reconnu
- **Non confirmé** : fuite, rumeur ou source communautaire seule
- **Contradictoire** : un score annoncé ne correspond pas au résultat officiel

Méta pro LoL : le vainqueur de chaque partie est déduit de l'état final (inhibiteurs, tours) puis **vérifié contre le score officiel de la série** ; s'il ne correspond pas, le match est exclu des taux de victoire.

Claude ne reçoit que les faits collectés et a pour consigne de ne rien inventer et d'écrire au conditionnel ce qui n'est pas confirmé.
