// Contradictions entre conseils (consigne d'Anthony, 21/10) : quand deux unités se contredisent sur un même sujet,
// on vérifie à la source et on garde la plus pertinente. Détection déterministe, sans IA :
//   - objets, runes et sorts : « prends X » contre « évite X » pour le même champion (et le même vis-à-vis) ;
//   - verdict de matchup : « favorable » contre « difficile » pour le même duel.
// Départage, dans l'ordre : source officielle Riot ; données Diamant+ (parts de jeu, taux de victoire du duel) ;
// contenu nettement plus récent (patch) ; sinon les deux restent « contradictoires » et sont listés pour vérification.

// Bornes de mot compatibles avec les accents (la borne de mot de JavaScript ignore « é », « à »…)
const W = String.raw`(?<![\p{L}])`, E = String.raw`(?![\p{L}])`;
const rx = s => new RegExp(s.replaceAll("<", W).replaceAll(">", E), "iu");
const POS = rx("<(prend[sz]?|prenez|ach[eè]te[sz]?|achetez|privil[ée]gie[sz]?|rush(?:e[sz]?)?|commence[sz]? par|opte[sz]? pour|choisi(?:s|ssez)|utilise[sz]?|monte[sz]?|joue[sz]?|core|indispensable|obligatoire)>");
const NEG = rx("<([ée]vite[sz]?|[àa] [ée]viter|n'ach[eè]te[sz]? pas|ne prend[sz]? pas|ne prenez pas|n'utilise[sz]? pas|ne joue[sz]? pas|inutile|pas besoin d)");
const GOOD = rx("<(matchup|duel)>[^.]{0,40}<(favorable|facile|gagnant|à l'avantage)|<(domine[sz]?|gagne[sz]? facilement)>");
const BAD = rx("<(matchup|duel)>[^.]{0,40}<(d[ée]favorable|difficile|perdant|compliqu[ée])|<(contre[- ]pick|counter)>");
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Polarité de chaque objet, rune ou sort cité dans l'énoncé : on lit la proposition qui précède le nom
export function directives(claim, names) {
  const out = [];
  const sentences = String(claim).split(/(?<=[.;!?])\s+/);
  for (const s of sentences) {
    const ns = norm(s);
    for (const n of names) {
      const i = ns.indexOf(norm(n.name));
      if (i < 0 || n.name.length < 4) continue;
      const before = s.slice(Math.max(0, i - 70), i);
      const pol = NEG.test(before) ? -1 : POS.test(before) ? 1 : 0;
      if (pol && !out.some(o => o.kind === n.kind && o.id === n.id && o.pol === pol)) out.push({ kind: n.kind, id: n.id, name: n.name, pol });
    }
  }
  return out;
}
const verdictOf = claim => (BAD.test(claim) ? -1 : GOOD.test(claim) ? 1 : 0);

// Sujet commun : même champion, même rôle (ou « all »), même vis-à-vis éventuel
const subjectKey = (u, ch) => `${ch}|${u.matchup?.vs || ""}`;
const rolesMeet = (a, b) => a.roles.includes("all") || b.roles.includes("all") || a.roles.some(r => b.roles.includes(r));
const patchNum = u => { const v = u.patch?.known ? u.patch.value : null; if (!v) return null; const [a, b] = String(v).split(".").map(Number); return a * 100 + b; };

// units : unités évaluées ; names : [{kind:"item"|"rune"|"sort", id, name}] ; data : { champstats, matchups, champKey: nom → numéro }
export function findContradictions(units, names, data = {}) {
  const live = units.filter(u => ["exploitable", "provisoire"].includes(u.status));
  const bySubject = new Map();
  for (const u of live) {
    const dirs = directives(u.claim, names);
    const verdict = u.matchup?.vs ? verdictOf(u.claim) : 0;
    for (const ch of u.champions || []) {
      const k = subjectKey(u, ch);
      if (!bySubject.has(k)) bySubject.set(k, []);
      bySubject.get(k).push({ u, ch, dirs, verdict });
    }
  }
  const found = [];
  for (const [subject, list] of bySubject) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const A = list[i], B = list[j];
      if (A.u.id === B.u.id || !rolesMeet(A.u, B.u)) continue;
      // Même objet, polarités opposées
      for (const da of A.dirs) {
        const db = B.dirs.find(d => d.kind === da.kind && d.id === da.id && d.pol === -da.pol);
        if (db) found.push(resolve({ subject, ch: A.ch, topic: `${da.kind} « ${da.name} »`, item: da, pos: da.pol > 0 ? A.u : B.u, neg: da.pol > 0 ? B.u : A.u }, data));
      }
      if (A.verdict && B.verdict && A.verdict === -B.verdict) found.push(resolve({ subject, ch: A.ch, topic: `duel contre ${A.u.matchup.vs}`, vs: A.u.matchup.vs, pos: A.verdict > 0 ? A.u : B.u, neg: A.verdict > 0 ? B.u : A.u }, data));
    }
  }
  return found;
}

