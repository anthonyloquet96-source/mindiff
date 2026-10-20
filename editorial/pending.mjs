// Liste ce qui reste à synthétiser (sujets d'actu et matchs terminés), avec les faits utiles à la rédaction.
// Usage : node editorial/pending.mjs [--topics 30] [--matches 20] [--days 10] [--local]
// Lit par défaut les données publiées en ligne (les plus fraîches), sinon data/auto.json.

import { readFile, writeFile } from "node:fs/promises";

const SITE = "https://anthonyloquet96-source.github.io/mindiff/data/auto.json";
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : def; };
const LIMIT_T = Number(arg("topics", 30));
const LIMIT_M = Number(arg("matches", 20));
const DAYS = Number(arg("days", 10));
const LEAGUE_RANK = ["worlds", "msi", "first_stand", "lec", "lck", "lpl", "lcs", "lcp", "cblol", "lfl", "emea_masters"];

const auto = process.argv.includes("--local")
  ? JSON.parse(await readFile("data/auto.json", "utf8"))
  : await fetch(SITE, { cache: "no-store" }).then(r => r.json()).catch(async () => JSON.parse(await readFile("data/auto.json", "utf8")));
const ed = JSON.parse(await readFile("data/editorial.json", "utf8").catch(() => '{"topics":{},"matches":{},"tournaments":{},"briefings":{}}'));
const recent = d => (Date.now() - new Date(d)) / 864e5 <= DAYS;

const topics = auto.news
  .filter(n => !ed.topics[n.id] && recent(n.date))
  .slice(0, LIMIT_T)
  .map(n => ({
    id: n.id, game: n.game, type: n.type, date: n.date, status: n.status, warnings: n.warnings,
    title: n.title, summary: n.summary, points: n.points,
    sources: n.sources.map(s => `${s.kind} · ${s.name} · ${s.url}`),
  }));

const rank = t => { const i = LEAGUE_RANK.findIndex(k => t.leagueSlug?.startsWith(k)); return i < 0 ? 99 : i; };
const matches = [];
for (const t of [...auto.tournaments].sort((a, b) => rank(a) - rank(b))) {
  for (const s of t.stages) for (const sec of s.sections) for (const m of sec.matches) {
    if (m.state !== "completed" || ed.matches[m.id] || !m.games?.length || !m.start || !recent(m.start)) continue;
    const name = id => m.teams.find(x => x.id === id)?.name || "?";
    matches.push({
      id: m.id, tournament: t.name, stage: `${s.name} / ${m.block}`, date: m.start?.slice(0, 10), bo: m.bo,
      score: `${m.teams[0].name} ${m.teams[0].score}–${m.teams[1].score} ${m.teams[1].name}`,
      verified: m.verified,
      games: m.games.map(g => ({
        n: g.n, winner: g.winnerTeamId ? name(g.winnerTeamId) : "inconnu", kills: g.kills, patch: g.patch,
        blue: `${name(g.blue.teamId)} : ${g.blue.picks.map(p => `${p.role} ${p.champ} (${p.player})`).join(", ")}`,
        red: `${name(g.red.teamId)} : ${g.red.picks.map(p => `${p.role} ${p.champ} (${p.player})`).join(", ")}`,
      })),
    });
  }
}

const tournaments = auto.tournaments
  .filter(t => ed.tournaments[t.id]?.done !== t.progress?.done)
  .map(t => ({
    id: t.id, name: t.name, status: t.status, progress: t.progress, dates: `${t.startDate} → ${t.endDate}`,
    standings: t.stages.flatMap(s => s.sections.filter(x => x.standings?.length).map(x => `${s.name}/${x.name} : ${x.standings.map(r => `${r.team} ${r.w}-${r.l}`).join(", ")}`)),
    topChamps: t.stats?.champions.slice(0, 15).map(c => `${c.champ} ${c.role} ${c.picks}p ${Math.round(c.presence * 100)}% ${c.winrate == null ? "" : Math.round(c.winrate * 100) + "%v/" + c.known}`),
    next: t.stages.flatMap(s => s.sections.flatMap(x => x.matches)).filter(m => m.state !== "completed" && m.teams.every(x => x.code !== "TBD")).slice(0, 8).map(m => `${m.start?.slice(0, 16)} ${m.teams[0].name} vs ${m.teams[1].name}`),
  }));

const out = { generatedAt: auto.generatedAt, counts: { topics: topics.length, matches: Math.min(matches.length, LIMIT_M), matchesTotal: matches.length, tournaments: tournaments.length }, topics, matches: matches.slice(0, LIMIT_M), tournaments };
await writeFile("editorial/pending.json", JSON.stringify(out, null, 1));
console.log(`À synthétiser : ${topics.length} sujets, ${out.counts.matches}/${matches.length} matchs, ${tournaments.length} tournois → editorial/pending.json`);
