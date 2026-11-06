// Réussite « par hasard » d'un objectif sur 5 parties, pour chaque indicateur candidat (brainstorm du 01/11/2026).
// Même règle que le moteur (coach/goals.mjs) : départ = médiane des 20 parties précédentes au poste ; cible = 55e centile
// personnel, au moins +0,25 écart-type (MAD ×1,4826) au-dessus de la médiane dans le sens de l'indicateur ; maîtrisé si la
// cible est atteinte dans 3 des 5 parties suivantes. Ces joueurs ne suivaient aucun objectif : le taux de maîtrise obtenu
// est donc ce qu'on obtiendrait sans entraînement. Un bon candidat : fiabilité correcte (coach/stability.mjs) ET maîtrise
// par hasard nettement sous 50 %. Usage : node coach/stability-chance.mjs   (lit coach/cache/battery-raw)

import { readdir, readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { items } from "./review.mjs";
import { indicators } from "./stability.mjs";

// --dossier : autre série de parties brutes (par exemple coach/cache/battery-perso, clé personnelle)
const DIR = process.argv.includes("--dossier") ? process.argv[process.argv.indexOf("--dossier") + 1] : "coach/cache/battery-raw";
const DIRECTION = { deadShare: -1, deathsAfter25: -1, deathsTotal: -1, goldIdleShare: -1, goldUnspentAtDeath: -1, firstItemMin: -1, firstBackMin: 0, "cur.early_deaths": -1 };
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
const quantile = (a, q) => { const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };

export async function run() {
  const itemDb = await items();
  const rows = {}; // key → { tried, mastered, alreadyMet }
  let players = 0;
  for (const d of (await readdir(DIR).catch(() => [])).filter(d => /^[A-Z]+-\d+$/.test(d))) {
    const games = [];
    for (const f of (await readdir(`${DIR}/${d}`)).filter(f => f.endsWith(".json.gz"))) {
      let g; try { g = JSON.parse(gunzipSync(await readFile(`${DIR}/${d}/${f}`)).toString()); } catch { continue; }
      if (g.match.info.gameDuration < 900) continue;
      const ind = indicators(g.match, g.timeline, g.me, itemDb);
      if (ind) games.push({ ...ind, start: g.match.info.gameStartTimestamp });
    }
    const by = {}; for (const g of games) by[g.role] = (by[g.role] || 0) + 1;
    const role = Object.entries(by).sort((a, b) => b[1] - a[1])[0]?.[0];
    const chrono = games.filter(g => g.role === role).sort((a, b) => a.start - b.start);
    if (chrono.length < 20) continue;
    players++;
    const future = chrono.slice(-5), history = chrono.slice(0, -5).slice(-20);
    for (const k of Object.keys(chrono[0]).filter(k => !["role", "won", "minutes", "start"].includes(k))) {
      const dir = DIRECTION[k] ?? 1; if (dir === 0) continue;
      const base = history.map(g => g[k]).filter(v => v != null), fut = future.map(g => g[k]).filter(v => v != null);
      if (base.length < 10 || fut.length < 4) continue;
      const med = median(base), sd = 1.4826 * median(base.map(v => Math.abs(v - med))) || 0;
      const personal = quantile(base, dir > 0 ? 0.55 : 0.45);
      const step = Math.max(sd * 0.25, 1e-9);
      const target = dir > 0 ? Math.max(personal, med + step) : Math.min(personal, med - step);
      const r = (rows[k] ||= { tried: 0, mastered: 0, alreadyMet: 0, byRole: {} });
      const met = fut.filter(v => dir * (v - target) >= 0).length;
      const mastered = met >= 3 ? 1 : 0;
      r.tried++; r.mastered += mastered;
      r.alreadyMet += base.filter(v => dir * (v - target) >= 0).length / base.length;
      const br = (r.byRole[role] ||= { tried: 0, mastered: 0 }); br.tried++; br.mastered += mastered;
    }
  }
  return { players, rows };
}

if (process.argv[1]?.endsWith("stability-chance.mjs")) run().then(({ players, rows }) => {
  console.log(`${players} joueurs · maîtrise par hasard (3/5) · part des parties de départ déjà au-dessus de la cible · par poste`);
  for (const [k, r] of Object.entries(rows).sort((a, b) => a[1].mastered / a[1].tried - b[1].mastered / b[1].tried)) {
    const roles = Object.entries(r.byRole).map(([role, x]) => `${role.slice(0, 3)} ${Math.round(100 * x.mastered / x.tried)}%(${x.tried})`).join(" ");
    console.log(k.padEnd(28), `${Math.round(100 * r.mastered / r.tried)} %`.padStart(6), `(${r.tried})`.padStart(6), `déjà ${Math.round(100 * r.alreadyMet / r.tried)} %`.padStart(10), " ", roles);
  }
});
