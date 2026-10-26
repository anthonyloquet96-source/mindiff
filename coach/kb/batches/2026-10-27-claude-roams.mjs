// Analyse par Claude Code (session du 27/10/2026) : roams du mid et du support, ganks du jungler, pour les objectifs
// « participation aux kills » du coach V1 (2 à 3 conseils seulement par poste). Articles Dignitas, règles v1.2, instructions v2.
// Passages copiés tels quels depuis le texte réellement consulté (coach/cache/text, non republié).
const u = (content, n, x) => ({
  id: `u-cl-${content.replace(/^c-/, "")}-${n}`,
  context: { queue: "solo", rank: "non précisé", region: "non précisé" },
  patch: { known: false }, metaDependent: false, conditions: [], limits: [], mentions: [], champions: [],
  nature: "opinion", levelContext: "non-precise", usage: "reference",
  ...x,
  evidence: x.evidence.map(([locator, passage]) => ({ content, locator, lang: "en", passage })),
});
const L = "c-dignitas-roam-leave-lane", M = "c-dignitas-roam-mid-all", S = "c-dignitas-roam-support", G = "c-dignitas-gank-setup", I = "c-dignitas-gank-indepth";
const old = date => [`Article de ${date} : la carte et le rythme de la jungle ont changé depuis, à vérifier sur le patch actuel.`];

