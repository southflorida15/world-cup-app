// /api/push-subscribe.js
// Saves a Web Push subscription + match list to KV

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { subscription, matches, minsBefore } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: "No subscription" });

    const key = "push:" + Buffer.from(subscription.endpoint).toString("base64").slice(-40);
    await kv.set(key, { subscription, matches, minsBefore: minsBefore || 60, updatedAt: Date.now() }, { ex: 60 * 60 * 24 * 90 });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("push-subscribe error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
