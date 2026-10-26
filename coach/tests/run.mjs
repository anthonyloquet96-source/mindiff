// Tests du coach : node coach/tests/run.mjs
// Les cas marqués [réel] utilisent la base, le cache et le réseau réels. Les cas marqués [fixture] utilisent
// des données de test explicites (coach/tests/fixtures), jamais publiées dans l'application.
// Les fichiers de la base modifiés par un test sont sauvegardés puis restaurés.

import { readFile, writeFile, copyFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";
import { ROOT, P, cachedText, normText } from "../lib.mjs";
import { checkUnit, detectInjection } from "../critic.mjs";
import { parseChanges } from "../patch.mjs";
import { loadContext, evaluate, rulesLockStatus } from "../kb.mjs";
import { triage, parseYoutubeFeed } from "../discover.mjs";
import { parseCaptions } from "../import-transcript.mjs";
import { acquireText } from "../analyze.mjs";

const results = [];
const t = async (name, kind, fn) => {
  try { const detail = await fn(); results.push({ name, kind, ok: true, detail }); }
  catch (e) { results.push({ name, kind, ok: !!e.skip, skipped: !!e.skip, detail: e.message }); }
};
// Sur une machine sans le cache privé des textes (premier passage distant), ces tests sont ignorés, pas réussis
const need = async id => { const x = await cachedText(id); if (!x) throw Object.assign(new Error(`ignoré : texte ${id} absent du cache privé`), { skip: true }); return x; };
const assert = (c, m) => { if (!c) throw new Error(m); };
const fx = JSON.parse(await readFile(join(ROOT, "coach/tests/fixtures/fixtures.json"), "utf8"));

const L = await loadContext();
const ctx = L.ctx;
const unit = id => L.units.units.find(u => u.id === id);
const ev = (u, c = ctx) => evaluate(u, c, L.corrections);
const selSrc = await readFile(join(ROOT, "coach-select.js"), "utf8");
const sandbox = { module: { exports: {} } };
vm.runInNewContext(selSrc, sandbox);
const CS = sandbox.module.exports;
const KB = JSON.parse(await readFile(join(ROOT, "data/coach.json"), "utf8"));
// Contexte enrichi des contenus de test (en mémoire seulement)
const fxCtx = { ...ctx, contents: new Map([...ctx.contents, ...fx.contents.map(c => [c.id, c])]), texts: new Map([...ctx.texts, ...fx.contents.map(c => [c.id, c.text])]) };

// ---------- Les dix cas demandés
await t("1. Source récente compatible avec le patch", "réel", () => {
  const r = ev(unit("u-lucian-2620-ad"));
  assert(r.status === "exploitable", `statut ${r.status}`);
  // Le conseil date du 26.20 : il doit rester exploitable au patch courant tant qu'aucun patch suivant ne touche Lucian
  const num = v => { const [x, y] = String(v).split(".").map(Number); return x * 100 + y; };
  const p = unit("u-lucian-2620-ad").patch.value;
  assert(num(p) <= num(ctx.current), `patch ${p} postérieur au patch courant ${ctx.current}`);
  return `u-lucian-2620-ad : patch ${p} (courant ${ctx.current}), exploitable, passages retrouvés dans les notes officielles.`;
});
await t("2. Source ancienne devenue incompatible", "réel + patch simulé", () => {
  const old = ev(unit("u-lucian-vigilance-avant-2619"));
  assert(old.status === "obsolete", `ancienne valeur : ${old.status}`);
  // Patch 26.21 simulé : Lucian/passive modifié
  const c2 = { ...ctx, current: "26.21", changes: { ...ctx.changes, "26.21": ["Lucian/passive"] } };
  const a = ev(unit("u-lucian-enchanteur"), c2), b = ev(unit("u-lucian-2619-vigilance"), c2), keep = ev(unit("u-lulu-e-tireur"), c2), m = ev(unit("u-methode-morts"), c2);
  assert(a.status === "a-revalider" && b.status === "a-revalider", `synergie ${a.status}, vigilance ${b.status}`);
  assert(keep.status === "exploitable" && m.status === "provisoire", `fondamentaux touchés : ${keep.status} / ${m.status}`);
  return `Valeur d'avant 26.19 : obsolète. Après un 26.21 simulé modifiant le passif : synergie Lucian et fait 26.19 « à revalider » ; Lulu et méthode inchangés.`;
});
await t("3. Fondamental ancien encore applicable", "réel", async () => {
  const u = unit("u-lulu-e-tireur"), r = ev(u);
  assert(r.status === "exploitable" && u.patch.known === false, `statut ${r.status}`);
  const txt = await need("c-dd-16-20-1-lulu");
  assert(normText(txt).includes(normText(u.evidence[0].passage)), "conseil absent des données 16.20.1");
  return "Conseil officiel non daté, retrouvé tel quel dans Data Dragon 16.20.1 : exploitable, présenté « patch non daté ».";
});
await t("4a. Sources statistiques divergentes, puis retirées (Diamant+)", "réel", () => {
  const u = unit("u-milio-stats");
  const { usage, ...asCorrectionFree } = u;
  const r = checkUnit({ ...asCorrectionFree, proposedStatus: "contradictoire" }, ctx);
  assert(r.flags.some(f => f.code === "ecart-de-contexte"), "écart de contexte non signalé");
  assert(r.flags.some(f => f.code === "rang-sous-reference") && r.blocking, "statistique Émeraude+ / tous rangs acceptée comme référence");
  assert(ev(u).status === "retire", "non retirée");
  return "Milio : S (tous rangs) / A / B (Émeraude+) → divergence exposée par contexte ; depuis la consigne Diamant+, ces données sont refusées et l'unité est retirée (historisé).";
});
await t("Référence Diamant+ : le bas niveau ne sert qu'à corriger", "fixture", () => {
  const base = { id: "fx-rang", claim: "Selon un créateur : conseil.", champions: [], roles: ["bottom"], themes: ["lane"], context: { queue: "solo" }, patch: { known: false }, nature: "opinion", evidence: [{ content: "fx-createur-a", locator: "§1", lang: "fr", passage: "montez Prison aqueuse en premier" }] };
  const silver = checkUnit({ ...base, levelContext: "argent", usage: "reference" }, fxCtx);
  const corr = checkUnit({ ...base, levelContext: "argent", usage: "correction" }, fxCtx);
  const dia = checkUnit({ ...base, levelContext: "diamant", usage: "reference" }, fxCtx);
  assert(silver.blocking && silver.flags.some(f => f.code === "rang-sous-reference"), "partie Argent acceptée comme référence");
  assert(!corr.flags.some(f => f.code === "rang-sous-reference") && !dia.flags.some(f => f.code === "rang-sous-reference"), "correction ou Diamant refusés à tort");
  const kb = { ...KB, units: [...KB.units, { ...base, id: "fx-corr", status: "exploitable", usage: "correction", action: "x", review: { human: "en attente" } }] };
  const r = CS.prepare(kb, { role: "bottom", rank: "argent", champions: [], mode: "solo", goal: "lane", time: 30 });
  assert(r.goal?.unit.id !== "fx-corr" && !r.plan.some(x => x.unit.id === "fx-corr"), "erreur de bas niveau proposée comme consigne");
  return "Partie Argent comme référence → rejetée ; comme erreur à corriger → admise mais jamais proposée en consigne ; Diamant → admise.";
});
await t("Champions sans conseils officiels : pages officielles et contenus anciens", "fixture", async () => {
  const { pickPages } = await import("../insights.mjs");
  const urls = ["https://www.leagueoflegends.com/en-us/news/dev/champion-insights-bel-veth/", "https://www.leagueoflegends.com/en-us/news/dev/dev-composing-bel-veth-s-theme/", "https://www.leagueoflegends.com/en-us/news/game-updates/how-to-dominate-with-zaahen-us/", "https://www.leagueoflegends.com/en-us/news/game-updates/chibi-spirit-blossom-yunara-showcase/"];
  assert(pickPages(urls, "Bel'Veth").length === 1, "Bel'Veth : article de conception non retenu ou musique retenue");
  assert(pickPages(urls, "Zaahen").length === 1 && !pickPages(urls, "Yunara").length, "guide vidéo Zaahen ou vitrine de skin mal triés");
  const old = new Map(fxCtx.contents); old.set("fx-createur-a", { ...fxCtx.contents.get("fx-createur-a"), published: "2019-10-24" });
  const u = { id: "fx-ancien", claim: "Selon un créateur : conseil.", champions: [], roles: ["bottom"], themes: ["lane"], context: { queue: "solo" }, patch: { known: false }, nature: "opinion", levelContext: "diamant", evidence: [{ content: "fx-createur-a", locator: "§1", lang: "fr", passage: "montez Prison aqueuse en premier" }] };
  const r = checkUnit(u, { ...fxCtx, contents: old });
  assert(r.flags.some(f => f.code === "contenu-ancien") && r.status !== "exploitable" && !r.blocking, "article de 2019 accepté comme actuel");
  return "Plan du site Riot → articles « Champion Insights » et guides vidéo retenus, skins et musique écartés ; contenu de 2019 → provisoire (contenu-ancien).";
});
await t("Bilan de partie (données Riot) : faits exacts, comparaison Diamant+", "fixture", async () => {
  const { review, compare, parseRiotId } = await import("../review.mjs");
  const P = (id, team, pos, extra = {}) => ({ participantId: id, puuid: `p${id}`.padEnd(60, "x"), teamId: team, teamPosition: pos, championName: `C${id}`, championId: id, win: team === 100, kills: 2, deaths: 6, assists: 3, totalMinionsKilled: 150, neutralMinionsKilled: 10, gameEndedInEarlySurrender: false, challenges: { laneMinionsFirst10Minutes: 50, visionScorePerMinute: 0.4, killParticipation: 0.3, teamDamagePercentage: 0.2, controlWardsPlaced: 0 }, ...extra });
  const parts = [P(1, 100, "MIDDLE"), P(2, 200, "MIDDLE"), P(3, 200, "JUNGLE")];
  const match = { metadata: { matchId: "EUW1_1" }, info: { gameDuration: 1800, gameStartTimestamp: 0, queueId: 420, gameVersion: "16.20.1.1", participants: parts } };
  const pf = (g1, g2) => ({ 1: { totalGold: g1, minionsKilled: 50, jungleMinionsKilled: 0, xp: 4000, currentGold: 2600 }, 2: { totalGold: g2, minionsKilled: 60, jungleMinionsKilled: 0, xp: 4200, currentGold: 300 } });
  const frames = Array.from({ length: 31 }, (_, m) => ({ participantFrames: pf(500 * m, 520 * m), events: [] }));
  frames[5].events.push({ type: "ITEM_PURCHASED", participantId: 1, itemId: 1001, timestamp: 300000 }, { type: "ITEM_PURCHASED", participantId: 1, itemId: 2055, timestamp: 305000 });
  frames[12].events.push({ type: "CHAMPION_KILL", victimId: 1, killerId: 3, assistingParticipantIds: [2], timestamp: 720000, position: { x: 9000, y: 9000 } });
  frames[12].events.push({ type: "ITEM_PURCHASED", participantId: 1, itemId: 1001, timestamp: 740000 });
  frames[13].events.push({ type: "ELITE_MONSTER_KILL", monsterType: "DRAGON", killerId: 3, killerTeamId: 200, timestamp: 760000 });
  frames[20].events.push({ type: "ITEM_PURCHASED", participantId: 1, itemId: 1001, timestamp: 1200000 });
  const tl = { info: { participants: parts.map(p => ({ participantId: p.participantId, puuid: p.puuid })), frames } };
  const riot = async url => (url.endsWith("/timeline") ? tl : match);
  const fetchImpl = async url => ({ json: async () => (url.includes("versions") ? ["16.21.1"] : { data: { 1001: { name: "Bottes", gold: { total: 300 }, into: ["3006"], tags: ["Boots"] }, 2055: { name: "Balise de contrôle", gold: { total: 75 }, tags: [] } } }) });
  const bench = { patch: "16.20", games: 100, roles: { mid: { cs10: { n: 200, p25: 70, p50: 79, p75: 85 }, deaths30: { n: 200, p25: 4.5, p50: 5.6, p75: 7 }, visionMin: { n: 200, p25: 0.6, p50: 0.73, p75: 0.9 } } } };
  const r = await review(riot, { matchId: "EUW1_1", puuid: parts[0].puuid, region: "europe", benchmarks: bench, fetchImpl });
  assert(r.deaths.length === 1 && r.deaths[0].killer === "C3" && r.deaths[0].beforeObjective === "Dragon pris par l'adversaire à 12:40", JSON.stringify(r.deaths));
  assert(r.bases.length === 3 && r.bases[1].afterDeath && !r.bases[0].afterDeath && r.bases[0].items.join() === "Bottes,Balise de contrôle", JSON.stringify(r.bases));
  assert(r.lane.opponent === "C2" && r.lane.at10.gold === -200 && r.lane.at10.cs === -10, JSON.stringify(r.lane));
  // Une seule mort avant un objectif reste datée dans la liste des morts ; le constat demande au moins 2 morts (banc d'essai du 25/10/2026)
  assert(!r.findings.some(f => f.kind === "mort-avant-objectif") && r.findings.some(f => f.kind === "ecart-cs10"), r.findings.map(f => f.kind).join());
  assert(r.bases[0].goldBefore === 2600, "or en poche avant le retour");
  assert(!r.findings.some(f => f.kind === "ecart-deaths30"), "6 morts/30 min jugées sous la référence alors qu'elles sont dans la moyenne Diamant+");
  assert(compare("cs10", 82, null) === null && compare("cs10", 82, { cs10: { n: 10, p25: 1, p50: 2, p75: 3 } }) === null, "comparaison sans référence suffisante");
  assert(parseRiotId("Pseudo#EUW")?.tagLine === "EUW" && !parseRiotId("Pseudo"), "Riot ID");
  return "Mort à 12:00 suivie d'un dragon adverse à 12:40 → datée dans les morts (constat à partir de 2) ; achats après la mort distingués d'un retour ; écarts à 10 min exacts ; référence Diamant+ exigée (30 joueurs au moins).";
});
await t("Bilan : retard en ligne, plaques, build face aux Diamant+ ; objectif par rôle", "fixture", async () => {
  const { review, goalFor } = await import("../review.mjs");
  const P = (id, team, pos) => ({ participantId: id, puuid: `p${id}`.padEnd(60, "x"), teamId: team, teamPosition: pos, championName: `C${id}`, championId: id, win: false, kills: 0, deaths: 3, assists: 1, totalMinionsKilled: 150, neutralMinionsKilled: 0, totalTimeSpentDead: 120, item0: 3031, item1: 3006, item2: 6672, item3: 0, item4: 0, item5: 0, perks: { styles: [{ selections: [{ perk: 8008 }] }] }, challenges: { laneMinionsFirst10Minutes: 60 } });
  const parts = [P(1, 100, "TOP"), P(2, 200, "TOP")];
  const match = { metadata: { matchId: "EUW1_2" }, info: { gameDuration: 1500, gameStartTimestamp: 0, queueId: 420, gameVersion: "16.20.1", participants: parts } };
  const frames = Array.from({ length: 26 }, (_, m) => ({ participantFrames: { 1: { totalGold: 400 * m, minionsKilled: 6 * m, jungleMinionsKilled: 0, xp: 300 * m, currentGold: 0 }, 2: { totalGold: 520 * m, minionsKilled: 8 * m, jungleMinionsKilled: 0, xp: 330 * m, currentGold: 0 } }, events: [] }));
  // Plaques : 3 perdues avant 14 min sur la voie du haut, 1 après (ne compte pas), 1 sur une autre voie
  for (const [t, team, lane] of [[300000, 100, "TOP_LANE"], [500000, 100, "TOP_LANE"], [700000, 100, "TOP_LANE"], [900000, 100, "TOP_LANE"], [400000, 100, "MID_LANE"], [600000, 200, "TOP_LANE"]]) frames[Math.floor(t / 60000)].events.push({ type: "TURRET_PLATE_DESTROYED", teamId: team, laneType: lane, timestamp: t });
  frames[6].events.push({ type: "CHAMPION_KILL", victimId: 1, killerId: 2, assistingParticipantIds: [], timestamp: 360000, position: { x: 2000, y: 12000 } });
  const tl = { info: { participants: parts.map(p => ({ participantId: p.participantId, puuid: p.puuid })), frames } };
  const riot = async url => (url.endsWith("/timeline") ? tl : match);
  const itemData = { 3031: { name: "Lame d'infini", gold: { total: 3450 }, tags: [] }, 6672: { name: "Tueur de krakens", gold: { total: 3000 }, tags: [] }, 3006: { name: "Grèves", gold: { total: 1100 }, tags: ["Boots"] }, 3153: { name: "Lame du roi déchu", gold: { total: 3200 }, tags: [] } };
  const fetchImpl = async url => ({ json: async () => (url.includes("versions") ? ["16.21.1"] : url.includes("runesReforged") ? [{ id: 8000, name: "Précision", slots: [{ runes: [{ id: 8008, name: "Tempo mortel", icon: "a.png" }, { id: 8010, name: "Conquérant", icon: "b.png" }] }] }] : url.includes("summoner") ? { data: {} } : { data: itemData }) });
  const champstats = { patch: "16.20", minGames: 30, champions: { 1: { games: 100, roles: { top: 90 }, items: [{ id: "3153", games: 70 }, { id: "3031", games: 60 }, { id: "3006", games: 50 }], keystones: [{ id: "8010", games: 80 }, { id: "8008", games: 20 }],
    byRole: { top: { games: 90, wins: 45, items: [{ id: "3153", games: 63 }, { id: "3031", games: 54 }, { id: "3006", games: 45 }], keystones: [{ id: "8010", games: 72 }, { id: "8008", games: 18 }], trees: [], spells: [] } } } } };
  const r = await review(riot, { matchId: "EUW1_2", puuid: parts[0].puuid, region: "europe", benchmarks: null, champstats, fetchImpl });
  assert(r.lane.platesLost === 3 && r.lane.platesTaken === 1, JSON.stringify(r.lane));
  assert(r.findings[0]?.kind === "retard-en-ligne" && /^1.200 golds/.test(r.findings[0].title) && r.findings[0].facts.some(f => f.includes("1 mort contre C2")), JSON.stringify(r.findings[0]));
  assert(r.summary.deadSeconds === 120, "temps passé mort");
  const b = r.build;
  assert(b && b.items.map(x => `${x.id}:${x.share}`).join() === "3031:60,6672:null" && b.keystone.share === 20 && b.keystone.top.name === "Conquérant" && b.missing.map(x => x.id).join() === "3153", JSON.stringify(b));
  // Objectif par rôle : calculé seulement avec au moins une partie sur deux sous la référence
  const g = (role, cs10) => ({ id: `G${cs10}`, role, metrics: { cs10, deaths30: 5 } });
  const bench = { roles: { top: { cs10: { n: 100, p25: 60, p50: 70, p75: 80 }, deaths30: { n: 100, p25: 4, p50: 5, p75: 6 } } } };
  const G = goalFor([g("top", 50), g("top", 55), g("top", 75), g("mid", 10)], "top", bench);
  assert(G.games === 3 && G.goal?.metric === "cs10" && G.goal.target === 60 && G.goal.success.map(s => s.ok).join() === "false,false,true" && G.tally.find(t => t.metric === "deaths30").sous === 0, JSON.stringify(G));
  return "1 200 or de retard à 10 min → constat ; plaques comptées avant 14 min et sur la bonne voie ; objets comparés aux Diamant+ du champion (Lame d'infini 60 %, rune clé 20 % contre Conquérant 80 %) ; objectif par rôle sans mélanger les rôles.";
});
await t("Draft : matchups avec marge d'erreur, bot lane 2 contre 2, compositions", "fixture", async () => {
  const { computeMatchups } = await import("../matchups.mjs");
  const { analyzeDraft } = await import("../draft.mjs");
  // 120 parties : 1 (mid) contre 2 (mid), 1 gagne 90 fois ; bot : 3 (ADC) + 4 (support) contre 5 (ADC) + 6 (support)
  const row = (c, role, t, win, phys) => ({ role, c, n: `C${c}`, win, t, m: { cs10: role === "support" ? null : 70 + (win ? 5 : 0) }, dmg: [phys, 1000 - phys, 0], cc: 30, tank: 20000, kda: [5, 5, 5], solo: 0 });
  const matches = Array.from({ length: 120 }, (_, i) => { const w = i < 90 ? 1 : 0; return { at: Date.now(), patch: "16.20", d: 20 + (i % 20), rows: [row(1, "mid", 100, w, 900), row(3, "bottom", 100, w, 900), row(4, "support", 100, w, 800), row(7, "top", 100, w, 900), row(2, "mid", 200, 1 - w, 200), row(5, "bottom", 200, 1 - w, 900), row(6, "support", 200, 1 - w, 100), row(8, "top", 200, 1 - w, 100)] }; });
  const mu = computeMatchups({ platform: "euw1", matches });
  assert(JSON.stringify(mu.lane.mid[1][2]) === "[120,90,300,120]" && mu.bot["support-bottom"][4][5][0] === 120 && mu.bot.duo[3][4][1] === 90, JSON.stringify(mu.lane.mid[1][2]));
  const d = analyzeDraft(mu, { me: { role: "mid", c: "1" }, allies: [{ role: "mid", c: "1" }, { role: "bottom", c: "3" }, { role: "support", c: "4" }, { role: "top", c: "7" }], enemies: [{ role: "mid", c: "2" }, { role: "bottom", c: "5" }, { role: "support", c: "6" }, { role: "top", c: "8" }], pool: ["1", "9"] });
  const mid = d.lanes.find(l => l.role === "mid");
  assert(mid.winrate === 75 && mid.margin === 7.7 && mid.verdict === "favorable" && mid.cs10 === 2.5, JSON.stringify(mid));
  assert(d.bot.length === 3 && d.bot.every(b => b.enough), JSON.stringify(d.bot));
  assert(d.comps.allies.enough && d.comps.allies.notes[0].kind === "ad" && d.comps.enemies.notes[0].kind === "ap", JSON.stringify(d.comps));
  assert(d.pool[0].c === "1" && !d.pool[1].overall.enough, "pool mal classé");
  // Sous 30 parties : aucun verdict
  const few = analyzeDraft(computeMatchups({ platform: "euw1", matches: matches.slice(0, 20) }), { allies: [{ role: "mid", c: "1" }], enemies: [{ role: "mid", c: "2" }] });
  assert(!few.lanes[0].enough && few.lanes[0].winrate == null, "verdict donné sur 20 parties");
  return "120 parties : 75 % ± 7,7 → favorable, écart moyen de sbires +2,5 ; bot lane 2 contre 2 et duo comptés ; compositions physique / magique reconnues ; sous 30 parties, aucun verdict.";
});
await t("Contradictions entre conseils : détectées et départagées à la source", "fixture", async () => {
  const { directives, findContradictions, applyContradictions } = await import("../contradictions.mjs");
  const names = [{ kind: "rune", id: "8112", name: "Électrocution" }, { kind: "item", id: "3111", name: "Sandales de Mercure" }];
  assert(directives("Sur Ahri, évite Électrocution.", names)[0]?.pol === -1 && directives("Prends Électrocution.", names)[0]?.pol === 1 && !directives("Le combo d'Électrocution.", names).length, "polarité mal lue (accents)");
  const U = (id, extra) => ({ id, status: "exploitable", nature: "opinion", roles: ["mid"], champions: ["Ahri"], patch: { known: false }, review: {}, flags: [], ...extra });
  const units = [U("a", { claim: "Sur Ahri, prends Électrocution." }), U("b", { claim: "Sur Ahri, évite Électrocution." }), U("c", { claim: "Contre Zed, le matchup est difficile pour Ahri.", matchup: { vs: "Zed" } }), U("d", { claim: "Contre Zed, le duel est favorable à Ahri.", matchup: { vs: "Zed" }, nature: "officiel" })];
  // Données Diamant+ : Électrocution dans 60 % des parties d'Ahri → « prends » l'emporte
  const found = findContradictions(units, names, { champKey: { Ahri: "103" }, champstats: { minGames: 30, champions: { 103: { games: 100, items: [], keystones: [{ id: "8112", games: 60 }] } } } });
  const rune = found.find(f => f.topic.includes("Électrocution")), duel = found.find(f => f.topic.includes("Zed"));
  assert(rune?.winner === "a" && /60 %/.test(rune.reason) && duel?.winner === "d" && duel.reason === "source officielle Riot", JSON.stringify(found));
  applyContradictions(units, found);
  assert(units.find(u => u.id === "b").status === "contradictoire" && units.find(u => u.id === "a").status === "exploitable" && units.find(u => u.id === "c").status === "contradictoire", "statuts après départage");
  const tie = findContradictions([U("e", { claim: "Prends Électrocution." }), U("f", { claim: "Évite Électrocution." })], names, {});
  assert(tie[0]?.winner === null && /vérifier à la source/.test(tie[0].reason), "cas non départagé");
  return "« Prends » contre « évite » Électrocution → départagé par les données Diamant+ (60 % des parties) ; duel « favorable » officiel contre « difficile » → officiel retenu ; sans source ni donnée → listé « à vérifier à la source ».";
});
await t("Relecture tactique : combats, objectifs, morts isolées, alliés morts", "fixture", async () => {
  const { tactics, zone } = await import("../tactics.mjs");
  const POS = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
  const parts = Array.from({ length: 10 }, (_, i) => ({ participantId: i + 1, puuid: `p${i + 1}`, teamId: i < 5 ? 100 : 200, teamPosition: POS[i % 5], championName: `C${i + 1}` }));
  const match = { info: { participants: parts } };
  // Positions : par défaut chacun dans sa base ; le joueur 3 (mid bleu) loin au bas de carte à 20 min
  const base = id => (id <= 5 ? { x: 1000, y: 1000 } : { x: 13800, y: 13800 });
  const frames = Array.from({ length: 31 }, (_, m) => ({ timestamp: m * 60000, events: [], participantFrames: Object.fromEntries(parts.map(p => [p.participantId, { position: base(p.participantId), championStats: { health: 500, healthMax: 1000 } }])) }));
  const dragon = { x: 9866, y: 4414 };
  // 20:00 : 5 rouges autour du dragon, 2 bleus seulement ; le mid bleu (3) au bas de la carte à l'opposé
  for (const id of [6, 7, 8, 9, 10]) frames[20].participantFrames[id].position = { x: 9800, y: 4600 };
  for (const id of [4, 5]) frames[20].participantFrames[id].position = { x: 9500, y: 4300 };
  frames[20].participantFrames[3].position = { x: 2000, y: 9000 };
  // Le jungler bleu (2) est mort à 19:40 : en attente de réapparition au moment du dragon
  frames[19].events.push({ type: "CHAMPION_KILL", timestamp: 1180000, victimId: 2, killerId: 7, assistingParticipantIds: [], position: { x: 9000, y: 5000 } });
  // Combat au dragon à 20:05 : deux bleus meurent contre trois rouges
  frames[20].events.push({ type: "CHAMPION_KILL", timestamp: 1205000, victimId: 4, killerId: 9, assistingParticipantIds: [6, 7], position: dragon }, { type: "CHAMPION_KILL", timestamp: 1212000, victimId: 5, killerId: 8, assistingParticipantIds: [9], position: dragon });
  frames[20].events.push({ type: "ELITE_MONSTER_KILL", timestamp: 1220000, killerId: 7, killerTeamId: 200, monsterType: "DRAGON", position: dragon });
  // 25:00 : le mid bleu meurt seul dans la jungle adverse contre deux rouges
  frames[25].participantFrames[3].position = { x: 11000, y: 9000 };
  frames[25].events.push({ type: "CHAMPION_KILL", timestamp: 1500000, victimId: 3, killerId: 8, assistingParticipantIds: [7], position: { x: 11000, y: 9000 } });
  const tl = { info: { participants: parts.map(p => ({ participantId: p.participantId, puuid: p.puuid })), frames } };
  const r = tactics(match, tl, "p3");
  const o = r.objectives[0];
  assert(o.kind === "Dragon" && !o.ours && o.allies === 2 && o.enemies === 5 && o.absent.some(a => a.champion === "C2" && a.dead) && o.absent.some(a => a.me), JSON.stringify(o));
  assert(r.fights.length === 2 && r.fights[0].allies === 2 && r.fights[0].enemies === 4 && r.fights[0].won === false, "combat au dragon mal reconstitué : " + JSON.stringify(r.fights));
  const kinds = r.lessons.map(l => l.kind);
  assert(kinds.includes("objectif-inferiorite") && kinds.includes("mort-isolee") && !kinds.includes("absent-objectif"), kinds.join());
  assert(r.summary.deathsIsolated === 1 && r.map.length === 31 && r.map[20][2][0] === 2000, "résumé ou mini-carte");
  assert(zone({ x: 7400, y: 7400 }, 100) === "mid lane" && zone({ x: 13900, y: 13900 }, 100) === "base adverse", "zones de la carte");
  // Élimination isolée en 1 contre 1 : pas un « combat »
  frames[10].events.push({ type: "CHAMPION_KILL", timestamp: 600000, victimId: 1, killerId: 6, assistingParticipantIds: [], position: { x: 1500, y: 9000 } });
  assert(tactics(match, tl, "p3").fights.length === 2, "duel compté comme combat");
  return "Dragon disputé à 2 contre 5 avec un combat perdu → leçon (jungler noté « mort ») ; « absent d'un objectif » n'est plus une leçon (banc d'essai) ; mort seule dans la jungle adverse contre 2 → leçon ; un duel n'est pas un combat.";
});
await t("Partie en cours : rôles estimés, fiches Diamant+ par champion", "fixture", async () => {
  const { assignRoles } = await import("../review.mjs");
  const { compute } = await import("../benchmarks.mjs");
  const dd = { 1: { tags: ["Fighter"] }, 2: { tags: ["Mage"] }, 3: { tags: ["Marksman"] }, 4: { tags: ["Support"] }, 5: { tags: ["Fighter"] } };
  // Le combattant avec Châtiment est le jungler, même si ses fréquences disent top
  const cs = { champions: { 5: { rolesAll: { top: 40, jungle: 2 } }, 1: { rolesAll: { top: 30 } } } };
  const r = assignRoles([1, 2, 3, 4, 5].map(id => ({ championId: id, spells: id === 5 ? [4, 11] : [4, 14] })), cs, dd);
  assert(r.map(x => x.role).join() === "top,mid,bottom,support,jungle", r.map(x => x.role).join());
  // Fiches : patch le plus joué seulement, aucune donnée de joueur
  const row = (c, role, win, items) => ({ role, c, n: `C${c}`, win, m: { deaths30: 5 }, items, ks: 8005, prim: 8000, sec: 8400, spells: [4, 14] });
  const now = Date.now();
  const sample = { platform: "euw1", matches: [{ at: now, patch: "16.20", rows: [row(1, "top", 1, [3031]), row(2, "mid", 0, [3089])] }, { at: now, patch: "16.20", rows: [row(1, "top", 0, [3031, 3071])] }, { at: now, patch: "16.19", rows: [row(1, "jungle", 1, [9999])] }, { at: now - 40 * 864e5, patch: "16.20", rows: [row(1, "top", 1, [1])] }] };
  const { bench, champstats } = compute(sample);
  const c1 = champstats.champions[1];
  assert(bench.games === 3 && champstats.patch === "16.20" && c1.games === 2 && c1.wins === 1 && c1.items[0].id === "3031" && c1.items[0].games === 2 && !c1.items.some(i => i.id === "9999"), JSON.stringify(c1));
  assert(c1.rolesAll.jungle === 1 && !JSON.stringify(champstats).includes("puuid"), "rôles tous patchs ou identifiant de joueur");
  return "Châtiment → jungle malgré des fréquences « top » ; fiches limitées au patch le plus joué, parties de plus de 30 jours écartées, aucun identifiant de joueur. Mesure réelle (coach/eval-roles.mjs, 40 parties hors échantillon) : 95 % des rôles justes, 98 % quand « sûr », adversaire direct juste à 90 %.";
});
await t("Tout le jeu : socle officiel pour chaque champion", "réel", () => {
  const dd = KB.units.filter(u => u.id.startsWith("u-dd-"));
  const champs = new Set(dd.flatMap(u => [...u.champions, u.matchup?.vs].filter(Boolean)));
  assert(champs.size > 140, `${champs.size} champions`);
  const r = CS.prepare(KB, { role: "jungle", rank: "or", champions: ["Lee Sin"], mode: "solo", goal: "lane", time: 30 });
  assert(r.plan.some(x => x.unit.champions.includes("Lee Sin")) && /conseils officiels/.test(r.coverage.note), "Lee Sin sans conseil officiel ou sans mention de couverture");
  const opts = CS.options(KB, "Lee Sin", "jungle");
  assert(opts.opponents.length > 100, "adversaires");
  return `${dd.length} conseils officiels, ${champs.size} champions ; Lee Sin (jungle) reçoit ses conseils officiels avec la mention de couverture ; ${opts.opponents.length} adversaires proposables.`;
});
await t("4b. Deux créateurs qui se contredisent", "fixture", () => {
  const [a, b] = fx.contradiction.map(u => ev(u, fxCtx));
  assert(a.status === "contradictoire" && b.status === "contradictoire", `${a.status} / ${b.status}`);
  const kb = { ...KB, units: [...KB.units, ...[a, b]] };
  const r = CS.prepare(kb, { role: "support", rank: "or", champions: ["Nami"], mode: "solo", goal: "lane", time: 15 });
  assert(!fx.contradiction.some(u => u.id === r.goal?.unit.id), "un avis contesté a été choisi comme objectif");
  return "Deux avis opposés (ordre des compétences de Nami) : tous deux « contradictoire », conditions affichées, ni l'un ni l'autre retenu comme objectif.";
});
await t("5. Vidéo sans transcription accessible", "réel", async () => {
  const v = L.contents.contents.find(c => c.type === "video" && c.access === "metadonnees" && ctx.texts.get(c.id) == null);
  assert(v && v.access === "metadonnees" && v.analysis === "non-analysee", "vidéo mal classée");
  const got = await acquireText(v);
  assert(got.text === null, "un texte a été obtenu");
  const r = checkUnit({ ...fx.titleAsProof, evidence: [{ ...fx.titleAsProof.evidence[0], content: v.id, passage: v.title }] }, ctx);
  assert(r.blocking && r.flags.some(f => f.code === "titre-pas-preuve"), "le titre a servi de preuve");
  return `${v.id} (« ${v.title.slice(0, 50)}… ») : métadonnées seules, « Non analysée » ; une unité citant son titre est rejetée.`;
});
await t("6. Traduction ambiguë", "réel", () => {
  const u = unit("u-lucian-enchanteur");
  assert(ev(u).status === "exploitable", "avec note");
  const { translation, ...without } = u;
  const r = ev(without);
  assert(r.flags.some(f => f.code === "traduction") && r.status === "provisoire", "non signalé");
  return "« le protéger » (fr) vs « shield them » (en) pour Pix à la rescousse ! : sans note de traduction, l'unité tombe en provisoire.";
});
await t("7. Champion ou rôle non couvert", "réel", async () => {
  // Champion réel sans aucun conseil dans la base (Riot ne publie pas de conseils officiels pour les plus récents)
  const roster = JSON.parse(await readFile(join(ROOT, "coach/cache/roster.json"), "utf8").catch(() => '{"names":[]}')).names;
  const none = roster.find(n => !KB.coverage.champions[n]);
  if (!none) throw Object.assign(new Error("ignoré : tous les champions ont au moins un conseil"), { skip: true });
  const r = CS.prepare(KB, { role: "bottom", rank: "or", champions: [none], mode: "solo", goal: "jungle", time: 15 });
  assert(/pas encore couvert/.test(r.coverage.note), "pas d'avertissement");
  assert(r.plan.every(x => !x.unit.champions.length) && r.goal.unit.roles.includes("all"), "conseil d'un autre champion proposé");
  const r2 = CS.prepare(KB, { role: "jungle", rank: "or", champions: ["Lee Sin"], mode: "solo", goal: "jungle", time: 15 });
  // Objectif jungle : un conseil analysé sur la jungle (vidéos de coachs) est proposé ; sans lui, le manque est annoncé
  const jungleGoal = r2.goal?.unit.themes.includes("jungle");
  assert(/conseils officiels/.test(r2.coverage.note) && (jungleGoal ? !r2.goalNote : /aucun conseil analysé/i.test(r2.goalNote || "")), "couverture de Lee Sin mal annoncée");
  return `${none} (aucun conseil) : avertissement, méthode seulement. Lee Sin : « conseils officiels seulement » ; objectif jungle ${jungleGoal ? "tiré d'un conseil analysé" : "déclaré non couvert"}.`;
});
await t("8a. Source indisponible (accès refusé)", "réel", async () => {
  const got = await acquireText({ id: "test-mobalytics", type: "article", url: "https://mobalytics.gg/blog/lol-essential-skills-to-master-for-adcs/", access: "texte-integral" });
  assert(got.text === null && got.access === "inaccessible", `obtenu : ${got.access}`);
  return `Mobalytics : ${got.reason}.`;
});
await t("8b. Source en panne pendant la découverte", "réel (réseau coupé simulé)", async () => {
  const files = [P.contents, P.state];
  await mkdir(join(ROOT, "coach/tests/tmp"), { recursive: true });
  for (const f of files) await copyFile(join(ROOT, f), join(ROOT, "coach/tests/tmp", f.split("/").pop())).catch(() => {});
  const before = JSON.parse(await readFile(join(ROOT, P.contents), "utf8")).contents.length;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("réseau indisponible (simulé)"); };
  process.argv.push("--force");
  try {
    const { run } = await import("../discover.mjs?panne");
    const log = await run();
    const after = JSON.parse(await readFile(join(ROOT, P.contents), "utf8")).contents.length;
    const st = JSON.parse(await readFile(join(ROOT, P.state), "utf8")).discovery;
    assert(after === before, "contenus perdus");
    assert(Object.values(st).every(s => s.nextTry && s.lastError), "pas de reprise planifiée");
    return `${log.filter(l => l.startsWith("✘")).length} sources en échec, ${after} contenus conservés, nouvel essai planifié (${Object.values(st)[0].nextTry.slice(0, 16)}).`;
  } finally {
    globalThis.fetch = realFetch; process.argv.pop();
    for (const f of files) await copyFile(join(ROOT, "coach/tests/tmp", f.split("/").pop()), join(ROOT, f)).catch(() => {});
  }
});
await t("9. Citation qui ne soutient pas le conseil", "fixture + réel", async () => {
  await need("c-wtl-3921");
  const a = checkUnit(fx.unsupportedStat, ctx), b = checkUnit(fx.fabricatedQuote, ctx), c = checkUnit(fx.mentionOnly, ctx);
  assert(a.blocking && a.flags.some(f => f.code === "citation-insuffisante"), "statistique sans chiffre acceptée");
  assert(b.blocking && b.flags.some(f => f.code === "citation-introuvable"), "citation inventée acceptée");
  assert(c.blocking && c.flags.some(f => f.code === "mention"), "mention prise pour un conseil");
  return "Rejetées : « 55 % de victoires » appuyé sur une ligne de patch ; passage absent de l'article ; conseil « Jinx » tiré d'un exemple de l'article WTL.";
});
await t("10. Contenu externe avec instruction malveillante", "fixture", async () => {
  const hits = detectInjection(fx.injection.text);
  assert(hits.length >= 2, "instruction non détectée");
  const r = checkUnit({ ...fx.injectedUnit }, fxCtx);
  assert(r.blocking && r.flags.some(f => f.code === "injection"), "unité injectée acceptée");
  // Passage réel par l'analyse (sans appel à l'API) : le contenu doit être mis en quarantaine avant tout envoi
  const files = [P.contents, P.state];
  await mkdir(join(ROOT, "coach/tests/tmp"), { recursive: true });
  for (const f of files) await copyFile(join(ROOT, f), join(ROOT, "coach/tests/tmp", f.split("/").pop())).catch(() => {});
  const cacheFile = join(ROOT, P.cache, `${fx.injection.id}.txt`);
  try {
    const cs = JSON.parse(await readFile(join(ROOT, P.contents), "utf8"));
    // Seul contenu en attente dans la copie de travail (restaurée ensuite) : le contenu piégé passe forcément par l'analyse
    for (const c of cs.contents) if (c.analysis === "en-attente") c.analysis = "suspendu-par-test";
    cs.contents.push({ ...fx.injection, text: undefined, analysis: "en-attente", triage: { score: 999 } });
    await writeFile(join(ROOT, P.contents), JSON.stringify(cs));
    // Quota du jour remis à zéro dans la copie de travail (restaurée ensuite) : la vraie analyse du même passage a pu l'épuiser
    const st = JSON.parse(await readFile(join(ROOT, P.state), "utf8").catch(() => "{}"));
    await writeFile(join(ROOT, P.state), JSON.stringify({ ...st, analysesByDay: {} }));
    await mkdir(join(ROOT, P.cache), { recursive: true });
    await writeFile(cacheFile, fx.injection.text);
    process.argv.push("--dry-run");
    const { run } = await import("../analyze.mjs?injection");
    const log = await run();
    const c = JSON.parse(await readFile(join(ROOT, P.contents), "utf8")).contents.find(x => x.id === fx.injection.id);
    assert(c.analysis === "quarantaine", `statut ${c.analysis}`);
    return `Détecté : ${hits.slice(0, 2).map(h => `« ${h} »`).join(", ")}. Contenu mis en quarantaine avant analyse (${log.find(l => l.includes("quarantaine"))}).`;
  } finally {
    process.argv.pop();
    for (const f of files) await copyFile(join(ROOT, "coach/tests/tmp", f.split("/").pop()), join(ROOT, f)).catch(() => {});
    await rm(cacheFile, { force: true });
  }
});