export const units = [
  // ---------- Zooph (Dignitas, 2019) : roams du mid
  u(L, 1, {
    claim: "Selon Zooph (Dignitas) : en mid, roame quand tu as la priorité de lane (ta vague pousse vers l'adversaire) : il lui est alors plus difficile de suivre ton roam.",
    roles: ["mid"], themes: ["macro", "teamfight"], published: "2019-05-25",
    evidence: [["When and Where to Roam", "It is best to roam when you have lane priority over your opponent, as this makes it harder for them to follow your roam."]],
    use: { when: "Phase de lane en mid, quand ta vague pousse vers la tourelle adverse.", why: "Ton adversaire doit choisir entre sa vague et te suivre.", who: "Mids.", how: ["Pousse ta vague vers la tourelle adverse.", "Regarde la minimap pour choisir une lane où aller.", "Pars dès que ta vague arrive sous sa tourelle."], notWhen: "" },
  }),
  u(L, 2, {
    claim: "Selon Zooph (Dignitas) : ne roame pas quand ta vague est complètement poussée sous ta tourelle : tu perdrais beaucoup d'or et d'expérience, et ta tourelle prendrait de gros dégâts.",
    roles: ["mid"], themes: ["macro", "vagues"], published: "2019-05-25",
    evidence: [["Introduction", "when you are completely shoved under your tower, roaming would be a bad idea at this time due to the fact you would be sacrificing a large amount of experience and gold from the minion waves being pushed into your tower and your tower will take a large amount of damage."]],
    use: { when: "Avant de quitter le mid, quand la vague adverse est sous ta tourelle.", why: "Les sbires sous ta tourelle sont perdus pendant ton absence, et ta tourelle encaisse.", who: "Mids.", how: ["Regarde où est ta vague avant de partir.", "Si elle est sous ta tourelle, farme-la d'abord.", "Roame seulement quand elle repart vers l'adversaire."], notWhen: "" },
  }),
  u(L, 3, {
    claim: "Selon Zooph (Dignitas) : suis le roam de ton adversaire seulement si tu n'es pas déjà loin derrière ; s'il a deux niveaux ou un gros avantage d'objets, il risque de se retourner et de te tuer. Préviens plutôt ton équipe et farme pour revenir.",
    roles: ["mid"], themes: ["macro", "survie"], published: "2019-05-25",
    evidence: [["When and Where to Roam", "I would recommend only really following enemy roams if you are not too far behind already."], ["When and Where to Roam", "it can be too dangerous to follow them, as they will likely just turn and kill you, further securing their lead over you."]],
    use: { when: "Ton adversaire de mid quitte sa lane pour roam.", why: "Avec son avance, il gagne le combat s'il se retourne contre toi.", who: "Mids en retard dans leur lane.", how: ["Compare ton niveau et tes objets aux siens.", "Si tu es à égalité, prends ta vague puis suis-le.", "Si tu es loin derrière, ping-le absent et farme."], notWhen: "" },
  }),
  u(L, 4, {
    claim: "Selon Zooph (Dignitas) : pour choisir où roam, regarde la minimap et repère les lanes qui tiennent mais pourraient profiter de ton aide avant qu'il soit trop tard.",
    roles: ["mid"], themes: ["macro"], published: "2019-05-25",
    evidence: [["When and Where to Roam", "you will want to analyze your mini-map and see which lanes are doing okay but could benefit from help before it is too late for them."]],
    use: { when: "Tu as la priorité en mid et tu peux partir.", why: "", who: "Mids.", how: ["Regarde la position des vagues en top et en bot.", "Repère où tes alliés sont poussés ou en difficulté.", "Va là où ton aide peut encore changer la lane."], notWhen: "" },
  }),

  // ---------- ISO (Dignitas, 2022) : roams du mid
  u(M, 1, {
    claim: "Selon ISO (Dignitas) : roame après avoir écrasé plusieurs vagues sur la tourelle adverse, ou quand la prochaine vague a un sbire canon : l'adversaire met plus de temps à les nettoyer et tu perds moins en partant.",
    roles: ["mid"], themes: ["macro", "vagues"], published: "2022-08-17",
    evidence: [["WHEN TO ROAM", "try roaming after building up a few waves to crash into the enemy tower or when you know the next wave coming in is a cannon minion wave."]],
    use: { when: "Phase de lane en mid, avant un roam.", why: "Une vague canon ou une grosse vague écrasée sous la tourelle met longtemps à revenir chez toi.", who: "Mids.", how: ["Laisse ta vague grossir sur deux ou trois vagues.", "Écrase-la sur la tourelle adverse, ou attends la vague canon.", "Pars roam, puis reviens pour la vague suivante."], notWhen: "" },
  }),
  u(M, 2, {
    claim: "Selon ISO (Dignitas) : avant de roam, regarde la lane visée avec ta caméra, pas seulement sur la minimap : si ton bot lane prépare un dive, écrase vite ta vague en mid et descends.",
    roles: ["mid"], themes: ["macro", "teamfight"], published: "2022-08-17",
    evidence: [["WHEN TO ROAM", "It is important to be looking at the lane you want to roam to, not just on your mini-map, but also panning your camera there"], ["WHEN TO ROAM", "then you will want to quickly crash your own wave in mid lane and head down there."]],
    use: { when: "Phase de lane en mid, quand une autre lane prépare une action.", why: "Tu vois si tes alliés poussent, gèlent ou échangent, et tu arrives au bon moment.", who: "Mids.", how: ["Déplace ta caméra sur la lane visée.", "Si tes alliés préparent un dive, écrase ta vague en mid.", "Rejoins-les, puis rentre ou reviens pour ta vague suivante."], notWhen: "" },
  }),
  u(M, 3, {
    claim: "Selon ISO (Dignitas) : quand une lane alliée perd nettement, ne roame pas chez elle, vous risquez tous de mourir ; demande plutôt à ton support ou à ton jungler de jouer autour de toi.",
    roles: ["mid"], themes: ["macro", "teamfight"], published: "2022-08-17",
    evidence: [["WHEN NOT TO ROAM", "In this instance, it is more beneficial to not roam, but rather have your support and or jungle play around you."]],
    use: { when: "Tes lanes de côté perdent lourdement.", why: "Un roam dans une lane très en retard se termine souvent par plusieurs morts.", who: "Mids.", how: ["Repère les lanes en grande difficulté.", "Ne descends pas les aider seul.", "Demande un gank ou de la présence de ton jungler et de ton support en mid."], notWhen: "" },
  }),
  u(M, 4, {
    claim: "Selon ISO (Dignitas) : contre un mid qui roame, tu peux repousser ta vague et suivre son roam, faire autre chose d'utile (envahir avec ton jungler, aller en top), ou au minimum le signaler absent pour que tes alliés jouent prudemment.",
    roles: ["mid"], themes: ["macro", "teamfight"], published: "2022-08-17",
    evidence: [["PICKING THE RIGHT CHAMPIONS", "you have decisions to make such as counter-shoving the minion wave and matching the roam"], ["PICKING THE RIGHT CHAMPIONS", "or at the very least pinging that the enemy is missing so your teammates can hopefully play safer."]],
    use: { when: "Ton adversaire de mid disparaît de la lane.", why: "", who: "Mids.", how: ["Ping-le absent tout de suite.", "Repousse ta vague.", "Suis son roam, ou va jouer ailleurs avec ton jungler."], notWhen: "" },
  }),

  // ---------- Teatones (Dignitas, 2021) : roams du support
  u(S, 1, {
    claim: "Selon Teatones (Dignitas) : avant de roam en support, demande-toi d'abord si ton ADC peut rester en sécurité et continuer à farmer ; face à un bot lane agressif capable de plonger, ne le laisse pas seul.",
    roles: ["support"], themes: ["macro", "teamfight"], published: "2021-05-27",
    evidence: [["What Questions You Should Ask Yourself Before Roaming", "This is the most important question to consider."], ["What Questions You Should Ask Yourself Before Roaming", "In situations where you’re roaming as Support, and your AD is against aggressive and potentially dive-ready opponents, it’s unwise to leave them to fend for themselves."]],
    use: { when: "Phase de lane en bot, avant de quitter ton ADC.", why: "Ton ADC a besoin de farmer en sécurité pour peser plus tard.", who: "Supports.", how: ["Regarde le duo adverse : peut-il plonger sur ton ADC ?", "Regarde si ton ADC a de quoi fuir.", "S'il est en danger, reste ; sinon, pars roam."], notWhen: "" },
  }),
  u(S, 2, {
    claim: "Selon Teatones (Dignitas) : une lane est bonne à ganker quand l'adversaire a utilisé sa mobilité ou son ultime dans un échange, quand son Flash ou son sort défensif est indisponible, ou quand ton allié a un avantage de niveau ou d'objets.",
    roles: ["support", "jungle", "mid"], themes: ["macro", "teamfight"], published: "2021-05-27",
    evidence: [["What Questions You Should Ask Yourself Before Roaming", "They’ve used their mobility, utility, or ultimate in a trade."], ["What Questions You Should Ask Yourself Before Roaming", "Flash or defensive/utility Summoner Spells are down."], ["What Questions You Should Ask Yourself Before Roaming", "Your allied laner has an item or level advantage."]],
    use: { when: "Avant un roam ou un gank.", why: "Sans ses sorts, l'adversaire peut moins fuir.", who: "Supports, junglers et mids qui roament.", how: ["Repère les sorts et compétences que l'adversaire vient d'utiliser.", "Vérifie son Flash.", "Choisis la lane où ton allié a l'avantage."], notWhen: "" },
  }),
  u(S, 3, {
    claim: "Selon Teatones (Dignitas) : en support, les meilleurs moments pour roam sont juste après un kill en lane, et quand ton ADC est rentré à la base alors que rentrer toi aussi ferait perdre du temps : va ganker ou poser de la vision.",
    roles: ["support"], themes: ["macro", "vision"], published: "2021-05-27",
    evidence: [["Moments of Opportunity and Things to Recognize", "When you’ve just gotten a kill: This is a perfect opportunity to roam."], ["Moments of Opportunity and Things to Recognize", "whenever you’re disjointed on back timings and backing at the moment is just a waste of time, taking the chance on a roam to gank or secure vision is the perfect use of time."]],
    use: { when: "Phase de lane en bot, après un kill, ou quand ton ADC rentre sans toi.", why: "Ces moments ne coûtent presque rien à ta lane.", who: "Supports.", how: ["Après un kill, vérifie ta vie et tes compétences.", "Si ton ADC rentre seul, ne reste pas sans rien faire en lane.", "Va ganker le mid ou poser de la vision, puis reviens."], notWhen: "" },
  }),
  u(S, 4, {
    claim: "Selon Teatones (Dignitas) : le mid est la lane la plus réaliste à ganker en support, car c'est la plus proche du bot ; un mid qui a de quoi immobiliser rend le gank encore meilleur.",
    roles: ["support"], themes: ["macro", "teamfight"], published: "2021-05-27",
    evidence: [["Moments of Opportunity and Things to Recognize", "Mid is the most realistic lane for Support to gank since it’s the closest to Bot."]],
    use: { when: "Tu as une fenêtre pour roam en support.", why: "Le trajet est court : tu reviens vite en lane.", who: "Supports.", how: ["Passe par la rivière vers le mid.", "Préviens ton mid de ton arrivée.", "Engage avec lui, puis rentre en bot."], notWhen: "" },
  }),
  u(S, 5, {
    claim: "Selon Teatones (Dignitas) : quand le support adverse roame beaucoup, suis-le : ton équipe garde le même nombre de joueurs dans le combat.",
    roles: ["support"], themes: ["macro", "teamfight"], published: "2021-05-27",
    evidence: [["Moments of Opportunity and Things to Recognize", "if your opposing Support has opted towards a roam heavy pattern, matching them is always going to keep the numbers for your team even."]],
    use: { when: "Le support adverse quitte souvent le bot.", why: "Sinon, il crée des combats en surnombre ailleurs.", who: "Supports.", how: ["Repère quand le support adverse disparaît du bot.", "Signale-le à ton équipe.", "Pars dans la même direction que lui."], notWhen: "" },
  }),

  // ---------- Fordola (Dignitas, 2021) : préparer un gank
  u(G, 1, {
    claim: "Selon Fordola (Dignitas) : au premier clear, fais entre quatre et six camps avant de chercher un gank, et essaie d'être niveau 3 pour avoir toutes tes compétences.",
    roles: ["jungle"], themes: ["jungle", "macro"], published: "2021-11-17", metaDependent: true, dependsOn: ["system:camps-de-jungle"], limits: old("2021"),
    evidence: [["Understanding When to Clear vs. When to Gank", "On your first clear, you generally want to do anywhere from four-to-six camps before you look for ganks, and you definitely want to try and be Level 3 so you have access to all of your skills."]],
    use: { when: "Premier clear de la partie.", why: "Avant le niveau 3, il te manque une compétence pour réussir le gank.", who: "Junglers.", how: ["Fais tes premiers camps jusqu'au niveau 3.", "Après trois ou quatre camps, regarde les lanes.", "Gank si une lane est vulnérable, sinon finis ton clear."], notWhen: "" },
  }),
  u(G, 2, {
    claim: "Selon Fordola (Dignitas) : en jungle, à chaque retour à la base, regarde l'état des vagues de chaque lane pour choisir par où passer et quelle lane ganker.",
    roles: ["jungle"], themes: ["jungle", "macro"], published: "2021-11-17",
    evidence: [["Understanding When to Clear vs. When to Gank", "In general, when recalling as the jungler, you want to pan over each of your laner’s wave states and figure out which way to path into them"]],
    use: { when: "Pendant chaque retour à la base.", why: "La position des vagues dit quelle lane peut être gankée.", who: "Junglers.", how: ["Pendant ton retour, déplace ta caméra sur chaque lane.", "Repère où l'adversaire est loin de sa tourelle.", "Trace ton chemin de camps vers cette lane."], notWhen: "" },
  }),
  u(G, 3, {
    claim: "Selon Fordola (Dignitas) : en jungle, si un de tes laners tient un freeze face à son adversaire, tu peux sauter des camps pour aller le ganker, surtout dans un matchup où un seul kill décide de la lane.",
    roles: ["jungle"], themes: ["jungle", "macro"], published: "2021-11-17",
    evidence: [["Understanding When to Clear vs. When to Gank", "If you see your laner start to hold a freeze against the enemy laner, you can afford to skip camps if it means that you can effectively ruin the enemy’s lane"]],
    use: { when: "Pendant tes clears, quand une vague est gelée près de la tourelle de ton allié.", why: "L'adversaire doit s'avancer loin pour farmer : il devient facile à ganker.", who: "Junglers.", how: ["Pendant tes clears, regarde régulièrement tes lanes.", "Repère un allié qui gèle sa vague.", "Laisse un camp et va ganker."], notWhen: "" },
  }),
  u(G, 4, {
    claim: "Selon Fordola (Dignitas) : pour aider ton jungler à ganker, garde ta vague près de ta tourelle sans être dessous, et pas trop grosse : sinon les sbires peuvent faire perdre le combat à deux contre un.",
    roles: ["top", "mid", "bottom"], themes: ["vagues", "macro"], published: "2021-11-17",
    evidence: [["How to Set Up an Effective Gank as a Laner", "in general you want to have your waves near your tower but not under them, and you also want to make sure the wave isn’t big enough that you or your jungler can potentially lose a 1v2 due to minions doing too much damage."]],
    use: { when: "Phase de lane, quand ton jungler vient vers toi.", why: "L'adversaire doit s'avancer pour farmer, et les sbires ne pèsent pas trop dans le gank.", who: "Laners.", how: ["Laisse la vague revenir près de ta tourelle.", "Évite qu'elle grossisse trop.", "Préviens ton jungler quand l'adversaire est avancé."], notWhen: "" },
  }),

  // ---------- RealZesty (Dignitas, 2020) : gank
  u(I, 1, {
    claim: "Selon RealZesty (Dignitas) : pendant un gank, forcer l'adversaire à utiliser son Flash est déjà un gain ; ne le poursuis pas trop loin pour un kill risqué, beaucoup de joueurs meurent ainsi.",
    roles: ["top", "mid", "bottom", "jungle", "support"], themes: ["teamfight", "survie"], published: "2020-06-01",
    evidence: [["Learning to Get Ganked", "Too many newer players will overextend for a greedy kill on an enemy after they’ve burned their flash trying to escape, only to end up dying themselves."], ["Learning to Get Ganked", "as you already generate value for your team by forcing the enemy to use a Summoner Spell."]],
    use: { when: "Un gank où l'adversaire s'échappe avec Flash.", why: "Selon lui, faire utiliser un sort d'invocateur apporte déjà de la valeur à ton équipe.", who: "Tous les postes.", how: ["S'il utilise son Flash, regarde où il fuit.", "Arrête la poursuite s'il s'enfonce vers sa tourelle ou ses alliés.", "Préviens ton équipe que son Flash est indisponible."], notWhen: "" },
  }),
  u(I, 2, {
    claim: "Selon RealZesty (Dignitas) : en jungle, si tu vois le jungler adverse côté top, préviens ton top de jouer prudemment et va ganker côté bot.",
    roles: ["jungle"], themes: ["jungle", "macro"], published: "2020-06-01",
    evidence: [["Learning to Gank", "If you, as a Jungler, can see that the enemy Jungler has just walked past the top-side Scuttle Crab, this is the perfect indicator to tell your top laner to sit back and play safe for a little bit while you stroll on down to the"]],
    use: { when: "Début de partie, quand le jungler adverse est vu d'un côté de la carte.", why: "Il ne peut pas répondre à un gank de l'autre côté.", who: "Junglers.", how: ["Repère le jungler adverse sur la minimap.", "Préviens le laner de son côté.", "Va ganker la lane opposée."], notWhen: "" },
  }),
];
