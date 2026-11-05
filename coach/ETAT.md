# État du projet : source de vérité

Ce fichier dit ce qui est fait et ce qui reste à faire, pour Anthony comme pour Claude.

**Règles**
1. Avant de dire « c'est fait » ou « il te reste à faire X », Claude lance `node --env-file=.env coach/etat.mjs`, puis lit ce fichier. La mémoire de Claude et les résumés de conversation ne comptent pas comme preuve.
2. Chaque ligne du registre a une date et une source : une entrée du journal, un constat automatique ou un message d'Anthony.
3. Quand une démarche est faite ou une décision prise, Claude met la ligne à jour dans le même commit que le travail.
4. Si ce fichier contredit la mémoire ou le journal, c'est la vérification la plus récente qui l'emporte. On corrige l'autre source tout de suite.

## Vérifié automatiquement

<!-- AUTO:début -->
_Vérifié automatiquement le 05/11/2026 07:58:34 par `coach/etat.mjs`._

| | Point | Constat |
|---|---|---|
| ✅ | Secrets dans .env | les 8 sont présents |
| ✅ | Clé Riot (.env) | acceptée par Riot |
| ✅ | Service en ligne (Worker) | répond ; secrets posés : Riot oui, Supabase oui |
| ✅ | Testeurs inscrits | 1 actif(s), 0 parti(s) |
| ⚠️ | Cycles d'objectif terminés | 0 terminé(s) ; en cours : 1 ; proposés pas encore commencés : 2 |
| ✅ | Clé Riot du Worker (preuve par l'usage) | dernière partie récupérée chez Riot : 04/11 00:23 |
| ✅ | Dernière partie évaluée pour un objectif | 04/11 00:23 |
| ✅ | Code publié | tout est sur main |
<!-- AUTO:fin -->

## Accès et comptes

| Statut | Point | Depuis | Source |
|---|---|---|---|
| ✅ Fait | Clé Riot **personnelle**, app 897844 « MINDIFF Coach - private test » : sans expiration, 100 requêtes / 2 min, autorisée pour un petit groupe privé ; description mise à jour le 04/11 puis le 05/11 par Claude (8 000 parties de référence, 50 parties par testeur, vérification chaque heure), vérifiée après enregistrement | 26/10 | JOURNAL 26/10 |
| ✅ Fait | Clé Riot rangée dans `.env` et dans les secrets du Worker | 26/10 et 29/10 | JOURNAL 26/10 et 29/10 |
| ⏳ En attente de Riot | Clé de **production**, app 895430 : « Pending Review », aucun message de Riot. Description remplacée le 03/11 par Claude, à la demande d’Anthony (texte de `coach/riot-mise-a-jour-2026-11-03.md`), vérifiée après enregistrement. Seulement pour l’ouverture au public | 03/11 | portail Riot |
| ✅ Fait | Projet Supabase (gratuit, Irlande), migrations appliquées, « Confirm email » désactivé | 26/10 au 29/10 | JOURNAL |
| ✅ Fait | Déploiement automatique du Worker à chaque publication (jeton Cloudflare dans GitHub) | 01/11 | JOURNAL 01/11 et 03/11 |
| ❌ Bloqué | Facturation Google (génération d'images, de vidéos et de musique par IA) : décision d'Anthony, payant | — | mémoire DA 28/10 |

Les testeurs n'ont **pas** besoin de clé Riot. Ils ont besoin du **code d'invitation** (`PILOT_CODE` dans `.env`). La clé Riot ne se partage avec personne.

## Décisions

| Décision | Date | Source |
|---|---|---|
| Tout ce que voient les testeurs vient de la clé personnelle ; plus aucune donnée de la clé de développement dans le produit. On déclare à Riot ce qui tourne réellement | 03/11 | message d’Anthony |
| Garder pour l’instant les anciennes parties de la clé de développement dans le cache local (non utilisées) | 03/11 | message d’Anthony |
| Fait le 04/11 : repères par rang, fiches champions, builds, repères Diamant+ et par champion recalculés avec la clé personnelle (2 300 parties) et mis en ligne ; anciens repères de la clé de développement retirés de Supabase (sauvegarde locale) | 04/11 | JOURNAL 04/11 |
| Fait le 05/11 : collecte Diamant+ (8 000 parties au total), tout recalculé ; 121 couples champion + poste avec leurs propres repères | 05/11 | JOURNAL 05/11 |
| Fait le 05/11 : mention légale Riot en bas de chaque page du site, avec le lien vers la confidentialité (vérifiée sur ordinateur et à 390 px de large, pas cachée par la barre du bas) | 05/11 | JOURNAL 05/11 |

## Ce qui attend Anthony

| Point | Depuis | Source |
|---|---|---|
| Inviter les testeurs : 1 seul compte est inscrit au test privé (3 comptes joueurs reliés). Leur donner le code d'invitation | 03/11 | constat automatique |
| Faire démarrer les testeurs : « Je commence » sur l'objectif proposé, puis 5 ranked (2 objectifs proposés pas commencés, 1 en cours sans partie évaluée depuis le 28/10) | 03/11 | constat automatique |
| Documents RGPD : registre des traitements et durée de conservation | 03/11 | JOURNAL 03/11 |
| Décision sur le tuteur | 03/11 | JOURNAL 03/11 |
| Clé de production : choisir comment Riot pourra essayer le coach (code de démonstration envoyé par message sur le portail, ou vidéo du parcours) | 05/11 | règles Riot lues le 05/11 (developer.riotgames.com/docs/lol) |

## Ce qui attend Claude

| Point | Depuis | Source |
|---|---|---|
| Top et ADC : seulement des objectifs de farm | 03/11 | JOURNAL 03/11 |
| Filtrer les articles de paris dans les actus (proposé, sans réponse d'Anthony). Vérifié le 05/11 : aucun article de paris, seulement l'équipe « Betclic Apogee » | 03/11 | conversation |
| Clé de production : faire le tour du site et corriger ce qui est vide, cassé ou marqué « en test » | 05/11 | developer.riotgames.com/docs/portal |
| Clé de production : après la décision d’Anthony, préparer l’accès de Riot, ajouter le lien du site à la description de l’app 895430 et la recoller | 05/11 | règles Riot lues le 05/11 |
| Après les premiers cycles terminés : bilan chiffré « le coach aide-t-il à progresser ? » (critère de Riot : aider les joueurs de façon mesurable) | 05/11 | developer.riotgames.com/docs/portal |
