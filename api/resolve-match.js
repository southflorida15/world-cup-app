// /api/resolve-match.js
// Client-triggered endpoint to score predictions for a finished match.
// Called by the frontend when a match end-time has passed.
// Uses shared KV cache — only one real Highlightly call per cache window.

import { Redis } from "@upstash/redis";
const kv = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "football-highlights-api.p.rapidapi.com";
const BASE          = `https://${RAPIDAPI_HOST}`;
const LEAGUE_ID     = "1635";
const SEASON        = "2026";
const CACHE_KEY     = "wc2026:livescores";
const CACHE_TS_KEY  = "wc2026:livescores:ts";
const MAX_CACHE_AGE = 10 * 60 * 1000; // 10min
const RESOLVE_KEY   = (matchId) => `wc2026:resolved:${matchId}`;

const FINISHED_STATUSES = ["FT","AET","PEN","AWD","WO","finished","ended","after_extra_time","after_penalties"];

// ── openfootball — free, no key, updated nightly after matches finish ─────
const OPENFOOTBALL_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
const OFB_CACHE_KEY    = "wc2026:openfootball";
const OFB_CACHE_TS_KEY = "wc2026:openfootball:ts";
const OFB_TTL          = 60 * 60; // 1hr — scores committed nightly, no need to hammer

// Normalize openfootball team names to our internal names
const OFB_NAME_MAP = {
  "Czech Republic":"Czechia","Bosnia-Herzegovina":"Bosnia & Herz.",
  "Bosnia & Herzegovina":"Bosnia & Herz.","USA":"United States",
  "Türkiye":"Turkiye","Turkey":"Turkiye","Côte d'Ivoire":"Ivory Coast",
  "Korea Republic":"South Korea","DR Congo":"DR Congo",
  "Cabo Verde":"Cape Verde","IR Iran":"Iran","Curaçao":"Curacao",
};
const normOfb = n => OFB_NAME_MAP[n] || n;

async function getOpenfootballScore(matchId) {
  // Try KV cache first
  let matches = null;
  try {
    const [cached, ts] = await Promise.all([kv.get(OFB_CACHE_KEY), kv.get(OFB_CACHE_TS_KEY)]);
    if (cached && ts && (Date.now() - parseInt(ts)) < OFB_TTL * 1000) {
      matches = cached;
    }
  } catch(e) {}

  if (!matches) {
    const r = await fetch(OPENFOOTBALL_URL);
    if (!r.ok) return null;
    const data = await r.json();
    matches = data.matches || [];
    try {
      await Promise.all([
        kv.set(OFB_CACHE_KEY, matches, { ex: OFB_TTL * 2 }),
        kv.set(OFB_CACHE_TS_KEY, String(Date.now()), { ex: OFB_TTL * 2 }),
      ]);
    } catch(e) {}
  }

  // Find this match by ID → look up team names from MATCH_UTC keys
  // Build reverse lookup: matchId → [team1, team2]
  const entry = Object.entries(MATCH_ID_MAP).find(([key, id]) => id === matchId);
  if (!entry) return null;
  const [home, away] = entry[0].split("|");

  const fixture = matches.find(m => {
    const t1 = normOfb(m.team1 || "");
    const t2 = normOfb(m.team2 || "");
    return (t1 === home && t2 === away) || (t2 === home && t1 === away);
  });

  if (!fixture || !fixture.score) return null;

  // openfootball score format: "2:1" or "2:1 (1:0)"
  const scoreStr = typeof fixture.score === "string"
    ? fixture.score
    : `${fixture.score.ft?.[0]}:${fixture.score.ft?.[1]}`;
  const parts = scoreStr.replace(/\s*\(.*\)/, "").split(":");
  if (parts.length !== 2) return null;

  const hg = parseInt(parts[0]);
  const ag = parseInt(parts[1]);
  if (isNaN(hg) || isNaN(ag)) return null;

  // Swap if teams were reversed in openfootball
  const t1 = normOfb(fixture.team1);
  if (t1 === away) return { hg: ag, ag: hg }; // reverse
  return { hg, ag };
}

