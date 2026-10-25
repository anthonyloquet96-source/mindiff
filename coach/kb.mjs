// Base de connaissances : chargement du contexte, fusion d'un lot, recalcul des statuts, corrections humaines.
// Toutes les écritures passent par ici, quelle que soit leur origine (personne, agent Claude Code, analyse automatique).

import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { P, ROOT, readJson, writeJson, cachedText, sha256, today } from "./lib.mjs";
import { checkUnit } from "./critic.mjs";
import { findContradictions, applyContradictions } from "./contradictions.mjs";
import { items, ddNames } from "./review.mjs";

export async function loadContext() {
  const [config, sources, contents, units, corrections, glossary, changes] = await Promise.all([
    readJson(P.config), readJson(P.sources), readJson(P.contents), readJson(P.units, { units: [] }),
    readJson(P.corrections, { history: [] }), readJson(P.glossary, { terms: [] }), readJson("coach/kb/changes.json", { current: null, patches: {} }),
  ]);
  const contentMap = new Map(contents.contents.map(c => [c.id, c]));
  const texts = new Map();
  for (const c of contents.contents) texts.set(c.id, await cachedText(c.id));
  return {
    config, sources, contents, units, corrections, glossary, changesDoc: changes,
    ctx: { config, glossary, contents: contentMap, texts, sources: new Map(sources.sources.map(s => [s.id, s])), current: changes.current, changes: changes.patches },
  };
}

// Dernière décision humaine par unité (retrait, contestation, validation, correction)
export function humanState(corrections, id) {
  const h = corrections.history.filter(x => x.unit === id);
  const last = a => h.filter(x => a.includes(x.action)).at(-1);
  const r = last(["retire", "reactive"]);
  return {
    retired: r?.action === "retire" ? r : null,
    contested: (() => { const c = last(["conteste", "valide"]); return c?.action === "conteste" ? c : null; })(),
    approved: last(["valide"]) || null,
    fields: h.filter(x => x.action === "corrige"),
  };
}

// Statut final d'une unité : contrôle critique, puis décisions humaines (qui priment)
export function evaluate(u, ctx, corrections) {
  const hs = humanState(corrections, u.id);
  const fixed = { ...u };
  for (const f of hs.fields) fixed[f.field] = f.after;
  const res = checkUnit(fixed, ctx);
  let status = res.status;
  // Un contrôle bloquant apparu après la fusion (règle durcie, source modifiée) : à revalider, jamais exploitable
  if (res.blocking && ["exploitable", "provisoire", "contradictoire"].includes(status)) status = "a-revalider";
  if (hs.contested && status === "exploitable") status = "provisoire";
  if (hs.retired) status = "retire";
  return {
    ...fixed,
    status,
    flags: res.flags.map(({ code, why }) => ({ code, why })),
    independentSources: res.independentSources,
    review: { human: hs.retired ? "retirée" : hs.contested ? "contestée" : hs.approved ? "validée" : "en attente", by: (hs.retired || hs.contested || hs.approved)?.by || null, at: (hs.retired || hs.contested || hs.approved)?.at || null, reason: (hs.retired || hs.contested)?.reason || null },
    blocking: res.blocking ? res.flags.filter(f => f.blocking).map(f => f.code) : [],
  };
}