// ---------- Contrôles complémentaires
await t("Ranked et compétition non mélangés", "fixture", () => {
  const r = checkUnit(fx.competitionForRanked, ctx);
  assert(r.blocking && r.flags.some(f => f.code === "ranked-competition"), "accepté");
  return "Conseil de solo queue appuyé seulement sur les Worlds : rejeté.";
});
await t("Petit échantillon et contexte de smurf", "fixture", () => {
  const a = checkUnit(fx.smallSample, ctx), b = checkUnit(fx.smurf, fxCtx);
  assert(a.flags.some(f => f.code === "petit-echantillon") && a.status !== "exploitable", "petit échantillon accepté");
  assert(b.flags.some(f => f.code === "une-partie") && b.status !== "exploitable", "smurf accepté");
  return "6 parties pro sans limite signalée → provisoire ; partie de smurf → provisoire.";
});
await t("Plusieurs contenus de même origine", "fixture", () => {
  const r = checkUnit(fx.sameOrigin, fxCtx);
  assert(r.flags.some(f => f.code === "meme-origine"), "non signalé");
  return "MOBA Trainer (fusion op.gg) + page op.gg : signalés comme une même origine.";
});
await t("Données de la clé de développement Riot jamais publiées", "réel", async () => {
  // riot.publish faux : ni mesure privée (dataCheck riot-dev), ni chiffre des chronologies, ni stratégie marquée privée dans ce qui part en ligne
  const cfg = JSON.parse(await readFile(join(ROOT, "coach/config.json"), "utf8"));
  if (cfg.riot?.publish) throw Object.assign(new Error("ignoré : publication autorisée"), { skip: true });
  const pub = await readFile(join(ROOT, "data/coach.json"), "utf8");
  assert(!/"source":\s*"riot-dev"/.test(pub), "une mesure de la clé de développement est dans data/coach.json");
  assert(!/"dataCheck"/.test(pub), "une vérification par nos données est publiée");
  assert(!/byChamp|dragonEqualGold|"situations"/.test(pub), "des références des chronologies sont publiées");
  const kb = await readFile(join(ROOT, "coach/kb/units.json"), "utf8");
  assert(!/"source":\s*"riot-dev"/.test(kb), "une mesure de la clé de développement est versionnée dans units.json");
  return "data/coach.json et units.json ne contiennent aucune mesure de la clé de développement (dataCheck, chronologies).";
});
await t("Chaque recommandation renvoie à ses preuves", "réel", async () => {
  const r = CS.prepare(KB, { role: "bottom", rank: "or", champions: ["Lucian"], mode: "duo", goal: "lane", time: 30 });
  const all = [...r.changes, r.goal.unit, ...r.plan.map(x => x.unit)];
  for (const u of all) for (const e of u.evidence) {
    const txt = await need(e.content);
    assert(txt && normText(txt).includes(normText(e.passage)), `${u.id} : passage introuvable dans ${e.content}`);
    assert(KB.contents.find(c => c.id === e.content)?.url, `${u.id} : pas de lien vers l'original`);
  }
  return `${all.length} unités affichées, ${all.reduce((n, u) => n + u.evidence.length, 0)} passages tous retrouvés dans les textes consultés, chacun avec un lien.`;
});
await t("Une modification du profil change la sélection", "réel", () => {
  const base = { role: "bottom", rank: "or", champions: ["Lucian"], mode: "duo", goal: "lane", time: 15 };
  const a = CS.prepare(KB, base), b = CS.prepare(KB, { ...base, rank: "diamant" }), c = CS.prepare(KB, base, { vs: "Lulu" }), d = CS.prepare(KB, { ...base, champions: ["Jinx"], goal: "teamfight" }), e = CS.prepare(KB, { ...base, goal: "methode" });
  const f = CS.prepare(KB, { ...base, time: 5 });
  assert(a.stats.every(s => s.bucket === "diamant+") && b.stats.every(s => s.bucket === "diamant+"), "référence autre que Diamant+");
  assert(c.plan.some(x => x.unit.matchup?.vs === "Lulu") && !a.plan.some(x => x.unit.matchup), "adversaire sans effet");
  assert(d.goal.unit.id !== a.goal.unit.id && e.goal.unit.id !== a.goal.unit.id, "champion ou objectif sans effet");
  assert(f.plan.length < a.plan.length || a.plan.length <= 2, "temps disponible sans effet");
  return `Contre Lulu : +consigne de matchup. Jinx/combats : ${d.goal.unit.id}. Méthode : ${e.goal.unit.id}. 5 min : ${f.plan.length} consignes contre ${a.plan.length}. Statistiques : toujours Diamant+, quel que soit le rang.`;
});
await t("Aucun plan propre à un adversaire non renseigné", "réel", () => {
  for (const ch of ["Lucian", "Jinx", "Smolder", "Lulu", "Milio", "Nami"]) for (const g of ["lane", "survie", "teamfight", "synergie"]) {
    const role = ["Lulu", "Milio", "Nami"].includes(ch) ? "support" : "bottom";
    const r = CS.prepare(KB, { role, rank: "or", champions: [ch], mode: "solo", goal: g, time: 30 });
    assert(![r.goal?.unit, ...r.plan.map(x => x.unit)].some(u => u?.matchup), `${ch}/${g} : matchup proposé sans adversaire`);
  }
  return "24 profils testés : aucune consigne de matchup sans adversaire choisi.";
});
await t("Lecture automatique des notes de patch", "réel", async () => {
  const text = await need("c-riot-notes-26-19");
  const roster = JSON.parse(await readFile(join(ROOT, "coach/cache/roster.json"), "utf8")).names;
  const r = parseChanges(text, roster);
  assert(r.entities.includes("Lucian/passive") && r.entities.includes("Lucian/Q"), r.entities.join(","));
  return `26.19 : ${r.entities.length} éléments relevés, dont Lucian/passive et Lucian/Q.`;
});
await t("Import de transcription : horodatages conservés", "fixture", () => {
  const out = parseCaptions(fx.srt);
  assert(out.startsWith("[00:01:05]") && out.includes("[01:02:03]"), out);
  return out.split("\n").slice(0, 2).join(" / ");
});
await t("Tri des vidéos sur métadonnées (priorité, pas preuve)", "fixture", async () => {
  const items = parseYoutubeFeed(fx.rss);
  const tr = triage(`${items[0].title} ${items[0].description}`, L.config.pilot);
  assert(tr.matched.includes("Lucian") && /ne prouve pas/.test(tr.basis), JSON.stringify(tr));
  const clip = triage("Gob se fait daronned par une coréenne #twitch", L.config.pilot), guide = triage("GUIDE TEMPO - COMMENT MONTER CHALLENGER SUR LEAGUE OF LEGENDS", L.config.pilot);
  assert(clip.score < guide.score && clip.entertainment.length, `extrait de stream ${clip.score} ≥ guide ${guide.score}`);
  const { quotaHit } = await import("../gemini.mjs");
  quotaHit.add("fx-modele", "Please retry in 0h0m0.001s.");
  await new Promise(r => setTimeout(r, 5));
  assert(!quotaHit.has("fx-modele"), "quota épuisé jamais oublié (serveur longue durée bloqué)");
  quotaHit.add("fx-modele-2", "Please retry in 6h51m38.6s."); assert(quotaHit.has("fx-modele-2"), "quota oublié trop tôt"); quotaHit.until.delete("fx-modele-2");
  const { isTeaching } = await import("../video.mjs");
  assert(isTeaching({ title: "What Is Actually Keeping You Stuck In Silver? - FULL CASE STUDY", triage: { entertainment: [] } }) && isTeaching({ title: "J'AFFRONTE G2 CAPS", backfill: true }), "vidéo pédagogique longue non reconnue");
  assert(!isTeaching({ title: "🔴 LIVE soloq grind", triage: { entertainment: ["🔴"] } }), "direct traité comme un cours");
  const { keep } = await import("../backfill.mjs");
  assert(keep({ title: "GUIDE QIYANA S12 - COMMENT BIEN JOUER LE CHAMPION", length: "11:26" }) && keep({ title: "DANS LA TETE D'UN CHALLENGER - EPISODE 6", length: "28:45" }), "ancien guide écarté");
  assert(![["TIERLIST MID PATCH 26.11", "12:00"], ["LA LÉTALITÉ COMMENT CA MARCHE ?", "0:55"], ["SOS Élo Hell (+inscription) - Fin des guides", "14:41"]].some(([title, length]) => keep({ title, length })), "tier list, extrait court ou annonce gardés");
  return `« ${items[0].title} » → priorité ${tr.score} (${tr.matched.join(", ")}) ; ${tr.basis}.`;
});
await t("Règles verrouillées contre toute modification automatique", "réel", async () => {
  const s = await rulesLockStatus();
  assert(s.ok, `modifiées : ${s.changed.join(", ")}`);
  return "Empreintes des règles et des trois instructions conformes ; l'analyse s'arrête si elles changent sans validation humaine.";
});

