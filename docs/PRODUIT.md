# MINDIFF — le produit (source de vérité, mise à jour le 10/11/2026)

Les agents et les sessions Claude lisent ce dossier `docs/` avant d'affirmer quoi que ce soit sur le projet. Quand le code et ce document se contredisent, le code a raison et ce document doit être corrigé (signaler, ne pas inventer).

## Où lire quoi
| Question | Document |
|---|---|
| Ce qui est fait, ce qui attend Anthony ou Claude, les accès | `coach/ETAT.md`, après `node --env-file=.env coach/etat.mjs` (vérification en direct) |
| Ce qu'est le produit, son parcours, ce qu'il ne fait pas | ce fichier |
| Comment c'est construit et déployé | `docs/ARCHITECTURE.md` |
| D'où viennent les données et ce qu'on a le droit d'en faire | `docs/DONNEES.md` |
| Les règles du coach : objectifs, cibles, verdicts | `docs/REGLES-COACH.md` |
| Les règles de la base de conseils | `coach/rules/FIABILITE.md` (v1.4, verrouillé) |
| Pourquoi une décision a été prise ou refusée | `docs/DECISIONS.md` |
| Ce que le produit ne sait pas faire | `docs/LIMITES.md` |
| Le détail daté de chaque changement | `coach/JOURNAL.md` (le plus récent en haut) |

## En une phrase
Application web (GitHub Pages, vanilla JS, français d'abord, anglais traduit à l'affichage) pour League of Legends : esport (matchs pro, résumés factuels, équipes), méta (tier lists, patchs) et un **coach** qui lit les ranked d'un joueur et lui donne **un seul objectif mesurable à la fois**, suivi sur 5 parties.

## Promesse du coach
« Il y a dix parties tu travaillais ce point ; voici ce qui a changé, les preuves, et la suite. » Pas une encyclopédie de statistiques : un entraîneur qui vérifie que le joueur progresse, sans le pousser à jouer pour la stat.

## Parcours joueur (coach)
1. Connexion au test privé (code d'invitation, compte Supabase, Riot ID saisi ; pas encore de Riot Sign-On).
2. Lecture des 50 dernières ranked solo/duo (match + timeline), recalcul à chaque ouverture. Une fois l'objectif démarré, le service récupère aussi les nouvelles parties tout seul, chaque heure.
3. **Objectif** : proposé après 15 parties au même poste ; carte « Toi aujourd'hui → Ta cible », exercice en une phrase, conseils de coachs sourcés ; « Je commence » ; 5 parties ; verdict (maîtrisé, en progrès, stable, à revoir, inconclusif) ; écran « Objectif rempli », compte rendu, palmarès, palier suivant, écran « Nouvel objectif ».
4. **Bilan de chaque partie** : constats (règles validées au banc), comparaison aux Diamant+, replay sur minimap avec moments clés et situations à revoir.
5. **Bilan complet** sur une vingtaine de parties : erreurs récurrentes, forces, adversaires à préparer.
6. **Champions** : fiche « toi sur ce champion » comparée aux Diamant+ du même champion ; build Diamant+ ; conseils.
7. Notifications (matchs pro en direct, rappels du coach), même appli fermée.

## Ce que MINDIFF ne fait pas (et pourquoi)
- Rien pendant la partie, aucun overlay, aucune lecture mémoire ni replay : 100 % API officielle Riot, post-game (choix produit et conformité Riot ; voir `docs/DECISIONS.md`).
- Pas de classement alternatif (MMR), pas de paris, pas d'identification d'adversaires masqués.
- Pas d'IA conversationnelle active : le tuteur existe mais reste désactivé (coût, confidentialité, validation).
- Pas de vidéo analysée.

## Direction artistique
Appli sombre, accent orange, sobre, « appli de performance », thème clair disponible. Français simple, tutoiement, jargon joueur gardé en anglais (wave, ward, back, farm, lane…). Pas de promesse impossible : le coach dit « je ne sais pas » quand la mesure ne permet pas de conclure.

## État au 10/11/2026
- Test privé sur invitation, avec la clé Riot personnelle (app 897844). Clé de production demandée (app 895430), en attente de Riot : sans elle, pas d'ouverture au public.
- 1 testeur inscrit, 0 cycle d'objectif terminé : aucune preuve d'effet pour l'instant. Le bilan chiffré « le coach aide-t-il à progresser ? » attend les premiers cycles.
- Moteur d'objectifs goals-3, métriques metrics-2 (voir `docs/REGLES-COACH.md`). Top et ADC : objectifs de farm seulement (décision du 06/11).
- Base de conseils : 1 302 conseils, dont 927 exploitables (règles v1.4).
- Site et Worker publiés automatiquement à chaque fusion sur `main`.
- Mention légale Riot en bas de chaque page. Tier list Ranked à refaire à chaque patch (dernière : patch 26.22, le 07/11).

Ces chiffres vieillissent : l'état à jour est dans `coach/ETAT.md`.
