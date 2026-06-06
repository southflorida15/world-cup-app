// /api/og.js
// Generates a dynamic match card image for sharing
// Uses canvas via node-canvas (no edge runtime needed)
// Usage: /api/og?home=Brazil&away=France&hg=2&ag=1&group=C&date=Jun+13

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

  // Build SVG — works everywhere, no dependencies
  const homeFlagUrl = flagUrl(home);
  const awayFlagUrl = flagUrl(away);

  const scoreHtml = hasScore
    ? `<text x="600" y="310" text-anchor="middle" font-size="120" font-weight="900" fill="#4ade80" font-family="monospace">${hg} – ${ag}</text>
       <text x="600" y="365" text-anchor="middle" font-size="18" font-weight="700" fill="#3d6a4d" letter-spacing="4">FULL TIME</text>`
    : `<text x="600" y="320" text-anchor="middle" font-size="64" font-weight="900" fill="#1a3828" letter-spacing="12">VS</text>
       <text x="600" y="365" text-anchor="middle" font-size="18" font-weight="700" fill="#3d6a4d" letter-spacing="4">UPCOMING</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
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
    <clipPath id="flagClip"><rect width="160" height="107" rx="8"/></clipPath>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  
  <!-- Subtle circles -->
  <circle cx="1100" cy="100" r="300" fill="rgba(74,222,128,0.02)"/>
  <circle cx="100" cy="530" r="350" fill="rgba(74,222,128,0.02)"/>

  <!-- Top: FIFA branding -->
  <text x="48" y="60" font-size="13" font-weight="700" fill="#3d6a4d" font-family="system-ui" letter-spacing="3">FIFA</text>
  <text x="48" y="88" font-size="24" font-weight="900" fill="#d4ead9" font-family="system-ui">WORLD CUP</text>
  <text x="48" y="116" font-size="24" font-weight="900" fill="#4ade80" font-family="system-ui">2026™</text>

  <!-- Stage badge -->
  <rect x="${1200 - 48 - (stageLabel.length * 10 + 32)}" y="42" width="${stageLabel.length * 10 + 32}" height="36" rx="18" fill="rgba(74,222,128,0.15)" stroke="rgba(74,222,128,0.3)" stroke-width="1"/>
  <text x="${1200 - 48 - (stageLabel.length * 5)}" y="66" text-anchor="middle" font-size="16" font-weight="700" fill="#4ade80" font-family="system-ui">${stageLabel}</text>

  <!-- Date -->
  ${date ? `<text x="${1200-48}" y="98" text-anchor="end" font-size="14" fill="#3d6a4d" font-family="system-ui">${date}</text>` : ""}

  <!-- Home flag -->
  ${homeFlagUrl ? `<image href="${homeFlagUrl}" x="148" y="220" width="160" height="107" clip-path="url(#flagClip)" preserveAspectRatio="xMidYMid slice"/>` : ""}
  
  <!-- Home team name -->
  <text x="228" y="370" text-anchor="middle" font-size="32" font-weight="800" fill="#d4ead9" font-family="system-ui">${home}</text>

  <!-- Score or VS -->
  ${scoreHtml}

  <!-- Away flag -->
  ${awayFlagUrl ? `<image href="${awayFlagUrl}" x="892" y="220" width="160" height="107" clip-path="url(#flagClip)" preserveAspectRatio="xMidYMid slice"/>` : ""}

  <!-- Away team name -->
  <text x="972" y="370" text-anchor="middle" font-size="32" font-weight="800" fill="#d4ead9" font-family="system-ui">${away}</text>

  <!-- Venue -->
  ${venue ? `<text x="48" y="600" font-size="13" fill="#3d6a4d" font-family="system-ui">📍 ${venue.split(",")[0]}</text>` : ""}

  <!-- App URL -->
  <text x="1152" y="600" text-anchor="end" font-size="13" fill="#3d6a4d" font-family="system-ui">world-cup-app-iota.vercel.app</text>

  <!-- Bottom accent line -->
  <rect x="0" y="627" width="1200" height="3" fill="url(#accent)"/>
</svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send(svg);
}