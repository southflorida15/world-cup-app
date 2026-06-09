// Placeholder for official FIFA group and third-place tiebreakers.
// We will wire this after the bracket engine is safely isolated.
export function compareThirdPlaceTeams(a, b) {
  return (
    (b.points ?? 0) - (a.points ?? 0) ||
    (b.goalDifference ?? 0) - (a.goalDifference ?? 0) ||
    (b.goalsFor ?? 0) - (a.goalsFor ?? 0) ||
    (b.fairPlayScore ?? 0) - (a.fairPlayScore ?? 0) ||
    (a.fifaRank ?? 9999) - (b.fifaRank ?? 9999)
  );
}