await t("Vidéo lue par IA : au mieux provisoire, patch futur signalé", "fixture", () => {
  const c2 = { ...fxCtx, contents: new Map([...fxCtx.contents, ["fx-video", { id: "fx-video", sourceId: "yt-skill-capped", type: "video", title: "Vidéo (fixture)", access: "transcription+visuel", analysis: "analysee", reader: { kind: "ia", tool: "gemini (fixture)", fps: 1 } }]]), texts: new Map([...fxCtx.texts, ["fx-video", "[07:00] (parole) Engage supports need space to engage."]]) };
  // Patch futur calculé à partir du patch courant (le test ne doit pas dépendre de la date)
  const [maj, min] = String(c2.current || fxCtx.current || "26.20").split(".").map(Number), future = `${maj}.${min + 1}`;
  const u = { id: "fx-v", claim: "Selon Skill Capped : un support d'engagement a besoin d'espace.", champions: [], roles: ["bottom"], themes: ["lane"], context: { queue: "solo" }, patch: { known: true, value: future }, nature: "opinion", translation: { term: "engage", note: "engager" }, evidence: [{ content: "fx-video", locator: "[07:00]", lang: "en", passage: "Engage supports need space to engage." }] };
  const r = checkUnit(u, c2);
  assert(!r.blocking && r.status === "provisoire", r.status);
  assert(r.flags.some(f => f.code === "lecture-ia") && r.flags.some(f => f.code === "patch-futur"), r.flags.map(f => f.code).join(","));
  const ok = checkUnit({ ...u, patch: { known: false }, evidence: [{ ...u.evidence[0], humanChecked: true }] }, c2);
  assert(!ok.flags.some(f => f.code === "lecture-ia"), "vérification humaine ignorée");
  return `Passage lu par Gemini → provisoire jusqu'à vérification humaine ; patch ${future} (non sorti) → signalé comme prévision.`;
});
await t("Analyse v2 : contexte d'usage, seconde lecture de l'extrait, sur-généralisation", "fixture", () => {
  const c2 = { ...fxCtx, contents: new Map([...fxCtx.contents, ["fx-video", { id: "fx-video", sourceId: "yt-skill-capped", type: "video", title: "Vidéo (fixture)", access: "transcription+visuel", analysis: "analysee", reader: { kind: "ia", tool: "gemini (fixture)", fps: 1 } }]]), texts: new Map([...fxCtx.texts, ["fx-video", "[07:00] (parole) Engage supports need space to engage."]]) };
  const use = { when: "Ton support d'engagement cherche un angle en lane.", who: "Supports d'engagement", how: ["Laisse-lui de l'espace devant les sbires"], why: "", notWhen: "" };
  const base = { id: "fx-v2", claim: "Selon Skill Capped : un support d'engagement a besoin d'espace.", champions: [], roles: ["bottom"], themes: ["lane"], context: { queue: "solo" }, patch: { known: false }, nature: "opinion", translation: { term: "engage", note: "engager" }, use, origin: "analyse-automatique", promptVersions: { extraction: "v2" } };
  const ev = auto => [{ content: "fx-video", locator: "[07:00]", lang: "en", passage: "Engage supports need space to engage.", ...(auto ? { autoChecked: auto } : {}) }];
  const verified = checkUnit({ ...base, evidence: ev({ by: "fx", window: "400-460s", said: true, supported: true }) }, c2);
  assert(!verified.blocking && verified.status === "exploitable", `vérifié et complet → ${verified.status} (${verified.flags.map(f => f.code)})`);
  const unheard = checkUnit({ ...base, evidence: ev({ by: "fx", window: "400-460s", said: false, supported: false }) }, c2);
  assert(unheard.blocking && unheard.flags.some(f => f.code === "citation-non-entendue"), "passage non entendu accepté");
  const stronger = checkUnit({ ...base, claim: "Selon Skill Capped : un support d'engagement a toujours besoin d'espace.", evidence: ev({ by: "fx", window: "400-460s", said: true, supported: true }) }, c2);
  assert(stronger.status === "provisoire" && stronger.flags.some(f => f.code === "sur-generalisation"), "« toujours » ajouté non détecté");
  const noWhen = checkUnit({ ...base, use: { ...use, when: "" }, evidence: ev({ by: "fx", window: "400-460s", said: true, supported: true }) }, c2);
  assert(noWhen.status === "provisoire" && noWhen.flags.some(f => f.code === "contexte-manquant"), "conseil sans situation exploitable");
  const unchecked = checkUnit({ ...base, evidence: ev(null) }, c2);
  assert(unchecked.status === "provisoire" && unchecked.flags.some(f => f.code === "lecture-ia"), "lecture IA non vérifiée exploitable");
  const cut = checkUnit({ ...base, evidence: [{ ...ev({ by: "fx", window: "400-460s", said: true, supported: true })[0], passage: "Engage supports need [...] to engage." }] }, { ...c2, texts: new Map([...c2.texts, ["fx-video", "[07:00] (parole) Engage supports need a lot of space to engage."]]) });
  assert(!cut.flags.some(f => f.code === "citation-introuvable"), "passage coupé par « [...] » refusé à tort");
  return "Vérifié sur l'extrait et contexte complet → exploitable ; passage coupé « [...] » retrouvé morceau par morceau ; passage non entendu → rejeté ; « toujours » ajouté ou situation absente → provisoire.";
});
await t("Règles v1.3 : durée de vie, nuance des conseils anciens, sources communautaires, vérification par nos données", "fixture", () => {
  const old = { id: "fx-createur-a", ...fxCtx.contents.get("fx-createur-a"), published: "2021-04-19" };
  const c3 = { ...fxCtx, contents: new Map([...fxCtx.contents, ["fx-createur-a", old], ["fx-reddit", { id: "fx-reddit", sourceId: "fx-communaute", type: "article", title: "Post (fixture)", access: "texte-integral", analysis: "analysee", published: "2026-10-01" }]]),
    texts: new Map([...fxCtx.texts, ["fx-reddit", "Ward the river brush when your wave is pushed."]]), sources: new Map([...fxCtx.sources, ["fx-communaute", { id: "fx-communaute", trust: "communaute" }]]) };
  const use = { when: "Ta vague est poussée chez l'adversaire.", who: "Laners", how: ["Place une ward dans le buisson de la rivière"], why: "", notWhen: "" };
  const base = { claim: "Selon un créateur : conseil.", champions: [], roles: ["bottom"], context: { queue: "solo" }, patch: { known: false }, nature: "opinion", levelContext: "diamant", use };
  // Principe général ancien : ni provisoire ni nuancé
  const timeless = checkUnit({ ...base, id: "fx-v13-a", themes: ["vision", "vagues"], evidence: [{ content: "fx-createur-a", locator: "§1", lang: "fr", passage: "montez Prison aqueuse en premier" }] }, c3);
  assert(timeless.lifespan === "intemporel" && !timeless.nuance && !timeless.flags.some(f => f.code === "contenu-ancien"), `principe général ancien pénalisé (${timeless.lifespan}, ${timeless.nuance})`);
  // Conseil ancien lié à un système de jeu : gardé, provisoire, avec la nuance de ce qui a pu changer
  const sys = checkUnit({ ...base, id: "fx-v13-b", themes: ["survie"], dependsOn: ["system:camps-de-jungle"], evidence: [{ content: "fx-createur-a", locator: "§1", lang: "fr", passage: "montez Prison aqueuse en premier" }] }, c3);
  assert(sys.lifespan === "systeme" && /2021.*revérifier.*camps de jungle/.test(sys.nuance || "") && sys.status === "provisoire", `nuance absente : ${sys.lifespan} / ${sys.nuance}`);
  // Confirmé par nos données récentes : l'âge ne compte plus
  const ok = checkUnit({ ...base, id: "fx-v13-c", themes: ["survie"], dependsOn: ["system:camps-de-jungle"], dataCheck: { result: "confirme", sample: "640 parties Diamant+", note: "" }, evidence: [{ content: "fx-createur-a", locator: "§1", lang: "fr", passage: "montez Prison aqueuse en premier" }] }, c3);
  assert(!ok.nuance && !ok.flags.some(f => f.code === "contenu-ancien"), "confirmation par nos données ignorée");
  // Contredit par nos données : provisoire, et la nuance donne la mesure
  const ko = checkUnit({ ...base, id: "fx-v13-d", themes: ["survie"], dataCheck: { result: "contredit", sample: "640 parties Diamant+", note: "Aujourd'hui, le premier gank arrive plutôt vers 3:00." }, evidence: [{ content: "fx-createur-a", locator: "§1", lang: "fr", passage: "montez Prison aqueuse en premier" }] }, c3);
  assert(ko.status === "provisoire" && ko.flags.some(f => f.code === "donnees-contredisent") && /3:00/.test(ko.nuance), "contradiction par nos données non signalée");
  // Source communautaire (rang déclaré) : jamais exploitable seule
  const red = checkUnit({ ...base, id: "fx-v13-e", themes: ["vision", "vagues"], evidence: [{ content: "fx-reddit", locator: "post", lang: "en", passage: "Ward the river brush when your wave is pushed." }] }, c3);
  assert(red.status === "provisoire" && red.flags.some(f => f.code === "rang-non-verifie"), `source communautaire seule → ${red.status}`);
  return "Principe général ancien → gardé tel quel ; conseil ancien lié à un système → provisoire avec « ce qui a pu changer » ; confirmé par nos données → nuance levée ; contredit → provisoire avec la mesure ; source communautaire seule → provisoire.";
});
await t("Situations Diamant+ : mêmes définitions que le bilan, rythme d'objets comparé au même champion", "fixture", async () => {
  const { review } = await import("../review.mjs");
  const { playerLines } = await import("../situations.mjs");
  const P = (id, team, pos) => ({ participantId: id, puuid: `p${id}`.padEnd(60, "x"), teamId: team, teamPosition: pos, championName: `C${id}`, championId: id, win: team === 100, kills: 2, deaths: 1, assists: 3, totalMinionsKilled: 150, neutralMinionsKilled: 10, gameEndedInEarlySurrender: false, challenges: { laneMinionsFirst10Minutes: 70, visionScorePerMinute: 0.7, killParticipation: 0.5, teamDamagePercentage: 0.2, controlWardsPlaced: 2 } });
  const parts = [P(1, 100, "MIDDLE"), P(2, 200, "MIDDLE"), P(3, 200, "JUNGLE")];
  const match = { metadata: { matchId: "EUW1_2" }, info: { gameDuration: 1800, gameStartTimestamp: 0, queueId: 420, gameVersion: "16.21.1.1", participants: parts } };
  const frames = Array.from({ length: 31 }, (_, m) => ({ participantFrames: { 1: { totalGold: 500 * m, minionsKilled: 8 * m, jungleMinionsKilled: 0, xp: 400 * m, currentGold: 300 }, 2: { totalGold: 500 * m, minionsKilled: 8 * m, jungleMinionsKilled: 0, xp: 400 * m, currentGold: 300 }, 3: { totalGold: 500 * m, minionsKilled: 0, jungleMinionsKilled: 6 * m, xp: 400 * m, currentGold: 300 } }, events: [] }));
  frames[4].events.push({ type: "ITEM_PURCHASED", participantId: 1, itemId: 1001, timestamp: 250000 });
  frames[8].events.push({ type: "CHAMPION_KILL", victimId: 1, killerId: 3, assistingParticipantIds: [], timestamp: 500000, position: { x: 7000, y: 7000 } });
  frames[8].events.push({ type: "ITEM_PURCHASED", participantId: 1, itemId: 1001, timestamp: 530000 }); // après une mort : pas un retour choisi
  frames[11].events.push({ type: "ITEM_PURCHASED", participantId: 1, itemId: 3089, timestamp: 690000 });
  const tl = { info: { participants: parts.map(p => ({ participantId: p.participantId, puuid: p.puuid })), frames } };
  const db = { 1001: { name: "Bottes", gold: { total: 300 }, into: ["3006"], tags: ["Boots"] }, 3089: { name: "Coiffe", gold: { total: 3600 }, tags: [] } };
  const fetchImpl = async url => ({ json: async () => (url.includes("versions") ? ["16.21.1"] : { data: db }) });
  const riot = async url => (url.endsWith("/timeline") ? tl : match);
  // Même lecture des retours et du premier grand item que le bilan
  const itemDb = Object.fromEntries(Object.entries(db).map(([id, it]) => [id, { name: it.name, gold: it.gold.total, final: !it.into?.length && it.gold.total >= 2000, boots: it.tags?.includes("Boots") }]));
  const line = playerLines(match, tl, itemDb).find(l => l.champion === "C1");
  const plain = await review(riot, { matchId: "EUW1_2", puuid: parts[0].puuid, region: "europe", benchmarks: null, fetchImpl });
  assert(line.backs14 === plain.habits.backs14 && Math.abs(line.legendaryMin - plain.habits.legendaryMin) < 0.1, `définitions divergentes : situations ${line.backs14} retours / ${line.legendaryMin} min, bilan ${plain.habits.backs14} / ${plain.habits.legendaryMin}`);
  assert(line.firstBack > 4 && line.firstBack < 4.3, `premier retour ${line.firstBack}`);
  // 11,5 min : dans la norme générale (14 min), en retard pour ce champion chez les Diamant+ (médiane 9, trois quarts avant 10)
  assert(!plain.findings.some(f => f.kind === "premier-objet-tardif"), "seuil général : 11,5 min signalé à tort");
  const sit = { byRole: { mid: { n: 1500, legendaryMin: { p50: 11.4, p75: 12.6 } } }, byChamp: { "C1|mid": { n: 120, legendaryMin: { p50: 9, p75: 10 } } } };
  const withRef = await review(riot, { matchId: "EUW1_2", puuid: parts[0].puuid, region: "europe", benchmarks: null, situations: sit, fetchImpl });
  const f = withRef.findings.find(f => f.kind === "premier-objet-tardif");
  assert(f && /ce champion à ce poste.*9 min.*120 parties/.test(f.facts[0]), `référence du champion non utilisée : ${JSON.stringify(f)}`);
  return "Retours et premier grand item lus de la même façon que le bilan ; 11,5 min accepté au seuil général, signalé face aux Diamant+ du même champion (médiane 9 min, 120 parties).";
});
await t("Vidéos réellement lues : durée conforme et passages retrouvés", "réel", async () => {
  const vids = L.contents.contents.filter(c => c.reader?.kind === "ia");
  if (!vids.length) throw Object.assign(new Error("ignoré : aucune vidéo lue"), { skip: true });
  const units = L.units.units.filter(u => u.evidence.some(e => vids.some(v => v.id === e.content)));
  for (const u of units) for (const e of u.evidence) { const txt = await need(e.content); assert(normText(txt).includes(normText(e.passage)), `${u.id} : passage absent de la transcription`); }
  // Règles v1.2 : un passage lu par IA n'est exploitable que confirmé par une personne ou par la seconde lecture de l'extrait
  const checked = u => u.evidence.some(e => e.humanChecked || (e.autoChecked?.said && e.autoChecked?.supported));
  assert(units.every(u => ev(u).status !== "exploitable" || checked(u)), "une unité vidéo non vérifiée est exploitable");
  const ok = units.filter(u => ev(u).status === "exploitable").length;
  return `${vids.length} vidéos lues (${vids.map(v => v.reader.duration).join(", ")}), ${units.length} unités, passages retrouvés ; ${ok} exploitable(s), toutes confirmées par une seconde lecture ou une personne.`;
});

