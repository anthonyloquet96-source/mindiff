// Analyse de draft et de composition, à partir des agrégats Diamant+ (coach/matchups.mjs). Sans IA : uniquement des comptes.
// Chaque taux de victoire est donné avec sa marge d'erreur (95 %) et le nombre de parties ; sous 30 parties, pas de verdict.
// Champions désignés par leur identifiant Data Dragon (« Ahri ») côté interface, par leur numéro dans les agrégats.

export const MIN_GAMES = 30;
const ROLES = ["top", "jungle", "mid", "bottom", "support"];
const pct = x => Math.round(x * 1000) / 10;
const marginOf = (w, n) => pct(1.96 * Math.sqrt((w / n) * (1 - w / n) / n));

// Taux de victoire avec marge et verdict prudent
export function rate(cell) {
  if (!cell || cell[0] < MIN_GAMES) return { games: cell?.[0] || 0, enough: false };
  const [g, w] = cell, wr = pct(w / g), m = marginOf(w, g);
  return { games: g, enough: true, winrate: wr, margin: m, verdict: wr - m > 50 ? "favorable" : wr + m < 50 ? "défavorable" : "équilibré" };
}

// Moyennes de la population (pondérées par les parties) : pour situer une composition
function population(mu) {
  const ps = Object.values(mu.profile).filter(p => p.detail >= 10);
  const tot = ps.reduce((a, p) => a + p.detail, 0) || 1;
  const avg = k => ps.reduce((a, p) => a + (p[k] || 0) * p.detail, 0) / tot;
  return { ccMin: avg("ccMin"), tankMin: avg("tankMin") };
}
// Écart de victoires entre parties longues (> 32 min) et courtes (< 25 min) ; null si trop peu de parties
function scaling(p) {
  const [s, , l] = p?.byLength || [];
  if (!s || !l || s[0] < 20 || l[0] < 20) return null;
  return pct(l[1] / l[0] - s[1] / s[0]);
}

// Profil d'une composition : dégâts, contrôle, encaissement, moment fort ; constats seulement s'ils sont nets
export function compProfile(mu, ids) {
  const ps = ids.map(id => mu.profile[id]).filter(p => p?.detail >= 10);
  if (ps.length < 3) return { known: ps.length, enough: false };
  const pop = population(mu);
  const dmg = [0, 1, 2].map(i => Math.round(ps.reduce((a, p) => a + p.dmg[i], 0) / ps.length));
  const cc = ps.reduce((a, p) => a + p.ccMin, 0) / ps.length / pop.ccMin;
  const tank = ps.reduce((a, p) => a + p.tankMin, 0) / ps.length / pop.tankMin;
  const sc = ps.map(scaling).filter(x => x != null);
  const late = sc.length >= 3 ? Math.round((sc.reduce((a, b) => a + b, 0) / sc.length) * 10) / 10 : null;
  const notes = [];
  if (dmg[0] >= 65) notes.push({ kind: "ad", text: `Dégâts surtout physiques (${dmg[0]} %) : l'adversaire peut se protéger avec de l'armure.` });
  else if (dmg[1] >= 55) notes.push({ kind: "ap", text: `Dégâts surtout magiques (${dmg[1]} %) : l'adversaire peut se protéger avec de la résistance magique.` });
  else notes.push({ kind: "mix", text: `Dégâts mixtes (${dmg[0]} % physiques, ${dmg[1]} % magiques) : difficile à contrer avec un seul type de défense.` });
  if (cc >= 1.25) notes.push({ kind: "cc+", text: `Beaucoup de contrôles : ${Math.round(cc * 100 - 100)} % de plus qu'une équipe moyenne.` });
  else if (cc <= 0.75) notes.push({ kind: "cc-", text: `Peu de contrôles : ${Math.round(100 - cc * 100)} % de moins qu'une équipe moyenne.` });
  if (tank >= 1.2) notes.push({ kind: "tank+", text: `Équipe qui encaisse beaucoup (+${Math.round(tank * 100 - 100)} % par rapport à la moyenne).` });
  else if (tank <= 0.85) notes.push({ kind: "tank-", text: `Équipe fragile : ${Math.round(100 - tank * 100)} % d'encaissement en moins que la moyenne.` });
  if (late != null && late >= 4) notes.push({ kind: "late", text: `Plus forte en fin de partie : ses champions gagnent en moyenne ${late} points de plus au-delà de 32 min qu'avant 25 min.` });
  else if (late != null && late <= -4) notes.push({ kind: "early", text: `Plus forte en début de partie : ses champions perdent en moyenne ${-late} points au-delà de 32 min par rapport aux parties de moins de 25 min.` });
  return { known: ps.length, enough: true, dmg, cc: Math.round(cc * 100) / 100, tank: Math.round(tank * 100) / 100, late, notes };
}

