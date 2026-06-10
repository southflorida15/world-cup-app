import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const APP_URL = process.env.APP_URL || "https://world-cup-app-iota.vercel.app";
const TTL_SECONDS = 60 * 60 * 24 * 180;

const FLAG = {
  Spain:"🇪🇸", France:"🇫🇷", England:"🏴", Brazil:"🇧🇷", Argentina:"🇦🇷", Germany:"🇩🇪", Portugal:"🇵🇹", Netherlands:"🇳🇱",
  Belgium:"🇧🇪", Uruguay:"🇺🇾", Colombia:"🇨🇴", Mexico:"🇲🇽", Morocco:"🇲🇦", "United States":"🇺🇸", USA:"🇺🇸", Croatia:"🇭🇷",
  Japan:"🇯🇵", Senegal:"🇸🇳", Switzerland:"🇨🇭", Sweden:"🇸🇪", "South Korea":"🇰🇷", Ecuador:"🇪🇨", Norway:"🇳🇴", Australia:"🇦🇺",
  Austria:"🇦🇹", Czechia:"🇨🇿", "Bosnia & Herz.":"🇧🇦", "Bosnia and Herzegovina":"🇧🇦", "Ivory Coast":"🇨🇮", Paraguay:"🇵🇾", Ghana:"🇬🇭",
  Algeria:"🇩🇿", Iran:"🇮🇷", "DR Congo":"🇨🇩", Uzbekistan:"🇺🇿", "New Zealand":"🇳🇿", Jordan:"🇯🇴", Iraq:"🇮🇶", Panama:"🇵🇦",
  Curacao:"🇨🇼", Curaçao:"🇨🇼", Haiti:"🇭🇹", "South Africa":"🇿🇦", "Cape Verde":"🇨🇻", Qatar:"🇶🇦", Tunisia:"🇹🇳", Turkiye:"🇹🇷",
  Turkey:"🇹🇷", Egypt:"🇪🇬", Scotland:"🏴", "Saudi Arabia":"🇸🇦", Canada:"🇨🇦", Poland:"🇵🇱", Denmark:"🇩🇰", Serbia:"🇷🇸",
  Nigeria:"🇳🇬", Cameroon:"🇨🇲", Mali:"🇲🇱", Jamaica:"🇯🇲", Honduras:"🇭🇳", Bolivia:"🇧🇴", Chile:"🇨🇱", Peru:"🇵🇪",
  Romania:"🇷🇴", Yugoslavia:"🇷🇸", Belgium:"🇧🇪", France:"🇫🇷"
};

function esc(v = "") {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function teamFlag(team = "") {
  return FLAG[team] || "🏳️";
}

function teamLabel(team = "", max = 22) {
  const s = String(team || "TBD");
  const clipped = s.length > max ? s.slice(0, max - 1) + "…" : s;
  return `${teamFlag(s)} ${clipped}`;
}

function fit(text = "", max = 28) {
  const s = String(text || "");
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function shortId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function originFromReq(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return host ? `${proto}://${host}` : APP_URL;
}

function normalizeMatch(m = {}) {
  return {
    match: Number(m.match || m.id || 0),
    home: String(m.home || "TBD"),
    away: String(m.away || "TBD"),
    winner: String(m.winner || ""),
  };
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
      r32: Array.isArray(rounds.r32) ? rounds.r32.slice(0, 16).map(normalizeMatch) : [],
      r16: Array.isArray(rounds.r16) ? rounds.r16.slice(0, 8).map(normalizeMatch) : [],
      qf: Array.isArray(rounds.qf) ? rounds.qf.slice(0, 4).map(normalizeMatch) : [],
      sf: Array.isArray(rounds.sf) ? rounds.sf.slice(0, 2).map(normalizeMatch) : [],
      final: Array.isArray(rounds.final) ? rounds.final.slice(0, 1).map(normalizeMatch) : [],
    }
  };
}

function roundMatches(snapshot, key) {
  return (snapshot.rounds?.[key] || []).filter(Boolean);
}

