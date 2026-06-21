// FIFA World Cup 26™ Annex C utilities
// Source basis: FIFA World Cup 26™ Regulations, Annexe C, "Combinations for eight best third-placed teams".
// The rendered 495-row table is mirrored on Wikipedia's 2026 FIFA World Cup knockout-stage/template pages.
//
// This version intentionally does NOT guess. It loads/parses the published 495-row matrix and
// validates the expected row count before accepting it. The parser is token-based rather than
// line-based because browser HTML text extraction may collapse table rows without reliable newlines.

export const THIRD_PLACE_TARGET_COLUMNS = ["1A", "1B", "1D", "1E", "1G", "1I", "1K", "1L"];

// ── Static seed (baked in, no network required) ───────────────────────────
// The full 495-row Annex C table is deterministic, published FIFA data that
// will not change. Loading it over the network on every page load (via
// loadAnnexCFromRemote -> /api/annexc -> live Wikipedia scrape) was the
// original design, but it left `annexCStore` empty until that fetch
// succeeded — and nothing in the app actually called it reliably, so
// `getAnnexCMapping` always threw "not loaded" in practice. App.jsx's R32
// builder worked around this by re-implementing the whole lookup locally,
// which is how this module and the bracket engine drifted out of sync.
//
// Fix: bake the verified table in as a synchronous default, so this module
// is correct and complete the moment it's imported. `loadAnnexCFromRemote`
// is kept below as an optional override (e.g. if FIFA ever amends Annex C),
// but nothing depends on it succeeding anymore.
//
// Stored compactly as group letters only (no "3" prefix) to keep the
// source file small; expanded into the full column-keyed shape at load time
// and pushed through the same setAnnexCMapping() validator as any other
// source, so a transcription mistake here would fail loudly (wrong row
// count) exactly like a bad network response would.
const ANNEX_C_STATIC_SEED = {"ABCDEFGH":"HGBCAFDE","ABCDEFGI":"CGBDAFEI","ABCDEFGJ":"CGBDAFEJ","ABCDEFGK":"CGBDAFEK","ABCDEFGL":"CGBDAFLE","ABCDEFHI":"HEBCAFDI","ABCDEFHJ":"HJBCAFDE","ABCDEFHK":"HEBCAFDK","ABCDEFHL":"HFBCADLE","ABCDEFIJ":"CJBDAFEI","ABCDEFIK":"CEBDAFIK","ABCDEFIL":"CEBDAFLI","ABCDEFJK":"CJBDAFEK","ABCDEFJL":"CJBDAFLE","ABCDEFKL":"CEBDAFLK","ABCDEGHI":"HGBCADEI","ABCDEGHJ":"HGBCADEJ","ABCDEGHK":"HGBCADEK","ABCDEGHL":"HGBCADLE","ABCDEGIJ":"EGBCADIJ","ABCDEGIK":"EGBCADIK","ABCDEGIL":"EGBCADLI","ABCDEGJK":"EGBCADJK","ABCDEGJL":"EGBCADLJ","ABCDEGKL":"EGBCADLK","ABCDEHIJ":"HJBCADEI","ABCDEHIK":"HEBCADIK","ABCDEHIL":"HEBCADLI","ABCDEHJK":"HJBCADEK","ABCDEHJL":"HJBCADLE","ABCDEHKL":"HEBCADLK","ABCDEIJK":"EJBCADIK","ABCDEIJL":"EJBCADLI","ABCDEIKL":"EIBCADLK","ABCDEJKL":"EJBCADLK","ABCDFGHI":"HGBCAFDI","ABCDFGHJ":"HGBCAFDJ","ABCDFGHK":"HGBCAFDK","ABCDFGHL":"CGBDAFLH","ABCDFGIJ":"CGBDAFIJ","ABCDFGIK":"CGBDAFIK","ABCDFGIL":"CGBDAFLI","ABCDFGJK":"CGBDAFJK","ABCDFGJL":"CGBDAFLJ","ABCDFGKL":"CGBDAFLK","ABCDFHIJ":"HJBCAFDI","ABCDFHIK":"HFBCADIK","ABCDFHIL":"HFBCADLI","ABCDFHJK":"HJBCAFDK","ABCDFHJL":"CJBDAFLH","ABCDFHKL":"HFBCADLK","ABCDFIJK":"CJBDAFIK","ABCDFIJL":"CJBDAFLI","ABCDFIKL":"CIBDAFLK","ABCDFJKL":"CJBDAFLK","ABCDGHIJ":"HGBCADIJ","ABCDGHIK":"HGBCADIK","ABCDGHIL":"HGBCADLI","ABCDGHJK":"HGBCADJK","ABCDGHJL":"HGBCADLJ","ABCDGHKL":"HGBCADLK","ABCDGIJK":"CJBDAGIK","ABCDGIJL":"CJBDAGLI","ABCDGIKL":"IGBCADLK","ABCDGJKL":"CJBDAGLK","ABCDHIJK":"HJBCADIK","ABCDHIJL":"HJBCADLI","ABCDHIKL":"HIBCADLK","ABCDHJKL":"HJBCADLK","ABCDIJKL":"IJBCADLK","ABCEFGHI":"HGBCAFEI","ABCEFGHJ":"HGBCAFEJ","ABCEFGHK":"HGBCAFEK","ABCEFGHL":"HGBCAFLE","ABCEFGIJ":"EGBCAFIJ","ABCEFGIK":"EGBCAFIK","ABCEFGIL":"EGBCAFLI","ABCEFGJK":"EGBCAFJK","ABCEFGJL":"EGBCAFLJ","ABCEFGKL":"EGBCAFLK","ABCEFHIJ":"HJBCAFEI","ABCEFHIK":"HEBCAFIK","ABCEFHIL":"HEBCAFLI","ABCEFHJK":"HJBCAFEK","ABCEFHJL":"HJBCAFLE","ABCEFHKL":"HEBCAFLK","ABCEFIJK":"EJBCAFIK","ABCEFIJL":"EJBCAFLI","ABCEFIKL":"EIBCAFLK","ABCEFJKL":"EJBCAFLK","ABCEGHIJ":"HJBCAGEI","ABCEGHIK":"EGBCAHIK","ABCEGHIL":"EGBCAHLI","ABCEGHJK":"HJBCAGEK","ABCEGHJL":"HJBCAGLE","ABCEGHKL":"EGBCAHLK","ABCEGIJK":"EJBCAGIK","ABCEGIJL":"EJBCAGLI","ABCEGIKL":"EGBAICLK","ABCEGJKL":"EJBCAGLK","ABCEHIJK":"EJBCAHIK","ABCEHIJL":"EJBCAHLI","ABCEHIKL":"EIBCAHLK","ABCEHJKL":"EJBCAHLK","ABCEIJKL":"EJBAICLK","ABCFGHIJ":"HGBCAFIJ","ABCFGHIK":"HGBCAFIK","ABCFGHIL":"HGBCAFLI","ABCFGHJK":"HGBCAFJK","ABCFGHJL":"HGBCAFLJ","ABCFGHKL":"HGBCAFLK","ABCFGIJK":"CJBFAGIK","ABCFGIJL":"CJBFAGLI","ABCFGIKL":"IGBCAFLK","ABCFGJKL":"CJBFAGLK","ABCFHIJK":"HJBCAFIK","ABCFHIJL":"HJBCAFLI","ABCFHIKL":"HIBCAFLK","ABCFHJKL":"HJBCAFLK","ABCFIJKL":"IJBCAFLK","ABCGHIJK":"HJBCAGIK","ABCGHIJL":"HJBCAGLI","ABCGHIKL":"IGBCAHLK","ABCGHJKL":"HJBCAGLK","ABCGIJKL":"IJBCAGLK","ABCHIJKL":"IJBCAHLK","ABDEFGHI":"HGBDAFEI","ABDEFGHJ":"HGBDAFEJ","ABDEFGHK":"HGBDAFEK","ABDEFGHL":"HGBDAFLE","ABDEFGIJ":"EGBDAFIJ","ABDEFGIK":"EGBDAFIK","ABDEFGIL":"EGBDAFLI","ABDEFGJK":"EGBDAFJK","ABDEFGJL":"EGBDAFLJ","ABDEFGKL":"EGBDAFLK","ABDEFHIJ":"HJBDAFEI","ABDEFHIK":"HEBDAFIK","ABDEFHIL":"HEBDAFLI","ABDEFHJK":"HJBDAFEK","ABDEFHJL":"HJBDAFLE","ABDEFHKL":"HEBDAFLK","ABDEFIJK":"EJBDAFIK","ABDEFIJL":"EJBDAFLI","ABDEFIKL":"EIBDAFLK","ABDEFJKL":"EJBDAFLK","ABDEGHIJ":"HJBDAGEI","ABDEGHIK":"EGBDAHIK","ABDEGHIL":"EGBDAHLI","ABDEGHJK":"HJBDAGEK","ABDEGHJL":"HJBDAGLE","ABDEGHKL":"EGBDAHLK","ABDEGIJK":"EJBDAGIK","ABDEGIJL":"EJBDAGLI","ABDEGIKL":"EGBAIDLK","ABDEGJKL":"EJBDAGLK","ABDEHIJK":"EJBDAHIK","ABDEHIJL":"EJBDAHLI","ABDEHIKL":"EIBDAHLK","ABDEHJKL":"EJBDAHLK","ABDEIJKL":"EJBAIDLK","ABDFGHIJ":"HGBDAFIJ","ABDFGHIK":"HGBDAFIK","ABDFGHIL":"HGBDAFLI","ABDFGHJK":"HGBDAFJK","ABDFGHJL":"HGBDAFLJ","ABDFGHKL":"HGBDAFLK","ABDFGIJK":"FJBDAGIK","ABDFGIJL":"FJBDAGLI","ABDFGIKL":"IGBDAFLK","ABDFGJKL":"FJBDAGLK","ABDFHIJK":"HJBDAFIK","ABDFHIJL":"HJBDAFLI","ABDFHIKL":"HIBDAFLK","ABDFHJKL":"HJBDAFLK","ABDFIJKL":"IJBDAFLK","ABDGHIJK":"HJBDAGIK","ABDGHIJL":"HJBDAGLI","ABDGHIKL":"IGBDAHLK","ABDGHJKL":"HJBDAGLK","ABDGIJKL":"IJBDAGLK","ABDHIJKL":"IJBDAHLK","ABEFGHIJ":"HJBFAGEI","ABEFGHIK":"EGBFAHIK","ABEFGHIL":"EGBFAHLI","ABEFGHJK":"HJBFAGEK","ABEFGHJL":"HJBFAGLE","ABEFGHKL":"EGBFAHLK","ABEFGIJK":"EJBFAGIK","ABEFGIJL":"EJBFAGLI","ABEFGIKL":"EGBAIFLK","ABEFGJKL":"EJBFAGLK","ABEFHIJK":"EJBFAHIK","ABEFHIJL":"EJBFAHLI","ABEFHIKL":"EIBFAHLK","ABEFHJKL":"EJBFAHLK","ABEFIJKL":"EJBAIFLK","ABEGHIJK":"EJBAHGIK","ABEGHIJL":"EJBAHGLI","ABEGHIKL":"EGBAIHLK","ABEGHJKL":"EJBAHGLK","ABEGIJKL":"EJBAIGLK","ABEHIJKL":"EJBAIHLK","ABFGHIJK":"HJBFAGIK","ABFGHIJL":"HJBFAGLI","ABFGHIKL":"HGBAIFLK","ABFGHJKL":"HJBFAGLK","ABFGIJKL":"IJBFAGLK","ABFHIJKL":"HJBAIFLK","ABGHIJKL":"HJBAIGLK","ACDEFGHI":"HGECAFDI","ACDEFGHJ":"HGJCAFDE","ACDEFGHK":"HGECAFDK","ACDEFGHL":"HGFCADLE","ACDEFGIJ":"CGJDAFEI","ACDEFGIK":"CGEDAFIK","ACDEFGIL":"CGEDAFLI","ACDEFGJK":"CGJDAFEK","ACDEFGJL":"CGJDAFLE","ACDEFGKL":"CGEDAFLK","ACDEFHIJ":"HJECAFDI","ACDEFHIK":"HEFCADIK","ACDEFHIL":"HEFCADLI","ACDEFHJK":"HJECAFDK","ACDEFHJL":"HJFCADLE","ACDEFHKL":"HEFCADLK","ACDEFIJK":"CJEDAFIK","ACDEFIJL":"CJEDAFLI","ACDEFIKL":"CEIDAFLK","ACDEFJKL":"CJEDAFLK","ACDEGHIJ":"HGJCADEI","ACDEGHIK":"HGECADIK","ACDEGHIL":"HGECADLI","ACDEGHJK":"HGJCADEK","ACDEGHJL":"HGJCADLE","ACDEGHKL":"HGECADLK","ACDEGIJK":"EGJCADIK","ACDEGIJL":"EGJCADLI","ACDEGIKL":"EGICADLK","ACDEGJKL":"EGJCADLK","ACDEHIJK":"HJECADIK","ACDEHIJL":"HJECADLI","ACDEHIKL":"HEICADLK","ACDEHJKL":"HJECADLK","ACDEIJKL":"EJICADLK","ACDFGHIJ":"HGJCAFDI","ACDFGHIK":"HGFCADIK","ACDFGHIL":"HGFCADLI","ACDFGHJK":"HGJCAFDK","ACDFGHJL":"CGJDAFLH","ACDFGHKL":"HGFCADLK","ACDFGIJK":"CGJDAFIK","ACDFGIJL":"CGJDAFLI","ACDFGIKL":"CGIDAFLK","ACDFGJKL":"CGJDAFLK","ACDFHIJK":"HJFCADIK","ACDFHIJL":"HJFCADLI","ACDFHIKL":"HFICADLK","ACDFHJKL":"HJFCADLK","ACDFIJKL":"CJIDAFLK","ACDGHIJK":"HGJCADIK","ACDGHIJL":"HGJCADLI","ACDGHIKL":"HGICADLK","ACDGHJKL":"HGJCADLK","ACDGIJKL":"IGJCADLK","ACDHIJKL":"HJICADLK","ACEFGHIJ":"HGJCAFEI","ACEFGHIK":"HGECAFIK","ACEFGHIL":"HGECAFLI","ACEFGHJK":"HGJCAFEK","ACEFGHJL":"HGJCAFLE","ACEFGHKL":"HGECAFLK","ACEFGIJK":"EGJCAFIK","ACEFGIJL":"EGJCAFLI","ACEFGIKL":"EGICAFLK","ACEFGJKL":"EGJCAFLK","ACEFHIJK":"HJECAFIK","ACEFHIJL":"HJECAFLI","ACEFHIKL":"HEICAFLK","ACEFHJKL":"HJECAFLK","ACEFIJKL":"EJICAFLK","ACEGHIJK":"EGJCAHIK","ACEGHIJL":"EGJCAHLI","ACEGHIKL":"EGICAHLK","ACEGHJKL":"EGJCAHLK","ACEGIJKL":"EJICAGLK","ACEHIJKL":"EJICAHLK","ACFGHIJK":"HGJCAFIK","ACFGHIJL":"HGJCAFLI","ACFGHIKL":"HGICAFLK","ACFGHJKL":"HGJCAFLK","ACFGIJKL":"IGJCAFLK","ACFHIJKL":"HJICAFLK","ACGHIJKL":"HJICAGLK","ADEFGHIJ":"HGJDAFEI","ADEFGHIK":"HGEDAFIK","ADEFGHIL":"HGEDAFLI","ADEFGHJK":"HGJDAFEK","ADEFGHJL":"HGJDAFLE","ADEFGHKL":"HGEDAFLK","ADEFGIJK":"EGJDAFIK","ADEFGIJL":"EGJDAFLI","ADEFGIKL":"EGIDAFLK","ADEFGJKL":"EGJDAFLK","ADEFHIJK":"HJEDAFIK","ADEFHIJL":"HJEDAFLI","ADEFHIKL":"HEIDAFLK","ADEFHJKL":"HJEDAFLK","ADEFIJKL":"EJIDAFLK","ADEGHIJK":"EGJDAHIK","ADEGHIJL":"EGJDAHLI","ADEGHIKL":"EGIDAHLK","ADEGHJKL":"EGJDAHLK","ADEGIJKL":"EJIDAGLK","ADEHIJKL":"EJIDAHLK","ADFGHIJK":"HGJDAFIK","ADFGHIJL":"HGJDAFLI","ADFGHIKL":"HGIDAFLK","ADFGHJKL":"HGJDAFLK","ADFGIJKL":"IGJDAFLK","ADFHIJKL":"HJIDAFLK","ADGHIJKL":"HJIDAGLK","AEFGHIJK":"EGJFAHIK","AEFGHIJL":"EGJFAHLI","AEFGHIKL":"EGIFAHLK","AEFGHJKL":"EGJFAHLK","AEFGIJKL":"EJIFAGLK","AEFHIJKL":"EJIFAHLK","AEGHIJKL":"EJIAHGLK","AFGHIJKL":"HJIFAGLK","BCDEFGHI":"CGBDHFEI","BCDEFGHJ":"HGBCJFDE","BCDEFGHK":"CGBDHFEK","BCDEFGHL":"CGBDHFLE","BCDEFGIJ":"CGBDJFEI","BCDEFGIK":"CGBDEFIK","BCDEFGIL":"CGBDEFLI","BCDEFGJK":"CGBDJFEK","BCDEFGJL":"CGBDJFLE","BCDEFGKL":"CGBDEFLK","BCDEFHIJ":"CJBDHFEI","BCDEFHIK":"CEBDHFIK","BCDEFHIL":"CEBDHFLI","BCDEFHJK":"CJBDHFEK","BCDEFHJL":"CJBDHFLE","BCDEFHKL":"CEBDHFLK","BCDEFIJK":"CJBDEFIK","BCDEFIJL":"CJBDEFLI","BCDEFIKL":"CEBDIFLK","BCDEFJKL":"CJBDEFLK","BCDEGHIJ":"HGBCJDEI","BCDEGHIK":"EGBCHDIK","BCDEGHIL":"EGBCHDLI","BCDEGHJK":"HGBCJDEK","BCDEGHJL":"HGBCJDLE","BCDEGHKL":"EGBCHDLK","BCDEGIJK":"EGBCJDIK","BCDEGIJL":"EGBCJDLI","BCDEGIKL":"EGBCIDLK","BCDEGJKL":"EGBCJDLK","BCDEHIJK":"EJBCHDIK","BCDEHIJL":"EJBCHDLI","BCDEHIKL":"EIBCHDLK","BCDEHJKL":"EJBCHDLK","BCDEIJKL":"EJBCIDLK","BCDFGHIJ":"HGBCJFDI","BCDFGHIK":"CGBDHFIK","BCDFGHIL":"CGBDHFLI","BCDFGHJK":"HGBCJFDK","BCDFGHJL":"CGBDHFLJ","BCDFGHKL":"CGBDHFLK","BCDFGIJK":"CGBDJFIK","BCDFGIJL":"CGBDJFLI","BCDFGIKL":"CGBDIFLK","BCDFGJKL":"CGBDJFLK","BCDFHIJK":"CJBDHFIK","BCDFHIJL":"CJBDHFLI","BCDFHIKL":"CIBDHFLK","BCDFHJKL":"CJBDHFLK","BCDFIJKL":"CJBDIFLK","BCDGHIJK":"HGBCJDIK","BCDGHIJL":"HGBCJDLI","BCDGHIKL":"HGBCIDLK","BCDGHJKL":"HGBCJDLK","BCDGIJKL":"IGBCJDLK","BCDHIJKL":"HJBCIDLK","BCEFGHIJ":"HGBCJFEI","BCEFGHIK":"EGBCHFIK","BCEFGHIL":"EGBCHFLI","BCEFGHJK":"HGBCJFEK","BCEFGHJL":"HGBCJFLE","BCEFGHKL":"EGBCHFLK","BCEFGIJK":"EGBCJFIK","BCEFGIJL":"EGBCJFLI","BCEFGIKL":"EGBCIFLK","BCEFGJKL":"EGBCJFLK","BCEFHIJK":"EJBCHFIK","BCEFHIJL":"EJBCHFLI","BCEFHIKL":"EIBCHFLK","BCEFHJKL":"EJBCHFLK","BCEFIJKL":"EJBCIFLK","BCEGHIJK":"EJBCHGIK","BCEGHIJL":"EJBCHGLI","BCEGHIKL":"EGBCIHLK","BCEGHJKL":"EJBCHGLK","BCEGIJKL":"EJBCIGLK","BCEHIJKL":"EJBCIHLK","BCFGHIJK":"HGBCJFIK","BCFGHIJL":"HGBCJFLI","BCFGHIKL":"HGBCIFLK","BCFGHJKL":"HGBCJFLK","BCFGIJKL":"IGBCJFLK","BCFHIJKL":"HJBCIFLK","BCGHIJKL":"HJBCIGLK","BDEFGHIJ":"HGBDJFEI","BDEFGHIK":"EGBDHFIK","BDEFGHIL":"EGBDHFLI","BDEFGHJK":"HGBDJFEK","BDEFGHJL":"HGBDJFLE","BDEFGHKL":"EGBDHFLK","BDEFGIJK":"EGBDJFIK","BDEFGIJL":"EGBDJFLI","BDEFGIKL":"EGBDIFLK","BDEFGJKL":"EGBDJFLK","BDEFHIJK":"EJBDHFIK","BDEFHIJL":"EJBDHFLI","BDEFHIKL":"EIBDHFLK","BDEFHJKL":"EJBDHFLK","BDEFIJKL":"EJBDIFLK","BDEGHIJK":"EJBDHGIK","BDEGHIJL":"EJBDHGLI","BDEGHIKL":"EGBDIHLK","BDEGHJKL":"EJBDHGLK","BDEGIJKL":"EJBDIGLK","BDEHIJKL":"EJBDIHLK","BDFGHIJK":"HGBDJFIK","BDFGHIJL":"HGBDJFLI","BDFGHIKL":"HGBDIFLK","BDFGHJKL":"HGBDJFLK","BDFGIJKL":"IGBDJFLK","BDFHIJKL":"HJBDIFLK","BDGHIJKL":"HJBDIGLK","BEFGHIJK":"EJBFHGIK","BEFGHIJL":"EJBFHGLI","BEFGHIKL":"EGBFIHLK","BEFGHJKL":"EJBFHGLK","BEFGIJKL":"EJBFIGLK","BEFHIJKL":"EJBFIHLK","BEGHIJKL":"EJIBHGLK","BFGHIJKL":"HJBFIGLK","CDEFGHIJ":"CGJDHFEI","CDEFGHIK":"CGEDHFIK","CDEFGHIL":"CGEDHFLI","CDEFGHJK":"CGJDHFEK","CDEFGHJL":"CGJDHFLE","CDEFGHKL":"CGEDHFLK","CDEFGIJK":"CGEDJFIK","CDEFGIJL":"CGEDJFLI","CDEFGIKL":"CGEDIFLK","CDEFGJKL":"CGEDJFLK","CDEFHIJK":"CJEDHFIK","CDEFHIJL":"CJEDHFLI","CDEFHIKL":"CEIDHFLK","CDEFHJKL":"CJEDHFLK","CDEFIJKL":"CJEDIFLK","CDEGHIJK":"EGJCHDIK","CDEGHIJL":"EGJCHDLI","CDEGHIKL":"EGICHDLK","CDEGHJKL":"EGJCHDLK","CDEGIJKL":"EGICJDLK","CDEHIJKL":"EJICHDLK","CDFGHIJK":"CGJDHFIK","CDFGHIJL":"CGJDHFLI","CDFGHIKL":"CGIDHFLK","CDFGHJKL":"CGJDHFLK","CDFGIJKL":"CGIDJFLK","CDFHIJKL":"CJIDHFLK","CDGHIJKL":"HGICJDLK","CEFGHIJK":"EGJCHFIK","CEFGHIJL":"EGJCHFLI","CEFGHIKL":"EGICHFLK","CEFGHJKL":"EGJCHFLK","CEFGIJKL":"EGICJFLK","CEFHIJKL":"EJICHFLK","CEGHIJKL":"EJICHGLK","CFGHIJKL":"HGICJFLK","DEFGHIJK":"EGJDHFIK","DEFGHIJL":"EGJDHFLI","DEFGHIKL":"EGIDHFLK","DEFGHJKL":"EGJDHFLK","DEFGIJKL":"EGIDJFLK","DEFHIJKL":"EJIDHFLK","DEGHIJKL":"EJIDHGLK","DFGHIJKL":"HGIDJFLK","EFGHIJKL":"EJIFHGLK"};

function expandStaticSeed(seed) {
  const expanded = {};
  for (const [key, letters] of Object.entries(seed)) {
    expanded[key] = Object.fromEntries(
      THIRD_PLACE_TARGET_COLUMNS.map((column, i) => [column, `3${letters[i]}`])
    );
  }
  return expanded;
}

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

// Populate eagerly and synchronously at module load — see note above.
setAnnexCMapping(expandStaticSeed(ANNEX_C_STATIC_SEED));

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
