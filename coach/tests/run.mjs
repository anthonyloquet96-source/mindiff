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
await t("4a. Deux sources statistiques divergentes", "réel", () => {
  const r = ev(unit("u-milio-stats"));
  assert(r.status === "contradictoire", r.status);
  assert(r.flags.some(f => f.code === "ecart-de-contexte"), "écart de contexte non signalé");
  return "Milio : S (tous rangs) / A / B (Émeraude+) → « Sources divergentes », contextes exposés, aucune majorité.";
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
  const v = L.contents.contents.find(c => c.type === "video" && c.access === "metadonnees");
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
await t("7. Champion ou rôle non couvert", "réel", () => {
  const r = CS.prepare(KB, { role: "jungle", rank: "or", champions: ["Lee Sin"], mode: "solo", goal: "jungle", time: 15 });
  assert(!r.coverage.roleCovered && r.coverage.note, "pas d'avertissement");
  assert(r.goal.unit.roles.includes("all") && r.plan.every(x => x.unit.roles.includes("all")), "conseil propre à un rôle couvert proposé");
  const r2 = CS.prepare(KB, { role: "bottom", rank: "or", champions: ["Ezreal"], mode: "solo", goal: "lane", time: 15 });
  assert(/pas encore couvert/.test(r2.coverage.note) && r2.plan.every(x => !x.unit.champions.length), "conseil d'un autre champion proposé");
  return "Jungle/Lee Sin : avertissement + méthode seulement. ADC/Ezreal : avertissement, aucun conseil d'un autre champion.";
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
  assert(a.stats[0].line !== b.stats[0].line, "rang sans effet");
  assert(c.plan.some(x => x.unit.matchup?.vs === "Lulu") && !a.plan.some(x => x.unit.matchup), "adversaire sans effet");
  assert(d.goal.unit.id !== a.goal.unit.id && e.goal.unit.id !== a.goal.unit.id, "champion ou objectif sans effet");
  return `Or → Diamant : statistique ${a.stats[0].bucket} → ${b.stats[0].bucket}. Contre Lulu : +consigne de matchup. Jinx/combats : ${d.goal.unit.id}. Méthode : ${e.goal.unit.id}.`;
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
await t("Tri des vidéos sur métadonnées (priorité, pas preuve)", "fixture", () => {
  const items = parseYoutubeFeed(fx.rss);
  const tr = triage(`${items[0].title} ${items[0].description}`, L.config.pilot);
  assert(tr.matched.includes("Lucian") && /ne prouve pas/.test(tr.basis), JSON.stringify(tr));
  return `« ${items[0].title} » → priorité ${tr.score} (${tr.matched.join(", ")}) ; ${tr.basis}.`;
});
await t("Règles verrouillées contre toute modification automatique", "réel", async () => {
  const s = await rulesLockStatus();
  assert(s.ok, `modifiées : ${s.changed.join(", ")}`);
  return "Empreintes des règles et des trois instructions conformes ; l'analyse s'arrête si elles changent sans validation humaine.";
});

await t("Vidéo lue par IA : au mieux provisoire, patch futur signalé", "fixture", () => {
  const c2 = { ...fxCtx, contents: new Map([...fxCtx.contents, ["fx-video", { id: "fx-video", sourceId: "yt-skill-capped", type: "video", title: "Vidéo (fixture)", access: "transcription+visuel", analysis: "analysee", reader: { kind: "ia", tool: "gemini (fixture)", fps: 1 } }]]), texts: new Map([...fxCtx.texts, ["fx-video", "[07:00] (parole) Engage supports need space to engage."]]) };
  const u = { id: "fx-v", claim: "Selon Skill Capped : un support d'engagement a besoin d'espace.", champions: [], roles: ["bottom"], themes: ["lane"], context: { queue: "solo" }, patch: { known: true, value: "26.21" }, nature: "opinion", translation: { term: "engage", note: "engager" }, evidence: [{ content: "fx-video", locator: "[07:00]", lang: "en", passage: "Engage supports need space to engage." }] };
  const r = checkUnit(u, c2);
  assert(!r.blocking && r.status === "provisoire", r.status);
  assert(r.flags.some(f => f.code === "lecture-ia") && r.flags.some(f => f.code === "patch-futur"), r.flags.map(f => f.code).join(","));
  const ok = checkUnit({ ...u, patch: { known: false }, evidence: [{ ...u.evidence[0], humanChecked: true }] }, c2);
  assert(!ok.flags.some(f => f.code === "lecture-ia"), "vérification humaine ignorée");
  return "Passage lu par Gemini → provisoire jusqu'à vérification humaine ; patch 26.21 (non sorti) → signalé comme prévision.";
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
