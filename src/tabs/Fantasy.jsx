import React, { useState, useEffect, useMemo, useRef, useContext } from "react";
import { displayTeamName, displayStageName } from "../i18n/display";
import FantasyScoringRules from "../components/FantasyScoringRules";
import FantasyStatsSummary from "../components/FantasyStatsSummary";

// Shared App.jsx values, passed in as props rather than imported directly
// to avoid a circular import (App.jsx -> Fantasy.jsx -> App.jsx), since
// App.jsx itself needs to import this file to render it.
// C, FavCtx, LiveScoresCtx, MATCHES, FLAG_CODES_MAP, FOOTBALL_ICONS,
// apiPred, fantasyLockLabel, fantasyMatchConfirmed, fantasyMatchLocked,
// fantasyStageLabel, fantasyTeamsKnown, fantasyVisibleMatch, getUserId,
// scoreOnePred, sortFantasyChronological, statusIsFinished,
// Badge, Card, Crest, FantasyTeamSlot, LeaguesPanel, Pill

export default function PredictorTab({
  language="en", t=(key, fallback)=>fallback,
  syncProfile=null, displayName="", onShowSync=()=>{}, userAvatar=null, resolvedMatches,
  // Shared App.jsx values, passed as props to avoid a circular import
  C, FavCtx, LiveScoresCtx, MATCHES, FLAG_CODES_MAP, FOOTBALL_ICONS,
  apiPred, fantasyLockLabel, fantasyMatchConfirmed, fantasyMatchLocked,
  fantasyStageLabel, fantasyTeamsKnown, fantasyVisibleMatch, getUserId,
  scoreOnePred, sortFantasyChronological, statusIsFinished,
  Badge, Card, Crest, FantasyTeamSlot, LeaguesPanel, Pill,
}) {
  const isPtBR = language === "pt-BR";
  const tx = (en, pt) => isPtBR ? pt : en;

  resolvedMatches = resolvedMatches || MATCHES;
  const { getScore, isFinished, allFixtures=[] } = useContext(LiveScoresCtx);
  const { favTeam, favTeams=[] } = useContext(FavCtx);
  const deviceUserId = useMemo(getUserId, []);
  const fantasyUserId = syncProfile?.uid || deviceUserId;

  // User registration state
  const [user, setUser]         = useState(null);   // { userId, name } or null
  const [userLoading, setUL]    = useState(true);
  const [nameInput, setNameInput] = useState(displayName || "");
  const [nameErr, setNameErr]   = useState("");
  const [nameSaving, setNS]     = useState(false);

  // Predictions: { [matchId]: { hg, ag } }
  const [preds, setPreds]       = useState({});
  const [predSaving, setPSaving]= useState({});  // { [matchId]: bool }

  // Leaderboard
  const [board, setBoard]       = useState(null);
  const [boardLoading, setBL]   = useState(false);
  const [filter, setFilter]     = useState("upcoming");
  const [showInfo, setShowInfo] = useState(false);
  const [viewingUser, setViewingUser] = useState(null); // { userId, name, avatar }
  const [viewingPreds, setViewingPreds] = useState(null);
  const [viewingLoading, setViewingLoading] = useState(false);

  const openUserProfile = async (entry) => {
    setViewingUser(entry);
    setViewingPreds(null);
    setViewingLoading(true);
    document.body.style.overflow = "hidden";
    try {
      const r = await fetch(`/api/predictor?action=getPreds&userId=${entry.userId}`);
      const predsData = await r.json();
      setViewingPreds(predsData);
    } catch(e) {}
    setViewingLoading(false);
  };

  const closeUserProfile = () => {
    setViewingUser(null);
    document.body.style.overflow = "";
  };

  // ── Fantasy match source ────────────────────────────────────────────────
  // Fantasy should use the same resolved teams as Live/Schedule/Home, but it
  // must NOT inherit the live-bracket "provisional/leading" display state.
  // That state is useful for Live/Schedule while group slots are still being
  // projected, but in Fantasy it greys out confirmed-looking teams and locks
  // picks as "provisional" even when the matchup is otherwise usable. Keep
  // the resolved team names and all match metadata, then strip only the UI tags.
  const fantasyMatches = useMemo(() => (resolvedMatches || MATCHES).map(m => ({
    ...m,
    homeTag: null,
    awayTag: null,
    fantasyConfirmed: fantasyTeamsKnown(m),
  })), [resolvedMatches]);

  // ── Load user + their predictions on mount ──────────────────────────────
  useEffect(() => {
    (async () => {
      setUL(true);
      try {
        let u = await apiPred("getUser", { userId: fantasyUserId });
        // Auto-register signed-in users under the stable synced account ID.
        // Do not auto-create name variants like "Felipe2"; the API now migrates/claims
        // an existing same-name predictor profile when appropriate.
        if (!u && displayName) {
          try {
            u = await apiPred("register", {}, {
              userId: fantasyUserId,
              name: displayName,
              avatar: userAvatar || null,
              city: "",
              country: "",
              syncUid: syncProfile?.uid || ""
            });
          } catch(e) {
            console.error("predictor auto-register", e);
          }
        }
        setUser(u);
        if (u) {
          const p = await apiPred("getPreds", { userId: fantasyUserId });
          const normalised = {};
          Object.entries(p||{}).forEach(([k,v]) => { normalised[Number(k)] = v; });
          setPreds(normalised);
        }
      } catch(e) { console.error("predictor init", e); }
      finally { setUL(false); }
    })();
  }, [fantasyUserId, displayName, userAvatar, syncProfile?.uid]);

  // ── Auto-score finished matches ─────────────────────────────────────────
  // getScore/isFinished are plain functions recreated on every render of
  // LiveScoresProvider (no useCallback), and `scores` updates on every ~60s
  // live-score poll — so this effect's dependency array changed constantly,
  // refiring roughly every poll, FOREVER, resubmitting every currently-
  // finished match (40 right now, growing all tournament) for a full
  // re-score every single time, in every open browser tab, regardless of
  // whether anything had actually changed. Confirmed directly from an
  // Upstash command-monitor capture: 1762 commands in an 8-second burst,
  // exactly matching one full pass over all 40 finished matches.
  //
  // Fixed by tracking which (matchId, hg, ag) combination has already been
  // submitted this session — only genuinely new or corrected results get
  // sent. The matching backend fix (predictor.js's score action now skips
  // its expensive per-user loop entirely if the stored result already
  // matches) provides defense in depth against the same redundant trigger
  // happening from other sources (other tabs, other users, retries).
  const scoredSubmittedRef = useRef(new Map()); // matchId -> "hg-ag" already submitted
  useEffect(() => {
    const finishedWithScores = fantasyMatches
      .filter(m => fantasyTeamsKnown(m) && isFinished(m.home, m.away))
      .map(m => {
        const sc = getScore(m.home, m.away);
        if (!sc || sc.hg === null || sc.ag === null) return null;
        return { id: m.id, hg: sc.hg, ag: sc.ag };
      })
      .filter(Boolean)
      .filter(m => scoredSubmittedRef.current.get(m.id) !== `${m.hg}-${m.ag}`);
    if (!finishedWithScores.length) return;
    finishedWithScores.forEach(m => scoredSubmittedRef.current.set(m.id, `${m.hg}-${m.ag}`));
    fetch("/api/admin?action=score-matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matches: finishedWithScores }),
    }).catch(e => console.warn("[score-matches]", e.message));
  }, [getScore, isFinished, fantasyMatches]);

  // ── Load leaderboard when that tab is active ────────────────────────────
  // This used to fetch on EVERY filter change anywhere in the Fantasy tab
  // (Upcoming/Finished/Board/Leagues, etc.) — the `if (filter === "board")`
  // check only gated the loading spinner, not the actual fetch. So clicking
  // through unrelated filters silently re-pulled the entire global
  // leaderboard every time. Now it only fetches when actually viewing the
  // board, and still refreshes if fantasyUserId/name changes while already
  // there (so a fresh registration shows up correctly).
  useEffect(() => {
    if (filter !== "board") return;
    let cancelled = false;
    setBL(true);

    apiPred("leaderboard")
      .then(b => {
        if (!cancelled) setBoard(Array.isArray(b) ? b : []);
      })
      .catch(() => {
        if (!cancelled) setBoard([]);
      })
      .finally(() => {
        if (!cancelled) setBL(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filter, fantasyUserId, user?.name]);

  // ── Register ────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    const name = nameInput.trim() || displayName || "";
    if (!name) return;
    setNS(true); setNameErr("");
    try {
      const u = await apiPred("register", {}, { userId: fantasyUserId, name, avatar: userAvatar || null, city: "", country: "", syncUid: syncProfile?.uid || "" });
      setUser(u);
    } catch(e) { setNameErr(e.message || tx("Could not save name", "Não foi possível salvar o nome")); }
    finally { setNS(false); }
  };

  // ── Save a single prediction to KV (debounced) ──────────────────────────
  const saveTimerRef = useRef({});

  const upd = (id, field, val) => {
    const clean = val.replace(/\D/,"");
    setPreds(prev => {
      const next = { ...prev, [id]: { ...(prev[id]||{}), [field]: clean }};
      // Debounce save using a per-match timer
      clearTimeout(saveTimerRef.current[id]);
      saveTimerRef.current[id] = setTimeout(async () => {
        if (!user) return;
        const latest = next[id];
        if (!latest || latest.hg === "" || latest.ag === "" || latest.hg == null || latest.ag == null) return;
        setPSaving(p => ({...p, [id]: true}));
        try {
          await apiPred("savePred", {}, { userId: fantasyUserId, matchId: id, hg: parseInt(latest.hg), ag: parseInt(latest.ag) });
        } catch(e) { console.error("savePred", e); }
        finally { setPSaving(p => ({...p, [id]: false})); }
      }, 600);
      return next;
    });
  };

  // ── Score totals ────────────────────────────────────────────────────────
  const fantasyVisibleMatches = sortFantasyChronological(fantasyMatches.filter(fantasyVisibleMatch));
  const upcoming  = sortFantasyChronological(fantasyVisibleMatches.filter(m => !isFinished(m.home, m.away)));
  const finished  = sortFantasyChronological(fantasyVisibleMatches.filter(m => fantasyTeamsKnown(m) && isFinished(m.home, m.away)));
  let totalPts = 0, totalPossible = 0, exact = 0, correct = 0;
  finished.forEach(m => {
    const sc = getScore(m.home, m.away);
    if (!sc) return;
    const pts = scoreOnePred(preds[m.id], sc);
    if (pts !== null) { totalPts += pts; totalPossible += 3; if(pts===3)exact++; if(pts>=1)correct++; }
  });

  const shownMatches = filter==="fav"
    ? fantasyVisibleMatches.filter(m => favTeams?.includes(m.home) || favTeams?.includes(m.away))
    : filter==="finished" ? [...finished].reverse() : upcoming;
  const isMobileFantasy = typeof window !== "undefined" && window.innerWidth < 520;

  // ── Registration gate ───────────────────────────────────────────────────
  if (userLoading) return (
    <div style={{textAlign:"center",padding:"28px 20px"}}>
      <div style={{width:28,height:28,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/>
      <div style={{fontSize:13,color:C.mid}}>{tx("Loading fantasy picks...", "Carregando bolão...")}</div>
    </div>
  );

  if (!user) return (
    <div style={{paddingTop:12}}>
      <div style={{background:`linear-gradient(135deg,${C.s1},${C.s2})`,border:`1px solid ${C.b2}`,borderRadius:12,padding:14,marginBottom:6,textAlign:"center"}}>
        <div style={{fontSize:"1.6rem",marginBottom:4}}>🔮</div>
        <div style={{fontWeight:700,fontSize:17,color:C.green,marginBottom:4}}>{tx("Fantasy Picks", "Bolão")}</div>
        <div style={{fontSize:12,color:C.mid,lineHeight:1.5}}>{tx("Predict match scores for fun. Official scores come from the World Cup feed; your picks power points, rankings and leagues.", "Dê seus palpites de placar. Os resultados oficiais vêm do feed da Copa; seus palpites valem pontos, ranking e ligas.")}</div>
      </div>
      {(syncProfile && displayName) ? (
        /* Signed in but name registration failed — show retry */
        <Card style={{padding:18}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:`${C.green}22`,border:`1.5px solid ${C.green}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
              {userAvatar?.startsWith("data:") ? <img src={userAvatar} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} alt=""/> : "⭐"}
            </div>
            <div>
              <div style={{fontWeight:700,color:C.text,fontSize:15}}>{tx("Join as", "Entrar como")} {displayName}?</div>
              <div style={{fontSize:11,color:C.dim}}>{tx("Tap to join Fantasy Picks", "Toque para entrar no Bolão")}</div>
            </div>
          </div>
          {nameErr && <div style={{fontSize:12,color:C.red,marginBottom:8}}>{nameErr}</div>}
          <button onClick={handleRegister} disabled={nameSaving}
            style={{width:"100%",padding:"12px 0",borderRadius:12,background:`linear-gradient(135deg,${C.green},#22c55e)`,border:"none",color:"#030a05",fontWeight:700,fontSize:15,cursor:"pointer",opacity:nameSaving?0.6:1}}>
            {nameSaving ? tx("Joining...", "Entrando...") : `${tx("Join as", "Entrar como")} ${displayName} →`}
          </button>
          <div style={{fontSize:11,color:C.dim,marginTop:10,textAlign:"center"}}>
            {tx("Want a different name?", "Quer usar outro nome?")}
            <input value={nameInput===displayName?"":nameInput} onChange={e=>{setNameInput(e.target.value.slice(0,20));setNameErr("");}}
              placeholder={tx("Type custom name...", "Digite outro nome...")} maxLength={20}
              style={{display:"block",width:"100%",marginTop:8,padding:"10px 14px",background:C.s2,border:`1px solid ${nameErr?C.red:C.b2}`,borderRadius:10,color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
        </Card>
      ) : (
        /* Not signed in — prompt to create account OR enter name */
        <div>
          <Card style={{padding:18,marginBottom:12}}>
            <div style={{fontWeight:700,color:C.text,fontSize:15,marginBottom:4}}>{tx("Choose your display name", "Escolha seu nome de exibição")}</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:14}}>{tx("This is how you'll appear on the Fantasy leaderboard.", "É assim que você aparecerá na classificação do Bolão.")}</div>
            <input value={nameInput} onChange={e=>{setNameInput(e.target.value.slice(0,20));setNameErr("");}}
              onKeyDown={e=>e.key==="Enter"&&handleRegister()}
              placeholder={tx("e.g. Pablo, FootballFan99...", "ex.: Felipe, FanáticoDaCopa...")} maxLength={20}
              style={{width:"100%",padding:"12px 14px",background:C.s2,border:`1px solid ${nameErr?C.red:C.b2}`,borderRadius:10,color:C.text,fontSize:15,outline:"none",marginBottom:8}}/>
            {nameErr && <div style={{fontSize:12,color:C.red,marginBottom:8}}>{nameErr}</div>}
            <div style={{fontSize:11,color:C.dim,marginBottom:14}}>{20-nameInput.length} {tx("characters remaining", "caracteres restantes")}</div>
            <button onClick={handleRegister} disabled={nameSaving||!nameInput.trim()}
              style={{width:"100%",padding:"12px 0",borderRadius:12,background:nameInput.trim()?`linear-gradient(135deg,${C.green},#22c55e)`:C.b2,border:"none",color:nameInput.trim()?"#030a05":C.dim,fontWeight:700,fontSize:15,cursor:nameInput.trim()?"pointer":"default",opacity:nameSaving?0.6:1}}>
              {nameSaving ? tx("Saving...", "Salvando...") : tx("Join Fantasy Picks →", "Entrar no Bolão →")}
            </button>
          </Card>
          <button onClick={onShowSync}
            style={{width:"100%",padding:"12px 0",borderRadius:12,background:"transparent",border:`1px solid ${C.b2}`,color:C.mid,fontWeight:600,fontSize:13,cursor:"pointer"}}>
            {tx("🔗 Sign in with PIN to sync across devices", "🔗 Entrar com PIN para sincronizar dispositivos")}
          </button>
        </div>
      )}
    </div>
  );
const myName = String(user?.name || displayName || "").trim().toLowerCase();

const myRankIndex = Array.isArray(board)
  ? board.findIndex(r => {
      const rowName = String(r.name || r.displayName || "").trim().toLowerCase();
      const rowUserId = String(r.userId || r.id || "");
      return rowUserId === String(fantasyUserId) || (!!myName && rowName === myName);
    })
  : -1;

const myRank = myRankIndex >= 0 ? myRankIndex + 1 : 0;
const totalPlayers = Array.isArray(board) ? board.length : 0;

const rankColor =
  myRank === 1 ? "#fbbf24" :
  myRank === 2 ? "#c0c0c0" :
  myRank === 3 ? "#cd7f32" :
  C.green;

  // ── Main predictor UI ───────────────────────────────────────────────────
return (
  <div style={{paddingTop:12}}>
    <div style={{background:`linear-gradient(135deg,${C.s1},${C.s2})`,border:`1px solid ${C.b2}`,borderRadius:12,padding:14,marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontWeight:700,fontSize:15,color:C.green}}>{tx("🎯 FANTASY PICKS", "🎯 BOLÃO")}</div>
          <div style={{fontSize:11,color:C.mid,marginTop:2}}>{tx("Playing as", "Jogando como")} <strong style={{color:C.gold}}>{user.name}</strong></div>
        </div>

        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
          {myRank > 0 && (
            <div style={{
              padding:"6px 12px",
              borderRadius:20,
              background:`${rankColor}18`,
              border:`1px solid ${rankColor}44`,
              color:rankColor,
              fontSize:13,
              fontWeight:800,
              whiteSpace:"nowrap",
              lineHeight:1
            }}>
              🏅 {tx("Rank", "Posição")} #{myRank}
            </div>
          )}
          <button
            onClick={()=>setShowInfo(v=>!v)}
            style={{
              background:"none",
              border:`1px solid ${C.b2}`,
              borderRadius:20,
              color:C.dim,
              fontSize:11,
              padding:"6px 10px",
              cursor:"pointer",
              lineHeight:1,
              whiteSpace:"nowrap"
            }}
          >
            {tx("Scoring Criteria", "Critérios de pontuação")}
          </button>
        </div>
      </div>

      {showInfo && <FantasyScoringRules C={C} />}

      <FantasyStatsSummary
        totalPts={totalPts}
        exact={exact}
        correct={correct}
        totalPossible={totalPossible}
        C={C}
      />
    </div>

      {/* Fantasy filters */}
      <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",scrollbarWidth:"none"}}>
        {(syncProfile?.pin || displayName) && <Pill active={filter==="leagues"} onClick={()=>setFilter("leagues")} color={C.blue}>{tx("🏆 Leagues", "🏆 Ligas")}</Pill>}
        <Pill active={filter==="board"} onClick={()=>setFilter("board")} color={C.rival}>{tx("🏅 Rankings", "🏅 Classificação")}</Pill>
        <Pill active={filter==="upcoming"} onClick={()=>setFilter("upcoming")} color={C.green}>{tx("Picks", "Palpites")} ({upcoming.length})</Pill>
        <Pill active={filter==="finished"} onClick={()=>setFilter("finished")} color={C.gold}>{tx("Scored", "Pontuados")} ({finished.length})</Pill>
      </div>

      {/* ── LEADERBOARD ── */}
      {filter==="board" && (
        <div>
          {boardLoading && <div style={{textAlign:"center",padding:"32px 0"}}><div style={{width:24,height:24,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto"}}/></div>}
          {!boardLoading && board && board.length === 0 && (
            <div style={{textAlign:"center",padding:"32px 20px",color:C.dim,fontSize:13}}>{tx("No predictions scored yet. Check back after June 11!", "Nenhum palpite pontuado ainda. Volte depois de 11 de junho!")}</div>
          )}
          {!boardLoading && board && board.map((entry, i) => {
            const isMe = entry.userId === fantasyUserId;
            const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
            return (
              <Card key={entry.userId} onClick={()=>openUserProfile(entry)} style={{marginBottom:7,border:`1px solid ${isMe?C.gold:C.b1}`,background:isMe?`linear-gradient(135deg,${C.gold}0a,${C.s1})`:"",cursor:"pointer"}}>                <div style={{padding:"10px 13px",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{fontWeight:700,color:C.dim,minWidth:26,fontSize:14,textAlign:"center"}}>{medal||`#${i+1}`}</div>
                  {/* Avatar */}
                  <div style={{width:34,height:34,borderRadius:"50%",background:isMe?`${C.gold}22`:C.s2,border:`1.5px solid ${isMe?C.gold:C.b2}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0,fontSize:14}}>
                    {entry.avatar?.startsWith("data:") ? <img src={entry.avatar} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
                    : entry.avatar?.startsWith("icon:") ? (()=>{const ic=FOOTBALL_ICONS?.find(i=>i.id===entry.avatar);return ic?ic.el(22):"⚽";})()
                    : entry.avatar?.startsWith("flag:") ? <img src={`https://flagcdn.com/w40/${FLAG_CODES_MAP[entry.avatar.slice(5)]}.png`} crossOrigin="anonymous" style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
                    : isMe ? "⭐" : "👤"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,color:isMe?C.gold:C.text,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.name}{isMe&&<span style={{fontSize:10,color:C.gold,marginLeft:6}}>(you)</span>}</div>
                    <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2,flexWrap:"wrap"}}>
                      {entry.country && <span style={{fontSize:10,color:C.dim}}>{entry.city ? `${entry.city}, ` : ""}{entry.country}</span>}
                      <span style={{fontSize:10,color:C.dim}}>{entry.predCount} picks · {entry.exact} exact</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:900,fontSize:22,color:i===0?C.gold:i<3?C.green:C.mid}}>{entry.pts}</div>
                    <div style={{fontSize:9,color:C.dim}}>pts</div>
                  </div>
                </div>

              </Card>
            );
          })}
          <div style={{textAlign:"center",marginTop:12}}>
            <button onClick={()=>{setBL(true);apiPred("leaderboard").then(b=>setBoard(b)).finally(()=>setBL(false));}} style={{fontSize:12,color:C.dim,background:"none",border:`1px solid ${C.b2}`,borderRadius:20,padding:"5px 14px",cursor:"pointer"}}>↻ Refresh</button>
          </div>
        </div>
      )}

      {/* ── LEAGUES ── */}
      {filter==="leagues" && syncProfile?.pin && (
        <LeaguesPanel pin={syncProfile.pin} fantasyUserId={fantasyUserId} syncProfile={syncProfile} userStats={{total: finished.length}}/>
      )}
      {filter==="leagues" && !syncProfile?.pin && displayName && (
        <div style={{textAlign:"center",padding:"32px 20px"}}>
          <div style={{fontSize:36,marginBottom:12}}>🏆</div>
          <div style={{fontWeight:700,fontSize:16,color:C.text,marginBottom:8}}>{tx("Join the League!", "Entrar na liga!")}</div>
          <div style={{fontSize:13,color:C.mid,marginBottom:24,lineHeight:1.6}}>
            {tx("You're already playing Fantasy Picks as", "Você já está jogando o Bolão como")} <strong style={{color:C.gold}}>{displayName}</strong>.<br/>
            Create a PIN to join <strong style={{color:C.green}}>Brazucas em Broward</strong> and compete with the group.
          </div>
          <button onClick={onShowSync} style={{width:"100%",maxWidth:300,padding:"13px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${C.gold},#f59e0b)`,color:"#030a05",fontSize:15,fontWeight:800,cursor:"pointer"}}>
            🔑 Create a PIN to join
          </button>
        </div>
      )}

      {/* ── MATCH LIST ── */}
      {filter !== "board" && filter !== "leagues" && (
        <>
          {shownMatches.length===0 && (
            <div style={{textAlign:"center",padding:"32px 20px",color:C.dim}}>
              <div style={{fontSize:"2rem",marginBottom:8}}>⏳</div>
              <div style={{fontSize:13}}>{filter === "upcoming" ? tx("No pending Fantasy Picks right now — check back when fixtures are available!", "Não há palpites pendentes agora — volte quando os jogos estiverem disponíveis!") : tx("No finished matches yet.", "Ainda não há jogos finalizados.")}</div>
            </div>
          )}
          {shownMatches.map((m, idx) => {
            const prev = idx > 0 ? shownMatches[idx - 1] : null;
            const enteringKnockout = !!m.stage && (!prev || prev.stage !== m.stage);
            const teamsKnown = fantasyTeamsKnown(m);
            const matchupConfirmed = fantasyMatchConfirmed(m);
            const sc = teamsKnown ? getScore(m.home, m.away) : null;
            const done = teamsKnown && isFinished(m.home, m.away);
            const locked = done || fantasyMatchLocked(m) || !teamsKnown || !matchupConfirmed;
            const pred = preds[m.id] || {};
            const pts = done && sc ? scoreOnePred(pred, sc) : null;
            const ptColor = pts===3?C.green:pts===1?C.gold:pts===0?C.red:C.dim;
            const hasPred = pred.hg!==undefined && pred.ag!==undefined && pred.hg!=="" && pred.ag!=="";
            const saving = predSaving[m.id];
            return (
              <React.Fragment key={m.id}>
                {enteringKnockout && (
                  <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0 10px"}}>
                    <div style={{height:1,background:C.b2,flex:1}}/>
                    <div style={{fontSize:10,color:C.gold,fontWeight:900,letterSpacing:"0.12em",textTransform:"uppercase",whiteSpace:"nowrap"}}>
                      {displayStageName(m.stage, language)}
                    </div>
                    <div style={{height:1,background:C.b2,flex:1}}/>
                  </div>
                )}
              <Card style={{marginBottom:8,border:`1px solid ${pts===3?C.green:pts===1?C.gold:pts===0?C.red:hasPred?`${C.green}44`:C.b2}`,opacity:done?0.45:locked?0.72:1,background:done?C.s2:undefined}} >
                <div style={{padding:"10px 13px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <Badge>{displayStageName(fantasyStageLabel(m), language)} · {m.date}</Badge>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {saving && <span style={{fontSize:10,color:C.dim}}>{tx("saving...", "salvando...")}</span>}
                      {!saving && hasPred && !done && !locked && <span style={{fontSize:10,color:C.green}}>✓ {tx("saved", "salvo")}</span>}
                      {!done && (
  locked ? (
    <span style={{fontSize:10,color:C.gold}}>{!teamsKnown ? tx("⏳ teams TBD", "⏳ times indefinidos") : !matchupConfirmed ? (isMobileFantasy ? tx("⏳ pending", "⏳ pendente") : tx("⏳ provisional", "⏳ provisório")) : tx("🔒 locked", "🔒 fechado")}</span>
  ) : (
    <span style={{fontSize:10,color:C.dim}}>{fantasyLockLabel(m)}</span>
  )
)}
                      {pts !== null && <div style={{fontWeight:700,color:ptColor,fontSize:12}}>{pts===3?"⚽⚽⚽ +3":pts===1?"⚽ +1":"❌ 0"} {tx("pts", "pts")}</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <FantasyTeamSlot team={m.home} side="left" tag={m.homeTag} compact={isMobileFantasy} language={language}/>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                      {done && sc && (
                        <div style={{textAlign:"center",minWidth:52,background:C.bg,borderRadius:8,padding:"5px 10px",border:`1px solid ${C.b2}`}}>
                          <div style={{fontSize:9,color:C.text,marginBottom:1,fontWeight:700,letterSpacing:"0.05em"}}>{tx("RESULT", "RESULTADO")}</div>
                          <div style={{fontWeight:900,fontSize:20,color:C.text,fontFamily:"monospace"}}>{sc.hg} – {sc.ag}</div>
                        </div>
                      )}
                      {!done && (
                        <>
                          <input value={pred.hg??""} onChange={e=>!locked&&upd(m.id,"hg",e.target.value)} disabled={locked} placeholder="?" maxLength={2}
                            style={{width:34,textAlign:"center",background:locked?C.bg:C.s2,border:`1px solid ${hasPred?C.green:C.b2}`,borderRadius:8,color:locked?C.dim:C.green,fontSize:16,fontWeight:700,padding:"4px 0",outline:"none",opacity:locked?0.65:1}}/>
                          <span style={{color:C.dim,fontWeight:700}}>–</span>
                          <input value={pred.ag??""} onChange={e=>!locked&&upd(m.id,"ag",e.target.value)} disabled={locked} placeholder="?" maxLength={2}
                            style={{width:34,textAlign:"center",background:locked?C.bg:C.s2,border:`1px solid ${hasPred?C.green:C.b2}`,borderRadius:8,color:locked?C.dim:C.green,fontSize:16,fontWeight:700,padding:"4px 0",outline:"none",opacity:locked?0.65:1}}/>
                        </>
                      )}
                      {done && hasPred && (
                        <div style={{textAlign:"center",minWidth:52,background:C.bg,borderRadius:8,padding:"5px 10px",border:`1px solid ${ptColor}`}}>
                          <div style={{fontSize:9,color:ptColor,marginBottom:1,fontWeight:700,letterSpacing:"0.05em"}}>{tx("YOUR PICK", "SEU PALPITE")}</div>
                          <div style={{fontWeight:900,fontSize:20,color:ptColor,fontFamily:"monospace"}}>{pred.hg}–{pred.ag}</div>
                        </div>
                      )}
                    </div>
                    <FantasyTeamSlot team={m.away} side="right" tag={m.awayTag} compact={isMobileFantasy} language={language}/>
                  </div>
                </div>
              </Card>
              </React.Fragment>
            );
          })}
        </>
      )}
      {/* ── USER PROFILE MODAL ── */}
      {viewingUser && (
        <div onClick={closeUserProfile} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"8px 3px"}}>
          <div onClick={e=>e.stopPropagation()} onTouchMove={e=>e.stopPropagation()} style={{background:C.bg,border:`1px solid ${C.b2}`,borderRadius:18,width:"100%",maxWidth:620,maxHeight:"calc(100dvh - 140px)",overflowY:"auto",overscrollBehavior:"contain",WebkitOverflowScrolling:"touch",paddingBottom:4,position:"relative"}}>
            <button onClick={closeUserProfile} style={{position:"absolute",top:12,right:12,zIndex:10,background:"rgba(0,0,0,.4)",border:"none",color:"white",fontSize:22,width:34,height:34,borderRadius:17,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            <div style={{padding:"20px 16px 12px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <div style={{width:48,height:48,borderRadius:"50%",background:C.s2,border:`2px solid ${C.b2}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                  {viewingUser.avatar?.startsWith("icon:") ? (()=>{const ic=FOOTBALL_ICONS?.find(i=>i.id===viewingUser.avatar);return ic?ic.el(30):"👤";})() : "👤"}
                </div>
                <div>
                  <div style={{fontWeight:800,fontSize:18,color:C.text}}>{viewingUser.name}</div>
                  <div style={{fontSize:12,color:C.dim}}>{viewingUser.predCount} {tx("picks", "palpites")} · {viewingUser.pts} {tx("pts", "pts")} · {viewingUser.exact} {tx("exact", "exatos")}</div>
                </div>
              </div>

              {viewingLoading && <div style={{textAlign:"center",padding:"32px 0"}}><div style={{width:24,height:24,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto"}}/></div>}

              {!viewingLoading && viewingPreds && (() => {
                const scoredMatches = sortFantasyChronological(fantasyMatches.filter(m => {
                  if (!fantasyTeamsKnown(m)) return false;
                  const sc = getScore(m.home, m.away);
                  return sc && statusIsFinished(sc.status) && viewingPreds[m.id];
                })).reverse(); // most recent first — sortFantasyChronological is oldest-first
                if (scoredMatches.length === 0) return <div style={{textAlign:"center",padding:"20px",color:C.dim,fontSize:13}}>{tx("No scored picks yet.", "Ainda não há palpites pontuados.")}</div>;
                return scoredMatches.map(m => {
                  const sc = getScore(m.home, m.away);
                  const pred = viewingPreds[m.id] || {};
                  const pts = scoreOnePred(pred, sc);
                  const ptColor = pts===3?C.green:pts===1?C.gold:pts===0?C.red:C.dim;
                  const hasPred = pred.hg!==undefined && pred.ag!==undefined;
                  return (
                    <Card key={m.id} style={{marginBottom:8,border:`1px solid ${pts===3?C.green:pts===1?C.gold:pts===0?C.red:C.b2}`,opacity:0.45,background:C.s2}}>
                      <div style={{padding:"10px 13px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                          <Badge>{displayStageName(fantasyStageLabel(m), language)} · {m.date}</Badge>
                          <div style={{fontWeight:700,color:ptColor,fontSize:12}}>{pts===3?"⚽⚽⚽ +3":pts===1?"⚽ +1":"❌ 0"} {tx("pts", "pts")}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <Crest team={m.home} size={22}/>
                          <span style={{fontWeight:800,color:C.text,flex:1,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{displayTeamName(m.home, language)}</span>
                          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                            <div style={{textAlign:"center",minWidth:52,background:C.bg,borderRadius:8,padding:"5px 10px",border:`1px solid ${C.b2}`}}>
                              <div style={{fontSize:9,color:C.text,marginBottom:1,fontWeight:700,letterSpacing:"0.05em"}}>{tx("RESULT", "RESULTADO")}</div>
                              <div style={{fontWeight:900,fontSize:20,color:C.text,fontFamily:"monospace"}}>{sc.hg} – {sc.ag}</div>
                            </div>
                            {hasPred && (
                              <div style={{textAlign:"center",minWidth:52,background:C.bg,borderRadius:8,padding:"5px 10px",border:`1px solid ${ptColor}`}}>
                                <div style={{fontSize:9,color:ptColor,marginBottom:1,fontWeight:700,letterSpacing:"0.05em"}}>PICK</div>
                                <div style={{fontWeight:900,fontSize:20,color:ptColor,fontFamily:"monospace"}}>{pred.hg}–{pred.ag}</div>
                              </div>
                            )}
                          </div>
                          <span style={{fontWeight:800,color:C.text,flex:1,fontSize:13,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{displayTeamName(m.away, language)}</span>
                          <Crest team={m.away} size={22}/>
                        </div>
                      </div>
                    </Card>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

