# Coach V1 : IA, données personnelles et données Riot

Audit du 26/10/2026, branche `coach-v1`. Chaque point renvoie au texte consulté ce jour-là. Ce document n'est pas un avis juridique.

## 1. IA (Gemini)

**État du projet**
- Le projet MINDIFF utilise l'offre gratuite de l'API Gemini (« Unpaid Services ») avec la clé `GEMINI_API_KEY`.
- Le tuteur est désactivé par défaut (`coach/config.json`, `tutor.llm = "off"`, `personalData = false`, voir le test « Mode sans LLM »).
- Toute la V1 fonctionne sans IA : objectif, cible, évaluation et conseils sourcés sont calculés de façon déterministe.

**Ce que disent les conditions** ([Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms), mises à jour le 28/04/2026)

| Sujet | Texte (en anglais) | Conséquence pour MINDIFF |
|---|---|---|
| Utilisateurs européens | « You may use only Paid Services when making API Clients available to users in the European Economic Area », même règle pour la Suisse et le Royaume-Uni | Le tuteur ne peut pas être ouvert à des joueurs européens sur l'offre gratuite |
| Données de l'offre gratuite | « Google uses the content you submit to the Services and any generated responses to provide, improve »… ; « human reviewers may read, annotate, and process your API input and output » ; « Do not submit sensitive, confidential, or personal information to the Unpaid Services » | Aucune donnée de joueur (parties, objectifs, identifiants) ne part vers l'offre gratuite |
| Offre payante | Google n'utilise pas les requêtes pour améliorer ses produits, mais « logs prompts and responses for a limited period of time » | Seule voie possible pour un tuteur, avec durée de conservation à documenter |
| Âge | « You must be 18 years of age or older to use the APIs » ; pas d'usage dans un service « likely to be accessed by individuals under the age of 18 » | Un tuteur IA impose de réserver la fonction aux joueurs majeurs ou de vérifier ce point avec Google avant ouverture |

**Veille vidéo.** Elle envoie à Gemini des vidéos YouTube publiques de créateurs, jamais de données de joueurs MINDIFF. Elle tourne sur l'offre gratuite. Les conditions demandent l'offre payante quand on met un client d'API « à disposition d'utilisateurs » européens : la veille est un traitement interne dont le résultat (conseils sourcés) est publié. À faire confirmer avant l'ouverture publique.

**Décision à prendre (Anthony) :** offre payante Gemini avec DPA si le tuteur doit exister, sinon V1 sans tuteur.

## 2. Données personnelles (RGPD)

| Donnée | Où | Base, durée |
|---|---|---|
| Compte MINDIFF (e-mail) | Supabase Auth | Exécution du service ; jusqu'à suppression du compte |
| Joueur (PUUID, Riot ID, plateforme) | `players` | Idem ; suppression en cascade de tout le reste |
| Parties, métriques, objectifs, évaluations | `matches`, `match_metrics`, `coaching_goals`, `goal_evaluations` | Idem ; JSON Riot bruts dans le bucket privé `riot-raw`, supprimés avec le joueur dès qu'aucun autre joueur inscrit ne figure dans la partie (testé) |
| Testeurs et retours | `pilot_testers`, `pilot_feedback` | Consentement ; fin du test privé puis suppression |
| Agrégats Diamant+ | caches privés `coach/cache/` | Aucune donnée nominative (voir § 3) |

**Sous-traitants et DPA**
- **Supabase** : le [DPA](https://supabase.com/legal/dpa) (version du 01/08/2026) fait partie des conditions d'utilisation ; son acceptation vaut signature des clauses contractuelles types. Projet à créer en région Europe.
- **Cloudflare** : le [DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) (version 6.4) s'applique « from the date on which Customer signed or the parties otherwise agreed ». À accepter explicitement, et à vérifier pour l'offre gratuite.
- **Google (Gemini)** : seulement si le tuteur est activé, et sur l'offre payante.

**Âge**
- France : en dessous de 15 ans, le consentement doit être donné avec celui d'un parent (article 45 de la loi Informatique et Libertés, [CNIL, recommandation 4](https://www.cnil.fr/fr/recommandation-4-rechercher-le-consentement-dun-parent-pour-les-mineurs-de-moins-de-15-ans)).
- Test privé : `pilot_testers.age_confirmed` est obligatoire. Je propose de réserver le test aux 18 ans et plus, ce qui couvre aussi la règle Gemini si un tuteur arrive plus tard.

**À faire avant l'ouverture publique**
- Politique de confidentialité et mentions d'information.
- Durée de conservation des comptes inactifs.
- Registre des traitements.

## 3. Données Riot

**Ce que disent les règles** ([portail développeur](https://developer.riotgames.com/docs/portal), [règles générales](https://developer.riotgames.com/policies/general))
- Clé de développement : « for you to tinker with the Riot Games API », pour des produits « not meant for public consumption », désactivée toutes les 24 heures.
- Clé personnelle : « for products that are intended for just the developer or a small private community » ; « You may not run your application for public consumption using a personal key ». C'est le bon cadre pour le test privé de 5 à 10 volontaires.
- Clé de production : pour un produit ouvert aux joueurs ; elle demande en général un prototype fonctionnel.
- Règles générales : « Products cannot de-anonymize players who cannot reasonably be identified from visible information ». La page consultée ne dit rien sur la conservation ou l'agrégation des données.

**Gel.** La collecte de repères avec la clé DEV est arrêtée depuis le 26/10/2026 (environ 08:30). Aucun nouvel appel à Riot n'est fait pour les repères ni pour la batterie ; le rejeu utilise uniquement le cache.

**Agrégats existants (caches privés, jamais publiés : `riot.publish = false`)**

| Jeu | Contenu | Identifiants |
|---|---|---|
| `coach/cache/riot-sample.json` | 48 549 parties Diamant+ EUW (patchs 16.19 à 16.21), résumé de fin de partie par joueur | Aucun (ni PUUID ni Riot ID) |
| `coach/cache/timelines/` | 9 826 parties Diamant+ EUW minute par minute | Anonymisées (alias p1 à p10, identifiant de partie supprimé, fichier nommé par empreinte) |
| `coach/cache/metric-references.json` | Centiles par poste et par métrique | Agrégats seulement |
| `coach/cache/styles.json`, `champstats.json`, `matchups.json` | Plans de jeu et stats par champion | Agrégats seulement |
| `coach/cache/battery*/` | Mesures partie par partie de 90 joueurs Fer → Challenger | Joueur identifié par une empreinte tronquée du PUUID, aucun Riot ID |

Brouillon de demande de clarification : `coach/riot-demande.md`.
