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
const RB   = 196; // R32 bracket ring
const R16  = 154; // R16
const RQF  = 112; // QF
const RSF  =  70; // SF
const RFIN =  30; // Final / trophy

const FLAG_R = 22; // outer flag circle radius

// Winner flag sizes at each inner ring
const WIN_SZ = { r16:13, qf:16, sf:20, fin:24 };

const LINE_WIN = "rgba(255,215,60,0.88)";
const LINE_DIM = "rgba(255,255,255,0.10)";
const LW       = 1.6;
const LW_DIM   = 0.7;

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

  // ── Preload all flag images ────────────────────────────────────────────
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
    [RB, R16, RQF, RSF].forEach(r => {
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
    function drawRound(segs, rOuter, rInner, winFlagR, winFlagSz) {
      for (const [idStr, [s, e]] of Object.entries(segs)) {
        const id = Number(idStr);
        const m  = getMatch(id);
        const a1 = degOf(s), a2 = degOf(e), am = (a1+a2)/2;
        const hWon = m.winner === m.home;
        const aWon = m.winner === m.away;
        const hasW = !!m.winner;
        const G = 0.9; // gap in degrees at arc ends

        // Outer arc: two halves, one per team
        arc(rOuter, a1+G, am-G, hWon ? LINE_WIN : LINE_DIM, hWon ? LW : LW_DIM);
        arc(rOuter, am+G, a2-G, aWon ? LINE_WIN : LINE_DIM, aWon ? LW : LW_DIM);

        // Midpoint junction on outer ring
        const [jox, joy] = pt(am, rOuter);
        dot(jox, joy, hasW?2:1.2, hasW ? LINE_WIN : LINE_DIM);

        // Convergence: both spokes lead to winner's angle on inner ring
        const wAngle = hasW ? (hWon ? (a1+am)/2 : (am+a2)/2) : (a1+a2)/2;
        const [hMidX, hMidY] = pt((a1+am)/2, rOuter);
        const [aMidX, aMidY] = pt((am+a2)/2, rOuter);
        const [ix, iy]       = pt(wAngle, rInner);

        line(hMidX,hMidY, ix,iy, hWon ? LINE_WIN : LINE_DIM, hWon ? LW : LW_DIM);
        line(aMidX,aMidY, ix,iy, aWon ? LINE_WIN : LINE_DIM, aWon ? LW : LW_DIM);

        // Inner junction dot
        dot(ix, iy, hasW ? 2.5 : 1.5, hasW ? LINE_WIN : LINE_DIM);

        // Winner flag circle on inner ring
        if (hasW) {
          const [fx, fy] = pt(wAngle, winFlagR);
          drawFlag(
            m.winner, fx, fy, winFlagSz,
            1,
            "rgba(255,215,60,0.85)", 1.5,
            "rgba(255,200,40,0.3)"
          );
        }
      }
    }

    // ── Draw all rounds ────────────────────────────────────────────────
    // rOuter, rInner, winFlagRadius, winFlagSize
    // Winner flag sits between rInner and the next ring inward
    drawRound(R32_SEGS, RB,  R16, (RB+R16)/2,   WIN_SZ.r16);
    drawRound(R16_SEGS, R16, RQF, (R16+RQF)/2,  WIN_SZ.qf);
    drawRound(QF_SEGS,  RQF, RSF, (RQF+RSF)/2,  WIN_SZ.sf);
    drawRound(SF_SEGS,  RSF, RFIN,(RSF+RFIN)/2,  WIN_SZ.fin);

    // ── Connector lines: outer flag → RB ring ─────────────────────────
    for (let i = 0; i < 32; i++) {
      const { team, matchId } = slots[i];
      const m = getMatch(matchId);
      const isW    = m.winner === team;
      const isElim = m.winner && !isW;
      const angle  = degOf(i) + 360/32/2;
      const [fx, fy] = pt(angle, RF);
      const [bx, by] = pt(angle, RB);
      line(fx,fy, bx,by,
        isW    ? "rgba(255,210,60,0.5)"  :
        isElim ? "rgba(255,255,255,0.04)" :
                 "rgba(255,255,255,0.10)",
        isW ? 1.4 : 0.6
      );
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

    // ── Trophy glow ────────────────────────────────────────────────────
    const tg = ctx.createRadialGradient(CX,CY,0,CX,CY,RSF*0.9);
    tg.addColorStop(0, "rgba(255,200,40,0.20)");
    tg.addColorStop(0.5,"rgba(255,170,20,0.06)");
    tg.addColorStop(1,  "rgba(0,0,0,0)");
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(CX,CY,RSF*0.9,0,Math.PI*2); ctx.fill();

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
