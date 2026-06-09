// FIFA World Cup 26™ Annex C utilities
// Source basis: FIFA World Cup 26™ Regulations, Annexe C, "Combinations for eight best third-placed teams".
// The rendered 495-row table is also mirrored on Wikipedia's 2026 FIFA World Cup knockout-stage/template pages.
//
// This version does not guess or use fallback placement. It can parse the official 495-row matrix
// from rendered table text and validates the expected row count before accepting it.

export const THIRD_PLACE_TARGET_COLUMNS = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"];

// Read-only public mirror of the FIFA Annex C table. Used only by loadAnnexCFromRemote().
export const ANNEX_C_SOURCE_URL =
  "https://en.wikipedia.org/api/rest_v1/page/html/Template:2026_FIFA_World_Cup_third-place_table";

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

function rowToMapping(row) {
  const parts = String(row).trim().split(/\s+/);
  // Format: rowNo + 8 qualifying group letters + 8 assigned third-place tokens.
  // Example: 1 E F G H I J K L 3E 3J 3I 3F 3H 3G 3L 3K
  if (parts.length !== 17) return null;

  const [, ...rest] = parts;
  const qualifiedGroups = rest.slice(0, 8);
  const assignments = rest.slice(8, 16).map(normalizeThirdToken);

  if (!qualifiedGroups.every(g => /^[A-L]$/.test(g))) return null;
  if (!assignments.every(t => /^3[A-L]$/.test(t))) return null;

  const key = qualifiedGroups.slice().sort().join("");
  const mapping = Object.fromEntries(
    THIRD_PLACE_TARGET_COLUMNS.map((column, i) => [column, assignments[i]])
  );

  return { key, mapping };
}

export function parseAnnexCRows(text) {
  const rows = String(text)
    .split(/\r?\n/)
    .map(line => line.trim().replace(/\s+/g, " "))
    .filter(line => /^\d+\s+(?:[A-L]\s+){8}(?:3[A-L]\s+){7}3[A-L]$/.test(line));

  const table = {};
  for (const row of rows) {
    const parsed = rowToMapping(row);
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
  const res = await fetchImpl(ANNEX_C_SOURCE_URL);
  if (!res.ok) throw new Error(`Unable to load Annex C source: HTTP ${res.status}`);

  const html = await res.text();
  let text = html;

  // Browser-friendly HTML-to-text extraction.
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    text = doc.body?.textContent || html;
  } else {
    text = html.replace(/<[^>]+>/g, "\n");
  }

  const parsed = parseAnnexCRows(text);
  return setAnnexCMapping(parsed);
}

// Synchronous getter used by the bracket engine. Before the UI is switched over,
// ANNEX_C can remain unloaded. Once we wire the engine, we will either embed the
// 495-row object directly or load it before calling buildFifa2026Bracket().
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
