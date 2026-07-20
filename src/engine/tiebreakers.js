// FIFA World Cup 26™ tiebreaker helpers.
//
// Third-place ranking order after the group stage is:
// 1) points
// 2) goal difference
// 3) goals scored
// 4) fair play conduct
// 5) drawing of lots
//
// The app cannot literally conduct FIFA's drawing of lots, so this module exposes
// a deterministic final fallback for UI/testing only. Do not present that fallback
// as an official FIFA tiebreaker.

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getGoalDifference(team) {
  if (team.goalDifference !== undefined) return num(team.goalDifference);
  if (team.gd !== undefined) return num(team.gd);
  if (team.goalsFor !== undefined && team.goalsAgainst !== undefined) {
    return num(team.goalsFor) - num(team.goalsAgainst);
  }
  if (team.gf !== undefined && team.ga !== undefined) {
    return num(team.gf) - num(team.ga);
  }
  return 0;
}

function getGoalsFor(team) {
  if (team.goalsFor !== undefined) return num(team.goalsFor);
  if (team.gf !== undefined) return num(team.gf);
  return 0;
}

function getFairPlayScore(team) {
  // Use a higher-is-better score if available. If you later store FIFA-style
  // penalty points where lower is better, convert them before calling compare.
  if (team.fairPlayScore !== undefined) return num(team.fairPlayScore);
  return 0;
}

export function normalizeStandingMetrics(team = {}) {
  return {
    ...team,
    points: num(team.points ?? team.pts),
    goalDifference: getGoalDifference(team),
    goalsFor: getGoalsFor(team),
    fairPlayScore: getFairPlayScore(team),
  };
}

export function compareThirdPlaceTeams(a, b, options = {}) {
  const ta = normalizeStandingMetrics(a);
  const tb = normalizeStandingMetrics(b);

  const official =
    tb.points - ta.points ||
    tb.goalDifference - ta.goalDifference ||
    tb.goalsFor - ta.goalsFor ||
    tb.fairPlayScore - ta.fairPlayScore;

  if (official !== 0) return official;

  // Optional non-official deterministic fallback for simulator UX only.
  if (options.tieFallback === "strength") {
    const strength = num(tb.strength ?? tb.ss) - num(ta.strength ?? ta.ss);
    if (strength !== 0) return strength;
  }

  if (options.tieFallback === "fifaRank") {
    const rank = num(ta.fifaRank ?? ta.rank, 9999) - num(tb.fifaRank ?? tb.rank, 9999);
    if (rank !== 0) return rank;
  }

  // Stable deterministic fallback; official rule would be drawing of lots.
  return String(ta.group || "").localeCompare(String(tb.group || ""));
}
