// État réel du projet, vérifié en direct : ce qui marche, ce qui manque, ce qui attend Anthony.
// Réécrit la partie automatique de coach/ETAT.md (entre les balises AUTO) sans toucher au registre tenu à la main.
// Aucune valeur secrète n'est affichée : seulement les noms des variables et le résultat des appels.
// Usage : node --env-file=.env coach/etat.mjs   (à lancer au début de chaque session, avant d'affirmer quoi que ce soit)

import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

const FILE = new URL("./ETAT.md", import.meta.url);
const WORKER = "https://mindiff-coach.mindiff.workers.dev";
const NEEDED = ["RIOT_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY", "SUPABASE_ANON_KEY", "PILOT_CODE", "GEMINI_API_KEY", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"];
const env = process.env;
const rows = [];
const add = (ok, what, detail) => rows.push({ ok, what, detail });

async function get(url, headers = {}) {
  try {
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    return { status: r.status, body: r.ok ? await r.json().catch(() => null) : null };
  } catch (e) { return { status: 0, error: e.message }; }
}
const sb = path => get(`${env.SUPABASE_URL}/rest/v1/${path}`, { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` });
const day = iso => (iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) : "jamais");

// 1. Secrets présents dans .env (noms seulement)
const missing = NEEDED.filter(k => !env[k]);
add(!missing.length, "Secrets dans .env", missing.length ? `manquent : ${missing.join(", ")}` : `les ${NEEDED.length} sont présents`);

// 2. Clé Riot du .env : un vrai appel (une clé de développement de plus de 24 h répond 401 ou 403)
if (env.RIOT_API_KEY) {
  const r = await get("https://euw1.api.riotgames.com/lol/status/v4/platform-data", { "X-Riot-Token": env.RIOT_API_KEY });
  add(r.status === 200, "Clé Riot (.env)", r.status === 200 ? "acceptée par Riot" : `refusée par Riot (HTTP ${r.status})`);
}

// 3. Service en ligne : /health dit seulement si les secrets sont posés, pas s'ils sont valides
const h = await get(`${WORKER}/api/v1/health`);
add(h.status === 200 && h.body?.riot && h.body?.supabase, "Service en ligne (Worker)", h.status === 200 ? `répond ; secrets posés : Riot ${h.body?.riot ? "oui" : "non"}, Supabase ${h.body?.supabase ? "oui" : "non"}` : `ne répond pas (HTTP ${h.status})`);

// 4. Test privé, d'après la base
if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
  const testers = await sb("pilot_testers?select=revoked_at");
  if (testers.body) {
    const active = testers.body.filter(t => !t.revoked_at).length;
    add(active > 0, "Testeurs inscrits", `${active} actif(s), ${testers.body.length - active} parti(s)`);
  } else add(false, "Base Supabase", `ne répond pas (HTTP ${testers.status})`);
  const goals = await sb("coaching_goals?select=status");
  if (goals.body) {
    const by = goals.body.reduce((m, g) => ((m[g.status] = (m[g.status] || 0) + 1), m), {});
    const done = (by.achieved || 0) + (by.failed || 0) + (by.inconclusive || 0);
    add(done > 0, "Cycles d'objectif terminés", `${done} terminé(s) ; en cours : ${(by.active || 0) + (by.evaluating || 0)} ; proposés pas encore commencés : ${by.proposed || 0}`);
  }
  // La clé posée dans le Worker n'est lisible par personne : la preuve qu'elle marche, c'est une partie récupérée récemment
  // (la synchronisation automatique de chaque heure n'écrit pas dans sync_jobs, seulement dans matches)
  const last = await sb("matches?select=fetched_at&order=fetched_at.desc&limit=1");
  if (last.body) {
    const at = last.body[0]?.fetched_at;
    add(!!at && Date.now() - Date.parse(at) < 48 * 36e5, "Clé Riot du Worker (preuve par l'usage)", at ? `dernière partie récupérée chez Riot : ${day(at)}` : "aucune partie récupérée");
  }
  const ev = await sb("goal_evaluations?select=evaluated_at&order=evaluated_at.desc&limit=1");
  if (ev.body) add(true, "Dernière partie évaluée pour un objectif", day(ev.body[0]?.evaluated_at));
}

// 5. Code publié
try {
  execSync("git fetch -q origin main", { stdio: "ignore" });
  const ahead = Number(execSync("git rev-list --count origin/main..HEAD").toString().trim());
  add(ahead === 0, "Code publié", ahead ? `${ahead} commit(s) de ${execSync("git branch --show-current").toString().trim()} pas encore sur main` : "tout est sur main");
} catch { add(false, "Code publié", "git indisponible"); }

const now = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
const auto = `<!-- AUTO:début -->\n_Vérifié automatiquement le ${now} par \`coach/etat.mjs\`._\n\n| | Point | Constat |\n|---|---|---|\n${rows.map(r => `| ${r.ok ? "✅" : "⚠️"} | ${r.what} | ${r.detail} |`).join("\n")}\n<!-- AUTO:fin -->`;
const md = await readFile(FILE, "utf8");
await writeFile(FILE, md.replace(/<!-- AUTO:début -->[\s\S]*<!-- AUTO:fin -->/, auto));
for (const r of rows) console.log(`${r.ok ? "OK " : "!! "} ${r.what} : ${r.detail}`);
