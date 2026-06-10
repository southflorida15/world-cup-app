import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function esc(v = "") {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fit(text = "", max = 28) {
  const s = String(text || "");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function svg(snapshot = {}) {
  const title = fit(snapshot.title || "World Cup 2026 Bracket", 42);
  const champion = fit(snapshot.champion || "TBD", 24);
  const runnerUp = fit(snapshot.runnerUp || "TBD", 24);
  const semis = (snapshot.semifinalists || []).slice(0, 4).map(t => fit(t, 18));
  const semiText = semis.length ? semis.join(" · ") : "TBD";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b3b20"/><stop offset="0.45" stop-color="#030a05"/><stop offset="1" stop-color="#010302"/></linearGradient>
    <radialGradient id="gold" cx="78%" cy="18%" r="55%"><stop offset="0" stop-color="#facc15" stop-opacity="0.25"/><stop offset="1" stop-color="#facc15" stop-opacity="0"/></radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="#000" flood-opacity="0.5"/></filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#gold)"/>
  <rect x="54" y="48" width="1092" height="534" rx="34" fill="#06140c" fill-opacity="0.88" stroke="#4ade80" stroke-opacity="0.38" stroke-width="2" filter="url(#shadow)"/>
  <text x="92" y="102" fill="#facc15" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="900" letter-spacing="5">WORLD CUP 2026 PREDICTOR</text>
  <text x="92" y="166" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="900">${esc(title)}</text>
  <rect x="92" y="214" width="1016" height="178" rx="28" fill="#4ade80" fill-opacity="0.12" stroke="#4ade80" stroke-opacity="0.42"/>
  <text x="128" y="327" font-size="88">🏆</text>
  <text x="236" y="274" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="900" letter-spacing="3">CHAMPION</text>
  <text x="236" y="346" fill="#4ade80" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="900">${esc(champion)}</text>
  <rect x="92" y="424" width="482" height="98" rx="22" fill="#030a05" fill-opacity="0.78" stroke="#3d6a4d"/>
  <text x="124" y="464" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="900" letter-spacing="3">RUNNER-UP</text>
  <text x="124" y="504" fill="#d4ead9" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="800">${esc(runnerUp)}</text>
  <rect x="626" y="424" width="482" height="98" rx="22" fill="#030a05" fill-opacity="0.78" stroke="#3d6a4d"/>
  <text x="658" y="464" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="900" letter-spacing="3">SEMIFINALISTS</text>
  <text x="658" y="504" fill="#facc15" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800">${esc(semiText)}</text>
  <text x="92" y="560" fill="#3d6a4d" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="800">Built with World Cup 2026 Predictor</text>
  <text x="1108" y="560" text-anchor="end" fill="#4ade80" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="900">Create yours →</text>
</svg>`;
}

export default async function handler(req, res) {
  try {
    const id = String(req.query.id || "").trim();
    if (!id) return res.status(400).send("Missing bracket id");
    const snapshot = await kv.get(`bracket-share:${id}`);
    if (!snapshot) return res.status(404).send("Bracket card not found");
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).send(svg(snapshot));
  } catch (err) {
    console.error("[bracket-card] error:", err);
    return res.status(500).send("Unable to render card");
  }
}
