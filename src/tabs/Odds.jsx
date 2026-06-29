import React, { useRef } from "react";

// Shared App.jsx values, passed in as props rather than imported directly
// to avoid a circular import (App.jsx -> Odds.jsx -> App.jsx), since
// App.jsx itself needs to import this file to render it.
// C, DS, PREDS, TEAMS, useElemHeight, Badge, Card, Crest, OddsLineChart

export default function PredTab({
  tabTop=140, geoData={},
  // Shared App.jsx values, passed as props to avoid a circular import
  C, DS, PREDS, TEAMS, useElemHeight, Badge, Card, Crest, OddsLineChart,
}) {
  const top = PREDS.filter(p=>p.team!=="Others");
  const others = PREDS.find(p=>p.team==="Others");
  const max = top[0].poly;
  const _phRef = useRef(null); const _phH = useElemHeight(_phRef);
  return (
    <div>
      <div ref={_phRef} style={{position:"relative",top:0,left:"auto",transform:"none",width:"100%",maxWidth:700,zIndex:2,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:DS.shadow.sticky,padding:"8px 13px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <span style={{fontWeight:700,fontSize:15,color:C.green}}>🎯 POLYMARKET ODDS</span>
            <span style={{fontSize:11,color:C.dim,marginLeft:8}}>Updated Jun 5, 2026</span>
          </div>
          <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:C.green,textDecoration:"none",border:`1px solid ${C.greenS}`,padding:"3px 9px",borderRadius:20}}>Live →</a>
        </div>
      </div>
      <div style={{height:0}}/>
      

      {/* Line chart */}
      <Card style={{marginBottom:14}}>
        <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.b1}`}}>
          <span style={{fontWeight:700,color:C.green,fontSize:13}}>📈 ODDS EVOLUTION · TOP 6</span>
          <span style={{fontSize:10,color:C.dim,marginLeft:8}}>Dec 2025 → Jun 5, 2026 · hover to inspect</span>
        </div>
        <div style={{padding:"12px 14px 8px"}}>
          <OddsLineChart/>
        </div>
      </Card>

      {/* Per-team rows — trend icon removed */}
      {top.map((p,i)=>(
        <Card key={p.team} style={{marginBottom:7}}>
          <div style={{padding:"11px 13px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <div style={{fontWeight:700,color:C.dim,minWidth:22,fontSize:14}}>#{i+1}</div>
              <Crest team={p.team} size={26}/>
              <span style={{fontWeight:700,color:C.text,flex:1,fontSize:14}}>{p.team}</span>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:700,fontSize:20,color:p.poly>=15?C.green:p.poly>=8?C.gold:C.mid}}>{p.poly}%</div>
                <div style={{fontSize:10,color:C.dim}}>{p.odds}</div>
              </div>
            </div>
            <div style={{height:4,background:C.s2,borderRadius:2,overflow:"hidden"}}><div style={{height:4,borderRadius:2,width:`${(p.poly/max)*100}%`,background:`linear-gradient(90deg,#1a4a2a,${C.green})`}}/></div>
            {TEAMS[p.team] && <div style={{display:"flex",gap:6,marginTop:7}}><Badge color={C.blue}>SS {TEAMS[p.team].ss}</Badge><Badge color={C.dim}>#{TEAMS[p.team].rank} FIFA</Badge></div>}
          </div>
        </Card>
      ))}
      <Card><div style={{padding:12,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.mid}}>🌍 All others</span><span style={{fontWeight:700,color:C.dim,fontSize:18}}>{others.poly}%</span></div></Card>
    </div>
  );
}