function resolve(c, { champstats, matchups, champKey = {} }) {
  const { pos, neg } = c;
  const base = { subject: c.subject, champion: c.ch, topic: c.topic, units: [pos.id, neg.id] };
  // 1. Source officielle Riot
  const offP = pos.nature === "officiel", offN = neg.nature === "officiel";
  if (offP !== offN) return { ...base, winner: offP ? pos.id : neg.id, loser: offP ? neg.id : pos.id, reason: "source officielle Riot" };
  // 2. Données Diamant+ : part de jeu de l'objet ou de la rune sur ce champion, taux de victoire du duel
  const key = champKey[c.ch];
  const cs = key && champstats?.champions?.[key];
  if (c.item && cs && cs.games >= (champstats.minGames || 30)) {
    const list = c.item.kind === "item" ? cs.items : c.item.kind === "rune" ? cs.keystones : [];
    const share = Math.round(((list.find(x => String(x.id) === String(c.item.id))?.games || 0) / cs.games) * 100);
    if (share >= 20) return { ...base, winner: pos.id, loser: neg.id, reason: `données Diamant+ : ${c.item.name} présent dans ${share} % des parties de ${c.ch} (${cs.games} parties)` };
    if (share <= 3 && list.length) return { ...base, winner: neg.id, loser: pos.id, reason: `données Diamant+ : ${c.item.name} présent dans ${share} % des parties de ${c.ch} (${cs.games} parties)` };
  }
  if (c.vs && matchups) {
    const role = ["top", "jungle", "mid", "bottom", "support"].find(r => pos.roles.includes(r)) || null;
    const cell = role && matchups.lane?.[role]?.[key]?.[champKey[c.vs]];
    if (cell && cell[0] >= 100) {
      const wr = cell[1] / cell[0], m = 1.96 * Math.sqrt((wr * (1 - wr)) / cell[0]);
      const pct = Math.round(wr * 1000) / 10;
      if (wr - m > 0.5) return { ...base, winner: pos.id, loser: neg.id, reason: `données Diamant+ : ${pct} % de victoires pour ${c.ch} dans ce duel (${cell[0]} parties)` };
      if (wr + m < 0.5) return { ...base, winner: neg.id, loser: pos.id, reason: `données Diamant+ : ${pct} % de victoires pour ${c.ch} dans ce duel (${cell[0]} parties)` };
    }
  }
  // 3. Contenu nettement plus récent (au moins 2 patchs d'écart)
  const pp = patchNum(pos), pn = patchNum(neg);
  if (pp && pn && Math.abs(pp - pn) >= 2) return { ...base, winner: pp > pn ? pos.id : neg.id, loser: pp > pn ? neg.id : pos.id, reason: "conseil plus récent (patch)" };
  // 4. Non départagé : vérification à faire à la source
  return { ...base, winner: null, loser: null, reason: "non départagé : à vérifier à la source" };
}

// Application aux unités : le conseil écarté passe « contradictoire » (non montré au joueur), l'autre garde son statut
export function applyContradictions(units, found) {
  const byId = new Map(units.map(u => [u.id, u]));
  for (const c of found) {
    const ids = c.winner ? [c.loser] : c.units;
    for (const id of ids) {
      const u = byId.get(id);
      if (!u || u.review?.human === "validée") continue;
      const other = c.units.find(x => x !== id);
      u.flags = [...(u.flags || []), { code: "contradiction", why: c.winner ? `Contredit par ${other} sur ${c.topic} ; retenu : ${other} (${c.reason}).` : `Contredit par ${other} sur ${c.topic} : ${c.reason}.`, blocking: false, status: "contradictoire" }];
      u.status = "contradictoire";
    }
  }
  return units;
}
