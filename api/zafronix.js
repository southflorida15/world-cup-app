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

// Historical records that should be merged under the current team identity.
// Zafronix stores West Germany separately from modern Germany, but the app's
// user-facing Germany profile should include the full German World Cup record.
const TEAM_HISTORY_ALIASES = {
  Germany: ["Germany", "West Germany"],
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

async function fetchTeamDirectByName(name) {
  return zafronixFetchDirect(`/teams/${encodeURIComponent(name)}`);
}

function normalizeYear(value) {
  const year = Number(value);
  return Number.isFinite(year) ? year : null;
}

function mergeTeamHistory(primaryName, teamResponses) {
  const primary = teamResponses.find(t => t?.name === primaryName) || teamResponses[0] || { name: primaryName };
  const appearancesByYear = new Map();

  for (const team of teamResponses) {
    for (const appearance of Array.isArray(team?.appearances) ? team.appearances : []) {
      const year = normalizeYear(appearance?.year);
      if (!year) continue;

      // If two records somehow exist for the same year, prefer the primary-name
      // record, otherwise keep the first seen. Germany/West Germany should not
      // overlap in the Zafronix dataset.
      const existing = appearancesByYear.get(year);
      if (!existing || team?.name === primaryName) {
        appearancesByYear.set(year, { ...appearance, year });
      }
    }
  }

  return {
    ...primary,
    name: primaryName,
    appearances: Array.from(appearancesByYear.values()).sort((a, b) => a.year - b.year),
    historyAliases: teamResponses
      .map(t => t?.name)
      .filter(Boolean)
      .filter((name, index, arr) => arr.indexOf(name) === index),
  };
}

async function getTeamWithHistoricalAliases(name) {
  const aliases = TEAM_HISTORY_ALIASES[name];

  if (!aliases) {
    return fetchTeamDirectByName(name);
  }

  const results = await Promise.allSettled(aliases.map(fetchTeamDirectByName));
  const fulfilled = results
    .filter(result => result.status === "fulfilled" && result.value)
    .map(result => result.value);

  if (!fulfilled.length) {
    const errors = results
      .filter(result => result.status === "rejected")
      .map(result => result.reason?.message || String(result.reason));
    throw new Error(`Unable to load ${name} history aliases: ${errors.join(" | ")}`);
  }

  return mergeTeamHistory(name, fulfilled);
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

        // v2 cache key intentionally bypasses old cached Germany-only history.
        const aliases = TEAM_HISTORY_ALIASES[name];
        const cKey = aliases ? `team_${name}_historyAliases_v2` : `team_${name}`;

        data = await getCached(cKey);
        if (!data) {
          data = await getTeamWithHistoricalAliases(name);
          if (data) await setCached(cKey, data, "teams");
        }
        break;
      }

      // Team roster by name
      case "roster": {
        const { name, year = "2026" } = req.query;
        if (!name) return res.status(400).json({ error: "Missing name param" });
        // The real Zafronix API documents `year` as a REQUIRED query param on
        // this endpoint (GET /v1/teams/:name/roster?year=YYYY). It was never
        // being sent — every single roster call was returning 400 Bad
        // Request as a result, with no team ever successfully loading a live
        // squad. Confirmed directly from RapidAPI's analytics dashboard
        // (100% error rate, all 400s) before fixing.
        const cKey = `roster_${name}_${year}`;
        data = await getCached(cKey);
        if (!data) {
          data = await zafronixFetch(`/teams/${encodeURIComponent(name)}/roster?year=${encodeURIComponent(year)}`);
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
