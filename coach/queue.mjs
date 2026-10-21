// File de lecture des vidéos : ordre de lecture par pertinence et qualité, toutes langues (consigne d'Anthony, 21/10).
// Construite depuis l'inventaire des chaînes (coach/inventory.mjs) et les vidéos déjà en attente ; aucune IA.
//   node coach/queue.mjs construire   classe les vidéos, ajoute les chaînes retenues aux sources, écrit coach/kb/queue.json
//   (refill est appelé par coach/video.mjs : les prochaines vidéos de la file entrent au registre au fur et à mesure)
// Le registre (coach/kb/contents.json) est publié dans l'application : on n'y verse que ce qui va être lu bientôt.

import { readFile } from "node:fs/promises";
import { P, readJson, writeJson, today } from "./lib.mjs";
import { triage } from "./discover.mjs";
import { TEACH, DROP } from "./inventory.mjs";

const QUEUE = "coach/kb/queue.json";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36";
const HEAD = { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8", Cookie: "CONSENT=YES+cb; SOCS=CAI" };
// Niveau de référence Diamant+ : contenus pour débutants ou bas niveau écartés (règle FIABILITE)
const LOW = /\b(iron|bronze|silver|gold|plat(inum)?|emerald|low elo|beginners?|newbies?|noobs?|student|viewer|abonn[ée]|élève|eleve|d[ée]butants?|alumno|aluno|principiantes?|iniciantes?|coaching session|sesi[oó]n de coaching|unranked)\b|아이언|브론즈|실버|골드|플래|에메랄드|초보|입문|アイアン|ブロンズ|シルバー|ゴールド|初心者|入門/i;
// Profil haut niveau déclaré par le créateur (description de la chaîne) : non vérifié indépendamment
const HIGH = /challenger|grandmaster|grand ?ma[iî]tre|rank ?1|#1|no\.? ?1|ex[- ]?pro|former pro|pro ?player|joueur pro|LCS|LEC|LCK|LJL|VCS|전프로|챌린저|元プロ|チャレンジャー|最高レート|グランドマスター/i;
const GUIDE = /guide|how to|explained|fundamentals|masterclass|matchup|wave|jungle path|macro|tempo|trading|comment (jouer|carry)|gu[ií]a|como jogar|공략|강의|강좌|가이드|解説|講座|立ち回り|rehber|poradnik/i;
const ROLE_KW = [["top", /\btop(lane|laner)?\b|탑|トップ/i], ["jungle", /jungl|정글|ジャングル|\bjg\b/i], ["mid", /\bmid(lane|laner)?\b|미드|ミッド/i], ["bottom", /\badc\b|\bbot ?lane\b|marksman|원딜|ボット/i], ["support", /support|서폿|サポート|\bsup\b/i]];
const num = v => { const m = String(v || "").match(/([\d.]+)\s*([KM]?)/); return m ? +m[1] * (m[2] === "M" ? 1e6 : m[2] === "K" ? 1e3 : 1) : 0; };
const LANG = { en: "en", fr: "fr", es: "es", pt: "pt", de: "de", ko: "ko", ja: "ja", vi: "vi", pl: "pl", tr: "tr" };

// Identifiant lisible tiré du nom de la chaîne (repli sur l'identifiant YouTube pour les noms non latins), unique
function sourceId(name, channelId, sources) {
  const slug = String(name).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28).replace(/-$/, "");
  const latin = !/[^\u0000-ɏ\s\p{P}\p{S}]/u.test(name);
  const base = `yt-${latin && slug.length >= 3 ? slug : channelId.slice(2, 12).toLowerCase()}`;
  let id = base, n = 2;
  while (sources.some(s => s.id === id)) id = `${base}-${n++}`;
  return id;
}

// Score d'une vidéo : niveau de la chaîne, nature pédagogique, durée raisonnable, fraîcheur, audience
export function scoreVideo(v, tier) {
  let s = { A: 6, B: 4, C: 1 }[tier] || 0;
  if (GUIDE.test(v.title)) s += 3;
  if (v.min >= 8 && v.min <= 40) s += 2; else if (v.min < 8) s -= 1;
  if (v.age <= 6) s += 2; else if (v.age <= 12) s += 1;
  s += Math.min(3, Math.log10(Math.max(1, num(v.views))) / 2);
  return Math.round(s * 10) / 10;
}

