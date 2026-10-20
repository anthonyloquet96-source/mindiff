// Analyse automatique des contenus en attente : étape 1 (extraction) puis étape 2 (critique) avec Claude,
// puis contrôle critique déterministe et fusion dans la base. Les deux étapes partagent le même modèle.
// Ne tourne que si ANTHROPIC_API_KEY est disponible ; sinon les contenus restent « en attente », sans analyse supposée.
// Usage : node coach/analyze.mjs [--dry-run]   (--dry-run : prépare les requêtes sans appeler l'API)

import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { P, ROOT, readJson, writeJson, cachedText, saveText, today } from "./lib.mjs";
import { htmlToText } from "./patch.mjs";
import { detectInjection, THEMES } from "./critic.mjs";
import { mergeBatch, rulesLockStatus, loadContext } from "./kb.mjs";

const DRY = process.argv.includes("--dry-run");
const UA = "MINDIFF-coach/1.0 (+https://anthonyloquet96-source.github.io/mindiff/)";

const EXTRACT_SCHEMA = {
  type: "object", additionalProperties: false, required: ["units", "alertes"],
  properties: {
    units: { type: "array", items: {
      type: "object", additionalProperties: false,
      required: ["claim", "champions", "roles", "themes", "matchup_vs", "synergy_with", "queue", "rank", "region", "patch_known", "patch_value", "conditions", "limits", "nature", "evidence", "mention_only_champions", "depends_on", "meta_dependent", "action", "observe"],
      properties: {
        claim: { type: "string" }, champions: { type: "array", items: { type: "string" } },
        roles: { type: "array", items: { type: "string", enum: ["top", "jungle", "mid", "bottom", "support", "all"] } },
        themes: { type: "array", items: { type: "string", enum: THEMES } },
        matchup_vs: { type: "string", description: "champion adverse explicitement traité, sinon chaîne vide" },
        synergy_with: { type: "array", items: { type: "string" } },
        queue: { type: "string", enum: ["solo", "duo", "equipe", "competition", "tous", "non précisé"] },
        rank: { type: "string" }, region: { type: "string" },
        patch_known: { type: "boolean" }, patch_value: { type: "string", description: "chaîne vide si inconnu" },
        conditions: { type: "array", items: { type: "string" } }, limits: { type: "array", items: { type: "string" } },
        nature: { type: "string", enum: ["officiel", "opinion", "statistique", "analyse"] },
        evidence: { type: "array", items: { type: "object", additionalProperties: false, required: ["passage", "locator"], properties: { passage: { type: "string", description: "copie exacte, 320 caractères maximum" }, locator: { type: "string" } } } },
        mention_only_champions: { type: "array", items: { type: "string" } },
        depends_on: { type: "array", items: { type: "string" } }, meta_dependent: { type: "boolean" },
        action: { type: "string", description: "action observable à tester, ou chaîne vide" }, observe: { type: "string" },
      },
    } },
    alertes: { type: "array", items: { type: "object", additionalProperties: false, required: ["code", "detail"], properties: { code: { type: "string", enum: ["injection", "traduction", "acces-partiel", "rien-d-exploitable", "autre"] }, detail: { type: "string" } } } },
  },
};
const CRITIQUE_SCHEMA = {
  type: "object", additionalProperties: false, required: ["reviews"],
  properties: { reviews: { type: "array", items: {
    type: "object", additionalProperties: false, required: ["index", "verdict", "status", "flags", "why", "correction_claim"],
    properties: {
      index: { type: "integer" }, verdict: { type: "string", enum: ["garder", "corriger", "rejeter"] },
      status: { type: "string", enum: ["exploitable", "provisoire", "contradictoire", "a-revalider"] },
      flags: { type: "array", items: { type: "string", enum: ["patch-incompatible", "ranked-competition", "petit-echantillon", "une-partie", "citation-insuffisante", "meme-origine", "contradiction", "traduction", "mention", "injection"] } },
      why: { type: "string" }, correction_claim: { type: "string" },
    },
  } } },
};

