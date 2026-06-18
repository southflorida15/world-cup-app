// api/og.js
// Shared match page/OG renderer. It expects App.jsx to pass the same data shown in
// the in-app match modal: teams, flags, group/date/time, venue, weather, broadcast,
// simulator odds, and Polymarket values.
//
// Short-link support: passing ?save=1 with the full param set stores them in KV
// under a short id and returns {id}. Passing ?id=XXXX on a normal request expands
// back to the full params before rendering, so shared URLs can stay short
// (e.g. /api/og?id=ab12cd) instead of carrying every field in the query string.

import { Redis } from "@upstash/redis";
// @vercel/og's Node build is ESM-only; this project runs as CommonJS, so a
// static `import` here fails at load time with ERR_REQUIRE_ESM. Loading it
// dynamically inside the handler (see below) works in both module systems.
const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const SHORTLINK_TTL_SECONDS = 60 * 60 * 24 * 45; // 45 days — covers the whole tournament window

function shortId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

// Matches the FLAG_CODES map used elsewhere in the app (App.jsx) so flag
// images are visually consistent across the live app and shared OG cards.
const FLAG_CODES = {"Mexico":"mx","South Africa":"za","South Korea":"kr","Czechia":"cz","Canada":"ca","Bosnia & Herz.":"ba","Qatar":"qa","Switzerland":"ch","Brazil":"br","Morocco":"ma","Haiti":"ht","Scotland":"gb-sct","United States":"us","Paraguay":"py","Australia":"au","Turkiye":"tr","Germany":"de","Curacao":"cw","Ivory Coast":"ci","Ecuador":"ec","Netherlands":"nl","Japan":"jp","Sweden":"se","Tunisia":"tn","Belgium":"be","Egypt":"eg","Iran":"ir","New Zealand":"nz","Spain":"es","Cape Verde":"cv","Saudi Arabia":"sa","Uruguay":"uy","France":"fr","Senegal":"sn","Iraq":"iq","Norway":"no","Argentina":"ar","Algeria":"dz","Austria":"at","Jordan":"jo","Portugal":"pt","DR Congo":"cd","Uzbekistan":"uz","Colombia":"co","England":"gb-eng","Croatia":"hr","Ghana":"gh","Panama":"pa"};
function flagUrl(team) {
  const code = FLAG_CODES[team];
  return code ? `https://flagcdn.com/w160/${code}.png` : null;
}

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
    home, away, homeFlagUrl:q(req,'homeFlagUrl','')||flagUrl(home), awayFlagUrl:q(req,'awayFlagUrl','')||flagUrl(away),
    group:groupName(q(req,'group',q(req,'stage',''))), date:q(req,'date',''), time:q(req,'time',q(req,'kickoff','')), status:q(req,'status','Upcoming'),
    venue:q(req,'venue',q(req,'stadium','')), city:q(req,'city',''),
    tempLine:(f||c)?`${f||'—'}°F / ${c||'—'}°C`:q(req,'weather',''), condition:q(req,'condition',''), rain:q(req,'rain',q(req,'precip','')), wind:q(req,'wind',''),
    broadcast:q(req,'broadcast',q(req,'channel',q(req,'tv',''))), streaming:q(req,'streaming',''),
    homeSim:q(req,'homeSim',''), drawSim:q(req,'drawSim',''), awaySim:q(req,'awaySim',''),
    homePoly:q(req,'homePoly',q(req,'p1','')), awayPoly:q(req,'awayPoly',q(req,'p2','')), homeOdds:q(req,'homeOdds',''), awayOdds:q(req,'awayOdds',''),
    hg:q(req,'hg',''), ag:q(req,'ag','')
  };
}
function imgUrl(req){
  // If this request came in via a short id, keep using that id for the image
  // tag too (the crawler fetching og:image will hit this same expand path).
  if (req._ogShortId) {
    return `${base(req)}/api/og?id=${req._ogShortId}&image=1&v=${Date.now().toString(36)}`;
  }
  const u=new URLSearchParams(req.query); u.set('image','1'); if(!u.get('v')) u.set('v',Date.now().toString(36)); return `${base(req)}/api/og?${u}`;
}
function meta(d){ return [d.group,d.date,d.time].filter(Boolean).join(' • '); }
function scoreOrVs(d){ return d.hg!==''&&d.ag!=='' ? `${d.hg} – ${d.ag}` : 'VS'; }

