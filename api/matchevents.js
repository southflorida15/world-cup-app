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

async function saveToKV(home, away, events, stats, lineups=null) {
  try {
    await kv.set(kvKey(home, away), { events, stats, lineups, savedAt: Date.now() });
    console.log(`[matchevents] Persisted ${events.length} events for ${home} vs ${away}`);
  } catch(e) {
    console.warn("[matchevents] KV save:", e.message);
  }
}

// ── ESPN event ID lookup ───────────────────────────────────────────────────
const ESPN_ID_MAP_KEY = "wc2026:espn_ids";

// Hardcoded ESPN IDs for all group stage matches — never ages out
const HARDCODED_ESPN_IDS = {
  "Mexico|South Africa":"760415","South Korea|Czechia":"760414",
  "Canada|Bosnia & Herz.":"760416","United States|Paraguay":"760417",
  "Qatar|Switzerland":"760418","Brazil|Morocco":"760419",
  "Haiti|Scotland":"760420","Australia|Turkiye":"760421",
  "Germany|Curacao":"760422","Netherlands|Japan":"760423",
  "Ivory Coast|Ecuador":"760424","Sweden|Tunisia":"760425",
  "Spain|Cape Verde":"760426","Belgium|Egypt":"760427",
  "Saudi Arabia|Uruguay":"760428","Iran|New Zealand":"760429",
  "France|Senegal":"760430","Iraq|Norway":"760431",
  "Argentina|Algeria":"760432","Austria|Jordan":"760433",
  "Portugal|DR Congo":"760434","England|Croatia":"760435",
  "Ghana|Panama":"760436","Uzbekistan|Colombia":"760437",
};

