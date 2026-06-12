// /api/admin.js
// Admin analytics dashboard + client-side tracking + admin cleanup tools.
//
// Public POST tracking:
//   POST { uid, event:"visit"|"tab", ... }
//
// Protected admin:
//   GET  ?action=dashboard
//   POST { adminAction:"reset-analytics" }
//   POST { adminAction:"delete-account", uid:"..." }

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function isAuthorized(req) {
  const auth = req.headers.authorization || "";
  const secret = process.env.PREDICTOR_ADMIN_SECRET || process.env.CRON_SECRET;
  return !!secret && auth === `Bearer ${secret}`;
}

async function scanKeys(pattern) {
  const out = [];
  let cursor = 0;
  do {
    const [next, keys] = await kv.scan(cursor, { match: pattern, count: 200 });
    cursor = parseInt(next) || 0;
    out.push(...keys);
  } while (cursor !== 0);
  return out;
}

async function delMany(keys) {
  const unique = [...new Set((keys || []).filter(Boolean))];
  for (let i = 0; i < unique.length; i += 50) {
    await Promise.all(unique.slice(i, i + 50).map(k => kv.del(k).catch(() => null)));
  }
  return unique.length;
}

async function deletePredictionState(uid) {
  const keys = [];
  keys.push(`user:${uid}`, `avatar:${uid}`, `predSet:${uid}`);
  const matchIds = await kv.smembers(`predSet:${uid}`).catch(() => []) || [];
  for (const id of matchIds) {
    keys.push(`pred:${uid}:${id}`, `score:${uid}:${id}`);
  }
  return delMany(keys);
}

async function deleteSyncAccount(uid) {
  const keys = [`uid:${uid}`];
  const profile = await kv.get(`uid:${uid}`).catch(() => null);
  if (profile?.pin) keys.push(`pin:${profile.pin}`);
  if (profile?.email) {
    // Magic-link tokens are short-lived; this is best-effort only.
  }
  return delMany(keys);
}

async function deleteAccount(uid) {
  if (!uid) throw new Error("uid required");
  const predictionUser = await kv.get(`user:${uid}`).catch(() => null);
  if (predictionUser?.name) await kv.srem("names", predictionUser.name).catch(() => null);
  const deleted = await deletePredictionState(uid) + await deleteSyncAccount(uid);
  return { uid, deleted };
}

async function resetAnalytics() {
  const keys = [
    "visitors:all",
    ...(await scanKeys("visitor:*")),
    ...(await scanKeys("daily:*")),
    ...(await scanKeys("tab_count:*")),
  ];
  const deleted = await delMany(keys);
  await kv.set("analytics:resetAt", new Date().toISOString());
  return { deleted, resetAt: new Date().toISOString() };
}

async function buildDashboard() {
  const allUids = await kv.smembers("visitors:all") || [];
  const visitors = allUids.length
    ? (await kv.mget(...allUids.map(uid => `visitor:${uid}`))).filter(Boolean)
    : [];

  const dailyStats = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const count = (await kv.scard(`daily:${d}`)) || 0;
    dailyStats.push({ date: d, count });
  }

  const userKeys = await scanKeys("user:*");
  const users = userKeys.length ? (await kv.mget(...userKeys)).filter(Boolean) : [];

  const uidKeys = await scanKeys("uid:*");
  const syncProfiles = uidKeys.length ? (await kv.mget(...uidKeys)).filter(Boolean) : [];

  const pinKeysRaw = await scanKeys("pin:*");
  const pinKeys = pinKeysRaw.filter(k => !String(k).startsWith("pin:change"));

  const userByUid = Object.fromEntries(users.map(u => [u.userId, u]));
  const accountsMap = new Map();
  for (const p of syncProfiles) {
    if (!p?.uid) continue;
    accountsMap.set(p.uid, {
      uid: p.uid,
      pin: p.pin || "",
      email: p.email || "",
      displayName: p.displayName || userByUid[p.uid]?.name || "",
      avatar: p.avatar || null,
      savedMatches: Array.isArray(p.saved) ? p.saved.length : 0,
      favTeams: Array.isArray(p.favTeams) ? p.favTeams : [],
      hasBracket: !!(p.myBracket && Object.keys(p.myBracket).length),
      updatedAt: p.updatedAt || 0,
      predictorName: userByUid[p.uid]?.name || "",
      predictorRegisteredAt: userByUid[p.uid]?.registeredAt || 0,
    });
  }
  for (const u of users) {
    if (!u?.userId || accountsMap.has(u.userId)) continue;
    accountsMap.set(u.userId, {
      uid: u.userId,
      pin: "",
      email: "",
      displayName: u.name || "",
      savedMatches: 0,
      favTeams: [],
      hasBracket: false,
      updatedAt: u.registeredAt || 0,
      predictorName: u.name || "",
      predictorRegisteredAt: u.registeredAt || 0,
    });
  }
  const accounts = [...accountsMap.values()].sort((a,b) => (b.updatedAt || b.predictorRegisteredAt || 0) - (a.updatedAt || a.predictorRegisteredAt || 0));

  const tabNames = ["live","schedule","groups","stats","ask","fantasy","news","predict","predictor","sim","bracket","saved"];
  const vals = await kv.mget(...tabNames.map(t => `tab_count:${t}`));
  const tabCounts = {};
  tabNames.forEach((t, i) => { tabCounts[t] = parseInt(vals[i] || 0); });

  const predKeys = await scanKeys("pred:*:*");
  const analyticsResetAt = await kv.get("analytics:resetAt").catch(() => null);

  return {
    visitors: { total: allUids.length, records: visitors, daily: dailyStats },
    users: { total: users.length, records: users },
    accounts: { total: accounts.length, records: accounts },
    pins: { total: pinKeys.length },
    tabs: tabCounts,
    predictions: { total: predKeys.length },
    analyticsResetAt,
    generatedAt: new Date().toISOString(),
  };
}

