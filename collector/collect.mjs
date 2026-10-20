// Collecte automatique : récupère les sources du registre, vérifie, fait analyser par Claude,
// et écrit data/auto.json (+ data/auto.js pour l'ouverture sans serveur).
// Lancement seul : npm run collect — le serveur (npm start) l'appelle aussi toutes les 30 min.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SOURCES } from "./sources.mjs";
import { fetchText, fetchJson, nextData, findArrays, parseRss, stripHtml, truncate, steamBullets, hash } from "./lib.mjs";
import { detectGame, detectType, isNoise } from "./classify.mjs";
import { verify } from "./verify.mjs";
import { collectLolEsports } from "./lolesports.mjs";
import { analyzeAll } from "./analyze.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = join(ROOT, "collector", "state.json");
const CACHE_FILE = join(ROOT, "collector", "analysis-cache.json");
const OUT_JS = join(ROOT, "data", "auto.js");
const OUT_JSON = join(ROOT, "data", "auto.json");
const KEEP_DAYS = 30;
const daysAgo = d => (Date.now() - new Date(d)) / 864e5;
const langOf = url => (/\/fr(-fr)?\//i.test(url) ? "fr" : "en");

// ---------- Collecteurs par type de source ----------

async function firstWorking(urls, fn) {
  let err;
  for (const url of urls) {
    try { return await fn(url); } catch (e) { err = e; }
  }
  throw err;
}

const collectors = {
  async riot(src) {
    return firstWorking(src.urls, async url => {
      const data = nextData(await fetchText(url));
      const origin = new URL(url).origin;
      const arrays = findArrays(data, x => x.title && (x.publishedAt || x.analytics?.publishDate));
      if (!arrays.length) throw new Error("aucun article trouvé");
      return arrays.flat().map(a => {
        const link = a.action?.payload?.url || "";
        const full = link.startsWith("/") ? origin + link : link;
        const tags = (a.tags || []).map(t => t.machineName);
        const summary = stripHtml(a.description?.body);
        const type = tags.includes("patch_notes") ? "patch"
          : a.category?.machineName === "esports" ? "esport"
          : detectType(`${a.title} ${summary}`) || "annonce";
        // La langue est celle de la page Riot lue (fr-fr ou en-us), pas celle du lien (souvent YouTube)
        return { url: full, title: a.title, summary, date: a.publishedAt || a.analytics.publishDate, image: a.media?.url || a.imageMedia?.url, type, lang: /\/fr-fr\//.test(url) ? "fr" : "en" };
      });
    });
  },

  async ea(src) {
    return firstWorking(src.urls, async url => {
      const data = nextData(await fetchText(url));
      const items = data.props?.pageProps?.initialNewsData?.items;
      if (!items?.length) throw new Error("aucun article trouvé");
      return items.map(a => ({
        url: `${url.replace(/\/news$/, "")}/news/${a.slug}`,
        title: a.title,
        summary: stripHtml(a.summary),
        date: a.publishingDate,
        image: a.image?.ar16X9 || a.image?.ar2X1 || null,
        type: detectType(`${a.title} ${a.summary}`) || "annonce",
      }));
    });
  },

  async steam(src) {
    const j = await fetchJson(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${src.appid}&count=10&feeds=steam_community_announcements`);
    return j.appnews.newsitems.map(n => {
      const points = steamBullets(n.contents);
      const img = n.contents.match(/\{STEAM_CLAN_IMAGE\}([^\s\[]+)/)?.[1];
      return {
        url: n.url,
        title: n.title,
        summary: truncate(points.length ? `${points.length} changements, dont : ${points[0]}` : stripHtml(n.contents.replace(/\[[^\]]+\]/g, " ")), 220),
        date: new Date(n.date * 1000).toISOString(),
        image: img ? `https://clan.akamai.steamstatic.com/images/${img}` : null,
        points,
        fullText: steamBullets(n.contents, 200).join("\n").slice(0, 20000),
        type: /update|patch|mise à jour/i.test(n.title) ? "patch" : detectType(n.title) || "annonce",
      };
    });
  },

  async fortnite(src, state) {
    const j = await fetchJson("https://fortnite-api.com/v2/news/br?language=fr");
    return (j.data?.motds || []).filter(m => !m.hidden).map(m => {
      const url = `https://www.fortnite.com/news#${m.id}`;
      return {
        url, title: m.title, summary: m.body, image: m.tileImage || m.image, lang: "fr",
        // Pas de date fournie : on garde la date à laquelle on l'a vue pour la première fois, marquée comme estimée.
        date: state.firstSeen[hash(url)] || new Date().toISOString(),
        dateEstimated: true,
        type: detectType(`${m.title} ${m.body}`) || "annonce",
      };
    });
  },

  async rss(src) {
    const items = parseRss(await fetchText(src.url));
    return items.flatMap(i => {
      const text = `${i.title} ${i.categories.join(" ")} ${i.summary}`;
      if (isNoise(text)) return [];
      const game = src.game || detectGame(text);
      // Flux généraliste : on ne garde que ce qui touche clairement au jeu compétitif.
      const type = detectType(`${i.title} ${i.categories.join(" ")}`) || detectType(i.summary) || (src.game ? "annonce" : null);
      if (!game || !type) return [];
      return [{ ...i, game, summary: truncate(i.summary, 260), type }];
    });
  },
};

