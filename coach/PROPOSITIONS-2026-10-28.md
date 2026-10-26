# Propositions pour Anthony (28/10/2026)

Pistes trouvées en autonomie la nuit du 27 au 28/10, avec l'aide de ChatGPT en brainstorming. Les avis sont les miens. Rien n'est codé : chaque piste attend ta décision.

## Nouveaux objectifs possibles pour le coach

| # | Piste | Mon avis | Pourquoi |
|---|-------|----------|----------|
| 1 | **XP à 10 min** en jungle et en mid (déjà calculée, aujourd'hui en diagnostic seulement) | **Oui, en premier** | Fiable, facile à mesurer. Les conseils de clear ajoutés cette nuit (eXyu, Dardoch) donnent déjà les exercices. Garde-fou à prévoir : participation aux kills. |
| 2 | **Farm entre 15 et 25 min** (« farm après la lane ») | **Oui, ensuite** | Erreur fréquente en Argent/Or. Les conseils existent (bagelsen314, Spawn). Garde-fou : participation aux kills, pour ne pas récompenser un joueur qui abandonne son équipe. |
| 3 | **Morts dans la minute avant un dragon ou un Baron** | Diagnostic seulement | Le bilan de partie le repère déjà. Comme objectif, il risque de rendre le joueur passif, la même raison qui a fait suspendre « morts avant 14 min ». |
| 4 | **Être près d'un objectif avant qu'il soit pris** | Non pour l'instant | Riot ne donne la position des joueurs qu'une fois par minute : impossible de prouver qu'un joueur était présent. |
| 5 | **Convertir un kill en objectif dans les 90 s** | Plus tard | Idée intéressante, mais tous les kills ne permettent pas de prendre un objectif. Sans détecteur de situations jouables, on récompenserait la chance ou les choix de l'équipe. |

## Base de conseils : prochains manques

- Après les 35 conseils de cette nuit, les objectifs actuels sont bien couverts (sbires 15 à 23 conseils par poste, participation aux kills 14 à 20, vision 13 à 18).
- Si on retient les pistes 1 et 2 : chercher des guides sur le rythme en jungle (XP, niveau 6) et sur le farm en milieu de partie (side lanes, vagues entre deux combats).

## À faire de ton côté pour lancer le test privé

1. Copier la clé `service_role` de Supabase dans `.env` (`SUPABASE_SERVICE_KEY=`).
2. `node worker/put-secrets.mjs`, puis `cd worker && npx wrangler deploy`.
3. Dans Supabase, désactiver « Confirm email » (Authentication → Sign In / Providers), sinon les e-mails de confirmation n'arrivent pas à tes amis.
4. Publier le site : `git push origin coach-v1:main`. Le système de sécurité de Claude Code m'empêche de le faire.
5. Donner à tes testeurs le code d'invitation (`PILOT_CODE` dans `.env`).
