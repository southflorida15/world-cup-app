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
const CACHE_KEY     = "wc2026:livescores";
const CACHE_TS_KEY  = "wc2026:livescores:ts";

// TTLs in seconds (for KV expiry) and ms (for freshness check)
const TTL_LIVE     = 4 * 60;             // 4min live — ~24 calls/match
const TTL_NORMAL   = 15 * 60;       // 15min off-peak — minimal quota use
const TTL_FINISHED = 30 * 60;    // 30min when all done for the day

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
    let ttlMs = TTL_NORMAL * 1000;
    if (isAnyLive(cached))              ttlMs = TTL_LIVE * 1000;
    else if (allFinishedToday(cached))  ttlMs = TTL_FINISHED * 1000;

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
    // Pick TTL for KV expiry based on match state
    let kvTtl = TTL_NORMAL;
    if (isAnyLive(fixtures))              kvTtl = TTL_LIVE;
    else if (allFinishedToday(fixtures))  kvTtl = TTL_FINISHED;

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
