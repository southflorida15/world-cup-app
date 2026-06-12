// /api/matchevents.js
// Returns { events, stats } for a specific match via ESPN public API
// Usage: GET /api/matchevents?home=Brazil&away=France
//
// ESPN event IDs come from the livescores KV cache.
// Falls back to Highlightly if ESPN fails.

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ESPN_BASE    = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
const ESPN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Origin": "https://www.espn.com",
  "Referer": "https://www.espn.com/",
};

const LIVE_STATUSES = ["LIVE","1H","HT","2H","ET","BT","P","inprogress","first_half","halftime","second_half","extra_time","penalties","STATUS_IN_PROGRESS","STATUS_HALFTIME"];
const DONE_STATUSES = ["FT","AET","PEN","finished","ended","after_extra_time","after_penalties","STATUS_FINAL","STATUS_FULL_TIME"];

// In-process cache (avoids duplicate requests within same Vercel instance)
const memCache = {};
const TTL_LIVE = 30 * 1000;
const TTL_DONE = 60 * 60 * 1000;

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

// Map ESPN scoring play → API-Football event shape
function mapScoringPlay(play, homeTeam) {
  const teamName = normESPN(play.team?.displayName || play.team?.name || "");
  const isHome = teamName === homeTeam;
  const elapsed = play.clock?.value ? Math.round(play.clock.value / 60) : 
                  play.period?.number ? (play.period.number === 1 ? 45 : 90) : null;

  // Determine event type
  const text = (play.text || play.type?.text || "").toLowerCase();
  let type = "Goal";
  let detail = "Normal Goal";
  if (text.includes("own goal") || text.includes("og")) detail = "Own Goal";
  else if (text.includes("penalty") || text.includes("pen")) detail = "Penalty";

  const playerName = play.scoringPlay 
    ? (play.athletesInvolved?.[0]?.displayName || play.athlete?.displayName || "")
    : (play.athletesInvolved?.[0]?.displayName || "");

  return {
    time: { elapsed, extra: null },
    team: { id: play.team?.id, name: teamName },
    player: { id: null, name: playerName },
    assist: { id: null, name: play.athletesInvolved?.[1]?.displayName || null },
    type,
    detail,
    comments: "",
  };
}

// Map ESPN play-by-play event → API-Football event shape
function mapPlay(play, homeTeam) {
  const teamName = normESPN(play.team?.displayName || play.team?.name || "");
  const elapsed = play.clock?.value ? Math.round(play.clock.value / 60) :
                  play.clock?.displayValue ? parseInt(play.clock.displayValue) : null;
  
  const typeText = (play.type?.text || play.text || "").toLowerCase();
  let type = null;
  let detail = "";

  if (play.scoringPlay || typeText.includes("goal")) {
    type = "Goal";
    detail = typeText.includes("own goal") ? "Own Goal" : 
             typeText.includes("penalty") ? "Penalty" : "Normal Goal";
  } else if (typeText.includes("yellow card") || typeText.includes("caution")) {
    type = "Card";
    detail = "Yellow Card";
  } else if (typeText.includes("red card") || typeText.includes("ejection")) {
    type = "Card";
    detail = "Red Card";
  } else if (typeText.includes("substitution") || typeText.includes("sub ")) {
    type = "subst";
    detail = "Substitution";
  }

  if (!type) return null;

  const athletes = play.athletesInvolved || [];
  return {
    time: { elapsed, extra: null },
    team: { id: play.team?.id, name: teamName },
    player: { id: athletes[0]?.id, name: athletes[0]?.displayName || "" },
    assist: { id: athletes[1]?.id || null, name: athletes[1]?.displayName || null },
    type,
    detail,
    comments: "",
  };
}

