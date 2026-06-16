// /api/league.js
// Fantasy Leagues for WC 2026
//
// ACTIONS:
//   create   POST { pin, name }              → creates league, returns code
//   join     POST { pin, code }              → joins a league by code
//   leave    POST { pin, code }              → leaves a league
//   get      GET  ?code=...                  → league info + leaderboard
//   mine     GET  ?pin=...                   → all leagues a PIN belongs to
//   default  POST { pin }                    → auto-join the default "WC 2026" league

import { Redis } from "@upstash/redis";
const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// Generate a random 6-char uppercase league code
function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// Get user info from PIN
async function getUserFromPin(pin) {
  if (!pin) return null;
  const profile = await kv.get(`pin:${pin}`).catch(() => null);
  if (!profile?.uid) return null;
  const user = await kv.get(`user:${profile.uid}`).catch(() => null);
  return { uid: profile.uid, name: user?.name || `User ${pin}`, pin };
}

// Get leaderboard for a list of UIDs
async function getLeaderboardForUsers(uids) {
  if (!uids.length) return [];
  const users = await Promise.all(uids.map(uid => kv.get(`user:${uid}`).catch(() => null)));

  return Promise.all(uids.map(async (uid, i) => {
    const user = users[i];
    if (!user) return null;
    const userName = user.name || user.displayName || uid.slice(0,8);

    // Get all score keys for this user
    let cursor = 0;
    const scoreKeys = [];
    do {
      const [next, batch] = await kv.scan(cursor, { match: `score:${uid}:*`, count: 100 });
      cursor = parseInt(next) || 0;
      scoreKeys.push(...batch);
    } while (cursor !== 0);

    let pts = 0, exact = 0, correct = 0;
    if (scoreKeys.length) {
      const scores = await kv.mget(...scoreKeys);
      for (const s of scores) {
        if (s === null || s === undefined) continue;
        // Score can be stored as number or as object { pts, hg, ag, predHg, predAg }
        const val = typeof s === "object" ? (s.pts ?? 0) : (typeof s === "number" ? s : parseInt(s));
        if (isNaN(val)) continue;
        pts += val;
        if (val === 3) exact++;
        if (val >= 1) correct++;
      }
    }

    return { uid, name: userName, pts, exact, correct };
  })).then(rows => rows.filter(Boolean).sort((a, b) => b.pts - a.pts || b.exact - a.exact));
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action || req.body?.action;

  // ── CREATE league ────────────────────────────────────────────────────────
  if (action === "create") {
    const { pin, name } = req.body || {};
    if (!pin || !name?.trim()) return res.status(400).json({ error: "pin and name required" });

    const user = await getUserFromPin(pin);
    if (!user) return res.status(404).json({ error: "PIN not found. Create an account first." });

    // Generate unique code
    let code, exists = true;
    let attempts = 0;
    while (exists && attempts < 10) {
      code = genCode();
      exists = !!(await kv.get(`league:${code}`).catch(() => null));
      attempts++;
    }

    const league = {
      code,
      name: name.trim(),
      ownerPin: String(pin),
      ownerUid: user.uid,
      members: [{ uid: user.uid, pin: String(pin), name: user.name, joinedAt: Date.now() }],
      createdAt: Date.now(),
    };

    await kv.set(`league:${code}`, league);

    // Track user's leagues
    const myLeagues = await kv.get(`pin-leagues:${pin}`).catch(() => []) || [];
    if (!myLeagues.includes(code)) myLeagues.push(code);
    await kv.set(`pin-leagues:${pin}`, myLeagues);

    return res.status(200).json({ ok: true, code, league });
  }

  // ── JOIN league ──────────────────────────────────────────────────────────
  if (action === "join") {
    const { pin, code } = req.body || {};
    if (!pin || !code) return res.status(400).json({ error: "pin and code required" });

    const user = await getUserFromPin(pin);
    if (!user) return res.status(404).json({ error: "PIN not found. Create an account first." });

    const league = await kv.get(`league:${code.toUpperCase()}`).catch(() => null);
    if (!league) return res.status(404).json({ error: "League not found. Check the code." });

    // Already a member? Still ensure pin-leagues is set
    if (league.members.some(m => m.uid === user.uid)) {
      const myLeagues = await kv.get(`pin-leagues:${pin}`).catch(() => []) || [];
      if (!myLeagues.includes(code.toUpperCase())) {
        myLeagues.push(code.toUpperCase());
        await kv.set(`pin-leagues:${pin}`, myLeagues);
      }
      return res.status(200).json({ ok: true, code, league, alreadyMember: true });
    }

    league.members.push({ uid: user.uid, pin: String(pin), name: user.name, joinedAt: Date.now() });
    await kv.set(`league:${code.toUpperCase()}`, league);

    const myLeagues = await kv.get(`pin-leagues:${pin}`).catch(() => []) || [];
    if (!myLeagues.includes(code.toUpperCase())) myLeagues.push(code.toUpperCase());
    await kv.set(`pin-leagues:${pin}`, myLeagues);

    return res.status(200).json({ ok: true, code: code.toUpperCase(), league });
  }

  // ── LEAVE league ─────────────────────────────────────────────────────────
  if (action === "leave") {
    const { pin, code } = req.body || {};
    if (!pin || !code) return res.status(400).json({ error: "pin and code required" });

    const user = await getUserFromPin(pin);
    if (!user) return res.status(404).json({ error: "PIN not found" });

    const league = await kv.get(`league:${code}`).catch(() => null);
    if (!league) return res.status(404).json({ error: "League not found" });

    // Owner can't leave (must delete)
    if (league.ownerPin === String(pin)) {
      return res.status(400).json({ error: "League owner can't leave. Delete the league instead." });
    }

    league.members = league.members.filter(m => m.uid !== user.uid);
    await kv.set(`league:${code}`, league);

    const myLeagues = (await kv.get(`pin-leagues:${pin}`).catch(() => []) || []).filter(c => c !== code);
    await kv.set(`pin-leagues:${pin}`, myLeagues);

    return res.status(200).json({ ok: true });
  }

  // ── GET league + leaderboard ─────────────────────────────────────────────
  if (req.method === "GET" && req.query.code) {
    const code = req.query.code.toUpperCase();
    const league = await kv.get(`league:${code}`).catch(() => null);
    if (!league) return res.status(404).json({ error: "League not found" });

    const uids = league.members.map(m => m.uid);
    const leaderboard = await getLeaderboardForUsers(uids);

    return res.status(200).json({ ok: true, league, leaderboard });
  }

  // ── GET user's leagues ───────────────────────────────────────────────────
  if (req.method === "GET" && req.query.pin) {
    const { pin } = req.query;
    const codes = await kv.get(`pin-leagues:${pin}`).catch(() => []) || [];
    const leagues = (await Promise.all(
      codes.map(c => kv.get(`league:${c}`).catch(() => null))
    )).filter(Boolean);
    return res.status(200).json({ ok: true, leagues });
  }

  // ── AUTO-JOIN default league ─────────────────────────────────────────────
  if (action === "default") {
    const { pin } = req.body || {};
    if (!pin) return res.status(400).json({ error: "pin required" });

    const DEFAULT_CODE = "WC2026";
    let league = await kv.get(`league:${DEFAULT_CODE}`).catch(() => null);

    const user = await getUserFromPin(pin);
    if (!user) return res.status(404).json({ error: "PIN not found" });

    if (!league) {
      league = {
        code: DEFAULT_CODE,
        name: "⚽ WC 2026 — Everyone",
        ownerPin: "000000",
        ownerUid: "system",
        members: [],
        createdAt: Date.now(),
        isDefault: true,
      };
    }

    if (!league.members.some(m => m.uid === user.uid)) {
      league.members.push({ uid: user.uid, pin: String(pin), name: user.name, joinedAt: Date.now() });
      await kv.set(`league:${DEFAULT_CODE}`, league);
    }

    const myLeagues = await kv.get(`pin-leagues:${pin}`).catch(() => []) || [];
    if (!myLeagues.includes(DEFAULT_CODE)) myLeagues.push(DEFAULT_CODE);
    await kv.set(`pin-leagues:${pin}`, myLeagues);

    return res.status(200).json({ ok: true, code: DEFAULT_CODE });
  }

  // ── ADMIN: migrate all fantasy users to a specific league ────────────────
  if (action === "migrate-all") {
    const secret = process.env.PREDICTOR_ADMIN_SECRET || process.env.CRON_SECRET;
    if (!req.body?.adminSecret || req.body.adminSecret !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { code, leagueName } = req.body;
    if (!code) return res.status(400).json({ error: "code required" });

    // Get or create the league
    let league = await kv.get(`league:${code}`).catch(() => null);
    if (!league) {
      league = {
        code,
        name: leagueName || code,
        ownerPin: "000000",
        ownerUid: "system",
        members: [],
        createdAt: Date.now(),
      };
    }

    // Scan all user: keys
    let cursor = 0;
    const userKeys = [];
    do {
      const [next, batch] = await kv.scan(cursor, { match: "user:*", count: 100 });
      cursor = parseInt(next) || 0;
      userKeys.push(...batch);
    } while (cursor !== 0);

    let added = 0;
    for (const key of userKeys) {
      const user = await kv.get(key).catch(() => null);
      if (!user?.userId) continue;
      const uid = user.userId;
      if (league.members.some(m => m.uid === uid)) continue;

      // Find PIN for this user
      const pin = user.pin || null;
      league.members.push({ uid, pin: pin ? String(pin) : null, name: user.name || "Unknown", joinedAt: Date.now() });

      // Update pin-leagues
      if (pin) {
        const myLeagues = await kv.get(`pin-leagues:${pin}`).catch(() => []) || [];
        if (!myLeagues.includes(code)) {
          myLeagues.push(code);
          await kv.set(`pin-leagues:${pin}`, myLeagues);
        }
      }
      added++;
    }

    await kv.set(`league:${code}`, league);
    return res.status(200).json({ ok: true, code, added, total: league.members.length });
  }

  // ── ADMIN: add user to league by PIN ─────────────────────────────────────
  if (action === "admin-add") {
    const secret = process.env.PREDICTOR_ADMIN_SECRET || process.env.CRON_SECRET;
    if (!req.body?.adminSecret || req.body.adminSecret !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { targetPin, code } = req.body;
    if (!targetPin || !code) return res.status(400).json({ error: "targetPin and code required" });

    const user = await getUserFromPin(targetPin);
    if (!user) return res.status(404).json({ error: "PIN not found" });

    const league = await kv.get(`league:${code}`).catch(() => null);
    if (!league) return res.status(404).json({ error: "League not found" });

    if (!league.members.some(m => m.uid === user.uid)) {
      league.members.push({ uid: user.uid, pin: String(targetPin), name: user.name, joinedAt: Date.now() });
      await kv.set(`league:${code}`, league);
    }

    const myLeagues = await kv.get(`pin-leagues:${targetPin}`).catch(() => []) || [];
    if (!myLeagues.includes(code)) { myLeagues.push(code); await kv.set(`pin-leagues:${targetPin}`, myLeagues); }

    return res.status(200).json({ ok: true });
  }

  // ── ADMIN: remove user from league by PIN ────────────────────────────────
  if (action === "admin-remove") {
    const secret = process.env.PREDICTOR_ADMIN_SECRET || process.env.CRON_SECRET;
    if (!req.body?.adminSecret || req.body.adminSecret !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { targetPin, code } = req.body;
    if (!targetPin || !code) return res.status(400).json({ error: "targetPin and code required" });

    const user = await getUserFromPin(targetPin);
    const league = await kv.get(`league:${code}`).catch(() => null);
    if (!league) return res.status(404).json({ error: "League not found" });

    if (user) league.members = league.members.filter(m => m.uid !== user.uid);
    await kv.set(`league:${code}`, league);

    const myLeagues = (await kv.get(`pin-leagues:${targetPin}`).catch(() => []) || []).filter(c => c !== code);
    await kv.set(`pin-leagues:${targetPin}`, myLeagues);

    return res.status(200).json({ ok: true });
  }

  // ── ADMIN: list all leagues ───────────────────────────────────────────────
  if (action === "list-all") {
    const secret = process.env.PREDICTOR_ADMIN_SECRET || process.env.CRON_SECRET;
    if (!req.body?.adminSecret || req.body.adminSecret !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    let cursor = 0;
    const keys = [];
    do {
      const [next, batch] = await kv.scan(cursor, { match: "league:*", count: 100 });
      cursor = parseInt(next) || 0;
      keys.push(...batch);
    } while (cursor !== 0);

    const leagues = (await Promise.all(keys.map(k => kv.get(k).catch(() => null)))).filter(Boolean);
    return res.status(200).json({ ok: true, leagues });
  }

  return res.status(400).json({ error: "Unknown action" });
}

// ── ADMIN: migrate all fantasy users to a league ─────────────────────────
// POST ?action=migrate-all { adminSecret, code, leagueName }
