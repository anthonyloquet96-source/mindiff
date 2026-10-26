# Brouillon : demande de clarification à Riot Games (Developer Relations)

À relire et envoyer par Anthony, depuis son compte développeur (portail developer.riotgames.com). Rien n'a été envoyé.

---

**Objet : Use of aggregated match data collected with a development key — MINDIFF**

Hello,

I am building MINDIFF, a League of Legends coaching tool (post-game, ranked Solo/Duo). Before applying for a personal and then a production key, I would like to clarify how we may use data collected so far with a development key.

**What we collected with the development key (EUW only):**
- 48,549 Diamond+ ranked matches (patches 16.19–16.21): end-of-game statistics per player, stored without PUUID, Riot ID or match ID.
- 9,826 Diamond+ ranked match timelines: participants replaced by aliases (p1–p10), match ID removed.
- Ranked match statistics for 90 players (Iron to Challenger), keyed by a truncated hash of the PUUID, no Riot ID, for testing our goal engine.

None of this data has been published. Collection stopped on October 26, 2026.

**What we would like to do:**
- Use only aggregated percentiles by role (for example the median CS at 10 minutes of Diamond+ mid laners) as reference values shown to players.
- Run a private test with 5 to 10 volunteers who link their own account.

**Our questions:**
1. May we keep and use these anonymized aggregates in the product, or must they be rebuilt with a personal or production key?
2. For the private test with 5 to 10 volunteers, is a personal API key the right key type?
3. Is there a retention limit for raw match data and timelines stored for recomputation?
4. Is Riot Sign-On required before a player can link their account in a private test, or only for a public product?

Thank you,
Anthony — MINDIFF
