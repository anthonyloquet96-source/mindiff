# Brouillon : politique de confidentialité du coach V1

À valider par Anthony avant toute mise en ligne. Ce texte remplacera `confidentialite.html` quand le coach V1 sera déployé, pas avant : la page actuelle décrit correctement le site en ligne aujourd'hui (rien n'est stocké sur nos serveurs). Ce n'est pas un avis juridique.

**À compléter avant publication** (entre crochets dans le texte) :
- le nom du responsable du traitement et une adresse de contact dédiée ;
- la durée de conservation des comptes inactifs (je propose 12 mois) ;
- la région du projet Supabase, une fois créé ;
- l'âge minimum de l'ouverture publique (test privé : 18 ans et plus).

---

## Confidentialité et conditions

Dernière mise à jour : [date de mise en ligne].

### Qui est responsable

MINDIFF est un projet indépendant, gratuit, édité par [nom]. Contact : [adresse de contact]. MINDIFF n'est pas soutenu par Riot Games.

### Ce que fait le coach

Le coach lit tes parties classées Solo/Duo grâce à l'API officielle de Riot Games, choisit un seul objectif mesurable (par exemple tes sbires à 10 minutes) et vérifie sur tes 5 parties suivantes si tu progresses. Pour ça, il doit garder tes parties et ton historique d'objectifs d'une visite à l'autre.

### Les données que nous gardons, et pourquoi

| Donnée | Pourquoi | Combien de temps |
|---|---|---|
| Ton compte MINDIFF (adresse e-mail de connexion) | Te reconnaître et protéger tes données | Jusqu'à la suppression du compte |
| Ton compte Riot lié (identifiant Riot « PUUID », Riot ID, serveur) | Aller chercher tes nouvelles parties | Jusqu'à la suppression du compte |
| Tes parties classées (données de jeu fournies par Riot) et les mesures calculées (sbires, morts, vision…) | Choisir ton objectif et mesurer tes progrès sans redemander tout à Riot | Jusqu'à la suppression du compte, ou [12 mois] sans connexion |
| Tes objectifs, leurs résultats et ton avis sur les objectifs | Suivre ta progression et améliorer le coach | Jusqu'à la suppression du compte |

Base légale : l'exécution du service que tu demandes en créant ton compte. Pour le test privé, ton consentement explicite.

Nous ne lisons jamais ton mot de passe Riot, tes achats ni tes messages.

### Ce que nous ne faisons pas

- Pas de vente, pas de partage avec des tiers, pas de publicité, pas de traceur publicitaire ni de mesure d'audience.
- Pas de classement des joueurs ni de paris.
- En partie, uniquement ce que l'écran de chargement montre déjà : jamais d'information cachée par le jeu.
- Pas d'intelligence artificielle sur tes données. Si un tuteur IA est un jour proposé, il sera optionnel, désactivé par défaut, et cette page sera mise à jour avant.

### Les autres joueurs de tes parties

Une partie réunit dix joueurs, et les données de Riot contiennent leurs identifiants. Nous ne les affichons jamais et ne nous en servons pas. Si un autre joueur inscrit sur MINDIFF a joué la même partie, elle est gardée pour lui. Quand tu supprimes ton compte, ton identifiant et ton Riot ID sont retirés de cette partie.

### Où sont les données

- Base de données et stockage : Supabase, région [Europe — à confirmer].
- Service qui relaie les demandes à Riot : Cloudflare Workers.

Ces deux prestataires agissent pour notre compte, dans le cadre de leurs accords de traitement des données.

### Tes droits

Tu peux à tout moment :
- **tout supprimer** depuis ton compte (« Supprimer mon compte »). L'effacement est immédiat et définitif ;
- demander une copie de tes données, en corriger ou t'opposer à un traitement, en écrivant à [adresse de contact] ;
- déposer une réclamation auprès de la CNIL (cnil.fr).

### Âge

[Test privé : réservé aux 18 ans et plus. Ouverture publique : à décider ; en France, avant 15 ans il faut aussi l'accord d'un parent.]

### Conditions d'utilisation

- MINDIFF est gratuit et fourni tel quel. Les conseils viennent de statistiques et de guides de coachs cités : ils peuvent se tromper et ne garantissent aucun résultat.
- Les données de jeu appartiennent à Riot Games et sont utilisées selon les règles de l'API Riot Games.

### In English

MINDIFF is a free, independent League of Legends coach. To track one measurable goal over your next ranked games, it stores your linked Riot account (PUUID, Riot ID, region), your ranked match data from the official Riot Games API, the metrics computed from it, and your goals and feedback. This data is used only for your own coaching. It is never sold or shared, there are no ads or trackers, and no AI processes your data. You can delete everything at any time from your account; matches shared with another registered user are kept for them with your identifiers removed. Data is hosted by Supabase [EU region] and Cloudflare under their data-processing agreements. Contact: [contact address]. You may also complain to your data protection authority.

MINDIFF isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
