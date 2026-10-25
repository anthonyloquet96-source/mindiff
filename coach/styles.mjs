// Plan de jeu par champion, mesuré sur les parties Diamant et plus (chronologies anonymisées + banc d'essai).
// Pour chaque couple champion-poste (au moins MIN_CHAMP parties) : farm, temps hors de sa lane avant 14 min,
// kills sur les autres lanes, participation aux kills, part des dégâts, objectifs, et victoires selon la durée de partie.
// Chaque trait est comparé à la moyenne du poste ; le lien avec la victoire est comparé à celui du poste
// (une partie gagnée gonfle presque toutes les statistiques : seul l'écart propre au champion compte).
// Écrit coach/cache/styles.json : privé tant que riot.publish est faux (clé de développement).
// Usage : node coach/styles.mjs [Champion|poste …]

import { readdir, readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { MIN_CHAMP } from "./situations.mjs";

const DIRS = [["coach/cache/timelines", null], ["coach/cache/bench-raw", ["DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"]]];
const POS = { TOP: "top", JUNGLE: "jungle", MIDDLE: "mid", BOTTOM: "bottom", UTILITY: "support" };

// Zones de la Faille (coordonnées de 0 à environ 14 800) : bases, puis les trois lanes
function zone({ x, y }) {
  if (x + y < 5200) return "base-bleue";
  if (x + y > 24400) return "base-rouge";
  if ((x < 2600 && y > 4000) || (y > 12300 && x < 10800) || (x < 4200 && y > 10600)) return "top";
  if ((y < 2600 && x > 4000) || (x > 12300 && y < 10800) || (x > 10600 && y < 4200)) return "bottom";
  if (Math.abs(x - y) < 2300) return "mid";
  return "jungle";
}
const LANE = { top: "top", mid: "mid", bottom: "bottom", support: "bottom" };

export function styleLines(match, timeline) {
  const info = match.info, frames = timeline.info.frames, events = frames.flatMap(f => f.events), min = info.gameDuration / 60;
  const kills = events.filter(e => e.type === "CHAMPION_KILL");
  const elite = events.filter(e => e.type === "ELITE_MONSTER_KILL" && ["DRAGON", "BARON_NASHOR"].includes(e.monsterType));
  const team = id => info.participants.find(p => p.participantId === id)?.teamId;
  return info.participants.filter(p => POS[p.teamPosition]).map(p => {
    const pid = p.participantId, role = POS[p.teamPosition], c = p.challenges || {};
    const took = e => e.killerId === pid || (e.assistingParticipantIds || []).includes(pid);
    // Temps hors de sa lane entre 3 et 14 min (ni dans sa lane, ni en base), d'après la position minute par minute
    let out = 0, seen = 0;
    if (LANE[role]) for (let m = 3; m <= 13; m++) { const pos = frames[m]?.participantFrames[pid]?.position; if (!pos) continue; seen++; const z = zone(pos); if (z !== LANE[role] && !z.startsWith("base")) out++; }
    const late = kills.filter(e => e.timestamp > 20 * 60000);
    const lateTeam = late.filter(e => team(e.killerId) === p.teamId).length;
    const objTeam = elite.filter(e => (e.killerTeamId ?? team(e.killerId)) === p.teamId);
    const f10 = frames[10]?.participantFrames[pid];
    // Adversaire direct (même poste, autre équipe) : écart de sbires à 10 min
    const opp = info.participants.find(o => o.teamPosition === p.teamPosition && o.teamId !== p.teamId);
    const o10 = opp && frames[10]?.participantFrames[opp.participantId];
    // Side lane après 20 min : sur la lane du haut ou du bas, hors base, avec au moins trois alliés à plus de 4 000 unités
    let side = 0, lateSeen = 0;
    for (let m = 20; m < frames.length - 1; m++) {
      const pf = frames[m].participantFrames, pos = pf[pid]?.position; if (!pos) continue; lateSeen++;
      const z = zone(pos);
      if ((z === "top" || z === "bottom") && info.participants.filter(a => a.teamId === p.teamId && a.participantId !== pid && pf[a.participantId]?.position && Math.hypot(pf[a.participantId].position.x - pos.x, pf[a.participantId].position.y - pos.y) > 4000).length >= 3) side++;
    }
    const early = kills.filter(e => e.timestamp < 10 * 60000);
    const teamBuildings = info.participants.filter(a => a.teamId === p.teamId).reduce((t, a) => t + (a.damageDealtToBuildings || 0), 0);
    return {
      role, champion: p.championName, win: p.win ? 1 : 0, minutes: min,
      csMin: (p.totalMinionsKilled + p.neutralMinionsKilled) / min,
      cs10: f10 ? f10.minionsKilled + f10.jungleMinionsKilled : null,
      roam: seen ? out / seen : null,
      otherLanes: role === "jungle" ? c.getTakedownsInAllLanesEarlyJungleAsLaner ?? null : c.killsOnOtherLanesEarlyJungleAsLaner ?? null,
      kp: c.killParticipation ?? null,
      dmg: c.teamDamagePercentage ?? null,
      lateKp: min >= 25 && lateTeam >= 3 ? late.filter(took).length / lateTeam : null,
      obj: objTeam.length >= 2 ? objTeam.filter(took).length / objTeam.length : null,
      vision: p.visionScore != null ? p.visionScore / min : null,
      csDiff10: f10 && o10 ? (f10.minionsKilled + f10.jungleMinionsKilled) - (o10.minionsKilled + o10.jungleMinionsKilled) : null,
      earlyTakedowns: early.filter(took).length,
      earlyDeaths: early.filter(e => e.victimId === pid).length,
      side: min >= 25 && lateSeen >= 4 ? side / lateSeen : null,
      soloKills: c.soloKills ?? null,
      buildings: teamBuildings ? (p.damageDealtToBuildings || 0) / teamBuildings : null,
      plates: events.filter(e => e.type === "TURRET_PLATE_DESTROYED" && e.killerId === pid).length,
      wards: p.wardsPlaced != null ? p.wardsPlaced / min : null,
      wardsKilled: p.wardsKilled != null ? p.wardsKilled / min : null,
    };
  });
}

const fr = (v, d) => v.toFixed(d).replace(".", ",");
const TRAITS = {
  csMin: { label: "sbires par minute", my: "ton farm", fmt: v => fr(v, 1) },
  cs10: { label: "sbires à 10 min", my: "ton farm à 10 min", fmt: v => Math.round(v) },
  // Mesures rares ou en paliers (une position par minute, peu de kills) : moyenne plutôt que médiane
  roam: { label: "temps hors de sa lane entre 3 et 14 min", my: "ton temps hors de ta lane", fmt: v => `${Math.round(v * 100)} %`, laners: true, mean: true },
  otherLanes: { label: "kills et assists sur les autres lanes avant 14 min", my: "ton nombre de kills sur les autres lanes", fmt: v => fr(v, 2), mean: true },
  kp: { label: "participation aux kills", my: "ta participation aux kills", fmt: v => `${Math.round(v * 100)} %` },
  dmg: { label: "part des dégâts de l'équipe", my: "ta part des dégâts de l'équipe", fmt: v => `${Math.round(v * 100)} %` },
  lateKp: { label: "participation aux kills après 20 min", my: "ta participation aux kills après 20 min", fmt: v => `${Math.round(v * 100)} %` },
  obj: { label: "présence aux dragons et au Baron", my: "ta présence aux dragons et au Baron", fmt: v => `${Math.round(v * 100)} %`, mean: true },
  vision: { label: "score de vision par minute", my: "ton score de vision", fmt: v => fr(v, 2) },
  csDiff10: { label: "écart de sbires avec ton adversaire direct à 10 min", my: "ton avance au farm à 10 min", fmt: v => `${v > 0 ? "+" : ""}${fr(v, 1)}`, mean: true },
  earlyTakedowns: { label: "kills et assists avant 10 min", my: "ton nombre de kills avant 10 min", fmt: v => fr(v, 1), mean: true },
  earlyDeaths: { label: "morts avant 10 min", my: "ton nombre de morts avant 10 min", fmt: v => fr(v, 1), mean: true },
  side: { label: "temps seul sur une side lane après 20 min", my: "ton temps seul en side lane", fmt: v => `${Math.round(v * 100)} %`, mean: true },
  soloKills: { label: "kills en 1 contre 1", my: "ton nombre de kills en 1 contre 1", fmt: v => fr(v, 1), mean: true },
  buildings: { label: "part des dégâts aux bâtiments de l'équipe", my: "ta part des dégâts aux tourelles", fmt: v => `${Math.round(v * 100)} %` },
  plates: { label: "plaques de tourelle prises", my: "ton nombre de plaques", fmt: v => fr(v, 1), mean: true },
  wards: { label: "wards posées par minute", my: "tes wards posées", fmt: v => fr(v, 2) },
  wardsKilled: { label: "wards détruites par minute", my: "tes wards détruites", fmt: v => fr(v, 2) },
};
// Mesures de comportement : seules à pouvoir donner un « ce qui distingue les victoires ». Les dégâts, le farm total,
// les kills, les tourelles ou les objectifs suivent surtout l'issue de la partie et ne disent pas quoi faire
const BEHAVIOR = new Set(["cs10", "csDiff10", "roam", "otherLanes", "wards", "wardsKilled", "vision", "side"]);
const val = (rows, k) => rows.map(r => r[k]).filter(v => v != null).sort((a, b) => a - b);
const q = (s, p) => s.length ? s[Math.floor(p * (s.length - 1))] : null;
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;

// Lien avec la victoire : taux de victoire de la moitié haute moins celui de la moitié basse (même champion), avec son écart-type
function contrast(rows, k) {
  const r = rows.filter(x => x[k] != null);
  if (r.length < 40) return null;
  const med = q(val(r, k), .5);
  const hi = r.filter(x => x[k] > med), lo = r.filter(x => x[k] <= med);
  if (hi.length < 15 || lo.length < 15) return null;
  const a = mean(hi.map(x => x.win)), b = mean(lo.map(x => x.win));
  return { diff: a - b, se: Math.sqrt(a * (1 - a) / hi.length + b * (1 - b) / lo.length), hi: a, lo: b };
}

function profile(rows, roleRows) {
  const traits = {};
  for (const [k, t] of Object.entries(TRAITS)) {
    if (t.laners && rows[0].role === "jungle") continue;
    const s = val(rows, k), rs = val(roleRows, k);
    if (s.length < 40 || rs.length < 100) continue;
    const sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) ** 2))); };
    const med = t.mean ? mean(s) : q(s, .5), rmed = t.mean ? mean(rs) : q(rs, .5), iqr = (t.mean ? 1.35 * sd(rs) : q(rs, .75) - q(rs, .25)) || 1e-9;
    const c = contrast(rows, k), rc = contrast(roleRows, k);
    // Écart à la moyenne du poste, en fraction de l'écart interquartile du poste (0,5 = nettement différent)
    const gap = (med - rmed) / iqr;
    // L'écart doit dépasser trois fois son incertitude (erreur type de la moyenne, ou de la médiane ≈ 1,25 fois plus)
    const gapSure = Math.abs(med - rmed) > 3 * (t.mean ? 1 : 1.25) * sd(s) / Math.sqrt(s.length);
    // Lien propre au champion : son lien avec la victoire moins celui du poste. Seuil de trois écarts-types :
    // environ 1 400 essais (couples × mesures), un seuil de deux laisserait passer une trentaine de faux liens par hasard
    const own = c && rc ? { diff: c.diff - rc.diff, se: Math.hypot(c.se, rc.se), champ: c, role: rc } : null;
    traits[k] = { label: t.label, my: t.my, n: s.length, med, rmed, value: t.fmt(med), roleValue: t.fmt(rmed), gap: Math.round(gap * 100) / 100, gapSure,
      win: own ? { champ: Math.round(own.champ.diff * 1000) / 10, role: Math.round(own.role.diff * 1000) / 10, own: Math.round(own.diff * 1000) / 10, sure: Math.abs(own.diff) > 3 * own.se } : null };
  }
  // Courbe de puissance : victoires selon la durée, comparées à celles du poste
  const curve = [["avant 25 min", 0, 25], ["25 à 32 min", 25, 32], ["après 32 min", 32, 99]].map(([label, a, b]) => {
    const r = rows.filter(x => x.minutes >= a && x.minutes < b);
    const w = r.length ? mean(r.map(x => x.win)) : null;
    return { label, n: r.length, winrate: w == null ? null : Math.round(w * 1000) / 10, se: r.length ? Math.round(Math.sqrt(w * (1 - w) / r.length) * 1000) / 10 : null };
  });
  return { n: rows.length, winrate: Math.round(mean(rows.map(r => r.win)) * 1000) / 10, traits, curve };
}

