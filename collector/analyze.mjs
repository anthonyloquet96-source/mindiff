// Analyse par Claude : résumé en français, l'essentiel, et ce que ça change pour un joueur compétitif.
// Chaque analyse est mise en cache et refaite seulement si le sujet change (nouvelle source, nouveau statut, nouveaux résultats).

import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile } from "node:fs/promises";
import { fetchText, stripHtml, hash } from "./lib.mjs";

// Claude Haiku 5.5 par défaut : très bon rapport qualité/prix pour des résumés. MINDIFF_MODEL=claude-opus-5-5 pour plus de profondeur (anciens noms TRYHARD_* acceptés).
const MODEL = process.env.MINDIFF_MODEL || process.env.TRYHARD_MODEL || "claude-haiku-5-5";
const IS_HAIKU = MODEL.startsWith("claude-haiku");
const MAX_PER_RUN = Number(process.env.MINDIFF_MAX_ANALYSES || process.env.TRYHARD_MAX_ANALYSES || 40);
// $ par token (Haiku 5.5 : tarif des requêtes de moins de 100K tokens)
const PRICE = IS_HAIKU ? { in: 0.10 / 1e6, out: 0.50 / 1e6 } : { in: 4 / 1e6, out: 20 / 1e6 };
const GAME_NAMES = { lol: "League of Legends", val: "Valorant", cs2: "Counter-Strike 2", fn: "Fortnite", rl: "Rocket League", fc: "EA SPORTS FC 27" };

const RULES = `Tu es l'analyste en chef de MINDIFF, une application pour joueurs compétitifs (League of Legends, Valorant, CS2, Fortnite, Rocket League, EA SPORTS FC).

Règles absolues :
- Réponds en français, avec un ton direct et précis.
- Utilise uniquement les faits présents dans les documents fournis. N'invente aucun chiffre, nom, score, date ou changement. Si une information manque, ne la comble pas.
- Le statut de fiabilité est calculé par recoupement des sources. Si le statut est "non-confirme" ou "contradictoire", écris au conditionnel et dis clairement que ce n'est pas confirmé.
- Ne recommande jamais de sites qui vendent des boosts, des comptes ou des crédits.`;

const TOPIC_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["titre", "essentiel", "points_cles", "analyse", "impact", "a_surveiller"],
  properties: {
    titre: { type: "string", description: "Titre français clair et factuel, 90 caractères maximum" },
    essentiel: { type: "string", description: "Une seule phrase : ce qu'il faut retenir" },
    points_cles: { type: "array", items: { type: "string" }, description: "2 à 5 faits concrets, du plus important au moins important" },
    analyse: { type: "string", description: "2 à 4 phrases : ce que ça change concrètement en classé ou pour la scène compétitive" },
    impact: { type: "string", enum: ["fort", "moyen", "faible"] },
    a_surveiller: { type: "string", description: "Ce qui reste à confirmer ou à suivre ; chaîne vide s'il n'y a rien" },
  },
};

const TOURNAMENT_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["resume", "faits_marquants", "equipes_en_forme", "meta_pro", "a_suivre"],
  properties: {
    resume: { type: "string", description: "3 à 4 phrases : où en est le tournoi et ce qui s'est passé" },
    faits_marquants: { type: "array", items: { type: "string" }, description: "2 à 5 résultats ou faits marquants, avec les scores" },
    equipes_en_forme: { type: "array", items: { type: "string" }, description: "Équipes en forme ou en difficulté, avec le bilan qui le justifie" },
    meta_pro: { type: "string", description: "2 à 3 phrases sur les champions/agents dominants d'après les statistiques fournies ; chaîne vide si aucune statistique" },
    a_suivre: { type: "array", items: { type: "string" }, description: "Prochains matchs ou enjeux à suivre" },
  },
};

const BRIEFING_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["resume", "a_retenir", "conseils"],
  properties: {
    resume: { type: "string", description: "2 à 3 phrases : l'état du jeu et de sa scène en ce moment" },
    a_retenir: { type: "array", items: { type: "string" }, description: "3 à 5 points essentiels, du plus important au moins important" },
    conseils: { type: "array", items: { type: "string" }, description: "2 à 4 conseils concrets pour grimper en ce moment, tirés des sujets fournis" },
  },
};

// ---------- Appel à Claude ----------

let client = null;
const usage = { calls: 0, input: 0, output: 0, errors: 0 };

