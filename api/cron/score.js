// /api/cron/score.js
// Runs every 5 minutes via Vercel Cron.
// Finds any newly-finished World Cup matches and scores all predictions for them.
// Safe to run repeatedly — skips matches already scored.
//
// Vercel Cron calls this with a special Authorization header.
// No manual triggers needed after deployment.

import { kv } from "@vercel/kv";

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || "api-football-v1.p.rapidapi.com";
const WC_LEAGUE_ID  = 1;
const WC_SEASON     = 2026;

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

// Match ID lookup — map "home|away" → our internal match ID
// Built from the same MATCHES array the frontend uses
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

function calcScore(pred, actual) {
  const ph = parseInt(pred.hg), pa = parseInt(pred.ag);
  const ah = parseInt(actual.hg), aa = parseInt(actual.ag);
  if (isNaN(ph) || isNaN(pa)) return null;
  if (ph === ah && pa === aa) return 3;
  const pr = ph > pa ? "H" : ph < pa ? "A" : "D";
  const ar = ah > aa ? "H" : ah < aa ? "A" : "D";
  return pr === ar ? 1 : 0;
}

export default async function handler(req, res) {
  // Verify this is a legitimate Vercel Cron call
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 1. Fetch current WC fixtures from API-Football
    const fixturesRes = await fetch(
      `https://${RAPIDAPI_HOST}/v3/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`,
      { headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": RAPIDAPI_HOST } }
    );
    if (!fixturesRes.ok) throw new Error(`Fixtures API → ${fixturesRes.status}`);
    const fixturesData = await fixturesRes.json();

    const finishedStatuses = ["FT", "AET", "PEN"];
    const finished = (fixturesData.response || []).filter(f =>
      finishedStatuses.includes(f.fixture?.status?.short)
    );

    let scored = 0, skipped = 0, newMatches = 0;

    for (const fixture of finished) {
      const homeRaw = fixture.teams?.home?.name || "";
      const awayRaw = fixture.teams?.away?.name || "";
      const home = norm(homeRaw);
      const away = norm(awayRaw);
      const matchKey = `${home}|${away}`;
      const matchId = MATCH_ID_MAP[matchKey];

      if (!matchId) continue; // Not a group stage match we track

      const hg = fixture.goals?.home;
      const ag = fixture.goals?.away;
      if (hg === null || hg === undefined || ag === null || ag === undefined) continue;

      // Check if already scored
      const alreadyScored = await kv.get(`result:${matchId}`);
      if (alreadyScored) { skipped++; continue; }

      // Save the result
      await kv.set(`result:${matchId}`, {
        hg: parseInt(hg), ag: parseInt(ag),
        home, away, scoredAt: Date.now()
      });
      newMatches++;

      // Find all users and score their predictions
      const userIds = [];
      let cursor = 0;
      do {
        const [nextCursor, keys] = await kv.scan(cursor, { match: "user:*", count: 100 });
        cursor = parseInt(nextCursor);
        keys.forEach(k => userIds.push(k.replace("user:", "")));
      } while (cursor !== 0);

      for (const uid of userIds) {
        const pred = await kv.get(`pred:${uid}:${matchId}`);
        if (!pred) continue;
        const pts = calcScore(pred, { hg: parseInt(hg), ag: parseInt(ag) });
        if (pts === null) continue;
        await kv.set(`score:${uid}:${matchId}`, {
          pts, hg: parseInt(hg), ag: parseInt(ag),
          predHg: pred.hg, predAg: pred.ag,
          scoredAt: Date.now()
        });
        scored++;
      }
    }

    console.log(`[cron/score] finished=${finished.length} new=${newMatches} scored=${scored} skipped=${skipped}`);
    return res.status(200).json({ ok: true, newMatches, scored, skipped });

  } catch (err) {
    console.error("[cron/score] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}