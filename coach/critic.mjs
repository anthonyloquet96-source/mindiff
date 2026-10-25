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
  const autoOk = ev.some(e => e.autoChecked?.said && e.autoChecked?.supported);
  const fundamental = !u.metaDependent && !(u.champions || []).length && !(u.dependsOn || []).some(d => d.includes("/") || d.startsWith("item:"))
    && (u.themes || []).some(t => ["vagues", "vision", "macro", "methode"].includes(t)) && !(u.themes || []).some(t => ["champion", "build", "matchup", "synergie", "patch"].includes(t));
  // Durée de vie (règles v1.3) : « intemporel » (principe général), « systeme » (dépend d'un système de jeu : Téléportation,
  // camps, horaires d'objectifs) ou « meta » (champion, objet, compétence, équilibrage). Elle décide de la nuance affichée.
  const deps = u.dependsOn || [];
  const kitBound = (u.champions || []).length || deps.some(d => d.includes("/") || d.startsWith("item:")) || (u.themes || []).some(t => ["champion", "build", "matchup", "synergie", "patch"].includes(t));
  const lifespan = fundamental ? "intemporel" : !kitBound && deps.some(d => d.startsWith("system:")) ? "systeme" : "meta";
  // Vérification croisée par nos données (v1.3) : une mesure sur des parties Diamant+ récentes confirme, nuance ou contredit le conseil
  // Mesure faite avec la clé de développement de Riot : privée, elle ne compte qu'une fois la publication autorisée (riot.publish)
  const dc = u.dataCheck?.result && (ctx.config.riot?.publish || u.dataCheck.source !== "riot-dev") ? u.dataCheck : null;
  // Contexte d'usage (v2) : un joueur doit savoir quand, pour qui et comment appliquer le conseil
  const useComplete = !!(u.use?.when && u.use?.who && u.use?.how?.length);
  for (const e of ev) {
    const c = ctx.contents.get(e.content);
    if (!c) { flag("source-inconnue", `Contenu ${e.content} absent du registre.`, true); continue; }
    if (c.access === "metadonnees" || c.access === "inaccessible") flag("titre-pas-preuve", `${e.content} : seules les métadonnées ont été examinées, elles ne prouvent pas le contenu.`, true);
    if (c.analysis === "quarantaine") flag("injection", `${e.content} est en quarantaine.`, true);
    // Transcription ou images lues par une IA : passage de seconde main. Confirmé par une personne (humanChecked)
    // ou par une seconde lecture de l'extrait autour de l'horodatage (autoChecked, règles v1.2)
    const a = e.autoChecked;
    if (c.reader?.kind === "ia" && !e.humanChecked) {
      if (a && !a.said) flag("citation-non-entendue", `${e.content} : passage absent de l'extrait ${a.window} relu par ${a.by}.`, true);
      else if (a && !a.supported) flag("sur-generalisation", `${e.content} : l'extrait ${a.window} ne dit pas exactement cela${a.gap ? ` (${a.gap})` : ""}.`, false, "provisoire");
      else if (!a && !autoOk) flag("lecture-ia", `${e.content} : lu par ${c.reader.tool} (${c.reader.fps} image/s) ; passage à vérifier sur la vidéo (${e.locator}).`, false, "provisoire");
    }
    // Contenu ancien (ex. article de sortie d'un champion) : le kit a pu changer depuis, la date du patch ne suffit pas à le savoir.
    // Un principe général (vagues, vision, jungle), sans champion, objet ni méta, ne vieillit pas avec le kit
    const maxAge = ctx.config.freshness?.maxContentAgeDays;
    if (maxAge && c.published && !e.humanChecked && lifespan !== "intemporel" && dc?.result !== "confirme" && (Date.now() - Date.parse(c.published)) / 864e5 > maxAge) flag("contenu-ancien", `${e.content} publié le ${c.published} : à confirmer sur le kit et la méta actuels.`, false, "provisoire");
    if ((e.passage || "").length > cfg.maxPassageChars) flag("citation-trop-longue", `Passage de plus de ${cfg.maxPassageChars} caractères : résumer plutôt que republier.`, true);
    if (detectInjection(e.passage).length) flag("injection", `Le passage cité contient une instruction : ${detectInjection(e.passage)[0]}`, true);
    const text = ctx.texts.get(e.content);
    // Sans le texte (cache privé absent, ex. machine distante), on garde la vérification faite à la fusion
    if (text == null) { if (!u.verified?.passages) flag("citation-non-verifiable", `Texte de ${e.content} absent du cache : passage non vérifié.`, false, "provisoire"); }
    // Passage coupé (« [...] », « … ») : chaque morceau doit se trouver dans le texte
    else if (!String(e.passage).split(/\s*(?:\[\s*(?:\.\.\.|…)\s*\]|\.\.\.|…)\s*/).filter(x => x.trim().length > 8).every(part => normText(text).includes(normText(part)))) flag("citation-introuvable", `Passage introuvable dans ${e.content} : « ${e.passage.slice(0, 60)}… »`, true);
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
  // Deux chaînes d'une même organisation (ex. blog et YouTube de We Teach League) ne comptent que pour une
  const independent = new Set(ev.map(e => { const c = ctx.contents.get(e.content); return ctx.sources.get(c?.sourceId)?.organization || c?.sourceId; })).size;
  if (u.nature === "statistique" && independent < 2) flag("source-unique", "Statistique d'une seule source.", false, "provisoire");
  // Source communautaire (v1.3) : le rang de l'auteur est déclaré, pas vérifié. Jamais exploitable seule :
  // il faut une autre source indépendante ou une confirmation par nos données
  const community = ev.some(e => ctx.sources.get(ctx.contents.get(e.content)?.sourceId)?.trust === "communaute");
  if (community && independent < 2 && dc?.result !== "confirme") flag("rang-non-verifie", "Source communautaire (rang déclaré, non vérifié) : à confirmer par une autre source indépendante ou par nos données.", false, "provisoire");
  if (dc?.result === "contredit") flag("donnees-contredisent", `Nos données (${dc.sample}) : ${dc.note}`, false, "provisoire");
  // Avis attribué d'un coach (règles v1.2) : exploitable s'il est présenté comme tel, avec un contexte d'usage complet et sans dépendre de la méta
  if (u.nature === "opinion") flag("source-unique", useComplete && !u.metaDependent ? "Avis d'une seule personne : présenté comme tel." : "Avis d'une seule personne, sans contexte d'usage complet ou dépendant de la méta.", false, useComplete && !u.metaDependent ? null : "provisoire");
  if (u.promptVersions?.extraction >= "v2" && u.origin === "analyse-automatique" && !u.use?.when) flag("contexte-manquant", "Aucune situation de partie reconnaissable : ce n'est pas une consigne applicable.", false, "provisoire");
  const aiFlags = (u.aiReview?.flags || []).filter(f => ["contexte-manquant", "sur-generalisation"].includes(f));
  if (aiFlags.length) flag(aiFlags[0], `Contrôle critique : ${u.aiReview.why || aiFlags.join(", ")}`, false, "provisoire");
  // Formulation absolue que l'auteur n'emploie pas
  const ABS = /(^|[^\p{L}])(toujours|uniquement|jamais|systématiquement|à chaque fois|seulement)([^\p{L}]|$)/iu, ABS_SRC = /\b(always|only|never|every ?time|each time|must|have to|toujours|uniquement|jamais|seulement|systématiquement|il faut)\b/i;
  const said = [u.claim.replace(/^(Selon|D'après) [^:]+ : /, ""), u.action, u.use?.when, ...(u.use?.how || [])].filter(Boolean).join(" ");
  if (u.nature !== "officiel" && ABS.test(said) && !ev.some(e => ABS_SRC.test(e.passage || ""))) flag("sur-generalisation", "Formulation absolue (« toujours », « uniquement »…) absente des passages cités.", false, "provisoire");
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
    // Revalidé par nos données sur un patch récent : la distance se compte depuis la mesure
    const gap = patchGap(dc && dc.result !== "contredit" && dc.patch ? dc.patch : u.patch.value, cur);
    if (gap > ctx.config.freshness.metaDependentMaxPatches) { patchStatus = "a-revalider"; flag("patch-incompatible", `Dépend de la méta, patch ${u.patch.value} : ${gap} patchs de retard.`, false, "a-revalider"); }
  }
  if (!patchStatus && since) {
    for (const [p, list] of Object.entries(ctx.changes || {})) {
      if (patchCmp(p, since) <= 0 || patchCmp(p, cur) > 0) continue;
      const hit = (u.dependsOn || []).filter(d => list.includes(d) || (d.startsWith("item:") && list.includes(d)) || (!d.includes("/") && list.some(x => x.startsWith(d + "/"))));
      if (hit.length) { patchStatus = "a-revalider"; flag("patch-incompatible", `${hit.join(", ")} modifié au patch ${p}, après ${since}.`, false, "a-revalider"); break; }
    }
  }

  // Nuance (v1.3) : un conseil ancien n'est pas supprimé ; il est montré avec ce qui a pu changer depuis
  let nuance = null;
  const maxAgeDays = ctx.config.freshness?.maxContentAgeDays;
  const pubDate = ev.map(e => ctx.contents.get(e.content)?.published).filter(Boolean).sort()[0] || null;
  const old = (maxAgeDays && pubDate && (Date.now() - Date.parse(pubDate)) / 864e5 > maxAgeDays) || (u.patch?.known && cur && patchGap(u.patch.value, cur) > ctx.config.freshness.metaDependentMaxPatches);
  if (u.nature !== "officiel" && lifespan !== "intemporel" && old && dc?.result !== "confirme") {
    const when = `Conseil de ${pubDate ? pubDate.slice(0, 4) : "date inconnue"}${u.patch?.known ? ` (patch ${u.patch.value})` : ""}`;
    const sys = deps.filter(d => d.startsWith("system:")).map(d => d.slice(7).replace(/-/g, " "));
    nuance = lifespan === "systeme" && sys.length ? `${when} : à revérifier sur le jeu actuel (${sys.join(", ")}).` : kitBound || u.metaDependent ? `${when} : l'équilibrage a changé depuis, vérifie que ça s'applique encore.` : `${when} : le jeu a pu changer depuis, vérifie que ça s'applique encore.`;
  }
  if (dc && dc.result !== "confirme" && dc.note) nuance = dc.note;
  const computed = worst("exploitable", ...flags.map(f => f.status));
  // proposedStatus : statut voulu par l'auteur de l'unité ; le calcul ne peut que le durcir
  return { flags, blocking: flags.some(f => f.blocking), status: worst(u.proposedStatus || "exploitable", computed), independentSources: independent, lifespan, nuance };
}
