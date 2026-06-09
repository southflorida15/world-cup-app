import { getAnnexCMapping, THIRD_PLACE_TARGET_COLUMNS, thirdGroupsKey } from "./annexC";

// Fixed FIFA World Cup 26™ Round-of-32 match structure.
// Third-place opponents are assigned through Annexe C to the target columns:
// 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L.
export const ROUND_OF_32_TEMPLATE = [
  { match: 73, home: "2A", away: "2B" },
  { match: 74, home: "1E", away: "3?" },
  { match: 75, home: "1F", away: "2C" },
  { match: 76, home: "1C", away: "2F" },
  { match: 77, home: "1I", away: "3?" },
  { match: 78, home: "2E", away: "2I" },
  { match: 79, home: "1A", away: "3?" },
  { match: 80, home: "1L", away: "3?" },
  { match: 81, home: "1D", away: "3?" },
  { match: 82, home: "1G", away: "3?" },
  { match: 83, home: "2K", away: "2L" },
  { match: 84, home: "1H", away: "2J" },
  { match: 85, home: "1B", away: "3?" },
  { match: 86, home: "1J", away: "2H" },
  { match: 87, home: "1K", away: "3?" },
  { match: 88, home: "2D", away: "2G" },
];

export const ROUND_OF_16_TEMPLATE = [
  { match: 89, home: "W74", away: "W77" },
  { match: 90, home: "W73", away: "W75" },
  { match: 91, home: "W76", away: "W78" },
  { match: 92, home: "W79", away: "W80" },
  { match: 93, home: "W83", away: "W84" },
  { match: 94, home: "W81", away: "W82" },
  { match: 95, home: "W86", away: "W88" },
  { match: 96, home: "W85", away: "W87" },
];

export const QUARTER_FINAL_TEMPLATE = [
  { match: 97, home: "W89", away: "W90" },
  { match: 98, home: "W93", away: "W94" },
  { match: 99, home: "W91", away: "W92" },
  { match: 100, home: "W95", away: "W96" },
];

export const SEMI_FINAL_TEMPLATE = [
  { match: 101, home: "W97", away: "W98" },
  { match: 102, home: "W99", away: "W100" },
];

export const FINAL_TEMPLATE = [{ match: 104, home: "W101", away: "W102" }];

/**
 * Returns all 12 third-place teams from the current manual group order.
 * Expected groups shape: { A: [team1, team2, team3, team4], ... }
 */
export function getAllThirdPlaceTeams(groups) {
  if (!groups || typeof groups !== "object") return [];

  return Object.entries(groups).map(([group, teams]) => ({
    group: String(group).toUpperCase(),
    team: teams?.[2] || null,
  })).filter(item => item.team);
}

/**
 * Converts the current UI state format:
 *   selectedThirdTeams = ["Mexico", "Japan", ...]
 * into the FIFA engine format:
 *   [{ group: "A", team: "Mexico" }, ...]
 */
export function buildQualifiedThirdsFromSelectedTeams(groups, selectedThirdTeams) {
  const allThirds = getAllThirdPlaceTeams(groups);
  const selected = Array.isArray(selectedThirdTeams) ? selectedThirdTeams : [];

  return selected
    .map(team => allThirds.find(item => item.team === team))
    .filter(Boolean);
}

/**
 * Convenience helper for debugging Annex C input.
 * Example output: "ABDEHIKL"
 */
export function buildThirdGroupsKey(groups, selectedThirdTeams) {
  return thirdGroupsKey(buildQualifiedThirdsFromSelectedTeams(groups, selectedThirdTeams));
}

export function resolveSlot(slot, groups, thirdTeamByGroup = {}) {
  if (!slot || slot === "TBD") return "TBD";

  if (slot.startsWith("1")) return groups?.[slot[1]]?.[0] || slot;
  if (slot.startsWith("2")) return groups?.[slot[1]]?.[1] || slot;
  if (slot.startsWith("3")) return thirdTeamByGroup?.[slot[1]] || slot;

  return slot;
}

export function buildFifa2026RoundOf32({ groups, qualifiedThirds }) {
  if (!groups) throw new Error("groups is required");
  if (!Array.isArray(qualifiedThirds) || qualifiedThirds.length !== 8) {
    throw new Error("qualifiedThirds must be an array of exactly 8 { group, team } objects.");
  }

  const annex = getAnnexCMapping(qualifiedThirds);
  const thirdTeamByGroup = Object.fromEntries(
    qualifiedThirds.map(t => [String(t.group).toUpperCase(), t.team])
  );

  return ROUND_OF_32_TEMPLATE.map(match => {
    let awaySlot = match.away;
    if (awaySlot === "3?") {
      const target = match.home;
      if (!THIRD_PLACE_TARGET_COLUMNS.includes(target)) {
        throw new Error(`No Annex C third-place assignment column for ${target}.`);
      }
      awaySlot = annex[target];
    }

    return {
      ...match,
      homeSlot: match.home,
      awaySlot,
      home: resolveSlot(match.home, groups, thirdTeamByGroup),
      away: resolveSlot(awaySlot, groups, thirdTeamByGroup),
    };
  });
}

export function buildFifa2026Bracket({ groups, qualifiedThirds }) {
  return {
    r32: buildFifa2026RoundOf32({ groups, qualifiedThirds }),
    r16: ROUND_OF_16_TEMPLATE,
    qf: QUARTER_FINAL_TEMPLATE,
    sf: SEMI_FINAL_TEMPLATE,
    final: FINAL_TEMPLATE,
  };
}
