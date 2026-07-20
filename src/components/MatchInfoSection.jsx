import React from "react";
import BroadcastBadges from "./BroadcastBadges.jsx";
import { getBroadcastCountry } from "../utils/broadcastCountry.js";

export default function MatchInfoSection({
  match,
  modalWx,
  modalCity,
  simOdds,
  p1,
  p2,
  finished,
  isPastDay,
  openMaps,
  C,
}) {
  if (!match) return null;
  const country = getBroadcastCountry("US");

  const venueName = match.venue?.split(",")?.[0] || match.venue || "Venue TBD";
  const cityName = modalCity?.name || match.venue?.split(",").slice(1).join(",").trim() || "";

  return (
    <div style={{display:"grid",gap:8,marginBottom:14}}>
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,
        padding:"10px 12px",border:`1px solid ${C.b1}`,borderRadius:12,background:C.s1
      }}>
        <button
          type="button"
          onClick={() => openMaps?.(match.venue)}
          style={{
            border:"none",background:"transparent",padding:0,cursor:"pointer",
            color:C.blue,fontSize:13,fontWeight:800,textAlign:"left",minWidth:0
          }}
        >
          📍 <span style={{textDecoration:"underline",textDecorationStyle:"dotted"}}>{venueName}</span>
          {cityName && <span style={{color:C.dim,fontWeight:600}}> · {cityName}</span>}
        </button>
        {modalWx && (
          <div style={{fontSize:13,color:C.text,fontWeight:800,whiteSpace:"nowrap"}}>
            {modalWx.icon || "☀️"} {modalWx.temp}°F <span style={{color:C.dim,fontWeight:700}}>/ {modalWx.tempC}°C</span>
          </div>
        )}
      </div>

      <div style={{
        padding:"10px 12px",border:`1px solid ${C.b1}`,borderRadius:12,background:C.s1
      }}>
        <BroadcastBadges match={match} country={country} C={C} compact />
      </div>

      {!finished && !isPastDay && simOdds && (
        <div style={{marginTop:2}}>
          <div style={{fontSize:11,color:C.dim,fontWeight:900,letterSpacing:2,margin:"0 0 8px 0"}}>WIN PROBABILITY</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <OddsBox label={match.home} value={simOdds.win1} color={C.green} C={C} />
            <OddsBox label="Draw" value={simOdds.draw} color={C.gold} C={C} />
            <OddsBox label={match.away} value={simOdds.win2} color={C.red} C={C} />
          </div>
        </div>
      )}

      {!finished && !isPastDay && (p1 || p2) && (
        <div style={{display:"none"}} aria-hidden="true" />
      )}
    </div>
  );
}

function OddsBox({ label, value, color, C }) {
  return (
    <div style={{
      border:`1px solid ${color}33`,background:`${color}0d`,borderRadius:12,
      padding:"11px 8px",textAlign:"center",minWidth:0
    }}>
      <div style={{fontSize:22,fontWeight:950,color,lineHeight:1}}>{value}%</div>
      <div style={{fontSize:10,color:C.dim,marginTop:4}}>Simulator</div>
      <div style={{fontSize:11,color:C.mid,marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</div>
    </div>
  );
}
