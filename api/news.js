// /api/news.js
// Fetches FIFA World Cup 2026 news from GNews API
// Supports lang/country params for international editions
// Cached in KV per locale. Daily quota guard prevents exceeding GNews free tier (100 req/day).

import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const GNEWS_KEY     = process.env.GNEWS_API_KEY;
const CACHE_TTL     = 2 * 60 * 60;  // 2 hours — news is slow-moving
const QUOTA_MAX     = 80;            // stay safely under 100/day limit
const QUOTA_KV_KEY  = "news:quota:daily";

const ALLOWED_LANGS     = ["en","pt","es","de","fr","it","nl","ar","ja","ko","zh"];
const ALLOWED_COUNTRIES = ["us","gb","br","es","de","fr","it","ar","mx","jp","kr","nl","pt","au","ca","za","ma","ng","eg","sa","cn","be","hr","uy","co","ec","pa","gh","se","no","at","cz","ch","tn","ir","nz","uz","cv","ht","jo","iq","cd"];

async function getQuota() {
  try {
    const q = await kv.get(QUOTA_KV_KEY);
    return q ? Number(q) : 0;
  } catch { return 0; }
}

async function incrementQuota() {
  try {
    const now = new Date();
    // TTL until midnight UTC
    const midnight = new Date(now);
    midnight.setUTCHours(24, 0, 0, 0);
    const ttlSecs = Math.floor((midnight - now) / 1000);
    const count = await kv.incr(QUOTA_KV_KEY);
    if (count === 1) await kv.expire(QUOTA_KV_KEY, ttlSecs); // set expiry on first increment
    return count;
  } catch { return 0; }
}

const POPULAR_LOCALES = [
  { lang:"en", country:"us" },
  { lang:"pt", country:"br" },
  { lang:"es", country:"ar" },
  { lang:"es", country:"mx" },
  { lang:"es", country:"es" },
];

async function preWarmIfNeeded() {
  // Only pre-warm once per day, tracked by a separate KV key
  try {
    const warmed = await kv.get("news:prewarm:date");
    const today = new Date().toISOString().slice(0, 10);
    if (warmed === today) return; // already warmed today
    await kv.set("news:prewarm:date", today, { ex: 24 * 60 * 60 });

    const used = await getQuota();
    if (used >= QUOTA_MAX) return;

    // Fire-and-forget — don't await, don't block the response
    Promise.all(POPULAR_LOCALES.map(async ({ lang, country }) => {
      const cacheKey = `news:wc2026:${lang}:${country}`;
      const cached = await kv.get(cacheKey);
      if (cached) return; // already cached

      const quota = await getQuota();
      if (quota >= QUOTA_MAX) return;

      const query = lang === "en"
        ? `"World Cup 2026" OR "FIFA 2026"`
        : `"Copa do Mundo 2026" OR "Copa Mundial 2026" OR "Weltmeisterschaft 2026" OR "Coupe du Monde 2026" OR "FIFA 2026" OR "World Cup 2026"`;

      const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${lang}&country=${country}&max=10&apikey=${GNEWS_KEY}`;
      const r = await fetch(url).catch(() => null);
      if (!r?.ok) return;
      await incrementQuota();
      const data = await r.json().catch(() => null);
      const articles = (data?.articles || []).map(a => ({
        title: a.title, description: a.description, url: a.url,
        image: a.image || null, source: a.source?.name || "", publishedAt: a.publishedAt,
      }));
      if (articles.length) await kv.set(cacheKey, articles, { ex: CACHE_TTL });
      console.log(`[news] pre-warmed ${lang}/${country}: ${articles.length} articles`);
    })).catch(() => {});
  } catch {}
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Passively pre-warm popular locales once per day (fire-and-forget)
  preWarmIfNeeded();

  try {
    const lang    = ALLOWED_LANGS.includes(req.query.lang)        ? req.query.lang    : "en";
    const country = ALLOWED_COUNTRIES.includes(req.query.country) ? req.query.country : "us";

    const cacheKey = `news:wc2026:${lang}:${country}`;

    // Always try cache first
    const cached = await kv.get(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "no-cache");
      return res.status(200).json({ articles: cached, cached: true, lang, country });
    }

    if (!GNEWS_KEY) {
      return res.status(500).json({ error: "GNEWS_API_KEY not configured" });
    }

    // Check daily quota before hitting GNews
    const used = await getQuota();
    if (used >= QUOTA_MAX) {
      console.warn(`[news] Daily quota reached (${used}/${QUOTA_MAX}) — serving empty for ${lang}/${country}`);
      // Return stale cache if available (ignoring TTL) or empty
      return res.status(200).json({
        articles: [],
        cached: false,
        lang, country,
        _quota: "exhausted",
        _message: "Daily news quota reached. Fresh articles available again tomorrow."
      });
    }

    // Build query
    const query = lang === "en"
      ? `"World Cup 2026" OR "FIFA 2026"`
      : `"Copa do Mundo 2026" OR "Copa Mundial 2026" OR "Weltmeisterschaft 2026" OR "Coupe du Monde 2026" OR "FIFA 2026" OR "World Cup 2026"`;

    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${lang}&country=${country}&max=10&apikey=${GNEWS_KEY}`;
    const r = await fetch(url);

    await incrementQuota();

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

    // Cache for 2 hours
    if (articles.length) {
      await kv.set(cacheKey, articles, { ex: CACHE_TTL });
    }

    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).json({ articles, cached: false, lang, country });

  } catch (err) {
    console.error("[news] error:", err.message);
    return res.status(500).json({ error: err.message, articles: [] });
  }
}
