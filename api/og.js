// /api/og.js
// Generates match share cards
// iMessage/WhatsApp needs a REAL image URL in og:image (not SVG, not the page itself)
// Solution: ?format=image returns the SVG, page returns HTML with og:image pointing to ?format=image

export default async function handler(req, res) {
  const {
    home="Team A", away="Team B", hg, ag,
    group="", date="", venue="", stage="",
    p1, p2, format
  } = req.query;

  const hasScore = hg !== undefined && ag !== undefined;
  const stageLabel = stage || (group ? `Group ${group}` : "World Cup 2026");
  const venueShort = venue ? venue.split(",")[0] : "";

  const FLAG_CODES = {
    "Mexico":"mx","South Africa":"za","South Korea":"kr","Czechia":"cz",
    "Canada":"ca","Bosnia & Herz.":"ba","Qatar":"qa","Switzerland":"ch",
    "Brazil":"br","Morocco":"ma","Haiti":"ht","Scotland":"gb-sct",
    "United States":"us","Paraguay":"py","Australia":"au","Turkiye":"tr",
    "Germany":"de","Curacao":"cw","Ivory Coast":"ci","Ecuador":"ec",
    "Netherlands":"nl","Japan":"jp","Sweden":"se","Tunisia":"tn",
    "Belgium":"be","Egypt":"eg","Iran":"ir","New Zealand":"nz",
    "Spain":"es","Cape Verde":"cv","Saudi Arabia":"sa","Uruguay":"uy",
    "France":"fr","Senegal":"sn","Iraq":"iq","Norway":"no",
    "Argentina":"ar","Algeria":"dz","Austria":"at","Jordan":"jo",
    "Portugal":"pt","DR Congo":"cd","Uzbekistan":"uz","Colombia":"co",
    "England":"gb-eng","Croatia":"hr","Ghana":"gh","Panama":"pa",
  };
  const flagUrl = t => { const c = FLAG_CODES[t]; return c ? `https://flagcdn.com/w160/${c}.png` : null; };
  const hf = flagUrl(home);
  const af = flagUrl(away);
  const sw = stageLabel.length * 10 + 32;

  const scoreBlock = hasScore
    ? `<text x="600" y="295" text-anchor="middle" font-size="100" font-weight="900" fill="#4ade80" font-family="monospace">${hg} – ${ag}</text>
       <text x="600" y="345" text-anchor="middle" font-size="26" font-weight="700" fill="#3d6a4d" letter-spacing="6">FULL TIME</text>`
    : `<text x="600" y="300" text-anchor="middle" font-size="88" font-weight="900" fill="#234833" letter-spacing="8">VS</text>
       <text x="600" y="345" text-anchor="middle" font-size="26" font-weight="700" fill="#3d6a4d" letter-spacing="6">UPCOMING</text>`;

  const oddsBlock = (!hasScore && p1 && p2) ? `
    <rect x="280" y="400" width="640" height="72" rx="10" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.2)" stroke-width="1"/>
    <text x="600" y="424" text-anchor="middle" font-size="15" fill="#3d6a4d" font-family="system-ui" letter-spacing="2">POLYMARKET WIN PROBABILITY</text>
    <text x="370" y="458" text-anchor="middle" font-size="28" font-weight="900" fill="#4ade80" font-family="system-ui">${p1}%</text>
    <text x="600" y="458" text-anchor="middle" font-size="16" fill="#3d6a4d" font-family="system-ui">draw</text>
    <text x="830" y="458" text-anchor="middle" font-size="28" font-weight="900" fill="#38bdf8" font-family="system-ui">${p2}%</text>` : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#060e0a"/>
      <stop offset="50%" style="stop-color:#0c1a12"/>
      <stop offset="100%" style="stop-color:#060e0a"/>
    </linearGradient>
    <linearGradient id="acc" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#060e0a;stop-opacity:0"/>
      <stop offset="50%" style="stop-color:#4ade80"/>
      <stop offset="100%" style="stop-color:#060e0a;stop-opacity:0"/>
    </linearGradient>
    <clipPath id="hfc" clipPathUnits="userSpaceOnUse"><rect x="128" y="195" width="160" height="107" rx="8"/></clipPath>
    <clipPath id="afc" clipPathUnits="userSpaceOnUse"><rect x="912" y="195" width="160" height="107" rx="8"/></clipPath>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1100" cy="80"  r="280" fill="rgba(74,222,128,0.025)"/>
  <circle cx="100"  cy="550" r="320" fill="rgba(74,222,128,0.025)"/>
  <!-- Branding -->
  <text x="48" y="56"  font-size="14" font-weight="700" fill="#3d6a4d" font-family="system-ui" letter-spacing="3">FIFA</text>
  <text x="48" y="86"  font-size="26" font-weight="900" fill="#d4ead9" font-family="system-ui">WORLD CUP</text>
  <text x="48" y="116" font-size="26" font-weight="900" fill="#4ade80" font-family="system-ui">2026™</text>
  <!-- Stage badge -->
  <rect x="${1200-48-sw}" y="40" width="${sw}" height="40" rx="20" fill="rgba(74,222,128,0.12)" stroke="rgba(74,222,128,0.3)" stroke-width="1"/>
  <text x="${1200-48-sw/2}" y="65" text-anchor="middle" font-size="18" font-weight="700" fill="#4ade80" font-family="system-ui">${stageLabel}</text>
  ${date ? `<text x="${1200-48}" y="98" text-anchor="end" font-size="17" fill="#7aaa8a" font-family="system-ui">${date}</text>` : ""}
  <!-- Flags -->
  ${hf ? `<image href="${hf}" x="128" y="195" width="160" height="107" clip-path="url(#hfc)" preserveAspectRatio="xMidYMid slice"/>` : ""}
  ${af ? `<image href="${af}" x="912" y="195" width="160" height="107" clip-path="url(#afc)" preserveAspectRatio="xMidYMid slice"/>` : ""}
  <!-- Team names -->
  <text x="208"  y="348" text-anchor="middle" font-size="36" font-weight="800" fill="#d4ead9" font-family="system-ui">${home}</text>
  <text x="992"  y="348" text-anchor="middle" font-size="36" font-weight="800" fill="#d4ead9" font-family="system-ui">${away}</text>
  <!-- Score/VS -->
  ${scoreBlock}
  ${oddsBlock}
  <!-- Footer -->
  ${venueShort ? `<text x="48" y="600" font-size="20" fill="#4ade80" font-family="system-ui">📍 ${venueShort}</text>` : ""}
  <text x="1152" y="600" text-anchor="end" font-size="16" fill="#3d6a4d" font-family="system-ui">world-cup-app-iota.vercel.app</text>
  <rect x="0" y="627" width="1200" height="3" fill="url(#acc)"/>
</svg>`;

  // --- MODE 1: raw SVG image for OG crawlers ---
  if (format === "image") {
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(svg);
  }

  // --- MODE 2: HTML share page ---
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host  = req.headers.host;
  const base  = `${proto}://${host}`;

  // OG image URL — same params + format=image
  const imgParams = new URLSearchParams({ home, away, ...(hasScore?{hg,ag}:{}), group, date, venue, stage, ...(p1?{p1}:{}), ...(p2?{p2}:{}), format:"image" }).toString();
  const ogImg   = `${base}/api/og?${imgParams}`;
  const appUrl  = base;

  const title = hasScore
    ? `${home} ${hg}–${ag} ${away} · World Cup 2026`
    : `${home} vs ${away} · World Cup 2026`;
  const desc = hasScore
    ? `Full time: ${home} ${hg}–${ag} ${away} · ${stageLabel}${date?` · ${date}`:""}`
    : `${stageLabel}${date?` · ${date}`:""} · Tap to open the World Cup 2026 app`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<title>${title}</title>
<!-- iMessage / WhatsApp / Slack OG tags -->
<meta property="og:title"       content="${title}"/>
<meta property="og:description" content="${desc}"/>
<meta property="og:image"       content="${ogImg}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height"content="630"/>
<meta property="og:url"         content="${base}/api/og?${new URLSearchParams({home,away,...(hasScore?{hg,ag}:{}),group,date,venue,stage,...(p1?{p1}:{}),(p2?{p2}:{})}).toString()}"/>
<meta property="og:type"        content="website"/>
<meta property="og:site_name"   content="FIFA World Cup 2026 App"/>
<meta name="twitter:card"       content="summary_large_image"/>
<meta name="twitter:image"      content="${ogImg}"/>
<!-- Apple/PWA -->
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-title"   content="WC 2026"/>
<link rel="apple-touch-icon"    href="${base}/icons/icon-192.png"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;background:#060e0a;font-family:system-ui,sans-serif;color:#d4ead9}
body{display:flex;flex-direction:column;align-items:center;padding:0 0 env(safe-area-inset-bottom,24px)}
.top{width:100%;background:linear-gradient(180deg,#0c1a12,#060e0a);padding:16px 16px 0}
.logo{margin-bottom:12px}
.logo-sm{font-size:10px;color:#3d6a4d;font-weight:700;letter-spacing:.2em}
.logo-wc{font-size:18px;font-weight:900;color:#d4ead9;line-height:1}
.logo-yr{font-size:18px;font-weight:900;color:#4ade80;line-height:1}
.card{width:100%;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.6)}
.card svg{width:100%;height:auto;display:block}
.section{width:100%;max-width:500px;padding:12px 16px 0}
.row{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#0c1a12;border:1px solid #1a3828;border-radius:12px;margin-bottom:8px}
.row-icon{font-size:20px;flex-shrink:0}
.row-label{font-size:11px;color:#3d6a4d;font-weight:600;margin-bottom:2px;letter-spacing:.05em}
.row-val{font-size:14px;color:#d4ead9;font-weight:600}
.row-sub{font-size:12px;color:#7aaa8a;margin-top:2px}
.btns{display:flex;gap:10px;padding:16px 16px 0;width:100%;max-width:500px}
.btn{flex:1;padding:14px 0;border-radius:14px;font-weight:700;font-size:15px;cursor:pointer;border:none;text-align:center;text-decoration:none;display:block}
.green{background:linear-gradient(135deg,#4ade80,#22c55e);color:#030a05}
.outline{background:rgba(74,222,128,.1);color:#4ade80;border:1px solid rgba(74,222,128,.3)}
.hint{font-size:12px;color:#3d6a4d;text-align:center;line-height:1.6;padding:12px 16px 0;max-width:500px}
.hint strong{color:#4ade80}
</style>
</head>
<body>
<div class="top">
  <div class="logo">
    <div class="logo-sm">FIFA</div>
    <div class="logo-wc">WORLD CUP</div>
    <div class="logo-yr">2026™</div>
  </div>
  <div class="card">${svg}</div>
</div>

<div class="section">
  ${venueShort ? `<div class="row" onclick="window.open('https://maps.apple.com/?q=${encodeURIComponent(venueShort)}','_blank');return false" style="cursor:pointer">
    <div class="row-icon">📍</div>
    <div style="flex:1">
      <div class="row-label">VENUE</div>
      <div class="row-val" style="color:#60a5fa;text-decoration:underline;text-decoration-style:dotted">${venueShort}</div>
      <div class="row-sub">Tap for directions</div>
    </div>
  </div>` : ""}
  ${date ? `<div class="row">
    <div class="row-icon">📅</div>
    <div><div class="row-label">MATCH</div><div class="row-val">${stageLabel} · ${date}</div></div>
  </div>` : ""}
  ${!hasScore && p1 && p2 ? `<div class="row">
    <div class="row-icon">🎯</div>
    <div style="flex:1">
      <div class="row-label">POLYMARKET WIN PROBABILITY</div>
      <div style="display:flex;gap:16px;margin-top:6px;align-items:center">
        <div style="text-align:center"><div style="font-size:24px;font-weight:900;color:#4ade80">${p1}%</div><div style="font-size:11px;color:#3d6a4d">${home}</div></div>
        <div style="flex:1;text-align:center;color:#3d6a4d;font-size:12px">draw odds on app</div>
        <div style="text-align:center"><div style="font-size:24px;font-weight:900;color:#38bdf8">${p2}%</div><div style="font-size:11px;color:#3d6a4d">${away}</div></div>
      </div>
    </div>
  </div>` : ""}
</div>

<div class="btns">
  <a href="${appUrl}" class="btn green">⚽ Open App</a>
  <button class="btn outline" onclick="if(navigator.share){navigator.share({title:'${title.replace(/'/g,"\\'")}',url:location.href})}else{navigator.clipboard?.writeText(location.href);this.textContent='✓ Copied!'}">📤 Share</button>
</div>
<p class="hint">
  <strong>New to the app?</strong> Open in Safari → tap <strong style="color:#d4ead9">Share ↑</strong> → <strong style="color:#d4ead9">Add to Home Screen</strong><br/>
  Live scores · Match predictor · Groups · Simulator
</p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.status(200).send(html);
}