await t("Build adapté : variante mesurée seulement si l'objet répond à la menace", "fixture", async () => {
  const { computeBuilds, adviseBuild } = await import("../builds.mjs");
  // Catalogue : 1 = résistance magique, 2 = armure, 3 = objet offensif sans rapport ; champion 10 = moi, 20 = mage, 30 et 40 = combattants physiques
  const cat = { version: "x", items: { 1: { name: "RM", tags: ["resistance-magique"] }, 2: { name: "Armure", tags: ["armure"] }, 3: { name: "Attaque", tags: [] } } };
  const row = (c, t, items, magic) => ({ c, t, role: "mid", items, dmg: magic ? [1000, 20000, 0] : c === 40 ? [21000, 0, 0] : [20000, 1000, 0], cc: 10, tank: 20000 });
  const matches = [];
  for (let i = 0; i < 400; i++) {
    const ap = i % 2 === 0;
    // Face aux mages, « moi » achète l'objet RM 7 fois sur 10 (contre 1 fois sur 10 sinon) et l'objet sans rapport aussi souvent
    const mine = [3, ...(ap ? (i % 10 < 7 ? [1] : []) : (i % 10 < 1 ? [1] : [])), ...(ap && i % 10 < 7 ? [3] : [])];
    const foes = Array.from({ length: 5 }, () => row(ap ? 20 : 30, 200, [], ap));
    matches.push({ patch: "1.1", d: 30, rows: [row(10, 100, mine, false), row(30, 100, [], false), row(30, 100, [], false), row(40, 100, [], false), row(40, 100, [], false), ...foes] });
  }
  const b = computeBuilds({ matches }, cat, { patch: "1.1" });
  const adv = adviseBuild(b, 10, [20, 20, 20, 20, 20], "mid");
  const ap = adv.threats.find(x => x.key === "ap");
  assert(ap, "menace magique non détectée");
  assert(ap.measured?.items.some(x => x.id === "1"), "l'objet de résistance magique n'est pas proposé");
  assert(!ap.measured.items.some(x => x.id === "3"), "un objet sans rapport avec la menace est proposé");
  const calm = adviseBuild(b, 10, [40, 40, 40, 30, 30], "mid");
  assert(!adviseBuild(b, 10, [20, 20, 20, 20, 20], "support").threats.find(x => x.key === "ap").measured, "variante d'un autre rôle proposée");
  assert(!calm.threats.some(x => x.key === "ap"), "menace magique inventée face à une équipe physique");
  return `variante RM : ${ap.measured.items[0].on} % contre ${ap.measured.items[0].off} %, objet sans rapport écarté.`;
});

