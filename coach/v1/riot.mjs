// Client Riot du coach V1 (COACH-004) : construit lui-même les URL (liste blanche de régions et de routes),
// respecte les limites annoncées par Riot (X-App-Rate-Limit, X-Method-Rate-Limit et leurs compteurs), applique
// Retry-After sur 429 avec une file bornée, recule exponentiellement sur 5xx, et regroupe les requêtes identiques en vol.
// Ce n'est pas un proxy : aucune URL ne vient de l'appelant. La clé ne sort jamais d'ici.

export const PLATFORMS = { euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe", na1: "americas", br1: "americas", la1: "americas", la2: "americas", kr: "asia", jp1: "asia", oc1: "sea" };

// Routes autorisées : nom → [hôte « plateforme » ou « région », chemin]
const ROUTES = {
  account: (region, { gameName, tagLine }) => [`https://${region}.api.riotgames.com`, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`, "account-by-riot-id"],
  matchIds: (region, { puuid, count = 30, start = 0 }) => [`https://${region}.api.riotgames.com`, `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?queue=420&start=${Number(start) | 0}&count=${Math.min(100, Math.max(1, Number(count) | 0))}`, "match-ids"],
  match: (region, { matchId }) => [`https://${region}.api.riotgames.com`, `/lol/match/v5/matches/${encodeURIComponent(matchId)}`, "match"],
  timeline: (region, { matchId }) => [`https://${region}.api.riotgames.com`, `/lol/match/v5/matches/${encodeURIComponent(matchId)}/timeline`, "timeline"],
  league: (platform, { puuid }) => [`https://${platform}.api.riotgames.com`, `/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`, "league"],
};
const PLATFORM_ROUTES = new Set(["league"]);

// « 20:1,100:120 » → [{ limit: 20, windowMs: 1000 }, …]
export function parseLimits(h) {
  return String(h || "").split(",").map(x => x.trim().split(":").map(Number)).filter(([a, b]) => a > 0 && b > 0).map(([limit, s]) => ({ limit, windowMs: s * 1000 }));
}

export function createRiotV1(key, { fetchImpl = fetch, now = () => Date.now(), sleep = ms => new Promise(r => setTimeout(r, ms)), maxRetries = 4, maxWaitMs = 120000 } = {}) {
  if (!key) throw Object.assign(new Error("Clé Riot absente côté serveur."), { code: "riot-non-configure", status: 503 });
  // Fenêtres glissantes par seau : « app:<hôte> » et « method:<hôte>:<route> » ; limites apprises des en-têtes
  const buckets = new Map(); // nom → { limits, hits: [t], cooldownUntil }
  const inFlight = new Map();
  const bucket = name => { if (!buckets.has(name)) buckets.set(name, { limits: [], hits: [], cooldownUntil: 0 }); return buckets.get(name); };
  const waitFor = b => {
    const t = now();
    let wait = Math.max(0, b.cooldownUntil - t);
    for (const { limit, windowMs } of b.limits) {
      const recent = b.hits.filter(h => t - h < windowMs);
      if (recent.length >= limit) wait = Math.max(wait, windowMs - (t - recent[recent.length - limit]));
    }
    return wait;
  };
  async function call(name, params) {
    const route = ROUTES[name];
    if (!route) throw Object.assign(new Error(`Route Riot inconnue : ${name}`), { code: "route-interdite", status: 400 });
    const platform = String(params.platform || "").toLowerCase();
    if (!PLATFORMS[platform]) throw Object.assign(new Error("Région inconnue."), { code: "region-invalide", status: 400 });
    const [host, path, method] = route(PLATFORM_ROUTES.has(name) ? platform : PLATFORMS[platform], params);
    const url = host + path;
    if (inFlight.has(url)) return inFlight.get(url);
    const p = run(url, host, method).finally(() => inFlight.delete(url));
    inFlight.set(url, p);
    return p;
  }
  async function run(url, host, method) {
    const app = bucket(`app:${host}`), meth = bucket(`method:${host}:${method}`);
    for (let attempt = 0; ; attempt++) {
      const wait = Math.max(waitFor(app), waitFor(meth));
      if (wait > maxWaitMs) throw Object.assign(new Error("Limite Riot atteinte : réessaie plus tard."), { code: "riot-limite", status: 429, retryAfterMs: wait });
      if (wait) await sleep(wait);
      const t = now();
      app.hits.push(t); meth.hits.push(t);
      if (app.hits.length > 1000) app.hits.splice(0, 500);
      if (meth.hits.length > 1000) meth.hits.splice(0, 500);
      const r = await fetchImpl(url, { headers: { "X-Riot-Token": key } });
      const h = name => r.headers?.get?.(name);
      if (h("x-app-rate-limit")) app.limits = parseLimits(h("x-app-rate-limit"));
      if (h("x-method-rate-limit")) meth.limits = parseLimits(h("x-method-rate-limit"));
      if (r.ok) return r.json();
      if (r.status === 429) {
        const retry = (Number(h("retry-after")) || 1) * 1000;
        // Seau responsable : application, méthode ou service (dans ce dernier cas, seulement cette méthode)
        const type = h("x-rate-limit-type");
        (type === "application" ? app : meth).cooldownUntil = now() + retry;
        if (attempt >= maxRetries) throw Object.assign(new Error("Limite Riot atteinte : réessaie plus tard."), { code: "riot-limite", status: 429, retryAfterMs: retry });
        continue;
      }
      if (r.status >= 500 && attempt < maxRetries) { await sleep(Math.min(30000, 500 * 2 ** attempt)); continue; }
      const code = r.status === 404 ? "introuvable" : r.status === 401 || r.status === 403 ? "riot-cle-refusee" : r.status >= 500 ? "riot-indisponible" : "riot-erreur";
      throw Object.assign(new Error(code === "introuvable" ? "Introuvable chez Riot." : code === "riot-cle-refusee" ? "Clé Riot refusée ou expirée." : `Riot a répondu ${r.status}.`), { code, status: r.status === 404 ? 404 : 502 });
    }
  }
  return { call, _buckets: buckets };
}