// Ordre final : score, avec une pénalité par vidéo déjà prise sur la même chaîne (diversité des voix et des langues)
export function order(items) {
  const taken = new Map(), out = [];
  const left = [...items];
  while (left.length) {
    let best = 0, bestScore = -Infinity;
    for (let i = 0; i < left.length; i++) { const s = left[i].score - 1.5 * (taken.get(left[i].channelId) || 0); if (s > bestScore) { bestScore = s; best = i; } }
    const [it] = left.splice(best, 1);
    taken.set(it.channelId, (taken.get(it.channelId) || 0) + 1);
    out.push(it);
  }
  return out;
}

export async function build({ perChannel = 25, months = 24 } = {}) {
  const inv = JSON.parse(await readFile("coach/cache/inventory.json", "utf8"));
  const ids = (await readFile("coach/cache/inventory-ids.txt", "utf8")).trim().split(/\s+/);
  const reg = await readJson(P.sources);
  const contents = await readJson(P.contents);
  const cand = new Map((inv.candidates || []).map(c => [c.channelId, c]));
  const byChannel = new Map(reg.sources.filter(s => s.channelId).map(s => [s.channelId, s]));
  const items = [], added = [];
  for (const id of ids) {
    const ch = inv.channels?.[id];
    if (!ch?.list?.length) continue;
    const c = cand.get(id) || {};
    let src = byChannel.get(id);
    // A : chaîne suivie avant l'inventaire ; B : haut niveau déclaré ; C : coaching ou guides
    const tier = src && !src.addedBy ? "A" : HIGH.test(`${c.name} ${c.description}`) ? "B" : "C";
    const vids = ch.list.filter(v => v.min <= 60 && v.age <= months && TEACH.test(v.title) && !DROP.test(v.title) && !LOW.test(v.title) && !LOW.test(ch.name));
    if (!vids.length) continue;
    if (!src) {
      // Nouvelle source : URL vérifiée (catalogue lu le jour même), niveau déclaré par le créateur, crédibilité à établir
      const text = `${ch.name} ${c.description || ""}`;
      const roles = ROLE_KW.filter(([, re]) => re.test(text)).map(([r]) => r);
      src = {
        id: sourceId(ch.name, id, reg.sources), name: ch.name, author: ch.name, url: `https://www.youtube.com/channel/${id}`, channelId: id,
        langs: [LANG[c.lang] || "en"], kind: "createur", format: "video", roles: roles.length ? roles : ["all"], champions: [],
        expertise: [{ claim: (c.description || "").slice(0, 160) || "Chaîne pédagogique League of Legends", evidence: `https://www.youtube.com/channel/${id}/about`, how: `déclaration du créateur (description de la chaîne) ; ${ch.subscribers || "abonnés inconnus"} ; trouvée par recherche YouTube (${c.query || "inventaire"}) ; non vérifié indépendamment au ${today()}` }],
        access: { mode: "rss-metadonnees", detail: "Flux RSS public ; lecture des vidéos par Gemini.", discovery: { type: "youtube-rss", url: `https://www.youtube.com/feeds/videos.xml?channel_id=${id}` } },
        credibility: { level: "à établir", why: tier === "B" ? "Profil haut niveau déclaré par le créateur, à confirmer ; chaque vidéo est jugée sur sa qualité réelle." : "Chaîne de coaching ou de guides sans niveau déclaré : priorité basse, chaque vidéo est jugée sur sa qualité réelle." },
        lastChecked: today(), active: true, addedBy: "inventaire 21/10/2026",
      };
      reg.sources.push(src); byChannel.set(id, src); added.push(src.name);
    }
    for (const v of vids.sort((a, b) => scoreVideo(b, tier) - scoreVideo(a, tier)).slice(0, perChannel))
      items.push({ id: `c-yt-${v.id}`, videoId: v.id, channelId: id, sourceId: src.id, title: v.title, min: v.min, ageMonths: v.age, views: v.views, tier, score: scoreVideo(v, tier) });
  }
  // Vidéos déjà au registre, pas encore lues et pédagogiques : elles entrent dans le même classement
  const known = new Set(items.map(i => i.id));
  for (const c of contents.contents.filter(c => c.type === "video" && c.access === "metadonnees" && !known.has(c.id) && (c.videoAttempts || 0) < 3)) {
    const src = reg.sources.find(s => s.id === c.sourceId);
    if (!src || !(c.backfill || (TEACH.test(c.title) && !DROP.test(c.title))) || LOW.test(c.title)) continue;
    const age = c.published ? (Date.now() - Date.parse(c.published)) / (30 * 864e5) : 12;
    items.push({ id: c.id, videoId: c.url.split("v=")[1], channelId: src.channelId || src.id, sourceId: src.id, title: c.title, min: 20, ageMonths: Math.round(age), views: c.views || "", tier: "A", score: c.backfill
      // Anciens guides ciblés à la demande d'Anthony (ex. Chreak : « même les anciens, les guides sont universels ») : l'ancienneté ne les pénalise pas
      ? scoreVideo({ title: c.title, min: 20, age: 6, views: c.views }, "A") + 2
      : scoreVideo({ title: c.title, min: 20, age, views: c.views }, "A") });
  }
  const queue = order(items).map((it, i) => ({ rank: i + 1, ...it }));
  await writeJson(P.sources, reg);
  await writeJson(QUEUE, { at: new Date().toISOString(), note: "Ordre de lecture des vidéos (pertinence, qualité, diversité des chaînes et des langues). Les vidéos entrent au registre par petits lots, juste avant d'être lues.", total: queue.length, queue });
  return { total: queue.length, added, byTier: { A: queue.filter(q => q.tier === "A").length, B: queue.filter(q => q.tier === "B").length, C: queue.filter(q => q.tier === "C").length }, hours: Math.round(queue.reduce((a, q) => a + q.min, 0) / 60) };
}

