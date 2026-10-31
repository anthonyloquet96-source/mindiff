// Notifications site fermé (Web Push) : abonnements (/api/push/*) et surveillance des matchs (déclencheur planifié).
//   - Chaque minute, un passage d'environ 50 s qui relit les matchs suivis toutes les 10 s (getLive, notif-events.mjs) :
//     notification 30 à 40 s après l'action (le flux n'accepte pas d'image plus récente), à peu près le décalage de la diffusion.
//     Un match qui quitte le direct est relu chaque minute pendant 20 min au plus, jusqu'à pouvoir annoncer le vainqueur ;
//     s'il revient entre-temps (coupure du flux), son état est gardé : pas de « Le match commence » en double.
//   - Chaque jour à 17 h UTC : rappel du coach, au plus tous les 2 jours, à partir du résumé d'objectif envoyé par l'appareil.
// Stockage : tables push_subs et push_live (supabase/migrations/20261029000000_push.sql), clé de service.
// Secrets : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (worker/vapid-keys.mjs), SUPABASE_URL, SUPABASE_SERVICE_KEY.
// Limite de l'offre gratuite : 50 appels sortants par passage ; suffisant pour le test (quelques dizaines d'appareils).

import { createSupabaseRest } from "../coach/v1/store-supabase.mjs";
import { gameSnapshot, gameEvents, matchState, matchEvents, followed, detailed, coachMessage, goalDone } from "../notif-events.mjs";
import { sendPush } from "./webpush.mjs";

const LOLE_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z"; // clé publique du site LoL Esports (déjà utilisée par le site)
// Délai maximal de 8 s par appel : un passage ne doit pas déborder sur le suivant
const LOLE = path => fetch(`https://esports-api.lolesports.com/persisted/gw/${path}`, { headers: { "x-api-key": LOLE_KEY }, signal: AbortSignal.timeout(8000) }).then(r => (r.ok ? r.json() : null)).catch(() => null);
const SITE = "https://anthonyloquet96-source.github.io/mindiff/";
// Services de push des navigateurs : on n'envoie rien ailleurs
const PUSH_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)\//i;
const vapid = env => ({ publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: SITE });
const hits = new Map();
const hit = (k, max, ms) => { const now = Date.now(), list = (hits.get(k) || []).filter(t => now - t < ms); if (list.length >= max) return false; list.push(now); hits.set(k, list); return true; };

// --- Routes appelées par le site
export async function pushApi(request, env, cors) {
  const url = new URL(request.url), json = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
  if (url.pathname === "/api/push/key" && request.method === "GET") return json(env.VAPID_PUBLIC_KEY ? 200 : 503, { key: env.VAPID_PUBLIC_KEY || null });
  if (request.method !== "POST") return json(404, { error: "introuvable" });
  if (!hit(`ip:${request.headers.get("CF-Connecting-IP") || "?"}`, 30, 3600e3)) return json(429, { error: "trop de demandes" });
  const b = await request.json().catch(() => null), sub = b?.sub;
  if (!sub?.endpoint || !PUSH_HOSTS.test(sub.endpoint) || sub.endpoint.length > 1000) return json(400, { error: "abonnement invalide" });
  const sb = createSupabaseRest({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_KEY });
  const key = `push_subs?endpoint=eq.${encodeURIComponent(sub.endpoint)}`;
  if (url.pathname === "/api/push/unsubscribe") { await sb.rest("DELETE", key); return json(200, { ok: true }); }
  if (url.pathname === "/api/push/subscribe") {
    if (!sub.keys?.p256dh || !sub.keys?.auth) return json(400, { error: "clés manquantes" });
    const g = b.goal && typeof b.goal === "object" ? b.goal : null;
    const row = {
      endpoint: sub.endpoint, p256dh: String(sub.keys.p256dh).slice(0, 200), auth: String(sub.keys.auth).slice(0, 100),
      matches: ["big", "fav", "off"].includes(b.matches) ? b.matches : "big",
      fav_teams: (Array.isArray(b.fav) ? b.fav : []).slice(0, 30).map(x => String(x).slice(0, 60)),
      detail: b.detail === "detaille" ? "detaille" : "essentiel",
      coach: b.coach !== false, lang: b.lang === "en" ? "en" : "fr", seen_at: new Date().toISOString(),
      // Résumé de l'objectif seulement : pas d'identifiant Riot
      goal: g ? { label: String(g.label || "").slice(0, 120), role: String(g.role || "").slice(0, 12), target: String(g.target ?? "").slice(0, 20), unit: String(g.unit || "").slice(0, 12), status: String(g.status || "").slice(0, 12), left: g.of != null && Number.isFinite(Number(g.of)) ? Math.max(0, Math.min(20, Number(g.of) - (Number(g.counted) || 0))) : null } : null,
    };
    await sb.rest("POST", "push_subs", { body: row, prefer: "resolution=merge-duplicates,return=minimal" });
    if (b.test) {
      const s = await sendPush(sub, { title: "MINDIFF", body: row.lang === "en" ? "Notifications are on." : "Les notifications sont activées.", url: SITE }, vapid(env), { ttl: 60 });
      return json(200, { ok: true, test: s });
    }
    return json(200, { ok: true });
  }
  return json(404, { error: "introuvable" });
}