// ── Score-matches (fantasy auto-scoring) ─────────────────────────────────
async function handleScoreMatches(req, res) {
  const { matches } = req.body || {};
  if (!Array.isArray(matches) || !matches.length) {
    return res.status(400).json({ error: "matches array required" });
  }
  const secret = process.env.PREDICTOR_ADMIN_SECRET || process.env.CRON_SECRET;
  const host = req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const base = proto + "://" + host;
  let scored = 0, skipped = 0;
  for (const { id: matchId, hg, ag } of matches) {
    if (!matchId || hg === undefined || ag === undefined) { skipped++; continue; }
    try {
      const r = await fetch(base + "/api/predictor?action=score", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ matchId, hg: parseInt(hg), ag: parseInt(ag) }),
      });
      if (r.status === 403) { skipped++; continue; }
      if (r.ok) scored++; else skipped++;
    } catch(e) { skipped++; }
  }
  return res.status(200).json({ ok: true, scored, skipped });
}

export default async function handler(req, res) {
  if (req.method === "POST" && req.query.action === "score-matches") {
    return handleScoreMatches(req, res);
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Protected admin actions. These are deliberately handled before public tracking.
  if (req.method === "POST" && req.body?.adminAction) {
    if (!isAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
    try {
      if (req.body.adminAction === "reset-analytics") {
        const result = await resetAnalytics();
        return res.status(200).json({ ok: true, ...result });
      }
      if (req.body.adminAction === "delete-account") {
        const result = await deleteAccount(req.body.uid);
        return res.status(200).json({ ok: true, ...result });
      }
      return res.status(400).json({ error: "unknown adminAction" });
    } catch (err) {
      console.error("[admin action] error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // Public analytics tracking from client.
  if (req.method === "POST") {
    try {
      const { uid, event, device, city, country, tab, adminDevice } = req.body || {};
      if (adminDevice) return res.status(200).json({ ok: true, skipped: "admin-device" });
      if (!uid) return res.status(400).json({ error: "uid required" });

      const now = Date.now();
      const today = new Date().toISOString().slice(0, 10);

      if (event === "visit") {
        const existing = await kv.get(`visitor:${uid}`) || {};
        const isNew = !existing.firstSeen;
        const record = {
          uid,
          device: device || existing.device || "unknown",
          city: city || existing.city || "",
          country: country || existing.country || "",
          firstSeen: existing.firstSeen || now,
          lastSeen: now,
          visits: (existing.visits || 0) + 1,
          tabs: existing.tabs || {},
        };
        await kv.set(`visitor:${uid}`, record, { ex: 60 * 60 * 24 * 365 });
        await kv.sadd(`daily:${today}`, uid);
        await kv.sadd("visitors:all", uid);
        return res.status(200).json({ ok: true, isNew });
      }

      if (event === "tab") {
        if (!tab) return res.status(400).json({ error: "tab required" });
        const existing = await kv.get(`visitor:${uid}`) || {};
        const tabs = existing.tabs || {};
        tabs[tab] = (tabs[tab] || 0) + 1;
        await kv.set(`visitor:${uid}`, { ...existing, tabs, lastSeen: now }, { ex: 60 * 60 * 24 * 365 });
        await kv.incr(`tab_count:${tab}`);
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: "unknown event" });
    } catch (err) {
      console.error("[analytics] error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // Admin dashboard.
  if (req.method === "GET") {
    if (!isAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });
    try {
      return res.status(200).json(await buildDashboard());
    } catch (err) {
      console.error("[admin] error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).end();
}
