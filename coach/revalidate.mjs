// Après un patch : relève ce qui change dans les notes officielles, enregistre les faits pour les champions suivis
// et laisse le contrôle critique faire passer en « à revalider » les connaissances dont une dépendance a changé.
// Usage : node coach/revalidate.mjs [--offline]

import { P, readJson, writeJson, saveText, cachedText, sha256, today } from "./lib.mjs";
import { htmlToText, parseChanges, patchFromTitle } from "./patch.mjs";
import { mergeBatch } from "./kb.mjs";

const OFFLINE = process.argv.includes("--offline");
const UA = "MINDIFF-coach/1.0 (+https://anthonyloquet96-source.github.io/mindiff/)";
const ROLE_OF = pilot => Object.fromEntries(Object.entries(pilot.champions).flatMap(([r, cs]) => cs.map(c => [c, r])));

async function roster() {
  const cache = await readJson("coach/cache/roster.json", null);
  if (OFFLINE && cache) return cache;
  try {
    const [v] = await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(r => r.json());
    const data = await fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/fr_FR/champion.json`).then(r => r.json());
    const out = { version: v, names: Object.values(data.data).map(c => c.name), ids: Object.fromEntries(Object.values(data.data).map(c => [c.name, c.id])) };
    await writeJson("coach/cache/roster.json", out);
    return out;
  } catch (e) {
    if (cache) return cache;
    throw new Error(`liste des champions indisponible (${e.message})`);
  }
}

// Faits officiels d'un patch pour les champions suivis, repris mot pour mot (aucune reformulation par IA)
export function autoPatchUnits(patch, parsed, contentId, pilot, existing) {
  const roleOf = ROLE_OF(pilot);
  const followed = [...Object.keys(roleOf), ...(pilot.partial || [])];
  const units = [];
  for (const s of parsed.sections.filter(s => s.kind === "champion" && followed.includes(s.name) && s.changes.length)) {
    if (existing.some(u => u.champions?.includes(s.name) && u.themes?.includes("patch") && u.patch?.value === patch && u.nature === "officiel")) continue;
    const lines = s.changes.slice(0, 3);
    units.push({
      id: `u-auto-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${patch.replace(".", "-")}`,
      claim: `Patch ${patch} : ${s.name} change (${[...new Set(lines.map(l => l.heading || "général"))].join(", ")}). ${lines.map(l => l.line).join(" ; ")}`.slice(0, 600),
      champions: [s.name], roles: [roleOf[s.name] || "bottom"], themes: ["patch"],
      context: { queue: "tous", rank: "tous", region: "toutes" },
      patch: { known: true, value: patch },
      metaDependent: true,
      dependsOn: [...new Set(s.changes.map(c => `${s.name}/${c.key}`))],
      conditions: [], limits: ["Fait officiel relevé automatiquement : l'effet en partie n'est pas encore analysé."],
      nature: "officiel",
      evidence: [
        ...lines.slice(0, 2).map(l => ({ content: contentId, locator: `Champions › ${s.name}${l.heading ? " › " + l.heading : ""}`, lang: "fr", passage: l.line.slice(0, 320) })),
        ...(s.reason ? [{ content: contentId, locator: `Champions › ${s.name}`, lang: "fr", passage: s.reason.length > 320 ? s.reason.slice(0, s.reason.lastIndexOf(" ", 318)) : s.reason }] : []),
      ],
      published: null,
    });
  }
  return units;
}

export async function run() {
  const [config, auto, changes, contents, units] = await Promise.all([
    readJson(P.config), readJson("data/auto.json", { news: [] }), readJson("coach/kb/changes.json", { patches: {} }),
    readJson(P.contents), readJson(P.units, { units: [] }),
  ]);
  const r = await roster();
  const notes = auto.news.filter(n => n.game === "lol" && n.type === "patch" && /notes de patch|patch notes/i.test(n.title))
    .map(n => ({ patch: patchFromTitle(n.title), url: n.sources?.find(s => s.kind === "officiel")?.url, date: n.date, title: n.title }))
    .filter(n => n.patch && n.url);
  const log = [];
  for (const n of notes) {
    if (changes.patches[n.patch]) continue;
    const id = `c-riot-notes-${n.patch.replace(".", "-")}`;
    let text = await cachedText(id);
    if (!text && !OFFLINE) {
      const res = await fetch(n.url, { headers: { "user-agent": UA } }).catch(e => ({ ok: false, status: e.message }));
      if (!res.ok) { log.push(`✘ ${n.patch} : notes inaccessibles (${res.status}), nouvel essai au prochain passage`); continue; }
      text = htmlToText(await res.text());
      await saveText(id, text);
    }
    if (!text) continue;
    const parsed = parseChanges(text, r.names);
    if (!parsed.entities.length) { log.push(`✘ ${n.patch} : aucun changement reconnu (structure de page inattendue ?)`); continue; }
    changes.patches[n.patch] = parsed.entities;
    if (!contents.contents.some(c => c.id === id)) contents.contents.push({
      id, sourceId: "riot-patch-notes", type: "article", url: n.url, title: n.title, author: "Riot Games", lang: "fr",
      published: n.date, retrievedAt: today(), patch: n.patch, access: "texte-integral", analysis: "analysee", analyzedAt: today(),
      analyst: "Lecture automatique des notes de patch (sans IA)", scope: "Sections champions, objets et systèmes de la Faille de l'invocateur.",
      quality: { level: "élevée", why: "Texte officiel." }, learn: "Les valeurs exactes qui changent pour vos champions.", textSha256: sha256(text),
    });
    log.push(`✔ ${n.patch} : ${parsed.entities.length} éléments modifiés relevés`);
    changes.parsed ||= {};
    changes.parsed[n.patch] = { contentId: id, at: today() };
  }
  const known = Object.keys(changes.patches).sort((a, b) => (a.split(".").map(Number)[0] - b.split(".").map(Number)[0]) || (a.split(".").map(Number)[1] - b.split(".").map(Number)[1]));
  const prevCurrent = changes.current;
  changes.current = known.at(-1) || changes.current;
  changes.ddragonVersion = r.version;
  changes.competitionVersion = r.version.split(".").slice(0, 2).join(".");
  changes.updatedAt = new Date().toISOString();
  await writeJson(P.contents, contents);
  await writeJson("coach/kb/changes.json", changes);

  // Faits du patch pour les champions suivis
  for (const p of known) {
    const id = changes.parsed?.[p]?.contentId || `c-riot-notes-${p.replace(".", "-")}`;
    const text = await cachedText(id);
    if (!text) continue;
    const batch = autoPatchUnits(p, parseChanges(text, r.names), id, config.pilot, units.units);
    if (batch.length) {
      const res = await mergeBatch({ units: batch, analyst: "Lecture automatique des notes de patch (sans IA)" }, { origin: "lecture-automatique" });
      log.push(`  ${p} : ${res.accepted.length} fait(s) ajouté(s)${res.rejected.length ? `, ${res.rejected.length} rejeté(s)` : ""}`);
    }
  }
  if (prevCurrent !== changes.current) log.push(`Patch courant : ${prevCurrent || "—"} → ${changes.current}`);
  return log;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("revalidate.mjs")) {
  run().then(l => console.log(l.join("\n") || "Rien de nouveau."), e => { console.error("Revalidation impossible :", e.message); process.exit(1); });
}
