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

const LIVE_STATUSES = new Set([
  "LIVE", "1H", "HT", "2H", "ET", "BT", "P",
  "inprogress", "first_half", "halftime", "second_half", "extra_time", "penalties",
  "STATUS_IN_PROGRESS", "STATUS_HALFTIME", "STATUS_OVERTIME", "STATUS_SHOOTOUT"
]);

const DONE_STATUSES = new Set([
  "FT", "AET", "PEN",
  "finished", "ended", "after_extra_time", "after_penalties",
  "STATUS_FINAL", "STATUS_FULL_TIME", "STATUS_AET", "STATUS_AFTER_EXTRA_TIME",
  "STATUS_END_OF_EXTRATIME", "STATUS_FINAL_PEN", "STATUS_PENALTIES"
]);

function isDoneStatus(status) {
  return DONE_STATUSES.has(String(status || ""));
}

function isLiveStatus(status) {
  return LIVE_STATUSES.has(String(status || ""));
}

const memCache = {};
const TTL_LIVE = 30 * 1000;
const TTL_DONE = 60 * 60 * 1000;

const ESPN_NAME_MAP = {
  "USA": "United States",
  "United States": "United States",

  // Turkey/Türkiye appears differently depending on source/feed.
  // Internally the app schedule uses "Turkiye", so normalize all variants to that.
  "Turkey": "Turkiye",
  "Türkiye": "Turkiye",
  "Turkiye": "Turkiye",
  "Republic of Türkiye": "Turkiye",

  "Bosnia and Herzegovina": "Bosnia & Herz.",
  "Bosnia & Herz.": "Bosnia & Herz.",
  "Cape Verde Islands": "Cape Verde",
  "Cape Verde": "Cape Verde",
  "Curaçao": "Curacao",
  "Curacao": "Curacao",
  "Congo, DR": "DR Congo",
  "DR Congo": "DR Congo",
  "Côte d'Ivoire": "Ivory Coast",
  "Ivory Coast": "Ivory Coast",
  "Korea Republic": "South Korea",
  "South Korea": "South Korea",
  "Czech Republic": "Czechia",
  "Czechia": "Czechia",
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
    await kv.set(kvKey(home, away), { schemaVersion: 2, events, stats, lineups, savedAt: Date.now() });
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

function scorerEventKey(matchKey, ev) {
  const elapsed = ev?.time?.elapsed ?? "";
  const type = ev?.type || "";
  const player = ev?.player?.name || "";
  // For goals/cards: use minimal key matching deduplicateEvents — omit team/detail/text
  // which vary across ESPN sources (details vs keyEvents vs commentary).
  // For subs: include team+player to allow multiple subs at same minute.
  if (type === "Goal" || type === "Card") {
    return `${matchKey}|${type}|${player}|${elapsed}`;
  }
  const team = ev?.team?.name || "";
  const assist = ev?.assist?.name || "";
  return `${matchKey}|${type}|${team}|${player}|${assist}|${elapsed}`;
}

function ensureScorersAggregateShape(aggregate) {
  aggregate = aggregate || {};
  if (!aggregate.goals) aggregate.goals = {};
  if (!aggregate.cards) aggregate.cards = {};
  if (!aggregate.processedEventKeys) aggregate.processedEventKeys = {};
  if (!aggregate.processedCounts) aggregate.processedCounts = {};

  // Old versions used processedMatches or processedCounts only. Those can
  // hide corrupted / double-counted totals because the aggregate looked
  // "already processed" even when the scorer totals were wrong. Keep the old
  // fields for compatibility, but the new source of truth is per-event keys.
  if (Array.isArray(aggregate.processedMatches)) delete aggregate.processedMatches;
  return aggregate;
}

function foldEventsIntoScorersAggregate(aggregate, matchKey, events) {
  aggregate = ensureScorersAggregateShape(aggregate);
  if (!aggregate.processedEventKeys[matchKey]) aggregate.processedEventKeys[matchKey] = {};
  if (!aggregate.goalDetails) aggregate.goalDetails = {};
  const seenForMatch = aggregate.processedEventKeys[matchKey];
  const matchPair = matchKey.replace("wc2026:events:", ""); // "Home|Away"

  let addedGoals = 0;
  let addedCards = 0;

  (events || []).forEach(ev => {
    const key = scorerEventKey(matchKey, ev);
    if (seenForMatch[key]) return;
    seenForMatch[key] = true;

    if (ev.type === "Goal" && ev.detail !== "Own Goal") {
      const name = ev.player?.name;
      const team = ev.team?.name;
      if (!name) return;
      if (!aggregate.goals[name]) aggregate.goals[name] = { name, team, goals: 0, assists: 0 };
      aggregate.goals[name].team = aggregate.goals[name].team || team;
      aggregate.goals[name].goals++;
      addedGoals++;

      // Store per-goal detail for player drill-down
      if (!aggregate.goalDetails[name]) aggregate.goalDetails[name] = [];
      aggregate.goalDetails[name].push({
        match: matchPair,
        minute: ev.time?.elapsed ?? null,
        extra: ev.time?.extra ?? null,
        assist: ev.assist?.name || null,
        detail: ev.detail || null,
      });

      const assist = ev.assist?.name;
      if (assist) {
        if (!aggregate.goals[assist]) aggregate.goals[assist] = { name: assist, team, goals: 0, assists: 0 };
        aggregate.goals[assist].team = aggregate.goals[assist].team || team;
        aggregate.goals[assist].assists++;
      }
    }

    if (ev.type === "Card") {
      const name = ev.player?.name;
      const team = ev.team?.name;
      if (!name) return;
      if (!aggregate.cards[name]) aggregate.cards[name] = { name, team, yellow: 0, red: 0 };
      aggregate.cards[name].team = aggregate.cards[name].team || team;
      if (ev.detail === "Yellow Card") aggregate.cards[name].yellow++;
      if (ev.detail === "Red Card") aggregate.cards[name].red++;
      addedCards++;
    }
  });

  aggregate.processedCounts[matchKey] = Math.max(
    aggregate.processedCounts[matchKey] || 0,
    Array.isArray(events) ? events.length : 0
  );

  return { aggregate, addedGoals, addedCards };
}

// Folds NEW goals/cards into the running scorers aggregate — called for
// both live and finished matches. Uses event-level keys, not just "number
// of events processed", so revised/reordered ESPN feeds cannot double-count
// goals or hide a corrupted aggregate.
async function updateScorersAggregate(home, away, events) {
  try {
    const matchKey = kvKey(home, away);
    let aggregate = ensureScorersAggregateShape(await kv.get(SCORERS_AGGREGATE_KEY));
    const result = foldEventsIntoScorersAggregate(aggregate, matchKey, events);
    aggregate = result.aggregate;
    if (result.addedGoals || result.addedCards) {
      await kv.set(SCORERS_AGGREGATE_KEY, aggregate);
    }
  } catch(e) {
    console.warn("[matchevents] scorers aggregate update:", e.message);
  }
}


// Deduplicates ESPN events — removes same goal/card at same minute from
// multiple ESPN sources (details, keyEvents, commentary). For Goals and Cards,
// omits team name from key so empty-team duplicates collapse with named ones.
// Multiple subs at the same minute are kept (legitimate).
function deduplicateEvents(events) {
  if (!events?.length) return events || [];
  const seen = new Set();
  return events.filter(ev => {
    let key;
    if (ev.type === "Goal" || ev.type === "Card") {
      // For goals/cards: type + player + elapsed is sufficient and stable across ESPN sources.
      // Omit team, detail, text — these vary between details/keyEvents/commentary.
      key = `${ev.type}|${ev.player?.name || ""}|${ev.time?.elapsed ?? ""}`;
    } else {
      // For subs: include team + both players so multiple subs at same minute are kept.
      key = `${ev.type}|${ev.team?.name || ""}|${ev.player?.name || ""}|${ev.assist?.name || ""}|${ev.time?.elapsed ?? ""}`;
    }
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function buildScorersFromPersistedEvents({ persist=false } = {}) {
  let allKeys = [];
  let cursor = 0;
  do {
    const [next, batch] = await kv.scan(cursor, { match: "wc2026:events:*", count: 200 });
    cursor = parseInt(next) || 0;
    allKeys.push(...batch);
  } while (cursor !== 0);

  // If no cached matches exist yet, seed them once so the leaderboard can
  // populate without relying on the old mutable aggregate.
  if (!allKeys.length) {
    await autoSeedEvents().catch(e => console.warn("[scorers] seed before rebuild failed:", e.message));
    cursor = 0;
    do {
      const [next, batch] = await kv.scan(cursor, { match: "wc2026:events:*", count: 200 });
      cursor = parseInt(next) || 0;
      allKeys.push(...batch);
    } while (cursor !== 0);
  }

  let aggregate = ensureScorersAggregateShape({ goals: {}, cards: {}, processedCounts: {}, processedEventKeys: {} });
  let goalEvents = 0;
  let cardEvents = 0;

  for (let i = 0; i < allKeys.length; i += 50) {
    const keys = allKeys.slice(i, i + 50);
    const records = await kv.mget(...keys).catch(() => keys.map(() => null));
    records.forEach((record, idx) => {
      if (!record?.events?.length) return;
      const cleanEvents = deduplicateEvents(record.events);
      const result = foldEventsIntoScorersAggregate(aggregate, keys[idx], cleanEvents);
      aggregate = result.aggregate;
      goalEvents += result.addedGoals;
      cardEvents += result.addedCards;
    });
  }

  aggregate.rebuiltAt = Date.now();
  if (persist) await kv.set(SCORERS_AGGREGATE_KEY, aggregate).catch(() => {});

  return {
    scorers: Object.values(aggregate.goals).sort((a,b) => b.goals-a.goals || b.assists-a.assists || String(a.name).localeCompare(String(b.name))).slice(0,30),
    cards: Object.values(aggregate.cards).sort((a,b) => (b.red*2+b.yellow)-(a.red*2+a.yellow) || String(a.name).localeCompare(String(b.name))).slice(0,20),
    goalDetails: aggregate.goalDetails || {},
    matchCount: Object.keys(aggregate.processedEventKeys || {}).length,
    rebuiltAt: aggregate.rebuiltAt,
    goalEvents,
    cardEvents,
  };
}

async function rebuildScorersAggregate() {
  const result = await buildScorersFromPersistedEvents({ persist:true });
  return {
    ok: true,
    rebuilt: true,
    matches: result.matchCount,
    goalEvents: result.goalEvents,
    cardEvents: result.cardEvents,
    scorers: result.scorers,
    cards: result.cards,
  };
}

// ── ESPN event ID lookup ───────────────────────────────────────────────────
const ESPN_ID_MAP_KEY = "wc2026:espn_ids";

// Hardcoded ESPN IDs for all group stage matches — never ages out
const HARDCODED_ESPN_IDS = {
  // Group stage
  "Mexico|South Africa":"760415","South Korea|Czechia":"760414",
  "Canada|Bosnia & Herz.":"760416","United States|Paraguay":"760417",
  "Qatar|Switzerland":"760420","Brazil|Morocco":"760419",
  "Haiti|Scotland":"760418","Australia|Turkiye":"760421",
  "Germany|Curacao":"760422","Netherlands|Japan":"760425",
  "Ivory Coast|Ecuador":"760423","Sweden|Tunisia":"760424",
  "Spain|Cape Verde":"760428","Belgium|Egypt":"760426",
  "Saudi Arabia|Uruguay":"760429","Iran|New Zealand":"760427",
  "France|Senegal":"760432","Iraq|Norway":"760430",
  "Argentina|Algeria":"760433","Austria|Jordan":"760431",
  "Portugal|DR Congo":"760434","England|Croatia":"760437",
  "Ghana|Panama":"760434","Uzbekistan|Colombia":"760436",
  // R32 (correct IDs from KV)
  "Croatia|Ghana":"760480",
  "Colombia|Portugal":"760481",
  "Congo DR|Uzbekistan":"760482",
  "Jordan|Argentina":"760483",
  "Algeria|Austria":"760484",
  "Panama|England":"760485",
  "Brazil|Japan":"760487",
  "Netherlands|Morocco":"760488",
  "Germany|Paraguay":"760489",
  "Ivory Coast|Norway":"760490",
  "Mexico|Ecuador":"760491",
  "France|Sweden":"760492",
  "Belgium|Senegal":"760493",
  "England|Congo DR":"760495",
  "Portugal|Croatia":"760496",
  "Spain|Austria":"760497",
  "Switzerland|Algeria":"760498",
  "Australia|Egypt":"760499",
  "Argentina|Cape Verde":"760500",
  "Colombia|Ghana":"760501",
};


const KNOWN_ESPN_EVENT_IDS = {
  "Germany|Paraguay": "760489",
  "Paraguay|Germany": "760489",
};

async function getESPNEventId(home, away, debugInfo = null) {
  home = normESPN(home);
  away = normESPN(away);

  const key = `${home}|${away}`;
  const reverseKey = `${away}|${home}`;
  if (KNOWN_ESPN_EVENT_IDS[key] || KNOWN_ESPN_EVENT_IDS[reverseKey]) {
    const eventId = KNOWN_ESPN_EVENT_IDS[key] || KNOWN_ESPN_EVENT_IDS[reverseKey];
    if (debugInfo) debugInfo.knownFallback = { key, reverseKey, eventId };
    await saveESPNId(home, away, eventId).catch(() => {});
    return eventId;
  }

  if (debugInfo) {
    debugInfo.requestedKey = key;
    debugInfo.reverseKey = reverseKey;
    debugInfo.lookupSteps = [];
  }

  const note = (step, value = {}) => {
    if (debugInfo) debugInfo.lookupSteps.push({ step, ...value });
  };

  // 1. Livescores KV — usually has the real ESPN IDs from the live feed.
  // Match BOTH orientations because different sources can flip home/away.
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
        const matchedHome = normESPN(match?.teams?.home?.name || "");
        const matchedAway = normESPN(match?.teams?.away?.name || "");
        const matchedKey = `${matchedHome}|${matchedAway}`;

        await saveESPNId(matchedHome, matchedAway, match.fixture.id);
        await saveESPNId(home, away, match.fixture.id);

        note("livescores_kv", { matchedKey, eventId: match.fixture.id });
        return match.fixture.id;
      }

      note("livescores_kv_no_match", { fixtureCount: fixtures.length });
    } else {
      note("livescores_kv_empty");
    }
  } catch(e) {
    console.warn("[matchevents] livescores KV lookup:", e.message);
    note("livescores_kv_error", { error: e.message });
  }

  // 2. Persisted ID map — check both requested and reverse orientations.
  try {
    const idMap = await kv.get(ESPN_ID_MAP_KEY) || {};
    if (idMap[key]) {
      note("id_map", { matchedKey: key, eventId: idMap[key] });
      return idMap[key];
    }
    if (idMap[reverseKey]) {
      note("id_map_reverse", { matchedKey: reverseKey, eventId: idMap[reverseKey] });
      await saveESPNId(home, away, idMap[reverseKey]);
      return idMap[reverseKey];
    }
    note("id_map_no_match", { totalIds: Object.keys(idMap).length });
  } catch(e) {
    console.warn("[matchevents] ESPN ID map lookup:", e.message);
    note("id_map_error", { error: e.message });
  }

  // 3. Hardcoded map — last resort. Check both orientations.
  if (HARDCODED_ESPN_IDS[key]) {
    note("hardcoded", { matchedKey: key, eventId: HARDCODED_ESPN_IDS[key] });
    return HARDCODED_ESPN_IDS[key];
  }
  if (HARDCODED_ESPN_IDS[reverseKey]) {
    note("hardcoded_reverse", { matchedKey: reverseKey, eventId: HARDCODED_ESPN_IDS[reverseKey] });
    return HARDCODED_ESPN_IDS[reverseKey];
  }

  note("no_event_id");
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
function minuteFromESPN(...sources) {
  const src = sources.find(x => x);
  const raw =
    src?.time?.displayValue ||
    src?.play?.time?.displayValue ||
    src?.play?.clock?.displayValue ||
    src?.clock?.displayValue ||
    src?.addedClock?.displayValue ||
    src?.displayValue ||
    "";

  const display = String(raw || "").trim();
  const elapsed = display
    ? parseInt(display, 10)
    : (src?.clock?.value ? Math.round(src.clock.value / 60) : null);
  const extraMatch = display.match(/\+(\d+)/);

  return {
    elapsed: Number.isFinite(elapsed) ? elapsed : null,
    extra: extraMatch ? Number(extraMatch[1]) : null,
    display: display || (Number.isFinite(elapsed) ? `${elapsed}'` : ""),
  };
}

function isVarEvent(text, typeText, typeType) {
  const all = `${text || ""} ${typeText || ""} ${typeType || ""}`.toLowerCase();
  return all.includes("var") || all.includes("video assistant") || all.includes("review");
}

function varOutcomeDetail(text) {
  const t = String(text || "").toLowerCase();
  if (t.includes("goal awarded") || t.includes("goal confirmed") || t.includes("goal stands")) return "VAR: Goal confirmed";
  if (t.includes("goal cancelled") || t.includes("goal disallowed") || t.includes("no goal")) return "VAR: Goal overturned";
  if (t.includes("penalty awarded") || t.includes("penalty confirmed")) return "VAR: Penalty awarded";
  if (t.includes("no penalty") || t.includes("penalty cancelled") || t.includes("penalty overturned")) return "VAR: Penalty overturned";
  if (t.includes("red card awarded") || t.includes("red card confirmed")) return "VAR: Red card confirmed";
  if (t.includes("red card cancelled") || t.includes("red card overturned")) return "VAR: Red card overturned";
  return "VAR Review";
}

function eventSortValue(ev) {
  const t = ev?.time || {};
  return (Number(t.elapsed) || 0) * 100 + (Number(t.extra) || 0);
}

function normalizeEventFromESPN(ev, homeTeam) {
  const teamName = normESPN(ev.team?.displayName || ev.team?.name || "");
  const time = minuteFromESPN(ev);
  const rawText = ev.text || ev.type?.text || "";
  const text = rawText.toLowerCase();
  const typeText = (ev.type?.text || "").toLowerCase();
  const typeType = (ev.type?.type || "").toLowerCase();

  const participants = ev.participants || ev.athletesInvolved || [];
  const p0 = participants[0]?.athlete?.displayName || participants[0]?.displayName || "";
  const p1 = participants[1]?.athlete?.displayName || participants[1]?.displayName || null;

  let type = null, detail = "";

  if (ev.scoringPlay || typeType === "goal" || typeText === "goal" || text.includes("goal!")) {
    type = "Goal";
    detail = text.includes("own goal") ? "Own Goal"
           : text.includes("penalty")  ? "Penalty"
           : "Normal Goal";
  } else if (typeType === "yellow-card" || typeText.includes("yellow") || text.includes("shown the yellow")) {
    type = "Card"; detail = "Yellow Card";
  } else if (typeType === "red-card" || typeText.includes("red card") || typeText.includes("ejection") || text.includes("shown the red")) {
    type = "Card"; detail = "Red Card";
  } else if (typeType === "substitution" || typeText.includes("substitut") || text.includes("substitution,")) {
    type = "subst"; detail = "Substitution";
  } else if (isVarEvent(text, typeText, typeType)) {
    type = "VAR"; detail = varOutcomeDetail(rawText);
  }

  if (!type) return null;

  return {
    time,
    team: { name: teamName || "" },
    player: { name: p0 || (type === "VAR" ? "VAR" : "") },
    assist: { name: (type === "Goal" || type === "subst") ? p1 : null },
    type,
    detail,
    text: rawText || "",
  };
}

function normalizeCommentaryEvent(item, homeTeam) {
  const ev = item.play || item;
  const teamName = normESPN(ev.team?.displayName || ev.team?.name || item.team?.displayName || item.team?.name || "");
  const time = minuteFromESPN(item.time, ev, item);
  const rawText = item.text || ev.text || ev.type?.text || "";
  const text = rawText.toLowerCase();
  const typeText = (ev.type?.text || "").toLowerCase();
  const typeType = (ev.type?.type || "").toLowerCase();
  const participants = ev.participants || ev.athletesInvolved || item.participants || [];
  const p0 = participants[0]?.athlete?.displayName || participants[0]?.displayName || "";
  const p1 = participants[1]?.athlete?.displayName || participants[1]?.displayName || null;

  let type = null, detail = "";
  if (ev.scoringPlay || typeType === "goal" || typeText === "goal" || text.includes("goal!")) {
    type = "Goal";
    detail = text.includes("own goal") ? "Own Goal" : text.includes("penalty") ? "Penalty" : "Normal Goal";
  } else if (typeType === "yellow-card" || typeText.includes("yellow") || text.includes("shown the yellow")) {
    type = "Card"; detail = "Yellow Card";
  } else if (typeType === "red-card" || typeText.includes("red card") || typeText.includes("ejection") || text.includes("shown the red")) {
    type = "Card"; detail = "Red Card";
  } else if (typeType === "substitution" || typeText.includes("substitut") || text.includes("substitution,")) {
    type = "subst"; detail = "Substitution";
  } else if (isVarEvent(text, typeText, typeType)) {
    type = "VAR"; detail = varOutcomeDetail(rawText);
  }
  if (!type) return null;

  return {
    time,
    team: { name: teamName || "" },
    player: { name: p0 || (type === "VAR" ? "VAR" : "") },
    assist: { name: (type === "Goal" || type === "subst") ? p1 : null },
    type,
    detail,
    text: rawText || "",
  };
}

function parseEvents(data, homeTeam) {
  const events = [];

  const add = ev => { if (ev) events.push(ev); };

  // ESPN summary puts the most useful scoring/card/substitution events here.
  (data.header?.competitions?.[0]?.details || []).forEach(ev => add(normalizeEventFromESPN(ev, homeTeam)));
  (data.keyEvents || []).forEach(ev => add(normalizeEventFromESPN(ev, homeTeam)));

  // Commentary has the richest minute strings and many VAR/review outcomes.
  (data.commentary || []).forEach(item => add(normalizeCommentaryEvent(item, homeTeam)));

  // Fallback: plays array when ESPN exposes it directly.
  (data.plays || []).forEach(play => add(normalizeEventFromESPN(play, homeTeam)));

  // Roster player entries can contain individual plays; useful when summary
  // omits top-level plays but embeds key player events under each roster row.
  (data.rosters || []).forEach(r => {
    (r.roster || r.entries || r.players || r.athletes || []).forEach(player => {
      (player.plays || []).forEach(play => add(normalizeEventFromESPN(play, homeTeam)));
    });
  });

  const deduped = deduplicateEvents(events);

  return deduped.sort((a, b) => eventSortValue(a) - eventSortValue(b));
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

      if (isDoneStatus(statusType)) {
        const events = parseEvents(data, home);
        const stats = parseStats(data.boxscore, home);
        if (events.length > 0) {
          await saveToKV(home, away, events, stats);
          seededThisCall++;
          console.log(`[scorers] auto-seeded ${home} vs ${away}: ${events.length} events`);
        }
      } else if (isLiveStatus(statusType)) {
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


function eventCacheHasDisplayTimes(record) {
  if (!record?.events?.length) return false;
  // Schema v2 stores ESPN's official display minute on parsed events.
  // Some old seeded events have plain elapsed values only; those should be
  // refreshed when ESPN can provide richer source data.
  return record.schemaVersion >= 2 && record.events.every(ev => ev?.time?.display);
}

async function backfillFinishedEvents({ limit = 10, force = false, targetHome = null, targetAway = null, offset = 0 } = {}) {
  const candidates = [];
  const addCandidate = (home, away, espnId = null) => {
    home = normESPN(home || "");
    away = normESPN(away || "");
    if (!home || !away || home.includes("TBD") || away.includes("TBD")) return;
    if (/^(1|2|3rd|R16|QF|SF|🏆|3rd Place)/.test(home) || /^(1|2|3rd|R16|QF|SF|🏆|3rd Place)/.test(away)) return;
    const key = `${home}|${away}`;
    if (candidates.some(c => c.key === key || c.key === `${away}|${home}`)) return;
    candidates.push({ key, home, away, espnId });
  };

  FULL_SCHEDULE.forEach(m => addCandidate(m.home, m.away, m.espnId || null));

  // Include resolved knockout matches from the live-score cache. This is
  // essential because FULL_SCHEDULE still contains placeholder slots such as
  // 1C vs 2F, while the live feed has Brazil vs Japan with the real ESPN id.
  try {
    const cached = await kv.get("wc2026:livescores");
    const fixtures = Array.isArray(cached) ? cached : (cached?.response || []);
    fixtures.forEach(f => {
      const home = f?.teams?.home?.name;
      const away = f?.teams?.away?.name;
      const espnId = f?.fixture?.id && !String(f.fixture.id).includes("|") ? String(f.fixture.id) : null;
      addCandidate(home, away, espnId);
    });
  } catch(e) {
    console.warn("[backfill] livescores candidate load failed:", e.message);
  }

  // Include all persisted ESPN id mappings too, in case the match is no longer
  // in the current livescores cache but was seen earlier by the app.
  try {
    const idMap = await kv.get(ESPN_ID_MAP_KEY) || {};
    Object.entries(idMap).forEach(([key, espnId]) => {
      const [home, away] = key.split("|");
      addCandidate(home, away, String(espnId));
    });
  } catch(e) {
    console.warn("[backfill] id map candidate load failed:", e.message);
  }

  const normalizedTargetHome = targetHome ? normESPN(String(targetHome)) : null;
  const normalizedTargetAway = targetAway ? normESPN(String(targetAway)) : null;
  const hasTarget = !!(normalizedTargetHome && normalizedTargetAway);

  // Targeted backfill lets you refresh one match, e.g.
  // /api/matchevents?action=backfill-events&home=Brazil&away=Japan&force=1
  // without force-rewriting the first N matches over and over.
  if (hasTarget) addCandidate(normalizedTargetHome, normalizedTargetAway);

  const scanCandidates = hasTarget
    ? candidates.filter(c =>
        (c.home === normalizedTargetHome && c.away === normalizedTargetAway) ||
        (c.home === normalizedTargetAway && c.away === normalizedTargetHome)
      )
    : candidates.slice(Math.max(0, Number(offset) || 0));

  const processed = [];
  const skipped = [];
  const errors = [];
  let updated = 0;
  let scanned = 0;

  for (const candidate of scanCandidates) {
    if (updated >= limit) break;
    scanned++;
    const { home, away } = candidate;
    try {
      const existing = await loadFromKV(home, away);
      if (!force && eventCacheHasDisplayTimes(existing)) {
        skipped.push({ home, away, reason: "already_schema_v2" });
        continue;
      }

      const eventId = candidate.espnId || await getESPNEventId(home, away);
      if (!eventId) {
        skipped.push({ home, away, reason: "no_espn_id" });
        continue;
      }

      const r = await fetch(`${ESPN_BASE}/summary?event=${eventId}`, { headers: ESPN_HEADERS });
      if (!r.ok) {
        skipped.push({ home, away, eventId, reason: `espn_${r.status}` });
        continue;
      }

      const data = await r.json();
      const statusType = data.header?.competitions?.[0]?.status?.type?.name || "NS";
      if (!isDoneStatus(statusType)) {
        skipped.push({ home, away, eventId, statusType, reason: "not_finished" });
        continue;
      }

      const events = parseEvents(data, home);
      const stats = parseStats(data.boxscore, home);
      const lineups = parseLineups(data, home);
      if (!events.length) {
        skipped.push({ home, away, eventId, statusType, reason: "no_events" });
        continue;
      }

      await saveESPNId(home, away, eventId).catch(() => {});
      await saveToKV(home, away, events, stats, lineups);
      processed.push({ home, away, eventId, statusType, events: events.length, hasDisplayTimes: eventCacheHasDisplayTimes({ schemaVersion: 2, events }) });
      updated++;
    } catch(e) {
      errors.push({ home, away, error: e.message });
    }
  }

  // Rebuild after any rewrite so Top Scorers/Cards uses the refreshed canonical events.
  const scorerRefresh = updated ? await buildScorersFromPersistedEvents({ persist:true }).catch(e => ({ error: e.message })) : null;

  return {
    ok: true,
    action: "backfill-events",
    force,
    limit,
    offset: Math.max(0, Number(offset) || 0),
    nextOffset: hasTarget ? null : Math.min(candidates.length, Math.max(0, Number(offset) || 0) + scanned),
    target: hasTarget ? { home: normalizedTargetHome, away: normalizedTargetAway } : null,
    candidates: candidates.length,
    scanned,
    updated,
    processed,
    skipped: skipped.slice(0, 80),
    errors,
    scorerRefresh: scorerRefresh ? {
      matchCount: scorerRefresh.matchCount,
      goalEvents: scorerRefresh.goalEvents,
      cardEvents: scorerRefresh.cardEvents,
      error: scorerRefresh.error,
    } : null,
  };
}



async function getScorers() {
  const result = await buildScorersFromPersistedEvents({ persist: false });
  return {
    scorers:     result.scorers,
    cards:       result.cards,
    goalDetails: result.goalDetails || {},
    matchCount:  result.matchCount,
    rebuiltAt:   result.rebuiltAt,
  };
}

// ── Seed ESPN IDs for today + next 7 days + merge hardcoded ─────────────────
async function seedESPNIds() {
  const pad = n => String(n).padStart(2, "0");
  const dateStr = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  const now = new Date();

  // Scan the full tournament date range (June 11 - July 19 2026)
  // to discover all ESPN event IDs including R32, R16, QF, SF, Final
  const tournamentStart = new Date("2026-06-11");
  const tournamentEnd   = new Date("2026-07-19");
  const allDates = [];
  for (let d = new Date(tournamentStart); d <= tournamentEnd; d.setDate(d.getDate() + 1)) {
    allDates.push(dateStr(new Date(d)));
  }
  // Also add yesterday + next 7 days for any edge cases
  for (let i = -1; i <= 7; i++) {
    allDates.push(dateStr(new Date(now.getTime() + i * 86400000)));
  }
  const dates = [...new Set(allDates)];

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
        idMap[key] = event.id;
        console.log(`[seed-ids] ${key} -> ${event.id}`);
      }
    } catch(e) {
      console.warn(`[seed-ids] failed for ${date}:`, e.message);
    }
  }

  const added = Object.keys(idMap).length - before;
  await kv.set(ESPN_ID_MAP_KEY, idMap).catch(() => {});
  return { added, total: Object.keys(idMap).length, datesScanned: dates.length };
}


export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Rebuild scorers/cards aggregate from persisted match event caches.
  // Use this if the leaderboard looks inflated or stale after parser changes.
  if (req.query.action === "debug-events") {
    // Show raw events from KV for a specific match to diagnose duplicates
    // Usage: ?action=debug-events&home=Switzerland&away=Bosnia+%26+Herz.
    const dh = normESPN(String(req.query.home || ""));
    const da = normESPN(String(req.query.away || ""));
    if (!dh || !da) return res.status(400).json({ error: "home and away required" });
    const raw = await kv.get(kvKey(dh, da)).catch(() => null);
    if (!raw) return res.status(200).json({ found: false, key: kvKey(dh, da) });
    const goals = (raw.events || []).filter(e => e.type === "Goal");
    return res.status(200).json({
      found: true,
      totalEvents: raw.events?.length,
      goalCount: goals.length,
      goals: goals.map(e => ({
        player: e.player?.name,
        team: e.team?.name,
        elapsed: e.time?.elapsed,
        extra: e.time?.extra,
        display: e.time?.display,
        detail: e.detail,
        text: (e.text || "").slice(0, 60),
      }))
    });
  }

  if (req.query.action === "flush-events") {
    // Flush all known match event caches (group stage + R32)
    const ALL_PAIRS = Object.keys(HARDCODED_ESPN_IDS);
    const deleted = [];
    for (const pair of ALL_PAIRS) {
      const [h, a] = pair.split("|");
      await kv.del(kvKey(h, a)).catch(()=>{});
      delete memCache[pair];
      deleted.push(pair);
    }
    await kv.del(SCORERS_AGGREGATE_KEY).catch(()=>{});
    return res.status(200).json({ ok:true, flushed: deleted.length, deleted, note:"Scorers aggregate also cleared. Run backfill then rebuild-scorers." });
  }

  if (req.query.action === "rebuild-scorers") {
    try {
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(await rebuildScorersAggregate());
    } catch(e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  // Backfill finished match timelines from ESPN, preserving official
  // stoppage-time display values such as 90'+5' and VAR/review outcomes.
  // Run repeatedly with a modest limit until updated=0.
  if (req.query.action === "dump-ids") {
    const idMap = await kv.get(ESPN_ID_MAP_KEY).catch(() => ({})) || {};
    return res.status(200).json({ count: Object.keys(idMap).length, ids: idMap });
  }

  if (req.query.action === "seed-ids") {
    try {
      const result = await seedESPNIds();
      return res.status(200).json({ ok: true, ...result });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.query.action === "backfill-r32") {
    // Force-refetch R32+ matches using hardcoded IDs + KV id map
    const kvIdMap = await kv.get(ESPN_ID_MAP_KEY).catch(() => ({})) || {};
    // Merge KV ids with hardcoded, preferring KV (more accurate)
    const allIds = { ...HARDCODED_ESPN_IDS, ...kvIdMap };
    // Filter to R32+ matches (IDs >= 760480)
    const R32_ENTRIES = Object.entries(allIds).filter(([,id]) => Number(id) >= 760480);
    const processed = [], errors = [], skipped = [];
    for (const [pair, eventId] of R32_ENTRIES) {
      const [home, away] = pair.split("|");
      try {
        const r = await fetch(`${ESPN_BASE}/summary?event=${eventId}`, { headers: ESPN_HEADERS });
        if (!r.ok) { errors.push({ home, away, eventId, reason: `espn_${r.status}` }); continue; }
        const data = await r.json();
        const statusType = data.header?.competitions?.[0]?.status?.type?.name || "NS";
        if (!isDoneStatus(statusType)) { skipped.push({ home, away, eventId, reason: "not_finished_yet" }); continue; }
        const events = parseEvents(data, home);
        const stats  = parseStats(data.boxscore, home);
        const lineups = parseLineups(data, home);
        if (!events.length) { errors.push({ home, away, eventId, reason: "no_events" }); continue; }
        await saveToKV(home, away, events, stats, lineups);
        processed.push({ home, away, eventId, events: events.length });
      } catch(e) { errors.push({ home, away, eventId, error: e.message }); }
    }
    const scorers = await buildScorersFromPersistedEvents({ persist: true }).catch(e => ({ error: e.message }));
    return res.status(200).json({ ok: true, processed, skipped, errors, scorers: { count: scorers.scorers?.length, top3: scorers.scorers?.slice(0,3) } });
  }

  if (req.query.action === "backfill-events" || req.query.action === "backfill") {
    try {
      res.setHeader("Cache-Control", "no-store");
      const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || "10", 10) || 10));
      const force = req.query.force === "1" || req.query.force === "true";
      const offset = Math.max(0, parseInt(req.query.offset || "0", 10) || 0);
      let targetHome = req.query.home ? String(req.query.home) : null;
      let targetAway = req.query.away ? String(req.query.away) : null;
      if ((!targetHome || !targetAway) && req.query.fixtureId && String(req.query.fixtureId).includes("|")) {
        [targetHome, targetAway] = String(req.query.fixtureId).split("|");
      }
      return res.status(200).json(await backfillFinishedEvents({ limit, force, offset, targetHome, targetAway }));
    } catch(e) {
      return res.status(500).json({ ok: false, action: "backfill-events", error: e.message });
    }
  }

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
      return res.status(200).json({ events: memCached.events, stats: memCached.stats });
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
    const debugInfo = {};
    const eventId = await getESPNEventId(home, away, debugInfo);

    if (!eventId) {
      console.warn(`[matchevents] No ESPN event ID for ${home} vs ${away}`);
      return res.status(200).json({
        events: [],
        stats: null,
        _debug: "no_event_id",
        ...(debug === "1" ? { lookup: debugInfo } : {})
      });
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
        lookup: debugInfo,
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
    const isDone = isDoneStatus(statusType);
    const isLive = isLiveStatus(statusType);
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
