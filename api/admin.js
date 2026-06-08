// /api/admin.js
// Returns analytics data for the admin panel. Protected by PREDICTOR_ADMIN_SECRET.

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Auth check
  const auth = req.headers.authorization || "";
  const secret = process.env.PREDICTOR_ADMIN_SECRET || process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // ── Visitors ────────────────────────────────────────────────────────────
    const allUids = await kv.smembers("visitors:all") || [];

    // Fetch all visitor records
    const visitors = allUids.length
      ? (await kv.mget(...allUids.map(uid => `visitor:${uid}`))).filter(Boolean)
      : [];

    // Daily stats — last 14 days
    const dailyStats = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const count = (await kv.scard(`daily:${d}`)) || 0;
      dailyStats.push({ date: d, count });
    }

    // ── Users (predictor) ───────────────────────────────────────────────────
    const userKeys = [];
    let cursor = 0;
    do {
      const [nc, keys] = await kv.scan(cursor, { match: "user:*", count: 100 });
      cursor = parseInt(nc) || 0;
      userKeys.push(...keys);
    } while (cursor !== 0);

    const users = userKeys.length
      ? (await kv.mget(...userKeys)).filter(Boolean)
      : [];

    // ── PIN accounts ────────────────────────────────────────────────────────
    const pinKeys = [];
    let c2 = 0;
    do {
      const [nc, keys] = await kv.scan(c2, { match: "pin:*", count: 100 });
      c2 = parseInt(nc) || 0;
      pinKeys.push(...keys.filter(k => !k.startsWith("pin:change")));
    } while (c2 !== 0);

    // ── Tab usage ────────────────────────────────────────────────────────────
    const tabNames = ["live","schedule","groups","scorers","stats","h2h","news","predict","predictor","sim","bracket"];
    const tabCounts = {};
    if (tabNames.length) {
      const vals = await kv.mget(...tabNames.map(t => `tab_count:${t}`));
      tabNames.forEach((t, i) => { tabCounts[t] = parseInt(vals[i] || 0); });
    }

    // ── Predictions ──────────────────────────────────────────────────────────
    const predKeys = [];
    let c3 = 0;
    do {
      const [nc, keys] = await kv.scan(c3, { match: "preds:*", count: 100 });
      c3 = parseInt(nc) || 0;
      predKeys.push(...keys);
    } while (c3 !== 0);

    return res.status(200).json({
      visitors: {
        total: allUids.length,
        records: visitors,
        daily: dailyStats,
      },
      users: {
        total: users.length,
        records: users,
      },
      pins: {
        total: pinKeys.length,
      },
      tabs: tabCounts,
      predictions: {
        total: predKeys.length,
      },
      generatedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[admin] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
