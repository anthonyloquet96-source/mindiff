// Découverte des nouveaux contenus des sources suivies (séparée de l'analyse).
// Vidéos : métadonnées du flux RSS public uniquement. Articles : liste publique de l'API WordPress.
// Le tri par pertinence se fait sur les métadonnées : il fixe une priorité, jamais une preuve du contenu.
// Usage : node coach/discover.mjs [--force]

import { XMLParser } from "fast-xml-parser";
import { P, readJson, writeJson, today } from "./lib.mjs";

const FORCE = process.argv.includes("--force");
const UA = "MINDIFF-coach/1.0 (+https://anthonyloquet96-source.github.io/mindiff/)";
const VIDEO_NOTE = "Transcription inaccessible par une voie autorisée : l'API YouTube ne permet de télécharger les sous-titres que pour ses propres vidéos ou avec l'autorisation du propriétaire. Import administrateur possible (coach/import-transcript.mjs).";

export function triage(text, pilot) {
  const champs = Object.values(pilot.champions).flat().concat(pilot.partial || []);
  const t = ` ${String(text).toLowerCase()} `;
  const matched = [
    ...champs.filter(c => t.includes(` ${c.toLowerCase()}`)),
    ...["adc", "bot lane", "botlane", "support", "marksman", "laning", "wave", "trading", "duo", "tireur", "vague"].filter(k => t.includes(` ${k}`)),
  ];
  const patch = t.match(/patch\s*(\d{1,2}\.\d{1,2})/)?.[1] || null;
  return { score: matched.length * 2 + (patch ? 1 : 0), matched, patchMentioned: patch, basis: "métadonnées seules (titre et description) : ne prouve pas le contenu" };
}

async function get(url, type) {
  const ctl = AbortSignal.timeout(20000);
  const r = await fetch(url, { headers: { "user-agent": UA }, signal: ctl });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return type === "json" ? r.json() : r.text();
}

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });
export function parseYoutubeFeed(text) {
  const feed = xml.parse(text).feed || {};
  return [].concat(feed.entry || []).map(e => ({
    videoId: e["yt:videoId"], title: e.title, url: e.link?.["@href"] || `https://www.youtube.com/watch?v=${e["yt:videoId"]}`,
    published: e.published, author: e.author?.name,
    description: e["media:group"]?.["media:description"] || "",
    views: Number(e["media:group"]?.["media:community"]?.["media:statistics"]?.["@views"] || 0) || null,
  }));
}

export async function run() {
  const [config, reg, contents, state] = await Promise.all([readJson(P.config), readJson(P.sources), readJson(P.contents), readJson(P.state, {})]);
  const d = config.discovery;
  state.discovery ||= {};
  const log = [];
  const byId = new Map(contents.contents.map(c => [c.id, c]));
  const active = reg.sources.filter(s => s.active && ["youtube-rss", "wp-json"].includes(s.access.discovery?.type)).slice(0, d.maxSources);
  for (const s of active) {
    const st = state.discovery[s.id] ||= { attempts: 0 };
    const now = Date.now();
    if (!FORCE && st.lastOk && now - new Date(st.lastOk) < d.everyHours * 36e5) { log.push(`· ${s.id} : vérifiée il y a moins de ${d.everyHours} h`); continue; }
    if (!FORCE && st.nextTry && now < new Date(st.nextTry)) { log.push(`· ${s.id} : nouvel essai prévu ${st.nextTry}`); continue; }
    try {
      let items = [];
      if (s.access.discovery.type === "youtube-rss") {
        items = parseYoutubeFeed(await get(s.access.discovery.url, "text")).slice(0, d.maxItemsPerSource).map(v => ({
          id: `c-yt-${v.videoId}`, sourceId: s.id, type: "video", url: v.url, title: v.title, author: v.author || s.author, lang: s.langs[0],
          published: v.published?.slice(0, 10), retrievedAt: today(), patch: null, views: v.views,
          access: "metadonnees", analysis: "non-analysee", note: VIDEO_NOTE,
          descriptionExcerpt: String(v.description).slice(0, 280),
          triage: triage(`${v.title} ${v.description}`, config.pilot),
        }));
      } else {
        const posts = await get(s.access.discovery.url, "json");
        items = posts.slice(0, d.maxItemsPerSource).map(p => ({
          id: `c-wtl-${p.id}`, sourceId: s.id, type: "article", url: p.link, title: String(p.title?.rendered || "").replace(/<[^>]+>/g, ""),
          author: s.author, lang: s.langs[0], published: p.date?.slice(0, 10), modified: p.modified?.slice(0, 10), retrievedAt: today(), patch: null,
          access: "texte-integral", analysis: "en-attente", wpId: p.id, wpBase: new URL(s.access.discovery.url).origin,
          triage: triage(p.title?.rendered || "", config.pilot),
        }));
      }
      let added = 0, updated = 0;
      for (const it of items) {
        const prev = byId.get(it.id);
        if (!prev) { byId.set(it.id, it); added++; continue; }
        // Article modifié depuis l'analyse : réanalyse ciblée ; une vidéo ne change pas de fond sans nouvelle transcription
        if (it.type === "article" && it.modified && prev.modified && it.modified > prev.modified) {
          byId.set(it.id, { ...prev, modified: it.modified, analysis: "en-attente", reanalyse: true, attempts: 0 }); updated++;
        } else if (it.views != null) byId.set(it.id, { ...prev, views: it.views });
      }
      Object.assign(st, { lastOk: new Date().toISOString(), attempts: 0, lastError: null, nextTry: null, lastCount: items.length });
      log.push(`✔ ${s.id} : ${items.length} éléments lus, ${added} nouveau(x), ${updated} modifié(s)`);
    } catch (e) {
      st.attempts = (st.attempts || 0) + 1;
      st.lastError = `${e.message} (${new Date().toISOString()})`;
      const wait = d.retryAfterHours[Math.min(st.attempts - 1, d.retryAfterHours.length - 1)];
      st.nextTry = new Date(Date.now() + wait * 36e5).toISOString();
      if (st.attempts >= d.maxAttempts) st.status = "en panne";
      log.push(`✘ ${s.id} : ${e.message} — contenus déjà connus conservés, nouvel essai dans ${wait} h${st.status ? " (source signalée en panne)" : ""}`);
    }
  }
  contents.contents = [...byId.values()];
  await writeJson(P.contents, contents);
  state.lastDiscovery = new Date().toISOString();
  await writeJson(P.state, state);
  return log;
}

if (process.argv[1]?.endsWith("discover.mjs")) run().then(l => console.log(l.join("\n")), e => { console.error(e.message); process.exit(1); });
