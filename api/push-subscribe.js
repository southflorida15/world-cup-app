// /api/push-subscribe.js
// Saves a Web Push subscription + match list to Vercel KV
// POST { subscription, matches: [{id, home, away, date, time, venue, tv}] }

import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { subscription, matches } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: "No subscription" });

    // Use endpoint URL as the key (hashed to keep it short)
    const key = "push:" + Buffer.from(subscription.endpoint).toString("base64").slice(-40);

    await kv.set(key, { subscription, matches, updatedAt: Date.now() }, { ex: 60 * 60 * 24 * 90 }); // 90 days TTL

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("push-subscribe error:", err);
    return res.status(500).json({ error: "Failed to save subscription" });
  }
}
