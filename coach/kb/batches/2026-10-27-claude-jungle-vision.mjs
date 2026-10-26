// Analyse par Claude Code (session du 27/10/2026) : clear et lecture de la carte en jungle, placement et timing des wards,
// pour les objectifs « sbires à 10 min » (jungle) et « score de vision par minute » du coach V1. Articles Dignitas,
// règles v1.2, instructions v2. Passages copiés tels quels depuis le texte réellement consulté (coach/cache/text, non republié).
const u = (content, n, x) => ({
  id: `u-cl-${content.replace(/^c-/, "")}-${n}`,
  context: { queue: "solo", rank: "non précisé", region: "non précisé" },
  patch: { known: false }, metaDependent: false, conditions: [], limits: [], mentions: [], champions: [],
  nature: "opinion", levelContext: "non-precise", usage: "reference",
  ...x,
  evidence: x.evidence.map(([locator, passage]) => ({ content, locator, lang: "en", passage })),
});
const E = "c-dignitas-jungle-exyu", V = "c-dignitas-vision-control";
const exyu = { levelContext: "pro", context: { queue: "solo", rank: "pro (jungler de LCS)", region: "NA" } };

export const units = [
  // ---------- eXyu (jungler de LCS, propos recueillis par Teatones, Dignitas, 2022)
  u(E, 1, {
    ...exyu,
    claim: "Selon eXyu (jungler de LCS) : kite tes camps en les attirant vers le camp suivant : tu réduis ton temps de trajet et tu annules leurs attaques, donc tu gardes ta vie pour ganker ensuite.",
    roles: ["jungle"], themes: ["jungle"], published: "2022-09-08",
    evidence: [["Proper Clearing for Proper Ganking", "when you properly kite your camps, you actually not only guide your camp towards your next one, reducing your travel time, but you also cancel the autos of the camp you’re clearing"]],
    use: { when: "Pendant chaque clear de camps.", why: "Un clear qui coûte peu de vie te laisse ganker ou te battre juste après.", who: "Junglers.", how: ["Frappe le monstre, puis recule d'un pas vers ton camp suivant.", "Attaque de nouveau dès que ton attaque est prête.", "Ne reste pas immobile pendant le combat contre le camp."], notWhen: "" },
  }),
  u(E, 2, {
    ...exyu,
    claim: "Selon eXyu (jungler de LCS) : avec un jungler mono-cible, place le gros monstre entre les petits pour qu'ils doivent le contourner, et tue les petits monstres un par un : ce sont eux qui font le plus de dégâts.",
    roles: ["jungle"], themes: ["jungle"], published: "2022-09-08", metaDependent: true, dependsOn: ["system:camps-de-jungle"],
    evidence: [["Proper Clearing for Proper Ganking", "The smaller monsters are always the ones that are going to crank out the DPS."], ["Proper Clearing for Proper Ganking", "if you’re a single target Jungler, try and position the big monster between the smaller ones, forcing them to path around due to the body-block."]],
    use: { when: "Sur les camps avec de petits monstres (loups, raptors, krugs).", why: "Les petits monstres font le plus de dégâts.", who: "Junglers sans dégâts de zone.", how: ["Place-toi pour que le gros monstre bloque le passage des petits.", "Tue les petits monstres un par un.", "Avec des dégâts de zone, tu peux viser le gros monstre en premier."], notWhen: "" },
  }),
  u(E, 3, {
    ...exyu,
    claim: "Selon eXyu (jungler de LCS) : entraîne le clear de ton champion, même lentement au début ; dans les parties de bas niveau, le clear est si lent que les junglers ratent les occasions de peser sur la carte.",
    roles: ["jungle"], themes: ["jungle", "methode"], published: "2022-09-08",
    evidence: [["Closing Out", "It’s always better to take time to practice this, even if you can’t do it super efficiently."], ["Closing Out", "When I watch lower ELO games, their Jungle clear is slow that they miss all the opportunities that higher level players have to influence the map."]],
    use: { when: "Hors partie, sur le champion que tu joues en jungle.", why: "Un clear rapide te laisse du temps pour ganker et prendre les objectifs.", who: "Junglers.", how: ["Regarde une vidéo du clear de ton champion.", "Refais-le dans l'outil d'entraînement.", "Compare ton temps de clear d'une séance à l'autre."], notWhen: "" },
  }),
  u(E, 4, {
    ...exyu,
    claim: "Selon eXyu (jungler de LCS) : quand une de tes lanes est en position de se faire ganker, tu peux rester près d'elle pour contrer le gank, ou la prévenir et aller jouer ailleurs.",
    roles: ["jungle"], themes: ["jungle", "macro"], published: "2022-09-08",
    evidence: [["Adapting to the Map", "So, if you recognize a lane is in a position to be ganked, you can do one of two things. You can either hang around and try to counter the gank, or you can try to ping off your laner to make a move elsewhere."]],
    use: { when: "Ton allié pousse loin vers la tourelle adverse et le jungler adverse est de ce côté.", why: "Un contre-gank retourne le combat quand l'adversaire a utilisé ses sorts.", who: "Junglers.", how: ["Repère la lane qui s'avance trop.", "Si le jungler adverse aime ganker, reste à proximité pour contrer.", "Sinon, préviens ton allié et va jouer de l'autre côté."], notWhen: "" },
  }),
  u(E, 5, {
    ...exyu,
    claim: "Selon eXyu (jungler de LCS) : quand tu es en retard, joue l'échange : repère le jungler adverse, va du côté opposé de la carte et prends le plus de ressources possible pendant qu'il joue son action.",
    roles: ["jungle"], themes: ["jungle", "macro"], published: "2022-09-08",
    evidence: [["Closing Out A Game & Coming Back From A Loss", "When you’re behind, it’s all about trading. So, you find out wherever the enemy Jungler is and you go to the opposite side of the map."]],
    use: { when: "Milieu de partie, ton équipe ou toi êtes en retard.", why: "Tu évites le combat perdu d'avance et tu récupères des ressources ailleurs.", who: "Junglers.", how: ["Repère le jungler adverse sur la minimap.", "Va de l'autre côté de la carte.", "Prends des camps ou un objectif pendant qu'il est occupé."], notWhen: "" },
  }),

  // ---------- bagelsen314 (Dignitas, 2020) : contrôle de la vision
  u(V, 1, {
    claim: "Selon bagelsen314 (Dignitas) : pose tes wards à l'intersection de plusieurs chemins plutôt que dans un seul couloir : tu vois l'adversaire au moment où il choisit sa route, et tu réagis plus tôt.",
    roles: ["jungle", "support", "mid"], themes: ["vision"], published: "2020-02-10",
    evidence: [["Placement: Where and Why?", "when your ward is in an intersection between corridors, you’re seeing the decision tree that they have to consider and are able to watch the decision start and react very early."]],
    use: { when: "Début de partie, pour suivre le jungler et les roams adverses.", why: "Une ward d'intersection montre où l'adversaire va avant qu'il arrive.", who: "Junglers, supports et mids.", how: ["Repère les croisements de chemins dans la jungle adverse et la rivière.", "Pose ta ward à un croisement plutôt que dans un couloir.", "Préviens ton équipe de la direction prise."], notWhen: "" },
  }),
  u(V, 2, {
    claim: "Selon bagelsen314 (Dignitas) : regarde ta minimap après avoir posé une ward ; beaucoup de joueurs posent des wards puis ignorent les déplacements qu'elles montrent.",
    roles: ["jungle", "support", "mid"], themes: ["vision", "methode"], published: "2020-02-10",
    evidence: [["Placement: Where and Why?", "Players will often drop wards and completely ignore a rotation caught by it."], ["Placement: Where and Why?", "you must pay attention to your minimap once you place your vision."]],
    use: { when: "Après chaque ward posée.", why: "Une ward ne sert que si quelqu'un réagit à ce qu'elle montre.", who: "Tous les postes, surtout jungle, support et mid.", how: ["Après ta ward, jette un œil à la minimap toutes les quelques secondes.", "Si le jungler adverse change de côté, ping-le.", "Si un mid adverse vient vers toi, joue prudemment."], notWhen: "" },
  }),
  u(V, 3, {
    claim: "Selon bagelsen314 (Dignitas) : ne rentre pas à la base juste après avoir posé une ward ; pose-la quand tu peux profiter de la plus grande partie de sa durée.",
    roles: ["jungle", "support", "mid"], themes: ["vision"], published: "2020-02-10",
    evidence: [["Timing: When and How?", "This means you want to place the ward at a time where you can use most of the time that it is alive. Recalling right after placing vision is generally a big problem because of this."]],
    use: { when: "Avant un retour à la base.", why: "Une ward qui vit pendant que tu es à la base sert peu.", who: "Junglers, supports et mids.", how: ["Garde ta ward si tu comptes rentrer bientôt.", "Pose-la en revenant vers ta lane ou ta jungle.", "Recharge ton trinket pendant ton retour."], notWhen: "" },
  }),
  u(V, 4, {
    claim: "Selon bagelsen314 (Dignitas) : si tu vois le jungler adverse ganker ton bot puis rentrer à la base, pose une ward dans la partie haute de sa jungle : il ne peut pas la défendre et il y retournera sans doute pour ses camps.",
    roles: ["jungle", "support", "mid"], themes: ["vision", "jungle"], published: "2020-02-10",
    evidence: [["Timing: When and How?", "if you see a jungler ganking your bot lane then recall, you may want to drop a ward in the top side of their jungle since they can’t defend it from you and they are most likely to move back to that area to cycle through their jungle camps again."]],
    use: { when: "Début de partie, juste après un gank adverse en bot suivi d'un retour à la base.", why: "Tu sais où il va réapparaître, et tu peux jouer agressif ailleurs.", who: "Junglers, supports et mids.", how: ["Note le retour à la base du jungler adverse.", "Va poser une ward dans le haut de sa jungle.", "Joue selon ce qu'elle montre."], notWhen: "" },
  }),
  u(V, 5, {
    claim: "Selon bagelsen314 (Dignitas) : ne va pas poser une ward dans la jungle adverse seul, sans pression de vague ni information sur les adversaires : fais-le avec un allié, quand tes vagues poussent, ou quand tu sais où ils sont.",
    roles: ["jungle", "support", "mid"], themes: ["vision", "survie"], published: "2020-02-10",
    evidence: [["Timing: When and How?", "You cannot go for a ward in the opponent’s jungle alone with no pressure or knowledge. You must use the company of a teammate, pressure from minion waves, or knowledge of where the members of their team are."]],
    use: { when: "Avant de poser une ward profonde chez l'adversaire.", why: "Seul et sans information, tu risques de mourir pour une ward.", who: "Tous les postes qui posent des wards profondes.", how: ["Vérifie que tes vagues poussent.", "Vérifie où sont les adversaires sur la minimap.", "Sinon, va poser la ward avec un allié."], notWhen: "" },
  }),
  u(V, 6, {
    claim: "Selon bagelsen314 (Dignitas) : pose tes balises de contrôle presque toujours dans un buisson, et au moment où tu peux les défendre un moment ; hors d'un buisson, c'est surtout autour des objectifs.",
    roles: ["jungle", "support", "mid"], themes: ["vision"], published: "2020-02-10",
    evidence: [["Placement: Where and Why?", "Control wards should almost always be placed in brushes"], ["Timing: When and How?", "Control wards should be placed at times when you can defend them for a certain period of time."]],
    use: { when: "Quand tu poses une balise de contrôle.", why: "Dans un buisson, elle est plus facile à défendre et voit les wards cachées à côté.", who: "Junglers, supports et mids.", how: ["Choisis un buisson près de ta zone de jeu.", "Pose la balise quand ton jungler ou ta vague te protègent.", "Autour d'un objectif neutre, comme le dragon, tu peux la poser hors du buisson."], notWhen: "" },
  }),
  u(V, 7, {
    claim: "Selon bagelsen314 (Dignitas) : les wards qui regardent seulement l'entrée de ta lane depuis la rivière ou la jungle sont trop utilisées ; elles préviennent souvent trop tard. Utilise-les quand une ward plus profonde est trop dangereuse, pas à chaque fois.",
    roles: ["top", "mid", "bottom", "support"], themes: ["vision", "lane"], published: "2020-02-10",
    evidence: [["Placement: Where and Why?", "These wards are very shallow just observing the entrances to your lane from the river or jungle."], ["Placement: Where and Why?", "you realize that you cannot consistently create advantageous situations from these wards and should not use them consistently."]],
    use: { when: "Phase de lane, quand tu choisis où poser ta ward.", why: "Plus profonde, une ward voit le jungler plus tôt.", who: "Laners et supports.", how: ["Préfère une ward un peu plus profonde dans la rivière ou la jungle.", "Garde la ward d'entrée de lane pour quand tu ne peux pas avancer sans danger.", "Change d'emplacement d'une ward à l'autre."], notWhen: "" },
  }),
];
