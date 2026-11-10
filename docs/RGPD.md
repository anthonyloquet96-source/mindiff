# RGPD — registre des traitements et durées de conservation (brouillon du 10/11/2026)

**Brouillon à valider par Anthony.** Ce n'est pas un avis juridique. Les passages entre crochets attendent une décision. Sources : le code (`supabase/migrations/`, `worker/v1.mjs`, `coach/v1/`), `coach/CONFORMITE.md` et `coach/confidentialite-v1.md`.

## 1. Qui est responsable
- Responsable du traitement : [nom d'Anthony ou de la structure].
- Contact pour les demandes : [adresse e-mail dédiée]. Aujourd'hui, la page de confidentialité renvoie vers les tickets GitHub, qui sont publics : une demande de suppression ne devrait pas passer par là.
- Pas de délégué à la protection des données : il n'est pas obligatoire pour un projet de cette taille.

## 2. Registre des traitements

### Traitement 1 : coach personnel (test privé sur invitation)
| | |
|---|---|
| But | Lire les parties classées du joueur, lui proposer un objectif mesurable et vérifier sa progression |
| Personnes | Testeurs majeurs invités (case « J'ai 18 ans ou plus » obligatoire) |
| Base légale | Consentement explicite (conditions du test acceptées, version `test-prive-2026-10-27`) |
| Données | Adresse e-mail de connexion ; Riot ID, identifiant Riot (PUUID), serveur ; parties classées et mesures calculées ; objectifs et résultats ; avis sur un objectif (note, effets, commentaire libre de 1 000 caractères au plus) ; date et version du consentement, personne qui a invité |
| Où | Supabase, région Irlande : `auth.users`, `players`, `matches`, `match_metrics`, `coaching_goals`, `goal_evaluations`, `sync_jobs`, `pilot_testers`, `pilot_feedback` ; fichiers bruts de Riot dans le bucket privé `riot-raw` |
| Qui y accède | Le testeur (ses propres lignes seulement, règles RLS) ; Anthony et Claude Code, avec la clé de service, pour l'exploitation et le bilan du test |
| Destinataires | Aucun. Rien n'est vendu, partagé ni envoyé à une IA |
| Sous-traitants | Supabase (base et stockage, Irlande) ; Cloudflare (Worker qui relaie les demandes à Riot) ; Riot Games (source des données de jeu) |
| Durée | Voir § 3 |
| Sécurité | RLS sur toutes les tables, aucune écriture depuis le navigateur ; clé Riot et clé de service côté serveur seulement ; jeton vérifié par le Worker ; quotas par compte et par adresse IP ; journaux du Worker sans identifiant |

### Traitement 2 : autres joueurs présents dans les parties d'un testeur
| | |
|---|---|
| But | Aucun pour eux : leurs identifiants sont dans les fichiers de partie fournis par Riot |
| Données | PUUID et Riot ID des 9 autres joueurs, dans les fichiers bruts (`riot-raw`) |
| Base légale | Intérêt légitime (on ne peut pas lire une partie sans eux) ; ces données ne sont ni affichées ni utilisées |
| Durée | Celle des parties du testeur. À la suppression d'un testeur, le fichier est effacé, sauf si un autre testeur a joué la même partie : dans ce cas l'identifiant et le Riot ID du joueur parti en sont retirés (`coach/v1/scrub.mjs`) |

### Traitement 3 : notifications
| | |
|---|---|
| But | Prévenir d'un match pro en direct ou rappeler l'objectif du coach |
| Personnes | Tout visiteur qui active les notifications |
| Base légale | Consentement (autorisation donnée dans le navigateur) |
| Données | Adresse technique de notification de l'appareil et ses deux clés, choix (matchs, équipes favorites, rappels, langue), résumé de l'objectif si les rappels sont activés. Ni e-mail ni compte Riot |
| Où | Supabase : `push_subs` |
| Durée | Jusqu'à la désactivation, ou dès que le navigateur révoque l'abonnement |

### Traitement 4 : statistiques de référence
| | |
|---|---|
| But | Calculer des repères par rang et par champion |
| Données | Parties classées publiques, anonymisées à la collecte (joueurs `p1` à `p10`, aucun nom ni identifiant gardé) |
| Où | Cache privé sur le poste d'Anthony ; agrégats dans Supabase (`metric_references`, bucket privé `coach-data`) |
| Remarque | Plus de donnée personnelle après anonymisation. La série par joueur du 06/11 garde un alias, pas de nom |

### Traitement 5 : site public
Aucun compte, aucun traceur, aucune mesure d'audience. Le Riot ID saisi, les favoris et les réglages restent dans le navigateur du visiteur. GitHub Pages et Cloudflare voient l'adresse IP, comme tout hébergeur.

## 3. Durées de conservation
| Donnée | Durée proposée | État aujourd'hui |
|---|---|---|
| Parties, mesures, objectifs, avis d'un testeur | Jusqu'à « Supprimer mes données du coach », sinon jusqu'à la fin du test | Le bouton existe et efface tout de suite |
| Compte de connexion (e-mail) et trace du consentement | Jusqu'à la suppression du compte, sinon fin du test | **Manque : le bouton n'efface pas le compte ni la ligne de consentement** (voir § 5) |
| Toutes les données du test | Effacées à la fin du test : c'est promis dans les conditions | **Manque : aucune date de fin n'est fixée** [date de fin du test à décider] |
| Comptes inactifs, après l'ouverture au public | [12 mois sans connexion], puis suppression | Rien d'automatique |
| Abonnements aux notifications | Jusqu'à désactivation ou révocation | En place |
| Bilan chiffré du test | Sans limite : seulement des chiffres agrégés, sans nom ni identifiant | À calculer avant d'effacer les données du test |
| Journaux Supabase et Cloudflare | Durée par défaut de chaque prestataire | Non vérifiée |

## 4. Droits des personnes
- Effacement : bouton « Supprimer mes données du coach », immédiat et définitif.
- Accès, rectification, opposition, copie des données : par écrit à [adresse de contact], réponse sous un mois.
- Retrait du consentement : quitter le test.
- Réclamation : CNIL (cnil.fr).

## 5. Ce qui manque avant d'inviter les testeurs
1. **Page de confidentialité en ligne fausse pour les testeurs.** `confidentialite.html` (mise à jour le 23/10) dit « Il n'y a ni compte, ni inscription » et « Sur nos serveurs : rien. […] Aucune base de données ». C'est vrai pour un visiteur, faux pour un testeur. Les conditions du test, elles, sont justes, mais elles ne sont visibles qu'au moment de rejoindre. Proposition : ajouter à la page une section « Test privé du coach ».
2. **Le bouton de suppression n'efface pas le compte.** Les conditions disent qu'il « efface tout » : il efface les données de jeu, pas l'adresse e-mail ni la ligne de consentement. Proposition : ajouter « Supprimer mon compte », ou corriger la phrase.
3. **Fin du test.** Les conditions annoncent « environ deux semaines » et « tout est effacé à la fin du test ». Il faut une date de fin, et un script d'effacement qu'Anthony lance (la suppression en masse est bloquée pour Claude). Si le test doit durer plus longtemps pour mesurer une progression, il faut changer le texte, ce qui redemande l'accord de chaque testeur.
4. **Adresse de contact privée**, à la place des tickets GitHub.
5. **Accord de traitement des données de Cloudflare** : à accepter dans le compte Cloudflare, et à vérifier pour l'offre gratuite (`coach/CONFORMITE.md`). Celui de Supabase fait partie de ses conditions d'utilisation.

## 6. Avant l'ouverture au public (plus tard)
- Remplacer la page de confidentialité par `coach/confidentialite-v1.md`, complétée.
- Âge minimum : en France, avant 15 ans, il faut aussi l'accord d'un parent.
- Connexion par Riot Sign-On à la place du Riot ID saisi.
- Suppression automatique des comptes inactifs.
