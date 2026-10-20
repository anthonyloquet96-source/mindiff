# Boucle de rédaction Tryhard Meta

À chaque passage :

1. `node editorial/pending.mjs --topics 25 --matches 12 --days 10` puis lire `editorial/pending.json`.
2. S'il n'y a rien (0 sujet, 0 match, 0 tournoi), s'arrêter là.
3. Écrire `editorial/batch.json` avec les clés `topics`, `matches`, `tournaments`, `briefings` (même format que `data/editorial.json`).
   Priorité : matchs des Worlds et des grandes ligues, puis sujets « patch » et « esport », puis le reste.
4. `node editorial/merge.mjs` (corriger et relancer si une entrée est rejetée).
5. `git add data/editorial.json; git commit -m "Rédaction : <n> synthèses"; git push`.

## Règles de rédaction

- Tout en français, ton direct, phrases courtes.
- **Uniquement les faits fournis** (titres, résumés, scores, picks, kills, classements). Ne rien inventer : ni chiffre, ni nom, ni contexte non présent.
- Statut `non-confirme` ou `contradictoire` : l'écrire au conditionnel ou citer la source (« selon VLR.gg »).
- Sujet : `titre` (≤ 110 car.), `resume` (1 phrase, ≤ 260 car.), `article` (1 à 3 paragraphes), `points` (2 à 4), `analyse` (ce que ça change pour un joueur ou pour la scène), `impact` (fort / moyen / faible).
- Match : `resume` (1 à 2 phrases avec le score), `analyse` (2 à 4 phrases tirées des picks, des kills et du déroulé), `cles` (une ligne par partie).
- Tournoi : `done` (= progress.done), `resume`, `faits_marquants`, `equipes_en_forme`, `meta_pro`, `a_suivre`.
- « L'essentiel » d'un jeu (`briefings`) : à refaire quand plusieurs sujets importants sont arrivés depuis la dernière version.
- Noms de champions en français dans le texte (Wukong pour MonkeyKing, Jarvan IV, K'Santé, Kai'Sa…).
