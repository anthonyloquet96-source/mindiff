// Inventaire des vidéos pédagogiques de League of Legends, toutes langues : pour chiffrer la lecture par Gemini avant de payer.
// Lit la page publique « vidéos » des chaînes (première page seulement) ; aucune IA, aucune clé. Résultat privé : coach/cache/inventory.json.
// Le robots.txt de YouTube interdit /results, /youtubei/ et /feeds/videos.xml (vérifié le 31/10/2026) : ni recherche de chaînes, ni pages suivantes.
// Usage :
//   node coach/inventory.mjs catalogue [ids…]   vidéos récentes des chaînes (première page de leur onglet « vidéos »), coût estimé

import { readFile, writeFile } from "node:fs/promises";

// Le robot se présente sous son vrai nom
const UA = "MINDIFF-coach/1.0 (+https://anthonyloquet96-source.github.io/mindiff/)";
const HEAD = { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" };
const OUT = "coach/cache/inventory.json";

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

// ---------- Catalogue d'une chaîne : vidéos de la première page (une trentaine, les plus récentes : titre, durée, âge)
export async function catalogue(channelId) {
  const first = await page(`https://www.youtube.com/channel/${channelId}/videos?hl=en&gl=US`);
  let name = null, subs = null;
  walk(first.data, o => {
    if (o.channelMetadataRenderer && !name) name = o.channelMetadataRenderer.title;
    if (o.pageHeaderViewModel && !subs) subs = JSON.stringify(o.pageHeaderViewModel).match(/"content":"([\d.,KMk]+ subscribers)"/)?.[1] || null;
  });
  const vids = [];
  const collect = d => {
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
    });
  };
  collect(first.data);
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
    console.error("Recherche de chaînes arrêtée : le robots.txt de YouTube interdit /results. Ajouter une chaîne à la main dans coach/sources.json.");
    process.exit(1);
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
