// Contrôle critique déterministe (règles de coach/rules/FIABILITE.md, section 4).
// Appliqué à toute unité, qu'elle vienne d'une personne, de l'agent Claude Code ou de l'analyse automatique.
// Il complète la passe critique du modèle : il ne la remplace pas et ne garantit pas la vérité.

import { normText, patchCmp, patchGap } from "./lib.mjs";

export const NATURES = ["officiel", "opinion", "statistique", "analyse"];
export const THEMES = ["patch", "lane", "synergie", "matchup", "teamfight", "survie", "methode", "build", "vagues", "vision", "macro", "jungle", "champion"];
export const ROLES = ["top", "jungle", "mid", "bottom", "support", "all"];
// Du moins au plus restrictif : le statut final est le plus restrictif des statuts proposés et calculés
export const STATUS_ORDER = ["exploitable", "provisoire", "contradictoire", "a-revalider", "obsolete", "retire"];
const worst = (...s) => s.filter(Boolean).sort((a, b) => STATUS_ORDER.indexOf(b) - STATUS_ORDER.indexOf(a))[0];

// Instructions glissées dans un contenu externe (donnée non fiable)
const INJECTION = [
  /ignore (all |any )?(the )?(previous|prior|above) (instructions|rules)/i,
  /ignore (tes|les|vos) (règles|instructions)/i,
  /disregard (your|the) (rules|instructions|system)/i,
  /\b(system prompt|prompt système)\b/i,
  /you are now\b|tu es maintenant\b/i,
  /\b(mark|classe|marque)[^.]{0,40}\b(exploitable|reliable|fiable|verified|vérifié)/i,
  /\bgit (push|commit)|\bnpm (publish|install)|\bcurl\s+https?:|\brm\s+-rf\b/i,
  /\b(api[_ ]?key|ANTHROPIC_API_KEY|secrets?\.)/i,
  /<\s*script\b/i,
];
export function detectInjection(text) {
  const t = String(text || "");
  return INJECTION.map(re => t.match(re)?.[0]).filter(Boolean);
}

export const LOW_LEVELS = ["emeraude", "platine", "or", "argent", "bronze", "fer"];
const TIER_RANK = { "S+": 0, S: 1, A: 2, B: 3, C: 4, D: 5, F: 6 };
const tierOf = p => { const m = p.match(/(?:^|\s)(S\+|[SABCDF])(?:-tier|\s+\d)/); return m ? m[1] : null; };
const hasPercent = p => /\d+(?:[.,]\d+)?\s?%/.test(p);
const SMURF = /\bsmurf|\bone game\b|\bune seule partie\b|\bsingle game\b/i;

