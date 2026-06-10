// api/og.js
// Responsive match share page + Open Graph image generator.
// Replaces the older tall/low-readability card with a compact mobile-first layout.
//
// Usage examples:
// /api/og?home=Brazil&away=Morocco&group=Group%20C&date=Jun%2013&time=12AM%20ET&venue=New%20York%20New%20Jersey%20Stadium&city=East%20Rutherford%2C%20NJ
// /api/og?image=1&home=Brazil&away=Morocco&group=Group%20C&date=Jun%2013&venue=New%20York%20New%20Jersey%20Stadium

const TEAM_FLAGS = {
  "Argentina":"🇦🇷","Australia":"🇦🇺","Austria":"🇦🇹","Belgium":"🇧🇪","Brazil":"🇧🇷",
  "Canada":"🇨🇦","Chile":"🇨🇱","Colombia":"🇨🇴","Croatia":"🇭🇷","Denmark":"🇩🇰",
  "Ecuador":"🇪🇨","England":"🏴","France":"🇫🇷","Germany":"🇩🇪","Ghana":"🇬🇭",
  "Iran":"🇮🇷","Japan":"🇯🇵","Mexico":"🇲🇽","Morocco":"🇲🇦","Netherlands":"🇳🇱",
  "Norway":"🇳🇴","Paraguay":"🇵🇾","Portugal":"🇵🇹","Qatar":"🇶🇦","Saudi Arabia":"🇸🇦",
  "Senegal":"🇸🇳","South Africa":"🇿🇦","South Korea":"🇰🇷","Spain":"🇪🇸","Sweden":"🇸🇪",
  "Switzerland":"🇨🇭","Tunisia":"🇹🇳","Turkiye":"🇹🇷","Turkey":"🇹🇷","United States":"🇺🇸",
  "Uruguay":"🇺🇾","Wales":"🏴","Algeria":"🇩🇿","Haiti":"🇭🇹","Scotland":"🏴",
  "Czechia":"🇨🇿","Ivory Coast":"🇨🇮","DR Congo":"🇨🇩","Uzbekistan":"🇺🇿","New Zealand":"🇳🇿",
  "Jordan":"🇯🇴","Iraq":"🇮🇶","Panama":"🇵🇦","Curacao":"🇨🇼","Cape Verde":"🇨🇻"
};

function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function normalizeTeam(t) {
  return String(t || "").trim();
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
  // cache-buster so iMessage/WhatsApp fetch a fresh image for new shares
  if (!params.get("v")) params.set("v", Date.now().toString(36));
  return `${base}/api/og?${params.toString()}`;
}

