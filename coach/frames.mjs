// Extraction d'images à des instants précis d'une vidéo locale, pour une analyse visuelle réelle.
// Uniquement sur un fichier que vous avez le droit d'utiliser (vos propres parties enregistrées,
// ou une vidéo fournie par son auteur pour cet usage). Aucun téléchargement depuis YouTube.
// Dépendance : ffmpeg (https://ffmpeg.org) dans le PATH.
// Usage : node coach/frames.mjs <vidéo locale> <dossier de sortie> <instant> [<instant>…]   (instants en hh:mm:ss)
//         --rafale 4   : 4 images par seconde autour de chaque instant (actions rapides : une image isolée ne suffit pas)

import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const [video, out, ...rest] = process.argv.slice(2);
const ri = rest.indexOf("--rafale");
const burst = ri >= 0 ? Number(rest[ri + 1]) : 0;
const stamps = rest.filter((x, i) => /^\d{1,2}:\d{2}:\d{2}$/.test(x) && i !== ri + 1);
if (!video || !out || !stamps.length) { console.error("Usage : node coach/frames.mjs <vidéo> <dossier> <hh:mm:ss>… [--rafale N]"); process.exit(1); }
if (spawnSync("ffmpeg", ["-version"]).error) {
  console.error("ffmpeg est introuvable : installez-le (winget install Gyan.FFmpeg) puis relancez. Aucune image n'a été extraite, aucune analyse visuelle n'est possible.");
  process.exit(2);
}
mkdirSync(out, { recursive: true });
for (const t of stamps) {
  const name = t.replace(/:/g, "-");
  const args = burst
    ? ["-y", "-ss", t, "-t", "2", "-i", video, "-vf", `fps=${burst}`, `${out}/${name}-%02d.png`]
    : ["-y", "-ss", t, "-i", video, "-frames:v", "1", `${out}/${name}.png`];
  const r = spawnSync("ffmpeg", args, { stdio: "ignore" });
  console.log(r.status === 0 ? `✔ ${t}` : `✘ ${t} (ffmpeg ${r.status})`);
}
console.log("Les images extraites sont les seuls éléments visuels observables : ne rien conclure sur ce qui se passe entre elles.");
