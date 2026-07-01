import React, { useState } from "react";
import { displayTeamName } from "../i18n/display";

// ── CircularBracket ───────────────────────────────────────────────────────
// Sunburst circular bracket.
// Flags are HTML <img> elements absolutely positioned over the SVG —
// avoids foreignObject (broken on iOS Safari) and SVG emoji (unreliable).

const CX = 260, CY = 260, VB = 520; // viewBox is 520×520

const R = { trophy:22, final:52, sf:94, qf:136, r16:178, r32:218, outer:238 };

// Flag image width (px in viewBox units) per ring — grows as team advances
const FLAG_W = { r16:14, qf:18, sf:24, final:30, trophy:34 };

const GAP_MATCH = 2.2;
const GAP_PAIR  = 0.8;

const R32_ORDER = [73,75,74,77, 76,78,79,80, 83,84,81,82, 86,88,85,87];
const R16_ORDER = [89,90,91,92, 93,94,95,96];
const QF_ORDER  = [97,99,98,100];
const SF_ORDER  = [101,102];

const SPOKE_R32 = [], SPOKE_SIDE = [];
R32_ORDER.forEach(id => { SPOKE_R32.push(id, id); SPOKE_SIDE.push(0, 1); });

function buildRanges(order, n) {
  const out = {};
  order.forEach((id, i) => { out[id] = [i*n, (i+1)*n]; });
  return out;
}
const R32_SEGS = buildRanges(R32_ORDER, 2);
const R16_SEGS = buildRanges(R16_ORDER, 4);
const QF_SEGS  = buildRanges(QF_ORDER,  8);
const SF_SEGS  = buildRanges(SF_ORDER,  16);

function spokeAngle(i) { return (i / 32) * 360; }
function toRad(d)      { return (d - 90) * Math.PI / 180; }
function polar(d, r)   { const a = toRad(d); return [CX + r*Math.cos(a), CY + r*Math.sin(a)]; }

// Convert SVG viewBox coords → CSS % for absolute positioning
function toPercent(svgX, svgY) {
  return { left: `${(svgX / VB * 100).toFixed(3)}%`, top: `${(svgY / VB * 100).toFixed(3)}%` };
}

function arcSeg(r1, r2, a1, a2, gL, gR) {
  const s = a1+gL, e = a2-gR;
  if (e <= s) return "";
  const [ax,ay]=polar(s,r1), [bx,by]=polar(e,r1);
  const [cx,cy]=polar(e,r2), [dx,dy]=polar(s,r2);
  const lg = Math.abs(e-s) > 180 ? 1 : 0;
  return `M${ax},${ay}A${r1},${r1},0,${lg},1,${bx},${by}L${cx},${cy}A${r2},${r2},0,${lg},0,${dx},${dy}Z`;
}

const SHORT = {
  "United States":"USA","South Africa":"S.Africa","Netherlands":"Neth.",
  "Bosnia & Herz.":"Bosnia","Saudi Arabia":"S.Arabia","Ivory Coast":"I.Coast",
  "DR Congo":"D.R.Congo","New Zealand":"N.Zeal.",
};
function short(t) { return t ? (SHORT[t] || t) : "TBD"; }

