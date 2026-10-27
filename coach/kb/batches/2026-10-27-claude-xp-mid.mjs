// Analyse par Claude Code (session du 27/10/2026) : expérience du mid, pour l'objectif « expérience à 10 min » (MIDDLE).
// Articles Dignitas déjà consultés (ISO, Zooph), règles v1.2, instructions v2. Passages copiés tels quels depuis
// le texte réellement consulté (coach/cache/text, non republié).
const u = (content, n, x) => ({
  id: `u-cl-${content.replace(/^c-/, "")}-xp${n}`,
  context: { queue: "solo", rank: "non précisé", region: "non précisé" },
  patch: { known: false }, metaDependent: false, conditions: [], limits: [], mentions: [], champions: [],
  nature: "opinion", levelContext: "non-precise", usage: "reference",
  ...x,
  evidence: x.evidence.map(([locator, passage]) => ({ content, locator, lang: "en", passage })),
});

export const units = [
  u("c-dignitas-roam-mid-all", 1, {
    claim: "Selon ISO (Dignitas) : en mid, tu peux quitter ta lane en perdant peu d'or et d'expérience, parfois rien : écrase ta vague chez l'adversaire, pars, et reviens à temps pour la vague suivante.",
    roles: ["mid"], themes: ["vagues", "lane"], published: "2022-08-17",
    evidence: [["When to Roam", "there are ways to roam without missing a whole lot or even missing anything at all."], ["When to Roam", "This gives you time to either recall after the dive, or head back to lane and get there in time for your next minion wave."], ["When to Roam", "This allows her the opportunity to create an impact on bot lane and return to mid lane without missing any gold or experience."]],
    use: { when: "Phase de lane en mid, avant de quitter ta lane.", why: "L'expérience des sbires ne se gagne qu'à côté d'eux : une vague ratée est perdue.", who: "Mids.", how: ["Écrase d'abord ta vague sous la tourelle adverse.", "Pars une fois ta vague écrasée.", "Reviens au mid avant que la vague suivante arrive chez toi."], notWhen: "" },
  }),
  u("c-dignitas-roam-leave-lane", 1, {
    claim: "Selon Zooph (Dignitas) : quand ton adversaire de mid a de l'avance et quitte sa lane, rester au mid pour farmer est le plus souvent ton meilleur choix : tu rattrapes ton retard d'or et d'expérience.",
    roles: ["mid"], themes: ["lane", "vagues"], published: "2019-05-25",
    evidence: [["When and Where to Roam", "When they have a lead like this and leave you in the Mid Lane alone, you can try to farm up and catch up to them in gold and experience."], ["When and Where to Roam", "This is not easy, but it is the best option most of the time when you are far behind."]],
    use: { when: "Ton adversaire de mid, en avance, quitte sa lane.", why: "Seul au mid, tu prends toute l'expérience des vagues sans risque.", who: "Mids en retard dans leur lane.", how: ["Préviens ton équipe qu'il est absent.", "Reste au mid et prends chaque vague.", "Ne le suis pas s'il a deux niveaux d'avance."], notWhen: "" },
  }),
];
