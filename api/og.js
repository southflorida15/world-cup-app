// api/og.js
// Shared match page/OG renderer. It expects App.jsx to pass the same data shown in
// the in-app match modal: teams, flags, group/date/time, venue, weather, broadcast,
// simulator odds, and Polymarket values.

const FLAGS = {
  Brazil:'🇧🇷', Morocco:'🇲🇦', Scotland:'🏴', Haiti:'🇭🇹', Mexico:'🇲🇽', 'South Africa':'🇿🇦', 'South Korea':'🇰🇷', Czechia:'🇨🇿', Canada:'🇨🇦', Qatar:'🇶🇦', Switzerland:'🇨🇭', Spain:'🇪🇸', France:'🇫🇷', Germany:'🇩🇪', Argentina:'🇦🇷', Portugal:'🇵🇹', England:'🏴', Netherlands:'🇳🇱', Uruguay:'🇺🇾', Belgium:'🇧🇪', Japan:'🇯🇵', Australia:'🇦🇺', 'United States':'🇺🇸', Colombia:'🇨🇴', Senegal:'🇸🇳', Ghana:'🇬🇭', Iran:'🇮🇷', Tunisia:'🇹🇳', 'Saudi Arabia':'🇸🇦', Ecuador:'🇪🇨', Paraguay:'🇵🇾', Croatia:'🇭🇷', Sweden:'🇸🇪', Norway:'🇳🇴', Austria:'🇦🇹', Algeria:'🇩🇿', Egypt:'🇪🇬', Panama:'🇵🇦', 'New Zealand':'🇳🇿', Jordan:'🇯🇴', Iraq:'🇮🇶', Uzbekistan:'🇺🇿', Curacao:'🇨🇼', 'Cape Verde':'🇨🇻', 'DR Congo':'🇨🇩', 'Ivory Coast':'🇨🇮'
};

