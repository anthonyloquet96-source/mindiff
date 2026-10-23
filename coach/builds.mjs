// Build adapté à la partie : ce que les joueurs Diamant+ achètent sur un champion SELON la composition adverse.
// Tout est mesuré sur l'échantillon Diamant+ (coach/cache/riot-sample.json), rien n'est écrit à la main :
//   1. profil de chaque champion : part de dégâts physiques / magiques / bruts, contrôle infligé, dégâts encaissés,
//      part des parties où il construit des objets critiques ;
//   2. menaces d'une équipe adverse, calculées à partir de ces profils (les mêmes en direct et dans l'échantillon) :
//      « très magique » ou « très physique » (quart des équipes le plus extrême), « plusieurs tanks », « plusieurs
//      porteurs de critique », « beaucoup de contrôle » ;
//   3. pour chaque champion et chaque menace : taux d'achat de chaque objet quand la menace est présente, comparé
//      aux parties sans cette menace. Une variante n'est retenue que si l'écart est net (au moins 5 points et
//      statistiquement solide) ET que l'objet répond à la menace d'après sa description officielle (Data Dragon).
// Lancement seul (aucune requête Riot) : node coach/builds.mjs   → coach/cache/builds.json

import { readFile, writeFile } from "node:fs/promises";

const DD = "https://ddragon.leagueoflegends.com";
const MIN_GAMES = 30;

// Catégories d'objets, lues dans les statistiques et la description officielles (Data Dragon, français)
export async function itemCatalog(fetchImpl = fetch) {
  const [v] = await fetchImpl(`${DD}/api/versions.json`).then(r => r.json());
  const j = await fetchImpl(`${DD}/cdn/${v}/data/fr_FR/item.json`).then(r => r.json());
  const strip = s => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const out = {};
  for (const [id, x] of Object.entries(j.data)) {
    if (!x.maps?.["11"] || !x.gold?.purchasable) continue;
    const d = strip(x.description), s = x.stats || {};
    const boots = x.tags?.includes("Boots") && x.gold.total > 300;
    if (!boots && (x.gold.total < 2000 || x.into?.length)) continue;
    const tags = [];
    if (s.FlatArmorMod) tags.push("armure");
    if (s.FlatSpellBlockMod) tags.push("resistance-magique");
    if (/Hémorragie/i.test(d)) tags.push("anti-soins");
    if (/Les coups critiques vous infligent/i.test(d)) tags.push("anti-critique");
    if (/% de pénétration (d'armure|magique)|PV max/i.test(d)) tags.push("anti-tank");
    if (/Stase/i.test(d)) tags.push("stase");
    if (/bouclier antisorts/i.test(d)) tags.push("anti-sort");
    if (/dissipez tous les contrôles/i.test(d)) tags.push("purge");
    if (/ténacité/i.test(d)) tags.push("tenacite");
    if (s.FlatCritChanceMod) tags.push("critique");
    out[id] = { name: x.name, gold: x.gold.total, boots, tags };
  }
  return { version: v, items: out };
}

// Menaces et objets qui y répondent (la réponse doit figurer dans la description officielle de l'objet)
export const THREATS = {
  ap: { label: "Équipe adverse très magique", why: "plus de la moitié de leurs dégâts sont magiques", answers: ["resistance-magique", "anti-sort", "stase"] },
  ad: { label: "Équipe adverse très physique", why: "plus de la moitié de leurs dégâts sont physiques", answers: ["armure", "anti-critique", "stase"] },
  tanks: { label: "Plusieurs tanks en face", why: "au moins deux champions faits pour encaisser plutôt que pour infliger des dégâts", answers: ["anti-tank"] },
  crit: { label: "Plusieurs champions à coups critiques", why: "au moins deux champions qui achètent des objets à coups critiques", answers: ["anti-critique", "armure"] },
  cc: { label: "Beaucoup de contrôles adverses", why: "étourdissements, ralentissements et projections en grand nombre", answers: ["tenacite", "purge"] },
};

// 1. Profil moyen de chaque champion
function championProfiles(matches, cat) {
  const crit = new Set(Object.entries(cat.items).filter(([, x]) => x.tags.includes("critique")).map(([id]) => Number(id)));
  const acc = {};
  for (const m of matches) for (const r of m.rows) {
    if (!r.dmg || !m.d) continue;
    const a = (acc[r.c] ||= { n: 0, p: 0, m: 0, t: 0, cc: 0, tank: 0, dpm: 0, crit: 0 });
    a.n++; a.p += r.dmg[0]; a.m += r.dmg[1]; a.t += r.dmg[2]; a.cc += (r.cc || 0) / m.d; a.tank += (r.tank || 0) / m.d; a.dpm += (r.dmg[0] + r.dmg[1] + r.dmg[2]) / m.d;
    if (r.items.filter(i => crit.has(i)).length >= 2) a.crit++;
  }
  const prof = {};
  for (const [c, a] of Object.entries(acc)) {
    if (a.n < 20) continue;
    const tot = a.p + a.m + a.t || 1;
    prof[c] = { n: a.n, dmg: Math.round(tot / a.n), phys: a.p / tot, magic: a.m / tot, cc: a.cc / a.n, tank: a.tank / a.n, ratio: a.tank / (a.dpm || 1), crit: a.crit / a.n };
  }
  // Tank : encaisse beaucoup PAR RAPPORT à ce qu'il inflige (cinquième des champions au rapport le plus élevé), et au moins
  // autant que la moitié des champions. Un combattant qui encaisse et inflige beaucoup (Fiora, Tryndamere) n'est pas un tank.
  const ps = Object.values(prof);
  const at = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor((s.length - 1) * p)]; };
  const ratioCut = at(ps.map(p => p.ratio), 0.78), tankMed = at(ps.map(p => p.tank), 0.5);
  // Contrôle : valeurs hors norme plafonnées (certains effets, comme la peur ou l'aveuglement, sont comptés très largement par Riot)
  const ccCap = at(ps.map(p => p.cc), 0.95);
  for (const p of ps) { p.isTank = p.ratio >= ratioCut && p.tank >= tankMed; p.isCrit = p.crit >= 0.5; p.cc = Math.min(p.cc, ccCap); }
  return prof;
}

