// api/og.js
// Mobile-balanced match share page + Open Graph image generator.

const TEAM_FLAGS = {
  "Argentina":"🇦🇷","Australia":"🇦🇺","Austria":"🇦🇹","Belgium":"🇧🇪","Brazil":"🇧🇷","Canada":"🇨🇦",
  "Colombia":"🇨🇴","Croatia":"🇭🇷","Ecuador":"🇪🇨","England":"🏴","France":"🇫🇷","Germany":"🇩🇪",
  "Ghana":"🇬🇭","Iran":"🇮🇷","Japan":"🇯🇵","Mexico":"🇲🇽","Morocco":"🇲🇦","Netherlands":"🇳🇱",
  "Paraguay":"🇵🇾","Portugal":"🇵🇹","Qatar":"🇶🇦","Saudi Arabia":"🇸🇦","Scotland":"🏴",
  "Senegal":"🇸🇳","South Africa":"🇿🇦","South Korea":"🇰🇷","Spain":"🇪🇸","Sweden":"🇸🇪",
  "Switzerland":"🇨🇭","Tunisia":"🇹🇳","Turkiye":"🇹🇷","Turkey":"🇹🇷","United States":"🇺🇸",
  "Uruguay":"🇺🇾","Algeria":"🇩🇿","Haiti":"🇭🇹","Czechia":"🇨🇿","Ivory Coast":"🇨🇮",
  "DR Congo":"🇨🇩","Uzbekistan":"🇺🇿","New Zealand":"🇳🇿","Jordan":"🇯🇴","Iraq":"🇮🇶",
  "Panama":"🇵🇦","Curacao":"🇨🇼","Cape Verde":"🇨🇻","Norway":"🇳🇴"
};

function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function getBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "world-cup-app-iota.vercel.app";
  return `${proto}://${host}`;
}

function getParam(req, key, fallback = "") {
  const v = req.query?.[key];
  if (Array.isArray(v)) return v[0] || fallback;
  return v || fallback;
}

function normalizeGroup(group) {
  const g = String(group || "").trim();
  if (!g) return "World Cup";
  if (/^group\s+/i.test(g)) return g.replace(/^group/i, "Group");
  if (/^[A-L]$/i.test(g)) return `Group ${g.toUpperCase()}`;
  return g;
}

function mapsUrl(venue, city) {
  const q = [venue, city].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function imageUrl(req) {
  const base = getBaseUrl(req);
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query || {})) {
    if (k !== "image") params.set(k, Array.isArray(v) ? v[0] : v);
  }
  params.set("image", "1");
  if (!params.get("v")) params.set("v", Date.now().toString(36));
  return `${base}/api/og?${params.toString()}`;
}