// Plan de jeu en phrases. Une ligne seulement si l'écart au poste est net (au moins 0,3 écart interquartile du poste)
// et sûr (trois fois son incertitude), ou si le lien avec la victoire est propre au champion (trois écarts-types).
// Chaque ligne garde ses chiffres ; « force » sert à n'afficher que les plus marquées.
const ROLE_PL = { top: "tops", jungle: "junglers", mid: "mids", bottom: "ADC", support: "supports" };
// name : nom affiché du champion (Data Dragon, « Kai'Sa » pour Kaisa) ; par défaut, l'identifiant
export function planLines(key, p, name = key.split("|")[0]) {
  const [, role] = key.split("|"), champ = name, T = p.traits, out = [], avg = `la moyenne des ${ROLE_PL[role]}`;
  const laner = role !== "jungle", sideRole = ["top", "mid", "bottom"].includes(role);
  const hi = (t, thr = .3) => t && t.gapSure && t.gap >= thr, lo = (t, thr = .3) => t && t.gapSure && t.gap <= -thr;
  const add = (k, t, text) => out.push({ key: k, force: Math.abs(t.gap), text });
  const D = `les Diamant+ sur ${champ}`;
  const farmRole = role !== "support";
  if (farmRole && hi(T.csMin)) add("farm", T.csMin, `Joue le farm : ${D} font ${T.csMin.value} sbires par minute, contre ${T.csMin.roleValue} pour ${avg}.`);
  if (farmRole && lo(T.csMin)) add("farm", T.csMin, `Le farm n'est pas ta priorité : ${D} font ${T.csMin.value} sbires par minute, contre ${T.csMin.roleValue} pour ${avg}.`);
  if (laner && role !== "support" && hi(T.csDiff10)) add("lane", T.csDiff10, `Gagne ta lane au farm : à 10 min, ${D} ont en moyenne ${T.csDiff10.value} sbires d'avance sur leur adversaire direct.`);
  if (laner && role !== "support" && lo(T.csDiff10)) add("lane", T.csDiff10, `Lane difficile au farm : à 10 min, ${D} ont en moyenne ${T.csDiff10.value.replace("-", "")} sbires de retard sur leur adversaire direct. Ne force pas, limite la casse.`);
  if (hi(T.earlyTakedowns)) add("tot", T.earlyTakedowns, `Agressif tôt : ${D} font ${T.earlyTakedowns.value} kills ou assists avant 10 min, contre ${T.earlyTakedowns.roleValue} pour ${avg}.`);
  else if (hi(T.earlyDeaths)) add("tot", T.earlyDeaths, `Début de partie risqué : ${D} meurent ${T.earlyDeaths.value} fois avant 10 min, contre ${T.earlyDeaths.roleValue} pour ${avg}. Joue prudemment jusqu'à tes premiers items.`);
  if (laner && T.roam && T.otherLanes && lo(T.roam, .2) && T.otherLanes.gap <= -.15) add("roam", T.roam, `Roame peu : entre 3 et 14 min, ${D} passent ${T.roam.value} du temps hors de leur lane (${T.roam.roleValue} pour ${avg}) et font ${T.otherLanes.value} kills ou assists sur les autres lanes par partie (contre ${T.otherLanes.roleValue}).`);
  if (laner && T.roam && T.otherLanes && hi(T.roam, .25) && T.otherLanes.gap >= .2) add("roam", T.roam, `Roame : entre 3 et 14 min, ${D} passent ${T.roam.value} du temps hors de leur lane (${T.roam.roleValue} pour ${avg}) et font ${T.otherLanes.value} kills ou assists sur les autres lanes par partie (contre ${T.otherLanes.roleValue}).`);
  if (!laner && hi(T.otherLanes)) add("roam", T.otherLanes, `Jungle de ganks : ${D} font ${T.otherLanes.value} kills ou assists sur les lanes avant 14 min, contre ${T.otherLanes.roleValue} pour ${avg}.`);
  if (!laner && lo(T.otherLanes)) add("roam", T.otherLanes, `Jungle de farm : ${D} font ${T.otherLanes.value} kills ou assists sur les lanes avant 14 min, contre ${T.otherLanes.roleValue} pour ${avg}. Ton avance vient de tes camps.`);
  // Fin de partie : team fight ou side lane, jamais les deux (on garde le plus marqué)
  const tf = hi(T.lateKp) ? T.lateKp : null, sp = sideRole && hi(T.side) ? T.side : null;
  if (tf && (!sp || tf.gap >= sp.gap)) add("fin", tf, `Champion de team fight : après 20 min, ${D} participent à ${tf.value} des kills de leur équipe, contre ${tf.roleValue} pour ${avg}. Sois là quand ton équipe se bat.`);
  else if (sp) add("fin", sp, `Split push : après 20 min, ${D} passent ${sp.value} du temps seuls sur une side lane, contre ${sp.roleValue} pour ${avg}. Mets la pression loin de ton équipe.`);
  else if (lo(T.lateKp)) add("fin", T.lateKp, `Moins présent dans les combats de fin de partie : après 20 min, ${D} participent à ${T.lateKp.value} des kills de leur équipe, contre ${T.lateKp.roleValue} pour ${avg}.`);
  if (laner && hi(T.soloKills, .4)) add("solo", T.soloKills, `Cherche le 1 contre 1 : ${D} font ${T.soloKills.value} kills en 1 contre 1 par partie, contre ${T.soloKills.roleValue} pour ${avg}.`);
  if (sideRole && hi(T.buildings)) add("tours", T.buildings, `Prends les tourelles : ${D} infligent ${T.buildings.value} des dégâts aux bâtiments de leur équipe, contre ${T.buildings.roleValue} pour ${avg}.`);
  if (laner && hi(T.plates)) add("plaques", T.plates, `Prends les plaques : ${D} en prennent ${T.plates.value} par partie, contre ${T.plates.roleValue} pour ${avg}.`);
  const visionRole = role === "support" || role === "jungle";
  if (visionRole && hi(T.wards)) add("vision", T.wards, `Joue la vision : ${D} posent ${T.wards.value} wards par minute, contre ${T.wards.roleValue} pour ${avg}.`);
  if (visionRole && hi(T.wardsKilled)) add("vision-", T.wardsKilled, `Nettoie la vision adverse : ${D} détruisent ${T.wardsKilled.value} wards par minute, contre ${T.wardsKilled.roleValue} pour ${avg}.`);
  if (role !== "jungle" && hi(T.obj)) add("objectifs", T.obj, `Joue les objectifs : ${D} participent à ${T.obj.value} des dragons et Barons pris par leur équipe, contre ${T.obj.roleValue} pour ${avg}.`);
  // Lien avec la victoire : une corrélation (gagner gonfle aussi les statistiques), décrite comme ce qui distingue les victoires
  const pts = v => fr(Math.abs(v), 0);
  for (const [k, t] of Object.entries(T)) if (BEHAVIOR.has(k) && t.win?.sure && t.win.own > 0) out.push({ key: `gagne-${k}`, force: t.win.own / 20, text: `Ce qui distingue les victoires sur ${champ} : ${t.label}. Au-dessus de la médiane, le taux de victoire monte de ${pts(t.win.champ)} points, contre ${pts(t.win.role)} pour ${avg}.` });
  // Tempo : parties courtes contre parties longues du même champion (la force générale du champion s'annule)
  const [early, , late] = p.curve;
  if (early.n >= 40 && late.n >= 40) {
    const d = early.winrate - late.winrate, se = Math.hypot(early.se, late.se);
    if (d > 2.5 * se) out.push({ key: "tempo", force: d / 20, text: `Fort tôt : ${fr(early.winrate, 0)} % de victoires dans les parties de moins de 25 min, ${fr(late.winrate, 0)} % au-delà de 32 min. Prends l'avantage avant que la partie s'étire.` });
    if (-d > 2.5 * se) out.push({ key: "tempo", force: -d / 20, text: `Fort en fin de partie : ${fr(late.winrate, 0)} % de victoires au-delà de 32 min, ${fr(early.winrate, 0)} % avant 25 min. Pas de panique si le début est difficile.` });
  }
  return out.sort((x, y) => y.force - x.force);
}

