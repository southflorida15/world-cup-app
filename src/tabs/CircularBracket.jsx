import React, { useEffect, useRef, useState, useMemo } from "react";
import { displayTeamName } from "../i18n/display";

// ── CircularBracket ───────────────────────────────────────────────────────
// Canvas-based circular bracket with balanced top/bottom label spacing.
//
// Props:
//   bracket        – { r32[], r16[], qf[], sf[], final[] }
//   language       – "en" | "pt-BR"
//   C              – app colour tokens
//   FLAG_CODES_MAP – { [teamName]: "isoCode" }
//   onMatchTap     – optional (match) => void

const W = 580, H = 580, CX = W/2, CY = H/2;

// --- OPTIMIZED RADIAL SPACING ---
const RF   = 236; // Outer flag circle centers
const RB   = 210; // R32 bracket junction
const RW1  = 180; // R32 winners / R16 bracket ring (Circle 2)
const RW2  = 136; // R16 winners / QF bracket ring (Circle 3)
const RW3  =  94; // QF winners  / SF bracket ring (Circle 4)
const RW4  =  54; // SF winners  / Final bracket ring (Circle 5)
const RFIN =  22; // Center target radius

// --- UNIFORM FLAG SCALING ---
const FLAG_R = 17.5; // Outer flag circle radius
const WIN_SZ = { 
  r16: 17.5,   
  qf: 17.5,    
  sf: 17.5,    
  fin: 17.5    
};

const LINE_WIN  = "rgba(255,215,60,0.90)";
const LINE_DIM  = "rgba(255,215,60,0.38)";
const LINE_UPCOMING = "rgba(255,215,60,0.22)"; 
const LW        = 1.6;
const LW_DIM    = 0.8;

// Visual mapping order
const R32_ORDER = [74,77,73,75, 83,84,81,82, 76,78,79,80, 86,88,85,87];
const R16_ORDER = [89,90,93,94, 91,92,95,96];
const QF_ORDER  = [97,98,99,100];
const SF_ORDER  = [101,102];

function buildRanges(order, n) {
  const o = {};
  order.forEach((id, i) => { o[id] = [i*n, (i+1)*n]; });
  return o;
}
const R32_SEGS = buildRanges(R32_ORDER, 2);
const R16_SEGS = buildRanges(R16_ORDER, 4);
const QF_SEGS  = buildRanges(QF_ORDER,  8);
const SF_SEGS  = buildRanges(SF_ORDER,  16);

function degOf(i)  { return (i / 32) * 360; }
function toRad(d)  { return (d - 90) * Math.PI / 180; }
function pt(d, r)  { const a = toRad(d); return [CX + r*Math.cos(a), CY + r*Math.sin(a)]; }

