// Suppression RGPD d'un joueur dans une partie partagée (gardée pour un autre joueur inscrit) : son PUUID devient
// « anon-<participantId> » et ses Riot ID, nom d'invocateur et identifiant d'invocateur sont retirés du JSON brut.
// Les autres joueurs gardent leur PUUID : leurs métriques se recalculent comme avant. Sans dépendance Node (Worker).

const DROP = ["riotIdGameName", "riotIdTagline", "summonerName", "summonerId", "profileIcon"];

export function scrubPlayer(raw, puuid) {
  if (!raw?.match) return { raw, changed: false };
  const p = raw.match.info?.participants?.find(x => x.puuid === puuid);
  if (!p) return { raw, changed: false };
  const alias = `anon-${p.participantId}`;
  const swap = list => (Array.isArray(list) ? list.map(x => (x === puuid ? alias : x)) : list);
  const out = structuredClone(raw);
  out.match.metadata.participants = swap(out.match.metadata?.participants);
  for (const x of out.match.info.participants) if (x.puuid === puuid) { x.puuid = alias; for (const k of DROP) delete x[k]; }
  if (out.timeline) {
    if (out.timeline.metadata) out.timeline.metadata.participants = swap(out.timeline.metadata.participants);
    for (const x of out.timeline.info?.participants || []) if (x.puuid === puuid) x.puuid = alias;
  }
  return { raw: out, changed: true };
}

// Une partie stockée ne contient plus le joueur (retiré après une suppression de compte) : il faut la relire chez Riot
export const hasPlayer = (raw, puuid) => !!raw?.match?.info?.participants?.some(x => x.puuid === puuid);
