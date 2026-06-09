// FIFA World Cup 26™ Annex C utilities
// Source basis: FIFA World Cup 26™ Regulations, Annexe C, "Combinations for eight best third-placed teams".
// The rendered 495-row table is mirrored on Wikipedia's 2026 FIFA World Cup knockout-stage/template pages.
//
// This version intentionally does NOT guess. It loads/parses the published 495-row matrix and
// validates the expected row count before accepting it. The parser is token-based rather than
// line-based because browser HTML text extraction may collapse table rows without reliable newlines.

export const THIRD_PLACE_TARGET_COLUMNS = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"];

// Vercel proxy. Avoid direct browser fetches to Wikipedia.
export const ANNEX_C_SOURCE_URL = "/api/annexc";

let annexCStore = {};

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

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function rowToMappingFromTokens(tokens) {
  // Format: rowNo + 8 qualifying group letters + 8 assigned third-place tokens.
  // Example: 1 E F G H I J K L 3E 3J 3I 3F 3H 3G 3L 3K
  if (!tokens || tokens.length !== 17) return null;

  const qualifiedGroups = tokens.slice(1, 9);
  const assignments = tokens.slice(9, 17).map(normalizeThirdToken);

  if (!qualifiedGroups.every(g => /^[A-L]$/.test(g))) return null;
  if (!assignments.every(t => /^3[A-L]$/.test(t))) return null;

  const key = qualifiedGroups.slice().sort().join("");
  const mapping = Object.fromEntries(
    THIRD_PLACE_TARGET_COLUMNS.map((column, i) => [column, assignments[i]])
  );

  return { key, mapping };
}

export function parseAnnexCRows(input) {
  const text = stripHtml(input);

  // Match every row anywhere in the text, not just at line starts. This survives HTML/table
  // rendering where newlines are lost. Each row contains:
  // rowNumber, 8 group letters, then 8 third-place assignments.
  const rowPattern = /\b(\d{1,3})\s+([A-L])\s+([A-L])\s+([A-L])\s+([A-L])\s+([A-L])\s+([A-L])\s+([A-L])\s+([A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\s+(3[A-L])\b/g;

  const table = {};
  let match;
  while ((match = rowPattern.exec(text)) !== null) {
    const tokens = match.slice(1);
    const rowNumber = Number(tokens[0]);
    if (!Number.isInteger(rowNumber) || rowNumber < 1 || rowNumber > 495) continue;

    const parsed = rowToMappingFromTokens(tokens);
    if (parsed) table[parsed.key] = parsed.mapping;
  }

  return table;
}

export function setAnnexCMapping(table) {
  const entries = Object.entries(table || {});
  if (entries.length !== 495) {
    throw new Error(`Expected 495 Annex C combinations, received ${entries.length}.`);
  }

  annexCStore = Object.fromEntries(
    entries.map(([key, mapping]) => [
      key.split("").sort().join(""),
      Object.fromEntries(
        THIRD_PLACE_TARGET_COLUMNS.map(column => [column, normalizeThirdToken(mapping[column])])
      )
    ])
  );

  return annexCStore;
}

export async function loadAnnexCFromRemote(fetchImpl = fetch) {
  const res = await fetchImpl(ANNEX_C_SOURCE_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Unable to load Annex C source: HTTP ${res.status}`);

  const contentType = res.headers?.get?.("content-type") || "";

  // Support either raw HTML/text or a future JSON proxy response.
  if (contentType.includes("application/json")) {
    const json = await res.json();
    if (json?.annexC && typeof json.annexC === "object") {
      return setAnnexCMapping(json.annexC);
    }
    if (typeof json?.text === "string" || typeof json?.html === "string") {
      const parsed = parseAnnexCRows(json.text || json.html);
      return setAnnexCMapping(parsed);
    }
    throw new Error("Annex C JSON response did not include annexC, text, or html.");
  }

  const raw = await res.text();
  const parsed = parseAnnexCRows(raw);
  return setAnnexCMapping(parsed);
}

// Synchronous getter used by the bracket engine after loadAnnexCFromRemote() succeeds.
export const ANNEX_C = annexCStore;

export function getAnnexCMapping(qualifiedThirds) {
  const key = thirdGroupsKey(qualifiedThirds);
  const mapping = annexCStore[key];

  if (!mapping) {
    throw new Error(
      `Annex C mapping not loaded for third-place group combination ${key}. ` +
      `Load the complete 495-row Annex C table before switching the UI to the new engine.`
    );
  }

  return mapping;
}

export function getLoadedAnnexCCount() {
  return Object.keys(annexCStore).length;
}