export async function run(only = []) {
  const lines = [];
  let games = 0;
  for (const [dir, tiers] of DIRS) {
    for (const f of (await readdir(dir).catch(() => [])).filter(f => f.endsWith(".json.gz"))) {
      let g; try { g = JSON.parse(gunzipSync(await readFile(`${dir}/${f}`)).toString()); } catch { continue; }
      if (tiers && !tiers.includes(g.tier)) continue;
      if (g.match.info.gameDuration < 900) continue;
      games++; lines.push(...styleLines(g.match, g.timeline));
    }
  }
  const byRole = {}, groups = {};
  for (const l of lines) { (byRole[l.role] ||= []).push(l); (groups[`${l.champion}|${l.role}`] ||= []).push(l); }
  const byChamp = {};
  for (const [k, rows] of Object.entries(groups)) if (rows.length >= MIN_CHAMP && (!only.length || only.includes(k))) byChamp[k] = profile(rows, byRole[rows[0].role]);
  const out = { level: "Diamant et plus", at: new Date().toISOString(), games, minChamp: MIN_CHAMP, byChamp,
    method: "Médianes du champion comparées à celles du poste (écart en part de l'écart interquartile du poste). Lien avec la victoire : moitié haute contre moitié basse du champion, moins le même écart pour le poste ; retenu au-delà de trois écarts-types (nombreux essais)." };
  if (!only.length) await writeFile("coach/cache/styles.json", JSON.stringify(out));
  return out;
}

if (process.argv[1]?.endsWith("styles.mjs")) run(process.argv.slice(2)).then(o => {
  console.log(`${o.games} parties Diamant+ · ${Object.keys(o.byChamp).length} couples champion-poste`);
  for (const [k, p] of Object.entries(o.byChamp)) {
    if (process.argv.length <= 2) continue;
    console.log(`\n== ${k} · ${p.n} parties · ${p.winrate} % de victoires`);
    for (const t of Object.values(p.traits)) console.log(`  ${t.label.padEnd(44)} ${String(t.value).padStart(6)} (poste ${t.roleValue}) écart ${t.gap > 0 ? "+" : ""}${t.gap}${t.win ? ` · victoire haut-bas ${t.win.champ} pts (poste ${t.win.role}) → propre ${t.win.own}${t.win.sure ? " ✔" : ""}` : ""}`);
    console.log("  victoires par durée : " + p.curve.map(c => `${c.label} ${c.winrate} % ±${c.se} (${c.n})`).join(" · "));
    for (const l of planLines(k, p)) console.log(`  → ${l.text}`);
  }
}, e => { console.error(e.stack); process.exit(1); });
