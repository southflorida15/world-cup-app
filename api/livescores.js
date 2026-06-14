// /api/livescores.js
// Live scores — ESPN primary (no quota), Highlightly fallback.
// Finished results are persisted permanently in KV so they survive
// beyond ESPN's feed window (which only returns today's matches).

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
const HL_KEY    = process.env.RAPIDAPI_KEY;
const HL_HOST   = process.env.RAPIDAPI_HOST || "football-highlights-api.p.rapidapi.com";
const HL_BASE   = `https://${HL_HOST}`;
const HL_LEAGUE_ID = "1635";

const CACHE_KEY        = "wc2026:livescores";
const CACHE_TS_KEY     = "wc2026:livescores:ts";
const RESULTS_KEY      = "wc2026:results"; // permanent finished scores

const LIVE_STATUSES     = ["LIVE","1H","HT","2H","ET","BT","P","INT","IN_PLAY","PAUSED"];
const FINISHED_STATUSES = ["FT","AET","PEN","AWD","WO","FINISHED","AWARDED"];

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

function isKickoffImminent() {
  const now = Date.now();
  return KICKOFFS.some(k => {
    const ko = new Date(k).getTime();
    return now >= ko - 10 * 60 * 1000 && now <= ko + 20 * 60 * 1000;
  });
}

function getSmartTTL(fixtures) {
  const liveCount = fixtures.filter(f => LIVE_STATUSES.includes(f?.fixture?.status?.short)).length;
  if (liveCount >= 4) return 3 * 60;
  if (liveCount >= 2) return 2 * 60;
  if (liveCount >= 1) return 60;
  if (isKickoffImminent()) return 30;
  return 60 * 60;
}

// ── Persistent results store ───────────────────────────────────────────────
// Saves finished match scores permanently to KV (no expiry).
// Key: wc2026:results → { "Home|Away": { hg, ag, status, elapsed } }
async function loadPersistedResults() {
  try {
    const r = await kv.get(RESULTS_KEY);
    return r || {};
  } catch(e) {
    console.warn("[livescores] load persisted results:", e.message);
    return {};
  }
}

async function persistFinishedResults(fixtures) {
  try {
    const existing = await loadPersistedResults();
    let changed = false;
    fixtures.forEach(f => {
      const h = f?.teams?.home?.name;
      const a = f?.teams?.away?.name;
      const status = f?.fixture?.status?.short;
      if (!h || !a) return;
      if (!FINISHED_STATUSES.includes(status)) return;
      const key = `${h}|${a}`;
      const hg = f?.goals?.home;
      const ag = f?.goals?.away;
      if (hg === null || ag === null) return;
      // Only persist if we have actual scores and it's an improvement
      if (!existing[key] || existing[key].hg !== hg || existing[key].ag !== ag) {
        existing[key] = { hg, ag, status, elapsed: f?.fixture?.status?.elapsed || 90 };
        changed = true;
      }
    });
    if (changed) {
      await kv.set(RESULTS_KEY, existing); // no expiry — permanent
      console.log(`[livescores] Persisted ${Object.keys(existing).length} finished results`);
    }
    return existing;
  } catch(e) {
    console.warn("[livescores] persist results:", e.message);
    return {};
  }
}

// Merge persisted results back into fixture list
// Persisted results fill in any gaps where ESPN feed has dropped old matches
function mergePersistedResults(fixtures, persisted) {
  if (!persisted || Object.keys(persisted).length === 0) return fixtures;
  const seen = new Set(fixtures.map(f => `${f?.teams?.home?.name}|${f?.teams?.away?.name}`));
  const extra = [];
  Object.entries(persisted).forEach(([key, r]) => {
    if (seen.has(key)) return; // already in live feed
    const [home, away] = key.split("|");
    extra.push({
      fixture: {
        id: key,
        date: "",
        status: { short: r.status || "FT", elapsed: r.elapsed || 90 },
        venue: { name: "", city: "" },
      },
      league: { id: 1635, season: 2026 },
      teams: { home: { name: home }, away: { name: away } },
      goals: { home: r.hg, away: r.ag },
      score: { fulltime: { home: r.hg, away: r.ag } },
      events: [],
      _source: "persisted",
    });
  });
  return [...fixtures, ...extra];
}

// ── ESPN mapper ────────────────────────────────────────────────────────────
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
  "Czech Republic": "Czechia",
};
const normESPN = n => ESPN_NAME_MAP[n] || n;

