import BR_FLAT from "../../broadcast-data/BR.json";
import MX_FLAT from "../../broadcast-data/MX.json";
import US_FLAT from "../../broadcast-data/US.json";

import BR_89 from "../../broadcast-data/BR/89.json";
import BR_90 from "../../broadcast-data/BR/90.json";
import BR_91 from "../../broadcast-data/BR/91.json";
import BR_92 from "../../broadcast-data/BR/92.json";
import BR_93 from "../../broadcast-data/BR/93.json";
import BR_94 from "../../broadcast-data/BR/94.json";
import BR_95 from "../../broadcast-data/BR/95.json";
import BR_96 from "../../broadcast-data/BR/96.json";

const BR_FOLDER_DATA = {
  "89": BR_89,
  "90": BR_90,
  "91": BR_91,
  "92": BR_92,
  "93": BR_93,
  "94": BR_94,
  "95": BR_95,
  "96": BR_96,
};

const FLAT_DATA = {
  BR: BR_FLAT,
  MX: MX_FLAT,
  US: US_FLAT,
};

const COUNTRY_ALIASES = {
  BRA: "BR",
  Brazil: "BR",
  Brasil: "BR",
  Mexico: "MX",
  México: "MX",
  USA: "US",
  "United States": "US",
  "United States of America": "US",
};

const US_FALLBACK = {
  verified: false,
  fallback: true,
  tv: ["FOX", "FS1", "Telemundo"],
  stream: ["Peacock", "Tubi"],
  confidence: 70,
};

const cleanList = (arr = []) =>
  [...new Set((Array.isArray(arr) ? arr : [])
    .map(x => String(x || "").trim())
    .filter(Boolean)
    .filter(x => !/radio|sirius|fútbol de primera|futbol de primera|n sports|nsports/i.test(x))
  )];

export function normalizeBroadcastCountry(country) {
  const raw = String(country || "").trim();
  if (!raw) return "US";
  return COUNTRY_ALIASES[raw] || raw.toUpperCase();
}

function getMatchId(matchOrId) {
  if (matchOrId == null) return null;
  if (typeof matchOrId === "number" || typeof matchOrId === "string") return String(matchOrId);
  return String(matchOrId.id ?? matchOrId.fixtureId ?? matchOrId.fixture?.id ?? "");
}

function normalizeEntry(entry, code, id, fallback = false) {
  const tv = cleanList(entry?.tv);
  const stream = cleanList(entry?.stream);

  return {
    country: code,
    matchId: id,
    verified: entry?.verified === true,
    fallback,
    confidence: entry?.confidence ?? (entry?.verified ? 80 : 0),
    updatedAt: entry?.updatedAt || entry?.updated || null,
    sources: entry?.sources || [],
    sourceCount: entry?.sourceCount || (entry?.sources?.length || 0),
    tv,
    stream,
    streaming: stream.join(" • "),
    primary: tv.join(" • "),
    note: tv.length ? "📺" : stream.length ? "▶️" : "📺",
    label: [...tv, ...stream].join(" • "),
    statusLabel: "",
  };
}

export function getBroadcastEntry(matchOrId, country = "US") {
  const code = normalizeBroadcastCountry(country);
  const id = getMatchId(matchOrId);

  // Brazil R16 uses the new folder data.
  if (code === "BR") {
    const brMatch = BR_FOLDER_DATA[id];
    if (brMatch?.verified === true) return normalizeEntry(brMatch, code, id, false);
  }

  // Existing flat data remains the migration fallback for all countries.
  const flatMatch = FLAT_DATA[code]?.[id];
  if (flatMatch?.verified === true) return normalizeEntry(flatMatch, code, id, false);

  // US uses stable national broadcaster fallback.
  if (code === "US") return normalizeEntry(US_FALLBACK, code, id, true);

  // Brazil/Mexico/etc. do not guess.
  return {
    country: code,
    matchId: id,
    verified: false,
    fallback: false,
    confidence: 0,
    tv: [],
    stream: [],
    streaming: "",
    primary: "",
    note: "📺",
    label: "Broadcasters to be confirmed",
    statusLabel: "Broadcasters to be confirmed",
    hasBroadcasts: false,
  };
}

export function formatBroadcastText(matchOrId, country = "US", opts = {}) {
  const { maxTv = 3, maxStream = 2 } = opts;
  const b = getBroadcastEntry(matchOrId, country);
  const tv = b.tv.slice(0, maxTv);
  const stream = b.stream.slice(0, maxStream);

  return {
    ...b,
    tv,
    stream,
    streaming: stream.join(" • "),
    primary: tv.join(" • "),
    tvText: tv.join(" • "),
    streamText: stream.join(" • "),
    hasBroadcasts: tv.length > 0 || stream.length > 0,
    label: [...tv, ...stream].join(" • ") || "Broadcasters to be confirmed",
  };
}

export function formatBroadcastsForOG(matchOrId, country = "US") {
  return formatBroadcastText(matchOrId, country, { maxTv: 3, maxStream: 2 });
}

export function getBroadcastsForMatch(matchOrId, country = "US") {
  return formatBroadcastText(matchOrId, country);
}

export function getBroadcastGroupsForMatch(matchOrId, country = "US") {
  const b = getBroadcastsForMatch(matchOrId, country);
  return {
    tv: b.tv,
    stream: b.stream,
    streaming: b.streaming,
    verified: b.verified,
    fallback: b.fallback,
    confidence: b.confidence,
    hasBroadcasts: b.hasBroadcasts,
    statusLabel: b.statusLabel,
  };
}

export function getBroadcastLabel(matchOrId, country = "US") {
  const b = getBroadcastsForMatch(matchOrId, country);
  if (!b.hasBroadcasts) return "Broadcasters to be confirmed";
  const rows = [];
  if (b.tv.length) rows.push(`📺 ${b.tv.join(" • ")}`);
  if (b.stream.length) rows.push(`▶️ ${b.stream.join(" • ")}`);
  return rows.join("\n");
}
