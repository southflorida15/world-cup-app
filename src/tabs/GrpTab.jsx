import React, { useState, useEffect, useMemo, useRef, useContext } from "react";

// Shared App.jsx values, passed in as props rather than imported directly
// to avoid a circular import (App.jsx -> GrpTab.jsx -> App.jsx), since
// App.jsx itself needs to import this file to render it.
// C, GROUPS, LiveScoresCtx, MATCHES, calcStandings, normTeam,
// statusIsFinished, statusIsLive, useElemHeight, Badge, Card, Crest, Pill

export default function GrpTab({
  onTeam, onMatchTap, tabTop=116,
  // Shared App.jsx values, passed as props to avoid a circular import
  C, GROUPS, LiveScoresCtx, MATCHES, calcStandings, normTeam,
  statusIsFinished, statusIsLive, useElemHeight, Badge, Card, Crest, Pill,
}) {
  const [sel, setSel] = useState("A");
  const [view, setView] = useState("standings");
  const { allFixtures, lastFetch } = useContext(LiveScoresCtx);

  // Manual score overrides (user-entered)
  const [manualR, setManualR] = useState(() => {
    const init={};
    Object.keys(GROUPS).forEach(g=>{init[g]=MATCHES.filter(m=>m.group===g).map(m=>({id:m.id,home:m.home,away:m.away,date:m.date,hg:"",ag:""}));});
    return init;
  });

  // Merge live API scores with manual overrides
  // Live scores take precedence over blank manual entries; manual entries override live for editing.
  // Was: only pulled a score from the live feed once a match was fully
  // FINISHED, so the group table never reflected what was actually
  // happening on the pitch during a live match — it'd jump straight from
  // blank to final. Now also pulls in-progress scores, updating as the
  // match continues (every live-score poll), same as finished ones.
  const allR = useMemo(() => {
    const merged = {};
    Object.keys(GROUPS).forEach(g => {
      merged[g] = (manualR[g] || []).map(r => {
        // If user has entered a score manually, use that
        if (r.hg !== "" || r.ag !== "") return r;
        // Otherwise try to find a live or finished score from the live feed
        const live = allFixtures.find(f => {
          const h = normTeam(f?.teams?.home?.name || "");
          const a = normTeam(f?.teams?.away?.name || "");
          const status = f?.fixture?.status?.short || "";
          return h === r.home && a === r.away && (statusIsFinished(status) || statusIsLive(status));
        });
        if (live) {
          const status = live?.fixture?.status?.short || "";
          return { ...r, hg: String(live.goals?.home ?? ""), ag: String(live.goals?.away ?? ""), fromLive: true, isLiveNow: statusIsLive(status) };
        }
        return r;
      });
    });
    return merged;
  }, [manualR, allFixtures]);

  // Clears a manual override for one match, falling back to whatever the
  // live/finished feed shows for it (or blank, if no live data exists yet).
  const resetToActual = (id) => setManualR(p => ({...p, [sel]: p[sel].map(r => r.id===id ? {...r, hg:"", ag:""} : r)}));

  const results = allR[sel] || [];
  const standings = calcStandings(sel, results);
  const upd = (id, f, v) => setManualR(p => ({...p, [sel]: p[sel].map(r => r.id===id ? {...r, [f]: v.replace(/\D/g,"")} : r)}));
  const qc = (pos) => pos<=2 ? C.green : pos===3 ? C.gold : "transparent";
  const liveCount = results.filter(r => r.fromLive).length;
  const _ghRef = useRef(null); const _ghH = useElemHeight(_ghRef);
  return (
    <div>
      {/* Fixed header */}
      <div ref={_ghRef} style={{position:"relative",top:0,left:"auto",transform:"none",width:"100%",maxWidth:700,zIndex:2,background:C.bg,borderBottom:`2px solid ${C.b2}`,boxShadow:"none",padding:"8px 13px",marginBottom:0}}>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:6,scrollbarWidth:"none"}}>
          {Object.keys(GROUPS).map(g=><Pill key={g} active={sel===g} onClick={()=>setSel(g)}>{g}</Pill>)}
        </div>
        <div style={{display:"flex",gap:8}}>
          <Pill active={view==="standings"} onClick={()=>setView("standings")} color={C.gold}>📊 Standings</Pill>
          <Pill active={view==="matches"} onClick={()=>setView("matches")} color={C.gold}>📋 Matches</Pill>
        </div>
      </div>
      {/* Content follows the filters directly in normal document flow */}
      <div style={{height:10}}/>
      {view==="standings" && (
        <div>
          <Card style={{marginBottom:12}}>
            <div style={{padding:"8px 13px",borderBottom:`1px solid ${C.b1}`,background:C.s1,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontWeight:700,color:C.green,fontSize:15}}>GROUP {sel}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {liveCount>0 && <Badge color={C.green}>🔴 Live</Badge>}
                {lastFetch && <span style={{fontSize:10,color:C.dim}}>Updated {lastFetch.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span>}
                <span style={{fontSize:10,color:C.dim}}>{"Tap for stats"}</span>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"22px 1fr 28px 28px 28px 28px 32px 32px",padding:"4px 10px",borderBottom:`1px solid ${C.b1}`,background:C.bg}}>
              {["#","Team","P","W","D","L","GD","Pts"].map((h,i)=><div key={i} style={{fontSize:11,color:C.dim,fontWeight:700,textAlign:i>=2?"center":"left"}}>{h}</div>)}
            </div>
            {standings.map((row,i)=>(
              <div key={row.team} onClick={()=>onTeam(row.team)} style={{display:"grid",gridTemplateColumns:"22px 1fr 28px 28px 28px 28px 32px 32px",padding:"9px 10px",borderBottom:i<3?`1px solid ${C.b1}`:"none",cursor:"pointer",borderLeft:`3px solid ${qc(row.pos)}`,background:row.pos<=2?`${C.green}08`:row.pos===3?`${C.gold}08`:"transparent"}} onMouseEnter={e=>e.currentTarget.style.background=`${C.green}12`} onMouseLeave={e=>e.currentTarget.style.background=row.pos<=2?`${C.green}08`:row.pos===3?`${C.gold}08`:"transparent"}>
                <div style={{fontSize:11,color:C.dim,display:"flex",alignItems:"center"}}>{row.pos}</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <Crest team={row.team} size={30}/>
                  <span style={{fontSize:14,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.team}</span>
                </div>
                {[row.p,row.w,row.d,row.l].map((v,j)=><div key={j} style={{fontSize:14,color:C.mid,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>{v}</div>)}
                <div style={{fontSize:14,color:row.gd>0?C.green:row.gd<0?C.red:C.mid,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:600}}>{row.gd>0?"+":""}{row.gd}</div>
                <div style={{fontSize:17,fontWeight:800,color:C.text,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>{row.pts}</div>
              </div>
            ))}
            <div style={{padding:"6px 12px",borderTop:`1px solid ${C.b1}`,display:"flex",gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:C.dim}}><div style={{width:9,height:9,background:C.green,borderRadius:2}}/>{"Top 2 Qualify"}</div>
              <div style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:C.dim}}><div style={{width:9,height:9,background:C.gold,borderRadius:2}}/>{"Best 3rd"}</div>
            </div>
          </Card>
          <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>ENTER SCORES</div>
          <div style={{fontSize:11,color:C.dim,marginBottom:8,lineHeight:1.5}}>Scores fill in automatically as matches are played — live ones update in real time (🔴). Type your own score to play out a "what if", then tap <span style={{color:C.gold,fontWeight:700}}>↺ Reset</span> to go back to the actual result.</div>
          {results.map(r=>{
            const fullMatch = MATCHES.find(m=>m.id===r.id);
            const manualEntry = (manualR[sel] || []).find(x => x.id === r.id);
            const hasManualOverride = manualEntry && (manualEntry.hg !== "" || manualEntry.ag !== "");
            return (
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"7px 11px"}}>
              <Crest team={r.home} size={30}/>
              <span onClick={()=>fullMatch&&onMatchTap&&onMatchTap(fullMatch)} style={{fontSize:13,color:C.text,flex:1,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:onMatchTap?"pointer":"default"}}>{r.home}</span>
              <input value={r.hg} onChange={e=>upd(r.id,"hg",e.target.value)} placeholder="-" maxLength={2} style={{width:28,textAlign:"center",background:C.s2,border:`1px solid ${r.isLiveNow&&!hasManualOverride?C.green:C.b2}`,borderRadius:6,color:C.text,fontSize:14,fontWeight:700,padding:"3px 0",outline:"none"}}/>
              <span style={{color:C.dim,fontWeight:700}}>:</span>
              <input value={r.ag} onChange={e=>upd(r.id,"ag",e.target.value)} placeholder="-" maxLength={2} style={{width:28,textAlign:"center",background:C.s2,border:`1px solid ${r.isLiveNow&&!hasManualOverride?C.green:C.b2}`,borderRadius:6,color:C.text,fontSize:14,fontWeight:700,padding:"3px 0",outline:"none"}}/>
              {r.isLiveNow && !hasManualOverride && <span style={{fontSize:9,color:C.green,fontWeight:700,flexShrink:0}}>🔴</span>}
              {hasManualOverride && (
                <button onClick={()=>resetToActual(r.id)} title="Reset to actual score" style={{fontSize:10,color:C.gold,background:`${C.gold}18`,border:`1px solid ${C.gold}44`,borderRadius:6,padding:"3px 6px",cursor:"pointer",fontWeight:700,flexShrink:0,whiteSpace:"nowrap"}}>↺ Reset</button>
              )}
              <span onClick={()=>fullMatch&&onMatchTap&&onMatchTap(fullMatch)} style={{fontSize:13,color:C.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:onMatchTap?"pointer":"default"}}>{r.away}</span>
              <Crest team={r.away} size={30}/>
            </div>
          );})}
        </div>
      )}
      {view==="matches" && results.map(r=>{
        const fullMatch = MATCHES.find(m=>m.id===r.id);
        return (
        <Card key={r.id} style={{marginBottom:8,cursor:"pointer"}} onClick={()=>fullMatch&&onMatchTap&&onMatchTap(fullMatch)}>
          <div style={{padding:"11px 13px"}}>
            <div style={{fontSize:10,color:C.dim,marginBottom:6}}>{r.date}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <Crest team={r.home} size={26}/>
              <span style={{fontWeight:700,color:C.text,flex:1,fontSize:14}}>{r.home}</span>
              <div style={{display:"flex",alignItems:"center",gap:4}} onClick={e=>e.stopPropagation()}>
                <input value={r.hg} onChange={e=>upd(r.id,"hg",e.target.value)} placeholder="-" maxLength={2} style={{width:32,textAlign:"center",background:C.s2,border:`1px solid ${C.b2}`,borderRadius:8,color:C.text,fontSize:16,fontWeight:700,padding:"4px 0",outline:"none"}}/>
                <span style={{color:C.dim}}>:</span>
                <input value={r.ag} onChange={e=>upd(r.id,"ag",e.target.value)} placeholder="-" maxLength={2} style={{width:32,textAlign:"center",background:C.s2,border:`1px solid ${C.b2}`,borderRadius:8,color:C.text,fontSize:16,fontWeight:700,padding:"4px 0",outline:"none"}}/>
              </div>
              <span style={{fontWeight:700,color:C.text,flex:1,textAlign:"right",fontSize:14}}>{r.away}</span>
              <Crest team={r.away} size={26}/>
            </div>
          </div>
        </Card>
      );})}
    </div>
  );
}

