/* MINDIFF — contrôle administrateur du coach (lecture seule).
   Les actions (valider, contester, retirer, corriger) passent par node coach/admin.mjs, qui les historise. */
const e = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const day = d => (d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—");
const chip = (t, c = "") => `<span class="chip ${c}">${e(t)}</span>`;
const ST = { exploitable: ["exploitable", "official"], provisoire: ["provisoire", "warn"], contradictoire: ["contradictoire", "bad"], "a-revalider": ["à revalider", "warn"], obsolete: ["obsolète", "bad"], retire: ["retirée", "bad"] };

(async () => {
  const get = u => fetch(`${u}?t=${Date.now()}`).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const [kb, adm] = await Promise.all([get("data/coach.json"), get("data/coach-admin.json")]);
  const root = document.getElementById("adm");
  if (!kb || !adm) { root.innerHTML = `<p class="inline-empty">Données du coach indisponibles (lancez node coach/build.mjs).</p>`; return; }
  const by = s => kb.units.filter(u => u.status === s).length;
  const table = (cols, rows) => `<div class="tablewrap"><table><thead><tr>${cols.map(c => `<th>${e(c)}</th>`).join("")}</tr></thead><tbody>${rows.join("") || `<tr><td colspan="${cols.length}" class="fine">Rien à signaler.</td></tr>`}</tbody></table></div>`;
  root.innerHTML = `
    <header class="page-head"><p class="label">Hors parcours joueur</p><h1 class="page-title">Contrôle du coach</h1>
      <p class="fine">Base publiée ${day(kb.generatedAt)} · patch ranked ${e(kb.currentPatch)} · version client des compétitions ${e(kb.competitionVersion)} · règles ${e(kb.rules.version)} ${adm.rulesLock.ok ? chip("verrouillées", "official") : chip("modifiées sans validation : " + adm.rulesLock.changed.join(", "), "bad")}</p></header>
    <dl class="kpis">${[["Exploitables", by("exploitable")], ["Provisoires", by("provisoire")], ["Contradictoires", by("contradictoire")], ["À revalider", by("a-revalider")], ["Obsolètes", by("obsolete")], ["Retirées", by("retire")], ["Relecture en attente", adm.review.length], ["Coût du mois", adm.costs.month.toFixed(3) + " $"]].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
    <p class="fine">Modèle : ${e(adm.costs.model)} · budget ${adm.costs.budget.day} $/jour, ${adm.costs.budget.month} $/mois · aujourd'hui : ${adm.costs.today.toFixed(3)} $ · ${adm.costs.calls.length} appel(s) récent(s).</p>

    <section class="sec"><h2 class="sec-title">Sources retenues</h2>${table(["Source", "Accès", "Crédibilité", "Découverte", "Statut"], kb.sources.map(s => { const d = adm.discovery[s.id]; return `<tr><td><b>${e(s.name)}</b><br><span class="fine">${e(s.author)} · ${s.langs.join(", ")}</span></td><td>${e(s.access.mode)}<br><span class="fine">${e(s.access.detail)}</span></td><td>${e(s.credibility.level)}</td><td>${d ? (d.lastError ? chip("échec", "bad") + `<br><span class="fine">${e(d.lastError)} · nouvel essai ${day(d.nextTry)}</span>` : `${day(d.lastOk)} · ${d.lastCount} éléments`) : "—"}</td><td>${s.active ? "active" : chip("inactive", "soft")}</td></tr>`; }))}</section>

    <section class="sec"><h2 class="sec-title">Analyses : en attente, échecs, quarantaine, rejets</h2>
      ${table(["Contenu", "État", "Détail"], [
        ...adm.pending.map(id => `<tr><td>${e(id)}</td><td>${chip("en attente", "warn")}</td><td class="fine">Analyse au prochain passage (clé API requise).</td></tr>`),
        ...adm.failures.map(f => `<tr><td>${e(f.id)}</td><td>${chip("échec", "bad")}</td><td class="fine">${e(f.error)} · ${e(f.at)}</td></tr>`),
        ...adm.quarantine.map(q => `<tr><td>${e(q.id)}</td><td>${chip("quarantaine", "bad")}</td><td class="fine">${e(JSON.stringify(q.match))}</td></tr>`),
        ...adm.rejected.map(r => `<tr><td>${e(r.id)}</td><td>${chip("unité rejetée", "bad")}</td><td class="fine">${r.reasons.map(x => e(`${x.code} — ${x.why}`)).join("<br>")}</td></tr>`),
      ])}
      <p class="fine">${kb.contents.filter(c => c.access === "metadonnees").length} vidéos en métadonnées seules (non analysées, pas de transcription autorisée).</p></section>

    <section class="sec"><h2 class="sec-title">Unités de connaissance</h2>${table(["Unité", "Statut", "Nature", "Relecture", "Signalements"], kb.units.map(u => `<tr><td><b>${e(u.id)}</b> <span class="fine">${u.version ? `v${u.version}` : ""}</span><br><span class="fine">${e(u.claim.slice(0, 140))}${u.claim.length > 140 ? "…" : ""}</span></td><td>${chip(...(ST[u.status] || [u.status]))}</td><td>${e(u.nature)}</td><td>${e(u.review.human)}${u.review.reason ? `<br><span class="fine">${e(u.review.reason)}</span>` : ""}</td><td class="fine">${(u.flags || []).map(f => e(f.code)).join(", ") || "—"}</td></tr>`))}</section>

    <section class="sec"><h2 class="sec-title">Recommandations contestées et retirées</h2>${table(["Unité", "Décision", "Par", "Raison"], [...adm.contested.map(c => `<tr><td>${e(c.id)}</td><td>contestée</td><td>${e(c.by)}</td><td>${e(c.reason)}</td></tr>`), ...adm.retired.map(c => `<tr><td>${e(c.id)}</td><td>retirée</td><td>${e(c.by)}</td><td>${e(c.reason)}</td></tr>`)])}</section>

    <section class="sec"><h2 class="sec-title">Historique des corrections et des statuts</h2>${table(["Date", "Unité", "Changement", "Par / raison"], [
      ...adm.corrections.map(c => `<tr><td>${day(c.at)}</td><td>${e(c.unit)}</td><td>${e(c.action)}${c.field ? ` · ${e(c.field)}` : ""}</td><td>${e(c.by)} · ${e(c.reason)}</td></tr>`),
      ...adm.statusLog.map(s => `<tr><td>${day(s.at)}</td><td>${e(s.unit)}</td><td>${e(s.from)} → ${e(s.to)}</td><td class="fine">${e(s.why)}</td></tr>`),
    ].reverse())}</section>

    <section class="sec"><h2 class="sec-title">Commandes</h2><pre>node coach/admin.mjs statut
node coach/admin.mjs valider   &lt;unité&gt; "&lt;nom&gt;"
node coach/admin.mjs contester &lt;unité&gt; "&lt;nom&gt;" "&lt;raison&gt;"
node coach/admin.mjs retirer   &lt;unité&gt; "&lt;nom&gt;" "&lt;raison&gt;"
node coach/admin.mjs corriger  &lt;unité&gt; &lt;champ&gt; "&lt;valeur&gt;" "&lt;nom&gt;" "&lt;raison&gt;"
node coach/import-transcript.mjs &lt;contenu&gt; &lt;fichier.srt|vtt|txt&gt; --par "&lt;nom&gt;" --provenance "&lt;origine et droit d'usage&gt;"
node coach/build.mjs</pre></section>`;
})();
