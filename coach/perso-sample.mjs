// Échantillon Diamant+ reconstruit depuis les seules parties lues avec la clé personnelle (coach/cache/timelines-perso),
// sans nouvelle requête à Riot. Remplace, pour le test privé, l'échantillon de la clé de développement (coach/cache/riot-sample.json).
// Écrit les mêmes fichiers que coach/benchmarks.mjs, puis les copie dans worker/ pour worker/put-data.mjs :
//   benchmarks.json, champstats.json, builds.json (+ coach/cache/matchups.json)
// Décision d'Anthony (03/11) : plus aucune donnée de la clé de développement servie aux testeurs.
// Usage : node coach/perso-sample.mjs   puis   node coach/champ-references.mjs   et   node --env-file=.env worker/put-data.mjs

import { readdir, readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { writeJson } from "./lib.mjs";
import { row, compute } from "./benchmarks.mjs";
import { writeMatchups } from "./matchups.mjs";
import { computeBuilds, itemCatalog } from "./builds.mjs";

const DIR = "coach/cache/timelines-perso";
const HIGH = ["DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"];

const sample = { platform: "euw1", source: "timelines-perso", seen: [], matches: [] };
for (const f of (await readdir(DIR)).filter(f => f.endsWith(".json.gz"))) {
  let g; try { g = JSON.parse(gunzipSync(await readFile(`${DIR}/${f}`)).toString()); } catch { continue; }
  if (!HIGH.includes(g.tier)) continue;
  const m = g.match;
  if (m.info.gameDuration < 900 || (m.info.queueId && m.info.queueId !== 420)) continue;
  sample.matches.push({ at: m.info.gameStartTimestamp ?? g.at, patch: g.patch, d: Math.round(m.info.gameDuration / 6) / 10, rows: m.info.participants.map(p => row(p, m.info)) });
}

const { bench, champstats } = compute(sample);
bench.method += " Source : clé personnelle Riot (test privé).";
await writeJson("coach/cache/benchmarks.json", bench);
await writeJson("coach/cache/champstats.json", champstats);
await writeMatchups(sample);
await writeJson("coach/cache/builds.json", computeBuilds(sample, await itemCatalog(), { patch: champstats.patch }));
for (const f of ["benchmarks", "champstats", "builds"]) await writeFile(`worker/${f}.json`, await readFile(`coach/cache/${f}.json`));

const ready = Object.values(champstats.champions).filter(c => c.games >= champstats.minGames).length;
console.log(`Échantillon clé personnelle : ${sample.matches.length} parties Diamant+, ${bench.games} des 30 derniers jours, patch principal ${champstats.patch}.`);
console.log(`Fiches champions : ${ready} champion(s) avec au moins ${champstats.minGames} parties.`);
for (const [r, m] of Object.entries(bench.roles)) console.log(`  ${r} : sbires à 10 min ${m.cs10?.p50 ?? "—"} (n=${m.cs10?.n ?? 0})`);
