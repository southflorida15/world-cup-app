// /api/livescores.js
// Live scores via Highlightly API (football-highlights-api.p.rapidapi.com)
// Cache stored in Vercel KV so all serverless instances share it

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "football-highlights-api.p.rapidapi.com";
const BASE          = `https://${RAPIDAPI_HOST}`;
const LEAGUE_ID     = "1635";
const SEASON        = "2026";

const CACHE_KEY_DATA = "livescores:data";
const CACHE_KEY_TS   = "livescores:ts";
const TTL_LIVE       = 45;          // seconds — when matches are live
const TTL_NORMAL     = 90;          // seconds — otherwise
const TTL_FINISHED   = 10 * 60;    // seconds — all done for the day

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
      id:      m.id || m.matchId,
      date:    m.date || m.startTime || m.kickoff,
      status:  { short, elapsed: m.elapsed ?? m.minute ?? null },
      venue:   { name: m.venue || m.stadium || "", city: m.city || "" },
    },
    league: { id: parseInt(LEAGUE_ID), season: parseInt(SEASON) },
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

  const now = Date.now();

  try {
    // Load cache from KV
    const [cachedData, cachedTs] = await Promise.all([
      kv.get(CACHE_KEY_DATA),
      kv.get(CACHE_KEY_TS),
    ]);

    if (cachedData && cachedTs) {
      const age = (now - Number(cachedTs)) / 1000;
      let ttl = TTL_NORMAL;
      if (isAnyLive(cachedData))          ttl = TTL_LIVE;
      else if (allFinishedToday(cachedData)) ttl = TTL_FINISHED;

      if (age < ttl) {
        res.setHeader("Cache-Control", "no-cache");
        return res.status(200).json({ response: cachedData, cached: true, age: Math.round(age) });
      }
    }

    // Fetch fresh from Highlightly
    const url = `${BASE}/matches?leagueId=${LEAGUE_ID}&season=${SEASON}&limit=200`;
    const r = await fetch(url, {
      headers: {
        "X-RapidAPI-Key":  RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    });

    if (r.status === 429) {
      // Rate limited — serve stale cache if available
      if (cachedData) {
        console.warn("[livescores] Rate limited, serving stale cache");
        return res.status(200).json({ response: cachedData, cached: true, stale: true });
      }
      return res.status(429).json({ error: "Rate limited, no cache available", response: [] });
    }

    if (!r.ok) {
      if (cachedData) {
        console.warn(`[livescores] Highlightly ${r.status}, serving stale cache`);
        return res.status(200).json({ response: cachedData, cached: true, stale: true });
      }
      const body = await r.text().catch(() => "");
      throw new Error(`Highlightly API ${r.status}: ${body.slice(0, 100)}`);
    }

    const data = await r.json();
    const raw = Array.isArray(data) ? data : (data.data || data.matches || data.response || []);
    const fixtures = raw.map(mapMatch);

    // Store in KV with generous TTL (1 hour — the TTL above controls actual freshness)
    await Promise.all([
      kv.set(CACHE_KEY_DATA, fixtures, { ex: 3600 }),
      kv.set(CACHE_KEY_TS, now, { ex: 3600 }),
    ]);

    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).json({ response: fixtures, cached: false });

  } catch (err) {
    console.error("[livescores] error:", err.message);
    return res.status(500).json({ error: err.message, response: [] });
  }
}
