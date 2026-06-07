// /api/livescores.js
// Returns ALL World Cup 2026 fixtures from API-Football with:
//   - Live scores (polling every 60s from frontend)
//   - Match status (NS, 1H, HT, 2H, FT, etc.)
//   - Goals scored
//   - Top scorers (from goals in events)
//   - Recent form per team (last 4 finished WC matches)
//
// The frontend's LiveScoresProvider polls this every 60s.
// allFixtures array is used throughout the app for:
//   1. Live scores on all match cards
//   2. Recent form in Stats tab (auto-switches from static RECENT4 to live data)
//   3. Top scorers tab (aggregates goals from events)
//   4. Groups tab (auto-merges live scores into standings)

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "api-football-v1.p.rapidapi.com";
const WC_LEAGUE_ID  = 1;    // FIFA World Cup league ID in API-Football
const WC_SEASON     = 2026;

// Cache — 45s for live data (so polling at 60s is always fresh)
// Server-side cache means only 1 actual API call per 45s regardless of user count
let cache = null;
let cacheTs = 0;
const TTL_LIVE     = 45  * 1000;  // 45s when matches are live
const TTL_NORMAL   = 90  * 1000;  // 90s otherwise
const TTL_FINISHED = 10  * 60 * 1000; // 10min when all done for the day

function isAnyLive(fixtures) {
  const LIVE = ["1H","HT","2H","ET","BT","P","LIVE","INT"];
  return fixtures.some(f => LIVE.includes(f?.fixture?.status?.short));
}

function allFinishedToday(fixtures) {
  const today = new Date().toDateString();
  const todayFixtures = fixtures.filter(f => {
    const d = new Date(f?.fixture?.date || 0);
    return d.toDateString() === today;
  });
  if (!todayFixtures.length) return false;
  return todayFixtures.every(f => {
    const s = f?.fixture?.status?.short || "NS";
    return ["FT","AET","PEN","AWD","WO"].includes(s);
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Determine cache TTL based on current match state
  const now = Date.now();
  let ttl = TTL_NORMAL;
  if (cache) {
    if (isAnyLive(cache)) ttl = TTL_LIVE;
    else if (allFinishedToday(cache)) ttl = TTL_FINISHED;
  }

  if (cache && (now - cacheTs) < ttl) {
    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).json({ response: cache, cached: true, age: Math.round((now - cacheTs) / 1000) });
  }

  try {
    const r = await fetch(
      `https://${RAPIDAPI_HOST}/v3/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`,
      {
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_HOST,
        },
      }
    );

    if (!r.ok) {
      // Return stale cache if available rather than failing
      if (cache) {
        console.warn(`[livescores] API returned ${r.status}, serving stale cache`);
        return res.status(200).json({ response: cache, cached: true, stale: true });
      }
      throw new Error(`API-Football returned ${r.status}`);
    }

    const data = await r.json();
    const fixtures = data.response || [];

    cache = fixtures;
    cacheTs = now;

    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).json({ response: fixtures, cached: false });

  } catch (err) {
    console.error("[livescores] error:", err.message);

    // Return stale cache on error
    if (cache) {
      return res.status(200).json({ response: cache, cached: true, stale: true, error: err.message });
    }

    return res.status(500).json({ error: err.message, response: [] });
  }
}
