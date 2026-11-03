// Service en ligne du coach (Cloudflare Workers, offre gratuite) : même code que le serveur local (coach/coach-api.mjs).
// La clé Riot est un secret du Worker (npx wrangler secret put RIOT_API_KEY), jamais dans le dépôt ni dans la page.
// Les données privées (repères Diamant+, builds, statistiques et repères par champion) sont lues dans le bucket privé
// « coach-data » de Supabase Storage (worker/data.mjs, envoyées par worker/put-data.mjs) : le Worker se déploie sans elles.

import { coachApi } from "../coach/coach-api.mjs";
import { createDataLoader } from "./data.mjs";
import { createV1Worker, isTester, autoSync } from "./v1.mjs";
import { pushApi, pushLive, pushCoach } from "./push.mjs";

// Coach V1 (/api/v1) : jeton Supabase, stockage Supabase, quotas ; voir worker/v1.mjs
let loader = null;
const dataOf = env => (loader ||= createDataLoader({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_KEY, log: m => console.log(JSON.stringify({ data: m })) }));
// Repères par champion (fiche champion du coach V1) : même statut que les autres données privées, test privé seulement
const v1 = createV1Worker({ champRefs: env => dataOf(env).get().then(d => d.champrefs) });
// Test privé (clé Riot personnelle) : l'ancien coach n'est servi qu'aux volontaires inscrits, sans les repères Diamant+
// relevés avec la clé de développement (benchmarks, champstats, builds), qui restent privés jusqu'à la clé de production.
const PUBLIC = env => env.COACH_ACCESS === "public";

const ORIGINS = ["https://anthonyloquet96-source.github.io", "http://localhost:3000"];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/v1/")) return v1(request, env, ctx);
    const origin = request.headers.get("Origin") || "";
    // Notifications (ouvertes à tous les visiteurs, sans compte) : voir worker/push.mjs
    if (url.pathname.startsWith("/api/push/")) {
      const pc = { "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0], "Access-Control-Allow-Methods": "GET, POST", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
      if (request.method === "OPTIONS") return new Response(null, { headers: pc });
      return pushApi(request, env, pc).catch(() => new Response(JSON.stringify({ error: "service indisponible" }), { status: 503, headers: { ...pc, "Content-Type": "application/json" } }));
    }
    const cors = { "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0], "Access-Control-Allow-Methods": "GET", "Access-Control-Allow-Headers": "Authorization", Vary: "Origin" };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "GET" || !url.pathname.startsWith("/api/coach/")) return new Response("Introuvable", { status: 404, headers: cors });
    const open = PUBLIC(env);
    if (!open && !(await isTester(request, env))) return new Response(JSON.stringify({ error: "Le coach est en test privé, sur invitation." }), { status: 403, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
    const D = await dataOf(env).get();
    const r = await coachApi(url.pathname, url.searchParams, { key: env.RIOT_API_KEY, benchmarks: open ? D.benchmarks : null, champstats: open ? D.champstats : null, builds: open ? D.builds : null, visitor: request.headers.get("CF-Connecting-IP") || "?" });
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": r.status === 200 ? "private, max-age=60" : "no-store" } });
  },
  // Déclencheurs (wrangler.toml) : chaque minute, les matchs en direct ; à 17 h UTC, les rappels du coach ; chaque heure (à 23),
  // la synchronisation automatique d'un joueur qui suit un objectif
  async scheduled(event, env, ctx) {
    if (event.cron === "23 * * * *") return void ctx.waitUntil(autoSync(env).catch(e => console.log(JSON.stringify({ autosync: e.code || "erreur" }))));
    ctx.waitUntil(event.cron === "0 17 * * *" ? pushCoach(env) : pushLive(env));
  },
};
