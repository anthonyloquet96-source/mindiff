// Classement automatique d'un article : jeu, rubrique, et signaux de fiabilité.

const GAME_RULES = [
  ["val", /\b(valorant|vct|champions tour|vlr)\b/i],
  ["cs2", /\b(counter-strike|cs2|cs:go|csgo|hltv|iem|esl pro league|blast premier|pgl major)\b/i],
  ["rl", /\b(rocket league|rlcs)\b/i],
  ["fn", /\b(fortnite|fncs)\b/i],
  ["fc", /\b(ea (sports )?fc|fc ?2[67]|ultimate team|fut champions|echampions)\b/i],
  ["lol", /\b(league of legends|lol esports|lck|lec|lpl|lcs|lcp|lfl|msi|faker|summoner'?s rift|teamfight)\b/i],
];

const TYPE_RULES = [
  ["patch", /\b(patch|hotfix|update|mise à jour|notes de patch|nerfs?|buffs?|balance|rework|pitch notes|title update|nouvel agent|new agent|new champion|nouveau champion)\b/i],
  ["meta", /\b(tier ?list|meta|best (champions?|agents?|weapons?|guns?|loadouts?|formations?|players?|cars?|builds?)|builds?|loadouts?|formations?|custom tactics|team comps?|compos?)\b/i],
  ["esport", /\b(vs\.?|beat|beats|defeat(s|ed)?|wins?|won|grand final|finals?|playoffs|semi-?finals?|quarter-?finals?|major|worlds|champions|masters|vct|rlcs|fncs|lck|lec|lpl|lcs|lcp|lfl|tournament|tournoi|roster|signs?|signed|transfer|free agency|benched|coach|qualif\w*|swiss|bracket|group stage|mvp|banned|esports?)\b/i],
];

// Articles hors sujet pour des joueurs compétitifs.
const NOISE = /\b(codes \(|redeem codes|giveaway|deals?|discount|sale|amazon|chair|headset|monitor|merch|chessboard|cosplay|tier list of (skins|outfits))\b/i;

// Termes qui signalent une info non confirmée.
const RUMOR = /\b(leak(s|ed)?|rumou?rs?|reportedly|datamin\w*|insiders?|allegedly|speculat\w*|fuite|rumeur|could be|might be|expected to)\b/i;

export function detectGame(text) {
  return GAME_RULES.find(([, re]) => re.test(text))?.[0] ?? null;
}

export function detectType(text) {
  return TYPE_RULES.find(([, re]) => re.test(text))?.[0] ?? null;
}

export const isNoise = text => NOISE.test(text);
export const isRumor = text => RUMOR.test(text);
