// Outils communs de la veille du coach : lecture/écriture de la base, textes en cache, patchs, empreintes.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const P = {
  config: "coach/config.json",
  sources: "coach/sources.json",
  contents: "coach/kb/contents.json",
  units: "coach/kb/units.json",
  corrections: "coach/kb/corrections.json",
  glossary: "coach/kb/glossary.json",
  state: "coach/state/state.json",
  costs: "coach/state/costs.json",
  lock: "coach/rules/rules.lock.json",
  cache: "coach/cache/text",
};
const abs = p => join(ROOT, p);

export async function readJson(p, fallback) {
  try { return JSON.parse(await readFile(abs(p), "utf8")); }
  catch (e) { if (fallback !== undefined) return fallback; throw new Error(`${p} illisible : ${e.message}`); }
}
export async function writeJson(p, data) {
  await mkdir(dirname(abs(p)), { recursive: true });
  await writeFile(abs(p), JSON.stringify(data, null, 1) + "\n");
}
export const sha256 = s => createHash("sha256").update(s).digest("hex");

// Texte réellement consulté (cache privé, jamais publié)
export async function cachedText(contentId) {
  try { return await readFile(abs(`${P.cache}/${contentId}.txt`), "utf8"); } catch { return null; }
}
export async function saveText(contentId, text) {
  await mkdir(abs(P.cache), { recursive: true });
  await writeFile(abs(`${P.cache}/${contentId}.txt`), text);
  return sha256(text);
}

// Comparaison tolérante : espaces, apostrophes et guillemets typographiques
export const normText = s => String(s || "").normalize("NFC")
  .replace(/[‘’ʼ]/g, "'").replace(/[“”«»]/g, '"')
  .replace(/[  \s]+/g, " ").trim().toLowerCase();

// « 26.20 » > « 26.9 » ; null si inconnu
export function patchNum(v) {
  const m = String(v || "").match(/(\d{1,2})\.(\d{1,2})/);
  return m ? Number(m[1]) * 100 + Number(m[2]) : null;
}
export const patchCmp = (a, b) => (patchNum(a) ?? 0) - (patchNum(b) ?? 0);

// Distance en patchs (26.18 → 26.20 = 2) ; les saisons comptent 24 patchs environ
export const patchGap = (from, to) => {
  const a = patchNum(from), b = patchNum(to);
  if (a == null || b == null) return null;
  return (Math.floor(b / 100) - Math.floor(a / 100)) * 24 + (b % 100) - (a % 100);
};

export const today = () => new Date().toISOString().slice(0, 10);
