# Coach MINDIFF — veille, base de connaissances et préparation de session (pilote LoL)

## Architecture

| Couche | Fichiers | Où ça tourne |
|---|---|---|
| Interface | `coach.js` (onglet Coach), `coach-select.js` (sélection des conseils), `admin.html` + `admin.js` (contrôle) | Navigateur, GitHub Pages (statique, sans secret) |
| Collecte et analyse planifiées | `coach/discover.mjs`, `coach/revalidate.mjs`, `coach/analyze.mjs` | GitHub Actions `veille.yml` (toutes les 6 h) ou poste local |
| Stockage des connaissances | `coach/kb/*.json` (versionnés), `data/coach.json` (publié) ; textes consultés dans `coach/cache/` (privé, jamais publié) | Dépôt Git + cache des workflows |
| Personnalisation | `coach-select.js`, règles de `coach/prompts/recommandation.v1.md` | Navigateur du joueur, sans appel payant |

Le profil du joueur, son historique et ses mesures restent dans son navigateur (`localStorage`, clé `mindiff-coach-v1`), supprimables depuis le profil.

### Les trois étapes

1. **Extraction** (`prompts/extraction.v1.md`) : unités de connaissance avec passages exacts.
2. **Vérification critique** (`prompts/critique.v1.md` + `critic.mjs`, déterministe) : patch, ranked et compétition, échantillon, origine, contradictions, traduction, injection.
3. **Recommandation** (`prompts/recommandation.v1.md` → `coach-select.js`) : déterministe, testée.

Les étapes 1 et 2 utilisent le même modèle (`config.json` → `analysis.model`, ou la variable `MINDIFF_COACH_MODEL`). Aucun traitement ne peut modifier `rules/` ni `prompts/` : leur empreinte est verrouillée (`rules/rules.lock.json`), et l'analyse s'arrête si elle ne correspond plus.

## Ce qui fonctionne ordinateur éteint

| Tâche | PC éteint | Condition |
|---|---|---|
| Site, coach, préparation de session | Oui | GitHub Pages |
| Collecte actuelle (actus, tournois) | Oui | `collecte.yml`, inchangé |
| Découverte des vidéos et articles | Oui | `veille.yml`, sans clé |
| Lecture des notes de patch et revalidation | Oui | `veille.yml`, sans clé (lecture déterministe) |
| Lecture des vidéos (Gemini) | Oui | Secret `GEMINI_API_KEY` |
| Analyse des nouveaux articles et vidéos | Oui | Gemini par défaut (`analysis.provider`, gratuit), ou Claude si `ANTHROPIC_API_KEY` est configuré ; sans clé, les contenus restent « en attente » |
| Analyse par l'agent Claude Code (`.claude/agents/analyste-lol.md`) | Non | Session Claude Code ouverte sur le PC |
| Analyse visuelle (images de vidéo) | Non | ffmpeg + fichier vidéo autorisé + relecture des images |

## Accès aux vidéos : ce qui est possible

- **Métadonnées seules** : flux RSS public des chaînes. Connecté et automatique.
- **Lecture par Gemini** (`video.mjs`, clé `GEMINI_API_KEY`) : l'API de Google accepte directement l'adresse d'une vidéo YouTube publique. Elle restitue la parole horodatée et des observations sur des images échantillonnées à 1 par seconde. C'est la voie officielle de Google ; elle est gratuite en préversion, dans la limite de 8 h de vidéo par jour, plafonnée à 6 h dans `config.json`. Les directs de plus de 40 min sont écartés. Les connaissances qui en sont tirées restent « provisoires » jusqu'à vérification humaine, et l'application propose des liens horodatés pour la faire. En offre gratuite, Google peut utiliser les contenus envoyés pour améliorer ses produits.
- **Transcription fournie** : l'API YouTube Data réserve le téléchargement des sous-titres au propriétaire de la vidéo, et les outils non officiels ne sont pas utilisés. Import administrateur possible : `import-transcript.mjs`, avec provenance.
- **Transcription et images** : `frames.mjs` sur un fichier vidéo que vous avez le droit d'utiliser (vos propres parties, ou une vidéo fournie par son auteur). Dépendance absente sur ce poste : ffmpeg (`winget install Gyan.FFmpeg`).
- **Navigateur assisté** (Claude in Chrome) : non connecté à cette session. Il permettrait de lire le panneau « Transcription » affiché par YouTube dans votre navigateur, ponctuellement et à la main. Ce n'est pas une voie d'automatisation.

## Coûts

- **Pilote** : 0 $ d'API. L'analyse de démonstration a été faite par l'agent dans la session Claude Code, et la lecture des patchs est déterministe.
- **Estimation** par article, mesurée en mode `--dry-run` sur les deux articles WTL (3 400 à 5 500 tokens de texte) : au plus 0,20 à 0,22 $ avec `claude-opus-5-5`, ou 0,005 à 0,006 $ avec `claude-haiku-5-5`. C'est le plafond prudent utilisé par le contrôle de budget, qui suppose 8 000 tokens de sortie. Le coût réel sera relevé dans `coach/state/costs.json` et dans la page de contrôle.
- **Plafonds** (`config.json`) : 4 analyses par passage, 8 par jour, 1 $ par jour, 15 $ par mois. L'analyse s'arrête dès qu'un plafond est atteint.

## Commandes

```
node coach/discover.mjs [--force]      # découverte
node coach/revalidate.mjs              # patchs et dépendances
node coach/analyze.mjs [--dry-run]     # analyse (clé requise ; --dry-run : estimation sans appel)
node coach/merge.mjs <lot.json>        # lot rédigé par une personne ou par l'agent
node coach/build.mjs                   # publication de data/coach.json
node coach/tests/run.mjs               # tests
node coach/admin.mjs statut|valider|contester|retirer|reactiver|corriger|lock-rules
node coach/import-transcript.mjs <contenu> <fichier> --par "<nom>" --provenance "<origine et droit>"
node coach/frames.mjs <vidéo locale> <dossier> <hh:mm:ss>… [--rafale 4]
```

## Exécution distante par une routine Claude (option)

Une routine planifiée dans le cloud d'Anthropic (commande `/schedule` de Claude Code) peut jouer le rôle de l'agent sans votre PC. Elle utilise votre abonnement, pas une clé API. Conditions : la routine doit avoir accès au dépôt GitHub, et elle est configurée par vous. Consigne proposée : `coach/ROUTINE.md`.
