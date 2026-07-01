import React, { useState, useEffect, useMemo, useRef, useContext } from "react";
import { displayTeamName, displayStageName } from "../i18n/display";
import {
  buildQualifiedThirdsFromSelectedTeams,
  buildThirdGroupsKey,
  ROUND_OF_16_TEMPLATE,
  QUARTER_FINAL_TEMPLATE,
  SEMI_FINAL_TEMPLATE,
  FINAL_TEMPLATE,
} from "../engine/fifa2026Bracket";
import { getAnnexCMapping } from "../engine/annexC";
import CircularBracket from "./CircularBracket.jsx";

// Shared App.jsx values, passed in as props rather than imported directly
// to avoid a circular import (App.jsx -> Bracket.jsx -> App.jsx), since
// App.jsx itself needs to import this file to render it.
// C, DS, GROUPS, LiveScoresCtx, MATCHES, R32_SLOT_TEMPLATE, STR, gs,
// calcStandings, statusIsFinished, useElemHeight, defaultBracketGroups,
// readSavedMyBracket, writeSavedMyBracket, clearSavedMyBracket,
// Card, Crest, DragList, Pill, VisualBracketTree

export default function MyBracketTab({
  language="en", t=(key, fallback)=>fallback,
  tabTop=116, onMatchTap=null,
  // Shared App.jsx values, passed as props to avoid a circular import
  C, DS, GROUPS, LiveScoresCtx, MATCHES, R32_SLOT_TEMPLATE, STR, gs,
  calcStandings, statusIsFinished, useElemHeight, defaultBracketGroups,
  readSavedMyBracket, writeSavedMyBracket, clearSavedMyBracket,
  Card, Crest, DragList, Pill, VisualBracketTree, getFlag, FLAG_CODES_MAP={},
}) {
  const isPtBR = language === "pt-BR";
  const tx = (en, pt) => isPtBR ? pt : en;

  const savedBracket = useMemo(() => readSavedMyBracket(), []);
  const isMobileBracket = typeof window !== "undefined" && window.innerWidth < 520;
  const { allFixtures, getScore, isFinished } = useContext(LiveScoresCtx);
  const [bracketSource,setBracketSource]=useState("actual"); // "mine" | "actual"
  const [stage,setStage]=useState(()=>savedBracket.stage || (savedBracket.result ? "bracket" : "groups"));
  const [bracketMode,setBracketMode]=useState(()=>savedBracket.bracketMode || "simulation");
  const [playMode,setPlayMode]=useState(()=>savedBracket.playMode || "manual");
  const [bracketView,setBracketView]=useState(()=>savedBracket.bracketView || "tree");
  const [manualPicks,setManualPicks]=useState(()=>savedBracket.manualPicks || {});
  const [groups,setGroups]=useState(()=>savedBracket.groups || defaultBracketGroups());
  const [thirds,setThirds]=useState(()=>savedBracket.thirds || []);
  const [result,setResult]=useState(()=>savedBracket.result || null);
  const [running,setRunning]=useState(false);
  const [sharing,setSharing]=useState(false);
  const [showBracketActions,setShowBracketActions]=useState(false);
  const annexStatus = {state:"ready",message:"FIFA Annex C ready (495 combinations)."};
  const allThirds=Object.entries(groups).map(([g,teams])=>({group:g,team:teams[2]}));
  const toggleThird=(t)=>{setThirds(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t].slice(0,8));};
  const _mbhRef = useRef(null); const _mbhH = useElemHeight(_mbhRef);

  // Default Bracket tab to the real tournament view. Fantasy/My Bracket remains
  // available with one tap, but the first view should be the official bracket
  // during live tournament use.
  useEffect(() => {
    setBracketSource("actual");
  }, []);

  // Keep `thirds` (the explicit "qualified 3rd place" selection, tracked by
  // team name) in sync with `groups`. Reordering a group can move a team
  // that was previously in 3rd place up to 1st/2nd — if we don't drop it
  // here, buildQualifiedThirdsFromSelectedTeams() silently filters it out
  // later, leaving fewer than 8 valid teams. That breaks the Annex C
  // assignment and can map the same team to two different R32 slots at
  // once (an "impossible" matchup). Pruning here lets runBracket()'s
  // existing "auto-select best 8" fallback kick back in correctly.
  useEffect(() => {
    setThirds(prev => {
      if (!prev || !prev.length) return prev;
      const validThirdNames = new Set(Object.values(groups).map(t => t?.[2]).filter(Boolean));
      const next = prev.filter(t => validThirdNames.has(t));
      return next.length === prev.length ? prev : next;
    });
  }, [groups]);

  useEffect(()=>{
    const applySyncedBracket = (ev) => {
      const incoming = ev?.detail && Object.keys(ev.detail).length ? ev.detail : readSavedMyBracket();
      setStage(incoming.stage || (incoming.result ? "bracket" : "groups"));
      setBracketMode(incoming.bracketMode || "simulation");
      setPlayMode(incoming.playMode || "manual");
      setBracketView(incoming.bracketView || "tree");
      setManualPicks(incoming.manualPicks || {});
      setGroups(incoming.groups || defaultBracketGroups());
      setThirds(incoming.thirds || []);
      setResult(incoming.result || null);
    };
    window.addEventListener("wc2026_my_bracket_synced", applySyncedBracket);
    return () => window.removeEventListener("wc2026_my_bracket_synced", applySyncedBracket);
  },[]);

  useEffect(()=>{
    writeSavedMyBracket({
      stage,
      bracketMode,
      playMode,
      bracketView,
      manualPicks,
      groups,
      thirds,
      result
    });
  }, [stage, bracketMode, playMode, bracketView, manualPicks, groups, thirds, result]);

  const resetMyBracket=()=>{
    clearSavedMyBracket();
    setStage("groups");
    setBracketMode("simulation");
    setPlayMode("manual");
    setManualPicks({});
    setGroups(defaultBracketGroups());
    setThirds([]);
    setResult(null);
  };

  const resetWinners=()=>{
    setManualPicks({});
  };

  const runBracket=()=>{
    setRunning(true);
    setTimeout(()=>{
      // {tx("Auto-select best 8", "Selecionar melhores 8")} third-place teams if user hasn't picked them
      // (takes the 3rd team from each group, sorted by simulator strength, top 8)
      let activeThirds = thirds;
      if (!activeThirds || activeThirds.length !== 8) {
        const allThirds = Object.entries(groups)
          .map(([g, teams]) => ({ group: g, team: teams[2] }))
          .filter(x => x.team)
          .sort((a, b) => (STR[b.team] || 0) - (STR[a.team] || 0))
          .slice(0, 8)
          .map(x => x.team);
        activeThirds = allThirds;
        setThirds(allThirds);
      }

      const qualifiedThirds = buildQualifiedThirdsFromSelectedTeams(groups, activeThirds);
      let thirdGroupsKey = "";
      try { thirdGroupsKey = buildThirdGroupsKey(groups, activeThirds); } catch(e) { thirdGroupsKey = ""; }

      console.log("Qualified third-place teams:", qualifiedThirds);
      console.log("Annex C group key:", thirdGroupsKey);

      let r32=[];
      let roundTemplates=null;
      let fifaEngineStatus="fifa-fallback";
      let fifaEngineMessage=annexStatus.state==="ready"
        ? "Official FIFA bracket rules could not be resolved."
        : "Official FIFA bracket rules are still loading.";

      try {
        // ── Build R32 from template, using the real engine's Annex C lookup ──
        // (Previously avoided buildFifa2026Bracket/getAnnexCMapping because
        // annexCStore was never populated — fixed: engine/annexC.js now
        // bakes in the verified 495-row table and loads it eagerly at
        // import time, so this call is reliable.)

        const annexMapping = getAnnexCMapping(qualifiedThirds);
        // annexMapping: { "1A": "3C", "1E": "3D", ... } — target col → third group

        const thirdTeamByGroup = Object.fromEntries(
          qualifiedThirds.map(t => [String(t.group).toUpperCase(), t.team])
        );

        const resolveSlot = (slot, homeSlot) => {
          if (!slot || slot === "TBD") return "TBD";
          if (slot === "3?") {
            // homeSlot is the Annex C target column (e.g. "1E")
            const assigned = annexMapping[homeSlot]; // e.g. "3D"
            const grp = assigned ? assigned.replace(/^3/,"") : null;
            return (grp && thirdTeamByGroup[grp]) || "TBD";
          }
          if (slot.startsWith("1")) return groups[slot[1]]?.[0] || slot;
          if (slot.startsWith("2")) return groups[slot[1]]?.[1] || slot;
          if (slot.startsWith("3")) return thirdTeamByGroup[slot.slice(1)] || slot;
          return slot;
        };

        // Hardcoded R32 template (mirrors fifa2026Bracket.js ROUND_OF_32_TEMPLATE)
        const R32 = R32_SLOT_TEMPLATE;

        r32 = R32.map(m => ({
          match: m.match,
          homeSlot: m.home,
          awaySlot: m.away,
          home: resolveSlot(m.home, m.home),
          away: resolveSlot(m.away, m.home),
          winner: null,
        }));

        roundTemplates = {
          r16: ROUND_OF_16_TEMPLATE,
          qf:  QUARTER_FINAL_TEMPLATE,
          sf:  SEMI_FINAL_TEMPLATE,
          final: FINAL_TEMPLATE,
        };
        fifaEngineStatus="fifa-ready";
        fifaEngineMessage="FIFA 2026 bracket generated.";
      } catch(e) {
        console.warn("FIFA bracket engine fallback:", e);
        const qualifiers=[];
        Object.entries(groups).forEach(([,teams])=>{
          qualifiers.push(teams[0],teams[1]);
        });
        const teams=[...qualifiers,...qualifiedThirds.map(x=>x.team)];
        r32=[];
        for(let i=0;i<teams.length;i+=2){
          r32.push({match:73+(i/2),home:teams[i],away:teams[i+1]||"TBD",winner:null});
        }
      }

      setManualPicks({});
      setPlayMode("manual");
      setResult({
        mode:bracketMode,
        r32,
        r16:[],
        qf:[],
        sf:[],
        final:[],
        champion:null,
        runnerUp:null,
        qualifiedThirds,
        thirdGroupsKey,
        roundTemplates,
        fifaEngineStatus,
        fifaEngineMessage,
        annexStatus
      });

      setStage("bracket");
      setRunning(false);
    },80);
  };

  const displayedResult = useMemo(() => {
    if (!result || playMode !== "manual" || result.fifaEngineStatus !== "fifa-ready" || !result.roundTemplates) return result;
    const winnerMap = {};
    const applyPick = (match) => {
      const picked = manualPicks[match.match];
      const winner = picked && (picked === match.home || picked === match.away) ? picked : null;
      if (winner) winnerMap[match.match] = winner;
      return {...match, winner};
    };
    const resolveRef = (ref) => {
      if (typeof ref === "string" && ref.startsWith("W")) return winnerMap[Number(ref.slice(1))] || null;
      return ref;
    };
    const buildRound = (template=[]) => template.map(t => applyPick({match:t.match,homeSlot:t.home,awaySlot:t.away,home:resolveRef(t.home),away:resolveRef(t.away)}));
    const r32 = (result.r32||[]).map(m => applyPick({...m, winner:null}));
    const r16 = buildRound(result.roundTemplates.r16);
    const qf = buildRound(result.roundTemplates.qf);
    const sf = buildRound(result.roundTemplates.sf);
    const final = buildRound(result.roundTemplates.final);
    const champion = final?.[0]?.winner || null;
    const runnerUp = champion ? [final?.[0]?.home, final?.[0]?.away].find(t=>t&&t!==champion) : null;
    return {...result, r32, r16, qf, sf, final, champion, runnerUp};
  }, [result, manualPicks, playMode]);

  // ── ACTUAL bracket — built entirely from real group-stage results and
  // real knockout results as they're played. No manual picks involved;
  // anything not yet determined in reality shows as "TBD". ─────────────────
  const actualBracket = useMemo(() => {
    const buildGroupResults = (letter) => MATCHES.filter(m => m.group === letter).map(m => {
      const s = getScore(m.home, m.away);
      const finished = s && statusIsFinished(s.status);
      return { id:m.id, home:m.home, away:m.away, hg: finished ? String(s.hg ?? "") : "", ag: finished ? String(s.ag ?? "") : "" };
    });

    const groupStandings = {};
    const groupResultsByLetter = {};
    const groupComplete = {};
    Object.keys(GROUPS).forEach(g => {
      const res = buildGroupResults(g);
      groupResultsByLetter[g] = res;
      groupComplete[g] = res.length > 0 && res.every(r => r.hg !== "" && r.ag !== "");
      groupStandings[g] = calcStandings(g, res);
    });
    const allGroupsComplete = Object.values(groupComplete).every(Boolean);

    // Looks up the already-played head-to-head result between two teams in
    // a group, using FIFA's actual first tiebreak criterion (head-to-head
    // points). Returns the winning team's name, "draw", or null if they
    // haven't played yet.
    const headToHeadWinner = (g, teamA, teamB) => {
      const m = (groupResultsByLetter[g] || []).find(r =>
        (r.home === teamA && r.away === teamB) || (r.home === teamB && r.away === teamA)
      );
      if (!m || m.hg === "" || m.ag === "") return null;
      const hg = parseInt(m.hg), ag = parseInt(m.ag);
      if (isNaN(hg) || isNaN(ag)) return null;
      if (hg === ag) return "draw";
      const homeWon = hg > ag;
      return (m.home === teamA) === homeWon ? teamA : teamB;
    };

    // Has this group's CURRENT leader mathematically clinched first place?
    // FIFA changed the World Cup tiebreak order for 2026: head-to-head
    // results among tied teams now come BEFORE overall goal difference (see
    // calcStandings above for the full chain). So a leader can be clinched
    // even when an exact points-tie is still reachable, as long as the
    // leader has already beaten every team that could reach that tie
    // head-to-head — beating everyone in a tied set guarantees winning that
    // set's head-to-head mini-table regardless of how many teams end up
    // level, so this is checked pairwise rather than needing to simulate
    // every possible group of ties. If the head-to-head meeting hasn't been
    // played yet, or was a draw, or the leader lost it, the tie genuinely
    // isn't resolved yet and the leader stays "provisional". A team that
    // could exceed the leader's points outright is obviously never safe.
    // Each team plays exactly 3 group matches, so remaining = 3 - played.
    const clinchedFirst = {};
    Object.keys(GROUPS).forEach(g => {
      const table = groupStandings[g] || [];
      const leader = table[0];
      // Once the group has actually finished, the table is final — trust
      // it directly. The pairwise head-to-head check below is only a
      // PROJECTION tool for a still-incomplete group; running it on a
      // finished one can wrongly read a tie as "unresolved" if it was
      // actually settled by goal difference/goals-for instead of a head-
      // to-head meeting. This was the actual bug behind Brazil still
      // showing as "Leading" after Group C had already finished.
      if (groupComplete[g]) {
        clinchedFirst[g] = !!leader;
        return;
      }
      clinchedFirst[g] = !!leader && table.slice(1).every(t => {
        const maxPossible = t.pts + (3 - t.p) * 3;
        if (maxPossible < leader.pts) return true;
        if (maxPossible > leader.pts) return false;
        return headToHeadWinner(g, leader.team, t.team) === leader.team;
      });
    });

    // Always resolve from the CURRENT table, not just once a group is
    // mathematically finished — this is a live projection that updates as
    // results come in, not a "wait until certain" view. It can still shift
    // before a group's last match is played; that's expected and fine.
    const firstOf = (g) => groupStandings[g]?.[0]?.team || null;
    const secondOf = (g) => groupStandings[g]?.[1]?.team || null;

    // Tags a "1X" or "2X" slot as "clinched" or "provisional" so the UI can
    // show confirmed teams in color/locked and still-live projections
    // dimmed. 1st place uses the mathematical clinch check above (can
    // resolve before the group's last match is even played). 2nd place
    // doesn't attempt that messier multi-team computation — it's tagged
    // "clinched" only once the whole group has actually finished, and
    // "provisional" the entire time before that.
    const slotTag = (slot) => {
      if (typeof slot !== "string") return null;
      if (slot[0] === "1") return clinchedFirst[slot[1]] ? "clinched" : "provisional";
      if (slot[0] === "2") return groupComplete[slot[1]] ? "clinched" : "provisional";
      return null;
    };

    // Same idea for the "best 8 thirds" cross-group ranking — projected from
    // the current table for every group's 3rd-place team. This is provisional
    // until every group has actually finished (the relative ranking can change
    // right up until the last group match), but there's always something to
    // show rather than blanking the whole bracket out.
    const qualifiedThirds = Object.keys(GROUPS)
      .map(g => ({ group:g, ...groupStandings[g][2] }))
      .sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf)
      .slice(0,8);
    const thirdTeamByGroup = Object.fromEntries(qualifiedThirds.map(t => [t.group, t.team]));
    let annexMapping = null;
    try { annexMapping = getAnnexCMapping(qualifiedThirds.map(t => ({group:t.group, team:t.team}))); }
    catch { annexMapping = null; }

    const resolveActualSlot = (slot, homeSlot) => {
      if (!slot) return null;
      if (slot === "3?") {
        if (!annexMapping) return null;
        const assigned = annexMapping[homeSlot];
        const grp = assigned ? assigned.replace(/^3/,"") : null;
        return (grp && thirdTeamByGroup[grp]) || null;
      }
      if (slot.startsWith("1")) return firstOf(slot[1]);
      if (slot.startsWith("2")) return secondOf(slot[1]);
      return null;
    };

    // Looks up a real finished result for two known teams, trying both
    // home/away orderings since neutral-venue knockout fixtures don't
    // always have the "home" slot match the broadcaster's designation.
    // Draws (which shouldn't persist past penalties in a real knockout
    // match) are left as TBD rather than guessed at.
    const lookupReal = (home, away) => {
      if (!home || !away || home === "TBD" || away === "TBD") return null;
      let s = getScore(home, away), swapped = false;
      if (!s) { s = getScore(away, home); swapped = true; }
      if (!s || !statusIsFinished(s.status)) return null;

      const hg = swapped ? s.ag : s.hg;
      const ag = swapped ? s.hg : s.ag;
      const pHome = swapped ? s.pAway : s.pHome;
      const pAway = swapped ? s.pHome : s.pAway;

      if (hg == null || ag == null) return null;

      // Knockout matches can finish level after extra time and be resolved on
      // penalties. Keep the 120-minute score on the bracket card, but advance
      // the penalty-shootout winner into the next round.
      if (s.winner) return { hg, ag, pHome, pAway, winner: s.winner };
      if (Number(hg) !== Number(ag)) return { hg, ag, pHome, pAway, winner: Number(hg) > Number(ag) ? home : away };
      if (pHome != null && pAway != null && Number(pHome) !== Number(pAway)) {
        return { hg, ag, pHome, pAway, winner: Number(pHome) > Number(pAway) ? home : away };
      }
      return null;
    };

    const winnerMap = {};
    const actualTeamTag = (slot, team) => {
      // Actual Bracket R32 is now fully set. Once a slot resolves to a real
      // team, do not tag it as provisional OR clinched. The tag was only a
      // prediction-state cue, and it made confirmed R32 teams look visually
      // locked/dimmed in the Actual Bracket. Leave unresolved slots tagged so
      // TBD/projection states still have a safe fallback.
      if (team && team !== "TBD") return null;
      return slotTag(slot);
    };
    const r32 = R32_SLOT_TEMPLATE.map(m => {
      const home = resolveActualSlot(m.home, m.home) || "TBD";
      const away = resolveActualSlot(m.away, m.home) || "TBD";
      const played = lookupReal(home, away);
      if (played) winnerMap[m.match] = played.winner;
      return { match:m.match, homeSlot:m.home, awaySlot:m.away, home, away, hg:played?.hg ?? null, ag:played?.ag ?? null, winner: played?.winner || null, homeTag: actualTeamTag(m.home, home), awayTag: actualTeamTag(m.away, away) };
    });

    const resolveRef = (ref) => {
      if (typeof ref === "string" && ref.startsWith("W")) return winnerMap[Number(ref.slice(1))] || "TBD";
      return ref || "TBD";
    };
    const buildActualRound = (template=[]) => (template||[]).map(t => {
      const home = resolveRef(t.home), away = resolveRef(t.away);
      const played = lookupReal(home, away);
      if (played) winnerMap[t.match] = played.winner;
      return { match:t.match, homeSlot:t.home, awaySlot:t.away, home, away, hg:played?.hg ?? null, ag:played?.ag ?? null, winner: played?.winner || null };
    });

    const r16 = buildActualRound(ROUND_OF_16_TEMPLATE);
    const qf = buildActualRound(QUARTER_FINAL_TEMPLATE);
    const sf = buildActualRound(SEMI_FINAL_TEMPLATE);
    const final = buildActualRound(FINAL_TEMPLATE);
    const champion = final?.[0]?.winner || null;
    const runnerUp = champion ? [final?.[0]?.home, final?.[0]?.away].find(t => t && t !== champion && t !== "TBD") : null;

    return { r32, r16, qf, sf, final, champion, runnerUp, allGroupsComplete };
  }, [allFixtures]);

  const handleManualPick = (match, team) => {
    if (playMode !== "manual" || !match?.match || !team || team === "TBD") return;
    setManualPicks(prev => {
      const existing = prev[match.match];
      const next = {...prev, [match.match]: team};
      // Only clear downstream picks if we're CHANGING an existing pick (not filling a new slot)
      if (existing && existing !== team) {
        const m = Number(match.match);
        const cutoff = m < 89 ? 89 : m < 97 ? 97 : m < 101 ? 101 : m < 104 ? 104 : 105;
        Object.keys(next).forEach(k => { if (Number(k) >= cutoff) delete next[k]; });
      }
      return next;
    });
  };

  const shareBracketCard = async () => {
    const bracket = displayedResult;
    if (!bracket?.champion) {
      alert("Pick the Final winner before sharing your bracket card.");
      return;
    }
    setSharing(true);
    try {
      const displayName = (localStorage.getItem("wc2026_displayname") || "").trim();
      const owner = displayName || "My";
      const semifinals = (bracket.sf || []).flatMap(m => [m.home, m.away]).filter(Boolean);
      const finalists = (bracket.final || []).flatMap(m => [m.home, m.away]).filter(Boolean);
      const snapshot = {
        owner,
        title: `${owner === "My" ? "My" : owner + "'s"} World Cup 2026 Bracket`,
        champion: bracket.champion,
        runnerUp: bracket.runnerUp || finalists.find(t => t && t !== bracket.champion) || "",
        finalists,
        semifinalists: Array.from(new Set(semifinals)),
        thirdGroupsKey: bracket.thirdGroupsKey || "",
        createdAt: Date.now(),
        rounds: {
          r32: bracket.r32 || [],
          r16: bracket.r16 || [],
          qf: bracket.qf || [],
          sf: bracket.sf || [],
          final: bracket.final || []
        }
      };

      const res = await fetch("/api/bracket-share", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(snapshot)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Unable to create share card");
      const url = data.url || `${window.location.origin}/api/bracket-share?id=${data.id}`;

      if (navigator.share) {
        await navigator.share({
          title: snapshot.title,
          text: `🏆 ${snapshot.title} — Champion: ${snapshot.champion}`,
          url
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert("Share link copied. Send it by SMS or WhatsApp.");
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Share bracket card failed:", err);
      alert(err.message || "Unable to share bracket card right now.");
    } finally {
      setSharing(false);
    }
  };

  return (
  <div>
    <div
      ref={_mbhRef}
      style={{
        position:"relative",
        top:0,
        left:"auto",
        transform:"none",
        width:"100%",
        maxWidth:700,
        zIndex:2,
        background:C.bg,
        borderBottom:`1px solid ${C.b2}`,
        boxShadow:DS.shadow.sticky,
        padding:isMobileBracket?"9px 10px 10px":"10px 13px 11px",
        marginTop:8,
        marginBottom:12,
        borderRadius:"0 0 10px 10px"
      }}
    >
      <div style={{display:"flex",gap:6,marginBottom:8}}>
        <button onClick={()=>setBracketSource("mine")} style={{flex:1,padding:"7px 0",borderRadius:10,border:`1px solid ${bracketSource==="mine"?C.blue:C.b2}`,background:bracketSource==="mine"?`${C.blue}1c`:"transparent",color:bracketSource==="mine"?C.blue:C.mid,fontWeight:800,fontSize:12,cursor:"pointer"}}>
          {tx("🎯 My Bracket", "🎯 Meu Chaveamento")}
        </button>
        <button onClick={()=>setBracketSource("actual")} style={{flex:1,padding:"7px 0",borderRadius:10,border:`1px solid ${bracketSource==="actual"?C.green:C.b2}`,background:bracketSource==="actual"?`${C.green}1c`:"transparent",color:bracketSource==="actual"?C.green:C.mid,fontWeight:800,fontSize:12,cursor:"pointer"}}>
          {tx("🌍 Actual Bracket", "🌍 Chaveamento Oficial")}
        </button>
      </div>
      {bracketSource==="mine" && (
      <div
        style={{
          display:"flex",
          gap:6,
          overflowX:"auto",
          scrollbarWidth:"none",
          WebkitOverflowScrolling:"touch",
          paddingBottom:2,
          marginBottom:0
        }}
      >
        <Pill active={stage==="groups"} onClick={()=>setStage("groups")} color={C.green}>✓ Groups</Pill>
        <Pill active={stage==="thirds"} onClick={()=>setStage("thirds")} color={C.gold}>✓ Best 3rds</Pill>
        <Pill active={stage==="bracket"} onClick={()=>setStage("bracket")} color={C.blue}>{tx("● Bracket", "● Chaveamento")}</Pill>
      </div>
      )}
    </div>
      {bracketSource==="mine" && stage==="groups" && (
        <div>
          <div style={{fontSize:12,color:C.mid,marginBottom:14,lineHeight:1.6}}>
            <strong style={{color:C.green}}>{tx("Build Your Bracket:", "Monte seu chaveamento:")}</strong> {tx("Press and drag ⠿ to reorder teams. Top 2 qualify automatically. Generate the bracket, then pick winners match by match.", "Pressione e arraste ⠿ para reordenar os times. Os 2 primeiros se classificam automaticamente. Gere o chaveamento e escolha os vencedores jogo a jogo.")}
          </div>
          {Object.entries(groups).map(([g,teams])=>(
            <Card key={g} style={{marginBottom:10}}>
              <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.b1}`,background:C.s1}}>
                <span style={{fontWeight:700,color:C.green,fontSize:14}}>GROUP {g}</span>
              </div>
              <div style={{padding:"6px 8px"}}>
                <DragList
                  items={teams}
                  onReorder={next => setGroups(p => ({...p, [g]: next}))}
                  renderItem={(team, displayIdx) => {
                    const col = displayIdx===0?C.green:displayIdx===1?C.gold:displayIdx===2?"#94a3b8":C.dim;
                    return (
                      <>
                        <span style={{fontSize:13,color:col,fontWeight:700,minWidth:18,textAlign:"center"}}>{displayIdx+1}</span>
                        <Crest team={team} size={22}/>
                        <span style={{fontSize:13,color:displayIdx<2?col:C.text,fontWeight:displayIdx<2?600:400,flex:1}}>{displayTeamName(team, language)}</span>
                        {displayIdx<2 && <span style={{fontSize:9,color:col,fontWeight:700,background:`${col}22`,padding:"2px 6px",borderRadius:6,flexShrink:0}}>Q</span>}
                        {displayIdx===2 && <span style={{fontSize:9,color:"#94a3b8",background:"#94a3b822",padding:"2px 6px",borderRadius:6,flexShrink:0}}>3rd</span>}
                      </>
                    );
                  }}
                />
              </div>
            </Card>
          ))}
          <button onClick={()=>setStage("thirds")} style={{width:"100%",padding:"12px 0",borderRadius:12,background:`linear-gradient(135deg,${C.gold},#f59e0b)`,border:"none",color:"#030a05",fontWeight:700,fontSize:15,cursor:"pointer",marginTop:4}}>{tx("Pick Best 3rd-Place Teams →", "Escolher melhores 3º colocados →")}</button>
        </div>
      )}
      {bracketSource==="mine" && stage==="thirds" && (
        <div>
          <div style={{fontSize:12,color:C.mid,marginBottom:6,lineHeight:1.6}}>{tx("Select exactly", "Selecione exatamente")} <strong style={{color:C.gold}}>8 {tx("of", "de")} 12</strong> {tx("third-place teams to advance.", "terceiros colocados para avançar.")}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:13,color:thirds.length===8?C.green:C.gold,fontWeight:700}}>{thirds.length}/8 {tx("selected", "selecionados")}</span>
            <button onClick={()=>{const sorted=[...allThirds].sort((a,b)=>gs(b.team)-gs(a.team)).slice(0,8).map(x=>x.team);setThirds(sorted);}} style={{fontSize:11,padding:"4px 10px",borderRadius:10,background:`${C.gold}22`,border:`1px solid ${C.gold}55`,color:C.gold,cursor:"pointer",fontWeight:600}}>{tx("Auto-select best 8", "Selecionar melhores 8")}</button>
          </div>
          {allThirds.map(({group,team})=>{const sel=thirds.includes(team);return(<div key={team} onClick={()=>toggleThird(team)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,marginBottom:6,cursor:"pointer",background:sel?`${C.green}18`:C.s1,border:`1px solid ${sel?C.green:C.b1}`}}><div style={{width:20,height:20,borderRadius:6,border:`2px solid ${sel?C.green:C.dim}`,background:sel?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sel&&<span style={{color:"#030a05",fontSize:12,fontWeight:900}}>✓</span>}</div><Crest team={team} size={24}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:sel?C.green:C.text}}>{displayTeamName(team, language)}</div><div style={{fontSize:10,color:C.dim}}>{tx("3rd place Group", "3º lugar Grupo")} {group} · STR {gs(team)}</div></div></div>);})}
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button onClick={()=>setStage("groups")} style={{flex:1,padding:"11px 0",borderRadius:12,background:"transparent",border:`1px solid ${C.b2}`,color:C.mid,fontWeight:600,fontSize:14,cursor:"pointer"}}>← {tx("Back", "Voltar")}</button>
            <button onClick={runBracket} disabled={thirds.length!==8||running} style={{flex:2,padding:"11px 0",borderRadius:12,background:thirds.length===8?`linear-gradient(135deg,${C.green},#22c55e)`:C.b2,border:"none",color:thirds.length===8?"#030a05":C.dim,fontWeight:700,fontSize:14,cursor:thirds.length===8?"pointer":"default",opacity:running?0.6:1}}>{running ? tx("Generating...", "Gerando...") : tx("🏆 Generate FIFA Bracket →", "🏆 Gerar chaveamento FIFA →")}</button>
          </div>
        </div>
      )}
    {bracketSource==="mine" && stage==="bracket" && result && (
  <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:8,flexWrap:"wrap"}}>
      <div style={{fontSize:15,color:C.green,fontWeight:900,lineHeight:1.1}}>
        {tx("🏆 Tournament Bracket", "🏆 Chaveamento do Torneio")}
        <span style={{marginLeft:6,fontSize:11,color:C.dim,fontWeight:600}}>
          ({displayedResult?.completedCount || 0}/31)
        </span>
        {bracketView==="tree" && <span style={{marginLeft:8,fontSize:10,color:C.dim,fontWeight:400,fontStyle:"italic"}}>{tx("tap a team to pick the winner", "toque em um time para escolher o vencedor")}</span>}
      </div>

      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:4,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:999,padding:2}}>
          <button onClick={()=>setBracketView("compact")} style={{border:"none",borderRadius:999,padding:"4px 8px",fontSize:10,fontWeight:800,cursor:"pointer",background:bracketView==="compact"?`${C.green}22`:"transparent",color:bracketView==="compact"?C.green:C.mid,lineHeight:1}}>
            {tx("📱 Compact", "📱 Compacto")}
          </button>
          <button onClick={()=>setBracketView("tree")} style={{border:"none",borderRadius:999,padding:"4px 8px",fontSize:10,fontWeight:800,cursor:"pointer",background:bracketView==="tree"?`${C.gold}22`:"transparent",color:bracketView==="tree"?C.gold:C.mid,lineHeight:1}}>
            {tx("🌳 Tree", "🌳 Árvore")}
          </button>
        </div>

        <button onClick={()=>setShowBracketActions(v=>!v)} style={{padding:"5px 9px",borderRadius:999,background:showBracketActions?`${C.green}18`:C.s1,border:`1px solid ${showBracketActions?C.green:C.b1}`,color:showBracketActions?C.green:C.mid,fontSize:10,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap",lineHeight:1}}>
          {tx("⚙️ Actions", "⚙️ Ações")}
        </button>
      </div>
    </div>

    {showBracketActions && (
      <Card style={{padding:8,marginBottom:8,background:C.s1,border:`1px solid ${C.b1}`}}>
        <div style={{display:"grid",gridTemplateColumns:isMobileBracket?"1fr 1fr":"repeat(5,1fr)",gap:6}}>
          <button onClick={shareBracketCard} disabled={!displayedResult?.champion || sharing} title={!displayedResult?.champion?tx("Pick the Final winner before sharing", "Escolha o vencedor da final antes de compartilhar"):undefined} style={{padding:"6px 8px",borderRadius:9,background:displayedResult?.champion?`${C.blue}22`:C.bg,border:`1px solid ${displayedResult?.champion?C.blue:C.b2}`,color:displayedResult?.champion?C.blue:C.dim,fontSize:11,fontWeight:700,cursor:displayedResult?.champion&&!sharing?"pointer":"not-allowed",opacity:sharing?0.65:1,lineHeight:1.1,minHeight:30}}>
            {sharing ? tx("Creating...", "Criando...") : tx("📤 Share", "📤 Compartilhar")}
          </button>
          <button onClick={()=>setStage("groups")} style={{padding:"6px 8px",borderRadius:9,background:"transparent",border:`1px solid ${C.b2}`,color:C.mid,fontSize:11,fontWeight:700,cursor:"pointer",lineHeight:1.1,minHeight:30}}>
            ← {tx("Edit", "Editar")}
          </button>
          <button onClick={()=>setPlayMode("manual")} disabled={result.fifaEngineStatus!=="fifa-ready"} style={{padding:"6px 8px",borderRadius:9,background:playMode==="manual"?`${C.blue}22`:C.bg,border:`1px solid ${playMode==="manual"?C.blue:C.b2}`,color:playMode==="manual"?C.blue:C.mid,fontSize:11,fontWeight:700,cursor:result.fifaEngineStatus==="fifa-ready"?"pointer":"not-allowed",opacity:result.fifaEngineStatus==="fifa-ready"?1:0.55,lineHeight:1.1,minHeight:30}}>
            {tx("👆 Manual", "👆 Manual")}
          </button>
          <button onClick={resetWinners} style={{padding:"6px 8px",borderRadius:9,background:`${C.green}16`,border:`1px solid ${C.greenS}`,color:C.green,fontSize:11,fontWeight:700,cursor:"pointer",lineHeight:1.1,minHeight:30}}>
            {tx("🔄 Reset", "🔄 Reiniciar")}
          </button>
          <button onClick={resetMyBracket} style={{padding:"6px 8px",borderRadius:9,background:`${C.gold}12`,border:`1px solid ${C.gold}44`,color:C.gold,fontSize:11,fontWeight:700,cursor:"pointer",lineHeight:1.1,minHeight:30}}>
            {tx("🗑 Bracket", "🗑 Chaveamento")}
          </button>
        </div>
      </Card>
    )}

    <VisualBracketTree
      bracket={displayedResult}
      pickMode={playMode}
      onPick={handleManualPick}
      view={bracketView}
      onMatchTap={onMatchTap}
      language={language}
    />
  </div>
)}

    {bracketSource==="actual" && (
  <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:8,flexWrap:"wrap"}}>
      <div style={{fontSize:15,color:C.green,fontWeight:900,lineHeight:1.1}}>
        {tx("🌍 Actual Tournament Bracket", "🌍 Chaveamento Oficial do Torneio")}
        <span style={{marginLeft:8,fontSize:10,color:C.dim,fontWeight:400,fontStyle:"italic"}}>{tx("real results — fills in as matches are played", "resultados reais — preenche conforme os jogos acontecem")}</span>
      </div>
      <div style={{display:"flex",gap:4,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:999,padding:2}}>
        <button onClick={()=>setBracketView("compact")} style={{border:"none",borderRadius:999,padding:"4px 8px",fontSize:10,fontWeight:800,cursor:"pointer",background:bracketView==="compact"?`${C.green}22`:"transparent",color:bracketView==="compact"?C.green:C.mid,lineHeight:1}}>
          {tx("📱 Compact", "📱 Compacto")}
        </button>
        <button onClick={()=>setBracketView("tree")} style={{border:"none",borderRadius:999,padding:"4px 8px",fontSize:10,fontWeight:800,cursor:"pointer",background:bracketView==="tree"?`${C.gold}22`:"transparent",color:bracketView==="tree"?C.gold:C.mid,lineHeight:1}}>
          {tx("🌳 Tree", "🌳 Árvore")}
        </button>
        <button onClick={()=>setBracketView("circular")} style={{border:"none",borderRadius:999,padding:"4px 8px",fontSize:10,fontWeight:800,cursor:"pointer",background:bracketView==="circular"?`${C.blue}22`:"transparent",color:bracketView==="circular"?C.blue:C.mid,lineHeight:1}}>
          {tx("⭕ Circle", "⭕ Circular")}
        </button>
      </div>
    </div>

    {!actualBracket.allGroupsComplete && (
      <div style={{fontSize:11,color:C.dim,marginBottom:8,padding:"7px 10px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:9}}>
        {tx("Group stage still in progress — this is a live projection based on current standings. Slots will keep updating as more matches finish, and may still shift before each group's final match.", "A fase de grupos ainda está em andamento — esta é uma projeção ao vivo baseada na classificação atual. As vagas continuarão atualizando conforme mais jogos terminarem e ainda podem mudar antes do último jogo de cada grupo.")}
      </div>
    )}

    {bracketView === "circular" ? (
      <CircularBracket
        bracket={actualBracket}
        language={language}
        C={C}
        getFlag={getFlag}
        FLAG_CODES_MAP={FLAG_CODES_MAP}
        MATCHES={MATCHES}
        onMatchTap={onMatchTap}
      />
    ) : (
      <VisualBracketTree
        bracket={actualBracket}
        pickMode="auto"
        onPick={()=>{}}
        view={bracketView}
        onMatchTap={onMatchTap}
        language={language}
      />
    )}
  </div>
)}

    </div>
  );
}

