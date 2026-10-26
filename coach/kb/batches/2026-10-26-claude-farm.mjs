// Analyse par Claude Code (session du 26/10/2026) : farm en lane et en jungle, pour les objectifs « sbires à 10 min » du
// coach V1 (base presque vide sur ce geste). Articles Dignitas, règles v1.2, instructions v2.
// Passages copiés tels quels depuis le texte réellement consulté (coach/cache/text, non republié).
const u = (content, n, x) => ({
  id: `u-cl-${content.replace(/^c-/, "")}-${n}`,
  context: { queue: "solo", rank: "non précisé", region: "non précisé" },
  patch: { known: false }, metaDependent: false, conditions: [], limits: [], mentions: [], champions: [],
  nature: "opinion", levelContext: "non-precise", usage: "reference",
  ...x,
  evidence: x.evidence.map(([locator, passage]) => ({ content, locator, lang: "en", passage })),
});
const CS = "c-dignitas-cs-guide", FW = "c-dignitas-farm-waves-pro", WL = "c-dignitas-waves-every-lane", PS = "c-dignitas-jungle-pathing-s10", DD = "c-dignitas-dardoch-jungle-s11";
const old = date => [`Article de ${date} : les sbires, les tourelles et les camps ont changé depuis, à vérifier sur le patch actuel.`];
const dardoch = { levelContext: "pro", context: { queue: "solo", rank: "pro (ex-jungler de LCS)", region: "NA" } };