// ctx : { contents: Map, texts: Map(id → texte|null), sources: Map, current, changes: { "26.20": ["Lucian/base", …] }, config, glossary }
export function checkUnit(u, ctx) {
  const flags = [];
  const flag = (code, why, blocking = false, status = null) => flags.push({ code, why, blocking, status });
  const cfg = ctx.config.critic;

  // Forme
  if (!u.id || !u.claim) flag("schema", "Identifiant ou énoncé manquant.", true);
  if (!NATURES.includes(u.nature)) flag("schema", `Nature inconnue : ${u.nature}.`, true);
  if (!u.themes?.length || u.themes.some(t => !THEMES.includes(t))) flag("schema", "Thème manquant ou inconnu.", true);
  if (!u.roles?.length || u.roles.some(r => !ROLES.includes(r))) flag("schema", "Rôle manquant ou inconnu.", true);
  if (!u.evidence?.length) flag("schema", "Aucun passage cité.", true);
  if (!u.patch || typeof u.patch.known !== "boolean") flag("schema", "Patch non renseigné (même inconnu, il doit être déclaré).", true);

  const ev = u.evidence || [];
  for (const e of ev) {
    const c = ctx.contents.get(e.content);
    if (!c) { flag("source-inconnue", `Contenu ${e.content} absent du registre.`, true); continue; }
    if (c.access === "metadonnees" || c.access === "inaccessible") flag("titre-pas-preuve", `${e.content} : seules les métadonnées ont été examinées, elles ne prouvent pas le contenu.`, true);
    if (c.analysis === "quarantaine") flag("injection", `${e.content} est en quarantaine.`, true);
    // Transcription ou images lues par une IA : passage de seconde main, à vérifier sur la vidéo
    if (c.reader?.kind === "ia" && !e.humanChecked) flag("lecture-ia", `${e.content} : lu par ${c.reader.tool} (${c.reader.fps} image/s) ; passage à vérifier sur la vidéo (${e.locator}).`, false, "provisoire");
    if ((e.passage || "").length > cfg.maxPassageChars) flag("citation-trop-longue", `Passage de plus de ${cfg.maxPassageChars} caractères : résumer plutôt que republier.`, true);
    if (detectInjection(e.passage).length) flag("injection", `Le passage cité contient une instruction : ${detectInjection(e.passage)[0]}`, true);
    const text = ctx.texts.get(e.content);
    // Sans le texte (cache privé absent, ex. machine distante), on garde la vérification faite à la fusion
    if (text == null) { if (!u.verified?.passages) flag("citation-non-verifiable", `Texte de ${e.content} absent du cache : passage non vérifié.`, false, "provisoire"); }
    else if (!normText(text).includes(normText(e.passage))) flag("citation-introuvable", `Passage introuvable dans ${e.content} : « ${e.passage.slice(0, 60)}… »`, true);
    if (SMURF.test(e.passage || "") || e.flags?.includes("une-partie") || e.flags?.includes("smurf")) flag("une-partie", "Tiré d'une seule partie ou d'un contexte de smurf.", false, "provisoire");
  }

  // La citation soutient-elle l'énoncé ?
  const full = ev.filter(e => !e.mentionOnly);
  if (u.nature === "statistique" && !full.some(e => hasPercent(e.passage))) flag("citation-insuffisante", "Statistique sans chiffre dans les passages cités.", true);
  for (const ch of u.champions || []) {
    // Noms composés : « Nunu et Willump » est souvent dit « Nunu » (et « Nunu & Willump » en anglais)
    const names = [ch, ch.split(/ et | & /)[0]].map(normText);
    const inPassage = full.some(e => names.some(n => normText(e.passage).includes(n)));
    // Dans un document officiel structuré (notes de patch, Data Dragon), la section citée désigne le sujet
    const inTitle = full.some(e => { const c = ctx.contents.get(e.content); return normText(c?.title).includes(normText(ch)) || (String(c?.sourceId).startsWith("riot-") && normText(e.locator).includes(normText(ch))); });
    const onlyMention = !inPassage && !inTitle && ev.some(e => e.mentionOnly && normText(e.passage).includes(normText(ch)));
    if (onlyMention) flag("mention", `${ch} n'est cité qu'en exemple : ce n'est pas un conseil sur ${ch}.`, true);
    else if (!inPassage && !inTitle) flag("citation-insuffisante", `Aucun passage ne porte sur ${ch}.`, true);
  }
  for (const m of u.mentions || []) if ((u.champions || []).some(ch => m.startsWith(ch))) flag("mention", `${m} : mention, pas conseil.`, true);

  // Niveau de référence (consigne d'Anthony, 21/10) : le savoir vient du niveau Diamant et plus, ou de la compétition.
  // Un contenu de plus bas niveau ne sert qu'à illustrer une erreur à corriger (usage « correction »).
  if (u.usage !== "correction") {
    const low = ev.filter(e => /^solo-(tous|emeraude\+|sous-emeraude|or|argent|bronze|fer|platine)/.test(String(e.context || "")));
    if (u.nature === "statistique" && low.length) flag("rang-sous-reference", `Statistique tirée d'un niveau inférieur à Diamant (${[...new Set(low.map(e => e.context))].join(", ")}) : le coach ne prend comme référence que Diamant et plus.`, true);
    if (LOW_LEVELS.includes(u.levelContext)) flag("rang-sous-reference", `Contenu tiré de parties de niveau ${u.levelContext} : utilisable seulement comme erreur à corriger, pas comme référence.`, true);
  }

  // Ranked et compétition
  const evCtx = ev.map(e => e.context || ctx.contents.get(e.content)?.context?.queue).filter(Boolean);
  const allCompet = evCtx.length && evCtx.every(x => String(x).startsWith("competition"));
  if (["solo", "duo"].includes(u.context?.queue) && allCompet) flag("ranked-competition", "Conclusion de solo queue appuyée uniquement sur des matchs de compétition.", true);
  if (u.context?.queue === "competition" && evCtx.length && evCtx.every(x => String(x).startsWith("solo"))) flag("ranked-competition", "Conclusion de compétition appuyée uniquement sur du ranked.", true);

  // Échantillon
  for (const e of ev.filter(e => e.sample != null)) {
    const isPro = String(e.context || "").startsWith("competition");
    const min = isPro ? cfg.minProGames : cfg.minRankedGames;
    const acknowledged = (u.limits || []).some(l => /parties?|échantillon/i.test(l));
    if (e.sample < min && !acknowledged) flag("petit-echantillon", `${e.sample} parties (${isPro ? "compétition" : "ranked"}) : sous le seuil de ${min}, sans limite signalée.`, false, "provisoire");
  }

  // Sources : indépendance et désaccords
  const origins = ev.map(e => {
    const c = ctx.contents.get(e.content);
    return new Set(c?.origin || ctx.sources.get(c?.sourceId)?.origin || [c?.sourceId]);
  });
  for (let i = 0; i < origins.length; i++) for (let j = i + 1; j < origins.length; j++) {
    const a = ev[i].content, b = ev[j].content;
    if (a === b || ctx.contents.get(a)?.sourceId === ctx.contents.get(b)?.sourceId) continue;
    if ([...origins[i]].some(x => origins[j].has(x))) flag("meme-origine", `${a} et ${b} reprennent la même origine de données.`);
  }
  const independent = new Set(ev.map(e => ctx.contents.get(e.content)?.sourceId)).size;
  if (u.nature === "statistique" && independent < 2) flag("source-unique", "Statistique d'une seule source.", false, "provisoire");
  if (u.nature === "opinion") flag("source-unique", "Avis d'une seule personne : présenté comme tel.", false, "provisoire");
  const tiers = full.map(e => ({ t: tierOf(e.passage), c: e.context || "" })).filter(x => x.t);
  if (tiers.length > 1) {
    const r = tiers.map(x => TIER_RANK[x.t]);
    const spread = Math.max(...r) - Math.min(...r);
    const sameCtx = tiers.every(x => x.c === tiers[0].c);
    if (spread >= 2 && sameCtx) flag("contradiction", `Classements divergents dans le même contexte (${tiers.map(x => x.t).join(", ")}).`, false, "contradictoire");
    else if (spread >= 2) flag("ecart-de-contexte", `Classements différents (${tiers.map(x => `${x.t} en ${x.c}`).join(", ")}) : à présenter avec leurs contextes.`);
  }

  // Traduction
  for (const e of ev.filter(e => e.lang && e.lang !== "fr")) {
    const hit = (ctx.glossary?.terms || []).filter(t => t.flag !== false).find(t => [t.en, ...(t.alias || [])].filter(Boolean).some(w => new RegExp(`\\b${w.split("/")[0].trim().replace(/[.*+?^${}()|[\]\\!]/g, "\\$&")}`, "i").test(e.passage)));
    if (hit && !u.translation) flag("traduction", `Terme à risque (${hit.en}) dans un passage en ${e.lang} sans note de traduction.`, false, "provisoire");
  }

  // Patch et dépendances
  let patchStatus = null;
  const cur = ctx.current;
  if (u.patch?.validUntil && patchCmp(cur, u.patch.validUntil) > 0) { patchStatus = "obsolete"; flag("patch-incompatible", `Valable jusqu'au patch ${u.patch.validUntil} ; patch courant ${cur}.`, false, "obsolete"); }
  if (!patchStatus && u.patch?.known && cur && patchCmp(u.patch.value, cur) > 0) flag("patch-futur", `Porte sur le patch ${u.patch.value}, pas encore en vigueur (patch courant ${cur}) : prévision, à confirmer à sa sortie.`, false, "provisoire");
  const since = u.patch?.known ? u.patch.value : u.validity?.checkedPatch;
  if (!patchStatus && u.metaDependent && u.patch?.known) {
    const gap = patchGap(u.patch.value, cur);
    if (gap > ctx.config.freshness.metaDependentMaxPatches) { patchStatus = "a-revalider"; flag("patch-incompatible", `Dépend de la méta, patch ${u.patch.value} : ${gap} patchs de retard.`, false, "a-revalider"); }
  }
  if (!patchStatus && since) {
    for (const [p, list] of Object.entries(ctx.changes || {})) {
      if (patchCmp(p, since) <= 0 || patchCmp(p, cur) > 0) continue;
      const hit = (u.dependsOn || []).filter(d => list.includes(d) || (d.startsWith("item:") && list.includes(d)) || (!d.includes("/") && list.some(x => x.startsWith(d + "/"))));
      if (hit.length) { patchStatus = "a-revalider"; flag("patch-incompatible", `${hit.join(", ")} modifié au patch ${p}, après ${since}.`, false, "a-revalider"); break; }
    }
  }

  const computed = worst("exploitable", ...flags.map(f => f.status));
  // proposedStatus : statut voulu par l'auteur de l'unité ; le calcul ne peut que le durcir
  return { flags, blocking: flags.some(f => f.blocking), status: worst(u.proposedStatus || "exploitable", computed), independentSources: independent };
}