// 2. Menaces d'une équipe (liste de numéros de champions), d'après les profils
function teamShape(champs, prof) {
  const ps = champs.map(c => prof[c]).filter(Boolean);
  if (ps.length < 4) return null;
  const tot = ps.reduce((s, p) => s + p.dmg, 0) || 1;
  return {
    magic: ps.reduce((s, p) => s + p.dmg * p.magic, 0) / tot,
    phys: ps.reduce((s, p) => s + p.dmg * p.phys, 0) / tot,
    cc: ps.reduce((s, p) => s + p.cc, 0),
    tanks: ps.filter(p => p.isTank).length,
    crits: ps.filter(p => p.isCrit).length,
  };
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) * p)]; };
function threatsOf(shape, cuts) {
  if (!shape) return [];
  const out = [];
  if (shape.magic > cuts.magic) out.push("ap");
  if (shape.phys > cuts.phys) out.push("ad");
  if (shape.tanks >= 2) out.push("tanks");
  if (shape.crits >= 2) out.push("crit");
  if (shape.cc > cuts.cc) out.push("cc");
  return out;
}

// 3. Taux d'achat par champion, avec et sans chaque menace
export function computeBuilds(sample, cat, { patch = null } = {}) {
  const matches = sample.matches.filter(m => m.rows.some(r => r.dmg));
  const prof = championProfiles(matches, cat);
  const shapes = matches.flatMap(m => [100, 200].map(t => teamShape(m.rows.filter(r => r.t === t).map(r => r.c), prof))).filter(Boolean);
  const cuts = { magic: q(shapes.map(s => s.magic), 0.75), phys: q(shapes.map(s => s.phys), 0.75), cc: q(shapes.map(s => s.cc), 0.75) };
  const useful = new Set(Object.keys(cat.items));
  const champs = {};
  for (const m of matches) {
    if (patch && m.patch !== patch) continue;
    const th = { 100: threatsOf(teamShape(m.rows.filter(r => r.t === 200).map(r => r.c), prof), cuts), 200: threatsOf(teamShape(m.rows.filter(r => r.t === 100).map(r => r.c), prof), cuts) };
    for (const r of m.rows) {
      const c = (champs[r.c] ||= { games: 0, items: {}, by: {} });
      const its = [...new Set(r.items.map(String))].filter(i => useful.has(i));
      c.games++;
      for (const i of its) c.items[i] = (c.items[i] || 0) + 1;
      for (const k of th[r.t]) {
        const b = (c.by[k] ||= { games: 0, items: {} });
        b.games++;
        for (const i of its) b.items[i] = (b.items[i] || 0) + 1;
      }
    }
  }
  // Variantes : objet nettement plus acheté face à la menace qu'en son absence, et qui y répond (description officielle)
  const out = {};
  for (const [id, c] of Object.entries(champs)) {
    if (c.games < MIN_GAMES * 3) continue;
    const variants = {};
    for (const [k, b] of Object.entries(c.by)) {
      const nOff = c.games - b.games;
      if (b.games < MIN_GAMES || nOff < MIN_GAMES) continue;
      const list = [];
      for (const [it, nOn] of Object.entries(b.items)) {
        if (!THREATS[k].answers.some(a => cat.items[it]?.tags.includes(a))) continue;
        const pOn = nOn / b.games, pOff = ((c.items[it] || 0) - nOn) / nOff;
        const se = Math.sqrt((pOn * (1 - pOn)) / b.games + (pOff * (1 - pOff)) / nOff);
        if (pOn - pOff >= 0.05 && pOn >= 0.08 && se > 0 && (pOn - pOff) / se >= 2) list.push({ id: it, on: Math.round(pOn * 100), off: Math.round(pOff * 100) });
      }
      if (list.length) variants[k] = { games: b.games, items: list.sort((a, b2) => b2.on - b2.off - (a.on - a.off)).slice(0, 3) };
    }
    out[id] = { games: c.games, variants };
  }
  const profiles = Object.fromEntries(Object.entries(prof).map(([c, p]) => [c, { magic: Math.round(p.magic * 100) / 100, phys: Math.round(p.phys * 100) / 100, dmg: p.dmg, cc: Math.round(p.cc * 10) / 10, tank: p.isTank ? 1 : 0, crit: p.isCrit ? 1 : 0 }]));
  return { level: "Diamant et plus", at: new Date().toISOString(), patch, games: matches.length, ddVersion: cat.version, cuts, profiles, champions: out, items: cat.items,
    method: "Taux d'achat des objets par champion, avec et sans chaque menace adverse ; variante retenue si l'écart est d'au moins 5 points, statistiquement net, et si la description officielle de l'objet répond à la menace." };
}

