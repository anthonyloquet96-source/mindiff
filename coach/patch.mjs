// Lecture déterministe des notes de patch officielles : quels champions, compétences, objets et systèmes changent.
// Aucune IA : les changements sont repris tels quels du texte de Riot.

const ENT = { "&nbsp;": " ", "&#x27;": "'", "&#39;": "'", "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&rsquo;": "'" };
export function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
    .replace(/<(h[1-4])[^>]*>/g, "\n## ")
    .replace(/<(li|p|br|div)[^>]*>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[#\w]+;/g, m => ENT[m] ?? m)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n");
}

// Sous-titres d'une section champion → compétence (le client français utilise A Z E R pour Q W E R)
function abilityKey(h) {
  if (/^stats de base/i.test(h)) return "base";
  if (/^compétence passive|^passi(f|ve)/i.test(h)) return "passive";
  const m = h.match(/^([AZERQW])\s*-\s/);
  return m ? { A: "Q", Q: "Q", Z: "W", W: "W", E: "E", R: "R" }[m[1]] : null;
}

const CATS = { champions: "champion", objets: "item", items: "item", runes: "rune", "systèmes": "system", systems: "system" };
const STOP = /^(classic|aram|arena|corrections de bugs|bugfixes|skins et chromas|upcoming skins|temps forts du patch|patch highlights)/i;

// roster : noms des champions (fr), ex. ["Ashe", "Lucian", "Tahm Kench"]
export function parseChanges(text, roster) {
  const names = new Map(roster.map(n => [n.toLowerCase(), n]));
  const sections = [];
  let cat = null, started = false, cur = null, sub = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("## ")) {
      const h = line.slice(3).trim();
      const c = CATS[h.toLowerCase()];
      if (c) { if (started && c === "champion" && cat) break; cat = c; started = true; cur = null; continue; }
      if (!started) continue;
      if (STOP.test(h)) { if (cat) break; continue; }
      if (cat === "champion") {
        if (names.has(h.toLowerCase())) { cur = { kind: "champion", name: names.get(h.toLowerCase()), reason: "", changes: [] }; sections.push(cur); sub = null; continue; }
        const k = abilityKey(h);
        if (cur && k) { sub = { key: k, heading: h }; continue; }
        continue;
      }
      cur = { kind: cat, name: h, reason: "", changes: [] }; sections.push(cur); sub = null;
      continue;
    }
    if (!cur) continue;
    if (cur.kind === "champion" && !sub && !line.includes("⇒")) { cur.reason ||= line; continue; }
    if (line.includes("⇒") || cur.kind !== "champion") {
      if (cur.kind !== "champion" && !line.includes("⇒") && !cur.reason) { cur.reason = line; continue; }
      cur.changes.push({ key: sub?.key || "general", heading: sub?.heading || "", line });
    }
  }
  const entities = new Set();
  for (const s of sections) {
    if (s.kind === "champion") { for (const c of s.changes) entities.add(`${s.name}/${c.key}`); if (!s.changes.length) entities.add(`${s.name}/general`); }
    else entities.add(`${s.kind}:${s.name}`);
  }
  return { sections, entities: [...entities] };
}

export function patchFromTitle(title) {
  const m = String(title || "").match(/(\d{1,2}\.\d{1,2})/);
  return m ? m[1] : null;
}
