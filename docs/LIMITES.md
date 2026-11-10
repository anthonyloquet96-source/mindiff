# Limites connues (à dire au joueur et à ne pas contourner)

## Mesure
- Position des joueurs **une fois par minute** : aucune règle ne peut prouver qu'un joueur « est resté » quelque part ou « pouvait rejoindre » un combat. D'où les « situations à revoir » plutôt que des erreurs.
- Le flux LoL Esports s'arrête parfois avant les derniers coups : tours et inhibiteurs de la dernière image incomplets ; le score officiel prime.
- 5 parties, c'est peu : une métrique à fiabilité intra-joueur < 0,25 est surtout du hasard sur un cycle (voir `docs/REGLES-COACH.md`). Réussir 3/5 n'est pas une preuve de progression ; le comparateur avant/après (à construire) l'est davantage.
- Un repère Diamant+ est un horizon, pas une obligation pour un joueur Argent.
- Compter des wards, des control wards, des sbires reste manipulable : les garde-fous attrapent les dérives nettes, pas toutes.

## Données et droits
- Repères, builds, statistiques et repères par champion : clé personnelle, test privé seulement, jamais sur le site public.
- Seuls 121 couples champion + poste ont leurs propres repères (200 parties au moins) ; ailleurs, le coach retombe sur les repères du poste.
- Vidéos YouTube de tiers : pas de téléchargement ni de sous-titres récupérés ; Gemini lit l'adresse publique, sans donnée joueur. Au quota gratuit, environ 16 analyses par jour : 2 335 vidéos attendent.
- Un conseil tiré d'une vidéo reste provisoire tant qu'un modèle complet n'a pas réécouté l'extrait (296 conseils dans ce cas le 10/11, 6 réécoutes par passage de la veille).
- Clé de production Riot non accordée : ouverture publique impossible ; liaison Riot ID sans Riot Sign-On (à remplacer avant l'ouverture).

## Preuve d'effet
- 0 cycle d'objectif terminé par un testeur au 10/11 : rien ne prouve encore que le coach fait progresser. C'est le critère de Riot pour la clé de production.

## Produit
- Top et ADC n'ont que des objectifs de farm (décision du 06/11) : hors farm, rien n'est à la fois fiable et lié à la victoire pour ces postes.
- La tier list Ranked n'est pas mise à jour toute seule : elle est refaite à la main à chaque patch.
- Affichage sur téléphone et espace testeur connecté : pas revérifiés lors du tour du site du 08/11.
- Pas de vidéo, pas d'aide en partie, pas d'IA conversationnelle active.
- Le premier chargement du coach recalcule les parties avec la version courante des métriques (quelques dizaines de secondes).
- Les animations sont coupées si l'appareil demande « réduire les animations ».

## Opérations
- Migrations SQL appliquées à la main dans Supabase.
- Suppressions en masse dans Supabase : bloquées pour Claude ; il prépare un script et Anthony le lance.
- La veille écrit la base de conseils sur `main` : la copie de travail (`coach-v1`) prend du retard tant qu'on ne fusionne pas `origin/main`.
- Une panne de la veille ne se voit que par l'e-mail de GitHub (11 échecs de suite du 04/11 au 06/11).
- Les caches privés vivent sur le poste d'Anthony : un recalcul des repères demande ce poste.