async function ask(task, content, schema, effort = "medium") {
  const params = {
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort, format: { type: "json_schema", schema } },
    system: RULES,
    messages: [{ role: "user", content: `${task}\n\n${content}` }],
  };
  // Haiku n'a pas de modèle de secours côté serveur ; pour les autres, un refus est repris par un autre modèle.
  const res = IS_HAIKU
    ? await client.messages.create(params)
    : await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" });
  usage.calls++;
  usage.input += res.usage.input_tokens + (res.usage.cache_read_input_tokens || 0);
  usage.output += res.usage.output_tokens;
  if (res.stop_reason === "refusal") throw new Error("Claude a refusé ce sujet");
  if (res.stop_reason === "max_tokens") throw new Error("réponse tronquée");
  return JSON.parse(res.content.filter(b => b.type === "text").map(b => b.text).join(""));
}

async function pool(tasks, size = 4) {
  const results = [];
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < tasks.length) {
      const t = tasks[i++];
      results.push(await t().catch(e => { usage.errors++; console.warn("  ✘ analyse :", e.message); }));
    }
  }));
  return results;
}

// Texte complet des notes de patch officielles, pour que l'analyse porte sur le vrai contenu.
async function articleText(url) {
  const html = await fetchText(url);
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<footer[\s\S]*?<\/footer>/gi, " ");
  return stripHtml(body).slice(0, 30000);
}

// ---------- Contenu envoyé pour chaque type d'analyse ----------

async function topicContent(topic, rawItems) {
  const lines = [
    `Jeu : ${GAME_NAMES[topic.game]}`,
    `Rubrique : ${topic.type}`,
    `Statut de fiabilité : ${topic.status}${topic.warnings?.length ? ` (alertes : ${topic.warnings.join(" ; ")})` : ""}`,
    `Sources (${topic.sources.length}) :`,
    ...topic.sources.map(s => `- [${s.kind}] ${s.name} — ${s.url}`),
    "", "Articles :",
  ];
  for (const it of rawItems) {
    lines.push(`### ${it.title} (${it.sourceName}, ${it.date?.slice(0, 10)})`);
    if (it.summary) lines.push(it.summary);
    if (it.points?.length) lines.push(...it.points.map(p => `- ${p}`));
    let full = it.fullText;
    if (!full && it.kind === "officiel" && topic.type === "patch" && /leagueoflegends|playvalorant|ea\.com/.test(it.url)) {
      full = await articleText(it.url).catch(() => null);
    }
    if (full) lines.push("", "Texte complet (extrait) :", full);
    lines.push("");
  }
  return lines.join("\n");
}

function tournamentContent(t) {
  const fmt = m => `${m.block || ""} : ${m.teams[0].name} ${m.teams[0].score ?? "?"}–${m.teams[1].score ?? "?"} ${m.teams[1].name}${m.start ? ` (${m.start.slice(0, 10)})` : ""}`;
  const matches = t.stages.flatMap(s => s.sections.flatMap(x => x.matches));
  const done = matches.filter(m => m.state === "completed").sort((a, b) => (b.start || "").localeCompare(a.start || "")).slice(0, 30);
  const next = matches.filter(m => m.state !== "completed" && m.teams.every(x => x.code !== "TBD")).sort((a, b) => (a.start || "").localeCompare(b.start || "")).slice(0, 10);
  const lines = [
    `Tournoi : ${t.name} (${GAME_NAMES[t.game]}) — statut : ${t.status}, ${t.progress?.done ?? done.length}/${t.progress?.total ?? matches.length} matchs joués`,
    `Dates : ${t.startDate || "?"} → ${t.endDate || "?"}`,
    "", "Résultats récents :", ...done.map(fmt),
    "", "Prochains matchs :", ...(next.length ? next.map(fmt) : ["aucun connu"]),
    "", "Classements :",
    ...t.stages.flatMap(s => s.sections.filter(x => x.standings?.length).map(x => `${s.name} / ${x.name} : ${x.standings.map(r => `${r.team} ${r.w}-${r.l}`).join(", ")}`)),
  ];
  if (t.stats?.totalGames) {
    lines.push("", `Champions joués par les pros (${t.stats.totalGames} parties) :`,
      ...t.stats.champions.slice(0, 20).map(c => `${c.champ} (${c.role}) : ${c.picks} picks, présence ${Math.round(c.presence * 100)} %${c.winrate !== null ? `, ${Math.round(c.winrate * 100)} % de victoires sur ${c.known}` : ""}`));
  }
  return lines.join("\n");
}

