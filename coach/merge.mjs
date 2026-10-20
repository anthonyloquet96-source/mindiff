// Fusionne un lot d'unités rédigé par une personne ou par l'agent Analyste LoL (Claude Code).
// Usage : node coach/merge.mjs coach/kb/batches/<lot>.json [--origin agent-claude-code]

import { readJson } from "./lib.mjs";
import { mergeBatch, rulesLockStatus } from "./kb.mjs";

const file = process.argv[2];
if (!file) { console.error("Usage : node coach/merge.mjs <lot.json>"); process.exit(1); }
const i = process.argv.indexOf("--origin");
const origin = i > 0 ? process.argv[i + 1] : "agent-claude-code";

const lock = await rulesLockStatus();
if (!lock.ok) { console.error(`Règles ou instructions modifiées sans validation : ${lock.changed.join(", ")}.\nRelisez le changement puis lancez : node coach/admin.mjs lock-rules "<votre nom>"`); process.exit(1); }

const res = await mergeBatch(await readJson(file), { origin });
for (const a of res.accepted) console.log(`✔ ${a.id} → ${a.status}${a.flags.length ? ` (${a.flags.join(", ")})` : ""}`);
for (const r of res.rejected) console.log(`✘ ${r.id} rejetée : ${r.reasons.map(x => `${x.code} — ${x.why}`).join(" | ")}`);
console.log(`${res.accepted.length} acceptée(s), ${res.rejected.length} rejetée(s).`);
