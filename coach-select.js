/* MINDIFF — sélection des conseils du coach (étape 3, déterministe).
   Règles : coach/prompts/recommandation.v1.md. Utilisé par l'application (navigateur) et par les tests (Node).
   Aucune analyse n'est faite ici : on choisit parmi des connaissances déjà analysées et contrôlées. */
(function (root) {
  "use strict";

  const USABLE = ["exploitable", "provisoire", "contradictoire"];
  const RANKS = [["non-precise", "Non précisé"], ["fer", "Fer"], ["bronze", "Bronze"], ["argent", "Argent"], ["or", "Or"], ["platine", "Platine"], ["emeraude", "Émeraude"], ["diamant", "Diamant"], ["maitre", "Master"], ["grand-maitre", "Grandmaster"], ["challenger", "Challenger"]];

  const ROLES = [["top", "Top"], ["jungle", "Jungle"], ["mid", "Mid"], ["bottom", "ADC"], ["support", "Support"]];
  const MODES = [["solo", "Solo"], ["duo", "Duo"], ["equipe", "Équipe"]];
  const GOALS = [["lane", "Phase de lane"], ["survie", "Positionnement et survie"], ["teamfight", "Combats d'équipe"], ["synergie", "Jeu en duo"], ["methode", "Méthode de travail"], ["vagues", "Gestion des vagues"], ["vision", "Vision"], ["macro", "Macro"], ["jungle", "Jungle"]];
  const TIMES = [[5, "5 min"], [15, "15 min"], [30, "30 min"]];
  const label = (list, v) => (list.find(x => x[0] === v) || [, v])[1];
  const pnum = v => { const m = String(v || "").match(/(\d{1,2})\.(\d{1,2})/); return m ? +m[1] * 100 + +m[2] : 0; };

  const usable = kb => kb.units.filter(u => USABLE.includes(u.status));
  const covers = (u, ch) => u.champions.includes(ch);
  const pairs = (u, ch) => (u.synergy && (u.champions.includes(ch) || u.synergy.with.includes(ch)));

  function coverageFor(kb, profile, champion) {
    const roleCovered = kb.pilot.roles.includes(profile.role);
    const c = kb.coverage.champions[champion];
    return {
      roleCovered, champion,
      championCovered: !!c && !c.partial,
      partial: !!c?.partial,
      themes: c ? c.themes : [],
      note: !roleCovered
        ? `Le coach couvre pour l'instant l'ADC et le support (pilote). Le rôle ${label(ROLES, profile.role)} n'est pas encore couvert : seuls des conseils de méthode, valables pour tous les rôles, sont proposés.`
        : !champion ? "Ajoutez un champion à votre profil pour des conseils propres au champion."
        : !c ? `${champion} n'est pas encore couvert par le coach. Conseils de rôle et de méthode seulement.`
        : c.partial ? `${champion} n'a qu'une couverture partielle : changements de patch seulement, pas encore de conseils de jeu analysés.`
        : c.officialOnly ? `Pour ${champion}, le coach s'appuie pour l'instant sur les conseils officiels de Riot. Les analyses de coachs de haut niveau arrivent au fil de la veille.`
        : null,
    };
  }

  // Alliés et adversaires proposés seulement si la base contient une unité pertinente
  function options(kb, champion, role) {
    const allies = new Set(), opponents = new Set();
    for (const u of usable(kb)) {
      if (u.synergy) {
        if (u.champions.includes(champion)) u.synergy.with.forEach(x => allies.add(x));
        if (u.synergy.with.includes(champion)) u.champions.forEach(x => allies.add(x));
      }
      if (u.matchup?.vs && u.matchup.vs !== champion && (!role || u.roles.includes(role) || u.roles.includes("all"))) opponents.add(u.matchup.vs);
    }
    return { allies: [...allies].sort(), opponents: [...opponents].sort() };
  }

  function score(u, p, champion, o) {
    let s = 0;
    if (champion && covers(u, champion)) s += 6;
    if (champion && pairs(u, champion)) s += 5;
    if (o.ally && u.synergy && (u.synergy.with.includes(o.ally) || u.champions.includes(o.ally))) s += 6;
    if (o.vs && u.matchup?.vs === o.vs) s += 8;
    if (u.roles.includes(p.role)) s += 2; else if (p.role2 && u.roles.includes(p.role2)) s += 1; else if (u.roles.includes("all")) s += 0.5;
    if (u.synergy && (p.mode === "duo" || p.mode === "equipe")) s += 2;
    s += { exploitable: 1, provisoire: 0, contradictoire: -1 }[u.status];
    return s;
  }
  // Un conseil propre à un adversaire n'est retenu que si l'adversaire est renseigné ; une synergie seulement si elle concerne le champion
  const eligible = (u, p, champion, o) => {
    if (u.usage === "correction") return false; // erreur observée à plus bas niveau : jamais une consigne
    if (u.matchup && u.matchup.vs !== o.vs) return false;
    if (u.synergy && !(champion && pairs(u, champion))) return false;
    if (u.champions.length && !(champion && covers(u, champion)) && !u.synergy) return false;
    if (!u.roles.includes(p.role) && !u.roles.includes("all") && !(p.role2 && u.roles.includes(p.role2))) return false;
    return true;
  };

  // Référence unique : Diamant et plus, quel que soit le rang déclaré (le but est de monter)
  function rankBucket() { return "diamant+"; }

  function whyFor(u, p, champion, o) {
    const why = [];
    if (champion && (covers(u, champion) || pairs(u, champion))) why.push(`Vous avez déclaré ${champion} (${label(ROLES, p.role)}).`);
    else if (u.roles.includes("all")) why.push("Conseil de méthode, valable quel que soit le rôle.");
    else why.push(`Conseil de rôle (${label(ROLES, p.role)}).`);
    if (o.ally && u.synergy) why.push(`Vous jouez avec ${o.ally}.`);
    if (o.vs && u.matchup?.vs === o.vs) why.push(`Vous affrontez ${o.vs}.`);
    if (u.relevance?.[p.mode]) why.push(u.relevance[p.mode]);
    if (u.themes.includes(p.goal)) why.push(`Correspond à votre objectif : ${label(GOALS, p.goal).toLowerCase()}.`);
    return why;
  }

  function prepare(kb, p, o = {}) {
    const champion = o.champion || p.champions?.[0] || null;
    const cov = coverageFor(kb, p, champion);
    const list = usable(kb);
    const time = Number(p.time) || 15;

    // A. Ce qui change pour moi : faits officiels de patch sur les champions du profil
    const mine = [champion, ...(p.champions || [])].filter((x, i, a) => x && a.indexOf(x) === i);
    const changes = list.filter(u => u.nature === "officiel" && u.themes.includes("patch") && u.champions.some(c => mine.includes(c)))
      .sort((a, b) => (b.champions.includes(champion) - a.champions.includes(champion)) || pnum(b.patch.value) - pnum(a.patch.value))
      .slice(0, 3);
    const patchesSeen = [...new Set(kb.units.filter(u => u.nature === "officiel" && u.themes.includes("patch") && u.patch.known).map(u => u.patch.value))].sort((a, b) => pnum(a) - pnum(b));

    // B. Objectif : une seule action observable
    const withAction = list.filter(u => u.action && eligible(u, p, champion, o) && !(u.nature === "officiel" && u.themes.includes("patch")));
    const byGoal = withAction.filter(u => u.themes.includes(p.goal)).sort((a, b) => score(b, p, champion, o) - score(a, p, champion, o));
    let goal = byGoal[0] || null, goalNote = null;
    if (!goal) {
      goal = withAction.filter(u => u.themes.includes("methode")).sort((a, b) => score(b, p, champion, o) - score(a, p, champion, o))[0] || null;
      goalNote = `Aucun conseil analysé sur « ${label(GOALS, p.goal).toLowerCase()} »${champion && cov.championCovered ? ` pour ${champion}` : ""} : objectif de méthode proposé à la place.`;
    }

    // C. Plan de jeu : consignes du champion et du rôle, jamais propres à un adversaire non renseigné
    const nPlan = time <= 5 ? 2 : time <= 15 ? 3 : 4;
    const planPool = list.filter(u => u !== goal && eligible(u, p, champion, o) && u.nature !== "statistique" && !(u.nature === "officiel" && u.themes.includes("patch")) && !u.themes.includes("methode"))
      .sort((a, b) => score(b, p, champion, o) - score(a, p, champion, o));
    const plan = planPool.slice(0, nPlan);

    // Statistiques du contexte correspondant au rang déclaré
    const bucket = rankBucket(p.rank);
    const stats = list.filter(u => u.nature === "statistique" && champion && u.champions.includes(champion))
      .map(u => ({ unit: u, line: u.byRank?.[bucket] || u.claim, bucket }));

    // D. Ressource : contenu réellement analysé qui soutient l'objectif ou le plan, article d'abord
    const evid = [goal, ...plan].filter(Boolean).flatMap(u => u.evidence.map(e => ({ u, e })));
    const cand = evid.map(x => ({ ...x, c: kb.contents.find(c => c.id === x.e.content) })).filter(x => x.c && x.c.analysis === "analysee" && x.c.learn);
    cand.sort((a, b) => ((b.c.type === "article") - (a.c.type === "article")) || ((b.u === goal) - (a.u === goal)));
    const resource = cand[0] ? { content: cand[0].c, unit: cand[0].u, passage: cand[0].e } : null;

    return {
      champion, coverage: cov, options: options(kb, champion, p.role), profile: p, opts: o,
      changes, changesNote: changes.length ? null : `Aucun changement officiel identifié pour ${mine.join(", ") || "vos champions"} dans les patchs analysés (${patchesSeen.join(", ") || "aucun"}).`,
      goal: goal ? { unit: goal, why: whyFor(goal, p, champion, o), whenNot: [...(goal.limits || []), ...(goal.conditions || []).map(c => `Si ce n'est pas le cas : ${c.charAt(0).toLowerCase()}${c.slice(1)}`)] } : null,
      goalNote,
      plan: plan.map(u => ({ unit: u, why: whyFor(u, p, champion, o) })),
      stats, resource,
      evidenceIds: [...new Set([...changes, goal, ...plan].filter(Boolean).flatMap(u => u.evidence.map(e => e.content)))],
    };
  }

  const api = { prepare, options, coverageFor, RANKS, ROLES, MODES, GOALS, TIMES, label, USABLE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CoachSelect = api;
})(this);