// Conseils pour une partie : menaces de l'équipe adverse et variantes mesurées pour mon champion
export function adviseBuild(builds, myChamp, enemyChamps) {
  if (!builds?.profiles) return null;
  const shape = teamShape(enemyChamps.map(String), builds.profiles);
  const threats = threatsOf(shape, builds.cuts);
  const mine = builds.champions[String(myChamp)];
  const name = id => builds.items[id]?.name || id;
  const dmgs = Object.values(builds.profiles).map(p => p.dmg).sort((a, b) => a - b), dmgMed = dmgs[Math.floor(dmgs.length / 2)] || 0;
  const why = k => {
    const ps = enemyChamps.map(c => [c, builds.profiles[c]]).filter(([, p]) => p);
    // Seuls les champions qui infligent beaucoup de dégâts sont cités (pas un support qui en fait peu)
    const big = ([, p]) => p.dmg >= dmgMed;
    if (k === "ap") return ps.filter(([, p]) => p.magic >= 0.6).filter(big).map(([c]) => c);
    if (k === "ad") return ps.filter(([, p]) => p.phys >= 0.7).filter(big).map(([c]) => c);
    if (k === "tanks") return ps.filter(([, p]) => p.tank).map(([c]) => c);
    if (k === "crit") return ps.filter(([, p]) => p.crit).map(([c]) => c);
    if (k === "cc") return [...ps].sort((a, b) => b[1].cc - a[1].cc).slice(0, 3).map(([c]) => c);
    return [];
  };
  return {
    shape: shape && { magic: Math.round(shape.magic * 100), phys: Math.round(shape.phys * 100) },
    threats: threats.map(k => ({
      key: k, label: THREATS[k].label, why: THREATS[k].why, champions: why(k),
      measured: mine?.variants[k] ? { games: mine.variants[k].games, items: mine.variants[k].items.map(x => ({ ...x, name: name(x.id) })) } : null,
    })),
    games: mine?.games || 0, ddVersion: builds.ddVersion, patch: builds.patch,
  };
}

if (process.argv[1]?.endsWith("builds.mjs")) {
  const sample = JSON.parse(await readFile(new URL("./cache/riot-sample.json", import.meta.url), "utf8"));
  const champstats = JSON.parse(await readFile(new URL("./cache/champstats.json", import.meta.url), "utf8").catch(() => "{}"));
  const cat = await itemCatalog();
  const b = computeBuilds(sample, cat, { patch: champstats.patch || null });
  await writeFile(new URL("./cache/builds.json", import.meta.url), JSON.stringify(b));
  const withV = Object.values(b.champions).filter(c => Object.keys(c.variants).length).length;
  console.log(`Builds Diamant+ (patch ${b.patch}) : ${Object.keys(b.champions).length} champions, ${withV} avec au moins une variante mesurée. Seuils : magique ≥ ${Math.round(b.cuts.magic * 100)} %, physique ≥ ${Math.round(b.cuts.phys * 100)} %, contrôle ≥ ${b.cuts.cc.toFixed(1)} s/min.`);
}
