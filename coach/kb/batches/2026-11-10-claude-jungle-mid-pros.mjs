// Analyse par Claude Code (session du 10/11/2026) : farm et décisions du jungler, farm et roams du mid.
// Trois articles Dignitas où un joueur professionnel est interrogé par Teatones : eXyu (jungler de LCS, 2024),
// Akaadian (jungler, 2021) et Blue (midlaner, 2022). But : combler les objectifs les moins couverts par la base
// (farm du jungler : 3 conseils exploitables le 10/11). Règles v1.4, instructions v2.
// Passages copiés tels quels depuis le texte réellement consulté (coach/cache/text, non republié).
// Seuls des principes sont gardés : rien qui dépende d'un chiffre, d'un horaire ou d'un camp précis de la saison de l'article.
const u = (content, n, x) => ({
  id: `u-cl-${content.replace(/^c-/, "")}-${n}`,
  patch: { known: false }, metaDependent: false, conditions: [], limits: [], mentions: [], champions: [],
  nature: "opinion", levelContext: "pro", usage: "reference",
  ...x,
  evidence: x.evidence.map(([locator, passage]) => ({ content, locator, lang: "en", passage })),
});
const X = "c-dignitas-jungler-mistakes-exyu", A = "c-dignitas-jungle-routes-akaadian", B = "c-dignitas-mid-tips-blue";
const exyu = { context: { queue: "solo", rank: "pro (jungler de LCS)", region: "NA" }, roles: ["jungle"], published: "2024-05-11" };
const akaadian = { context: { queue: "solo", rank: "pro (jungler)", region: "NA" }, roles: ["jungle"], published: "2021-09-22" };
const blue = { context: { queue: "solo", rank: "pro (midlaner)", region: "NA" }, roles: ["mid"], published: "2022-02-20" };

export const contents = [
  { id: X, url: "https://dignitas.gg/articles/identifying-and-fixing-jungler-mistakes-with-dig-exyu", title: "Identifying and Fixing Jungler Mistakes with DIG eXyu", author: "Teatones (Dignitas), avec eXyu", published: "2024-05-11",
    learn: "Cinq erreurs de jungler selon eXyu : mal faire ses camps, trop ganker, se montrer sur la carte, ganker une lane perdue." },
  { id: A, url: "https://dignitas.gg/articles/an-overview-of-jungle-routes-and-tips-with-akaadian-for-league-of-legends", title: "An Overview of Jungle Routes and Tips with Akaadian for League of Legends", author: "Teatones (Dignitas), avec Akaadian", published: "2021-09-22",
    learn: "Choisir sa première route selon son champion ; punir les erreurs même quand on farme. Les routes détaillées datent de 2021 et ne sont pas reprises." },
  { id: B, url: "https://dignitas.gg/articles/fundamental-mid-lane-tips-with-blue", title: "Fundamental Mid Lane Tips for League of Legends by Dignitas Blue", author: "Teatones (Dignitas), avec Blue", published: "2022-02-20",
    learn: "Le farm d'abord, regarder la minimap après chaque sbire, partir en roam après avoir poussé et en tirer quelque chose." },
];

