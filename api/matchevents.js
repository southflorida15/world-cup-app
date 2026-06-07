// /api/matchevents.js
// Returns { events, stats } for a specific match via Highlightly API
// Usage: GET /api/matchevents?home=Brazil&away=France
//
// Events shape matches API-Football so the existing MatchEventsModal works unchanged.
// Stats shape: { home: {...}, away: {...} } with possession, shots, etc.

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "football-highlights-api.p.rapidapi.com";
const BASE          = `https://${RAPIDAPI_HOST}`;
const LEAGUE_ID     = "1635";
const SEASON        = "2026";

const cache = {};
const TTL_LIVE     = 30  * 1000;
const TTL_FINISHED = 60  * 60 * 1000;

function getCached(key, ttl) {
  const e = cache[key];
  if (!e) return null;
  if (Date.now() - e.ts > ttl) { delete cache[key]; return null; }
  return e.data;
}
function setCached(key, data) { cache[key] = { ts: Date.now(), data }; }

const LIVE_STATUSES = ["LIVE","1H","HT","2H","ET","BT","P","INT","inprogress","first_half","halftime","second_half","extra_time","penalties"];
const DONE_STATUSES = ["FT","AET","PEN","AWD","WO","finished","ended","after_extra_time","after_penalties"];

const API_NAME_MAP = {
  "USA":"United States","United States of America":"United States",
  "Turkey":"Turkiye","Türkiye":"Turkiye","Czech Republic":"Czechia",
  "Bosnia":"Bosnia & Herz.","Bosnia and Herzegovina":"Bosnia & Herz.",
  "Côte d'Ivoire":"Ivory Coast","Cote d'Ivoire":"Ivory Coast",
  "DR Congo":"DR Congo","Congo DR":"DR Congo","Democratic Republic of Congo":"DR Congo",
  "Korea Republic":"South Korea","Republic of Korea":"South Korea",
  "IR Iran":"Iran","Curaçao":"Curacao","Cabo Verde":"Cape Verde",
};
const norm = n => API_NAME_MAP[n] || n;

// Map Highlightly event → API-Football event shape
function mapEvent(ev, homeTeamName) {
  const teamName = ev.team?.name || ev.teamName || "";
  const isHome   = norm(teamName) === homeTeamName;

  // Map event types
  let type   = ev.type   || ev.eventType || "";
  let detail = ev.detail || ev.eventDetail || "";

  // Normalise to API-Football types
  if (/goal/i.test(type))   { type = "Goal"; }
  if (/card/i.test(type))   { type = "Card"; }
  if (/subst/i.test(type) || /substitution/i.test(type)) { type = "subst"; }
  if (/yellow/i.test(detail)) detail = "Yellow Card";
  if (/red/i.test(detail))    detail = "Red Card";
  if (/own/i.test(detail))    detail = "Own Goal";
  if (/penalty/i.test(detail)) detail = "Penalty";

  return {
    time:   { elapsed: ev.minute ?? ev.time ?? ev.elapsed ?? 0, extra: ev.extraTime ?? null },
    team:   { name: teamName },
    player: { name: ev.player?.name || ev.playerName || ev.player || "" },
    assist: { name: ev.assist?.name || ev.assistName || ev.assist || null },
    type,
    detail,
  };
}