await t("Référence Diamant+ par rôle : un champion joué top et support n'a pas le même build", "fixture", async () => {
  const { compute } = await import("../benchmarks.mjs");
  const { champAtRole } = await import("../review.mjs");
  const at = Date.now();
  // Champion 80 : 60 parties top (objets 1 et 2), 40 parties support (objets 9 et 1)
  const r = (role, items) => ({ c: "80", n: "Pantheon", role, win: 1, items, ks: 1, prim: 8000, sec: 8400, spells: [4, 12], m: {} });
  const matches = [...Array.from({ length: 60 }, () => ({ at, patch: "1.1", d: 30, rows: [r("top", [1, 2])] })), ...Array.from({ length: 40 }, () => ({ at, patch: "1.1", d: 30, rows: [r("support", [9, 1])] }))];
  const { champstats } = compute({ platform: "euw1", matches });
  const c = champstats.champions["80"];
  assert(c.items[0].id === "1", "relevé global inattendu");
  const sup = champAtRole(c, "support", 30), top = champAtRole(c, "top", 30);
  assert(sup && sup.games === 40 && sup.items.some(x => x.id === "9") && !sup.items.some(x => x.id === "2"), "le support reçoit des objets du top");
  assert(top && !top.items.some(x => x.id === "9"), "le top reçoit l'objet du support");
  assert(champAtRole(c, "jungle", 30) === null, "rôle sans parties accepté");
  return "support : 40 parties, objets du support seulement ; top : 60 parties.";
});

await t("Build adapté en partie : tanks, critiques et soigneurs détectés depuis les profils exportés", "fixture", async () => {
  const { adviseBuild } = await import("../builds.mjs");
  // Profils tels qu'écrits dans builds.json (tank / crit / healer en 0 ou 1)
  const p = (o) => ({ magic: 0.1, phys: 0.9, dmg: 15000, cc: 1, tank: 0, crit: 0, healer: 0, ...o });
  const b = { cuts: { magic: 0.5, phys: 0.95, cc: 20 }, champions: {}, items: {},
    profiles: { 1: p({ tank: 1 }), 2: p({ tank: 1, healer: 1 }), 3: p({ crit: 1 }), 4: p({ crit: 1, healer: 1 }), 5: p({}) } };
  const keys = adviseBuild(b, 9, [1, 2, 3, 4, 5]).threats.map(x => x.key);
  for (const k of ["tanks", "crit", "heal"]) assert(keys.includes(k), `menace « ${k} » non détectée en partie`);
  const calm = adviseBuild(b, 9, [1, 3, 5, 5, 5]).threats.map(x => x.key);
  assert(!calm.some(k => ["tanks", "crit", "heal"].includes(k)), "menace détectée avec un seul champion concerné");
  return `menaces détectées : ${keys.join(", ")}.`;
});

await t("Joueur absent (AFK) : partie reconnue et sortie des objectifs", "fixture", async () => {
  const { summarize, goalFor } = await import("../review.mjs");
  const player = (o = {}) => ({ puuid: "moi", teamId: 100, teamPosition: "TOP", championName: "Sett", championId: 875, win: false, kills: 3, deaths: 4, assists: 5, totalMinionsKilled: 180, neutralMinionsKilled: 4, totalDamageDealtToChampions: 15000, visionScore: 18, goldEarned: 10000, challenges: {}, ...o });
  const match = me => ({ metadata: { matchId: "EUW1_1" }, info: { gameDuration: 1890, gameVersion: "26.20.1", queueId: 420, gameStartTimestamp: 0, participants: [me] } });
  const afk = summarize(match(player({ kills: 0, deaths: 0, assists: 0, totalMinionsKilled: 2, neutralMinionsKilled: 0, totalDamageDealtToChampions: 727, visionScore: 0 })), "moi");
  const played = summarize(match(player()), "moi");
  const badGame = summarize(match(player({ kills: 0, deaths: 9, assists: 1, totalMinionsKilled: 90, totalDamageDealtToChampions: 5000 })), "moi");
  assert(afk.absent === true, "partie AFK non reconnue");
  assert(!played.absent && !badGame.absent, "partie jouée (même mauvaise) prise pour une absence");
  const goal = goalFor([afk, played, played], "top", { roles: {} });
  assert(goal.games === 2, "la partie AFK compte dans les objectifs");
  return "absence reconnue ; une mauvaise partie (0/9/1) reste analysée.";
});

await t("Plans de jeu : seuls les écarts nets et sûrs, rien d'absurde selon le poste, pas de résultat pris pour un conseil", "fixture", async () => {
  const { planLines } = await import("../styles.mjs");
  const tr = (gap, sure = true, win = null) => ({ label: "mesure", my: "ta mesure", value: "8,0", roleValue: "7,5", gap, gapSure: sure, win });
  const curve = [{ n: 0 }, { n: 0 }, { n: 0 }];
  // Mid qui farme, roame peu, fait des team fights et split push : une seule ligne de fin de partie (la plus marquée)
  const mid = planLines("Orianna|mid", { traits: { csMin: tr(.5), roam: tr(-.3), otherLanes: tr(-.3), lateKp: tr(.6), side: tr(.4) }, curve });
  assert(mid.filter(l => l.key === "fin").length === 1 && mid.find(l => l.key === "fin").text.startsWith("Champion de team fight"), "team fight et split push en même temps");
  assert(mid.some(l => l.key === "roam") && mid.some(l => l.key === "farm"), "trait net absent");
  // Écart non sûr ou trop faible : aucune ligne
  assert(!planLines("X|mid", { traits: { csMin: tr(.5, false), lateKp: tr(.1) }, curve }).length, "écart incertain ou faible retenu");
  // Support : ni farm, ni tourelles ; ADC : pas de vision
  assert(!planLines("Thresh|support", { traits: { csMin: tr(-.6), buildings: tr(.6) }, curve }).length, "farm ou tourelles proposés à un support");
  assert(!planLines("Jinx|bottom", { traits: { wardsKilled: tr(.6), wards: tr(.6) }, curve }).length, "vision proposée à un ADC");
  // Lien avec la victoire : un comportement (farm à 10 min) oui, un résultat (part des dégâts) non
  const win = { champ: 25, role: 10, own: 15, sure: true };
  const w = planLines("Ahri|mid", { traits: { cs10: tr(0, true, win), dmg: tr(0, true, win) }, curve });
  assert(w.length === 1 && w[0].key === "gagne-cs10", "un résultat de partie présenté comme ce qui fait gagner");
  // Nom affiché du champion
  assert(planLines("Kaisa|bottom", { traits: { csMin: tr(.5) }, curve }, "Kai'Sa")[0].text.includes("Kai'Sa"), "nom affiché absent");
  return "écarts incertains écartés, une seule ligne de fin de partie, rien d'absurde selon le poste, liens avec la victoire limités aux comportements.";
});

await t("COACH-002 Normaliseur : champs absents à null, instant T par timestamp, adversaire de lane prudent", "fixture", async () => {
  const { normalizeMatch, frameAt, participantAt, laneOpponent, ratio } = await import("../normalize.mjs");
  const P = (id, team, pos, extra = {}) => ({ participantId: id, puuid: `p${id}`, teamId: team, teamPosition: pos, championName: `C${id}`, win: team === 100, kills: 1, deaths: 2, assists: 3, totalMinionsKilled: 100, neutralMinionsKilled: 4, ...extra });
  const match = { metadata: { matchId: "EUW1_42" }, info: { queueId: 420, gameVersion: "16.21.734.1234", gameStartTimestamp: 1, gameEndTimestamp: 2, gameDuration: 1800,
    participants: [P(1, 100, "MIDDLE"), P(2, 200, "MIDDLE", { visionScore: undefined, kills: null }), P(3, 100, "JUNGLE"), P(4, 200, ""), P(5, 200, "JUNGLE"), P(6, 200, "JUNGLE")],
    teams: [{ teamId: 100, win: true, objectives: { champion: { kills: 10 } } }, { teamId: 200, win: false, objectives: {} }] } };
  const pf = (m, extra = {}) => Object.fromEntries([1, 2, 3, 4, 5, 6].map(i => [String(i), { minionsKilled: 8 * m, jungleMinionsKilled: 0, totalGold: 500 + 400 * m, xp: 300 * m, level: 1 + m, position: { x: 1000, y: 1000 }, ...extra }]));
  // Frames enregistrées un peu après la minute ronde, comme chez Riot ; la frame de 7:00 manque
  const frames = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10].map(m => ({ timestamp: m * 60000 + (m ? 236 : 0), participantFrames: pf(m), events: [] }));
  const tl = { info: { frameInterval: 60000, frames } };
  const n = normalizeMatch(match, tl);
  assert(n.duration_s === 1800 && n.patch === "16.21" && n.platform === "euw1" && n.timeline_status === "ok", "en-tête de partie mal lu");
  const p2 = n.participants.find(p => p.participant_id === 2);
  assert(p2.kills === null && p2.vision_score === null, "champ absent transformé en 0");
  assert(n.teams[1].champion_kills === null && n.teams[0].champion_kills === 10, "objectif d'équipe absent transformé en 0");
  assert(n.participants.find(p => p.participant_id === 4).role === null, "poste vide deviné");
  // Ancienne durée en millisecondes (pas de gameEndTimestamp)
  assert(normalizeMatch({ metadata: {}, info: { ...match.info, gameEndTimestamp: undefined, gameDuration: 1800000 } }).duration_s === 1800, "durée en millisecondes non convertie");
  // F(p,T) : 10:00 lue sur la frame de 10:00 (236 ms après), pas sur celle de 9:00 ; 7:00 absente → 6:00 avec sa précision
  const f10 = frameAt(tl, 600000);
  assert(f10.observed_at_ms === 600236 && f10.precision_ms === 236, "frame de 10:00 mal choisie");
  const f7 = frameAt(tl, 420000);
  assert(f7.observed_at_ms === 360236 && f7.precision_ms === 59764, "frame manquante non signalée par la précision");
  assert(frameAt(tl, -1) === null && frameAt(null, 600000) === null, "instant impossible non refusé");
  assert(participantAt(tl, 1, 600000).cs === 80 && participantAt(tl, 99, 600000) === null, "participant absent ou mal indexé");
  assert(participantAt({ info: { frames: [{ timestamp: 600000, participantFrames: { 1: { minionsKilled: 80 } } }] } }, 1, 600000).cs === null, "farm de jungle absent compté comme 0");
  // Adversaire : mid unique → haute ; poste vide → faible ; deux junglers en face → faible et aucun adversaire
  assert(laneOpponent(n, 1).participant_id === 2 && laneOpponent(n, 1).confidence === "haute", "adversaire de mid non trouvé");
  assert(laneOpponent(n, 4).confidence === "faible" && laneOpponent(n, 3).participant_id === null, "adversaire ambigu accepté");
  // Division par zéro et timeline incohérente
  assert(ratio(5, 0) === null && ratio(null, 3) === null && ratio(6, 3) === 2, "division par zéro non nulle");
  assert(normalizeMatch(match, { info: { frames: [{ timestamp: 0, participantFrames: { 1: {} } }] } }).timeline_status === "invalide", "timeline d'une autre partie acceptée");
  assert(normalizeMatch(match).timeline_status === "absente", "timeline absente non signalée");
  let threw = false; try { normalizeMatch({}); } catch (e) { threw = e.code === "match-invalide"; }
  assert(threw, "réponse vide acceptée");
  return "null pour les champs absents et les divisions par zéro, 10:00 lue à 10:00 (+236 ms), frame manquante signalée par sa précision, adversaire ambigu refusé.";
});

