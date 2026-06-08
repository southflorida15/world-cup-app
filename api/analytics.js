// /api/analytics.js
// Tracks app visits and feature usage. Called from the client.

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { uid, event, device, city, country, tab } = req.body || {};
    if (!uid) return res.status(400).json({ error: "uid required" });

    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    if (event === "visit") {
      // Upsert visitor record
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

      // Daily unique visitor count
      await kv.sadd(`daily:${today}`, uid);

      // Total unique visitors set
      await kv.sadd("visitors:all", uid);

      return res.status(200).json({ ok: true, isNew });
    }

    if (event === "tab") {
      // Track which tabs are used
      if (!tab) return res.status(400).json({ error: "tab required" });
      const existing = await kv.get(`visitor:${uid}`) || {};
      const tabs = existing.tabs || {};
      tabs[tab] = (tabs[tab] || 0) + 1;
      await kv.set(`visitor:${uid}`, { ...existing, tabs, lastSeen: now }, { ex: 60 * 60 * 24 * 365 });
      // Global tab counter
      await kv.incr(`tab_count:${tab}`);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "unknown event" });
  } catch (err) {
    console.error("[analytics] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
