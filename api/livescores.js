// /api/livescores.js
// Live scores via Highlightly API (football-highlights-api.p.rapidapi.com)
// League ID 1635 = FIFA World Cup 2026
// Returns fixtures shaped like API-Football so the frontend needs no changes.

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "football-highlights-api.p.rapidapi.com";
const BASE          = `https://${RAPIDAPI_HOST}`;
const LEAGUE_ID     = "1635";  // World Cup 2026 on Highlightly
const SEASON        = "2026";

// Server-side cache — one real API call per TTL regardless of user count
let cache   = null;
let cacheTs = 0;
const TTL_LIVE     = 45  * 1000;       // 45s when matches are live
const TTL_NORMAL   = 90  * 1000;       // 90s otherwise
const TTL_FINISHED = 10  * 60 * 1000;  // 10min when all done for the day

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

// Map Highlightly match → API-Football-compatible fixture shape
// so the existing frontend code (normTeam, getScore, etc.) works unchanged
function mapMatch(m) {
  const statusRaw = m.status || m.matchStatus || "NS";
  // Normalise status to API-Football short codes
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
    league: {
      id:     parseInt(LEAGUE_ID),
      season: parseInt(SEASON),
    },
    teams: {
      home: { id: m.homeTeam?.id, name: m.homeTeam?.name || m.home || "" },
      away: { id: m.awayTeam?.id, name: m.awayTeam?.name || m.away || "" },
    },
    goals: {
      home: homeGoals !== null && homeGoals !== undefined ? parseInt(homeGoals) : null,
      away: awayGoals !== null && awayGoals !== undefined ? parseInt(awayGoals) : null,
    },
    score: {
      fulltime: { home: homeGoals, away: awayGoals },
    },
    events: m.events || [],
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const now = Date.now();
  let ttl = TTL_NORMAL;
  if (cache) {
    if (isAnyLive(cache))         ttl = TTL_LIVE;
    else if (allFinishedToday(cache)) ttl = TTL_FINISHED;
  }

  // Serve cache if still fresh
  if (cache && (now - cacheTs) < ttl) {
    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).json({ response: cache, cached: true, age: Math.round((now - cacheTs) / 1000) });
  }

  try {
    // Fetch all WC 2026 matches from Highlightly
    const url = `${BASE}/matches?leagueId=${LEAGUE_ID}&season=${SEASON}&limit=200`;
    const r = await fetch(url, {
      headers: {
        "X-RapidAPI-Key":  RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    });

    if (!r.ok) {
      if (cache) {
        console.warn(`[livescores] Highlightly returned ${r.status}, serving stale cache`);
        return res.status(200).json({ response: cache, cached: true, stale: true });
      }
      const body = await r.text().catch(() => "");
      throw new Error(`Highlightly API returned ${r.status}: ${body.slice(0, 100)}`);
    }

    const data = await r.json();

    // Highlightly returns { data: [...] } or just an array
    const raw = Array.isArray(data) ? data : (data.data || data.matches || data.response || []);
    const fixtures = raw.map(mapMatch);

    cache   = fixtures;
    cacheTs = now;

    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).json({ response: fixtures, cached: false });

  } catch (err) {
    console.error("[livescores] error:", err.message);
    if (cache) {
      return res.status(200).json({ response: cache, cached: true, stale: true, error: err.message });
    }
    return res.status(500).json({ error: err.message, response: [] });
  }
}
