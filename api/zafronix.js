// Zafronix FIFA World Cup 2026 API proxy
// Server-side caching ensures only 1 API call per cache window
// regardless of how many users are hitting the app simultaneously.

const BASE = "https://zafronix-fifa-world-cup-api.p.rapidapi.com";
const HEADERS = {
  "Content-Type": "application/json",
  "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
  "X-RapidAPI-Host": process.env.RAPIDAPI_HOST_ZAFRONIX,
  "X-API-Key": process.env.ZAFRONIX_API_KEY,
};

// In-memory cache — persists across requests within the same serverless instance
const cache = {};
const TTL = {
  teams:       6 * 60 * 60 * 1000, // 6 hours  — squads don't change mid-tournament
  matches:     3 * 60 * 1000,       // 3 min    — match results
  standings:   3 * 60 * 1000,       // 3 min    — standings
  bracket:     5 * 60 * 1000,       // 5 min    — bracket
  livescores:  3 * 60 * 1000,       // 3 min    — live scores
};

function getCached(key) {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > (TTL[key] || TTL.matches)) {
    delete cache[key];
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  cache[key] = { ts: Date.now(), data };
}

async function zafronixFetch(path) {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Zafronix ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

export default async function handler(req, res) {
  const { endpoint } = req.query;

  if (!endpoint) {
    return res.status(400).json({ error: "Missing endpoint query param" });
  }

  // ── Route to correct Zafronix endpoint ──────────────────────────────────
  try {
    let data;

    switch (endpoint) {

      // All 48 teams + full squads — heavy, cache 6 hours
      case "teams": {
        data = getCached("teams");
        if (!data) {
          const raw = await zafronixFetch("/teams");
          data = raw; // { teams: [...] } or array
          setCached("teams", data);
        }
        break;
      }

      // Single team by name
      case "team": {
        const { name } = req.query;
        if (!name) return res.status(400).json({ error: "Missing name param" });
        const cKey = `team_${name}`;
        data = getCached(cKey);
        if (!data) {
          data = await zafronixFetch(`/teams/${encodeURIComponent(name)}`);
          setCached(cKey, data);
        }
        break;
      }

      // Team roster by name
      case "roster": {
        const { name } = req.query;
        if (!name) return res.status(400).json({ error: "Missing name param" });
        const cKey = `roster_${name}`;
        data = getCached(cKey);
        if (!data) {
          data = await zafronixFetch(`/teams/${encodeURIComponent(name)}/roster`);
          setCached(cKey, data);
        }
        break;
      }

      // All matches (full schedule)
      case "matches": {
        const { order = "asc" } = req.query;
        data = getCached("matches");
        if (!data) {
          data = await zafronixFetch(`/matches?order=${order}`);
          setCached("matches", data);
        }
        break;
      }

      // Single match by ID
      case "match": {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: "Missing id param" });
        const cKey = `match_${id}`;
        data = getCached(cKey);
        if (!data) {
          data = await zafronixFetch(`/matches/${id}`);
          setCached(cKey, data);
        }
        break;
      }

      // Group standings
      case "standings": {
        data = getCached("standings");
        if (!data) {
          data = await zafronixFetch("/standings");
          setCached("standings", data);
        }
        break;
      }

      // Knockout bracket
      case "bracket": {
        data = getCached("bracket");
        if (!data) {
          data = await zafronixFetch("/bracket");
          setCached("bracket", data);
        }
        break;
      }

      // Tournament info
      case "tournament": {
        data = getCached("tournament");
        if (!data) {
          data = await zafronixFetch("/tournaments/2026");
          setCached("tournament", data);
        }
        break;
      }

      // Top scorers / aggregates
      case "aggregates_players": {
        data = getCached("aggregates_players");
        if (!data) {
          data = await zafronixFetch("/aggregates/players");
          setCached("aggregates_players", data);
        }
        break;
      }

      // Stadiums
      case "stadiums": {
        data = getCached("stadiums");
        if (!data) {
          data = await zafronixFetch("/stadiums");
          setCached("stadiums", data);
        }
        break;
      }

      // API health check + cache stats
      case "health": {
        const healthData = await zafronixFetch("/health");
        data = {
          ...healthData,
          cacheKeys: Object.keys(cache),
          cacheSize: Object.keys(cache).length,
        };
        break;
      }

      // Cache buster — call with ?endpoint=flush to clear all cached data
      case "flush": {
        const count = Object.keys(cache).length;
        Object.keys(cache).forEach(k => delete cache[k]);
        data = { flushed: count, message: "Cache cleared" };
        break;
      }

      default:
        return res.status(404).json({ error: `Unknown endpoint: ${endpoint}` });
    }

    // Cache-Control header so Vercel edge also caches briefly
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json(data);

  } catch (err) {
    console.error(`[zafronix] ${endpoint} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
}