function renderSvgMatch(m, x, y, w = 164, h = 38) {
  const winner = m.winner || "";
  const homeWin = winner && winner === m.home;
  const awayWin = winner && winner === m.away;
  const top = `${teamFlag(m.home)} ${fit(m.home || "TBD", 15)}`;
  const bot = `${teamFlag(m.away)} ${fit(m.away || "TBD", 15)}`;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#06140c" stroke="#3d6a4d" stroke-width="1"/>
    <text x="${x+8}" y="${y+12}" fill="#94a3b8" font-family="Arial,sans-serif" font-size="8" font-weight="900">M${m.match || ""}</text>
    <text x="${x+8}" y="${y+25}" fill="${homeWin ? "#4ade80" : "#d4ead9"}" font-family="Arial,sans-serif" font-size="11" font-weight="${homeWin ? 900 : 700}">${esc(top)}${homeWin ? " ✓" : ""}</text>
    <text x="${x+8}" y="${y+36}" fill="${awayWin ? "#4ade80" : "#d4ead9"}" font-family="Arial,sans-serif" font-size="11" font-weight="${awayWin ? 900 : 700}">${esc(bot)}${awayWin ? " ✓" : ""}</text>
  </g>`;
}

function renderCardSvg(snapshot = {}) {
  const title = fit(snapshot.title || "World Cup 2026 Bracket", 38);
  const champion = fit(snapshot.champion || "In progress", 24);
  const r32 = roundMatches(snapshot, "r32");
  const r16 = roundMatches(snapshot, "r16");
  const qf = roundMatches(snapshot, "qf");
  const sf = roundMatches(snapshot, "sf");
  const final = roundMatches(snapshot, "final");
  const leftR32 = r32.slice(0, 8), rightR32 = r32.slice(8, 16);
  const leftR16 = r16.slice(0, 4), rightR16 = r16.slice(4, 8);
  const leftQf = qf.slice(0, 2), rightQf = qf.slice(2, 4);
  const leftSf = sf.slice(0, 1), rightSf = sf.slice(1, 2);
  const spacing = (count, start, gap) => Array.from({length: count}, (_, i) => start + i * gap);
  const parts = [];
  spacing(leftR32.length, 78, 50).forEach((y,i)=>parts.push(renderSvgMatch(leftR32[i], 34, y, 154, 38)));
  spacing(leftR16.length, 103, 100).forEach((y,i)=>parts.push(renderSvgMatch(leftR16[i], 218, y, 154, 38)));
  spacing(leftQf.length, 153, 200).forEach((y,i)=>parts.push(renderSvgMatch(leftQf[i], 402, y, 154, 38)));
  spacing(leftSf.length, 253, 200).forEach((y,i)=>parts.push(renderSvgMatch(leftSf[i], 586, y, 154, 38)));
  spacing(rightSf.length, 253, 200).forEach((y,i)=>parts.push(renderSvgMatch(rightSf[i], 460, y+72, 154, 38)));
  spacing(rightQf.length, 153, 200).forEach((y,i)=>parts.push(renderSvgMatch(rightQf[i], 644, y, 154, 38)));
  spacing(rightR16.length, 103, 100).forEach((y,i)=>parts.push(renderSvgMatch(rightR16[i], 828, y, 154, 38)));
  spacing(rightR32.length, 78, 50).forEach((y,i)=>parts.push(renderSvgMatch(rightR32[i], 1012, y, 154, 38)));
  if (final[0]) parts.push(renderSvgMatch(final[0], 523, 410, 154, 38));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b3b20"/><stop offset="0.45" stop-color="#030a05"/><stop offset="1" stop-color="#010302"/></linearGradient><radialGradient id="gold" cx="50%" cy="15%" r="70%"><stop offset="0" stop-color="#facc15" stop-opacity="0.22"/><stop offset="1" stop-color="#facc15" stop-opacity="0"/></radialGradient></defs>
  <rect width="1200" height="630" fill="url(#bg)"/><rect width="1200" height="630" fill="url(#gold)"/>
  <text x="600" y="38" text-anchor="middle" fill="#facc15" font-family="Arial,sans-serif" font-size="22" font-weight="900" letter-spacing="4">WORLD CUP 2026 PREDICTOR</text>
  <text x="600" y="66" text-anchor="middle" fill="#ffffff" font-family="Arial,sans-serif" font-size="30" font-weight="900">${esc(title)}</text>
  ${parts.join("\n")}
  <rect x="390" y="488" width="420" height="82" rx="22" fill="#4ade80" fill-opacity="0.13" stroke="#4ade80" stroke-opacity="0.45"/>
  <text x="600" y="518" text-anchor="middle" fill="#94a3b8" font-family="Arial,sans-serif" font-size="14" font-weight="900" letter-spacing="3">CHAMPION</text>
  <text x="600" y="555" text-anchor="middle" fill="#4ade80" font-family="Arial,sans-serif" font-size="34" font-weight="900">🏆 ${esc(teamLabel(champion, 25))}</text>
  <text x="600" y="600" text-anchor="middle" fill="#3d6a4d" font-family="Arial,sans-serif" font-size="16" font-weight="800">Create your bracket at World Cup 2026 Predictor</text>
</svg>`;
}

function renderHtmlMatch(m = {}) {
  const winner = m.winner || "";
  const row = (team) => `<div class="team ${winner === team ? "win" : ""}"><span>${esc(teamLabel(team, 26))}</span>${winner === team ? `<b>✓</b>` : ""}</div>`;
  return `<div class="match"><div class="mno">M${esc(m.match || "")}</div>${row(m.home || "TBD")}${row(m.away || "TBD")}</div>`;
}

function renderRound(title, matches) {
  return `<section class="round"><h2>${esc(title)}</h2>${(matches || []).map(renderHtmlMatch).join("")}</section>`;
}

