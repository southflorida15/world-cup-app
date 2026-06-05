// Live scores proxy — polls "Free API Live Football Data" for today's WC matches.
// Server-side cache ensures only 1 API call per 3 minutes regardless of user count.

const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST; // free-api-live-football-data.p.rapidapi.com
const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const ZAFRONIX_HOST = process.env.RAPIDAPI_HOST_ZAFRONIX; // zafronix-fifa-world-cup-api.p.rapidapi.com
const ZAFRONIX_KEY  = process.env.ZAFRONIX_API_KEY;

// Server-side cache — 3 minute TTL
let _cache = null;
let _cacheTs = 0;
const CACHE_TTL = 3 * 60 * 1000;

function isCacheValid() {
  return _cache !== null && (Date.now() - _cacheTs) < CACHE_TTL;
}

// Normalize team names from API to our internal names
const NAME_MAP = {
  "USA": "United States", "United States of America": "United States",
  "Turkey": "Turkiye", "Türkiye": "Turkiye",
  "Czech Republic": "Czechia",
  "Bosnia": "Bosnia & Herz.", "Bosnia and Herzegovina": "Bosnia & Herz.", "Bosnia & Herzegovina": "Bosnia & Herz.",
  "Côte d'Ivoire": "Ivory Coast", "Cote d'Ivoire": "Ivory Coast",
  "DR Congo": "DR Congo", "Congo DR": "DR Congo", "Democratic Republic of Congo": "DR Congo", "Congo (DRC)": "DR Congo",
  "Korea Republic": "South Korea", "Republic of Korea": "South Korea",
  "IR Iran": "Iran", "Islamic Republic of Iran": "Iran",
  "Curaçao": "Curacao", "Cabo Verde": "Cape Verde",
};
const norm = n => NAME_MAP[n] || n;

export default async function handler(req, res) {
  // Return cached data if still fresh — serves all users from one API call
  if (isCacheValid()) {
    return res.status(200).json(_cache);
  }

  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");

  let matches = [];

  // ── Primary: Free API Live Football Data ─────────────────────────────────
  try {
    const r = await fetch(
      `https://${RAPIDAPI_HOST}/football-get-matches-by-date?date=${dateStr}`,
      { headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": RAPIDAPI_HOST } }
    );
    if (r.ok) {
      const data = await r.json();
      console.log("LiveScores RAW:", JSON.stringify(data, null, 2));
      const source =
        Array.isArray(data?.response) ? data.response :
        Array.isArray(data?.response?.matches) ? data.response.matches :
        Array.isArray(data?.matches) ? data.matches : [];

      matches = source.map(m => ({
        fixture: {
          id: m.fixture?.id ?? m.id ?? null,
          status: {
            short: m.fixture?.status?.short ?? m.status ?? "NS",
            elapsed: m.fixture?.status?.elapsed ?? m.elapsed ?? null,
          },
        },
        teams: {
          home: { name: norm(m.teams?.home?.name ?? m.home?.name ?? "Unknown") },
          away: { name: norm(m.teams?.away?.name ?? m.away?.name ?? "Unknown") },
        },
        goals: {
          home: m.goals?.home ?? m.score?.home ?? m.home?.score ?? null,
          away: m.goals?.away ?? m.score?.away ?? m.away?.score ?? null,
        },
      }));
    }
  } catch (e) {
    console.error("Primary livescores error:", e.message);
  }

  // ── Fallback: Zafronix /matches filtered to today ────────────────────────
  if (matches.length === 0) {
    try {
      const r = await fetch(
        `https://${ZAFRONIX_HOST}/matches?order=asc`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": ZAFRONIX_HOST,
            "X-API-Key": ZAFRONIX_KEY,
          }
        }
      );
      if (r.ok) {
        const data = await r.json();
        const todayIso = today.toISOString().split("T")[0];
        const all = Array.isArray(data) ? data : data?.matches ?? data?.response ?? [];
        matches = all
          .filter(m => m.dateIso?.startsWith(todayIso) || m.date?.startsWith(todayIso))
          .map(m => ({
            fixture: {
              id: m.id ?? m.matchId ?? null,
              status: { short: m.status ?? "NS", elapsed: m.elapsed ?? null },
            },
            teams: {
              home: { name: norm(m.homeTeam?.name ?? m.home?.name ?? m.home ?? "") },
              away: { name: norm(m.awayTeam?.name ?? m.away?.name ?? m.away ?? "") },
            },
            goals: {
              home: m.homeScore ?? m.score?.home ?? null,
              away: m.awayScore ?? m.score?.away ?? null,
            },
          }));
      }
    } catch (e) {
      console.error("Fallback livescores error:", e.message);
    }
  }

  const result = { response: matches, source: matches.length ? "api" : "empty", ts: Date.now() };
  _cache = result;
  _cacheTs = Date.now();

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  res.status(200).json(result);
}