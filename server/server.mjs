// Serveur MINDIFF : sert l'application, expose l'API, et relance la collecte toutes les 30 min.
// Lancement : npm start   (puis http://localhost:3000)
// Accès depuis un téléphone sur le même Wi-Fi : définir HOST=0.0.0.0 dans .env

import http from "node:http";
import os from "node:os";
import { readFile, appendFile, stat } from "node:fs/promises";

// Matchups Diamant+ (plusieurs Mo) : relus seulement quand le fichier change
let muCache = { mtime: 0, data: null };
async function matchupsCached() {
  const f = new URL("../coach/cache/matchups.json", import.meta.url);
  const st = await stat(f).catch(() => null);
  if (!st) return null;
  // Fichier en cours d'écriture par la collecte : on garde la version précédente
  if (st.mtimeMs !== muCache.mtime) try { muCache = { mtime: st.mtimeMs, data: JSON.parse(await readFile(f, "utf8")) }; } catch { /* version précédente */ }
  return muCache.data;
}
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname, sep } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
try { process.loadEnvFile(join(ROOT, ".env")); } catch { /* .env facultatif */ }

const { runCollection } = await import("../collector/collect.mjs");

// Mode démo (MINDIFF_DEMO=1) : joueur et parties fictifs à la place de l'API Riot (coach/demo.mjs), stockage en mémoire,
// aucune collecte d'actualités. Pour filmer le coach sans clé ni vrai joueur.
const DEMO = process.env.MINDIFF_DEMO === "1" ? (await import("../coach/demo.mjs")).createDemo() : null;
if (DEMO) { const realFetch = globalThis.fetch; globalThis.fetch = (u, o) => DEMO.fetch(u, o, realFetch); }
const riotKey = () => (DEMO ? "DEMO" : process.env.RIOT_API_KEY?.trim());

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const INTERVAL_MIN = Number(process.env.COLLECT_INTERVAL_MIN || 30);
const LOG_FILE = join(ROOT, "collector", "collect.log");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json",
};
// Seuls ces fichiers sont servis : jamais le collecteur, le cache, node_modules ou .env.
const PUBLIC = [/^(index|admin|confidentialite)\.html$/, /^(i18n|app|coach|coach-select|coach2|admin)\.js$/, /^story\.mjs$/, /^style\.css$/, /^manifest\.webmanifest$/, /^(icon|logo)\.svg$/, /^(icon-\d+|icon-maskable-512|apple-touch-icon|coach-apercu-[a-z-]+)\.png$/, /^data\/[\w-]+\.(js|json)$/];

// Coach V1 : créé une fois (stockage, client Riot avec la clé du .env, file de synchronisation)
let v1 = null;
async function coachV1() {
  if (v1) return v1;
  const { createStore } = await import("../coach/v1/store.mjs");
  const { createRiotV1 } = await import("../coach/v1/riot.mjs");
  const { handleV1, createQueue, syncWorker } = await import("../coach/v1/api.mjs");
  const key = process.env.RIOT_API_KEY?.trim();
  // Démo : sans les repères Diamant+ (calculés avec la clé de développement, pas encore autorisés par Riot)
  const refs = DEMO ? null : await readFile(join(ROOT, "coach", "cache", "metric-references.json"), "utf8").then(j => JSON.parse(j).references).catch(() => null);
  const ctx = { store: DEMO ? createStore() : createStore({ file: join(ROOT, "coach", "cache", "v1", "store.json"), rawDir: join(ROOT, "coach", "cache", "v1", "raw") }), riot: key ? createRiotV1(key) : null, references: refs };
  ctx.queue = createQueue(syncWorker(ctx));
  // Tuteur (COACH-010) : offre gratuite de Gemini, réponse JSON courte ; conseils sourcés de la base publiée
  const { chatHandler } = await import("../coach/v1/tutor.mjs");
  const { gemini, hasGeminiKey } = await import("../coach/gemini.mjs");
  const cfg = JSON.parse(await readFile(join(ROOT, "coach", "config.json"), "utf8"));
  const units = await readFile(join(ROOT, "data", "coach.json"), "utf8").then(j => JSON.parse(j).units).catch(() => []);
  // Désactivé par défaut (coach/config.json, tutor) : aucune donnée de joueur envoyée au modèle sans offre payante et DPA
  const tcfg = cfg.tutor || { llm: "off" };
  ctx.chat = chatHandler({ units, config: tcfg, ask: tcfg.llm === "on" && tcfg.personalData === true && hasGeminiKey() ? async (system, user, schema) => (await gemini({ models: cfg.analysis.geminiModels, system, parts: [{ text: user }], schema, maxOutputTokens: 1200, timeoutMs: 60000 })).json : null });
  v1 = { ...ctx, handle: q => handleV1(q, ctx) };
  return v1;
}

let latest = null;
let running = false;
let lastRun = null;
let nextRun = null;
const clients = new Set();

