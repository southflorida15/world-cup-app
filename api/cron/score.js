// /api/cron/score.js
// Auto-scores predictions for finished WC matches.
// Called by cron-job.org every 15 minutes.
// Uses the existing /api/predictor endpoint for KV operations
// so no direct @vercel/kv import needed here.

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "api-football-v1.p.rapidapi.com";
const ADMIN_SECRET  = process.env.PREDICTOR_ADMIN_SECRET || process.env.CRON_SECRET;
const WC_LEAGUE_ID  = 1;
const WC_SEASON     = 2026;

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
  // Verify auth
  const auth = req.headers["authorization"];
  if (auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 1. Fetch all WC fixtures
    const r = await fetch(
      `https://${RAPIDAPI_HOST}/v3/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`,
      { headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": RAPIDAPI_HOST } }
    );
    if (!r.ok) throw new Error(`Fixtures API ${r.status}`);
    const data = await r.json();

    const finished = (data.response || []).filter(f =>
      ["FT","AET","PEN"].includes(f.fixture?.status?.short)
    );

    let newMatches = 0, scored = 0, skipped = 0;
    const host = req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const base = proto + "://" + host;

    for (const fixture of finished) {
      const home = norm(fixture.teams?.home?.name || "");
      const away = norm(fixture.teams?.away?.name || "");
      const matchId = MATCH_ID_MAP[home + "|" + away];
      if (!matchId) { skipped++; continue; }

      const hg = fixture.goals?.home;
      const ag = fixture.goals?.away;
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

    console.log(`[cron/score] finished=${finished.length} new=${newMatches} scored=${scored} skipped=${skipped}`);
    return res.status(200).json({ ok: true, finished: finished.length, newMatches, scored, skipped });

  } catch (err) {
    console.error("[cron/score] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
