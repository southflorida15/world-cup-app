import React, { useEffect, useRef, useState } from "react";
import { displayTeamName } from "../i18n/display";

// ── CircularBracket ───────────────────────────────────────────────────────
// Canvas-based circular bracket. Flag circles on outer ring, thin bracket
// lines converging inward, winner flags propagate toward the trophy.
//
// Props:
//   bracket        – { r32[], r16[], qf[], sf[], final[] }
//   language       – "en" | "pt-BR"
//   C              – app colour tokens
//   FLAG_CODES_MAP – { [teamName]: "isoCode" }
//   onMatchTap     – optional (match) => void

const W = 580, H = 580, CX = W/2, CY = H/2;

// Ring radii
const RF   = 248; // outer flag circle centres
const RB   = 196; // R32 bracket junction (where 2 outer flags converge)
// Winner flags sit ON the inner bracket rings — they ARE the junction
const RW1  = 160; // R32 winners / R16 bracket ring
const RW2  = 118; // R16 winners / QF bracket ring  
const RW3  =  80; // QF winners  / SF bracket ring
const RW4  =  48; // SF winners  / Final bracket ring
const RFIN =  22; // Trophy centre

const FLAG_R = 22; // outer flag circle radius

// Winner flag sizes at each inner ring
const WIN_SZ = { r16:13, qf:16, sf:20, fin:24 };

const LINE_WIN  = "rgba(255,215,60,0.88)";
const LINE_DIM  = "rgba(255,255,255,0.10)";
const LINE_UPCOMING = "rgba(255,215,60,0.28)"; // upcoming inner rounds — gold tint, visible
const LW        = 1.6;
const LW_DIM    = 0.8;

