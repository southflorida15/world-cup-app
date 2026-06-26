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
  "Türkiye": "Turkiye",
  "Turkiye": "Turkiye",
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

const SCORERS_AGGREGATE_KEY = "wc2026:scorers_aggregate";

async function saveToKV(home, away, events, stats, lineups=null) {
  try {
    await kv.set(kvKey(home, away), { events, stats, lineups, savedAt: Date.now() });
    console.log(`[matchevents] Persisted ${events.length} events for ${home} vs ${away}`);
  } catch(e) {
    console.warn("[matchevents] KV save:", e.message);
  }
  await updateScorersAggregate(home, away, events);
}

// Folds NEW goals/cards into the running scorers aggregate — called for
// both live and finished matches. Tracks how many of each match's events
// have already been counted (processedCounts[matchKey], a count of events,
// not just a yes/no "is this match done") so a still-live match's goal
// shows up here within moments of being scored, not only once the match
// is over. Each call only processes events beyond what was already
// counted last time, so nothing gets double-counted as the same match
// gets checked repeatedly while it's still in progress.
async function updateScorersAggregate(home, away, events) {
  try {
    const matchKey = kvKey(home, away);
    const aggregate = await kv.get(SCORERS_AGGREGATE_KEY) || { goals: {}, cards: {}, processedCounts: {} };
    if (!aggregate.processedCounts) aggregate.processedCounts = {};
    // Backward-compat: an older aggregate shape stored a plain array of
    // fully-processed match keys instead of per-match counts. Treat any
    // match already in that array as "everything in it so far is counted".
    if (Array.isArray(aggregate.processedMatches)) {
      aggregate.processedMatches.forEach(k => {
        if (aggregate.processedCounts[k] === undefined) aggregate.processedCounts[k] = Infinity;
      });
      delete aggregate.processedMatches;
    }

    const alreadyProcessed = aggregate.processedCounts[matchKey] || 0;
    if (!Array.isArray(events) || events.length <= alreadyProcessed) return; // nothing new since last check

    const newEvents = events.slice(alreadyProcessed);
    newEvents.forEach(ev => {
      if (ev.type === "Goal" && ev.detail !== "Own Goal") {
        const name = ev.player?.name;
        const team = ev.team?.name;
        if (!name) return;
        if (!aggregate.goals[name]) aggregate.goals[name] = { name, team, goals: 0, assists: 0 };
        aggregate.goals[name].goals++;
        const assist = ev.assist?.name;
        if (assist) {
          if (!aggregate.goals[assist]) aggregate.goals[assist] = { name: assist, team, goals: 0, assists: 0 };
          aggregate.goals[assist].assists++;
        }
      }
      if (ev.type === "Card") {
        const name = ev.player?.name;
        const team = ev.team?.name;
        if (!name) return;
        if (!aggregate.cards[name]) aggregate.cards[name] = { name, team, yellow: 0, red: 0 };
        if (ev.detail === "Yellow Card") aggregate.cards[name].yellow++;
        if (ev.detail === "Red Card") aggregate.cards[name].red++;
      }
    });
    aggregate.processedCounts[matchKey] = events.length;
    await kv.set(SCORERS_AGGREGATE_KEY, aggregate);
  } catch(e) {
    console.warn("[matchevents] scorers aggregate update:", e.message);
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
  "Turkiye|United States":"760470",
};

async function getESPNEventId(home, away) {
  home = normESPN(home);
  away = normESPN(away);

  const key = `${home}|${away}`;
  const reverseKey = `${away}|${home}`;

  // 1. Livescores KV — check both home/away directions
  try {
    const cached = await kv.get("wc2026:livescores");
    if (cached) {
      const fixtures = Array.isArray(cached) ? cached : (cached?.response || []);
      const match = fixtures.find(f => {
        const h = normESPN(f?.teams?.home?.name || "");
        const a = normESPN(f?.teams?.away?.name || "");
        return (
          (h === home && a === away) ||
          (h === away && a === home)
        );
      });

      if (match?.fixture?.id && !String(match.fixture.id).includes("|")) {
        await saveESPNId(home, away, match.fixture.id);
        return match.fixture.id;
      }
    }
  } catch(e) {
    console.warn("[matchevents] livescores KV lookup:", e.message);
  }

  // 2. Persisted ID map — check normal and reverse keys
  try {
    const idMap = await kv.get(ESPN_ID_MAP_KEY) || {};
    if (idMap[key]) return idMap[key];
    if (idMap[reverseKey]) {
      await saveESPNId(home, away, idMap[reverseKey]);
      return idMap[reverseKey];
    }
  } catch(e) {
    console.warn("[matchevents] ESPN ID map lookup:", e.message);
  }

  // 3. Hardcoded map — check normal and reverse keys
  if (HARDCODED_ESPN_IDS[key]) return HARDCODED_ESPN_IDS[key];
  if (HARDCODED_ESPN_IDS[reverseKey]) return HARDCODED_ESPN_IDS[reverseKey];

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

  // Dedup: ESPN's keyEvents feed can post the same goal twice — a
  // provisional entry when it's first scored, then a second, re-confirmed
  // entry after a brief review/update — with no shared ID to tell them
  // apart from a plain "same player, same team, same minute" match. With
  // no dedup, both copies became separate Goal events, inflating the
  // events-derived goal count above the actual final score (confirmed
  // directly: Ronaldo showed twice at completely different minutes here,
  // which is a real double — but the SAME bug class also covers the more
  // common case of an exact-duplicate repost at the identical minute).
  const seen = new Set();
  const deduped = events.filter(ev => {
    const key = `${ev.type}|${ev.team?.name}|${ev.player?.name}|${ev.time?.elapsed}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort((a, b) => (a.time?.elapsed || 0) - (b.time?.elapsed || 0));
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

// The full 2026 schedule (all 104 matches' home/away pairs). Used as the
// candidate list for autoSeedEvents below — replaces relying on
// HARDCODED_ESPN_IDS for this purpose, which only covers a partial early
// batch of matches and was the actual root cause of goals from later
// matches (e.g. Mbappe's brace vs Iraq) never reaching the live scorers
// aggregate, no matter how many times the sweep ran. getESPNEventId()'s
// existing 3-tier lookup (live feed -> persisted map -> hardcoded) still
// resolves the actual ESPN ID for each — this just makes sure EVERY match
// gets checked, not only the ones someone thought to hardcode an ID for.
const FULL_SCHEDULE = [
  { home: "Mexico", away: "South Africa" },
  { home: "South Korea", away: "Czechia" },
  { home: "Canada", away: "Bosnia & Herz." },
  { home: "United States", away: "Paraguay" },
  { home: "Qatar", away: "Switzerland" },
  { home: "Brazil", away: "Morocco" },
  { home: "Haiti", away: "Scotland" },
  { home: "Australia", away: "Turkiye" },
  { home: "Germany", away: "Curacao" },
  { home: "Netherlands", away: "Japan" },
  { home: "Ivory Coast", away: "Ecuador" },
  { home: "Sweden", away: "Tunisia" },
  { home: "Spain", away: "Cape Verde" },
  { home: "Belgium", away: "Egypt" },
  { home: "Saudi Arabia", away: "Uruguay" },
  { home: "Iran", away: "New Zealand" },
  { home: "France", away: "Senegal" },
  { home: "Iraq", away: "Norway" },
  { home: "Argentina", away: "Algeria" },
  { home: "Austria", away: "Jordan" },
  { home: "Portugal", away: "DR Congo" },
  { home: "England", away: "Croatia" },
  { home: "Ghana", away: "Panama" },
  { home: "Uzbekistan", away: "Colombia" },
  { home: "Czechia", away: "South Africa" },
  { home: "Switzerland", away: "Bosnia & Herz." },
  { home: "Canada", away: "Qatar" },
  { home: "Mexico", away: "South Korea" },
  { home: "United States", away: "Australia" },
  { home: "Scotland", away: "Morocco" },
  { home: "Brazil", away: "Haiti" },
  { home: "Turkiye", away: "Paraguay" },
  { home: "Netherlands", away: "Sweden" },
  { home: "Germany", away: "Ivory Coast" },
  { home: "Ecuador", away: "Curacao" },
  { home: "Tunisia", away: "Japan" },
  { home: "Spain", away: "Saudi Arabia" },
  { home: "Belgium", away: "Iran" },
  { home: "Uruguay", away: "Cape Verde" },
  { home: "New Zealand", away: "Egypt" },
  { home: "Argentina", away: "Austria" },
  { home: "France", away: "Iraq" },
  { home: "Norway", away: "Senegal" },
  { home: "Jordan", away: "Algeria" },
  { home: "Portugal", away: "Uzbekistan" },
  { home: "England", away: "Ghana" },
  { home: "Panama", away: "Croatia" },
  { home: "Colombia", away: "DR Congo" },
  { home: "Switzerland", away: "Canada" },
  { home: "Bosnia & Herz.", away: "Qatar" },
  { home: "Scotland", away: "Brazil" },
  { home: "Morocco", away: "Haiti" },
  { home: "Czechia", away: "Mexico" },
  { home: "South Africa", away: "South Korea" },
  { home: "Curacao", away: "Ivory Coast" },
  { home: "Ecuador", away: "Germany" },
  { home: "Japan", away: "Sweden" },
  { home: "Tunisia", away: "Netherlands" },
  { home: "Turkiye", away: "United States" },
  { home: "Paraguay", away: "Australia" },
  { home: "Norway", away: "France" },
  { home: "Senegal", away: "Iraq" },
  { home: "Cape Verde", away: "Saudi Arabia" },
  { home: "Uruguay", away: "Spain" },
  { home: "Egypt", away: "Iran" },
  { home: "New Zealand", away: "Belgium" },
  { home: "Panama", away: "England" },
  { home: "Croatia", away: "Ghana" },
  { home: "Colombia", away: "Portugal" },
  { home: "DR Congo", away: "Uzbekistan" },
  { home: "Algeria", away: "Austria" },
  { home: "Jordan", away: "Argentina" },
  { home: "2A", away: "2B" },
  { home: "1E", away: "3rd ABCDF" },
  { home: "1F", away: "2C" },
  { home: "1C", away: "2F" },
  { home: "1I", away: "3rd CDFGH" },
  { home: "2E", away: "2I" },
  { home: "1A", away: "3rd CEFHI" },
  { home: "1L", away: "3rd EHIJK" },
  { home: "1D", away: "3rd BEFIJ" },
  { home: "1G", away: "3rd AEHIJ" },
  { home: "2K", away: "2L" },
  { home: "1H", away: "2J" },
  { home: "1B", away: "3rd EFGIJ" },
  { home: "1J", away: "2H" },
  { home: "1K", away: "3rd DEIJL" },
  { home: "2D", away: "2G" },
  { home: "R16 M1", away: "TBD" },
  { home: "R16 M2", away: "TBD" },
  { home: "R16 M3", away: "TBD" },
  { home: "R16 M4", away: "TBD" },
  { home: "R16 M5", away: "TBD" },
  { home: "R16 M6", away: "TBD" },
  { home: "R16 M7", away: "TBD" },
  { home: "R16 M8", away: "TBD" },
  { home: "QF M1", away: "TBD" },
  { home: "QF M2", away: "TBD" },
  { home: "QF M3", away: "TBD" },
  { home: "QF M4", away: "TBD" },
  { home: "SF M1", away: "TBD" },
  { home: "SF M2", away: "TBD" },
  { home: "3rd Place", away: "TBD" },
  { home: "🏆 Final", away: "TBD" },

];

const KNOWN_FINISHED = [
  { home: "Mexico",      away: "South Africa", espnId: "760415" },
  { home: "South Korea", away: "Czechia",      espnId: "760414" },
];

async function autoSeedEvents() {
  // Was: only checked the 2 matches hand-listed above, and only ran at all
  // when the persisted event set was completely empty. That's why a
  // player's goals from a match nobody had individually opened the
  // timeline for — e.g. Mbappé's brace vs Senegal — never made it into the
  // scorers aggregate, even days after the match finished and even though
  // the result itself showed up everywhere else fine.
  //
  // Now checks every match in HARDCODED_ESPN_IDS (the comprehensive map
  // covering the full schedule) plus the small manual list, resolving each
  // one's real ESPN ID through the same robust 3-tier lookup the main
  // per-match handler uses (live feed -> persisted map -> hardcoded), and
  // only persists ones ESPN actually reports as finished.
  const candidates = [...FULL_SCHEDULE];
  KNOWN_FINISHED.forEach(m => {
    if (!candidates.some(c => c.home === m.home && c.away === m.away)) candidates.push(m);
  });

  // Cap how many we actually fetch-and-persist per call — right after this
  // logic ships, potentially dozens of matches could be missing at once,
  // and sequentially fetching all of them from ESPN in a single serverless
  // invocation risks exceeding the function timeout. Processing a bounded
  // batch per call means it catches up over a few calls instead of one
  // long (and fragile) one.
  const MAX_SEED_PER_CALL = 10;
  let seededThisCall = 0;

  for (const { home, away } of candidates) {
    if (seededThisCall >= MAX_SEED_PER_CALL) break;
    const existing = await loadFromKV(home, away);
    if (existing?.events?.length) continue; // already permanently persisted, nothing to do

    const espnId = await getESPNEventId(home, away);
    if (!espnId) continue;

    try {
      const r = await fetch(`${ESPN_BASE}/summary?event=${espnId}`, { headers: ESPN_HEADERS });
      if (!r.ok) continue;
      const data = await r.json();
      const statusType = data.header?.competitions?.[0]?.status?.type?.name || "NS";

      if (DONE_STATUSES.includes(statusType)) {
        const events = parseEvents(data, home);
        const stats = parseStats(data.boxscore, home);
        if (events.length > 0) {
          await saveToKV(home, away, events, stats);
          seededThisCall++;
          console.log(`[scorers] auto-seeded ${home} vs ${away}: ${events.length} events`);
        }
      } else if (LIVE_STATUSES.includes(statusType)) {
        // Was the actual gap: a goal scored mid-match only reached the
        // aggregate if someone happened to open THAT SPECIFIC match's
        // timeline modal while it was live — this sweep previously skipped
        // every live match outright, so there was no automatic backstop
        // the way finished matches already had. Now folds in new goals
        // here too (aggregate only, not the permanent per-match cache —
        // that still must wait for the match to actually finish).
        const events = parseEvents(data, home);
        if (events.length > 0) {
          await updateScorersAggregate(home, away, events);
          console.log(`[scorers] live-updated ${home} vs ${away}: ${events.length} events so far`);
        }
        // Doesn't count against the seed cap — this is a cheap aggregate-only
        // update, not a full fetch-and-permanently-persist operation.
      }
    } catch(e) {
      console.warn(`[scorers] auto-seed failed for ${home} vs ${away}:`, e.message);
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

  // Was: only ran autoSeedEvents() if the persisted set was completely
  // empty — meaning it effectively only mattered once, at the very start.
  // Any match that finished afterward and that nobody happened to open the
  // timeline modal for (e.g. France vs Senegal, where Mbappé broke the
  // national scoring record) silently never made it into the aggregate.
  // Now sweeps periodically (throttled via a KV timestamp, not on every
  // single call) so newly-finished matches get picked up automatically.
  const lastSweep = await kv.get("wc2026:scorers_seed_sweep").catch(() => null);
  const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
  if (!allKeys.length || !lastSweep || Date.now() - Number(lastSweep) > SWEEP_INTERVAL_MS) {
    await autoSeedEvents();
    await kv.set("wc2026:scorers_seed_sweep", String(Date.now())).catch(() => {});
    allKeys = [];
    let cursor2 = 0;
    do {
      const [next, batch] = await kv.scan(cursor2, { match: "wc2026:events:*", count: 200 });
      cursor2 = parseInt(next) || 0;
      allKeys.push(...batch);
    } while (cursor2 !== 0);
  }

  if (!allKeys.length) return { scorers: [], cards: [] };

  // Read the pre-computed aggregate (maintained incrementally by saveToKV
  // and updateScorersAggregate, both for finished matches and — as of the
  // live-update fix — in-progress ones too) instead of re-fetching and
  // re-aggregating every persisted match's full event list on every single
  // call. Self-healing: any finished match whose events were persisted
  // before this aggregate existed gets folded in once here, then never
  // touched again (a finished match's permanent cache entry never grows,
  // unlike a live one, so "processed once" is correct and final for these).
  let aggregate = await kv.get(SCORERS_AGGREGATE_KEY) || { goals: {}, cards: {}, processedCounts: {} };
  if (!aggregate.processedCounts) aggregate.processedCounts = {};
  if (Array.isArray(aggregate.processedMatches)) {
    aggregate.processedMatches.forEach(k => {
      if (aggregate.processedCounts[k] === undefined) aggregate.processedCounts[k] = Infinity;
    });
    delete aggregate.processedMatches;
  }
  const unprocessedKeys = allKeys.filter(k => aggregate.processedCounts[k] === undefined);

  if (unprocessedKeys.length) {
    const records = await kv.mget(...unprocessedKeys).catch(() => unprocessedKeys.map(() => null));
    records.forEach((record, i) => {
      if (record?.events?.length) {
        record.events.forEach(ev => {
          if (ev.type === "Goal" && ev.detail !== "Own Goal") {
            const name = ev.player?.name;
            const team = ev.team?.name;
            if (!name) return;
            if (!aggregate.goals[name]) aggregate.goals[name] = { name, team, goals: 0, assists: 0 };
            aggregate.goals[name].goals++;
            const assist = ev.assist?.name;
            if (assist) {
              if (!aggregate.goals[assist]) aggregate.goals[assist] = { name: assist, team, goals: 0, assists: 0 };
              aggregate.goals[assist].assists++;
            }
          }
          if (ev.type === "Card") {
            const name = ev.player?.name;
            const team = ev.team?.name;
            if (!name) return;
            if (!aggregate.cards[name]) aggregate.cards[name] = { name, team, yellow: 0, red: 0 };
            if (ev.detail === "Yellow Card") aggregate.cards[name].yellow++;
            if (ev.detail === "Red Card") aggregate.cards[name].red++;
          }
        });
      }
      aggregate.processedCounts[unprocessedKeys[i]] = record?.events?.length || 0;
    });
    await kv.set(SCORERS_AGGREGATE_KEY, aggregate).catch(() => {});
  }

  return {
    scorers: Object.values(aggregate.goals).sort((a,b) => b.goals-a.goals || b.assists-a.assists).slice(0,30),
    cards: Object.values(aggregate.cards).sort((a,b) => (b.red*2+b.yellow)-(a.red*2+a.yellow)).slice(0,20),
    matchCount: Object.keys(aggregate.processedCounts).length,
  };
}

// ── Seed ESPN IDs for today + next 7 days + merge hardcoded ─────────────────
async function seedESPNIds() {
  const pad = n => String(n).padStart(2, "0");
  const dateStr = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  const now = new Date();

  // Fetch next 7 days to cover upcoming matchdays
  const dates = Array.from({length: 8}, (_, i) => dateStr(new Date(now.getTime() + (i - 1) * 86400000)));

  // Start from existing KV only — never seed from hardcoded (they may be wrong)
  const idMap = await kv.get(ESPN_ID_MAP_KEY).catch(() => ({})) || {};
  const before = Object.keys(idMap).length;

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
        if (!home || !away || !event.id) continue;
        const key = `${home}|${away}`;
        // Always overwrite with real ESPN data — fixes any previously wrong IDs
        idMap[key] = event.id;
        console.log(`[seed-ids] ${key} → ${event.id}`);
      }
    } catch(e) {
      console.warn(`[seed-ids] failed for ${date}:`, e.message);
    }
  }

  const added = Object.keys(idMap).length - before;
  await kv.set(ESPN_ID_MAP_KEY, idMap).catch(() => {});

  return { added, total: Object.keys(idMap).length, dates };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Scorers aggregation
  if (req.query.action === "scorers") {
    try {
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300");
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
  home = normESPN(String(home));
  away = normESPN(String(away));

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
      // Was missing entirely — meant every concurrent viewer of the same
      // match's timeline independently invoked this function (and, on a
      // cold start with memCache wiped, independently hit Redis too) even
      // though the data is identical for everyone. Finished matches never
      // change again, so a long public cache is safe; live ones get a
      // short one matching the in-memory TTL.
      res.setHeader("Cache-Control", memCached.isDone
        ? "public, max-age=3600, s-maxage=3600"
        : "public, max-age=15, s-maxage=20, stale-while-revalidate=30");
      return res.status(200).json({
  events: memCached.events,
  stats: memCached.stats,
  lineups: memCached.lineups || null
});
    }
  }

  // 2. Check KV persistent store (finished matches only)
  if (debug !== "1") {
    const persisted = await loadFromKV(home, away);
    if (persisted && persisted.events?.length > 0) {
      console.log(`[matchevents] Serving ${home} vs ${away} from KV (${persisted.events.length} events)`);
      memCache[cacheKey] = { ...persisted, isDone: true, ts: Date.now() };
      // Finished match — data is permanent, cache aggressively.
      res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
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

    // Persist to KV permanently once the match is finished (unchanged
    // behavior — other code treats "exists in this cache" as "this match
    // is done forever" and serves it with a 1-hour TTL, so live data must
    // never be written here).
    if (isDone && events.length > 0) {
      await saveToKV(home, away, events, stats, lineups);
    } else if (isLive && events.length > 0) {
      // Was: a goal scored mid-match never reached the Stats tab's live
      // scorers total until the match fully ended — even though this
      // exact events fetch already had it, since the match's own timeline
      // modal fetches live data directly. Now updates the aggregate alone
      // (not the permanent per-match cache) as soon as a new goal appears,
      // so it shows up within moments of being scored instead of waiting
      // for full-time.
      await updateScorersAggregate(home, away, events);
    }

    // Cache lineups pre-match with short TTL (5min) so we pick them up when published
    const TTL_PREMATCH_LINEUPS = 5 * 60 * 1000;
    memCache[cacheKey] = { events, stats, lineups, isDone, isLive, ts: Date.now(), ttlOverride: isPrematch && lineups ? TTL_PREMATCH_LINEUPS : null };
    res.setHeader("Cache-Control", isDone
      ? "public, max-age=3600, s-maxage=3600"
      : "public, max-age=15, s-maxage=20, stale-while-revalidate=30");
    return res.status(200).json({ events, stats, lineups });

  } catch(e) {
    console.error("[matchevents] Error:", e.message);
    return res.status(200).json({ events: [], stats: null, _debug: e.message });
  }
}
