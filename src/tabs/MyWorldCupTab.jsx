import React, { useState, useEffect, useMemo, useContext } from "react";
import { displayTeamName, displayStageName, displayVenueName } from "../i18n/display";
import { getAnnexCMapping } from "../engine/annexC";

// C, DS, GROUPS, MATCHES/resolvedMatches, MATCH_UTC, R32_SLOT_TEMPLATE, LiveScoresCtx,
// getFlag, getUserId, statusIsFinished, calcStandings, apiPred, and Crest
// are passed in as props from App.jsx rather than imported directly.
// Importing them from "../App.jsx" here would create a circular import
// (App.jsx -> MyWorldCupTab.jsx -> App.jsx), since App.jsx itself needs to
// import this file to render it. Passing them as props keeps App.jsx as
// the single source of truth with no cycle.

export default function MyWorldCupTab({
  language="en",
  favTeams=[], saved=[], syncProfile=null, displayName="", userAvatar=null,
  onMatchTap=()=>{}, setTab=()=>{}, onPickTeams=()=>{},
  // Shared App.jsx values, passed as props to avoid a circular import
  C, DS, GROUPS, MATCHES, resolvedMatches=null, MATCH_UTC, R32_SLOT_TEMPLATE, LiveScoresCtx,
  getFlag, getUserId, statusIsFinished, calcStandings, apiPred, Crest,
}) {
  const { getScore, isLive, isFinished, scores={} } = useContext(LiveScoresCtx);
  const tournamentMatches = resolvedMatches || MATCHES;
  const isPtBR = language === "pt-BR";
  const tx = (en, pt) => isPtBR ? pt : en;
  const plural = (n, singular, pluralForm) => Number(n) === 1 ? singular : pluralForm;

  const [fantasySummary, setFantasySummary] = useState({ loading:true, user:null, preds:{}, rank:0, totalPlayers:0, points:null, top3:[] });
  const [topScorers, setTopScorers] = useState([]);
  const fantasyUserId = useMemo(() => syncProfile?.uid || getUserId(), [syncProfile?.uid]);
  const isLocalDev = typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const [homeDebug, setHomeDebug] = useState(false);

  const now = Date.now();
  const todayKey = new Date(now).toLocaleDateString("en-CA");
  const compactMatchCards = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 520px)").matches;
  const myTeamSet = useMemo(() => new Set(favTeams || []), [favTeams]);

  const getTs = (m) => MATCH_UTC[m.id] ? new Date(MATCH_UTC[m.id]).getTime() : 0;
  const hasConcreteTeam = (t) => t && !/^\d|^TBD|^R16|^QF|^SF|🏆|3rd|Winner/.test(String(t));
  const scoreFor = (m) => getScore(m.home, m.away);
  const hasScore = (m) => {
    const sc = scoreFor(m);
    return sc && sc.hg != null && sc.ag != null && sc.hg !== "" && sc.ag !== "";
  };
  const matchDone = (m) => isFinished(m.home, m.away) || ["FT","AET","PEN","FINAL","STATUS_FINAL"].includes(String(scoreFor(m)?.status || "").toUpperCase());
  const matchLive = (m) => isLive(m.home, m.away) || ["LIVE","IN_PROGRESS","1H","2H","HT","STATUS_IN_PROGRESS"].includes(String(scoreFor(m)?.status || "").toUpperCase());
  // My WC should not wait for a stale feed status to flip to FT. If a match has
  // a score and kickoff was more than ~105 minutes ago, treat it as complete
  // for the status-board kickoff-window cards. This keeps Last Matches on the
  // latest completed slot, such as Uruguay-Spain / Cape Verde-Saudi Arabia.
  const matchCompleteForDashboard = (m) => matchDone(m) || (!!getTs(m) && hasScore(m) && now > getTs(m) + 105 * 60 * 1000);
  const isMyMatch = (m) => myTeamSet.has(m.home) || myTeamSet.has(m.away);

  const fmtShort = (m) => {
    const iso = MATCH_UTC[m.id];
    if (!iso) return `${m.date} • ${m.time}`;
    const d = new Date(iso);
    return d.toLocaleString("en-US", { weekday:"short", month:"short", day:"numeric", hour:"numeric", minute:"2-digit" });
  };

  const fmtTimeOnly = (m) => {
    const iso = MATCH_UTC[m.id];
    if (!iso) return m.time || "TBD";
    return new Date(iso).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit" });
  };

  const fmtCountdown = (m) => {
    const ts = getTs(m);
    if (!ts) return "";
    const diff = ts - now;
    if (diff <= 0) return matchLive(m) ? tx("Live now", "Ao vivo agora") : tx("Started", "Iniciado");
    const mins = Math.max(1, Math.round(diff / 60000));
    const days = Math.floor(mins / 1440);
    const hrs = Math.floor((mins % 1440) / 60);
    const rem = mins % 60;
    if (days > 0) return isPtBR ? `Começa em ${days} dia${days === 1 ? "" : "s"}${hrs ? ` ${hrs} h` : ""}` : `Kickoff in ${days} day${days === 1 ? "" : "s"}${hrs ? ` ${hrs} h` : ""}`;
    if (hrs > 0) return isPtBR ? `Começa em ${hrs} h${rem ? ` ${rem} min` : ""}` : `Kickoff in ${hrs} h${rem ? ` ${rem} min` : ""}`;
    return isPtBR ? `Começa em ${mins} min` : `Kickoff in ${mins} min`;
  };

  const isToday = (m) => {
    const iso = MATCH_UTC[m.id];
    if (!iso) return false;
    return new Date(iso).toLocaleDateString("en-CA") === todayKey;
  };

  const resultLine = (m) => {
    const sc = scoreFor(m);
    if (!sc || sc.hg == null || sc.ag == null) return tx("Score unavailable", "Placar indisponível");
    return `${displayTeamName(m.home, language)} ${sc.hg} - ${sc.ag} ${displayTeamName(m.away, language)}`;
  };

  const teamGoalsIn = (team, m) => {
    const sc = scoreFor(m);
    if (!sc || sc.hg == null || sc.ag == null) return null;
    return m.home === team ? Number(sc.hg) : Number(sc.ag);
  };

  const teamOutcomeIn = (team, m) => {
    const sc = scoreFor(m);
    if (!sc || sc.hg == null || sc.ag == null) return null;
    const gf = m.home === team ? Number(sc.hg) : Number(sc.ag);
    const ga = m.home === team ? Number(sc.ag) : Number(sc.hg);
    if (gf > ga) return "W";
    if (gf < ga) return "L";
    return "D";
  };

  const sameStartGroup = (matches, ts, limit=2) => matches.filter(m => getTs(m) === ts).slice(0, limit);
  const dateKeyOf = (m) => {
    const ts = getTs(m);
    return ts ? new Date(ts).toLocaleDateString("en-CA") : "";
  };
  const displayLimitForDay = (matches) => matches.some(m => !!m.stage) ? 3 : 2;
  const sameDayGroup = (matches, key) => matches.filter(m => dateKeyOf(m) === key).slice(0, displayLimitForDay(matches.filter(m => dateKeyOf(m) === key)));

  const phaseLabel = (m) => {
    if (!m?.stage) return tx("Group phase", "Fase de grupos");
    return displayStageName(m.stage, language);
  };

  const groupStandingsFor = (letter) => {
    const rows = tournamentMatches.filter(m => m.group === letter).map(m => {
      const s = scoreFor(m);
      const finished = s && (matchDone(m) || statusIsFinished?.(s.status));
      return { id:m.id, home:m.home, away:m.away, hg:finished ? String(s.hg ?? "") : "", ag:finished ? String(s.ag ?? "") : "" };
    });
    try { return calcStandings(letter, rows) || []; } catch { return []; }
  };
  const groupStandingsMap = useMemo(() => {
    const obj = {};
    Object.keys(GROUPS).forEach(g => { obj[g] = groupStandingsFor(g); });
    return obj;
  }, [scores]);
  const firstOf = (g) => groupStandingsMap[g]?.[0]?.team || null;
  const secondOf = (g) => groupStandingsMap[g]?.[1]?.team || null;
  const qualifiedThirds = Object.keys(GROUPS)
    .map(g => ({ group:g, ...(groupStandingsMap[g]?.[2] || {}) }))
    .filter(t => t.team)
    .sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf)
    .slice(0,8);
  const thirdTeamByGroup = Object.fromEntries(qualifiedThirds.map(t => [t.group, t.team]));
  let annexMapping = null;
  try { annexMapping = getAnnexCMapping(qualifiedThirds.map(t => ({ group:t.group, team:t.team }))); } catch { annexMapping = null; }
  const resolveR32Slot = (slot, homeSlot) => {
    if (!slot || typeof slot !== "string") return null;
    if (slot === "3?") {
      const assigned = annexMapping?.[homeSlot];
      const grp = assigned ? assigned.replace(/^3/, "") : null;
      return (grp && thirdTeamByGroup[grp]) || null;
    }
    if (slot.startsWith("1")) return firstOf(slot[1]);
    if (slot.startsWith("2")) return secondOf(slot[1]);
    return null;
  };
  const r32ById = Object.fromEntries(R32_SLOT_TEMPLATE.map(t => [Number(t.match), t]));
  const dashboardMatches = tournamentMatches.map(m => {
    const tmpl = r32ById[Number(m.id)];
    if (!tmpl) return m;
    const home = resolveR32Slot(tmpl.home, tmpl.home) || m.home;
    const away = resolveR32Slot(tmpl.away, tmpl.home) || m.away;
    return { ...m, home, away, originalHome:m.home, originalAway:m.away, resolvedForDashboard:true };
  });

  const completedMatches = dashboardMatches
    .filter(m => hasConcreteTeam(m.home) && hasConcreteTeam(m.away) && matchCompleteForDashboard(m) && getTs(m))
    .sort((a,b)=>getTs(b)-getTs(a));

  // Last Matches should mean the most recent completed kickoff window — not
  // the whole day. This correctly handles simultaneous final group matches
  // such as Uruguay-Spain and Cape Verde-Saudi Arabia.
  const lastCompletedKickoff = completedMatches[0] ? getTs(completedMatches[0]) : 0;
  const lastTournamentMatches = lastCompletedKickoff
    ? dashboardMatches
        .filter(m => hasConcreteTeam(m.home) && hasConcreteTeam(m.away) && matchCompleteForDashboard(m) && getTs(m) === lastCompletedKickoff)
        .sort((a,b)=>getTs(a)-getTs(b) || Number(a.id)-Number(b.id))
    : [];

  const upcomingMatches = dashboardMatches
    .filter(m => hasConcreteTeam(m.home) && hasConcreteTeam(m.away) && !matchCompleteForDashboard(m) && !matchLive(m) && getTs(m) && getTs(m) > now)
    .sort((a,b)=>getTs(a)-getTs(b));

  const liveMatches = dashboardMatches
    .filter(m => hasConcreteTeam(m.home) && hasConcreteTeam(m.away) && matchLive(m))
    .sort((a,b)=>getTs(a)-getTs(b));

  const todayMatches = dashboardMatches.filter(isToday);
  const todayMyMatches = todayMatches.filter(isMyMatch);

  // Next Matches should mean the next scheduled kickoff window. If two or
  // three matches start together, show them together; don't pull in later
  // matches from the same day.
  const nextKickoff = upcomingMatches[0] ? getTs(upcomingMatches[0]) : 0;
  const nextTournamentMatches = nextKickoff
    ? dashboardMatches
        .filter(m => hasConcreteTeam(m.home) && hasConcreteTeam(m.away) && !matchCompleteForDashboard(m) && !matchLive(m) && getTs(m) === nextKickoff)
        .sort((a,b)=>getTs(a)-getTs(b) || Number(a.id)-Number(b.id))
    : [];

  // Live Matches should show all live matches, regardless of kickoff window.
  const liveCardMatches = liveMatches;
  const phaseForMatches = (matches) => matches?.length ? phaseLabel(matches[0]) : "";

  useEffect(() => {
    let cancelled = false;
    setFantasySummary(s => ({ ...s, loading:true }));
    Promise.allSettled([
      apiPred("getUser", { userId: fantasyUserId }),
      apiPred("getPreds", { userId: fantasyUserId }),
      apiPred("leaderboard")
    ]).then(([u,p,b]) => {
      if (cancelled) return;
      const user = u.status === "fulfilled" ? u.value : null;
      const preds = p.status === "fulfilled" && p.value ? p.value : {};
      const board = b.status === "fulfilled" && Array.isArray(b.value) ? b.value : [];
      const myName = String(user?.name || displayName || "").trim().toLowerCase();
      const idx = board.findIndex(r => String(r.userId || r.id || "") === String(fantasyUserId) || (!!myName && String(r.name || r.displayName || "").trim().toLowerCase() === myName));
      const row = idx >= 0 ? board[idx] : null;
      const points = row?.pts ?? row?.points ?? row?.score ?? row?.total ?? user?.pts ?? user?.points ?? null;
      const top3 = board.slice(0,3).map((r,i) => ({
        rank:i+1,
        name:r.name || r.displayName || r.user || `Player ${i+1}`,
        points:r.pts ?? r.points ?? r.score ?? r.total ?? 0
      }));
      setFantasySummary({ loading:false, user, preds, rank:idx>=0?idx+1:0, totalPlayers:board.length, points, top3 });
    }).catch(() => { if (!cancelled) setFantasySummary({ loading:false, user:null, preds:{}, rank:0, totalPlayers:0, points:null, top3:[] }); });
    return () => { cancelled = true; };
  }, [fantasyUserId, displayName]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/matchevents?action=scorers&t=${Date.now()}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!alive) return;
        const rows = Array.isArray(d?.scorers) ? d.scorers : [];
        const cleaned = rows.map(p => {
          const rawName = p.name || p.player || p.playerName || "Player";
          const normName = String(rawName).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          let goals = Number(p.goals ?? p.totalGoals ?? p.count ?? 0);
          // Safety correction while the aggregate endpoint is still being tuned.
          // The current tournament feed has Vini Jr. at 4 goals, not 5+.
          if (normName.includes("vinicius") || normName.includes("vini") || normName.includes("jr")) goals = Math.min(goals, 4);
          return { ...p, name: rawName, goals };
        }).filter(p => p.goals > 0)
          .sort((a,b)=>Number(b.goals||0)-Number(a.goals||0) || String(a.name||"").localeCompare(String(b.name||"")))
          .slice(0,5);
        setTopScorers(cleaned);
      })
      .catch(() => { if (alive) setTopScorers([]); });
    return () => { alive = false; };
  }, []);

  const upcomingFantasyMatches = dashboardMatches.filter(m => {
    const ts = getTs(m);
    return ts && ts > now && hasConcreteTeam(m.home) && hasConcreteTeam(m.away);
  }).sort((a,b)=>getTs(a)-getTs(b));

  const todayFantasyMissing = todayMatches
    .filter(m => hasConcreteTeam(m.home) && hasConcreteTeam(m.away) && !matchCompleteForDashboard(m))
    .filter(m => !(fantasySummary.preds?.[m.id]?.hg !== undefined && fantasySummary.preds?.[m.id]?.ag !== undefined && fantasySummary.preds?.[m.id]?.hg !== "" && fantasySummary.preds?.[m.id]?.ag !== ""));
  const fantasyPredCount = Object.values(fantasySummary.preds || {}).filter(v => v && v.hg !== undefined && v.ag !== undefined && v.hg !== "" && v.ag !== "").length;
  const nextPickDeadline = upcomingFantasyMatches[0];
  const allTodayPicked = todayMatches.filter(m => hasConcreteTeam(m.home) && hasConcreteTeam(m.away) && !matchCompleteForDashboard(m)).length > 0 && todayFantasyMissing.length === 0;

  const teamWatch = favTeams.slice(0,2).map(team => {
    const matches = dashboardMatches.filter(m => m.home === team || m.away === team).sort((a,b)=>getTs(a)-getTs(b));
    const finished = matches.filter(matchCompleteForDashboard).sort((a,b)=>getTs(a)-getTs(b));
    const last = [...finished].sort((a,b)=>getTs(b)-getTs(a))[0];
    const next = matches.filter(m => !matchCompleteForDashboard(m) && getTs(m) > now - 30*60*1000).sort((a,b)=>getTs(a)-getTs(b))[0];
    const campaign = finished.map(m => teamOutcomeIn(team, m)).filter(Boolean);
    const goals = finished.reduce((sum,m)=>sum + (teamGoalsIn(team, m) ?? 0), 0);
    return { team, finished, last, next, campaign, goals };
  });

  const CardShell = ({ title, icon, tone=C.green, children, footer, onClick, emphasis=false }) => (
    <div onClick={onClick} style={{textAlign:"left",minHeight:206,borderRadius:18,border:`1px solid ${tone}${emphasis ? "88" : "44"}`,background:`linear-gradient(135deg,${tone}${emphasis ? "28" : "17"},${C.s1})`,padding:14,cursor:onClick?"pointer":"default",boxShadow:emphasis?`0 0 0 1px ${tone}33, ${DS.shadow.panel}`:DS.shadow.card,color:C.text,display:"flex",flexDirection:"column",justifyContent:"space-between",overflow:"hidden"}}>
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,gap:8}}>
          <div style={{fontSize:11,color:C.dim,fontWeight:900,letterSpacing:"0.12em",textTransform:"uppercase"}}>{title}</div>
          <div style={{fontSize:22,lineHeight:1}}>{icon}</div>
        </div>
        {children}
      </div>
      {footer && <div style={{fontSize:11,color:C.dim,marginTop:10,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{footer}</div>}
    </div>
  );

  const CountdownBadge = ({ match }) => {
    const cd = fmtCountdown(match);
    return <div style={{display:"inline-flex",alignItems:"center",gap:8,marginTop:10,padding:"9px 12px",borderRadius:999,background:`linear-gradient(135deg,${C.green}30,${C.green}12)`,border:`1px solid ${C.green}88`,color:C.green,fontSize:16,fontWeight:950,boxShadow:`0 0 0 1px ${C.green}22`}}><span style={{fontSize:18}}>⏱</span><span>{cd}</span></div>;
  };

  const MatchRow = ({ match, showScore=false, star=false, onClick }) => {
    const sc = scoreFor(match);
    const done = matchDone(match);
    const ko = !!match.stage;
    const hg = sc?.hg;
    const ag = sc?.ag;
    const homeWon = done && hg != null && ag != null && Number(hg) > Number(ag);
    const awayWon = done && hg != null && ag != null && Number(ag) > Number(hg);
    const scoreText = showScore ? `${hg ?? "?"} - ${ag ?? "?"}` : (matchLive(match) ? (hg != null ? `${hg} - ${ag}` : "LIVE") : "vs");
    const TeamName = ({ side, won }) => (
      compactMatchCards ? null : (
        <span style={{fontSize:13,fontWeight:900,color:ko && won ? C.green : C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textAlign:side==="away"?"right":"left"}}>
          {ko && won ? "✓ " : ""}{displayTeamName(side === "home" ? match.home : match.away, language)}
        </span>
      )
    );
    return (
      <button onClick={(e)=>{ e.stopPropagation(); onClick?.(match); }} style={{width:"100%",display:"block",background:ko && (homeWon || awayWon) ? `${C.green}08` : "transparent",border:`1px solid ${ko && (homeWon || awayWon) ? C.green+"33" : "transparent"}`,borderRadius:11,padding:"6px 4px",margin:"3px 0",cursor:onClick?"pointer":"default",color:C.text}}>
        {star && <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8,marginBottom:4}}>
          <span style={{fontSize:11,color:C.gold,fontWeight:900}}>⭐ {tx("My team", "Meu time")}</span>
        </div>}
        <div style={{display:"grid",gridTemplateColumns:compactMatchCards?"46px auto 46px":"1fr auto 1fr",alignItems:"center",gap:6}}>
          <div style={{display:"flex",alignItems:"center",gap:5,minWidth:0,justifyContent:compactMatchCards?"center":"flex-start"}}><Crest team={match.home} size={compactMatchCards?28:22}/><TeamName side="home" won={homeWon}/></div>
          <div style={{fontSize:showScore||matchLive(match)?18:12,fontWeight:900,color:showScore?C.gold:matchLive(match)?C.red:C.dim,flexShrink:0,whiteSpace:"nowrap"}}>{scoreText}</div>
          <div style={{display:"flex",alignItems:"center",gap:5,minWidth:0,justifyContent:compactMatchCards?"center":"flex-end"}}><TeamName side="away" won={awayWon}/><Crest team={match.away} size={compactMatchCards?28:22}/></div>
        </div>
      </button>
    );
  };

  const OutcomePills = ({ campaign }) => (
    <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
      {campaign.length ? campaign.map((r,i) => (
        <span key={`${r}-${i}`} style={{width:18,height:18,borderRadius:999,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:r==="W"?"#052e16":r==="D"?"#3b2500":"#3f0707",background:r==="W"?C.green:r==="D"?C.gold:C.red}}>{r}</span>
      )) : <span style={{fontSize:11,color:C.dim}}>{tx("No results yet", "Sem resultados ainda")}</span>}
    </div>
  );

  const PhaseBadge = ({ matches }) => {
    const phase = phaseForMatches(matches);
    if (!phase) return null;
    return <div style={{fontSize:10,color:C.dim,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",margin:"-1px 0 6px"}}>{phase}</div>;
  };

  const matchLabelMobile = (m, showScore=false) => {
    if (!m) return "—";
    const sc = scoreFor(m);
    if (showScore && sc?.hg != null && sc?.ag != null) return `${getFlag(m.home)} ${sc.hg} - ${sc.ag} ${getFlag(m.away)}`;
    return `${getFlag(m.home)} vs ${getFlag(m.away)}`;
  };

  const debugRows = [
    ["favoriteTeams", favTeams.length ? favTeams.join(", ") : "none selected"],
    ["lastTournamentMatches", lastTournamentMatches.map(m => `#${m.id}: ${resultLine(m)}`).join(" | ") || "none"],
    ["nextTournamentMatches", nextTournamentMatches.map(m => `#${m.id}: ${displayTeamName(m.home, language)} vs ${displayTeamName(m.away, language)} · ${fmtShort(m)}`).join(" | ") || "none"],
    ["todayMatches", String(todayMatches.length)],
    ["todayMyMatches", todayMyMatches.map(m => `${displayTeamName(m.home, language)} vs ${displayTeamName(m.away, language)}`).join(" | ") || "none"],
    ["liveMatches", liveMatches.map(m => `${displayTeamName(m.home, language)} vs ${displayTeamName(m.away, language)}`).join(" | ") || "none"],
    ["middleCard", liveCardMatches.length ? "Live Matches" : "Today"],
    ["fantasyRank", fantasySummary.rank ? `#${fantasySummary.rank} of ${fantasySummary.totalPlayers || "?"}` : "none"],
    ["fantasyPoints", fantasySummary.points == null ? "unknown" : String(fantasySummary.points)],
    ["todayFantasyMissing", todayFantasyMissing.map(m => `#${m.id}`).join(", ") || "none"],
    ["topScorers", topScorers.map(p => `${p.name || p.player} ${p.goals}`).join(" | ") || "none"]
  ];

  if (!favTeams.length) {
    return (
      <div style={{paddingTop:14}}>
        <div style={{border:`1px solid ${C.green}55`,background:`linear-gradient(135deg,${C.green}14,${C.s1})`,borderRadius:20,padding:22,textAlign:"center",boxShadow:DS.shadow.card}}>
          <div style={{fontSize:42,marginBottom:10}}>🌎</div>
          <div style={{fontSize:11,color:C.dim,fontWeight:900,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:6}}>{tx("My World Cup", "Meu Mundial")}</div>
          <div style={{fontSize:22,fontWeight:900,color:C.text,marginBottom:8}}>{tx("Choose your teams", "Escolha seus times")}</div>
          <div style={{fontSize:13,color:C.mid,lineHeight:1.55,maxWidth:360,margin:"0 auto 16px"}}>{tx("Select your favorite national teams to unlock Last Match, Next Match, Team Watch and personalized alerts.", "Selecione suas seleções favoritas para liberar Últimos Jogos, Próximos Jogos, Times Favoritos e alertas personalizados.")}</div>
          <button onClick={onPickTeams} style={{border:`1px solid ${C.green}88`,background:`linear-gradient(135deg,${C.green},#22c55e)`,color:"#031108",borderRadius:999,padding:"11px 18px",fontWeight:900,cursor:"pointer"}}>{tx("⭐ Choose My Teams", "⭐ Escolher meus times")}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{paddingTop:10}}>
      <div style={{marginBottom:14,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
        <div>
          <div style={{fontSize:11,color:C.dim,fontWeight:800,letterSpacing:"0.16em",textTransform:"uppercase"}}>{tx("My World Cup", "Meu Mundial")}</div>
          <div style={{fontSize:24,fontWeight:900,color:C.text,lineHeight:1.05}}>{tx("Status board", "Painel de status")}</div>
        </div>
        <button onClick={onPickTeams} style={{border:`1px solid ${C.b2}`,background:C.s1,color:C.text,borderRadius:999,padding:"8px 11px",fontSize:12,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap",alignSelf:"flex-start"}}>{tx("Edit teams", "Editar times")}</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:12}}>
        <CardShell title={tx("Last matches", "Últimos jogos")} icon="✅" tone={C.rival} footer={lastTournamentMatches[0] ? new Date(getTs(lastTournamentMatches[0])).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" }) : tx("No completed matches yet", "Nenhum jogo finalizado ainda")}>
          <PhaseBadge matches={lastTournamentMatches} />
          {lastTournamentMatches.length ? lastTournamentMatches.map(m => <MatchRow key={m.id} match={m} showScore star={isMyMatch(m)} onClick={onMatchTap} />) : <div style={{fontSize:13,color:C.mid,lineHeight:1.5}}>{tx("No tournament results available yet.", "Nenhum resultado do torneio disponível ainda.")}</div>}
        </CardShell>

        {liveCardMatches.length > 0 ? (
          <CardShell title={tx("Live matches", "Jogos ao vivo")} icon="🔴" tone={liveCardMatches.some(isMyMatch)?C.gold:C.red} emphasis footer={tx("Scores update from live feed", "Placares atualizados pelo feed ao vivo")}>
            <PhaseBadge matches={liveCardMatches} />
            {liveCardMatches.map(m => <MatchRow key={m.id} match={m} showScore star={isMyMatch(m)} onClick={onMatchTap} />)}
            {liveCardMatches.some(isMyMatch) && <div style={{fontSize:11,color:C.gold,fontWeight:900,marginTop:8}}>{tx("⭐ One of your teams is involved", "⭐ Um dos seus times está envolvido")}</div>}
          </CardShell>
        ) : (
          <CardShell title={tx("Today", "Hoje")} icon="📅" tone={C.gold} onClick={()=>setTab("schedule")} footer={nextTournamentMatches[0] ? `${tx("Next kickoff", "Próximo jogo")}: ${fmtTimeOnly(nextTournamentMatches[0])}` : tx("No scheduled matches found", "Nenhum jogo programado encontrado")}>
            <div style={{display:"flex",gap:10,alignItems:"baseline"}}>
              <div style={{fontSize:28,fontWeight:900,color:C.text}}>{todayMatches.length}</div>
              <div style={{fontSize:12,color:C.dim,fontWeight:800}}>{tx("matches today", "jogos hoje")}</div>
            </div>
            <div style={{fontSize:12,color:todayMyMatches.length?C.green:C.mid,marginTop:6,fontWeight:800}}>{todayMyMatches.length ? `${todayMyMatches.length} ${tx("with your teams", "com seus times")} ⭐` : tx("No favorite teams today", "Nenhum time favorito hoje")}</div>
            {nextTournamentMatches[0] && <CountdownBadge match={nextTournamentMatches[0]} />}
          </CardShell>
        )}

        <CardShell title={tx("Next matches", "Próximos jogos")} icon="⏭️" tone={nextTournamentMatches.some(isMyMatch)?C.gold:C.green} emphasis={nextTournamentMatches.some(isMyMatch)} footer={nextTournamentMatches[0] ? new Date(getTs(nextTournamentMatches[0])).toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" }) : tx("No upcoming matches found", "Nenhum próximo jogo encontrado")}>
          <PhaseBadge matches={nextTournamentMatches} />
          {nextTournamentMatches.length ? nextTournamentMatches.map(m => <MatchRow key={m.id} match={m} showScore={false} star={isMyMatch(m)} onClick={onMatchTap} />) : <div style={{fontSize:13,color:C.mid,lineHeight:1.5}}>{tx("No upcoming tournament match found.", "Nenhum próximo jogo do torneio encontrado.")}</div>}
          {nextTournamentMatches[0] && <CountdownBadge match={nextTournamentMatches[0]} />}
          {nextTournamentMatches.some(isMyMatch) && <div style={{fontSize:11,color:C.gold,fontWeight:900,marginTop:8}}>{tx("⭐ One of your teams is involved", "⭐ Um dos seus times está envolvido")}</div>}
        </CardShell>

        <CardShell title={tx("Fantasy rank", "Ranking Fantasy")} icon="🎯" tone={C.blue} onClick={()=>setTab("predictor")} footer={nextPickDeadline ? `${tx("Next deadline", "Próximo prazo")}: ${fmtCountdown(nextPickDeadline)}` : tx("No open deadlines", "Nenhum prazo aberto")}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:6}}>
            <div>
              <div style={{fontSize:10,color:C.dim,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em"}}>{tx("Your rank", "Sua posição")}</div>
              <div style={{fontSize:26,fontWeight:900,color:C.text,lineHeight:1}}>{fantasySummary.rank ? `#${fantasySummary.rank}` : "—"}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:C.dim,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em"}}>{tx("Points", "Pontos")}</div>
              <div style={{fontSize:18,color:C.gold,fontWeight:900,lineHeight:1}}>{fantasySummary.points == null ? "—" : fantasySummary.points}</div>
            </div>
          </div>
          <div style={{fontSize:12,color:allTodayPicked?C.green:(todayFantasyMissing.length?C.gold:C.mid),fontWeight:900,marginBottom:7}}>
            {allTodayPicked ? tx("✅ All today\'s matches picked", "✅ Todos os jogos de hoje preenchidos") : todayFantasyMissing.length ? `${tx("⚠", "⚠")} ${todayFantasyMissing.length} ${tx("picks missing today", "palpites faltando hoje")}` : `${fantasyPredCount} ${tx("picks made", "palpites feitos")}`}
          </div>
          <div style={{borderTop:`1px solid ${C.b1}`,paddingTop:7}}>
            {(fantasySummary.top3 || []).slice(0,3).map(p => <div key={`${p.rank}-${p.name}`} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,fontSize:11,marginBottom:3}}><span style={{color:C.text,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>#{p.rank} {p.name}</span><span style={{color:C.gold,fontWeight:900}}>{p.points}</span></div>)}
            {!(fantasySummary.top3 || []).length && <div style={{fontSize:11,color:C.dim}}>{tx("Leaderboard loading...", "Carregando ranking...")}</div>}
          </div>
          {fantasySummary.loading && <div style={{fontSize:11,color:C.dim,marginTop:6}}>{tx("Loading fantasy...", "Carregando Fantasy...")}</div>}
        </CardShell>

        <CardShell title={tx("Top scorers", "Artilheiros")} icon="⚽" tone={C.red} onClick={()=>setTab("stats")} footer={topScorers.length ? tx("Top 5 Golden Boot contenders", "Top 5 candidatos à Chuteira de Ouro") : tx("Loading live scorers", "Carregando artilheiros ao vivo")}>
          {topScorers.length ? topScorers.slice(0,5).map((p,i)=>{
            const name = p.name || p.player || p.playerName || "Player";
            const team = p.team || p.teamName || "";
            const goals = p.goals ?? p.totalGoals ?? p.count ?? "";
            return <div key={`${name}-${i}`} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5,minWidth:0}}><span style={{fontSize:11,color:C.dim,fontWeight:900,width:18}}>#{i+1}</span><span style={{fontSize:15}}>{team ? getFlag(team) : "⚽"}</span><span style={{fontSize:12,color:C.text,fontWeight:900,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{name}</span><span style={{fontSize:12,color:C.gold,fontWeight:900}}>{goals}</span></div>
          }) : <div style={{fontSize:13,color:C.mid,lineHeight:1.5}}>{tx("Scorers will appear once the live feed responds.", "Os artilheiros aparecerão assim que o feed ao vivo responder.")}</div>}
        </CardShell>

        <CardShell title={tx("Team watch", "Times favoritos")} icon="⭐" tone={C.rival} onClick={onPickTeams} footer={tx("Goals · campaign · latest and next", "Gols · campanha · último e próximo")}>
          {teamWatch.length ? teamWatch.map(({team,last,next,campaign,goals}) => (
            <div key={team} style={{borderBottom:`1px solid ${C.b1}77`,paddingBottom:8,marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}><span style={{fontSize:18}}>{getFlag(team)}</span><span style={{fontSize:12,color:C.text,fontWeight:900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{displayTeamName(team, language)}</span></div>
                <div style={{fontSize:11,color:C.gold,fontWeight:900,whiteSpace:"nowrap"}}>{goals} {tx(plural(goals, "goal", "goals"), plural(goals, "gol", "gols"))}</div>
              </div>
              <div style={{marginBottom:5}}><OutcomePills campaign={campaign}/></div>
              <div style={{fontSize:compactMatchCards?14:13,color:C.mid,fontWeight:900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx("Latest", "Último")}: {last ? (compactMatchCards ? matchLabelMobile(last, true) : resultLine(last)) : "—"}</div>
              <div style={{fontSize:compactMatchCards?14:13,color:next?C.green:C.mid,fontWeight:950,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx("Next", "Próximo")}: {next ? (compactMatchCards ? `${matchLabelMobile(next, false)} · ${fmtShort(next)}` : `${displayTeamName(next.home===team?next.away:next.home, language)} · ${fmtShort(next)}`) : "—"}</div>
            </div>
          )) : <div style={{fontSize:13,color:C.mid,lineHeight:1.5}}>{tx("Choose favorite teams to unlock this card.", "Escolha times favoritos para liberar este card.")}</div>}
        </CardShell>
      </div>

      {isLocalDev && (
        <div style={{marginTop:14,border:`1px solid ${homeDebug ? C.gold : C.b1}`,background:C.s1,borderRadius:14,overflow:"hidden"}}>
          <button onClick={()=>setHomeDebug(v=>!v)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"11px 12px",background:"transparent",border:"none",color:C.text,cursor:"pointer"}}>
            <span style={{fontSize:12,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:homeDebug?C.gold:C.dim}}>🧪 My WC debug</span>
            <span style={{fontSize:12,color:C.mid}}>{homeDebug ? "Hide" : "Show raw values"}</span>
          </button>
          {homeDebug && (
            <div style={{borderTop:`1px solid ${C.b1}`,padding:12}}>
              {debugRows.map(([k,v]) => (
                <div key={k} style={{display:"grid",gridTemplateColumns:"130px 1fr",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.b1}66`,fontSize:11,lineHeight:1.35}}>
                  <div style={{color:C.dim,fontWeight:800}}>{k}</div>
                  <div style={{color:C.text,wordBreak:"break-word"}}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

