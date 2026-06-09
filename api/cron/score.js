// /api/cron/score.js
// Auto-scores predictions for finished WC matches.
// Called by cron-job.org every 15 minutes.
// Reads from shared KV cache (written by livescores.js) to avoid extra Highlightly calls.
// Only hits Highlightly directly if KV cache is missing or stale.

import { Redis } from "@upstash/redis";
const kv = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
const CACHE_KEY    = "wc2026:livescores";
const CACHE_TS_KEY = "wc2026:livescores:ts";
const MAX_CACHE_AGE = 20 * 60 * 1000; // 20min — if older, fetch fresh

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "football-highlights-api.p.rapidapi.com";
const BASE          = `https://${RAPIDAPI_HOST}`;
const LEAGUE_ID     = "1635";  // World Cup 2026 on Highlightly
const SEASON        = "2026";
const ADMIN_SECRET  = process.env.PREDICTOR_ADMIN_SECRET || process.env.CRON_SECRET;

// ── Match window guard ────────────────────────────────────────────────────
// All 104 WC 2026 kickoff times in UTC. No API call needed to check this.
const KICKOFFS = [
  "2026-06-11T19:00:00Z",
  "2026-06-12T02:00:00Z",
  "2026-06-12T19:00:00Z",
  "2026-06-13T01:00:00Z",
  "2026-06-13T19:00:00Z",
  "2026-06-13T22:00:00Z",
  "2026-06-14T01:00:00Z",
  "2026-06-14T03:59:00Z",
  "2026-06-14T17:00:00Z",
  "2026-06-14T20:00:00Z",
  "2026-06-14T23:00:00Z",
  "2026-06-15T02:00:00Z",
  "2026-06-15T16:00:00Z",
  "2026-06-15T19:00:00Z",
  "2026-06-15T22:00:00Z",
  "2026-06-16T01:00:00Z",
  "2026-06-16T19:00:00Z",
  "2026-06-16T22:00:00Z",
  "2026-06-17T01:00:00Z",
  "2026-06-17T03:59:00Z",
  "2026-06-17T17:00:00Z",
  "2026-06-17T20:00:00Z",
  "2026-06-17T23:00:00Z",
  "2026-06-18T02:00:00Z",
  "2026-06-18T16:00:00Z",
  "2026-06-18T19:00:00Z",
  "2026-06-18T22:00:00Z",
  "2026-06-19T01:00:00Z",
  "2026-06-19T19:00:00Z",
  "2026-06-19T22:00:00Z",
  "2026-06-20T00:30:00Z",
  "2026-06-20T03:00:00Z",
  "2026-06-20T17:00:00Z",
  "2026-06-20T20:00:00Z",
  "2026-06-21T01:00:00Z",
  "2026-06-21T03:59:00Z",
  "2026-06-21T16:00:00Z",
  "2026-06-21T19:00:00Z",
  "2026-06-21T22:00:00Z",
  "2026-06-22T01:00:00Z",
  "2026-06-22T17:00:00Z",
  "2026-06-22T21:00:00Z",
  "2026-06-23T00:00:00Z",
  "2026-06-23T03:00:00Z",
  "2026-06-23T17:00:00Z",
  "2026-06-23T20:00:00Z",
  "2026-06-23T23:00:00Z",
  "2026-06-24T02:00:00Z",
  "2026-06-24T19:00:00Z",
  "2026-06-24T19:00:00Z",
  "2026-06-24T22:00:00Z",
  "2026-06-24T22:00:00Z",
  "2026-06-25T01:00:00Z",
  "2026-06-25T01:00:00Z",
  "2026-06-25T20:00:00Z",
  "2026-06-25T20:00:00Z",
  "2026-06-25T23:00:00Z",
  "2026-06-25T23:00:00Z",
  "2026-06-26T02:00:00Z",
  "2026-06-26T02:00:00Z",
  "2026-06-26T19:00:00Z",
  "2026-06-26T19:00:00Z",
  "2026-06-27T00:00:00Z",
  "2026-06-27T00:00:00Z",
  "2026-06-27T03:00:00Z",
  "2026-06-27T03:00:00Z",
  "2026-06-27T21:00:00Z",
  "2026-06-27T21:00:00Z",
  "2026-06-27T23:30:00Z",
  "2026-06-27T23:30:00Z",
  "2026-06-28T02:00:00Z",
  "2026-06-28T02:00:00Z",
  "2026-06-28T23:00:00Z",
  "2026-06-29T17:00:00Z",
  "2026-06-29T20:30:00Z",
  "2026-06-30T01:00:00Z",
  "2026-06-30T17:00:00Z",
  "2026-06-30T21:00:00Z",
  "2026-07-01T01:00:00Z",
  "2026-07-01T16:00:00Z",
  "2026-07-01T20:00:00Z",
  "2026-07-02T00:00:00Z",
  "2026-07-02T19:00:00Z",
  "2026-07-02T23:00:00Z",
  "2026-07-03T03:00:00Z",
  "2026-07-03T18:00:00Z",
  "2026-07-03T22:00:00Z",
  "2026-07-04T01:30:00Z",
  "2026-07-04T17:00:00Z",
  "2026-07-04T21:00:00Z",
  "2026-07-05T20:00:00Z",
  "2026-07-06T00:00:00Z",
  "2026-07-06T19:00:00Z",
  "2026-07-07T00:00:00Z",
  "2026-07-07T16:00:00Z",
  "2026-07-07T20:00:00Z",
  "2026-07-09T20:00:00Z",
  "2026-07-10T19:00:00Z",
  "2026-07-11T21:00:00Z",
  "2026-07-12T01:00:00Z",
  "2026-07-14T19:00:00Z",
  "2026-07-15T19:00:00Z",
  "2026-07-18T21:00:00Z",
  "2026-07-19T19:00:00Z"
];
const WINDOW_MS = 150 * 60 * 1000; // 2.5 hrs — covers 90min + ET + injury time

