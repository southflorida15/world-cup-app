// /api/predictor.js
// World Cup 2026 Match Predictor — Vercel KV backend
//
// SETUP:
//   1. vercel kv create wc2026
//   2. vercel env pull .env.local   (adds KV_URL, KV_REST_API_URL, KV_REST_API_TOKEN etc.)
//   3. npm install @vercel/kv
//
// ACTIONS (all via GET or POST ?action=...):
//   register   POST  { userId, name }          → saves display name
//   getUser    GET   ?userId=...               → { userId, name }
//   savePred   POST  { userId, matchId, hg, ag } → saves one prediction
//   getPreds   GET   ?userId=...               → { [matchId]: {hg,ag} }
//   score      POST  { matchId, hg, ag }       → scores all predictions for a finished match (call from admin/cron)
//   leaderboard GET                            → [ { userId, name, pts, exact, correct } ... ]
//   allPreds   GET   ?matchId=...              → everyone's predictions for a match (revealed after FT)

import { Redis } from "@upstash/redis";
const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// ── Score calculation (same logic as frontend) ────────────────────────────
function calcScore(pred, actual) {
  const ph = parseInt(pred.hg), pa = parseInt(pred.ag);
  const ah = parseInt(actual.hg), aa = parseInt(actual.ag);
  if (isNaN(ph) || isNaN(pa)) return null;
  if (ph === ah && pa === aa) return 3;
  const pr = ph > pa ? "H" : ph < pa ? "A" : "D";
  const ar = ah > aa ? "H" : ah < aa ? "A" : "D";
  return pr === ar ? 1 : 0;
}

