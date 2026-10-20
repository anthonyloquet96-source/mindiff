// Vérification croisée : regroupe les articles qui parlent du même sujet,
// puis attribue un statut de fiabilité à chaque sujet.
//
//  confirme       : une source officielle, ou au moins 2 sites indépendants
//  media          : un seul média reconnu
//  non-confirme   : fuite/rumeur, ou source communautaire seule
//  contradictoire : un score annoncé ne correspond pas au résultat officiel

import { isRumor } from "./classify.mjs";

const STOP = new Set(("the and for with from that this have has are was were will into after over about your their they them its it's not but out new more than just what when how who why all can now get "
  + "les des une pour avec dans sur par aux est sont qui que plus pas nouveau nouvelle mise jour").split(" "));

function tokens(text) {
  return new Set((text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}.'-]{2,}/gu) || [])
    .map(t => t.replace(/[.'-]+$/, ""))
    .filter(t => !STOP.has(t)));
}
// Noms propres et nombres : les indices les plus fiables pour relier deux articles, même dans deux langues.
function strong(text) {
  const caps = text.match(/(?<!^|[.!?]\s)\b[A-Z][\p{L}\d]+/gu) || [];
  const nums = text.match(/\b\d+(?:[.,]\d+)?\b/g) || [];
  return new Set([...caps, ...nums].map(t => t.toLowerCase()).filter(t => !STOP.has(t)));
}
const inter = (a, b) => [...a].filter(x => b.has(x)).length;

function similar(a, b) {
  if (a.game !== b.game) return false;
  // Deux articles d'une même source sont deux sujets distincts (ex. plusieurs « Counter-Strike 2 Update »)
  if (a.source && a.source === b.source) return false;
  if (Math.abs(new Date(a.date) - new Date(b.date)) > 4 * 864e5) return false;
  const shared = inter(a._strong, b._strong);
  const jac = inter(a._tok, b._tok) / (new Set([...a._tok, ...b._tok]).size || 1);
  return jac >= 0.3 || (shared >= 2 && jac >= 0.1) || shared >= 3;
}

const domain = url => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

export function cluster(items) {
  for (const it of items) {
    const text = `${it.title} ${it.summary || ""}`;
    it._tok = tokens(text);
    it._strong = strong(`${it.title}. ${it.summary || ""}`);
  }
  const clusters = [];
  for (const it of items.sort((a, b) => new Date(b.date) - new Date(a.date))) {
    const c = clusters.find(c => c.some(x => similar(x, it)));
    c ? c.push(it) : clusters.push([it]);
  }
  return clusters;
}

// Compare les scores cités dans un article aux résultats officiels.
function checkScores(item, officialMatches) {
  const text = `${item.title} ${item.summary || ""}`;
  const scores = [...text.matchAll(/\b([0-5])\s?[-–]\s?([0-5])\b/g)].map(m => [+m[1], +m[2]]);
  if (!scores.length) return null;
  for (const m of officialMatches) {
    const has = t => [t.name, t.code].some(n => n && n.length > 2 && new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
    if (!has(m.teams[0]) || !has(m.teams[1])) continue;
    const [x, y] = [m.teams[0].score, m.teams[1].score];
    const ok = scores.some(([a, b]) => (a === x && b === y) || (a === y && b === x));
    if (!ok) return `Le score cité (${scores.map(s => s.join("–")).join(", ")}) ne correspond pas au résultat officiel ${m.teams[0].name} ${x}–${y} ${m.teams[1].name}.`;
  }
  return null;
}

export function verify(items, officialMatches = []) {
  return cluster(items).map(group => {
    const official = group.filter(i => i.kind === "officiel");
    const lead = official[0] || group.find(i => i.kind === "media") || group[0];
    const domains = new Set(group.map(i => domain(i.url)));
    const warnings = [];

    let status;
    if (official.length) status = "confirme";
    else if (domains.size >= 2) status = "confirme";
    else if (group.every(i => isRumor(`${i.title} ${i.summary}`))) { status = "non-confirme"; warnings.push("Fuite ou rumeur : rien d'officiel pour l'instant."); }
    else if (lead.kind === "media") status = "media";
    else status = "non-confirme";

    for (const i of group) {
      const w = checkScores(i, officialMatches);
      if (w) { status = "contradictoire"; warnings.push(`${i.sourceName} : ${w}`); }
    }

    const seen = new Set();
    const sources = group
      .sort((a, b) => ({ officiel: 0, media: 1, communaute: 2 }[a.kind] - { officiel: 0, media: 1, communaute: 2 }[b.kind]))
      .filter(i => !seen.has(i.url) && seen.add(i.url))
      .map(i => ({ name: i.sourceName, url: i.url, kind: i.kind }));

    return {
      id: lead.id,
      auto: true,
      game: lead.game,
      type: lead.type,
      date: group.map(i => i.date).sort()[0].slice(0, 10),
      // Date de publication complète (la plus ancienne du groupe). Si aucune source ne donne de date,
      // on garde la date de première détection, signalée comme estimée : elle ne doit pas passer pour une actu fraîche.
      publishedAt: group.map(i => i.date).sort()[0],
      dateEstimated: group.every(i => i.dateEstimated),
      firstSeen: lead.firstSeen,
      status,
      lang: lead.lang,
      title: lead.title,
      summary: lead.summary,
      image: lead.image || group.find(i => i.image)?.image || null,
      points: lead.points,
      warnings,
      sources,
    };
  });
}
