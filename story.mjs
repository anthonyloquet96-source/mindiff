// Résumé factuel d'une partie pro : relevé minute par minute du flux officiel LoL Esports (golds, kills par joueur,
// tours, dragons, barons, inhibiteurs, objets), puis phrases construites uniquement à partir de ces chiffres.
// Aucun texte inventé : chaque phrase correspond à une mesure (heure, écart, nombre).
// Partagé entre la collecte (Node) et l'application (navigateur, quand la collecte n'est pas encore passée).

const FEED = "https://feed.lolesports.com/livestats/v1";
const iso10 = ms => { const d = new Date(ms); d.setUTCSeconds(Math.floor(d.getUTCSeconds() / 10) * 10, 0); return d.toISOString(); };

// Relevé d'une partie terminée (environ 2 requêtes par minute de jeu)
export async function fetchStory(gameId, fetchImpl = fetch) {
  const get = async u => { try { const r = await fetchImpl(u); return r.status === 200 ? await r.json() : null; } catch { return null; } };
  const w0 = await get(`${FEED}/window/${gameId}`);
  if (!w0?.frames?.length || !w0.gameMetadata) return null;
  const t0 = Date.parse(w0.frames[0].rfc460Timestamp), meta = w0.gameMetadata;
  const side = (m, s) => m.participantMetadata.map(p => ({ name: p.summonerName, champ: p.championId, role: p.role, side: s, teamId: m.esportsTeamId }));
  const players = [...side(meta.blueTeamMetadata, "blue"), ...side(meta.redTeamMetadata, "red")];
  const mins = [];
  let end = null, items = null;
  for (let m = 1; m <= 90; m++) {
    const at = iso10(t0 + m * 60000);
    const [w, d] = await Promise.all([get(`${FEED}/window/${gameId}?startingTime=${at}`), get(`${FEED}/details/${gameId}?startingTime=${at}`)]);
    const f = w?.frames?.at(-1);
    if (!f) break;
    const p = d?.frames?.at(-1)?.participants;
    const t = x => [f.blueTeam[x], f.redTeam[x]];
    mins.push({ m, gold: t("totalGold"), kills: t("totalKills"), towers: t("towers"), inhibs: t("inhibitors"), barons: t("barons"), drakes: t("dragons").map(x => x || []),
      k: p ? p.map(x => [x.kills, x.deaths, x.assists]) : null });
    if (p) items = p.map(x => x.items || []);
    if (f.gameState === "finished") { end = Math.round((Date.parse(f.rfc460Timestamp) - t0) / 1000); break; }
  }
  if (!end || mins.length < 5) return null; // partie pas encore finie, ou relevé incomplet
  // Vainqueur déduit de l'image finale (inhibiteurs, puis tours, puis kills) ; la collecte le vérifie avec le score officiel
  const L = mins.at(-1), sc = i => L.inhibs[i] * 100 + L.towers[i] * 10 + L.kills[i] / 100;
  return { v: 1, gameId, duration: end, winner: sc(0) >= sc(1) ? "blue" : "red", players, mins, items };
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
  // 5. Actions marquantes : au moins 3 kills d'un joueur en une minute (hors tournant déjà raconté)
  for (let i = 1; i < M.length; i++) {
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