// Match kickoff times — used to verify the match is actually over
const MATCH_UTC = {
  1:"2026-06-11T19:00:00Z",
  2:"2026-06-12T02:00:00Z",
  3:"2026-06-12T19:00:00Z",
  4:"2026-06-13T01:00:00Z",
  5:"2026-06-13T19:00:00Z",
  6:"2026-06-13T22:00:00Z",
  7:"2026-06-14T01:00:00Z",
  8:"2026-06-14T03:59:00Z",
  9:"2026-06-14T17:00:00Z",
  10:"2026-06-14T20:00:00Z",
  11:"2026-06-14T23:00:00Z",
  12:"2026-06-15T02:00:00Z",
  13:"2026-06-15T16:00:00Z",
  14:"2026-06-15T19:00:00Z",
  15:"2026-06-15T22:00:00Z",
  16:"2026-06-16T01:00:00Z",
  17:"2026-06-16T19:00:00Z",
  18:"2026-06-16T22:00:00Z",
  19:"2026-06-17T01:00:00Z",
  20:"2026-06-17T03:59:00Z",
  21:"2026-06-17T17:00:00Z",
  22:"2026-06-17T20:00:00Z",
  23:"2026-06-17T23:00:00Z",
  24:"2026-06-18T02:00:00Z",
  25:"2026-06-18T16:00:00Z",
  26:"2026-06-18T19:00:00Z",
  27:"2026-06-18T22:00:00Z",
  28:"2026-06-19T01:00:00Z",
  29:"2026-06-19T19:00:00Z",
  30:"2026-06-19T22:00:00Z",
  31:"2026-06-20T00:30:00Z",
  32:"2026-06-20T03:00:00Z",
  33:"2026-06-20T17:00:00Z",
  34:"2026-06-20T20:00:00Z",
  35:"2026-06-21T01:00:00Z",
  36:"2026-06-21T03:59:00Z",
  37:"2026-06-21T16:00:00Z",
  38:"2026-06-21T19:00:00Z",
  39:"2026-06-21T22:00:00Z",
  40:"2026-06-22T01:00:00Z",
  41:"2026-06-22T17:00:00Z",
  42:"2026-06-22T21:00:00Z",
  43:"2026-06-23T00:00:00Z",
  44:"2026-06-23T03:00:00Z",
  45:"2026-06-23T17:00:00Z",
  46:"2026-06-23T20:00:00Z",
  47:"2026-06-23T23:00:00Z",
  48:"2026-06-24T02:00:00Z",
  49:"2026-06-24T19:00:00Z",
  50:"2026-06-24T19:00:00Z",
  51:"2026-06-24T22:00:00Z",
  52:"2026-06-24T22:00:00Z",
  53:"2026-06-25T01:00:00Z",
  54:"2026-06-25T01:00:00Z",
  55:"2026-06-25T20:00:00Z",
  56:"2026-06-25T20:00:00Z",
  57:"2026-06-25T23:00:00Z",
  58:"2026-06-25T23:00:00Z",
  59:"2026-06-26T02:00:00Z",
  60:"2026-06-26T02:00:00Z",
  61:"2026-06-26T19:00:00Z",
  62:"2026-06-26T19:00:00Z",
  63:"2026-06-27T00:00:00Z",
  64:"2026-06-27T00:00:00Z",
  65:"2026-06-27T03:00:00Z",
  66:"2026-06-27T03:00:00Z",
  67:"2026-06-27T21:00:00Z",
  68:"2026-06-27T21:00:00Z",
  69:"2026-06-27T23:30:00Z",
  70:"2026-06-27T23:30:00Z",
  71:"2026-06-28T02:00:00Z",
  72:"2026-06-28T02:00:00Z",
  73:"2026-06-28T23:00:00Z",
  74:"2026-06-29T17:00:00Z",
  75:"2026-06-29T20:30:00Z",
  76:"2026-06-30T01:00:00Z",
  77:"2026-06-30T17:00:00Z",
  78:"2026-06-30T21:00:00Z",
  79:"2026-07-01T01:00:00Z",
  80:"2026-07-01T16:00:00Z",
  81:"2026-07-01T20:00:00Z",
  82:"2026-07-02T00:00:00Z",
  83:"2026-07-02T19:00:00Z",
  84:"2026-07-02T23:00:00Z",
  85:"2026-07-03T03:00:00Z",
  86:"2026-07-03T18:00:00Z",
  87:"2026-07-03T22:00:00Z",
  88:"2026-07-04T01:30:00Z",
  89:"2026-07-04T17:00:00Z",
  90:"2026-07-04T21:00:00Z",
  91:"2026-07-05T20:00:00Z",
  92:"2026-07-06T00:00:00Z",
  93:"2026-07-06T19:00:00Z",
  94:"2026-07-07T00:00:00Z",
  95:"2026-07-07T16:00:00Z",
  96:"2026-07-07T20:00:00Z",
  97:"2026-07-09T20:00:00Z",
  98:"2026-07-10T19:00:00Z",
  99:"2026-07-11T21:00:00Z",
  100:"2026-07-12T01:00:00Z",
  101:"2026-07-14T19:00:00Z",
  102:"2026-07-15T19:00:00Z",
  103:"2026-07-18T21:00:00Z",
  104:"2026-07-19T19:00:00Z"
};