export const units = [
  // ---------- bagelsen314 (Dignitas, 2020) : améliorer son CS
  u(CS, 1, {
    claim: "Selon bagelsen314 (Dignitas) : dans une vague, le sbire canon passe avant tout ; assure son last hit, au besoin avec une compétence. Ensuite les sbires de mêlée, puis les casters, dans l'ordre de l'or qu'ils rapportent.",
    roles: ["top", "mid", "bottom"], themes: ["lane", "vagues"], published: "2020-06-08", limits: old("2020"),
    evidence: [["Last Hitting", "Cannon minions are always the priority in a wave and you should treat them as such."], ["Last Hitting", "After cannons, you will want to prioritize melee minions then casters as the gold value goes in that order from largest to smallest."]],
    use: { when: "Phase de lane, à chaque vague, surtout celles avec un sbire canon.", why: "Le sbire canon rapporte le plus d'or, puis les sbires de mêlée, puis les casters.", who: "Laners (top, mid, ADC).", how: ["Repère le sbire canon dès que la vague arrive.", "Garde une compétence pour assurer son last hit si tu risques de le rater.", "Ensuite, priorise les sbires de mêlée, puis les casters."], notWhen: "" },
  }),
  u(CS, 2, {
    claim: "Selon bagelsen314 (Dignitas) : pour farmer sous ta tourelle, laisse deux tirs de tourelle sur un sbire de mêlée en pleine vie avant le last hit ; sur un caster, un tir de tourelle puis une attaque de préparation (mages, ou champions AD en début de partie).",
    roles: ["top", "mid", "bottom"], themes: ["lane", "vagues"], published: "2020-06-08", metaDependent: true, limits: old("2020"),
    evidence: [["Last Hitting", "Melee minions will take two tower hits from full hp and then you can last hit them."], ["Last Hitting", "Casters will take one tower shot and, for mages or early game for AD champions, one set up auto-attack before the last hit."]],
    use: { when: "La vague adverse arrive sous ta tourelle.", why: "", who: "Laners, surtout en début de partie, quand tes attaques font peu de dégâts.", how: ["Sbire de mêlée en pleine vie : attends deux tirs de tourelle, puis last hit.", "Caster : un tir de tourelle, une attaque de préparation, puis last hit.", "Regarde combien chaque tir enlève avant de frapper."], notWhen: "" },
  }),
  u(CS, 3, {
    claim: "Selon bagelsen314 (Dignitas) : entraîne ton last hit dans l'outil d'entraînement, sans objet ni rune qui aide à farmer, avec seulement des attaques de base, par séances de 10 minutes.",
    roles: ["top", "mid", "bottom"], themes: ["lane", "methode"], published: "2020-06-08",
    evidence: [["Last Hitting", "The most important tool that is available to practice last hitting with is the practice tool."], ["Last Hitting", "You will simply go to lane and use only auto attacks to last hit for 10 minutes at a time."]],
    use: { when: "Hors partie, pour progresser sur ton farm.", why: "", who: "Laners qui ratent des sbires faciles.", how: ["Lance l'outil d'entraînement sans objet acheté.", "Va en lane et farme 10 minutes avec tes attaques de base seulement.", "Compare ton nombre de sbires d'une séance à l'autre, puis ajoute tes compétences."], notWhen: "" },
  }),
  u(CS, 4, {
    claim: "Selon bagelsen314 (Dignitas) : quand un adversaire peut te punir ou qu'un gank arrive, recule de la vague et concède quelques sbires ; t'acharner sur le dernier CS te fait souvent mourir et rater bien plus de farm.",
    roles: ["top", "mid", "bottom"], themes: ["lane", "survie"], published: "2020-06-08",
    evidence: [["Accessing the Wave", "Simply give them respect and back off the wave completely."], ["Accessing the Wave", "If you disrespect in an effort to get that last CS, it is highly likely that you can get caught and killed and miss a much more substantial amount of CS."]],
    use: { when: "Phase de lane, quand l'adversaire a ses compétences pour te punir ou qu'un adversaire vient roam ou ganker.", why: "Mourir pour un sbire te fait perdre toute la vague, et souvent la suivante.", who: "Laners.", how: ["Repère si l'adversaire a ses compétences d'attaque disponibles.", "Si un gank ou un roam arrive, recule de la vague.", "Récupère les sbires quand la vague revient vers ta tourelle."], notWhen: "" },
  }),
  u(CS, 5, {
    claim: "Selon bagelsen314 (Dignitas) : après la phase de lane, quand ton équipe recule pour se soigner, continue de farmer sans t'avancer : prends les vagues qui viennent vers toi ou tes camps de jungle.",
    roles: ["top", "mid", "bottom"], themes: ["vagues", "macro"], published: "2020-06-08",
    evidence: [["After Laning", "If your team is resetting, you need to pick up the farm that you can without extending by catching waves that are pushing for you or picking up your jungle camps."]],
    use: { when: "Milieu de partie, ton équipe revient à la base ou n'a pas de pression.", why: "", who: "Laners après la phase de lane.", how: ["Regarde quelles vagues arrivent de ton côté de la carte.", "Farme-les sans dépasser la zone que ton équipe contrôle.", "Sinon, prends tes camps de jungle."], notWhen: "" },
  }),

  // ---------- honeydip (Dignitas, 2019) : farm et vagues
  u(FW, 1, {
    claim: "Selon honeydip (Dignitas) : quand une grosse vague va s'écraser sur toi, réduis-la avant qu'elle arrive sous ta tourelle, et garde les sbires hors de portée de la tourelle pour farmer plus facilement.",
    roles: ["top", "mid", "bottom"], themes: ["lane", "vagues"], published: "2019-12-20", limits: old("2019"),
    evidence: [["Final Tips", "Thin down the wave if it's crashing hard on you"], ["Final Tips", "Keep minions out of your tower range"]],
    use: { when: "Phase de lane, une grosse vague adverse pousse vers ta tourelle.", why: "", who: "Laners.", how: ["Repère la vague adverse plus grosse que la tienne.", "Last hit ses sbires avant qu'elle atteigne ta tourelle.", "Si possible, garde le combat de sbires hors de portée de la tourelle."], notWhen: "" },
  }),

  // ---------- EkardD (Dignitas, juillet 2026, saison 16) : vagues par lane
  u(WL, 1, {
    claim: "Selon EkardD (Dignitas, saison 16) : en top, le « cheater recall » consiste à tuer le dernier caster de la deuxième vague quand la troisième arrive, à pousser vite la vague du canon sous la tourelle adverse, puis à rentrer aussitôt à la base, sans perdre de sbires.",
    roles: ["top"], themes: ["vagues", "lane"], published: "2026-07-06",
    evidence: [["Top Lane : The Two/Three Wave Crash", "You should kill the last caster minion of the second wave right when your third wave arrives in lane."], ["Top Lane : The Two/Three Wave Crash", "Once this wave has crashed, you should immediately go back to base."]],
    use: { when: "Les trois premières vagues de la partie, en top.", why: "La vague du canon met du temps à être nettoyée : tu reviens avec un objet pendant que l'adversaire doit garder la vague ou la perdre.", who: "Top laners.", how: ["Tue le dernier caster de la deuxième vague quand la troisième arrive.", "Pousse la troisième vague (celle du canon) le plus vite possible.", "Rentre à la base dès qu'elle s'écrase sous la tourelle adverse."], notWhen: "" },
  }),
  u(WL, 2, {
    claim: "Selon EkardD (Dignitas, saison 16) : en mid, ne pousse vite ta vague que si tu as une raison (roam, aide au jungler, retour à la base) : les sbires reviennent plus vite qu'en top, et tu peux perdre plus d'une demi-vague si tu ne reviens pas à temps.",
    roles: ["mid"], themes: ["vagues", "lane"], published: "2026-07-06",
    evidence: [["Mid Lane : Fast Pushing", "should only be used if you have to roam to help out your Jungler, know you can make a play around the map, or really need to back and can Teleport to lane"], ["Mid Lane : Fast Pushing", "you could lose more than half of a wave if you cannot make it back to lane fast enough"]],
    use: { when: "Phase de lane en mid, avant de pousser vite ta vague.", why: "Les sbires reviennent plus vite en mid qu'en top.", who: "Mid laners.", how: ["Avant de pousser vite, décide ce que tu fais ensuite (roam, aide, retour).", "Sans raison, garde ta vague au milieu ou pousse lentement.", "Si tu pars, reviens à temps pour la vague suivante."], notWhen: "" },
  }),
  u(WL, 3, {
    claim: "Selon EkardD (Dignitas, saison 16) : pour un freeze, garde la vague juste devant ta tourelle, hors de sa portée, et ne frappe les sbires que lorsqu'ils sont assez bas pour le last hit. À réserver aux situations où tu as un net avantage et où rien ne se passe sur la carte.",
    roles: ["top"], themes: ["vagues", "lane"], published: "2026-07-06",
    limits: ["Selon l'auteur, un freeze est difficile à obtenir depuis les changements de sbires des saisons 15 et 16."],
    evidence: [["Top Lane : Freezing", "The best position to set up one is right by your own tower, just outside of tower aggro."], ["Top Lane : Freezing", "you should only hit the minions when they are very low and can be executed, not at any other time."], ["Top Lane : Freezing", "use it only when you have a clear advantage and not much is happening on the map."]],
    use: { when: "Phase de lane, tu as un net avantage et la vague revient vers ta tourelle.", why: "", who: "Top laners.", how: ["Laisse la vague adverse venir juste devant ta tourelle, hors de sa portée.", "Ne frappe un sbire que pour le last hit.", "Si la vague se rapproche de la tourelle, attire-la hors de portée."], notWhen: "Tu n'as pas d'avantage net, ou un objectif se joue sur la carte." },
  }),

  // ---------- Dardoch (ancien jungler de LCS, Dignitas, 2021) : jungle
  u(DD, 1, {
    ...dardoch,
    claim: "Selon Dardoch (ex-jungler professionnel de LCS) : en début de partie, il vaut mieux farmer jusqu'au niveau 3 et tuer le plus de camps possible avant l'apparition du Carapateur.",
    roles: ["jungle"], themes: ["jungle"], published: "2021-01-09", metaDependent: true, dependsOn: ["system:camps-de-jungle"], limits: old("2021"),
    evidence: [["Efficient Clearing vs. Inefficient Clearing", "In the new season, it’s more beneficial to simply farm your way to Level 3 and take down as many camps as possible before the Scuttle Crab spawns."]],
    use: { when: "Premier clear de la partie.", why: "Selon lui, c'est la façon la plus sûre et la plus efficace de jouer en jungle.", who: "Junglers.", how: ["Prépare ton chemin de camps avant le début de la partie.", "Enchaîne les camps jusqu'au niveau 3 au moins.", "Arrive au Carapateur avec tes camps faits."], notWhen: "" },
  }),
  u(DD, 2, {
    ...dardoch,
    claim: "Selon Dardoch (ex-jungler professionnel de LCS) : bien kiter les camps de jungle est la première chose à apprendre ; c'est l'erreur la plus courante des débutants. Regarde des VOD de pros ou de joueurs de haut niveau pour l'apprendre.",
    roles: ["jungle"], themes: ["jungle", "methode"], published: "2021-01-09",
    evidence: [["Changing your Jungle Paths", "the most important thing to learn and one of the biggest mistakes that people make in the Jungle is properly kiting Jungle camps."], ["Changing your Jungle Paths", "open up VODs of pro or high elo players and learn from them as soon as possible!"]],
    use: { when: "Pendant tes clears de camps.", why: "Sans bon kiting, le clear coûte plus de vie et de temps.", who: "Junglers, surtout ceux qui débutent au poste.", how: ["Regarde le clear d'un pro ou d'un joueur de haut niveau sur ton champion.", "Reproduis ses déplacements entre les attaques sur chaque camp.", "Entraîne-toi dans l'outil d'entraînement avant la ranked."], notWhen: "" },
  }),

  // ---------- Dinglehopper (Dignitas, 2020) : chemins de jungle
  u(PS, 1, {
    claim: "Selon Dinglehopper (Dignitas) : en full clear, après avoir fini tes camps, rentre acheter, puis refais un clear complet s'il n'y a pas de gank à jouer.",
    roles: ["jungle"], themes: ["jungle"], published: "2020-01-04", metaDependent: true, dependsOn: ["system:camps-de-jungle"], limits: old("2020"),
    evidence: [["Power Farming : Full Clear", "Ideally, you’ll want to back and buy after finishing the clear and doing it again if there are no gank opportunities."]],
    use: { when: "Début de partie, avec un champion qui veut farmer et monter en puissance.", why: "", who: "Junglers qui jouent le farm (champions qui montent en puissance).", how: ["Finis ton clear complet.", "Rentre acheter.", "Sans occasion de gank, refais tous tes camps."], notWhen: "" },
  }),
];
