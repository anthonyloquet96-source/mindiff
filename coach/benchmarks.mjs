// Échantillon Diamant+ (parties classées solo récentes, Challenger à Diamant IV), accumulé d'un lancement à l'autre.
// Il produit, dans le cache privé (non publié tant que riot.publish est faux) :
//   coach/cache/benchmarks.json  quartiles de chaque indicateur par rôle (bilan des parties, coach/review.mjs)
//   coach/cache/champstats.json  par champion : rôles, taux de victoire, objets, runes, sorts (fiches, partie en cours)
// Seuls des agrégats et des empreintes de parties sont gardés : aucun identifiant de joueur.
// Usage : node --env-file=.env coach/benchmarks.mjs [--matches 120]

import { writeFile } from "node:fs/promises";
import { P, readJson, writeJson, sha256 } from "./lib.mjs";
import { writeMatchups } from "./matchups.mjs";
import { computeBuilds, itemCatalog } from "./builds.mjs";
import { metricsOf, POS, METRICS } from "./review.mjs";

const wait = ms => new Promise(r => setTimeout(r, ms));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const SAMPLE = "coach/cache/riot-sample.json";
const DAYS = 30; // au-delà, la partie sort de l'échantillon (méta et patchs ont changé)
let used = 0;
async function riot(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await wait(1500); // clé de développement : 100 requêtes par 2 minutes, dont 20 laissées à l'application
    used++;
    const r = await fetch(url, { headers: { "X-Riot-Token": process.env.RIOT_API_KEY.trim() } });
    if (r.ok) return r.json();
    if (r.status === 429) { await wait((Number(r.headers.get("retry-after")) || 10) * 1000); continue; }
    if (r.status >= 500) { await wait(3000); continue; }
    throw Object.assign(new Error(`HTTP ${r.status} sur ${url.replace(/\?.*/, "")}`), { status: r.status });
  }
  throw new Error("API Riot indisponible");
}
const q = (sorted, p) => { const i = (sorted.length - 1) * p; const lo = Math.floor(i); return Math.round((sorted[lo] + (sorted[Math.ceil(i)] - sorted[lo]) * (i - lo)) * 100) / 100; };

// Ligne compacte par joueur : de quoi calculer références et fiches, sans identifiant
// t : équipe (matchups, compositions) ; dmg : dégâts aux champions physiques/magiques/bruts ; cc : secondes de contrôle infligées ;
// tank : dégâts subis + atténués ; heal : soins prodigués (servira la menace « soins » une fois l'échantillon renouvelé) ; k/d/a et éliminations en solo : profil du champion, jamais du joueur
function row(p, info) {
  const style = p.perks?.styles || [];
  return {
    role: POS[p.teamPosition] || null, c: p.championId, n: p.championName, win: p.win ? 1 : 0, t: p.teamId,
    dmg: [p.physicalDamageDealtToChampions, p.magicDamageDealtToChampions, p.trueDamageDealtToChampions], cc: p.timeCCingOthers ?? null,
    tank: (p.totalDamageTaken || 0) + (p.damageSelfMitigated || 0), heal: p.totalHeal ?? null, kda: [p.kills, p.deaths, p.assists], solo: p.challenges?.soloKills ?? null,
    m: metricsOf(p, info.gameDuration / 60),
    items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5].filter(Boolean),
    ks: style[0]?.selections?.[0]?.perk || null, prim: style[0]?.style || null, sec: style[1]?.style || null,
    spells: [p.summoner1Id, p.summoner2Id].sort((a, b) => a - b),
  };
}

