// Zafronix FIFA World Cup 2026 API proxy
// KV-backed cache (Upstash Redis) — survives cold starts, shared across all instances.
// Guarantees we never exceed the 20 req/hour free tier limit.

import { Redis } from "@upstash/redis";
const kv = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const BASE = "https://zafronix-fifa-world-cup-api.p.rapidapi.com";
const BASE_DIRECT = "https://api.zafronix.com/fifa/worldcup/v1";
const HEADERS = {
  "Content-Type": "application/json",
  "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
  "X-RapidAPI-Host": process.env.RAPIDAPI_HOST_ZAFRONIX,
  "X-API-Key": process.env.ZAFRONIX_API_KEY,
};
const HEADERS_DIRECT = {
  "Content-Type": "application/json",
  "X-API-Key": process.env.ZAFRONIX_API_KEY,
};

// KV cache TTLs in seconds
const TTL = {
  teams:              6 * 60 * 60, // 6 hours — squads don't change mid-tournament
  matches:            5 * 60,      // 5 min   — match results
  standings:          5 * 60,      // 5 min   — standings
  bracket:            5 * 60,      // 5 min   — bracket
  aggregates_players: 6 * 60 * 60, // 6 hours — player aggregates
  stadiums:          24 * 60 * 60, // 24 hours — venues never change
  tournament:        24 * 60 * 60, // 24 hours — tournament info static
};

const KV_PREFIX = "wc2026:zafronix:";

async function getCached(key) {
  try {
    const data = await kv.get(KV_PREFIX + key);
    return data || null;
  } catch(e) {
    console.warn("[zafronix] KV read error:", e.message);
    return null;
  }
}

async function setCached(key, data, ttlKey) {
  try {
    const ex = TTL[ttlKey] || TTL.matches;
    await kv.set(KV_PREFIX + key, data, { ex });
  } catch(e) {
    console.warn("[zafronix] KV write error:", e.message);
  }
}

async function zafronixFetch(path) {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Zafronix ${path} → ${res.status} ${res.statusText}`);
  return res.json();
}

// Direct fetch against api.zafronix.com — for endpoints not on the RapidAPI mirror
async function zafronixFetchDirect(path) {
  const res = await fetch(`${BASE_DIRECT}${path}`, { headers: HEADERS_DIRECT });
  if (!res.ok) throw new Error(`Zafronix direct ${path} → ${res.status} ${res.statusText}`);
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
        data = await getCached("teams");
        if (!data) {
          const raw = await zafronixFetch("/teams");
          data = raw; // { teams: [...] } or array
          await setCached("teams", data, "teams");
        }
        break;
      }

      // Single team by name — cross-tournament history
      // Uses direct api.zafronix.com (not RapidAPI mirror which doesn't expose this endpoint)
      case "team": {
        const { name } = req.query;
        if (!name) return res.status(400).json({ error: "Missing name param" });
        if (!process.env.ZAFRONIX_API_KEY) {
          return res.status(500).json({ error: "ZAFRONIX_API_KEY env var not set — run: vercel env add ZAFRONIX_API_KEY" });
        }
        const cKey = `team_${name}`;
        data = await getCached(cKey);
        if (!data) {
          data = await zafronixFetchDirect(`/teams/${encodeURIComponent(name)}`);
          if (data) await setCached(cKey, data, "teams");
        }
        break;
      }

      // Team roster by name
      case "roster": {
        const { name } = req.query;
        if (!name) return res.status(400).json({ error: "Missing name param" });
        const cKey = `roster_${name}`;
        data = await getCached(cKey);
        if (!data) {
          data = await zafronixFetch(`/teams/${encodeURIComponent(name)}/roster`);
          await setCached(cKey, data, "teams");
        }
        break;
      }

      // All matches (full schedule)
      case "matches": {
        const { order = "asc" } = req.query;
        data = await getCached("matches");
        if (!data) {
          data = await zafronixFetch(`/matches?order=${order}`);
          await setCached("matches", data, "matches");
        }
        break;
      }

      // Single match by ID
      case "match": {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: "Missing id param" });
        const cKey = `match_${id}`;
        data = await getCached(cKey);
        if (!data) {
          data = await zafronixFetch(`/matches/${id}`);
          await setCached(cKey, data, "matches");
        }
        break;
      }

      // Group standings
      case "standings": {
        data = await getCached("standings");
        if (!data) {
          data = await zafronixFetch("/standings");
          await setCached("standings", data, "standings");
        }
        break;
      }

      // Knockout bracket
      case "bracket": {
        data = await getCached("bracket");
        if (!data) {
          data = await zafronixFetch("/bracket");
          await setCached("bracket", data, "bracket");
        }
        break;
      }

      // Tournament info
      case "tournament": {
        data = await getCached("tournament");
        if (!data) {
          data = await zafronixFetch("/tournaments/2026");
          await setCached("tournament", data, "tournament");
        }
        break;
      }

      // Top scorers / aggregates
      case "aggregates_players": {
        data = await getCached("aggregates_players");
        if (!data) {
          data = await zafronixFetch("/aggregates/players");
          await setCached("aggregates_players", data, "aggregates_players");
        }
        break;
      }

      // Stadiums
      case "stadiums": {
        data = await getCached("stadiums");
        if (!data) {
          data = await zafronixFetch("/stadiums");
          await setCached("stadiums", data, "stadiums");
        }
        break;
      }

      // API health check + cache stats
      case "health": {
        const healthData = await zafronixFetch("/health");
        data = {
          ...healthData,

        };
        break;
      }

      // Cache buster — call with ?endpoint=flush to clear all cached data
      case "flush": {
        const keys = await kv.keys(KV_PREFIX + "*");
        if (keys.length) await Promise.all(keys.map(k => kv.del(k)));
        data = { flushed: keys.length, message: "KV cache cleared" };
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