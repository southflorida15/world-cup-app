// /api/news.js
// Fetches FIFA World Cup 2026 news from GNews API
// Cached in KV for 30 minutes to stay within free tier (100 req/day)

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const GNEWS_KEY = process.env.GNEWS_API_KEY;
const CACHE_KEY = "news:wc2026";
const CACHE_TTL = 30 * 60; // 30 minutes

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Try cache first
    const cached = await kv.get(CACHE_KEY);
    if (cached) {
      res.setHeader("Cache-Control", "no-cache");
      return res.status(200).json({ articles: cached, cached: true });
    }

    // Fetch fresh from GNews
    if (!GNEWS_KEY) {
      return res.status(500).json({ error: "GNEWS_API_KEY not configured" });
    }

    const url = `https://gnews.io/api/v4/search?q=%22World+Cup+2026%22+OR+%22FIFA+2026%22&lang=en&country=us&max=20&apikey=${GNEWS_KEY}`;
    const r = await fetch(url);

    if (!r.ok) {
      const err = await r.text().catch(() => "");
      throw new Error(`GNews API ${r.status}: ${err.slice(0, 100)}`);
    }

    const data = await r.json();
    const articles = (data.articles || []).map(a => ({
      title:       a.title,
      description: a.description,
      url:         a.url,
      image:       a.image || null,
      source:      a.source?.name || "",
      publishedAt: a.publishedAt,
    }));

    // Cache for 30 minutes
    await kv.set(CACHE_KEY, articles, { ex: CACHE_TTL });

    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).json({ articles, cached: false });

  } catch (err) {
    console.error("[news] error:", err.message);
    return res.status(500).json({ error: err.message, articles: [] });
  }
}
