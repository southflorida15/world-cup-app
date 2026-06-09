// /api/livescores.js
// Live scores via Highlightly API (football-highlights-api.p.rapidapi.com)
// League ID 1635 = FIFA World Cup 2026
// KV-backed cache (Upstash Redis) so ALL serverless instances share one cache.
// This keeps API calls well under 100/day on the free tier.

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

// ── Match window guard ────────────────────────────────────────────────────
// All 104 WC 2026 kickoff times in UTC. No API call needed to check this.
const KICKOFFS = [
  "2026-06-11T19:00:00Z",
  "2026-06-12T02:00:00Z",
  "2026-06-12T19:00:00Z",
  "2026-06-13T01:00:00Z",
  "2026-06-13T19:00:00Z",
  "2026-06-13T22:00:00Z",
  "2026-06-14T01:00:00Z",
  "2026-06-14T03:59:00Z",
  "2026-06-14T17:00:00Z",
  "2026-06-14T20:00:00Z",
  "2026-06-14T23:00:00Z",
  "2026-06-15T02:00:00Z",
  "2026-06-15T16:00:00Z",
  "2026-06-15T19:00:00Z",
  "2026-06-15T22:00:00Z",
  "2026-06-16T01:00:00Z",
  "2026-06-16T19:00:00Z",
  "2026-06-16T22:00:00Z",
  "2026-06-17T01:00:00Z",
  "2026-06-17T03:59:00Z",
  "2026-06-17T17:00:00Z",
  "2026-06-17T20:00:00Z",
  "2026-06-17T23:00:00Z",
  "2026-06-18T02:00:00Z",
  "2026-06-18T16:00:00Z",
  "2026-06-18T19:00:00Z",
  "2026-06-18T22:00:00Z",
  "2026-06-19T01:00:00Z",
  "2026-06-19T19:00:00Z",
  "2026-06-19T22:00:00Z",
  "2026-06-20T00:30:00Z",
  "2026-06-20T03:00:00Z",
  "2026-06-20T17:00:00Z",
  "2026-06-20T20:00:00Z",
  "2026-06-21T01:00:00Z",
  "2026-06-21T03:59:00Z",
  "2026-06-21T16:00:00Z",
  "2026-06-21T19:00:00Z",
  "2026-06-21T22:00:00Z",
  "2026-06-22T01:00:00Z",
  "2026-06-22T17:00:00Z",
  "2026-06-22T21:00:00Z",
  "2026-06-23T00:00:00Z",
  "2026-06-23T03:00:00Z",
  "2026-06-23T17:00:00Z",
  "2026-06-23T20:00:00Z",
  "2026-06-23T23:00:00Z",
  "2026-06-24T02:00:00Z",
  "2026-06-24T19:00:00Z",
  "2026-06-24T19:00:00Z",
  "2026-06-24T22:00:00Z",
  "2026-06-24T22:00:00Z",
  "2026-06-25T01:00:00Z",
  "2026-06-25T01:00:00Z",
  "2026-06-25T20:00:00Z",
  "2026-06-25T20:00:00Z",
  "2026-06-25T23:00:00Z",
  "2026-06-25T23:00:00Z",
  "2026-06-26T02:00:00Z",
  "2026-06-26T02:00:00Z",
  "2026-06-26T19:00:00Z",
  "2026-06-26T19:00:00Z",
  "2026-06-27T00:00:00Z",
  "2026-06-27T00:00:00Z",
  "2026-06-27T03:00:00Z",
  "2026-06-27T03:00:00Z",
  "2026-06-27T21:00:00Z",
  "2026-06-27T21:00:00Z",
  "2026-06-27T23:30:00Z",
  "2026-06-27T23:30:00Z",
  "2026-06-28T02:00:00Z",
  "2026-06-28T02:00:00Z",
  "2026-06-28T23:00:00Z",
  "2026-06-29T17:00:00Z",
  "2026-06-29T20:30:00Z",
  "2026-06-30T01:00:00Z",
  "2026-06-30T17:00:00Z",
  "2026-06-30T21:00:00Z",
  "2026-07-01T01:00:00Z",
  "2026-07-01T16:00:00Z",
  "2026-07-01T20:00:00Z",
  "2026-07-02T00:00:00Z",
  "2026-07-02T19:00:00Z",
  "2026-07-02T23:00:00Z",
  "2026-07-03T03:00:00Z",
  "2026-07-03T18:00:00Z",
  "2026-07-03T22:00:00Z",
  "2026-07-04T01:30:00Z",
  "2026-07-04T17:00:00Z",
  "2026-07-04T21:00:00Z",
  "2026-07-05T20:00:00Z",
  "2026-07-06T00:00:00Z",
  "2026-07-06T19:00:00Z",
  "2026-07-07T00:00:00Z",
  "2026-07-07T16:00:00Z",
  "2026-07-07T20:00:00Z",
  "2026-07-09T20:00:00Z",
  "2026-07-10T19:00:00Z",
  "2026-07-11T21:00:00Z",
  "2026-07-12T01:00:00Z",
  "2026-07-14T19:00:00Z",
  "2026-07-15T19:00:00Z",
  "2026-07-18T21:00:00Z",
  "2026-07-19T19:00:00Z"
];
const WINDOW_MS = 150 * 60 * 1000; // 2.5 hrs — covers 90min + ET + injury time

