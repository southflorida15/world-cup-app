// Vercel serverless proxy for FIFA World Cup 26™ Annex C third-place table.
// Why this exists: browsers may block direct Wikipedia/Wikimedia runtime fetches.
// The app calls /api/annexc, and Vercel fetches the public table server-side.

const SOURCES = [
  "https://en.wikipedia.org/wiki/Template:2026_FIFA_World_Cup_third-place_table",
  "https://en.wikipedia.org/api/rest_v1/page/html/Template:2026_FIFA_World_Cup_third-place_table",
];

export default async function handler(req, res) {
  for (const url of SOURCES) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "world-cup-app/1.0 (Annex C bracket loader)",
          "Accept": "text/html,text/plain,*/*",
        },
      });

      if (!response.ok) continue;

      const text = await response.text();
      if (!text || text.length < 1000) continue;

      res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(text);
    } catch (error) {
      // Try next source.
    }
  }

  return res.status(502).json({
    error: "Unable to load Annex C source from public mirrors.",
  });
}