export function compute(sample) {
  const recent = sample.matches.filter(m => Date.now() - m.at <= DAYS * 864e5);
  const patches = {};
  for (const m of recent) patches[m.patch] = (patches[m.patch] || 0) + 1;
  const rows = recent.flatMap(m => m.rows);
  const byRole = {};
  for (const r of rows) if (r.role) for (const [k, v] of Object.entries(r.m)) if (v != null && METRICS[k]) ((byRole[r.role] ||= {})[k] ||= []).push(v);
  const roles = {};
  for (const [role, ms] of Object.entries(byRole)) {
    roles[role] = {};
    for (const [k, vals] of Object.entries(ms)) { const s = vals.sort((a, b) => a - b); roles[role][k] = { n: s.length, p25: q(s, 0.25), p50: q(s, 0.5), p75: q(s, 0.75) }; }
  }
  const patch = Object.entries(patches).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const bench = { level: "Diamant et plus", platform: sample.platform, queue: "classée solo", games: recent.length, patches, patch, at: new Date().toISOString(), days: DAYS, roles,
    method: `Joueurs tirés au hasard en Challenger, Grand Maître, Maître et Diamant I à IV ; parties classées solo de plus de 15 min des ${DAYS} derniers jours ; les 10 joueurs de chaque partie, classés par rôle.` };
  // Fiches champions : uniquement le patch le plus joué de l'échantillon (les objets et runes changent d'un patch à l'autre)
  const champs = {};
  const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1].g - a[1].g).slice(0, n).map(([k, v]) => ({ id: k, games: v.g, wins: v.w }));
  for (const m of recent) {
    for (const r of m.rows) {
      const c = (champs[r.c] ||= { name: r.n, games: 0, wins: 0, roles: {}, rolesAll: {}, items: {}, ks: {}, trees: {}, spells: {}, byRole: {} });
      c.rolesAll[r.role] = (c.rolesAll[r.role] || 0) + 1; // rôles : tous patchs récents (sert à deviner les rôles en direct)
      if (m.patch !== patch) continue;
      c.games++; c.wins += r.win;
      if (r.role) c.roles[r.role] = (c.roles[r.role] || 0) + 1;
      const add = (o, k) => { if (k == null) return; o[k] ||= { g: 0, w: 0 }; o[k].g++; o[k].w += r.win; };
      for (const it of new Set(r.items)) add(c.items, it);
      add(c.ks, r.ks); add(c.trees, `${r.prim}-${r.sec}`); add(c.spells, r.spells.join("-"));
      // Même relevé par rôle : un Pantheon support ne se construit pas comme un Pantheon top
      if (r.role) {
        const b = (c.byRole[r.role] ||= { games: 0, wins: 0, items: {}, ks: {}, trees: {}, spells: {} });
        b.games++; b.wins += r.win;
        for (const it of new Set(r.items)) add(b.items, it);
        add(b.ks, r.ks); add(b.trees, `${r.prim}-${r.sec}`); add(b.spells, r.spells.join("-"));
      }
    }
  }
  const champstats = { level: "Diamant et plus", patch, at: bench.at, minGames: 30, champions: Object.fromEntries(Object.entries(champs).map(([id, c]) => [id, { name: c.name, games: c.games, wins: c.wins, roles: c.roles, rolesAll: c.rolesAll, items: top(c.items, 12), keystones: top(c.ks, 3), trees: top(c.trees, 3), spells: top(c.spells, 3),
    byRole: Object.fromEntries(Object.entries(c.byRole).filter(([, b]) => b.games >= 10).map(([role, b]) => [role, { games: b.games, wins: b.wins, items: top(b.items, 30), keystones: top(b.ks, 8), trees: top(b.trees, 3), spells: top(b.spells, 3) }])) }])) };
  return { bench, champstats };
}

