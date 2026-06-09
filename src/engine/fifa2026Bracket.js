import { getAnnexCMapping, THIRD_PLACE_TARGET_COLUMNS } from "./annexC";

// Fixed FIFA World Cup 26™ Round-of-32 match numbers.
// Third-place opponents are assigned through Annexe C to the target columns:
// 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L.
export const ROUND_OF_32_TEMPLATE = [
  { match: 73, home: "1C", away: "2F" },
  { match: 74, home: "1E", away: "3?" },
  { match: 75, home: "1F", away: "2C" },
  { match: 76, home: "1K", away: "3?" },
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
  { match: 87, home: "1D", away: "3?", note: "verify against final R32 schedule before activation" },
  { match: 88, home: "2G", away: "2D", note: "verify against final R32 schedule before activation" },
];

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
  const thirdTeamByGroup = Object.fromEntries(qualifiedThirds.map(t => [t.group, t.team]));

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
    r16: [],
    qf: [],
    sf: [],
    final: [],
  };
}
