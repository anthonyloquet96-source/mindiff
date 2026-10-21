// Matchups, duos et profils de champions au niveau Diamant+, calculés sur l'échantillon de parties (coach/benchmarks.mjs).
// Tout est agrégé : aucune donnée de joueur. Écrit coach/cache/matchups.json (privé tant que riot.publish est faux).
//   lane[rôle][A][B]   A contre B dans le même rôle : [parties, victoires de A, somme écart de sbires à 10 min, parties avec cet écart]
//   bot[clé][A][B]     croisements de la bot lane : "support-bottom" (support A contre ADC B), "bottom-support", et duo allié "duo" (ADC A avec support B)
//   vs[A][B] / with[A][B]   A contre / avec B, tous rôles confondus : [parties, victoires de A]
//   profile[A]         profil de jeu : dégâts physiques/magiques/bruts, contrôle et encaissement par minute, victoires selon la durée
import { writeFile } from "node:fs/promises";

const DAYS = 30;
const ROLES = ["top", "jungle", "mid", "bottom", "support"];
const team = (m, r, i) => r.t ?? (i < 5 ? 100 : 200); // anciennes lignes : les 5 premiers joueurs sont l'équipe bleue

export function computeMatchups(sample) {
  const recent = sample.matches.filter(m => Date.now() - m.at <= DAYS * 864e5);
  const lane = {}, bot = { "support-bottom": {}, "bottom-support": {}, duo: {} }, vs = {}, wi = {}, prof = {};
  const cell = (o, a, b, n = 2) => ((o[a] ||= {})[b] ||= new Array(n).fill(0));
  const patches = {};
  for (const m of recent) {
    patches[m.patch] = (patches[m.patch] || 0) + 1;
    const rows = m.rows.map((r, i) => ({ ...r, t: team(m, r, i) }));
    const by = (t, role) => rows.find(r => r.t === t && r.role === role);
    for (const r of rows) {
      const foes = rows.filter(x => x.t !== r.t), mates = rows.filter(x => x.t === r.t && x !== r);
      for (const f of foes) { const c = cell(vs, r.c, f.c); c[0]++; c[1] += r.win; }
      for (const f of mates) { const c = cell(wi, r.c, f.c); c[0]++; c[1] += r.win; }
      if (r.role) {
        const opp = foes.find(x => x.role === r.role);
        if (opp) {
          const c = cell(((lane[r.role] ||= {})), r.c, opp.c, 4);
          c[0]++; c[1] += r.win;
          if (r.m?.cs10 != null && opp.m?.cs10 != null) { c[2] += r.m.cs10 - opp.m.cs10; c[3]++; }
        }
      }
      // Profil : seulement les lignes récentes qui ont le détail (dégâts, contrôle)
      const p = (prof[r.c] ||= { name: r.n, g: 0, w: 0, dmg: [0, 0, 0], cc: 0, tank: 0, min: 0, kda: [0, 0, 0], solo: 0, n2: 0, len: [[0, 0], [0, 0], [0, 0]] });
      p.g++; p.w += r.win;
      if (r.dmg && m.d) {
        p.n2++; p.min += m.d;
        r.dmg.forEach((v, i) => (p.dmg[i] += v || 0));
        p.cc += r.cc || 0; p.tank += r.tank || 0; p.solo += r.solo || 0;
        r.kda.forEach((v, i) => (p.kda[i] += v || 0));
      }
      if (m.d) { const b = m.d < 25 ? 0 : m.d <= 32 ? 1 : 2; p.len[b][0]++; p.len[b][1] += r.win; }
    }
    const [b1, s1, b2, s2] = [by(100, "bottom"), by(100, "support"), by(200, "bottom"), by(200, "support")];
    for (const [s, b] of [[s1, b2], [s2, b1]]) if (s && b) { const c = cell(bot["support-bottom"], s.c, b.c); c[0]++; c[1] += s.win; }
    for (const [b, s] of [[b1, s2], [b2, s1]]) if (s && b) { const c = cell(bot["bottom-support"], b.c, s.c); c[0]++; c[1] += b.win; }
    for (const [b, s] of [[b1, s1], [b2, s2]]) if (s && b) { const c = cell(bot.duo, b.c, s.c); c[0]++; c[1] += b.win; }
  }
  const profile = Object.fromEntries(Object.entries(prof).map(([id, p]) => {
    const tot = p.dmg[0] + p.dmg[1] + p.dmg[2] || 1;
    return [id, { name: p.name, games: p.g, wins: p.w, detail: p.n2,
      dmg: p.dmg.map(v => Math.round((v / tot) * 100)),
      ccMin: p.min ? Math.round((p.cc / p.min) * 10) / 10 : null, tankMin: p.min ? Math.round(p.tank / p.min) : null,
      soloKills: p.n2 ? Math.round((p.solo / p.n2) * 100) / 100 : null,
      kda: p.n2 ? p.kda.map(v => Math.round((v / p.n2) * 10) / 10) : null,
      byLength: p.len }];
  }));
  return { level: "Diamant et plus", platform: sample.platform, games: recent.length, days: DAYS, patches, at: new Date().toISOString(), lane, bot, vs, with: wi, profile };
}

export async function writeMatchups(sample, path = "coach/cache/matchups.json") {
  const mu = computeMatchups(sample);
  await writeFile(path, JSON.stringify(mu));
  return mu;
}
