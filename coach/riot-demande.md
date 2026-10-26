# Demande de clarification à Riot Games (Developer Relations)

À relire et envoyer par Anthony, depuis son compte développeur (portail developer.riotgames.com). Rien n'a été envoyé.

Version du 26/10/2026, refaite après un échange avec ChatGPT et une vérification des caches :
- la demande présente d'abord le produit, puis l'intégrité compétitive, la sécurité et les données personnelles, puis la collecte avec la clé DEV, puis les questions ;
- elle distingue ce qui est fait de ce qui reste à faire, sans parler d'« anonymisation complète » ni de « conformité RGPD » ;
- elle déclare aussi le banc d'essai (`coach/cache/bench-raw/`, 1 600 parties brutes avec timelines, 160 par rang). Ces fichiers contiennent encore les PUUID et les identifiants de partie, mais pas les Riot ID. Le fichier `riot-seen.json` garde aussi 326 identifiants de partie ;
- une demande de clé de production viendra séparément, avec une démonstration vidéo du parcours coach (même sur données fictives) et les documents juridiques finalisés.

**Avant l'envoi :** si Anthony valide la pseudonymisation du banc d'essai (PUUID remplacés par des alias, identifiants de partie retirés), remplacer la puce « 1,600 raw matches… » par la variante entre crochets.

---

**Subject: MINDIFF — product overview, API access and data collected with a development key**

Hello Riot Developer Relations team,

I am developing MINDIFF (https://anthonyloquet96-source.github.io/mindiff), a League of Legends companion app focused on personalized post-game coaching. The coaching feature is implemented on a development branch and has not been released. Before any external test or production application, I would like your guidance on the right API access and on data collected so far with a development key.

**1. Product overview**

MINDIFF helps ranked players improve through one measurable training objective at a time, rather than by displaying more statistics:
- It retrieves the player's ranked Solo/Duo matches and timelines through Match-V5.
- It analyzes 15–20 past matches and selects one objective with a deterministic engine (for example, CS at 10 minutes), with a personal target.
- It evaluates the objective over the player's next five ranked matches: achieved, improving, stable, or needs review.
- Safeguards prevent counterproductive behavior; for example, a goal is not validated if the player's farm or experience drops sharply.
- Each objective comes with practice tips from a knowledge base of coaching guides and videos. Every tip shows its source, and we do not republish the videos.
- Players can rate how relevant their objective was and report unwanted effects.

MINDIFF also covers esports schedules and results, patch and meta information, and League of Legends news. These parts are unchanged by the coaching work.

**2. Competitive integrity**

MINDIFF is strictly post-game. It gives no in-game assistance and does not calculate an alternative MMR or ranking. It has no betting features and automates nothing. An optional AI tutor exists but is disabled by default. No player data is sent to a free-tier AI service. Any future activation would follow a data-processing review.

**3. Security and privacy**

Implemented:
- The Riot API key is used only server-side, behind an authenticated proxy (Cloudflare Workers) with per-user quotas and handling of Riot rate limits (429 / Retry-After).
- Database row-level security, so each user sees only their own data.
- Account deletion removes the player's profile, metrics, objectives and feedback.
- Testing reports are pseudonymized.

Not yet completed:
- A raw match record shared with another registered user is kept until no registered participant remains. That record still contains the departed player's identifiers as part of the Match-V5 payload, and we are reviewing whether to strip them.
- Before any public launch, we will finalize a privacy policy, data-processing agreements with our hosting providers and a retention policy.

**4. Data collected with a development key (EUW, internal development only)**

- 48,549 Diamond+ ranked matches (patches 16.19–16.21), de-duplicated: end-of-game statistics per player, stored without PUUID, Riot ID or match ID.
- 9,826 Diamond+ timelines, with participants replaced by aliases (p1–p10) and match IDs removed.
- 1,600 raw matches with timelines (160 per tier, Iron to Challenger), used as a test bench for the coaching rules. They contain PUUIDs and match IDs, but no Riot ID. [Variant if pseudonymized first: "…with PUUIDs replaced by aliases and match IDs removed."]
- Ranked match statistics for 90 players (Iron to Challenger), keyed by a truncated hash of the PUUID, with no Riot ID, to test the goal engine.

This data was used to test the coaching engine and to compute role-based reference percentiles. It has never been published or shared. Collection stopped on October 26, 2026. We understand that development keys are meant for prototyping. We will not use any of this data in a public release without your clarification, and we will delete it if you ask us to.

**5. Our questions**

1. **Historical data:** May we keep and use only the aggregated role-based percentiles derived from this data? Or should they be rebuilt under a personal or production key? Should any of the stored data be deleted?
2. **Private test:** We plan a closed test with 5–10 invited adult volunteers who link their own Riot ID. Is a personal API key appropriate for this, or should we apply for production first?
3. **Retention:** Are there Riot requirements on how long raw match data, timelines and derived metrics may be stored?
4. **Riot Sign-On:** For this private test, may players simply enter their Riot ID, given that RSO requires an approved production application?
5. **Next step:** Would you recommend a personal-key registration for the closed test, followed by a production application with a demo, or going directly to production review?

Thank you for your time and guidance.

Anthony — MINDIFF
