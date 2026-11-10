# Texte Riot de la clé personnelle à mettre à jour (10/11/2026)

**En attente de l'accord d'Anthony.** À coller par Anthony ou, avec son accord, par Claude : portail → App 897844 « MINDIFF Coach - Private test » → « Edit App » → Product Description (1 500 caractères au plus). Ce texte remplace celui du 03/11 (`coach/riot-mise-a-jour-2026-11-03.md`, section 1). Le texte de la clé de production (App 895430) ne change pas.

## Pourquoi
Le texte en ligne annonce « about 8,000 public EUW ranked matches … one-off collections between Oct 27 and Nov 5 ». Depuis :
- **06/11** : série Top et ADC, 2 400 parties (80 joueurs, 30 ranked chacun), pour mesurer hors ligne quels objectifs sont fiables. Rien n'en est montré aux testeurs.
- **10/11** : 3 500 parties Diamant+ du patch 26.22, pour recalculer les builds et les fiches champions.

Total vérifié le 10/11 : 11 500 parties dans `coach/cache/timelines-perso`, plus 2 400 dans `coach/cache/battery-perso`, soit environ 13 900.

## Ce qui change dans le texte
- « about 8,000 » devient « about 14,000 ».
- « between Oct 27 and Nov 5 » devient « between Oct 27 and Nov 10, repeated after a new patch » : la collecte sera refaite à chaque patch, autant le dire.
- Ajout de « and to check offline which goals are reliable » (la série du 06/11).

## Texte proposé (1405 caractères)

```
Private test of the MINDIFF coach (our public application is App 895430, pending review). Not available to the public.

Who: 5-10 invited adult volunteers (friends of the developer), each linking their own Riot ID with their consent, for about two weeks.

What: post-game coaching on ranked Solo/Duo. We read each tester's matches (ACCOUNT-V1, LEAGUE-V4, MATCH-V5 with timelines). A deterministic engine picks one measurable goal (e.g. CS at 10 min) from 15-20 past matches and evaluates it on the next 5 ranked matches. Testers rate the goal and report unwanted effects. In game we only show what the loading screen shows (SPECTATOR-V5). No MMR or ranking, no betting.

Reference data: with this key we read about 14,000 public EUW ranked matches (Iron to Challenger, one-off collections between Oct 27 and Nov 10, repeated after a new patch) to compute per-rank and per-champion percentiles, builds and champion stats, and to check offline which goals are reliable. Testers only see aggregates; no other player is identified. Anonymized raw matches stay in a private offline cache.

Data: API key server-side only (Cloudflare Worker). Tester data is stored only for their own coaching (EU database, row-level security), never shared, deleted on account deletion or at the end of the test.

Volume: up to 50 matches per tester at sign-up, then an hourly check of one tester at a time (max 3 new matches).
```

## À vérifier par Anthony avant de coller
- « for about two weeks » : à ajuster si la date de fin du test est différente (voir `docs/RGPD.md` § 5).
