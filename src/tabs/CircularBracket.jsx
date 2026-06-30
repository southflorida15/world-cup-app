import React, { useState, useContext } from "react";
import { displayTeamName } from "../i18n/display";

// ── CircularBracket ───────────────────────────────────────────────────────
// Sunburst circular tournament bracket for WC 2026.
// Teams on the outer ring advance inward toward the trophy at center.
//
// Props:
//   bracket      – { r32[], r16[], qf[], sf[], final[] } — each: { match, home, away, winner }
//   language     – "en" | "pt-BR"
//   C            – app colour tokens
//   getFlag      – (teamName) => emoji flag
//   onMatchTap   – optional (match) => void

const CX = 260, CY = 260;
const R = { trophy:22, final:52, sf:94, qf:136, r16:178, r32:218, outer:238 };

// Gap in degrees between the two halves of the same matchup (home vs away divider)
const GAP_MATCH = 2.2;
// Gap in degrees between adjacent matchups
const GAP_PAIR  = 0.8;

// Bracket spoke layout — 32 spokes, each 11.25°
// Each R32 match occupies 2 adjacent spokes (home=left, away=right)
const R32_ORDER = [73,75,74,77, 76,78,79,80, 83,84,81,82, 86,88,85,87];
const R16_ORDER = [89,90,91,92, 93,94,95,96];
const QF_ORDER  = [97,99,98,100];
const SF_ORDER  = [101,102];

// Which R32 match + side does each spoke correspond to?
const SPOKE_R32  = [];
const SPOKE_SIDE = [];
R32_ORDER.forEach(id => { SPOKE_R32.push(id, id); SPOKE_SIDE.push(0, 1); });

function buildRanges(order, spokesPerMatch) {
  const out = {};
  order.forEach((id, i) => { out[id] = [i * spokesPerMatch, (i + 1) * spokesPerMatch]; });
  return out;
}
const R32_SEGS = buildRanges(R32_ORDER, 2);
const R16_SEGS = buildRanges(R16_ORDER, 4);
const QF_SEGS  = buildRanges(QF_ORDER,  8);
const SF_SEGS  = buildRanges(SF_ORDER,  16);

