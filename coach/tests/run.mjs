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
  assert(unit("u-lucian-2620-ad").patch.value === ctx.current, "patch différent du patch courant");
  return `u-lucian-2620-ad : patch ${ctx.current}, exploitable, passages retrouvés dans les notes officielles.`;
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
  assert(r.deaths.length === 1 && r.deaths[0].killer === "C3" && r.deaths[0].beforeObjective === "Dragon adverse à 12:40", JSON.stringify(r.deaths));
  assert(r.bases.length === 3 && r.bases[1].afterDeath && !r.bases[0].afterDeath && r.bases[0].items.join() === "Bottes,Balise de contrôle", JSON.stringify(r.bases));
  assert(r.lane.opponent === "C2" && r.lane.at10.gold === -200 && r.lane.at10.cs === -10, JSON.stringify(r.lane));
  assert(r.findings.length === 3 && r.findings[0].kind === "mort-avant-objectif" && r.findings.some(f => f.kind === "ecart-cs10"), r.findings.map(f => f.kind).join());
  assert(r.bases[0].goldBefore === 2600, "or en poche avant le retour");
  assert(!r.findings.some(f => f.kind === "ecart-deaths30"), "6 morts/30 min jugées sous la référence alors qu'elles sont dans la moyenne Diamant+");
  assert(compare("cs10", 82, null) === null && compare("cs10", 82, { cs10: { n: 10, p25: 1, p50: 2, p75: 3 } }) === null, "comparaison sans référence suffisante");
  assert(parseRiotId("Pseudo#EUW")?.tagLine === "EUW" && !parseRiotId("Pseudo"), "Riot ID");
  return "Mort à 12:00 suivie d'un dragon adverse à 12:40 → signalée ; achats après la mort distingués d'un retour ; écarts à 10 min exacts ; référence Diamant+ exigée (30 joueurs au moins).";
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
  const champstats = { patch: "16.20", minGames: 30, champions: { 1: { games: 100, roles: { top: 90 }, items: [{ id: "3153", games: 70 }, { id: "3031", games: 60 }, { id: "3006", games: 50 }], keystones: [{ id: "8010", games: 80 }, { id: "8008", games: 20 }] } } };
  const r = await review(riot, { matchId: "EUW1_2", puuid: parts[0].puuid, region: "europe", benchmarks: null, champstats, fetchImpl });
  assert(r.lane.platesLost === 3 && r.lane.platesTaken === 1, JSON.stringify(r.lane));
  assert(r.findings[0]?.kind === "retard-en-ligne" && /^1.200 pièces/.test(r.findings[0].title) && r.findings[0].facts.some(f => f.includes("1 mort contre C2")), JSON.stringify(r.findings[0]));
  assert(r.summary.deadSeconds === 120, "temps passé mort");
  const b = r.build;
  assert(b && b.items.map(x => `${x.id}:${x.share}`).join() === "3031:60,6672:0" && b.keystone.share === 20 && b.keystone.top.name === "Conquérant" && b.missing.map(x => x.id).join() === "3153", JSON.stringify(b));
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
  assert(zone({ x: 7400, y: 7400 }, 100) === "voie du milieu" && zone({ x: 13900, y: 13900 }, 100) === "base adverse", "zones de la carte");
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
  assert(/conseils officiels/.test(r2.coverage.note) && /aucun conseil analysé/i.test(r2.goalNote || ""), "couverture de Lee Sin mal annoncée");
  return `${none} (aucun conseil) : avertissement, méthode seulement. Lee Sin : « conseils officiels seulement » et objectif jungle déclaré non couvert.`;
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
    // Priorité maximale : le contenu piégé doit passer avant les vrais contenus en attente
    cs.contents.push({ ...fx.injection, text: undefined, analysis: "en-attente", triage: { score: 999 } });
    await writeFile(join(ROOT, P.contents), JSON.stringify(cs));
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
await t("Vidéos réellement lues : durée conforme et passages retrouvés", "réel", async () => {
  const vids = L.contents.contents.filter(c => c.reader?.kind === "ia");
  if (!vids.length) throw Object.assign(new Error("ignoré : aucune vidéo lue"), { skip: true });
  const units = L.units.units.filter(u => u.evidence.some(e => vids.some(v => v.id === e.content)));
  for (const u of units) for (const e of u.evidence) { const txt = await need(e.content); assert(normText(txt).includes(normText(e.passage)), `${u.id} : passage absent de la transcription`); }
  assert(units.every(u => ev(u).status !== "exploitable"), "une unité vidéo non vérifiée est exploitable");
  return `${vids.length} vidéos lues (${vids.map(v => v.reader.duration).join(", ")}), ${units.length} unités, toutes au mieux provisoires, passages retrouvés.`;
});

// ---------- Rapport
const ok = results.filter(r => r.ok).length;
for (const r of results) console.log(`${r.skipped ? "–" : r.ok ? "✔" : "✘"} ${r.name} [${r.kind}]\n    ${r.detail}`);
const skipped = results.filter(r => r.skipped).length;
console.log(`\n${ok - skipped}/${results.length} tests réussis${skipped ? `, ${skipped} ignoré(s) faute de cache` : ""}.`);
await writeFile(join(ROOT, "coach/tests/last-run.json"), JSON.stringify({ at: new Date().toISOString(), ok, total: results.length, results }, null, 1));
await rm(join(ROOT, "coach/tests/tmp"), { recursive: true, force: true });
process.exit(ok === results.length ? 0 : 1);