function pngCard(d){
  const wxSub=[d.condition,d.rain?`${d.rain} rain`:'',d.wind].filter(Boolean).join(' • ');
  const showMarket=d.homeSim||d.drawSim||d.awaySim||d.homePoly||d.awayPoly;
  const metaLine = meta(d) || 'World Cup 2026';
  const score = scoreOrVs(d);

  const infoBox = (label, value, sub, color) => ({
    type: 'div',
    props: {
      style: { display:'flex', flexDirection:'column', flex:1, height:78, borderRadius:16, background:'#0a2114', border:'1.5px solid rgba(24,169,87,0.3)', padding:'11px 14px', justifyContent:'center' },
      children: [
        { type:'div', props:{ style:{ fontSize:10, fontWeight:800, color:'#82a98d', letterSpacing:1.5 }, children: label } },
        { type:'div', props:{ style:{ fontSize:14, fontWeight:800, color, marginTop:4, lineHeight:1.15 }, children: value } },
        ...(sub ? [{ type:'div', props:{ style:{ fontSize:10.5, fontWeight:600, color:'#a7cdb4', marginTop:3 }, children: sub } }] : []),
      ]
    }
  });

  // Three equal-weight probability boxes — mirrors the in-app simulator card
  // (flag+team / draw / flag+team), not a single squeezed "ODDS" line.
  const probBox = (label, pct, color, flagUrl) => ({
    type: 'div',
    props: {
      style: { display:'flex', flexDirection:'column', alignItems:'center', flex:1, height:78, borderRadius:16, background:`${color}14`, border:`1.5px solid ${color}55`, padding:'9px 8px', justifyContent:'center' },
      children: [
        { type:'div', props:{ style:{ display:'flex', alignItems:'center', gap:5 }, children: [
          ...(flagUrl ? [{ type:'img', props:{ src:flagUrl, width:18, height:13, style:{ borderRadius:2, objectFit:'cover' } } }] : []),
          { type:'div', props:{ style:{ fontSize:10.5, fontWeight:700, color:'#9fc5aa' }, children: label } },
        ]}},
        { type:'div', props:{ style:{ fontSize:22, fontWeight:900, color, marginTop:3 }, children: `${pct}%` } },
      ]
    }
  });

  const teamBlock = (flagUrl, name) => ({
    type: 'div',
    props: {
      style: { display:'flex', flexDirection:'column', alignItems:'center', width:170 },
      children: [
        ...(flagUrl ? [{ type:'img', props:{ src:flagUrl, width:46, height:32, style:{ borderRadius:3, objectFit:'cover' } } }] : []),
        { type:'div', props:{ style:{ fontSize:18, fontWeight:900, color:'#f1fff5', marginTop:6, textAlign:'center' }, children: name } },
      ]
    }
  });

  const homePct = d.homeSim || d.homePoly || '—';
  const drawPct = d.drawSim || '—';
  const awayPct = d.awaySim || d.awayPoly || '—';

  return {
    type: 'div',
    props: {
      style: { width:'1200px', height:'460px', display:'flex', flexDirection:'column', background:'linear-gradient(135deg, #06150d 0%, #020805 100%)', padding:'36px 56px', fontFamily:'Arial' },
      children: [
        { type:'div', props:{ style:{ display:'flex', flexDirection:'column' }, children:[
          { type:'div', props:{ style:{ fontSize:11, fontWeight:700, color:'#59d987', letterSpacing:3 }, children:'FIFA' } },
          { type:'div', props:{ style:{ display:'flex', alignItems:'baseline', gap:6, marginTop:1 }, children:[
            { type:'div', props:{ style:{ fontSize:19, fontWeight:800, color:'#e8fff0' }, children:'WORLD CUP' } },
            { type:'div', props:{ style:{ fontSize:19, fontWeight:800, color:'#49ee83' }, children:'2026' } },
          ]}},
        ]}},
        { type:'div', props:{ style:{ display:'flex', flexDirection:'column', marginTop:20, width:'100%', height:148, borderRadius:22, background:'linear-gradient(135deg, #102d1b, #06150d)', border:'1.5px solid rgba(24,169,87,0.45)', padding:'16px 36px', justifyContent:'center' }, children:[
          { type:'div', props:{ style:{ display:'flex', justifyContent:'center', fontSize:17, fontWeight:900, color:'#77f0a0' }, children: metaLine } },
          { type:'div', props:{ style:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14 }, children:[
            teamBlock(d.homeFlagUrl, d.home),
            { type:'div', props:{ style:{ display:'flex', flexDirection:'column', alignItems:'center' }, children:[
              { type:'div', props:{ style:{ fontSize:30, fontWeight:900, color:'#52e985' }, children: score } },
              { type:'div', props:{ style:{ fontSize:11, fontWeight:900, color:'#89c99f', letterSpacing:3, marginTop:3 }, children: String(d.status).toUpperCase() } },
            ]}},
            teamBlock(d.awayFlagUrl, d.away),
          ]}},
        ]}},
        ...(showMarket ? [
          { type:'div', props:{ style:{ display:'flex', justifyContent:'center', marginTop:16 }, children:[
            { type:'div', props:{ style:{ fontSize:12, fontWeight:800, color:'#6f9c80', letterSpacing:2 }, children:'WIN PROBABILITY' } },
          ]}},
          { type:'div', props:{ style:{ display:'flex', gap:12, marginTop:8 }, children:[
            probBox(d.home, homePct, '#4ade80', d.homeFlagUrl),
            probBox('Draw', drawPct, '#facc15', null),
            probBox(d.away, awayPct, '#f87171', d.awayFlagUrl),
          ]}},
        ] : [
          { type:'div', props:{ style:{ display:'flex', gap:12, marginTop:18 }, children:[
            infoBox('VENUE', d.venue||'Venue TBA', d.city||'', '#60a5fa'),
            infoBox('WEATHER', d.tempLine||'Forecast in app', wxSub, '#facc15'),
            infoBox('BROADCAST', d.broadcast||'Details in app', d.streaming||'', '#49ee83'),
          ]}},
        ]),
        { type:'div', props:{ style:{ display:'flex', justifyContent:'space-between', marginTop:22 }, children:[
          { type:'div', props:{ style:{ fontSize:16, fontWeight:800, color:'#49ee83' }, children:'World Cup 2026 Predictor' } },
          { type:'div', props:{ style:{ fontSize:14, fontWeight:700, color:'#4c7f5e' }, children:'world-cup-app-iota.vercel.app' } },
        ]}},
      ]
    }
  };
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
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"/><meta property="og:type" content="website"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:image" content="${esc(imgUrl(req))}"/><meta property="og:image:secure_url" content="${esc(imgUrl(req))}"/><meta property="og:image:type" content="image/png"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="460"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:image" content="${esc(imgUrl(req))}"/><style>
  :root{color-scheme:dark;--green:#4ade80;--text:#eafff0;--blue:#60a5fa}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0%,#0d2a18 0,#030905 42%,#010402 100%);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:var(--text)}.wrap{max-width:760px;margin:0 auto;padding:18px 18px calc(22px + env(safe-area-inset-bottom))}.brand{font-weight:1000;line-height:.98;margin:3px 0 14px}.brand small{display:block;letter-spacing:.32em;color:#72a981;font-size:12px;margin-bottom:3px}.brand .wc{font-size:25px}.brand .yr{font-size:30px;color:#4ade80}.hero{border:1px solid rgba(74,222,128,.28);background:linear-gradient(135deg,#0b2415,#06130b);border-radius:23px;padding:12px 14px 13px;box-shadow:0 10px 28px rgba(0,0,0,.28);overflow:hidden}.meta{text-align:center;color:#77f0a0;font-size:15px;font-weight:900;margin-bottom:7px}.teams{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;min-height:92px}.team{text-align:center}.flag{font-size:31px;line-height:1;margin-bottom:4px}.flag-img{width:44px;height:30px;object-fit:cover;border-radius:3px;margin:0 auto 4px;display:block;box-shadow:0 1px 3px rgba(0,0,0,.4)}.name{font-size:17px;font-weight:900}.vs{color:#45da78;font-size:24px;font-weight:1000;text-align:center}.status{text-align:center;color:#6fa780;font-size:10px;font-weight:900;letter-spacing:.18em;margin-top:2px}.details{margin-top:10px;display:grid;gap:8px}.row{display:grid;grid-template-columns:28px 1fr 16px;gap:9px;align-items:center;border:1px solid rgba(74,222,128,.24);background:rgba(9,31,18,.85);border-radius:17px;padding:10px 12px;text-decoration:none;color:inherit}.ico{font-size:20px}.label{font-size:10px;letter-spacing:.14em;font-weight:900;color:#80a98b;text-transform:uppercase;margin-bottom:3px}.value{font-size:17px;font-weight:900;color:var(--blue);line-height:1.15}.sub{font-size:13px;color:#9fc5aa;margin-top:2px;line-height:1.18}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:13px}.btn{border-radius:18px;padding:12px 10px;border:1px solid rgba(74,222,128,.34);background:#0b2415;color:#58e887;text-decoration:none;text-align:center;font-size:17px;font-weight:1000}.btn.primary{background:linear-gradient(135deg,#4ade80,#22c55e);color:#031008;border:0}.install{text-align:center;color:#77a484;font-size:13px;line-height:1.32;margin-top:10px}@media(min-width:700px){.brand .wc{font-size:36px}.brand .yr{font-size:42px}.flag{font-size:46px}.flag-img{width:64px;height:44px}.name{font-size:24px}.vs{font-size:36px}.teams{min-height:128px}.meta{font-size:22px}.value{font-size:22px}.sub{font-size:16px}.hero{padding:17px}.row{padding:14px}}
  </style></head><body><main class="wrap"><div class="brand"><small>FIFA</small><div class="wc">WORLD CUP</div><div class="yr">2026</div></div><section class="hero"><div class="meta">${esc(meta(d)||'World Cup 2026')}</div><div class="teams"><div class="team">${d.homeFlagUrl?`<img class="flag-img" src="${esc(d.homeFlagUrl)}" alt=""/>`:`<div class="flag">🏳️</div>`}<div class="name">${esc(d.home)}</div></div><div><div class="vs">${esc(scoreOrVs(d))}</div><div class="status">${esc(String(d.status).toUpperCase())}</div></div><div class="team">${d.awayFlagUrl?`<img class="flag-img" src="${esc(d.awayFlagUrl)}" alt=""/>`:`<div class="flag">🏳️</div>`}<div class="name">${esc(d.away)}</div></div></div></section><div class="details">${rows.map(r=>{const inner=`<div class="ico">${r[0]}</div><div><div class="label">${esc(r[1])}</div><div class="value">${esc(r[2])}</div>${r[3]?`<div class="sub">${esc(r[3])}</div>`:''}</div><div>${r[4]?'›':''}</div>`;return r[4]?`<a class="row" href="${esc(r[4])}" target="_blank" rel="noopener">${inner}</a>`:`<div class="row">${inner}</div>`}).join('')}</div><div class="actions"><a class="btn primary" href="${esc(base(req))}">⚽ Open App</a><button class="btn" onclick="navigator.share?navigator.share({title:${JSON.stringify(title)},text:${JSON.stringify(desc)},url:location.href}):navigator.clipboard.writeText(location.href)">📤 Share</button></div><div class="install"><strong>Don’t have the app?</strong><br/>iPhone: Safari → Share ↑ → Add to Home Screen<br/>Android: Chrome → ⋯ → Add to Home Screen</div></main></body></html>`;
}

export default async function handler(req,res){
  // Mode 1: save the current query params under a short id, return {id}.
  // App.jsx calls this once when building a share link, then uses the
  // short id in the actual URL it shares/copies.
  if (q(req,'save')==='1') {
    res.setHeader('Content-Type','application/json; charset=utf-8');
    try {
      const id = shortId();
      const params = { ...req.query };
      delete params.save;
      await kv.set(`og:${id}`, JSON.stringify(params), { ex: SHORTLINK_TTL_SECONDS });
      return res.status(200).json({ id });
    } catch (e) {
      console.error('[og] save error:', e.message);
      return res.status(500).json({ error: 'save_failed' });
    }
  }

  // Mode 2: expand a short id back into the full query before rendering.
  const shortIdParam = q(req,'id','');
  if (shortIdParam) {
    try {
      const stored = await kv.get(`og:${shortIdParam}`);
      if (stored) {
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
        req.query = { ...parsed, ...req.query };
        delete req.query.id;
        req._ogShortId = shortIdParam;
      }
    } catch (e) {
      console.error('[og] expand error:', e.message);
      // fall through and render with whatever query params were passed directly
    }
  }

  const d=data(req);
  if(q(req,'image')==='1'){
    try {
      const { ImageResponse } = await import('@vercel/og');
      const imageResponse = new ImageResponse(pngCard(d), { width: 1200, height: 460 });
      const buffer = await imageResponse.arrayBuffer();
      res.setHeader('Content-Type','image/png');
      res.setHeader('Cache-Control','public, max-age=300, s-maxage=300');
      return res.status(200).send(Buffer.from(buffer));
    } catch (e) {
      console.error('[og] PNG render error:', e.message);
      return res.status(500).send('Image render failed');
    }
  }
  res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','public, max-age=60, s-maxage=60');return res.status(200).send(html(req,d));
}