// ── CORS helper ───────────────────────────────────────────────────────────
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action;
  if (!action) return res.status(400).json({ error: "Missing action" });

  try {
    // ── register ──────────────────────────────────────────────────────────
    // POST { userId, name }
    // Saves a display name for a user. userId is a client-generated UUID.
    if (action === "register") {
      const { userId, name, avatar, city, country } = req.body || {};
      if (!userId || !name) return res.status(400).json({ error: "Missing userId or name" });
      const clean = name.trim().slice(0, 20);
      if (!clean) return res.status(400).json({ error: "Name too short" });
      const existing = await kv.get(`user:${userId}`);
      if (!existing) {
        const names = await kv.smembers("names") || [];
        if (names.map(n => n.toLowerCase()).includes(clean.toLowerCase())) {
          return res.status(409).json({ error: "Name already taken" });
        }
        await kv.sadd("names", clean);
      }
      // Store full avatar separately (supports base64 photos)
      if (avatar) {
        await kv.set(`avatar:${userId}`, avatar, { ex: 60 * 60 * 24 * 365 });
      }
      const userData = {
        userId, name: clean,
        hasAvatar: !!avatar,
        city: city || existing?.city || "",
        country: country || existing?.country || "",
        registeredAt: existing?.registeredAt || Date.now()
      };
      await kv.set(`user:${userId}`, userData);
      return res.status(200).json({ userId, name: clean });
    }

    // ── getUser ───────────────────────────────────────────────────────────
    // GET ?action=getUser&userId=...
    if (action === "getUser") {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: "Missing userId" });
      const user = await kv.get(`user:${userId}`);
      return res.status(200).json(user || null);
    }

    // ── savePred ──────────────────────────────────────────────────────────
    // POST { userId, matchId, hg, ag }
    // Saves or updates a prediction. Only allowed before match kicks off
    // (enforcement is client-side for simplicity — the match UTC times are public).
    if (action === "savePred") {
      const { userId, matchId, hg, ag } = req.body || {};
      if (!userId || !matchId || hg === undefined || ag === undefined) {
        return res.status(400).json({ error: "Missing fields" });
      }
      // Verify user exists
      const user = await kv.get(`user:${userId}`);
      if (!user) return res.status(403).json({ error: "User not registered" });

      await kv.set(`pred:${userId}:${matchId}`, {
        userId, matchId,
        hg: parseInt(hg), ag: parseInt(ag),
        savedAt: Date.now()
      });
      // Add matchId to user's set of predicted matches
      await kv.sadd(`predSet:${userId}`, String(matchId));
      return res.status(200).json({ ok: true });
    }

    // ── getPreds ──────────────────────────────────────────────────────────
    // GET ?action=getPreds&userId=...
    // Returns all predictions for a user: { [matchId]: { hg, ag } }
    if (action === "getPreds") {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: "Missing userId" });
      const matchIds = await kv.smembers(`predSet:${userId}`) || [];
      if (!matchIds.length) return res.status(200).json({});
      const keys = matchIds.map(id => `pred:${userId}:${id}`);
      const values = await kv.mget(...keys);
      const result = {};
      matchIds.forEach((id, i) => {
        if (values[i]) result[id] = values[i];
      });
      return res.status(200).json(result);
    }

    // ── score ─────────────────────────────────────────────────────────────
    // POST { matchId, hg, ag }
    // Called when a match finishes (via webhook, cron, or manual trigger).
    // Scores all predictions for that match and updates leaderboard.
    // Protected by a simple shared secret in env.
    if (action === "score") {
      const secret = req.headers["x-admin-secret"];
      if (secret !== process.env.PREDICTOR_ADMIN_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { matchId, hg, ag } = req.body || {};
      if (!matchId || hg === undefined || ag === undefined) {
        return res.status(400).json({ error: "Missing fields" });
      }
      // Save the result
      await kv.set(`result:${matchId}`, { hg: parseInt(hg), ag: parseInt(ag), scoredAt: Date.now() });
      // Find all users who predicted this match
      const allUsers = await kv.smembers("names") || [];
      // Get all userIds
      const userIds = [];
      // Scan for all user keys (small dataset — fine to iterate)
      let cursor = 0;
      do {
        const [nextCursor, keys] = await kv.scan(cursor, { match: "user:*", count: 100 });
        cursor = parseInt(nextCursor) || 0;
        for (const key of keys) {
          const uid = key.replace("user:", "");
          userIds.push(uid);
        }
      } while (cursor !== 0);

      // Score each user
      let scored = 0;
      for (const uid of userIds) {
        const pred = await kv.get(`pred:${uid}:${matchId}`);
        if (!pred) continue;
        const pts = calcScore(pred, { hg: parseInt(hg), ag: parseInt(ag) });
        if (pts === null) continue;
        // Store per-match score
        await kv.set(`score:${uid}:${matchId}`, { pts, hg: parseInt(hg), ag: parseInt(ag), predHg: pred.hg, predAg: pred.ag });
        scored++;
      }
      return res.status(200).json({ ok: true, matchId, scored });
    }

    // ── leaderboard ───────────────────────────────────────────────────────
    // GET ?action=leaderboard
    // Returns sorted leaderboard by total points.
    if (action === "leaderboard") {
      // Get all user IDs by scanning
      const userIds = [];
      let cursor = 0;
      do {
        const [nextCursor, keys] = await kv.scan(cursor, { match: "user:*", count: 100 });
        cursor = parseInt(nextCursor) || 0;
        keys.forEach(k => userIds.push(k.replace("user:", "")));
      } while (cursor !== 0);

      if (!userIds.length) return res.status(200).json([]);

      // For each user, sum their scores
      const results = await Promise.all(userIds.map(async uid => {
        const user = await kv.get(`user:${uid}`);
        if (!user) return null;
        // Get all their score keys
        const scoreKeys = [];
        let c2 = 0;
        do {
          const [nc, ks] = await kv.scan(c2, { match: `score:${uid}:*`, count: 100 });
          c2 = parseInt(nc);
          scoreKeys.push(...ks);
        } while (c2 !== 0);

        let pts = 0, exact = 0, correct = 0;
        if (scoreKeys.length) {
          const scores = await kv.mget(...scoreKeys);
          scores.forEach(s => {
            if (!s) return;
            pts += s.pts || 0;
            if (s.pts === 3) exact++;
            if (s.pts >= 1) correct++;
          });
        }
        const predCount = (await kv.smembers(`predSet:${uid}`) || []).length;
        return { userId: uid, name: user.name, hasAvatar: user.hasAvatar || false, city: user.city || "", country: user.country || "", pts, exact, correct, predCount };
      }));

      const sorted = results
        .filter(Boolean)
        .sort((a, b) => b.pts - a.pts || b.exact - a.exact || b.correct - a.correct);

      // Batch fetch avatars for users that have one
      const avatarUserIds = sorted.filter(e => e.hasAvatar).map(e => e.userId);
      const avatarMap = {};
      if (avatarUserIds.length) {
        const avatarKeys = avatarUserIds.map(uid => `avatar:${uid}`);
        const avatarValues = await kv.mget(...avatarKeys);
        avatarUserIds.forEach((uid, i) => {
          if (avatarValues[i]) avatarMap[uid] = avatarValues[i];
        });
      }

      const board = sorted.map(e => ({ ...e, avatar: avatarMap[e.userId] || null }));

      return res.status(200).json(board);
    }

    // ── allPreds ──────────────────────────────────────────────────────────
    // GET ?action=allPreds&matchId=...
    // Returns everyone's prediction for a specific match (only after result saved).
    if (action === "allPreds") {
      const { matchId } = req.query;
      if (!matchId) return res.status(400).json({ error: "Missing matchId" });
      // Only reveal after match has a result
      const result = await kv.get(`result:${matchId}`);
      if (!result) return res.status(403).json({ error: "Match not finished yet" });

      // Scan for all predictions for this match
      const preds = [];
      let cursor = 0;
      do {
        const [nc, keys] = await kv.scan(cursor, { match: `pred:*:${matchId}`, count: 100 });
        cursor = parseInt(nc);
        if (keys.length) {
          const vals = await kv.mget(...keys);
          for (let i = 0; i < keys.length; i++) {
            if (!vals[i]) continue;
            const uid = keys[i].split(":")[1];
            const user = await kv.get(`user:${uid}`);
            const score = await kv.get(`score:${uid}:${matchId}`);
            preds.push({
              name: user?.name || "Unknown",
              hg: vals[i].hg,
              ag: vals[i].ag,
              pts: score?.pts ?? null,
            });
          }
        }
      } while (cursor !== 0);

      return res.status(200).json({ result, preds: preds.sort((a,b) => (b.pts||0)-(a.pts||0)) });
    }

    return res.status(404).json({ error: `Unknown action: ${action}` });

  } catch (err) {
    console.error(`[predictor] ${action} error:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}
