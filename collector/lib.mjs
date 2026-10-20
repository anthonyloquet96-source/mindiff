import { XMLParser } from "fast-xml-parser";
import { createHash } from "node:crypto";

const UA = "Mozilla/5.0 (compatible; TryhardMeta/0.2)";

export async function fetchText(url, headers = {}) {
  const res = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return res.text();
}
export const fetchJson = async (url, headers) => JSON.parse(await fetchText(url, headers));

export const hash = s => createHash("sha1").update(s).digest("hex").slice(0, 12);

export function stripHtml(s = "") {
  return String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&rsquo;|&#8217;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#8211;|&ndash;/g, "–").replace(/&#8230;|&hellip;/g, "…")
    .replace(/\s+/g, " ").trim();
}
export const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);

// Page Next.js : les données sont dans <script id="__NEXT_DATA__">.
export function nextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (!m) throw new Error("__NEXT_DATA__ introuvable");
  return JSON.parse(m[1]);
}

// Parcourt un objet et renvoie tous les tableaux dont les éléments respectent `test`.
export function findArrays(obj, test, out = []) {
  if (Array.isArray(obj)) {
    if (obj.length && obj.every(x => x && typeof x === "object") && test(obj[0])) out.push(obj);
    obj.forEach(x => findArrays(x, test, out));
  } else if (obj && typeof obj === "object") {
    for (const k in obj) findArrays(obj[k], test, out);
  }
  return out;
}

// Certains flux utilisent des fuseaux en lettres (CEST, CET…) que Date ne comprend pas.
const TZ = { CEST: "+0200", CET: "+0100", BST: "+0100", EDT: "-0400", EST: "-0500", PDT: "-0700", PST: "-0800" };
export function parseDate(s) {
  if (!s) return null;
  const d = new Date(String(s).replace(/\b(CEST|CET|BST|EDT|EST|PDT|PST)\b/, m => TZ[m]));
  return isNaN(d) ? null : d.toISOString();
}

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });
export function parseRss(text) {
  const doc = xml.parse(text);
  const items = [].concat(doc?.rss?.channel?.item ?? []);
  return items.map(i => ({
    title: stripHtml(i.title),
    url: typeof i.link === "string" ? i.link : i.link?.["#text"],
    date: parseDate(i.pubDate),
    summary: stripHtml(i.description),
    image: i.enclosure?.["@url"] || i["media:thumbnail"]?.["@url"] || [].concat(i["media:content"] ?? [])[0]?.["@url"] || null,
    categories: [].concat(i.category ?? []).map(c => stripHtml(typeof c === "string" ? c : c["#text"])),
  }));
}

// Notes de patch Steam au format BBCode → sections et puces lisibles.
export function steamBullets(bb, max = 12) {
  const points = [];
  let section = "";
  for (const raw of bb.split(/\[\/?(?:p|\*|list)\]/)) {
    const line = stripHtml(raw.replace(/\[[^\]]+\]/g, "").replace(/\\\[/g, "[").replace(/\\\]/g, "]")).trim();
    if (!line) continue;
    const head = line.match(/^\[\s*(.+?)\s*\]$/);
    if (head) { section = head[1]; continue; }
    if (/^\[/.test(line) || line.length < 4) continue;
    points.push(section ? `${section} — ${line}` : line);
    if (points.length >= max) break;
  }
  return points;
}
