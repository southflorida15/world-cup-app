import { compareThirdPlaceTeams, normalizeStandingMetrics } from "./tiebreakers";

// Shared standings model for both future modes:
// 1) Simulation mode: user drags teams and edits points/GD/GF.
// 2) Official mode: API data is normalized into the same shape.
//
// Standard row shape:
// {
//   group: "A",
//   team: "Mexico",
//   position: 1,
//   played: 3,
//   wins: 2,
//   draws: 1,
//   losses: 0,
//   goalsFor: 5,
//   goalsAgainst: 2,
//   goalDifference: 3,
//   points: 7,
//   source: "simulation" | "official"
// }

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function metricKey(group, team) {
  return `${String(group).toUpperCase()}|${team}`;
}

function normalizeGroupLetter(group) {
  return String(group || "").replace(/^Group\s+/i, "").toUpperCase();
}

export function defaultStandingMetrics(position = 1) {
  // Sensible defaults for simulation mode before users edit points/GD/GF.
  // Higher group position starts with better default metrics, but these are only placeholders.
  const defaultsByPosition = {
    1: { points: 7, goalsFor: 5, goalsAgainst: 1 },
    2: { points: 5, goalsFor: 4, goalsAgainst: 2 },
    3: { points: 4, goalsFor: 3, goalsAgainst: 3 },
    4: { points: 1, goalsFor: 1, goalsAgainst: 5 },
  };
  const base = defaultsByPosition[position] || defaultsByPosition[4];
  return {
    played: 3,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: base.goalsFor,
    goalsAgainst: base.goalsAgainst,
    goalDifference: base.goalsFor - base.goalsAgainst,
    points: base.points,
  };
}

export function normalizeStandingRow(row = {}, fallback = {}) {
  const gf = toNumber(row.goalsFor ?? row.gf ?? row.for ?? fallback.goalsFor);
  const ga = toNumber(row.goalsAgainst ?? row.ga ?? row.against ?? fallback.goalsAgainst);
  const gd = row.goalDifference ?? row.gd;

  return normalizeStandingMetrics({
    ...fallback,
    ...row,
    group: normalizeGroupLetter(row.group ?? fallback.group),
    team: row.team ?? row.name ?? fallback.team,
    position: toNumber(row.position ?? row.rank ?? fallback.position, fallback.position ?? 0),
    played: toNumber(row.played ?? row.mp ?? row.p ?? fallback.played),
    wins: toNumber(row.wins ?? row.w ?? fallback.wins),
    draws: toNumber(row.draws ?? row.d ?? fallback.draws),
    losses: toNumber(row.losses ?? row.l ?? fallback.losses),
    goalsFor: gf,
    goalsAgainst: ga,
    goalDifference: gd !== undefined ? toNumber(gd) : gf - ga,
    points: toNumber(row.points ?? row.pts ?? fallback.points),
    source: row.source ?? fallback.source ?? "simulation",
  });
}

export function createSimulationStandings(groups, metricsByTeam = {}) {
  return Object.entries(groups || {}).flatMap(([group, teams]) =>
    (teams || []).map((team, idx) => {
      const position = idx + 1;
      const byName = metricsByTeam[team] || {};
      const byGroupAndName = metricsByTeam[metricKey(group, team)] || {};
      return normalizeStandingRow(
        {
          ...defaultStandingMetrics(position),
          ...byName,
          ...byGroupAndName,
          group,
          team,
          position,
          source: "simulation",
        },
        { group, team, position, source: "simulation" }
      );
    })
  );
}

export function standingsRowsToGroups(standingsRows) {
  const grouped = {};
  for (const row of standingsRows || []) {
    const normalized = normalizeStandingRow(row);
    if (!normalized.group || !normalized.team) continue;
    if (!grouped[normalized.group]) grouped[normalized.group] = [];
    grouped[normalized.group].push(normalized);
  }

  return Object.fromEntries(
    Object.entries(grouped).map(([group, rows]) => [
      group,
      rows
        .slice()
        .sort((a, b) => a.position - b.position)
        .map(row => row.team),
    ])
  );
}

export function getThirdPlaceRows(standingsRows) {
  const byGroup = {};
  for (const row of standingsRows || []) {
    const normalized = normalizeStandingRow(row);
    if (!normalized.group || !normalized.team) continue;
    if (!byGroup[normalized.group]) byGroup[normalized.group] = [];
    byGroup[normalized.group].push(normalized);
  }

  return Object.entries(byGroup)
    .map(([group, rows]) => {
      const third = rows.slice().sort((a, b) => a.position - b.position)[2];
      return third ? { ...third, group, position: 3 } : null;
    })
    .filter(Boolean);
}

export function rankThirdPlaceRows(thirdRows, options = {}) {
  return (thirdRows || []).slice().sort((a, b) => compareThirdPlaceTeams(a, b, options));
}

export function selectQualifiedThirdRows(standingsRows, options = {}) {
  return rankThirdPlaceRows(getThirdPlaceRows(standingsRows), options).slice(0, 8);
}

export function toQualifiedThirds(qualifiedRows) {
  return (qualifiedRows || []).map(row => ({
    group: normalizeGroupLetter(row.group),
    team: row.team,
    points: row.points,
    goalDifference: row.goalDifference,
    goalsFor: row.goalsFor,
  }));
}

export function buildSimulationBracketInput(groups, metricsByTeam = {}, options = {}) {
  const standings = createSimulationStandings(groups, metricsByTeam);
  const qualifiedThirdRows = selectQualifiedThirdRows(standings, options);
  return {
    mode: "simulation",
    groups: standingsRowsToGroups(standings),
    standings,
    qualifiedThirdRows,
    qualifiedThirds: toQualifiedThirds(qualifiedThirdRows),
  };
}

export function normalizeOfficialStandings(apiRows = []) {
  // This is intentionally permissive because football APIs vary widely.
  // We will adapt the mapper once the official standings endpoint is wired.
  return (apiRows || []).map((row, idx) => normalizeStandingRow({
    group: row.group ?? row.groupName ?? row.league?.group,
    team: row.team ?? row.teamName ?? row.name ?? row.team?.name,
    position: row.position ?? row.rank ?? idx + 1,
    played: row.played ?? row.all?.played,
    wins: row.wins ?? row.all?.win,
    draws: row.draws ?? row.all?.draw,
    losses: row.losses ?? row.all?.lose,
    goalsFor: row.goalsFor ?? row.all?.goals?.for,
    goalsAgainst: row.goalsAgainst ?? row.all?.goals?.against,
    goalDifference: row.goalDifference ?? row.goalsDiff,
    points: row.points,
    source: "official",
  }));
}

export function buildOfficialBracketInput(apiRows, options = {}) {
  const standings = normalizeOfficialStandings(apiRows);
  const qualifiedThirdRows = selectQualifiedThirdRows(standings, options);
  return {
    mode: "official",
    groups: standingsRowsToGroups(standings),
    standings,
    qualifiedThirdRows,
    qualifiedThirds: toQualifiedThirds(qualifiedThirdRows),
  };
}