export default function CircularBracket({
  bracket, language="en", C, FLAG_CODES_MAP={}, MATCHES=[], onMatchTap, getFlag: getF,
}) {
  const getFlag = getF || (() => "🏳");
  const canvasRef  = useRef(null);
  const imgsRef    = useRef({});
  const hitRef     = useRef([]);
  const [hovered, setHovered] = useState(null);
  const isPtBR = language === "pt-BR";
  const tx = (en, pt) => isPtBR ? pt : en;

  const col = {
    bg1:   "#1a1c26",
    bg2:   "#0d0e14",
    gold:  C?.gold  || "#fbbf24",
    green: C?.green || "#4ade80",
    mid:   C?.mid   || "#7aaa8a",
    dim:   C?.dim   || "#3d6a4d",
    s1:    C?.s1    || "#0c1a12",
    ring:  C?.b1    || "#1a3828",
  };

  const byId = {};
  ["r32","r16","qf","sf","final"].forEach(key => {
    (bracket?.[key] || []).forEach(m => { byId[Number(m.match)] = m; });
  });
  function getMatch(id) {
    return byId[id] || { match:id, home:null, away:null, winner:null };
  }

  const fullById = useMemo(() => {
    const map = {};
    (MATCHES || []).forEach(m => { map[m.id] = m; });
    return map;
  }, [MATCHES]);

  const slots = [];
  R32_ORDER.forEach(id => {
    const m = getMatch(id);
    slots.push({ team:m.home, matchId:id }, { team:m.away, matchId:id });
  });

  const FIFA3 = {
    "Mexico":"MEX","South Africa":"RSA","South Korea":"KOR","Czechia":"CZE",
    "Canada":"CAN","Bosnia & Herz.":"BIH","Qatar":"QAT","Switzerland":"SUI",
    "Brazil":"BRA","Morocco":"MAR","Haiti":"HAI","Scotland":"SCO",
    "United States":"USA","Paraguay":"PAR","Australia":"AUS","Turkiye":"TUR",
    "Germany":"GER","Curacao":"CUW","Ivory Coast":"CIV","Ecuador":"ECU",
    "Netherlands":"NED","Japan":"JPN","Sweden":"SWE","Tunisia":"TUN",
    "Belgium":"BEL","Egypt":"EGY","Iran":"IRN","New Zealand":"NZL",
    "Spain":"ESP","Cape Verde":"CPV","Saudi Arabia":"KSA","Uruguay":"URU",
    "France":"FRA","Senegal":"SEN","Iraq":"IRQ","Norway":"NOR",
    "Argentina":"ARG","Algeria":"ALG","Austria":"AUT","Jordan":"JOR",
    "Portugal":"POR","DR Congo":"COD","Uzbekistan":"UZB","Colombia":"COL",
    "England":"ENG","Croatia":"CRO","Ghana":"GHA","Panama":"PAN",
  };

  useEffect(() => {
    const needed = new Set(
      slots.map(s => FLAG_CODES_MAP[s.team]).filter(Boolean)
    );
    let pending = needed.size;
    if (pending === 0) { draw(); return; }
    needed.forEach(code => {
      if (imgsRef.current[code]) { if(--pending===0) draw(); return; }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = `https://flagcdn.com/w80/${code}.png`;
      img.onload = img.onerror = () => { if (--pending === 0) draw(); };
      imgsRef.current[code] = img;
    });
  }, [bracket, FLAG_CODES_MAP]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    hitRef.current = [];

    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, W*0.65);
    bg.addColorStop(0, col.bg1);
    bg.addColorStop(1, col.bg2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle radial guide rings
    [RB, RW1, RW2, RW3, RW4].forEach(r => {
      ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI*2);
      ctx.strokeStyle = "rgba(255,220,100,0.04)";
      ctx.lineWidth = 1; ctx.stroke();
    });

    function drawFlag(team, x, y, r, alpha=1, strokeCol=null, strokeW=1, glowCol=null) {
      if (!team) return;
      const code = FLAG_CODES_MAP[team];
      const img  = code ? imgsRef.current[code] : null;

      if (glowCol) {
        const g = ctx.createRadialGradient(x, y, r*0.2, x, y, r*2.4);
        g.addColorStop(0, glowCol);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r*2.4, 0, Math.PI*2); ctx.fill();
      }

      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.fillStyle = "rgba(25,27,36,1)"; ctx.fill();

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.arc(x, y, r-1, 0, Math.PI*2); ctx.clip();
        const fw = r*2.4, fh = fw*0.67;
        ctx.drawImage(img, x-fw/2, y-fh/2, fw, fh);
        ctx.restore();
      }

      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
      ctx.strokeStyle = strokeCol || "rgba(255,255,255,0.18)";
      ctx.lineWidth   = strokeW; ctx.stroke();
    }

    function line(x1,y1,x2,y2,col,lw) {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
      ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.stroke();
    }

    const innerFlags = []; 

    // QF lines
    {
      const SPOKE = 360/32;
      for (const [idStr, [s, e]] of Object.entries(QF_SEGS)) {
        const id = Number(idStr), m = getMatch(id);
        const hasW = !!m.winner;
        const lCol = hasW ? LINE_WIN : LINE_UPCOMING;
        const lW   = hasW ? LW : LW_DIM;
        const hAngle = degOf(s)   + 2*SPOKE;
        const aAngle = degOf(s+4) + 2*SPOKE;
        const wAngle = (hAngle + aAngle) / 2;
        const [hx,hy] = pt(hAngle, RW2);
        const [ax,ay] = pt(aAngle, RW2);
        const [wx,wy] = pt(wAngle, RW3);
        line(hx,hy, wx,wy, lCol, lW);
        line(ax,ay, wx,wy, lCol, lW);
        if (hasW) innerFlags.push({ team:m.winner, x:wx, y:wy, matchId:id, size: WIN_SZ.qf });
      }
    }

    // SF lines
    {
      for (const [idStr, [s, e]] of Object.entries(SF_SEGS)) {
        const id = Number(idStr), m = getMatch(id);
        const hasW = !!m.winner;
        const lCol = hasW ? LINE_WIN : LINE_UPCOMING;
        const lW   = hasW ? LW : LW_DIM;
        const hAngle = degOf(s+4);
        const aAngle = degOf(s+12);
        const wAngle = degOf(s+8);
        const [hx,hy] = pt(hAngle, RW3);
        const [ax,ay] = pt(aAngle, RW3);
        const [wx,wy] = pt(wAngle, RW4);
        line(hx,hy, wx,wy, lCol, lW);
        line(ax,ay, wx,wy, lCol, lW);
        if (hasW) innerFlags.push({ team:m.winner, x:wx, y:wy, matchId:id, size: WIN_SZ.sf });
      }
    }

    // Final lines
    {
      const m = getMatch(104);
      const hasW = !!m.winner;
      const lCol = hasW ? LINE_WIN : LINE_UPCOMING;
      const lW   = hasW ? LW : LW_DIM;

      const [h1x, h1y] = pt(degOf(8),  RW4);
      const [h2x, h2y] = pt(degOf(24), RW4);

      const [stop1x, stop1y] = pt(degOf(8),  RFIN + 1.5);
      const [stop2x, stop2y] = pt(degOf(24), RFIN + 1.5);

      line(h1x, h1y, stop1x, stop1y, lCol, lW);
      line(h2x, h2y, stop2x, stop2y, lCol, lW);
    }

    // R16 lines & flag path building
    for (const [idStr, [s, e]] of Object.entries(R16_SEGS)) {
      const id   = Number(idStr);
      const m    = getMatch(id);
      const hasW = !!m.winner;
      const SPOKE = 360/32;
      const hBarAngle   = degOf(s)   + SPOKE;
      const aBarAngle   = degOf(s+2) + SPOKE;
      const r16MidAngle = (hBarAngle + aBarAngle) / 2;
      const mH = getMatch(R32_ORDER[s >> 1]);
      const mA = getMatch(R32_ORDER[(s >> 1) + 1]);
      const hFlagA = degOf(s)   + SPOKE/2;
      const hFlagB = degOf(s+1) + SPOKE/2;
      const aFlagA = degOf(s+2) + SPOKE/2;
      const aFlagB = degOf(s+3) + SPOKE/2;
      const lCol    = "rgba(255,215,60,0.85)";
      const lW      = LW;
      const lColR16 = hasW ? LINE_WIN : LINE_UPCOMING;
      const lWR16   = hasW ? LW : LW_DIM;

      const [hBar_x, hBar_y] = pt(hBarAngle, RB);
      const [aBar_x, aBar_y] = pt(aBarAngle, RB);
      const [hW1x, hW1y]     = pt(hBarAngle, RW1);
      const [aW1x, aW1y]     = pt(aBarAngle, RW1);
      const junctionR         = (RW1 + RW2) / 2;
      const [jx, jy]          = pt(r16MidAngle, junctionR);
      const [r16InnerX, r16InnerY] = pt(r16MidAngle, RW2);

      [
        { match:mH, fA:hFlagA, fB:hFlagB, bx:hBar_x, by:hBar_y },
        { match:mA, fA:aFlagA, fB:aFlagB, bx:aBar_x, by:aBar_y },
      ].forEach(({ match, fA, fB, bx, by }) => {
        const [f1x,f1y] = pt(fA, RF - FLAG_R - 1);
        const [f2x,f2y] = pt(fB, RF - FLAG_R - 1);
        const teams = [match?.home, match?.away];
        const winner = match?.winner || null;
        const c1 = winner && teams[0] && teams[0] !== winner ? LINE_DIM : lCol;
        const c2 = winner && teams[1] && teams[1] !== winner ? LINE_DIM : lCol;
        const w1 = winner && teams[0] && teams[0] !== winner ? LW_DIM : lW;
        const w2 = winner && teams[1] && teams[1] !== winner ? LW_DIM : lW;
        line(f1x,f1y, bx,by, c1, w1);
        line(f2x,f2y, bx,by, c2, w2);
      });

      line(hBar_x, hBar_y, hW1x, hW1y, mH.winner ? LINE_WIN : lCol, mH.winner ? LW : lW);
      line(aBar_x, aBar_y, aW1x, aW1y, mA.winner ? LINE_WIN : lCol, mA.winner ? LW : lW);

      line(hW1x, hW1y, jx, jy, LINE_WIN, LW);
      line(aW1x, aW1y, jx, jy, LINE_WIN, LW);

      line(jx, jy, r16InnerX, r16InnerY, lColR16, lWR16);

      if (mH.winner) innerFlags.push({ team:mH.winner, x:hW1x,      y:hW1y,      matchId:R32_ORDER[s >> 1],       size: WIN_SZ.r16 });
      if (mA.winner) innerFlags.push({ team:mA.winner, x:aW1x,      y:aW1y,      matchId:R32_ORDER[(s >> 1) + 1], size: WIN_SZ.r16 });
      if (hasW)      innerFlags.push({ team:m.winner,  x:r16InnerX, y:r16InnerY, matchId:id,                      size: WIN_SZ.r16 });
    }

    // ── Outer flag circles ─────────────────────────────────────────────
    for (let i = 0; i < 32; i++) {
      const { team, matchId } = slots[i];
      const m     = getMatch(matchId);
      const isW   = m.winner === team;
      const isElim= m.winner && !isW;
      const angle = degOf(i) + 360/32/2;
      const [fx, fy] = pt(angle, RF);

      drawFlag(
        team, fx, fy, FLAG_R,
        isElim ? 0.28 : 1,
        isW    ? "rgba(255,215,60,0.9)"   :
        isElim ? "rgba(255,255,255,0.07)" :
                 "rgba(255,255,255,0.22)",
        isW ? 2 : 1,
        isW ? "rgba(255,200,40,0.35)" : null
      );

      hitRef.current.push({ x:fx, y:fy, r:FLAG_R+4, team, matchId });
    }

    // ── Inner winner flags ─────────────────────────────────────────────
    innerFlags.forEach(({ team, x, y, matchId, size }) => {
      drawFlag(team, x, y, size, 1,
        "rgba(255,215,60,0.85)", 1.5, "rgba(255,200,40,0.3)");
      if (matchId) hitRef.current.push({ x, y, r:size+4, team, matchId });
    });

    // ── 100% Horizontal Balanced Country Codes ─────────────────────────
    for (let i = 0; i < 32; i++) {
      const { team, matchId } = slots[i];
      const m      = getMatch(matchId);
      const isW    = m.winner === team;
      const isElim = m.winner && !isW;
      const angle  = degOf(i) + 360/32/2;
      const rad    = (angle % 360 + 360) % 360;
      
      const [baseX, baseY] = pt(angle, RF + FLAG_R + 5);
      let lx = baseX;
      let ly = baseY;

      ctx.save();
      ctx.font = `${isW ? "bold " : ""}9px system-ui, sans-serif`;
      ctx.textBaseline = "middle";

      // Extra vertical breathing room for top and bottom poles
      if (rad >= 315 || rad < 45) {
        ctx.textAlign = "center";
        ly = baseY - 7;
      } else if (rad >= 45 && rad < 135) {
        ctx.textAlign = "left";
        lx = baseX + 2;
      } else if (rad >= 135 && rad < 225) {
        ctx.textAlign = "center";
        ly = baseY + 8;
      } else {
        ctx.textAlign = "right";
        lx = baseX - 2;
      }

      const code = FIFA3[team] || (team ? team.slice(0,3).toUpperCase() : "");
      if (code) {
        ctx.fillStyle = isW    ? "rgba(255,215,60,0.95)"  :
                        isElim ? "rgba(255,255,255,0.22)" :
                                 "rgba(255,255,255,0.55)";
        ctx.fillText(code, lx, ly);
      }
      ctx.restore();
    }

    const tg = ctx.createRadialGradient(CX,CY,0,CX,CY,RW3*0.9);
    tg.addColorStop(0, "rgba(255,200,40,0.20)");
    tg.addColorStop(0.5,"rgba(255,170,20,0.06)");
    tg.addColorStop(1,  "rgba(0,0,0,0)");
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(CX,CY,RW3*0.9,0,Math.PI*2); ctx.fill();

    // ── Central Trophy / Champion slot ─────────────────────────────────
    const m104 = getMatch(104); 
    const champion = m104?.winner;

    if (champion) {
      drawFlag(
        champion, CX, CY, WIN_SZ.fin + 3.5, 1,
        "rgba(255,215,60,0.95)", 2, "rgba(255,200,40,0.45)"
      );
      hitRef.current.push({ x: CX, y: CY, r: WIN_SZ.fin + 6, team: champion, matchId: 104 });

      ctx.beginPath(); ctx.arc(CX + 13, CY + 13, 9, 0, Math.PI*2);
      ctx.fillStyle = "rgba(18,16,10,0.95)"; ctx.fill();
      ctx.strokeStyle = "rgba(255,215,60,0.9)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = "10px serif";
      ctx.fillText("🏆", CX + 13, CY + 14);
    } else {
      ctx.beginPath(); ctx.arc(CX,CY,RFIN,0,Math.PI*2);
      ctx.fillStyle = "rgba(18,16,10,0.95)"; ctx.fill();
      ctx.strokeStyle="rgba(255,200,40,0.45)"; ctx.lineWidth=1.5; ctx.stroke();

      ctx.font = `${RFIN*1.2}px serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("🏆", CX, CY+1);

      if (m104?.home || m104?.away) {
        hitRef.current.push({ x: CX, y: CY, r: RFIN + 4, team: null, matchId: 104 });
      }
    }
  }

  useEffect(() => { draw(); }, [bracket, language]);

  function getHit(e) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = W / rect.width, scaleY = H / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top)  * scaleY;
    for (const h of hitRef.current) {
      const dx=mx-h.x, dy=my-h.y;
      if (dx*dx+dy*dy < h.r*h.r) return h;
    }
    return null;
  }

  function onMouseMove(e) {
    const h = getHit(e);
    if (h) {
      canvasRef.current.style.cursor = "pointer";
      setHovered(h);
    } else {
      canvasRef.current.style.cursor = "default";
      setHovered(null);
    }
  }

  function onTap(e) {
    e.preventDefault();
    const h = getHit(e);
    if (h && onMatchTap) {
      const bracketM = byId[h.matchId];
      const fullM    = fullById[h.matchId];
      if (!bracketM || !bracketM.home || !bracketM.away) return;
      const m = fullM
        ? { ...fullM, home: bracketM.home, away: bracketM.away, winner: bracketM.winner }
        : bracketM;
      onMatchTap(m);
    }
  }

  const col2 = {
    gold:  C?.gold  || "#fbbf24",
    green: C?.green || "#4ade80",
    mid:   C?.mid   || "#7aaa8a",
    dim:   C?.dim   || "#3d6a4d",
    s1:    C?.s1    || "#0c1a12",
    ring:  C?.b1    || "#1a3828",
  };

  return (
    <div style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
      <div style={{ position:"relative", width:"100%", maxWidth:560 }}>
        <canvas
          ref={canvasRef}
          width={W} height={H}
          style={{ display:"block", width:"100%", borderRadius:12 }}
          onMouseMove={onMouseMove}
          onMouseLeave={() => { setHovered(null); }}
          onTouchStart={onTap}
          onClick={onTap}
        />
      </div>

      <div style={{
        width:"100%", maxWidth:420, minHeight:40,
        background:"rgba(255,255,255,0.04)",
        border:`1px solid rgba(255,200,50,0.12)`,
        borderRadius:10, padding:"9px 14px",
        fontSize:12, color:col2.mid,
        display:"flex", alignItems:"center", justifyContent:"center", gap:10,
      }}>
        {hovered ? (() => {
          const m = getMatch(hovered.matchId);
          const h = m.home || hovered.team || "TBD";
          const a = m.away || "TBD";
          const w = m.winner;
          const canTap = m.home && m.away;
          return (
            <>
              <span style={{ fontWeight:w===h?700:400, color:w===h?col2.gold:col2.mid }}>
                {h}{w===h&&" ✅"}
              </span>
              <span style={{ fontSize:10, color:col2.dim }}>vs</span>
              <span style={{ fontWeight:w===a?700:400, color:w===a?col2.gold:col2.mid }}>
                {w===a&&"✅ "}{a}
              </span>
              {canTap && <span style={{ fontSize:10, color:col2.dim }}>· tap to open</span>}
            </>
          );
        })() : (
          <span style={{ fontSize:10, color:col2.dim }}>
            {tx("Tap a flag to see the matchup","Toque em uma bandeira para ver o jogo")}
          </span>
        )}
      </div>

      <div style={{ fontSize:10, color:col2.dim, paddingBottom:4 }}>
        {tx("Winner flags advance inward toward the trophy",
           "Bandeiras dos vencedores avançam em direção ao troféu")}
      </div>
    </div>
  );
}