// Import administrateur d'une transcription (SRT, VTT ou texte) fournie pour cet usage, avec sa provenance.
// La transcription reste dans le cache privé (jamais publiée) ; le contenu passe en « en attente » pour l'analyse.
// Usage : node coach/import-transcript.mjs <id-contenu> <fichier> --par "<nom>" --provenance "<d'où vient le fichier et quel droit d'usage>"
//         [--visuel <dossier d'images extraites>]   (seulement si des images ont réellement été extraites, voir frames.mjs)

import { readFile, readdir } from "node:fs/promises";
import { P, readJson, writeJson, saveText, today } from "./lib.mjs";

// SRT / VTT → lignes « [hh:mm:ss] texte » ; les horodatages viennent du fichier, jamais d'une estimation
export function parseCaptions(raw) {
  const out = [];
  let stamp = null;
  for (const line of raw.replace(/\r/g, "").split("\n")) {
    const t = line.match(/^(\d{1,2}:)?(\d{2}):(\d{2})[.,]\d{3}\s+-->/);
    if (t) { stamp = `${(t[1] || "00:").replace(":", "").padStart(2, "0")}:${t[2]}:${t[3]}`; continue; }
    if (!line.trim() || /^\d+$/.test(line.trim()) || /^WEBVTT|^NOTE|^Kind:|^Language:/.test(line)) continue;
    const text = line.replace(/<[^>]+>/g, "").trim();
    if (text) out.push(stamp ? `[${stamp}] ${text}` : text);
  }
  return out.join("\n");
}

if (process.argv[1]?.endsWith("import-transcript.mjs")) {
  const [id, file] = process.argv.slice(2);
  const opt = k => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : null; };
  const by = opt("par"), provenance = opt("provenance"), visuel = opt("visuel");
  if (!id || !file || !by || !provenance) {
    console.error('Usage : node coach/import-transcript.mjs <id-contenu> <fichier> --par "<nom>" --provenance "<origine et droit d\'usage>"');
    process.exit(1);
  }

  const contents = await readJson(P.contents);
  const c = contents.contents.find(x => x.id === id);
  if (!c) { console.error(`Contenu inconnu : ${id}. Lancez d'abord la découverte, ou ajoutez le contenu au registre.`); process.exit(1); }
  const raw = await readFile(file, "utf8");
  const text = /-->/.test(raw) ? parseCaptions(raw) : raw;
  const sha = await saveText(id, text);
  let frames = null;
  if (visuel) frames = (await readdir(visuel)).filter(f => /\.(png|jpe?g)$/i.test(f));
  Object.assign(c, {
    access: frames?.length ? "transcription+visuel" : "transcription",
    analysis: "en-attente", attempts: 0,
    transcript: { importedAt: today(), by, provenance, file: file.split(/[\\/]/).pop(), sha256: sha, timestamped: /^\[\d{2}:\d{2}:\d{2}\]/m.test(text), frames: frames ? { dir: visuel, count: frames.length } : null },
    note: frames?.length ? `Transcription et ${frames.length} image(s) importées : seules ces images peuvent servir d'observation visuelle.` : "Transcription importée : rien de ce qui est montré à l'écran ne peut être affirmé.",
  });
  await writeJson(P.contents, contents);
  console.log(`✔ ${id} : ${text.split("\n").length} lignes importées (${c.access}), analyse au prochain passage.`);
}
