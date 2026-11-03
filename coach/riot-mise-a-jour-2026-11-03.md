# Descriptions Riot à mettre à jour (relevé du 03/11/2026)

Claude a lu les deux pages du portail le 03/11 et les a comparées au code publié.

À coller par Anthony : portail → l'application → « Edit App » → Product Description (1 500 caractères au plus).

## 1. Clé personnelle (App 897844 « MINDIFF Coach - Private test », approuvée)

**Écarts avec la réalité**
- La page annonce « about 30 matches » par testeur à l'inscription. Depuis le 03/11, c'est 50.
- La mise à jour automatique de chaque heure n'est pas mentionnée.
- La collecte du 27/10 n'est pas mentionnée : environ 1 000 parties Master+ de joueurs qui ne sont pas testeurs (2 570 requêtes), pour calculer les repères par rang. Or la page dit qu'on ne lit que les parties des testeurs. Les parties brutes sont toujours dans un cache local privé (`coach/cache/timelines-perso`, 1 000 fichiers).

**Texte proposé** (environ 1 450 caractères)

```
Private test of the MINDIFF coach (our public application is App 895430, pending review). Not available to the public.

Who: 5-10 invited adult volunteers (friends of the developer), each linking their own Riot ID with their consent, for about two weeks.

What: post-game coaching on ranked Solo/Duo. We read each tester's matches (ACCOUNT-V1, LEAGUE-V4, MATCH-V5 with timelines). A deterministic engine picks one measurable goal (e.g. CS at 10 min) from 15-20 past matches and evaluates it on the next 5 ranked matches. Testers rate the goal and report unwanted effects. In game we only show what the loading screen shows (SPECTATOR-V5). No MMR or ranking, no betting.

Reference data: once (Oct 27) we read about 1,000 public Master+ ranked matches to compute per-role, per-rank percentiles used as targets. Testers only see these aggregates; no other player's identity is shown. Raw matches stay in a private offline cache.

Data: API key server-side only (Cloudflare Worker). Tester data is stored only for their own coaching (EU database, row-level security), never shared, deleted on account deletion or at the end of the test.

Volume: up to 50 matches with timelines per tester at sign-up, then an hourly check of one tester at a time (max 3 new matches): well within personal key limits.
```

## 2. Clé de production (App 895430 « MINDIFF », Pending Review)

**Écarts avec la réalité**
- La page annonce « 30 requests per 5 min per user ». Le code fait autre chose :
  - 20 mises à jour par jour et par utilisateur ;
  - 30 recherches de Riot ID par jour ;
  - 120 requêtes toutes les 5 minutes par adresse IP ;
  - respect des limites renvoyées par Riot.
- La mise à jour automatique de chaque heure n'est pas mentionnée.
- Les repères par rang (statistiques agrégées) ne sont pas mentionnés.

**Lignes à remplacer**

À la place de `- API key server-side only (Cloudflare Worker); cached, 30 requests per 5 min per user.` :
```
- API key server-side only (Cloudflare Worker); responses cached; per-user limits (20 updates and 30 Riot ID lookups per day), per-IP limit, and Riot rate-limit headers respected. Players with an active goal are refreshed in the background, one per hour, max 3 new matches.
- Rank targets come from aggregated percentiles of public high-elo ranked matches; no other player's identity is shown.
```

Si la description dépasse 1 500 caractères, raccourcir la ligne « Practice tips… ».
