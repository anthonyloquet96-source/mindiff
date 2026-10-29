// Crée une fois la paire de clés VAPID des notifications et l'ajoute à ../.env (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY),
// sans l'afficher. Ne fait rien si elles existent déjà : en changer désabonnerait tous les appareils.
//   node worker/vapid-keys.mjs   puis   node worker/put-secrets.mjs

import { readFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { b64u } from "./webpush.mjs";

const file = fileURLToPath(new URL("../.env", import.meta.url));
const env = readFileSync(file, "utf8");
if (/^VAPID_PRIVATE_KEY=./m.test(env)) { console.log("Clés VAPID déjà présentes dans .env : rien à faire."); process.exit(0); }
const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const pub = b64u.enc(await crypto.subtle.exportKey("raw", kp.publicKey)), d = (await crypto.subtle.exportKey("jwk", kp.privateKey)).d;
appendFileSync(file, `${env.endsWith("\n") ? "" : "\n"}VAPID_PUBLIC_KEY=${pub}\nVAPID_PRIVATE_KEY=${d}\n`);
console.log("Clés VAPID créées et ajoutées à .env.");