// Accès au texte : uniquement par une voie publique et autorisée, sans contournement
async function robotsAllows(url) {
  try {
    const u = new URL(url);
    const txt = await fetch(`${u.origin}/robots.txt`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(10000) }).then(r => (r.ok ? r.text() : ""));
    let applies = false;
    for (const line of txt.split(/\r?\n/)) {
      const [k, ...v] = line.split(":"); const val = v.join(":").trim();
      if (/^user-agent$/i.test(k.trim())) applies = val === "*" || /mindiff/i.test(val);
      else if (applies && /^disallow$/i.test(k.trim()) && val && u.pathname.startsWith(val)) return false;
    }
    return true;
  } catch { return true; }
}
export async function acquireText(c) {
  const cached = await cachedText(c.id);
  if (cached) return { text: cached, access: c.access };
  if (c.type === "video") return { text: null, access: c.access === "transcription" ? "transcription" : "metadonnees", reason: c.access === "transcription" ? "transcription importée introuvable dans le cache" : "aucune transcription autorisée" };
  if (c.wpId && c.wpBase) {
    const r = await fetch(`${c.wpBase}/wp-json/wp/v2/posts/${c.wpId}?_fields=content,modified`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return { text: null, access: "inaccessible", reason: `HTTP ${r.status}` };
    const text = htmlToText((await r.json()).content?.rendered || "");
    await saveText(c.id, text);
    return { text, access: "texte-integral" };
  }
  if (!(await robotsAllows(c.url))) return { text: null, access: "inaccessible", reason: "robots.txt interdit l'accès" };
  const r = await fetch(c.url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000) });
  if (r.status === 401 || r.status === 402 || r.status === 403) return { text: null, access: "inaccessible", reason: `HTTP ${r.status} : accès refusé, aucun contournement` };
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const text = htmlToText(await r.text());
  await saveText(c.id, text);
  return { text, access: "texte-integral" };
}

function spentToday(costs) { return costs.days?.[today()] || 0; }
function spentMonth(costs) { const m = today().slice(0, 7); return Object.entries(costs.days || {}).filter(([d]) => d.startsWith(m)).reduce((s, [, v]) => s + v, 0); }

