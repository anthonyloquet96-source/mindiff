---
name: veille-lol
description: Détecter et trier les nouveaux contenus du corpus suivi par le coach MINDIFF (vidéos YouTube en métadonnées, articles, notes de patch), avec priorités et reprise sur erreur. À utiliser avant une analyse ou pour vérifier l'état de la veille.
---

# Veille LoL

1. `node coach/discover.mjs` (ajouter `--force` pour ignorer l'intervalle de `coach/config.json` → `discovery.everyHours`).
   - Vidéos : flux RSS public de chaque chaîne (`youtube.com/feeds/videos.xml?channel_id=…`). On obtient titre, date, description, vues. **Jamais la transcription.**
   - Articles : liste publique (API WordPress) ; un article modifié repasse « en attente » (réanalyse ciblée).
   - Échec : la source garde ses contenus connus, un nouvel essai est planifié (`retryAfterHours`) ; après `maxAttempts`, elle est signalée en panne dans `data/coach-admin.json`.
2. `node coach/revalidate.mjs` : relève les changements des nouvelles notes de patch (champions, compétences, objets, systèmes) et ajoute les faits officiels des champions suivis.
3. Lire la file : contenus `analysis: "en-attente"` de `coach/kb/contents.json`, triés par `triage.score`, puis par date.
4. Ajouter une source : l'inscrire dans `coach/sources.json` avec une URL vérifiée, ses éléments d'expertise vérifiables, son mode d'accès réel et `lastChecked`. Ne jamais la présenter comme partenaire. Évaluer séparément la crédibilité de la source (registre), la qualité de chaque contenu (`contents.json`) et la pertinence pour le joueur (calculée par l'app).

Le tri par mots-clés sert à prioriser. Il ne dit rien de la qualité ni du contenu réel.
