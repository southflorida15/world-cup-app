// /api/livescores.js
// Live scores — two-source architecture:
//   Primary:  football-data.org (free, no daily cap issues, WC competition code "WC")
//   Fallback: Highlightly via RapidAPI (100/day — used only if primary fails)
// KV-backed shared cache keeps real API calls minimal.

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// ── Source 1: football-data.org ───────────────────────────────────────────
const FD_KEY  = process.env.FOOTBALL_DATA_API_KEY;
const FD_BASE = "https://api.football-data.org/v4";
const FD_COMPETITION = "WC"; // FIFA World Cup

// ── Source 2: Highlightly (RapidAPI) ─────────────────────────────────────
const HL_KEY  = process.env.RAPIDAPI_KEY;
const HL_HOST = process.env.RAPIDAPI_HOST || "football-highlights-api.p.rapidapi.com";
const HL_BASE = `https://${HL_HOST}`;
const HL_LEAGUE_ID = "1635";

const CACHE_KEY    = "wc2026:livescores";
const CACHE_TS_KEY = "wc2026:livescores:ts";

const LIVE_STATUSES = ["LIVE","1H","HT","2H","ET","BT","P","INT","IN_PLAY","PAUSED"];
const FINISHED_STATUSES = ["FT","AET","PEN","AWD","WO","FINISHED","AWARDED"];

// Match window guard — all 104 WC 2026 kickoffs
const KICKOFFS = [
  "2026-06-11T19:00:00Z","2026-06-12T02:00:00Z","2026-06-12T19:00:00Z","2026-06-13T01:00:00Z",
  "2026-06-13T19:00:00Z","2026-06-13T22:00:00Z","2026-06-14T01:00:00Z","2026-06-14T03:59:00Z",
  "2026-06-14T17:00:00Z","2026-06-14T20:00:00Z","2026-06-14T23:00:00Z","2026-06-15T02:00:00Z",
  "2026-06-15T16:00:00Z","2026-06-15T19:00:00Z","2026-06-15T22:00:00Z","2026-06-16T01:00:00Z",
  "2026-06-16T19:00:00Z","2026-06-16T22:00:00Z","2026-06-17T01:00:00Z","2026-06-17T03:59:00Z",
  "2026-06-17T17:00:00Z","2026-06-17T20:00:00Z","2026-06-17T23:00:00Z","2026-06-18T02:00:00Z",
  "2026-06-18T16:00:00Z","2026-06-18T19:00:00Z","2026-06-18T22:00:00Z","2026-06-19T01:00:00Z",
  "2026-06-19T19:00:00Z","2026-06-19T22:00:00Z","2026-06-20T00:30:00Z","2026-06-20T03:00:00Z",
  "2026-06-20T17:00:00Z","2026-06-20T20:00:00Z","2026-06-21T01:00:00Z","2026-06-21T03:59:00Z",
  "2026-06-21T16:00:00Z","2026-06-21T19:00:00Z","2026-06-21T22:00:00Z","2026-06-22T01:00:00Z",
  "2026-06-22T17:00:00Z","2026-06-22T21:00:00Z","2026-06-23T00:00:00Z","2026-06-23T03:00:00Z",
  "2026-06-23T17:00:00Z","2026-06-23T20:00:00Z","2026-06-23T23:00:00Z","2026-06-24T02:00:00Z",
  "2026-06-24T19:00:00Z","2026-06-24T19:00:00Z","2026-06-24T22:00:00Z","2026-06-24T22:00:00Z",
  "2026-06-25T01:00:00Z","2026-06-25T01:00:00Z","2026-06-25T20:00:00Z","2026-06-25T20:00:00Z",
  "2026-06-25T23:00:00Z","2026-06-25T23:00:00Z","2026-06-26T02:00:00Z","2026-06-26T02:00:00Z",
  "2026-06-26T19:00:00Z","2026-06-26T19:00:00Z","2026-06-27T00:00:00Z","2026-06-27T00:00:00Z",
  "2026-06-27T03:00:00Z","2026-06-27T03:00:00Z","2026-06-27T21:00:00Z","2026-06-27T21:00:00Z",
  "2026-06-27T23:30:00Z","2026-06-27T23:30:00Z","2026-06-28T02:00:00Z","2026-06-28T02:00:00Z",
  "2026-06-28T23:00:00Z","2026-06-29T17:00:00Z","2026-06-29T20:30:00Z","2026-06-30T01:00:00Z",
  "2026-06-30T17:00:00Z","2026-06-30T21:00:00Z","2026-07-01T01:00:00Z","2026-07-01T16:00:00Z",
  "2026-07-01T20:00:00Z","2026-07-02T00:00:00Z","2026-07-02T19:00:00Z","2026-07-02T23:00:00Z",
  "2026-07-03T03:00:00Z","2026-07-03T18:00:00Z","2026-07-03T22:00:00Z","2026-07-04T01:30:00Z",
  "2026-07-04T17:00:00Z","2026-07-04T21:00:00Z","2026-07-05T20:00:00Z","2026-07-06T00:00:00Z",
  "2026-07-06T19:00:00Z","2026-07-07T00:00:00Z","2026-07-07T16:00:00Z","2026-07-07T20:00:00Z",
  "2026-07-09T20:00:00Z","2026-07-10T19:00:00Z","2026-07-11T21:00:00Z","2026-07-12T01:00:00Z",
  "2026-07-14T19:00:00Z","2026-07-15T19:00:00Z","2026-07-18T21:00:00Z","2026-07-19T19:00:00Z"
];
const WINDOW_MS = 150 * 60 * 1000;

