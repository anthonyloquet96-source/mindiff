// Contrôle administrateur (relecture humaine). Chaque action est historisée dans coach/kb/corrections.json.
// Usage :
//   node coach/admin.mjs statut
//   node coach/admin.mjs valider   <unité> "<nom>"
//   node coach/admin.mjs contester <unité> "<nom>" "<raison>"
//   node coach/admin.mjs retirer   <unité> "<nom>" "<raison>"
//   node coach/admin.mjs reactiver <unité> "<nom>" "<raison>"
//   node coach/admin.mjs corriger  <unité> <champ> "<nouvelle valeur JSON ou texte>" "<nom>" "<raison>"
//   node coach/admin.mjs lock-rules "<nom>"     (après relecture d'un changement des règles ou instructions)

import { readJson, P } from "./lib.mjs";
import { appendCorrection, evaluateAll, writeRulesLock, rulesLockStatus } from "./kb.mjs";

const [cmd, id, ...rest] = process.argv.slice(2);
const units = (await readJson(P.units, { units: [] })).units;
const need = () => { if (!units.some(u => u.id === id)) { console.error(`Unité inconnue : ${id}`); process.exit(1); } };
const ACTIONS = { valider: "valide", contester: "conteste", retirer: "retire", reactiver: "reactive" };

if (cmd === "statut" || !cmd) {
  const { units: ev } = await evaluateAll();
  const by = s => ev.filter(u => u.status === s).length;
  const lock = await rulesLockStatus();
  const state = await readJson(P.state, {});
  console.log(`Unités : ${ev.length} · exploitables ${by("exploitable")} · provisoires ${by("provisoire")} · contradictoires ${by("contradictoire")} · à revalider ${by("a-revalider")} · obsolètes ${by("obsolete")} · retirées ${by("retire")}`);
  console.log(`Relecture humaine en attente : ${ev.filter(u => u.review.human === "en attente").length}`);
  console.log(`Règles verrouillées : ${lock.ok ? "oui" : "NON — modifiées : " + lock.changed.join(", ")}`);
  console.log(`Analyses en échec : ${(state.failures || []).length} · lots rejetés : ${(state.rejected || []).length} · quarantaine : ${(state.quarantine || []).length}`);
} else if (ACTIONS[cmd]) {
  need();
  const [by, reason = ""] = rest;
  if (!by) { console.error("Indiquez votre nom (relecture humaine)."); process.exit(1); }
  if (cmd !== "valider" && !reason) { console.error("Indiquez une raison."); process.exit(1); }
  await appendCorrection({ action: ACTIONS[cmd], unit: id, by, reason });
  console.log(`${cmd} : ${id} (historisé)`);
} else if (cmd === "corriger") {
  need();
  const [field, value, by, reason] = rest;
  if (!field || value == null || !by || !reason) { console.error("Usage : corriger <unité> <champ> <valeur> <nom> <raison>"); process.exit(1); }
  if (["id", "evidence", "nature"].includes(field)) { console.error(`Le champ ${field} ne se corrige pas : retirez l'unité et proposez-en une nouvelle.`); process.exit(1); }
  const before = units.find(u => u.id === id)[field];
  let after = value; try { after = JSON.parse(value); } catch { /* texte */ }
  await appendCorrection({ action: "corrige", unit: id, field, before, after, by, reason });
  console.log(`corrigé : ${id}.${field}`);
} else if (cmd === "lock-rules") {
  if (!id) { console.error("Indiquez votre nom."); process.exit(1); }
  const changed = await writeRulesLock(id);
  console.log(changed.length ? `Empreintes mises à jour pour : ${changed.join(", ")}` : "Aucun changement : empreintes inchangées.");
} else {
  console.error("Commande inconnue. Voir l'en-tête de coach/admin.mjs.");
  process.exit(1);
}
