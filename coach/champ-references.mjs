// Repères par champion et par poste (onglet Champions du coach, test privé) : médiane et quartiles de chaque métrique du catalogue
// chez les joueurs Diamant et plus qui jouent ce champion à ce poste. Sources (cache privé, parties anonymisées) :
// coach/cache/timelines-perso (Diamant à Challenger, clé personnelle ; plus de données de la clé de développement depuis le 03/11).
// Décision d'Anthony (27/10, redite le 31/10) : comme les repères par rang, ces données servent uniquement au test privé. Le fichier
// worker/champrefs.json est ignoré par git et embarqué dans le Worker au déploiement, servi aux seuls testeurs connectés.
// Un couple champion + poste n'est gardé qu'à partir de MIN parties ; chaque métrique, à partir de MIN observations.
// Usage : node coach/champ-references.mjs

import { readdir, readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { computeMetrics, CATALOG, METRIC_VERSION } from "./metrics.mjs";
import { summarize } from "./references.mjs";

export const MIN = 200;
const DIRS = ["coach/cache/timelines-perso"]; // clé personnelle seulement depuis le 03/11
const HIGH = ["DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];

export async function run() {
  const rows = {}, patches = {}, platforms = {};
  let games = 0;
  for (const dir of DIRS) for (const f of (await readdir(dir).catch(() => [])).filter(f => f.endsWith(".json.gz"))) {
    let g; try { g = JSON.parse(gunzipSync(await readFile(`${dir}/${f}`)).toString()); } catch { continue; }
    if (!HIGH.includes(g.tier)) continue;
    games++;
    const v = g.match.info.gameVersion?.split(".").slice(0, 2).join(".");
    if (v) patches[v] = (patches[v] || 0) + 1;
    platforms[g.platform || "euw1"] = (platforms[g.platform || "euw1"] || 0) + 1;
    for (const p of g.match.info.participants) {
      let m; try { m = computeMetrics(g.match, g.timeline, p.puuid); } catch { continue; }
      if (!m.valid || !m.champion || !m.role) continue;
      const r = (rows[`${m.champion}|${m.role}`] ||= { n: 0, wins: 0, metrics: {} });
      r.n++; r.wins += m.won ? 1 : 0;
      for (const [k, x] of Object.entries(m.metrics)) if (x.value != null && CATALOG[k]?.roles.includes(m.role)) (r.metrics[k] ||= []).push(x.value);
    }
  }
  const champs = {};
  for (const [key, r] of Object.entries(rows)) {
    if (r.n < MIN) continue;
    const metrics = {};
    for (const [k, vals] of Object.entries(r.metrics)) { const s = summarize(vals); if (s && s.n >= MIN) metrics[k] = { n: s.n, p25: s.p25, p50: s.p50, p75: s.p75 }; }
    champs[key] = { n: r.n, winrate: Math.round(1000 * r.wins / r.n) / 10, metrics };
  }
  const out = { metric_version: METRIC_VERSION, level: "Diamant+", at: new Date().toISOString(), games, min: MIN, patches, platforms, champs };
  await writeFile("worker/champrefs.json", JSON.stringify(out));
  return { ...out, pairs: Object.keys(rows).length };
}

if (process.argv[1]?.endsWith("champ-references.mjs")) run().then(o => {
  console.log(`${o.games} parties Diamant+ · ${Object.keys(o.champs).length} couples champion + poste gardés (au moins ${o.min} parties) sur ${o.pairs}`);
  for (const k of ["Ahri|MIDDLE", "Jinx|BOTTOM", "LeeSin|JUNGLE", "Thresh|UTILITY", "Darius|TOP"]) {
    const c = o.champs[k]; console.log(k.padEnd(16), c ? `${c.n} parties · sbires à 10 min p50 ${c.metrics.cs_at_10?.p50 ?? "—"} · vision/min p50 ${c.metrics.vision_per_min?.p50?.toFixed?.(2) ?? "—"}` : "—");
  }
});