function isMatchWindowActive() {
  const now = Date.now();
  return KICKOFFS.some(k => {
    const ko = new Date(k).getTime();
    return now >= ko && now <= ko + WINDOW_MS;
  });
}


// Map "home|away" team names to our internal match IDs
const MATCH_ID_MAP = {
  "Mexico|South Africa":1,"South Korea|Czechia":2,"Canada|Bosnia & Herz.":3,
  "United States|Paraguay":4,"Qatar|Switzerland":5,"Brazil|Morocco":6,
  "Haiti|Scotland":7,"Australia|Turkiye":8,"Germany|Curacao":9,
  "Netherlands|Japan":10,"Ivory Coast|Ecuador":11,"Sweden|Tunisia":12,
  "Spain|Cape Verde":13,"Belgium|Egypt":14,"Saudi Arabia|Uruguay":15,
  "Iran|New Zealand":16,"France|Senegal":17,"Iraq|Norway":18,
  "Argentina|Algeria":19,"Austria|Jordan":20,"Portugal|DR Congo":21,
  "England|Croatia":22,"Ghana|Panama":23,"Uzbekistan|Colombia":24,
  "Czechia|South Africa":25,"Switzerland|Bosnia & Herz.":26,
  "Canada|Qatar":27,"Mexico|South Korea":28,"United States|Australia":29,
  "Scotland|Morocco":30,"Brazil|Haiti":31,"Turkiye|Paraguay":32,
  "Netherlands|Sweden":33,"Germany|Ivory Coast":34,"Ecuador|Curacao":35,
  "Tunisia|Japan":36,"Spain|Saudi Arabia":37,"Belgium|Iran":38,
  "Uruguay|Cape Verde":39,"New Zealand|Egypt":40,"Argentina|Austria":41,
  "France|Iraq":42,"Norway|Senegal":43,"Jordan|Algeria":44,
  "Portugal|Uzbekistan":45,"England|Ghana":46,"Panama|Croatia":47,
  "Colombia|DR Congo":48,"Switzerland|Canada":49,"Bosnia & Herz.|Qatar":50,
  "Scotland|Brazil":51,"Morocco|Haiti":52,"Czechia|Mexico":53,
  "South Africa|South Korea":54,"Curacao|Ivory Coast":55,"Ecuador|Germany":56,
  "Japan|Sweden":57,"Tunisia|Netherlands":58,"Turkiye|United States":59,
  "Paraguay|Australia":60,"Norway|France":61,"Senegal|Iraq":62,
  "Cape Verde|Saudi Arabia":63,"Uruguay|Spain":64,"Egypt|Iran":65,
  "New Zealand|Belgium":66,"Panama|England":67,"Croatia|Ghana":68,
  "Colombia|Portugal":69,"DR Congo|Uzbekistan":70,"Algeria|Austria":71,
  "Jordan|Argentina":72,
};

