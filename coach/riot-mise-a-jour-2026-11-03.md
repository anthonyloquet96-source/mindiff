# Descriptions Riot à mettre à jour (relevé du 03/11/2026)

Le 03/11, Claude a lu les deux pages du portail et les a comparées au code publié.

À coller par Anthony : portail → l'application → « Edit App » → Product Description (1 500 caractères au plus).

**Décision d'Anthony (03/11) :** tout ce que voient les testeurs est recalculé avec la clé personnelle :
- repères par rang ;
- repères par champion ;
- fiches champions ;
- builds ;
- repères Diamant+.

Les données de la clé de développement ne servent plus au produit. On déclare honnêtement ce qui tourne.

## 1. Clé personnelle (App 897844 « MINDIFF Coach - Private test », approuvée)

**Ce qui change par rapport à la page actuelle**
- 50 parties par testeur à l'inscription, au lieu d'environ 30.
- Une mise à jour automatique chaque heure.
- Les parties de référence lues avec cette clé :
  - environ 1 000 parties Master+ le 27/10 ;
  - 1 300 parties Fer à Diamant les 03 et 04/11 (2 300 au total, vérifié dans le cache le 04/11).

  Seuls des agrégats sont montrés.

**Texte proposé**

```
Private test of the MINDIFF coach (our public application is App 895430, pending review). Not available to the public.

Who: 5-10 invited adult volunteers (friends of the developer), each linking their own Riot ID with their consent, for about two weeks.

What: post-game coaching on ranked Solo/Duo. We read each tester's matches (ACCOUNT-V1, LEAGUE-V4, MATCH-V5 with timelines). A deterministic engine picks one measurable goal (e.g. CS at 10 min) from 15-20 past matches and evaluates it on the next 5 ranked matches. Testers rate the goal and report unwanted effects. In game we only show what the loading screen shows (SPECTATOR-V5). No MMR or ranking, no betting.

Reference data: with this key we read about 2,300 public EUW ranked matches (Iron to Challenger, one-off collections on Oct 27 and Nov 3-4) to compute per-rank and per-champion percentiles, builds and champion stats. Testers only see these aggregates; no other player is identified. Anonymized raw matches stay in a private offline cache.

Data: API key server-side only (Cloudflare Worker). Tester data is stored only for their own coaching (EU database, row-level security), never shared, deleted on account deletion or at the end of the test.

Volume: up to 50 matches per tester at sign-up, then an hourly check of one tester at a time (max 3 new matches).
```

## 2. Clé de production (App 895430 « MINDIFF », Pending Review)

**Ce qui change par rapport à la page actuelle**
- Les limites réelles, au lieu de « 30 requests per 5 min per user ».
- La mise à jour en arrière-plan.
- Les repères agrégés.
- On dit que le coach est déjà en test privé avec la clé personnelle, ce qui montre un produit qui marche.

**Texte complet à coller** (1 427 caractères ; un simple ajout de lignes dépassait 1 500) :

```
MINDIFF is a free French-language League of Legends companion web app: esports, patch and meta info, news, and a personal coach.

COACH (after the game, one goal at a time)
- The player enters their Riot ID; we read their ranked Solo/Duo matches (ACCOUNT-V1, LEAGUE-V4, MATCH-V5 with timelines).
- Factual match review (deaths, backs, gold/CS/XP vs lane opponent at 10/15 min) and a minimap replay.
- From 15-20 past matches, a deterministic engine picks ONE goal (e.g. CS at 10 min) and evaluates it on the next 5 ranked games, with safeguards against passive play.
- Sourced practice tips; players rate them and report side effects.
- In game (SPECTATOR-V5): only what the loading screen shows. No real-time advice, no hidden info, other players' Riot IDs never shown.
- No MMR, no betting, no automation.

DATA
- API key server-side only (Cloudflare Worker); cached; per-user daily limits, per-IP limit, Riot rate limits respected. Players with an active goal are refreshed hourly (max 3 new matches).
- Targets and champion pages use aggregated percentiles from public ranked matches; no other player identified.
- Player data used only for their own coaching; never sold or shared; deletable anytime. No data sent to AI services.
- Privacy: https://anthonyloquet96-source.github.io/mindiff/confidentialite.html

Currently in a closed test with 5-10 invited adults under our personal key (App 897844) before public launch.
```
