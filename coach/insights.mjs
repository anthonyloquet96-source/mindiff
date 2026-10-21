// Champions sans conseils officiels dans Data Dragon : recherche des pages officielles de Riot qui expliquent comment les jouer
// (articles « Champion Insights », mises à jour de gameplay, vidéos « Champion Spotlight » / « How To »), via le plan du site.
// Aucune IA ici : les pages trouvées sont mises en file d'analyse (articles) ou de lecture (vidéos), en priorité.
// Usage : node coach/insights.mjs

import { P, readJson, writeJson, today } from "./lib.mjs";

const SITEMAP = "https://www.leagueoflegends.com/en-us/sitemap_loc.xml";
const PRIORITY = 20; // au-dessus du triage des créateurs : comble d'abord les champions sans aucun conseil
const slug = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "").replace(/['’. ]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

// Pages utiles par champion : conseils de jeu ou intentions de conception ; jamais les skins, la musique ni l'histoire
const PATTERNS = s => [
  new RegExp(`/news/(dev|game-updates)/champion-insights-${s}/$`, "i"),
  new RegExp(`/news/dev/[^/]*${s}[^/]*(rework|vgu|gameplay|update|midscope)[^/]*/$`, "i"),
  new RegExp(`/news/dev/[^/]*(rework|vgu|gameplay|update|midscope)[^/]*${s}[^/]*/$`, "i"),
  new RegExp(`/news/game-updates/${s}-gameplay-preview/$`, "i"),
  new RegExp(`/news/game-updates/gameplay-preview-${s}-update/$`, "i"),
  new RegExp(`/news/game-updates/${s}-champion-spotlight/$`, "i"),
  new RegExp(`/news/game-updates/${s}-[^/]*champ-spotlight/$`, "i"),
  new RegExp(`/news/game-updates/how-to-dominate-with-${s}[^/]*/$`, "i"),
];

export function pickPages(urls, name) {
  const s = slug(name);
  return urls.filter(u => PATTERNS(s).some(re => re.test(u)) && !/skin|theme|cosplay|chibi|prestige/i.test(u));
}

export async function run() {
  const roster = await readJson("coach/kb/ddragon.json", {});
  if (!roster.version) return ["Data Dragon pas encore lu : lancez d'abord node coach/ddragon.mjs."];
  const units = (await readJson(P.units, { units: [] })).units;
  const contents = await readJson(P.contents);
  const list = await fetch(`https://ddragon.leagueoflegends.com/cdn/${roster.version}/data/fr_FR/champion.json`).then(r => r.json());
  const tipped = new Set(units.filter(u => u.id.startsWith("u-dd-") && u.status !== "retire").map(u => u.id.split("-")[2]));
  const missing = Object.values(list.data).filter(c => !tipped.has(c.id.toLowerCase()) || !units.some(u => u.id.startsWith(`u-dd-${c.id.toLowerCase()}-e`)) || !units.some(u => u.id.startsWith(`u-dd-${c.id.toLowerCase()}-a`)));
  const xml = await fetch(SITEMAP).then(r => r.text());
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const log = [], none = [];
  let added = 0;
  for (const ch of missing) {
    const pages = pickPages(urls, ch.name);
    if (!pages.length) { none.push(ch.name); continue; }
    for (const url of pages) {
      const res = await fetch(url).catch(() => null);
      const html = res?.ok ? await res.text() : null;
      if (!html) { log.push(`✘ ${url} : inaccessible`); continue; }
      const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] || "").replace(/\s*\|.*$/, "").replace(/\s*-\s*YouTube$/, "").trim() || url;
      // Beaucoup de pages du site ne sont qu'un renvoi vers une vidéo YouTube : on la traite alors comme une vidéo
      const isVideo = /youtube\.com/.test(res.url) || /-\s*YouTube\s*<\/title>/i.test(html) || /spotlight|how-to-dominate/.test(url);
      const yt = isVideo ? (res.url.match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1] || html.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/)?.[1]) : null;
      if (isVideo && !yt) { log.push(`✘ ${url} : vidéo introuvable`); continue; }
      const published = html.match(/"(?:datePublished|uploadDate)":"(\d{4}-\d{2}-\d{2})/)?.[1] || html.match(/itemprop="(?:datePublished|uploadDate)" content="(\d{4}-\d{2}-\d{2})/)?.[1] || html.match(/(20\d\d-\d\d-\d\d)T\d\d:\d\d:\d\d\.\d{3}Z/)?.[1] || null;
      const id = yt ? `c-yt-${yt}` : `c-riot-${slug(url.split("/").filter(Boolean).pop())}`;
      if (contents.contents.some(c => c.id === id || c.url === url)) continue;
      const common = { sourceId: "riot-champion-insights", author: "Riot Games", lang: "en", published, retrievedAt: today(), patch: null, champions: [ch.name],
        triage: { score: PRIORITY, matched: [ch.name], entertainment: [], patchMentioned: null, basis: `page officielle de Riot sur ${ch.name}, champion sans conseils officiels dans Data Dragon` } };
      if (yt) contents.contents.push({ id, type: "video", url: `https://www.youtube.com/watch?v=${yt}`, pageUrl: url, title, ...common, access: "metadonnees", analysis: "non-analysee", note: "Vidéo officielle de Riot : à lire par Gemini." });
      else contents.contents.push({ id, type: "article", url, title, ...common, access: "texte-integral", analysis: "en-attente", note: published ? `Article officiel du ${published} : les valeurs et intentions décrites peuvent avoir changé depuis.` : "Article officiel non daté." });
      log.push(`+ ${ch.name} : ${yt ? "vidéo" : "article"} ${url}${published ? ` (${published})` : ""}`);
      added++;
    }
  }
  await writeJson(P.contents, contents);
  return [`${missing.length} champions sans conseils officiels complets ; ${added} page(s) officielle(s) ajoutée(s) en file.`, ...log, ...(none.length ? [`· Aucune page officielle trouvée pour : ${none.join(", ")}`] : [])];
}

if (process.argv[1]?.endsWith("insights.mjs")) run().then(l => console.log(l.join("\n")), e => { console.error(e.message); process.exit(1); });
