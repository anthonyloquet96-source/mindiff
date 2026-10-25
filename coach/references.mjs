// Job metric_references (coach V1) : médiane, MAD, p25 et p75 de chaque métrique du catalogue, par rôle,
// sur les parties Diamant+ anonymisées (coach/cache/timelines). Mêmes formules que le coach (coach/metrics.mjs).
// Une référence ne sert qu'au-delà de RULES.minRefSample observations (coach/goals.mjs) ; sinon, seuil pédagogique.
// Écrit coach/cache/metric-references.json : privé tant que riot.publish est faux (clé de développement).
// Usage : node coach/references.mjs

import { readdir, readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { computeMetrics, CATALOG, METRIC_VERSION } from "./metrics.mjs";

const DIR = "coach/cache/timelines";
const q = (s, p) => (s.length ? s[Math.floor(p * (s.length - 1))] : null);

export function summarize(values) {
  const s = values.filter(v => v != null).sort((a, b) => a - b);
  if (!s.length) return null;
  const p50 = q(s, 0.5);
  const dev = s.map(v => Math.abs(v - p50)).sort((a, b) => a - b);
  return { n: s.length, p25: q(s, 0.25), p50, p75: q(s, 0.75), mad: q(dev, 0.5) };
}

export async function run() {
  const rows = {};
  let games = 0;
  const patches = {};
  for (const f of (await readdir(DIR).catch(() => [])).filter(f => f.endsWith(".json.gz"))) {
    let g; try { g = JSON.parse(gunzipSync(await readFile(`${DIR}/${f}`)).toString()); } catch { continue; }
    let counted = false;
    for (const p of g.match.info.participants) {
      let m; try { m = computeMetrics(g.match, g.timeline, p.puuid); } catch { continue; }
      if (!m.valid) continue;
      counted = true;
      for (const [k, v] of Object.entries(m.metrics)) ((rows[m.role] ||= {})[k] ||= []).push(v.value);
      if (m.patch) patches[m.patch] = (patches[m.patch] || 0) + 1 / 10;
    }
    if (counted) games++;
  }
  const out = { metric_version: METRIC_VERSION, level: "Diamant et plus", region: "EUW", at: new Date().toISOString(), games, patches: Object.fromEntries(Object.entries(patches).map(([k, v]) => [k, Math.round(v)])), references: {} };
  for (const [role, byKey] of Object.entries(rows)) for (const [k, vals] of Object.entries(byKey)) {
    if (!CATALOG[k]?.roles.includes(role)) continue;
    const s = summarize(vals);
    if (s) (out.references[role] ||= {})[k] = { ...s, level: out.level };
  }
  await writeFile("coach/cache/metric-references.json", JSON.stringify(out));
  return out;
}

if (process.argv[1]?.endsWith("references.mjs")) run().then(o => {
  console.log(`${o.games} parties Diamant+ (${METRIC_VERSION})`);
  for (const [role, ks] of Object.entries(o.references)) console.log(role.padEnd(8), Object.entries(ks).map(([k, s]) => `${k} ${Math.round(s.p50 * 100) / 100} (n ${s.n})`).join(" · "));
}, e => { console.error(e.stack); process.exit(1); });
