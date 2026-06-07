// /api/matchevents.js
// Returns events (goals, cards, subs) for a specific match
// Looks up the fixture ID from the live scores feed, then fetches events
//
// Usage: GET /api/matchevents?fixtureId=Brazil|France
// The fixtureId is "home|away" — we find the matching fixture from API-Football

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "api-football-v1.p.rapidapi.com";
const WC_LEAGUE_ID  = 1;
const WC_SEASON     = 2026;

const cache = {};
const TTL_LIVE     = 30  * 1000;   // 30s during live matches
const TTL_FINISHED = 60  * 60 * 1000; // 1h for finished matches

function getCached(key, ttl) {
  const e = cache[key];
  if (!e) return null;
  if (Date.now() - e.ts > ttl) { delete cache[key]; return null; }
  return e.data;
}
function setCached(key, data) { cache[key] = { ts: Date.now(), data }; }

const API_NAME_MAP = {
  "USA":"United States","United States of America":"United States",
  "Turkey":"Turkiye","Türkiye":"Turkiye","Czech Republic":"Czechia",
  "Bosnia":"Bosnia & Herz.","Bosnia and Herzegovina":"Bosnia & Herz.",
  "Côte d'Ivoire":"Ivory Coast","Cote d'Ivoire":"Ivory Coast",
  "DR Congo":"DR Congo","Congo DR":"DR Congo",
  "Korea Republic":"South Korea","Republic of Korea":"South Korea",
  "IR Iran":"Iran","Curaçao":"Curacao","Cabo Verde":"Cape Verde",
};
const norm = n => API_NAME_MAP[n] || n;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { fixtureId } = req.query;
  if (!fixtureId || !fixtureId.includes("|")) {
    return res.status(400).json({ error: "fixtureId must be 'home|away'" });
  }

  const [homeTeam, awayTeam] = fixtureId.split("|");

  try {
    // Step 1: Get fixtures for WC 2026 to find the fixture ID
    const fixturesCacheKey = `fixtures_${WC_SEASON}`;
    let fixturesData = getCached(fixturesCacheKey, 5 * 60 * 1000);

    if (!fixturesData) {
      const r = await fetch(
        `https://${RAPIDAPI_HOST}/v3/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`,
        { headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": RAPIDAPI_HOST } }
      );
      if (!r.ok) throw new Error(`Fixtures API → ${r.status}`);
      fixturesData = await r.json();
      setCached(fixturesCacheKey, fixturesData);
    }

    // Step 2: Find matching fixture
    const fixture = (fixturesData.response || []).find(f => {
      const h = norm(f?.teams?.home?.name || "");
      const a = norm(f?.teams?.away?.name || "");
      return h === homeTeam && a === awayTeam;
    });

    if (!fixture) {
      return res.status(200).json([]); // Match not found yet — tournament may not have started
    }

    const fid = fixture.fixture.id;
    const status = fixture.fixture.status?.short || "NS";
    const isLive = ["1H","HT","2H","ET","BT","P","LIVE"].includes(status);
    const isFinished = ["FT","AET","PEN"].includes(status);

    if (!isLive && !isFinished) {
      return res.status(200).json([]); // Not started
    }

    // Step 3: Get events for this fixture
    const eventsCacheKey = `events_${fid}`;
    const ttl = isLive ? TTL_LIVE : TTL_FINISHED;
    let eventsData = getCached(eventsCacheKey, ttl);

    if (!eventsData) {
      const r = await fetch(
        `https://${RAPIDAPI_HOST}/v3/fixtures/events?fixture=${fid}`,
        { headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": RAPIDAPI_HOST } }
      );
      if (!r.ok) throw new Error(`Events API → ${r.status}`);
      eventsData = await r.json();
      setCached(eventsCacheKey, eventsData);
    }

    const events = (eventsData.response || [])
      .filter(ev => ["Goal","Card","subst"].includes(ev.type))
      .sort((a, b) => (a.time?.elapsed||0) - (b.time?.elapsed||0));

    // Step 4: Get fixture stats (possession, shots, etc.) for live/finished matches
    let stats = null;
    if (isLive || isFinished) {
      const statsCacheKey = `stats_${fid}`;
      let statsData = getCached(statsCacheKey, ttl);
      if (!statsData) {
        try {
          const r = await fetch(
            `https://${RAPIDAPI_HOST}/v3/fixtures/statistics?fixture=${fid}`,
            { headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": RAPIDAPI_HOST } }
          );
          if (r.ok) {
            statsData = await r.json();
            setCached(statsCacheKey, statsData);
          }
        } catch(e) { /* stats are optional */ }
      }
      if (statsData?.response?.length >= 2) {
        const parseVal = v => {
          if (v === null || v === undefined) return null;
          if (typeof v === "string" && v.endsWith("%")) return parseFloat(v);
          return typeof v === "number" ? v : null;
        };
        const extract = (teamStats, type) => parseVal(teamStats?.statistics?.find(s=>s.type===type)?.value);
        const h = statsData.response[0];
        const a = statsData.response[1];
        stats = {
          home: {
            possession: extract(h, "Ball Possession"),
            shots: extract(h, "Total Shots"),
            shotsOn: extract(h, "Shots on Goal"),
            corners: extract(h, "Corner Kicks"),
            fouls: extract(h, "Fouls"),
            yellow: extract(h, "Yellow Cards"),
            red: extract(h, "Red Cards"),
            passes: extract(h, "Total passes"),
            passAcc: extract(h, "Passes %"),
          },
          away: {
            possession: extract(a, "Ball Possession"),
            shots: extract(a, "Total Shots"),
            shotsOn: extract(a, "Shots on Goal"),
            corners: extract(a, "Corner Kicks"),
            fouls: extract(a, "Fouls"),
            yellow: extract(a, "Yellow Cards"),
            red: extract(a, "Red Cards"),
            passes: extract(a, "Total passes"),
            passAcc: extract(a, "Passes %"),
          }
        };
      }
    }

    res.setHeader("Cache-Control", isLive ? "no-cache" : "s-maxage=3600");
    return res.status(200).json({ events, stats, status, elapsed: fixture.fixture.status?.elapsed });

  } catch (err) {
    console.error("[matchevents]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
