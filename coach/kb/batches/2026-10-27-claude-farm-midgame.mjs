// Analyse par Claude Code (session du 27/10/2026) : farm après la phase de lane, pour l'objectif « farm entre 15 et 25 min ».
// Guide de bagelsen314 (Dignitas), partie « After Laning », règles v1.2, instructions v2. Passages copiés tels quels depuis
// le texte réellement consulté (coach/cache/text, non republié). Le 2e conseil sert de garde-fou : suivre l'équipe avant le farm.
const u = (n, x) => ({
  id: `u-cl-dignitas-cs-guide-${n}`,
  context: { queue: "solo", rank: "non précisé", region: "non précisé" },
  patch: { known: false }, metaDependent: false, conditions: [], limits: [], mentions: [], champions: [],
  nature: "opinion", levelContext: "non-precise", usage: "reference", roles: ["top", "mid", "bottom"], published: "2020-06-08",
  ...x,
  evidence: x.evidence.map(passage => ({ content: "c-dignitas-cs-guide", locator: "After Laning", lang: "en", passage })),
});

export const units = [
  u(6, {
    claim: "Selon bagelsen314 (Dignitas) : après la phase de lane, quand ton équipe met la pression sur la base adverse avec des vagues de sbires, pousse avec elle ou fais pareil sur une lane de côté.",
    themes: ["vagues", "macro"],
    evidence: ["CSing is not something that just stops being necessary after the laning phase.", "If your team is pressuring the enemies base with minion waves, you want to either be pushing with them or be matching them in a side lane."],
    use: { when: "Milieu de partie, ton équipe pousse des vagues vers la base adverse.", why: "Tu gagnes ton farm tout en ajoutant de la pression au même moment que ton équipe.", who: "Laners.", how: ["Regarde où poussent les vagues de ton équipe.", "Rejoins cette poussée, ou prends la vague d'une lane de côté.", "Garde le même rythme que ton équipe."], notWhen: "" },
  }),
  u(7, {
    claim: "Selon bagelsen314 (Dignitas) : après la phase de lane, quand ton équipe a une grosse avance et part sur un objectif, sois avec elle pour l'objectif, même si tu perds du farm.",
    themes: ["macro", "vagues"],
    evidence: ["If your team has large advantages and are going for objectives then you need to be in sync and extended with them for the objective.", "This might lose you farm but it is necessary for the sake of the win conditions you need to follow."],
    use: { when: "Milieu de partie, ton équipe en avance se dirige vers un objectif.", why: "L'objectif fait gagner la partie ; quelques sbires de moins, non.", who: "Laners.", how: ["Regarde la minimap : où va ton équipe ?", "Laisse la vague si elle t'éloigne de l'objectif.", "Reviens farmer une fois l'objectif pris."], notWhen: "" },
  }),
  u(8, {
    claim: "Selon bagelsen314 (Dignitas) : après la phase de lane, moins tu sais où sont les adversaires, moins tu peux t'avancer pour farmer ; sans information, replie-toi sur les camps de ton côté.",
    themes: ["vagues", "survie"],
    evidence: ["The less you know about your opponent’s movements the less you can extend for gold.", "If you need to pull back out of the opponent’s territory then you can simply fall back to camps in the same decision as if your team is lacking pressure."],
    use: { when: "Milieu de partie, plusieurs adversaires ne sont pas visibles sur la carte.", why: "Farmer loin sans vision, c'est risquer une mort qui coûte bien plus que la vague.", who: "Laners.", how: ["Compte les adversaires visibles sur la minimap.", "S'il en manque, ne prends pas la vague la plus avancée.", "Prends plutôt les camps de jungle près de ton côté."], notWhen: "" },
  }),
];
