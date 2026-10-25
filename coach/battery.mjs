// Batterie de tests du coach V1 sur de vrais joueurs (clé de développement : résultats privés, anonymisés).
// Pour chaque joueur tiré d'un palier (Fer → Challenger) : 30 dernières ranked avec timeline, rôle principal Mid ou Jungle,
// objectif choisi sur l'historique (parties plus anciennes), puis évaluation rejouée sur les parties suivantes, comme si le
// joueur avait suivi le coach. On relève les incohérences : cible au-delà de la référence, objectif déjà atteint au départ,
// manque de variété des objectifs, taux de réussite extrêmes, observations manquantes.
// Écrit coach/cache/battery/<palier>-<n>.json (aucun identifiant de joueur) et coach/cache/battery/rapport.json.
// Usage : node --env-file=.env coach/battery.mjs [--par-palier 3] [--parties 30]

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRiot } from "./review.mjs";
import { computeMetrics, CATALOG } from "./metrics.mjs";
import { proposeGoal, transition, evaluateGoal, prioritize } from "./goals.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const PER_TIER = arg("--par-palier", 3), GAMES = arg("--parties", 40), EVAL = 10;
const TIERS = [["IRON", "II"], ["BRONZE", "II"], ["SILVER", "II"], ["GOLD", "II"], ["PLATINUM", "II"], ["EMERALD", "II"], ["DIAMOND", "II"], ["MASTER", "I"], ["GRANDMASTER", "I"], ["CHALLENGER", "I"]];
const OUT = process.argv.includes("--serie") ? `coach/cache/battery-${process.argv[process.argv.indexOf("--serie") + 1]}` : "coach/cache/battery";
const hash = s => createHash("sha256").update(s).digest("hex").slice(0, 12);

async function playersOf(riot, tier, division) {
  const apex = ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier);
  const url = apex ? `https://euw1.api.riotgames.com/lol/league/v4/${tier.toLowerCase()}leagues/by-queue/RANKED_SOLO_5x5` : `https://euw1.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/${tier}/${division}?page=1`;
  const r = await riot(url);
  return (apex ? r.entries : r).filter(e => e.puuid).sort(() => Math.random() - 0.5);
}

// Rejoue le coach : objectif choisi avec l'historique, évalué sur les parties qui suivent
export function replay(games, references) {
  const byRole = {};
  // Rôle principal sur tous les postes, comme le coach (coach/v1/sync.mjs)
  for (const g of games) if (g.valid && g.role) byRole[g.role] = (byRole[g.role] || 0) + 1;
  const role = Object.entries(byRole).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!role) return { skipped: "ni mid ni jungle" };
  const chrono = [...games].sort((a, b) => a.start_ms - b.start_ms);
  const history = chrono.slice(0, Math.max(0, chrono.length - EVAL)).reverse(), future = chrono.slice(-EVAL);
  const cut = history[0]?.start_ms ?? 0;
  const out = { role, history: history.length, future: future.length };
  for (const [name, refs] of [["references", references], ["pedagogique", null]]) {
    const { goal, diagnostic } = proposeGoal(history, role, { references: refs, now: cut });
    if (!goal) { out[name] = { goal: null, why: diagnostic.map(d => `${d.metric} : ${d.reason}`).slice(0, 4) }; continue; }
    const active = { ...transition(goal, "active", cut) };
    const ev = evaluateGoal(active, future, cut + 1);
    const flags = [];
    const dir = goal.direction === "higher" ? 1 : -1;
    if (dir * (goal.target - goal.reference.value) > 1e-9) flags.push("cible au-delà de la référence");
    if (dir * (goal.baseline - goal.reference.value) >= 0) flags.push("déjà au niveau de la référence");
    if (goal.target === goal.baseline) flags.push("cible égale au point de départ");
    // Niveau de départ déjà au-dessus de la cible sur les parties d'évaluation (objectif trop facile)
    const fut = future.filter(g => g.valid && g.role === role).map(g => g.metrics[goal.metric].value).filter(v => v != null);
    if (fut.length >= 4 && fut.every(v => dir * (v - goal.target) >= 0)) flags.push("cible atteinte à chaque partie");
    out[name] = { metric: goal.metric, baseline: goal.baseline, target: goal.target, reference: goal.reference, score: goal.score, outcome: ev.outcome, progress: ev.goal.progress, flags,
      top3: diagnostic.filter(d => d.eligible).slice(0, 3).map(d => `${d.metric} ${d.score}`) };
  }
  // Observations manquantes par métrique (qualité des données)
  out.missing = Object.fromEntries(Object.keys(CATALOG).map(k => [k, games.filter(g => g.valid && g.role === role && g.metrics[k]?.value == null && CATALOG[k].roles.includes(role)).length]).filter(([, n]) => n));
  return out;
}