// Les prochaines vidéos de la file entrent au registre (date et description lues sur la page publique), avec leur rang
export async function refill(contents, sources, { ahead = 12 } = {}) {
  const q = await readJson(QUEUE, null);
  if (!q?.queue?.length) return [];
  const byId = new Map(contents.contents.map(c => [c.id, c]));
  const log = [];
  let pending = 0;
  for (const it of q.queue) {
    const c = byId.get(it.id);
    if (c && c.access !== "metadonnees") continue; // déjà lue
    if (c && (c.videoAttempts || 0) >= 3) continue;
    if (pending >= ahead) break;
    pending++;
    if (c) { c.queueRank = it.rank; continue; }
    const src = sources.find(s => s.id === it.sourceId);
    if (!src) continue;
    const page = await fetch(`https://www.youtube.com/watch?v=${it.videoId}`, { headers: HEAD, signal: AbortSignal.timeout(20000) }).then(r => r.text()).catch(() => "");
    const published = page.match(/"(?:publishDate|uploadDate)":"(\d{4}-\d{2}-\d{2})/)?.[1] || null;
    const title = page.match(/<meta name="title" content="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"') || it.title;
    const description = (page.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)?.[1] || "").replace(/\\n/g, "\n").replace(/\\"/g, '"').slice(0, 280);
    const tr = triage(`${title} ${description}`, { champions: {}, partial: [] }, null, src.credibility?.level);
    const entry = { id: it.id, sourceId: src.id, type: "video", url: `https://www.youtube.com/watch?v=${it.videoId}`, title, author: src.author, lang: src.langs[0], published, retrievedAt: today(), patch: null,
      access: "metadonnees", analysis: "non-analysee", descriptionExcerpt: description, backfill: true, queueRank: it.rank,
      note: `File de lecture (rang ${it.rank}) : vidéo pédagogique retenue par l'inventaire des chaînes, à lire par Gemini.`,
      triage: { ...tr, score: Math.max(tr.score, Math.round(it.score)), basis: `file de lecture (inventaire du 21/10/2026) ; ${tr.basis}` } };
    contents.contents.push(entry); byId.set(entry.id, entry);
    log.push(`+ rang ${it.rank} : ${title.slice(0, 80)}`);
  }
  return log;
}

if (process.argv[1]?.endsWith("queue.mjs") && process.argv[2] === "construire") {
  const r = await build();
  console.log(`File : ${r.total} vidéos (${r.hours} h) ; chaînes A ${r.byTier.A}, B ${r.byTier.B}, C ${r.byTier.C} ; ${r.added.length} nouvelles sources.`);
}
