# Demande de clé personnelle Riot (test privé du coach V1)

À déposer par Anthony : portail développeur → « Register Product » → **Personal API Key**. Les champs sont les mêmes que pour la clé de production, et la description est limitée à 1 500 caractères (celle-ci en fait environ 1 200).

Pourquoi une clé personnelle : elle est faite « for products that are intended for just the developer or a small private community », n'expire pas toutes les 24 heures et ne demande pas d'examen préalable. La clé de développement expire chaque jour et ne doit pas servir à d'autres personnes que le développeur. La demande de production (895430) reste en attente pour l'ouverture publique.

---

**Product Name :** MINDIFF Coach — private test

**Product URL :** https://anthonyloquet96-source.github.io/mindiff/

**Product Description :**

```
Private test of the MINDIFF coach (our public application is App 895430, pending review). Not available to the public.

Who: 5-10 invited adult volunteers (friends of the developer), each linking their own Riot ID with their consent, for about two weeks.

What: post-game coaching on ranked Solo/Duo. We read each tester's matches (ACCOUNT-V1, LEAGUE-V4, MATCH-V5 with timelines). A deterministic engine picks one measurable goal (e.g. CS at 10 minutes) from 15-20 past matches and evaluates it on the next 5 ranked matches. Testers rate the goal and report unwanted effects (e.g. playing more passively). No in-game assistance, no MMR or ranking, no betting.

Data: the API key stays server-side (Cloudflare Worker). Each tester's match data is stored only for their own coaching (Supabase, EU region, row-level security), never shared, and deleted when they delete their account or when the test ends. Test reports are pseudonymized.

Volume: about 30 matches and timelines per tester at sign-up, then a few per day: well within personal key limits.
```
