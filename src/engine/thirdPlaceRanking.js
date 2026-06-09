import {
  getThirdPlaceCandidates,
  rankThirdPlaceCandidates,
  selectQualifiedThirds,
} from "./standings";

// Convenience wrapper file so App.jsx can later import third-place logic from one place.
// This file is not wired into the UI yet.

export {
  getThirdPlaceCandidates,
  rankThirdPlaceCandidates,
  selectQualifiedThirds,
};

export function qualifiedThirdGroups(qualifiedThirds) {
  return (qualifiedThirds || [])
    .map(item => item.group)
    .filter(Boolean)
    .sort()
    .join("");
}
