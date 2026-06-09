import { compareThirdPlaceTeams, normalizeStandingMetrics } from "./tiebreakers";

export function getGroupPodium(groups) {
  return Object.fromEntries(
    Object.entries(groups || {}).map(([group, teams]) => [
      group,
      {
        winner: teams?.[0] || null,
        runnerUp: teams?.[1] || null,
        third: teams?.[2] || null,
        fourth: teams?.[3] || null,
      },
    ])
  );
}

export function getThirdPlaceCandidates(groups, metricsByTeam = {}) {
  return Object.entries(groups || {})
    .map(([group, teams]) => {
      const team = teams?.[2] || null;
      if (!team) return null;
      const metrics = metricsByTeam[team] || {};
      return normalizeStandingMetrics({
        group,
        team,
        position: 3,
        ...metrics,
      });
    })
    .filter(Boolean);
}

export function rankThirdPlaceCandidates(candidates, options = {}) {
  return [...(candidates || [])].sort((a, b) => compareThirdPlaceTeams(a, b, options));
}

export function selectQualifiedThirds(groups, options = {}) {
  const candidates = getThirdPlaceCandidates(groups, options.metricsByTeam || {});
  return rankThirdPlaceCandidates(candidates, options).slice(0, 8);
}
