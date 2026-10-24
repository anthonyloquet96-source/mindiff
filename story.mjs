// Résumé factuel d'une partie pro : relevé minute par minute du flux officiel LoL Esports (golds, kills par joueur,
// tours, dragons, barons, inhibiteurs, objets), puis phrases construites uniquement à partir de ces chiffres.
// Aucun texte inventé : chaque phrase correspond à une mesure (heure, écart, nombre).
// Partagé entre la collecte (Node) et l'application (navigateur, quand la collecte n'est pas encore passée).

const FEED = "https://feed.lolesports.com/livestats/v1";
const iso10 = ms => { const d = new Date(ms); d.setUTCSeconds(Math.floor(d.getUTCSeconds() / 10) * 10, 0); return d.toISOString(); };

// Relevé d'une partie terminée (environ 2 requêtes par minute de jeu)
export async function fetchStory(gameId, fetchImpl = fetch) {
  const get = async u => { try { const r = await fetchImpl(u); return r.status === 200 ? await r.json() : null; } catch { return null; } };
  const win = ms => get(`${FEED}/window/${gameId}?startingTime=${iso10(ms)}`);
  const w0 = await get(`${FEED}/window/${gameId}`);
  if (!w0?.frames?.length || !w0.gameMetadata) return null;
  const meta = w0.gameMetadata;
  // Début du flux : quelques secondes avant l'apparition des champions. Le 0:00 de la partie est la première image
  // où les joueurs ont leurs 500 golds de départ.
  const f0 = Date.parse(w0.frames[0].rfc460Timestamp);
  const early = [w0, await win(f0 + 10000), await win(f0 + 20000)].flatMap(w => w?.frames || []);
  const t0 = Date.parse((early.find(f => f.blueTeam.totalGold > 0) || w0.frames[0]).rfc460Timestamp);
  const side = (m, s) => m.participantMetadata.map(p => ({ name: p.summonerName, champ: p.championId, role: p.role, side: s, teamId: m.esportsTeamId }));
  const players = [...side(meta.blueTeamMetadata, "blue"), ...side(meta.redTeamMetadata, "red")];
  const mins = [], frames = [...early], snap = {};
  let end = null, last = null;
  for (let m = 1; m <= 90; m++) {
    const at = t0 + m * 60000;
    const [w, d] = await Promise.all([win(at), get(`${FEED}/details/${gameId}?startingTime=${iso10(at)}`)]);
    const f = w?.frames?.at(-1);
    if (!f) break;
    frames.push(...w.frames);
    const p = d?.frames?.at(-1)?.participants;
    const t = x => [f.blueTeam[x], f.redTeam[x]];
    mins.push({ m, gold: t("totalGold"), kills: t("totalKills"), towers: t("towers"), inhibs: t("inhibitors"), barons: t("barons"), drakes: t("dragons").map(x => x || []),
      k: p ? p.map(x => [x.kills, x.deaths, x.assists]) : null });
    if (p) { last = p; if ([10, 15, 20].includes(m)) snap[m] = p.map(x => [x.totalGoldEarned, x.creepScore, x.level]); }
    if (f.gameState === "finished") { end = Math.round((Date.parse(f.rfc460Timestamp) - t0) / 1000); break; }
  }
  if (!end || mins.length < 5) return null; // partie pas encore finie, ou relevé incomplet
  // Kills à la seconde : chaque fenêtre du flux couvre 10 s. Pour chaque minute où un kill, une mort ou une aide a eu lieu,
  // on relève les 50 s manquantes, puis on compare les images successives.
  const kda = f => [...f.blueTeam.participants, ...f.redTeam.participants].map(x => [x.kills, x.deaths, x.assists]);
  const ts = f => Date.parse(f.rfc460Timestamp);
  const sameKda = (a, b) => JSON.stringify(kda(a)) === JSON.stringify(kda(b));
  frames.sort((a, b) => ts(a) - ts(b));
  const need = new Set();
  for (let i = 1; i < frames.length; i++) {
    const a = ts(frames[i - 1]), b = ts(frames[i]);
    if (b - a > 4000 && !sameKda(frames[i - 1], frames[i])) for (let s = a + 10000; s < b; s += 10000) need.add(s);
  }
  const fill = [...need];
  for (let i = 0; i < fill.length; i += 12) (await Promise.all(fill.slice(i, i + 12).map(win))).forEach(w => frames.push(...(w?.frames || [])));
  frames.sort((a, b) => ts(a) - ts(b));
  // ev : [seconde, tueur, victime, [aides]] (indices des joueurs). Tueur null : mort sans tueur identifié (tourelle,
  // monstre, ou plusieurs kills dans la même image) ; victime null : kill dont la victime n'est pas identifiable.
  const ev = [];
  for (let i = 1; i < frames.length; i++) {
    const a = kda(frames[i - 1]), b = kda(frames[i]), t = Math.max(0, Math.round((ts(frames[i]) - t0) / 1000));
    const dk = b.map((x, j) => x[0] - a[j][0]), dd = b.map((x, j) => x[1] - a[j][1]), da = b.map((x, j) => x[2] - a[j][2]);
    if (dk.some(x => x < 0) || dd.some(x => x < 0)) continue; // image en retard sur la précédente
    const killers = dk.flatMap((n, j) => Array(Math.max(0, n)).fill(j)), victims = dd.flatMap((n, j) => Array(Math.max(0, n)).fill(j));
    const helpers = da.flatMap((n, j) => n > 0 ? [j] : []);
    const left = [...victims];
    for (const k of killers) {
      const opp = left.filter(v => (v < 5) !== (k < 5));
      const sure = new Set(killers.filter(x => (x < 5) === (k < 5))).size === 1 && opp.length >= 1 && (opp.length === killers.filter(x => (x < 5) === (k < 5)).length);
      const v = sure ? opp[0] : null;
      if (v != null) left.splice(left.indexOf(v), 1);
      ev.push([t, k, v, helpers.filter(h => (h < 5) === (k < 5) && h !== k)]);
    }
    left.forEach(v => ev.push([t, null, v, []]));
  }
  const fin = last?.map(x => ({ g: x.totalGoldEarned, cs: x.creepScore, lv: x.level, kp: x.killParticipation, dmg: x.championDamageShare, wp: x.wardsPlaced, wd: x.wardsDestroyed,
    it: (x.items || []).filter(Boolean), rk: x.perkMetadata?.perks?.[0] ?? null, rs: x.perkMetadata ? [x.perkMetadata.styleId, x.perkMetadata.subStyleId] : null })) || null;
  // Vainqueur déduit de l'image finale (inhibiteurs, puis tours, puis kills) ; la collecte le vérifie avec le score officiel
  const L = mins.at(-1), sc = i => L.inhibs[i] * 100 + L.towers[i] * 10 + L.kills[i] / 100;
  return { v: 2, gameId, duration: end, winner: sc(0) >= sc(1) ? "blue" : "red", players, mins, snap, fin, ev };
}