function renderSvg(data) {
  const {
    home, away, group, date, time, venue, city, status
  } = data;
  const hf = TEAM_FLAGS[home] || "🏳️";
  const af = TEAM_FLAGS[away] || "🏳️";
  const title = `${home} vs ${away}`;
  const meta = [group, date, time].filter(Boolean).join(" • ");
  const location = [venue, city].filter(Boolean).join(" • ");
  const app = "world-cup-app-iota.vercel.app";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#06150d"/>
      <stop offset="55%" stop-color="#082414"/>
      <stop offset="100%" stop-color="#020805"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#102d1b"/>
      <stop offset="100%" stop-color="#07170e"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1030" cy="80" r="300" fill="#0b3a20" opacity="0.28"/>
  <circle cx="140" cy="585" r="270" fill="#0c3b22" opacity="0.22"/>

  <text x="64" y="70" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800" fill="#59d987" letter-spacing="8">FIFA</text>
  <text x="64" y="124" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="900" fill="#e8fff0">WORLD CUP</text>
  <text x="64" y="176" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="900" fill="#49ee83">2026</text>

  <g filter="url(#shadow)">
    <rect x="64" y="215" width="1072" height="300" rx="34" fill="url(#card)" stroke="#18a957" stroke-opacity=".45" stroke-width="2"/>
  </g>

  <rect x="88" y="238" width="142" height="46" rx="23" fill="#0e4d2a" opacity=".88"/>
  <text x="159" y="269" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="900" fill="#7aff9e" text-anchor="middle">${esc(group || "World Cup")}</text>

  <rect x="926" y="238" width="180" height="46" rx="23" fill="#102d1b" stroke="#49ee83" stroke-opacity=".3"/>
  <text x="1016" y="268" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="#a7f3c3" text-anchor="middle">${esc(date || "Match Day")}</text>

  <text x="300" y="302" font-family="Apple Color Emoji, Segoe UI Emoji, Arial" font-size="92" text-anchor="middle">${esc(hf)}</text>
  <text x="300" y="370" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="900" fill="#f1fff5" text-anchor="middle">${esc(home)}</text>

  <text x="600" y="334" font-family="Arial, Helvetica, sans-serif" font-size="82" font-weight="1000" fill="#52e985" text-anchor="middle" opacity=".86">VS</text>
  <text x="600" y="376" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="#89c99f" text-anchor="middle" letter-spacing="7">${esc(status || "UPCOMING")}</text>

  <text x="900" y="302" font-family="Apple Color Emoji, Segoe UI Emoji, Arial" font-size="92" text-anchor="middle">${esc(af)}</text>
  <text x="900" y="370" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="900" fill="#f1fff5" text-anchor="middle">${esc(away)}</text>

  <text x="600" y="458" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" fill="#77f0a0" text-anchor="middle">${esc(meta)}</text>
  <text x="600" y="500" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="700" fill="#a7cdb4" text-anchor="middle">${esc(location)}</text>

  <text x="64" y="585" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="#49ee83">World Cup 2026 Predictor</text>
  <text x="1136" y="585" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="700" fill="#4c7f5e" text-anchor="end">${esc(app)}</text>
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
    :root{color-scheme:dark;--bg:#030905;--panel:#07180e;--panel2:#0b2415;--green:#4ade80;--green2:#22c55e;--muted:#86a990;--text:#eafff0;--blue:#60a5fa;--gold:#facc15}
    *{box-sizing:border-box}
    body{margin:0;background:radial-gradient(circle at 80% 0%,#0d2a18 0,#030905 44%,#010402 100%);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:var(--text)}
    .wrap{max-width:820px;margin:0 auto;padding:26px 20px calc(28px + env(safe-area-inset-bottom))}
    .brand{font-weight:1000;line-height:.98;margin:6px 0 22px}
    .brand small{display:block;letter-spacing:.34em;color:#72a981;font-size:15px;margin-bottom:5px}
    .brand .wc{font-size:36px;color:#e7fff0}
    .brand .yr{font-size:42px;color:#4ade80}
    .hero{border:1px solid rgba(74,222,128,.22);background:linear-gradient(135deg,#0b2415,#06130b);border-radius:30px;padding:22px 22px 18px;box-shadow:0 16px 40px rgba(0,0,0,.35);overflow:hidden;position:relative}
    .hero:before{content:"";position:absolute;right:-100px;top:-80px;width:280px;height:280px;border-radius:999px;background:#0c3a21;opacity:.35}
    .meta{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:18px;position:relative}
    .pill{font-size:16px;font-weight:900;color:#7bff9e;background:#0e4226;border:1px solid rgba(74,222,128,.25);border-radius:999px;padding:7px 12px}
    .teams{display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:center;position:relative;min-height:160px}
    .team{text-align:center;min-width:0}
    .flag{font-size:66px;line-height:1;margin-bottom:8px}
    .name{font-size:30px;font-weight:1000;line-height:1.05;word-break:normal}
    .vs{text-align:center;color:#45da78;font-size:46px;font-weight:1000;opacity:.8}
    .status{text-align:center;color:#6fa780;font-size:13px;font-weight:900;letter-spacing:.28em;margin-top:4px}
    .details{margin-top:18px;display:grid;gap:12px}
    .row{display:grid;grid-template-columns:42px 1fr 22px;gap:12px;align-items:center;border:1px solid rgba(74,222,128,.22);background:rgba(9,31,18,.85);border-radius:22px;padding:16px 16px;text-decoration:none;color:inherit}
    .row .ico{font-size:28px;text-align:center}
    .row .label{font-size:13px;letter-spacing:.16em;font-weight:900;color:#80a98b;text-transform:uppercase;margin-bottom:4px}
    .row .value{font-size:25px;line-height:1.18;font-weight:900;color:var(--blue)}
    .row .sub{font-size:19px;line-height:1.25;color:#9fc5aa;margin-top:3px}
    .chev{font-size:32px;color:#4b8460}
    .actions{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:22px}
    .btn{border-radius:24px;padding:19px 16px;border:1px solid rgba(74,222,128,.32);background:#0b2415;color:#58e887;text-decoration:none;text-align:center;font-size:23px;font-weight:1000}
    .btn.primary{background:linear-gradient(135deg,#4ade80,#22c55e);color:#031008;border:0}
    .install{text-align:center;color:#77a484;font-size:17px;line-height:1.45;margin-top:16px}
    @media(max-width:520px){
      .wrap{padding:22px 16px 22px}
      .brand .wc{font-size:31px}.brand .yr{font-size:37px}
      .hero{padding:18px 16px 16px;border-radius:26px}
      .teams{min-height:122px;gap:8px}
      .flag{font-size:54px}
      .name{font-size:25px}
      .vs{font-size:38px}
      .pill{font-size:14px}
      .row{grid-template-columns:34px 1fr 18px;padding:14px;border-radius:20px}
      .row .value{font-size:24px}
      .row .sub{font-size:18px}
      .actions{gap:12px}.btn{font-size:21px;padding:18px 12px}
    }
  </style>
</head>
<body>
  <main class="wrap">
    <div class="brand">
      <small>FIFA</small>
      <div class="wc">WORLD CUP</div>
      <div class="yr">2026</div>
    </div>

    <section class="hero">
      <div class="meta">
        <span class="pill">${esc(group || "World Cup")}</span>
        <span class="pill">${esc(date || "Match Day")}</span>
      </div>
      <div class="teams">
        <div class="team"><div class="flag">${esc(hf)}</div><div class="name">${esc(home)}</div></div>
        <div><div class="vs">VS</div><div class="status">UPCOMING</div></div>
        <div class="team"><div class="flag">${esc(af)}</div><div class="name">${esc(away)}</div></div>
      </div>
    </section>

    <div class="details">
      <a class="row" href="${esc(venueLink)}" target="_blank" rel="noopener">
        <div class="ico">📍</div>
        <div><div class="label">Venue</div><div class="value">${esc(venue || "Venue TBA")}</div><div class="sub">${esc(city || "Tap for directions")}</div></div>
        <div class="chev">›</div>
      </a>
      ${weather ? `<div class="row"><div class="ico">🌦️</div><div><div class="label">Match Day Forecast</div><div class="value">${esc(weather)}</div><div class="sub">Tap for full forecast in the app</div></div><div class="chev">›</div></div>` : ""}
      <div class="row"><div class="ico">📅</div><div><div class="label">Match</div><div class="value">${esc([group, date].filter(Boolean).join(" • ") || "World Cup 2026")}</div><div class="sub">${esc(time || "")}</div></div><div></div></div>
    </div>

    <div class="actions">
      <a class="btn primary" href="${esc(base)}">⚽ Open App</a>
      <button class="btn" onclick="navigator.share?navigator.share({title:${JSON.stringify(title)},text:${JSON.stringify(desc)},url:location.href}):navigator.clipboard.writeText(location.href)">📤 Share</button>
    </div>
    <div class="install">
      <strong>Don’t have the app?</strong><br/>
      iPhone: Safari → Share ↑ → Add to Home Screen<br/>
      Android: Chrome → ⋯ → Add to Home Screen
    </div>
  </main>
</body>
</html>`;
}

export default async function handler(req, res) {
  const home = normalizeTeam(getParam(req, "home", getParam(req, "homeTeam", "Brazil")));
  const away = normalizeTeam(getParam(req, "away", getParam(req, "awayTeam", "Morocco")));
  const data = {
    home,
    away,
    group: getParam(req, "group", getParam(req, "stage", "Group C")),
    date: getParam(req, "date", "Jun 13"),
    time: getParam(req, "time", getParam(req, "kickoff", "")),
    venue: getParam(req, "venue", getParam(req, "stadium", "New York New Jersey Stadium")),
    city: getParam(req, "city", "East Rutherford, NJ"),
    weather: getParam(req, "weather", ""),
    status: getParam(req, "status", "UPCOMING"),
  };

  if (getParam(req, "image", "") === "1") {
    const svg = renderSvg(data);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    return res.status(200).send(svg);
  }

  const html = renderHtml(req, data);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
  return res.status(200).send(html);
}