function isMatchWindowActive() {
  const now = Date.now();
  return KICKOFFS.some(k => { const ko = new Date(k).getTime(); return now >= ko && now <= ko + WINDOW_MS; });
}

function getSmartTTL(fixtures) {
  const liveCount = fixtures.filter(f => LIVE_STATUSES.includes(f?.fixture?.status?.short)).length;
  if (liveCount >= 4) return 3 * 60;  // 3min — many live
  if (liveCount >= 2) return 2 * 60;  // 2min — a few live
  if (liveCount >= 1) return 60;      // 1min — one live (get fresh scores fast)
  return 60 * 60;                     // 1hr  — nothing live
}

// ── football-data.org team name normalization ─────────────────────────────
const FD_NAME_MAP = {
  "Bosnia-Herzegovina": "Bosnia & Herz.",
  "Bosnia and Herzegovina": "Bosnia & Herz.",
  "Cape Verde Islands": "Cape Verde",
  "Turkey": "Turkiye",
  "Curaçao": "Curacao",
  "Congo DR": "DR Congo",
  "DR Congo": "DR Congo",
  "Côte d'Ivoire": "Ivory Coast",
  "Cote d'Ivoire": "Ivory Coast",
  "Korea Republic": "South Korea",
  "Republic of Korea": "South Korea",
  "IR Iran": "Iran",
  "USA": "United States",
  "Czech Republic": "Czechia",
  "Cabo Verde": "Cape Verde",
};
const normFD = n => FD_NAME_MAP[n] || n;

