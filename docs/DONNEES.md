# Données — provenance, statut, limites (10/11/2026)

## Règles absolues
1. **Clé de développement** : plus aucune donnée relevée avec elle n'est servie aux testeurs (décision d'Anthony du 03/11). Les anciens relevés restent dans le cache local, non utilisés, et ne sont jamais publiés.
2. **Clé personnelle** (app 897844, petit groupe privé) : tout ce que voient les testeurs en vient. Ces données ne sont **jamais montrées publiquement** : Riot interdit l'usage public d'une clé personnelle.
3. **Site public** : aucun repère mesuré, aucun build ni aucune statistique tirés de nos collectes tant que Riot n'a pas accordé la clé de production.
4. On déclare à Riot ce qui tourne réellement (volumes, fréquence), et rien de faux.

Les fichiers privés sont hors git (`coach/cache/`, `worker/*.json`). Côté serveur, ils sont dans le bucket privé Supabase `coach-data`, avec un manifeste `published: false`.

## Jeux de données servis aux testeurs (clé personnelle)
| Jeu | Volume | Usage | Où |
|---|---|---|---|
| Chronologies EUW | 8 000 parties, dont 7 281 Diamant+ (Diamant 3 252, Master 2 207, Grandmaster 1 136, Challenger 686), collectées du 27/10 au 05/11 | repères par rang, fiches champions, builds, repères par champion | `coach/cache/timelines-perso` → bucket `coach-data` et Supabase `metric_references` |
| Repères par rang | 730 lignes metrics-2, Fer → Challenger | cible d'un objectif (rang au-dessus du sien) | Supabase `metric_references` |
| Fiches champions et builds | 173 champions avec au moins 30 parties, patch 16.21 | onglet Champions | bucket `coach-data` |
| Repères par champion et par poste | 121 couples avec au moins 200 parties ; ailleurs, repères du poste | « toi sur ce champion » | bucket `coach-data` |
| Parties des testeurs | 50 par testeur, puis les nouvelles chaque heure | leur coach | Supabase (`match_metrics`, bucket `riot-raw`), suppression en cascade à la suppression du compte |

## Jeux de données de validation (cache local, jamais servis)
| Jeu | Volume | Source | Usage | Où |
|---|---|---|---|---|
| Série Top et ADC | 80 joueurs × 30 parties, Fer → Challenger | clé personnelle, 06/11 | fiabilité, hasard et rejeu pour Top et ADC | `coach/cache/battery-perso` |
| Récolte par joueur | 70 joueurs × 30 parties | clé dev | fiabilité, hasard, rejeu | `coach/cache/battery-raw` |
| Banc d'essai | 1 600 parties, 160 par rang | clé dev | validation des constats de partie (fréquence par rang, lien avec la victoire) | `coach/cache/bench-raw`, `bench.json` |
| Anciens relevés | 48 549 fins de partie et 38 181 chronologies Diamant+, batterie de 90 joueurs | clé dev (et Master+ clé personnelle du 27/10) | plus utilisés depuis le 03/11 ; gardés sur décision d'Anthony | `coach/cache/`, sauvegarde `cle-dev-avant-03-11` |

## Jeux de données publics
| Jeu | Volume | Source | Usage | Où |
|---|---|---|---|---|
| Base de conseils | 1 302 conseils, dont 927 exploitables (10/11) | articles et vidéos publics, textes officiels de Riot (Data Dragon, notes de patch) | exercices, fiches | `coach/kb/`, `data/coach.json` |
| Sources repérées | 2 924 contenus, dont 2 335 vidéos pas encore lues | flux publics des chaînes et des sites | file d'attente de la veille | `coach/kb/contents.json` |
| Esport | matchs, équipes, flux minute par minute | API LoL Esports, Liquipedia | résumés factuels | `data/auto.json` |
| Tier list Ranked | patch 26.22, Émeraude et plus (07/11) | MOBA Trainer et LoLValue, liens affichés | page Méta | `data/meta.js`, à refaire à chaque patch |

Toutes les parties en cache sont anonymisées (joueurs `p1`…`p10`, aucun nom) ; la récolte par joueur garde seulement l'alias du joueur suivi.

## Ce que la timeline Riot donne et ne donne pas
Donne : position de chaque joueur **une fois par minute**, or, XP, niveau, sbires, dégâts cumulés ; événements horodatés (kills avec assistants, wards posées et détruites avec type, achats, bâtiments, plaques, monstres épiques, niveaux). Ne donne pas : intention, état des waves, caméra, pings situés, sorts adverses, replay. Conséquence : aucune règle ne doit affirmer « tu es resté » ou « tu pouvais rejoindre ».

## Indicateurs Riot « challenges »
129 champs par joueur. Utiles et testés : control wards, wards détruites, scuttles, CC convertis. Cassés ou trompeurs : `turretPlatesTaken` (jusqu'à 38 par joueur), symptômes de victoire (dragons, tourelles, Baron), dépendants du champion (skillshots, soins).

## Sources de la base de conseils
Pas de source sans adresse vérifiée. Pas de contournement des protections anti-robots, respect de `robots.txt`. Les vidéos YouTube ne sont pas téléchargées : Gemini lit l'adresse publique. Un conseil cite toujours un passage exact de sa source.

## Vie privée
Aucune adresse e-mail ni donnée personnelle vers une IA gratuite. E-mails de créateurs masqués dans la base publiée. Riot ID des tiers masqués dans les textes. Suppression de compte : tout ce qui concerne le joueur disparaît (voir `coach/confidentialite-v1.md`).
