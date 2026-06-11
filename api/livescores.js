// /api/livescores.js
// Live scores via Highlightly API (football-highlights-api.p.rapidapi.com)
// League ID 1635 = FIFA World Cup 2026
// Fetches by DATE (required by Highlightly) — today + yesterday to catch late finishers.
// KV-backed shared cache keeps calls well under 100/day.

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "football-highlights-api.p.rapidapi.com";
const BASE          = `https://${RAPIDAPI_HOST}`;
const LEAGUE_ID     = "1635";

const CACHE_KEY    = "wc2026:livescores";
const CACHE_TS_KEY = "wc2026:livescores:ts";

// ── Match window guard ─────────────────────────────────────────────────────
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
const WINDOW_MS = 150 * 60 * 1000; // 2.5 hrs

function isMatchWindowActive() {
  const now = Date.now();
  return KICKOFFS.some(k => {
    const ko = new Date(k).getTime();
    return now >= ko && now <= ko + WINDOW_MS;
  });
}

// Smart TTLs based on how many matches are live
const LIVE_STATUSES     = ["LIVE","1H","HT","2H","ET","BT","P","INT","inprogress","first_half","halftime","second_half","extra_time","penalties"];
const FINISHED_STATUSES = ["FT","AET","PEN","AWD","WO","finished","ended","after_extra_time","after_penalties"];

function getSmartTTL(fixtures) {
  const liveCount = fixtures.filter(f => LIVE_STATUSES.includes(f?.fixture?.status?.short)).length;
  if (liveCount >= 4) return 8 * 60;
  if (liveCount >= 2) return 5 * 60;
  if (liveCount >= 1) return 2 * 60;
  return 60 * 60; // 1hr off-peak
}

function toDateStr(d) {
  // Returns YYYY-MM-DD in UTC
  return d.toISOString().slice(0, 10);
}

function mapMatch(m) {
  const statusRaw = m.status || m.matchStatus || "NS";
  const statusMap = {
    "LIVE":"LIVE","1H":"1H","HT":"HT","2H":"2H","ET":"ET","PEN":"P","BT":"BT",
    "FT":"FT","AET":"AET","NS":"NS","TBD":"NS","PST":"TBD","CANC":"CANC","ABD":"CANC",
    "finished":"FT","inprogress":"LIVE","first_half":"1H","halftime":"HT",
    "second_half":"2H","extra_time":"ET","penalties":"P",
    "ended":"FT","after_extra_time":"AET","after_penalties":"PEN",
  };
  const short = statusMap[statusRaw] || statusRaw;
  const homeGoals = m.homeScore ?? m.homeGoals ?? m.score?.home ?? null;
  const awayGoals = m.awayScore ?? m.awayGoals ?? m.score?.away ?? null;
  return {
    fixture: {
      id:     m.id || m.matchId,
      date:   m.date || m.startTime || m.kickoff,
      status: { short, elapsed: m.elapsed ?? m.minute ?? null },
      venue:  { name: m.venue || m.stadium || "", city: m.city || "" },
    },
    league: { id: parseInt(LEAGUE_ID), season: 2026 },
    teams: {
      home: { id: m.homeTeam?.id, name: m.homeTeam?.name || m.home || "" },
      away: { id: m.awayTeam?.id, name: m.awayTeam?.name || m.away || "" },
    },
    goals: {
      home: homeGoals !== null && homeGoals !== undefined ? parseInt(homeGoals) : null,
      away: awayGoals !== null && awayGoals !== undefined ? parseInt(awayGoals) : null,
    },
    score: { fulltime: { home: homeGoals, away: awayGoals } },
    events: m.events || [],
  };
}

async function fetchMatchesForDate(dateStr) {
  const url = `${BASE}/matches?leagueId=${LEAGUE_ID}&date=${dateStr}&limit=50&timezone=Etc%2FUTC`;
  const r = await fetch(url, {
    headers: {
      "X-RapidAPI-Key":  RAPIDAPI_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
    },
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`Highlightly ${r.status}: ${body.slice(0, 200)}`);
  }
  const data = await r.json();
  const raw = Array.isArray(data) ? data : (data.data || data.matches || data.response || []);
  return raw.map(mapMatch);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── Window guard ──────────────────────────────────────────────────────────
  if (!isMatchWindowActive()) {
    let frozen = null;
    try { frozen = await kv.get(CACHE_KEY); } catch(e) {}
    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).json({ response: frozen || [], cached: true, windowActive: false });
  }

  // ── Read KV cache ─────────────────────────────────────────────────────────
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

  // ── Fetch from Highlightly ─────────────────────────────────────────────────
  try {
    const now = new Date();
    const todayStr = toDateStr(now);

    // Also fetch yesterday in case of late-night matches crossing midnight UTC
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = toDateStr(yesterday);

    // Fetch today (required). Fetch yesterday only if within 3hrs of midnight UTC.
    const hourUTC = now.getUTCHours();
    const fetchYesterday = hourUTC < 3; // before 3am UTC, yesterday's late games may still be live

    const [todayFixtures, yesterdayFixtures] = await Promise.all([
      fetchMatchesForDate(todayStr),
      fetchYesterday ? fetchMatchesForDate(yesterdayStr) : Promise.resolve([]),
    ]);

    // Merge, deduplicate by fixture ID
    const seen = new Set();
    const fixtures = [...todayFixtures, ...yesterdayFixtures].filter(f => {
      const id = f.fixture?.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // Write to KV
    const kvTtl = getSmartTTL(fixtures);
    try {
      await Promise.all([
        kv.set(CACHE_KEY, fixtures, { ex: kvTtl * 2 }),
        kv.set(CACHE_TS_KEY, String(Date.now()), { ex: kvTtl * 2 }),
      ]);
    } catch(e) { console.warn("[livescores] KV write:", e.message); }

    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).json({ response: fixtures, cached: false });

  } catch(err) {
    console.error("[livescores] error:", err.message);
    if (cached) return res.status(200).json({ response: cached, cached: true, stale: true, error: err.message });
    return res.status(500).json({ error: err.message, response: [] });
  }
}