// Analyse par Claude Code (session du 25/10/2026) des guides Dignitas, avec les règles v1.2 et les instructions v2.
// Les passages sont copiés tels quels depuis le texte réellement consulté (coach/cache/text, non republié).
const u = (content, n, x) => ({
  id: `u-cl-${content.replace(/^c-/, "")}-${n}`,
  context: { queue: "solo", rank: "non précisé", region: "non précisé" },
  patch: { known: false }, metaDependent: false, conditions: [], limits: [], mentions: [], champions: [],
  nature: "opinion", levelContext: "non-precise", usage: "reference",
  ...x,
  evidence: x.evidence.map(([locator, passage]) => ({ content, locator, lang: "en", passage })),
});
const J = "c-dignitas-track-jungler", G = "c-dignitas-ganks", B = "c-dignitas-baron";

export const units = [
  // ---------- Suivre le jungler adverse (Dignitas, 29/11/2025)
  u(J, 1, {
    claim: "Selon Dignitas : après son premier retour à la base, le jungler adverse reprend souvent ses camps dans le même ordre que sa première tournée. Sers-toi de son premier chemin pour prévoir de quel côté il sera.",
    roles: ["jungle", "all"], themes: ["jungle", "macro", "methode"], published: "2025-11-29",
    evidence: [["First Recall", "After returning to base, it’s likely the enemy Jungler will path to the first camp they took."], ["First Recall", "This concept is referred to as sequencing, which is the idea that a Jungler is likely to repeat their first clear in the same order to stay efficient."]],
    use: { when: "Le jungler adverse vient de faire son premier retour à la base et tu as vu (ou déduit) par quel camp il avait commencé.", why: "Un jungler tend à refaire sa première tournée dans le même ordre pour rester efficace.", who: "Jungler, et tout joueur qui prévient ses alliés.", how: ["Repère le camp par lequel le jungler adverse a commencé.", "Après son retour à la base, attends-le de ce côté-là de la carte.", "Ping tes alliés de ce côté pour qu'ils évitent le gank."], notWhen: "" },
  }),
  u(J, 2, {
    claim: "Selon Dignitas : si tu repères le jungler adverse après une tournée complète (en train de ganker ou de prendre le carapateur), il a très probablement commencé du côté opposé de la carte. Tab te montre combien de camps il a pris.",
    roles: ["jungle", "all"], themes: ["jungle", "macro"], metaDependent: true, dependsOn: ["system:camps-de-jungle"],
    conditions: ["Le compte de sbires par camp cité (4 par camp, 24 pour une tournée complète) dépend de l'équilibrage du moment."], published: "2025-11-29",
    evidence: [["Typical Jungle Strategy", "You can also press tab to determine how many camps they’ve taken. Each camp counts as 4 cs so a full clear would be 24 cs and then 28 cs after the Scuttle Crab."], ["Typical Jungle Strategy", "Based on where the enemy Jungler appears after a clear, you can infer that they started on the opposite side."]],
    use: { when: "Tu n'as pas vu le départ du jungler adverse et il apparaît pour la première fois après sa tournée (gank ou carapateur).", why: "Après une tournée complète, il finit du côté opposé à celui où il a commencé.", who: "Jungler, et les joueurs de lane qui suivent le jungler adverse.", how: ["Appuie sur Tab et regarde le nombre de sbires du jungler adverse.", "Si le total correspond à une tournée complète, déduis qu'il a commencé de l'autre côté.", "Préviens les lanes de ce côté pour sa prochaine tournée."], notWhen: "" },
  }),
  u(J, 3, {
    claim: "Selon Dignitas : au niveau 1, place (ou demande à ton mid de placer) une ward sur les raptors ou sur un buff adverse pour savoir de quel côté le jungler adverse commence.",
    roles: ["jungle", "mid"], themes: ["vision", "jungle"], published: "2025-11-29",
    evidence: [["The First Minute", "I would start by pinging your mid laner to ward Raptors at Level 1 or simply doing it yourself."], ["Typical Jungle Strategy", "Through warding either the raptor camp or one of their buffs, you can figure out what side of the map a Jungler started."]],
    use: { when: "Début de partie, au niveau 1, avant la première tournée des junglers.", why: "Connaître le côté de départ du jungler adverse permet de prévoir où il ira ensuite.", who: "Jungler et mid laner.", how: ["Ping ton mid pour qu'il ward les raptors adverses, ou fais-le toi-même.", "Regarde quel camp le jungler adverse attaque en premier.", "Annonce à ton équipe de quel côté il a commencé."], notWhen: "" },
  }),
  u(J, 4, {
    claim: "Selon Dignitas : un allié qui a poussé sa vague loin de sa tourelle est le joueur le plus facile à ganker. Préviens-le d'un ping et, en jungle, reste près de sa lane pour contre-ganker.",
    roles: ["jungle", "all"], themes: ["vagues", "jungle", "survie"], published: "2025-11-29",
    evidence: [["Lane States", "Pushing lanes happen when one laner has killed the enemy laner’s minions and have overextended towards their opponent’s side. This is when a laner is most vulnerable, as they are far from their tower and can be easily ganked."], ["Lane States", "If your laner is pushed up, make sure to ping them to be careful and potentially hover their lane to countergank."]],
    use: { when: "Un de tes alliés a poussé sa vague jusque chez l'adversaire et se trouve loin de sa tourelle.", why: "Loin de sa tourelle, il est le plus vulnérable aux ganks.", who: "Jungler, et tout joueur qui voit la carte.", how: ["Ping l'allié qui a poussé pour qu'il soit prudent.", "En jungle, rapproche-toi de sa lane.", "Contre-gank si le jungler adverse vient."], notWhen: "" },
  }),
  u(J, 5, {
    claim: "Selon Dignitas : quand les laners adverses se mettent soudain à jouer très agressif ou très sûrs d'eux, c'est souvent que leur jungler est tout près.",
    roles: ["all"], themes: ["survie", "jungle", "lane"], published: "2025-11-29",
    evidence: [["Lane States", "Other ways to identify the enemy Jungler’s location is to recognize when enemy laners are playing extremely aggressive or confident. This could indicate the enemy Jungler is nearby based on the way a laner is playing."]],
    use: { when: "Pendant la phase de lane, ton vis-à-vis change d'attitude et joue soudain très agressif.", why: "Ce changement de comportement peut trahir la présence du jungler adverse.", who: "Tous les postes.", how: ["Observe le comportement de ton vis-à-vis.", "S'il devient soudain très agressif, recule et considère que le jungler adverse est proche.", "Préviens ton équipe."], notWhen: "" },
  }),
  u(J, 6, {
    claim: "Selon Dignitas : n'envahis la jungle adverse au niveau 1 que si ton champion est plus fort que le jungler adverse à ce niveau et que tu te sens sûr de toi ; l'invasion peut mettre l'adversaire en retard, mais aussi te coûter la partie.",
    champions: ["Graves", "Olaf", "Bel'Veth", "Amumu", "Hecarim", "Evelynn"], roles: ["jungle"], themes: ["jungle", "matchup"], metaDependent: true, published: "2025-11-29",
    limits: ["La force d'un champion au niveau 1 dépend de l'équilibrage : les exemples de l'auteur peuvent avoir changé."],
    evidence: [["The First Minute", "Strong Level 1 Junglers include Champions such as Graves, Olaf, or Bel’Veth."], ["The First Minute", "If you’re a strong Level 1 Champion you can also decide to invade the enemy Jungler who has a weaker early game. Champions such as Amumu, Hecarim, or Evelynn have weak Level 1s and can be punished."], ["The First Minute", "Invading early game is one of the most effective ways to put the enemy Jungler behind. However, it can also cost you the game if you’re not careful."]],
    use: { when: "Sélection terminée, avant le niveau 1 : tu compares ton jungler au jungler adverse.", why: "Envahir un jungler faible au niveau 1 est l'un des moyens les plus efficaces de le mettre en retard.", who: "Jungler avec un champion fort au niveau 1 (l'auteur cite Graves, Olaf, Bel'Veth) contre un jungler faible à ce niveau (il cite Amumu, Hecarim, Evelynn).", how: ["Vérifie que ton champion est plus fort au niveau 1 que le jungler adverse.", "Va prendre ses camps en début de partie.", "Ne le fais que si tu maîtrises ton champion."], notWhen: "Si tu ne te sens pas sûr du champion que tu joues : l'auteur dit que l'invasion peut aussi coûter la partie." },
  }),

  // ---------- Ne plus mourir aux ganks (Dignitas, 2021)
  u(G, 1, {
    claim: "Selon Dignitas : au mid, place tes wards sur les rampes vers la jungle rouge des deux équipes. S'il faut choisir un côté, prends celui du buff que le jungler adverse fera en second : les ganks les plus courants arrivent après les deux buffs et un camp, au niveau 3.",
    roles: ["mid"], themes: ["vision", "survie", "lane"], published: "2021-04-19",
    evidence: [["Simple Wards", "Regardless of whether you are blue side or red side though, it’s best to ward the ramps from both your red-side jungle, and the enemy’s red-side jungle."], ["Simple Wards", "When you have to pick one side to ward over the other in the early game, it’s best to do it based on whatever buff (red or blue) the enemy jungler will be clearing second because the most common ganks occur after clearing two buffs and a camp to get level 3."]],
    use: { when: "Phase de lane au mid, en début de partie, avant le niveau 3 du jungler adverse.", why: "Le mid peut être ganké des deux côtés, et le gank le plus courant arrive juste après les deux buffs.", who: "Mid laner.", how: ["Ward les rampes vers la jungle rouge de ton équipe et celle de l'équipe adverse.", "Si tu n'as qu'une ward, mets-la du côté du second buff du jungler adverse."], notWhen: "" },
  }),
  u(G, 2, {
    claim: "Selon Dignitas : contre un jungler très rapide qui gank en ligne droite (Hecarim, Rammus, Skarner, Nunu, Udyr, ou tout champion avec Prédateur), la ward dans le buisson de la rivière ne laisse pas assez de temps : ward plus loin sur son chemin, vers le dragon ou le Baron en top et bot.",
    champions: ["Hecarim", "Rammus", "Skarner", "Nunu et Willump", "Udyr"], roles: ["top", "bottom", "support", "mid"], themes: ["vision", "survie"], published: "2021-04-19", metaDependent: true,
    limits: ["Liste de champions de 2021 : leurs kits ont pu changer depuis."],
    evidence: [["Knowing What Type of Jungler They Have", "For example, warding the river bush when playing top lane on blue side is not good enough if the enemy jungler is a Hecarim."], ["Knowing What Type of Jungler They Have", "He is just too fast for that river bush ward to provide you with enough time to react to the gank that is coming. Other champions that gank in this quick linear fashion include Rammus, Skarner, Nunu, and Udyr (also any champion with Predator)."], ["Knowing What Type of Jungler They Have", "For top and bot, a good idea is to ward further into the river near the dragon or baron pit."]],
    use: { when: "Phase de lane, quand le jungler adverse est un champion très rapide qui gank en ligne droite.", why: "Il arrive trop vite pour qu'une ward dans le buisson de la rivière te laisse le temps de réagir.", who: "Laners face à Hecarim, Rammus, Skarner, Nunu, Udyr ou à un jungler avec Prédateur.", how: ["Repère en sélection si le jungler adverse gank vite et en ligne droite.", "Place ta ward plus loin dans la rivière, vers le dragon ou le Baron (top et bot).", "Au mid, couvre les deux côtés ou place-toi du côté où tu as la vision."], notWhen: "" },
  }),
  u(G, 3, {
    claim: "Selon Dignitas : contre un jungler qui devient invisible (Shaco, Evelynn, Kha'Zix, Rengar), ward entre ses camps de jungle : il ne peut pas les tuer invisible, tu vois donc son chemin, sa vie et son mana.",
    champions: ["Shaco", "Rengar"], mentions: ["Evelynn (citée « Evelyn » par l'auteur)", "Kha'Zix"], roles: ["all"], themes: ["vision", "survie", "jungle"], published: "2021-04-19", metaDependent: true,
    evidence: [["Knowing What Type of Jungler They Have", "Shaco, Evelyn, Kha’zix, and Rengar are all junglers that are potent in solo queue for their ability to stealth into your lane and assassinate you in an instant."], ["Knowing What Type of Jungler They Have", "None of these champions can clear their jungle while being invisible. Since that is the case, the best way to know where they are and what they are planning, is to ward between their jungle camps to see how they path between them."], ["Knowing What Type of Jungler They Have", "Even more importantly, you’ll be able to see their health and mana pool"]],
    use: { when: "Le jungler adverse est un champion qui devient invisible (Shaco, Evelynn, Kha'Zix, Rengar).", why: "Il ne peut pas tuer ses camps en restant invisible : entre ses camps, il est visible.", who: "Tous les postes face à un jungler qui devient invisible.", how: ["En plus des wards habituelles, place des wards entre ses camps de jungle.", "Regarde vers où il se dirige après chaque camp.", "Regarde sa vie et son mana : s'il est bas, il n'est pas une menace."], notWhen: "" },
  }),
  u(G, 4, {
    claim: "Selon Dignitas : place ta ward de début de partie vers 2 min 30 au plus tard contre un jungler qui cherche les ganks, et vers 3 min 10 contre un jungler qui farme.",
    roles: ["top", "mid", "bottom", "support"], themes: ["vision", "survie", "lane"], published: "2021-04-19", metaDependent: true, dependsOn: ["system:apparition-du-carapateur"],
    limits: ["Horaires de 2021 : l'apparition du carapateur et la vitesse des tournées ont pu changer depuis."],
    evidence: [["How to Play the First Four Minutes", "Ganking junglers tend to be looking for that gank before the Scuttle spawns after they have cleared both buffs, so the latest you should be warding to be ready for that gank is at 2:30 into the game."], ["How to Play the First Four Minutes", "Against farming junglers, a good time to ward those standard positions is around 3:10 into the game."]],
    use: { when: "Les quatre premières minutes de la phase de lane.", why: "Les premiers ganks, souvent les plus décisifs, arrivent avant 4 minutes, juste après les deux buffs.", who: "Laners (top, mid, bot).", how: ["En sélection, décide si le jungler adverse est plutôt un ganker ou un farmer.", "Contre un ganker, place ta ward avant 2:30.", "Contre un farmer, place-la vers 3:10."], notWhen: "" },
  }),
  u(G, 5, {
    claim: "Selon Dignitas : place ta ward quand ta vague te rend vulnérable, c'est-à-dire quand l'adversaire freeze devant sa tourelle ou que tu as poussé jusqu'à sa tourelle. Ne la gaspille pas quand le jungler adverse vient d'être vu de l'autre côté de la carte.",
    roles: ["top", "mid", "bottom", "support"], themes: ["vision", "vagues", "survie"], published: "2021-04-19",
    evidence: [["Warding Based on What You Know", "If your lane matchup has the lane frozen, you’re going to be vulnerable to ganks if you walk up. Or if you are pushed to their tower, you are vulnerable to ganks."], ["Warding Based on What You Know", "For example, if playing bot lane, and the enemy jungler is currently ganking top, there is absolutely no reason to ward bush for a jungle gank."]],
    use: { when: "Ta vague est freezée par l'adversaire, ou tu es poussé jusqu'à sa tourelle (ou tu vas l'être).", why: "Dans ces deux états de vague, tu es le plus exposé aux ganks.", who: "Laners et supports.", how: ["Regarde l'état de ta vague.", "Si elle est freezée chez l'adversaire ou poussée jusqu'à sa tourelle, va placer ta ward avant que le jungler arrive.", "Si le jungler adverse vient d'être vu sur une autre lane, garde ta ward pour plus tard."], notWhen: "Quand le jungler adverse vient d'être vu ailleurs, par exemple en train de ganker le top alors que tu joues bot." },
  }),
  u(G, 6, {
    claim: "Selon Dignitas : avec peu de vie ou de mana, sans Flash ou après avoir lancé toutes tes compétences, attends-toi à un gank : plus tu es vulnérable, plus il est probable.",
    roles: ["all"], themes: ["survie", "lane"], published: "2021-04-19",
    evidence: [["Warding Based on What You Know", "If you are low on health or mana, have no Flash, or recently used all your abilities, you are practically a sitting duck waiting to be pounced on."], ["Warding Based on What You Know", "The more vulnerable you are to a gank, the more you should expect a gank."]],
    use: { when: "Pendant la phase de lane, tu es bas en vie ou en mana, sans Flash, ou tu viens de lancer toutes tes compétences.", why: "Dans cet état, tu es une cible facile pour le jungler adverse.", who: "Tous les postes en lane.", how: ["Vérifie ta vie, ton mana et ton Flash.", "Si tu es vulnérable, recule et joue prudemment.", "Quand tu es en forme et bien informé, tu peux jouer plus agressif."], notWhen: "" },
  }),
  u(G, 7, {
    claim: "Selon Dignitas : quand tu n'as pas de ward, surveille ton vis-à-vis. Juste avant un gank, il change souvent d'attitude : il avance d'un coup, recule soudain ou se met à farmer passivement.",
    roles: ["all"], themes: ["survie", "lane"], published: "2021-04-19",
    evidence: [["Seeing Ganks Coming", "More often than not, when a gank is coming the first couple of seconds before you see the jungler you will see a shift in the laner’s behaviour that should indicate your incoming threat."], ["Seeing Ganks Coming", "Whether it’s aggressively walking toward you, suddenly retreating or passively CSing, there is usually a tell-tale sign of a gank that you should keep an eye out for."]],
    use: { when: "Phase de lane sans ward active.", why: "Le changement d'attitude du laner adverse précède souvent l'arrivée du jungler de quelques secondes.", who: "Tous les postes en lane.", how: ["Garde un œil sur les mouvements de ton vis-à-vis.", "S'il avance d'un coup, recule soudain ou farme passivement, recule vers ta tourelle."], notWhen: "" },
  }),
  u(G, 8, {
    claim: "Selon Dignitas : quand tu te fais ganker, bois ta potion tout de suite. Beaucoup de joueurs meurent à quelques points de vie après s'être presque échappés.",
    roles: ["all"], themes: ["survie"], published: "2021-04-19", metaDependent: true, dependsOn: ["item:Potion de soin"],
    evidence: [["Escaping Ganks", "First, perhaps most often forgotten, drink those potions!"], ["Escaping Ganks", "If you have one and are getting ganked, it’s probably the first thing you should do."]],
    use: { when: "Tu te fais ganker et tu as une potion de soin dans l'inventaire.", why: "Une potion soigne sur la durée et peut faire la différence pendant la fuite.", who: "Tous les postes.", how: ["Bois ta potion dès que le gank commence.", "Utilise ensuite ta compétence de fuite ou de contrôle."], notWhen: "" },
  }),

  // ---------- Préparer le Baron (Dignitas, 2020)
  u(B, 1, {
    claim: "Selon Dignitas : avant de lancer le Baron, compte les joueurs en vie de chaque côté et surveille les temps de réapparition adverses. Si ton jungler est mort, le Smite du jungler adverse peut vous le voler.",
    roles: ["all"], themes: ["macro", "teamfight"], published: "2020-06-28",
    evidence: [["How Many of My Teammates Are Alive?", "If your jungler is not alive, you are at risk of losing Baron to the enemy jungler's Smite if they show up to contest."], ["How Many of My Enemies Are alive?", "If your enemies are mostly dead, keep an eye on their respawn timers, since they could respawn before you defeat Baron and come to contest."]],
    use: { when: "Milieu et fin de partie, le Baron est disponible et ton équipe hésite à le lancer.", why: "Si les adversaires sont plus nombreux ou réapparaissent à temps, ils peuvent contester et gagner le combat ou voler le Baron.", who: "Toute l'équipe, en particulier le jungler.", how: ["Compte les alliés et les adversaires en vie.", "Vérifie que ton jungler est vivant pour le Smite.", "Regarde les temps de réapparition adverses avant de commencer."], notWhen: "Quand ton jungler est mort et que le jungler adverse peut venir : le risque de vol est fort." },
  }),
  u(B, 2, {
    claim: "Selon Dignitas : lance le Baron quand tes sbires assiègent une tourelle adverse au mid. L'adversaire doit alors choisir entre te contester et sauver sa tourelle, surtout si c'est une tourelle d'inhibiteur.",
    roles: ["all"], themes: ["macro", "vagues"], published: "2020-06-28",
    evidence: [["An Opportune Moment", "If you have the advantage over midlane, and your minions are sieging on the enemy's turret, then it is the perfect window of time to engage Baron. Your enemies will have to choose between stopping you or saving their turret, and this is especially effective if it is an inhibitor or an inhibitor turret."]],
    use: { when: "Le Baron est disponible et ta vague du mid est en train d'attaquer une tourelle adverse.", why: "L'adversaire doit choisir entre contester le Baron et sauver sa tourelle.", who: "Toute l'équipe.", how: ["Pousse d'abord la vague du mid jusqu'à la tourelle adverse.", "Lance le Baron pendant que les sbires attaquent la tourelle."], notWhen: "Si tu n'as pas l'avantage au mid : l'adversaire peut alors pousser sur tes tourelles pendant que tu fais le Baron." },
  }),
  u(B, 3, {
    claim: "Selon Dignitas : pendant le Baron, ton top peut pousser la lane du bas, la plus éloignée de la fosse, à condition d'avoir sa Téléportation pour rejoindre le combat.",
    roles: ["top", "all"], themes: ["macro"], published: "2020-06-28", metaDependent: true, dependsOn: ["system:Téléportation"],
    evidence: [["How Many of My Enemies Are alive?", "If you want to apply pressure during a Baron engage, you could have your top laner push the bottom lane of the map, furthest away from the Baron Pit, as long as they have Teleport available."]],
    use: { when: "Ton équipe lance le Baron et ton top a sa Téléportation disponible.", why: "La poussée de la lane du bas met la pression ailleurs, et la Téléportation permet de revenir si un combat éclate.", who: "Top laner (ou le joueur qui pousse une lane à l'écart).", how: ["Va pousser la lane du bas pendant que l'équipe fait le Baron.", "Garde ta Téléportation pour rejoindre le combat."], notWhen: "Sans Téléportation, sauf si plusieurs adversaires sont morts : l'auteur dit que tu ne pourrais pas aider ton équipe à temps." },
  }),
  u(B, 4, {
    claim: "Selon Dignitas : si un combat éclate pendant le Baron et qu'il a encore beaucoup de vie, arrête de le taper et concentre-toi sur l'équipe adverse.",
    roles: ["all"], themes: ["teamfight", "macro"], published: "2020-06-28",
    evidence: [["An Opportune Moment", "If Baron is still at high health, remove your focus from him and onto the enemy team."]],
    use: { when: "Ton équipe fait le Baron, les adversaires arrivent, et le Baron a encore beaucoup de vie.", why: "Gagner le combat d'abord donne ensuite bien plus de chances de prendre le Baron.", who: "Toute l'équipe.", how: ["Arrête de taper le Baron.", "Combats l'équipe adverse.", "Reprends le Baron après le combat, si ton équipe a encore assez de vie."], notWhen: "" },
  }),
  u(B, 5, {
    claim: "Selon Dignitas : avec le buff du Baron, pousse le plus possible sans t'engager dans des combats d'équipe : vise les tourelles et les inhibiteurs, et passe d'une lane à l'autre pour forcer l'adversaire à s'occuper des sbires.",
    roles: ["all"], themes: ["macro", "vagues"], published: "2020-06-28",
    evidence: [["An Opportune Moment", "Always prioritize destroying inhibitors over engaging in team fights once you have Baron buff, as a fight can easily turn in your enemy's favor and completely waste your efforts."], ["An Opportune Moment", "You will want to weave in and out of lanes to apply the Baron buff and force your enemy to focus the minions rather than your allies."]],
    use: { when: "Ton équipe vient de prendre le Baron et a encore de la vie et du mana.", why: "Un combat peut tourner en faveur de l'adversaire et gâcher le buff ; les sbires renforcés obligent l'adversaire à défendre.", who: "Toute l'équipe.", how: ["Pousse les vagues avec le buff, de préférence vers les inhibiteurs.", "Passe d'une lane à l'autre pour étaler la pression.", "Évite d'engager un combat d'équipe."], notWhen: "Si ton équipe a peu de vie ou de mana après le Baron : l'auteur conseille alors de rentrer à la base pour se regrouper." },
  }),
];
