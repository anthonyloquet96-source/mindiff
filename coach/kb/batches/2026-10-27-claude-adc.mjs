// Analyse par Claude Code (session du 27/10/2026) : farm et jeu de l'ADC, pour les objectifs « sbires à 10 min » en bot.
// Entretien de Spawn, ADC de Dignitas en LCS (2022), règles v1.2, instructions v2. Passages copiés tels quels depuis
// le texte réellement consulté (coach/cache/text, non republié). Conseils d'objets écartés (dépendent du patch).
const u = (content, n, x) => ({
  id: `u-cl-${content.replace(/^c-/, "")}-${n}`,
  context: { queue: "solo", rank: "pro (ADC de LCS)", region: "NA" },
  patch: { known: false }, metaDependent: false, conditions: [], limits: [], mentions: [], champions: [],
  nature: "opinion", levelContext: "pro", usage: "reference",
  ...x,
  evidence: x.evidence.map(([locator, passage]) => ({ content, locator, lang: "en", passage })),
});
const P = "c-dignitas-adc-spawn";

export const units = [
  u(P, 1, {
    claim: "Selon Teatones (Dignitas), dans son guide avec Spawn : entraîne ton farm d'ADC dans l'outil d'entraînement en visant 100 sbires à 10 minutes, puis ajoute un bot débutant en partie personnalisée pour farmer tout en échangeant.",
    roles: ["bottom"], themes: ["lane", "methode"], published: "2022-10-26", levelContext: "non-precise", context: { queue: "solo", rank: "non précisé", region: "non précisé" },
    evidence: [["Core Skills of the Bot Lane Role", "Your goal during this exercise is to last hit Minions and reach the 100cs mark at 10 minutes, the general golden standard of good farming."], ["Core Skills of the Bot Lane Role", "up the challenge by going into a Custom Game and adding a Beginner Bot to the routine."]],
    use: { when: "Hors partie, pour progresser sur ton farm en bot.", why: "Le farm doit devenir automatique avant d'ajouter les échanges.", who: "ADC.", how: ["Dans l'outil d'entraînement, farme 10 minutes en bot.", "Compte tes sbires à 10:00 et vise 100.", "Ensuite, ajoute un bot débutant et farme en l'empêchant de farmer."], notWhen: "" },
  }),
  u(P, 2, {
    claim: "Selon Spawn (ADC de LCS) : quand tu es en retard, joue pour le farm et pour ne pas mourir ; vise ta montée en puissance à deux ou trois objets plutôt que des combats risqués.",
    roles: ["bottom"], themes: ["lane", "survie"], published: "2022-10-26",
    evidence: [["Playing With a Lead and Coming back from Defeat", "When you’re behind, you’re obviously playing for farm."], ["Playing With a Lead and Coming back from Defeat", "But, besides farming, you’re really trying not to die."]],
    use: { when: "Ta lane ou ton équipe est en retard.", why: "Un ADC dépend de ses objets : le farm l'y amène plus sûrement que des combats perdus.", who: "ADC.", how: ["Prends les sbires que tu peux prendre en sécurité.", "Évite les combats où tu es en infériorité.", "Garde ta position près de ton équipe et dans la vision."], notWhen: "" },
  }),
  u(P, 3, {
    claim: "Selon Spawn (ADC de LCS) : en tant qu'ADC, adapte ton style à celui de ton support plutôt que d'attendre qu'il s'adapte à toi : vous devez viser la même chose.",
    roles: ["bottom"], themes: ["lane"], published: "2022-10-26",
    evidence: [["Misconceptions about the ADC/Bot Lane Role", "you, as the ADC, have to change your playstyle."], ["Misconceptions about the ADC/Bot Lane Role", "So, you really have to adapt to what your lane partner wants to do because it’s important for you both to be trying for the same things."]],
    use: { when: "Dès l'écran de chargement, en voyant le champion de ton support.", why: "Un duo qui ne vise pas la même chose perd ses échanges.", who: "ADC.", how: ["Regarde le style de ton support : engage ou protection.", "Avec un support d'engage, prépare-toi à suivre ses entrées.", "Avec un support de protection, joue les échanges qu'il te permet."], notWhen: "" },
  }),
  u(P, 4, {
    claim: "Selon Spawn (ADC de LCS) : quand tu as l'avance en ADC, mets la pression sur les tourelles et va tôt au dragon pour aider à le prendre vite, en restant près de ton équipe et dans la vision.",
    roles: ["bottom"], themes: ["macro"], published: "2022-10-26",
    evidence: [["Playing With a Lead and Coming back from Defeat", "with a lead as a fed ADC, you’re looking to knock out turrets and apply consistent lane pressure. Rotate to Dragon early and help poke or take the objective quickly."]],
    use: { when: "Milieu de partie, avec une avance en kills ou en or.", why: "Tes dégâts constants sont faits pour les tourelles et les objectifs.", who: "ADC en avance.", how: ["Pousse ta vague et frappe la tourelle.", "Va au dragon avant qu'il apparaisse.", "Reste près de tes alliés et dans les zones éclairées."], notWhen: "" },
  }),
];