function spokeAngle(i)  { return (i / 32) * 360; }
function toRad(deg)     { return (deg - 90) * Math.PI / 180; }
function polar(deg, r)  {
  const a = toRad(deg);
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

// Filled arc segment path with independent left/right gaps
function arcSeg(r1, r2, a1, a2, gL, gR) {
  const s = a1 + gL, e = a2 - gR;
  if (e <= s) return "";
  const [ax, ay] = polar(s, r1), [bx, by] = polar(e, r1);
  const [cx, cy] = polar(e, r2), [dx, dy] = polar(s, r2);
  const lg = Math.abs(e - s) > 180 ? 1 : 0;
  return `M${ax},${ay}A${r1},${r1},0,${lg},1,${bx},${by}L${cx},${cy}A${r2},${r2},0,${lg},0,${dx},${dy}Z`;
}

function Short(team) {
  if (!team) return "TBD";
  const map = {
    "United States":"USA","South Africa":"S.Africa","Netherlands":"Neth.",
    "Bosnia & Herz.":"Bosnia","Saudi Arabia":"S.Arabia","Ivory Coast":"I.Coast",
    "DR Congo":"D.R.Congo","New Zealand":"N.Zeal.",
  };
  return map[team] || team;
}

export default function CircularBracket({ bracket, language="en", C, getFlag, onMatchTap }) {
  const [hovered, setHovered] = useState(null);
  const isPtBR = language === "pt-BR";
  const tx = (en, pt) => isPtBR ? pt : en;

  // Colour palette — prefer passed-in C tokens, fall back to defaults
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
    text:  C?.text  || "#d4ead9",
  };

  // Index all bracket matches by id
  const byId = {};
  ["r32","r16","qf","sf","final"].forEach(key => {
    (bracket?.[key] || []).forEach(m => { byId[Number(m.match)] = m; });
  });

  function getMatch(id) { return byId[id] || { match:id, home:null, away:null, winner:null }; }

  // ── Segment renderer ──────────────────────────────────────────────────
  function renderHalf(id, r1, r2, a1, a2, gL, gR, team, isHome, round) {
    const m = getMatch(id);
    const opp = isHome ? m.away : m.home;
    const hasW = !!m.winner;
    const won  = hasW && m.winner === team;
    const lost = hasW && !won;

    const fill = hasW
      ? (won ? `${col.green}38` : col.s1)
      : (round === "Final" ? `${col.gold}18` : col.s2);
    const stroke = won
      ? (round === "Final" ? col.gold : col.green)
      : col.ring;
    const sw = won ? 2 : 0.5;
    const opacity = lost ? 0.35 : 1;

    const pathD = arcSeg(r1, r2, a1, a2, gL, gR);
    if (!pathD) return null;

    const hd = { h: m.home, a: m.away, w: m.winner, round };

    return (
      <path
        key={`${id}-${isHome?'h':'a'}`}
        d={pathD}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        opacity={opacity}
        style={{ cursor: onMatchTap ? "pointer" : "default" }}
        onClick={() => onMatchTap && onMatchTap(m)}
        onMouseEnter={() => setHovered(hd)}
        onMouseLeave={() => setHovered(null)}
      />
    );
  }

  // ── Match divider radial line ─────────────────────────────────────────
  function renderDivider(r1, r2, angleDeg) {
    const [x1, y1] = polar(angleDeg, r1 + 1);
    const [x2, y2] = polar(angleDeg, r2 - 1);
    return (
      <line key={`div-${angleDeg}-${r1}`}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={col.ring} strokeWidth={1.5} opacity={0.9} />
    );
  }

  // ── Full round renderer ───────────────────────────────────────────────
  function renderRound(segs, r1, r2, round) {
    const els = [];
    for (const [idStr, [s, e]] of Object.entries(segs)) {
      const id = Number(idStr);
      const m  = getMatch(id);
      const a1 = spokeAngle(s), a2 = spokeAngle(e);
      const am = (a1 + a2) / 2;

      // Home half (left side of match)
      const hEl = renderHalf(id, r1, r2, a1, am, GAP_PAIR, GAP_MATCH/2, m.home, true,  round);
      const aEl = renderHalf(id, r1, r2, am, a2, GAP_MATCH/2, GAP_PAIR, m.away, false, round);
      if (hEl) els.push(hEl);
      if (aEl) els.push(aEl);
      // Divider line at the home/away boundary
      els.push(renderDivider(r1, r2, am));
    }
    return els;
  }

  // ── Final ring (gold treatment) ───────────────────────────────────────
  function renderFinal() {
    const m = getMatch(104);
    const hasW = !!m.winner;
    const hWon = m.winner === m.home, aWon = m.winner === m.away;
    const hFill = hasW ? (hWon ? `${col.gold}40` : col.s1) : `${col.gold}18`;
    const aFill = hasW ? (aWon ? `${col.gold}40` : col.s1) : `${col.gold}18`;
    const hd = { h: m.home, a: m.away, w: m.winner, round: tx("Final","Final") };
    return (
      <g>
        <path d={arcSeg(R.trophy,R.final,0,180,GAP_MATCH/2,GAP_MATCH/2)}
          fill={hFill} stroke={hWon?col.gold:col.ring} strokeWidth={hWon?2:0.5}
          opacity={hasW&&!hWon?0.35:1} style={{cursor:onMatchTap?"pointer":"default"}}
          onClick={()=>onMatchTap&&onMatchTap(m)}
          onMouseEnter={()=>setHovered(hd)} onMouseLeave={()=>setHovered(null)}/>
        <path d={arcSeg(R.trophy,R.final,180,360,GAP_MATCH/2,GAP_MATCH/2)}
          fill={aFill} stroke={aWon?col.gold:col.ring} strokeWidth={aWon?2:0.5}
          opacity={hasW&&!aWon?0.35:1} style={{cursor:onMatchTap?"pointer":"default"}}
          onClick={()=>onMatchTap&&onMatchTap(m)}
          onMouseEnter={()=>setHovered(hd)} onMouseLeave={()=>setHovered(null)}/>
        {renderDivider(R.trophy,R.final,0)}
        {renderDivider(R.trophy,R.final,180)}
      </g>
    );
  }

  // ── Team labels on outer ring ─────────────────────────────────────────
  function renderLabels() {
    return SPOKE_R32.map((r32id, i) => {
      const side = SPOKE_SIDE[i];
      const m    = getMatch(r32id);
      const team = side === 0 ? m.home : m.away;
      if (!team || team === "TBD") return null;

      const isW    = m.winner === team;
      const isElim = m.winner && !isW;

      // Centre of this half-spoke
      const aMid = spokeAngle(i) + 360/32/2;
      const [lx, ly] = polar(aMid, R.outer + 7);
      const onRight   = aMid < 180 || aMid >= 360;
      const anchor    = onRight ? "start" : "end";
      const rotate    = onRight ? (aMid - 90) : (aMid + 90);
      const dName     = displayTeamName(team, language);
      const label     = `${getFlag(team)} ${Short(dName)}`;

      return (
        <text key={`label-${i}`}
          x={lx} y={ly}
          textAnchor={anchor}
          dominantBaseline="middle"
          fontSize={isW ? 9.5 : 8.5}
          fontWeight={isW ? 700 : 400}
          fill={isW ? col.green : (isElim ? col.dim : col.mid)}
          opacity={isElim ? 0.5 : 1}
          transform={`rotate(${rotate},${lx},${ly})`}
          style={{ pointerEvents:"none", userSelect:"none" }}>
          {label}
        </text>
      );
    });
  }

  const champ = getMatch(104).winner;

  return (
    <div style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>

      {/* Legend */}
      <div style={{ display:"flex", gap:12, fontSize:10, color:col.mid, flexWrap:"wrap", justifyContent:"center" }}>
        {[
          { fill:`${col.green}38`, stroke:col.green, label:tx("Advanced","Avançou") },
          { fill:`${col.gold}40`,  stroke:col.gold,  label:tx("Final","Final") },
          { fill:col.s1,           stroke:col.ring,  label:tx("Eliminated","Eliminado"), opacity:0.4 },
          { fill:col.s2,           stroke:col.ring2, label:tx("Upcoming","A jogar") },
        ].map(({ fill, stroke, label, opacity=1 }) => (
          <span key={label} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:9, height:9, borderRadius:2, background:fill,
              border:`1.5px solid ${stroke}`, display:"inline-block", opacity }}/>
            {label}
          </span>
        ))}
      </div>

      {/* SVG */}
      <svg width="100%" viewBox="0 0 520 520" role="img"
        style={{ display:"block", maxWidth:560 }}>
        <title>{tx("World Cup 2026 Circular Bracket","Chaveamento Circular da Copa do Mundo 2026")}</title>
        <desc>{tx("Circular bracket — 32 teams advance inward toward the trophy","Chaveamento circular — 32 seleções avançam para o centro")}</desc>

        {/* Background */}
        <circle cx={CX} cy={CY} r={R.outer+18} fill={col.bg}/>

        {/* Subtle dashed ring guides */}
        {[R.final,R.sf,R.qf,R.r16,R.r32].map(r => (
          <circle key={r} cx={CX} cy={CY} r={r} fill="none"
            stroke={col.ring} strokeWidth={0.5} strokeDasharray="2,4" opacity={0.4}/>
        ))}

        {/* Match boundary tick marks on the outer edge */}
        {Array.from({length:16}, (_,i) => {
          const d = spokeAngle(i * 2);
          const [x1,y1] = polar(d, R.r32+1);
          const [x2,y2] = polar(d, R.outer+5);
          return <line key={`tick-${i}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={col.ring} strokeWidth={0.8} opacity={0.6}/>;
        })}

        {/* All rounds */}
        {renderRound(R32_SEGS, R.r16, R.r32, tx("R32","R32"))}
        {renderRound(R16_SEGS, R.qf,  R.r16, tx("R16","Oitavas"))}
        {renderRound(QF_SEGS,  R.sf,  R.qf,  tx("QF","Quartas"))}
        {renderRound(SF_SEGS,  R.final,R.sf,  tx("SF","Semis"))}
        {renderFinal()}

        {/* Trophy centre */}
        <circle cx={CX} cy={CY} r={R.trophy}
          fill={champ ? `${col.gold}25` : col.s1}
          stroke={champ ? col.gold : col.ring2}
          strokeWidth={champ ? 2 : 0.8}/>
        <text x={CX} y={champ ? CY-4 : CY}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={champ ? 17 : 14}
          style={{ pointerEvents:"none" }}>🏆</text>
        {champ && (
          <text x={CX} y={CY+9} textAnchor="middle" dominantBaseline="middle"
            fontSize={7} fontWeight={700} fill={col.gold}
            style={{ pointerEvents:"none" }}>
            {Short(displayTeamName(champ, language))}
          </text>
        )}

        {/* Round labels at 12 o'clock */}
        {[
          { label:tx("F","F"),     r:(R.trophy+R.final)/2 },
          { label:tx("SF","SF"),   r:(R.final+R.sf)/2 },
          { label:tx("QF","QF"),   r:(R.sf+R.qf)/2 },
          { label:tx("R16","R16"), r:(R.qf+R.r16)/2 },
          { label:tx("R32","R32"), r:(R.r16+R.r32)/2 },
        ].map(({ label, r }) => {
          const [x, y] = polar(0, r);
          return (
            <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              fontSize={8.5} fontWeight={600} fill={col.dim}
              style={{ pointerEvents:"none" }}>
              {label}
            </text>
          );
        })}

        {/* Team name labels */}
        {renderLabels()}
      </svg>

      {/* Hover detail bar */}
      <div style={{
        width:"100%", maxWidth:400,
        minHeight:38,
        background:col.s1, border:`1px solid ${col.ring}`,
        borderRadius:10, padding:"9px 14px",
        fontSize:12, color:col.mid,
        display:"flex", alignItems:"center", justifyContent:"center", gap:10,
      }}>
        {hovered ? (
          <>
            <span style={{ fontWeight: hovered.w===hovered.h?700:400, color: hovered.w===hovered.h?col.green:col.mid }}>
              {getFlag(hovered.h||"")} {Short(displayTeamName(hovered.h||"TBD",language))}
              {hovered.w===hovered.h && " ✅"}
            </span>
            <span style={{ fontSize:10, color:col.dim }}>{hovered.round}</span>
            <span style={{ fontWeight: hovered.w===hovered.a?700:400, color: hovered.w===hovered.a?col.green:col.mid }}>
              {hovered.w===hovered.a && "✅ "}
              {Short(displayTeamName(hovered.a||"TBD",language))} {getFlag(hovered.a||"")}
            </span>
          </>
        ) : (
          <span style={{ fontSize:10, color:col.dim }}>
            {tx("Hover any segment to see match details","Passe o dedo para ver detalhes")}
          </span>
        )}
      </div>

      <div style={{ fontSize:10, color:col.dim, paddingBottom:4 }}>
        {tx("Tap segment to open match · winners advance toward the trophy","Toque para abrir a partida · vencedores avançam para o centro")}
      </div>
    </div>
  );
}