export default function CircularBracket({ bracket, language="en", C, getFlag, FLAG_CODES_MAP={}, onMatchTap }) {
  const [hovered, setHovered] = useState(null);
  const isPtBR = language === "pt-BR";
  const tx = (en, pt) => isPtBR ? pt : en;

  const col = {
    bg:    C?.bg    || "#060e0a",
    s1:    C?.s1    || "#0c1a12",
    s2:    C?.s2    || "#112618",
    ring:  C?.b1    || "#1a3828",
    ring2: C?.b2    || "#234833",
    mid:   C?.mid   || "#7aaa8a",
    dim:   C?.dim   || "#3d6a4d",
    green: C?.green || "#4ade80",
    gold:  C?.gold  || "#fbbf24",
  };

  const byId = {};
  ["r32","r16","qf","sf","final"].forEach(key => {
    (bracket?.[key] || []).forEach(m => { byId[Number(m.match)] = m; });
  });
  function getMatch(id) { return byId[id] || { match:id, home:null, away:null, winner:null }; }

  // Collect all flag images to render as HTML overlay
  const flagOverlays = [];

  function addFlag(team, aMid, r_inner, r_outer, wVB) {
    if (!team) return;
    const code = FLAG_CODES_MAP[team];
    if (!code) return;
    const rMid = (r_inner + r_outer) / 2;
    const [svgX, svgY] = polar(aMid, rMid);
    // wVB = width in viewBox units → convert to % of container
    const wPct = (wVB / VB * 100).toFixed(3);
    const hPct = (wVB * 0.67 / VB * 100).toFixed(3);
    const pos = toPercent(svgX, svgY);
    flagOverlays.push({
      key: `flag-${team}-${aMid.toFixed(1)}`,
      code, team,
      left: pos.left, top: pos.top,
      wPct, hPct,
    });
  }

  // ── SVG arc segment ───────────────────────────────────────────────────
  function Seg({ id, r1, r2, a1, a2, gL, gR, team, isFinal=false }) {
    const m = getMatch(id);
    const hasW = !!m.winner;
    const won  = hasW && m.winner === team;
    const lost = hasW && !won;
    const pathD = arcSeg(r1, r2, a1, a2, gL, gR);
    if (!pathD) return null;
    const fill = hasW
      ? (won ? (isFinal ? `${col.gold}40` : `${col.green}35`) : col.s1)
      : (isFinal ? `${col.gold}15` : col.s2);
    const stroke = won ? (isFinal ? col.gold : col.green) : col.ring;
    const hd = { h:m.home, a:m.away, w:m.winner, round: isFinal ? tx("Final","Final") : "" };
    return (
      <path d={pathD} fill={fill} stroke={stroke}
        strokeWidth={won ? 2 : 0.5} opacity={lost ? 0.3 : 1}
        style={{ cursor: onMatchTap ? "pointer" : "default" }}
        onClick={() => onMatchTap && onMatchTap(m)}
        onMouseEnter={() => setHovered(hd)}
        onMouseLeave={() => setHovered(null)} />
    );
  }

  function Divider({ r1, r2, angleDeg }) {
    const [x1,y1]=polar(angleDeg, r1+1), [x2,y2]=polar(angleDeg, r2-1);
    return <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={col.ring} strokeWidth={1.5} opacity={0.85} />;
  }

  // ── Render one full round (segments + register flag overlays) ─────────
  function renderRound(segs, r_inner, r_outer, r_flag_inner, r_flag_outer, flagW, isFinal=false) {
    const els = [];
    for (const [idStr, [s, e]] of Object.entries(segs)) {
      const id = Number(idStr);
      const m  = getMatch(id);
      const a1 = spokeAngle(s), a2 = spokeAngle(e), am = (a1+a2)/2;

      els.push(<Seg key={`${id}-h`} id={id} r1={r_inner} r2={r_outer}
        a1={a1} a2={am} gL={GAP_PAIR} gR={GAP_MATCH/2} team={m.home} isFinal={isFinal}/>);
      els.push(<Seg key={`${id}-a`} id={id} r1={r_inner} r2={r_outer}
        a1={am} a2={a2} gL={GAP_MATCH/2} gR={GAP_PAIR} team={m.away} isFinal={isFinal}/>);
      els.push(<Divider key={`${id}-div`} r1={r_inner} r2={r_outer} angleDeg={am}/>);

      if (m.winner) {
        const winIsHome = m.winner === m.home;
        const flagAngle = winIsHome ? (a1+am)/2 : (am+a2)/2;
        addFlag(m.winner, flagAngle, r_flag_inner, r_flag_outer, flagW);
      }
    }
    return els;
  }

  function renderFinal() {
    const m = getMatch(104);
    return (
      <>
        <Seg id={104} r1={R.trophy} r2={R.final}
          a1={0} a2={180} gL={GAP_MATCH/2} gR={GAP_MATCH/2} team={m.home} isFinal/>
        <Seg id={104} r1={R.trophy} r2={R.final}
          a1={180} a2={360} gL={GAP_MATCH/2} gR={GAP_MATCH/2} team={m.away} isFinal/>
        <Divider r1={R.trophy} r2={R.final} angleDeg={0}/>
        <Divider r1={R.trophy} r2={R.final} angleDeg={180}/>
      </>
    );
  }

  function renderOuterLabels() {
    return SPOKE_R32.map((r32id, i) => {
      const side = SPOKE_SIDE[i];
      const m    = getMatch(r32id);
      const team = side === 0 ? m.home : m.away;
      if (!team || team === "TBD") return null;
      const isElim = m.winner && m.winner !== team;
      const aMid   = spokeAngle(i) + 360/32/2;
      const [lx,ly] = polar(aMid, R.outer + 6);
      const onRight  = aMid < 180;
      return (
        <text key={`lbl-${i}`} x={lx} y={ly}
          textAnchor={onRight ? "start" : "end"} dominantBaseline="middle"
          fontSize={8.5} fontWeight={400}
          fill={isElim ? col.dim : col.mid}
          opacity={isElim ? 0.45 : 1}
          transform={`rotate(${onRight ? aMid-90 : aMid+90},${lx},${ly})`}
          style={{ pointerEvents:"none", userSelect:"none" }}>
          {short(displayTeamName(team, language))}
        </text>
      );
    });
  }

  // ── Build all SVG segments (also populates flagOverlays as side effect) ──
  const svgRounds = [
    ...renderRound(R32_SEGS, R.r16, R.r32,  R.qf,    R.r16,  FLAG_W.r16),
    ...renderRound(R16_SEGS, R.qf,  R.r16,  R.sf,    R.qf,   FLAG_W.qf),
    ...renderRound(QF_SEGS,  R.sf,  R.qf,   R.final, R.sf,   FLAG_W.sf),
    ...renderRound(SF_SEGS,  R.final,R.sf,  R.trophy,R.final, FLAG_W.final, true),
  ];

  // Champion flag in centre
  const champ = getMatch(104).winner;
  if (champ) addFlag(champ, 0, 0, 0, FLAG_W.trophy); // special: placed at CX,CY

  return (
    <div style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>

      <div style={{ display:"flex", gap:12, fontSize:10, color:col.mid, flexWrap:"wrap", justifyContent:"center" }}>
        {[
          { fill:`${col.green}35`, stroke:col.green, label:tx("Advanced","Avançou") },
          { fill:`${col.gold}40`,  stroke:col.gold,  label:tx("Final","Final") },
          { fill:col.s1, stroke:col.ring, label:tx("Eliminated","Eliminado"), op:0.4 },
          { fill:col.s2, stroke:col.ring2, label:tx("Upcoming","A jogar") },
        ].map(({ fill, stroke, label, op=1 }) => (
          <span key={label} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:9, height:9, borderRadius:2, background:fill,
              border:`1.5px solid ${stroke}`, display:"inline-block", opacity:op }}/>
            {label}
          </span>
        ))}
      </div>

      {/* position:relative container so flag imgs can overlay the SVG */}
      <div style={{ position:"relative", width:"100%", maxWidth:560 }}>
        <svg width="100%" viewBox={`0 0 ${VB} ${VB}`} role="img"
          style={{ display:"block" }}>
          <title>{tx("World Cup 2026 Circular Bracket","Chaveamento Circular da Copa 2026")}</title>

          <circle cx={CX} cy={CY} r={R.outer+20} fill={col.bg}/>

          {[R.final,R.sf,R.qf,R.r16,R.r32].map(r => (
            <circle key={r} cx={CX} cy={CY} r={r} fill="none"
              stroke={col.ring} strokeWidth={0.5} strokeDasharray="2,4" opacity={0.4}/>
          ))}

          {Array.from({length:16}, (_,i) => {
            const d=spokeAngle(i*2);
            const [x1,y1]=polar(d,R.r32+1), [x2,y2]=polar(d,R.outer+5);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={col.ring} strokeWidth={0.8} opacity={0.6}/>;
          })}

          {svgRounds}
          {renderFinal()}

          {/* Trophy or champ placeholder circle */}
          <circle cx={CX} cy={CY} r={R.trophy}
            fill={champ ? `${col.gold}25` : col.s1}
            stroke={champ ? col.gold : col.ring2}
            strokeWidth={champ ? 2 : 0.8}/>
          {!champ && (
            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle"
              fontSize={16} style={{ pointerEvents:"none" }}>🏆</text>
          )}

          {/* Round labels */}
          {[
            { label:tx("F","F"),     r:(R.trophy+R.final)/2 },
            { label:tx("SF","SF"),   r:(R.final+R.sf)/2 },
            { label:tx("QF","QF"),   r:(R.sf+R.qf)/2 },
            { label:tx("R16","R16"), r:(R.qf+R.r16)/2 },
            { label:tx("R32","R32"), r:(R.r16+R.r32)/2 },
          ].map(({ label, r }) => {
            const [x,y]=polar(0,r);
            return (
              <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                fontSize={8.5} fontWeight={600} fill={col.dim}
                style={{ pointerEvents:"none" }}>
                {label}
              </text>
            );
          })}

          {renderOuterLabels()}
        </svg>

        {/* ── HTML flag image overlays ── */}
        {flagOverlays.map(({ key, code, team, left, top, wPct, hPct }) => {
          // Special case: champion gets centred on CX,CY
          const isChamp = team === champ && left === toPercent(CX,CY).left;
          const style = isChamp ? {
            position:"absolute",
            left: toPercent(CX, CY).left,
            top:  toPercent(CY, CY).top,
            width: `${(FLAG_W.trophy / VB * 100).toFixed(3)}%`,
            transform:"translate(-50%,-33%)",
            pointerEvents:"none",
            borderRadius:2,
            objectFit:"cover",
          } : {
            position:"absolute",
            left,
            top,
            width:`${wPct}%`,
            transform:"translate(-50%,-33%)",
            pointerEvents:"none",
            borderRadius:2,
            objectFit:"cover",
          };
          return (
            <img key={key}
              src={`https://flagcdn.com/w80/${code}.png`}
              alt={team}
              style={style}
            />
          );
        })}
      </div>

      {/* Hover detail bar */}
      <div style={{ width:"100%", maxWidth:400, minHeight:38,
        background:col.s1, border:`1px solid ${col.ring}`,
        borderRadius:10, padding:"9px 14px", fontSize:12, color:col.mid,
        display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
        {hovered ? (
          <>
            <span style={{ fontWeight:hovered.w===hovered.h?700:400,
              color:hovered.w===hovered.h?col.green:col.mid }}>
              {getFlag(hovered.h||"")} {short(displayTeamName(hovered.h||"TBD",language))}
              {hovered.w===hovered.h&&" ✅"}
            </span>
            <span style={{ fontSize:10, color:col.dim }}>{hovered.round||tx("vs","x")}</span>
            <span style={{ fontWeight:hovered.w===hovered.a?700:400,
              color:hovered.w===hovered.a?col.green:col.mid }}>
              {hovered.w===hovered.a&&"✅ "}
              {short(displayTeamName(hovered.a||"TBD",language))} {getFlag(hovered.a||"")}
            </span>
          </>
        ) : (
          <span style={{ fontSize:10, color:col.dim }}>
            {tx("Tap any segment to see match details","Toque para ver detalhes")}
          </span>
        )}
      </div>

      <div style={{ fontSize:10, color:col.dim, paddingBottom:4 }}>
        {tx("Winner flags advance inward · tap segment to open match",
           "Bandeiras dos vencedores avançam para o centro · toque para abrir")}
      </div>
    </div>
  );
}