// ── football-data.org mapper ───────────────────────────────────────────────
// Their status values: SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, AWARDED, CANCELLED, POSTPONED, SUSPENDED
function mapFDMatch(m) {
  const fdStatus = m.status || "SCHEDULED";
  const statusMap = {
    "IN_PLAY":"LIVE","PAUSED":"HT","FINISHED":"FT","AWARDED":"FT",
    "SCHEDULED":"NS","TIMED":"NS","CANCELLED":"CANC","POSTPONED":"TBD","SUSPENDED":"TBD",
    "EXTRA_TIME":"ET","PENALTY_SHOOTOUT":"P",
  };
  const short = statusMap[fdStatus] || "NS";
  // Extract elapsed minute from score object if available
  const elapsed = m.minute ?? null;
  const hg = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null;
  const ag = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null;
  // Override NS with time-based status so the app shows matches as live
  // even when football-data.org free tier hasn't updated the status yet
  const now = Date.now();
  const ko = m.utcDate ? new Date(m.utcDate).getTime() : 0;
  let finalShort = short;
  if (ko > 0) {
    const minsElapsed = (now - ko) / 60000;
    if (short === "NS" && minsElapsed >= 0 && minsElapsed < 105) {
      // Match should be in progress based on time
      if (minsElapsed < 45) finalShort = "1H";
      else if (minsElapsed < 50) finalShort = "HT";
      else if (minsElapsed < 95) finalShort = "2H";
      else finalShort = "ET";
    } else if (short === "NS" && minsElapsed >= 105) {
      // Should be finished
      finalShort = "FT";
    }
  }

  return {
    fixture: {
      id:     m.id,
      date:   m.utcDate,
      status: { short: finalShort, elapsed },
      venue:  { name: m.venue || "", city: "" },
    },
    league: { id: 1635, season: 2026 },
    teams: {
      home: { id: m.homeTeam?.id, name: normFD(m.homeTeam?.name || m.homeTeam?.shortName || "") },
      away: { id: m.awayTeam?.id, name: normFD(m.awayTeam?.name || m.awayTeam?.shortName || "") },
    },
    goals: {
      home: hg !== null && hg !== undefined ? parseInt(hg) : null,
      away: ag !== null && ag !== undefined ? parseInt(ag) : null,
    },
    score: { fulltime: { home: hg, away: ag } },
    events: [],
    _source: "football-data.org",
  };
}

async function fetchFromFootballData() {
  if (!FD_KEY) throw new Error("FOOTBALL_DATA_API_KEY not set");

  const headers = { "X-Auth-Token": FD_KEY };

  // Fetch all WC matches + live matches in parallel
  // The live endpoint returns real-time scores for in-progress matches
  const [allRes, liveRes] = await Promise.all([
    fetch(`${FD_BASE}/competitions/${FD_COMPETITION}/matches?season=2026`, { headers }),
    fetch(`${FD_BASE}/matches?competitions=${FD_COMPETITION}&status=IN_PLAY`, { headers }),
  ]);

  if (!allRes.ok) {
    const body = await allRes.text().catch(() => "");
    throw new Error(`football-data.org ${allRes.status}: ${body.slice(0, 200)}`);
  }

  const allData = await allRes.json();
  const allMatches = allData.matches || [];

  // Merge live scores into the full list
  let liveById = {};
  if (liveRes.ok) {
    const liveData = await liveRes.json();
    const liveMatches = liveData.matches || [];
    console.log(`[livescores] football-data.org live: ${liveMatches.length} in-play matches`, JSON.stringify(liveMatches.map(m=>({id:m.id,status:m.status,score:m.score?.fullTime}))));
    liveMatches.forEach(m => { liveById[m.id] = m; });
  } else {
    const errBody = await liveRes.text().catch(()=>"");
    console.warn(`[livescores] IN_PLAY fetch failed: ${liveRes.status} ${errBody.slice(0,200)}`);
  }

  // Also fetch PAUSED (half-time) and FINISHED today
  const today = new Date().toISOString().slice(0, 10);
  const [pausedRes, finishedRes] = await Promise.all([
    fetch(`${FD_BASE}/matches?competitions=${FD_COMPETITION}&status=PAUSED`, { headers }),
    fetch(`${FD_BASE}/matches?competitions=${FD_COMPETITION}&status=FINISHED&dateFrom=${today}&dateTo=${today}`, { headers }),
  ]);
  if (pausedRes.ok) {
    const pausedData = await pausedRes.json();
    (pausedData.matches || []).forEach(m => { liveById[m.id] = m; });
  }
  if (finishedRes.ok) {
    const finishedData = await finishedRes.json();
    const finishedMatches = finishedData.matches || [];
    console.log(`[livescores] football-data.org finished today: ${finishedMatches.length}`);
    finishedMatches.forEach(m => { liveById[m.id] = m; });
  }

  // Override full list with live/paused data where available
  const merged = allMatches.map(m => liveById[m.id] || m);
  console.log(`[livescores] football-data.org: ${merged.length} total, ${Object.keys(liveById).length} with live scores`);
  return merged.map(mapFDMatch);
}


// ── ESPN public API mapper ────────────────────────────────────────────────
// No key required. Uses ESPN's own internal API.
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