const API_NAME_MAP = {
  "USA":"United States","United States of America":"United States",
  "Turkey":"Turkiye","Türkiye":"Turkiye","Czech Republic":"Czechia",
  "Bosnia":"Bosnia & Herz.","Bosnia and Herzegovina":"Bosnia & Herz.",
  "Côte d'Ivoire":"Ivory Coast","Cote d'Ivoire":"Ivory Coast",
  "DR Congo":"DR Congo","Congo DR":"DR Congo",
  "Korea Republic":"South Korea","Republic of Korea":"South Korea",
  "IR Iran":"Iran","Curaçao":"Curacao","Cabo Verde":"Cape Verde",
};
const norm = n => API_NAME_MAP[n] || n;

const MATCH_ID_MAP = {
  "Mexico|South Africa":1,"South Korea|Czechia":2,"Canada|Bosnia & Herz.":3,
  "United States|Paraguay":4,"Qatar|Switzerland":5,"Brazil|Morocco":6,
  "Haiti|Scotland":7,"Australia|Turkiye":8,"Germany|Curacao":9,
  "Netherlands|Japan":10,"Ivory Coast|Ecuador":11,"Sweden|Tunisia":12,
  "Spain|Cape Verde":13,"Belgium|Egypt":14,"Saudi Arabia|Uruguay":15,
  "Iran|New Zealand":16,"France|Senegal":17,"Iraq|Norway":18,
  "Argentina|Algeria":19,"Austria|Jordan":20,"Portugal|DR Congo":21,
  "England|Croatia":22,"Ghana|Panama":23,"Uzbekistan|Colombia":24,
  "Czechia|South Africa":25,"Switzerland|Bosnia & Herz.":26,
  "Canada|Qatar":27,"Mexico|South Korea":28,"United States|Australia":29,
  "Scotland|Morocco":30,"Brazil|Haiti":31,"Turkiye|Paraguay":32,
  "Netherlands|Sweden":33,"Germany|Ivory Coast":34,"Ecuador|Curacao":35,
  "Tunisia|Japan":36,"Spain|Saudi Arabia":37,"Belgium|Iran":38,
  "Uruguay|Cape Verde":39,"New Zealand|Egypt":40,"Argentina|Austria":41,
  "France|Iraq":42,"Norway|Senegal":43,"Jordan|Algeria":44,
  "Portugal|Uzbekistan":45,"England|Ghana":46,"Panama|Croatia":47,
  "Colombia|DR Congo":48,"Switzerland|Canada":49,"Bosnia & Herz.|Qatar":50,
  "Scotland|Brazil":51,"Morocco|Haiti":52,"Czechia|Mexico":53,
  "South Africa|South Korea":54,"Curacao|Ivory Coast":55,"Ecuador|Germany":56,
  "Japan|Sweden":57,"Tunisia|Netherlands":58,"Turkiye|United States":59,
  "Paraguay|Australia":60,"Norway|France":61,"Senegal|Iraq":62,
  "Cape Verde|Saudi Arabia":63,"Uruguay|Spain":64,"Egypt|Iran":65,
  "New Zealand|Belgium":66,"Panama|England":67,"Croatia|Ghana":68,
  "Colombia|Portugal":69,"DR Congo|Uzbekistan":70,"Algeria|Austria":71,
  "Jordan|Argentina":72,
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { matchId } = req.query;
  if (!matchId) return res.status(400).json({ error: "Missing matchId" });

  const id = parseInt(matchId);
  const kickoff = MATCH_UTC[id];
  if (!kickoff) return res.status(400).json({ error: "Unknown matchId" });

  // Verify match has actually ended (kickoff + 2.5hrs minimum)
  const endTime = new Date(kickoff).getTime() + 150 * 60 * 1000;
  if (Date.now() < endTime) {
    return res.status(200).json({ ok: true, skipped: true, reason: "match not finished yet" });
  }

  // Check if already resolved
  try {
    const resolved = await kv.get(RESOLVE_KEY(id));
    if (resolved) return res.status(200).json({ ok: true, skipped: true, reason: "already resolved", result: resolved });
  } catch(e) {}

  // ── Strategy: openfootball first (free, no quota), Highlightly as fallback ──
  // openfootball is updated nightly — perfect for next-day resolution.
  // Highlightly is used same-day when openfootball hasn't committed yet.
  let hg = null, ag = null;

  // 1. Try openfootball (zero API quota cost)
  try {
    const ofbScore = await getOpenfootballScore(id);
    if (ofbScore !== null) {
      hg = ofbScore.hg;
      ag = ofbScore.ag;
      console.log(`[resolve] openfootball score for match ${id}: ${hg}-${ag}`);
    }
  } catch(e) {
    console.warn("[resolve] openfootball error:", e.message);
  }

  // 2. Fall back to Highlightly KV cache or live fetch (uses quota)
  if (hg === null) {
    let matches = null;
    try {
      const [cached, ts] = await Promise.all([kv.get(CACHE_KEY), kv.get(CACHE_TS_KEY)]);
      if (cached && ts && (Date.now() - parseInt(ts)) < MAX_CACHE_AGE) {
        matches = cached.map(f => ({
          homeTeam: { name: f.teams?.home?.name || "" },
          awayTeam: { name: f.teams?.away?.name || "" },
          homeScore: f.goals?.home,
          awayScore: f.goals?.away,
          status: f.fixture?.status?.short || "NS",
        }));
      }
    } catch(e) {}

    if (!matches) {
      const r = await fetch(`${BASE}/matches?leagueId=${LEAGUE_ID}&season=${SEASON}&limit=200`, {
        headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": RAPIDAPI_HOST },
      });
      if (!r.ok) return res.status(500).json({ error: `Highlightly ${r.status}` });
      const data = await r.json();
      matches = data.data || data.response || [];
      console.log(`[resolve] fell back to Highlightly for match ${id}`);
    }

    const fixture = matches.find(m => {
      const h = norm(m.homeTeam?.name || "");
      const a = norm(m.awayTeam?.name || "");
      return MATCH_ID_MAP[`${h}|${a}`] === id;
    });

    if (!fixture) return res.status(200).json({ ok: true, skipped: true, reason: "match not found in feed" });

    const status = fixture.status || fixture.fixture?.status?.short || "";
    if (!FINISHED_STATUSES.includes(status)) {
      return res.status(200).json({ ok: true, skipped: true, reason: `match status: ${status}` });
    }

    hg = fixture.homeScore ?? fixture.goals?.home;
    ag = fixture.awayScore ?? fixture.goals?.away;
  }

  if (hg === null || hg === undefined || ag === null || ag === undefined) {
    return res.status(200).json({ ok: true, skipped: true, reason: "score not available yet" });
  }

  // Score the predictions via predictor endpoint
  const host = req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const scoreRes = await fetch(`${proto}://${host}/api/predictor?action=score`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": process.env.PREDICTOR_ADMIN_SECRET,
    },
    body: JSON.stringify({ matchId: id, hg: parseInt(hg), ag: parseInt(ag) }),
  });

  const result = await scoreRes.json().catch(() => ({}));

  // Mark as resolved in KV (keep for 40 days)
  try {
    await kv.set(RESOLVE_KEY(id), { hg: parseInt(hg), ag: parseInt(ag), resolvedAt: Date.now(), source: hg !== null ? "openfootball" : "highlightly" }, { ex: 365 * 24 * 60 * 60 }); // permanent — never re-fetch
  } catch(e) {}

  return res.status(200).json({ ok: true, matchId: id, hg, ag, scored: result.scored || 0 });
}
