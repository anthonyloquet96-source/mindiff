// Repères par rang (test privé du coach V1) : médiane, quartiles et MAD de chaque métrique du catalogue, par rang et par poste.
// Sources (cache privé, parties anonymisées) : coach/cache/bench-raw (160 parties par rang, du Fer au Challenger),
// coach/cache/timelines (Diamant à Challenger, clé de développement) et coach/cache/timelines-perso (Master+, clé personnelle).
// Pour un rang, on garde la source au plus grand échantillon ; la clé personnelle passe en premier dès 200 observations.
// Décision d'Anthony (27/10) : ces repères servent uniquement au test privé, sur invitation (lus par le Worker dans
// Supabase, jamais publiés sur le site public). Écrit coach/cache/metric-references-tiers.json ; --upload les envoie à Supabase.
// Usage : node --env-file=.env coach/references-tiers.mjs [--upload]

import { readdir, readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { computeMetrics, CATALOG, METRIC_VERSION } from "./metrics.mjs";
import { summarize } from "./references.mjs";

export const TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];
const SOURCES = [["timelines-perso", "coach/cache/timelines-perso"], ["timelines", "coach/cache/timelines"], ["bench-raw", "coach/cache/bench-raw"]];
const MIN = 200;
// Décision d'Anthony (28/10) : les repères Maître et plus (cible des joueurs Diamant+) mélangent la Corée, l'EUW et l'Amérique du Nord.
// Pour ces paliers, toutes les sources sont réunies au lieu d'en choisir une.
const APEX = ["MASTER", "GRANDMASTER", "CHALLENGER"];

async function rowsOf(dir) {
  const rows = {}, plat = {}; // tier → role → metric → valeurs ; tier → serveur → parties
  for (const f of (await readdir(dir).catch(() => [])).filter(f => f.endsWith(".json.gz"))) {
    let g; try { g = JSON.parse(gunzipSync(await readFile(`${dir}/${f}`)).toString()); } catch { continue; }
    if (!TIERS.includes(g.tier)) continue;
    ((plat[g.tier] ||= {})[g.platform || "euw1"] = (plat[g.tier][g.platform || "euw1"] || 0) + 1);
    for (const p of g.match.info.participants) {
      let m; try { m = computeMetrics(g.match, g.timeline, p.puuid); } catch { continue; }
      if (!m.valid) continue;
      for (const [k, v] of Object.entries(m.metrics)) if (v.value != null && CATALOG[k]?.roles.includes(m.role)) (((rows[g.tier] ||= {})[m.role] ||= {})[k] ||= []).push(v.value);
    }
  }
  return { rows, plat };
}

export async function run({ upload = false } = {}) {
  const out = { metric_version: METRIC_VERSION, region: "EUW", at: new Date().toISOString(), references: {} };
  const apex = {}; out.platforms = {};
  for (const [source, dir] of SOURCES) {
    const { rows, plat } = await rowsOf(dir);
    for (const [t, c] of Object.entries(plat)) for (const [pf, n] of Object.entries(c)) (out.platforms[t] ||= {})[pf] = (out.platforms[t][pf] || 0) + n;
    for (const t of APEX) for (const [role, byKey] of Object.entries(rows[t] || {})) for (const [k, vals] of Object.entries(byKey)) (((apex[t] ||= {})[role] ||= {})[k] ||= []).push(...vals);
    for (const [tier, byRole] of Object.entries(rows)) for (const [role, byKey] of Object.entries(byRole)) for (const [k, vals] of Object.entries(byKey)) {
      if (APEX.includes(tier)) continue;
      const s = summarize(vals), cur = out.references[tier]?.[role]?.[k];
      // Ordre des sources = priorité : une source plus loin dans la liste ne remplace que si l'actuelle est sous le seuil et plus petite
      if (s && (!cur || (cur.n < MIN && s.n > cur.n))) ((out.references[tier] ||= {})[role] ||= {})[k] = { ...s, source };
    }
  }
  for (const [tier, byRole] of Object.entries(apex)) for (const [role, byKey] of Object.entries(byRole)) for (const [k, vals] of Object.entries(byKey)) {
    const s = summarize(vals); if (s) ((out.references[tier] ||= {})[role] ||= {})[k] = { ...s, source: "kr+euw1+na1" };
  }
  await writeFile("coach/cache/metric-references-tiers.json", JSON.stringify(out));
  if (upload) {
    const body = [];
    for (const [tier, byRole] of Object.entries(out.references)) for (const [role, byKey] of Object.entries(byRole)) for (const [metric, r] of Object.entries(byKey))
      body.push({ role, metric, metric_version: METRIC_VERSION, level: tier, region: "EUW", n: r.n, p25: r.p25, p50: r.p50, p75: r.p75, mad: r.mad, computed_at: out.at });
    const key = process.env.SUPABASE_SERVICE_KEY.trim();
    const r = await fetch(`${process.env.SUPABASE_URL.trim()}/rest/v1/metric_references?on_conflict=role,metric,metric_version,level,region`, {
      method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`Supabase ${r.status} ${await r.text()}`);
    out.uploaded = body.length;
  }
  return out;
}

if (process.argv[1]?.endsWith("references-tiers.mjs")) run({ upload: process.argv.includes("--upload") }).then(o => {
  for (const t of TIERS) {
    const r = o.references[t];
    if (!r) { console.log(t, "—"); continue; }
    const cs = r.BOTTOM?.cs_at_10, src = [...new Set(Object.values(r).flatMap(x => Object.values(x).map(y => y.source)))].join(",");
    console.log(t.padEnd(12), "ADC sbires@10 p50", cs?.p50 ?? "—", "n", cs?.n ?? 0, "|", src, "|", JSON.stringify(o.platforms[t] || {}));
  }
  if (o.uploaded) console.log("envoyé à Supabase :", o.uploaded, "lignes");
});
