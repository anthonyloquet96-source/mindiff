// Pose les secrets du Worker depuis ../.env, sans jamais les afficher : à lancer par Anthony, depuis la racine du projet :
//   node worker/put-secrets.mjs
// Secrets : RIOT_API_KEY (clé personnelle, app 897844), SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, PILOT_CODE.
// GEMINI_API_KEY n'est pas envoyé : aucune donnée de testeur ne doit partir vers l'offre gratuite de Gemini.

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const env = Object.fromEntries(readFileSync(`${root}.env`, "utf8").split(/\r?\n/).map(l => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map(m => [m[1], m[2].trim()]));
const NAMES = ["RIOT_API_KEY", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_KEY", "PILOT_CODE"];
const missing = NAMES.filter(n => !env[n]);
if (missing.length) { console.error(`Manquant dans .env : ${missing.join(", ")}`); process.exit(1); }
for (const name of NAMES) {
  const r = spawnSync("npx", ["wrangler", "secret", "put", name], { cwd: `${root}worker`, input: env[name], encoding: "utf8", shell: true });
  console.log(`${name} : ${r.status === 0 ? "posé" : `échec\n${(r.stderr || r.stdout).replaceAll(env[name], "***")}`}`);
}