// Normalize team names from Highlightly to our internal names
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

const FINISHED_STATUSES = ["FT","AET","PEN","AWD","WO","finished","ended","after_extra_time","after_penalties"];

export default async function handler(req, res) {
  // Verify auth
  const auth = req.headers["authorization"];
  if (auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // ── Window guard — skip if no match is active or recently finished ────────
  // Allow up to 30min after window closes so final scores are captured
  const GRACE_MS = 30 * 60 * 1000;
  const nowMs = Date.now();
  const inWindow = KICKOFFS.some(k => {
    const ko = new Date(k).getTime();
    return nowMs >= ko && nowMs <= ko + WINDOW_MS + GRACE_MS;
  });
  if (!inWindow) {
    console.log("[cron/score] outside match window — skipping");
    return res.status(200).json({ ok: true, skipped: true, reason: "outside match window" });
  }

  try {
    // ── Try KV cache first (shared with livescores.js) ────────────────────
    let matches = null;
    try {
      const [cached, ts] = await Promise.all([
        kv.get(CACHE_KEY),
        kv.get(CACHE_TS_KEY),
      ]);
      if (cached && ts && (Date.now() - parseInt(ts)) < MAX_CACHE_AGE) {
        // KV cache is fresh — convert back from livescores shape to raw match shape
        matches = cached.map(f => ({
          homeTeam: { name: f.teams?.home?.name || "" },
          awayTeam: { name: f.teams?.away?.name || "" },
          homeScore: f.goals?.home,
          awayScore: f.goals?.away,
          status: f.fixture?.status?.short || "NS",
        }));
        console.log(`[cron/score] using KV cache (age: ${Math.round((Date.now()-parseInt(ts))/1000)}s)`);
      }
    } catch(e) {
      console.warn("[cron/score] KV read failed:", e.message);
    }

    // ── Fall back to Highlightly if cache missing/stale ───────────────────
    if (!matches) {
      const url = `${BASE}/matches?leagueId=${LEAGUE_ID}&season=${SEASON}&limit=200`;
      const r = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_HOST,
        }
      });
      if (!r.ok) {
        const body = await r.text();
        throw new Error(`Fixtures API ${r.status}: ${body}`);
      }
      const data = await r.json();
      matches = data.data || data.response || [];
      console.log(`[cron/score] fetched fresh from Highlightly (${matches.length} matches)`);
    }

    const finished = matches.filter(m => {
      const status = m.status || m.fixture?.status?.short || "";
      return FINISHED_STATUSES.includes(status);
    });

    let newMatches = 0, scored = 0, skipped = 0;
    const host = req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const base = proto + "://" + host;

    for (const match of finished) {
      // Handle both Highlightly and API-Football response shapes
      const homeName = norm(match.homeTeam?.name || match.teams?.home?.name || "");
      const awayName = norm(match.awayTeam?.name || match.teams?.away?.name || "");
      const matchId = MATCH_ID_MAP[homeName + "|" + awayName];
      if (!matchId) { skipped++; continue; }

      const hg = match.homeScore ?? match.goals?.home;
      const ag = match.awayScore ?? match.goals?.away;
      if (hg === null || hg === undefined || ag === null || ag === undefined) { skipped++; continue; }

      // Call predictor API to score this match
      const scoreRes = await fetch(base + "/api/predictor?action=score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": ADMIN_SECRET,
        },
        body: JSON.stringify({ matchId, hg: parseInt(hg), ag: parseInt(ag) }),
      });

      if (scoreRes.status === 403) { skipped++; continue; } // already scored
      if (!scoreRes.ok) {
        const err = await scoreRes.json().catch(() => ({}));
        console.warn(`[cron] match ${matchId} score failed:`, err.error);
        skipped++;
        continue;
      }

      const result = await scoreRes.json();
      if (result.ok) {
        newMatches++;
        scored += result.scored || 0;
      }
    }

    console.log(`[cron/score] total=${matches.length} finished=${finished.length} new=${newMatches} scored=${scored} skipped=${skipped}`);
    return res.status(200).json({ ok: true, finished: finished.length, newMatches, scored, skipped });

  } catch (err) {
    console.error("[cron/score] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
