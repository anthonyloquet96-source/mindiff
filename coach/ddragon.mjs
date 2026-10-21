// Socle officiel pour tous les champions : conseils de Riot (Data Dragon) pour jouer un champion et pour l'affronter.
// Aucune IA : chaque unité reprend un conseil officiel mot pour mot, rattaché aux compétences qu'il nomme.
// À relancer quand Data Dragon change de version (les conseils modifiés sont alors repris).
// Usage : node coach/ddragon.mjs

import { P, readJson, writeJson, saveText, sha256, today } from "./lib.mjs";
import { mergeBatch } from "./kb.mjs";

const DD = "https://ddragon.leagueoflegends.com";
const strip = s => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const KEYS = ["Q", "W", "E", "R"];

export async function run() {
  const [version] = await fetch(`${DD}/api/versions.json`).then(r => r.json());
  const done = await readJson("coach/kb/ddragon.json", {});
  if (done.version === version && !process.argv.includes("--force")) return [`Data Dragon ${version} déjà lu : rien à faire.`];
  const list = await fetch(`${DD}/cdn/${version}/data/fr_FR/champion.json`).then(r => r.json());
  const contents = await readJson(P.contents);
  const units = await readJson(P.units, { units: [] });
  const known = new Set(units.units.flatMap(u => u.evidence.map(e => e.passage)));
  const batch = [];
  let champs = 0;
  for (const base of Object.values(list.data)) {
    const [fr, en] = await Promise.all(["fr_FR", "en_US"].map(l => fetch(`${DD}/cdn/${version}/data/${l}/champion/${base.id}.json`).then(r => r.json()).then(j => j.data[base.id])));
    const name = fr.name;
    const cid = `c-dd-${version.replace(/\./g, "-")}-${base.id.toLowerCase()}`;
    const text = [fr, en].map((d, i) => `## ${i ? "en_US" : "fr_FR"}\n${d.name} — ${d.title}\nPassif ${d.passive.name} : ${strip(d.passive.description)}\n${d.spells.map((s, k) => `${KEYS[k]} ${s.name} : ${strip(s.description)}`).join("\n")}\nallytips: ${d.allytips.join(" | ")}\nenemytips: ${d.enemytips.join(" | ")}\n`).join("\n");
    await saveText(cid, text);
    // Page officielle du champion : mêmes descriptions de compétences, plus lisible que le JSON
    const page = `https://www.leagueoflegends.com/fr-fr/champions/${base.id.toLowerCase()}/`;
    const pageOk = await fetch(page, { method: "HEAD" }).then(r => r.ok).catch(() => false);
    if (!contents.contents.some(c => c.id === cid)) contents.contents.push({
      id: cid, sourceId: "riot-data-dragon", type: "donnees", url: `${DD}/cdn/${version}/data/fr_FR/champion/${base.id}.json`,
      ...(pageOk ? { readerUrl: page, readerNote: "La page officielle du champion affiche les mêmes descriptions de compétences ; les conseils officiels ne figurent que dans les données brutes." } : {}),
      title: `${name} — compétences et conseils officiels (Data Dragon ${version})`, author: "Riot Games", lang: "fr", langsCompared: ["fr", "en"],
      published: null, retrievedAt: today(), patch: `${version} (version client)`, access: "api-json", analysis: "analysee", analyzedAt: today(),
      analyst: "Lecture automatique de Data Dragon (sans IA)", scope: "Compétences et conseils officiels, français et anglais.",
      quality: { level: "élevée", why: "Texte officiel, mais conseils anciens et génériques, non datés." }, learn: `Les conseils officiels de Riot pour jouer ${name} et pour l'affronter.`, textSha256: sha256(text),
    });
    // Compétences citées dans un conseil → dépendances précises pour la revalidation après patch
    const deps = tip => {
      const d = fr.spells.map((s, k) => (tip.includes(s.name) ? `${name}/${KEYS[k]}` : null)).filter(Boolean);
      if (tip.includes(fr.passive.name)) d.push(`${name}/passive`);
      return d.length ? d : [`${name}/general`];
    };
    const common = { roles: ["all"], context: { queue: "tous", rank: "tous", region: "toutes" }, patch: { known: false, checkedAgainst: version }, metaDependent: false, conditions: [], nature: "officiel", published: null, levelContext: "non-precise", usage: "reference" };
    fr.allytips.forEach((tip, i) => {
      if (known.has(tip) || tip.length > 320) return;
      batch.push({ id: `u-dd-${base.id.toLowerCase()}-a${i + 1}`, claim: tip, champions: [name], themes: ["champion"], dependsOn: deps(tip), limits: ["Conseil officiel non daté, cohérent avec la description de la version " + version + "."], evidence: [{ content: cid, locator: `${name} › conseils pour le jouer (fr_FR)`, lang: "fr", passage: tip }], ...common });
    });
    fr.enemytips.forEach((tip, i) => {
      if (known.has(tip) || tip.length > 320) return;
      batch.push({ id: `u-dd-${base.id.toLowerCase()}-e${i + 1}`, claim: `Contre ${name} : ${tip}`, champions: [], matchup: { vs: name }, themes: ["matchup"], dependsOn: deps(tip), limits: ["Conseil officiel non daté et général : il ne dit rien du duo ou de l'équipe qui accompagne ce champion."], evidence: [{ content: cid, locator: `${name} › conseils pour l'affronter (fr_FR)`, lang: "fr", passage: tip }], ...common });
    });
    champs++;
  }
  await writeJson(P.contents, contents);
  const res = await mergeBatch({ units: batch, analyst: "Lecture automatique de Data Dragon (sans IA)" }, { origin: "data-dragon" });
  await writeJson("coach/kb/ddragon.json", { version, champions: champs, units: res.accepted.length, at: new Date().toISOString() });
  return [`${champs} champions lus (Data Dragon ${version}) : ${res.accepted.length} conseils officiels enregistrés, ${res.rejected.length} rejetés.`, ...res.rejected.slice(0, 5).map(r => `  ✘ ${r.id} : ${r.reasons.map(x => x.code).join(", ")}`)];
}

if (process.argv[1]?.endsWith("ddragon.mjs")) run().then(l => console.log(l.join("\n")), e => { console.error(e.message); process.exit(1); });