async function getESPNEventId(home, away) {
  const key = `${home}|${away}`;

  // 1. Hardcoded map (fastest, always works for known matches)
  if (HARDCODED_ESPN_IDS[key]) return HARDCODED_ESPN_IDS[key];

  // 2. Try livescores cache (works for recent/live matches)
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
        saveESPNId(home, away, match.fixture.id);
        return match.fixture.id;
      }
    }
  } catch(e) {
    console.warn("[matchevents] livescores KV lookup:", e.message);
  }

  // 3. Fall back to persisted ID map
  try {
    const idMap = await kv.get(ESPN_ID_MAP_KEY) || {};
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

// ── Lineups parser ────────────────────────────────────────────────────────
function parseLineups(data, homeTeam) {
  const rosters = data.rosters;
  if (!rosters?.length) return null;

  const result = { home: null, away: null };

  rosters.forEach(roster => {
    // ESPN structure: { homeAway, winner, team: { displayName, athletes: [...] } }
    const teamObj = roster.team || roster;
    const teamName = normESPN(teamObj.displayName || teamObj.name || roster.team?.displayName || "");
    const side = teamName === homeTeam ? "home" : "away";
    const formation = roster.formation || teamObj.formation || null;

    // Try every possible location for the players array
    const players =
      roster.entries ||
      roster.roster ||
      roster.athletes ||
      roster.players ||
      teamObj.athletes ||
      teamObj.roster ||
      teamObj.entries ||
      teamObj.players ||
      [];

    const starters = [];
    const bench = [];

    players.forEach(p => {
      const athlete = p.athlete || p;
      const name = athlete.displayName || athlete.fullName || athlete.shortName || p.displayName || p.name || "";
      const jersey = p.jersey ?? athlete.jersey ?? null;
      const pos = p.position?.abbreviation || p.position?.name
                || athlete.position?.abbreviation || athlete.position?.name || "";
      const starter = p.starter ?? p.didPlay ?? p.active ?? true;
      const subbedOut = p.subbedOut ?? false;
      const subbedIn  = p.subbedIn  ?? false;

      if (!name) return;
      const entry = { name, jersey: jersey ? String(jersey) : null, pos, subbedOut, subbedIn };
      if (starter) starters.push(entry);
      else bench.push(entry);
    });

    result[side] = { formation, starters, bench, teamName };
  });

  return (result.home || result.away) ? result : null;
}
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
// Hardcoded events for matches that may have aged out of ESPN feed
const SEEDED_EVENTS = {
  "Mexico|South Africa": {
    events: [
      {time:{elapsed:9},team:{name:"Mexico"},player:{name:"Julián Quiñones"},assist:{name:"Érik Lira"},type:"Goal",detail:"Normal Goal"},
      {time:{elapsed:17},team:{name:"South Africa"},player:{name:"Teboho Mokoena"},assist:{name:null},type:"Card",detail:"Yellow Card"},
      {time:{elapsed:23},team:{name:"Mexico"},player:{name:"Brian Gutiérrez"},assist:{name:null},type:"Card",detail:"Yellow Card"},
      {time:{elapsed:49},team:{name:"South Africa"},player:{name:"Sphephelo Sithole"},assist:{name:null},type:"Card",detail:"Red Card"},
      {time:{elapsed:56},team:{name:"South Africa"},player:{name:"Thalente Mbatha"},assist:{name:"Lyle Foster"},type:"subst",detail:"Substitution"},
      {time:{elapsed:61},team:{name:"South Africa"},player:{name:"Themba Zwane"},assist:{name:"Jayden Adams"},type:"subst",detail:"Substitution"},
      {time:{elapsed:66},team:{name:"Mexico"},player:{name:"Luis Chávez"},assist:{name:"Brian Gutiérrez"},type:"subst",detail:"Substitution"},
      {time:{elapsed:66},team:{name:"Mexico"},player:{name:"Gilberto Mora"},assist:{name:"Álvaro Fidalgo"},type:"subst",detail:"Substitution"},
      {time:{elapsed:67},team:{name:"Mexico"},player:{name:"Raúl Jiménez"},assist:{name:"Roberto Alvarado"},type:"Goal",detail:"Normal Goal"},
      {time:{elapsed:74},team:{name:"South Africa"},player:{name:"Nkosinathi Sibisi"},assist:{name:null},type:"Card",detail:"Yellow Card"},
      {time:{elapsed:76},team:{name:"Mexico"},player:{name:"Edson Álvarez"},assist:{name:"Érik Lira"},type:"subst",detail:"Substitution"},
      {time:{elapsed:76},team:{name:"Mexico"},player:{name:"Armando González"},assist:{name:"Raúl Jiménez"},type:"subst",detail:"Substitution"},
      {time:{elapsed:76},team:{name:"South Africa"},player:{name:"Evidence Makgopa"},assist:{name:"Iqraam Rayners"},type:"subst",detail:"Substitution"},
      {time:{elapsed:77},team:{name:"South Africa"},player:{name:"Oswin Appollis"},assist:{name:"Aubrey Modiba"},type:"subst",detail:"Substitution"},
      {time:{elapsed:79},team:{name:"Mexico"},player:{name:"Alexis Vega"},assist:{name:"Julián Quiñones"},type:"subst",detail:"Substitution"},
      {time:{elapsed:84},team:{name:"South Africa"},player:{name:"Themba Zwane"},assist:{name:null},type:"Card",detail:"Red Card"},
      {time:{elapsed:90},team:{name:"Mexico"},player:{name:"César Montes"},assist:{name:null},type:"Card",detail:"Red Card"},
    ],
    stats: {
      home:{possession:58,shots:12,shotsOn:5,corners:6,fouls:5,yellowCards:2,redCards:1},
      away:{possession:42,shots:4,shotsOn:1,corners:2,fouls:8,yellowCards:2,redCards:2}
    }
  },
  "South Korea|Czechia": {
    events: [
      {time:{elapsed:26},team:{name:"Czechia"},player:{name:"Patrik Schick"},assist:{name:"Tomáš Souček"},type:"Goal",detail:"Normal Goal"},
      {time:{elapsed:34},team:{name:"South Korea"},player:{name:"Hwang In-beom"},assist:{name:"Son Heung-min"},type:"Goal",detail:"Normal Goal"},
      {time:{elapsed:71},team:{name:"South Korea"},player:{name:"Oh Hyeon-gyu"},assist:{name:"Hwang In-beom"},type:"Goal",detail:"Normal Goal"},
    ],
    stats: {
      home:{possession:46,shots:13,shotsOn:6,corners:5,fouls:9},
      away:{possession:54,shots:8,shotsOn:3,corners:3,fouls:7}
    }
  }
};

const KNOWN_FINISHED = [
  { home: "Mexico",      away: "South Africa", espnId: "760415" },
  { home: "South Korea", away: "Czechia",      espnId: "760414" },
];

async function autoSeedEvents() {
  for (const { home, away, espnId } of KNOWN_FINISHED) {
    const existing = await loadFromKV(home, away);
    if (existing?.events?.length) continue;

    // Try ESPN first
    let seeded = false;
    try {
      const r = await fetch(`${ESPN_BASE}/summary?event=${espnId}`, { headers: ESPN_HEADERS });
      if (r.ok) {
        const data = await r.json();
        const events = parseEvents(data, home);
        const stats = parseStats(data.boxscore, home);
        if (events.length > 0) {
          await saveToKV(home, away, events, stats);
          await saveESPNId(home, away, espnId);
          console.log(`[scorers] ESPN-seeded ${home} vs ${away}: ${events.length} events`);
          seeded = true;
        }
      }
    } catch(e) {
      console.warn(`[scorers] ESPN seed failed for ${home} vs ${away}:`, e.message);
    }

    // Fall back to hardcoded data
    if (!seeded) {
      const key = `${home}|${away}`;
      const fallback = SEEDED_EVENTS[key];
      if (fallback) {
        await saveToKV(home, away, fallback.events, fallback.stats);
        await saveESPNId(home, away, espnId);
        console.log(`[scorers] hardcoded-seeded ${home} vs ${away}: ${fallback.events.length} events`);
      }
    }
  }
}

async function getScorers() {
  let allKeys = [];
  let cursor = 0;
  do {
    const [next, batch] = await kv.scan(cursor, { match: "wc2026:events:*", count: 200 });
    cursor = parseInt(next) || 0;
    allKeys.push(...batch);
  } while (cursor !== 0);
  const keys = allKeys;

  // Auto-seed if no events persisted yet
  if (!keys.length) {
    await autoSeedEvents();
    // Re-scan after seeding
    let cursor2 = 0;
    do {
      const [next, batch] = await kv.scan(cursor2, { match: "wc2026:events:*", count: 200 });
      cursor2 = parseInt(next) || 0;
      allKeys.push(...batch);
    } while (cursor2 !== 0);
  }

  if (!allKeys.length) return { scorers: [], cards: [] };

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

// ── Seed ESPN IDs for today + tomorrow ───────────────────────────────────────
async function seedESPNIds() {
  const pad = n => String(n).padStart(2, "0");
  const dateStr = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  const now = new Date();
  const dates = [dateStr(now), dateStr(new Date(now.getTime() + 86400000)), dateStr(new Date(now.getTime() + 172800000))];

  const idMap = await kv.get(ESPN_ID_MAP_KEY).catch(() => ({})) || {};
  let added = 0;

  for (const date of dates) {
    try {
      const r = await fetch(`${ESPN_BASE}/scoreboard?dates=${date}&limit=20`, { headers: ESPN_HEADERS });
      if (!r.ok) continue;
      const data = await r.json();
      for (const event of (data.events || [])) {
        const comp = event.competitions?.[0];
        if (!comp) continue;
        const home = normESPN(comp.competitors?.find(c => c.homeAway === "home")?.team?.displayName || "");
        const away = normESPN(comp.competitors?.find(c => c.homeAway === "away")?.team?.displayName || "");
        if (!home || !away) continue;
        const key = `${home}|${away}`;
        if (!idMap[key] && event.id) {
          idMap[key] = event.id;
          added++;
          console.log(`[seed-ids] ${key} → ${event.id}`);
        }
      }
    } catch(e) {
      console.warn(`[seed-ids] failed for ${date}:`, e.message);
    }
  }

  if (added > 0) {
    await kv.set(ESPN_ID_MAP_KEY, idMap).catch(() => {});
  }

  return { added, total: Object.keys(idMap).length, dates };
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

  // Seed ESPN IDs for today + tomorrow
  if (req.query.action === "seed-ids") {
    try {
      const result = await seedESPNIds();
      return res.status(200).json({ ok: true, ...result });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Auto-seed IDs once per day on first request
  try {
    const lastSeed = await kv.get("wc2026:espn_ids_seeded_date").catch(() => null);
    const today = new Date().toISOString().slice(0, 10);
    if (lastSeed !== today) {
      seedESPNIds().catch(e => console.warn("[matchevents] auto-seed failed:", e.message));
      await kv.set("wc2026:espn_ids_seeded_date", today, { ex: 86400 }).catch(() => {});
    }
  } catch(e) { /* non-critical */ }

  let { home, away, debug, flush, fixtureId } = req.query;
  if ((!home || !away) && fixtureId && fixtureId.includes("|")) {
    [home, away] = fixtureId.split("|");
  }
  if (!home || !away) return res.status(400).json({ error: "home and away required" });

  // Flush stale KV cache for this match
  if (flush === "1") {
    await kv.del(kvKey(home, away)).catch(() => {});
    delete memCache[`${home}|${away}`];
    return res.status(200).json({ ok: true, flushed: `${home}|${away}` });
  }

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
      return res.status(200).json({ events: persisted.events, stats: persisted.stats, lineups: persisted.lineups || null });
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
        rostersCount: data.rosters?.length || 0,
        rosterSample: data.rosters?.[0] ? {
          teamName: data.rosters[0].team?.displayName,
          formation: data.rosters[0].formation,
          topKeys: Object.keys(data.rosters[0]),
          teamKeys: data.rosters[0].team ? Object.keys(data.rosters[0].team) : [],
          entriesCount: (data.rosters[0].entries || data.rosters[0].roster || data.rosters[0].athletes || data.rosters[0].players || data.rosters[0].team?.athletes || data.rosters[0].team?.roster || []).length,
          firstPlayer: (data.rosters[0].entries || data.rosters[0].roster || data.rosters[0].athletes || data.rosters[0].players || data.rosters[0].team?.athletes || data.rosters[0].team?.roster || [])[0] || null,
        } : null,
      });
    }

    const statusType = data.header?.competitions?.[0]?.status?.type?.name || "NS";
    const isDone = DONE_STATUSES.includes(statusType);
    const isLive = LIVE_STATUSES.includes(statusType);
    const isPrematch = !isDone && !isLive;

    const events = parseEvents(data, home);
    const stats = parseStats(data.boxscore, home);
    const lineups = parseLineups(data, home);

    console.log(`[matchevents] ${home} vs ${away}: ${events.length} events, stats=${!!stats}, lineups=${!!lineups}, status=${statusType}`);

    // Persist to KV if match is finished and we have data
    if (isDone && events.length > 0) {
      await saveToKV(home, away, events, stats, lineups);
    }

    // Cache lineups pre-match with short TTL (5min) so we pick them up when published
    const TTL_PREMATCH_LINEUPS = 5 * 60 * 1000;
    memCache[cacheKey] = { events, stats, lineups, isDone, isLive, ts: Date.now(), ttlOverride: isPrematch && lineups ? TTL_PREMATCH_LINEUPS : null };
    return res.status(200).json({ events, stats, lineups });

  } catch(e) {
    console.error("[matchevents] Error:", e.message);
    return res.status(200).json({ events: [], stats: null, _debug: e.message });
  }
}
