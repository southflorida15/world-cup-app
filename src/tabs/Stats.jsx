import React, { useState, useEffect, useRef } from "react";
import { displayTeamName } from "../i18n/display";

// Shared App.jsx values, passed in as props rather than imported directly
// to avoid a circular import (App.jsx -> Stats.jsx -> App.jsx), since
// App.jsx itself needs to import this file to render it.
// C, DS, GROUPS, PREDS, RECENT4, TEAMS, getFlag, isCaptain, parseName,
// posColor, posLabel, posSort, useElemHeight, zafronixGet,
// Badge, Card, Crest, Pill, QuickFacts, RC, RecentForm, TeamHistoryCard

export default function StatsTab({
  language="en", t=(key, fallback)=>fallback,
  initial="", tabTop=116,
  // Shared App.jsx values, passed as props to avoid a circular import
  C, DS, GROUPS, PREDS, RECENT4, TEAMS, getFlag, isCaptain, parseName,
  posColor, posLabel, posSort, useElemHeight, zafronixGet,
  Badge, Card, Crest, Pill, QuickFacts, RC, RecentForm, TeamHistoryCard,
}) {
  const isPtBR = language === "pt-BR";
  const tx = (en, pt) => isPtBR ? pt : en;

  const [sel, setSel] = useState(initial);
  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const [posFilter, setPosFilter] = useState("All");
  const posFilterLabel = (pos) => {
    if (!isPtBR) return pos === "All" ? "All" : pos;
    return ({ All:"Todos", GK:"GOL", DEF:"DEF", MID:"MEI", FWD:"ATA" })[pos] || pos;
  };
  const playerPositionLabel = (pos) => {
    const label = posLabel(pos);
    if (!isPtBR) return label;
    return ({ GK:"GOL", DEF:"DEF", MID:"MEI", FWD:"ATA" })[label] || label;
  };
  const translatedTeamNote = (team, note) => {
    if (!isPtBR) return note;
    const ptNotes = {
      "Brazil":"O Brasil chega com enorme expectativa e talento ofensivo. A equipe combina estrelas de elite com tradição de cinco títulos mundiais.",
      "France":"A França tem um dos elencos mais fortes do torneio e segue como candidata ao título.",
      "Argentina":"Atual campeã mundial, a Argentina tenta manter o ciclo vencedor com uma mistura de experiência e nova geração.",
      "Spain":"A Espanha aposta em posse de bola, juventude e talento técnico para buscar mais um título mundial.",
      "England":"A Inglaterra chega com elenco forte e grandes nomes no meio e no ataque.",
      "Germany":"A Alemanha tenta voltar ao topo com uma geração talentosa e forte tradição em Copas.",
      "Portugal":"Portugal combina experiência, talento ofensivo e uma das gerações mais fortes de sua história.",
      "Netherlands":"A Holanda chega equilibrada, com defesa forte e tradição de grandes campanhas.",
      "Belgium":"A Bélgica ainda conta com nomes experientes e talento suficiente para incomodar qualquer rival.",
      "Mexico":"O México joga em casa e conta com apoio forte da torcida para tentar ir longe.",
      "United States":"Os Estados Unidos têm vantagem de jogar em casa e uma geração competitiva.",
      "Japan":"O Japão chega em ótima fase, com intensidade, organização e jogadores cada vez mais experientes.",
      "Morocco":"Marrocos mantém a base competitiva que surpreendeu o mundo e segue difícil de ser batido.",
    };
    return ptNotes[team] || note;
  };
  const playerCountLabel = (n) => isPtBR ? `${n} jogador${Number(n)===1?"":"es"}` : `${n} player${Number(n)===1?"":"s"}`;
  const [squadExpanded, setSquadExpanded] = useState(false);
  const [wcHistory, setWcHistory] = useState(null);
  const [wcHistoryLoading, setWcHistoryLoading] = useState(false);
  const d = sel ? TEAMS[sel] : null;

  useEffect(() => {
    if(!sel) return;
    setSquad(null); setErr(false); setLoading(true); setPosFilter("All"); setSquadExpanded(false);
    const zName = sel==="Czechia"?"Czech Republic":sel==="Bosnia & Herz."?"Bosnia and Herzegovina":sel==="Ivory Coast"?"Côte d'Ivoire":sel==="DR Congo"?"DR Congo":sel==="South Korea"?"South Korea":sel==="Turkiye"?"Turkey":sel==="Curacao"?"Curaçao":sel;
    zafronixGet("roster",{name:zName}).then(data => {
      setLoading(false);
      if(!data){setErr(true);return;}
      // The real API returns a bare array of players directly, not wrapped
      // in an envelope object — data?.squad/.players/.roster were all
      // undefined against the actual response shape, silently falling
      // through to the empty-array default (every team showed "0 players").
      // Confirmed directly against a real API response before fixing.
      const rosterArray = Array.isArray(data) ? data : (data?.squad||data?.players||data?.roster||[]);
      const players=rosterArray
        .map(p=>({name:parseName(p.name),rawName:p.name,captain:p.captain??isCaptain(p.name),pos:p.position,jersey:p.jersey,age:p.ageAtTournament??p.age,born:p.born,club:p.club?.name??p.club,clubCountry:p.club?.country,photo:p.photo??null,flagUrl:data?.flag?.flagUrl??null}))
        .sort((a,b)=>posSort(a.pos)-posSort(b.pos)||(a.jersey||99)-(b.jersey||99));
      if (!players.length) { setErr(true); return; }
      setSquad(players);
    });
    setWcHistory(null); setWcHistoryLoading(true);
    zafronixGet("team",{name:zName}).then(data => { setWcHistoryLoading(false); setWcHistory(data); });
  }, [sel]);

  const posCounts = squad?{All:squad.length,GK:squad.filter(p=>posLabel(p.pos)==="GK").length,DEF:squad.filter(p=>posLabel(p.pos)==="DEF").length,MID:squad.filter(p=>posLabel(p.pos)==="MID").length,FWD:squad.filter(p=>posLabel(p.pos)==="FWD").length}:{};
  const filtered = squad?(posFilter==="All"?squad:squad.filter(p=>posLabel(p.pos)===posFilter)):[];
  // Average squad age — computed from the live roster's ageAtTournament
  // field (already fetched, no extra request). Filters out anyone missing
  // an age rather than treating them as 0, so a few unknown ages don't
  // silently drag the average down.
  const squadAges = squad ? squad.map(p=>p.age).filter(a=>typeof a==="number" && a>0) : [];
  const avgAge = squadAges.length ? (squadAges.reduce((s,a)=>s+a,0)/squadAges.length) : null;
  const _shRef = useRef(null); const _shH = useElemHeight(_shRef);

  return (
    <div>
      {/* Tournament facts at top of Stats */}
      <QuickFacts tabTop={tabTop}/>
      <div ref={_shRef} style={{position:"relative",top:0,left:"auto",transform:"none",width:"100%",maxWidth:700,zIndex:2,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:DS.shadow.sticky,padding:"8px 13px"}}>
        <select value={sel} onChange={e=>setSel(e.target.value)} style={{width:"100%",padding:"10px 14px",background:C.s1,border:`1px solid ${C.b2}`,borderRadius:10,color:C.text,fontSize:14,outline:"none"}}>
          <option value="">{tx("Select a team", "Selecione um time")}</option>
          {Object.keys(GROUPS).map(g=><optgroup key={g} label={`${tx("Group", "Grupo")} ${g}`}>{GROUPS[g].teams.map(t=><option key={t} value={t}>{getFlag(t)} {displayTeamName(t, language)}</option>)}</optgroup>)}
        </select>
      </div>
      <div style={{height:0}}/>
      
      {!sel && <div style={{textAlign:"center",padding:"44px 20px",color:C.dim,fontSize:13}}>{tx("Select any of the 48 teams to view their squad", "Selecione uma das 48 seleções para ver o elenco")}</div>}
      {sel && d && (
        <div>
          <Card style={{marginBottom:12}}>
            <div style={{padding:14}}>
              <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
                <Crest team={sel} size={52}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                    <div style={{fontWeight:700,fontSize:20,color:C.text}}>{displayTeamName(sel, language)}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      {(() => { const p=PREDS.find(x=>x.team===sel); return p ? (
                        <a href="https://polymarket.com/event/world-cup-winner" target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",flexShrink:0}}>
                          <div style={{textAlign:"center",background:`${C.green}18`,border:`1px solid ${C.green}44`,borderRadius:10,padding:"5px 10px",cursor:"pointer"}}>
                            <div style={{fontSize:16,fontWeight:900,color:C.green,lineHeight:1}}>{p.poly}%</div>
                            <div style={{fontSize:9,color:C.dim,marginTop:2}}>{tx("to win", "chance de título")}</div>
                          </div>
                        </a>
                      ) : null; })()}
                    </div>
                  </div>
                  <div style={{fontSize:12,color:C.mid,marginTop:3}}>{d.conf} · {tx("Coach", "Técnico")}: {d.coach}</div>
                  <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                    <Badge color={C.blue}>#{d.rank} FIFA</Badge>
                    <Badge color={C.gold}>{d.titles} 🏆</Badge>
                    {d.base && d.base!=="TBC" && <Badge color={C.dim}>🏨 {d.base}</Badge>}
                  </div>
                </div>
              </div>
              <div style={{fontSize:10,color:C.dim,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:7}}>{tx("Sofascore Attributes", "Atributos Sofascore")}</div>
              <div style={{display:"flex",justifyContent:"space-between",gap:4}}>
                {Object.entries(d.stats).map(([k,v])=>(
                  <div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                    <RC v={v} sz={34}/>
                    <span style={{fontSize:8,color:C.dim,textTransform:"uppercase",textAlign:"center"}}>{k}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card style={{marginBottom:12}}>
            <div style={{padding:13}}>
              <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:7}}>{tx("2026 Analysis", "Análise 2026")}</div>
              <p style={{fontSize:13,color:C.mid,lineHeight:1.7,margin:0}}>{translatedTeamNote(sel, d.note)}</p>
            </div>
          </Card>
          <Card style={{marginBottom:12}}>
            <button onClick={()=>setSquadExpanded(e=>!e)} style={{width:"100%",padding:"10px 14px",borderBottom:squadExpanded?`1px solid ${C.b1}`:"none",display:"flex",justifyContent:"space-between",alignItems:"center",background:"none",border:"none",borderBottomWidth:squadExpanded?1:0,borderBottomStyle:"solid",borderBottomColor:C.b1,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontWeight:700,color:C.green,fontSize:13}}>{tx("SQUAD", "ELENCO")}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {squad && <span style={{fontSize:11,color:C.dim}}>{playerCountLabel(squad.length)}{avgAge!==null ? (isPtBR ? ` · idade média ${avgAge.toFixed(1)}` : ` · avg age ${avgAge.toFixed(1)}`) : ""}</span>}
                <span style={{fontSize:11,color:C.dim,transform:squadExpanded?"rotate(180deg)":"none",transition:"transform .15s"}}>▾</span>
              </div>
            </button>
            {loading && (
              <div style={{padding:"32px 0",textAlign:"center"}}>
                <div style={{width:28,height:28,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 10px"}}/>
                <div style={{fontSize:12,color:C.mid}}>{tx("Fetching squad...", "Buscando elenco...")}</div>
              </div>
            )}
            {squadExpanded && err && (
              <div style={{padding:14}}>
                <div style={{fontSize:12,color:C.dim,marginBottom:10}}>{tx("Predicted squad — showing key players", "Elenco previsto — mostrando jogadores-chave")}</div>
                {d.players.map((p,i)=>(
                  <div key={p.name} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<d.players.length-1?`1px solid ${C.b1}`:"none"}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:8,background:`${posColor(p.pos)}22`,color:posColor(p.pos)}}>{playerPositionLabel(p.pos)}</span>
                    <span style={{fontWeight:600,color:C.text,flex:1,fontSize:13}}>{p.name}</span>
                    <span style={{fontSize:11,color:C.dim}}>{p.club}</span>
                    <RC v={p.ss} sz={28}/>
                  </div>
                ))}
              </div>
            )}
            {squadExpanded && squad && !loading && (
              <div>
                <div style={{display:"flex",gap:6,padding:"10px 12px",borderBottom:`1px solid ${C.b1}`,overflowX:"auto",scrollbarWidth:"none"}}>
                  {["All","GK","DEF","MID","FWD"].map(pos=>(
                    <Pill key={pos} active={posFilter===pos} onClick={()=>setPosFilter(pos)} color={pos==="GK"?C.blue:pos==="DEF"?C.green:pos==="MID"?C.gold:pos==="FWD"?C.red:C.green}>
                      {posFilterLabel(pos)}{posCounts[pos]!==undefined?` (${posCounts[pos]})`:""}
                    </Pill>
                  ))}
                </div>
                {filtered.map((p,i)=>{
                  const pc=posColor(p.pos);
                  return (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderBottom:i<filtered.length-1?`1px solid ${C.b1}`:"none"}}>
                      {p.jersey && <span style={{fontSize:12,color:C.dim,minWidth:22,textAlign:"center",fontFamily:"monospace"}}>#{p.jersey}</span>}
                      {!p.jersey && <span style={{minWidth:22}}/>}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <span style={{fontWeight:600,color:C.text,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                          {p.captain && <span style={{fontSize:9,background:`${C.gold}33`,color:C.gold,padding:"1px 5px",borderRadius:6,fontWeight:700,flexShrink:0}}>C</span>}
                        </div>
                        <div style={{fontSize:10,color:C.dim,marginTop:1}}>{p.club}{p.clubCountry?` · ${p.clubCountry}`:""}{p.age ? (isPtBR ? ` · Idade ${p.age}` : ` · Age ${p.age}`) : ""}</div>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:8,background:`${pc}22`,color:pc,flexShrink:0}}>{playerPositionLabel(p.pos)}</span>
                    </div>
                  );
                })}
                <div style={{padding:"8px 14px",borderTop:`1px solid ${C.b1}`}}>
                  <span style={{fontSize:10,color:C.dim}}>{tx("Squad data sourced from official records", "Dados do elenco obtidos de registros oficiais")}</span>
                </div>
              </div>
            )}
          </Card>

          <Card style={{marginBottom:12}}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.b1}`}}>
              <span style={{fontWeight:700,color:C.green,fontSize:13}}>🏆 {tx("WORLD CUP HISTORY", "HISTÓRICO EM COPAS")}</span>
            </div>
            <div style={{padding:13}}>
              {wcHistoryLoading && (
                <div style={{padding:"24px 0",textAlign:"center"}}>
                  <div style={{width:24,height:24,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 10px"}}/>
                  <div style={{fontSize:12,color:C.mid}}>{tx("Fetching World Cup history…", "Buscando histórico em Copas…")}</div>
                </div>
              )}
              {!wcHistoryLoading && <TeamHistoryCard team={sel} data={wcHistory} color={C.green}/>}
            </div>
          </Card>

          {/* Dynamic recent form — auto-switches to live WC data after Jun 11 */}
          <RecentForm team={sel} staticData={RECENT4[sel]}/>
        </div>
      )}
    </div>
  );
}