// ---------- Point d'entrée ----------

export async function analyzeAll({ news, rawItems, tournaments, cacheFile }) {
  const cache = JSON.parse(await readFile(cacheFile, "utf8").catch(() => '{"topics":{},"tournaments":{},"briefings":{}}'));
  const attach = () => {
    for (const n of news) if (cache.topics[n.id]) n.analysis = cache.topics[n.id].data;
    for (const t of tournaments) if (cache.tournaments[t.id]) t.analysis = cache.tournaments[t.id].data;
  };

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    attach();
    return { enabled: false, reason: "Clé ANTHROPIC_API_KEY absente : analyses désactivées (les anciennes analyses en cache restent affichées).", briefings: cache.briefingsOut || {} };
  }
  client = new Anthropic();
  let budget = MAX_PER_RUN;

  // 1. Sujets d'actu : les plus récents d'abord
  const byId = new Map(rawItems.map(i => [i.url, i]));
  const sigOf = n => hash(`${n.title}|${n.status}|${n.sources.map(s => s.url).sort().join(",")}`);
  const todo = news.filter(n => cache.topics[n.id]?.sig !== sigOf(n)).slice(0, budget);
  budget -= todo.length;
  await pool(todo.map(n => async () => {
    const items = n.sources.map(s => byId.get(s.url)).filter(Boolean);
    const data = await ask("Analyse ce sujet pour un joueur compétitif.", await topicContent(n, items), TOPIC_SCHEMA);
    cache.topics[n.id] = { sig: sigOf(n), at: new Date().toISOString(), data };
  }));
  for (const id of Object.keys(cache.topics)) if (!news.some(n => n.id === id)) delete cache.topics[id];

  // 2. Tournois : refait à chaque nouveau résultat
  const tSig = t => hash(`${t.progress?.done}|${t.stats?.totalGames}|${t.status}`);
  const tTodo = tournaments.filter(t => cache.tournaments[t.id]?.sig !== tSig(t)).slice(0, Math.max(budget, 0));
  budget -= tTodo.length;
  await pool(tTodo.map(t => async () => {
    const data = await ask("Fais le point sur ce tournoi pour un fan qui veut l'essentiel.", tournamentContent(t), TOURNAMENT_SCHEMA, "high");
    cache.tournaments[t.id] = { sig: tSig(t), at: new Date().toISOString(), data };
  }));

  attach();

  // 3. L'essentiel par jeu : au plus toutes les 3 heures, et seulement si les sujets ont changé
  const briefings = cache.briefingsOut || {};
  for (const game of Object.keys(GAME_NAMES)) {
    const topics = news.filter(n => n.game === game && n.analysis && (Date.now() - new Date(n.date)) / 864e5 <= 10).slice(0, 25);
    if (!topics.length) continue;
    const sig = hash(topics.map(n => n.id).join(",") + tournaments.filter(t => t.game === game).map(tSig).join(","));
    const prev = cache.briefings[game];
    if (prev?.sig === sig || (prev && Date.now() - new Date(prev.at) < 3 * 3600e3) || budget <= 0) continue;
    budget--;
    const content = [
      `Jeu : ${GAME_NAMES[game]}`, "", "Sujets des 10 derniers jours (déjà vérifiés et analysés) :",
      ...topics.map(n => `- [${n.status}, impact ${n.analysis.impact}, ${n.date}] ${n.analysis.titre} — ${n.analysis.essentiel}`),
      ...tournaments.filter(t => t.game === game && t.analysis).map(t => `\nTournoi ${t.name} (${t.status}) : ${t.analysis.resume}`),
    ].join("\n");
    try {
      const data = await ask("Rédige l'essentiel du moment sur ce jeu, à partir de ces sujets uniquement.", content, BRIEFING_SCHEMA, "high");
      cache.briefings[game] = { sig, at: new Date().toISOString() };
      briefings[game] = { ...data, at: new Date().toISOString(), basedOn: topics.length };
    } catch (e) { usage.errors++; console.warn("  ✘ briefing", game, e.message); }
  }
  cache.briefingsOut = briefings;

  await writeFile(cacheFile, JSON.stringify(cache));
  const cost = usage.input * PRICE.in + usage.output * PRICE.out;
  return { enabled: true, model: MODEL, ...usage, costUsd: Math.round(cost * 1000) / 1000, pending: Math.max(0, news.filter(n => !n.analysis).length), briefings };
}