// Analyse d'une draft (complète ou partielle). picks : { allies: [{role, c}], enemies: [{role, c}], me: {role, c}, pool: [c] }
export function analyzeDraft(mu, { allies = [], enemies = [], me = null, pool = [] }) {
  const out = { games: mu.games, days: mu.days, minGames: MIN_GAMES, lanes: [], bot: [], me: null, comps: {}, pool: [] };
  const at = (list, role) => list.find(p => p.role === role);
  // Duels par voie (même rôle)
  for (const role of ROLES) {
    const a = at(allies, role), e = at(enemies, role);
    if (!a?.c || !e?.c) continue;
    const cell = mu.lane[role]?.[a.c]?.[e.c];
    out.lanes.push({ role, ally: a.c, enemy: e.c, ...rate(cell), cs10: cell && cell[3] >= 20 ? Math.round((cell[2] / cell[3]) * 10) / 10 : null });
  }
  // Bot lane : chaque joueur contre les deux adversaires, et le duo allié
  const [ab, as, eb, es] = [at(allies, "bottom"), at(allies, "support"), at(enemies, "bottom"), at(enemies, "support")];
  if (as?.c && eb?.c) out.bot.push({ kind: "support-bottom", ally: as.c, enemy: eb.c, ...rate(mu.bot["support-bottom"][as.c]?.[eb.c]) });
  if (ab?.c && es?.c) out.bot.push({ kind: "bottom-support", ally: ab.c, enemy: es.c, ...rate(mu.bot["bottom-support"][ab.c]?.[es.c]) });
  if (ab?.c && as?.c) out.bot.push({ kind: "duo", ally: ab.c, enemy: as.c, ...rate(mu.bot.duo[ab.c]?.[as.c]) });
  // Mon champion face à toute la composition adverse et avec ses alliés (tous rôles) : un champion peut être fort dans une composition sans dépendre de son vis-à-vis
  if (me?.c) {
    const p = mu.profile[me.c];
    out.me = {
      c: me.c, role: me.role, overall: p ? rate([p.games, p.wins]) : { games: 0, enough: false },
      vs: enemies.filter(e => e.c).map(e => ({ c: e.c, role: e.role, ...rate(mu.vs[me.c]?.[e.c]) })),
      with: allies.filter(a => a.c && a.c !== me.c).map(a => ({ c: a.c, role: a.role, ...rate(mu.with[me.c]?.[a.c]) })),
    };
  }
  out.comps = { allies: compProfile(mu, allies.map(a => a.c).filter(Boolean)), enemies: compProfile(mu, enemies.map(e => e.c).filter(Boolean)) };
  // Pool du joueur : chaque champion contre le vis-à-vis connu, contre la composition, avec les alliés
  const role = me?.role;
  const opp = role ? at(enemies, role) : null;
  for (const c of pool) {
    const laneCell = role && opp?.c ? mu.lane[role]?.[c]?.[opp.c] : null;
    const sum = (tab, list) => list.filter(x => x.c && x.c !== c).reduce((a, x) => { const cell = tab[c]?.[x.c]; return cell ? [a[0] + cell[0], a[1] + cell[1]] : a; }, [0, 0]);
    const vsAll = sum(mu.vs, enemies), withAll = sum(mu.with, allies);
    const p = mu.profile[c];
    out.pool.push({ c, lane: laneCell ? { ...rate(laneCell) } : null, vsComp: rate(vsAll), withComp: rate(withAll), overall: p ? rate([p.games, p.wins]) : { games: 0, enough: false } });
  }
  // Classement prudent : on ne classe que sur des chiffres suffisants, le plus pessimiste d'abord (taux − marge)
  const low = r => (r?.enough ? r.winrate - r.margin : null);
  out.pool.sort((x, y) => (low(y.lane) ?? low(y.vsComp) ?? low(y.overall) ?? -1) - (low(x.lane) ?? low(x.vsComp) ?? low(x.overall) ?? -1));
  return out;
}