function isMatchWindowActive() {
  const now = Date.now();
  return KICKOFFS.some(k => {
    const ko = new Date(k).getTime();
    return now >= ko && now <= ko + WINDOW_MS;
  });
}

const CACHE_KEY     = "wc2026:livescores";
const CACHE_TS_KEY  = "wc2026:livescores:ts";

// TTLs in seconds (for KV expiry) and ms (for freshness check)
// Smart-stretch TTLs — fewer concurrent matches = tighter polling
const TTL_LIVE_SOLO   = 2 * 60;   // 2min  — 1 match live
const TTL_LIVE_MULTI  = 5 * 60;   // 5min  — 2-3 matches live
const TTL_LIVE_HEAVY  = 8 * 60;   // 8min  — 4+ matches live (group stage crunch)
const TTL_NORMAL      = 60 * 60;  // 1hr   — window active but no live matches
const TTL_FINISHED    = 30 * 60;  // 30min — all done for the day

function getSmartTTL(fixtures) {
  const liveCount = fixtures.filter(f => LIVE_STATUSES.includes(f?.fixture?.status?.short)).length;
  if (liveCount === 0) return allFinishedToday(fixtures) ? TTL_FINISHED : TTL_NORMAL;
  if (liveCount >= 4) return TTL_LIVE_HEAVY;
  if (liveCount >= 2) return TTL_LIVE_MULTI;
  return TTL_LIVE_SOLO;
}

const LIVE_STATUSES     = ["LIVE","1H","HT","2H","ET","BT","P","INT","inprogress","first_half","halftime","second_half","extra_time","penalties"];
const FINISHED_STATUSES = ["FT","AET","PEN","AWD","WO","finished","ended","after_extra_time","after_penalties"];

function isAnyLive(fixtures) {
  return fixtures.some(f => LIVE_STATUSES.includes(f?.fixture?.status?.short));
}
function allFinishedToday(fixtures) {
  const today = new Date().toDateString();
  const todayF = fixtures.filter(f => new Date(f?.fixture?.date || 0).toDateString() === today);
  if (!todayF.length) return false;
  return todayF.every(f => FINISHED_STATUSES.includes(f?.fixture?.status?.short || "NS"));
}

function mapMatch(m) {
  const statusRaw = m.status || m.matchStatus || "NS";
  const statusMap = {
    "LIVE":"LIVE","1H":"1H","HT":"HT","2H":"2H","ET":"ET","PEN":"P",
    "FT":"FT","AET":"AET","NS":"NS","TBD":"NS","PST":"TBD","CANC":"CANC",
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
    league:  { id: parseInt(LEAGUE_ID), season: parseInt(SEASON) },
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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── Window guard — skip entirely if no match is active ───────────────────
  if (!isMatchWindowActive()) {
    // No match playing — return frozen cache or empty response
    let frozen = null;
    try { frozen = await kv.get(CACHE_KEY); } catch(e) {}
    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).json({
      response: frozen || [],
      cached: true,
      windowActive: false,
    });
  }

  // ── Read shared KV cache ──────────────────────────────────────────────────
  let cached = null;
  let cachedTs = 0;
  try {
    const [raw, ts] = await Promise.all([
      kv.get(CACHE_KEY),
      kv.get(CACHE_TS_KEY),
    ]);
    if (raw) { cached = raw; cachedTs = parseInt(ts || "0"); }
  } catch (e) {
    console.warn("[livescores] KV read error:", e.message);
  }

  // ── Check freshness ───────────────────────────────────────────────────────
  if (cached) {
    const ttlMs = getSmartTTL(cached) * 1000;
    if (Date.now() - cachedTs < ttlMs) {
      res.setHeader("Cache-Control", "no-cache");
      return res.status(200).json({
        response: cached,
        cached: true,
        age: Math.round((Date.now() - cachedTs) / 1000),
      });
    }
  }

  // ── Fetch from Highlightly ────────────────────────────────────────────────
  try {
    const url = `${BASE}/matches?leagueId=${LEAGUE_ID}&season=${SEASON}&limit=200`;
    const r = await fetch(url, {
      headers: {
        "X-RapidAPI-Key":  RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    });

    if (!r.ok) {
      if (cached) {
        console.warn(`[livescores] API ${r.status}, serving stale cache`);
        return res.status(200).json({ response: cached, cached: true, stale: true });
      }
      const body = await r.text().catch(() => "");
      throw new Error(`Highlightly API ${r.status}: ${body.slice(0, 200)}`);
    }

    const data     = await r.json();
    const raw      = Array.isArray(data) ? data : (data.data || data.matches || data.response || []);
    const fixtures = raw.map(mapMatch);

    // ── Write to KV cache ─────────────────────────────────────────────────
    const kvTtl = getSmartTTL(fixtures);

    try {
      await Promise.all([
        kv.set(CACHE_KEY,    fixtures,             { ex: kvTtl * 2 }), // keep 2x TTL so stale fallback works
        kv.set(CACHE_TS_KEY, String(Date.now()),   { ex: kvTtl * 2 }),
      ]);
    } catch (e) {
      console.warn("[livescores] KV write error:", e.message);
    }

    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).json({ response: fixtures, cached: false });

  } catch (err) {
    console.error("[livescores] error:", err.message);
    if (cached) {
      return res.status(200).json({ response: cached, cached: true, stale: true, error: err.message });
    }
    return res.status(500).json({ error: err.message, response: [] });
  }
}
