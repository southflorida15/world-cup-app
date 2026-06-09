// FIFA World Cup 26™ Annex C utilities
// Source: FIFA World Cup 26™ Regulations, Annexe C, "Combinations for eight best third-placed teams".
// This file intentionally starts with helpers only. The complete 495-row mapping will be added in the next patch.

export const THIRD_PLACE_TARGET_COLUMNS = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"];

export function thirdGroupsKey(qualifiedThirds) {
  const groups = qualifiedThirds
    .map(item => typeof item === "string" ? item : item.group)
    .filter(Boolean)
    .map(g => String(g).replace(/^3/, "").toUpperCase())
    .sort();

  if (groups.length !== 8) {
    throw new Error(`Annex C requires exactly 8 qualified third-place groups; received ${groups.length}.`);
  }

  return groups.join("");
}

export function normalizeThirdToken(token) {
  if (!token) return null;
  const group = String(token).replace(/^3/, "").toUpperCase();
  return `3${group}`;
}

// Placeholder until the complete official 495-row table is loaded.
// Shape will be:
// {
//   "ABCDEFGH": { "1A": "3E", "1B": "3J", ... }
// }
export const ANNEX_C = {};

export function getAnnexCMapping(qualifiedThirds) {
  const key = thirdGroupsKey(qualifiedThirds);
  const mapping = ANNEX_C[key];

  if (!mapping) {
    throw new Error(
      `Annex C mapping not loaded for third-place group combination ${key}. ` +
      `The complete 495-row Annex C table must be added before switching the UI to the new engine.`
    );
  }

  return mapping;
}
