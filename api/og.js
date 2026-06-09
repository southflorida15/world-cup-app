// /api/og.js
// ?format=image → SVG image for OG crawlers
// default       → HTML share page

const VENUE_COORDS = {
  // Exact names from App.jsx match data
  "New York New Jersey Stadium": { lat: 40.8135, lng: -74.0745, tz: "America/New_York",    city: "East Rutherford, NJ" },
  "SoFi Stadium":                { lat: 33.9535, lng: -118.3392,tz: "America/Los_Angeles", city: "Inglewood, CA" },
  "Seattle Stadium":             { lat: 47.5952, lng: -122.3316,tz: "America/Los_Angeles", city: "Seattle, WA" },
  "BC Place":                    { lat: 49.2768, lng: -123.1116,tz: "America/Vancouver",   city: "Vancouver, BC" },
  "Dallas Stadium":              { lat: 32.7478, lng: -97.0928, tz: "America/Chicago",     city: "Arlington, TX" },
  "Kansas City Stadium":         { lat: 39.0489, lng: -94.4839, tz: "America/Chicago",     city: "Kansas City, MO" },
  "Philadelphia Stadium":        { lat: 39.9008, lng: -75.1675, tz: "America/New_York",    city: "Philadelphia, PA" },
  "Boston Stadium":              { lat: 42.0909, lng: -71.2643, tz: "America/New_York",    city: "Foxborough, MA" },
  "Miami Stadium":               { lat: 25.9580, lng: -80.2389, tz: "America/New_York",    city: "Miami Gardens, FL" },
  "Houston Stadium":             { lat: 29.6847, lng: -95.4107, tz: "America/Chicago",     city: "Houston, TX" },
  "Atlanta Stadium":             { lat: 33.7554, lng: -84.4009, tz: "America/New_York",    city: "Atlanta, GA" },
  "San Francisco Bay Area Stadium":{ lat: 37.4033,lng: -121.9694,tz:"America/Los_Angeles", city: "Santa Clara, CA" },
  "Toronto Stadium":             { lat: 43.6333, lng: -79.4186, tz: "America/Toronto",     city: "Toronto, ON" },
  "Mexico City Stadium":         { lat: 19.3030, lng: -99.1506, tz: "America/Mexico_City", city: "Mexico City" },
  "Estadio Guadalajara":         { lat: 20.6709, lng: -103.4619,tz: "America/Mexico_City", city: "Guadalajara" },
  "Estadio Monterrey":           { lat: 25.6693, lng: -100.2439,tz: "America/Monterrey",   city: "Monterrey" },
};

const WMO_LABEL = {
  0:"Clear",1:"Mainly Clear",2:"Partly Cloudy",3:"Overcast",
  45:"Foggy",48:"Icy Fog",
  51:"Light Drizzle",53:"Drizzle",55:"Heavy Drizzle",
  61:"Light Rain",63:"Rain",65:"Heavy Rain",
  71:"Light Snow",73:"Snow",75:"Heavy Snow",
  80:"Showers",81:"Showers",82:"Heavy Showers",
  95:"Thunderstorm",96:"Thunderstorm",99:"Thunderstorm",
};
const WMO_EMOJI = {
  0:"☀️",1:"🌤",2:"⛅",3:"☁️",
  45:"🌫",48:"🌫",
  51:"🌦",53:"🌧",55:"🌧",
  61:"🌧",63:"🌧",65:"🌧",
  71:"🌨",73:"❄️",75:"❄️",
  80:"🌦",81:"🌧",82:"⛈",
  95:"⛈",96:"⛈",99:"⛈",
};

