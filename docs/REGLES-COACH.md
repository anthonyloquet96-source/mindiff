# Règles du coach — catalogue actif (metrics-2, goals-3, 10/11/2026)

Le code fait foi : `coach/metrics.mjs` (catalogue `CATALOG`, catégories `CATEGORIES`, garde-fous `GUARDRAILS`), `coach/goals.mjs` (cible, évaluation, rotation), `coach/review.mjs` et `coach/tactics.mjs` (constats de partie). Ce document résume ; en cas d'écart, corriger ici.

## Objectifs proposables (autoPropose)
| Catégorie | Métrique | Postes | Sens | Fiabilité intra-joueur par poste (70 joueurs) |
|---|---|---|---|---|
| Lane & ressources | Sbires à 10 min, à 15 min, par minute, farm 15-25 min | top, jungle, mid, ADC | plus | 0,23-0,49 |
| Lane & ressources | Expérience à 10 min | jungle, mid | plus | 0,34 jungle, 0,18 mid |
| Vision & information | Score de vision par minute | jungle, mid, support | plus | 0,37 / 0,34 / 0,70 ; garde-fou anti-spam : score par ward |
| Vision & information | Control wards posées avant 20 min | support, jungle | plus | 0,67 / 0,60 ; hasard 3/5 : 19 % |

Suspendus (diagnostic seulement, `autoPropose: false`) : morts avant 14 min (pousse au jeu passif), participation aux kills (0,02-0,14 : la partie décide), wards adverses détruites avant 20 min (0,13-0,28), premier grand objet (0,09-0,27), or qui dort (0,03-0,19). Diagnostic sans exercice : or à 10 min, écarts d'or et d'XP face à l'adversaire (0,02-0,21), wards par minute, dégâts, participation aux objectifs, part de la partie passée mort, score de vision par ward.

**Top et ADC (série du 06/11, 80 joueurs, clé personnelle)** : objectifs de farm seulement, décision d'Anthony. Fiabilité Top puis ADC : sbires par minute 0,50 et 0,62 ; control wards avant 20 min 0,43 et 0,59 ; wards par minute 0,39 et 0,44 ; premier objet 0,27 et 0,18 ; morts avant 14 min 0,15 et 0,13 ; or qui dort 0,07 et 0,08 ; wards détruites 0,00 et 0,24. La control ward est fiable mais peu liée à la victoire (parties avec au moins une, contre sans : ADC 50 % contre 48 %, Top 56 % contre 52 %) : écartée. À rouvrir avec les retours des testeurs.

Aucun nouvel objectif n'est ouvert aux testeurs sans l'accord d'Anthony.

## Cible et verdict (`coach/goals.mjs`)
- Condition : au moins 15 parties valides au poste, parmi les 50 dernières synchronisées.
- Départ : médiane des 20 dernières parties valides au poste ; après une maîtrise, départ relevé à mi-chemin des parties jouées depuis.
- Cible : 55e centile personnel (60e après une maîtrise), au moins +0,25 écart-type personnel (MAD×1,4826, plancher par métrique), jamais au-delà du repère (Diamant+, ou rang au-dessus du sien en test privé), pourcentages au point près.
- Marche minimale visible (`VISIBLE_STEP`, 03/11) : la cible dépasse le départ d'au moins 3 sbires à 10 min, 5 à 15 min, 0,3 sbire par minute, 150 XP, 0,1 vision par minute ou 1 control ward. Si le repère est plus proche que cette marche, on vise le quart supérieur ; s'il n'y en a pas, la métrique n'est pas proposée.
- Évaluation : 5 parties valides au poste après le démarrage, cible atteinte dans 3 = **maîtrisé** ; médiane +0,25 σ = **en progrès** ; recul ≥ 0,75 σ ou garde-fou dégradé = **à revoir** ; sinon **stable**, puis **échec** après deux cycles stables ; moins de 4 parties valides = **inconclusif**.
- Garde-fous : dégradation nette = médiane −0,75 σ ET 4 parties sur 5 sous le quart bas personnel. Par poste : sbires et XP à 10 min, part de la partie passée mort, score de vision par ward (jungle, mid, support), participation aux objectifs (jungle), vision/min (support). La participation aux kills n'est plus un veto.
- Rotation anti-monotonie : bonus +25 % catégorie jamais travaillée, +15 % absente des 3 derniers cycles ; la catégorie (sinon la famille) du dernier cycle est écartée si un autre candidat vaut ≥ 70 % du meilleur score ; après « stable », rotation si une alternative existe, sinon le même objectif repart ; « en progrès » repart toujours.
- Score de base : écart au repère × impact × actionnabilité × part de parties sous le repère (constantes du catalogue, jamais fixées par une IA).

## Constats de partie (banc de 1 600 parties, Fer → Challenger)
Gardés parce que nettement plus fréquents chez les bas rangs : écart de sbires par minute, temps passé mort ≥ 15 % (jungle : 4 morts avant 14 min), aucune ou une seule ward adverse détruite avant 20 min, peu de retours, premier grand objet tardif, mort juste avant un objectif, mort seul. **Situations à revoir** (question, pas reproche) : objectif disputé en infériorité, combat perdu sans toi. Retirés : gank subi, absent d'un objectif, plaques, or non dépensé (sans différence entre rangs).

## Protocole avant d'activer une métrique
Voir l'agent `statisticien-validateur` : stabilité par poste ≥ 0,40 (`coach/stability.mjs`), maîtrise par hasard < 30 % (`coach/stability-chance.mjs`), séparation par rang, effet pervers et garde-fou nommés, rejeu (`coach/replay-raw.mjs`). Aucune activation sans ce rapport. Une métrique fiable doit aussi avoir un lien avec la victoire (leçon du 06/11).

## Base de conseils
Les conseils affichés sous un objectif suivent d'autres règles : `coach/rules/FIABILITE.md` (v1.4, verrouillé). Un conseil est `exploitable`, `provisoire`, `a-revalider`, `obsolete` ou `retire` selon sa source, sa citation, son contexte d'usage et les patchs. Toute correction passe par `coach/kb/corrections.json`, avec sa raison.
