// Anciens guides d'une chaîne suivie : le flux RSS ne donne que les 15 dernières vidéos.
// Cherche dans la chaîne (page de recherche publique de YouTube), garde les guides et tutoriels,
// et les met en file de lecture avec leur vraie date de publication. Aucune IA ici.
// Usage : node coach/backfill.mjs <sourceId> [priorité] "<recherche>" ["<recherche>" …]
//   ex. node coach/backfill.mjs yt-chreak 12 guide "dans la tete d'un challenger" coaching

import { P, readJson, writeJson, today } from "./lib.mjs";
import { triage } from "./discover.mjs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36";
const HEAD = { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8", Cookie: "CONSENT=YES+cb; SOCS=CAI" };
// Guides et cours ; jamais les courts extraits, tier lists, notes de patch ni divertissement (dépassés ou sans méthode)
const KEEP = /guide|tuto|coaching|comment (jouer|carry|monter)|dans la t[eê]te d'un|apprend|how to|fundamentals/i;
const DROP = /tier ?list|patch ?note|op picks|guess the elo|trailer|#shorts|#twitch|r[ée]action|fin des guides|futur 20\d\d|inscription/i;

const ytData = html => JSON.parse(html.match(/var ytInitialData = (\{.*?\});<\/script>/s)?.[1] || "{}");
function videos(data) {
  const out = [];
  (function walk(o) {
    if (!o || typeof o !== "object") return;
    if (o.videoRenderer) { const v = o.videoRenderer; out.push({ id: v.videoId, title: v.title.runs.map(r => r.text).join(""), length: v.lengthText?.simpleText || null }); }
    for (const k in o) walk(o[k]);
  })(data);
  return out;
}
const minutes = len => (len ? len.split(":").map(Number).reduce((a, b) => a * 60 + b, 0) / 60 : null);

export function keep(v) { return KEEP.test(v.title) && !DROP.test(v.title) && (minutes(v.length) ?? 99) >= 3; }

export async function run(sourceId, priority, queries) {
  const reg = await readJson("coach/sources.json");
  const src = (reg.sources || reg).find(s => s.id === sourceId);
  if (!src?.channelId) return [`Source ${sourceId} inconnue ou sans chaîne YouTube.`];
  const config = await readJson("coach/config.json");
  const contents = await readJson(P.contents);
  const found = new Map();
  for (const q of queries) {
    const html = await fetch(`https://www.youtube.com/channel/${src.channelId}/search?query=${encodeURIComponent(q)}`, { headers: HEAD }).then(r => r.text());
    for (const v of videos(ytData(html))) if (keep(v)) found.set(v.id, v);
  }
  const log = [];
  let added = 0;
  for (const v of found.values()) {
    const id = `c-yt-${v.id}`;
    if (contents.contents.some(c => c.id === id)) continue;
    // Date exacte et description depuis la page publique de la vidéo
    const page = await fetch(`https://www.youtube.com/watch?v=${v.id}`, { headers: HEAD }).then(r => r.text()).catch(() => "");
    const published = page.match(/"(?:publishDate|uploadDate)":"(\d{4}-\d{2}-\d{2})/)?.[1] || null;
    const description = (page.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)?.[1] || "").replace(/\\n/g, "\n").replace(/\\"/g, '"').slice(0, 300);
    const tr = triage(`${v.title} ${description}`, config.pilot, null, src.credibility.level);
    contents.contents.push({
      id, sourceId, type: "video", url: `https://www.youtube.com/watch?v=${v.id}`, title: v.title, author: src.author, lang: src.langs[0], published, retrievedAt: today(), patch: null,
      access: "metadonnees", analysis: "non-analysee", descriptionExcerpt: description, backfill: true,
      note: "Ancien guide ajouté à la demande (recherche dans la chaîne) : à lire par Gemini.",
      triage: { ...tr, score: priority, basis: `ancien guide de ${src.name} ciblé à la demande ; ${tr.basis}` },
    });
    log.push(`+ ${published || "?"} ${v.length || "?"} ${v.title.slice(0, 90)}`);
    added++;
  }
  await writeJson(P.contents, contents);
  return [`${src.name} : ${found.size} guides trouvés, ${added} ajoutés en file (priorité ${priority}).`, ...log];
}

if (process.argv[1]?.endsWith("backfill.mjs")) {
  const [sourceId, prio, ...queries] = process.argv.slice(2);
  run(sourceId, Number(prio) || 10, queries.length ? queries : ["guide"]).then(l => console.log(l.join("\n")), e => { console.error(e.message); process.exit(1); });
}
