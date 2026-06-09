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

export function getThirdPlaceCandidates(groups) {
  return Object.entries(groups || {}).map(([group, teams]) => ({
    group,
    team: teams?.[2] || null,
  })).filter(x => x.team);
}
