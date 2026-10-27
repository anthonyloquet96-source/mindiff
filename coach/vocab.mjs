// Vocabulaire des joueurs (décision d'Anthony, 27/10/2026) : les joueurs francophones disent « back », « wave », « freeze »,
// « ward », « poke »… même en Silver. Une traduction mot à mot (« rentrer à la base », « vague », « balise ») perd le sens
// et donne l'impression d'un contenu traduit à la chaîne. Ces règles remettent le jargon à l'affichage (coach/build.mjs) ;
// la base (coach/kb/units.json) et les citations sources restent intactes. Les textes officiels de Riot (« u-dd- »,
// nature « officiel ») ne sont pas touchés : c'est la traduction de Riot.
// Le site explique chaque terme au toucher (coach2.js, en tête). Gardés en français : sbires, dragon, Baron, tourelle, combat.

// [motif, remplacement] dans l'ordre : les expressions longues avant les mots seuls
export const RULES = [
  // Back (retour à la base pour acheter et se soigner)
  [/\b(?:un|le) retour (?:à|en) (?:la )?base\b/g, "un back"],
  [/\bretours (?:à|en) (?:la )?base\b/g, "backs"],
  [/\bretour (?:à|en) (?:la )?base\b/g, "back"],
  [/\b(?:rentrer|retourner|revenir) (?:à|en) (?:la )?base\b/g, "back"],
  [/\b(?:rentre|retourne|reviens) (?:à|en) (?:la )?base\b/g, "back"],
  [/\b(?:rentres|retournes) (?:à|en) (?:la )?base\b/g, "backes"],
  [/\b(?:rentrez|retournez|revenez) (?:à|en) (?:la )?base\b/g, "backez"],
  [/\b(?:rentrent|retournent|reviennent) (?:à|en) (?:la )?base\b/g, "backent"],
  [/\b(recule|reculent) pour se soigner\b/g, (_, v) => (v === "recule" ? "back" : "backent")],
  // Recall, clear, crash, dead time
  [/\b(?:un|le) rappel\b/g, "un back"], [/\brappels\b/g, "backs"], [/\brappel\b/g, "back"],
  [/\bl'évacuation de (la|ta|sa) (?:wave|vague)\b/g, "le clear de $1 wave"],
  [/\bnettoyer (la|ta|sa|leur) (?:wave|vague)\b/g, "clear $1 wave"], [/\bnettoie (la|ta|sa) (?:wave|vague)\b/g, "clear $1 wave"],
  // \b ne voit pas la frontière avant une lettre accentuée : (?<!\p{L}) à la place
  [/(?<!\p{L})écrase(r|s)? (la|ta|sa|tes|les) (waves?|vagues?)\b/gu, (_, e, d, w) => `crash${e === "s" ? "es" : ""} ${d} ${w.startsWith("vague") ? (w.endsWith("s") ? "waves" : "wave") : w}`],
  [/\b(ce|du|en|le|un) temps morts?\b/g, "$1 dead time"],
  [/\blanes? de côté(?!\p{L})/gu, m => (m.startsWith("lanes") ? "side lanes" : "side lane")],
  // Waves
  [/\bvagues latérales\b/g, "waves des side lanes"],
  [/\bvagues? de sbires\b/g, m => (m.startsWith("vagues") ? "waves" : "wave")],
  [/\bVagues?\b/g, m => (m.endsWith("s") ? "Waves" : "Wave")],
  [/\bvagues\b/g, "waves"],
  [/\bvague\b/g, "wave"],
  [/\bpoussées? lentes?\b/g, "slow push"],
  [/\bpoussées? rapides?\b/g, "fast push"],
  [/\b(?:con)?geler\b/g, "freeze"],
  [/\bgel(?!\p{L})/gu, "freeze"],
  [/\bderniers coups\b/g, "last hits"],
  [/\bdernier coup\b/g, "last hit"],
  // Lanes
  [/\bvoies? latérales?\b/g, m => (m.startsWith("voies") ? "side lanes" : "side lane")],
  [/\blignes? latérales?\b/g, m => (m.startsWith("lignes") ? "side lanes" : "side lane")],
  [/\bvoie du haut\b/g, "top lane"], [/\bvoie du milieu\b/g, "mid lane"], [/\bvoie du bas\b/g, "bot lane"],
  [/\bvoies\b/g, "lanes"], [/\bvoie\b/g, "lane"],
  [/\b(ta|sa|la|leur|ma|une|chaque|autre|même|de|en) ligne\b(?! (?:droite|de vue|de mire))/g, "$1 lane"],
  [/\b(les|des|tes|ses|leurs|autres) lignes\b/g, "$1 lanes"],
  // Vision
  [/\bbalises? de contrôle\b/g, m => (m.startsWith("balises") ? "control wards" : "control ward")],
  [/\bbalises\b/g, "wards"], [/\bbalise\b/g, "ward"], [/\bbaliser\b/g, "warder"],
  // Combat et carte
  [/\bharcèlement\b/g, "poke"], [/\bharceler\b/g, "poke"], [/\bharcèle(?:s|nt)?\b/g, "poke"], [/\bharcelez\b/g, "pokez"],
  [/\bcombats d'équipe\b/g, "teamfights"], [/\bcombat d'équipe\b/g, "teamfight"],
  [/\bune escarmouche\b/g, "un skirmish"], [/\bescarmouches\b/g, "skirmishs"], [/\bescarmouche\b/g, "skirmish"],
  [/\bcontrôle de la carte\b/g, "map control"],
  [/\benvahir\b/g, "invade"], [/\benvahi(?:s|t)\b/g, "invade"],
  [/\bplonger sous (?:la|ta|sa) tourelle\b/g, "dive"], [/\bplonger\b/g, "dive"],
  [/\b[Cc]arapateur\b/g, "Scuttle"],
  // Champions
  [/\btemps de recharge\b/g, "cooldown"],
  [/\bsorts d'invocateur\b/g, "summoners"], [/\bsort d'invocateur\b/g, "summoner"],
  [/\b(son|ton|leur|mon|votre|l')\s?ultime\b/g, (_, d) => (d === "l'" ? "l'ult" : `${d} ult`)],
  [/\bobjets\b/g, "items"], [/\bobjet\b/g, "item"],
];

export function playerVocab(text) {
  if (typeof text !== "string" || !text) return text;
  let s = text;
  for (const [re, to] of RULES) s = s.replace(re, to);
  return s;
}

// Une unité de conseil telle que publiée : énoncé et mode d'emploi au vocabulaire des joueurs ; citations inchangées
export function unitVocab(u) {
  if (u.id?.startsWith("u-dd-") || u.nature === "officiel") return u;
  const use = u.use && { ...u.use, ...Object.fromEntries(["when", "why", "who", "notWhen"].map(k => [k, playerVocab(u.use[k])])), how: (u.use.how || []).map(playerVocab) };
  return { ...u, claim: playerVocab(u.claim), ...(use ? { use } : {}) };
}
