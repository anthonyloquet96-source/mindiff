# Test privé — invitation, mini-guide et suivi (brouillon du 10/11/2026)

**Brouillon à valider par Anthony.** Le code d'invitation est `PILOT_CODE` dans `.env` : il ne s'écrit dans aucun fichier du dépôt. La clé Riot ne se partage avec personne.

## Avant d'envoyer
| | Point | Qui | État le 10/11 |
|---|---|---|---|
| 1 | Tour de l'espace connecté sur téléphone : connexion, Riot ID, objectif, bilan d'une partie, Champions, suppression | Anthony | À faire : jamais vérifié par Claude, qui ne se connecte pas |
| 2 | Builds et fiches champions sur le patch 26.22 | Claude | Collecte lancée le 10/11 au soir |
| 3 | Points RGPD de `docs/RGPD.md` § 5 | Anthony décide, Claude applique | 5 points ouverts |
| 4 | Date de fin du test | Anthony | À décider |
| 5 | Où envoyer les retours (groupe Discord, WhatsApp, message privé) | Anthony | À décider |

## Qui inviter
- Des joueurs majeurs, sur le serveur EUW, qui jouent en **ranked solo/duo**.
- Il faut **15 ranked au même poste** parmi leurs 50 dernières pour qu'un objectif soit proposé. En dessous, le coach montre les bilans de partie mais pas d'objectif.
- Tous les postes marchent. Top et ADC n'ont que des objectifs de farm pour l'instant.
- 5 à 10 personnes suffisent pour un premier bilan : chaque testeur qui finit un cycle compte.

## Message d'invitation (à copier)
> Salut ! Je teste MINDIFF, un coach LoL que je développe. Il lit tes ranked, te donne **un seul objectif** à travailler (par exemple tes sbires à 10 minutes) et vérifie sur tes 5 ranked suivantes si tu progresses.
>
> C'est gratuit, sur invitation, et ça marche dans le navigateur, sur téléphone ou ordinateur. Rien à installer, et il ne fait rien pendant la partie.
>
> 1. Ouvre https://anthonyloquet96-source.github.io/mindiff/ et va dans **Coach**.
> 2. Crée ton compte avec ton e-mail, puis entre le code d'invitation : **[code]**
> 3. Entre ton Riot ID (Pseudo#TAG). Le coach lit tes 50 dernières ranked, ça prend une à deux minutes.
> 4. Quand l'objectif s'affiche, appuie sur **« Je commence »**.
> 5. Joue 5 ranked au même poste, normalement. Le coach récupère tes parties tout seul.
> 6. Reviens voir le verdict, et dis-moi ce que tu en penses.
>
> Tes données restent privées, tu peux tout supprimer d'un bouton, et il faut avoir 18 ans ou plus. Le test dure [durée]. Merci !

## Mini-guide du testeur
- **Pas d'objectif proposé ?** Il faut 15 ranked au même poste. Joue encore quelques ranked à ton poste principal.
- **L'objectif ne te parle pas ?** Dis-le : c'est le retour le plus utile. Tu peux noter l'objectif à la fin du cycle.
- **Une partie ne compte pas ?** Seules les ranked solo/duo jouées au poste de l'objectif comptent. Les parties très courtes sont écartées.
- **Le coach ne voit pas ta dernière partie ?** Il passe chaque heure. Ouvrir l'onglet Coach la récupère tout de suite.
- **Tu veux arrêter ?** « Supprimer mes données du coach », en bas de l'onglet Coach.

## Ce qu'on demande en retour
1. L'objectif proposé était-il le bon pour toi ?
2. La cible était-elle crédible : trop facile, bien, trop dure ?
3. Est-ce que travailler cet objectif t'a fait jouer bizarrement (trop passif, obsédé par une stat) ?
4. Qu'est-ce qui était confus ou cassé ?
5. Est-ce que tu continuerais ?

Les trois premières questions sont déjà posées dans l'appli à la fin d'un cycle (note de 1 à 5, effets indésirables, commentaire).

## Suivi pendant le test
- `node --env-file=.env coach/etat.mjs` : testeurs inscrits, cycles en cours et terminés, dernière partie récupérée.
- `node --env-file=.env coach/pilot-report.mjs` : rapport du test privé.
- Bilan chiffré « le coach aide-t-il à progresser ? » : à construire, voir `coach/ETAT.md`.

## Ce que le test doit prouver
Riot accorde la clé de production à un produit qui aide les joueurs de façon mesurable. Au 10/11 : 1 testeur inscrit, 0 cycle terminé. Il faut des cycles terminés, par plusieurs joueurs, à plusieurs postes.
