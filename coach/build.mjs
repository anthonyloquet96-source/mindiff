// Publie la base du coach pour l'application (fichiers statiques, compatibles GitHub Pages).
// data/coach.json (et data/coach.js pour l'ouverture sans serveur) : ce que voit le joueur.
// data/coach-admin.json : contrôle administrateur (hors du parcours joueur).
// Usage : node coach/build.mjs

import { unitVocab } from "./vocab.mjs";
import { P, readJson, writeJson, today, noEmail } from "./lib.mjs";
import { evaluateAll, rulesLockStatus } from "./kb.mjs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "./lib.mjs";
import { isTeaching } from "./video.mjs";

const USABLE = ["exploitable", "provisoire", "contradictoire"];

export async function run() {
  const { L, units } = await evaluateAll();
  const [state, costs, lock, prev] = await Promise.all([readJson(P.state, {}), readJson(P.costs, { days: {}, calls: [] }), rulesLockStatus(), readJson("data/coach.json", null)]);
  const pilot = L.config.pilot;

  // Historique des changements de statut (versionné)
  const statusLog = await readJson("coach/kb/status-log.json", { entries: [] });
  const before = new Map((prev?.units || []).map(u => [u.id, u.status]));
  for (const u of units) if (before.has(u.id) && before.get(u.id) !== u.status) statusLog.entries.push({ at: new Date().toISOString(), unit: u.id, from: before.get(u.id), to: u.status, why: u.flags.map(f => f.why).join(" ") || u.review.reason || "" });
  await writeJson("coach/kb/status-log.json", statusLog);

  // Couverture réelle : ce que la base permet de préparer, par rôle et par champion
  const usable = units.filter(u => USABLE.includes(u.status));
  const coverage = { roles: {}, champions: {}, themes: {}, partial: pilot.partial || [], generic: [] };
  for (const [role, champs] of Object.entries(pilot.champions)) {
    coverage.roles[role] = { champions: champs, units: usable.filter(u => u.roles.includes(role)).length };
    for (const ch of champs) {
      const own = usable.filter(u => u.champions.includes(ch) || u.synergy?.with?.includes(ch) || u.matchup?.vs === ch);
      coverage.champions[ch] = { role, units: own.length, themes: [...new Set(own.flatMap(u => u.themes))], actions: own.filter(u => u.action).length };
    }
  }
  for (const ch of pilot.partial || []) coverage.champions[ch] = { role: "bottom", partial: true, units: usable.filter(u => u.champions.includes(ch)).length, themes: [...new Set(usable.filter(u => u.champions.includes(ch)).flatMap(u => u.themes))], actions: 0 };
  // Tous les champions présents dans la base : socle officiel (Data Dragon) et analyses de coaching comptés à part
  const names = new Set(usable.flatMap(u => [...u.champions, ...(u.matchup?.vs ? [u.matchup.vs] : []), ...(u.synergy?.with || [])]));
  for (const ch of names) {
    const own = usable.filter(u => u.champions.includes(ch) || u.matchup?.vs === ch || u.synergy?.with?.includes(ch));
    const c = coverage.champions[ch] ||= { role: null, units: own.length, themes: [...new Set(own.flatMap(u => u.themes))], actions: own.filter(u => u.action).length };
    c.official = own.filter(u => u.nature === "officiel").length;
    c.coaching = own.filter(u => u.nature !== "officiel").length;
    if (!c.coaching && !pilot.champions[c.role]?.includes(ch)) c.officialOnly = true;
  }
  for (const t of ["lane", "survie", "teamfight", "synergie", "matchup", "methode", "vagues", "vision", "macro", "jungle"]) coverage.themes[t] = usable.filter(u => u.themes.includes(t) && u.action).length;
  coverage.generic = usable.filter(u => u.roles.includes("all")).map(u => u.id);

  // Version publiée allégée : les champs de travail restent dans coach/kb et dans la page de contrôle
  // Conseils Riot affichés au « tu » (coach/kb/tutoiement.json), seulement si le texte de Riot n'a pas changé depuis la réécriture
  const tu = (await readJson("coach/kb/tutoiement.json", { tips: {} })).tips;
  const pub = u => {
    const { blocking, origin, validity, verified, firstSeen, version, analyst, proposedStatus, promptVersions, independentSources, dependsOn, flags, aiReview, ...rest } = u;
    const t = tu[u.id];
    if (t && rest.claim.endsWith(t.riot)) rest.claim = rest.claim.slice(0, -t.riot.length) + t.tu;
    if (!rest.conditions?.length) delete rest.conditions;
    // Conseil général marqué « tous les postes » mais qui ne parle que de la lane (audit des rôles du 29/10) : un jungler
    // n'a pas de wave à freeze ni de last hit à placer, un support ne farme pas. Rôles ramenés aux postes concernés
    if (rest.roles?.includes("all") && !rest.champions?.length && !rest.matchup?.vs && rest.nature !== "officiel") {
      if (/last[- ]?hit|slow ?push|freez\w*|congel\w*/i.test(rest.claim)) rest.roles = ["top", "mid", "bottom"];
      else if (/aggro des sbires|pousser la wave|pousser ta wave|fait pousser ta wave/i.test(rest.claim)) rest.roles = ["top", "mid", "bottom", "support"];
    }
    // Mesure faite avec la clé de développement : jamais publiée (riot.publish)
    if (rest.dataCheck?.source === "riot-dev" && !L.config.riot?.publish) delete rest.dataCheck;
    if (rest.context?.queue === "tous" && rest.context?.rank === "tous") delete rest.context;
    // Vocabulaire des joueurs à l'affichage (coach/vocab.mjs) : back, wave, freeze, ward… ; citations inchangées
    return { ...unitVocab(rest), review: { human: u.review.human }, ...(flags.length ? { flags: flags.map(f => ({ code: f.code, why: f.why })) } : {}) };
  };
  // Publiés : contenus lus ou cités par une unité, et vidéos pédagogiques en attente (suggestions « À regarder »).
  // Les autres vidéos découvertes (flux des chaînes, file de lecture) restent dans le registre privé de la veille.
  const cited = new Set(units.flatMap(u => (u.evidence || []).map(e => e.content)));
  const contents = L.contents.contents
    .filter(c => c.type !== "video" || c.analysis !== "non-analysee" || cited.has(c.id) || c.queueRank || isTeaching(c))
    .map(({ wpBase, wpId, attempts, lastError, ...c }) => (c.descriptionExcerpt ? { ...c, descriptionExcerpt: noEmail(c.descriptionExcerpt) } : c));
  const out = {
    generatedAt: new Date().toISOString(),
    rules: { version: "v1", prompts: { extraction: "v1", critique: "v1", recommandation: "v1" }, locked: lock.ok },
    currentPatch: L.ctx.current,
    competitionVersion: L.changesDoc.competitionVersion || null,
    ddragonVersion: L.changesDoc.ddragonVersion || null,
    patchEntities: L.changesDoc.patches,
    pilot, coverage,
    sources: L.sources.sources.map(({ expertise, ...s }) => ({ ...s, expertise })),
    contents,
    units: units.map(pub),
    glossary: L.glossary.terms,
  };
  await writeJson("data/coach.json", out);
  await writeFile(join(ROOT, "data/coach.js"), `// Généré par coach/build.mjs : base du coach pour l'ouverture sans serveur.\nwindow.COACH = ${JSON.stringify(out)};\n`);

  const month = today().slice(0, 7);
  await writeJson("data/coach-admin.json", {
    generatedAt: out.generatedAt,
    rulesLock: { ok: lock.ok, changed: lock.changed, lockedAt: lock.lock.lockedAt, by: lock.lock.by },
    discovery: state.discovery || {}, lastDiscovery: state.lastDiscovery || null,
    failures: state.failures || [], quarantine: state.quarantine || [], rejected: state.rejected || [],
    pending: contents.filter(c => c.analysis === "en-attente").map(c => c.id),
    review: units.filter(u => u.review.human === "en attente").map(u => u.id),
    contested: units.filter(u => u.review.human === "contestée").map(u => ({ id: u.id, reason: u.review.reason, by: u.review.by })),
    retired: units.filter(u => u.status === "retire").map(u => ({ id: u.id, reason: u.review.reason, by: u.review.by })),
    corrections: L.corrections.history,
    statusLog: statusLog.entries.slice(-100),
    costs: { today: costs.days[today()] || 0, month: Object.entries(costs.days).filter(([d]) => d.startsWith(month)).reduce((s, [, v]) => s + v, 0), calls: costs.calls.slice(-50), budget: { day: L.config.analysis.budgetUsdPerDay, month: L.config.analysis.budgetUsdPerMonth }, model: process.env.MINDIFF_COACH_MODEL || L.config.analysis.model },
  });
  const by = s => units.filter(u => u.status === s).length;
  return [`Coach publié : ${units.length} unités (${by("exploitable")} exploitables, ${by("provisoire")} provisoires, ${by("contradictoire")} contradictoires, ${by("a-revalider")} à revalider, ${by("obsolete")} obsolètes, ${by("retire")} retirées), patch ${out.currentPatch}.`];
}

if (process.argv[1]?.endsWith("build.mjs")) run().then(l => console.log(l.join("\n")), e => { console.error(e.message); process.exit(1); });
