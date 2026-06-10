import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const APP_URL = process.env.APP_URL || "https://world-cup-app-iota.vercel.app";
const TTL_SECONDS = 60 * 60 * 24 * 180;

function esc(v = "") {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shortId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function originFromReq(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return host ? `${proto}://${host}` : APP_URL;
}

function normalizeSnapshot(raw = {}) {
  const rounds = raw.rounds || {};
  return {
    owner: String(raw.owner || "My").slice(0, 40),
    title: String(raw.title || "My World Cup 2026 Bracket").slice(0, 80),
    champion: String(raw.champion || "").slice(0, 40),
    runnerUp: String(raw.runnerUp || "").slice(0, 40),
    finalists: Array.isArray(raw.finalists) ? raw.finalists.slice(0, 2).map(String) : [],
    semifinalists: Array.isArray(raw.semifinalists) ? raw.semifinalists.slice(0, 4).map(String) : [],
    thirdGroupsKey: String(raw.thirdGroupsKey || "").slice(0, 12),
    createdAt: Number(raw.createdAt || Date.now()),
    rounds: {
      r32: Array.isArray(rounds.r32) ? rounds.r32.slice(0, 16) : [],
      r16: Array.isArray(rounds.r16) ? rounds.r16.slice(0, 8) : [],
      qf: Array.isArray(rounds.qf) ? rounds.qf.slice(0, 4) : [],
      sf: Array.isArray(rounds.sf) ? rounds.sf.slice(0, 2) : [],
      final: Array.isArray(rounds.final) ? rounds.final.slice(0, 1) : [],
    }
  };
}

function renderHtml(snapshot, pageUrl, imageUrl) {
  const title = snapshot.title || "World Cup 2026 Bracket";
  const desc = snapshot.champion
    ? `Champion: ${snapshot.champion}${snapshot.runnerUp ? ` · Runner-up: ${snapshot.runnerUp}` : ""}`
    : "World Cup 2026 bracket picks";
  const semis = snapshot.semifinalists || [];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${esc(imageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${esc(imageUrl)}" />
  <style>
    :root{color-scheme:dark;background:#030a05;color:#d4ead9;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box} body{margin:0;min-height:100vh;display:grid;place-items:center;padding:20px;background:radial-gradient(circle at 20% 0%,#174f2e 0,#030a05 34%,#020604 100%)}
    .card{width:min(100%,760px);border:1px solid rgba(74,222,128,.35);border-radius:28px;padding:28px;background:linear-gradient(135deg,rgba(8,27,16,.96),rgba(3,10,5,.98));box-shadow:0 30px 80px rgba(0,0,0,.55);overflow:hidden;position:relative}
    .card:before{content:"";position:absolute;inset:-80px -60px auto auto;width:250px;height:250px;background:radial-gradient(circle,rgba(250,204,21,.18),transparent 65%);pointer-events:none}
    .eyebrow{font-size:12px;letter-spacing:.18em;color:#facc15;font-weight:900;text-transform:uppercase}.title{font-size:clamp(28px,6vw,54px);line-height:.95;font-weight:1000;margin:12px 0;color:#fff}.subtitle{color:#94a3b8;font-size:15px;margin-bottom:22px}.hero{display:flex;gap:16px;align-items:center;border:1px solid rgba(74,222,128,.3);background:rgba(74,222,128,.1);border-radius:22px;padding:18px;margin:18px 0}.trophy{font-size:54px}.champion{font-size:clamp(30px,7vw,62px);font-weight:1000;color:#4ade80;line-height:1}.label{font-size:11px;letter-spacing:.14em;color:#94a3b8;font-weight:900;text-transform:uppercase;margin-bottom:4px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.box{border:1px solid rgba(61,106,77,.8);background:rgba(6,20,12,.78);border-radius:18px;padding:14px}.team{font-size:17px;font-weight:800;color:#d4ead9}.semi{display:flex;gap:8px;flex-wrap:wrap}.pill{border:1px solid rgba(250,204,21,.35);background:rgba(250,204,21,.1);color:#facc15;border-radius:999px;padding:7px 10px;font-weight:800;font-size:13px}.footer{margin-top:22px;display:flex;justify-content:space-between;gap:12px;align-items:center;color:#3d6a4d;font-size:12px;font-weight:800}.cta{color:#4ade80;text-decoration:none}@media(max-width:560px){.grid{grid-template-columns:1fr}.hero{align-items:flex-start}.trophy{font-size:42px}}
  </style>
</head>
<body>
  <main class="card">
    <div class="eyebrow">World Cup 2026 Predictor</div>
    <div class="title">${esc(title)}</div>
    <div class="subtitle">${esc(desc)}</div>
    <section class="hero"><div class="trophy">🏆</div><div><div class="label">Champion</div><div class="champion">${esc(snapshot.champion || "TBD")}</div></div></section>
    <div class="grid">
      <div class="box"><div class="label">Runner-up</div><div class="team">${esc(snapshot.runnerUp || "TBD")}</div></div>
      <div class="box"><div class="label">Semifinalists</div><div class="semi">${semis.length ? semis.map(t=>`<span class="pill">${esc(t)}</span>`).join("") : `<span class="team">TBD</span>`}</div></div>
    </div>
    <div class="footer"><span>Built with World Cup 2026 Predictor</span><a class="cta" href="${esc(APP_URL)}">Create your bracket →</a></div>
  </main>
</body>
</html>`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    try {
      const snapshot = normalizeSnapshot(req.body || {});
      if (!snapshot.champion) return res.status(400).json({ error: "completed bracket with champion required" });
      const id = shortId();
      await kv.set(`bracket-share:${id}`, snapshot, { ex: TTL_SECONDS });
      const origin = originFromReq(req);
      return res.status(200).json({ ok: true, id, url: `${origin}/api/bracket-share?id=${id}` });
    } catch (err) {
      console.error("[bracket-share] POST error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === "GET") {
    try {
      const id = String(req.query.id || "").trim();
      if (!id) return res.status(400).send("Missing bracket id");
      const snapshot = await kv.get(`bracket-share:${id}`);
      if (!snapshot) return res.status(404).send("Bracket card not found or expired.");
      const origin = originFromReq(req);
      const pageUrl = `${origin}/api/bracket-share?id=${encodeURIComponent(id)}`;
      const imageUrl = `${origin}/api/bracket-card?id=${encodeURIComponent(id)}`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).send(renderHtml(snapshot, pageUrl, imageUrl));
    } catch (err) {
      console.error("[bracket-share] GET error:", err);
      return res.status(500).send("Unable to render bracket card.");
    }
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  return res.status(405).json({ error: "Method not allowed" });
}