function broadcast(event, data) {
  for (const res of clients) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
const statusPayload = () => ({ running, lastRun, nextRun, intervalMin: INTERVAL_MIN, analysis: latest ? JSON.parse(latest).analysis : null });

async function collect(reason) {
  if (running) return;
  running = true;
  broadcast("status", statusPayload());
  const lines = [];
  const t0 = Date.now();
  try {
    const out = await runCollection({ log: l => { lines.push(l); console.log(l); } });
    latest = JSON.stringify(out);
    lastRun = { at: new Date().toISOString(), ok: true, reason, ms: Date.now() - t0 };
    broadcast("update", { generatedAt: out.generatedAt });
  } catch (e) {
    lastRun = { at: new Date().toISOString(), ok: false, reason, error: e.message };
    lines.push(`[${new Date().toLocaleString("fr-FR")}] ÉCHEC de la collecte : ${e.stack || e.message}`);
    console.error(e);
  } finally {
    running = false;
    nextRun = new Date(Date.now() + INTERVAL_MIN * 60000).toISOString();
    broadcast("status", statusPayload());
    await appendFile(LOG_FILE, lines.join("\n") + "\n").catch(() => {});
  }
}

const isLocal = req => ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
const send = (res, code, body, type = "application/json; charset=utf-8") => {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-cache" });
  res.end(body);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = decodeURIComponent(url.pathname);

  if (path === "/api/data" && req.method === "GET") {
    if (!latest) latest = await readFile(join(ROOT, "data", "auto.json"), "utf8").catch(() => null);
    return latest ? send(res, 200, latest) : send(res, 503, JSON.stringify({ error: "Première collecte en cours" }));
  }
  if (path === "/api/status" && req.method === "GET") return send(res, 200, JSON.stringify(statusPayload()));
  // Coach V1 (COACH-004/005) : routes métier, stockage fichier local (même contrat que Supabase), file de synchronisation
  if (path.startsWith("/api/v1/")) {
    const ctx = await coachV1();
    let body = null;
    if (req.method === "POST") { let raw = ""; for await (const c of req) { raw += c; if (raw.length > 20000) break; } try { body = raw ? JSON.parse(raw) : null; } catch { return send(res, 400, JSON.stringify({ error: { code: "json-invalide", message: "Corps JSON invalide." } })); } }
    const r = await ctx.handle({ method: req.method, path, query: Object.fromEntries(url.searchParams), body });
    return send(res, r.status, r.body == null ? "" : JSON.stringify(r.body));
  }
  if (path === "/api/stream" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write(`event: status\ndata: ${JSON.stringify(statusPayload())}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(": ping\n\n"), 25000);
    req.on("close", () => { clearInterval(ping); clients.delete(res); });
    return;
  }
  if (path === "/api/collect" && req.method === "POST") {
    if (DEMO) return send(res, 403, JSON.stringify({ error: "Pas de collecte en mode démo" }));
    if (!isLocal(req)) return send(res, 403, JSON.stringify({ error: "Réservé à l'ordinateur qui héberge le serveur" }));
    if (running) return send(res, 409, JSON.stringify({ error: "Collecte déjà en cours" }));
    collect("manuelle");
    return send(res, 202, JSON.stringify({ ok: true }));
  }
  // Démo : une nouvelle ranked fictive « jouée maintenant »
  if (DEMO && path === "/api/demo/play" && req.method === "POST" && isLocal(req)) return send(res, 200, JSON.stringify({ match_id: DEMO.play() }));
  if (path.startsWith("/api/coach/") && req.method === "GET") {
    const { coachApi } = await import("../coach/coach-api.mjs");
    const cached = name => (DEMO ? Promise.resolve(null) : readFile(join(ROOT, "coach", "cache", name), "utf8").then(JSON.parse).catch(() => null));
    const [benchmarks, champstats, matchups, builds, situations, styles] = await Promise.all([cached("benchmarks.json"), cached("champstats.json"), matchupsCached(), cached("builds.json"), cached("situations.json"), cached("styles.json")]);
    const r = await coachApi(path, url.searchParams, { key: riotKey(), benchmarks, champstats, matchups, builds, situations, styles, visitor: req.socket.remoteAddress });
    return send(res, r.status, JSON.stringify(r.body));
  }
  if (req.method !== "GET") return send(res, 405, "{}");

  // Fichiers statiques (liste blanche)
  const rel = normalize(path === "/" ? "index.html" : path.slice(1)).split(sep).join("/");
  if (!PUBLIC.some(re => re.test(rel))) return send(res, 404, "Introuvable", "text/plain; charset=utf-8");
  try {
    send(res, 200, await readFile(join(ROOT, rel)), TYPES[extname(rel)] || "application/octet-stream");
  } catch {
    send(res, 404, "Introuvable", "text/plain; charset=utf-8");
  }
});

server.listen(PORT, HOST, async () => {
  console.log(`MINDIFF : http://localhost:${PORT}`);
  if (HOST === "0.0.0.0") {
    for (const ifs of Object.values(os.networkInterfaces())) for (const i of ifs || []) {
      if (i.family === "IPv4" && !i.internal) console.log(`  Sur le téléphone (même Wi-Fi) : http://${i.address}:${PORT}`);
    }
  }
  console.log(process.env.ANTHROPIC_API_KEY ? "Analyse Claude : activée" : "Analyse Claude : désactivée (ajoutez ANTHROPIC_API_KEY dans .env)");
  if (DEMO) { console.log(`Mode démo : joueur fictif ${DEMO.riotId}, aucune requête Riot, aucune collecte.`); latest = await readFile(join(ROOT, "data", "auto.json"), "utf8").catch(() => null); return; }

  // Collecte au démarrage si la dernière date de plus de l'intervalle, puis toutes les 30 min
  const prev = await readFile(join(ROOT, "data", "auto.json"), "utf8").catch(() => null);
  if (prev) latest = prev;
  const age = prev ? (Date.now() - new Date(JSON.parse(prev).generatedAt)) / 60000 : Infinity;
  if (age >= INTERVAL_MIN) collect("démarrage");
  else nextRun = new Date(Date.now() + (INTERVAL_MIN - age) * 60000).toISOString();
  const firstDelay = (age >= INTERVAL_MIN ? INTERVAL_MIN : INTERVAL_MIN - age) * 60000;
  setTimeout(function loop() { collect("planifiée"); setTimeout(loop, INTERVAL_MIN * 60000); }, firstDelay);
});
