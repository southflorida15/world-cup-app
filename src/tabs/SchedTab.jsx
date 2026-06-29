import React, { Fragment, useState, useEffect, useRef, useContext } from "react";
import { displayTeamName, displayStageName, displayVenueName } from "../i18n/display";

// Shared App.jsx values, passed in as props rather than imported directly
// to avoid a circular import (App.jsx -> SchedTab.jsx -> App.jsx), since
// App.jsx itself needs to import this file to render it.
// C, FavCtx, LiveScoresCtx, MATCHES, MATCH_DATES, MATCH_UTC, ALL_TEAMS,
// calcStandings, getFlag, matchTimes, statusIsFinished, useElemHeight,
// MatchCard, Pill

export default function SchedTab({
  language="en", t=(key, fallback)=>fallback,
  onAction, onMatchTap=null, favTeam="", tabTop=116, savedIds=new Set(), matches,
  // Shared App.jsx values, passed as props to avoid a circular import
  C, FavCtx, LiveScoresCtx, MATCHES, MATCH_DATES, MATCH_UTC, ALL_TEAMS,
  calcStandings, getFlag, matchTimes, statusIsFinished, useElemHeight,
  MatchCard, Pill,
}) {
  const isPtBR = language === "pt-BR";
  const tx = (en, pt) => isPtBR ? pt : en;

  matches = matches || MATCHES;
  const { favTeams=[] } = useContext(FavCtx);
  const { getScore } = useContext(LiveScoresCtx);
  const [filterMode, setFilterMode] = useState("none");
  const [timeMode, setTimeMode] = useState("local");
  const [groupF, setGroupF] = useState("All");
  const [teamF, setTeamF] = useState("");
  const [venueF, setVenueF] = useState("");
  const [roundF, setRoundF] = useState("");
  const [selDate, setSelDate] = useState(null); // null = all dates
  const stripRef = useRef(null);

  // Resolves a simple "1X"/"2X" Round of 32 placeholder ("1st in Group X" /
  // "2nd in Group X") to the real team name — same approach as the Actual
  // Bracket now: always shows the CURRENT live-projected team from
  // whatever group results exist so far, returning a "provisional" flag
  // alongside it. The caller (MatchCard) renders provisional names dimmed
  // and clinched ones in full color, mirroring the bracket's gold/locked
  // vs dimmed treatment. For 1st place, "confirmed" means mathematically
  // clinched — not waiting for every group match to literally finish,
  // since a team can secure 1st with a match still to play. For 2nd
  // place, "confirmed" means the whole group has finished — clinching 2nd
  // specifically is a messier multi-team computation not attempted here,
  // so it's treated as provisional for the whole group's duration and
  // only flips to confirmed once nothing more can change.
  // Deliberately does NOT attempt "3rd ABCDF"-style placeholders —
  // resolving which third-placed teams qualify requires the full
  // cross-group Annex C ranking, not just one group's standings, and that
  // engine isn't part of this component. Those stay as placeholders until
  // the bracket itself fills them in elsewhere in the app.
  const resolveSlot = (label) => {
    const mm = /^([12])([A-L])$/.exec(label || "");
    if (!mm) return { team: label, provisional: false };
    const [, posStr, letter] = mm;
    const pos = parseInt(posStr, 10);
    const groupMatches = MATCHES.filter(gm => gm.group === letter);
    if (!groupMatches.length) return { team: label, provisional: false };

    const results = groupMatches.map(gm => {
      const sc = getScore(gm.home, gm.away);
      const finished = sc && statusIsFinished(sc.status);
      return { home: gm.home, away: gm.away, hg: finished ? String(sc.hg ?? "") : "", ag: finished ? String(sc.ag ?? "") : "" };
    });
    const table = calcStandings(letter, results);
    const projected = table[pos-1];
    if (!projected) return { team: label, provisional: false };

    const allDone = groupMatches.every(gm => {
      const sc = getScore(gm.home, gm.away);
      return sc && sc.hg !== null && sc.ag !== null && statusIsFinished(sc.status);
    });

    // Once every group match has actually been played, the table IS final
    // — trust calcStandings' own tiebreak resolution directly rather than
    // re-running the clinch projection below. That projection only checks
    // pairwise head-to-head, which can wrongly read as "inconclusive" (a
    // draw) for a tie that calcStandings already correctly settled via
    // goal difference or goals-for instead — exactly the bug that left a
    // fully-finished group's 1st place still marked provisional even
    // though there was nothing left to determine.
    if (allDone) return { team: projected.team, provisional: false };

    if (pos === 1) {
      const leader = table[0];
      const headToHeadWinner = (teamA, teamB) => {
        const m = results.find(r => (r.home === teamA && r.away === teamB) || (r.home === teamB && r.away === teamA));
        if (!m || m.hg === "" || m.ag === "") return null;
        const hg = parseInt(m.hg), ag = parseInt(m.ag);
        if (isNaN(hg) || isNaN(ag)) return null;
        if (hg === ag) return "draw";
        const homeWon = hg > ag;
        return (m.home === teamA) === homeWon ? teamA : teamB;
      };
      const clinched = table.slice(1).every(t => {
        const maxPossible = t.pts + (3 - t.p) * 3;
        if (maxPossible < leader.pts) return true;
        if (maxPossible > leader.pts) return false;
        return headToHeadWinner(leader.team, t.team) === leader.team;
      });
      return { team: leader.team, provisional: !clinched };
    }

    // pos === 2, group not yet fully done — still provisional
    return { team: projected.team, provisional: true };
  };

  const today = new Date().toLocaleDateString("en-US", { month:"short", day:"numeric" });
  const todayHasMatch = MATCH_DATES.some(d => d.key === today);

  // Auto-select today if it has a match
  useEffect(() => {
    if (todayHasMatch && selDate === null) setSelDate(today);
  }, []);

  // Scroll strip to today/selected on mount
  useEffect(() => {
    if (!stripRef.current) return;
    const active = stripRef.current.querySelector("[data-active='true']");
    if (active) active.scrollIntoView({ behavior:"smooth", block:"nearest", inline:"center" });
  }, [selDate]);

  const allTeams = ALL_TEAMS;
  const allVenues = [...new Set(matches.map(m=>m.venue))].sort();

  const shown = matches.filter(m => {
    // Date filter first
    if (selDate) {
      const iso = MATCH_UTC[m.id];
      if (!iso) return false;
      const key = new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric"});
      if (key !== selDate) return false;
    }
    if(filterMode==="none") return true;
    if(filterMode==="fav") return favTeams?.length && (favTeams.includes(m.home)||favTeams.includes(m.away));
    if(filterMode==="group") { if(groupF==="All")return true; if(groupF==="Knockout")return!m.group; return m.group===groupF; }
    if(filterMode==="team") return !teamF||m.home===teamF||m.away===teamF;
    if(filterMode==="venue") return !venueF||m.venue===venueF;
    if(filterMode==="round") {
      if(!roundF) return true;
      if(roundF==="group") return !!m.group;
      if(roundF==="r32") return m.stage==="Round of 32"||(!m.group&&m.id>=73&&m.id<=88);
      if(roundF==="r16") return m.stage==="Round of 16"||(!m.group&&m.id>=89&&m.id<=96);
      if(roundF==="qf") return m.stage==="Quarter-final"||(!m.group&&m.id>=97&&m.id<=100);
      if(roundF==="sf") return m.stage==="Semi-final"||(!m.group&&m.id>=101&&m.id<=102);
      if(roundF==="3rd") return m.stage==="3rd Place"||m.id===103;
      if(roundF==="final") return m.stage==="Final"||m.id===104;
      return true;
    }
    return true;
  });
  const byDate = shown.reduce((a,m)=>{ const {dateLabel}=matchTimes(m); const key=dateLabel||m.date; (a[key]=a[key]||[]).push(m); return a; },{});
  // Was: matches within a day kept whatever order they appeared in the
  // MATCHES array — fine for the group stage (where array order already
  // happens to match kickoff order), but Round of 32 onward lists matches
  // by bracket position, not by time, so a day could show 4:30pm, then
  // 9pm, then 1pm in that literal order. Sort each day's matches by their
  // actual UTC kickoff time instead.
  Object.values(byDate).forEach(ms => {
    ms.sort((a,b) => {
      const ta = MATCH_UTC[a.id] ? new Date(MATCH_UTC[a.id]).getTime() : 0;
      const tb = MATCH_UTC[b.id] ? new Date(MATCH_UTC[b.id]).getTime() : 0;
      return ta - tb;
    });
  });
  const ss=(active,color=C.green)=>({padding:"5px 12px",borderRadius:20,border:`1px solid ${active?color:C.b1}`,background:active?`${color}18`:"transparent",color:active?color:C.mid,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"});

  const filterRef = useRef(null);
  const filterHeight = useElemHeight(filterRef);

  return (
    <div>
      {/* Filter header in normal document flow */}
      <div ref={filterRef} style={{position:"relative",top:0,left:"auto",transform:"none",width:"100%",maxWidth:700,zIndex:2,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:"none",padding:"8px 13px",marginBottom:0}}>

        {/* Date strip */}
        <div ref={stripRef} style={{display:"flex",overflowX:"auto",scrollbarWidth:"none",marginBottom:8,gap:4}}>
          <div onClick={()=>setSelDate(null)} style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:36,cursor:"pointer",padding:"4px 2px",borderRadius:8,background:selDate===null?`${C.green}22`:"transparent",border:`1px solid ${selDate===null?C.green:"transparent"}`}}>
            <span style={{fontSize:9,color:selDate===null?C.green:C.dim,fontWeight:700}}>{tx("ALL", "TODOS")}</span>
            <span style={{fontSize:14,fontWeight:900,color:selDate===null?C.green:C.dim}}>⚽</span>
          </div>
          {MATCH_DATES.map((d, idx) => {
            const isToday = d.key === today;
            const isSel = selDate === d.key;
            const prevD = MATCH_DATES[idx - 1];
            const monthChanged = prevD && d.date.getMonth() !== prevD.date.getMonth();
            return (
              <React.Fragment key={d.key}>
                {monthChanged && (
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 4px",flexShrink:0}}>
                    <div style={{width:1,height:32,background:C.b2,margin:"0 2px"}}/>
                    <span style={{fontSize:8,color:C.dim,fontWeight:700,marginTop:2,letterSpacing:"0.05em"}}>{d.date.toLocaleDateString("en-US",{month:"short"}).toUpperCase()}</span>
                  </div>
                )}
                <div data-active={isSel} onClick={()=>setSelDate(isSel?null:d.key)}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:36,cursor:"pointer",padding:"4px 6px",borderRadius:8,
                    background: isSel?`${C.green}22`:isToday?`${C.green}0a`:"transparent",
                    border:`1px solid ${isSel?C.green:isToday?`${C.green}44`:"transparent"}`,
                  }}>
                  <span style={{fontSize:9,color:isSel?C.green:C.dim,fontWeight:600,textTransform:"uppercase"}}>{d.dow}</span>
                  <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:isSel?C.green:"transparent",marginTop:1}}>
                    <span style={{fontSize:14,fontWeight:900,color:isSel?"#030a05":isToday?C.green:C.text}}>{d.day}</span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Filter mode buttons */}
        <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none",marginBottom:8,alignItems:"center"}}>
          {favTeams?.length > 0 && <button style={ss(filterMode==="fav",C.gold)} onClick={()=>setFilterMode("fav")}>{tx("⭐ My Teams", "⭐ Meus times")}</button>}
          <button style={ss(filterMode==="group")} onClick={()=>setFilterMode(f=>f==="group"?"none":"group")}>{tx("🗂 Group", "🗂 Grupo")}</button>
          <button style={ss(filterMode==="team")} onClick={()=>setFilterMode(f=>f==="team"?"none":"team")}>{tx("👥 Team", "👥 Time")}</button>
          <button style={ss(filterMode==="venue")} onClick={()=>setFilterMode(f=>f==="venue"?"none":"venue")}>{tx("📍 Venue", "📍 Estádio")}</button>
          <button style={ss(filterMode==="round")} onClick={()=>setFilterMode(f=>f==="round"?"none":"round")}>{tx("🏆 Round", "🏆 Fase")}</button>
        </div>
        {filterMode==="group" && (
          <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
            {["All","A","B","C","D","E","F","G","H","I","J","K","L","Knockout"].map(g=><Pill key={g} active={groupF===g} onClick={()=>setGroupF(g)} color={g==="Knockout"?C.gold:C.green}>{g==="All"?tx("All", "Todos"):g==="Knockout"?tx("🏆 KO", "🏆 Mata-mata"):g}</Pill>)}
          </div>
        )}
        {filterMode==="team" && (
          <select value={teamF} onChange={e=>setTeamF(e.target.value)} style={{width:"100%",padding:"8px 14px",background:C.s1,border:`1px solid ${C.b2}`,borderRadius:10,color:C.text,fontSize:14,outline:"none"}}>
            <option value="">{tx("All teams", "Todos os times")}</option>
            {allTeams.map(t=><option key={t} value={t}>{getFlag(t)} {displayTeamName(t, language)}</option>)}
          </select>
        )}
        {filterMode==="venue" && (
          <select value={venueF} onChange={e=>setVenueF(e.target.value)} style={{width:"100%",padding:"8px 14px",background:C.s1,border:`1px solid ${C.b2}`,borderRadius:10,color:C.text,fontSize:14,outline:"none"}}>
            <option value="">{tx("All venues", "Todos os estádios")}</option>
            {allVenues.map(v=><option key={v} value={v}>{displayVenueName(v, language)}</option>)}
          </select>
        )}
        {filterMode==="round" && (
          <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
            {[{id:"",label:tx("All", "Todos")},{id:"group",label:tx("Group Stage", "Fase de grupos")},{id:"r32",label:tx("Round of 32", "16 avos de final")},{id:"r16",label:tx("Round of 16", "Oitavas de final")},{id:"qf",label:tx("Quarter-Finals", "Quartas de final")},{id:"sf",label:tx("Semi-Finals", "Semifinais")},{id:"3rd",label:tx("3rd Place", "Disputa do 3º lugar")},{id:"final",label:tx("Final", "Final")}].map(r=>
              <Pill key={r.id} active={roundF===r.id} onClick={()=>setRoundF(r.id)} color={r.id===""?C.mid:C.gold}>{r.label}</Pill>
            )}
          </div>
        )}
        {/* Time zone toggle + counter */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
          <span style={{fontSize:13,color:C.mid,fontWeight:700,alignSelf:"flex-end",paddingBottom:3}}>{isPtBR ? `Exibindo ${shown.length} jogos` : `Displaying ${shown.length} matches`}</span>
          <div style={{display:"flex",background:C.s2,borderRadius:20,border:`1px solid ${C.b2}`,padding:2,gap:2}}>
            <button onClick={()=>setTimeMode("local")} style={{padding:"3px 10px",borderRadius:18,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:timeMode==="local"?C.green:"transparent",color:timeMode==="local"?"#030a05":C.dim,transition:"all .15s"}}>{tx("My Time", "Meu horário")}</button>
            <button onClick={()=>setTimeMode("venue")} style={{padding:"3px 10px",borderRadius:18,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:timeMode==="venue"?C.gold:"transparent",color:timeMode==="venue"?"#030a05":C.dim,transition:"all .15s"}}>{tx("Venue", "Estádio")}</button>
          </div>
        </div>
      </div>

      {/* Match list follows the filters directly in normal document flow */}
      <div style={{height:8}}/>

      {/* Match list */}
      {shown.length===0 ? <div style={{textAlign:"center",padding:"32px",color:C.dim}}>{tx("No matches found", "Nenhum jogo encontrado")}</div> : Object.entries(byDate).map(([date,ms],idx)=>(
        <div key={date} style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5,marginTop:10}}>
            <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>{date}</div>

          </div>
          {ms.map(m=>{
            const h = resolveSlot(m.home), a = resolveSlot(m.away);
            return <MatchCard key={m.id} m={{...m, home:h.team, away:a.team}} onAction={onAction} onMatchTap={onMatchTap} timeMode={timeMode} favTeam={favTeam} savedIds={savedIds} homeProvisional={h.provisional} awayProvisional={a.provisional}/>;
          })}
        </div>
      ))}
    </div>
  );
}