export const units = [
  // ---------- eXyu (jungler de LCS), propos recueillis par Teatones, Dignitas, 2024
  u(X, 1, { ...exyu, themes: ["jungle", "methode"],
    claim: "Selon eXyu (jungler de LCS) : l'erreur numéro un des junglers de bas elo est de ne pas savoir bien faire leurs camps : ils sont plus lents et ratent des occasions, faute d'être au bon endroit au bon moment. C'est aussi l'erreur la plus facile à corriger, en y passant du temps.",
    evidence: [["Mistake #1 - Poor Clearing", "The number one thing I see from lower ELO Junglers is that they simply do not know how to clear their camps well."], ["Mistake #1 - Poor Clearing", "lower level Junglers miss the opportunities that better Junglers are in position for because they simply aren’t at the right place at the right time due to their poor pathing and clearing. This, thankfully, is the easiest thing to fix with time investment."]],
    use: { when: "Ton farm de jungler est en dessous de ta cible.", why: "Les secondes perdues sur chaque camp s'additionnent : tu arrives trop tard là où il fallait être.", who: "Junglers.", how: ["Travaille d'abord ton clear, avant tes ganks.", "Compare ton temps de clear d'une partie à l'autre."], notWhen: "" } }),
  u(X, 2, { ...exyu, themes: ["jungle", "methode"], levelContext: "non-precise",
    claim: "Selon Teatones (Dignitas, article avec eXyu) : pour corriger un clear trop lent, entraîne-toi dans l'outil d'entraînement : savoir à quelle vitesse ton champion fait ses camps te permet de prévoir ton chemin dans la jungle.",
    evidence: [["Mistake #1 - Poor Clearing", "So, how do we fix clearing issues? The Practice Tool, of course!"], ["Mistake #1 - Poor Clearing", "Being able to rely on yourself and your knowledge of your Champion’s damage is huge at laying out a game plan for how you’ll be working your way through the Jungle."]],
    use: { when: "Entre deux parties, quand tu veux améliorer ton farm de jungler.", why: "Tu connais les dégâts de ton champion et tu peux prévoir ton chemin.", who: "Junglers.", how: ["Ouvre l'outil d'entraînement avec ton champion.", "Refais tes camps jusqu'à connaître ta vitesse de clear."], notWhen: "" } }),
  u(X, 3, { ...exyu, themes: ["jungle", "macro"],
    claim: "Selon eXyu (jungler de LCS) : le premier travail du jungler est le contrôle de la carte, pas le gank. Gank quand c'est le bon moment, et n'abandonne pas tes camps et des objectifs gratuits pour un kill ou un Flash.",
    evidence: [["Mistake #2 - Focusing Too Much on Ganking", "Their job is to gank but when it’s correct to do so. Your primary job as a Jungler is Map Control, not Ganking."], ["Mistake #2 - Focusing Too Much on Ganking", "you’ll see some lower ELO players really play hard for a gank, forsaking their camps and free objectives for a kill or Flash."]],
    use: { when: "Début de partie, quand tu hésites entre attendre un gank et continuer tes camps.", why: "En jouant tout pour un gank, tu laisses des camps et des objectifs gratuits.", who: "Junglers.", how: ["Demande-toi si le gank est vraiment le bon choix maintenant.", "Sinon, continue tes camps.", "Pense à toi comme à une pression sur la carte plutôt que comme à un ganker."], notWhen: "" } }),
  u(X, 4, { ...exyu, themes: ["jungle", "macro"], levelContext: "non-precise",
    claim: "Selon Teatones (Dignitas, article avec eXyu) : avant de choisir ton chemin, regarde tes matchups : gank en priorité les lanes qui gagneront gros avec ton aide, ou qui t'aideront quand tu arrives. Sinon, fais tes camps, prends ce que les erreurs adverses te donnent et sois en position pour les objectifs neutres.",
    evidence: [["Mistake #2 - Focusing Too Much on Ganking", "Consider your matchups and who’s likely to win hard if you influence them, or who’s likely to enable you if you show up. Put emphasis on those lanes for ganks."], ["Mistake #2 - Focusing Too Much on Ganking", "Otherwise, you should be simply looking to clear your camps, take what’s given to you in enemy mistakes, and be in position to contest neutral objectives"]],
    use: { when: "Avant de commencer ton chemin dans la jungle.", why: "Un gank sur une lane qui ne peut pas t'aider te coûte du temps pour peu de résultat.", who: "Junglers.", how: ["Regarde tes trois lanes et leurs matchups.", "Repère celle qui gagnera gros avec ton aide, ou qui a de quoi préparer ton gank.", "Si aucune ne s'y prête, fais tes camps."], notWhen: "" } }),
  // Pas de thème « vision » : le conseil parle de ne pas se montrer, pas de poser des wards (objectif « score de vision »)
  u(X, 5, { ...exyu, themes: ["jungle", "macro"],
    claim: "Selon eXyu (jungler de LCS) : erreur très fréquente en bas elo : le jungler se montre sans raison, sur une vague en traversant la carte ou en passant sur une zone signalée comme wardée. Profite du fait que l'adversaire ne sait pas où tu es.",
    evidence: [["Mistake #4 - Showing Randomly on the Map", "A Jungler will randomly show on the wave as they’re crossing from one side of the map to the other. Or they’ll walk out into vision randomly, or cross over an area that’s been pinged warded."], ["Mistake #4 - Showing Randomly on the Map", "you need to always be thinking about how you can take advantage of the fact that the enemy doesn’t know where you are."]],
    use: { when: "Quand tu traverses la carte d'un côté à l'autre.", why: "Tant que l'adversaire ne te voit pas, il doit jouer comme si tu pouvais être près de sa lane.", who: "Junglers.", how: ["Ne passe pas dans une vague visible en changeant de côté.", "Évite les zones que tes alliés ont signalées comme wardées.", "Demande-toi où sont les wards adverses avant de choisir ton passage."], notWhen: "" } }),
  u(X, 6, { ...exyu, themes: ["jungle", "macro"], levelContext: "non-precise",
    claim: "Selon Teatones (Dignitas, article avec eXyu) : ganker une lane qui perd tourne souvent mal : toi et ton allié êtes en retard sur l'adversaire. Neuf fois sur dix, mieux vaut faire tes camps de ce côté, puis aller vers les lanes que tu peux aider sans risquer de mourir en 2 contre 1.",
    evidence: [["Mistake #5 - Ganking Losing Lanes", "nine times out of ten, it’s better for you to clear your camps on that side of the map and get to pathing towards lanes you can influence without risk of dying 2v1."]],
    use: { when: "Une de tes lanes perd et te demande de venir.", why: "Les laners sont en général plus forts que les junglers, et ton allié a déjà dû quitter sa vague.", who: "Junglers.", how: ["Fais tes camps de ce côté de la carte.", "Dirige-toi ensuite vers une lane que tu peux aider sans risque."], notWhen: "" } }),
  u(X, 7, { ...exyu, themes: ["jungle", "macro"],
    claim: "Selon eXyu (jungler de LCS), qui reprend une image de Canyon : le jungler est un investisseur. Tu peux investir dans une lane en baisse si elle peut remonter, mais pas dans une lane perdue pour de bon. Avant de tout miser sur une lane qui perd, regarde les ressources (PV, mana, sorts d'invocateur, objets) et les champions présents.",
    evidence: [["Mistake #5 - Ganking Losing Lanes", "As a Jungler, you’re like an investor. You can invest in a stock that’s on the decline if you think there’s a chance it can bounce back."], ["Mistake #5 - Ganking Losing Lanes", "take the time to think about resources (HP, Mana, Summoner Spells, Items) and the Champions that are present before you go all-in on trying to boost up a losing lane."]],
    use: { when: "Avant de ganker une lane alliée en difficulté.", why: "Jouer pour une lane qui ne peut plus remonter te fait perdre du temps et rend la partie plus dure.", who: "Junglers.", how: ["Regarde les PV, le mana, les sorts d'invocateur et les objets des deux côtés.", "Demande-toi si la lane peut remonter ou si elle est perdue.", "Si elle est perdue, investis ton temps ailleurs."], notWhen: "" } }),

  // ---------- Akaadian (jungler professionnel), propos recueillis par Teatones, Dignitas, 2021
  u(A, 1, { ...akaadian, themes: ["jungle", "macro"],
    claim: "Selon Akaadian (jungler professionnel) : ta première route dépend surtout de ton champion : certains sont forts au niveau 3 et veulent agir tôt, d'autres veulent farmer un peu plus.",
    evidence: [["Introduction", "A lot of your initial route depends on your Champion. Some characters spike at level 3 and want to be really active within the early game, while other characters want to farm a bit more."]],
    use: { when: "Avant le début de la partie, quand tu choisis ta première route.", why: "Un champion fort tôt et un champion qui a besoin de farm ne tirent pas profit de la même route.", who: "Junglers.", how: ["Demande-toi si ton champion est fort au niveau 3 ou s'il a besoin de farm.", "Choisis une route courte pour agir tôt, ou une route plus longue pour farmer."], notWhen: "" } }),
  u(A, 2, { ...akaadian, themes: ["jungle", "macro"],
    claim: "Selon Akaadian (jungler professionnel) : même avec un champion qui veut farmer jusqu'au niveau 6, n'hésite pas à punir les erreurs gratuites : face à un jungler qui farme, les adversaires jouent souvent plus agressif et s'exposent à des ganks faciles.",
    evidence: [["The Full Clear", "even if you’re on a Champ that does want to prioritize level six, don’t be hesitant to punish free mistakes. Oftentimes players will play aggressively when they see a Farming Jungler, and that sometimes opens them up for easy ganks."]],
    use: { when: "Pendant ton farm de début de partie, quand un adversaire s'avance trop sur une lane proche.", why: "Les adversaires s'avancent parce qu'ils te croient occupé à farmer.", who: "Junglers qui jouent un champion de farm.", how: ["Garde un œil sur les lanes proches pendant tes camps.", "Si un adversaire s'avance trop, va le punir.", "Reprends ton farm ensuite."], notWhen: "" } }),

  // ---------- Blue (midlaner professionnel), propos recueillis par Teatones, Dignitas, 2022
  u(B, 1, { ...blue, themes: ["lane", "methode"],
    claim: "Selon Blue (midlaner professionnel) : ne pas rater de CS est le fondamental le plus important, parce que chaque sbire et chaque pièce d'or comptent. Concentre-toi là-dessus, surtout si tu apprends ou si tu es en Argent ou en Or : cette compétence te servira aussi quand tu joueras un autre poste.",
    evidence: [["The Number One Most Important Fundamental to Have Mastered - Farming", "Not missing CS is very important because every gold and CS matters. Focus on this, especially if you’re learning or are in Gold or Silver, because this is going to be a skill that not only matters for Mid Lane but is also one that is going to carry if you get auto-filled."]],
    use: { when: "Quand tu choisis quoi travailler en premier, surtout en Argent ou en Or.", why: "Le farm est une avance régulière, et il te suit à tous les postes.", who: "Mids, et tout joueur qui apprend.", how: ["Fais du farm ta première priorité de travail.", "En phase de lane, pense d'abord à ne pas rater de sbires."], notWhen: "" } }),
  u(B, 2, { ...blue, themes: ["lane", "methode"],
    claim: "Selon Blue (midlaner professionnel) : regarde ta minimap après chaque CS. Pour en prendre l'habitude tout en travaillant ton farm, va dans l'outil d'entraînement contre un bot réglé sur une difficulté élevée, farme en esquivant son poke, et pousse-toi vers les 10 sbires par minute.",
    evidence: [["Practice Your Map Awareness", "Look at your minimap after every CS you take."], ["Practice Your Map Awareness", "going to the practice tool and laning against a Bot. Set them at a higher difficulty so they trade more, but practice against CSing and dodging poke"], ["Practice Your Map Awareness", "Push yourself towards that 10/min mark as best you can."]],
    use: { when: "Entre deux parties, pour travailler ton farm et ta lecture de la carte en même temps.", why: "Tu prends l'habitude de regarder la carte sans rater de sbires.", who: "Mids.", how: ["Lance l'outil d'entraînement contre un bot en difficulté élevée.", "Après chaque sbire pris, regarde ta minimap.", "Farme en esquivant son poke et vise 10 sbires par minute."], notWhen: "" } }),
  u(B, 3, { ...blue, themes: ["macro", "vagues"],
    claim: "Selon Blue (midlaner professionnel) : pars en roam après avoir poussé ta vague : ton adversaire doit s'en occuper avant de te suivre, et s'il te suit tout de suite, c'est lui qui perd de l'or et de l'expérience.",
    evidence: [["When It Comes to Roaming", "Ideally, you will be roaming off the back of a push which should force your enemy to respond to the wave before following you, giving you time to get to wherever you roam first and safely. And if they do follow you immediately, they’re losing out on gold and exp as a trade off"]],
    use: { when: "Phase de lane en mid, quand tu veux partir en roam.", why: "La vague poussée retient ton adversaire : tu arrives le premier, et en sécurité.", who: "Mids.", how: ["Pousse ta vague avant de partir.", "Pars dès qu'elle arrive sous sa tourelle.", "S'il te suit sans s'occuper de la vague, il perd de l'or et de l'expérience."], notWhen: "" } }),
  u(B, 4, { ...blue, themes: ["macro", "vagues"],
    claim: "Selon Blue (midlaner professionnel) : à chaque roam, ramène toujours quelque chose : un kill, une assist, une vague, des plaques. Apprends à reconnaître quand le roam en vaut la peine, parce que descendre en bot sans rien obtenir te fait perdre.",
    evidence: [["When It Comes to Roaming", "whenever you roam, always get something for it. Be that a kill, assist, a wave, some plates. It doesn’t matter."], ["When It Comes to Roaming", "there is the potential for you to lose out if you just walk down to Bot and get nothing."]],
    use: { when: "Avant de quitter ta lane pour un roam.", why: "Un roam qui ne rapporte rien te coûte l'or et l'expérience des sbires ratés.", who: "Mids.", how: ["Demande-toi ce que tu vas obtenir : kill, assist, vague ou plaques.", "Si tu ne vois rien à gagner, reste farmer."], notWhen: "" } }),
];