// Partie synthétique pour les tickets COACH-006 à 008 : joueur 1 mid (équipe 100) contre 2, jungler 3 contre 5
function v1Game({ id = "EUW1_1", start = 1000, cs10 = 70, deaths = 1, kills = 3, assists = 4, teamKills = 14, vision = 18, role = "MIDDLE", queue = 420, duration = 1800, timeline = true, win = true } = {}) {
  const P = (pid, team, pos, x = {}) => ({ participantId: pid, puuid: `p${pid}`, teamId: team, teamPosition: pos, championName: `C${pid}`, win: team === 100 ? win : !win, kills: 1, deaths: 1, assists: 1, totalMinionsKilled: 200, neutralMinionsKilled: 10, goldEarned: 10000, totalDamageDealtToChampions: 15000, visionScore: 20, wardsPlaced: 10, ...x });
  const parts = [P(1, 100, role, { kills, assists, visionScore: vision }), P(2, 200, "MIDDLE"), P(3, 100, "JUNGLE"), P(5, 200, "JUNGLE")];
  const pf = m => ({ 1: { minionsKilled: Math.round(cs10 * m / 10), jungleMinionsKilled: 0, totalGold: 500 + 350 * m, xp: 450 * m }, 2: { minionsKilled: 7 * m, jungleMinionsKilled: 0, totalGold: 500 + 300 * m, xp: 430 * m }, 3: { minionsKilled: 0, jungleMinionsKilled: 6 * m, totalGold: 500, xp: 400 * m }, 5: { minionsKilled: 0, jungleMinionsKilled: 6 * m, totalGold: 500, xp: 400 * m } });
  const frames = Array.from({ length: Math.floor(duration / 60) + 1 }, (_, m) => ({ timestamp: m * 60000 + (m ? 200 : 0), participantFrames: pf(m), events: [] }));
  for (let i = 0; i < deaths; i++) frames[3 + i].events.push({ type: "CHAMPION_KILL", victimId: 1, killerId: 2, assistingParticipantIds: [], timestamp: (3 + i) * 60000 + 5000 });
  frames[20]?.events.push({ type: "ELITE_MONSTER_KILL", monsterType: "DRAGON", killerId: 3, killerTeamId: 100, assistingParticipantIds: [1], timestamp: 20 * 60000 + 100 });
  const match = { metadata: { matchId: id }, info: { queueId: queue, gameVersion: "16.21.1.1", gameStartTimestamp: start, gameEndTimestamp: start + duration * 1000, gameDuration: duration, participants: parts, teams: [{ teamId: 100, win, objectives: { champion: { kills: teamKills } } }, { teamId: 200, win: !win, objectives: { champion: { kills: 9 } } }] } };
  return { match, timeline: timeline ? { info: { frameInterval: 60000, frames } } : null };
}

await t("COACH-006 Catalogue de métriques : formules, null, adversaire, validité de la partie", "fixture", async () => {
  const { computeMetrics, CATALOG } = await import("../metrics.mjs");
  const g = v1Game({ cs10: 72, deaths: 2, kills: 4, assists: 3, teamKills: 14 });
  const m = computeMetrics(g.match, g.timeline, "p1");
  assert(m.valid && m.role === "MIDDLE" && m.metric_version === "metrics-1", "partie valide mal reconnue");
  assert(m.metrics.cs_at_10.value === 72 && m.metrics.cs_at_10.precision_ms === 200, "sbires à 10 min mal lus");
  assert(m.metrics.early_deaths.value === 2, "morts avant 14 min");
  assert(m.metrics.kill_participation.value === 0.5, "participation aux kills");
  assert(Math.abs(m.metrics.cs_per_min.value - 7) < 1e-9, "sbires par minute");
  assert(m.metrics.gold_diff_at_15.value === 750 && m.metrics.gold_diff_at_15.opponent_confidence === "haute", "écart d'or à 15 min");
  assert(m.metrics.objective_participation.value === 1, "participation aux objectifs");
  // Sans timeline : les métriques de timeline sont nulles, les autres restent
  const nt = computeMetrics(g.match, null, "p1");
  assert(nt.metrics.cs_at_10.value === null && nt.metrics.early_deaths.value === null && nt.metrics.cs_per_min.value != null, "métrique de timeline inventée sans timeline");
  // Équipe sans kills : participation nulle (division par zéro)
  assert(computeMetrics(v1Game({ teamKills: 0, kills: 0, assists: 0 }).match, null, "p1").metrics.kill_participation.value === null, "division par zéro");
  // Partie de 12 min : sbires à 15 min absents ; partie non classée, remake, poste vide : non valides
  assert(computeMetrics(v1Game({ duration: 720 }).match, v1Game({ duration: 720 }).timeline, "p1").metrics.cs_at_15.value === null, "sbires à 15 min dans une partie de 12 min");
  assert(computeMetrics(v1Game({ queue: 450 }).match, null, "p1").invalid_reason === "file-non-classee", "ARAM accepté");
  assert(computeMetrics(v1Game({ role: "" }).match, null, "p1").invalid_reason === "role-inconnu", "poste vide accepté");
  // Seules les métriques avec exercice sont entraînables ; dégâts : diagnostic seulement
  assert(Object.values(CATALOG).every(c => !c.trainable || typeof c.exercise === "function") && !CATALOG.damage_per_min.trainable, "métrique entraînable sans exercice");
  return "formules du brief vérifiées (sbires 72 à 10:00 lus à +200 ms, KP 50 %, écart d'or 750) ; null sans timeline, division par zéro et partie trop courte ; files et postes non valides écartés.";
});

await t("COACH-007 Choix de l'objectif : reproductible, sans LLM, éligibilité et score S = 100·G·I·F·A·C", "fixture", async () => {
  const { computeMetrics } = await import("../metrics.mjs");
  const { prioritize, proposeGoal } = await import("../goals.mjs");
  // 12 parties mid : farm faible (58 à 64 à 10 min), peu de morts, bonne participation
  const games = Array.from({ length: 12 }, (_, i) => { const g = v1Game({ id: `EUW1_${i}`, start: 1e6 - i, cs10: 58 + (i % 7), deaths: 1, kills: 6, assists: 4, teamKills: 16 }); return computeMetrics(g.match, g.timeline, "p1"); });
  const a = proposeGoal(games, "MIDDLE", { now: 5 }), b = proposeGoal(games, "MIDDLE", { now: 5 });
  assert(JSON.stringify(a) === JSON.stringify(b), "deux diagnostics différents sur les mêmes parties");
  assert(a.goal.metric === "cs_at_10" && a.goal.status === "proposed" && a.goal.version === "coach-v1", `objectif inattendu : ${a.goal?.metric}`);
  assert(a.goal.baseline === 60.5 && a.goal.target > a.goal.baseline && a.goal.target <= 70, `marche de progrès incohérente : ${a.goal.baseline} → ${a.goal.target}`);
  assert(a.goal.reference.source === "seuil-pedagogique" && /Vise \d+ sbires à 10:00/.test(a.goal.exercise), "référence ou exercice absent");
  const row = a.diagnostic.find(r => r.metric === "cs_at_10"), f = row.factors;
  assert(Math.abs(row.score - 100 * f.G * f.I * f.F * f.A * f.C) < 0.05, "score différent de 100·G·I·F·A·C");
  // Moins de 8 parties : aucun objectif
  assert(proposeGoal(games.slice(0, 7), "MIDDLE").goal === null, "objectif proposé avec 7 parties");
  // Moins de 70 % d'observations valides (timeline absente) : la métrique de timeline n'est pas éligible
  const noTl = Array.from({ length: 10 }, (_, i) => { const g = v1Game({ id: `EUW1_n${i}`, cs10: 50 }); return computeMetrics(g.match, i < 4 ? g.timeline : null, "p1"); });
  assert(prioritize(noTl, "MIDDLE").find(r => r.metric === "cs_at_10").eligible === false, "métrique éligible avec 40 % d'observations");
  // Référence mesurée (échantillon suffisant) préférée au seuil pédagogique ; échantillon trop petit ignoré
  const refs = { MIDDLE: { cs_at_10: { n: 8000, p50: 78, level: "Diamant et plus" } } };
  assert(proposeGoal(games, "MIDDLE", { references: refs }).goal.reference.source === "metric_references", "référence mesurée ignorée");
  assert(proposeGoal(games, "MIDDLE", { references: { MIDDLE: { cs_at_10: { n: 50, p50: 78 } } } }).goal.reference.source === "seuil-pedagogique", "petit échantillon utilisé comme référence");
  // Joueur au-dessus de la médiane mesurée : marche suivante = quart supérieur ; cible jamais au-delà de la référence
  const high = proposeGoal(games, "MIDDLE", { references: { MIDDLE: { cs_at_10: { n: 8000, p25: 50, p50: 55, p75: 63.4, level: "Diamant et plus" } } } });
  const hr = high.diagnostic.find(r => r.metric === "cs_at_10");
  assert(hr.eligible && hr.reference.quantile === "p75" && hr.target <= 63.4, "pas de marche au-dessus de la médiane, ou cible au-delà de la référence");
  ` `;
  return `objectif reproductible : sbires à 10 min, ${a.goal.baseline} → ${a.goal.target} (référence ${a.goal.reference.value}) ; pas d'objectif sous 8 parties ni sous 70 % d'observations ; référence mesurée seulement avec un échantillon suffisant.`;
});

await t("COACH-008 Cycle de vie : proposé → actif → en évaluation → réussi / raté / inconclusif → archivé", "fixture", async () => {
  const { computeMetrics } = await import("../metrics.mjs");
  const { transition, evaluateGoal, assertSingleActive, proposeGoal } = await import("../goals.mjs");
  const goal = transition({ id: "g", metric: "cs_at_10", role: "MIDDLE", direction: "higher", baseline: 60, target: 65, evaluation_games: 5, minimum_valid_games: 4, success_required: 3, status: "proposed", created_at: 0 }, "active", 100);
  const G = (i, cs10, x = {}) => { const g = v1Game({ id: `EUW1_e${i}`, start: 1000 + i, cs10, ...x }); return computeMetrics(g.match, x.noTl ? null : g.timeline, "p1"); };
  // 3 cibles atteintes sur 5, en perdant ces parties : réussite (victoire ≠ réussite)
  const won = evaluateGoal(goal, [G(1, 66, { win: false }), G(2, 60, { win: false }), G(3, 67, { win: false }), G(4, 65, { win: false }), G(5, 50)]);
  assert(won.outcome === "achieved" && won.goal.status === "achieved", "réussite non reconnue");
  // 2 cibles sur 5 en gagnant : échec
  assert(evaluateGoal(goal, [G(1, 66), G(2, 60), G(3, 61), G(4, 70), G(5, 50)]).outcome === "failed", "échec non reconnu");
  // Seulement 3 observations valides sur 5 (timelines absentes) : inconclusif
  assert(evaluateGoal(goal, [G(1, 66), G(2, 66, { noTl: true }), G(3, 66, { noTl: true }), G(4, 70), G(5, 70)]).outcome === "inconclusive", "données insuffisantes non signalées");
  // 5 parties à un autre rôle avant toute partie mid : inconclusif ; parties non classées ignorées ; 2 parties : en évaluation
  assert(evaluateGoal(goal, [1, 2, 3, 4, 5].map(i => G(i, 80, { role: "TOP" }))).outcome === "inconclusive", "changement de rôle non signalé");
  const mid = evaluateGoal(goal, [G(1, 70), G(2, 70, { queue: 450 }), G(3, 70)]);
  assert(mid.outcome === null && mid.goal.status === "evaluating" && mid.goal.progress.counted === 2, "partie non classée comptée ou état intermédiaire faux");
  // Parties d'avant l'activation ignorées
  assert(evaluateGoal(goal, [G(-950, 90), G(-920, 90)]).goal.progress.counted === 0, "partie antérieure à l'objectif comptée");
  // Transitions interdites, archivage, un seul objectif ouvert
  let bad = false; try { transition(goal, "achieved"); } catch (e) { bad = e.code === "transition-interdite"; }
  assert(bad, "active → achieved sans évaluation");
  assert(transition(won.goal, "archived").status === "archived", "archivage impossible");
  let multi = false; try { assertSingleActive([goal, { ...goal, id: "h" }]); } catch (e) { multi = e.code === "objectif-multiple"; }
  assert(multi, "deux objectifs ouverts acceptés");
  // Après deux échecs de suite sur la même métrique, elle est mise de côté au diagnostic suivant
  const games = Array.from({ length: 12 }, (_, i) => G(100 + i, 58 + (i % 7), { deaths: 4 }));
  const past = [{ metric: "cs_at_10", role: "MIDDLE", status: "archived", outcome: "failed", created_at: 2 }, { metric: "cs_at_10", role: "MIDDLE", status: "archived", outcome: "failed", created_at: 1 }];
  const next = proposeGoal(games, "MIDDLE", { pastGoals: past });
  assert(next.goal && !["cs_at_10", "cs_at_15", "cs_per_min"].includes(next.goal.metric), "compétence ratée deux fois reproposée (même famille)");
  const once = proposeGoal(games, "MIDDLE", { pastGoals: past.slice(0, 1) });
  const fresh = proposeGoal(games, "MIDDLE");
  assert(once.goal.metric === "cs_at_10" && fresh.goal.metric === "cs_at_10" ? once.goal.target <= fresh.goal.target : true, "marche non réduite après un échec");
  return "réussite à 3/5 même en perdant, échec à 2/5 même en gagnant, inconclusif sous 4 valides ou après un changement de rôle ; transitions contrôlées, un seul objectif ouvert, métrique ratée deux fois mise de côté.";
});

await t("COACH-003 Base Supabase : RLS (lecture du propriétaire seulement, aucune écriture client), un objectif ouvert, suppression RGPD", "fixture", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { readFile } = await import("node:fs/promises");
  const db = new PGlite();
  // Ce que Supabase fournit : schéma auth, auth.uid() lu dans le jeton, rôles, droits par défaut (la RLS fait le tri)
  await db.exec(`create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon nologin; create role authenticated nologin; grant usage on schema public, auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;`);
  await db.exec(await readFile(new URL("../../supabase/migrations/20261026000000_coach_v1.sql", import.meta.url), "utf8"));
  await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated;`);
  const A = "00000000-0000-0000-0000-00000000000a", B = "00000000-0000-0000-0000-00000000000b";
  await db.exec(`insert into auth.users values ('${A}'), ('${B}');
    insert into public.players (id, puuid, platform, user_id) values ('10000000-0000-0000-0000-00000000000a', 'puuid-a', 'euw1', '${A}'), ('10000000-0000-0000-0000-00000000000b', 'puuid-b', 'euw1', '${B}');
    insert into public.matches (match_id, platform, timeline_status, normalizer_version) values ('EUW1_1', 'euw1', 'ok', 'normalize-1'), ('EUW1_2', 'euw1', 'ok', 'normalize-1');
    insert into public.match_metrics (match_id, player_id, role, valid, metrics, metric_version) values ('EUW1_1', '10000000-0000-0000-0000-00000000000a', 'MIDDLE', true, '{}', 'metrics-1'), ('EUW1_2', '10000000-0000-0000-0000-00000000000b', 'JUNGLE', true, '{}', 'metrics-1');
    insert into public.coaching_goals (id, player_id, metric, role, direction, baseline, target, version, status) values ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'cs_at_10', 'MIDDLE', 'higher', 60, 65, 'coach-v1', 'active');
    insert into public.goal_evaluations (goal_id, match_id, counted, value, met) values ('20000000-0000-0000-0000-00000000000a', 'EUW1_1', true, 66, true);
    insert into public.metric_references (role, metric, metric_version, level, region, n, p50) values ('MIDDLE', 'cs_at_10', 'metrics-1', 'Diamant et plus', 'EUW', 8008, 78);`);
  const as = async (user, sql) => { await db.exec(`set role ${user ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${user || ""}', false);`); try { return await db.query(sql); } finally { await db.exec("reset role;"); } };
  const count = async (user, table) => (await as(user, `select count(*)::int n from public.${table}`)).rows[0].n;
  for (const tb of ["players", "matches", "match_metrics", "coaching_goals", "goal_evaluations"]) {
    assert(await count(A, tb) === 1, `${tb} : A ne voit pas exactement ses lignes`);
    assert(await count(null, tb) === 0, `${tb} : visible sans connexion`);
  }
  assert((await as(B, "select match_id from public.matches")).rows[0].match_id === "EUW1_2", "B voit une partie de A");
  assert(await count(B, "coaching_goals") === 0 && await count(B, "goal_evaluations") === 0, "B voit l'objectif de A");
  assert(await count(B, "metric_references") === 1, "références agrégées illisibles");
  // Aucune écriture côté client, même sur ses propres lignes
  let denied = 0;
  for (const sql of [`insert into public.coaching_goals (player_id, metric, role, direction, baseline, target, version, status) values ('10000000-0000-0000-0000-00000000000a', 'cs_at_10', 'MIDDLE', 'higher', 1, 2, 'x', 'proposed')`,
    `update public.coaching_goals set status = 'achieved'`, `delete from public.players`]) {
    try { const r = await as(A, sql); if (!r.affectedRows) denied++; } catch { denied++; }
  }
  assert(denied === 3, "un client peut écrire");
  // Un seul objectif ouvert par joueur
  let unique = false;
  try { await db.exec(`insert into public.coaching_goals (player_id, metric, role, direction, baseline, target, version, status) values ('10000000-0000-0000-0000-00000000000a', 'early_deaths', 'MIDDLE', 'lower', 3, 2, 'coach-v1', 'evaluating')`); } catch { unique = true; }
  assert(unique, "deux objectifs ouverts acceptés");
  // Suppression RGPD : le joueur et tout ce qui le concerne
  await db.exec(`delete from public.players where puuid = 'puuid-a'`);
  const left = (await db.query(`select (select count(*) from public.match_metrics where player_id = '10000000-0000-0000-0000-00000000000a')::int + (select count(*) from public.coaching_goals)::int + (select count(*) from public.goal_evaluations)::int n`)).rows[0].n;
  assert(left === 0, "données restantes après suppression du joueur");
  await db.close();
  return "chaque utilisateur ne lit que ses joueurs, parties, métriques, objectifs et évaluations ; rien sans connexion ; aucune écriture client ; un seul objectif ouvert ; suppression du joueur en cascade.";
});