// Parse ESPN boxscore stats
function parseStats(boxscore, homeTeam) {
  if (!boxscore?.teams?.length) return null;
  
  const result = { home: {}, away: {} };
  
  boxscore.teams.forEach(t => {
    const teamName = normESPN(t.team?.displayName || t.team?.name || "");
    const side = teamName === homeTeam ? "home" : "away";
    const stats = {};
    
    (t.statistics || []).forEach(s => {
      const name = (s.name || s.abbreviation || "").toLowerCase();
      const val = parseFloat(s.displayValue || s.value || 0);
      
      if (name.includes("possession")) stats.possession = val;
      else if (name === "shotsontarget" || name.includes("shots on target")) stats.shotsOn = val;
      else if (name === "shots" || name === "totalshots") stats.shots = val;
      else if (name.includes("corner")) stats.corners = val;
      else if (name.includes("foul")) stats.fouls = val;
      else if (name.includes("yellowcard") || name === "yellowcards") stats.yellowCards = val;
      else if (name.includes("redcard") || name === "redcards") stats.redCards = val;
      else if (name.includes("offside")) stats.offsides = val;
      else if (name.includes("save")) stats.saves = val;
      else if (name.includes("pass") && name.includes("acc")) stats.passAcc = val;
      else if (name.includes("pass") && !name.includes("acc")) stats.passes = val;
    });
    
    result[side] = stats;
  });
  
  return result;
}

// Get ESPN event ID from KV livescores cache
async function getESPNEventId(home, away) {
  try {
    const cached = await kv.get("wc2026:livescores");
    if (!cached) return null;
    const fixtures = Array.isArray(cached) ? cached : (cached?.response || []);
    const match = fixtures.find(f => {
      const h = normESPN(f?.teams?.home?.name || "");
      const a = normESPN(f?.teams?.away?.name || "");
      return h === home && a === away;
    });
    return match?.fixture?.id || null;
  } catch(e) {
    console.warn("[matchevents] KV lookup failed:", e.message);
    return null;
  }
}

async function fetchFromESPN(eventId, home) {
  const r = await fetch(`${ESPN_BASE}/summary?event=${eventId}`, { headers: ESPN_HEADERS });
  if (!r.ok) throw new Error(`ESPN summary ${r.status}`);
  const data = await r.json();

  const competition = data.header?.competitions?.[0];
  const statusShort = competition?.status?.type?.name || "NS";
  const isLive = LIVE_STATUSES.includes(statusShort);
  const isDone = DONE_STATUSES.includes(statusShort);

  let events = [];

  // Try scoring plays first (most reliable for goals)
  const scoringPlays = data.scoringPlays || [];
  if (scoringPlays.length > 0) {
    events = scoringPlays.map(p => mapScoringPlay(p, home)).filter(Boolean);
  }

  // Also parse play-by-play for cards and subs
  const plays = data.plays || [];
  const nonGoalEvents = plays
    .map(p => mapPlay(p, home))
    .filter(p => p && p.type !== "Goal"); // avoid duplicating goals
  
  events = [...events, ...nonGoalEvents]
    .sort((a, b) => (a.time?.elapsed || 0) - (b.time?.elapsed || 0));

  // Parse stats
  const stats = parseStats(data.boxscore, home);

  console.log(`[matchevents] ESPN ${eventId}: ${events.length} events, stats=${!!stats}`);
  return { events, stats, isLive, isDone };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { home, away } = req.query;
  if (!home || !away) return res.status(400).json({ error: "home and away required" });

  const cacheKey = `${home}|${away}`;

  // Check mem cache
  const cached = memCache[cacheKey];
  if (cached) {
    const ttl = cached.isDone ? TTL_DONE : TTL_LIVE;
    if (Date.now() - cached.ts < ttl) {
      return res.status(200).json({ events: cached.events, stats: cached.stats });
    }
  }

  try {
    // Look up ESPN event ID from KV livescores cache
    const eventId = await getESPNEventId(home, away);
    if (!eventId) {
      console.warn(`[matchevents] No ESPN event ID found for ${home} vs ${away}`);
      return res.status(200).json({ events: [], stats: null });
    }

    const result = await fetchFromESPN(eventId, home);
    
    // Cache result
    memCache[cacheKey] = { ...result, ts: Date.now() };

    return res.status(200).json({ events: result.events, stats: result.stats });
  } catch(e) {
    console.error("[matchevents] Error:", e.message);
    // Return empty rather than error so UI doesn't crash
    return res.status(200).json({ events: [], stats: null });
  }
}