const R32_ORDER = [73,75,74,77, 76,78,79,80, 83,84,81,82, 86,88,85,87];
const R16_ORDER = [89,90,91,92, 93,94,95,96];
const QF_ORDER  = [97,99,98,100];
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
  bracket, language="en", C, FLAG_CODES_MAP={}, onMatchTap,
}) {
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

  // Index bracket matches by id
  const byId = {};
  ["r32","r16","qf","sf","final"].forEach(key => {
    (bracket?.[key] || []).forEach(m => { byId[Number(m.match)] = m; });
  });
  function getMatch(id) {
    return byId[id] || { match:id, home:null, away:null, winner:null };
  }

  // Build 32 outer slots from R32_ORDER
  const slots = [];
  R32_ORDER.forEach(id => {
    const m = getMatch(id);
    slots.push({ team:m.home, matchId:id }, { team:m.away, matchId:id });
  });

  // FIFA official 3-letter country codes
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

  // ── Main draw ─────────────────────────────────────────────────────────
  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    hitRef.current = [];

    ctx.clearRect(0, 0, W, H);

    // Background
    const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, W*0.65);
    bg.addColorStop(0, col.bg1);
    bg.addColorStop(1, col.bg2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle ring guides
    [RB, RW1, RW2, RW3, RW4].forEach(r => {
      ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI*2);
      ctx.strokeStyle = "rgba(255,220,100,0.05)";
      ctx.lineWidth = 1; ctx.stroke();
    });

    // ── Helper: draw a flag image clipped to a circle ──────────────────
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
    function arc(r,a1,a2,col,lw) {
      ctx.beginPath(); ctx.arc(CX,CY,r,toRad(a1),toRad(a2),false);
      ctx.strokeStyle=col; ctx.lineWidth=lw; ctx.stroke();
    }
    function dot(x,y,r,col) {
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fillStyle=col; ctx.fill();
    }

    // ── Draw bracket lines + inner winner flags for one round ──────────
    // ── Draw bracket lines for one round ──────────────────────────────
    // Structure per match:
    //   1. Two spokes from rOuter → endpoints of a bracket arc at rOuter
    //   2. Short arc at rOuter connecting the two endpoints (the "match bar")
    //   3. One spoke from the midpoint of that arc → rInner (continues inward)
    //   4. Winner flag at rInner (centred on the match midpoint angle)
    // ── Core draw logic ───────────────────────────────────────────────
    // For each match:
    //   1. Arc at rOuter connecting the two input positions (the "match bar")
    //   2. Two spokes from the match bar endpoints → converge at rWinner (the winner flag)
    //   3. Winner flag drawn AT rWinner
    //   4. Caller is responsible for drawing the next spoke FROM rWinner inward

    function drawMatchBar(segs, rOuter, rWinner) {
      for (const [idStr, [s, e]] of Object.entries(segs)) {
        const id = Number(idStr);
        const m  = getMatch(id);
        const a1 = degOf(s), a2 = degOf(e);
        const am = (a1 + a2) / 2; // match midpoint = winner angle
        const hA = (a1 + am) / 2; // home input angle
        const aA = (am + a2) / 2; // away input angle
        const hasW = !!m.winner;
        const lCol = hasW ? LINE_WIN : LINE_UPCOMING;
        const lW   = hasW ? LW : LW_DIM;

        // Match bar arc at rOuter
        arc(rOuter, hA+0.5, aA-0.5, lCol, lW);

        // Two spokes converging on the winner position at rWinner
        const [hx, hy] = pt(hA, rOuter);
        const [ax, ay] = pt(aA, rOuter);
        const [wx, wy] = pt(am, rWinner);
        line(hx, hy, wx, wy, lCol, lW);
        line(ax, ay, wx, wy, lCol, lW);

        // Winner flag AT the convergence point (rWinner)
        if (hasW) {
          drawFlag(m.winner, wx, wy, FLAG_R, 1,
            "rgba(255,215,60,0.85)", 1.5, "rgba(255,200,40,0.3)");
        }
      }
    }

    // ── Draw all rounds ───────────────────────────────────────────────
    // R32: outer flags (at RF edge) → bar at RB → winner flag at RW1
    // Then spoke from each RW1 flag → bar at RW1 connecting R16 pairs → R16 winner at RW2
    // etc.

    // QF/SF/Final use drawMatchBar with winner flags landing on the next ring
    // They're drawn BEFORE the R16 section so flags render on top of lines

    // SF: two QF winners (at RW3) → converge at RW4
    drawMatchBar(SF_SEGS, RW3, RW4);
    // QF: two R16 winners (at RW2) → converge at RW3
    drawMatchBar(QF_SEGS, RW2, RW3);
    // Final: two SF winners (at RW4) → converge at trophy
    {
      const m = getMatch(104);
      const hasW = !!m.winner;
      const lCol = hasW ? LINE_WIN : LINE_UPCOMING;
      const lW   = hasW ? LW : LW_DIM;
      // SF101 winner sits at am=90° at RW4, SF102 winner at am=270° at RW4
      const [h1x,h1y] = pt(90,  RW4);
      const [h2x,h2y] = pt(270, RW4);
      const [cx, cy]  = pt(0,   RFIN); // converge at centre (trophy)
      line(h1x,h1y, cx,cy, lCol, lW);
      line(h2x,h2y, cx,cy, lCol, lW);
    }

    // ── R16 pairing: outer flags → R32 bar → R32 winner AT RW1 → R16 bar → R16 winner AT RW2 ──
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
      const lCol = "rgba(255,215,60,0.85)";
      const lW   = LW;
      const lColR16 = hasW ? LINE_WIN : LINE_UPCOMING;
      const lWR16   = hasW ? LW : LW_DIM;

      // R32 bar midpoints at RB
      const [hBar_x, hBar_y] = pt(hBarAngle, RB);
      const [aBar_x, aBar_y] = pt(aBarAngle, RB);

      // 1. Outer flags → R32 bar at RB
      [[hFlagA, hFlagB], [aFlagA, aFlagB]].forEach(([fA, fB], side) => {
        const [bx, by] = side === 0 ? [hBar_x, hBar_y] : [aBar_x, aBar_y];
        [fA, fB].forEach(a => {
          const [fx, fy] = pt(a, RF - FLAG_R - 1);
          line(fx, fy, bx, by, lCol, lW);
        });
      });

      // 2. R32 bar → R32 winner flag AT RW1
      const [hW1x, hW1y] = pt(hBarAngle, RW1);
      const [aW1x, aW1y] = pt(aBarAngle, RW1);
      line(hBar_x, hBar_y, hW1x, hW1y, lCol, lW);
      line(aBar_x, aBar_y, aW1x, aW1y, lCol, lW);

      // 3. R32 winner flags AT RW1 (drawn on top of lines)
      if (mH.winner) drawFlag(mH.winner, hW1x, hW1y, FLAG_R, 1,
        "rgba(255,215,60,0.85)", 1.5, "rgba(255,200,40,0.3)");
      if (mA.winner) drawFlag(mA.winner, aW1x, aW1y, FLAG_R, 1,
        "rgba(255,215,60,0.85)", 1.5, "rgba(255,200,40,0.3)");

      // 4. From each R32 winner flag → converge inward to R16 junction
      //    Junction sits INSIDE RW1 at radius RW1*0.78, at the match midpoint angle
      //    This makes the connecting line clearly visible between the two R32 winner flags
      const junctionR = (RW1 + RW2) / 2;  // midway between RW1 and RW2
      const [jx, jy] = pt(r16MidAngle, junctionR);
      line(hW1x, hW1y, jx, jy, lColR16, lWR16);
      line(aW1x, aW1y, jx, jy, lColR16, lWR16);

      // 5. Single spoke inward: junction → R16 winner AT RW2
      const [r16InnerX, r16InnerY] = pt(r16MidAngle, RW2);
      line(jx, jy, r16InnerX, r16InnerY, lColR16, lWR16);

      // 6. R16 winner flag AT RW2
      if (hasW) drawFlag(m.winner, r16InnerX, r16InnerY, FLAG_R, 1,
        "rgba(255,215,60,0.85)", 1.5, "rgba(255,200,40,0.3)");
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

      hitRef.current.push({ x:fx, y:fy, r:FLAG_R+5, team, matchId });
    }

    // ── 3-letter country codes outside the flag ring ───────────────────
    for (let i = 0; i < 32; i++) {
      const { team, matchId } = slots[i];
      const m      = getMatch(matchId);
      const isW    = m.winner === team;
      const isElim = m.winner && !isW;
      const angle  = degOf(i) + 360/32/2;
      const labelR = RF + FLAG_R + 10;
      const [lx, ly] = pt(angle, labelR);

      const code = FIFA3[team] || (team ? team.slice(0,3).toUpperCase() : "");
      if (!code) continue;

      ctx.save();
      ctx.translate(lx, ly);
      // Rotate text to read outward from centre
      const flip = angle > 180;
      ctx.rotate(toRad(flip ? angle + 90 : angle - 90));
      if (flip) ctx.rotate(Math.PI);

      ctx.font = `${isW ? "bold " : ""}9px system-ui, sans-serif`;
      ctx.textAlign  = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle  = isW ? "rgba(255,215,60,0.95)" : isElim ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.55)";
      ctx.fillText(code, 0, 0);
      ctx.restore();
    }


    const tg = ctx.createRadialGradient(CX,CY,0,CX,CY,RW3*0.9);
    tg.addColorStop(0, "rgba(255,200,40,0.20)");
    tg.addColorStop(0.5,"rgba(255,170,20,0.06)");
    tg.addColorStop(1,  "rgba(0,0,0,0)");
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(CX,CY,RW3*0.9,0,Math.PI*2); ctx.fill();

    ctx.beginPath(); ctx.arc(CX,CY,RFIN,0,Math.PI*2);
    ctx.fillStyle = "rgba(18,16,10,0.95)"; ctx.fill();
    ctx.strokeStyle="rgba(255,200,40,0.45)"; ctx.lineWidth=1.8; ctx.stroke();

    ctx.font = `${RFIN*1.35}px serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🏆", CX, CY+2);
  }

  // Re-draw whenever bracket changes
  useEffect(() => { draw(); }, [bracket, language]);

  // ── Canvas event handlers ─────────────────────────────────────────────
  function getHit(e) {
    const canvas = canvasRef.current;
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
      const m = byId[h.matchId];
      if (m) onMatchTap(m);
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

      {/* Match detail bar */}
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
          const h = m.home||"TBD", a = m.away||"TBD", w = m.winner;
          return (
            <>
              <span style={{ fontWeight:w===h?700:400, color:w===h?col2.gold:col2.mid }}>
                {h}{w===h&&" ✅"}
              </span>
              <span style={{ fontSize:10, color:col2.dim }}>vs</span>
              <span style={{ fontWeight:w===a?700:400, color:w===a?col2.gold:col2.mid }}>
                {w===a&&"✅ "}{a}
              </span>
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