export function report(rows) {
  const done = rows.filter(r => r.references?.metric);
  const count = (f) => done.reduce((m, r) => { const k = f(r); if (k != null) m[k] = (m[k] || 0) + 1; return m; }, {});
  return {
    players: rows.length, withGoal: done.length,
    metrics: count(r => r.references.metric),
    outcomes: count(r => r.references.outcome || "en cours"),
    outcomesPedagogique: count(r => r.pedagogique?.outcome || (r.pedagogique?.metric ? "en cours" : null)),
    flags: count(r => (r.references.flags.length ? r.references.flags.join(" + ") : null)),
    byTier: rows.reduce((m, r) => { (m[r.tier] ||= []).push(r.references?.metric ? `${r.references.metric}:${r.references.outcome || "…"}` : r.skipped || "pas d'objectif"); return m; }, {}),
  };
}

async function main() {
  const key = process.env.RIOT_API_KEY?.trim();
  if (!key) throw new Error("RIOT_API_KEY absente");
  const riot = createRiot(key);
  await mkdir(OUT, { recursive: true });
  const refs = JSON.parse(await readFile("coach/cache/metric-references.json", "utf8").catch(() => "null"))?.references || null;
  const done = new Set((await readdir(OUT)).filter(f => /^[A-Z]+-\d+\.json$/.test(f)));
  for (const [tier, div] of TIERS) {
    let n = [...done].filter(f => f.startsWith(tier + "-")).length;
    if (n >= PER_TIER) continue;
    for (const e of await playersOf(riot, tier, div)) {
      if (n >= PER_TIER) break;
      try {
      const ids = await riot(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${e.puuid}/ids?queue=420&count=${GAMES}`);
      if (ids.length < 18) continue;
      // Sondage : une partie suffit à écarter un joueur qui ne joue ni mid ni jungle
      const probe = await riot(`https://europe.api.riotgames.com/lol/match/v5/matches/${ids[0]}`);
      const pos = probe.info.participants.find(p => p.puuid === e.puuid)?.teamPosition;
      if (!["MIDDLE", "JUNGLE"].includes(pos)) continue;
      const games = [];
      for (const id of ids) {
        try {
          const [m, tl] = await Promise.all([id === ids[0] ? probe : riot(`https://europe.api.riotgames.com/lol/match/v5/matches/${id}`), riot(`https://europe.api.riotgames.com/lol/match/v5/matches/${id}/timeline`).catch(() => null)]);
          const g = computeMetrics(m, tl, e.puuid);
          games.push({ ...g, match_id: hash(g.match_id || id) });
        } catch (err) { if (/clé Riot/.test(err.message)) throw err; }
      }
      const row = { tier, player: hash(e.puuid), games: games.length, ...replay(games, refs) };
      await writeFile(`${OUT}/${tier}-${n}.json`, JSON.stringify({ ...row, detail: games.map(g => ({ ...g, start_ms: g.start_ms })) }));
      n++;
      console.log(`${tier} ${n}/${PER_TIER} : ${row.role || row.skipped} · ${row.references?.metric || "pas d'objectif"} ${row.references?.baseline ?? ""} → ${row.references?.target ?? ""} (${row.references?.outcome || "…"}) ${row.references?.flags?.join(", ") || ""}`);
      } catch (err) {
        // Un joueur en échec n'arrête pas la batterie ; une clé refusée, si
        if (/clé Riot/.test(err.message)) throw err;
        console.log(`${tier} : joueur écarté (${err.message || err.code || err})`);
      }
    }
  }
  const rows = [];
  for (const f of (await readdir(OUT)).filter(f => /^[A-Z]+-\d+\.json$/.test(f))) { const { detail, ...r } = JSON.parse(await readFile(`${OUT}/${f}`, "utf8")); rows.push(r); }
  const rep = report(rows);
  await writeFile(`${OUT}/rapport.json`, JSON.stringify(rep, null, 1));
  console.log(JSON.stringify(rep, null, 1));
}

if (process.argv[1]?.endsWith("battery.mjs")) main().catch(e => { console.error(e.stack || e); process.exit(1); });
