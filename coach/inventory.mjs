// Inventaire des vidéos pédagogiques de League of Legends, toutes langues : pour chiffrer la lecture par Gemini avant de payer.
// Lit les pages publiques de YouTube (recherche, catalogue des chaînes) ; aucune IA, aucune clé. Résultat privé : coach/cache/inventory.json.
// Usage :
//   node coach/inventory.mjs chercher          chaînes candidates par langue (recherche YouTube, filtre « chaînes »)
//   node coach/inventory.mjs catalogue [ids…]   catalogue complet des chaînes (suivies + candidates retenues), coût estimé

import { readFile, writeFile } from "node:fs/promises";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36";
const HEAD = { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", Cookie: "CONSENT=YES+cb; SOCS=CAI" };
const OUT = "coach/cache/inventory.json";
const wait = ms => new Promise(r => setTimeout(r, ms));

// Vidéo pédagogique : guide, cours, analyse, dans les principales langues du jeu
export const TEACH = /guide|tuto|coaching|coach\b|how to|fundamentals|explained|breakdown|masterclass|vod review|educational|learn|tips|mistakes|climb|macro|wave ?manag|jungle path|matchup|comment (jouer|carry|monter)|dans la t[eê]te|apprend|astuce|conseils?|erreurs|gu[ií]a|c[oó]mo (jugar|subir)|consejos|aprende|como jogar|dicas|tutorial|anleitung|tipps|erkl[äa]r|wie man|공략|강의|강좌|가이드|운영|라인전|꿀팁|解説|講座|立ち回り|初心者|コーチング|hướng dẫn|cách chơi|mẹo|poradnik|jak grać|rehber|nasıl oynanır|гайд|как играть/i;
export const DROP = /tier ?list|patch ?note|op picks|guess the elo|trailer|#shorts|\bshorts?\b|r[ée]action|reacts?|highlights?|montage|funny|best moments|cinematic|music|skin spotlight|asmr/i;
const minutes = len => (len ? len.split(":").map(Number).reduce((a, b) => a * 60 + b, 0) / 60 : null);
// « 3 years ago », « 11 months ago » (page en anglais) → âge approximatif en mois
const ageMonths = t => { const m = String(t || "").match(/(\d+)\s+(second|minute|hour|day|week|month|year)/); if (!m) return null; const n = +m[1]; return { second: 0, minute: 0, hour: 0, day: n / 30, week: n / 4.3, month: n, year: n * 12 }[m[2]]; };

async function page(url) {
  const html = await fetch(url, { headers: HEAD, signal: AbortSignal.timeout(30000) }).then(r => r.text());
  const data = JSON.parse(html.match(/var ytInitialData = (\{.*?\});<\/script>/s)?.[1] || "{}");
  const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const ctx = JSON.parse(html.match(/"INNERTUBE_CONTEXT":(\{.*?\}),"INNERTUBE_CONTEXT_CLIENT_NAME"/s)?.[1] || "null");
  return { data, key, ctx, html };
}
function walk(o, fn) { if (!o || typeof o !== "object") return; fn(o); for (const k in o) walk(o[k], fn); }
const text = t => t?.simpleText ?? t?.runs?.map(r => r.text).join("") ?? null;

// ---------- Chaînes candidates : recherche YouTube filtrée sur les chaînes
const QUERIES = {
  en: ["league of legends challenger guide", "league of legends coaching educational", "lol high elo coach tips"],
  fr: ["league of legends guide challenger français", "lol coaching français"],
  es: ["league of legends guía challenger", "lol consejos para subir de elo"],
  pt: ["league of legends guia challenger", "lol dicas para subir de elo"],
  de: ["league of legends guide deutsch challenger", "lol tipps deutsch"],
  ko: ["롤 강의 챌린저", "롤 공략 강의"],
  ja: ["LoL 解説 講座"],
  vi: ["liên minh huyền thoại hướng dẫn cao thủ"],
  pl: ["league of legends poradnik challenger"],
  tr: ["league of legends rehber challenger"],
};
async function searchChannels(langs = Object.keys(QUERIES), known = []) {
  const found = new Map(known.map(c => [c.channelId, c]));
  for (const [lang, qs] of Object.entries(QUERIES).filter(([l]) => langs.includes(l))) for (const q of qs) {
    const { data } = await page(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAg%3D%3D&hl=en`).catch(e => { console.error(`${q} : ${e.cause?.message || e.message}`); return { data: {} }; });
    walk(data, o => {
      const c = o.channelRenderer;
      if (!c || found.has(c.channelId)) return;
      found.set(c.channelId, { channelId: c.channelId, name: text(c.title), lang, query: q, subscribers: text(c.videoCountText) || text(c.subscriberCountText), description: text(c.descriptionSnippet) || "" });
    });
    await wait(4000);
  }
  return [...found.values()];
}

// ---------- Catalogue d'une chaîne : toutes les vidéos (titre, durée, âge), page par page
export async function catalogue(channelId, { maxMonths = 36, maxPages = 60 } = {}) {
  const first = await page(`https://www.youtube.com/channel/${channelId}/videos?hl=en&gl=US`);
  let name = null, subs = null;
  walk(first.data, o => {
    if (o.channelMetadataRenderer && !name) name = o.channelMetadataRenderer.title;
    if (o.pageHeaderViewModel && !subs) subs = JSON.stringify(o.pageHeaderViewModel).match(/"content":"([\d.,KMk]+ subscribers)"/)?.[1] || null;
  });
  const vids = [];
  const collect = d => {
    let token = null;
    walk(d, o => {
      const v = o.videoRenderer;
      if (v) vids.push({ id: v.videoId, title: text(v.title), length: text(v.lengthText), age: ageMonths(text(v.publishedTimeText)), views: text(v.viewCountText) });
      // Format actuel de YouTube : lockupViewModel (titre traduit en anglais avec hl=en, durée en badge, âge en libellé accessible)
      const l = o.lockupViewModel;
      if (l?.contentId && l.metadata?.lockupMetadataViewModel) {
        const parts = l.metadata.lockupMetadataViewModel.metadata?.contentMetadataViewModel?.metadataRows?.flatMap(r => r.metadataParts || []) || [];
        let length = null;
        walk(l.contentImage, x => { const t = x.thumbnailBadgeViewModel?.text; if (!length && /^\d+(:\d\d)+$/.test(t || "")) length = t; });
        vids.push({ id: l.contentId, title: l.metadata.lockupMetadataViewModel.title?.content, length, age: ageMonths(parts.find(p => /ago/.test(p.accessibilityLabel || ""))?.accessibilityLabel), views: parts[0]?.text?.content || null });
      }
      // Jeton de la page suivante : le premier rencontré est celui de la grille de vidéos (les suivants viennent des autres onglets)
      if (o.continuationItemRenderer && !token) token = o.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token || null;
    });
    return token;
  };
  let token = collect(first.data);
  for (let i = 0; token && i < maxPages; i++) {
    if (vids.length && (vids.at(-1).age ?? 0) > maxMonths) break;
    const r = await fetch(`https://www.youtube.com/youtubei/v1/browse?prettyPrint=false`, { method: "POST", headers: { ...HEAD, "Content-Type": "application/json" }, body: JSON.stringify({ context: first.ctx, continuation: token }), signal: AbortSignal.timeout(30000) }).then(r => r.json()).catch(() => null);
    if (!r) break;
    token = collect(r);
    await wait(300);
  }
  return { channelId, name, subscribers: subs, videos: vids };
}

// Coût estimé par vidéo (Gemini 3.8 Flash, tarif standard jusqu'au 31/12/2026) : lecture à 90 tokens/s + ~8 000 tokens produits, puis analyse (~8 000 en entrée, ~4 000 en sortie)
const PRICE = { in2026: 0.75, out2026: 3.75, in2027: 1.5, out2027: 7.5 };
export const costOf = (min, year = 2026) => { const inp = min * 60 * 90 + 8000, out = 12000; return (inp * PRICE[`in${year}`] + out * PRICE[`out${year}`]) / 1e6; };

export function summarize(cat, months = 24) {
  const recent = cat.videos.filter(v => v.age != null && v.age <= months);
  const teach = recent.filter(v => TEACH.test(v.title) && !DROP.test(v.title) && (minutes(v.length) ?? 0) >= 3);
  const mins = teach.reduce((a, v) => a + (minutes(v.length) || 0), 0);
  const perMonth = teach.length / months;
  return { channelId: cat.channelId, name: cat.name, subscribers: cat.subscribers, scanned: cat.videos.length, recent: recent.length, teaching: teach.length, teachingHours: Math.round(mins / 6) / 10,
    avgMinutes: teach.length ? Math.round(mins / teach.length) : 0, perMonth: Math.round(perMonth * 10) / 10,
    cost2026: Math.round(teach.reduce((a, v) => a + costOf(minutes(v.length)), 0) * 100) / 100,
    sample: teach.slice(0, 5).map(v => `${v.title} (${v.length})`),
    // Liste complète (pour la sélection et la mise en file de lecture)
    list: teach.map(v => ({ id: v.id, title: v.title, min: Math.round((minutes(v.length) || 0) * 10) / 10, age: Math.round(v.age), views: v.views })) };
}

if (process.argv[1]?.endsWith("inventory.mjs")) {
  const [cmd, ...ids] = process.argv.slice(2);
  const inv = JSON.parse(await readFile(OUT, "utf8").catch(() => "{}"));
  if (cmd === "chercher") {
    inv.candidates = await searchChannels(ids.length ? ids : undefined, inv.candidates || []);
    console.log(`${inv.candidates.length} chaînes candidates`);
  } else if (cmd === "catalogue") {
    inv.channels ||= {};
    for (const id of ids) {
      try { const cat = await catalogue(id); inv.channels[id] = summarize(cat); console.log(`${inv.channels[id].name} : ${inv.channels[id].teaching} vidéos pédagogiques sur 24 mois (${inv.channels[id].teachingHours} h), ${inv.channels[id].cost2026} $`); }
      catch (e) { console.error(`${id} : ${e.message}`); }
    }
  }
  inv.at = new Date().toISOString();
  await writeFile(OUT, JSON.stringify(inv, null, 1));
}
