// /api/matchevents.js
// Returns { events, stats } for a specific match via ESPN public API.
// Finished match data is persisted permanently in KV so it's always
// available even after ESPN drops the match from their feed.

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

// ── KV persistence ────────────────────────────────────────────────────────
// Finished match events+stats stored permanently, no expiry.
const kvKey = (home, away) => `wc2026:events:${home}|${away}`;

async function loadFromKV(home, away) {
  try {
    const data = await kv.get(kvKey(home, away));
    return data || null;
  } catch(e) {
    console.warn("[matchevents] KV load:", e.message);
    return null;
  }
}

async function saveToKV(home, away, events, stats) {
  try {
    await kv.set(kvKey(home, away), { events, stats, savedAt: Date.now() });
    console.log(`[matchevents] Persisted ${events.length} events for ${home} vs ${away}`);
  } catch(e) {
    console.warn("[matchevents] KV save:", e.message);
  }
}

// ── ESPN event ID lookup ───────────────────────────────────────────────────
// Also stores a separate ESPN ID map so we can look up old matches
// even after they age out of the livescores feed.
const ESPN_ID_MAP_KEY = "wc2026:espn_ids";

async function getESPNEventId(home, away) {
  // 1. Try livescores cache first (works for recent/live matches)
  try {
    const cached = await kv.get("wc2026:livescores");
    if (cached) {
      const fixtures = Array.isArray(cached) ? cached : (cached?.response || []);
      const match = fixtures.find(f => {
        const h = normESPN(f?.teams?.home?.name || "");
        const a = normESPN(f?.teams?.away?.name || "");
        return h === home && a === away;
      });
      if (match?.fixture?.id) {
        // Also persist this ID mapping for future use
        saveESPNId(home, away, match.fixture.id);
        return match.fixture.id;
      }
    }
  } catch(e) {
    console.warn("[matchevents] livescores KV lookup:", e.message);
  }

  // 2. Fall back to persisted ID map (works for old matches)
  try {
    const idMap = await kv.get(ESPN_ID_MAP_KEY) || {};
    const key = `${home}|${away}`;
    if (idMap[key]) return idMap[key];
  } catch(e) {
    console.warn("[matchevents] ESPN ID map lookup:", e.message);
  }

  return null;
}

async function saveESPNId(home, away, id) {
  try {
    const idMap = await kv.get(ESPN_ID_MAP_KEY) || {};
    const key = `${home}|${away}`;
    if (!idMap[key]) {
      idMap[key] = id;
      await kv.set(ESPN_ID_MAP_KEY, idMap);
    }
  } catch(e) {
    // non-critical
  }
}

// ── Stats parser ──────────────────────────────────────────────────────────
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
      else if (name.includes("pass") && name.includes("acc")) stats.passAcc = (val > 0 && val <= 100) ? val : null;
    });
    result[side] = stats;
  });
  return result;
}