// Fusion d'un lot : les unités qui échouent à un contrôle bloquant sont rejetées, jamais enregistrées
export async function mergeBatch(batch, { origin }) {
  const L = await loadContext();
  const byId = new Map(L.units.units.map(u => [u.id, u]));
  const accepted = [], rejected = [];
  for (const raw of batch.units || []) {
    const u = {
      ...raw,
      proposedStatus: raw.status || raw.proposedStatus || null,
      analyst: raw.analyst || batch.analyst || origin,
      origin,
      promptVersions: batch.promptVersions || null,
      analyzedAt: raw.analyzedAt || today(),
      validity: { checkedAt: today(), checkedPatch: L.ctx.current },
    };
    delete u.status;
    const ev = evaluate(u, L.ctx, L.corrections);
    if (ev.blocking.length) { rejected.push({ id: u.id, reasons: ev.flags.filter(f => ev.blocking.includes(f.code)) }); continue; }
    if (!ev.flags.some(f => f.code.startsWith("citation"))) u.verified = { at: today(), passages: true };
    const prev = byId.get(u.id);
    const changed = !prev || sha256(JSON.stringify(strip(prev))) !== sha256(JSON.stringify(strip(u)));
    u.version = prev ? (changed ? (prev.version || 1) + 1 : prev.version || 1) : 1;
    u.firstSeen = prev?.firstSeen || today();
    byId.set(u.id, u);
    accepted.push({ id: u.id, status: ev.status, flags: ev.flags.map(f => f.code), version: u.version });
  }
  L.units.units = [...byId.values()];
  L.units.updatedAt = new Date().toISOString();
  await writeJson(P.units, L.units);
  const state = await readJson(P.state, {});
  state.rejected = [...(state.rejected || []).filter(r => !accepted.some(a => a.id === r.id)), ...rejected.map(r => ({ ...r, at: today(), origin }))].slice(-200);
  await writeJson(P.state, state);
  return { accepted, rejected };
}
const strip = u => { const { version, firstSeen, validity, analyzedAt, verified, ...rest } = u; return rest; };

// Recalcul de toutes les unités (après un patch, une correction ou un nouveau contenu)
export async function evaluateAll() {
  const L = await loadContext();
  const units = L.units.units.map(u => evaluate(u, L.ctx, L.corrections));
  // Contradictions entre unités : départagées par la source officielle, les données Diamant+ ou la date ; sinon listées
  try {
    const { names, champKey } = await contradictionNames();
    const [champstats, matchups] = await Promise.all([readJson("coach/cache/champstats.json", null), readJson("coach/cache/matchups.json", null)]);
    const found = findContradictions(units, names, { champstats, matchups, champKey });
    applyContradictions(units, found);
    await writeJson("coach/kb/contradictions.json", { at: new Date().toISOString(), note: "Conseils qui se contredisent sur un même sujet. Le conseil écarté passe « contradictoire » (non montré) ; les cas non départagés sont à vérifier à la source.", items: found });
  } catch (e) { console.error(`Contradictions non vérifiées : ${e.message}`); }
  return { L, units };
}
// Noms français des objets, runes clés et sorts (Data Dragon), et correspondance nom de champion → numéro
async function contradictionNames() {
  const [it, nm] = await Promise.all([items(), ddNames()]);
  const names = [
    ...Object.entries(it).filter(([, x]) => x.gold >= 400).map(([id, x]) => ({ kind: "item", id, name: x.name })),
    ...Object.entries(nm.perk).map(([id, x]) => ({ kind: "rune", id, name: x.name })),
    ...Object.values(nm.spell).map(x => ({ kind: "sort", id: x.id, name: x.name })),
  ].filter((n, i, all) => all.findIndex(m => m.name === n.name) === i);
  const champs = await fetch(`https://ddragon.leagueoflegends.com/cdn/${nm.v}/data/fr_FR/champion.json`).then(r => r.json());
  const champKey = Object.fromEntries(Object.values(champs.data).map(c => [c.name, c.key]));
  return { names, champKey };
}

export async function appendCorrection(entry) {
  const c = await readJson(P.corrections, { history: [] });
  c.history.push({ at: new Date().toISOString(), ...entry });
  await writeJson(P.corrections, c);
}

export async function rulesLockStatus() {
  // Toutes les instructions de coach/prompts (v1, v2…) sont verrouillées, pas seulement celles en service
  const files = ["coach/rules/FIABILITE.md", ...(await readdir(join(ROOT, "coach/prompts"))).filter(f => f.endsWith(".md")).sort().map(f => `coach/prompts/${f}`)];
  const lock = await readJson(P.lock, { files: {} });
  const now = {};
  for (const f of files) now[f] = sha256((await readFile(join(ROOT, f), "utf8")).replace(/\r\n/g, "\n"));
  const changed = files.filter(f => lock.files[f] !== now[f]);
  return { ok: !changed.length, changed, now, lock };
}
export async function writeRulesLock(by) {
  const s = await rulesLockStatus();
  await writeJson(P.lock, { lockedAt: new Date().toISOString(), by, files: s.now });
  return s.changed;
}
export { mkdir, writeFile };
