# Nouvelle description de l'application Riot MINDIFF (App ID 895430, « Pending Review »)

À coller dans « Edit App → Product Description » après validation d'Anthony. Le nom et l'URL ne changent pas.

Pourquoi la changer : la description actuelle dit « We do not store players' data on our servers », ce qui sera faux avec le coach V1. Elle ne parle pas des objectifs évalués, des garde-fous, des conseils sourcés ni de la suppression de compte. La nouvelle version dit pourquoi on garde les parties (le coaching du joueur, rien de commercial) et que le joueur peut tout supprimer. Les données de la clé DEV passent par le ticket de support, pas par la description. En revanche, elle reste juste sur la partie en cours (spectator-v5), qui est en ligne : on la garde, en précisant qu'elle n'affiche que ce que l'écran de chargement montre déjà.

---

MINDIFF is a French-language companion web app for League of Legends players: esports results, patch and meta information, news, and a personal coach. It is free to use.

COACH: one measurable goal at a time, after the game
- The player enters their Riot ID. We read their recent ranked Solo/Duo matches (ACCOUNT-V1, LEAGUE-V4, MATCH-V5 including timelines).
- Factual match review: deaths and what followed (e.g. enemy dragon 40 seconds later), back timings and items, gold/CS/XP difference with the lane opponent at 10 and 15 minutes, turret plates. A minimap replay rebuilt from the timeline shows the key moments.
- From 15-20 past matches, a deterministic engine picks ONE goal (e.g. CS at 10 minutes) with a personal target, then evaluates it on the player's next 5 ranked matches: achieved, improving, stable or needs review. Safeguards prevent counterproductive play: a goal is not validated if the player's farm or experience drops sharply (e.g. avoiding fights just to die less).
- Each goal comes with practice tips from coaching guides and videos; every tip links to its source and we do not republish the videos. Players can rate the goal's relevance and report unwanted effects.
- Diamond+ reference values per role are shown for comparison.
- In game (SPECTATOR-V5), we only show what the loading screen already shows: the lane opponent's champion, matchup tips and the player's own goal. Roles are estimated and flagged when uncertain. No real-time advice, no hidden information, other players' Riot IDs are never displayed.
- No alternative MMR or ranking, no betting, no automation.

DATA AND SECURITY
- The API key stays server-side (Cloudflare Worker), never in the browser. Responses are cached and limited per user (currently 30 requests per 5 minutes).
- We store each player's ranked match data only to run their own coaching (goals and progress). It is never sold, shared or used for advertising.
- Data is pseudonymized and protected so that each player sees only their own data. Players can delete everything at any time from their account.
- An optional AI tutor exists but is disabled. No player data is sent to any AI service.
- Privacy policy: https://anthonyloquet96-source.github.io/mindiff/confidentialite.html

NEXT STEP
Before opening the new coaching version to everyone, we plan a closed test with 5-10 invited adult volunteers. We would welcome guidance on whether this production application covers that test or whether a personal key is preferred.