const ESPN_STATUS_MAP = {
  "STATUS_SCHEDULED": "NS",
  "STATUS_IN_PROGRESS": "LIVE",
  "STATUS_HALFTIME": "HT",
  "STATUS_FINAL": "FT",
  "STATUS_FULL_TIME": "FT",
  "STATUS_EXTRA_TIME": "ET",
  "STATUS_PENALTY": "P",
  "STATUS_POSTPONED": "TBD",
  "STATUS_CANCELED": "CANC",
  "STATUS_SUSPENDED": "TBD",
};

const ESPN_NAME_MAP = {
  "USA": "United States",
  "Bosnia and Herzegovina": "Bosnia & Herz.",
  "Cape Verde Islands": "Cape Verde",
  "Turkey": "Turkiye",
  "Curaçao": "Curacao",
  "Congo, DR": "DR Congo",
  "DR Congo": "DR Congo",
  "Côte d'Ivoire": "Ivory Coast",
  "Korea Republic": "South Korea",
};
const normESPN = n => ESPN_NAME_MAP[n] || n;

function mapESPNEvent(event) {
  const comp = event.competitions?.[0];
  if (!comp) return null;
  const home = comp.competitors?.find(c => c.homeAway === "home");
  const away = comp.competitors?.find(c => c.homeAway === "away");
  if (!home || !away) return null;

  const statusType = comp.status?.type?.name || "STATUS_SCHEDULED";
  const short = ESPN_STATUS_MAP[statusType] || "NS";
  const clock = comp.status?.displayClock;
  const elapsed = clock && clock !== "0:00" ? parseInt(clock.split(":")[0]) : null;
  const hg = home.score !== undefined && home.score !== "" ? parseInt(home.score) : null;
  const ag = away.score !== undefined && away.score !== "" ? parseInt(away.score) : null;

  return {
    fixture: {
      id: event.id,
      date: comp.date || event.date,
      status: { short, elapsed },
      venue: { name: comp.venue?.fullName || "", city: comp.venue?.address?.city || "" },
    },
    league: { id: 1635, season: 2026 },
    teams: {
      home: { id: home.team?.id, name: normESPN(home.team?.displayName || home.team?.name || "") },
      away: { id: away.team?.id, name: normESPN(away.team?.displayName || away.team?.name || "") },
    },
    goals: {
      home: hg,
      away: ag,
    },
    score: { fulltime: { home: hg, away: ag } },
    events: [],
    _source: "espn",
  };
}

async function fetchFromESPN() {
  const r = await fetch(`${ESPN_BASE}/scoreboard`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "Origin": "https://www.espn.com",
      "Referer": "https://www.espn.com/",
    },
  });
  if (!r.ok) throw new Error(`ESPN ${r.status}`);
  const data = await r.json();
  const events = data.events || [];
  console.log(`[livescores] ESPN: ${events.length} events`);
  return events.map(mapESPNEvent).filter(Boolean);
}

// ── Highlightly mapper ─────────────────────────────────────────────────────
function mapHLMatch(m) {
  const statusRaw = m.status || m.matchStatus || "NS";
  const statusMap = {
    "LIVE":"LIVE","1H":"1H","HT":"HT","2H":"2H","ET":"ET","PEN":"P","BT":"BT",
    "FT":"FT","AET":"AET","NS":"NS","TBD":"NS","PST":"TBD","CANC":"CANC",
    "finished":"FT","inprogress":"LIVE","first_half":"1H","halftime":"HT",
    "second_half":"2H","extra_time":"ET","penalties":"P",
    "ended":"FT","after_extra_time":"AET","after_penalties":"PEN",
  };
  const short = statusMap[statusRaw] || statusRaw;
  const hg = m.homeScore ?? m.homeGoals ?? m.score?.home ?? null;
  const ag = m.awayScore ?? m.awayGoals ?? m.score?.away ?? null;
  return {
    fixture: {
      id: m.id || m.matchId,
      date: m.date || m.startTime || m.kickoff,
      status: { short, elapsed: m.elapsed ?? m.minute ?? null },
      venue: { name: m.venue || m.stadium || "", city: m.city || "" },
    },
    league: { id: 1635, season: 2026 },
    teams: {
      home: { id: m.homeTeam?.id, name: m.homeTeam?.name || m.home || "" },
      away: { id: m.awayTeam?.id, name: m.awayTeam?.name || m.away || "" },
    },
    goals: {
      home: hg !== null && hg !== undefined ? parseInt(hg) : null,
      away: ag !== null && ag !== undefined ? parseInt(ag) : null,
    },
    score: { fulltime: { home: hg, away: ag } },
    events: m.events || [],
    _source: "highlightly",
  };
}

