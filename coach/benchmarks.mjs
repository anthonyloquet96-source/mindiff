// Référence Diamant+ par rôle pour le bilan des parties (coach/review.mjs) : quartiles de chaque indicateur,
// calculés sur les 10 joueurs de parties classées solo récentes tirées des ligues Diamant à Challenger.
// Seuls des agrégats sont gardés (aucun identifiant de joueur). Reste dans le cache privé tant que riot.publish est faux.
// Usage : node --env-file=.env coach/benchmarks.mjs [--matches 120]

import { P, readJson, writeJson } from "./lib.mjs";
import { metricsOf, POS, METRICS } from "./review.mjs";

const wait = ms => new Promise(r => setTimeout(r, ms));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
async function riot(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await wait(1250); // clé de développement : 100 requêtes par 2 minutes
    const r = await fetch(url, { headers: { "X-Riot-Token": process.env.RIOT_API_KEY.trim() } });
    if (r.ok) return r.json();
    if (r.status === 429) { await wait((Number(r.headers.get("retry-after")) || 10) * 1000); continue; }
    if (r.status >= 500) { await wait(3000); continue; }
    throw new Error(`HTTP ${r.status} sur ${url.replace(/\?.*/, "")}`);
  }
  throw new Error("API Riot indisponible");
}
const q = (sorted, p) => { const i = (sorted.length - 1) * p; const lo = Math.floor(i); return Math.round((sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo)) * 100) / 100; };

export async function run() {
  if (!process.env.RIOT_API_KEY?.trim()) return ["· RIOT_API_KEY absente."];
  const config = await readJson(P.config);
  const R = config.riot;
  const want = arg("matches", 120);
  const tiers = [["challengerleagues", null], ["grandmasterleagues", null], ["masterleagues", null], ["DIAMOND", "I"], ["DIAMOND", "II"], ["DIAMOND", "III"], ["DIAMOND", "IV"]];
  const players = [];
  for (const [t, div] of tiers) {
    const entries = div ? await riot(`https://${R.platform}.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/DIAMOND/${div}?page=1`) : (await riot(`https://${R.platform}.api.riotgames.com/lol/league/v4/${t}/by-queue/RANKED_SOLO_5x5`)).entries;
    players.push(...entries.sort(() => Math.random() - 0.5).slice(0, Math.ceil(want / tiers.length / 2) + 2));
  }
  const ids = new Set();
  for (const p of players.sort(() => Math.random() - 0.5)) {
    if (ids.size >= want) break;
    for (const id of await riot(`https://${R.region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${p.puuid}/ids?queue=420&count=2`)) ids.add(id);
  }
  const rows = {}, patches = {};
  let games = 0;
  for (const id of [...ids].slice(0, want)) {
    const m = await riot(`https://${R.region}.api.riotgames.com/lol/match/v5/matches/${id}`).catch(() => null);
    if (!m || m.info.gameDuration < 900) continue; // parties écourtées : non représentatives
    if (Date.now() - m.info.gameStartTimestamp > 30 * 864e5) continue; // joueurs inactifs : parties d'anciens patchs
    games++;
    const patch = m.info.gameVersion.split(".").slice(0, 2).join(".");
    patches[patch] = (patches[patch] || 0) + 1;
    for (const p of m.info.participants) {
      const role = POS[p.teamPosition];
      if (!role) continue;
      const mx = metricsOf(p, m.info.gameDuration / 60);
      for (const [k, v] of Object.entries(mx)) if (v != null && METRICS[k]) ((rows[role] ||= {})[k] ||= []).push(v);
    }
  }
  const roles = {};
  for (const [role, ms] of Object.entries(rows)) {
    roles[role] = {};
    for (const [k, vals] of Object.entries(ms)) { const s = vals.sort((a, b) => a - b); roles[role][k] = { n: s.length, p25: q(s, 0.25), p50: q(s, 0.5), p75: q(s, 0.75) }; }
  }
  const patch = Object.entries(patches).sort((a, b) => b[1] - a[1])[0]?.[0];
  const out = { level: "Diamant et plus", platform: R.platform, queue: "classée solo", games, patches, patch, at: new Date().toISOString(), method: "Joueurs tirés au hasard en Challenger, Grand Maître, Maître et Diamant I à IV ; 2 dernières parties classées solo de chacun ; parties de plus de 15 min ; les 10 joueurs de chaque partie, classés par rôle.", roles };
  await writeJson("coach/cache/benchmarks.json", out);
  return [`Référence Diamant+ : ${games} parties (${Object.entries(patches).map(([p, n]) => `${p} : ${n}`).join(", ")}).`, ...Object.entries(roles).map(([r, m]) => `  ${r} : sbires à 10 min ${m.cs10?.p50 ?? "—"}, morts/30 min ${m.deaths30?.p50}, vision/min ${m.visionMin?.p50} (n=${m.deaths30?.n})`)];
}

if (process.argv[1]?.endsWith("benchmarks.mjs")) run().then(l => console.log(l.join("\n")), e => { console.error(e.message); process.exit(1); });