// --- Envoi à une liste d'abonnés ; abonnements expirés supprimés
async function fanout(sb, env, subs, message) {
  let sent = 0;
  for (const s of subs) {
    const st = await sendPush({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, typeof message === "function" ? message(s) : message, vapid(env)).catch(() => 0);
    if (st === 404 || st === 410) await sb.rest("DELETE", `push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`).catch(() => null);
    else if (st >= 200 && st < 300) sent++;
  }
  return sent;
}

// --- Matchs en direct (chaque minute)
export async function pushLive(env) {
  if (!env.VAPID_PRIVATE_KEY || !env.SUPABASE_URL) return { skipped: true };
  const sb = createSupabaseRest({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_KEY });
  const [live, subs, rows] = await Promise.all([
    LOLE("getLive?hl=fr-FR"),
    sb.rest("GET", "push_subs?matches=neq.off&select=endpoint,p256dh,auth,matches,fav_teams,detail,lang&limit=500"),
    sb.rest("GET", "push_live?select=match_id,state,updated_at"),
  ]);
  if (!subs?.length) return { subs: 0 };
  // Flux LoL Esports muet : on ne conclut pas que les matchs suivis sont finis
  if (!live?.data?.schedule) return { subs: subs.length, live: null };
  const events = (live?.data?.schedule?.events || []).filter(e => e.type === "match" && e.match?.id && e.state === "inProgress");
  const saved = Object.fromEntries((rows || []).map(r => [r.match_id, r]));
  // Matchs suivis par au moins un abonné, plus ceux qui viennent de quitter le direct (annonce du vainqueur)
  const todo = events.map(e => ({ id: e.match.id, league: e.league?.slug, names: (e.match.teams || []).map(t => t.name), tournament: e.league?.name }))
    .filter(x => subs.some(s => followed(s.matches, x.league, x.names, s.fav_teams)));
  for (const r of rows || []) if (!todo.some(x => x.id === r.match_id)) todo.push({ id: r.match_id, ...r.state.info, ended: true });
  // Passage d'environ 45 s : chaque match suivi est relu toutes les 10 s (le déclencheur ne tourne qu'une fois par minute).
  // Image la plus récente que le flux accepte (il refuse une fenêtre qui finit moins de 20 s avant l'heure, soit un départ
  // à moins de 30 s) : décalage de 30 s au départ, allongé de 10 s si le flux la refuse, raccourci de 10 s à chaque passage.
  const t0 = Date.now(), W = {};
  let calls = 3, sent = 0;
  const list = todo.slice(0, 3);
  for (let round = 0; ; round++) {
    const roundAt = Date.now();
    for (const x of list) {
      const S = (W[x.id] ||= { prev: saved[x.id]?.state || null, lag: Math.max(30000, (saved[x.id]?.state?.lag || 30000) - 10000) });
      if (S.done || (x.ended && round > 0)) continue;
      // Détails du match (games, victoires) : au premier tour puis toutes les 30 s
      if (!S.m || round % 3 === 0) { const det = await LOLE(`getEventDetails?hl=fr-FR&id=${encodeURIComponent(x.id)}`); calls++; if (det?.data?.event?.match) S.m = det.data.event.match; }
      const m = S.m;
      if (!m) continue;
      const info = { league: x.league, names: x.names, tournament: x.tournament };
      // Match vu pour la première fois à 0-0 en game 1 : on annonce son début
      const first = round === 0 && !saved[x.id] && m.teams.every(t => !t.result?.gameWins) ? { wins: {}, game: null } : null;
      const out = { fr: matchEvents(S.prev?.match || first, m, "fr"), en: matchEvents(S.prev?.match || first, m, "en") };
      const state = { info, match: matchState(m), game: S.prev?.game || null, lag: S.lag };
      const g = m.games?.find(y => y.state === "inProgress");
      if (g) {
        const t = new Date(Date.now() - S.lag); t.setUTCSeconds(Math.floor(t.getUTCSeconds() / 10) * 10, 0);
        const w = await fetch(`https://feed.lolesports.com/livestats/v1/window/${g.id}?startingTime=${t.toISOString()}`, { signal: AbortSignal.timeout(8000) }).then(r => (r.status === 200 ? r.json() : null)).catch(() => null);
        calls++;
        const snap = gameSnapshot(w?.frames);
        if (snap) {
          const before = S.prev?.game?.id === g.id ? S.prev.game.snap : null;
          out.fr.push(...gameEvents(before, snap, w.gameMetadata, m.teams, "fr"));
          out.en.push(...gameEvents(before, snap, w.gameMetadata, m.teams, "en"));
          state.game = { id: g.id, snap };
        } else S.lag = state.lag = Math.min(60000, S.lag + 10000);
      }
      if (out.fr.length) {
        const [A, B] = m.teams, url = `${SITE}#/lol/competitions/matchs`;
        // Niveau « essentiel » : sans les moments marqués detail (chaque tour, combats) ; rien à envoyer → pas de notification
        const body = s => out[s.lang === "en" ? "en" : "fr"].filter(e => !e.detail || detailed(s.detail, info.names, s.fav_teams)).map(e => e.text).join("\n");
        // Limite de 50 appels sortants par passage (offre gratuite) : on garde de quoi enregistrer l'état des matchs,
        // sinon le passage suivant renverrait les mêmes moments. Au-delà, les appareils en trop ne reçoivent pas ce moment.
        const room = Math.max(0, 48 - calls - list.length);
        const who = subs.filter(s => followed(s.matches, info.league, info.names, s.fav_teams) && body(s)).slice(0, room);
        sent += await fanout(sb, env, who, s => ({ title: `${A.code} vs ${B.code}${info.tournament ? ` · ${info.tournament}` : ""}`, body: body(s), url, tag: `m${x.id}-${Date.now()}` }));
        calls += who.length;
      }
      S.prev = state;
      S.done = !!(m.games?.length && m.games.every(y => y.state !== "inProgress" && y.state !== "unstarted") || m.teams.some(t => t.result?.outcome));
    }
    // Arrêt avant le passage suivant (chaque minute) et sous la limite de 50 appels sortants de l'offre gratuite
    if (Date.now() - t0 > 40000 || calls > 36 || list.every(x => W[x.id]?.done || x.ended)) break;
    await new Promise(r => setTimeout(r, Math.max(0, 10000 - (Date.now() - roundAt))));
  }
  for (const x of list) {
    const S = W[x.id];
    if (!S) continue;
    // Hors du direct : gardé 20 min (vainqueur pas encore dans les détails, ou coupure du flux), sans repousser cette limite
    const since = x.ended ? Date.parse(saved[x.id]?.updated_at) || 0 : Date.now();
    if (S.done || Date.now() - since > 20 * 60e3) await sb.rest("DELETE", `push_live?match_id=eq.${encodeURIComponent(x.id)}`);
    else if (S.prev) await sb.rest("POST", "push_live", { body: { match_id: x.id, state: S.prev, updated_at: new Date(since).toISOString() }, prefer: "resolution=merge-duplicates,return=minimal" });
  }
  return { subs: subs.length, matches: todo.length, sent };
}

// --- Rappels du coach (une fois par jour au plus, et tous les 2 jours au plus par appareil)
export async function pushCoach(env, now = Date.now()) {
  if (!env.VAPID_PRIVATE_KEY || !env.SUPABASE_URL) return { skipped: true };
  const sb = createSupabaseRest({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_KEY });
  const before = new Date(now - 2 * 864e5 + 3600e3).toISOString();
  // Appareils vus dans les 14 derniers jours : pas de rappel à quelqu'un qui n'utilise plus le site
  const subs = await sb.rest("GET", `push_subs?coach=eq.true&seen_at=gt.${new Date(now - 14 * 864e5).toISOString()}&or=(coach_at.is.null,coach_at.lt.${before})&select=endpoint,p256dh,auth,goal,lang&limit=40`);
  if (!subs?.length) return { sent: 0 };
  const day = Math.floor(now / 864e5);
  const who = subs.filter(s => coachMessage(s.goal, day, s.lang));
  const sent = await fanout(sb, env, who, s => ({ title: "MINDIFF · Coach", body: coachMessage(s.goal, day, s.lang), url: `${SITE}#/lol/coach`, tag: "coach" }));
  if (who.length) await sb.rest("PATCH", `push_subs?endpoint=in.(${who.map(s => `"${encodeURIComponent(s.endpoint)}"`).join(",")})`, { body: { coach_at: new Date(now).toISOString() }, prefer: "return=minimal" }).catch(() => null);
  // Objectif fini : annoncé une seule fois ; le site renverra le nouvel objectif à la prochaine visite
  for (const s of who.filter(s => goalDone(s.goal)))
    await sb.rest("PATCH", `push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { body: { goal: { ...s.goal, status: "notified" } }, prefer: "return=minimal" }).catch(() => null);
  return { sent };
}