const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const DRAKE = { fr: { infernal: "infernal", ocean: "océan", mountain: "montagne", cloud: "nuages", hextech: "hextech", chemtech: "chimtech", elder: "Ancien" }, en: { infernal: "infernal", ocean: "ocean", mountain: "mountain", cloud: "cloud", hextech: "hextech", chemtech: "chemtech", elder: "Elder" } };
const list = (a, lang) => a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} ${lang === "en" ? "and" : "et"} ${a.at(-1)}`;
const k1 = (n, lang = "fr") => Math.round(Math.abs(n) / 100) * 100 >= 1000 ? (Math.round(Math.abs(n) / 100) * 100).toLocaleString(lang === "en" ? "en-US" : "fr-FR") : String(Math.round(Math.abs(n)));

// Phrases du résumé. teams : { blue: { name, code }, red: {…} } ; winner : "blue" | "red" ; tagsOf(champion) → ["Assassin", …]
export function storyLines(st, { teams, winner, lang = "fr", tagsOf = () => [], champName = c => c } = {}) {
  const en = lang === "en", T = s => teams[s]?.code || teams[s]?.name || s, out = [];
  const P = st.players, M = st.mins, last = M.at(-1);
  const who = i => `${P[i].name.replace(/^\S+ /, "")} (${champName(P[i].champ)})`;
  const sgn = winner === "blue" ? 1 : -1, loser = winner === "blue" ? "red" : "blue";
  const diff = M.map(x => (x.gold[0] - x.gold[1]) * sgn); // écart d'or du point de vue du vainqueur
  // 1. Draft : catégories officielles des champions (Riot)
  for (const s of ["blue", "red"]) {
    const champs = P.filter(p => p.side === s).map(p => p.champ);
    const by = tag => champs.filter(c => tagsOf(c).includes(tag));
    const asn = by("Assassin"), tank = by("Tank");
    if (asn.length >= 2) out.push({ k: "draft", t: en ? `${T(s)} drafted ${asn.length} assassins (${list(asn.map(champName), lang)}).` : `${T(s)} a drafté ${asn.length} assassins (${list(asn.map(champName), lang)}).` });
    if (tank.length >= 3) out.push({ k: "draft", t: en ? `${T(s)} lined up ${tank.length} tanky champions (${list(tank.map(champName), lang)}).` : `${T(s)} a aligné ${tank.length} champions résistants (${list(tank.map(champName), lang)}).` });
  }
  // 2. Début de partie : écart à 15 min
  const at15 = M.find(x => x.m === 15);
  if (at15) {
    const d = at15.gold[0] - at15.gold[1], lead = d > 0 ? "blue" : "red";
    out.push({ k: "early", t: Math.abs(d) < 1000
      ? (en ? `Even early game: ${k1(Math.abs(d), lang)} gold apart at 15 min, ${at15.kills[0]}–${at15.kills[1]} in kills.` : `Début de partie équilibré : ${k1(Math.abs(d), lang)} golds d'écart à 15 min, ${at15.kills[0]}–${at15.kills[1]} en kills.`)
      : (en ? `${T(lead)} led by ${k1(Math.abs(d), lang)} gold at 15 min.` : `${T(lead)} menait de ${k1(Math.abs(d), lang)} golds à 15 min.`) });
  }
  // 3. Moment où la partie se décide : à partir de là, le vainqueur reste devant d'au moins 1 000 golds
  let dec = null;
  for (let i = diff.length - 1; i >= 0 && diff[i] >= 1000; i--) dec = i;
  const before = dec != null ? Math.max(0, ...diff.slice(0, dec).map(Math.abs)) : null;
  if (dec != null && dec > 0 && before < 1500) out.push({ k: "close", t: en ? `Close game until ${M[dec].m - 1}:00: the gap never exceeded ${k1(before, lang)} gold.` : `Partie serrée jusqu'à ${M[dec].m - 1}:00 : l'écart n'a jamais dépassé ${k1(before, lang)} golds.` });
  // 4. Tournant : la plus forte bascule d'or en 2 minutes en faveur du vainqueur, avec ce qui s'y passe
  let best = null;
  for (let i = 2; i < diff.length; i++) { const g = diff[i] - diff[i - 2]; if (g > 1500 && (!best || g > best.g)) best = { i, g }; }
  if (best) {
    const a = M[best.i - 2], b = M[best.i], wi = winner === "blue" ? 0 : 1;
    const bits = [];
    const multi = [];
    if (a.k && b.k) P.forEach((p, i) => { const n = b.k[i][0] - a.k[i][0]; if (n >= 3) multi.push(en ? `${n} kills for ${who(i)}` : `${n} kills de ${who(i)}`); });
    if (multi.length) bits.push(list(multi, lang));
    if (b.barons[wi] > a.barons[wi]) bits.push(en ? "Baron Nashor" : "le Baron Nashor");
    const dr = b.drakes[wi].length - a.drakes[wi].length; if (dr > 0) bits.push(en ? `${dr} dragon${dr > 1 ? "s" : ""}` : `${dr} dragon${dr > 1 ? "s" : ""}`);
    const tw = b.towers[wi] - a.towers[wi]; if (tw > 0) bits.push(en ? `${tw} tower${tw > 1 ? "s" : ""}` : `${tw} tour${tw > 1 ? "s" : ""}`);
    const kw = b.kills[wi] - a.kills[wi], kl = b.kills[1 - wi] - a.kills[1 - wi];
    out.push({ k: "turn", t: en
      ? `Turning point between ${a.m}:00 and ${b.m}:00: ${T(winner)} gains ${k1(best.g, lang)} gold (${kw}–${kl} in kills${bits.length ? `, ${list(bits, lang)}` : ""}).`
      : `Tournant entre ${a.m}:00 et ${b.m}:00 : ${T(winner)} prend ${k1(best.g, lang)} golds d'écart (${kw}–${kl} en kills${bits.length ? `, ${list(bits, lang)}` : ""}).` });
  }
  // 5. Actions marquantes. Relevé à la seconde (v2) : multi-kills au sens du jeu (moins de 10 s entre deux kills du même joueur).
  // Relevé à la minute (v1) : au moins 3 kills d'un joueur en une minute, hors tournant déjà raconté.
  if (st.ev) {
    const NAME = [, , "Double kill", "Triple kill", "Quadra kill", "Penta kill"];
    P.forEach((p, j) => {
      const ks = st.ev.filter(e => e[1] === j).map(e => e[0]);
      for (let i = 0; i < ks.length;) {
        let n = 1; while (i + n < ks.length && ks[i + n] - ks[i + n - 1] <= 10 && n < 5) n++;
        if (n >= 3) out.push({ k: "multi", s: ks[i], t: en ? `${NAME[n]} for ${who(j)} at ${mmss(ks[i + n - 1])}.` : `${NAME[n]} de ${who(j)} à ${mmss(ks[i + n - 1])}.` });
        i += n;
      }
    });
  } else for (let i = 1; i < M.length; i++) {
    if (!M[i].k || !M[i - 1].k || (best && i > best.i - 2 && i <= best.i)) continue;
    P.forEach((p, j) => { const n = M[i].k[j][0] - M[i - 1].k[j][0]; if (n >= 3) out.push({ k: "multi", t: en ? `${who(j)}: ${n} kills in one minute around ${M[i].m}:00.` : `${who(j)} : ${n} kills en une minute vers ${M[i].m}:00.` }); });
  }
  // 6. Objectifs : dragons (âme à 4) et barons
  const drakes = s => last.drakes[s === "blue" ? 0 : 1].map(x => DRAKE[en ? "en" : "fr"][x] || x);
  const db = drakes("blue"), dr = drakes("red");
  if (db.length || dr.length) out.push({ k: "obj", t: en
    ? `Dragons: ${T("blue")} ${db.length}${db.length ? ` (${db.join(", ")})` : ""}, ${T("red")} ${dr.length}${dr.length ? ` (${dr.join(", ")})` : ""}.`
    : `Dragons : ${T("blue")} ${db.length}${db.length ? ` (${db.join(", ")})` : ""}, ${T("red")} ${dr.length}${dr.length ? ` (${dr.join(", ")})` : ""}.` });
  const barons = { blue: [], red: [] };
  for (let i = 1; i < M.length; i++) for (const [s, x] of [["blue", 0], ["red", 1]]) if (M[i].barons[x] > M[i - 1].barons[x]) barons[s].push(`${M[i].m}:00`);
  const bt = ["blue", "red"].filter(s => barons[s].length).map(s => `${T(s)} ${en ? "around" : "vers"} ${list(barons[s], lang)}`);
  if (bt.length) out.push({ k: "obj", t: `Baron Nashor${en ? ":" : " :"} ${bt.join(", ")}.` });
  // 7. Joueur le plus décisif du vainqueur (meilleur ratio, puis le plus de kills) et fin de partie
  if (last.k) {
    const idx = P.map((p, i) => i).filter(i => P[i].side === winner);
    const r = i => (last.k[i][0] + last.k[i][2]) / Math.max(1, last.k[i][1]);
    const top = idx.sort((a, b) => r(b) - r(a) || last.k[b][0] - last.k[a][0])[0];
    const [k, d, a] = last.k[top];
    out.push({ k: "mvp", t: en ? `Best KDA for ${T(winner)}: ${who(top)}, ${k}/${d}/${a}.` : `Meilleur KDA chez ${T(winner)} : ${who(top)}, ${k}/${d}/${a}.` });
  }
  const wi = winner === "blue" ? 0 : 1;
  out.push({ k: "end", t: en
    ? `${T(winner)} wins in ${mmss(st.duration)}, ${last.kills[wi]} kills to ${last.kills[1 - wi]}, ${last.towers[wi]} towers to ${last.towers[1 - wi]}.`
    : `${T(winner)} l'emporte en ${mmss(st.duration)}, ${last.kills[wi]} kills à ${last.kills[1 - wi]}, ${last.towers[wi]} tours à ${last.towers[1 - wi]}.` });
  return out;
}

if (typeof window !== "undefined") Object.assign(window, { fetchStory, storyLines });
