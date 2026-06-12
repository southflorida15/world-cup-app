// /api/matchevents.js
// Returns { events, stats } for a specific match via ESPN public API
// Usage: GET /api/matchevents?home=Brazil&away=France
// Debug: GET /api/matchevents?home=Mexico&away=South+Africa&debug=1

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

// Parse ESPN stats from boxscore
function parseStats(boxscore, homeTeam) {
  if (!boxscore?.teams?.length) return null;
  const result = { home: {}, away: {} };
  boxscore.teams.forEach(t => {
    const teamName = normESPN(t.team?.displayName || t.team?.name || "");
    const side = teamName === homeTeam ? "home" : "away";
    const stats = {};
    (t.statistics || []).forEach(s => {
      const name = (s.name || s.abbreviation || "").toLowerCase();
      const val = parseFloat(s.displayValue ?? s.value ?? 0);
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
    });
    result[side] = stats;
  });
  return result;
}

// Parse all events from ESPN summary response
function parseEvents(data, homeTeam) {
  const events = [];

  // Method 1: scoringPlays (goals only, most reliable)
  const scoringPlays = data.scoringPlays || [];
  for (const play of scoringPlays) {
    const teamName = normESPN(play.team?.displayName || play.team?.name || "");
    const elapsed = play.clock?.value 
      ? Math.round(play.clock.value / 60) 
      : (play.period?.number === 2 ? 90 : 45);
    const text = (play.text || "").toLowerCase();
    const detail = text.includes("own goal") ? "Own Goal" 
                 : text.includes("penalty")  ? "Penalty" 
                 : "Normal Goal";
    const athletes = play.athletesInvolved || [];
    events.push({
      time: { elapsed, extra: null },
      team: { name: teamName },
      player: { name: athletes[0]?.displayName || "" },
      assist: { name: athletes[1]?.displayName || null },
      type: "Goal",
      detail,
    });
  }

  // Method 2: keyEvents (cards, subs, goals not in scoringPlays)
  const keyEvents = data.keyEvents || [];
  for (const ev of keyEvents) {
    const teamName = normESPN(ev.team?.displayName || ev.team?.name || "");
    const elapsed = ev.clock?.value 
      ? Math.round(ev.clock.value / 60)
      : null;
    const text = (ev.text || ev.type?.text || "").toLowerCase();

    // Skip goals already captured from scoringPlays
    if (ev.scoringPlay || text.includes("goal")) continue;

    let type = null, detail = "";
    if (text.includes("yellow") || text.includes("caution")) { type = "Card"; detail = "Yellow Card"; }
    else if (text.includes("red card") || text.includes("ejection")) { type = "Card"; detail = "Red Card"; }
    else if (text.includes("substitut") || text.includes(" sub ")) { type = "subst"; detail = "Substitution"; }

    if (!type) continue;
    const athletes = ev.athletesInvolved || [];
    events.push({
      time: { elapsed, extra: null },
      team: { name: teamName },
      player: { name: athletes[0]?.displayName || "" },
      assist: { name: athletes[1]?.displayName || null },
      type,
      detail,
    });
  }

  // Method 3: plays array (fallback — full play by play)
  if (events.length === 0 && data.plays?.length) {
    for (const play of data.plays) {
      const teamName = normESPN(play.team?.displayName || play.team?.name || "");
      const elapsed = play.clock?.value ? Math.round(play.clock.value / 60) : null;
      const text = (play.type?.text || play.text || "").toLowerCase();
      let type = null, detail = "";

      if (play.scoringPlay || text.includes("goal")) {
        type = "Goal";
        detail = text.includes("own goal") ? "Own Goal" : text.includes("penalty") ? "Penalty" : "Normal Goal";
      } else if (text.includes("yellow") || text.includes("caution")) { type = "Card"; detail = "Yellow Card"; }
      else if (text.includes("red card") || text.includes("ejection")) { type = "Card"; detail = "Red Card"; }
      else if (text.includes("substitut")) { type = "subst"; detail = "Substitution"; }

      if (!type) continue;
      const athletes = play.athletesInvolved || [];
      events.push({
        time: { elapsed, extra: null },
        team: { name: teamName },
        player: { name: athletes[0]?.displayName || "" },
        assist: { name: athletes[1]?.displayName || null },
        type,
        detail,
      });
    }
  }

  return events.sort((a, b) => (a.time?.elapsed || 0) - (b.time?.elapsed || 0));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { home, away, debug } = req.query;
  if (!home || !away) return res.status(400).json({ error: "home and away required" });

  const cacheKey = `${home}|${away}`;

  // Check mem cache
  const cached = memCache[cacheKey];
  if (cached && debug !== "1") {
    const ttl = cached.isDone ? TTL_DONE : TTL_LIVE;
    if (Date.now() - cached.ts < ttl) {
      return res.status(200).json({ events: cached.events, stats: cached.stats });
    }
  }

  try {
    // Look up ESPN event ID from KV
    const eventId = await getESPNEventId(home, away);

    if (!eventId) {
      console.warn(`[matchevents] No ESPN event ID for ${home} vs ${away}`);
      return res.status(200).json({ events: [], stats: null, _debug: "no_event_id" });
    }

    console.log(`[matchevents] Fetching ESPN summary for event ${eventId} (${home} vs ${away})`);
    const r = await fetch(`${ESPN_BASE}/summary?event=${eventId}`, { headers: ESPN_HEADERS });

    if (!r.ok) {
      console.error(`[matchevents] ESPN ${r.status} for event ${eventId}`);
      return res.status(200).json({ events: [], stats: null, _debug: `espn_${r.status}` });
    }

    const data = await r.json();

    if (debug === "1") {
      // Return raw ESPN data for debugging
      return res.status(200).json({
        _debug: true,
        eventId,
        topKeys: Object.keys(data),
        scoringPlaysCount: data.scoringPlays?.length || 0,
        keyEventsCount: data.keyEvents?.length || 0,
        playsCount: data.plays?.length || 0,
        boxscoreTeams: data.boxscore?.teams?.map(t => t.team?.displayName) || [],
        scoringPlays: data.scoringPlays || [],
        keyEvents: (data.keyEvents || []).slice(0, 5),
      });
    }

    const statusType = data.header?.competitions?.[0]?.status?.type?.name || "NS";
    const isDone = DONE_STATUSES.includes(statusType);
    const isLive = LIVE_STATUSES.includes(statusType);

    const events = parseEvents(data, home);
    const stats = parseStats(data.boxscore, home);

    console.log(`[matchevents] ${home} vs ${away}: ${events.length} events, stats=${!!stats}, status=${statusType}`);

    memCache[cacheKey] = { events, stats, isDone, isLive, ts: Date.now() };
    return res.status(200).json({ events, stats });

  } catch(e) {
    console.error("[matchevents] Error:", e.message);
    return res.status(200).json({ events: [], stats: null, _debug: e.message });
  }
}
