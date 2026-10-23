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

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const INTERVAL_MIN = Number(process.env.COLLECT_INTERVAL_MIN || 30);
const LOG_FILE = join(ROOT, "collector", "collect.log");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json",
};
// Seuls ces fichiers sont servis : jamais le collecteur, le cache, node_modules ou .env.
const PUBLIC = [/^(index|admin|confidentialite)\.html$/, /^(app|coach|coach-select|coach2|admin)\.js$/, /^style\.css$/, /^manifest\.webmanifest$/, /^(icon|logo)\.svg$/, /^(icon-\d+|icon-maskable-512|apple-touch-icon)\.png$/, /^data\/[\w-]+\.(js|json)$/];

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
  if (path === "/api/stream" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write(`event: status\ndata: ${JSON.stringify(statusPayload())}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(": ping\n\n"), 25000);
    req.on("close", () => { clearInterval(ping); clients.delete(res); });
    return;
  }
  if (path === "/api/collect" && req.method === "POST") {
    if (!isLocal(req)) return send(res, 403, JSON.stringify({ error: "Réservé à l'ordinateur qui héberge le serveur" }));
    if (running) return send(res, 409, JSON.stringify({ error: "Collecte déjà en cours" }));
    collect("manuelle");
    return send(res, 202, JSON.stringify({ ok: true }));
  }
  if (path.startsWith("/api/coach/") && req.method === "GET") {
    const { coachApi } = await import("../coach/coach-api.mjs");
    const cached = name => readFile(join(ROOT, "coach", "cache", name), "utf8").then(JSON.parse).catch(() => null);
    const [benchmarks, champstats, matchups, builds] = await Promise.all([cached("benchmarks.json"), cached("champstats.json"), matchupsCached(), cached("builds.json")]);
    const r = await coachApi(path, url.searchParams, { key: process.env.RIOT_API_KEY?.trim(), benchmarks, champstats, matchups, builds, visitor: req.socket.remoteAddress });
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

  // Collecte au démarrage si la dernière date de plus de l'intervalle, puis toutes les 30 min
  const prev = await readFile(join(ROOT, "data", "auto.json"), "utf8").catch(() => null);
  if (prev) latest = prev;
  const age = prev ? (Date.now() - new Date(JSON.parse(prev).generatedAt)) / 60000 : Infinity;
  if (age >= INTERVAL_MIN) collect("démarrage");
  else nextRun = new Date(Date.now() + (INTERVAL_MIN - age) * 60000).toISOString();
  const firstDelay = (age >= INTERVAL_MIN ? INTERVAL_MIN : INTERVAL_MIN - age) * 60000;
  setTimeout(function loop() { collect("planifiée"); setTimeout(loop, INTERVAL_MIN * 60000); }, firstDelay);
});
