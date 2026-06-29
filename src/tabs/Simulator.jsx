import React, { useState, useEffect, useRef, useCallback } from "react";

// Shared App.jsx values, passed in as props rather than imported directly
// to avoid a circular import (App.jsx -> Simulator.jsx -> App.jsx), since
// App.jsx itself needs to import this file to render it.
// C, DS, getFlag, runFullSim, useElemHeight, Card, Crest, Pill

export default function SimTab({
  tabTop=116,
  // Shared App.jsx values, passed as props to avoid a circular import
  C, DS, getFlag, runFullSim, useElemHeight, Card, Crest, Pill,
}) {
  const [sims, setSims]       = useState(5000);
  const [running, setRunning] = useState(false);
  const [mc, setMc]           = useState(null);       // [{team, pct, wins}]
  const [bracket, setBracket] = useState(null);       // most-likely bracket

  const runMC = useCallback((n) => {
    setRunning(true);
    setTimeout(() => {
      // Champion frequency
      const champCount = {};
      // Stage frequency — track how far each team goes
      const r16Count  = {};
      const qfCount   = {};
      const sfCount   = {};
      const finalCount = {};
      const N = n || sims;

      for (let i = 0; i < N; i++) {
        const r = runFullSim();
        champCount[r.champion] = (champCount[r.champion]||0) + 1;
        r.r16.forEach(t  => { r16Count[t]   = (r16Count[t]  ||0)+1; });
        r.qf.forEach(t   => { qfCount[t]    = (qfCount[t]   ||0)+1; });
        r.sf.forEach(t   => { sfCount[t]    = (sfCount[t]   ||0)+1; });
        [r.champion, r.runnerUp].forEach(t => { finalCount[t] = (finalCount[t]||0)+1; });
      }

      const sorted = Object.entries(champCount)
        .sort((a,b)=>b[1]-a[1])
        .map(([team, wins]) => ({
          team,
          pct: ((wins/N)*100).toFixed(1),
          r16Pct:   (((r16Count[team]  ||0)/N)*100).toFixed(0),
          qfPct:    (((qfCount[team]   ||0)/N)*100).toFixed(0),
          sfPct:    (((sfCount[team]   ||0)/N)*100).toFixed(0),
          finalPct: (((finalCount[team]||0)/N)*100).toFixed(0),
        }));

      // Most-likely bracket: pick winner of each KO matchup by highest champ%
      const champPct = (t) => parseFloat(sorted.find(x=>x.team===t)?.pct||"0");
      const likelyKO = (arr) => {
        const out = [];
        for(let i=0;i<arr.length;i+=2) {
          out.push(champPct(arr[i]) >= champPct(arr[i+1]) ? arr[i] : arr[i+1]);
        }
        return out;
      };
      // Run one sim to get a realistic R32/R16 bracket structure, then override winners
      const base = runFullSim();
      const likelyR16 = likelyKO(base.r32);
      const likelyQF  = likelyKO(likelyR16);
      const likelySF  = likelyKO(likelyQF);
      const likelyChamp = champPct(likelySF[0]) >= champPct(likelySF[1]) ? likelySF[0] : likelySF[1];
      const likelyRunnerUp = likelySF.find(t=>t!==likelyChamp);

      setMc(sorted);
      setBracket({ r32:base.r32, r16:likelyR16, qf:likelyQF, sf:likelySF, champion:likelyChamp, runnerUp:likelyRunnerUp });
      setRunning(false);
    }, 50);
  }, [sims]);

  // Auto-run on mount
  useEffect(() => { runMC(5000); }, []);

  const [view, setView] = useState("odds"); // "odds" | "bracket"
  const _simhRef = useRef(null); const _simhH = useElemHeight(_simhRef);

  return (
    <div>
      <div ref={_simhRef} style={{position:"relative",top:0,left:"auto",transform:"none",width:"100%",maxWidth:700,zIndex:2,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:DS.shadow.sticky,padding:"8px 13px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:C.green}}>{"🎲 WORLD CUP SIMULATOR"}</div>
            <div style={{fontSize:10,color:C.dim}}>Poisson model · FIFA ratings · form · home advantage</div>
          </div>
          <button onClick={()=>runMC(sims)} disabled={running} style={{padding:"6px 12px",borderRadius:10,background:`${C.green}22`,border:`1px solid ${C.greenS}`,color:C.green,fontWeight:700,fontSize:12,cursor:"pointer",opacity:running?0.5:1,flexShrink:0}}>
            {running ? "Running…" : "↻ Re-run"}
          </button>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:6}}>
          {[1000,5000,10000,50000].map(n=>(
            <Pill key={n} active={sims===n} onClick={()=>{setSims(n);runMC(n);}} color={C.gold}>{n.toLocaleString()}×</Pill>
          ))}
        </div>
        <div style={{display:"flex",gap:6}}>
          <Pill active={view==="odds"}    onClick={()=>setView("odds")}    color={C.green}>📊 Win Odds</Pill>
          <Pill active={view==="bracket"} onClick={()=>setView("bracket")} color={C.gold}>🏆 Most Likely Bracket</Pill>
        </div>
      </div>
      <div style={{height:0}}/>
      

      {running && (
        <div style={{textAlign:"center",padding:"48px 0"}}>
          <div style={{width:36,height:36,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/>
          <div style={{fontSize:13,color:C.mid}}>Simulating {sims.toLocaleString()} tournaments…</div>
        </div>
      )}

      {/* ── WIN ODDS ── */}
      {!running && mc && view==="odds" && (
        <div>
          <div style={{fontSize:11,color:C.dim,marginBottom:10,lineHeight:1.6}}>
            Based on {sims.toLocaleString()} simulated tournaments. Each % = how often that team won.
          </div>
          {mc.slice(0,16).map((r,i)=>{
            const maxPct = parseFloat(mc[0].pct);
            const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
            return (
              <Card key={r.team} style={{marginBottom:6}}>
                <div style={{padding:"10px 13px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <div style={{fontWeight:700,color:C.dim,minWidth:26,fontSize:13,textAlign:"center"}}>{medal||`#${i+1}`}</div>
                    <Crest team={r.team} size={22}/>
                    <span style={{fontWeight:700,color:C.text,flex:1,fontSize:14}}>{r.team}</span>
                    <div style={{fontWeight:900,fontSize:20,color:i===0?C.green:i<3?C.gold:C.mid,minWidth:48,textAlign:"right"}}>{r.pct}%</div>
                  </div>
                  {/* Win probability bar */}
                  <div style={{height:4,background:C.s2,borderRadius:2,overflow:"hidden",marginBottom:6}}>
                    <div style={{height:4,borderRadius:2,width:`${(parseFloat(r.pct)/maxPct)*100}%`,background:i===0?`linear-gradient(90deg,#1a4a2a,${C.green})`:i<3?`linear-gradient(90deg,#3a2800,${C.gold})`:`linear-gradient(90deg,#1a2a2a,${C.mid})`}}/>
                  </div>
                  {/* Stage reach % */}
                  <div style={{display:"flex",gap:6}}>
                    {[["R16",r.r16Pct],["QF",r.qfPct],["SF",r.sfPct],["Final",r.finalPct]].map(([lbl,pct])=>(
                      <div key={lbl} style={{flex:1,textAlign:"center",background:C.s2,borderRadius:6,padding:"3px 0"}}>
                        <div style={{fontSize:11,fontWeight:700,color:parseInt(pct)>50?C.green:parseInt(pct)>25?C.gold:C.dim}}>{pct}%</div>
                        <div style={{fontSize:9,color:C.dim}}>{lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── MOST LIKELY BRACKET ── */}
      {!running && bracket && view==="bracket" && (
        <div>
          <div style={{fontSize:11,color:C.dim,marginBottom:12,lineHeight:1.6}}>
            Each round shows the team more likely to advance based on {sims.toLocaleString()} simulations.
          </div>
          <div style={{background:`linear-gradient(135deg,${C.green}22,${C.gold}18)`,border:`1px solid ${C.greenS}`,borderRadius:14,padding:16,marginBottom:16,textAlign:"center"}}>
            <div style={{fontSize:11,color:C.dim,letterSpacing:"0.15em",fontWeight:700,marginBottom:8}}>🏆 MOST LIKELY CHAMPION</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:6}}>
              <Crest team={bracket.champion} size={52}/>
              <div>
                <div style={{fontWeight:900,fontSize:26,color:C.green}}>{bracket.champion}</div>
                <div style={{fontSize:12,color:C.gold}}>Win probability: {mc?.find(x=>x.team===bracket.champion)?.pct}%</div>
              </div>
            </div>
            <div style={{fontSize:13,color:C.mid}}>Most likely runner-up: {getFlag(bracket.runnerUp)} {bracket.runnerUp} ({mc?.find(x=>x.team===bracket.runnerUp)?.finalPct}% reach final)</div>
          </div>
          {[
            ["MOST LIKELY SEMI-FINALS", bracket.sf],
            ["MOST LIKELY QUARTER-FINALS", bracket.qf],
            ["MOST LIKELY ROUND OF 16", bracket.r16],
          ].map(([label,teams])=>(
            <div key={label} style={{marginBottom:14}}>
              <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:7}}>{label}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {(teams||[]).map(t=>{
                  const pct = mc?.find(x=>x.team===t);
                  return (
                    <div key={t} style={{display:"flex",alignItems:"center",gap:5,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:"5px 9px"}}>
                      <Crest team={t} size={16}/>
                      <span style={{fontSize:12,color:C.text}}>{t}</span>
                      {pct && <span style={{fontSize:10,color:C.dim}}>·{pct.pct}%</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

