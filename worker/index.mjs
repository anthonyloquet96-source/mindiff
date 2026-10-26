// Service en ligne du coach (Cloudflare Workers, offre gratuite) : même code que le serveur local (coach/coach-api.mjs).
// La clé Riot est un secret du Worker (npx wrangler secret put RIOT_API_KEY), jamais dans le dépôt ni dans la page.
// La référence Diamant+ (benchmarks.json) est copiée ici au déploiement : voir worker/README.md.

import { coachApi } from "../coach/coach-api.mjs";
import benchmarks from "./benchmarks.json";
import champstats from "./champstats.json";
import builds from "./builds.json";
import { createV1Worker, isTester } from "./v1.mjs";

// Coach V1 (/api/v1) : jeton Supabase, stockage Supabase, quotas ; voir worker/v1.mjs
const v1 = createV1Worker();
// Test privé (clé Riot personnelle) : l'ancien coach n'est servi qu'aux volontaires inscrits, sans les repères Diamant+
// relevés avec la clé de développement (benchmarks, champstats, builds), qui restent privés jusqu'à la clé de production.
const PUBLIC = env => env.COACH_ACCESS === "public";

const ORIGINS = ["https://anthonyloquet96-source.github.io", "http://localhost:3000"];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/v1/")) return v1(request, env, ctx);
    const origin = request.headers.get("Origin") || "";
    const cors = { "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0], "Access-Control-Allow-Methods": "GET", "Access-Control-Allow-Headers": "Authorization", Vary: "Origin" };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "GET" || !url.pathname.startsWith("/api/coach/")) return new Response("Introuvable", { status: 404, headers: cors });
    const open = PUBLIC(env);
    if (!open && !(await isTester(request, env))) return new Response(JSON.stringify({ error: "Le coach est en test privé, sur invitation." }), { status: 403, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
    const r = await coachApi(url.pathname, url.searchParams, { key: env.RIOT_API_KEY, benchmarks: open ? benchmarks : null, champstats: open ? champstats : null, builds: open ? builds : null, visitor: request.headers.get("CF-Connecting-IP") || "?" });
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": r.status === 200 ? "private, max-age=60" : "no-store" } });
  },
};