// ---------- Programme principal ----------

export async function runCollection({ log = console.log } = {}) {
  const now = new Date();
  const state = JSON.parse(await readFile(STATE_FILE, "utf8").catch(() => '{"firstSeen":{},"items":{}}'));
  const health = [];

  for (const src of SOURCES.filter(s => collectors[s.type])) {
    const t0 = Date.now();
    try {
      const items = await collectors[src.type](src, state);
      let added = 0;
      for (const it of items) {
        if (!it.url || !it.title || !it.date || daysAgo(it.date) > KEEP_DAYS) continue;
        const id = hash(it.url);
        state.firstSeen[id] ||= now.toISOString();
        if (!state.items[id]) added++;
        state.items[id] = {
          ...it, id, game: it.game || src.game, source: src.id, sourceName: src.name, kind: src.kind,
          lang: it.lang || langOf(it.url), firstSeen: state.firstSeen[id],
        };
      }
      health.push({ id: src.id, name: src.name, kind: src.kind, ok: true, count: items.length, added, ms: Date.now() - t0 });
    } catch (e) {
      health.push({ id: src.id, name: src.name, kind: src.kind, ok: false, error: e.message, ms: Date.now() - t0 });
    }
  }

  let esport = { tournaments: [], upcoming: [], officialMatches: [] };
  const t0 = Date.now();
  try {
    esport = await collectLolEsports(state);
    for (const t of esport.tournaments) t.asOf = now.toISOString();
    state.lastEsport = { at: now.toISOString(), tournaments: esport.tournaments, upcoming: esport.upcoming };
    health.push({ id: "lolesports", name: "LoL Esports (officiel)", kind: "officiel", ok: true, count: esport.tournaments.length, ms: Date.now() - t0 });
  } catch (e) {
    // Échec : on garde la dernière version valide, avec sa date, plutôt que de vider les tournois
    if (state.lastEsport) {
      esport = { tournaments: state.lastEsport.tournaments.map(t => ({ ...t, stale: true })), upcoming: state.lastEsport.upcoming, officialMatches: [] };
    }
    health.push({ id: "lolesports", name: "LoL Esports (officiel)", kind: "officiel", ok: false, error: e.message, keptFrom: state.lastEsport?.at || null, ms: Date.now() - t0 });
  }

  // Oublie les articles trop anciens
  for (const [id, it] of Object.entries(state.items)) if (daysAgo(it.date) > KEEP_DAYS) delete state.items[id];
  for (const id of Object.keys(state.firstSeen)) if (!state.items[id] && daysAgo(state.firstSeen[id]) > KEEP_DAYS) delete state.firstSeen[id];

  const rawItems = Object.values(state.items);
  const news = verify(rawItems.map(i => ({ ...i })), esport.officialMatches)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 250);

  const ta = Date.now();
  let analysis;
  try {
    analysis = await analyzeAll({ news, rawItems, tournaments: esport.tournaments, cacheFile: CACHE_FILE });
  } catch (e) {
    analysis = { enabled: false, reason: `Erreur d'analyse : ${e.message}`, briefings: {} };
  }
  const { briefings, ...analysisStats } = analysis;

  const output = {
    generatedAt: new Date().toISOString(),
    sources: health,
    analysis: { ...analysisStats, ms: Date.now() - ta },
    briefings,
    news,
    tournaments: esport.tournaments,
    upcoming: esport.upcoming,
  };

  await mkdir(join(ROOT, "data"), { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(output));
  // Petit fichier que l'appli consulte souvent pour savoir s'il y a du nouveau (hébergement statique)
  await writeFile(join(ROOT, "data", "status.json"), JSON.stringify({ generatedAt: output.generatedAt }));
  await writeFile(OUT_JS, `// Généré automatiquement par collector/collect.mjs — ne pas modifier à la main.\nwindow.AUTO = ${JSON.stringify(output)};\n`);
  await writeFile(STATE_FILE, JSON.stringify(state));

  const ok = health.filter(h => h.ok).length;
  log(`[${now.toLocaleString("fr-FR")}] Sources OK : ${ok}/${health.length}`);
  for (const h of health) log(`  ${h.ok ? "✔" : "✘"} ${h.name.padEnd(48)} ${h.ok ? `${h.count} éléments${h.added != null ? ` (${h.added} nouveaux)` : ""}` : h.error}`);
  const byStatus = news.reduce((m, n) => ((m[n.status] = (m[n.status] || 0) + 1), m), {});
  log(`  → ${news.length} sujets : ${JSON.stringify(byStatus)} · ${esport.tournaments.length} tournois`);
  log(analysis.enabled
    ? `  → Claude : ${analysis.calls} analyses, ${analysis.errors} erreurs, ~${analysis.costUsd} $ · ${analysis.pending} sujets en attente`
    : `  → ${analysis.reason}`);
  return output;
}

// Lancé directement : node collector/collect.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCollection().catch(e => { console.error(e); process.exit(1); });
}
