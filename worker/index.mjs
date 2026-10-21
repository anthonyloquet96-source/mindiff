// Service en ligne du coach (Cloudflare Workers, offre gratuite) : même code que le serveur local (coach/coach-api.mjs).
// La clé Riot est un secret du Worker (npx wrangler secret put RIOT_API_KEY), jamais dans le dépôt ni dans la page.
// La référence Diamant+ (benchmarks.json) est copiée ici au déploiement : voir worker/README.md.

import { coachApi } from "../coach/coach-api.mjs";
import benchmarks from "./benchmarks.json";

const ORIGINS = ["https://anthonyloquet96-source.github.io", "http://localhost:3000"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = { "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0], "Access-Control-Allow-Methods": "GET", Vary: "Origin" };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "GET" || !url.pathname.startsWith("/api/coach/")) return new Response("Introuvable", { status: 404, headers: cors });
    const r = await coachApi(url.pathname, url.searchParams, { key: env.RIOT_API_KEY, benchmarks, visitor: request.headers.get("CF-Connecting-IP") || "?" });
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": r.status === 200 ? "private, max-age=60" : "no-store" } });
  },
};