await t("COACH-004 Client Riot : routes en liste blanche, limites lues dans les en-têtes, Retry-After, 5xx, requêtes identiques regroupées", "fixture", async () => {
  const { createRiotV1, parseLimits } = await import("../v1/riot.mjs");
  assert(JSON.stringify(parseLimits("20:1,100:120")) === JSON.stringify([{ limit: 20, windowMs: 1000 }, { limit: 100, windowMs: 120000 }]), "lecture des limites");
  let clock = 0; const slept = [];
  const sleep = async ms => { slept.push(ms); clock += ms; };
  const calls = [];
  const res = (status, body, headers = {}) => ({ ok: status < 300, status, json: async () => body, headers: { get: k => headers[k.toLowerCase()] ?? null } });
  let script = [];
  const fetchImpl = async (url, o) => { calls.push({ url, key: o.headers["X-Riot-Token"] }); await new Promise(r => setTimeout(r, 1)); return script.shift() || res(200, { ok: 1 }, { "x-app-rate-limit": "2:10" }); };
  const riot = createRiotV1("CLE-TEST", { fetchImpl, now: () => clock, sleep });
  // Liste blanche : route et région inconnues refusées, sans appel réseau
  for (const bad of [() => riot.call("anything", { platform: "euw1" }), () => riot.call("match", { platform: "evil.com/", matchId: "x" })]) { let e = null; try { await bad(); } catch (x) { e = x; } assert(e && e.status === 400, "requête hors liste blanche acceptée"); }
  assert(calls.length === 0, "appel réseau pour une requête refusée");
  // URL construite ici, cluster régional pour match-v5, plateforme pour league-v4
  await riot.call("match", { platform: "euw1", matchId: "EUW1_1" });
  await riot.call("league", { platform: "euw1", puuid: "abc" });
  assert(calls[0].url === "https://europe.api.riotgames.com/lol/match/v5/matches/EUW1_1" && calls[1].url.startsWith("https://euw1.api.riotgames.com/lol/league/v4/"), "routage plateforme / région");
  // Limite apprise « 2 par 10 s » sur l'hôte europe : la 3e requête vers cet hôte attend la fin de la fenêtre
  await riot.call("match", { platform: "euw1", matchId: "EUW1_2" });
  assert(!slept.length, "attente avant d'atteindre la limite");
  await riot.call("match", { platform: "euw1", matchId: "EUW1_3" });
  assert(slept.length && slept.at(-1) >= 9000, "limite de l'application ignorée");
  // 429 avec Retry-After 3 s puis succès
  script = [res(429, {}, { "retry-after": "3", "x-rate-limit-type": "method" }), res(200, { ok: 2 })];
  const before = clock;
  assert((await riot.call("timeline", { platform: "euw1", matchId: "EUW1_9" })).ok === 2 && clock - before >= 3000, "Retry-After ignoré");
  // 503 puis succès : recul exponentiel ; 404 : erreur normalisée ; 401 : clé refusée
  script = [res(503, {}), res(200, { ok: 3 })];
  assert((await riot.call("match", { platform: "euw1", matchId: "EUW1_10" })).ok === 3, "pas de nouvel essai après 503");
  script = [res(404, {})]; let e404 = null; try { await riot.call("match", { platform: "euw1", matchId: "EUW1_11" }); } catch (e) { e404 = e; }
  assert(e404?.code === "introuvable" && e404.status === 404, "404 mal normalisé");
  // Deux demandes identiques en même temps : un seul appel à Riot
  const n = calls.length;
  await Promise.all([riot.call("match", { platform: "euw1", matchId: "EUW1_12" }), riot.call("match", { platform: "euw1", matchId: "EUW1_12" })]);
  assert(calls.length === n + 1, "requêtes identiques en vol non regroupées");
  assert(calls.every(c => c.key === "CLE-TEST"), "clé absente");
  return "liste blanche (route et région), routage plateforme/région, limite « 2 par 10 s » respectée, Retry-After, recul sur 503, 404 normalisé, une seule requête pour deux demandes identiques.";
});

await t("COACH-005 Synchronisation : aucune partie traitée deux fois, recalcul sans Riot, objectif proposé puis évalué", "fixture", async () => {
  const { createStore } = await import("../v1/store.mjs");
  const { handleV1, createQueue, syncWorker } = await import("../v1/api.mjs");
  const { mkdtemp } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const dir = await mkdtemp(`${tmpdir()}/coach-v1-`);
  const store = createStore({ file: `${dir}/store.json`, rawDir: `${dir}/raw` });
  // Faux Riot : 12 parties mid au farm faible, puis 5 nouvelles parties
  let ids = Array.from({ length: 12 }, (_, i) => `EUW1_${100 + i}`);
  const games = {};
  const mk = (id, start, cs10) => { const g = v1Game({ id, start, cs10, deaths: 1, kills: 6, assists: 4, teamKills: 16 }); games[id] = g; };
  ids.forEach((id, i) => mk(id, 1000 + (12 - i), 58 + (i % 7)));
  const counts = {};
  const riot = { call: async (route, p) => {
    counts[route] = (counts[route] || 0) + 1;
    if (route === "account") return { puuid: "p1", gameName: "Testeur", tagLine: "EUW" };
    if (route === "matchIds") return ids;
    if (route === "match") return games[p.matchId].match;
    if (route === "timeline") return games[p.matchId].timeline;
  } };
  const ctx = { store, riot, references: null };
  ctx.queue = createQueue(syncWorker(ctx));
  const r = await handleV1({ method: "GET", path: "/api/v1/players/resolve", query: { riot_id: "Testeur#EUW", platform: "euw1" } }, ctx);
  assert(r.status === 200 && r.body.player_id, "résolution du Riot ID");
  const pid = r.body.player_id;
  const s1 = await handleV1({ method: "POST", path: `/api/v1/players/${pid}/sync` }, ctx);
  const s1b = await handleV1({ method: "POST", path: `/api/v1/players/${pid}/sync` }, ctx);
  assert(s1.status === 202 && s1b.body.job_id === s1.body.job_id && s1b.body.already_running, "deux synchronisations ouvertes en même temps");
  await ctx.queue.idle();
  assert((await store.getJob(s1.body.job_id)).status === "done", "synchronisation non terminée");
  assert(counts.match === 12 && counts.timeline === 12, "parties non téléchargées");
  // Deuxième synchronisation sans nouvelle partie : aucun téléchargement
  await handleV1({ method: "POST", path: `/api/v1/players/${pid}/sync` }, ctx); await ctx.queue.idle();
  assert(counts.match === 12, "partie téléchargée deux fois");
  const active = await handleV1({ method: "GET", path: `/api/v1/players/${pid}/goals/active` }, ctx);
  assert(active.body.goal?.status === "proposed" && active.body.goal.metric === "cs_at_10", "objectif non proposé");
  const st = await handleV1({ method: "POST", path: `/api/v1/players/${pid}/goals/${active.body.goal.id}/start` }, ctx);
  assert(st.body.goal.status === "active", "objectif non démarré");
  // Cinq nouvelles parties après le démarrage, cible atteinte 4 fois : réussite, archivage, objectif suivant proposé
  const target = st.body.goal.target, t0 = Date.now() + 1000;
  const fresh = Array.from({ length: 5 }, (_, i) => `EUW1_${200 + i}`);
  fresh.forEach((id, i) => mk(id, t0 + i * 1000, i === 4 ? target - 10 : target + 2));
  ids = [...fresh.reverse(), ...ids];
  await handleV1({ method: "POST", path: `/api/v1/players/${pid}/sync` }, ctx); await ctx.queue.idle();
  assert(counts.match === 17, "nouvelles parties mal comptées");
  const prog = await handleV1({ method: "GET", path: `/api/v1/players/${pid}/progress` }, ctx);
  assert(prog.body.goals.length === 1 && prog.body.goals[0].outcome === "achieved" && prog.body.goals[0].status === "archived", "réussite non archivée");
  const next = await handleV1({ method: "GET", path: `/api/v1/players/${pid}/goals/active` }, ctx);
  assert(next.body.goal?.status === "proposed" && next.body.goal.id !== active.body.goal.id, "objectif suivant absent");
  // Nouvelle version des métriques : recalcul depuis le JSON brut, sans rappeler Riot
  const all = await store.listMetrics(pid);
  for (const m of all) await store.putMetrics(pid, { ...m, metric_version: "ancienne" });
  const { syncPlayer } = await import("../v1/sync.mjs");
  const re = await syncPlayer({ store, riot, playerId: pid });
  assert(re.recomputed === 17 && re.fetched === 0 && counts.match === 17, "recalcul en rappelant Riot");
  // Erreurs normalisées et suppression RGPD
  const bad = await handleV1({ method: "GET", path: "/api/v1/players/pas-un-id/matches" }, ctx);
  assert(bad.status === 400 && bad.body.error.code === "joueur-invalide", "identifiant non validé");
  assert((await handleV1({ method: "DELETE", path: `/api/v1/players/${pid}` }, ctx)).status === 204 && (await store.listMetrics(pid)).length === 0 && (await store.listGoals(pid)).length === 0, "suppression incomplète");
  await store.flush();
  return "Riot ID résolu, une seule synchronisation ouverte, 12 parties téléchargées une fois, objectif proposé puis démarré, réussi sur les 5 parties suivantes, archivé et remplacé ; recalcul de 17 parties sans Riot ; suppression complète.";
});

await t("COACH-010 Tuteur : n'invente aucun chiffre, cite des conseils existants, nature de chaque phrase, quota", "fixture", async () => {
  const { tutor, tutorContext, checkAnswer } = await import("../v1/tutor.mjs");
  const goal = { metric: "cs_at_10", role: "MIDDLE", status: "evaluating", baseline: 61, target: 66, direction: "higher", evaluation_games: 5, success_required: 3, reference: { value: 78, source: "metric_references", n: 8008, level: "Diamant et plus" }, exercise: "Vise 66 sbires à 10:00." };
  const ctx = tutorContext({ goal, evaluations: [{ counted: true, value: 68, met: true }, { counted: true, value: 59, met: false }], tips: [{ id: "u-cl-1", claim: "Pousse ta wave avant de rentrer.", use: { when: "avant un back", how: ["pousse"] } }] });
  // Réponse fidèle : acceptée
  const good = { phrases: [{ texte: "Tu as fait 68 sbires à 10 min dans ta 1re partie : cible de 66 atteinte.", nature: "observé" }, { texte: "Pousse ta wave avant de rentrer.", nature: "inféré" }], conseils_cites: ["u-cl-1"], limites: "" };
  const ok = await tutor({ question: "Comment je progresse ?", context: ctx, ask: async () => good });
  assert(ok.status === 200 && !ok.body.refused, "réponse fidèle refusée");
  // Chiffre inventé (« 85 % des pros ») ou conseil inconnu : réponse écartée
  assert(checkAnswer({ phrases: [{ texte: "85 % des pros font 90 sbires.", nature: "observé" }], conseils_cites: [] }, ctx).length === 2, "chiffres inventés non détectés");
  const bad = await tutor({ question: "?", context: ctx, ask: async () => ({ phrases: [{ texte: "Vise 90 sbires.", nature: "inféré" }], conseils_cites: ["u-faux"], limites: "" }) });
  assert(bad.body.refused && bad.body.problems.length === 2 && !JSON.stringify(bad.body.phrases).includes("90"), "réponse inventée transmise");
  // Formats français (« 2,00 », « 1 500 ») reconnus ; contexte ne contient que ce que le coach a calculé
  assert(checkAnswer({ phrases: [{ texte: "Repère : 8 008 parties, cible 66.", nature: "observé" }], conseils_cites: [] }, ctx).length === 0, "nombre du contexte refusé");
  assert(!JSON.stringify(ctx).includes("puuid") && ctx.objectif.cible === "66", "contexte incomplet ou trop large");
  // Modèle indisponible : message clair ; quota quotidien ; question vide
  assert((await tutor({ question: "x", context: ctx, ask: async () => { throw Object.assign(new Error("q"), { quota: true }); } })).body.error.code === "quota-ia", "panne du modèle mal signalée");
  const usage = {};
  for (let i = 0; i < 20; i++) await tutor({ question: "x", context: ctx, ask: async () => good, usage, playerId: "p" });
  assert((await tutor({ question: "x", context: ctx, ask: async () => good, usage, playerId: "p" })).status === 429, "quota quotidien absent");
  assert((await tutor({ question: "  ", context: ctx, ask: async () => good })).status === 400, "question vide acceptée");
  return "réponse fidèle acceptée ; chiffre ou conseil inventé → réponse écartée ; formats français reconnus ; panne et quota signalés.";
});

await t("COACH-009/010 Conseils de l'objectif : geste mesuré, pas de fin de partie, même sélection sur le site et dans le tuteur", "fixture", async () => {
  const { tipsForGoal } = await import("../v1/tutor.mjs");
  const { CATALOG } = await import("../metrics.mjs");
  const u = (id, claim, themes, roles = ["all"], when = "En phase de lane.") => ({ id, status: "exploitable", claim, themes, roles, use: { when } });
  const units = [
    u("u-farm", "Selon X : last hit chaque sbire du canon avant d'échanger.", ["lane"]),
    u("u-ward", "Selon X : place ta ward quand ta vague est freezée devant sa tourelle.", ["vision", "vagues"]),
    u("u-baron", "Selon X : lance le Baron quand ta vague assiège une tourelle.", ["macro", "vagues"]),
    u("u-vague", "Selon X : pousse ta vague avant ton retour.", ["vagues"]),
    u("u-camps", "Selon X : enchaîne tes camps sans t'arrêter, full clear avant le premier gank.", ["lane"], ["jungle"]),
  ];
  const ids = (metric, role) => tipsForGoal(units, { metric, role }, 9).map(x => x.id).join(",");
  assert(ids("cs_at_10", "MIDDLE") === "u-farm", `farm mid : ${ids("cs_at_10", "MIDDLE")}`);
  assert(ids("cs_at_10", "JUNGLE") === "u-camps", `farm jungle : ${ids("cs_at_10", "JUNGLE")}`);
  assert(ids("vision_per_min", "UTILITY") === "u-ward", `vision : ${ids("vision_per_min", "UTILITY")}`);
  // Le site (coach2.js) recopie les motifs du catalogue : ils doivent rester identiques
  const src = await readFile(join(ROOT, "coach2.js"), "utf8");
  const ctx = vm.createContext({});
  vm.runInContext(src.match(/const C2_V1_LATE[\s\S]*?\n};\n/)[0] + "this.T = C2_V1_TIPS;", ctx);
  for (const [k, c] of Object.entries(CATALOG)) {
    if (!c.kbMatch) continue;
    const f = ctx.T[k];
    assert(f && f.match.source === c.kbMatch.source && (f.avoid?.source ?? null) === (c.kbAvoid?.source ?? null) && f.themes.join() === c.kbThemes.join() && (f.matchRole?.JUNGLE?.source ?? null) === (c.kbMatchRole?.JUNGLE?.source ?? null), `motifs différents sur le site pour ${k}`);
  }
  return "farm : seul le conseil de last hit (camps en jungle) ; ward, Baron et « pousse ta vague » écartés ; motifs identiques site/tuteur.";
});