export async function run() {
  if (!process.env.RIOT_API_KEY?.trim()) return ["· RIOT_API_KEY absente."];
  const config = await readJson(P.config);
  const R = config.riot;
  const want = arg("matches", 120);
  const sample = await readJson(SAMPLE, { platform: R.platform, seen: [], matches: [] });
  sample.matches = sample.matches.filter(m => Date.now() - m.at <= DAYS * 864e5);
  const seen = new Set(sample.seen);
  const tiers = [["challengerleagues", null], ["grandmasterleagues", null], ["masterleagues", null], ["DIAMOND", "I"], ["DIAMOND", "II"], ["DIAMOND", "III"], ["DIAMOND", "IV"]];
  // Plusieurs pages par division pour les longues collectes (205 joueurs par page)
  const pages = Math.min(8, Math.max(1, Math.ceil(want / 1500)));
  const players = [];
  // Sauvegarde compacte et régulière : une collecte longue interrompue (clé expirée) garde ce qu'elle a réuni
  const save = async () => { sample.seen = [...seen].slice(-300000); await writeFile(SAMPLE, JSON.stringify(sample)); };
  let added = 0;
  try {
    for (const [t, div] of tiers) {
      if (!div) players.push(...(await riot(`https://${R.platform}.api.riotgames.com/lol/league/v4/${t}/by-queue/RANKED_SOLO_5x5`)).entries);
      else for (let pg = 1; pg <= pages; pg++) players.push(...(await riot(`https://${R.platform}.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/DIAMOND/${div}?page=${pg}`)));
    }
    const since = Math.floor((Date.now() - DAYS * 864e5) / 1000);
    const perPlayer = want > 1000 ? 20 : 3;
    for (const p of players.sort(() => Math.random() - 0.5)) {
      if (added >= want) break;
      const ids = (await riot(`https://${R.region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${p.puuid}/ids?queue=420&startTime=${since}&count=${perPlayer}`)).filter(id => !seen.has(sha256(id).slice(0, 16)));
      for (const id of ids) {
        if (added >= want) break;
        seen.add(sha256(id).slice(0, 16));
        const m = await riot(`https://${R.region}.api.riotgames.com/lol/match/v5/matches/${id}`).catch(e => (e.status === 404 ? null : Promise.reject(e)));
        if (!m || m.info.gameDuration < 900 || m.info.queueId !== 420) continue; // parties écourtées : non représentatives
        sample.matches.push({ at: m.info.gameStartTimestamp, patch: m.info.gameVersion.split(".").slice(0, 2).join("."), d: Math.round(m.info.gameDuration / 6) / 10, rows: m.info.participants.map(p => row(p, m.info)) });
        if (++added % 2500 === 0) await writeMatchups(sample);
        if (added % 250 === 0) { await save(); console.log(`${new Date().toLocaleTimeString("fr-FR")} : ${added} parties ajoutées (${sample.matches.length} au total)`); }
      }
    }
  } catch (e) {
    if (!sample.matches.length) throw e;
    console.error(`Collecte interrompue (${e.message}) : l'échantillon déjà réuni est conservé.`);
  }
  await save();
  await writeMatchups(sample);
  const { bench, champstats } = compute(sample);
  await writeJson("coach/cache/benchmarks.json", bench);
  await writeJson("coach/cache/champstats.json", champstats);
  // Builds selon la composition adverse (coach/builds.mjs)
  try { await writeJson("coach/cache/builds.json", computeBuilds(sample, await itemCatalog(), { patch: champstats.patch })); } catch (e) { console.error(`Builds non recalculés : ${e.message}`); }
  const ready = Object.values(champstats.champions).filter(c => c.games >= champstats.minGames).length;
  return [`Échantillon Diamant+ : ${bench.games} parties sur ${DAYS} jours (${Object.entries(bench.patches).map(([p, n]) => `${p} : ${n}`).join(", ")}) ; ${used} requêtes.`,
    `Fiches champions (patch ${champstats.patch}) : ${ready} champion(s) avec au moins ${champstats.minGames} parties.`,
    ...Object.entries(bench.roles).map(([r, m]) => `  ${r} : sbires à 10 min ${m.cs10?.p50 ?? "—"}, morts/30 min ${m.deaths30?.p50}, vision/min ${m.visionMin?.p50} (n=${m.deaths30?.n})`)];
}

if (process.argv[1]?.endsWith("benchmarks.mjs")) run().then(l => console.log(l.join("\n")), e => { console.error(e.message); process.exit(1); });