function mapESPNEvent(event) {
  const comp = event.competitions?.[0];
  if (!comp) return null;
  const home = comp.competitors?.find(c => c.homeAway === "home");
  const away = comp.competitors?.find(c => c.homeAway === "away");
  if (!home || !away) return null;

  const statusType = comp.status?.type?.name || "STATUS_SCHEDULED";
  let short = ESPN_STATUS_MAP[statusType] || "NS";
  const clock = comp.status?.displayClock;
  const detail = comp.status?.detail || comp.status?.type?.detail || comp.status?.type?.shortDetail || comp.status?.type?.description || "";
  const elapsed = clock && clock !== "0:00" ? parseInt(clock.split(":")[0]) : null;

  if (elapsed >= 45 && elapsed <= 50 || elapsed >= 90) {
    console.log(`[livescores] injury time status fields:`, JSON.stringify({
      displayClock: clock,
      detail: comp.status?.detail,
      typeDetail: comp.status?.type?.detail,
      shortDetail: comp.status?.type?.shortDetail,
      description: comp.status?.type?.description,
      statusType: comp.status?.type,
    }));
  }
  // e.g. displayClock "90:04" during injury time → elapsedCurrent = 4
  // detail "90+7'" → totalAdded = 7
  // We store both: elapsed=90, elapsedExtra=currentExtraMin, elapsedTotal=totalAdded
  let elapsedExtra = null;
  let elapsedTotal = null;
  const detailMatch = detail.match(/(\d+)\+(\d+)/);
  if (detailMatch) {
    elapsedTotal = parseInt(detailMatch[2]); // total added time (e.g. 7)
  }
  if (clock && elapsed !== null && elapsed >= 45) {
    const secs = parseInt(clock.split(":")[1] || "0");
    if (secs > 0 || elapsed > 90) {
      // Current extra minute elapsed = minutes portion beyond base time
      const baseTime = elapsed >= 90 ? 90 : 45;
      const extraElapsed = elapsed - baseTime;
      elapsedExtra = extraElapsed > 0 ? extraElapsed : (secs > 0 ? 1 : null);
    }
  }
  // Fallback: if clock has + format (shouldn't happen with ESPN but just in case)
  if (elapsedExtra === null && clock && clock.includes("+")) {
    elapsedExtra = parseInt(clock.split("+")[1]) || null;
  }
  // ESPN sometimes returns NS with elapsed > 0 — fix it
  if (short === "NS" && elapsed && elapsed > 0) {
    short = elapsed <= 45 ? "1H" : elapsed <= 50 ? "HT" : elapsed <= 95 ? "2H" : "ET";
  }
  const hg = home.score !== undefined && home.score !== "" ? parseInt(home.score) : null;
  const ag = away.score !== undefined && away.score !== "" ? parseInt(away.score) : null;

  return {
    fixture: {
      id: event.id,
      date: comp.date || event.date,
      status: { short, elapsed, elapsedExtra, elapsedTotal },
      venue: { name: comp.venue?.fullName || "", city: comp.venue?.address?.city || "" },
    },
    league: { id: 1635, season: 2026 },
    teams: {
      home: { id: home.team?.id, name: normESPN(home.team?.displayName || home.team?.name || "") },
      away: { id: away.team?.id, name: normESPN(away.team?.displayName || away.team?.name || "") },
    },
    goals: { home: hg, away: ag },
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

  // Flush cache (not results — those are permanent)
  if (req.query.flush === "1") {
    try {
      await Promise.all([kv.del(CACHE_KEY), kv.del(CACHE_TS_KEY)]);
      return res.status(200).json({ ok: true, flushed: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Seed known results that predate the persistence system
  if (req.query.seed === "1") {
    const known = {
      "Mexico|South Africa":        { hg: 2, ag: 0, status: "FT", elapsed: 90 },
      "South Korea|Czechia":         { hg: 2, ag: 1, status: "FT", elapsed: 90 },
      "Canada|Bosnia-Herzegovina":   { hg: 1, ag: 1, status: "FT", elapsed: 90 },
      "United States|Paraguay":      { hg: 4, ag: 1, status: "FT", elapsed: 90 },
      "Qatar|Switzerland":           { hg: 1, ag: 1, status: "FT", elapsed: 90 },
      "Brazil|Morocco":              { hg: 1, ag: 1, status: "FT", elapsed: 90 },
      "Haiti|Scotland":              { hg: 0, ag: 1, status: "FT", elapsed: 90 },
      "Australia|Turkiye":           { hg: 2, ag: 0, status: "FT", elapsed: 90 },
      "Australia|Türkiye":           { hg: 2, ag: 0, status: "FT", elapsed: 90 },
      "Germany|Curacao":             { hg: 7, ag: 1, status: "FT", elapsed: 90 },
      "Netherlands|Japan":           { hg: 2, ag: 2, status: "FT", elapsed: 90 },
    };
    try {
      const existing = await loadPersistedResults();
      const merged = { ...known, ...existing }; // existing takes priority (don't overwrite newer data)
      await kv.set(RESULTS_KEY, merged);
      return res.status(200).json({ ok: true, seeded: Object.keys(known), total: Object.keys(merged).length });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Load persisted results first — always available regardless of window
  let persisted = await loadPersistedResults();

  // Auto-seed known results if store is empty (self-healing)
  if (Object.keys(persisted).length === 0) {
    const known = {
      "Mexico|South Africa":        { hg: 2, ag: 0, status: "FT", elapsed: 90 },
      "South Korea|Czechia":         { hg: 2, ag: 1, status: "FT", elapsed: 90 },
      "Canada|Bosnia-Herzegovina":   { hg: 1, ag: 1, status: "FT", elapsed: 90 },
      "United States|Paraguay":      { hg: 4, ag: 1, status: "FT", elapsed: 90 },
      "Qatar|Switzerland":           { hg: 1, ag: 1, status: "FT", elapsed: 90 },
      "Brazil|Morocco":              { hg: 1, ag: 1, status: "FT", elapsed: 90 },
      "Haiti|Scotland":              { hg: 0, ag: 1, status: "FT", elapsed: 90 },
      "Australia|Turkiye":           { hg: 2, ag: 0, status: "FT", elapsed: 90 },
      "Australia|Türkiye":           { hg: 2, ag: 0, status: "FT", elapsed: 90 },
      "Germany|Curacao":             { hg: 7, ag: 1, status: "FT", elapsed: 90 },
      "Netherlands|Japan":           { hg: 2, ag: 2, status: "FT", elapsed: 90 },
    };
    try { await kv.set(RESULTS_KEY, known); persisted = known; } catch(e) {}
  }

  // Outside match window — return persisted results only
  // Exception: if kickoff is imminent, fall through to fresh fetch
  if (!debug && !isMatchWindowActive() && !isKickoffImminent()) {
    let frozen = null;
    try { frozen = await kv.get(CACHE_KEY); } catch(e) {}
    const combined = mergePersistedResults(frozen || [], persisted);
    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).json({ response: combined, cached: true, windowActive: false });
  }

  // KV cache check — skip entirely when kickoff is imminent
  if (!debug && !isKickoffImminent()) {
    let cached = null, cachedTs = 0;
    try {
      const [raw, ts] = await Promise.all([kv.get(CACHE_KEY), kv.get(CACHE_TS_KEY)]);
      if (raw) { cached = raw; cachedTs = parseInt(ts || "0"); }
    } catch(e) { console.warn("[livescores] KV read:", e.message); }

    if (cached) {
      const ttlMs = getSmartTTL(cached) * 1000;
      if (Date.now() - cachedTs < ttlMs) {
        const combined = mergePersistedResults(cached, persisted);
        res.setHeader("Cache-Control", "no-cache");
        return res.status(200).json({ response: combined, cached: true, age: Math.round((Date.now() - cachedTs) / 1000) });
      }
    }
  }

  // Fetch fresh data
  let fixtures = [];
  let source = "none";
  let errors = [];

  // ESPN first — more reliable for live scores
  try {
    fixtures = await fetchFromESPN();
    source = "espn";
  } catch(err) {
    errors.push(`espn: ${err.message}`);
    try {
      fixtures = await fetchFromHighlightly();
      source = "highlightly";
    } catch(err2) {
      errors.push(`highlightly: ${err2.message}`);
    }
  }

  if (fixtures.length > 0) {
    // Persist any newly finished results permanently
    await persistFinishedResults(fixtures);

    const kvTtl = getSmartTTL(fixtures);
    try {
      await Promise.all([
        kv.set(CACHE_KEY, fixtures, { ex: kvTtl * 2 }),
        kv.set(CACHE_TS_KEY, String(Date.now()), { ex: kvTtl * 2 }),
      ]);
    } catch(e) { console.warn("[livescores] KV write:", e.message); }
  }

  // If fetch failed, return stale + persisted
  if (fixtures.length === 0 && errors.length > 0) {
    let stale = null;
    try { stale = await kv.get(CACHE_KEY); } catch(e) {}
    const combined = mergePersistedResults(stale || [], persisted);
    return res.status(200).json({ response: combined, cached: !!stale, stale: true, errors });
  }

  // Merge persisted results for any matches not in today's feed
  const combined = mergePersistedResults(fixtures, persisted);

  res.setHeader("Cache-Control", "no-cache");
  return res.status(200).json({
    response: combined,
    cached: false,
    source,
    ...(debug ? { errors, persistedCount: Object.keys(persisted).length } : {}),
  });
}