async function getWeather(venueName, dateStr) {
  // dateStr expected as "Jun 14" or "June 14" or "2026-06-14"
  // Normalize to YYYY-MM-DD
  try {
    const coords = Object.entries(VENUE_COORDS).find(([k]) =>
      venueName.toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(venueName.toLowerCase())
    );
    if (!coords) return null;
    const { lat, lng, tz } = coords[1];

    let isoDate;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      isoDate = dateStr.slice(0, 10);
    } else {
      const parsed = new Date(dateStr + " 2026");
      if (isNaN(parsed)) return null;
      isoDate = parsed.toISOString().slice(0, 10);
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=${encodeURIComponent(tz)}&start_date=${isoDate}&end_date=${isoDate}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    if (!d.daily?.weathercode?.length) return null;

    const code  = d.daily.weathercode[0];
    const tmax  = Math.round(d.daily.temperature_2m_max[0]);
    const tmin  = Math.round(d.daily.temperature_2m_min[0]);
    return {
      emoji:  WMO_EMOJI[code]  || "🌡",
      label:  WMO_LABEL[code]  || "Mixed",
      tmax,
      tmin,
      summary: `${WMO_EMOJI[code] || "🌡"} ${tmax}°F / ${tmin}°F · ${WMO_LABEL[code] || "Mixed"}`,
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const { home="Team A", away="Team B", hg, ag, group="", date="", venue="", stage="", p1, p2, predHg, predAg, format } = req.query;
  const hasPred = predHg !== undefined && predAg !== undefined;

  const hasScore   = hg !== undefined && ag !== undefined;
  const stageLabel = stage || (group ? `Group ${group}` : "World Cup 2026");
  const venueShort = venue ? venue.split(",")[0].trim() : "";

  // Venue coords for map links
  const venueEntry = venueShort
    ? Object.entries(VENUE_COORDS).find(([k]) =>
        venueShort.toLowerCase().includes(k.toLowerCase()) ||
        k.toLowerCase().includes(venueShort.toLowerCase())
      )
    : null;
  const venueCity  = venueEntry ? venueEntry[1].city : (venue ? venue.split(",").slice(1).join(",").trim() : "");
  const venueLabel = venueShort + (venueCity ? ` · ${venueCity}` : "");
  const venueLat   = venueEntry ? venueEntry[1].lat : null;
  const venueLng   = venueEntry ? venueEntry[1].lng : null;

  // Apple Maps deep link (works on iOS/macOS), falls back to Google Maps
  const appleMapsUrl  = venueLat
    ? `https://maps.apple.com/?ll=${venueLat},${venueLng}&q=${encodeURIComponent(venueShort)}`
    : venueShort ? `https://maps.apple.com/?q=${encodeURIComponent(venueShort)}` : "";
  const googleMapsUrl = venueLat
    ? `https://www.google.com/maps/search/?api=1&query=${venueLat},${venueLng}`
    : venueShort ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueShort)}` : "";

  // Weather (skip for image-only mode to keep it fast)
  let weather = null;
  if (format !== "image" && venueShort && date) {
    weather = await getWeather(venueShort, date);
  }

  // Weather tap URL — wttr.in city page (works in any browser, no app needed)
  const weatherUrl = venueCity
    ? `https://wttr.in/${encodeURIComponent(venueCity)}?m`
    : venueShort ? `https://wttr.in/${encodeURIComponent(venueShort)}?m` : "";

  const FLAGS = {
    "Mexico":"mx","South Africa":"za","South Korea":"kr","Czechia":"cz","Canada":"ca",
    "Bosnia & Herz.":"ba","Qatar":"qa","Switzerland":"ch","Brazil":"br","Morocco":"ma",
    "Haiti":"ht","Scotland":"gb-sct","United States":"us","Paraguay":"py","Australia":"au",
    "Turkiye":"tr","Germany":"de","Curacao":"cw","Ivory Coast":"ci","Ecuador":"ec",
    "Netherlands":"nl","Japan":"jp","Sweden":"se","Tunisia":"tn","Belgium":"be",
    "Egypt":"eg","Iran":"ir","New Zealand":"nz","Spain":"es","Cape Verde":"cv",
    "Saudi Arabia":"sa","Uruguay":"uy","France":"fr","Senegal":"sn","Iraq":"iq",
    "Norway":"no","Argentina":"ar","Algeria":"dz","Austria":"at","Jordan":"jo",
    "Portugal":"pt","DR Congo":"cd","Uzbekistan":"uz","Colombia":"co","England":"gb-eng",
    "Croatia":"hr","Ghana":"gh","Panama":"pa",
  };

  const flag = t => { const c = FLAGS[t]; return c ? `https://flagcdn.com/w160/${c}.png` : null; };
  const hf = flag(home);
  const af = flag(away);
  const sw = stageLabel.length * 10 + 32;

  const scoreBlock = hasScore
    ? `<text x="600" y="295" text-anchor="middle" font-size="100" font-weight="900" fill="#4ade80" font-family="monospace">${hg} - ${ag}</text>
       <text x="600" y="345" text-anchor="middle" font-size="26" font-weight="700" fill="#3d6a4d" letter-spacing="6">FULL TIME</text>`
    : `<text x="600" y="300" text-anchor="middle" font-size="72" font-weight="900" fill="#2a5a38" letter-spacing="8">VS</text>
       <text x="600" y="345" text-anchor="middle" font-size="26" font-weight="700" fill="#3d6a4d" letter-spacing="6">UPCOMING</text>`;

  const oddsBlock = (!hasScore && p1 && p2)
    ? `<rect x="280" y="400" width="640" height="72" rx="10" fill="rgba(74,222,128,0.08)" stroke="rgba(74,222,128,0.2)" stroke-width="1"/>
       <text x="600" y="424" text-anchor="middle" font-size="15" fill="#3d6a4d" font-family="system-ui" letter-spacing="2">POLYMARKET WIN PROBABILITY</text>
       <text x="370" y="458" text-anchor="middle" font-size="28" font-weight="900" fill="#4ade80" font-family="system-ui">${p1}%</text>
       <text x="600" y="458" text-anchor="middle" font-size="16" fill="#3d6a4d" font-family="system-ui">draw</text>
       <text x="830" y="458" text-anchor="middle" font-size="28" font-weight="900" fill="#38bdf8" font-family="system-ui">${p2}%</text>`
    : "";

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1200 630" width="1200" height="630">',
    '<defs>',
    '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
    '<stop offset="0%" style="stop-color:#060e0a"/><stop offset="50%" style="stop-color:#0c1a12"/><stop offset="100%" style="stop-color:#060e0a"/>',
    '</linearGradient>',
    '<linearGradient id="acc" x1="0%" y1="0%" x2="100%" y2="0%">',
    '<stop offset="0%" style="stop-color:#060e0a;stop-opacity:0"/><stop offset="50%" style="stop-color:#4ade80"/><stop offset="100%" style="stop-color:#060e0a;stop-opacity:0"/>',
    '</linearGradient>',
    `<clipPath id="hfc" clipPathUnits="userSpaceOnUse"><rect x="128" y="195" width="160" height="107" rx="8"/></clipPath>`,
    `<clipPath id="afc" clipPathUnits="userSpaceOnUse"><rect x="912" y="195" width="160" height="107" rx="8"/></clipPath>`,
    '</defs>',
    '<rect width="1200" height="630" fill="url(#bg)"/>',
    '<circle cx="1100" cy="80" r="280" fill="rgba(74,222,128,0.025)"/>',
    '<circle cx="100" cy="550" r="320" fill="rgba(74,222,128,0.025)"/>',
    '<text x="48" y="56" font-size="14" font-weight="700" fill="#3d6a4d" font-family="system-ui" letter-spacing="3">FIFA</text>',
    '<text x="48" y="86" font-size="26" font-weight="900" fill="#d4ead9" font-family="system-ui">WORLD CUP</text>',
    '<text x="48" y="116" font-size="26" font-weight="900" fill="#4ade80" font-family="system-ui">2026</text>',
    `<rect x="${1200-48-sw}" y="40" width="${sw}" height="40" rx="20" fill="rgba(74,222,128,0.12)" stroke="rgba(74,222,128,0.3)" stroke-width="1"/>`,
    `<text x="${1200-48-sw/2}" y="65" text-anchor="middle" font-size="22" font-weight="700" fill="#4ade80" font-family="system-ui">${stageLabel}</text>`,
    date ? `<text x="${1200-48}" y="98" text-anchor="end" font-size="20" fill="#7aaa8a" font-family="system-ui">${date}</text>` : "",
    hf ? `<image href="${hf}" x="128" y="195" width="160" height="107" clip-path="url(#hfc)" preserveAspectRatio="xMidYMid slice"/>` : "",
    `<text x="208" y="348" text-anchor="middle" font-size="44" font-weight="900" fill="#d4ead9" font-family="system-ui">${home}</text>`,
    scoreBlock,
    oddsBlock,
    af ? `<image href="${af}" x="912" y="195" width="160" height="107" clip-path="url(#afc)" preserveAspectRatio="xMidYMid slice"/>` : "",
    `<text x="992" y="348" text-anchor="middle" font-size="44" font-weight="900" fill="#d4ead9" font-family="system-ui">${away}</text>`,
    // User prediction on SVG
    hasPred ? `<rect x="440" y="490" width="320" height="70" rx="10" fill="#0d2815" stroke="#4ade80" stroke-width="1.5"/>
      <text x="600" y="512" text-anchor="middle" font-size="13" fill="#4ade80" font-family="system-ui" letter-spacing="2" font-weight="700">MY PREDICTION</text>
      <text x="600" y="548" text-anchor="middle" font-size="36" font-weight="900" fill="#4ade80" font-family="monospace">${predHg} - ${predAg}</text>` : "",
    venueShort ? `<text x="48" y="600" font-size="22" fill="#4ade80" font-family="system-ui">@ ${venueShort}</text>` : "",
    '<text x="1152" y="600" text-anchor="end" font-size="16" fill="#3d6a4d" font-family="system-ui">world-cup-app-iota.vercel.app</text>',
    '<rect x="0" y="627" width="1200" height="3" fill="url(#acc)"/>',
    '</svg>'
  ].join('\n');

  // SVG image mode — for OG meta tags
  if (format === "image") {
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(svg);
  }

  // HTML page mode
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host  = req.headers.host;
  const base  = proto + "://" + host;

  const imgParams = new URLSearchParams({ home, away, group, date, venue, stage, format: "image" });
  if (hg !== undefined) imgParams.set("hg", hg);
  if (ag !== undefined) imgParams.set("ag", ag);
  if (p1) imgParams.set("p1", p1);
  if (p2) imgParams.set("p2", p2);
  if (predHg !== undefined) imgParams.set("predHg", predHg);
  if (predAg !== undefined) imgParams.set("predAg", predAg);

  const ogImg  = base + "/api/og?" + imgParams.toString();
  const appUrl = base;
  const titleSafe = hasScore
    ? home + " " + hg + "-" + ag + " " + away + " - World Cup 2026"
    : home + " vs " + away + " - World Cup 2026";
  const descSafe = hasScore
    ? "Full time: " + home + " " + hg + "-" + ag + " " + away + " - " + stageLabel + (date ? " - " + date : "")
    : stageLabel + (date ? " - " + date : "") + " - Open to see odds, stats and more";

  // Venue row HTML — tappable, opens Maps (iOS detection via JS)
  const venueRowHtml = venueShort ? `
  <div class="row tappable" onclick="
    var ua=navigator.userAgent||'';
    var isApple=/iPhone|iPad|iPod|Macintosh/.test(ua)&&'ontouchend' in document||/Mac/.test(ua);
    window.open(isApple?'${appleMapsUrl}':'${googleMapsUrl}','_blank');
  ">
    <div class="ri">📍</div>
    <div>
      <div class="rl">VENUE</div>
      <div class="rv tap-blue">${venueLabel}</div>
      <div class="rs">Tap for directions</div>
    </div>
    <div class="tap-arrow">›</div>
  </div>` : "";

  // Weather row HTML — tappable, opens wttr.in
  const weatherRowHtml = weather ? `
  <div class="row tappable" onclick="window.open('${weatherUrl}','_blank')">
    <div class="ri">${weather.emoji}</div>
    <div>
      <div class="rl">MATCH DAY FORECAST</div>
      <div class="rv tap-blue">${weather.label} · ${weather.tmax}°F / ${weather.tmin}°F</div>
      <div class="rs">Tap for full forecast</div>
    </div>
    <div class="tap-arrow">›</div>
  </div>` : "";

  // Date/stage row
  const dateRowHtml = date ? `
  <div class="row">
    <div class="ri">📅</div>
    <div>
      <div class="rl">MATCH</div>
      <div class="rv">${stageLabel} · ${date}</div>
    </div>
  </div>` : "";

  // Odds row
  const oddsRowHtml = (!hasScore && p1 && p2) ? `
  <div class="row">
    <div class="ri">🎯</div>
    <div style="flex:1">
      <div class="rl">POLYMARKET WIN PROBABILITY</div>
      <div style="display:flex;gap:16px;margin-top:6px;align-items:center">
        <div style="text-align:center"><div style="font-size:24px;font-weight:900;color:#4ade80">${p1}%</div><div style="font-size:11px;color:#3d6a4d">${home}</div></div>
        <div style="flex:1;text-align:center;color:#3d6a4d">vs</div>
        <div style="text-align:center"><div style="font-size:24px;font-weight:900;color:#38bdf8">${p2}%</div><div style="font-size:11px;color:#3d6a4d">${away}</div></div>
      </div>
    </div>
  </div>` : "";

  // Prediction row
  const predRowHtml = hasPred ? `
  <div class="row" style="border-color:#4ade8044;background:#0d2815">
    <div class="ri">🔮</div>
    <div style="flex:1">
      <div class="rl">MY PREDICTION</div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:4px">
        <div style="font-size:11px;color:#7aaa8a;font-weight:600">${home}</div>
        <div style="font-size:28px;font-weight:900;color:#4ade80;font-family:monospace">${predHg} - ${predAg}</div>
        <div style="font-size:11px;color:#7aaa8a;font-weight:600">${away}</div>
      </div>
    </div>
  </div>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/>
<title>${titleSafe}</title>
<meta property="og:title" content="${titleSafe}"/>
<meta property="og:description" content="${descSafe}"/>
<meta property="og:image" content="${ogImg}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="${titleSafe}"/>
<meta property="og:url" content="${base + "/api/og?" + imgParams.toString().replace("&format=image","").replace("format=image&","").replace("format=image","") }"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="FIFA World Cup 2026"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="${ogImg}"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<link rel="apple-touch-icon" href="${appUrl}/icons/icon-192.png"/>
<link rel="apple-touch-icon" sizes="512x512" href="${appUrl}/icons/icon-512.png"/>
<link rel="shortcut icon" href="${appUrl}/icons/icon-192.png"/>
<meta name="apple-mobile-web-app-title" content="WC 2026"/>
<meta property="og:image:type" content="image/png"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#060e0a;font-family:system-ui,sans-serif;color:#d4ead9}
body{display:flex;flex-direction:column;align-items:center;padding-bottom:env(safe-area-inset-bottom,24px)}
.top{width:100%;background:linear-gradient(180deg,#0c1a12,#060e0a);padding:16px 16px 0;display:flex;flex-direction:column;align-items:center}
.card-wrap{width:100%;max-width:560px}
.logo{margin-bottom:12px;align-self:flex-start}
.logo-sm{font-size:10px;color:#3d6a4d;font-weight:700;letter-spacing:.2em}
.logo-wc{font-size:18px;font-weight:900;color:#d4ead9;line-height:1}
.logo-yr{font-size:18px;font-weight:900;color:#4ade80;line-height:1}
.card{width:100%;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.6)}
.card svg{width:100%;height:auto;display:block}
.section{width:100%;max-width:560px;padding:12px 16px 0}
.row{display:flex;align-items:center;gap:10px;padding:12px 14px;background:#0c1a12;border:1px solid #1a3828;border-radius:12px;margin-bottom:8px}
.tappable{cursor:pointer;transition:background .15s,border-color .15s}
.tappable:hover{background:#0f2218;border-color:#2a4f38}
.tappable:active{background:#142d1e}
.tap-arrow{margin-left:auto;font-size:20px;color:#3d6a4d;flex-shrink:0}
.ri{font-size:20px;flex-shrink:0}
.rl{font-size:11px;color:#3d6a4d;font-weight:600;margin-bottom:2px}
.rv{font-size:14px;color:#d4ead9;font-weight:600}
.tap-blue{color:#60a5fa}
.rs{font-size:12px;color:#7aaa8a;margin-top:2px}
.btns{display:flex;gap:10px;padding:16px 16px 0;width:100%;max-width:560px}
.btn{flex:1;padding:14px 0;border-radius:14px;font-weight:700;font-size:15px;cursor:pointer;border:none;text-align:center;text-decoration:none;display:block}
.green{background:linear-gradient(135deg,#4ade80,#22c55e);color:#030a05}
.outline{background:rgba(74,222,128,.1);color:#4ade80;border:1px solid rgba(74,222,128,.3)}
.hint{font-size:12px;color:#3d6a4d;text-align:center;line-height:1.6;padding:12px 16px 0;max-width:560px}
</style>
</head>
<body>
<div class="top">
  <div class="logo">
    <div class="logo-sm">FIFA</div>
    <div class="logo-wc">WORLD CUP</div>
    <div class="logo-yr">2026</div>
  </div>
  <div class="card-wrap">
    <div class="card">${svg}</div>
  </div>
</div>
<div class="section">
  ${venueRowHtml}
  ${weatherRowHtml}
  ${dateRowHtml}
  ${oddsRowHtml}
  ${predRowHtml}
</div>
<div class="btns">
  <a href="${appUrl}" class="btn green">⚽ Open App</a>
  <button class="btn outline" onclick="if(navigator.share){navigator.share({title:document.title,url:location.href})}else{navigator.clipboard.writeText(location.href);this.textContent='Copied!'}">📤 Share</button>
</div>
<p class="hint"><strong style="color:#4ade80">Don't have the app?</strong><br>iPhone: Safari → Share ↑ → Add to Home Screen<br>Android: Chrome → ⋯ → Add to Home Screen</p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.status(200).send(html);
}