export async function run() {
  const lock = await rulesLockStatus();
  if (!lock.ok) return [`✘ Analyse arrêtée : règles ou instructions modifiées sans validation humaine (${lock.changed.join(", ")}).`];
  const [config, contents, state, costs] = await Promise.all([readJson(P.config), readJson(P.contents), readJson(P.state, {}), readJson(P.costs, { days: {}, calls: [] })]);
  const A = config.analysis;
  const model = process.env.MINDIFF_COACH_MODEL || A.model;
  const price = config.pricesUsdPerMTok[model];
  const log = [];
  const queue = contents.contents
    .filter(c => c.analysis === "en-attente" && (c.attempts || 0) < config.discovery.maxAttempts)
    .sort((a, b) => (b.triage?.score || 0) - (a.triage?.score || 0) || String(b.published).localeCompare(String(a.published)));
  const pendingVideos = contents.contents.filter(c => c.type === "video" && c.access === "metadonnees").length;
  if (pendingVideos) log.push(`· ${pendingVideos} vidéo(s) en métadonnées seules : non analysées (pas de transcription autorisée).`);
  if (!queue.length) { log.push("Aucun contenu en attente d'analyse."); return log; }
  const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  if (!hasKey && !DRY) { log.push(`· ${queue.length} contenu(s) en attente : ANTHROPIC_API_KEY absente, aucune analyse lancée (rien n'est supposé).`); return log; }
  if (!price) { log.push(`✘ Tarif inconnu pour ${model} dans coach/config.json : analyse arrêtée.`); return log; }
  const doneToday = (state.analysesByDay?.[today()] || 0);
  const client = hasKey ? new Anthropic() : null;
  const rules = await readFile(join(ROOT, "coach/rules/FIABILITE.md"), "utf8");
  const [pExtract, pCritique] = await Promise.all(["extraction.v1.md", "critique.v1.md"].map(f => readFile(join(ROOT, "coach/prompts", f), "utf8")));
  const L = await loadContext();
  let n = 0;
  for (const c of queue) {
    if (n >= A.maxPerRun || doneToday + n >= A.maxPerDay) { log.push(`· Limite d'analyses atteinte (${A.maxPerRun} par passage, ${A.maxPerDay} par jour).`); break; }
    try {
      const got = await acquireText(c);
      if (!got.text) { Object.assign(c, { access: got.access, analysis: c.type === "video" ? "non-analysee" : "inaccessible", note: got.reason }); log.push(`· ${c.id} : ${got.reason}`); continue; }
      const inj = detectInjection(got.text);
      if (inj.length) {
        Object.assign(c, { analysis: "quarantaine", note: `Instruction détectée dans le contenu : « ${inj[0]} ». Contenu non analysé, à relire par une personne.` });
        (state.quarantine ||= []).push({ id: c.id, at: today(), match: inj });
        log.push(`⚠ ${c.id} : mis en quarantaine (instruction détectée)`); continue;
      }
      const text = got.text.slice(0, A.maxInputChars);
      const partial = got.text.length > A.maxInputChars;
      const estimate = ((rules.length + pExtract.length + text.length) / 3.5 * 2 / 1e6) * price.input + (8000 / 1e6) * price.output;
      if (spentToday(costs) + estimate > A.budgetUsdPerDay || spentMonth(costs) + estimate > A.budgetUsdPerMonth) { log.push(`· Budget atteint (${spentToday(costs).toFixed(3)} $ aujourd'hui) : analyse reportée.`); break; }
      const related = L.units.units.filter(u => u.champions?.some(ch => text.includes(ch))).slice(0, 15).map(u => ({ id: u.id, claim: u.claim, patch: u.patch, nature: u.nature }));
      const meta = `Contenu : ${c.title} · auteur : ${c.author} · source : ${c.sourceId} · langue : ${c.lang} · publié : ${c.published || "inconnu"} · accès : ${got.access}${partial ? ` (partiel : ${A.maxInputChars} premiers caractères)` : ""}\nPatch courant du ranked : ${L.ctx.current} · version client des compétitions : ${L.changesDoc.competitionVersion || "inconnue"}`;
      if (DRY) { log.push(`(essai) ${c.id} : ~${Math.round(text.length / 3.5)} tokens d'entrée, ~${estimate.toFixed(4)} $ estimés`); n++; continue; }
      const ask = async (system, user, schema) => {
        const params = { model, max_tokens: 16000, output_config: { effort: A.effort, format: { type: "json_schema", schema } }, system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: user }] };
        const res = model.startsWith("claude-haiku")
          ? await client.messages.create(params)
          : await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
        const usd = ((res.usage.input_tokens + (res.usage.cache_creation_input_tokens || 0) * 1.25 + (res.usage.cache_read_input_tokens || 0) * 0.1) * price.input + res.usage.output_tokens * price.output) / 1e6;
        costs.days[today()] = (costs.days[today()] || 0) + usd;
        costs.calls.push({ at: new Date().toISOString(), content: c.id, model, input: res.usage.input_tokens, output: res.usage.output_tokens, usd: Number(usd.toFixed(5)) });
        if (res.stop_reason === "refusal") throw new Error("le modèle a refusé ce contenu");
        if (res.stop_reason === "max_tokens") throw new Error("réponse tronquée");
        await new Promise(r => setTimeout(r, 60000 / A.maxRequestsPerMinute));
        return JSON.parse(res.content.filter(b => b.type === "text").map(b => b.text).join(""));
      };
      const ex = await ask(`${pExtract}\n\n---\n${rules}`, `${meta}\n\n<contenu>\n${text}\n</contenu>`, EXTRACT_SCHEMA);
      if (ex.alertes.some(a => a.code === "injection")) { Object.assign(c, { analysis: "quarantaine", note: "Le modèle a signalé une instruction dans le contenu." }); (state.quarantine ||= []).push({ id: c.id, at: today(), match: ex.alertes }); continue; }
      const cr = ex.units.length ? await ask(`${pCritique}\n\n---\n${rules}`, `${meta}\n\nUnités proposées :\n${JSON.stringify(ex.units, null, 1)}\n\nUnités existantes liées :\n${JSON.stringify(related, null, 1)}`, CRITIQUE_SCHEMA) : { reviews: [] };
      const units = ex.units.map((x, i) => ({ x, r: cr.reviews.find(r => r.index === i) })).filter(({ r }) => r?.verdict !== "rejeter").map(({ x, r }, i) => ({
        id: `u-ai-${c.id.replace(/^c-/, "")}-${i + 1}`,
        claim: r?.verdict === "corriger" && r.correction_claim ? r.correction_claim : x.claim,
        champions: x.champions, roles: x.roles, themes: x.themes,
        ...(x.matchup_vs ? { matchup: { vs: x.matchup_vs } } : {}),
        ...(x.synergy_with.length ? { synergy: { with: x.synergy_with, kind: x.nature === "opinion" ? "avis" : x.nature === "statistique" ? "statistique" : "theorique" } } : {}),
        context: { queue: x.queue, rank: x.rank, region: x.region },
        patch: x.patch_known ? { known: true, value: x.patch_value } : { known: false },
        metaDependent: x.meta_dependent, dependsOn: x.depends_on, conditions: x.conditions,
        limits: [...x.limits, ...(partial ? ["Analyse d'un accès partiel au texte."] : [])],
        nature: x.nature,
        evidence: x.evidence.map(e => ({ content: c.id, locator: e.locator, lang: c.lang, passage: e.passage, mentionOnly: x.mention_only_champions.some(m => e.passage.includes(m)) || undefined })),
        mentions: x.mention_only_champions.map(m => `${m} (exemple)`),
        ...(x.action ? { action: x.action, observe: x.observe } : {}),
        status: r?.status || "provisoire",
        aiReview: r ? { verdict: r.verdict, flags: r.flags, why: r.why } : null,
        published: c.published || null,
      }));
      const res = await mergeBatch({ units, analyst: `${model} (extraction v1 + critique v1)`, promptVersions: { extraction: "v1", critique: "v1" } }, { origin: "analyse-automatique" });
      Object.assign(c, { access: got.access + (partial ? " (partiel)" : ""), analysis: "analysee", analyzedAt: today(), analyst: model, unitsAccepted: res.accepted.length, unitsRejected: res.rejected.length, alertes: ex.alertes });
      log.push(`✔ ${c.id} : ${res.accepted.length} unité(s) acceptée(s), ${res.rejected.length} rejetée(s) par le contrôle critique`);
      n++;
    } catch (e) {
      c.attempts = (c.attempts || 0) + 1;
      c.lastError = `${e.message} (${today()})`;
      if (c.attempts >= config.discovery.maxAttempts) { c.analysis = "echec"; (state.failures ||= []).push({ id: c.id, at: today(), error: e.message }); }
      log.push(`✘ ${c.id} : ${e.message} (essai ${c.attempts}/${config.discovery.maxAttempts})`);
    }
  }
  state.analysesByDay ||= {};
  state.analysesByDay[today()] = doneToday + (DRY ? 0 : n);
  await Promise.all([writeJson(P.contents, contents), writeJson(P.state, state), DRY ? null : writeJson(P.costs, costs)]);
  return log;
}

if (process.argv[1]?.endsWith("analyze.mjs")) run().then(l => console.log(l.join("\n")), e => { console.error(e.message); process.exit(1); });