function renderHtml(snapshot, pageUrl, imageUrl) {
  const title = snapshot.title || "World Cup 2026 Bracket";
  const desc = snapshot.champion && snapshot.champion !== "In progress"
    ? `Champion: ${snapshot.champion}${snapshot.runnerUp ? ` · Runner-up: ${snapshot.runnerUp}` : ""}`
    : "World Cup 2026 bracket picks in progress";
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
  <meta property="og:image:type" content="image/svg+xml" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${esc(imageUrl)}" />
  <style>
    :root{color-scheme:dark;background:#030a05;color:#d4ead9;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    *{box-sizing:border-box} body{margin:0;min-height:100vh;padding:18px;background:radial-gradient(circle at 20% 0%,#174f2e 0,#030a05 34%,#020604 100%)}
    .wrap{max-width:1220px;margin:0 auto}.hero{border:1px solid rgba(74,222,128,.35);border-radius:24px;padding:20px;background:linear-gradient(135deg,rgba(8,27,16,.96),rgba(3,10,5,.98));box-shadow:0 26px 70px rgba(0,0,0,.5);margin-bottom:16px}.eyebrow{font-size:11px;letter-spacing:.18em;color:#facc15;font-weight:900;text-transform:uppercase}.title{font-size:clamp(28px,6vw,54px);line-height:.98;font-weight:1000;margin:10px 0;color:#fff}.subtitle{color:#94a3b8;font-size:15px}.champ{display:inline-flex;align-items:center;gap:10px;margin-top:14px;border:1px solid rgba(74,222,128,.3);background:rgba(74,222,128,.1);border-radius:999px;padding:10px 14px;font-weight:1000;color:#4ade80}.tree{display:flex;gap:12px;align-items:flex-start;overflow-x:auto;padding:10px 8px 22px;scrollbar-color:#3d6a4d transparent}.round{min-width:190px;display:flex;flex-direction:column;gap:8px}.round h2{font-size:11px;letter-spacing:.14em;color:#94a3b8;text-align:center;margin:0 0 2px;text-transform:uppercase}.match{border:1px solid rgba(61,106,77,.9);border-radius:12px;background:rgba(6,20,12,.86);padding:7px;box-shadow:0 8px 24px rgba(0,0,0,.24)}.mno{font-size:9px;color:#94a3b8;font-weight:900;margin-bottom:4px}.team{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:24px;border-radius:8px;padding:3px 5px;font-size:12px;font-weight:750;color:#d4ead9}.team.win{background:rgba(74,222,128,.16);color:#4ade80}.team b{font-size:11px;color:#4ade80}.footer{margin:18px 0 4px;display:flex;justify-content:space-between;gap:12px;align-items:center;color:#3d6a4d;font-size:12px;font-weight:800}.cta{color:#4ade80;text-decoration:none}@media(max-width:760px){body{padding:12px}.round{min-width:180px}.hero{padding:16px}.tree{padding-left:0}.footer{flex-direction:column;align-items:flex-start}}
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero"><div class="eyebrow">World Cup 2026 Predictor</div><div class="title">${esc(title)}</div><div class="subtitle">${esc(desc)}</div><div class="champ">🏆 ${esc(teamLabel(snapshot.champion || "In progress", 32))}</div></section>
    <div class="tree" aria-label="World Cup bracket tree">
      ${renderRound("Round of 32", roundMatches(snapshot, "r32"))}
      ${renderRound("Round of 16", roundMatches(snapshot, "r16"))}
      ${renderRound("Quarterfinals", roundMatches(snapshot, "qf"))}
      ${renderRound("Semifinals", roundMatches(snapshot, "sf"))}
      ${renderRound("Final", roundMatches(snapshot, "final"))}
    </div>
    <div class="footer"><span>Built with World Cup 2026 Predictor</span><a class="cta" href="${esc(APP_URL)}">Create your bracket →</a></div>
  </main>
</body>
</html>`;
}

async function getSnapshot(id) {
  return kv.get(`bracket-share:${id}`);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    try {
      const snapshot = normalizeSnapshot(req.body || {});
      const hasAnyRound = Object.values(snapshot.rounds || {}).some(arr => Array.isArray(arr) && arr.length);
      if (!hasAnyRound) return res.status(400).json({ error: "bracket rounds required" });
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
      const snapshot = await getSnapshot(id);
      if (!snapshot) return res.status(404).send("Bracket card not found or expired.");
      if (req.query.action === "card" || req.query.action === "image") {
        res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
        return res.status(200).send(renderCardSvg(snapshot));
      }
      const origin = originFromReq(req);
      const pageUrl = `${origin}/api/bracket-share?id=${encodeURIComponent(id)}`;
      const imageUrl = `${origin}/api/bracket-share?action=card&id=${encodeURIComponent(id)}&v=tree2`;
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