// Map Highlightly stats → our shape
function mapStats(rawStats, homeTeamName) {
  const result = { home: {}, away: {} };
  if (!rawStats) return result;

  const teams = Array.isArray(rawStats) ? rawStats : [rawStats.home, rawStats.away].filter(Boolean);
  teams.forEach(t => {
    const side = norm(t?.team?.name || t?.teamName || "") === homeTeamName ? "home" : "away";
    const s = t.statistics || t.stats || t;
    result[side] = {
      possession: s.ballPossession ?? s.possession ?? null,
      shots:      (s.totalShots ?? s.shots?.total ?? null),
      shotsOn:    (s.shotsOnGoal ?? s.shots?.onGoal ?? null),
      corners:    s.cornerKicks ?? s.corners ?? null,
      fouls:      s.fouls ?? null,
      yellow:     s.yellowCards ?? null,
      red:        s.redCards ?? null,
      passes:     s.totalPasses ?? s.passes?.total ?? null,
      passAcc:    s.passAccuracy ?? s.passes?.accuracy ?? null,
    };
  });
  return result;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Accept both ?home=X&away=Y and legacy ?fixtureId=X|Y
  let homeTeam, awayTeam;
  if (req.query.home && req.query.away) {
    homeTeam = req.query.home;
    awayTeam = req.query.away;
  } else if (req.query.fixtureId && req.query.fixtureId.includes("|")) {
    [homeTeam, awayTeam] = req.query.fixtureId.split("|");
  } else {
    return res.status(400).json({ error: "Provide ?home=X&away=Y or ?fixtureId=X|Y" });
  }

  const cacheKey = `match_${homeTeam}|${awayTeam}`;

  try {
    // Step 1: Find the match ID from the full fixtures list
    const fixturesCacheKey = `fixtures_${SEASON}`;
    let allMatches = getCached(fixturesCacheKey, 5 * 60 * 1000);

    if (!allMatches) {
      const r = await fetch(`${BASE}/matches?leagueId=${LEAGUE_ID}&season=${SEASON}&limit=200`, {
        headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": RAPIDAPI_HOST },
      });
      if (!r.ok) throw new Error(`Fixtures list: ${r.status}`);
      const data = await r.json();
      allMatches = Array.isArray(data) ? data : (data.data || data.matches || data.response || []);
      setCached(fixturesCacheKey, allMatches);
    }

    // Step 2: Find the matching fixture
    const match = allMatches.find(m => {
      const h = norm(m.homeTeam?.name || m.home || "");
      const a = norm(m.awayTeam?.name || m.away || "");
      return h === homeTeam && a === awayTeam;
    });

    if (!match) {
      return res.status(200).json({ events: [], stats: { home: {}, away: {} } });
    }

    const statusRaw = match.status || match.matchStatus || "NS";
    const isLive    = LIVE_STATUSES.includes(statusRaw);
    const isDone    = DONE_STATUSES.includes(statusRaw);

    if (!isLive && !isDone) {
      return res.status(200).json({ events: [], stats: { home: {}, away: {} } });
    }

    // Step 3: Check cache
    const ttl     = isLive ? TTL_LIVE : TTL_FINISHED;
    const cached  = getCached(cacheKey, ttl);
    if (cached) {
      res.setHeader("Cache-Control", isLive ? "no-cache" : "s-maxage=3600");
      return res.status(200).json(cached);
    }

    const matchId = match.id || match.matchId;

    // Step 4: Fetch match detail (events + stats)
    const detailR = await fetch(`${BASE}/matches/${matchId}`, {
      headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": RAPIDAPI_HOST },
    });
    if (!detailR.ok) throw new Error(`Match detail: ${detailR.status}`);
    const detail = await detailR.json();
    const matchData = detail.data || detail.match || detail;

    // Extract events
    const rawEvents = matchData.events || matchData.timeline || match.events || [];
    const events = rawEvents
      .filter(ev => {
        const t = ev.type || ev.eventType || "";
        return /goal|card|subst|substitut/i.test(t);
      })
      .map(ev => mapEvent(ev, homeTeam))
      .sort((a, b) => (a.time?.elapsed || 0) - (b.time?.elapsed || 0));

    // Extract stats
    const rawStats = matchData.statistics || matchData.stats || matchData.teamStats || null;
    const stats = mapStats(rawStats, homeTeam);

    const result = { events, stats };
    setCached(cacheKey, result);

    res.setHeader("Cache-Control", isLive ? "no-cache" : "s-maxage=3600");
    return res.status(200).json(result);

  } catch (err) {
    console.error("[matchevents] error:", err.message);
    return res.status(500).json({ error: err.message, events: [], stats: { home: {}, away: {} } });
  }
}
