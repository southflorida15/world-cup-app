import React, { useState, useContext } from "react";
import { displayTeamName, displayStageName, displayVenueName } from "../i18n/display";
import { WC_TEAM_HISTORY, getPlayerScoringLog } from "../data/wcTeamHistory";

// Shared App.jsx values, passed in as props rather than imported directly
// to avoid a circular import (App.jsx -> Ask.jsx -> App.jsx), since
// App.jsx itself needs to import this file to render it.
// C, GROUPS, LiveScoresCtx, MATCHES, STR, TEAMS, PREDS, FORM_DATA,
// WC_TOP_SCORERS, getFlag, Card

export default function AskWorldCupTab({
  language="en", t=(key, fallback)=>fallback,
  tabTop=116, resolvedMatches,
  // Shared App.jsx values, passed as props to avoid a circular import
  C, GROUPS, LiveScoresCtx, MATCHES, STR, TEAMS, PREDS, FORM_DATA,
  WC_TOP_SCORERS, getFlag, Card,
}) {
  const isPtBR = language === "pt-BR";
  const tx = (en, pt) => isPtBR ? pt : en;

  // Was: every match title throughout this component (dozens of spots)
  // built from the raw MATCHES array, which still holds an unresolved
  // slot placeholder ("2A"/"2B") for an R32+ match until that group
  // finishes — so "what's live today" answered with placeholder codes
  // instead of real team names. Reassigning the local MATCHES binding to
  // prefer the already-resolved version fixes every usage at once.
  MATCHES = resolvedMatches || MATCHES;
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const { scores } = useContext(LiveScoresCtx);
  const scoresRef = scores || {};

  const examples = [
    tx("Teams at WC for first time", "Times estreantes na Copa"),
    tx("Most international caps", "Mais jogos por seleção"),
    tx("Top players by goals", "Artilheiros"),
    tx("Most titled teams", "Times com mais títulos"),
    tx("Championship odds", "Chances de título"),
    tx("Strongest teams", "Times mais fortes"),
    tx("Best form teams", "Times em melhor fase"),
    tx("Total goals scored", "Total de gols marcados"),
    tx("Highest scoring match", "Jogo com mais gols"),
    tx("Biggest win so far", "Maior goleada até agora"),
    tx("Which teams have won so far", "Quais times já venceram"),
    tx("Unbeaten teams", "Times invictos"),
    tx("How many matches left", "Quantos jogos faltam"),
    tx("Matches today", "Jogos de hoje"),
    tx("Next match", "Próximo jogo"),
    tx("Next Brazil match", "Próximo jogo do Brasil"),
    tx("Group A matches", "Jogos do Grupo A"),
    tx("Matches in Miami", "Jogos em Miami"),
    tx("Germany all-time top scorers", "Maiores artilheiros da Alemanha"),
    tx("Brazil vs France history", "Histórico Brasil x França"),
    tx("Who is coaching Spain", "Quem treina a Espanha"),
    tx("Teams from Africa", "Times da África"),
    tx("Final match", "Final"),
  ];

  const norm = (v) => String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const fmtMatch = (m) => ({
    title: `${getFlag(m.home)} ${displayTeamName(m.home, language)} vs ${getFlag(m.away)} ${displayTeamName(m.away, language)}`,
    meta: `${m.date} · ${displayKickoffTime(m)} · ${displayVenueName(m.venue, language)}${m.group ? ` · ${language === "pt-BR" ? "Grupo" : "Group"} ${m.group}` : ""}`,
    match: m,
  });

  const displayKickoffTime = (m) => {
    // Some midnight ET matches are intentionally grouped under the venue's previous-day schedule.
    // Always display/search the real kickoff time to users.
    const t = String(m?.time || "").trim();
    if (/^(11:50|11:59)\s*PM\s*ET$/i.test(t)) return "12AM ET";
    return t;
  };

  const timeKey = (value) => {
    // Deliberately NOT using norm() here — it strips colons (and other
    // punctuation) for natural-language question matching, which corrupts
    // "4:30PM" into "4 30pm" before this regex ever sees it. That breaks
    // both the minutes capture and the AM/PM detection (since "pm" ends up
    // glued to "30" instead of adjacent to the hour), silently dropping the
    // 12-to-24-hour conversion — "4:30PM" parsed as "04:00" instead of
    // "16:30", which is what caused a 4:30pm match to sort ahead of an
    // earlier 1pm match. This needs only lowercasing, not punctuation removal.
    const text = String(value || "").toLowerCase().trim();
    if (!text) return "";
    if (text.includes("midnight")) return "00:00";
    const m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
    if (!m) return "";
    let h = Number(m[1]);
    let min = Number(m[2] || 0);
    const ap = m[3];
    // Historical display hack: questions about 11:50/11:59 PM should find true midnight games.
    if (ap === "pm" && h === 11 && min >= 50) return "00:00";
    if (ap === "am" && h === 12) h = 0;
    else if (ap === "pm" && h < 12) h += 12;
    return `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
  };

  const matchTimeKey = (m) => timeKey(displayKickoffTime(m));

  const monthIndex = {jun:5,june:5,jul:6,july:6};
  const matchDateObj = (m) => {
    const dm = String(m.date || "").match(/^(Jun|Jul)\s+(\d{1,2})/i);
    if (!dm) return new Date(9999,0,1);
    const mon = monthIndex[dm[1].toLowerCase()];
    const day = Number(dm[2]);
    const [hh,mm] = (matchTimeKey(m) || "12:00").split(":").map(Number);
    return new Date(2026, mon, day, hh || 0, mm || 0, 0);
  };

  const orderedMatches = () => [...MATCHES].sort((a,b)=> matchDateObj(a) - matchDateObj(b) || Number(a.id||0) - Number(b.id||0));
  const upcomingMatches = () => {
    const now = new Date();
    const upcoming = orderedMatches().filter(m => matchDateObj(m) >= now);
    return upcoming.length ? upcoming : orderedMatches();
  };

  const numberRequested = (text, fallback=5) => {
    const m = text.match(/\bnext\s+(\d{1,2})\b/);
    return Math.min(20, Math.max(1, Number(m?.[1] || fallback)));
  };

  const allTeams = () => Object.values(GROUPS).flatMap(g=>g.teams);
  const findTeamInText = (text) => allTeams().find(t => text.includes(norm(t)) || norm(t).includes(text));
  // Finds every team name mentioned in the text, in the order they appear —
  // used for "has X played Y" style two-team historical questions.
  const findTeamsInText = (text) => {
    const hits = [];
    for (const t of allTeams()) {
      const nt = norm(t);
      const idx = text.indexOf(nt);
      if (idx !== -1) hits.push({ team:t, idx });
    }
    return hits.sort((a,b)=>a.idx-b.idx).map(h=>h.team);
  };
  const findCityInText = (text) => {
    const cityTerms = ["miami","dallas","houston","atlanta","seattle","philadelphia","boston","toronto","vancouver","mexico city","guadalajara","monterrey","los angeles","new york","new jersey","kansas city","san francisco"];
    return cityTerms.find(c => text.includes(c));
  };

  const findPlayerInText = (text) => {
    const players = Object.entries(TEAMS).flatMap(([team,info]) => (info.players || []).map(p => ({ team, name:p.name })));
    return players.find(p => {
      const pn = norm(p.name);
      const parts = pn.split(" ").filter(x=>x.length>=4);
      return text.includes(pn) || parts.some(part => text.includes(part));
    });
  };

  const answerLocal = (raw) => {
    const text = norm(raw);
    if (!text) return { title:tx("Ask anything about the World Cup", "Pergunte qualquer coisa sobre a Copa"), summary:tx("Try one of the popular questions below.", "Tente uma das perguntas populares abaixo."), rows:[] };

    const player = findPlayerInText(text);
    if (player && (text.includes("next") || text.includes("match") || text.includes("play") || text.includes("involving"))) {
      const n = numberRequested(text, text.includes("matches") ? 5 : 1);
      const rows = upcomingMatches().filter(m => m.home===player.team || m.away===player.team).slice(0,n).map(fmtMatch);
      return { title:`${player.name} plays for ${getFlag(player.team)} ${player.team}`, summary: rows.length ? `Showing the next ${rows.length} ${player.team} match${rows.length!==1?"es":""}.` : `No scheduled ${player.team} matches found.`, rows };
    }

    const teamForNext = findTeamInText(text);
    if (text.includes("next")) {
      const n = numberRequested(text, text.includes("matches") ? 5 : 1);
      let matches = upcomingMatches();
      const city = findCityInText(text);
      if (teamForNext) matches = matches.filter(m => m.home===teamForNext || m.away===teamForNext);
      if (city) matches = matches.filter(m => norm(m.venue).includes(city));
      const rows = matches.slice(0,n).map(fmtMatch);
      const label = teamForNext ? `${getFlag(teamForNext)} ${teamForNext}` : city ? city.replace(/\b\w/g, c=>c.toUpperCase()) : "tournament";
      return { title: teamForNext ? `Next ${teamForNext} match${n>1?"es":""}` : city ? `Next match${n>1?"es":""} in ${label}` : `Next ${n} World Cup match${n!==1?"es":""}`, summary: rows.length ? `${rows.length} upcoming match${rows.length!==1?"es":""} found.` : "No upcoming matches found.", rows };
    }

    // Time queries: "9pm", "9 pm", "21:00", "midnight", "12AM", and legacy 11:50/11:59 PM labels.
    const hasTimeIntent = text.includes("match") || text.includes("game") || text.includes("show") || text.includes("at ") || text.includes("midnight");
    const targetTime = (text.includes("midnight") || /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/.test(text)) ? timeKey(text) : "";
    if (targetTime && hasTimeIntent) {
      const rows = MATCHES.filter(m => matchTimeKey(m) === targetTime).map(fmtMatch);
      const label = targetTime === "00:00" ? "12AM ET" : `${Number(targetTime.split(":")[0]) > 12 ? Number(targetTime.split(":")[0])-12 : Number(targetTime.split(":")[0]) || 12}${targetTime.endsWith(":00") ? "" : `:${targetTime.split(":")[1]}`}${Number(targetTime.split(":")[0]) >= 12 ? "PM" : "AM"} ET`;
      return { title:`Matches at ${label}`, summary: rows.length ? `${rows.length} match${rows.length!==1?"es":""} found in the 2026 schedule.` : "No matches found for that time in the local schedule.", rows };
    }

    // Date queries like Jun 19.
    const dateMatch = text.match(/\b(jun|june|jul|july)\s*(\d{1,2})\b/);
    if (dateMatch) {
      const mon = dateMatch[1].startsWith("jul") ? "Jul" : "Jun";
      const day = String(Number(dateMatch[2]));
      const rows = MATCHES.filter(m => norm(m.date) === norm(`${mon} ${day}`)).map(fmtMatch);
      return { title:`Matches on ${mon} ${day}`, summary: rows.length ? `${rows.length} match${rows.length!==1?"es":""} found.` : "No matches found for that date.", rows };
    }

    // Group queries.
    const groupMatch = text.match(/group\s*([a-l])\b/);
    if (groupMatch) {
      const g = groupMatch[1].toUpperCase();
      const rows = MATCHES.filter(m => m.group === g).map(fmtMatch);
      return { title:`Group ${g} matches`, summary:`${rows.length} group-stage matches found.`, rows };
    }

    // Venue / city queries.
    const city = findCityInText(text);
    if (city) {
      const rows = MATCHES.filter(m => norm(m.venue).includes(city)).map(fmtMatch);
      return { title:`Matches in ${city.replace(/\b\w/g, c=>c.toUpperCase())}`, summary: rows.length ? `${rows.length} match${rows.length!==1?"es":""} found.` : "No matches found for that city/venue.", rows };
    }

    // Team queries.
    const team = findTeamInText(text);
    if (team) {
      const rows = MATCHES.filter(m => m.home===team || m.away===team).map(fmtMatch);
      return { title:`${getFlag(team)} ${team} matches`, summary: rows.length ? `${rows.length} scheduled match${rows.length!==1?"es":""} found.` : "No scheduled matches found.", rows };
    }

    // Final / knockout keywords.
    if (text.includes("final")) {
      const rows = MATCHES.filter(m => norm(m.round||m.stage||"").includes("final") || m.id===104).map(fmtMatch);
      return { title:"Final / knockout matches", summary: rows.length ? `${rows.length} match${rows.length!==1?"es":""} found.` : "The final will appear here once the schedule data includes it.", rows };
    }

    // First-time / debut WC teams
    if (text.includes("first time") || text.includes("debut") || text.includes("first wc") || text.includes("first world cup") || text.includes("never been") || text.includes("new team") || text.includes("historic")) {
      const DEBUTS = {
        "Uzbekistan": "🇺🇿 Uzbekistan — first ever World Cup",
        "Cape Verde": "🇨🇻 Cape Verde — first ever World Cup",
        "Curacao": "🇨🇼 Curaçao — first ever World Cup",
        "Jordan": "🇯🇴 Jordan — first ever World Cup",
        "Haiti": "🇭🇹 Haiti — return after 52 years (last: 1974)",
        "Iraq": "🇮🇶 Iraq — return after 40 years (last: 1986)",
        "Bosnia & Herz.": "🇧🇦 Bosnia & Herz. — second appearance (last: 2014)",
        "DR Congo": "🇨🇩 DR Congo — return after 48 years (last: 1974 as Zaire)",
      };
      return { title:"First-timers & long-absent teams", summary:Object.values(DEBUTS).join(" · "), rows:[] };
    }

    // Most international caps (from player data across all teams)
    if (text.includes("most cap") || text.includes("most international") || text.includes("most appear") || text.includes("experienced player") || text.includes("veteran player")) {
      const allPlayers = [];
      Object.entries(TEAMS||{}).forEach(([team, data]) => {
        (data.players||[]).forEach(p => { if (p.caps > 0) allPlayers.push({...p, team, flag:data.flag}); });
      });
      const top = allPlayers.sort((a,b)=>b.caps-a.caps).slice(0,8);
      return { title:"Most international caps at this WC", summary:top.map((p,i)=>`${i+1}. ${p.flag} ${p.name} (${p.team}) — ${p.caps} caps`).join(" · "), rows:[] };
    }

    // Top players by international goals
    if ((text.includes("top player") || text.includes("most goal") || text.includes("top goal") || text.includes("international goal")) && !text.includes("match")) {
      const allPlayers = [];
      Object.entries(TEAMS||{}).forEach(([team, data]) => {
        (data.players||[]).forEach(p => { if (p.goals > 0) allPlayers.push({...p, team, flag:data.flag}); });
      });
      const top = allPlayers.sort((a,b)=>b.goals-a.goals).slice(0,8);
      return { title:"Top international goalscorers at this WC", summary:top.map((p,i)=>`${i+1}. ${p.flag} ${p.name} (${p.team}) — ${p.goals} goals`).join(" · "), rows:[] };
    }

    // Most WC titles
    if (text.includes("title") || text.includes("winner") && text.includes("most") || text.includes("champion") && !text.includes("chance") || text.includes("won the world cup") || text.includes("how many title")) {
      const withTitles = Object.entries(TEAMS||{}).filter(([,d])=>d.titles>0).sort((a,b)=>b[1].titles-a[1].titles);
      if (!withTitles.length) return { title:"WC title holders", summary:"No title data found.", rows:[] };
      return { title:"World Cup winners", summary:withTitles.map(([t,d])=>`${d.flag} ${t}: ${d.titles} 🏆`).join(" · "), rows:[] };
    }

    // Coaches
    if (text.includes("coach") || text.includes("manager") || text.includes("head coach")) {
      const teamMatch = findTeamInText(text);
      if (teamMatch && TEAMS?.[teamMatch]) {
        const d = TEAMS[teamMatch];
        return { title:`${d.flag} ${teamMatch} coach`, summary:`${d.coach} is the head coach of ${teamMatch}.`, rows:[] };
      }
      // List all coaches
      const coaches = Object.entries(TEAMS||{}).filter(([,d])=>d.coach).slice(0,12);
      return { title:"Head coaches at this World Cup", summary:coaches.map(([t,d])=>`${d.flag} ${t}: ${d.coach}`).join(" · "), rows:[] };
    }

    // Teams by confederation
    if (text.includes("africa") || text.includes("caf") || text.includes("south america") || text.includes("conmebol") || text.includes("europe") || text.includes("uefa") || text.includes("asia") || text.includes("afc") || text.includes("concacaf") || text.includes("north america") || text.includes("central america")) {
      const confMap = {africa:"CAF", "south america":"CONMEBOL", europe:"UEFA", asia:"AFC", concacaf:"CONCACAF", "north america":"CONCACAF", "central america":"CONCACAF"};
      const confKey = Object.keys(confMap).find(k => text.includes(k)) || (text.includes("caf")?"CAF":text.includes("conmebol")?"CONMEBOL":text.includes("uefa")?"UEFA":text.includes("afc")?"AFC":"CONCACAF");
      const conf = confMap[confKey] || confKey.toUpperCase();
      const teams = Object.entries(TEAMS||{}).filter(([,d])=>d.conf===conf);
      return { title:`${conf} teams (${teams.length})`, summary:teams.map(([t,d])=>`${d.flag} ${t}`).join(" · "), rows:[] };
    }

    // Highest scoring / biggest win
    if (text.includes("highest scor") || (text.includes("most goal") && text.includes("match")) || text.includes("biggest win") || text.includes("best result")) {
      const finished = MATCHES.filter(m => {
        const sc = scoresRef[`${m.home}|${m.away}`];
        return sc && sc.hg !== null && sc.ag !== null && (sc.status==="FT"||sc.status==="AET"||sc.status==="finished"||sc.status==="ended");
      });
      if (!finished.length) return { title:"No finished matches yet", summary:"Check back once matches have been played.", rows:[] };
      const withScores = finished.map(m => { const sc = scoresRef[`${m.home}|${m.away}`]; return {...m, hg:sc.hg, ag:sc.ag, total:sc.hg+sc.ag, diff:Math.abs(sc.hg-sc.ag)}; });
      if (text.includes("biggest win")) {
        const top = [...withScores].sort((a,b)=>b.diff-a.diff).slice(0,3);
        const rows = top.map(m => ({ title:`${getFlag(m.home)} ${m.home} ${m.hg}–${m.ag} ${getFlag(m.away)} ${m.away}`, meta:`${m.date} · Margin: ${m.diff}`, match:m }));
        return { title:tx("Biggest wins so far", "Maiores goleadas até agora"), summary:isPtBR ? `Top ${rows.length} por saldo de gols.` : `Top ${rows.length} by goal margin.`, rows };
      }
      const top = [...withScores].sort((a,b)=>b.total-a.total).slice(0,3);
      const rows = top.map(m => ({ title:`${getFlag(m.home)} ${m.home} ${m.hg}–${m.ag} ${getFlag(m.away)} ${m.away}`, meta:`${m.date} · ${m.total} goals`, match:m }));
      return { title:tx("Highest scoring matches", "Jogos com mais gols"), summary:isPtBR ? `Top ${rows.length} por total de gols.` : `Top ${rows.length} by total goals.`, rows };
    }

    // Which teams have won / unbeaten
    if (text.includes("won so far") || text.includes("which team") && text.includes("win") || text.includes("unbeaten") || text.includes("no loss")) {
      const teamRecord = {};
      MATCHES.forEach(m => {
        const sc = scoresRef[`${m.home}|${m.away}`];
        if (!sc || sc.hg === null || !(sc.status==="FT"||sc.status==="AET"||sc.status==="finished"||sc.status==="ended")) return;
        [m.home, m.away].forEach(t => { if (!teamRecord[t]) teamRecord[t] = {w:0,d:0,l:0}; });
        if (sc.hg > sc.ag) { teamRecord[m.home].w++; teamRecord[m.away].l++; }
        else if (sc.hg < sc.ag) { teamRecord[m.away].w++; teamRecord[m.home].l++; }
        else { teamRecord[m.home].d++; teamRecord[m.away].d++; }
      });
      if (text.includes("unbeaten")) {
        const unbeaten = Object.entries(teamRecord).filter(([,r])=>r.l===0&&(r.w>0||r.d>0)).sort((a,b)=>b[1].w-a[1].w);
        if (!unbeaten.length) return { title:tx("Unbeaten teams", "Times invictos"), summary:tx("No finished matches yet.", "Nenhum jogo finalizado ainda."), rows:[] };
        return { title:isPtBR ? `Times invictos (${unbeaten.length})` : `Unbeaten teams (${unbeaten.length})`, summary:unbeaten.map(([t,r])=>`${getFlag(t)} ${displayTeamName(t, language)}: ${r.w}V ${r.d}E`).join(" · "), rows:[] };
      }
      const winners = Object.entries(teamRecord).filter(([,r])=>r.w>0).sort((a,b)=>b[1].w-a[1].w);
      if (!winners.length) return { title:"No wins yet", summary:tx("No finished matches yet.", "Nenhum jogo finalizado ainda."), rows:[] };
      return { title:`Teams with wins (${winners.length})`, summary:winners.map(([t,r])=>`${getFlag(t)} ${t}: ${r.w}W ${r.d}D ${r.l}L`).join(" · "), rows:[] };
    }

    // How many matches left / remaining
    if (text.includes("how many match") || text.includes("matches left") || text.includes("remaining match")) {
      const finished = MATCHES.filter(m => { const sc = scoresRef[`${m.home}|${m.away}`]; return sc && (sc.status==="FT"||sc.status==="AET"||sc.status==="finished"||sc.status==="ended"); });
      const remaining = MATCHES.length - finished.length;
      return { title:"Tournament progress", summary:`${finished.length} of ${MATCHES.length} matches played · ${remaining} remaining.`, rows:[] };
    }

    if (text.includes("how many team") || text.includes("teams have played") || text.includes("teams played") || text.includes("teams already played")) {
      const finished = MATCHES.filter(m => { const sc = scoresRef[`${m.home}|${m.away}`]; return sc && (sc.status==="FT"||sc.status==="AET"||sc.status==="finished"||sc.status==="ended"); });
      const teams = new Set(finished.flatMap(m=>[m.home,m.away]));
      const notPlayed = allTeams().filter(t => !teams.has(t));
      return {
        title:`${teams.size} of 48 teams have played`,
        summary:`${finished.length} matches completed so far. ${notPlayed.length} teams yet to play.`,
        rows: notPlayed.length <= 20 ? notPlayed.map(t => ({ title:`${getFlag(t)} ${t}`, meta:"Yet to play" })) : []
      };
    }

    // Championship odds
    if (text.includes("odd") || text.includes("favorite") || text.includes("favourite") || text.includes("champion") && text.includes("chance") || text.includes("polymarket")) {
      const top = PREDS.filter(p=>p.team!=="Others").sort((a,b)=>b.poly-a.poly).slice(0,8);
      return { title:"Championship odds (Polymarket)", summary:top.map(p=>`${getFlag(p.team)} ${p.team} ${p.poly}% ${p.trend}`).join(" · "), rows:[] };
    }

    // Strongest teams / team ratings
    if (text.includes("strong") || text.includes("best team") || text.includes("top team") || text.includes("rated")) {
      const top = Object.entries(STR).sort((a,b)=>b[1]-a[1]).slice(0,10);
      return { title:"Strongest teams (simulator ratings)", summary:top.map(([t,r],i)=>`${i+1}. ${getFlag(t)} ${t} (${r})`).join(" · "), rows:[] };
    }

    // Best form teams
    if (text.includes("form") || text.includes("in-form") || text.includes("hot team") || text.includes("on a run")) {
      const scored = Object.entries(FORM_DATA).map(([t,f])=>{
        const pts = f.slice(-5).reduce((s,r)=>s+(r==="W"?3:r==="D"?1:0),0);
        return [t, pts, f.slice(-5)];
      }).sort((a,b)=>b[1]-a[1]).slice(0,8);
      return { title:"Best recent form (last 5 games)", summary:scored.map(([t,,f])=>`${getFlag(t)} ${t}: ${f.join("")}`).join(" · "), rows:[] };
    }

    // Matches today
    if (text.includes("today") || text.includes("match today")) {
      const todayStr = new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
      const rows = MATCHES.filter(m => m.date === todayStr).map(fmtMatch);
      return { title:`Matches today (${todayStr})`, summary: rows.length ? `${rows.length} match${rows.length!==1?"es":""} today.` : "No matches today.", rows };
    }

    // All-time WC top scorers for a team
    const scorerTeam = Object.keys(WC_TOP_SCORERS).find(t => norm(text).includes(norm(t)));
    if (scorerTeam && (text.includes("scor") || text.includes("goal") || text.includes("history") || text.includes("all.time"))) {
      const scorers = WC_TOP_SCORERS[scorerTeam];
      return { title:`${getFlag(scorerTeam)} ${scorerTeam} all-time WC top scorers`, summary:scorers.map((s,i)=>`${i+1}. ${s.name} (${s.goals})`).join(" · "), rows:[] };
    }

    // Tournament stats queries
    if (text.includes("top scor") && !scorerTeam) {
      return { title:"Top scorers", summary:"Live top-scorer data comes from the match events feed. Open any finished match card → Match Events to see goals. A dedicated leaderboard is on the roadmap.", rows:[] };
    }

    if (text.includes("total goal") || text.includes("goals scored") || text.includes("how many goal")) {
      const finished = MATCHES.filter(m => {
        const sc = scoresRef[`${m.home}|${m.away}`];
        return sc && (sc.status==="FT"||sc.status==="AET"||sc.status==="PEN"||sc.status==="finished"||sc.status==="ended"||sc.status==="after_extra_time"||sc.status==="after_penalties");
      });
      const total = finished.reduce((sum,m)=>{
        const sc = scoresRef[`${m.home}|${m.away}`];
        return sum + (sc?.hg||0) + (sc?.ag||0);
      }, 0);
      const played = finished.length;
      const avg = played > 0 ? (total/played).toFixed(2) : "—";
      return { title:tx("Total goals scored", "Total de gols marcados"), summary: played > 0 ? `${total} goals scored across ${played} finished match${played!==1?"es":""} (avg ${avg} per game).` : "No finished matches yet — check back during the tournament.", rows:[] };
    }

    if (text.includes("red card") || (text.includes("red") && text.includes("card"))) {
      return { title:"Red cards", summary:"Red card counts per match are available in Match Events — tap any finished match card and expand the Match Timeline. A tournament-wide red card tally is on the roadmap once the events API returns card data across all matches.", rows:[] };
    }

    if (text.includes("yellow card") || text.includes("card") || text.includes("yellow")) {
      return { title:"Yellow-card leaders", summary:"This question will become available once match-event feeds return player card data. The app already has a match-events API path ready for this type of query.", rows:[] };
    }

    // Historical head-to-head — "has X played Y", "X vs Y history", etc.
    // Backed by WC_TEAM_HISTORY, which is hand-compiled and only covers a
    // growing subset of teams/years (Brazil & USA 2022 to start). Search
    // every compiled year for either team to find a meeting.
    if (text.includes("history") || text.includes("historical") || text.includes("played") || (text.includes(" vs ") && !text.includes("predict"))) {
      const teamsMentioned = findTeamsInText(text);
      if (teamsMentioned.length >= 2) {
        const [t1, t2] = teamsMentioned;
        const meetings = [];
        [[t1,t2],[t2,t1]].forEach(([a,b]) => {
          const years = WC_TEAM_HISTORY[a];
          if (!years) return;
          Object.entries(years).forEach(([year, data]) => {
            (data.matches||[]).forEach(m => {
              if (norm(m.opponent) === norm(b)) {
                meetings.push({ year:Number(year), stage:m.stage, team:a, opponent:b, score:m.score, result:m.result });
              }
            });
          });
        });
        if (meetings.length) {
          meetings.sort((x,y)=>x.year-y.year);
          const rows = meetings.map(m => ({
            title: `${getFlag(m.team)} ${m.team} ${m.score} ${getFlag(m.opponent)} ${m.opponent}`,
            meta: `${m.year} World Cup · ${m.stage}`,
          }));
          return { title:`${t1} vs ${t2} — World Cup history`, summary:`Found ${meetings.length} meeting${meetings.length!==1?"s":""} in the years we have compiled (${[...new Set(meetings.map(m=>m.year))].join(", ")}).`, rows };
        }
        const coveredYears = [...new Set([...Object.keys(WC_TEAM_HISTORY[t1]||{}), ...Object.keys(WC_TEAM_HISTORY[t2]||{})])];
        if (coveredYears.length) {
          return { title:`${t1} vs ${t2} — World Cup history`, summary:`No meeting between ${t1} and ${t2} found in the World Cup years we have compiled so far (${coveredYears.join(", ")}). Our historical database doesn't cover every tournament yet — this may have happened in a year we haven't added.`, rows:[] };
        }
        return { title:`${t1} vs ${t2} — World Cup history`, summary:`We haven't compiled World Cup history for ${t1} or ${t2} yet — coverage currently includes Brazil and the United States (2022), with more teams and tournaments being added.`, rows:[] };
      }
      return { title:tx("Historical World Cup search", "Busca histórica da Copa"), summary:tx("Ask about a specific matchup, like \"has Brazil played Switzerland in a World Cup\" — historical coverage currently includes Brazil and the United States (2022), with more being added.", "Pergunte sobre um confronto específico, como ‘Brasil já enfrentou a Suíça em Copa?’ — a cobertura histórica ainda está em expansão."), rows:[] };
    }
    if (text.includes("past")) {
      return { title:tx("Historical World Cup search", "Busca histórica da Copa"), summary:"Historical match search currently covers Brazil and the United States (2022), with more teams and tournaments being added. Try schedule questions for 2026 now, like matches at 9PM ET, matches in Miami, or Brazil matches.", rows:[] };
    }

    return { title:"I can answer schedule questions now", summary:"Try asking about teams, groups, dates, kickoff times, cities, players, or venues. Historical/player-event queries are on the roadmap.", rows:[] };
  };

  const runAsk = async (raw=q) => {
    const value = raw.trim();
    setQ(value);
    setLoading(true);
    try {
      setAnswer(answerLocal(value));
    } finally {
      setTimeout(()=>setLoading(false), 120);
    }
  };

  return (
    <div style={{paddingTop:14}}>
      <Card style={{marginBottom:12,overflow:"visible"}}>
        <div style={{padding:14}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <div style={{fontSize:24}}>🔎</div>
            <div>
              <div style={{fontSize:20,fontWeight:900,color:C.green,lineHeight:1}}>{tx("Ask World Cup", "Pergunte sobre a Copa")}</div>
              <div style={{fontSize:12,color:C.mid,marginTop:3}}>{tx("Search the 2026 schedule now. Historical and live-event answers are next.", "Pesquise a tabela de 2026 agora. Respostas históricas e eventos ao vivo vêm a seguir.")}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")runAsk();}} placeholder={tx("Ask about matches, teams, times, cities...", "Pergunte sobre jogos, seleções, horários, cidades...")} style={{flex:1,minWidth:0,background:C.bg,border:`1px solid ${C.b2}`,borderRadius:12,padding:"11px 12px",color:C.text,fontWeight:650,fontSize:14,outline:"none"}}/>
            <button onClick={()=>runAsk()} style={{border:"none",borderRadius:12,padding:"0 14px",background:`linear-gradient(135deg,${C.green},#22c55e)`,color:"#031008",fontWeight:900,cursor:"pointer"}}>{tx("Ask", "Perguntar")}</button>
          </div>
        </div>
      </Card>

      <div style={{fontSize:11,color:C.dim,fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",margin:"12px 2px 8px"}}>{tx("Popular Questions", "Perguntas populares")}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,paddingBottom:4}}>
        {examples.map(ex=><button key={ex} onClick={()=>runAsk(ex)} style={{border:`1px solid ${C.b2}`,background:C.s1,color:C.text,borderRadius:999,padding:"7px 11px",fontWeight:600,fontSize:12,cursor:"pointer"}}>{ex}</button>)}
      </div>

      {loading && <Card><div style={{padding:14,color:C.mid}}>Searching World Cup data...</div></Card>}
      {!loading && answer && <Card style={{marginTop:10}}>
        <div style={{padding:14,borderBottom:answer.rows?.length?`1px solid ${C.b1}`:"none"}}>
          <div style={{fontWeight:900,color:C.green,fontSize:16,marginBottom:5}}>{answer.title}</div>
          <div style={{fontSize:13,color:C.mid,lineHeight:1.45}}>{answer.summary}</div>
        </div>
        {!!answer.rows?.length && <div style={{padding:8}}>{answer.rows.map((r,i)=>(
          <div key={i} style={{padding:"10px 9px",borderRadius:10,background:i%2?"transparent":`${C.green}08`,borderBottom:i===answer.rows.length-1?"none":`1px solid ${C.b1}`}}>
            <div style={{fontSize:14,fontWeight:800,color:C.text,marginBottom:3}}>{r.title}</div>
            <div style={{fontSize:12,color:C.mid,lineHeight:1.35}}>{r.meta}</div>
          </div>
        ))}</div>}
      </Card>}
    </div>
  );
}

