// Ajoute un lot de synthèses (editorial/batch.json) à data/editorial.json, après vérification du format.
// Usage : node editorial/merge.mjs

import { readFile, writeFile, unlink } from "node:fs/promises";

const FILE = "data/editorial.json";
const ed = JSON.parse(await readFile(FILE, "utf8").catch(() => '{"topics":{},"matches":{},"tournaments":{},"briefings":{}}'));
const batch = JSON.parse(await readFile("editorial/batch.json", "utf8"));
const now = new Date().toISOString();
const errors = [];
const str = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const strs = v => Array.isArray(v) && v.every(x => typeof x === "string" && x.trim());

const RULES = {
  topics: e => str(e.titre, 110) && str(e.resume, 260) && strs(e.article) && strs(e.points) && str(e.analyse, 900) && ["fort", "moyen", "faible"].includes(e.impact),
  matches: e => str(e.resume, 400) && str(e.analyse, 1200) && strs(e.cles || []),
  tournaments: e => str(e.resume, 800) && strs(e.faits_marquants) && strs(e.equipes_en_forme) && typeof e.meta_pro === "string" && strs(e.a_suivre),
  briefings: e => str(e.resume, 500) && strs(e.a_retenir) && strs(e.conseils),
};

let added = 0;
for (const [kind, check] of Object.entries(RULES)) {
  ed[kind] ||= {};
  for (const [id, entry] of Object.entries(batch[kind] || {})) {
    if (!check(entry)) { errors.push(`${kind}/${id}`); continue; }
    ed[kind][id] = { ...entry, at: now };
    added++;
  }
}

// Oublie ce qui a plus de 60 jours
for (const kind of Object.keys(RULES)) for (const [id, e] of Object.entries(ed[kind])) if ((Date.now() - new Date(e.at)) / 864e5 > 60) delete ed[kind][id];

ed.updatedAt = now;
await writeFile(FILE, JSON.stringify(ed, null, 1));
if (!errors.length) await unlink("editorial/batch.json");
console.log(`${added} synthèses ajoutées.${errors.length ? ` Rejetées (format invalide) : ${errors.join(", ")}` : ""}`);