// ── Events parser ─────────────────────────────────────────────────────────
function parseEvents(data, homeTeam) {
  const events = [];

  const keyEvents = data.keyEvents || [];
  for (const ev of keyEvents) {
    const teamName = normESPN(ev.team?.displayName || ev.team?.name || "");
    const elapsed = ev.clock?.displayValue
      ? parseInt(ev.clock.displayValue)
      : ev.clock?.value ? Math.round(ev.clock.value / 60) : null;
    const text = (ev.text || ev.type?.text || "").toLowerCase();
    const typeText = (ev.type?.text || "").toLowerCase();
    const typeType = (ev.type?.type || "").toLowerCase();

    const participants = ev.participants || ev.athletesInvolved || [];
    const p0 = participants[0]?.athlete?.displayName || participants[0]?.displayName || "";
    const p1 = participants[1]?.athlete?.displayName || participants[1]?.displayName || null;

    let type = null, detail = "";

    if (ev.scoringPlay || typeType === "goal" || typeText === "goal") {
      type = "Goal";
      detail = text.includes("own goal") ? "Own Goal"
             : text.includes("penalty")  ? "Penalty"
             : "Normal Goal";
    } else if (typeType === "yellow-card" || typeText.includes("yellow")) {
      type = "Card"; detail = "Yellow Card";
    } else if (typeType === "red-card" || typeText.includes("red card") || typeText.includes("ejection")) {
      type = "Card"; detail = "Red Card";
    } else if (typeType === "substitution" || typeText.includes("substitut")) {
      type = "subst"; detail = "Substitution";
    }

    if (!type || !teamName) continue;

    events.push({
      time: { elapsed, extra: null },
      team: { name: teamName },
      player: { name: p0 },
      assist: { name: (type === "Goal" || type === "subst") ? p1 : null },
      type,
      detail,
    });
  }

  // Fallback: plays array
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

// ── Scorers aggregator ────────────────────────────────────────────────────
async function getScorers() {
  const result = await kv.scan(0, { match: "wc2026:events:*", count: 200 });
  const keys = result?.keys || result?.[1] || [];
  if (!keys.length) return { scorers: [], cards: [] };

  const records = await Promise.all(keys.map(k => kv.get(k).catch(() => null)));
  const goals = {};
  const cards = {};

  records.forEach(record => {
    if (!record?.events?.length) return;
    record.events.forEach(ev => {
      if (ev.type === "Goal" && ev.detail !== "Own Goal") {
        const name = ev.player?.name;
        const team = ev.team?.name;
        if (!name) return;
        if (!goals[name]) goals[name] = { name, team, goals: 0, assists: 0 };
        goals[name].goals++;
        const assist = ev.assist?.name;
        if (assist) {
          if (!goals[assist]) goals[assist] = { name: assist, team, goals: 0, assists: 0 };
          goals[assist].assists++;
        }
      }
      if (ev.type === "Card") {
        const name = ev.player?.name;
        const team = ev.team?.name;
        if (!name) return;
        if (!cards[name]) cards[name] = { name, team, yellow: 0, red: 0 };
        if (ev.detail === "Yellow Card") cards[name].yellow++;
        if (ev.detail === "Red Card") cards[name].red++;
      }
    });
  });

  return {
    scorers: Object.values(goals).sort((a,b) => b.goals-a.goals || b.assists-a.assists).slice(0,30),
    cards: Object.values(cards).sort((a,b) => (b.red*2+b.yellow)-(a.red*2+a.yellow)).slice(0,20),
    matchCount: keys.length,
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Scorers aggregation
  if (req.query.action === "scorers") {
    try {
      return res.status(200).json(await getScorers());
    } catch(e) {
      return res.status(200).json({ scorers: [], cards: [], error: e.message });
    }
  }

  let { home, away, debug, fixtureId } = req.query;
  if ((!home || !away) && fixtureId && fixtureId.includes("|")) {
    [home, away] = fixtureId.split("|");
  }
  if (!home || !away) return res.status(400).json({ error: "home and away required" });

  const cacheKey = `${home}|${away}`;

  // 1. Check mem cache (skip if empty or debug)
  const memCached = memCache[cacheKey];
  if (memCached && debug !== "1" && memCached.events.length > 0) {
    const ttl = memCached.isDone ? TTL_DONE : TTL_LIVE;
    if (Date.now() - memCached.ts < ttl) {
      return res.status(200).json({ events: memCached.events, stats: memCached.stats });
    }
  }

  // 2. Check KV persistent store (finished matches only)
  if (debug !== "1") {
    const persisted = await loadFromKV(home, away);
    if (persisted && persisted.events?.length > 0) {
      console.log(`[matchevents] Serving ${home} vs ${away} from KV (${persisted.events.length} events)`);
      memCache[cacheKey] = { ...persisted, isDone: true, ts: Date.now() };
      return res.status(200).json({ events: persisted.events, stats: persisted.stats });
    }
  }

  // 3. Fetch from ESPN
  try {
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
      return res.status(200).json({
        _debug: true,
        eventId,
        topKeys: Object.keys(data),
        scoringPlaysCount: data.scoringPlays?.length || 0,
        keyEventsCount: data.keyEvents?.length || 0,
        playsCount: data.plays?.length || 0,
        boxscoreTeams: data.boxscore?.teams?.map(t => t.team?.displayName) || [],
        keyEvents: (data.keyEvents || []).slice(0, 5),
      });
    }

    const statusType = data.header?.competitions?.[0]?.status?.type?.name || "NS";
    const isDone = DONE_STATUSES.includes(statusType);
    const isLive = LIVE_STATUSES.includes(statusType);

    const events = parseEvents(data, home);
    const stats = parseStats(data.boxscore, home);

    console.log(`[matchevents] ${home} vs ${away}: ${events.length} events, stats=${!!stats}, status=${statusType}`);

    // Persist to KV if match is finished and we have data
    if (isDone && events.length > 0) {
      await saveToKV(home, away, events, stats);
    }

    memCache[cacheKey] = { events, stats, isDone, isLive, ts: Date.now() };
    return res.status(200).json({ events, stats });

  } catch(e) {
    console.error("[matchevents] Error:", e.message);
    return res.status(200).json({ events: [], stats: null, _debug: e.message });
  }
}
