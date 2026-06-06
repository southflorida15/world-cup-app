// /api/og.js
// Generates a dynamic match share card
// Returns HTML page with scaled SVG when viewed in browser
// Returns raw SVG for OG image crawlers (WhatsApp, Twitter etc.)

export default async function handler(req, res) {
  const { home="Team A", away="Team B", hg, ag, group="", date="", venue="", stage="" } = req.query;
  const hasScore = hg !== undefined && ag !== undefined;
  const stageLabel = stage || (group ? `Group ${group}` : "World Cup 2026");

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

  const flagUrl = (team) => {
    const code = FLAG_CODES[team];
    return code ? `https://flagcdn.com/w160/${code}.png` : null;
  };

  const homeFlagUrl = flagUrl(home);
  const awayFlagUrl = flagUrl(away);
  const venueShort = venue ? venue.split(",")[0] : "";

  const scoreBlock = hasScore
    ? `<text x="600" y="310" text-anchor="middle" font-size="110" font-weight="900" fill="#4ade80" font-family="monospace">${hg} – ${ag}</text>
       <text x="600" y="360" text-anchor="middle" font-size="18" font-weight="700" fill="#3d6a4d" letter-spacing="4">FULL TIME</text>`
    : `<text x="600" y="320" text-anchor="middle" font-size="72" font-weight="900" fill="#1a3828" letter-spacing="8">VS</text>
       <text x="600" y="362" text-anchor="middle" font-size="18" font-weight="700" fill="#3d6a4d" letter-spacing="4">UPCOMING</text>`;

  const stageLabelWidth = stageLabel.length * 10 + 32;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#060e0a"/>
      <stop offset="50%" style="stop-color:#0c1a12"/>
      <stop offset="100%" style="stop-color:#060e0a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#060e0a;stop-opacity:0"/>
      <stop offset="50%" style="stop-color:#4ade80"/>
      <stop offset="100%" style="stop-color:#060e0a;stop-opacity:0"/>
    </linearGradient>
    <clipPath id="hfc" clipPathUnits="userSpaceOnUse"><rect x="148" y="215" width="160" height="107" rx="8"/></clipPath>
    <clipPath id="afc" clipPathUnits="userSpaceOnUse"><rect x="892" y="215" width="160" height="107" rx="8"/></clipPath>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1100" cy="80" r="280" fill="rgba(74,222,128,0.025)"/>
  <circle cx="100" cy="550" r="320" fill="rgba(74,222,128,0.025)"/>

  <!-- FIFA branding -->
  <text x="48" y="58" font-size="12" font-weight="700" fill="#3d6a4d" font-family="system-ui" letter-spacing="3">FIFA</text>
  <text x="48" y="86" font-size="22" font-weight="900" fill="#d4ead9" font-family="system-ui">WORLD CUP</text>
  <text x="48" y="114" font-size="22" font-weight="900" fill="#4ade80" font-family="system-ui">2026™</text>

  <!-- Stage badge -->
  <rect x="${1200 - 48 - stageLabelWidth}" y="44" width="${stageLabelWidth}" height="34" rx="17" fill="rgba(74,222,128,0.12)" stroke="rgba(74,222,128,0.3)" stroke-width="1"/>
  <text x="${1200 - 48 - stageLabelWidth/2}" y="67" text-anchor="middle" font-size="15" font-weight="700" fill="#4ade80" font-family="system-ui">${stageLabel}</text>
  ${date ? `<text x="${1200-48}" y="96" text-anchor="end" font-size="14" fill="#3d6a4d" font-family="system-ui">${date}</text>` : ""}

  <!-- Home flag -->
  ${homeFlagUrl ? `<image href="${homeFlagUrl}" x="148" y="215" width="160" height="107" clip-path="url(#hfc)" preserveAspectRatio="xMidYMid slice"/>` : ""}
  <text x="228" y="368" text-anchor="middle" font-size="30" font-weight="800" fill="#d4ead9" font-family="system-ui">${home}</text>

  <!-- Score -->
  ${scoreBlock}

  <!-- Away flag -->
  ${awayFlagUrl ? `<image href="${awayFlagUrl}" x="892" y="215" width="160" height="107" clip-path="url(#afc)" preserveAspectRatio="xMidYMid slice"/>` : ""}
  <text x="972" y="368" text-anchor="middle" font-size="30" font-weight="800" fill="#d4ead9" font-family="system-ui">${away}</text>

  <!-- Bottom -->
  ${venueShort ? `<text x="48" y="598" font-size="13" fill="#3d6a4d" font-family="system-ui">📍 ${venueShort}</text>` : ""}
  <text x="1152" y="598" text-anchor="end" font-size="13" fill="#3d6a4d" font-family="system-ui">world-cup-app-iota.vercel.app</text>

  <!-- Accent line -->
  <rect x="0" y="627" width="1200" height="3" fill="url(#accent)"/>
</svg>`;

  // If the request is from a browser (not a bot), wrap in responsive HTML
  const ua = req.headers["user-agent"] || "";
  const isBot = /bot|crawler|spider|whatsapp|telegram|twitter|facebook|slack|discord|linkedin/i.test(ua);

  if (isBot) {
    // Return raw SVG for OG crawlers
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(svg);
  }

  // Return responsive HTML page for humans
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${home} vs ${away} — World Cup 2026</title>
  <meta property="og:title" content="${home} vs ${away} — World Cup 2026"/>
  <meta property="og:description" content="${hasScore ? `${home} ${hg}–${ag} ${away}` : "Upcoming match"} • ${stageLabel}${date ? ` • ${date}` : ""}"/>
  <meta property="og:image" content="${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}/api/og?${new URLSearchParams(req.query)}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#060e0a; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; min-height:100vh; padding-top:0; padding:16px; }
    .card { width:100%; max-width:600px; }
    svg { width:100%; height:auto; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.5); }
    .actions { display:flex; gap:12px; margin-top:16px; width:100%; max-width:600px; }
    .btn { flex:1; padding:12px 0; border-radius:12px; font-weight:700; font-size:15px; cursor:pointer; border:none; text-decoration:none; text-align:center; }
    .btn-open { background:linear-gradient(135deg,#4ade80,#22c55e); color:#030a05; }
    .btn-copy { background:rgba(74,222,128,0.15); color:#4ade80; border:1px solid rgba(74,222,128,0.3); }
  </style>
</head>
<body>
  <div class="card">${svg}</div>
  <div class="actions">
    <a href="/" class="btn btn-open">Open App</a>
    <button class="btn btn-copy" onclick="navigator.clipboard?.writeText(window.location.href).then(()=>this.textContent='Copied!')">Copy Link</button>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(html);
}