function esc(v='') { return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function q(req,k,d='') { const v=req.query?.[k]; return Array.isArray(v) ? (v[0]||d) : (v||d); }
function base(req) { return `${req.headers['x-forwarded-proto']||'https'}://${req.headers['x-forwarded-host']||req.headers.host||'world-cup-app-iota.vercel.app'}`; }
function groupName(g){ g=String(g||'').trim(); if(!g) return ''; if(/^group\s+/i.test(g)) return g.replace(/^group/i,'Group'); if(/^[A-L]$/i.test(g)) return `Group ${g.toUpperCase()}`; return g; }
function n(v){ const x=Number(String(v||'').replace(/[^\d.-]/g,'')); return Number.isFinite(x)?x:null; }
function cFromF(f){ const x=n(f); return x==null?'':Math.round((x-32)*5/9); }
function fFromC(c){ const x=n(c); return x==null?'':Math.round(x*9/5+32); }
function maps(venue,city){ return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue,city].filter(Boolean).join(', '))}`; }

function data(req){
  const home=q(req,'home',q(req,'homeTeam','Brazil')).trim();
  const away=q(req,'away',q(req,'awayTeam','Morocco')).trim();
  let f=q(req,'tempF',q(req,'fahrenheit','')); let c=q(req,'tempC',q(req,'celsius',''));
  if(!f && c) f=fFromC(c); if(!c && f) c=cFromF(f);
  return {
    home, away, homeFlag:q(req,'homeFlag',FLAGS[home]||'🏳️'), awayFlag:q(req,'awayFlag',FLAGS[away]||'🏳️'),
    group:groupName(q(req,'group',q(req,'stage',''))), date:q(req,'date',''), time:q(req,'time',q(req,'kickoff','')), status:q(req,'status','Upcoming'),
    venue:q(req,'venue',q(req,'stadium','')), city:q(req,'city',''),
    tempLine:(f||c)?`${f||'—'}°F / ${c||'—'}°C`:q(req,'weather',''), condition:q(req,'condition',''), rain:q(req,'rain',q(req,'precip','')), wind:q(req,'wind',''),
    broadcast:q(req,'broadcast',q(req,'channel',q(req,'tv',''))), streaming:q(req,'streaming',''),
    homeSim:q(req,'homeSim',''), drawSim:q(req,'drawSim',''), awaySim:q(req,'awaySim',''),
    homePoly:q(req,'homePoly',q(req,'p1','')), awayPoly:q(req,'awayPoly',q(req,'p2','')), homeOdds:q(req,'homeOdds',''), awayOdds:q(req,'awayOdds',''),
    hg:q(req,'hg',''), ag:q(req,'ag','')
  };
}
function imgUrl(req){ const u=new URLSearchParams(req.query); u.set('image','1'); if(!u.get('v')) u.set('v',Date.now().toString(36)); return `${base(req)}/api/og?${u}`; }
function meta(d){ return [d.group,d.date,d.time].filter(Boolean).join(' • '); }
function scoreOrVs(d){ return d.hg!==''&&d.ag!=='' ? `${d.hg}–${d.ag}` : 'VS'; }

function svg(d){
  const wxSub=[d.condition,d.rain?`${d.rain} rain`:'',d.wind].filter(Boolean).join(' • ');
  const showMarket=d.homeSim||d.drawSim||d.awaySim||d.homePoly||d.awayPoly;
  return `<?xml version="1.0" encoding="UTF-8"?><svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#06150d"/><stop offset="1" stop-color="#020805"/></linearGradient><linearGradient id="card" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#102d1b"/><stop offset="1" stop-color="#06150d"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#bg)"/><circle cx="1010" cy="105" r="290" fill="#0b3a20" opacity=".23"/>
  <text x="64" y="64" font-family="Arial" font-size="19" font-weight="800" fill="#59d987" letter-spacing="8">FIFA</text><text x="64" y="108" font-family="Arial" font-size="42" font-weight="900" fill="#e8fff0">WORLD CUP</text><text x="64" y="152" font-family="Arial" font-size="44" font-weight="900" fill="#49ee83">2026</text>
  <rect x="64" y="182" width="1072" height="178" rx="28" fill="url(#card)" stroke="#18a957" stroke-opacity=".45" stroke-width="2"/>
  <text x="600" y="227" font-family="Arial" font-size="26" font-weight="900" fill="#77f0a0" text-anchor="middle">${esc(meta(d)||'World Cup 2026')}</text>
  <text x="260" y="288" font-family="Apple Color Emoji,Segoe UI Emoji,Arial" font-size="48" text-anchor="middle">${esc(d.homeFlag)}</text><text x="260" y="328" font-family="Arial" font-size="28" font-weight="900" fill="#f1fff5" text-anchor="middle">${esc(d.home)}</text>
  <text x="600" y="300" font-family="Arial" font-size="40" font-weight="1000" fill="#52e985" text-anchor="middle">${esc(scoreOrVs(d))}</text><text x="600" y="329" font-family="Arial" font-size="15" font-weight="900" fill="#89c99f" text-anchor="middle" letter-spacing="5">${esc(String(d.status).toUpperCase())}</text>
  <text x="940" y="288" font-family="Apple Color Emoji,Segoe UI Emoji,Arial" font-size="48" text-anchor="middle">${esc(d.awayFlag)}</text><text x="940" y="328" font-family="Arial" font-size="28" font-weight="900" fill="#f1fff5" text-anchor="middle">${esc(d.away)}</text>
  <rect x="64" y="386" width="336" height="96" rx="22" fill="#0a2114" stroke="#18a957" stroke-opacity=".30"/><text x="96" y="419" font-family="Arial" font-size="14" font-weight="900" fill="#82a98d" letter-spacing="4">VENUE</text><text x="96" y="450" font-family="Arial" font-size="22" font-weight="900" fill="#60a5fa">${esc(d.venue||'Venue TBA')}</text><text x="96" y="474" font-family="Arial" font-size="15" font-weight="700" fill="#a7cdb4">${esc(d.city)}</text>
  <rect x="432" y="386" width="336" height="96" rx="22" fill="#0a2114" stroke="#18a957" stroke-opacity=".30"/><text x="464" y="419" font-family="Arial" font-size="14" font-weight="900" fill="#82a98d" letter-spacing="4">WEATHER</text><text x="464" y="450" font-family="Arial" font-size="22" font-weight="900" fill="#facc15">${esc(d.tempLine||'Forecast in app')}</text><text x="464" y="474" font-family="Arial" font-size="15" font-weight="700" fill="#a7cdb4">${esc(wxSub)}</text>
  <rect x="800" y="386" width="336" height="96" rx="22" fill="#0a2114" stroke="#18a957" stroke-opacity=".30"/><text x="832" y="419" font-family="Arial" font-size="14" font-weight="900" fill="#82a98d" letter-spacing="4">${showMarket?'ODDS':'BROADCAST'}</text><text x="832" y="450" font-family="Arial" font-size="22" font-weight="900" fill="#49ee83">${esc(showMarket ? `${d.homeSim||d.homePoly||'—'} / ${d.drawSim||'—'} / ${d.awaySim||d.awayPoly||'—'}` : (d.broadcast||'Details in app'))}</text><text x="832" y="474" font-family="Arial" font-size="15" font-weight="700" fill="#a7cdb4">${esc(showMarket ? `Home / Draw / Away${d.broadcast?' · '+d.broadcast:''}` : d.streaming)}</text>
  <text x="64" y="590" font-family="Arial" font-size="23" font-weight="850" fill="#49ee83">World Cup 2026 Predictor</text><text x="1136" y="590" font-family="Arial" font-size="20" font-weight="700" fill="#4c7f5e" text-anchor="end">world-cup-app-iota.vercel.app</text></svg>`;
}

function html(req,d){
  const title=`${d.home} vs ${d.away} · World Cup 2026`, desc=[meta(d),d.venue].filter(Boolean).join(' • '), wxSub=[d.condition,d.rain?`${d.rain} rain`:'',d.wind].filter(Boolean).join(' • '), showMarket=d.homeSim||d.drawSim||d.awaySim||d.homePoly||d.awayPoly;
  const rows=[]; if(d.venue||d.city) rows.push(['📍','Venue',d.venue||'Venue TBA',d.city||'Tap for directions',maps(d.venue,d.city)]); if(d.tempLine||wxSub) rows.push(['🌤️','Match Conditions',d.tempLine||'Forecast in app',wxSub]); if(showMarket){

  rows.push([

    '🎲',

    'Win Probability',

    `${d.home}: ${d.homeSim || d.homePoly || '—'}%`,

    `Draw: ${d.drawSim || '—'}% • ${d.away}: ${d.awaySim || d.awayPoly || '—'}%`

  ]);

}

if(d.broadcast){

  rows.push([

    '📺',

    'Broadcast',

    d.broadcast,

    d.streaming || 'Check local listings'

  ]);

}
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"/><meta property="og:type" content="website"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:image" content="${esc(imgUrl(req))}"/><meta property="og:image:secure_url" content="${esc(imgUrl(req))}"/><meta property="og:image:type" content="image/svg+xml"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:image" content="${esc(imgUrl(req))}"/><style>
  :root{color-scheme:dark;--green:#4ade80;--text:#eafff0;--blue:#60a5fa}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0%,#0d2a18 0,#030905 42%,#010402 100%);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:var(--text)}.wrap{max-width:760px;margin:0 auto;padding:18px 18px calc(22px + env(safe-area-inset-bottom))}.brand{font-weight:1000;line-height:.98;margin:3px 0 14px}.brand small{display:block;letter-spacing:.32em;color:#72a981;font-size:12px;margin-bottom:3px}.brand .wc{font-size:25px}.brand .yr{font-size:30px;color:#4ade80}.hero{border:1px solid rgba(74,222,128,.28);background:linear-gradient(135deg,#0b2415,#06130b);border-radius:23px;padding:12px 14px 13px;box-shadow:0 10px 28px rgba(0,0,0,.28);overflow:hidden}.meta{text-align:center;color:#77f0a0;font-size:15px;font-weight:900;margin-bottom:7px}.teams{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;min-height:92px}.team{text-align:center}.flag{font-size:31px;line-height:1;margin-bottom:4px}.name{font-size:17px;font-weight:900}.vs{color:#45da78;font-size:24px;font-weight:1000;text-align:center}.status{text-align:center;color:#6fa780;font-size:10px;font-weight:900;letter-spacing:.18em;margin-top:2px}.details{margin-top:10px;display:grid;gap:8px}.row{display:grid;grid-template-columns:28px 1fr 16px;gap:9px;align-items:center;border:1px solid rgba(74,222,128,.24);background:rgba(9,31,18,.85);border-radius:17px;padding:10px 12px;text-decoration:none;color:inherit}.ico{font-size:20px}.label{font-size:10px;letter-spacing:.14em;font-weight:900;color:#80a98b;text-transform:uppercase;margin-bottom:3px}.value{font-size:17px;font-weight:900;color:var(--blue);line-height:1.15}.sub{font-size:13px;color:#9fc5aa;margin-top:2px;line-height:1.18}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:13px}.btn{border-radius:18px;padding:12px 10px;border:1px solid rgba(74,222,128,.34);background:#0b2415;color:#58e887;text-decoration:none;text-align:center;font-size:17px;font-weight:1000}.btn.primary{background:linear-gradient(135deg,#4ade80,#22c55e);color:#031008;border:0}.install{text-align:center;color:#77a484;font-size:13px;line-height:1.32;margin-top:10px}@media(min-width:700px){.brand .wc{font-size:36px}.brand .yr{font-size:42px}.flag{font-size:46px}.name{font-size:24px}.vs{font-size:36px}.teams{min-height:128px}.meta{font-size:22px}.value{font-size:22px}.sub{font-size:16px}.hero{padding:17px}.row{padding:14px}}
  </style></head><body><main class="wrap"><div class="brand"><small>FIFA</small><div class="wc">WORLD CUP</div><div class="yr">2026</div></div><section class="hero"><div class="meta">${esc(meta(d)||'World Cup 2026')}</div><div class="teams"><div class="team"><div class="flag">${esc(d.homeFlag)}</div><div class="name">${esc(d.home)}</div></div><div><div class="vs">${esc(scoreOrVs(d))}</div><div class="status">${esc(String(d.status).toUpperCase())}</div></div><div class="team"><div class="flag">${esc(d.awayFlag)}</div><div class="name">${esc(d.away)}</div></div></div></section><div class="details">${rows.map(r=>{const inner=`<div class="ico">${r[0]}</div><div><div class="label">${esc(r[1])}</div><div class="value">${esc(r[2])}</div>${r[3]?`<div class="sub">${esc(r[3])}</div>`:''}</div><div>${r[4]?'›':''}</div>`;return r[4]?`<a class="row" href="${esc(r[4])}" target="_blank" rel="noopener">${inner}</a>`:`<div class="row">${inner}</div>`}).join('')}</div><div class="actions"><a class="btn primary" href="${esc(base(req))}">⚽ Open App</a><button class="btn" onclick="navigator.share?navigator.share({title:${JSON.stringify(title)},text:${JSON.stringify(desc)},url:location.href}):navigator.clipboard.writeText(location.href)">📤 Share</button></div><div class="install"><strong>Don’t have the app?</strong><br/>iPhone: Safari → Share ↑ → Add to Home Screen<br/>Android: Chrome → ⋯ → Add to Home Screen</div></main></body></html>`;
}

export default function handler(req,res){ const d=data(req); if(q(req,'image')==='1'){res.setHeader('Content-Type','image/svg+xml; charset=utf-8');res.setHeader('Cache-Control','public, max-age=300, s-maxage=300');return res.status(200).send(svg(d));} res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','public, max-age=60, s-maxage=60');return res.status(200).send(html(req,d)); }