await t("COACH-004 Stockage Supabase : même parcours que le serveur local, sur le vrai schéma (Postgres embarqué)", "fixture", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { readFile } = await import("node:fs/promises");
  const { createSupabaseStore } = await import("../v1/store-supabase.mjs");
  const { handleV1, createQueue, syncWorker } = await import("../v1/api.mjs");
  const db = new PGlite();
  await db.exec(`create schema auth; create table auth.users (id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$; create role anon nologin; create role authenticated nologin;`);
  await db.exec(await readFile(new URL("../../supabase/migrations/20261026000000_coach_v1.sql", import.meta.url), "utf8"));
  // PostgREST minimal (ce que le stockage utilise) traduit en SQL sur le vrai schéma
  const objects = new Map();
  const rest = async (method, path, { body, prefer } = {}) => {
    const [table, qs = ""] = path.split("?");
    const params = [...new URLSearchParams(qs)];
    const vals = [], ph = v => { vals.push(v !== null && typeof v === "object" ? JSON.stringify(v) : v); return `$${vals.length}`; };
    const where = params.filter(([k]) => !["select", "order", "on_conflict"].includes(k)).map(([k, v]) => v.startsWith("eq.") ? `"${k}" = ${ph(v.slice(3))}` : v.startsWith("in.(") ? `"${k}" in (${v.slice(4, -1).split(",").map(ph).join(",")})` : "true").join(" and ") || "true";
    const order = params.find(([k]) => k === "order")?.[1];
    const orderSql = order ? ` order by "${order.split(".")[0]}" ${order.includes(".desc") ? "desc" : "asc"}${order.includes("nullslast") ? " nulls last" : ""}` : "";
    try {
      if (method === "GET") return (await db.query(`select * from public.${table} where ${where}${orderSql}`, vals)).rows;
      if (method === "DELETE") { await db.query(`delete from public.${table} where ${where}`, vals); return null; }
      if (method === "PATCH") { const sets = Object.entries(body).map(([k, v]) => `"${k}" = ${ph(v)}`).join(", "); return (await db.query(`update public.${table} set ${sets} where ${where} returning *`, vals)).rows; }
      const rows = Array.isArray(body) ? body : [body], cols = Object.keys(rows[0]);
      const conflict = params.find(([k]) => k === "on_conflict")?.[1];
      const sql = `insert into public.${table} (${cols.map(c => `"${c}"`).join(",")}) values ${rows.map(r => `(${cols.map(c => ph(r[c])).join(",")})`).join(",")}${conflict && prefer?.includes("merge-duplicates") ? ` on conflict (${conflict}) do update set ${cols.map(c => `"${c}" = excluded."${c}"`).join(", ")}` : ""} returning *`;
      return (await db.query(sql, vals)).rows;
    } catch (e) { throw Object.assign(new Error(e.message), { code: e.code === "23505" ? "conflit" : "supabase-erreur", status: e.code === "23505" ? 409 : 502 }); }
  };
  const store = createSupabaseStore({ rest, putObject: async (k, b) => objects.set(k, b), getObject: async k => objects.get(k) || null });
  let ids = Array.from({ length: 12 }, (_, i) => `EUW1_${300 + i}`);
  const games = {};
  const mk = (id, start, cs10) => { games[id] = v1Game({ id, start, cs10, deaths: 1, kills: 6, assists: 4, teamKills: 16 }); };
  ids.forEach((id, i) => mk(id, 1000 + (12 - i), 58 + (i % 7)));
  const counts = {};
  const riot = { call: async (route, p) => { counts[route] = (counts[route] || 0) + 1; return route === "account" ? { puuid: "p1", gameName: "Testeur", tagLine: "EUW" } : route === "matchIds" ? ids : route === "match" ? games[p.matchId].match : games[p.matchId].timeline; } };
  const ctx = { store, riot, references: null };
  ctx.queue = createQueue(syncWorker(ctx));
  const pid = (await handleV1({ method: "GET", path: "/api/v1/players/resolve", query: { riot_id: "Testeur#EUW", platform: "euw1" } }, ctx)).body.player_id;
  await handleV1({ method: "POST", path: `/api/v1/players/${pid}/sync` }, ctx); await ctx.queue.idle();
  await handleV1({ method: "POST", path: `/api/v1/players/${pid}/sync` }, ctx); await ctx.queue.idle();
  assert(counts.match === 12 && objects.size === 12, "parties téléchargées deux fois ou JSON bruts absents");
  const g = (await handleV1({ method: "GET", path: `/api/v1/players/${pid}/goals/active` }, ctx)).body.goal;
  assert(g?.status === "proposed" && g.metric === "cs_at_10", "objectif non proposé sur Supabase");
  const st = (await handleV1({ method: "POST", path: `/api/v1/players/${pid}/goals/${g.id}/start` }, ctx)).body.goal;
  assert(st.status === "active" && typeof st.active_at === "number", "démarrage mal enregistré");
  // Un deuxième objectif ouvert est refusé par l'index unique de la base
  let conflict = false; try { await store.putGoal(pid, { ...st, id: "autre", created_at: Date.now() }); } catch (e) { conflict = e.code === "objectif-multiple"; }
  assert(conflict, "deux objectifs ouverts acceptés par la base");
  const t0 = Date.now() + 1000, fresh = Array.from({ length: 5 }, (_, i) => `EUW1_${400 + i}`);
  fresh.forEach((id, i) => mk(id, t0 + i * 1000, st.target + 2));
  ids = [...fresh.reverse(), ...ids];
  await handleV1({ method: "POST", path: `/api/v1/players/${pid}/sync` }, ctx); await ctx.queue.idle();
  const prog = (await handleV1({ method: "GET", path: `/api/v1/players/${pid}/progress` }, ctx)).body;
  assert(prog.goals[0]?.outcome === "achieved" && prog.goals[0].evaluations.filter(e => e.counted).length === 5, "réussite non enregistrée sur Supabase");
  // Recalcul depuis le stockage des JSON bruts, sans Riot
  const { syncPlayer } = await import("../v1/sync.mjs");
  for (const m of await store.listMetrics(pid)) await store.putMetrics(pid, { ...m, metric_version: "ancienne" });
  const re = await syncPlayer({ store, riot, playerId: pid });
  assert(re.recomputed === 17 && counts.match === 17, "recalcul sans le JSON brut");
  await handleV1({ method: "DELETE", path: `/api/v1/players/${pid}` }, ctx);
  const left = (await db.query("select (select count(*) from public.match_metrics)::int + (select count(*) from public.coaching_goals)::int + (select count(*) from public.goal_evaluations)::int + (select count(*) from public.sync_jobs)::int n")).rows[0].n;
  assert(left === 0, "données restantes après suppression");
  await db.close();
  return "parcours complet sur le vrai schéma : 12 parties une seule fois, JSON bruts compressés, objectif proposé, démarré, réussi et archivé ; second objectif ouvert refusé par la base ; recalcul sans Riot ; suppression en cascade.";
});

await t("COACH-004 Worker : jeton vérifié, joueurs d'un autre compte invisibles, liaison unique, quotas, CORS", "fixture", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { readFile } = await import("node:fs/promises");
  const { createV1Worker, QUOTAS } = await import("../../worker/v1.mjs");
  const db = new PGlite();
  await db.exec(`create schema auth; create table auth.users (id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$; create role anon nologin; create role authenticated nologin;`);
  await db.exec(await readFile(new URL("../../supabase/migrations/20261026000000_coach_v1.sql", import.meta.url), "utf8"));
  const A = "00000000-0000-0000-0000-00000000000a", B = "00000000-0000-0000-0000-00000000000b";
  await db.exec(`insert into auth.users values ('${A}'), ('${B}');`);
  const rest = async (method, path, { body, prefer } = {}) => {
    const [table, qs = ""] = path.split("?"), params = [...new URLSearchParams(qs)], vals = [];
    const ph = v => { vals.push(v !== null && typeof v === "object" ? JSON.stringify(v) : v); return `$${vals.length}`; };
    const where = params.filter(([k]) => !["select", "order", "on_conflict"].includes(k)).map(([k, v]) => v.startsWith("eq.") ? `"${k}" = ${ph(v.slice(3))}` : `"${k}" in (${v.slice(4, -1).split(",").map(ph).join(",")})`).join(" and ") || "true";
    try {
      if (method === "GET") return (await db.query(`select * from public.${table} where ${where}`, vals)).rows;
      if (method === "DELETE") { await db.query(`delete from public.${table} where ${where}`, vals); return null; }
      if (method === "PATCH") { const sets = Object.entries(body).map(([k, v]) => `"${k}" = ${ph(v)}`).join(", "); return (await db.query(`update public.${table} set ${sets} where ${where} returning *`, vals)).rows; }
      const rows = Array.isArray(body) ? body : [body], cols = Object.keys(rows[0]), conflict = params.find(([k]) => k === "on_conflict")?.[1];
      return (await db.query(`insert into public.${table} (${cols.map(c => `"${c}"`).join(",")}) values ${rows.map(r => `(${cols.map(c => ph(r[c])).join(",")})`).join(",")}${conflict && prefer?.includes("merge-duplicates") ? ` on conflict (${conflict}) do update set ${cols.map(c => `"${c}" = excluded."${c}"`).join(", ")}` : ""} returning *`, vals)).rows;
    } catch (e) { throw Object.assign(new Error(e.message), { code: e.code === "23505" ? "conflit" : "supabase-erreur", status: e.code === "23505" ? 409 : 502 }); }
  };
  // Faux Supabase Auth et faux Riot derrière le même fetch ; la clé Riot ne doit jamais apparaître dans une réponse
  const tokens = { "jeton-a": A, "jeton-b": B };
  const fetchImpl = async (url, o = {}) => {
    const ok = body => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body), headers: { get: () => null } });
    if (url.includes("/auth/v1/user")) { const id = tokens[(o.headers?.Authorization || "").replace("Bearer ", "")]; return id ? ok({ id }) : { ok: false, status: 401, json: async () => ({}) }; }
    if (url.includes("/riot/account/v1/")) return ok({ puuid: "puuid-a", gameName: "Testeur", tagLine: "EUW" });
    return ok([]);
  };
  const worker = createV1Worker({ fetchImpl, sb: { rest }, log: () => {} });
  const env = { RIOT_API_KEY: "CLE-SECRETE", SUPABASE_URL: "https://x.supabase.co", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_KEY: "service" };
  const waits = [];
  const ctx = { waitUntil: p => waits.push(p) };
  const call = async (path, { token, method = "GET", body, origin = "https://anthonyloquet96-source.github.io" } = {}) => {
    const r = await worker(new Request(`https://w.dev${path}`, { method, headers: { Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" }, body: body ? JSON.stringify(body) : undefined }), env, ctx);
    const text = await r.text();
    assert(!text.includes("CLE-SECRETE") && !text.includes("service"), "secret dans une réponse");
    return { status: r.status, body: text ? JSON.parse(text) : null, headers: r.headers };
  };
  assert((await call("/api/v1/health")).status === 200, "santé");
  assert((await call("/api/v1/players/resolve?riot_id=Testeur%23EUW")).status === 401, "route sans jeton acceptée");
  assert((await call("/api/v1/players/resolve?riot_id=Testeur%23EUW", { token: "faux" })).status === 401, "faux jeton accepté");
  const r = await call("/api/v1/players/resolve?riot_id=Testeur%23EUW", { token: "jeton-a" });
  assert(r.status === 200 && r.body.player_id, "résolution par A");
  const pid = r.body.player_id;
  // B ne peut ni lier le même compte Riot, ni lire, ni synchroniser, ni supprimer le joueur de A, ni interroger le tuteur sur lui
  assert((await call("/api/v1/players/resolve?riot_id=Testeur%23EUW", { token: "jeton-b" })).body.error.code === "compte-deja-lie", "compte Riot lié deux fois");
  for (const [path, method] of [[`/api/v1/players/${pid}/matches`, "GET"], [`/api/v1/players/${pid}/sync`, "POST"], [`/api/v1/players/${pid}`, "DELETE"]]) assert((await call(path, { token: "jeton-b", method })).status === 404, `${method} ${path} permis à un autre compte`);
  assert((await call("/api/v1/coach/chat", { token: "jeton-b", method: "POST", body: { player_id: pid, question: "?" } })).status === 404, "tuteur sur le joueur d'un autre");
  // A synchronise : 202 et traitement après la réponse (waitUntil)
  const s = await call(`/api/v1/players/${pid}/sync`, { token: "jeton-a", method: "POST" });
  assert(s.status === 202 && waits.length === 1, "synchronisation non différée");
  await Promise.all(waits);
  assert((await call(`/api/v1/jobs/${s.body.job_id}`, { token: "jeton-a" })).body.status === "done", "synchronisation non terminée");
  assert((await call(`/api/v1/jobs/${s.body.job_id}`, { token: "jeton-b" })).status === 404, "synchronisation d'un autre visible");
  // Quota quotidien de synchronisations ; CORS limité au site
  let last;
  for (let i = 0; i < QUOTAS.sync; i++) last = await call(`/api/v1/players/${pid}/sync`, { token: "jeton-a", method: "POST" });
  assert(last.status === 429 && last.body.error.code === "quota-sync", "quota de synchronisations absent");
  assert((await call("/api/v1/health", { origin: "https://pirate.example" })).headers.get("Access-Control-Allow-Origin") === "https://anthonyloquet96-source.github.io", "CORS ouvert à tous");
  await Promise.all(waits);
  await db.close();
  return "jeton vérifié par Supabase ; un autre compte ne voit, ne synchronise ni ne supprime le joueur ; compte Riot lié une seule fois ; synchronisation après la réponse ; quota quotidien ; CORS limité ; aucun secret dans les réponses.";
});

await t("COACH-002 Normaliseur sur de vraies parties anonymisées (cache privé)", "réel", async () => {
  const { normalizeMatch, participantAt, laneOpponent } = await import("../normalize.mjs");
  const { readdir, readFile } = await import("node:fs/promises");
  const { gunzipSync } = await import("node:zlib");
  const dir = new URL("../cache/timelines/", import.meta.url);
  const files = (await readdir(dir).catch(() => [])).filter(f => f.endsWith(".json.gz")).slice(0, 300);
  if (files.length < 50) throw Object.assign(new Error("ignoré : chronologies absentes du cache privé"), { skip: true });
  let games = 0, sure = 0, roles = 0, worst = 0;
  for (const f of files) {
    const g = JSON.parse(gunzipSync(await readFile(new URL(f, dir))).toString());
    const n = normalizeMatch(g.match, g.timeline);
    assert(n.timeline_status === "ok", `${f} : timeline jugée invalide`);
    assert(n.participants.every(p => Object.values(p).every(v => v === null || typeof v !== "number" || Number.isFinite(v))), `${f} : valeur non finie`);
    if (n.duration_s < 900) continue;
    games++;
    for (const p of n.participants) {
      const at = participantAt(g.timeline, p.participant_id, 600000);
      assert(at && at.cs != null, `${f} : état à 10:00 absent`);
      worst = Math.max(worst, at.precision_ms);
      if (p.role) { roles++; if (laneOpponent(n, p.participant_id).confidence === "haute") sure++; }
    }
  }
  assert(worst < 1000, `10:00 lue à ${worst} ms près`);
  assert(sure / roles > .95, `adversaire sûr dans seulement ${Math.round(100 * sure / roles)} % des cas`);
  return `${games} parties : 10:00 lue à ${worst} ms près au pire, adversaire de lane sûr pour ${Math.round(1000 * sure / roles) / 10} % des joueurs.`;
});

// ---------- Rapport
const ok = results.filter(r => r.ok).length;
for (const r of results) console.log(`${r.skipped ? "–" : r.ok ? "✔" : "✘"} ${r.name} [${r.kind}]\n    ${r.detail}`);
const skipped = results.filter(r => r.skipped).length;
console.log(`\n${ok - skipped}/${results.length} tests réussis${skipped ? `, ${skipped} ignoré(s) faute de cache` : ""}.`);
await writeFile(join(ROOT, "coach/tests/last-run.json"), JSON.stringify({ at: new Date().toISOString(), ok, total: results.length, results }, null, 1));
await rm(join(ROOT, "coach/tests/tmp"), { recursive: true, force: true });
process.exit(ok === results.length ? 0 : 1);