function renderSvg(data) {
  const { home, away, group, date, time, venue, city, status } = data;
  const hf = TEAM_FLAGS[home] || "🏳️";
  const af = TEAM_FLAGS[away] || "🏳️";
  const meta = [group, date, time].filter(Boolean).join(" • ");
  const location = [venue, city].filter(Boolean).join(" • ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#06150d"/>
      <stop offset="100%" stop-color="#020805"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#102d1b"/>
      <stop offset="100%" stop-color="#07170e"/>
    </linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity="0.42"/></filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1010" cy="120" r="300" fill="#0b3a20" opacity=".25"/>
  <text x="64" y="70" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="#59d987" letter-spacing="8">FIFA</text>
  <text x="64" y="122" font-family="Arial, Helvetica, sans-serif" font-size="50" font-weight="900" fill="#e8fff0">WORLD CUP</text>
  <text x="64" y="174" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="900" fill="#49ee83">2026</text>

  <g filter="url(#shadow)">
    <rect x="64" y="210" width="1072" height="255" rx="32" fill="url(#card)" stroke="#18a957" stroke-opacity=".45" stroke-width="2"/>
  </g>
  <rect x="88" y="232" width="165" height="42" rx="21" fill="#0e4d2a"/>
  <text x="170" y="260" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="900" fill="#7aff9e" text-anchor="middle">${esc(group)}</text>
  <rect x="902" y="232" width="205" height="42" rx="21" fill="#102d1b" stroke="#49ee83" stroke-opacity=".3"/>
  <text x="1004" y="260" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="850" fill="#a7f3c3" text-anchor="middle">${esc(date || "Match Day")}</text>

  <text x="300" y="322" font-family="Apple Color Emoji, Segoe UI Emoji, Arial" font-size="72" text-anchor="middle">${esc(hf)}</text>
  <text x="300" y="378" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="#f1fff5" text-anchor="middle">${esc(home)}</text>
  <text x="600" y="336" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="1000" fill="#52e985" text-anchor="middle">VS</text>
  <text x="600" y="371" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="900" fill="#89c99f" text-anchor="middle" letter-spacing="6">${esc(status || "UPCOMING")}</text>
  <text x="900" y="322" font-family="Apple Color Emoji, Segoe UI Emoji, Arial" font-size="72" text-anchor="middle">${esc(af)}</text>
  <text x="900" y="378" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" fill="#f1fff5" text-anchor="middle">${esc(away)}</text>

  <text x="600" y="428" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="850" fill="#77f0a0" text-anchor="middle">${esc(meta)}</text>
  <text x="600" y="500" font-family="Arial, Helvetica, sans-serif" font-size="29" font-weight="900" fill="#60a5fa" text-anchor="middle">${esc(venue || "Venue TBA")}</text>
  <text x="600" y="537" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="700" fill="#a7cdb4" text-anchor="middle">${esc(city || "")}</text>

  <text x="64" y="590" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="850" fill="#49ee83">World Cup 2026 Predictor</text>
  <text x="1136" y="590" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#4c7f5e" text-anchor="end">world-cup-app-iota.vercel.app</text>
</svg>`;
}

function renderHtml(req, data) {
  const { home, away, group, date, time, venue, city, weather } = data;
  const title = `${home} vs ${away} · World Cup 2026`;
  const desc = [group, date, time, venue].filter(Boolean).join(" • ");
  const img = imageUrl(req);
  const base = getBaseUrl(req);
  const fullUrl = `${base}${req.url || ""}`;
  const hf = TEAM_FLAGS[home] || "🏳️";
  const af = TEAM_FLAGS[away] || "🏳️";
  const venueLink = mapsUrl(venue, city);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:title" content="${esc(title)}"/>
  <meta property="og:description" content="${esc(desc)}"/>
  <meta property="og:image" content="${esc(img)}"/>
  <meta property="og:image:secure_url" content="${esc(img)}"/>
  <meta property="og:image:type" content="image/svg+xml"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:url" content="${esc(fullUrl)}"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${esc(title)}"/>
  <meta name="twitter:description" content="${esc(desc)}"/>
  <meta name="twitter:image" content="${esc(img)}"/>
  <style>
    :root{color-scheme:dark;--bg:#030905;--panel:#07180e;--green:#4ade80;--muted:#91b49b;--text:#eafff0;--blue:#60a5fa;--gold:#facc15}
    *{box-sizing:border-box}
    body{margin:0;background:radial-gradient(circle at 80% 0%,#0d2a18 0,#030905 42%,#010402 100%);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:var(--text)}
    .wrap{max-width:820px;margin:0 auto;padding:20px 18px calc(24px + env(safe-area-inset-bottom))}
    .brand{font-weight:1000;line-height:.98;margin:4px 0 18px}
    .brand small{display:block;letter-spacing:.32em;color:#72a981;font-size:13px;margin-bottom:4px}
    .brand .wc{font-size:30px;color:#e7fff0}
    .brand .yr{font-size:35px;color:#4ade80}
    .hero{border:1px solid rgba(74,222,128,.28);background:linear-gradient(135deg,#0b2415,#06130b);border-radius:28px;padding:16px 16px 15px;box-shadow:0 12px 34px rgba(0,0,0,.32);overflow:hidden;position:relative}
    .hero:before{content:"";position:absolute;right:-110px;top:-55px;width:245px;height:245px;border-radius:999px;background:#0c3a21;opacity:.35}
    .meta{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px;position:relative}
    .pill{font-size:14px;font-weight:900;color:#7bff9e;background:#0e4226;border:1px solid rgba(74,222,128,.28);border-radius:999px;padding:7px 11px;white-space:nowrap}
    .teams{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;position:relative;min-height:132px}
    .team{text-align:center;min-width:0}
    .flag{font-size:44px;line-height:1;margin-bottom:6px}
    .name{font-size:22px;font-weight:950;line-height:1.08;word-break:normal}
    .vs{text-align:center;color:#45da78;font-size:34px;font-weight:1000;opacity:.9}
    .status{text-align:center;color:#6fa780;font-size:11px;font-weight:900;letter-spacing:.22em;margin-top:2px}
    .kick{margin-top:6px;text-align:center;color:#77f0a0;font-size:18px;font-weight:900;position:relative}
    .details{margin-top:13px;display:grid;gap:10px}
    .row{display:grid;grid-template-columns:34px 1fr 18px;gap:10px;align-items:center;border:1px solid rgba(74,222,128,.24);background:rgba(9,31,18,.85);border-radius:20px;padding:13px 14px;text-decoration:none;color:inherit}
    .row .ico{font-size:24px;text-align:center}
    .row .label{font-size:12px;letter-spacing:.15em;font-weight:900;color:#80a98b;text-transform:uppercase;margin-bottom:4px}
    .row .value{font-size:21px;line-height:1.16;font-weight:900;color:var(--blue)}
    .row .sub{font-size:16px;line-height:1.22;color:#9fc5aa;margin-top:3px}
    .chev{font-size:27px;color:#4b8460}
    .actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
    .btn{border-radius:22px;padding:15px 12px;border:1px solid rgba(74,222,128,.34);background:#0b2415;color:#58e887;text-decoration:none;text-align:center;font-size:20px;font-weight:1000}
    .btn.primary{background:linear-gradient(135deg,#4ade80,#22c55e);color:#031008;border:0}
    .install{text-align:center;color:#77a484;font-size:14px;line-height:1.35;margin-top:12px}
    @media(min-width:700px){
      .brand .wc{font-size:38px}.brand .yr{font-size:44px}
      .flag{font-size:58px}.name{font-size:28px}.vs{font-size:44px}.teams{min-height:150px}
      .row .value{font-size:24px}.row .sub{font-size:18px}
    }
  </style>
</head>
<body>
  <main class="wrap">
    <div class="brand"><small>FIFA</small><div class="wc">WORLD CUP</div><div class="yr">2026</div></div>
    <section class="hero">
      <div class="meta"><span class="pill">${esc(group)}</span><span class="pill">${esc(date || "Match Day")}</span></div>
      <div class="teams">
        <div class="team"><div class="flag">${esc(hf)}</div><div class="name">${esc(home)}</div></div>
        <div><div class="vs">VS</div><div class="status">UPCOMING</div></div>
        <div class="team"><div class="flag">${esc(af)}</div><div class="name">${esc(away)}</div></div>
      </div>
      ${time ? `<div class="kick">${esc(time)}</div>` : ""}
    </section>
    <div class="details">
      <a class="row" href="${esc(venueLink)}" target="_blank" rel="noopener">
        <div class="ico">📍</div><div><div class="label">Venue</div><div class="value">${esc(venue || "Venue TBA")}</div><div class="sub">${esc(city || "Tap for directions")}</div></div><div class="chev">›</div>
      </a>
      ${weather ? `<div class="row"><div class="ico">🌦️</div><div><div class="label">Match Day Forecast</div><div class="value">${esc(weather)}</div><div class="sub">Tap for full forecast in the app</div></div><div class="chev">›</div></div>` : ""}
      <div class="row"><div class="ico">📅</div><div><div class="label">Match</div><div class="value">${esc([group, date].filter(Boolean).join(" • ") || "World Cup 2026")}</div><div class="sub">${esc(time || "")}</div></div><div></div></div>
    </div>
    <div class="actions">
      <a class="btn primary" href="${esc(base)}">⚽ Open App</a>
      <button class="btn" onclick="navigator.share?navigator.share({title:${JSON.stringify(title)},text:${JSON.stringify(desc)},url:location.href}):navigator.clipboard.writeText(location.href)">📤 Share</button>
    </div>
    <div class="install"><strong>Don’t have the app?</strong><br/>iPhone: Safari → Share ↑ → Add to Home Screen<br/>Android: Chrome → ⋯ → Add to Home Screen</div>
  </main>
</body>
</html>`;
}

export default async function handler(req, res) {
  const home = String(getParam(req, "home", getParam(req, "homeTeam", "Brazil"))).trim();
  const away = String(getParam(req, "away", getParam(req, "awayTeam", "Morocco"))).trim();

  // Use only explicitly passed venue/city. Avoid mixing a venue fallback with a real city from another match.
  const venue = getParam(req, "venue", getParam(req, "stadium", ""));
  const city = getParam(req, "city", "");

  const data = {
    home,
    away,
    group: normalizeGroup(getParam(req, "group", getParam(req, "stage", "World Cup"))),
    date: getParam(req, "date", ""),
    time: getParam(req, "time", getParam(req, "kickoff", "")),
    venue,
    city,
    weather: getParam(req, "weather", ""),
    status: getParam(req, "status", "UPCOMING"),
  };

  if (getParam(req, "image", "") === "1") {
    const svg = renderSvg(data);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    return res.status(200).send(svg);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
  return res.status(200).send(renderHtml(req, data));
}