async function fetchFromHighlightly() {
  const dateStr = new Date().toISOString().slice(0, 10);
  const r = await fetch(`${HL_BASE}/matches?leagueId=${HL_LEAGUE_ID}&date=${dateStr}&limit=50&timezone=Etc%2FUTC`, {
    headers: { "X-RapidAPI-Key": HL_KEY, "X-RapidAPI-Host": HL_HOST },
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`Highlightly ${r.status}: ${body.slice(0, 200)}`);
  }
  const data = await r.json();
  const raw = Array.isArray(data) ? data : (data.data || data.matches || data.response || []);
  console.log(`[livescores] Highlightly: ${raw.length} matches`);
  return raw.map(mapHLMatch);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const debug = req.query.debug === "1";

  // Flush cache
  if (req.query.flush === "1") {
    try {
      await Promise.all([kv.del(CACHE_KEY), kv.del(CACHE_TS_KEY)]);
      return res.status(200).json({ ok: true, flushed: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Window guard
  if (!debug && !isMatchWindowActive()) {
    let frozen = null;
    try { frozen = await kv.get(CACHE_KEY); } catch(e) {}
    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).json({ response: frozen || [], cached: true, windowActive: false });
  }

  // KV cache check
  if (!debug) {
    let cached = null, cachedTs = 0;
    try {
      const [raw, ts] = await Promise.all([kv.get(CACHE_KEY), kv.get(CACHE_TS_KEY)]);
      if (raw) { cached = raw; cachedTs = parseInt(ts || "0"); }
    } catch(e) { console.warn("[livescores] KV read:", e.message); }

    if (cached) {
      const ttlMs = getSmartTTL(cached) * 1000;
      if (Date.now() - cachedTs < ttlMs) {
        res.setHeader("Cache-Control", "no-cache");
        return res.status(200).json({ response: cached, cached: true, age: Math.round((Date.now() - cachedTs) / 1000) });
      }
    }
  }

  // Fetch — try Highlightly first (real-time scores), fall back to football-data.org (fixtures only)
  let fixtures = [];
  let source = "none";
  let errors = [];

  try {
    fixtures = await fetchFromHighlightly();
    source = "highlightly";
  } catch(err) {
    console.warn("[livescores] Highlightly failed:", err.message);
    errors.push(`highlightly: ${err.message}`);

    try {
      fixtures = await fetchFromESPN();
      source = "espn";
    } catch(err2) {
      console.warn("[livescores] ESPN failed:", err2.message);
      errors.push(`espn: ${err2.message}`);

      try {
        fixtures = await fetchFromFootballData();
        source = "football-data.org";
      } catch(err3) {
        console.error("[livescores] All sources failed:", err3.message);
        errors.push(`football-data.org: ${err3.message}`);
      }
    }
  }

  if (fixtures.length > 0) {
    const kvTtl = getSmartTTL(fixtures);
    try {
      await Promise.all([
        kv.set(CACHE_KEY, fixtures, { ex: kvTtl * 2 }),
        kv.set(CACHE_TS_KEY, String(Date.now()), { ex: kvTtl * 2 }),
      ]);
    } catch(e) { console.warn("[livescores] KV write:", e.message); }
  }

  // If both failed, return stale cache or empty
  if (fixtures.length === 0 && errors.length > 0) {
    let stale = null;
    try { stale = await kv.get(CACHE_KEY); } catch(e) {}
    return res.status(200).json({
      response: stale || [],
      cached: !!stale,
      stale: true,
      errors,
    });
  }

  res.setHeader("Cache-Control", "no-cache");
  return res.status(200).json({
    response: fixtures,
    cached: false,
    source,
    ...(debug ? { errors } : {}),
  });
}
