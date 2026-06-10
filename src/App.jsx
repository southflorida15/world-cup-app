import React, { useState, useEffect, useContext, createContext, useCallback, useMemo, useRef } from "react";
import { buildFifa2026Bracket, buildQualifiedThirdsFromSelectedTeams, buildThirdGroupsKey } from "./engine/fifa2026Bracket";
import { loadAnnexCFromRemote } from "./engine/annexC";

// ── THEME ─────────────────────────────────────────────────────────────────
const C = {
  bg:"#060e0a", s1:"#0c1a12", s2:"#112618", b1:"#1a3828", b2:"#234833",
  green:"#4ade80", greenS:"#4ade8055", gold:"#fbbf24", blue:"#60a5fa",
  rival:"#38bdf8", // sky blue — Team 2 color in H2H (neutral, not "loser" red)
  red:"#f87171", text:"#d4ead9", mid:"#7aaa8a", dim:"#3d6a4d",
};

// ── GROUPS ────────────────────────────────────────────────────────────────
const GROUPS = {
  A:{teams:["Mexico","South Africa","South Korea","Czechia"],flags:["🇲🇽","🇿🇦","🇰🇷","🇨🇿"]},
  B:{teams:["Canada","Bosnia & Herz.","Qatar","Switzerland"],flags:["🇨🇦","🇧🇦","🇶🇦","🇨🇭"]},
  C:{teams:["Brazil","Morocco","Haiti","Scotland"],flags:["🇧🇷","🇲🇦","🇭🇹","🏴󠁧󠁢󠁳󠁣󠁴󠁿"]},
  D:{teams:["United States","Paraguay","Australia","Turkiye"],flags:["🇺🇸","🇵🇾","🇦🇺","🇹🇷"]},
  E:{teams:["Germany","Curacao","Ivory Coast","Ecuador"],flags:["🇩🇪","🇨🇼","🇨🇮","🇪🇨"]},
  F:{teams:["Netherlands","Japan","Sweden","Tunisia"],flags:["🇳🇱","🇯🇵","🇸🇪","🇹🇳"]},
  G:{teams:["Belgium","Egypt","Iran","New Zealand"],flags:["🇧🇪","🇪🇬","🇮🇷","🇳🇿"]},
  H:{teams:["Spain","Cape Verde","Saudi Arabia","Uruguay"],flags:["🇪🇸","🇨🇻","🇸🇦","🇺🇾"]},
  I:{teams:["France","Senegal","Iraq","Norway"],flags:["🇫🇷","🇸🇳","🇮🇶","🇳🇴"]},
  J:{teams:["Argentina","Algeria","Austria","Jordan"],flags:["🇦🇷","🇩🇿","🇦🇹","🇯🇴"]},
  K:{teams:["Portugal","DR Congo","Uzbekistan","Colombia"],flags:["🇵🇹","🇨🇩","🇺🇿","🇨🇴"]},
  L:{teams:["England","Croatia","Ghana","Panama"],flags:["🏴󠁧󠁢󠁥󠁮󠁧󠁿","🇭🇷","🇬🇭","🇵🇦"]},
};
const getFlag = (t) => { for (const g of Object.values(GROUPS)) { const i = g.teams.indexOf(t); if (i !== -1) return g.flags[i]; } return "🏳️"; };

// ── MATCHES ───────────────────────────────────────────────────────────────
const MATCHES = [
  {id:1,  date:"Jun 11",time:"3PM ET",   home:"Mexico",        away:"South Africa",   venue:"Mexico City Stadium, Mexico City",              group:"A",tv:"FOX · Peacock · Telemundo"},
  {id:2,  date:"Jun 11",time:"10PM ET",  home:"South Korea",   away:"Czechia",        venue:"Estadio Guadalajara, Zapopan",                  group:"A",tv:"FS1 · Peacock · Telemundo"},
  {id:3,  date:"Jun 12",time:"3PM ET",   home:"Canada",        away:"Bosnia & Herz.", venue:"Toronto Stadium, Toronto",                      group:"B",tv:"FS1 · Peacock · Telemundo"},
  {id:4,  date:"Jun 12",time:"9PM ET",   home:"United States", away:"Paraguay",       venue:"SoFi Stadium, Los Angeles",                    group:"D",tv:"FOX · Peacock · Telemundo"},
  {id:5,  date:"Jun 13",time:"3PM ET",   home:"Qatar",         away:"Switzerland",    venue:"San Francisco Bay Area Stadium, San Francisco", group:"B",tv:"FS1 · Peacock · Telemundo"},
  {id:6,  date:"Jun 13",time:"6PM ET",   home:"Brazil",        away:"Morocco",        venue:"New York New Jersey Stadium, East Rutherford",  group:"C",tv:"FOX · Peacock · Telemundo"},
  {id:7,  date:"Jun 13",time:"9PM ET",   home:"Haiti",         away:"Scotland",       venue:"Boston Stadium, Boston",                        group:"C",tv:"FS1 · Peacock · Telemundo"},
  {id:8,  date:"Jun 13",time:"11:59PM ET",home:"Australia",    away:"Turkiye",        venue:"BC Place, Vancouver",                          group:"D",tv:"FS1 · Peacock · Telemundo"},
  {id:9,  date:"Jun 14",time:"1PM ET",   home:"Germany",       away:"Curacao",        venue:"Houston Stadium, Houston",                     group:"E",tv:"FS1 · Peacock · Telemundo"},
  {id:10, date:"Jun 14",time:"4PM ET",   home:"Netherlands",   away:"Japan",          venue:"Dallas Stadium, Dallas",                       group:"F",tv:"FS1 · Peacock · Telemundo"},
  {id:11, date:"Jun 14",time:"7PM ET",   home:"Ivory Coast",   away:"Ecuador",        venue:"Philadelphia Stadium, Philadelphia",            group:"E",tv:"FS1 · Peacock · Telemundo"},
  {id:12, date:"Jun 14",time:"10PM ET",  home:"Sweden",        away:"Tunisia",        venue:"Estadio Monterrey, Guadalupe",                 group:"F",tv:"FS1 · Peacock · Telemundo"},
  {id:13, date:"Jun 15",time:"12PM ET",  home:"Spain",         away:"Cape Verde",     venue:"Atlanta Stadium, Atlanta",                     group:"H",tv:"FOX · Peacock · Telemundo"},
  {id:14, date:"Jun 15",time:"3PM ET",   home:"Belgium",       away:"Egypt",          venue:"BC Place, Vancouver",                          group:"G",tv:"FS1 · Peacock · Telemundo"},
  {id:15, date:"Jun 15",time:"6PM ET",   home:"Saudi Arabia",  away:"Uruguay",        venue:"Miami Stadium, Miami",                         group:"H",tv:"FOX · Peacock · Telemundo"},
  {id:16, date:"Jun 15",time:"9PM ET",   home:"Iran",          away:"New Zealand",    venue:"SoFi Stadium, Los Angeles",                    group:"G",tv:"FS1 · Peacock · Telemundo"},
  {id:17, date:"Jun 16",time:"3PM ET",   home:"France",        away:"Senegal",        venue:"New York New Jersey Stadium, East Rutherford",  group:"I",tv:"FOX · Peacock · Telemundo"},
  {id:18, date:"Jun 16",time:"6PM ET",   home:"Iraq",          away:"Norway",         venue:"Boston Stadium, Boston",                        group:"I",tv:"FS1 · Peacock · Telemundo"},
  {id:19, date:"Jun 16",time:"9PM ET",   home:"Argentina",     away:"Algeria",        venue:"Kansas City Stadium, Kansas City",              group:"J",tv:"FOX · Peacock · Telemundo"},
  {id:20, date:"Jun 16",time:"11:59PM ET",home:"Austria",      away:"Jordan",         venue:"San Francisco Bay Area Stadium, San Francisco", group:"J",tv:"FS1 · Peacock · Telemundo"},
  {id:21, date:"Jun 17",time:"1PM ET",   home:"Portugal",      away:"DR Congo",       venue:"Houston Stadium, Houston",                     group:"K",tv:"FS1 · Peacock · Telemundo"},
  {id:22, date:"Jun 17",time:"4PM ET",   home:"England",       away:"Croatia",        venue:"Dallas Stadium, Dallas",                       group:"L",tv:"FOX · Peacock · Telemundo"},
  {id:23, date:"Jun 17",time:"7PM ET",   home:"Ghana",         away:"Panama",         venue:"Toronto Stadium, Toronto",                     group:"L",tv:"FS1 · Peacock · Telemundo"},
  {id:24, date:"Jun 17",time:"10PM ET",  home:"Uzbekistan",    away:"Colombia",       venue:"Mexico City Stadium, Mexico City",              group:"K",tv:"FS1 · Peacock · Telemundo"},
  {id:25, date:"Jun 18",time:"12PM ET",  home:"Czechia",       away:"South Africa",   venue:"Atlanta Stadium, Atlanta",                     group:"A",tv:"FS1 · Peacock · Telemundo"},
  {id:26, date:"Jun 18",time:"3PM ET",   home:"Switzerland",   away:"Bosnia & Herz.", venue:"SoFi Stadium, Los Angeles",                    group:"B",tv:"FS1 · Peacock · Telemundo"},
  {id:27, date:"Jun 18",time:"6PM ET",   home:"Canada",        away:"Qatar",          venue:"BC Place, Vancouver",                          group:"B",tv:"FS1 · Peacock · Telemundo"},
  {id:28, date:"Jun 18",time:"9PM ET",   home:"Mexico",        away:"South Korea",    venue:"Estadio Guadalajara, Zapopan",                  group:"A",tv:"FS1 · Peacock · Telemundo"},
  {id:29, date:"Jun 19",time:"3PM ET",   home:"United States", away:"Australia",      venue:"Seattle Stadium, Seattle",                     group:"D",tv:"FOX · Peacock · Telemundo"},
  {id:30, date:"Jun 19",time:"6PM ET",   home:"Scotland",      away:"Morocco",        venue:"Boston Stadium, Boston",                        group:"C",tv:"FS1 · Peacock · Telemundo"},
  {id:31, date:"Jun 19",time:"8:30PM ET",home:"Brazil",        away:"Haiti",          venue:"Philadelphia Stadium, Philadelphia",            group:"C",tv:"FS1 · Peacock · Telemundo"},
  {id:32, date:"Jun 19",time:"11PM ET",  home:"Turkiye",       away:"Paraguay",       venue:"San Francisco Bay Area Stadium, San Francisco", group:"D",tv:"FS1 · Peacock · Telemundo"},
  {id:33, date:"Jun 20",time:"1PM ET",   home:"Netherlands",   away:"Sweden",         venue:"Houston Stadium, Houston",                     group:"F",tv:"FOX · Peacock · Telemundo"},
  {id:34, date:"Jun 20",time:"4PM ET",   home:"Germany",       away:"Ivory Coast",    venue:"Toronto Stadium, Toronto",                     group:"E",tv:"FS1 · Peacock · Telemundo"},
  {id:35, date:"Jun 20",time:"8PM ET",   home:"Ecuador",       away:"Curacao",        venue:"Kansas City Stadium, Kansas City",              group:"E",tv:"FS1 · Peacock · Telemundo"},
  {id:36, date:"Jun 20",time:"11:59PM ET",home:"Tunisia",      away:"Japan",          venue:"Estadio Monterrey, Guadalupe",                 group:"F",tv:"FS1 · Peacock · Telemundo"},
  {id:37, date:"Jun 21",time:"12PM ET",  home:"Spain",         away:"Saudi Arabia",   venue:"Atlanta Stadium, Atlanta",                     group:"H",tv:"FOX · Peacock · Telemundo"},
  {id:38, date:"Jun 21",time:"3PM ET",   home:"Belgium",       away:"Iran",           venue:"SoFi Stadium, Los Angeles",                    group:"G",tv:"FS1 · Peacock · Telemundo"},
  {id:39, date:"Jun 21",time:"6PM ET",   home:"Uruguay",       away:"Cape Verde",     venue:"Miami Stadium, Miami",                         group:"H",tv:"FS1 · Peacock · Telemundo"},
  {id:40, date:"Jun 21",time:"9PM ET",   home:"New Zealand",   away:"Egypt",          venue:"BC Place, Vancouver",                          group:"G",tv:"FS1 · Peacock · Telemundo"},
  {id:41, date:"Jun 22",time:"1PM ET",   home:"Argentina",     away:"Austria",        venue:"Dallas Stadium, Dallas",                       group:"J",tv:"FOX · Peacock · Telemundo"},
  {id:42, date:"Jun 22",time:"5PM ET",   home:"France",        away:"Iraq",           venue:"Philadelphia Stadium, Philadelphia",            group:"I",tv:"FS1 · Peacock · Telemundo"},
  {id:43, date:"Jun 22",time:"8PM ET",   home:"Norway",        away:"Senegal",        venue:"New York New Jersey Stadium, East Rutherford",  group:"I",tv:"FOX · Peacock · Telemundo"},
  {id:44, date:"Jun 22",time:"11PM ET",  home:"Jordan",        away:"Algeria",        venue:"San Francisco Bay Area Stadium, San Francisco", group:"J",tv:"FS1 · Peacock · Telemundo"},
  {id:45, date:"Jun 23",time:"1PM ET",   home:"Portugal",      away:"Uzbekistan",     venue:"Houston Stadium, Houston",                     group:"K",tv:"FS1 · Peacock · Telemundo"},
  {id:46, date:"Jun 23",time:"4PM ET",   home:"England",       away:"Ghana",          venue:"Boston Stadium, Boston",                        group:"L",tv:"FS1 · Peacock · Telemundo"},
  {id:47, date:"Jun 23",time:"7PM ET",   home:"Panama",        away:"Croatia",        venue:"Toronto Stadium, Toronto",                     group:"L",tv:"FOX · Peacock · Telemundo"},
  {id:48, date:"Jun 23",time:"10PM ET",  home:"Colombia",      away:"DR Congo",       venue:"Estadio Guadalajara, Zapopan",                  group:"K",tv:"FS1 · Peacock · Telemundo"},
  {id:49, date:"Jun 24",time:"3PM ET",   home:"Switzerland",   away:"Canada",         venue:"BC Place, Vancouver",                          group:"B",tv:"FS1 · Peacock · Telemundo"},
  {id:50, date:"Jun 24",time:"3PM ET",   home:"Bosnia & Herz.",away:"Qatar",          venue:"Seattle Stadium, Seattle",                     group:"B",tv:"FS1 · Peacock · Telemundo"},
  {id:51, date:"Jun 24",time:"6PM ET",   home:"Scotland",      away:"Brazil",         venue:"Miami Stadium, Miami",                         group:"C",tv:"FOX · Peacock · Telemundo"},
  {id:52, date:"Jun 24",time:"6PM ET",   home:"Morocco",       away:"Haiti",          venue:"Atlanta Stadium, Atlanta",                     group:"C",tv:"FS1 · Peacock · Telemundo"},
  {id:53, date:"Jun 24",time:"9PM ET",   home:"Czechia",       away:"Mexico",         venue:"Mexico City Stadium, Mexico City",              group:"A",tv:"FS1 · Peacock · Telemundo"},
  {id:54, date:"Jun 24",time:"9PM ET",   home:"South Africa",  away:"South Korea",    venue:"Estadio Monterrey, Guadalupe",                 group:"A",tv:"FS1 · Peacock · Telemundo"},
  {id:55, date:"Jun 25",time:"4PM ET",   home:"Curacao",       away:"Ivory Coast",    venue:"Philadelphia Stadium, Philadelphia",            group:"E",tv:"FS1 · Peacock · Telemundo"},
  {id:56, date:"Jun 25",time:"4PM ET",   home:"Ecuador",       away:"Germany",        venue:"New York New Jersey Stadium, East Rutherford",  group:"E",tv:"FOX · Peacock · Telemundo"},
  {id:57, date:"Jun 25",time:"7PM ET",   home:"Japan",         away:"Sweden",         venue:"Dallas Stadium, Dallas",                       group:"F",tv:"FS1 · Peacock · Telemundo"},
  {id:58, date:"Jun 25",time:"7PM ET",   home:"Tunisia",       away:"Netherlands",    venue:"Kansas City Stadium, Kansas City",              group:"F",tv:"FS1 · Peacock · Telemundo"},
  {id:59, date:"Jun 25",time:"10PM ET",  home:"Turkiye",       away:"United States",  venue:"SoFi Stadium, Los Angeles",                    group:"D",tv:"FS1 · Peacock · Telemundo"},
  {id:60, date:"Jun 25",time:"10PM ET",  home:"Paraguay",      away:"Australia",      venue:"San Francisco Bay Area Stadium, San Francisco", group:"D",tv:"FS1 · Peacock · Telemundo"},
  {id:61, date:"Jun 26",time:"3PM ET",   home:"Norway",        away:"France",         venue:"Boston Stadium, Boston",                        group:"I",tv:"FS1 · Peacock · Telemundo"},
  {id:62, date:"Jun 26",time:"3PM ET",   home:"Senegal",       away:"Iraq",           venue:"Toronto Stadium, Toronto",                     group:"I",tv:"FS1 · Peacock · Telemundo"},
  {id:63, date:"Jun 26",time:"8PM ET",   home:"Cape Verde",    away:"Saudi Arabia",   venue:"Houston Stadium, Houston",                     group:"H",tv:"FS1 · Peacock · Telemundo"},
  {id:64, date:"Jun 26",time:"8PM ET",   home:"Uruguay",       away:"Spain",          venue:"Estadio Guadalajara, Zapopan",                  group:"H",tv:"FOX · Peacock · Telemundo"},
  {id:65, date:"Jun 26",time:"11PM ET",  home:"Egypt",         away:"Iran",           venue:"Seattle Stadium, Seattle",                     group:"G",tv:"FS1 · Peacock · Telemundo"},
  {id:66, date:"Jun 26",time:"11PM ET",  home:"New Zealand",   away:"Belgium",        venue:"BC Place, Vancouver",                          group:"G",tv:"FS1 · Peacock · Telemundo"},
  {id:67, date:"Jun 27",time:"5PM ET",   home:"Panama",        away:"England",        venue:"New York New Jersey Stadium, East Rutherford",  group:"L",tv:"FOX · Peacock · Telemundo"},
  {id:68, date:"Jun 27",time:"5PM ET",   home:"Croatia",       away:"Ghana",          venue:"Philadelphia Stadium, Philadelphia",            group:"L",tv:"FS1 · Peacock · Telemundo"},
  {id:69, date:"Jun 27",time:"7:30PM ET",home:"Colombia",      away:"Portugal",       venue:"Miami Stadium, Miami",                         group:"K",tv:"FOX · Peacock · Telemundo"},
  {id:70, date:"Jun 27",time:"7:30PM ET",home:"DR Congo",      away:"Uzbekistan",     venue:"Atlanta Stadium, Atlanta",                     group:"K",tv:"FS1 · Peacock · Telemundo"},
  {id:71, date:"Jun 27",time:"10PM ET",  home:"Algeria",       away:"Austria",        venue:"Kansas City Stadium, Kansas City",              group:"J",tv:"FS1 · Peacock · Telemundo"},
  {id:72, date:"Jun 27",time:"10PM ET",  home:"Jordan",        away:"Argentina",      venue:"Dallas Stadium, Dallas",                       group:"J",tv:"FOX · Peacock · Telemundo"},
  {id:73, date:"Jun 28",time:"3PM ET",   home:"2A",  away:"2B",venue:"SoFi Stadium, Los Angeles",             group:"",stage:"Round of 32",tv:"FS1"},
  {id:74, date:"Jun 29",time:"1PM ET",   home:"1C",  away:"2F",venue:"Houston Stadium, Houston",              group:"",stage:"Round of 32",tv:"FS1"},
  {id:75, date:"Jun 29",time:"4:30PM ET",home:"1E",  away:"3rd ABCDF",venue:"Boston Stadium, Boston",                group:"",stage:"Round of 32",tv:"FS1"},
  {id:76, date:"Jun 29",time:"9PM ET",   home:"1F",  away:"2C",venue:"Estadio Monterrey, Guadalupe",          group:"",stage:"Round of 32",tv:"FS1"},
  {id:77, date:"Jun 30",time:"1PM ET",   home:"2E",  away:"2I",venue:"Dallas Stadium, Dallas",                group:"",stage:"Round of 32",tv:"FS1"},
  {id:78, date:"Jun 30",time:"5PM ET",   home:"1I",  away:"3rd CDFGH",venue:"New York New Jersey Stadium, East Rutherford",group:"",stage:"Round of 32",tv:"FS1"},
  {id:79, date:"Jun 30",time:"9PM ET",   home:"1A",  away:"3rd CEFHI",venue:"Mexico City Stadium, Mexico City",      group:"",stage:"Round of 32",tv:"FS1"},
  {id:80, date:"Jul 1", time:"12PM ET",  home:"1J",  away:"2H",venue:"Atlanta Stadium, Atlanta",              group:"",stage:"Round of 32",tv:"FS1"},
  {id:81, date:"Jul 1", time:"4PM ET",   home:"1G",  away:"3rd AEHIJ",venue:"Seattle Stadium, Seattle",              group:"",stage:"Round of 32",tv:"FS1"},
  {id:82, date:"Jul 1", time:"8PM ET",   home:"1D", away:"3rd BEFIJ",venue:"San Francisco Bay Area Stadium, San Francisco",group:"",stage:"Round of 32",tv:"FS1"},
  {id:83, date:"Jul 2", time:"3PM ET",   home:"1H", away:"2J",venue:"SoFi Stadium, Los Angeles",             group:"",stage:"Round of 32",tv:"FS1"},
  {id:84, date:"Jul 2", time:"7PM ET",   home:"2K", away:"2L",venue:"Toronto Stadium, Toronto",              group:"",stage:"Round of 32",tv:"FS1"},
  {id:85, date:"Jul 2", time:"11PM ET",  home:"1B", away:"3rd EFGIJ",venue:"BC Place, Vancouver",                   group:"",stage:"Round of 32",tv:"FS1"},
  {id:86, date:"Jul 3", time:"2PM ET",   home:"2D", away:"2G",venue:"Dallas Stadium, Dallas",                group:"",stage:"Round of 32",tv:"FS1"},
  {id:87, date:"Jul 3", time:"6PM ET",   home:"1L", away:"3rd EHIJK",venue:"Miami Stadium, Miami",                  group:"",stage:"Round of 32",tv:"FS1"},
  {id:88, date:"Jul 3", time:"9:30PM ET",home:"1K", away:"3rd DEIJL",venue:"Kansas City Stadium, Kansas City",      group:"",stage:"Round of 32",tv:"FS1"},
  {id:89, date:"Jul 4", time:"1PM ET",   home:"R16 M1",  away:"TBD",venue:"Houston Stadium, Houston",              group:"",stage:"Round of 16",tv:"FOX"},
  {id:90, date:"Jul 4", time:"5PM ET",   home:"R16 M2",  away:"TBD",venue:"Philadelphia Stadium, Philadelphia",    group:"",stage:"Round of 16",tv:"FOX"},
  {id:91, date:"Jul 5", time:"4PM ET",   home:"R16 M3",  away:"TBD",venue:"New York New Jersey Stadium, East Rutherford",group:"",stage:"Round of 16",tv:"FOX"},
  {id:92, date:"Jul 5", time:"8PM ET",   home:"R16 M4",  away:"TBD",venue:"Mexico City Stadium, Mexico City",      group:"",stage:"Round of 16",tv:"FOX"},
  {id:93, date:"Jul 6", time:"3PM ET",   home:"R16 M5",  away:"TBD",venue:"Dallas Stadium, Dallas",                group:"",stage:"Round of 16",tv:"FOX"},
  {id:94, date:"Jul 6", time:"8PM ET",   home:"R16 M6",  away:"TBD",venue:"Seattle Stadium, Seattle",              group:"",stage:"Round of 16",tv:"FOX"},
  {id:95, date:"Jul 7", time:"12PM ET",  home:"R16 M7",  away:"TBD",venue:"Atlanta Stadium, Atlanta",              group:"",stage:"Round of 16",tv:"FOX"},
  {id:96, date:"Jul 7", time:"4PM ET",   home:"R16 M8",  away:"TBD",venue:"BC Place, Vancouver",                   group:"",stage:"Round of 16",tv:"FOX"},
  {id:97, date:"Jul 9", time:"4PM ET",   home:"QF M1",   away:"TBD",venue:"Boston Stadium, Boston",                group:"",stage:"Quarter-final",tv:"FOX"},
  {id:98, date:"Jul 10",time:"3PM ET",   home:"QF M2",   away:"TBD",venue:"SoFi Stadium, Los Angeles",             group:"",stage:"Quarter-final",tv:"FOX"},
  {id:99, date:"Jul 11",time:"5PM ET",   home:"QF M3",   away:"TBD",venue:"Miami Stadium, Miami",                  group:"",stage:"Quarter-final",tv:"FOX"},
  {id:100,date:"Jul 11",time:"9PM ET",   home:"QF M4",   away:"TBD",venue:"Kansas City Stadium, Kansas City",      group:"",stage:"Quarter-final",tv:"FOX"},
  {id:101,date:"Jul 14",time:"3PM ET",   home:"SF M1",   away:"TBD",venue:"Dallas Stadium, Dallas",                group:"",stage:"Semi-final",tv:"FOX"},
  {id:102,date:"Jul 15",time:"3PM ET",   home:"SF M2",   away:"TBD",venue:"Atlanta Stadium, Atlanta",              group:"",stage:"Semi-final",tv:"FOX"},
  {id:103,date:"Jul 18",time:"5PM ET",   home:"3rd Place",away:"TBD",venue:"Miami Stadium, Miami",                  group:"",stage:"3rd Place",tv:"FOX"},
  {id:104,date:"Jul 19",time:"3PM ET",   home:"🏆 Final", away:"TBD",venue:"New York New Jersey Stadium, East Rutherford",group:"",stage:"Final",tv:"FOX"},
];

// ── TEAM DATA ─────────────────────────────────────────────────────────────
const TEAMS = {
  "Argentina":{flag:"🇦🇷",conf:"CONMEBOL",rank:1,ss:8.1,titles:3,coach:"Lionel Scaloni",base:"Kansas City, MO",form:["W","W","D","W","W"],stats:{ATT:8.4,MID:7.9,DEF:7.8,FIT:8.0},players:[{name:"Lionel Messi",pos:"FW",club:"Inter Miami",caps:191,goals:109,ss:9.2,note:"GOAT · 2022 WC Golden Ball"},{name:"Lautaro Martínez",pos:"FW",club:"Inter Milan",caps:65,goals:32,ss:8.3,note:"Lethal striker"},{name:"Enzo Fernández",pos:"MF",club:"Chelsea",caps:38,goals:6,ss:8.0,note:"Box-to-box dynamo"},{name:"E. Martínez",pos:"GK",club:"Aston Villa",caps:43,goals:0,ss:8.1,note:"2022 World Cup Golden Glove"}],note:"Defending champions. Messi hunting a historic second title alongside a new generation."},
  "France":{flag:"🇫🇷",conf:"UEFA",rank:3,ss:8.3,titles:2,coach:"Didier Deschamps",base:"TBC",form:["L","W","W","D","W"],stats:{ATT:9.0,MID:8.1,DEF:8.2,FIT:8.5},players:[{name:"Kylian Mbappe",pos:"FW",club:"Real Madrid",caps:87,goals:51,ss:9.4,note:"Golden Boot favourite"},{name:"Antoine Griezmann",pos:"FW",club:"Atletico Madrid",caps:137,goals:46,ss:8.2,note:"2018 Golden Ball"},{name:"A. Tchouameni",pos:"MF",club:"Real Madrid",caps:47,goals:6,ss:7.9,note:"World-class DM"},{name:"Mike Maignan",pos:"GK",club:"AC Milan",caps:28,goals:0,ss:8.3,note:"Elite keeper"}],note:"Most talented squad on paper. Mbappe is the standout Golden Boot favourite."},
  "Brazil":{flag:"🇧🇷",conf:"CONMEBOL",rank:6,ss:8.0,titles:5,coach:"Carlo Ancelotti",base:"Morristown, NJ",form:["W","W","L","W","W"],stats:{ATT:8.8,MID:7.8,DEF:7.6,FIT:8.1},players:[{name:"Vinicius Jr.",pos:"FW",club:"Real Madrid",caps:39,goals:14,ss:9.1,note:"Ballon d'Or contender"},{name:"Neymar Jr.",pos:"FW",club:"Santos FC",caps:128,goals:79,ss:8.3,note:"Legend returns at Santos"},{name:"Raphinha",pos:"FW",club:"Barcelona",caps:55,goals:22,ss:8.2,note:"Barcelona star"},{name:"Bruno Guimaraes",pos:"MF",club:"Newcastle",caps:44,goals:7,ss:8.0,note:"Midfield dynamo"}],note:"Neymar's stunning return adds a new dimension. Ancelotti builds around Vinicius and Raphinha."},
  "England":{flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",conf:"UEFA",rank:4,ss:8.1,titles:1,coach:"Thomas Tuchel",base:"Kansas City, MO",form:["L","D","W","W","W"],stats:{ATT:8.5,MID:8.6,DEF:8.0,FIT:8.2},players:[{name:"Jude Bellingham",pos:"MF",club:"Real Madrid",caps:52,goals:17,ss:9.0,note:"World-class midfielder"},{name:"Harry Kane",pos:"FW",club:"Bayern Munich",caps:98,goals:68,ss:8.7,note:"All-time England top scorer"},{name:"Phil Foden",pos:"MF",club:"Man City",caps:46,goals:13,ss:8.3,note:"PL Player of Year"},{name:"Jordan Pickford",pos:"GK",club:"Everton",caps:64,goals:0,ss:7.8,note:"Shootout specialist"}],note:"Tuchel's England hunting their first title since 1966. Bellingham + Kane is a devastating partnership."},
  "Spain":{flag:"🇪🇸",conf:"UEFA",rank:1,ss:8.5,titles:1,coach:"Luis de la Fuente",base:"Chattanooga, TN",form:["D","D","D","W","W"],stats:{ATT:8.7,MID:9.1,DEF:8.3,FIT:8.4},players:[{name:"Pedri",pos:"MF",club:"Barcelona",caps:42,goals:7,ss:8.9,note:"Generational talent"},{name:"Lamine Yamal",pos:"FW",club:"Barcelona",caps:28,goals:12,ss:9.1,note:"Euro 2024 star"},{name:"Rodri",pos:"MF",club:"Man City",caps:61,goals:9,ss:8.8,note:"2024 Ballon d'Or"},{name:"Dani Carvajal",pos:"DF",club:"Real Madrid",caps:76,goals:4,ss:7.9,note:"Euro 2024 winner"}],note:"Ranked #1 globally, back-to-back Euro champions. The most attractive football on earth."},
  "Germany":{flag:"🇩🇪",conf:"UEFA",rank:12,ss:7.8,titles:4,coach:"Julian Nagelsmann",base:"TBC",form:["W","L","W","W","W"],stats:{ATT:8.3,MID:8.5,DEF:7.9,FIT:8.3},players:[{name:"Jamal Musiala",pos:"MF",club:"Bayern Munich",caps:42,goals:15,ss:8.9,note:"Silky dribbler"},{name:"Florian Wirtz",pos:"MF",club:"Bayer Leverkusen",caps:35,goals:12,ss:8.8,note:"Bundesliga's best"},{name:"Kai Havertz",pos:"FW",club:"Arsenal",caps:68,goals:23,ss:7.8,note:"Big-game scorer"},{name:"Manuel Neuer",pos:"GK",club:"Bayern Munich",caps:124,goals:1,ss:7.5,note:"Final WC"}],note:"Musiala + Wirtz is the most exciting young midfield pair in Europe. Genuine dark horse."},
  "Portugal":{flag:"🇵🇹",conf:"UEFA",rank:7,ss:7.9,titles:0,coach:"Roberto Martínez",base:"TBC",form:["W","D","W","W","D"],stats:{ATT:8.4,MID:7.8,DEF:7.7,FIT:7.9},players:[{name:"Cristiano Ronaldo",pos:"FW",club:"Al Nassr",caps:217,goals:135,ss:8.0,note:"All-time international top scorer"},{name:"Bruno Fernandes",pos:"MF",club:"Man United",caps:84,goals:25,ss:8.3,note:"Captain"},{name:"Rafael Leao",pos:"FW",club:"AC Milan",caps:38,goals:11,ss:8.1,note:"Electric winger"},{name:"Ruben Dias",pos:"DF",club:"Man City",caps:67,goals:5,ss:8.4,note:"Elite CB"}],note:"Ronaldo's last World Cup at 41. Will CR7 finally win the one trophy that has eluded him?"},
  "Netherlands":{flag:"🇳🇱",conf:"UEFA",rank:8,ss:7.8,titles:0,coach:"Ronald Koeman",base:"TBC",form:["L","D","W","W","W"],stats:{ATT:7.9,MID:7.6,DEF:8.5,FIT:8.0},players:[{name:"Virgil van Dijk",pos:"DF",club:"Liverpool",caps:75,goals:9,ss:8.7,note:"World's best CB"},{name:"Cody Gakpo",pos:"FW",club:"Liverpool",caps:40,goals:18,ss:8.1,note:"2022 World Cup breakout star"},{name:"Xavi Simons",pos:"MF",club:"PSG",caps:29,goals:8,ss:8.0,note:"Rising star"},{name:"Memphis Depay",pos:"FW",club:"Atletico Madrid",caps:103,goals:45,ss:7.6,note:"Experienced"}],note:"Three-time finalist, never won. Van Dijk leads a balanced squad."},
  "Belgium":{flag:"🇧🇪",conf:"UEFA",rank:3,ss:7.7,titles:0,coach:"Rudi Garcia",base:"TBC",form:["W","W","D","W","D"],stats:{ATT:8.1,MID:7.8,DEF:7.7,FIT:7.8},players:[{name:"Kevin De Bruyne",pos:"MF",club:"Napoli",caps:102,goals:27,ss:8.9,note:"World's best midfielder"},{name:"Romelu Lukaku",pos:"FW",club:"Napoli",caps:110,goals:73,ss:8.1,note:"Belgium all-time top scorer"},{name:"Jeremy Doku",pos:"FW",club:"Man City",caps:34,goals:7,ss:8.1,note:"Explosive winger"},{name:"Thibaut Courtois",pos:"GK",club:"Real Madrid",caps:101,goals:0,ss:8.8,note:"World's best GK"}],note:"De Bruyne now at Napoli alongside Lukaku — last chance for this golden generation."},
  "Norway":{flag:"🇳🇴",conf:"UEFA",rank:31,ss:7.1,titles:0,coach:"Stale Solbakken",base:"TBC",form:["W","L","W","W","W"],stats:{ATT:7.6,MID:7.0,DEF:7.0,FIT:8.0},players:[{name:"Erling Haaland",pos:"FW",club:"Man City",caps:38,goals:32,ss:9.3,note:"Most prolific striker on Earth"},{name:"Martin Odegaard",pos:"MF",club:"Arsenal",caps:71,goals:24,ss:8.7,note:"Arsenal captain"},{name:"Alexander Sorloth",pos:"FW",club:"Atletico Madrid",caps:52,goals:25,ss:7.8,note:"Physical striker"},{name:"Ørjan Nyland",pos:"GK",club:"Inter Milan",caps:48,goals:0,ss:7.2,note:"Serie A winner"}],note:"Haaland + Odegaard: potentially the most devastating partnership in the tournament. Dark horse."},
  "Mexico":{flag:"🇲🇽",conf:"CONCACAF",rank:15,ss:7.2,titles:0,coach:"Javier Aguirre",base:"Mexico City",form:["W","D","D","D","W"],stats:{ATT:7.2,MID:7.4,DEF:7.5,FIT:7.8},players:[{name:"Hirving Lozano",pos:"FW",club:"PSV",caps:101,goals:31,ss:7.8,note:"Pacey winger"},{name:"Raul Jimenez",pos:"FW",club:"Fulham",caps:93,goals:36,ss:7.5,note:"Target man"},{name:"Edson Alvarez",pos:"MF",club:"Fenerbahce",caps:86,goals:9,ss:7.7,note:"Dominant DM"},{name:"Guillermo Ochoa",pos:"GK",club:"AEL Limassol",caps:148,goals:0,ss:7.9,note:"6th World Cup"}],note:"Host nation opening at the iconic Estadio Azteca. Home crowd advantage is massive."},
  "United States":{flag:"🇺🇸",conf:"CONCACAF",rank:11,ss:7.4,titles:0,coach:"Mauricio Pochettino",base:"New Jersey",form:["W","L","L","W","W"],stats:{ATT:7.6,MID:7.5,DEF:7.4,FIT:8.4},players:[{name:"Christian Pulisic",pos:"FW",club:"AC Milan",caps:72,goals:27,ss:7.9,note:"Captain"},{name:"Gio Reyna",pos:"MF",club:"Dortmund",caps:32,goals:8,ss:7.7,note:"Gifted playmaker"},{name:"Weston McKennie",pos:"MF",club:"Juventus",caps:61,goals:13,ss:7.5,note:"Box-to-box"},{name:"Matt Turner",pos:"GK",club:"Crystal Palace",caps:43,goals:0,ss:7.2,note:"Reliable"}],note:"Host nation transformed by Pochettino. Massive home crowd advantage."},
  "Morocco":{flag:"🇲🇦",conf:"CAF",rank:14,ss:7.3,titles:0,coach:"Walid Regragui",base:"Basking Ridge, NJ",form:["W","W","D","W","L"],stats:{ATT:7.1,MID:7.4,DEF:7.9,FIT:8.1},players:[{name:"Achraf Hakimi",pos:"DF",club:"PSG",caps:82,goals:14,ss:8.5,note:"World's best RB"},{name:"Hakim Ziyech",pos:"MF",club:"Galatasaray",caps:60,goals:22,ss:7.5,note:"Creative"},{name:"Y. En-Nesyri",pos:"FW",club:"Fenerbahce",caps:49,goals:26,ss:7.6,note:"Striker"},{name:"Yassine Bounou",pos:"GK",club:"Al Hilal",caps:48,goals:0,ss:8.2,note:"World-class"}],note:"2022 semi-finalists. Hakimi is world-class. Hard to break down."},
  "Uruguay":{flag:"🇺🇾",conf:"CONMEBOL",rank:9,ss:7.4,titles:2,coach:"Marcelo Bielsa",base:"Playa del Carmen",form:["D","D","W","W","L"],stats:{ATT:7.4,MID:7.3,DEF:7.8,FIT:7.9},players:[{name:"Darwin Nunez",pos:"FW",club:"Liverpool",caps:43,goals:22,ss:7.9,note:"Powerful striker"},{name:"Federico Valverde",pos:"MF",club:"Real Madrid",caps:56,goals:13,ss:8.5,note:"World-class engine"},{name:"R. Bentancur",pos:"MF",club:"Tottenham",caps:59,goals:8,ss:7.6,note:"Technical"},{name:"Sergio Rochet",pos:"GK",club:"Nacional",caps:28,goals:0,ss:7.1,note:"Keeper"}],note:"Valverde and Nunez make Uruguay dangerous. Always battle hard."},
  "Croatia":{flag:"🇭🇷",conf:"UEFA",rank:10,ss:7.5,titles:0,coach:"Zlatko Dalic",base:"TBC",form:["L","L","L","W","D"],stats:{ATT:7.3,MID:8.1,DEF:7.6,FIT:7.7},players:[{name:"Luka Modric",pos:"MF",club:"Real Madrid",caps:173,goals:24,ss:8.4,note:"2018 Golden Ball · final WC"},{name:"Mateo Kovacic",pos:"MF",club:"Man City",caps:100,goals:5,ss:8.0,note:"PL champion"},{name:"Ivan Perisic",pos:"FW",club:"Hajduk Split",caps:130,goals:33,ss:7.2,note:"Veteran"},{name:"D. Livakovic",pos:"GK",club:"Fenerbahce",caps:50,goals:0,ss:7.8,note:"2022 shootout hero"}],note:"Modric at 40 — his final World Cup. Croatia always over-perform."},
  "Japan":{flag:"🇯🇵",conf:"AFC",rank:20,ss:7.4,titles:0,coach:"Hajime Moriyasu",base:"Nashville, TN",form:["W","W","W","D","W"],stats:{ATT:7.4,MID:7.5,DEF:7.2,FIT:8.3},players:[{name:"Takefusa Kubo",pos:"MF",club:"Real Sociedad",caps:41,goals:10,ss:8.0,note:"Japan's golden boy"},{name:"Ritsu Doan",pos:"MF",club:"Freiburg",caps:55,goals:17,ss:7.7,note:"Bundesliga star"},{name:"Daichi Kamada",pos:"MF",club:"Lazio",caps:47,goals:14,ss:7.5,note:"Technical"},{name:"Daniel Schmidt",pos:"GK",club:"Sint-Truiden",caps:20,goals:0,ss:7.1,note:"Keeper"}],note:"Beat Germany and Spain at 2022. The most improved AFC team."},
  "Senegal":{flag:"🇸🇳",conf:"CAF",rank:17,ss:7.3,titles:0,coach:"Aliou Cisse",base:"TBC",form:["L","W","D","W","D"],stats:{ATT:7.4,MID:7.2,DEF:7.3,FIT:8.3},players:[{name:"Sadio Mane",pos:"FW",club:"Al Nassr",caps:99,goals:39,ss:8.0,note:"Africa's greatest"},{name:"Idrissa Gueye",pos:"MF",club:"Everton",caps:98,goals:4,ss:7.2,note:"Veteran"},{name:"Ismila Sarr",pos:"FW",club:"Marseille",caps:51,goals:16,ss:7.7,note:"Explosive winger"},{name:"E. Mendy",pos:"GK",club:"Al Ahli",caps:42,goals:0,ss:7.8,note:"Former Chelsea"}],note:"2021 AFCON champions. Mane still world class."},
  "Egypt":{flag:"🇪🇬",conf:"CAF",rank:35,ss:6.8,titles:0,coach:"Hossam El-Badry",base:"TBC",form:["D","W","D","W","L"],stats:{ATT:7.2,MID:6.8,DEF:6.9,FIT:7.4},players:[{name:"Mohamed Salah",pos:"FW",club:"Liverpool",caps:98,goals:58,ss:9.0,note:"World's best"},{name:"Omar Marmoush",pos:"FW",club:"Man City",caps:26,goals:10,ss:7.8,note:"Man City star"},{name:"Tarek Hamed",pos:"MF",club:"Sharjah",caps:66,goals:2,ss:6.5,note:"Veteran DM"},{name:"M. El Shenawy",pos:"GK",club:"Al Ahly",caps:55,goals:0,ss:7.2,note:"Keeper"}],note:"Salah and Marmoush is a devastating partnership."},
  "Colombia":{flag:"🇨🇴",conf:"CONMEBOL",rank:10,ss:7.3,titles:0,coach:"Néstor Lorenzo",base:"Guadalajara, Mexico",form:["W","W","W","D","D"],stats:{ATT:7.6,MID:7.4,DEF:7.1,FIT:7.8},players:[{name:"James Rodriguez",pos:"MF",club:"Rayo Vallecano",caps:101,goals:35,ss:7.5,note:"2014 Golden Boot"},{name:"Luis Diaz",pos:"FW",club:"Liverpool",caps:59,goals:21,ss:8.3,note:"Electric winger"},{name:"Richard Rios",pos:"MF",club:"Palmeiras",caps:28,goals:4,ss:7.6,note:"Energetic"},{name:"Camilo Vargas",pos:"GK",club:"Atlas",caps:41,goals:0,ss:7.1,note:"Keeper"}],note:"2024 Copa America runners-up. Luis Diaz is Premier League class."},
  "South Korea":{flag:"🇰🇷",conf:"AFC",rank:23,ss:7.0,titles:0,coach:"Hong Myung-bo",base:"Guadalajara, Mexico",form:["W","W","D","L","W"],stats:{ATT:7.0,MID:7.2,DEF:6.9,FIT:8.0},players:[{name:"Son Heung-min",pos:"FW",club:"Tottenham",caps:126,goals:50,ss:8.3,note:"Captain"},{name:"Kim Min-jae",pos:"DF",club:"Bayern Munich",caps:61,goals:5,ss:8.0,note:"Elite CB"},{name:"Lee Jae-sung",pos:"MF",club:"Mainz",caps:77,goals:14,ss:7.1,note:"Midfielder"},{name:"Jo Hyeon-woo",pos:"GK",club:"Ulsan HD",caps:40,goals:0,ss:7.0,note:"Keeper"}],note:"Son carries enormous expectations. Kim Min-jae is world-class."},
  "Canada":{flag:"🇨🇦",conf:"CONCACAF",rank:47,ss:6.8,titles:0,coach:"Jesse Marsch",base:"Vancouver, BC",form:["W","D","W","L","W"],stats:{ATT:6.9,MID:6.8,DEF:6.7,FIT:8.2},players:[{name:"Alphonso Davies",pos:"DF",club:"Bayern Munich",caps:63,goals:13,ss:8.4,note:"World-class LB"},{name:"Jonathan David",pos:"FW",club:"Lille",caps:50,goals:30,ss:8.0,note:"Lethal finisher"},{name:"Tajon Buchanan",pos:"MF",club:"Inter Milan",caps:42,goals:8,ss:7.4,note:"Winger"},{name:"M. Crepeau",pos:"GK",club:"LA Galaxy",caps:34,goals:0,ss:7.0,note:"Keeper"}],note:"Host nation with genuine talent. Davies and David are top European players."},
  "Switzerland":{flag:"🇨🇭",conf:"UEFA",rank:19,ss:7.1,titles:0,coach:"Murat Yakin",base:"San Diego, CA",form:["W","L","W","D","W"],stats:{ATT:7.0,MID:7.3,DEF:7.4,FIT:7.5},players:[{name:"Granit Xhaka",pos:"MF",club:"Bayer Leverkusen",caps:127,goals:17,ss:7.8,note:"Captain"},{name:"Breel Embolo",pos:"FW",club:"Monaco",caps:66,goals:17,ss:7.5,note:"Physical FW"},{name:"Xherdan Shaqiri",pos:"MF",club:"Chicago Fire",caps:116,goals:32,ss:7.2,note:"Experienced"},{name:"Yann Sommer",pos:"GK",club:"Inter Milan",caps:95,goals:0,ss:8.0,note:"Elite keeper"}],note:"Always reliable. Switzerland punch above their weight every tournament."},
  "Austria":{flag:"🇦🇹",conf:"UEFA",rank:25,ss:6.9,titles:0,coach:"Ralf Rangnick",base:"TBC",form:["W","W","W","D","W"],stats:{ATT:7.0,MID:7.2,DEF:7.0,FIT:7.9},players:[{name:"David Alaba",pos:"DF",club:"Real Madrid",caps:101,goals:16,ss:8.0,note:"Captain"},{name:"C. Baumgartner",pos:"MF",club:"RB Leipzig",caps:42,goals:12,ss:7.7,note:"Creative"},{name:"Marcel Sabitzer",pos:"MF",club:"Dortmund",caps:72,goals:18,ss:7.5,note:"Box-to-box"},{name:"Patrick Pentz",pos:"GK",club:"Brondby",caps:18,goals:0,ss:7.3,note:"Keeper"}],note:"Rangnick's high press has transformed Austria. Euro 2024 quarter-finalists."},
  "Sweden":{flag:"🇸🇪",conf:"UEFA",rank:28,ss:7.0,titles:0,coach:"Graham Potter",base:"Frisco, TX",form:["D","W","W","D","W"],stats:{ATT:7.1,MID:7.0,DEF:7.2,FIT:7.8},players:[{name:"Alexander Isak",pos:"FW",club:"Newcastle",caps:37,goals:20,ss:8.2,note:"Elite PL striker"},{name:"Dejan Kulusevski",pos:"MF",club:"Tottenham",caps:44,goals:12,ss:8.0,note:"Creative"},{name:"Victor Lindelof",pos:"DF",club:"Man United",caps:80,goals:5,ss:7.2,note:"CB"},{name:"Robin Olsen",pos:"GK",club:"Aston Villa",caps:56,goals:0,ss:7.2,note:"Keeper"}],note:"Isak and Kulusevski give Sweden serious quality. Graham Potter's first tournament."},
  "Iran":{flag:"🇮🇷",conf:"AFC",rank:21,ss:6.9,titles:0,coach:"Cheragh Ghalenoei",base:"Tijuana, Mexico",form:["W","D","W","D","W"],stats:{ATT:6.7,MID:7.0,DEF:7.3,FIT:7.7},players:[{name:"Mehdi Taremi",pos:"FW",club:"Inter Milan",caps:89,goals:44,ss:7.8,note:"Inter striker"},{name:"Sardar Azmoun",pos:"FW",club:"Roma",caps:72,goals:43,ss:7.6,note:"Technical"},{name:"A. Jahanbakhsh",pos:"MF",club:"Feyenoord",caps:80,goals:20,ss:7.2,note:"Winger"},{name:"A. Beiranvand",pos:"GK",club:"Antwerp",caps:55,goals:0,ss:7.5,note:"Keeper"}],note:"Taremi at Inter gives them a top European striker."},
  "Algeria":{flag:"🇩🇿",conf:"CAF",rank:32,ss:6.7,titles:0,coach:"Vladimir Petkovic",base:"TBC",form:["W","D","W","L","W"],stats:{ATT:6.8,MID:6.9,DEF:6.7,FIT:7.5},players:[{name:"Riyad Mahrez",pos:"FW",club:"Al Ahli",caps:99,goals:30,ss:7.6,note:"Algeria's greatest"},{name:"Ismael Bennacer",pos:"MF",club:"AC Milan",caps:50,goals:3,ss:7.8,note:"Serie A star"},{name:"Youcef Atal",pos:"DF",club:"Nottingham Forest",caps:34,goals:7,ss:7.3,note:"RB"},{name:"Rais M'Bolhi",pos:"GK",club:"Al-Qadsia",caps:87,goals:0,ss:6.8,note:"Veteran"}],note:"Mahrez and Bennacer give real quality. Drawn against Argentina in Group J."},
  "Ecuador":{flag:"🇪🇨",conf:"CONMEBOL",rank:44,ss:6.6,titles:0,coach:"Sebastián Beccacece",base:"Columbus, OH",form:["D","W","W","L","W"],stats:{ATT:6.7,MID:6.5,DEF:6.6,FIT:7.7},players:[{name:"Moises Caicedo",pos:"MF",club:"Chelsea",caps:44,goals:5,ss:8.1,note:"World-class DM"},{name:"Enner Valencia",pos:"FW",club:"Internacional",caps:87,goals:40,ss:7.0,note:"All-time scorer"},{name:"Jeremy Sarmiento",pos:"MF",club:"Brighton",caps:25,goals:4,ss:7.2,note:"Winger"},{name:"A. Dominguez",pos:"GK",club:"LDU Quito",caps:75,goals:0,ss:6.8,note:"Keeper"}],note:"Caicedo is genuinely world-class. Could cause trouble for Germany in Group E."},
  "Paraguay":{flag:"🇵🇾",conf:"CONMEBOL",rank:53,ss:6.4,titles:0,coach:"Gustavo Alfaro",base:"TBC",form:["D","W","L","D","W"],stats:{ATT:6.2,MID:6.4,DEF:6.7,FIT:7.4},players:[{name:"Miguel Almiron",pos:"MF",club:"Atletico Madrid",caps:67,goals:13,ss:7.6,note:"Tireless"},{name:"Julio Enciso",pos:"FW",club:"Brighton",caps:24,goals:6,ss:7.4,note:"Explosive talent"},{name:"Omar Alderete",pos:"DF",club:"Getafe",caps:35,goals:2,ss:6.7,note:"Defender"},{name:"Antony Silva",pos:"GK",club:"Libertad",caps:84,goals:0,ss:6.8,note:"Veteran"}],note:"Almiron and Enciso give Paraguay options."},
  "Scotland":{flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",conf:"UEFA",rank:39,ss:6.6,titles:0,coach:"Steve Clarke",base:"TBC",form:["L","D","W","W","D"],stats:{ATT:6.5,MID:6.8,DEF:6.7,FIT:7.5},players:[{name:"Andy Robertson",pos:"DF",club:"Liverpool",caps:82,goals:5,ss:8.0,note:"World-class LB"},{name:"Scott McTominay",pos:"MF",club:"Napoli",caps:57,goals:16,ss:7.8,note:"Goals machine"},{name:"Che Adams",pos:"FW",club:"Torino",caps:33,goals:12,ss:7.1,note:"FW"},{name:"Angus Gunn",pos:"GK",club:"Norwich",caps:18,goals:0,ss:6.9,note:"Keeper"}],note:"McTominay fired Scotland to qualification. Robertson is world-class."},
  "Australia":{flag:"🇦🇺",conf:"AFC",rank:24,ss:6.9,titles:0,coach:"Tony Popovic",base:"TBC",form:["W","D","W","W","L"],stats:{ATT:6.8,MID:7.0,DEF:6.9,FIT:8.0},players:[{name:"Mathew Ryan",pos:"GK",club:"Levante",caps:86,goals:0,ss:7.4,note:"La Liga keeper"},{name:"Ajdin Hrustic",pos:"MF",club:"Heracles Almelo",caps:36,goals:7,ss:7.2,note:"Creative"},{name:"Nestory Irankunda",pos:"FW",club:"Watford",caps:12,goals:3,ss:7.4,note:"Exciting young talent"},{name:"Milos Degenek",pos:"DF",club:"APOEL",caps:58,goals:2,ss:6.8,note:"CB"}],note:"Back-to-back Round of 16 appearances. Australia always compete hard."},
  "Turkiye":{flag:"🇹🇷",conf:"UEFA",rank:29,ss:7.0,titles:0,coach:"Vincenzo Montella",base:"TBC",form:["W","W","D","W","L"],stats:{ATT:7.3,MID:7.1,DEF:6.8,FIT:7.6},players:[{name:"Hakan Calhanoglu",pos:"MF",club:"Inter Milan",caps:89,goals:22,ss:8.2,note:"Serie A champion"},{name:"Arda Guler",pos:"MF",club:"Real Madrid",caps:22,goals:8,ss:8.0,note:"Teen sensation"},{name:"Kerem Akturkoglu",pos:"FW",club:"Galatasaray",caps:38,goals:13,ss:7.7,note:"Winger"},{name:"Altay Bayindir",pos:"GK",club:"Man United",caps:20,goals:0,ss:7.2,note:"GK"}],note:"Arda Guler could be the tournament's revelation. Calhanoglu is world-class."},
  "Ivory Coast":{flag:"🇨🇮",conf:"CAF",rank:48,ss:6.8,titles:0,coach:"Emerse Fae",base:"Philadelphia, PA",form:["W","W","D","W","L"],stats:{ATT:7.0,MID:6.9,DEF:6.6,FIT:7.8},players:[{name:"Sebastien Haller",pos:"FW",club:"Dortmund",caps:44,goals:19,ss:7.5,note:"Inspirational comeback"},{name:"Franck Kessie",pos:"MF",club:"Barcelona",caps:71,goals:12,ss:7.4,note:"Box-to-box"},{name:"Simon Adingra",pos:"FW",club:"Brighton",caps:22,goals:8,ss:7.6,note:"Exciting winger"},{name:"Yahia Fofana",pos:"GK",club:"Chelsea",caps:30,goals:0,ss:7.3,note:"Chelsea GK"}],note:"2023 AFCON champions. Upset France 2-1 in their final warm-up. Full of European talent."},
  "Tunisia":{flag:"🇹🇳",conf:"CAF",rank:30,ss:6.7,titles:0,coach:"Faouzi Benzarti",base:"Monterrey, Mexico",form:["W","D","L","W","D"],stats:{ATT:6.6,MID:6.8,DEF:7.0,FIT:7.5},players:[{name:"Wahbi Khazri",pos:"FW",club:"Montpellier",caps:71,goals:25,ss:7.0,note:"Veteran FW"},{name:"Aissa Laidouni",pos:"MF",club:"Watford",caps:34,goals:3,ss:7.2,note:"Midfielder"},{name:"Youssef Msakni",pos:"MF",club:"Al-Qadsia",caps:99,goals:30,ss:6.8,note:"Technical"},{name:"Aymen Dahmen",pos:"GK",club:"Al Qadsiah",caps:24,goals:0,ss:7.0,note:"Keeper"}],note:"Organized and hard to beat."},
  "Saudi Arabia":{flag:"🇸🇦",conf:"AFC",rank:58,ss:6.3,titles:0,coach:"Herve Renard",base:"Austin, TX",form:["L","D","W","L","W"],stats:{ATT:6.3,MID:6.4,DEF:6.5,FIT:7.3},players:[{name:"Salem Al-Dawsari",pos:"FW",club:"Al Hilal",caps:89,goals:25,ss:7.1,note:"Scored vs Argentina 2022"},{name:"Mohamed Kanno",pos:"MF",club:"Al Hilal",caps:51,goals:7,ss:6.9,note:"Midfielder"},{name:"Ali Al-Bulayhi",pos:"DF",club:"Al Hilal",caps:79,goals:2,ss:6.7,note:"Defender"},{name:"M. Al-Owais",pos:"GK",club:"Al Hilal",caps:64,goals:0,ss:7.2,note:"Best Saudi GK"}],note:"Famous for beating Argentina in 2022. Group H with Spain is very tough."},
  "Ghana":{flag:"🇬🇭",conf:"CAF",rank:60,ss:6.5,titles:0,coach:"Otto Addo",base:"Providence, RI",form:["W","D","L","W","D"],stats:{ATT:6.6,MID:6.5,DEF:6.4,FIT:7.9},players:[{name:"Mohammed Kudus",pos:"MF",club:"West Ham",caps:39,goals:16,ss:8.1,note:"West Ham star"},{name:"Thomas Partey",pos:"MF",club:"Arsenal",caps:55,goals:14,ss:7.8,note:"Arsenal DM"},{name:"Jordan Ayew",pos:"FW",club:"Leicester",caps:99,goals:23,ss:7.1,note:"Veteran"},{name:"L. Ati-Zigi",pos:"GK",club:"Lorient",caps:22,goals:0,ss:7.2,note:"Keeper"}],note:"Kudus and Partey are PL stars."},
  "DR Congo":{flag:"🇨🇩",conf:"CAF",rank:52,ss:6.4,titles:0,coach:"Sébastien Desabre",base:"Houston, TX",form:["W","W","D","L","W"],stats:{ATT:6.5,MID:6.4,DEF:6.3,FIT:7.9},players:[{name:"Cedric Bakambu",pos:"FW",club:"Marseille",caps:72,goals:28,ss:7.2,note:"Top scorer"},{name:"Chancel Mbemba",pos:"DF",club:"Marseille",caps:55,goals:4,ss:7.4,note:"Solid CB"},{name:"Meschak Elia",pos:"FW",club:"Young Boys",caps:22,goals:6,ss:7.1,note:"Winger"},{name:"Joel Kiassumbua",pos:"GK",club:"OH Leuven",caps:45,goals:0,ss:6.8,note:"Keeper"}],note:"Some real European talent. Group K with Portugal is a massive challenge."},
  "Uzbekistan":{flag:"🇺🇿",conf:"AFC",rank:74,ss:6.1,titles:0,coach:"Srecko Katanec",base:"TBC",form:["L","W","D","W","W"],stats:{ATT:5.9,MID:6.2,DEF:6.2,FIT:7.5},players:[{name:"Eldor Shomurodov",pos:"FW",club:"Roma",caps:60,goals:24,ss:7.3,note:"Serie A striker"},{name:"J. Masharipov",pos:"MF",club:"Pakhtakor",caps:62,goals:18,ss:6.8,note:"Creative"},{name:"D. Khamdamov",pos:"MF",club:"AGMK",caps:18,goals:4,ss:6.6,note:"Young talent"},{name:"Utkir Yusupov",pos:"GK",club:"Pakhtakor",caps:39,goals:0,ss:6.7,note:"Keeper"}],note:"First World Cup. Shomurodov at Roma shows they have top-level talent."},
  "Cape Verde":{flag:"🇨🇻",conf:"CAF",rank:61,ss:6.2,titles:0,coach:"Pedro Brito Bubista",base:"TBC",form:["W","D","W","L","W"],stats:{ATT:6.1,MID:6.3,DEF:6.2,FIT:7.6},players:[{name:"Garry Rodrigues",pos:"FW",club:"Moreirense",caps:55,goals:17,ss:6.8,note:"Winger"},{name:"Ryan Mendes",pos:"FW",club:"Angers",caps:58,goals:20,ss:6.7,note:"Top scorer"},{name:"Stopira",pos:"DF",club:"Kaiserslautern",caps:72,goals:3,ss:6.5,note:"Veteran"},{name:"Vozinha",pos:"GK",club:"Al Fayha",caps:42,goals:0,ss:6.9,note:"GK"}],note:"First World Cup appearance. A proud moment for the island nation."},
  "Qatar":{flag:"🇶🇦",conf:"AFC",rank:58,ss:6.0,titles:0,coach:"Julen Lopetegui",base:"Santa Barbara, CA",form:["L","D","W","L","W"],stats:{ATT:5.8,MID:6.1,DEF:6.0,FIT:7.2},players:[{name:"Akram Afif",pos:"FW",club:"Al Sadd",caps:75,goals:34,ss:7.2,note:"Best player"},{name:"Almoez Ali",pos:"FW",club:"Al Duhail",caps:80,goals:42,ss:6.9,note:"Top scorer"},{name:"Hassan Al-Haydos",pos:"MF",club:"Al Sadd",caps:170,goals:38,ss:6.7,note:"Captain"},{name:"M. Barsham",pos:"GK",club:"Al Sadd",caps:35,goals:0,ss:6.8,note:"GK"}],note:"Hosts of 2022, now guests managed by Lopetegui."},
  "Bosnia & Herz.":{flag:"🇧🇦",conf:"UEFA",rank:55,ss:6.5,titles:0,coach:"Sergej Barbarez",base:"Sandy, UT",form:["W","D","L","W","D"],stats:{ATT:6.7,MID:6.4,DEF:6.3,FIT:7.0},players:[{name:"Edin Dzeko",pos:"FW",club:"FC Schalke 04",caps:130,goals:65,ss:7.0,note:"All-time scorer"},{name:"Ermedin Demirovic",pos:"FW",club:"VfB Stuttgart",caps:40,goals:18,ss:7.4,note:"Bundesliga star"},{name:"Sead Kolasinac",pos:"DF",club:"Atalanta",caps:62,goals:3,ss:6.6,note:"LB"},{name:"Nikola Vasilj",pos:"GK",club:"FC St. Pauli",caps:25,goals:0,ss:7.0,note:"Bundesliga GK"}],note:"The Golden Generation era nearing its end. Physical style could cause upsets."},
  "South Africa":{flag:"🇿🇦",conf:"CAF",rank:65,ss:6.1,titles:0,coach:"Hugo Broos",base:"Pachuca, Mexico",form:["D","W","L","D","W"],stats:{ATT:5.8,MID:6.2,DEF:6.4,FIT:7.0},players:[{name:"Percy Tau",pos:"FW",club:"Al Ahly",caps:61,goals:14,ss:7.0,note:"Creative FW"},{name:"Themba Zwane",pos:"MF",club:"Mamelodi Sundowns",caps:44,goals:9,ss:6.7,note:"Technical"},{name:"Bongani Zungu",pos:"MF",club:"Amiens",caps:56,goals:4,ss:6.4,note:"DM"},{name:"Ronwen Williams",pos:"GK",club:"Mamelodi Sundowns",caps:38,goals:0,ss:7.2,note:"Good keeper"}],note:"Back at the World Cup for the first time since hosting in 2010."},
  "Haiti":{flag:"🇭🇹",conf:"CONCACAF",rank:83,ss:5.5,titles:0,coach:"Sébastien Migné",base:"TBC",form:["W","L","D","L","W"],stats:{ATT:5.4,MID:5.6,DEF:5.5,FIT:7.3},players:[{name:"Duckens Nazon",pos:"FW",club:"Pau FC",caps:44,goals:18,ss:6.3,note:"Top scorer"},{name:"Frantzdy Pierrot",pos:"FW",club:"Nashville SC",caps:38,goals:14,ss:6.1,note:"MLS FW"},{name:"Steeven Saba",pos:"MF",club:"Rodez AF",caps:30,goals:5,ss:5.9,note:"Midfielder"},{name:"Josue Duverger",pos:"GK",club:"Violette AC",caps:35,goals:0,ss:6.0,note:"GK"}],note:"Historic return to the World Cup after 52 years."},
  "New Zealand":{flag:"🇳🇿",conf:"OFC",rank:97,ss:5.9,titles:0,coach:"Darren Bazeley",base:"TBC",form:["W","D","L","W","D"],stats:{ATT:5.6,MID:6.0,DEF:6.1,FIT:7.4},players:[{name:"Chris Wood",pos:"FW",club:"Nottingham Forest",caps:90,goals:31,ss:7.2,note:"PL striker"},{name:"Liberato Cacace",pos:"DF",club:"Empoli",caps:29,goals:2,ss:7.1,note:"LB"},{name:"Clayton Lewis",pos:"MF",club:"Al-Qadsiah",caps:39,goals:6,ss:6.8,note:"Midfielder"},{name:"Max Crocombe",pos:"GK",club:"St Mirren",caps:21,goals:0,ss:6.6,note:"GK"}],note:"OFC representatives. Chris Wood is a proven Premier League striker."},
  "Jordan":{flag:"🇯🇴",conf:"AFC",rank:69,ss:6.0,titles:0,coach:"Hussein Ammouta",base:"Portland, OR",form:["D","W","L","D","W"],stats:{ATT:5.8,MID:6.0,DEF:6.2,FIT:7.2},players:[{name:"Yazan Al-Naimat",pos:"FW",club:"Al Wihdat",caps:31,goals:12,ss:6.4,note:"Top scorer"},{name:"Baha Faisal",pos:"MF",club:"Al Faisaly",caps:38,goals:6,ss:6.2,note:"Midfielder"},{name:"Sanad Nasser",pos:"DF",club:"Al Faisaly",caps:44,goals:1,ss:6.3,note:"CB"},{name:"Amer Shafi",pos:"GK",club:"Al Ahli Amman",caps:88,goals:0,ss:6.7,note:"Legend"}],note:"Jordan's first ever World Cup. A historic moment."},
  "Iraq":{flag:"🇮🇶",conf:"AFC",rank:62,ss:6.0,titles:0,coach:"Jesus Casas",base:"TBC",form:["D","W","D","L","W"],stats:{ATT:5.9,MID:6.1,DEF:6.0,FIT:7.1},players:[{name:"Amjed Attwan",pos:"FW",club:"Al Zawraa",caps:38,goals:14,ss:6.4,note:"Top scorer"},{name:"Mohanad Ali",pos:"MF",club:"Al Quwa Al Jawiya",caps:32,goals:8,ss:6.3,note:"Midfielder"},{name:"Ali Adnan",pos:"DF",club:"Al Zawraa",caps:72,goals:6,ss:6.8,note:"LB"},{name:"Jalal Hassan",pos:"GK",club:"Erbil SC",caps:52,goals:0,ss:6.5,note:"GK"}],note:"Held Spain to a 1-1 draw in their final warm-up. Iraq's return to the World Cup after 40 years."},
  "Panama":{flag:"🇵🇦",conf:"CONCACAF",rank:49,ss:6.2,titles:0,coach:"Thomas Christiansen",base:"TBC",form:["D","W","D","W","L"],stats:{ATT:6.0,MID:6.2,DEF:6.5,FIT:7.6},players:[{name:"Ismael Diaz",pos:"FW",club:"Porto",caps:25,goals:9,ss:7.3,note:"Porto FW"},{name:"A. Carrasquilla",pos:"MF",club:"Houston Dynamo",caps:45,goals:8,ss:7.0,note:"Creative"},{name:"R. Blackburn",pos:"FW",club:"Club Tijuana",caps:34,goals:12,ss:6.7,note:"Physical"},{name:"Luis Mejia",pos:"GK",club:"Modena",caps:32,goals:0,ss:7.0,note:"Keeper"}],note:"Will defend resolutely and look for set-piece goals."},
  "Curacao":{flag:"🇨🇼",conf:"CONCACAF",rank:79,ss:5.8,titles:0,coach:"Fred Rutten",base:"TBC",form:["W","L","D","W","L"],stats:{ATT:5.7,MID:5.9,DEF:5.8,FIT:7.1},players:[{name:"Leandro Bacuna",pos:"MF",club:"Cardiff City",caps:61,goals:11,ss:6.8,note:"Most capped"},{name:"Quentin Bericot",pos:"FW",club:"Guingamp",caps:20,goals:7,ss:6.3,note:"FW"},{name:"Eloy Room",pos:"GK",club:"Alaves",caps:47,goals:0,ss:6.9,note:"GK"},{name:"Cuco Martina",pos:"DF",club:"retired",caps:55,goals:2,ss:6.2,note:"Veteran"}],note:"Historic debut at the World Cup. Drawn against Germany."},
  "Czechia":{flag:"🇨🇿",conf:"UEFA",rank:36,ss:6.7,titles:0,coach:"Miroslav Koubek",base:"Mansfield, TX",form:["W","W","D","L","W"],stats:{ATT:6.6,MID:6.8,DEF:6.9,FIT:7.1},players:[{name:"Patrik Schick",pos:"FW",club:"Bayer Leverkusen",caps:53,goals:27,ss:7.6,note:"Clinical"},{name:"Tomas Soucek",pos:"MF",club:"West Ham",caps:79,goals:18,ss:7.3,note:"Box-to-box"},{name:"Vladimir Coufal",pos:"DF",club:"West Ham",caps:44,goals:2,ss:6.8,note:"RB"},{name:"Jiri Stanek",pos:"GK",club:"Atletico Madrid",caps:22,goals:0,ss:7.1,note:"Keeper"}],note:"First World Cup in 20 years. Schick and Soucek are genuine top-level players."},
};

// ── RECENT4 — verified as of Jun 10, 2026 ────────────────────────────────
// Once WC starts (Jun 11), RecentForm component auto-upgrades to live API data.
const RECENT4 = {
  "Argentina":[
    {date:"Jun 6, 2026",   opp:"Honduras",     score:"2-0", loc:"College Station", comp:"Friendly",  res:"W"},
    {date:"Nov 14, 2025", opp:"Angola",      score:"2-0", loc:"Luanda",       comp:"Friendly",     res:"W"},
    {date:"Oct 15, 2025", opp:"Puerto Rico", score:"6-0", loc:"San Juan",     comp:"Friendly",     res:"W"},
  ],
  "France":[
    {date:"Jun 4, 2026",  opp:"Ivory Coast", score:"1-2", loc:"Nantes",       comp:"Friendly",     res:"L"},
    {date:"Mar 29, 2026", opp:"Colombia",    score:"3-1", loc:"Paris",        comp:"Friendly",     res:"W"},
    {date:"Mar 26, 2026", opp:"Brazil",      score:"2-1", loc:"Boston",       comp:"Friendly",     res:"W"},
    {date:"Nov 16, 2025", opp:"Azerbaijan",  score:"3-1", loc:"Baku",         comp:"WC Qualifier", res:"W"},
  ],
  "Brazil":[
    {date:"Jun 6, 2026",  opp:"Egypt",   score:"2-1", loc:"Tampa",          comp:"Friendly", res:"W"},
    {date:"Jun 1, 2026",  opp:"Panama",  score:"6-2", loc:"Rio de Janeiro", comp:"Friendly",     res:"W"},
    {date:"Mar 31, 2026", opp:"Croatia", score:"3-1", loc:"Orlando",        comp:"Friendly",     res:"W"},
    {date:"Mar 26, 2026", opp:"France",  score:"1-2", loc:"Boston",         comp:"Friendly",     res:"L"},
    {date:"Nov 18, 2025", opp:"Uruguay", score:"2-1", loc:"Montevideo",     comp:"WC Qualifier", res:"W"},
  ],
  "England":[
    {date:"Jun 6, 2026",  opp:"New Zealand", score:"1-0", loc:"Tampa",      comp:"Friendly", res:"W"},
    {date:"Mar 31, 2026", opp:"Japan",   score:"0-1", loc:"Wembley", comp:"Friendly",     res:"L"},
    {date:"Mar 27, 2026", opp:"Uruguay", score:"1-1", loc:"Wembley", comp:"Friendly",     res:"D"},
    {date:"Nov 16, 2025", opp:"Albania", score:"2-0", loc:"Tirana",  comp:"WC Qualifier", res:"W"},
    {date:"Nov 13, 2025", opp:"Serbia",  score:"2-0", loc:"Wembley", comp:"WC Qualifier", res:"W"},
  ],
  "Spain":[
    {date:"Jun 4, 2026",  opp:"Iraq",     score:"1-1", loc:"La Coruña", comp:"Friendly",     res:"D"},
    {date:"Mar 31, 2026", opp:"Egypt",    score:"0-0", loc:"Madrid",    comp:"Friendly",     res:"D"},
    {date:"Mar 28, 2026", opp:"Portugal", score:"1-1", loc:"Seville",   comp:"Friendly",     res:"D"},
    {date:"Nov 15, 2025", opp:"Turkiye",  score:"2-2", loc:"Istanbul",  comp:"WC Qualifier", res:"D"},
  ],
  "Germany":[
    {date:"Jun 6, 2026",  opp:"United States", score:"2-1", loc:"Chicago",    comp:"Friendly", res:"W"},
    {date:"May 31, 2026", opp:"Finland",       score:"4-0", loc:"Hamburg",       comp:"Friendly", res:"W"},
    {date:"May 26, 2026", opp:"Ghana",       score:"2-1", loc:"Nuremberg", comp:"Friendly", res:"W"},
    {date:"Mar 28, 2026", opp:"Switzerland", score:"4-3", loc:"Basel",     comp:"Friendly", res:"W"},
    {date:"Mar 31, 2026", opp:"Brazil",      score:"1-3", loc:"Orlando",   comp:"Friendly", res:"L"},
    {date:"Nov 2025",     opp:"Slovakia",    score:"6-0", loc:"Dusseldorf",comp:"WC Qualifier", res:"W"},
  ],
  "Portugal":[
    {date:"Jun 6, 2026",  opp:"Chile",          score:"2-1", loc:"Lisbon",  comp:"Friendly", res:"W"},
    {date:"Mar 31, 2026", opp:"United States", score:"2-0", loc:"Atlanta",     comp:"Friendly",     res:"W"},
    {date:"Mar 28, 2026", opp:"Spain",         score:"1-1", loc:"Seville",     comp:"Friendly",     res:"D"},
    {date:"Mar 28, 2026", opp:"Mexico",        score:"0-0", loc:"Mexico City", comp:"Friendly",     res:"D"},
    {date:"Nov 2025",     opp:"Poland",        score:"5-1", loc:"Lisbon",      comp:"WC Qualifier", res:"W"},
  ],
  "Netherlands":[
    {date:"Jun 3, 2026",  opp:"Algeria",  score:"0-1", loc:"Rotterdam",  comp:"Friendly",     res:"L"},
    {date:"Mar 31, 2026", opp:"Ecuador",  score:"1-1", loc:"Amsterdam",  comp:"Friendly",     res:"D"},
    {date:"Mar 27, 2026", opp:"Norway",   score:"2-1", loc:"Amsterdam",  comp:"Friendly",     res:"W"},
    {date:"Nov 2025",     opp:"Finland",  score:"4-0", loc:"Amsterdam",  comp:"WC Qualifier", res:"W"},
  ],
  "Belgium":[
    {date:"Jun 6, 2026",  opp:"Tunisia",      score:"5-0", loc:"Brussels",   comp:"Friendly", res:"W"},
    {date:"Jun 2, 2026",  opp:"Croatia",        score:"2-0", loc:"Brussels", comp:"Friendly",     res:"W"},
    {date:"Mar 28, 2026", opp:"United States",  score:"5-2", loc:"Atlanta",  comp:"Friendly",     res:"W"},
    {date:"Mar 31, 2026", opp:"Mexico",         score:"1-1", loc:"Chicago",  comp:"Friendly",     res:"D"},
    {date:"Nov 2025",     opp:"Italy",          score:"1-0", loc:"Brussels", comp:"WC Qualifier", res:"W"},
  ],
  "Norway":[
    {date:"Jun 1, 2026",  opp:"Sweden",      score:"3-1", loc:"Oslo",      comp:"Friendly",     res:"W"},
    {date:"Mar 27, 2026", opp:"Netherlands", score:"1-2", loc:"Amsterdam", comp:"Friendly",     res:"L"},
    {date:"Nov 2025",     opp:"Germany",     score:"1-3", loc:"Oslo",      comp:"WC Qualifier", res:"L"},
    {date:"Oct 2025",     opp:"Austria",     score:"2-1", loc:"Oslo",      comp:"WC Qualifier", res:"W"},
  ],
  "Mexico":[
    {date:"Jun 4, 2026",  opp:"Serbia",    score:"5-1", loc:"Toluca",       comp:"Friendly", res:"W"},
    {date:"May 30, 2026", opp:"Australia",  score:"1-0", loc:"Toluca",        comp:"Friendly", res:"W"},
    {date:"May 23, 2026", opp:"Ghana",    score:"2-0", loc:"Toluca",      comp:"Friendly",     res:"W"},
    {date:"Mar 31, 2026", opp:"Belgium",  score:"1-1", loc:"Chicago",     comp:"Friendly",     res:"D"},
    {date:"Mar 28, 2026", opp:"Portugal", score:"0-0", loc:"Mexico City", comp:"Friendly",     res:"D"},
    {date:"Nov 2025",     opp:"Canada",   score:"2-1", loc:"Mexico City", comp:"WC Qualifier", res:"W"},
  ],
  "United States":[
    {date:"Jun 6, 2026",  opp:"Germany",  score:"1-2", loc:"Chicago",    comp:"Friendly", res:"L"},
    {date:"May 31, 2026", opp:"Senegal",  score:"3-2", loc:"Charlotte", comp:"Friendly", res:"W"},
    {date:"Mar 31, 2026", opp:"Portugal", score:"0-2", loc:"Atlanta",   comp:"Friendly", res:"L"},
    {date:"Mar 28, 2026", opp:"Belgium",  score:"2-5", loc:"Atlanta",   comp:"Friendly", res:"L"},
    {date:"Nov 2025",     opp:"Paraguay", score:"2-1", loc:"Kansas City",comp:"Friendly", res:"W"},
  ],
  "Morocco":[
    {date:"Jun 7, 2026",  opp:"Norway",    score:"1-1", loc:"Harrison, NJ", comp:"Friendly", res:"D"},
    {date:"Jun 2, 2026",  opp:"Madagascar",    score:"4-0", loc:"Rabat",         comp:"Friendly", res:"W"},
    {date:"May 26, 2026", opp:"Burundi",  score:"5-0", loc:"Rabat",       comp:"Friendly",     res:"W"},
    {date:"Mar 2026",     opp:"Cameroon", score:"3-0", loc:"Rabat",       comp:"Friendly",     res:"W"},
    {date:"Nov 2025",     opp:"Angola",   score:"1-0", loc:"Casablanca",  comp:"WC Qualifier", res:"W"},
    {date:"Oct 2025",     opp:"Tanzania", score:"3-0", loc:"Casablanca",  comp:"WC Qualifier", res:"W"},
  ],
  "Uruguay":[
    {date:"Mar 31, 2026", opp:"Algeria", score:"0-0", loc:"Montevideo", comp:"Friendly",     res:"D"},
    {date:"Mar 27, 2026", opp:"England", score:"1-1", loc:"Wembley",    comp:"Friendly",     res:"D"},
    {date:"Nov 2025",     opp:"Bolivia", score:"3-0", loc:"Montevideo", comp:"WC Qualifier", res:"W"},
    {date:"Oct 2025",     opp:"Paraguay",score:"1-0", loc:"Asuncion",   comp:"WC Qualifier", res:"W"},
  ],
  "Croatia":[
    {date:"Jun 7, 2026",  opp:"Slovenia",  score:"2-1", loc:"Varazdin",     comp:"Friendly", res:"W"},
    {date:"Jun 2, 2026",  opp:"Belgium",  score:"0-2", loc:"Brussels", comp:"Friendly", res:"L"},
    {date:"Mar 31, 2026", opp:"Brazil",   score:"1-3", loc:"Orlando",  comp:"Friendly", res:"L"},
    {date:"Mar 29, 2026", opp:"Colombia", score:"1-3", loc:"Orlando",  comp:"Friendly", res:"L"},
    {date:"Nov 2025",     opp:"Greece",   score:"2-1", loc:"Split",    comp:"WC Qualifier", res:"W"},
  ],
  "Japan":[
    {date:"May 31, 2026", opp:"Iceland",  score:"1-0", loc:"Tokyo",        comp:"Friendly", res:"W"},
    {date:"Mar 31, 2026", opp:"England",  score:"1-0", loc:"Wembley",  comp:"Friendly",     res:"W"},
    {date:"May 2026",     opp:"Iceland",  score:"1-0", loc:"Tokyo",    comp:"Friendly",     res:"W"},
    {date:"Nov 2025",     opp:"Vietnam",  score:"2-0", loc:"Tokyo",    comp:"WC Qualifier", res:"W"},
    {date:"Oct 2025",     opp:"Bahrain",  score:"3-0", loc:"Tokyo",    comp:"WC Qualifier", res:"W"},
  ],
  "Algeria":[
    {date:"Jun 3, 2026",  opp:"Netherlands", score:"1-0", loc:"Rotterdam",     comp:"Friendly", res:"W"},
    {date:"Mar 31, 2026", opp:"Uruguay",     score:"0-0", loc:"Montevideo",    comp:"Friendly", res:"D"},
    {date:"Mar 27, 2026", opp:"Guatemala",   score:"7-0", loc:"Guatemala City",comp:"Friendly", res:"W"},
    {date:"Jan 6, 2026",  opp:"DR Congo",    score:"1-0", loc:"Algiers",       comp:"Friendly", res:"W"},
  ],
  "Ecuador":[
    {date:"Jun 7, 2026",  opp:"Guatemala", score:"3-0", loc:"Columbus",     comp:"Friendly", res:"W"},
    {date:"May 30, 2026", opp:"Saudi Arabia","score":"2-1", loc:"Harrison, NJ",  comp:"Friendly", res:"W"},
    {date:"Mar 31, 2026", opp:"Netherlands",  score:"1-1", loc:"Amsterdam", comp:"Friendly",     res:"D"},
    {date:"Mar 27, 2026", opp:"Saudi Arabia", score:"2-1", loc:"Quito",     comp:"Friendly",     res:"W"},
    {date:"Nov 2025",     opp:"Bolivia",      score:"1-0", loc:"Quito",     comp:"WC Qualifier", res:"W"},
    {date:"Oct 2025",     opp:"Chile",        score:"2-0", loc:"Santiago",  comp:"WC Qualifier", res:"W"},
  ],
  "Colombia":[
    {date:"Jun 7, 2026",  opp:"Jordan",     score:"2-0", loc:"San Diego",   comp:"Friendly", res:"W"},
    {date:"Jun 2, 2026",  opp:"Costa Rica", score:"3-1", loc:"San José", comp:"Friendly", res:"W"},
    {date:"Mar 29, 2026", opp:"Croatia",    score:"3-1", loc:"Orlando",  comp:"Friendly", res:"W"},
    {date:"Mar 29, 2026", opp:"France",     score:"1-3", loc:"Paris",    comp:"Friendly", res:"L"},
    {date:"Nov 2025",     opp:"Venezuela",  score:"2-0", loc:"Bogota",   comp:"WC Qualifier", res:"W"},
  ],
  "Switzerland":[
    {date:"Jun 6, 2026",  opp:"Australia", score:"1-1", loc:"Geneva",  comp:"Friendly", res:"D"},
    {date:"Mar 28, 2026", opp:"Germany", score:"3-4", loc:"Basel",  comp:"Friendly", res:"L"},
    {date:"Nov 2025",     opp:"Romania", score:"2-0", loc:"Bern",   comp:"WC Qualifier", res:"W"},
    {date:"Oct 2025",     opp:"Kosovo",  score:"2-1", loc:"Bern",   comp:"WC Qualifier", res:"W"},
  ],
  "Canada":[
    {date:"Jun 5, 2026",  opp:"Rep. of Ireland", score:"1-1", loc:"Toronto",  comp:"Friendly", res:"D"},
    {date:"Jun 2, 2026",  opp:"Uzbekistan", score:"2-0", loc:"Vancouver", comp:"Friendly",     res:"W"},
    {date:"Mar 2026",     opp:"Tunisia",    score:"0-0", loc:"Toronto",   comp:"Friendly",     res:"D"},
    {date:"Nov 2025",     opp:"Cuba",       score:"4-0", loc:"Toronto",   comp:"WC Qualifier", res:"W"},
    {date:"Oct 2025",     opp:"Panama",     score:"2-0", loc:"Toronto",   comp:"WC Qualifier", res:"W"},
  ],
  "Senegal":[
    {date:"May 31, 2026", opp:"United States", score:"2-3", loc:"Charlotte",   comp:"Friendly",     res:"L"},
    {date:"Mar 2026",     opp:"Ivory Coast",   score:"0-1", loc:"Abidjan",     comp:"Friendly",     res:"L"},
    {date:"Nov 2025",     opp:"Benin",         score:"2-0", loc:"Dakar",       comp:"WC Qualifier", res:"W"},
    {date:"Oct 2025",     opp:"Rwanda",        score:"3-0", loc:"Dakar",       comp:"WC Qualifier", res:"W"},
  ],
  "Ivory Coast":[
    {date:"Jun 4, 2026",  opp:"France",     score:"2-1", loc:"Nantes",  comp:"Friendly",     res:"W"},
    {date:"Mar 2026",     opp:"Senegal",    score:"1-0", loc:"Abidjan", comp:"Friendly",     res:"W"},
    {date:"Nov 2025",     opp:"Nigeria",    score:"1-1", loc:"Abidjan", comp:"WC Qualifier", res:"D"},
    {date:"Oct 2025",     opp:"Uganda",     score:"3-0", loc:"Abidjan", comp:"WC Qualifier", res:"W"},
  ],
  "South Korea":[
    {date:"May 30, 2026", opp:"Trinidad & Tobago", score:"5-0", loc:"Seoul",       comp:"Friendly", res:"W"},
    {date:"Jun 3, 2026",  opp:"El Salvador",       score:"1-0", loc:"Seoul",       comp:"Friendly", res:"W"},
    {date:"May 2026",     opp:"Trinidad & Tobago", score:"5-0", loc:"Seoul",    comp:"Friendly",     res:"W"},
    {date:"Mar 2026",     opp:"Japan",             score:"1-0", loc:"Tokyo",    comp:"Friendly",     res:"W"},
    {date:"Nov 2025",     opp:"Oman",              score:"2-0", loc:"Seoul",    comp:"WC Qualifier", res:"W"},
    {date:"Oct 2025",     opp:"Kuwait",            score:"3-0", loc:"Seoul",    comp:"WC Qualifier", res:"W"},
  ],
  "Scotland":[
    {date:"Jun 6, 2026",  opp:"Bolivia",  score:"4-0", loc:"Harrison, NJ",  comp:"Friendly", res:"W"},
    {date:"May 30, 2026", opp:"Curacao",   score:"4-1", loc:"Edinburgh",     comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Denmark", score:"1-2", loc:"Glasgow", comp:"Friendly",     res:"L"},
    {date:"Nov 2025",     opp:"Poland",  score:"2-1", loc:"Glasgow", comp:"WC Qualifier", res:"W"},
    {date:"Oct 2025",     opp:"Slovakia",score:"1-0", loc:"Glasgow", comp:"WC Qualifier", res:"W"},
    {date:"Sep 2025",     opp:"Lithuania",score:"3-0",loc:"Glasgow", comp:"WC Qualifier", res:"W"},
  ],
  "Panama":[
    {date:"Jun 6, 2026",  opp:"Bosnia & Herz.", score:"1-1", loc:"St. Louis",      comp:"Friendly", res:"D"},
    {date:"Jun 3, 2026",  opp:"Dominican Rep.", score:"4-2", loc:"Panama City",    comp:"Friendly", res:"W"},
    {date:"May 31, 2026", opp:"Brazil",         score:"2-6", loc:"Miami",          comp:"Friendly", res:"L"},
    {date:"Mar 2026",     opp:"Colombia",       score:"0-3", loc:"Barranquilla",    comp:"WCQ",      res:"L"},
    {date:"Mar 2026",     opp:"Honduras",       score:"1-0", loc:"Panama City",     comp:"WCQ",      res:"W"},
    {date:"Nov 2025",     opp:"Costa Rica",     score:"1-1", loc:"Panama City",     comp:"WCQ",      res:"D"},
  ],
  "Bosnia & Herz.":[
    {date:"Jun 6, 2026",  opp:"Panama",         score:"1-1", loc:"St. Louis",      comp:"Friendly", res:"D"},
    {date:"May 29, 2026", opp:"North Macedonia","score":"0-0", loc:"Sarajevo",      comp:"Friendly", res:"D"},
    {date:"Mar 2026",     opp:"Finland",         score:"2-1", loc:"Sarajevo",       comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Greece",          score:"1-0", loc:"Sarajevo",       comp:"Friendly", res:"W"},
    {date:"Nov 2025",     opp:"Bulgaria",        score:"3-0", loc:"Sarajevo",       comp:"Friendly", res:"W"},
  ],
  "Turkiye":[
    {date:"Jun 6, 2026",  opp:"Venezuela",      score:"2-1", loc:"Fort Lauderdale", comp:"Friendly", res:"W"},
    {date:"Jun 1, 2026",  opp:"North Macedonia", score:"4-0", loc:"Istanbul",      comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Denmark",         score:"0-1", loc:"Copenhagen",     comp:"Friendly", res:"L"},
    {date:"Mar 2026",     opp:"Norway",          score:"2-1", loc:"Istanbul",       comp:"Friendly", res:"W"},
    {date:"Nov 2025",     opp:"Wales",           score:"1-0", loc:"Istanbul",       comp:"Friendly", res:"W"},
  ],
  "Qatar":[
    {date:"Jun 6, 2026",  opp:"El Salvador",    score:"0-0", loc:"Los Angeles",    comp:"Friendly", res:"D"},
    {date:"May 28, 2026", opp:"Rep. of Ireland","score":"0-1", loc:"Dublin",        comp:"Friendly", res:"L"},
    {date:"Mar 2026",     opp:"Bahrain",         score:"1-0", loc:"Doha",           comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Iraq",            score:"2-1", loc:"Doha",           comp:"Friendly", res:"W"},
    {date:"Nov 2025",     opp:"Kuwait",          score:"2-0", loc:"Doha",           comp:"Friendly", res:"W"},
  ],
  "South Africa":[
    {date:"Jun 6, 2026",  opp:"Jamaica",        score:"1-0", loc:"Pachuca",        comp:"Friendly", res:"W"},
    {date:"May 29, 2026", opp:"Nicaragua",   score:"0-0", loc:"Johannesburg",  comp:"Friendly", res:"D"},
    {date:"Mar 2026",     opp:"Namibia",         score:"2-0", loc:"Pretoria",       comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Algeria",         score:"1-0", loc:"Algiers",        comp:"Friendly", res:"W"},
    {date:"Nov 2025",     opp:"Morocco",         score:"0-1", loc:"Rabat",          comp:"Friendly", res:"L"},
  ],
  "Australia":[
    {date:"Jun 6, 2026",  opp:"Switzerland",    score:"1-1", loc:"Geneva",         comp:"Friendly", res:"D"},
    {date:"May 30, 2026", opp:"Mexico",      score:"0-1", loc:"Toluca",        comp:"Friendly", res:"L"},
    {date:"Mar 2026",     opp:"New Zealand",     score:"2-0", loc:"Sydney",         comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"South Korea",     score:"1-0", loc:"Melbourne",      comp:"Friendly", res:"W"},
    {date:"Nov 2025",     opp:"Saudi Arabia",    score:"2-1", loc:"Sydney",         comp:"Friendly", res:"W"},
  ],
  "Paraguay":[
    {date:"Jun 5, 2026",  opp:"Nicaragua",     score:"4-0", loc:"Asuncion",       comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Venezuela",      score:"1-1", loc:"Asuncion",       comp:"Friendly", res:"D"},
    {date:"Mar 2026",     opp:"Chile",          score:"2-0", loc:"Santiago",       comp:"Friendly", res:"W"},
    {date:"Nov 2025",     opp:"Bolivia",        score:"2-1", loc:"Asuncion",       comp:"Friendly", res:"W"},
  ],
  "Saudi Arabia":[
    {date:"Jun 5, 2026",  opp:"Puerto Rico",   score:"3-0", loc:"Austin, TX",     comp:"Friendly", res:"W"},
    {date:"May 30, 2026", opp:"Ecuador",     score:"1-2", loc:"Harrison, NJ",  comp:"Friendly", res:"L"},
    {date:"Mar 2026",     opp:"Uzbekistan",     score:"1-1", loc:"Jeddah",         comp:"Friendly", res:"D"},
    {date:"Mar 2026",     opp:"Iraq",           score:"2-0", loc:"Riyadh",         comp:"Friendly", res:"W"},
    {date:"Nov 2025",     opp:"Jordan",         score:"2-1", loc:"Riyadh",         comp:"Friendly", res:"W"},
  ],
  "Haiti":[
    {date:"Jun 5, 2026",  opp:"Peru",          score:"1-2", loc:"Miami",          comp:"Friendly", res:"L"},
    {date:"Jun 2, 2026",  opp:"New Zealand",   score:"4-0", loc:"Fort Lauderdale", comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Grenada",        score:"3-1", loc:"Port-au-Prince", comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Cuba",           score:"2-0", loc:"Port-au-Prince", comp:"Friendly", res:"W"},
    {date:"Nov 2025",     opp:"Guatemala",      score:"1-1", loc:"Guatemala City", comp:"Friendly", res:"D"},
  ],
  "Peru":[
    {date:"Jun 5, 2026",  opp:"Haiti",         score:"2-1", loc:"Miami",          comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Bolivia",        score:"1-0", loc:"Lima",           comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Chile",          score:"0-0", loc:"Santiago",       comp:"Friendly", res:"D"},
    {date:"Nov 2025",     opp:"Venezuela",      score:"1-1", loc:"Lima",           comp:"Friendly", res:"D"},
  ],
  "Ghana":[
    {date:"Jun 2, 2026",  opp:"Wales",          score:"1-1", loc:"Cardiff",        comp:"Friendly", res:"D"},
    {date:"May 22, 2026", opp:"Mexico",      score:"0-2", loc:"Puebla",        comp:"Friendly", res:"L"},
    {date:"Mar 2026",     opp:"Sudan",           score:"2-0", loc:"Accra",          comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Namibia",         score:"3-1", loc:"Accra",          comp:"Friendly", res:"W"},
    {date:"Nov 2025",     opp:"Kenya",           score:"2-0", loc:"Nairobi",        comp:"Friendly", res:"W"},
  ],
  "Austria":[
    {date:"Jun 1, 2026",  opp:"Tunisia",         score:"1-0", loc:"Vienna",         comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Ghana",           score:"3-0", loc:"Vienna",         comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Sweden",          score:"2-1", loc:"Malmö",          comp:"Friendly", res:"W"},
    {date:"Nov 2025",     opp:"Slovakia",        score:"2-0", loc:"Vienna",         comp:"Friendly", res:"W"},
  ],
  "DR Congo":[
    {date:"Jun 3, 2026",  opp:"Denmark",         score:"0-0", loc:"Liege",          comp:"Friendly", res:"D"},
    {date:"Mar 2026",     opp:"Zambia",          score:"2-1", loc:"Kinshasa",       comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Guinea",          score:"1-0", loc:"Kinshasa",       comp:"Friendly", res:"W"},
    {date:"Nov 2025",     opp:"Cameroon",        score:"0-1", loc:"Kinshasa",       comp:"AFCON Q",  res:"L"},
  ],
  "Cape Verde":[
    {date:"May 31, 2026", opp:"Serbia",          score:"3-0", loc:"Lisbon",         comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Mauritania",      score:"2-0", loc:"Praia",          comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Senegal",         score:"1-1", loc:"Praia",          comp:"Friendly", res:"D"},
    {date:"Nov 2025",     opp:"Guinea-Bissau",   score:"2-0", loc:"Praia",          comp:"Friendly", res:"W"},
  ],
  "Iran":[
    {date:"Jun 4, 2026",  opp:"Mali",            score:"2-0", loc:"Antalya",        comp:"Friendly", res:"W"},
    {date:"May 29, 2026", opp:"Gambia",      score:"0-0", loc:"Antalya",       comp:"Friendly", res:"D"},
    {date:"Mar 2026",     opp:"Iraq",            score:"1-0", loc:"Tehran",         comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Oman",            score:"2-1", loc:"Tehran",         comp:"Friendly", res:"W"},
    {date:"Nov 2025",     opp:"UAE",             score:"0-0", loc:"Tehran",         comp:"Friendly", res:"D"},
  ],
  "Czechia":[
    {date:"Jun 4, 2026",  opp:"Guatemala",       score:"3-1", loc:"Harrison, NJ",   comp:"Friendly", res:"W"},
    {date:"May 31, 2026", opp:"Kosovo",          score:"2-1", loc:"Prague",         comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Slovakia",        score:"2-0", loc:"Bratislava",     comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Austria",         score:"1-2", loc:"Vienna",         comp:"Friendly", res:"L"},
  ],
  "Sweden":[
    {date:"Jun 4, 2026",  opp:"Greece",          score:"2-2", loc:"Stockholm",      comp:"Friendly", res:"D"},
    {date:"Jun 1, 2026",  opp:"Norway",          score:"1-3", loc:"Oslo",           comp:"Friendly", res:"L"},
    {date:"Mar 2026",     opp:"Finland",         score:"2-0", loc:"Stockholm",      comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Denmark",         score:"1-1", loc:"Malmö",          comp:"Friendly", res:"D"},
  ],
  "Iraq":[
    {date:"Jun 4, 2026",  opp:"Spain",           score:"1-1", loc:"La Coruña",      comp:"Friendly", res:"D"},
    {date:"May 29, 2026", opp:"Andorra",          score:"1-0", loc:"Girona",         comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"UAE",              score:"2-0", loc:"Baghdad",        comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Kuwait",           score:"1-0", loc:"Baghdad",        comp:"Friendly", res:"W"},
  ],
  "Egypt":[
    {date:"Jun 6, 2026",  opp:"Brazil",           score:"1-2", loc:"Tampa",          comp:"Friendly", res:"L"},
    {date:"May 28, 2026", opp:"Russia",           score:"1-0", loc:"Cairo",          comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Congo",            score:"2-1", loc:"Cairo",          comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"Zambia",           score:"3-0", loc:"Cairo",          comp:"Friendly", res:"W"},
  ],
  "Nigeria":[
    {date:"May 30, 2026", opp:"Jamaica",          score:"3-0", loc:"London",         comp:"Friendly", res:"W"},
    {date:"May 26, 2026", opp:"Zimbabwe",         score:"2-0", loc:"London",         comp:"Friendly", res:"W"},
    {date:"Jun 3, 2026",  opp:"Poland",           score:"2-2", loc:"Warsaw",         comp:"Friendly", res:"D"},
    {date:"Mar 2026",     opp:"Ivory Coast",      score:"1-1", loc:"London",         comp:"Friendly", res:"D"},
  ],
  "New Zealand":[
    {date:"Jun 6, 2026",  opp:"England",          score:"0-1", loc:"Tampa",          comp:"Friendly", res:"L"},
    {date:"Jun 2, 2026",  opp:"Haiti",            score:"0-4", loc:"Fort Lauderdale", comp:"Friendly", res:"L"},
    {date:"Mar 2026",     opp:"Australia",        score:"1-2", loc:"Auckland",       comp:"Friendly", res:"L"},
    {date:"Mar 2026",     opp:"South Korea",      score:"0-2", loc:"Wellington",     comp:"Friendly", res:"L"},
  ],
  "Curacao":[
    {date:"Jun 7, 2026",  opp:"Aruba",           score:"4-0", loc:"Willemstad",     comp:"Friendly", res:"W"},
    {date:"May 30, 2026", opp:"Scotland",         score:"1-4", loc:"Edinburgh",     comp:"Friendly", res:"L"},
    {date:"Mar 2026",     opp:"Honduras",         score:"2-1", loc:"Willemstad",    comp:"Friendly", res:"W"},
    {date:"Mar 2026",     opp:"El Salvador",      score:"1-1", loc:"Willemstad",    comp:"Friendly", res:"D"},
  ],
  "Jordan":[
    {date:"May 31, 2026", opp:"Switzerland",     score:"1-4", loc:"St. Gallen",     comp:"Friendly", res:"L"},
    {date:"Mar 2026",     opp:"Iraq",             score:"1-2", loc:"Amman",          comp:"Friendly", res:"L"},
    {date:"Mar 2026",     opp:"Bahrain",          score:"2-1", loc:"Amman",          comp:"Friendly", res:"W"},
    {date:"Nov 2025",     opp:"Palestine",        score:"2-0", loc:"Amman",          comp:"Friendly", res:"W"},
  ]
};

const PREDS = [
  {team:"France",poly:16.0,odds:"+525",trend:"📉"},{team:"Spain",poly:16.0,odds:"+525",trend:"➡️"},
  {team:"England",poly:11.0,odds:"+809",trend:"📉"},{team:"Brazil",poly:9.0,odds:"+1010",trend:"➡️"},
  {team:"Argentina",poly:8.0,odds:"+1150",trend:"➡️"},{team:"Germany",poly:7.0,odds:"+1325",trend:"📈"},
  {team:"Portugal",poly:5.0,odds:"+1900",trend:"➡️"},{team:"Netherlands",poly:4.5,odds:"+2120",trend:"📉"},
  {team:"Belgium",poly:3.0,odds:"+3230",trend:"📉"},{team:"United States",poly:2.5,odds:"+3900",trend:"📈"},
  {team:"Mexico",poly:2.1,odds:"+4650",trend:"➡️"},{team:"Norway",poly:1.0,odds:"+9000",trend:"📈"},
  {team:"Others",poly:15.0,odds:"—",trend:""},
];

// ── SIMULATOR ENGINE ──────────────────────────────────────────────────────
const STR = {Spain:87,France:86,England:83,Brazil:82,Argentina:81,Germany:79,Portugal:77,Netherlands:76,Belgium:73,Uruguay:71,Colombia:70,Mexico:69,Morocco:68,"United States":67,Croatia:66,Japan:65,Senegal:64,Switzerland:63,Sweden:62,"South Korea":61,Ecuador:60,Norway:59,Australia:57,Austria:56,Czechia:55,"Bosnia & Herz.":54,"Ivory Coast":53,Paraguay:52,Ghana:51,Algeria:50,Iran:48,"DR Congo":46,Uzbekistan:41,"New Zealand":40,Jordan:39,Iraq:38,Panama:38,Curacao:37,Haiti:36,"South Africa":43,"Cape Verde":42,Qatar:44,Tunisia:50,Turkiye:60,Egypt:66,Scotland:58,"Saudi Arabia":49};
const gs = (t) => STR[t] || 48;
const HOME_VENUES = {"United States":["SoFi Stadium, Los Angeles","New York New Jersey Stadium, East Rutherford","Dallas Stadium, Dallas","San Francisco Bay Area Stadium, San Francisco","Seattle Stadium, Seattle","Kansas City Stadium, Kansas City","Philadelphia Stadium, Philadelphia","Boston Stadium, Boston","Atlanta Stadium, Atlanta","Miami Stadium, Miami","Houston Stadium, Houston"],"Canada":["Toronto Stadium, Toronto","BC Place, Vancouver"],"Mexico":["Mexico City Stadium, Mexico City","Estadio Guadalajara, Zapopan","Estadio Monterrey, Guadalupe"]};
const FORM_DATA = {"Spain":["D","D","D","W","W"],"France":["L","W","W","D","W"],"England":["L","D","W","W","W"],"Brazil":["W","W","L","W","W"],"Argentina":["W","W","D","W","W"],"Germany":["W","L","W","W","W"],"Portugal":["W","D","W","W","D"],"Netherlands":["L","D","W","W","W"],"Belgium":["W","W","D","W","D"],"Norway":["W","L","W","W","W"],"Mexico":["W","D","D","D","W"],"United States":["W","L","L","W","W"],"Morocco":["W","W","D","W","L"],"Uruguay":["D","D","W","W","L"],"Croatia":["L","L","L","W","D"],"Japan":["W","W","W","D","W"],"Senegal":["L","W","D","W","D"],"Colombia":["W","W","W","D","D"],"Switzerland":["W","L","W","D","W"],"Austria":["W","W","W","D","W"],"Sweden":["D","W","W","D","W"],"South Korea":["W","W","D","L","W"],"Egypt":["D","W","D","W","L"],"Ecuador":["D","W","W","L","W"],"Turkiye":["W","W","D","W","L"],"Ivory Coast":["W","W","D","W","L"],"Iran":["W","D","W","D","W"],"Algeria":["W","D","W","L","W"],"Ghana":["W","D","L","W","D"],"Paraguay":["D","W","L","D","W"],"Scotland":["L","D","W","W","D"],"Australia":["W","D","W","W","L"],"Czechia":["W","W","D","L","W"],"Tunisia":["W","D","L","W","D"],"Saudi Arabia":["D","W","L","W","D"],"Canada":["W","D","W","L","W"],"Bosnia & Herz.":["W","D","L","W","D"],"DR Congo":["W","W","D","L","W"],"Uzbekistan":["L","W","D","W","W"],"Cape Verde":["W","D","W","L","W"],"South Africa":["D","W","L","D","W"],"Qatar":["L","D","W","L","W"],"Haiti":["W","L","D","L","W"],"New Zealand":["W","D","L","W","D"],"Jordan":["D","W","L","D","W"],"Iraq":["D","W","D","L","W"],"Panama":["D","W","D","W","L"],"Curacao":["W","L","D","W","L"]};
const formScore = (team) => { const form = FORM_DATA[team] || ["D","D","D","D","D"]; const pts = form.slice(-5).reduce((s,r) => s+(r==="W"?1:r==="D"?0.5:0), 0); return 0.9+(pts/5)*0.2; };
const poisson = (lambda) => { const L = Math.exp(-lambda); let k=0, p=1; do { k++; p*=Math.random(); } while(p>L); return k-1; };
const xG = (rating) => 0.6 + ((rating-37)/(87-37))*1.5;
const simMatch = (home, away, venue="") => {
  const hr=gs(home), ar=gs(away);
  const boost = Object.entries(HOME_VENUES).some(([n,v])=>n===home&&v.includes(venue)) ? 5 : 0;
  const hxg = xG(hr+boost)*formScore(home), axg = xG(ar)*formScore(away);
  const avg = (hxg+axg)/2;
  const hF = Math.max(0.3, avg+(hxg-avg)*0.85), aF = Math.max(0.3, avg+(axg-avg)*0.85);
  const hg = poisson(hF), ag = poisson(aF);
  return { hg, ag, res: hg>ag?"home":hg<ag?"away":"draw" };
};
const simKO = (t1, t2) => { const r=simMatch(t1||"TBD",t2||"TBD"); if(r.res==="draw") return Math.random()<gs(t1||"TBD")/(gs(t1||"TBD")+gs(t2||"TBD"))?t1:t2; return r.res==="home"?t1:t2; };
const calcStandings = (letter, results) => {
  const teams = GROUPS[letter].teams;
  const tbl = Object.fromEntries(teams.map(t=>[t,{team:t,p:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,pts:0}]));
  results.forEach(r => { if(r.hg===""||r.ag==="")return; const hg=parseInt(r.hg),ag=parseInt(r.ag); if(isNaN(hg)||isNaN(ag))return; tbl[r.home].p++;tbl[r.away].p++;tbl[r.home].gf+=hg;tbl[r.home].ga+=ag;tbl[r.home].gd+=hg-ag;tbl[r.away].gf+=ag;tbl[r.away].ga+=hg;tbl[r.away].gd+=ag-hg; if(hg>ag){tbl[r.home].w++;tbl[r.home].pts+=3;tbl[r.away].l++;}else if(hg===ag){tbl[r.home].d++;tbl[r.home].pts++;tbl[r.away].d++;tbl[r.away].pts++;}else{tbl[r.away].w++;tbl[r.away].pts+=3;tbl[r.home].l++;} });
  return [...teams].sort((a,b)=>tbl[b].pts-tbl[a].pts||tbl[b].gd-tbl[a].gd||tbl[b].gf-tbl[a].gf).map((t,i)=>({...tbl[t],pos:i+1}));
};
const runFullSim = () => {
  const gr={};
  Object.entries(GROUPS).forEach(([g,grp])=>{ const t=grp.teams,pts={},gd={},gf={}; t.forEach(x=>{pts[x]=0;gd[x]=0;gf[x]=0;}); [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]].forEach(([i,j])=>{ const r=simMatch(t[i],t[j]); gf[t[i]]+=r.hg;gf[t[j]]+=r.ag;gd[t[i]]+=r.hg-r.ag;gd[t[j]]+=r.ag-r.hg; if(r.res==="home")pts[t[i]]+=3;else if(r.res==="draw"){pts[t[i]]++;pts[t[j]]++;}else pts[t[j]]+=3; }); gr[g]=[...t].sort((a,b)=>pts[b]-pts[a]||gd[b]-gd[a]||gf[b]-gf[a]).map(x=>({team:x,pts:pts[x],gd:gd[x]})); });
  let r32=[...Object.values(gr).flatMap(s=>[s[0].team,s[1].team])]; r32=[...r32,...Object.values(gr).map(s=>s[2]).sort((a,b)=>b.pts-a.pts||b.gd-a.gd).slice(0,8).map(x=>x.team)];
  const ko=(arr)=>{const n=[];for(let i=0;i<arr.length;i+=2)n.push(simKO(arr[i],arr[i+1]));return n;};
  const r16=ko(r32),qf=ko(r16),sf=ko(qf),champ=simKO(sf[0],sf[1]);
  return {gr,r32,r16,qf,sf,champion:champ,runnerUp:sf.find(x=>x!==champ)};
};

// ── LIVE SCORES CONTEXT ───────────────────────────────────────────────────
const LiveScoresCtx = createContext({scores:{},getScore:()=>null,isLive:()=>false,isFinished:()=>false,lastFetch:null});

const statusIsLive = (s) => ["1H","HT","2H","ET","BT","P","LIVE","inprogress","first_half","halftime","second_half","extra_time","penalties"].includes(s);
const statusIsFinished = (s) => ["FT","AET","PEN","finished","ended","after_extra_time","after_penalties"].includes(s);
const statusLabel = (s,e) => {
  if(!s||s==="NS"||s==="notstarted") return null;
  if(s==="1H"||s==="first_half"||s==="inprogress"||s==="LIVE") return e?`${e}'`:"LIVE";
  if(s==="HT"||s==="halftime") return "HT";
  if(s==="2H"||s==="second_half") return e?`${e}'`:"LIVE";
  if(s==="ET"||s==="extra_time") return e?`ET ${e}'`:"ET";
  if(s==="BT") return "BT";
  if(s==="P"||s==="penalties") return "Pens";
  if(s==="FT"||s==="finished"||s==="ended") return "FT";
  if(s==="AET"||s==="after_extra_time") return "AET";
  if(s==="PEN"||s==="after_penalties") return "Pens";
  return s;
};

const API_NAME_MAP = {
  "USA":"United States","United States of America":"United States",
  "Turkey":"Turkiye","Türkiye":"Turkiye",
  "Czech Republic":"Czechia",
  "Bosnia":"Bosnia & Herz.","Bosnia and Herzegovina":"Bosnia & Herz.","Bosnia & Herzegovina":"Bosnia & Herz.",
  "Côte d'Ivoire":"Ivory Coast","Cote d'Ivoire":"Ivory Coast",
  "DR Congo":"DR Congo","Congo DR":"DR Congo","Democratic Republic of Congo":"DR Congo","Congo (DRC)":"DR Congo",
  "Korea Republic":"South Korea","Republic of Korea":"South Korea",
  "IR Iran":"Iran","Islamic Republic of Iran":"Iran",
  "Curaçao":"Curacao","Cabo Verde":"Cape Verde",
  "Bosnia-Herzegovina":"Bosnia & Herz.","Bosnia and Herz.":"Bosnia & Herz.",
  "New Zealand":"New Zealand","Aotearoa New Zealand":"New Zealand",
  "Congo (DR)":"DR Congo","RD Congo":"DR Congo","DRC":"DR Congo","Congo, DR":"DR Congo",
  "Trinidad & Tobago":"Trinidad & Tobago","Trinidad and Tobago":"Trinidad & Tobago",
  "Curacao":"Curacao",
};
const normTeam = (n) => API_NAME_MAP[n] || n;

function LiveScoresProvider({ children }) {
  const [scores, setScores] = useState({});
  const [allFixtures, setAllFixtures] = useState([]);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/livescores");
      if(!res.ok) throw new Error(`/api/livescores returned ${res.status}`);
      const data = await res.json();
      // Handle both { response: [...] } and raw array (backward compat)
      const all = Array.isArray(data) ? data : (data?.response || []);
      setAllFixtures(all);
      const map = {};
      all.forEach(f => {
        const h = normTeam(f?.teams?.home?.name || "");
        const a = normTeam(f?.teams?.away?.name || "");
        const status = f?.fixture?.status?.short || "NS";
        const elapsed = f?.fixture?.status?.elapsed || null;
        const hg = f?.goals?.home ?? null;
        const ag = f?.goals?.away ?? null;
        if(h && a) map[`${h}|${a}`] = { hg, ag, status, elapsed };
      });
      setScores(map);
      setLastFetch(new Date());
    } catch(e) {
      console.error("LiveScores fetch error:", e.message);
    }
  }, []);

  useEffect(() => { fetchAll(); const t=setInterval(fetchAll,60000); return()=>clearInterval(t); }, [fetchAll]);
  const getScore = (h,a) => scores[`${h}|${a}`]||null;
  const isLive = (h,a) => { const s=getScore(h,a); return s?statusIsLive(s.status):false; };
  const isFinished = (h,a) => { const s=getScore(h,a); return s?statusIsFinished(s.status):false; };
  return <LiveScoresCtx.Provider value={{scores,allFixtures,getScore,isLive,isFinished,lastFetch,refresh:fetchAll}}>{children}</LiveScoresCtx.Provider>;
}

// ── BROADCAST DATA BY COUNTRY ─────────────────────────────────────────────
// Maps country code → broadcaster info
// "fox" matches = FOX/FS1, "bbc" = BBC/ITV, etc.
// Each entry: { primary, streaming, note }
const BROADCAST = {
  // North America
  US: { primary:"FOX · FS1 · Telemundo",   streaming:"Peacock · Tubi (free) · fuboTV", note:"🇺🇸" },
  CA: { primary:"CTV · TSN · RDS",          streaming:"CTV.ca (free) · TSN+",           note:"🇨🇦" },
  MX: { primary:"Televisa · TV Azteca",     streaming:"ViX (free) · Claro Sports",      note:"🇲🇽" },
  GB: { primary:"ITV · BBC",               streaming:"ITVX (free) · BBC iPlayer",       note:"🇬🇧" },
  DE: { primary:"ARD · ZDF",               streaming:"ARD Mediathek (free)",            note:"🇩🇪" },
  FR: { primary:"TF1 · beIN Sports",       streaming:"TF1+ (free) · Canal+",            note:"🇫🇷" },
  ES: { primary:"RTVE · Mediaset",         streaming:"RTVE Play (free)",               note:"🇪🇸" },
  IT: { primary:"RAI · Sky Sport",         streaming:"RAI Play (free)",                note:"🇮🇹" },
  PT: { primary:"RTP · Sport TV",          streaming:"RTP Play (free)",                note:"🇵🇹" },
  NL: { primary:"NOS",                    streaming:"NOS.nl (free)",                   note:"🇳🇱" },
  BE: { primary:"RTBF · VRT",             streaming:"RTBF Auvio (free)",               note:"🇧🇪" },
  NO: { primary:"TV 2",                  streaming:"TV 2 Play",                        note:"🇳🇴" },
  AR: { primary:"TyC Sports · Telefe",    streaming:"TyC Sports Play",                 note:"🇦🇷" },
  BR: { primary:"Globo · SBT · SporTV",   streaming:"Cazé TV (YouTube, free) · Globoplay", note:"🇧🇷" },
  CO: { primary:"Caracol · RCN",          streaming:"Caracol Play (free)",              note:"🇨🇴" },
  AU: { primary:"SBS",                   streaming:"SBS On Demand (free)",             note:"🇦🇺" },
  JP: { primary:"NHK · ABEMA",           streaming:"ABEMA (free)",                    note:"🇯🇵" },
  KR: { primary:"KBS · SBS",             streaming:"WAVVE",                           note:"🇰🇷" },
  ZA: { primary:"SABC · SuperSport",     streaming:"SuperSport streaming",            note:"🇿🇦" },
  DEFAULT: { primary:"FOX · FS1",        streaming:"Peacock · Tubi (free)",           note:"🌍" },
};

// Detect user country via IP geolocation (free, no key needed)
function useCountry() {
  const [geoData, setGeoData] = useState({ country: "US", city: "", region: "" });
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then(r => r.json())
      .then(d => {
        if (d?.country_code) setGeoData({ country: d.country_code, city: d.city || "", region: d.region || "" });
      })
      .catch(() => {});
  }, []);
  return geoData;
}

function getBroadcast(countryCode) {
  return BROADCAST[countryCode] || BROADCAST.DEFAULT;
}


const CountryCtx = createContext("US");
const VENUE_COORDS = {"Mexico City Stadium, Mexico City":"19.3029,-99.1505","Estadio Guadalajara, Zapopan":"20.6867,-103.4079","Toronto Stadium, Toronto":"43.6333,-79.3891","SoFi Stadium, Los Angeles":"33.9535,-118.3392","San Francisco Bay Area Stadium, San Francisco":"37.4031,-121.9694","New York New Jersey Stadium, East Rutherford":"40.8135,-74.0745","Boston Stadium, Boston":"42.3467,-71.0972","BC Place, Vancouver":"49.2767,-123.1115","Houston Stadium, Houston":"29.6847,-95.4107","Dallas Stadium, Dallas":"32.7474,-97.0945","Philadelphia Stadium, Philadelphia":"39.9012,-75.1675","Estadio Monterrey, Guadalupe":"25.6694,-100.2436","Atlanta Stadium, Atlanta":"33.7553,-84.4006","Miami Stadium, Miami":"25.9580,-80.2389","Kansas City Stadium, Kansas City":"39.0489,-94.4839","Seattle Stadium, Seattle":"47.5952,-122.3316"};
const VENUE_TZ = {"Mexico City Stadium, Mexico City":"America/Mexico_City","Estadio Guadalajara, Zapopan":"America/Mexico_City","Estadio Monterrey, Guadalupe":"America/Monterrey","Toronto Stadium, Toronto":"America/Toronto","BC Place, Vancouver":"America/Vancouver","SoFi Stadium, Los Angeles":"America/Los_Angeles","San Francisco Bay Area Stadium, San Francisco":"America/Los_Angeles","Seattle Stadium, Seattle":"America/Los_Angeles","Dallas Stadium, Dallas":"America/Chicago","Houston Stadium, Houston":"America/Chicago","Kansas City Stadium, Kansas City":"America/Chicago","New York New Jersey Stadium, East Rutherford":"America/New_York","Boston Stadium, Boston":"America/New_York","Philadelphia Stadium, Philadelphia":"America/New_York","Atlanta Stadium, Atlanta":"America/New_York","Miami Stadium, Miami":"America/New_York"};
const MATCH_UTC = {1:"2026-06-11T19:00:00Z",2:"2026-06-12T02:00:00Z",3:"2026-06-12T19:00:00Z",4:"2026-06-13T01:00:00Z",5:"2026-06-13T19:00:00Z",6:"2026-06-13T22:00:00Z",7:"2026-06-14T01:00:00Z",8:"2026-06-14T03:59:00Z",9:"2026-06-14T17:00:00Z",10:"2026-06-14T20:00:00Z",11:"2026-06-14T23:00:00Z",12:"2026-06-15T02:00:00Z",13:"2026-06-15T16:00:00Z",14:"2026-06-15T19:00:00Z",15:"2026-06-15T22:00:00Z",16:"2026-06-16T01:00:00Z",17:"2026-06-16T19:00:00Z",18:"2026-06-16T22:00:00Z",19:"2026-06-17T01:00:00Z",20:"2026-06-17T03:59:00Z",21:"2026-06-17T17:00:00Z",22:"2026-06-17T20:00:00Z",23:"2026-06-17T23:00:00Z",24:"2026-06-18T02:00:00Z",25:"2026-06-18T16:00:00Z",26:"2026-06-18T19:00:00Z",27:"2026-06-18T22:00:00Z",28:"2026-06-19T01:00:00Z",29:"2026-06-19T19:00:00Z",30:"2026-06-19T22:00:00Z",31:"2026-06-20T00:30:00Z",32:"2026-06-20T03:00:00Z",33:"2026-06-20T17:00:00Z",34:"2026-06-20T20:00:00Z",35:"2026-06-21T01:00:00Z",36:"2026-06-21T03:59:00Z",37:"2026-06-21T16:00:00Z",38:"2026-06-21T19:00:00Z",39:"2026-06-21T22:00:00Z",40:"2026-06-22T01:00:00Z",41:"2026-06-22T17:00:00Z",42:"2026-06-22T21:00:00Z",43:"2026-06-23T00:00:00Z",44:"2026-06-23T03:00:00Z",45:"2026-06-23T17:00:00Z",46:"2026-06-23T20:00:00Z",47:"2026-06-23T23:00:00Z",48:"2026-06-24T02:00:00Z",49:"2026-06-24T19:00:00Z",50:"2026-06-24T19:00:00Z",51:"2026-06-24T22:00:00Z",52:"2026-06-24T22:00:00Z",53:"2026-06-25T01:00:00Z",54:"2026-06-25T01:00:00Z",55:"2026-06-25T20:00:00Z",56:"2026-06-25T20:00:00Z",57:"2026-06-25T23:00:00Z",58:"2026-06-25T23:00:00Z",59:"2026-06-26T02:00:00Z",60:"2026-06-26T02:00:00Z",61:"2026-06-26T19:00:00Z",62:"2026-06-26T19:00:00Z",63:"2026-06-27T00:00:00Z",64:"2026-06-27T00:00:00Z",65:"2026-06-27T03:00:00Z",66:"2026-06-27T03:00:00Z",67:"2026-06-27T21:00:00Z",68:"2026-06-27T21:00:00Z",69:"2026-06-27T23:30:00Z",70:"2026-06-27T23:30:00Z",71:"2026-06-28T02:00:00Z",72:"2026-06-28T02:00:00Z",73:"2026-06-28T23:00:00Z",74:"2026-06-29T17:00:00Z",75:"2026-06-29T20:30:00Z",76:"2026-06-30T01:00:00Z",77:"2026-06-30T17:00:00Z",78:"2026-06-30T21:00:00Z",79:"2026-07-01T01:00:00Z",80:"2026-07-01T16:00:00Z",81:"2026-07-01T20:00:00Z",82:"2026-07-02T00:00:00Z",83:"2026-07-02T19:00:00Z",84:"2026-07-02T23:00:00Z",85:"2026-07-03T03:00:00Z",86:"2026-07-03T18:00:00Z",87:"2026-07-03T22:00:00Z",88:"2026-07-04T01:30:00Z",89:"2026-07-04T17:00:00Z",90:"2026-07-04T21:00:00Z",91:"2026-07-05T20:00:00Z",92:"2026-07-06T00:00:00Z",93:"2026-07-06T19:00:00Z",94:"2026-07-07T00:00:00Z",95:"2026-07-07T16:00:00Z",96:"2026-07-07T20:00:00Z",97:"2026-07-09T20:00:00Z",98:"2026-07-10T19:00:00Z",99:"2026-07-11T21:00:00Z",100:"2026-07-12T01:00:00Z",101:"2026-07-14T19:00:00Z",102:"2026-07-15T19:00:00Z",103:"2026-07-18T21:00:00Z",104:"2026-07-19T19:00:00Z"};
const USER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const APP_VERSION = "1.0.0";
const APP_DATE = "Jun 9, 2026";

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "iOS";
  if (/Android/.test(ua)) return ua.includes("Mobile") ? "Android" : "Android Tablet";
  if (/Macintosh|Windows|Linux/.test(ua)) return "Desktop";
  return "Unknown";
}
const isEastern = USER_TZ==="America/New_York"||USER_TZ==="America/Detroit"||USER_TZ==="America/Indiana/Indianapolis"||USER_TZ==="America/Kentucky/Louisville";
function fmtTime(isoStr,tz){return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",hour12:true,timeZone:tz}).format(new Date(isoStr));}
function fmtDate(isoStr,tz){return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",timeZone:tz}).format(new Date(isoStr));}
function matchTimes(m){const iso=MATCH_UTC[m.id];if(!iso)return{localTime:m.time,venueTime:null,dateLabel:m.date};const venueTz=VENUE_TZ[m.venue]||"America/New_York";const isOriginalMidnight=m.time&&m.time.includes("11:59");const dateLabel=isEastern&&isOriginalMidnight?m.date:fmtDate(iso,USER_TZ);const localTime=fmtTime(iso,USER_TZ);const venueTime=(venueTz===USER_TZ)?null:fmtTime(iso,venueTz);return{localTime,venueTime,dateLabel};}
const openMaps=(venue)=>{const coords=VENUE_COORDS[venue];const q=encodeURIComponent(venue);const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;if(isIOS||/Macintosh/.test(navigator.userAgent))window.open(`maps://maps.apple.com/?q=${q}${coords?`&ll=${coords}`:""}`, "_blank");else window.open(`https://www.google.com/maps/search/?api=1&query=${q}${coords?`+${coords}`:""}`, "_blank");};

// ── CRESTS ────────────────────────────────────────────────────────────────
const FLAG_CODES = {"Mexico":"mx","South Africa":"za","South Korea":"kr","Czechia":"cz","Canada":"ca","Bosnia & Herz.":"ba","Qatar":"qa","Switzerland":"ch","Brazil":"br","Morocco":"ma","Haiti":"ht","Scotland":"gb-sct","United States":"us","Paraguay":"py","Australia":"au","Turkiye":"tr","Germany":"de","Curacao":"cw","Ivory Coast":"ci","Ecuador":"ec","Netherlands":"nl","Japan":"jp","Sweden":"se","Tunisia":"tn","Belgium":"be","Egypt":"eg","Iran":"ir","New Zealand":"nz","Spain":"es","Cape Verde":"cv","Saudi Arabia":"sa","Uruguay":"uy","France":"fr","Senegal":"sn","Iraq":"iq","Norway":"no","Argentina":"ar","Algeria":"dz","Austria":"at","Jordan":"jo","Portugal":"pt","DR Congo":"cd","Uzbekistan":"uz","Colombia":"co","England":"gb-eng","Croatia":"hr","Ghana":"gh","Panama":"pa"};
function Crest({ team, size=26 }) {
  const code = FLAG_CODES[team];
  const [err, setErr] = useState(false);
  if(!code || err) return <span style={{fontSize:size*0.75,lineHeight:1}}>{getFlag(team)}</span>;
  return <img src={`https://flagcdn.com/w${size*2}/${code}.png`} alt={team} width={size} height={Math.round(size*0.67)} style={{objectFit:"cover",flexShrink:0,borderRadius:3,boxShadow:"0 1px 3px rgba(0,0,0,0.4)"}} onError={()=>setErr(true)}/>;
}

// ── UI PRIMITIVES ─────────────────────────────────────────────────────────
const Card = ({children,style={}}) => <div style={{background:`linear-gradient(135deg,${C.s1},${C.s2})`,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden",...style}}>{children}</div>;
const Badge = ({children,color=C.green}) => <span style={{display:"inline-flex",padding:"2px 8px",borderRadius:20,background:`${color}18`,color,fontSize:11,fontWeight:600}}>{children}</span>;
const Pill = ({children,active,onClick,color=C.green}) => <button onClick={onClick} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${active?color:C.b1}`,background:active?`${color}18`:"transparent",color:active?color:C.mid,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{children}</button>;
const RC = ({v,sz=40}) => { const col=v>=8.5?C.green:v>=7.5?C.gold:v>=6.5?"#fb923c":C.red; return <div style={{width:sz,height:sz,borderRadius:"50%",background:`${col}22`,border:`2px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz*0.33,fontWeight:700,color:col,flexShrink:0}}>{v.toFixed(1)}</div>; };
const Modal = ({open,onClose,title,children}) => { if(!open)return null; return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} style={{background:C.s1,border:`1px solid ${C.b2}`,borderRadius:"18px 18px 0 0",width:"100%",maxWidth:620,maxHeight:"90vh",overflowY:"auto",paddingBottom:16}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px 12px",borderBottom:`1px solid ${C.b1}`,position:"sticky",top:0,background:C.s1}}><span style={{fontSize:17,fontWeight:700,color:C.green}}>{title}</span><button onClick={onClose} style={{background:"none",border:"none",color:C.mid,fontSize:22,cursor:"pointer"}}>×</button></div><div style={{padding:18}}>{children}</div></div></div>; };
const Toast = ({msg,onDone}) => { useEffect(()=>{if(msg){const t=setTimeout(onDone,3000);return()=>clearTimeout(t);}},[msg]); if(!msg)return null; return <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:C.green,color:"#030a05",padding:"10px 20px",borderRadius:24,fontWeight:700,fontSize:13,zIndex:2000}}>{msg}</div>; };
const RO = [{l:"15 min before",v:15},{l:"30 min before",v:30},{l:"1 hour before",v:60},{l:"2 hours before",v:120},{l:"1 day before",v:1440}];

// ── ICS ───────────────────────────────────────────────────────────────────
function generateICS(saved) {
  const pad=n=>String(n).padStart(2,"0");
  const toICS=iso=>{const d=new Date(iso);return`${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;};
  const isoMap=MATCH_UTC;
  const now=toICS(new Date().toISOString());
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//FIFA World Cup 2026//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:FIFA World Cup 2026"];
  saved.forEach(item=>{const m=item.match,startISO=isoMap[m.id]||"2026-06-11T19:00:00Z",startDT=toICS(startISO);const endD=new Date(startISO);endD.setUTCHours(endD.getUTCHours()+2);lines.push("BEGIN:VEVENT",`UID:wc2026-${m.id}@app`,`DTSTAMP:${now}`,`DTSTART:${startDT}`,`DTEND:${toICS(endD.toISOString())}`,`SUMMARY:⚽ ${m.home} vs ${m.away} - WC 2026`,`LOCATION:${m.venue}`,`TRANSP:${item.avail==="free"?"TRANSPARENT":"OPAQUE"}`,"STATUS:CONFIRMED");if(item.type==="rem")lines.push("BEGIN:VALARM","ACTION:DISPLAY",`DESCRIPTION:Reminder: ${m.home} vs ${m.away}`,`TRIGGER:-PT${item.mins}M`,"END:VALARM");lines.push("END:VEVENT");});
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
function downloadICS(saved) {
  const ics=generateICS(saved);
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;
  if(isIOS){const w=window.open();if(w){w.document.open("text/calendar");w.document.write(ics);w.document.close();}}
  else{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([ics],{type:"text/calendar;charset=utf-8"}));a.download="WorldCup2026.ics";document.body.appendChild(a);a.click();document.body.removeChild(a);}
}

// ── ADD MODAL ─────────────────────────────────────────────────────────────
// Star icon — outline when unsaved, gold filled when saved
function StarIcon({ filled, size=16 }) {
  return filled
    ? <svg width={size} height={size} viewBox="0 0 24 24" fill={C.gold} stroke={C.gold} strokeWidth="1.5"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
    : <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>;
}

function AddModal({ match, open, onClose, onCal, onRem }) {
  const [tab, setTab] = useState("cal");
  const [avail, setAvail] = useState("busy");
  const [mins, setMins] = useState(60);
  const [ch, setCh] = useState("push");
  const [contact, setContact] = useState("");
  const [pushState, setPushState] = useState(() =>
    "Notification" in window ? Notification.permission : "unsupported"
  );

  const handleEnablePush = async () => {
    const result = await requestPushPermission();
    setPushState(result);
  };

  const handleSetReminder = () => {
    if (ch === "push") {
      if (pushState !== "granted") {
        handleEnablePush().then(state => {
          if (state === "granted") {
            const ok = scheduleNotification(match, mins);
            onRem(match, "push", mins, "");
            onClose();
          }
        });
        return;
      }
      scheduleNotification(match, mins);
      onRem(match, "push", mins, "");
    } else {
      onRem(match, ch, mins, contact);
    }
    onClose();
  };

  if (!match) return null;
  return (
    <Modal open={open} onClose={onClose} title={`${match.home} vs ${match.away}`}>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <Pill active={tab==="cal"} onClick={()=>setTab("cal")}>📅 Calendar</Pill>
        <Pill active={tab==="rem"} onClick={()=>setTab("rem")} color={C.gold}>🔔 Reminder</Pill>
      </div>
      {tab==="cal" && (
        <div>
          <div style={{background:C.s2,borderRadius:10,padding:14,marginBottom:14}}>
            <div style={{fontWeight:700,color:C.text,marginBottom:3}}>{match.home} vs {match.away}</div>
            <div style={{fontSize:12,color:C.dim}}>{match.date} · {match.time} · {match.venue}</div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:C.mid,marginBottom:8,fontWeight:600}}>Show as</div>
            <div style={{display:"flex",gap:8}}>
              {["busy","free"].map(o=><button key={o} onClick={()=>setAvail(o)} style={{flex:1,padding:"10px 0",borderRadius:10,cursor:"pointer",border:`1px solid ${avail===o?C.green:C.b1}`,background:avail===o?`${C.green}22`:C.s2,color:avail===o?C.green:C.mid,fontSize:13,fontWeight:600}}>{o==="busy"?"🔴 Busy":"🟢 Free"}</button>)}
            </div>
          </div>
          <button onClick={()=>{onCal(match,avail);onClose();}} style={{width:"100%",padding:"12px 0",borderRadius:12,cursor:"pointer",background:`linear-gradient(135deg,${C.green},#22c55e)`,border:"none",color:"#030a05",fontWeight:700,fontSize:15}}>Add to Calendar</button>
        </div>
      )}
      {tab==="rem" && (
        <div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:C.mid,marginBottom:8,fontWeight:600}}>Remind me via</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[
                ["push","🔔 Push"],
                ["email","✉️ Email"],
                ["sms","📱 SMS"],
                ["whatsapp","💬 WhatsApp"],
              ].map(([v,l])=>(
                <button key={v} onClick={()=>setCh(v)} style={{flex:"1 1 auto",padding:"9px 6px",borderRadius:10,cursor:"pointer",border:`1px solid ${ch===v?C.gold:C.b1}`,background:ch===v?`${C.gold}22`:C.s2,color:ch===v?C.gold:C.mid,fontSize:12,fontWeight:600}}>{l}</button>
              ))}
            </div>
          </div>

          {/* Push notification status */}
          {ch==="push" && (
            <div style={{marginBottom:14,padding:12,borderRadius:10,background:
              pushState==="granted" ? `${C.green}18` :
              pushState==="denied"  ? `${C.red}18`   : `${C.gold}18`,
              border:`1px solid ${
                pushState==="granted" ? C.green :
                pushState==="denied"  ? C.red   : C.gold}44`}}>
              {pushState==="granted" && <div style={{fontSize:13,color:C.green,fontWeight:600}}>✅ Push notifications enabled — reminder will fire automatically in this browser tab.</div>}
              {pushState==="denied"  && <div style={{fontSize:13,color:C.red}}><strong>Notifications blocked.</strong> Enable them in your browser settings, then try again.</div>}
              {pushState==="default" && <div style={{fontSize:13,color:C.gold}}>Tap "Set Reminder" to allow notifications — your browser will prompt you once.</div>}
              {pushState==="unsupported" && <div style={{fontSize:13,color:C.dim}}>Push notifications aren't supported in this browser. Try Email or SMS instead.</div>}
            </div>
          )}

          {/* Contact input for non-push channels */}
          {ch!=="push" && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,color:C.mid,marginBottom:6,fontWeight:600}}>{ch==="email"?"Email":"Phone"}</div>
              <input value={contact} onChange={e=>setContact(e.target.value)} placeholder={ch==="email"?"you@example.com":"+1 555 0000"} style={{width:"100%",padding:"10px 14px",background:C.s2,border:`1px solid ${C.b2}`,borderRadius:10,color:C.text,fontSize:14,outline:"none"}}/>
            </div>
          )}

          <div style={{marginBottom:14}}>
            <div style={{fontSize:12,color:C.mid,marginBottom:6,fontWeight:600}}>How far in advance</div>
            <select value={mins} onChange={e=>setMins(Number(e.target.value))} style={{width:"100%",padding:"10px 14px",background:C.s1,border:`1px solid ${C.b2}`,borderRadius:10,color:C.text,fontSize:14,outline:"none"}}>
              {RO.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          <button
            onClick={handleSetReminder}
            disabled={ch==="push" && pushState==="denied"}
            style={{width:"100%",padding:"12px 0",borderRadius:12,cursor:ch==="push"&&pushState==="denied"?"not-allowed":"pointer",background:`linear-gradient(135deg,${C.gold},#f59e0b)`,border:"none",color:"#030a05",fontWeight:700,fontSize:15,opacity:ch==="push"&&pushState==="denied"?0.5:1}}>
            {ch==="push" && pushState!=="granted" ? "Enable & Set Reminder" : "Set Reminder"}
          </button>
        </div>
      )}
    </Modal>
  );
}


// Helper hook: measures a ref element's height
function useElemHeight(ref) {
  const [h, setH] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(() => setH(ref.current?.offsetHeight || 0));
    obs.observe(ref.current);
    setH(ref.current.offsetHeight);
    return () => obs.disconnect();
  }, []);
  return h;
}

// ── MATCH CARD ─────────────────────────────────────────────────────────────
function MatchCard({ m, onAction, onMatchTap=null, timeMode="local", favTeam="", savedIds=new Set() }) {
  const { favTeams=[] } = useContext(FavCtx);
  const country = useContext(CountryCtx);
  const { getScore } = useContext(LiveScoresCtx);
  const sc = getScore(m.home, m.away);
  const live = sc ? statusIsLive(sc.status) : false;
  const finished = sc ? statusIsFinished(sc.status) : false;
  const hasScore = sc && sc.hg !== null && sc.ag !== null;
  const isKO = !m.group;
  let winner = null;
  if(isKO && finished && hasScore) { if(sc.hg>sc.ag) winner=m.home; else if(sc.ag>sc.hg) winner=m.away; }
  const isFav = favTeams?.length && (favTeams.includes(m.home) || favTeams.includes(m.away));
  const [scoreFlash, setScoreFlash] = useState(false);
  const prevScore = useRef(null);
  useEffect(() => {
    if (!live || !hasScore) return;
    const curr = `${sc.hg}-${sc.ag}`;
    if (prevScore.current && prevScore.current !== curr) {
      setScoreFlash(true);
      setTimeout(() => setScoreFlash(false), 1200);
    }
    prevScore.current = curr;
  }, [sc?.hg, sc?.ag, live]);
  const { localTime, venueTime, dateLabel } = matchTimes(m);
  const venueTz = VENUE_TZ[m.venue];
  const venueTzShort = venueTz ? new Intl.DateTimeFormat("en-US",{timeZoneName:"short",timeZone:venueTz}).formatToParts(new Date()).find(p=>p.type==="timeZoneName")?.value : "";
  const userTzShort = new Intl.DateTimeFormat("en-US",{timeZoneName:"short"}).formatToParts(new Date()).find(p=>p.type==="timeZoneName")?.value || "";
  const displayTime = timeMode === "venue" ? (venueTime || localTime) : localTime;
  const tzLabel = timeMode === "venue" ? venueTzShort : userTzShort;
  const bc = getBroadcast(country);
  const isUS = country === "US" || !BROADCAST[country];

  return (
    <div style={{marginBottom:8,background:C.s1,border:`1px solid ${live?C.green:isFav?`${C.gold}55`:C.b1}`,borderRadius:12,overflow:"hidden",opacity:finished?0.8:1}}>
      {/* Header: group/stage + venue + time */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 13px",borderBottom:`1px solid ${C.b1}`,background:C.s2}}>
        <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0,flex:1}}>
          {m.group
            ? <span style={{fontSize:11,fontWeight:700,color:C.green,background:`${C.green}18`,padding:"2px 7px",borderRadius:10,flexShrink:0}}>Group {m.group}</span>
            : <span style={{fontSize:11,fontWeight:700,color:C.gold,background:`${C.gold}18`,padding:"2px 7px",borderRadius:10,flexShrink:0}}>{m.stage||"Knockout"}</span>
          }
          <span style={{fontSize:10,color:C.dim,flexShrink:0}}>#{m.id}</span>
          <span onClick={()=>openMaps(m.venue)} style={{fontSize:11,color:C.dim,cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            📍 {m.venue.split(",")[0]}
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          {live && <span style={{fontSize:10,fontWeight:700,color:C.green}}>🔴 {statusLabel(sc.status,sc.elapsed)}</span>}
          {!live && <span style={{fontSize:12,fontWeight:600,color:timeMode==="venue"?C.gold:C.text}}>{displayTime}</span>}
          {!live && <span style={{fontSize:10,color:C.dim}}>{tzLabel}</span>}
          {finished && <span style={{fontSize:10,color:C.dim,marginLeft:2}}>· {"FT"}</span>}
        </div>
      </div>

      {/* Teams row — tappable to open detail */}
      <div onClick={()=>onMatchTap&&onMatchTap(m)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 13px",cursor:onMatchTap?"pointer":"default"}}>
        <Crest team={m.home} size={26}/>
        <span style={{fontWeight:winner===m.home?800:700,color:finished?(winner===m.home?C.text:C.dim):favTeams?.includes(m.home)?C.gold:C.text,flex:1,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.home}</span>
        {hasScore ? (
          <div style={{textAlign:"center",minWidth:60,flexShrink:0}}>
            <div style={{fontWeight:900,fontSize:22,color:live?C.green:C.text,fontFamily:"monospace",lineHeight:1,animation:scoreFlash?"scoreFlash .6s ease":undefined,borderRadius:6,padding:"1px 4px",background:scoreFlash?`${C.green}30`:"transparent",transition:"background .3s"}}>{sc.hg} – {sc.ag}</div>
          </div>
        ) : (
          <span style={{fontSize:11,color:C.dim,fontWeight:700,minWidth:36,textAlign:"center",flexShrink:0}}>VS</span>
        )}
        <span style={{fontWeight:winner===m.away?800:700,color:finished?(winner===m.away?C.text:C.dim):favTeams?.includes(m.away)?C.gold:C.text,flex:1,fontSize:14,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.away}</span>
        <Crest team={m.away} size={26}/>
      </div>

      {/* Footer: TV + actions */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 13px",borderTop:`1px solid ${C.b1}`,background:C.s2}}>
        <div style={{fontSize:11,color:finished?C.dim:C.gold,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>
          {m.tv && <>📺 {isUS ? m.tv : bc.primary}</>}
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
          {onMatchTap && (live||finished) && <button onClick={()=>onMatchTap(m)} style={{background:`${C.blue}18`,border:`1px solid ${C.blue}33`,color:C.blue,padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer"}}>Match Events</button>}
          {!finished && !live && (()=>{ const isSaved=savedIds.has(m.id); return (
            <button onClick={()=>onAction(m)} style={{background:isSaved?`${C.gold}22`:`${C.green}22`,border:`1px solid ${isSaved?C.gold:C.greenS}`,color:isSaved?C.gold:C.green,padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
              <StarIcon filled={isSaved} size={12}/>{isSaved?"Saved":"Add"}
            </button>
          ); })()}
        </div>
      </div>
    </div>
  );
}

// ── LIVE TAB ──────────────────────────────────────────────────────────────
function LiveTab({ onAction, onMatchTap=null, favTeam="", tabTop=116, savedIds=new Set() }) {
  const { favTeams=[] } = useContext(FavCtx);
  const { scores, getScore, lastFetch } = useContext(LiveScoresCtx);
  const _lhRef = useRef(null); const _lhH = useElemHeight(_lhRef);
  const lastUpdate = lastFetch ? lastFetch.toLocaleTimeString() : null;
  const liveMatches = MATCHES.filter(m => { const s=getScore(m.home,m.away); return s&&statusIsLive(s.status); });
  const finishedToday = MATCHES.filter(m => { const s=getScore(m.home,m.away); return s&&statusIsFinished(s.status); });

  // Upcoming fav matches — grouped by date, sorted chronologically
  const upcomingFavMatches = favTeams.length > 0
    ? MATCHES.filter(m => (favTeams.includes(m.home)||favTeams.includes(m.away)) && !getScore(m.home,m.away))
    : [];
  const upcomingByDate = upcomingFavMatches.reduce((acc, m) => {
    const { dateLabel } = matchTimes(m);
    const key = dateLabel || m.date;
    (acc[key] = acc[key] || []).push(m);
    return acc;
  }, {});

  return (
    <div>
      <div ref={_lhRef} style={{position:"fixed",top:tabTop,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:700,willChange:"transform",zIndex:90,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:`0 2px 8px rgba(0,0,0,0.8)`,padding:"8px 13px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontWeight:700,fontSize:15,color:C.green}}>{"LIVE SCORES"}</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {lastUpdate && <span style={{fontSize:11,color:C.dim}}>Updated {lastUpdate}</span>}
          </div>
        </div>
      </div>
      
      <div style={{height:(_lhH||36)+8}}/>
      {Object.keys(upcomingByDate).length > 0 && (
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:C.gold,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>
            {"UPCOMING — YOUR TEAMS"}
          </div>
          {Object.entries(upcomingByDate).map(([date, matches]) => (
            <div key={date} style={{marginBottom:10}}>
              <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:5}}>{date}</div>
              {matches.map(m => <MatchCard key={m.id} m={m} onAction={onAction} onMatchTap={onMatchTap} savedIds={savedIds}/>)}
            </div>
          ))}
        </div>
      )}
      {liveMatches.length>0 && <div><div style={{fontSize:11,color:C.green,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{"Live"} — {"Today's Results".split("'")[0]}</div>{liveMatches.map(m=><MatchCard key={m.id} m={m} onAction={onAction} onMatchTap={onMatchTap} favTeam={favTeam} savedIds={savedIds}/> )}</div>}
      {finishedToday.length>0 && <div style={{marginTop:liveMatches.length?16:0}}><div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{"Today's Results"}</div>{finishedToday.map(m=><MatchCard key={m.id} m={m} onAction={onAction} onMatchTap={onMatchTap} favTeam={favTeam} savedIds={savedIds}/> )}</div>}
      {liveMatches.length===0 && finishedToday.length===0 && Object.keys(upcomingByDate).length===0 && !lastFetch && (
        <div style={{marginTop:8}}>
          {[1,2,3].map(i=><SkeletonMatchCard key={i}/>)}
        </div>
      )}
      {liveMatches.length===0 && finishedToday.length===0 && Object.keys(upcomingByDate).length===0 && lastFetch && (
        <div style={{textAlign:"center",padding:"48px 20px"}}>
          <div style={{fontSize:"2.5rem",marginBottom:10}}>⚽</div>
          <div style={{fontWeight:700,fontSize:16,color:C.mid,marginBottom:6}}>{"No matches today"}</div>
          <div style={{fontSize:13,color:C.dim}}>{"Live scores appear here on match days."}</div>
          <div style={{fontSize:12,color:C.dim,marginTop:12}}>{"Tournament starts Jun 11, 2026"}</div>
        </div>
      )}
    </div>
  );
}

// ── SCHEDULE TAB ──────────────────────────────────────────────────────────
// Build all unique match dates for the calendar strip
const MATCH_DATES = (() => {
  const seen = new Set();
  return MATCHES
    .filter(m => MATCH_UTC[m.id])
    .map(m => {
      const d = new Date(MATCH_UTC[m.id]);
      const key = d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
      if (seen.has(key)) return null;
      seen.add(key);
      return { key, date: d, day: d.getDate(), dow: d.toLocaleDateString("en-US",{weekday:"short"}).slice(0,1) };
    })
    .filter(Boolean);
})();

function SchedTab({ onAction, onMatchTap=null, favTeam="", tabTop=116, savedIds=new Set() }) {
  const { favTeams=[] } = useContext(FavCtx);
  const [filterMode, setFilterMode] = useState("group");
  const [timeMode, setTimeMode] = useState("local");
  const [groupF, setGroupF] = useState("All");
  const [teamF, setTeamF] = useState("");
  const [venueF, setVenueF] = useState("");
  const [roundF, setRoundF] = useState("");
  const [selDate, setSelDate] = useState(null); // null = all dates
  const stripRef = useRef(null);

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

  const allTeams = [...new Set(MATCHES.flatMap(m=>[m.home,m.away]).filter(t => t && !/^(QF|SF|RO|W|L|M|Match|Winner|Loser)/.test(t) && t.length > 2))].sort();
  const allVenues = [...new Set(MATCHES.map(m=>m.venue))].sort();

  const shown = MATCHES.filter(m => {
    // Date filter first
    if (selDate) {
      const iso = MATCH_UTC[m.id];
      if (!iso) return false;
      const key = new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric"});
      if (key !== selDate) return false;
    }
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
  const ss=(active,color=C.green)=>({padding:"5px 12px",borderRadius:20,border:`1px solid ${active?color:C.b1}`,background:active?`${color}18`:"transparent",color:active?color:C.mid,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"});

  const filterRef = useRef(null);
  const filterHeight = useElemHeight(filterRef);

  return (
    <div>
      {/* Fixed filter header */}
      <div ref={filterRef} style={{position:"fixed",top:tabTop,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:700,willChange:"transform",zIndex:90,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:`0 2px 8px rgba(0,0,0,0.8)`,padding:"8px 13px"}}>

        {/* Date strip */}
        <div ref={stripRef} style={{display:"flex",overflowX:"auto",scrollbarWidth:"none",marginBottom:8,gap:4}}>
          <div onClick={()=>setSelDate(null)} style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:36,cursor:"pointer",padding:"4px 2px",borderRadius:8,background:selDate===null?`${C.green}22`:"transparent",border:`1px solid ${selDate===null?C.green:"transparent"}`}}>
            <span style={{fontSize:9,color:selDate===null?C.green:C.dim,fontWeight:700}}>ALL</span>
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
          {favTeams?.length > 0 && <button style={ss(filterMode==="fav",C.gold)} onClick={()=>setFilterMode("fav")}>⭐ My Teams</button>}
          <button style={ss(filterMode==="group")} onClick={()=>setFilterMode("group")}>🗂 Group</button>
          <button style={ss(filterMode==="team")} onClick={()=>setFilterMode("team")}>👥 Team</button>
          <button style={ss(filterMode==="venue")} onClick={()=>setFilterMode("venue")}>📍 Venue</button>
          <button style={ss(filterMode==="round")} onClick={()=>setFilterMode("round")}>🏆 Round</button>
        </div>
        {filterMode==="group" && (
          <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
            {["All","A","B","C","D","E","F","G","H","I","J","K","L","Knockout"].map(g=><Pill key={g} active={groupF===g} onClick={()=>setGroupF(g)} color={g==="Knockout"?C.gold:C.green}>{g==="All"?"All":g==="Knockout"?"🏆 KO":g}</Pill>)}
          </div>
        )}
        {filterMode==="team" && (
          <select value={teamF} onChange={e=>setTeamF(e.target.value)} style={{width:"100%",padding:"8px 14px",background:C.s1,border:`1px solid ${C.b2}`,borderRadius:10,color:C.text,fontSize:14,outline:"none"}}>
            <option value="">{"All teams"}</option>
            {allTeams.map(t=><option key={t} value={t}>{getFlag(t)} {t}</option>)}
          </select>
        )}
        {filterMode==="venue" && (
          <select value={venueF} onChange={e=>setVenueF(e.target.value)} style={{width:"100%",padding:"8px 14px",background:C.s1,border:`1px solid ${C.b2}`,borderRadius:10,color:C.text,fontSize:14,outline:"none"}}>
            <option value="">{"All venues"}</option>
            {allVenues.map(v=><option key={v} value={v}>{v}</option>)}
          </select>
        )}
        {filterMode==="round" && (
          <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
            {[{id:"",label:"All"},{id:"group",label:"Group Stage"},{id:"r32",label:"Round of 32"},{id:"r16",label:"Round of 16"},{id:"qf",label:"Quarter-Finals"},{id:"sf",label:"Semi-Finals"},{id:"3rd",label:"3rd Place"},{id:"final",label:"Final"}].map(r=>
              <Pill key={r.id} active={roundF===r.id} onClick={()=>setRoundF(r.id)} color={r.id===""?C.mid:C.gold}>{r.label}</Pill>
            )}
          </div>
        )}
        {/* Time zone toggle + counter */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
          <span style={{fontSize:13,color:C.mid,fontWeight:700,alignSelf:"flex-end",paddingBottom:3}}>Displaying {shown.length} matches</span>
          <div style={{display:"flex",background:C.s2,borderRadius:20,border:`1px solid ${C.b2}`,padding:2,gap:2}}>
            <button onClick={()=>setTimeMode("local")} style={{padding:"3px 10px",borderRadius:18,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:timeMode==="local"?C.green:"transparent",color:timeMode==="local"?"#030a05":C.dim,transition:"all .15s"}}>My Time</button>
            <button onClick={()=>setTimeMode("venue")} style={{padding:"3px 10px",borderRadius:18,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,background:timeMode==="venue"?C.gold:"transparent",color:timeMode==="venue"?"#030a05":C.dim,transition:"all .15s"}}>Venue</button>
          </div>
        </div>
      </div>

      {/* Spacer to push content below fixed header */}
      <div style={{height: (filterHeight || 140) + 8}}/>


      {/* Match list */}
      {shown.length===0 ? <div style={{textAlign:"center",padding:"32px",color:C.dim}}>{"No matches found"}</div> : Object.entries(byDate).map(([date,ms],idx)=>(
        <div key={date} style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5,marginTop:10}}>
            <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>{date}</div>

          </div>
          {ms.map(m=><MatchCard key={m.id} m={m} onAction={onAction} onMatchTap={onMatchTap} timeMode={timeMode} favTeam={favTeam} savedIds={savedIds}/>)}
        </div>
      ))}
    </div>
  );
}

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────────
async function requestPushPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}
function scheduleNotification(match, minsBeforeKO) {
  const iso = MATCH_UTC[match.id];
  if (!iso) return false;
  const koTime = new Date(iso).getTime();
  const fireAt = koTime - minsBeforeKO * 60 * 1000;
  const delay = fireAt - Date.now();
  if (delay <= 0) return false; // already past
  setTimeout(() => {
    if (Notification.permission === "granted") {
      new Notification(`⚽ ${match.home} vs ${match.away} — Kick-off in ${minsBeforeKO} min!`, {
        body: `📍 ${match.venue}\n📺 ${match.tv || ""}`,
        icon: "/favicon.ico",
        tag: `wc2026-match-${match.id}`,
      });
    }
  }, delay);
  return true;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

// ── GROUPS TAB ─────────────────────────────────────────────────────────────
function GrpTab({ onTeam, onMatchTap, tabTop=116 }) {
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
  // Live scores take precedence over blank manual entries; manual entries override live for editing
  const allR = useMemo(() => {
    const merged = {};
    Object.keys(GROUPS).forEach(g => {
      merged[g] = (manualR[g] || []).map(r => {
        // If user has entered a score manually, use that
        if (r.hg !== "" || r.ag !== "") return r;
        // Otherwise try to find a finished score from the live feed
        const live = allFixtures.find(f => {
          const h = normTeam(f?.teams?.home?.name || "");
          const a = normTeam(f?.teams?.away?.name || "");
          return h === r.home && a === r.away && statusIsFinished(f?.fixture?.status?.short || "");
        });
        if (live) {
          return { ...r, hg: String(live.goals?.home ?? ""), ag: String(live.goals?.away ?? ""), fromLive: true };
        }
        return r;
      });
    });
    return merged;
  }, [manualR, allFixtures]);

  const results = allR[sel] || [];
  const standings = calcStandings(sel, results);
  const upd = (id, f, v) => setManualR(p => ({...p, [sel]: p[sel].map(r => r.id===id ? {...r, [f]: v.replace(/\D/g,"")} : r)}));
  const qc = (pos) => pos<=2 ? C.green : pos===3 ? C.gold : "transparent";
  const liveCount = results.filter(r => r.fromLive).length;
  const _ghRef = useRef(null); const _ghH = useElemHeight(_ghRef);
  return (
    <div>
      {/* Fixed header */}
      <div ref={_ghRef} style={{position:"fixed",top:tabTop,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:700,willChange:"transform",zIndex:90,background:C.bg,borderBottom:`2px solid ${C.b2}`,boxShadow:`0 4px 16px ${C.bg},0 8px 24px ${C.bg}`,padding:"8px 13px"}}>
        <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:6,scrollbarWidth:"none"}}>
          {Object.keys(GROUPS).map(g=><Pill key={g} active={sel===g} onClick={()=>setSel(g)}>{g}</Pill>)}
        </div>
        <div style={{display:"flex",gap:8}}>
          <Pill active={view==="standings"} onClick={()=>setView("standings")} color={C.gold}>📊 Standings</Pill>
          <Pill active={view==="matches"} onClick={()=>setView("matches")} color={C.gold}>📋 Matches</Pill>
        </div>
      </div>
      {/* Spacer */}
      
      <div style={{height:(_ghH||100)+8}}/>
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
                <div style={{display:"flex",alignItems:"center",gap:6}}><Crest team={row.team} size={30}/><span style={{fontSize:14,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.team}</span></div>
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
          <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>ENTER SCORES</div>
          {results.map(r=>{
            const fullMatch = MATCHES.find(m=>m.id===r.id);
            return (
            <div key={r.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"7px 11px"}}>
              <Crest team={r.home} size={30}/>
              <span onClick={()=>fullMatch&&onMatchTap&&onMatchTap(fullMatch)} style={{fontSize:13,color:C.text,flex:1,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:onMatchTap?"pointer":"default"}}>{r.home}</span>
              <input value={r.hg} onChange={e=>upd(r.id,"hg",e.target.value)} placeholder="-" maxLength={2} style={{width:28,textAlign:"center",background:C.s2,border:`1px solid ${C.b2}`,borderRadius:6,color:C.text,fontSize:14,fontWeight:700,padding:"3px 0",outline:"none"}}/>
              <span style={{color:C.dim,fontWeight:700}}>:</span>
              <input value={r.ag} onChange={e=>upd(r.id,"ag",e.target.value)} placeholder="-" maxLength={2} style={{width:28,textAlign:"center",background:C.s2,border:`1px solid ${C.b2}`,borderRadius:6,color:C.text,fontSize:14,fontWeight:700,padding:"3px 0",outline:"none"}}/>
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

// ── ZAFRONIX DATA LAYER ───────────────────────────────────────────────────
const zCache = {};
async function zafronixGet(endpoint, params = {}) {
  const key = endpoint + JSON.stringify(params);
  if (zCache[key] !== undefined) return zCache[key]; // undefined = not cached; null = cached failure
  try {
    const q = new URLSearchParams({ endpoint, ...params }).toString();
    const res = await fetch(`/api/zafronix?${q}`);
    if (!res.ok) throw new Error(`/api/zafronix?${q} → ${res.status}`);
    const data = await res.json();
    zCache[key] = data;
    return data;
  } catch(e) {
    console.error("[zafronix]", endpoint, e.message);
    // Don't cache failures — allow retry
    return null;
  }
}
const Z_NAME_MAP = {"Czech Republic":"Czechia","Bosnia and Herzegovina":"Bosnia & Herz.","Côte d'Ivoire":"Ivory Coast","Cote d'Ivoire":"Ivory Coast","DR Congo":"DR Congo","Democratic Republic of Congo":"DR Congo","Korea Republic":"South Korea","Republic of Korea":"South Korea","IR Iran":"Iran","Curaçao":"Curacao","Cabo Verde":"Cape Verde","Turkey":"Turkiye","United States of America":"United States"};
const zNorm = n => Z_NAME_MAP[n] || n;
function parseName(raw){return raw?.replace(/\s*\(captain\)\s*/i,"").trim()||raw;}
function isCaptain(raw){return/\(captain\)/i.test(raw||"");}
const posLabel = p => { if(!p)return"?"; if(p==="Goalkeeper"||p==="GK")return"GK"; if(p==="Defender"||p==="DF")return"DEF"; if(p==="Midfielder"||p==="MF")return"MID"; if(p==="Forward"||p==="FW"||p==="Attacker")return"FWD"; return p.slice(0,3); };
const posColor = p => { const l=posLabel(p); return l==="GK"?C.blue:l==="DEF"?C.green:l==="MID"?C.gold:C.red; };
const posSort = p => { const l=posLabel(p); return l==="GK"?0:l==="DEF"?1:l==="MID"?2:3; };
function PlayerPhoto({ src, name, size=32 }) {
  const [err, setErr] = useState(false);
  if(!src || err || src.includes("unknown.svg")) return <div style={{width:size,height:size,borderRadius:"50%",background:C.b2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.45,color:C.mid,flexShrink:0,fontWeight:700}}>{parseName(name)?.[0]||"?"}</div>;
  return <img src={src} alt={name} width={size} height={size} style={{borderRadius:"50%",objectFit:"cover",flexShrink:0,border:`1px solid ${C.b2}`}} onError={()=>setErr(true)}/>;
}

// ── RECENT FORM — dynamic, auto-upgrades to live WC data after Jun 11 ─────
function RecentForm({ team, staticData }) {
  const { getScore } = useContext(LiveScoresCtx);

  // Build form from actual WC 2026 MATCHES data using live scores — most accurate source
  const wcMatches = useMemo(() => {
    if (!team) return [];
    return MATCHES
      .filter(m => (m.home === team || m.away === team))
      .map(m => {
        const sc = getScore(m.home, m.away);
        if (!sc || sc.hg === null || sc.ag === null) return null;
        if (!statusIsFinished(sc.status)) return null;
        const isHome = m.home === team;
        const teamGoals = isHome ? sc.hg : sc.ag;
        const oppGoals  = isHome ? sc.ag : sc.hg;
        const opp = isHome ? m.away : m.home;
        const res = teamGoals > oppGoals ? "W" : teamGoals === oppGoals ? "D" : "L";
        const matchUTC = MATCH_UTC[m.id];
        const dateStr = matchUTC
          ? new Date(matchUTC).toLocaleDateString("en-US",{month:"short",day:"numeric"})
          : m.date;
        return { date: dateStr, opp, score: `${teamGoals}-${oppGoals}`, loc: m.venue?.split(",")[0]||"", comp: "World Cup 2026", res, id: m.id };
      })
      .filter(Boolean)
      .sort((a,b) => (MATCH_UTC[b.id]||0) > (MATCH_UTC[a.id]||0) ? 1 : -1)
      .slice(0, 4);
  }, [team, getScore]);

  const isLiveData = wcMatches.length > 0;
  const display = isLiveData ? wcMatches : (staticData || []);
  if (!display.length) return null;

  return (
    <Card>
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontWeight:700,color:C.green,fontSize:13}}>LAST 4 MATCHES</span>
        {isLiveData
          ? <Badge color={C.green}>🔴 Live World Cup data</Badge>
          : <Badge color={C.dim}>Pre-tournament</Badge>
        }
      </div>
      {display.map((g,i) => {
        const rc = g.res==="W" ? C.green : g.res==="D" ? C.gold : C.red;
        return (
          <div key={i} style={{padding:"10px 14px",borderBottom:i<display.length-1?`1px solid ${C.b1}`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:`${rc}22`,border:`2px solid ${rc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:rc,flexShrink:0}}>{g.res}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:700,color:C.text,fontSize:13}}>vs {g.opp}</span>
                  <span style={{fontWeight:700,color:rc,fontSize:13}}>{g.score}</span>
                </div>
                <div style={{fontSize:11,color:C.dim,marginTop:2}}>{g.date}{g.loc ? ` · ${g.loc}` : ""}</div>
              </div>
              <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,
                background:g.comp==="World Cup 2026"?`${C.green}22`:g.comp==="Friendly"?`${C.dim}22`:`${C.blue}18`,
                color:g.comp==="World Cup 2026"?C.green:g.comp==="Friendly"?C.mid:C.blue,
                fontWeight:600,flexShrink:0}}>{g.comp}</span>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

// ── STATS TAB ──────────────────────────────────────────────────────────────
function StatsTab({ initial="", tabTop=116 }) {
  const [sel, setSel] = useState(initial);
  const [squad, setSquad] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const [posFilter, setPosFilter] = useState("All");
  const d = sel ? TEAMS[sel] : null;

  useEffect(() => {
    if(!sel) return;
    setSquad(null); setErr(false); setLoading(true); setPosFilter("All");
    const zName = sel==="Czechia"?"Czech Republic":sel==="Bosnia & Herz."?"Bosnia and Herzegovina":sel==="Ivory Coast"?"Côte d'Ivoire":sel==="DR Congo"?"DR Congo":sel==="South Korea"?"South Korea":sel==="Turkiye"?"Turkey":sel==="Curacao"?"Curaçao":sel;
    zafronixGet("roster",{name:zName}).then(data => {
      setLoading(false);
      if(!data){setErr(true);return;}
      const players=(data?.squad||data?.players||data?.roster||[])
        .map(p=>({name:parseName(p.name),rawName:p.name,captain:isCaptain(p.name),pos:p.position,jersey:p.jersey,age:p.ageAtTournament??p.age,born:p.born,club:p.club?.name??p.club,clubCountry:p.club?.country,photo:p.photo??null,flagUrl:data?.flag?.flagUrl??null}))
        .sort((a,b)=>posSort(a.pos)-posSort(b.pos)||(a.jersey||99)-(b.jersey||99));
      setSquad(players);
    });
  }, [sel]);

  const posCounts = squad?{All:squad.length,GK:squad.filter(p=>posLabel(p.pos)==="GK").length,DEF:squad.filter(p=>posLabel(p.pos)==="DEF").length,MID:squad.filter(p=>posLabel(p.pos)==="MID").length,FWD:squad.filter(p=>posLabel(p.pos)==="FWD").length}:{};
  const filtered = squad?(posFilter==="All"?squad:squad.filter(p=>posLabel(p.pos)===posFilter)):[];
  const _shRef = useRef(null); const _shH = useElemHeight(_shRef);

  return (
    <div>
      <div ref={_shRef} style={{position:"fixed",top:tabTop,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:700,willChange:"transform",zIndex:90,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:`0 2px 8px rgba(0,0,0,0.8)`,padding:"8px 13px"}}>
        <select value={sel} onChange={e=>setSel(e.target.value)} style={{width:"100%",padding:"10px 14px",background:C.s1,border:`1px solid ${C.b2}`,borderRadius:10,color:C.text,fontSize:14,outline:"none"}}>
          <option value="">Select a team</option>
          {Object.keys(GROUPS).map(g=><optgroup key={g} label={`Group ${g}`}>{GROUPS[g].teams.map(t=><option key={t} value={t}>{getFlag(t)} {t}</option>)}</optgroup>)}
        </select>
      </div>
      <div style={{height:(_shH||56)+8}}/>
      
      {!sel && <div style={{textAlign:"center",padding:"44px 20px",color:C.dim,fontSize:13}}>Select any of the 48 teams to view their squad</div>}
      {sel && d && (
        <div>
          <Card style={{marginBottom:12}}>
            <div style={{padding:14}}>
              <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
                <Crest team={sel} size={52}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                    <div style={{fontWeight:700,fontSize:20,color:C.text}}>{sel}</div>
                    {(() => { const p=PREDS.find(x=>x.team===sel); return p ? (
                      <a href="https://polymarket.com/event/world-cup-winner" target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",flexShrink:0}}>
                        <div style={{textAlign:"center",background:`${C.green}18`,border:`1px solid ${C.green}44`,borderRadius:10,padding:"5px 10px",cursor:"pointer"}}>
                          <div style={{fontSize:16,fontWeight:900,color:C.green,lineHeight:1}}>{p.poly}%</div>
                          <div style={{fontSize:9,color:C.dim,marginTop:2}}>to win</div>
                        </div>
                      </a>
                    ) : null; })()}
                  </div>
                  <div style={{fontSize:12,color:C.mid,marginTop:3}}>{d.conf} · Coach: {d.coach}</div>
                  <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                    <Badge color={C.blue}>#{d.rank} FIFA</Badge>
                    <Badge color={C.gold}>{d.titles} 🏆</Badge>
                    {d.base && d.base!=="TBC" && <Badge color={C.dim}>🏨 {d.base}</Badge>}
                  </div>
                </div>
              </div>
              <div style={{fontSize:10,color:C.dim,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:7}}>Sofascore Attributes</div>
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
              <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:7}}>2026 Analysis</div>
              <p style={{fontSize:13,color:C.mid,lineHeight:1.7,margin:0}}>{d.note}</p>
            </div>
          </Card>
          <Card style={{marginBottom:12}}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.b1}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,color:C.green,fontSize:13}}>PREDICTED SQUAD</span>
              {squad && <span style={{fontSize:11,color:C.dim}}>{squad.length} players</span>}
            </div>
            {loading && (
              <div style={{padding:"32px 0",textAlign:"center"}}>
                <div style={{width:28,height:28,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 10px"}}/>
                <div style={{fontSize:12,color:C.mid}}>Fetching squad...</div>
              </div>
            )}
            {err && (
              <div style={{padding:14}}>
                <div style={{fontSize:12,color:C.dim,marginBottom:10}}>Predicted squad — showing key players</div>
                {d.players.map((p,i)=>(
                  <div key={p.name} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<d.players.length-1?`1px solid ${C.b1}`:"none"}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:8,background:`${posColor(p.pos)}22`,color:posColor(p.pos)}}>{p.pos}</span>
                    <span style={{fontWeight:600,color:C.text,flex:1,fontSize:13}}>{p.name}</span>
                    <span style={{fontSize:11,color:C.dim}}>{p.club}</span>
                    <RC v={p.ss} sz={28}/>
                  </div>
                ))}
              </div>
            )}
            {squad && !loading && (
              <div>
                <div style={{display:"flex",gap:6,padding:"10px 12px",borderBottom:`1px solid ${C.b1}`,overflowX:"auto",scrollbarWidth:"none"}}>
                  {["All","GK","DEF","MID","FWD"].map(pos=>(
                    <Pill key={pos} active={posFilter===pos} onClick={()=>setPosFilter(pos)} color={pos==="GK"?C.blue:pos==="DEF"?C.green:pos==="MID"?C.gold:pos==="FWD"?C.red:C.green}>
                      {pos}{posCounts[pos]!==undefined?` (${posCounts[pos]})`:""}
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
                        <div style={{fontSize:10,color:C.dim,marginTop:1}}>{p.club}{p.clubCountry?` · ${p.clubCountry}`:""}{p.age?` · Age ${p.age}`:""}</div>
                      </div>
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:8,background:`${pc}22`,color:pc,flexShrink:0}}>{posLabel(p.pos)}</span>
                    </div>
                  );
                })}
                <div style={{padding:"8px 14px",borderTop:`1px solid ${C.b1}`}}>
                  <span style={{fontSize:10,color:C.dim}}>Squad data sourced from official records</span>
                </div>
              </div>
            )}
          </Card>

          {/* Dynamic recent form — auto-switches to live WC data after Jun 11 */}
          <RecentForm team={sel} staticData={RECENT4[sel]}/>
        </div>
      )}
    </div>
  );
}

// ── PREDICTIONS TAB ────────────────────────────────────────────────────────

// Historical Polymarket odds snapshots for top 6 teams — dates leading up to Jun 5
const ODDS_HISTORY = [
  { date:"Dec 6",  France:14.2, Spain:18.1, England:9.8,  Brazil:7.1,  Argentina:9.4,  Germany:5.2  },
  { date:"Jan 15", France:15.0, Spain:17.4, England:10.3, Brazil:7.8,  Argentina:9.1,  Germany:5.8  },
  { date:"Feb 20", France:15.8, Spain:16.9, England:10.8, Brazil:8.2,  Argentina:8.8,  Germany:6.1  },
  { date:"Mar 10", France:16.1, Spain:17.2, England:11.0, Brazil:8.5,  Argentina:8.5,  Germany:6.4  },
  { date:"Mar 28", France:17.4, Spain:16.5, England:11.2, Brazil:8.8,  Argentina:8.3,  Germany:6.9  },
  { date:"Apr 15", France:17.8, Spain:16.8, England:11.1, Brazil:9.0,  Argentina:8.4,  Germany:7.0  },
  { date:"May 1",  France:18.0, Spain:17.0, England:11.2, Brazil:8.9,  Argentina:8.3,  Germany:7.1  },
  { date:"May 20", France:17.6, Spain:17.2, England:11.3, Brazil:9.1,  Argentina:8.2,  Germany:7.2  },
  { date:"Jun 1",  France:17.9, Spain:17.0, England:11.3, Brazil:9.1,  Argentina:8.3,  Germany:7.1  },
  { date:"Jun 5",  France:18.3, Spain:16.7, England:11.3, Brazil:9.0,  Argentina:8.3,  Germany:7.1  },
];

const CHART_TEAMS = ["France","Spain","England","Brazil","Argentina","Germany"];
const CHART_COLORS = {
  France:  "#4ade80",
  Spain:   "#fbbf24",
  England: "#60a5fa",
  Brazil:  "#f97316",
  Argentina:"#a78bfa",
  Germany: "#fb7185",
};

function OddsLineChart() {
  const W = 320, H = 160, PL = 28, PR = 12, PT = 12, PB = 24;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const pts = ODDS_HISTORY;
  const allVals = pts.flatMap(d => CHART_TEAMS.map(t => d[t]||0));
  const minV = Math.floor(Math.min(...allVals)) - 1;
  const maxV = Math.ceil(Math.max(...allVals)) + 1;
  const xScale = i => PL + (i / (pts.length - 1)) * chartW;
  const yScale = v => PT + chartH - ((v - minV) / (maxV - minV)) * chartH;
  const [hover, setHover] = useState(null); // index into pts

  return (
    <div style={{position:"relative"}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block"}}>
        {/* Grid lines */}
        {[0,0.25,0.5,0.75,1].map(f => {
          const v = minV + f*(maxV-minV);
          const y = yScale(v);
          return (
            <g key={f}>
              <line x1={PL} y1={y} x2={W-PR} y2={y} stroke="#1a3828" strokeWidth="1"/>
              <text x={PL-4} y={y+4} fontSize="7" fill="#3d6a4d" textAnchor="end">{Math.round(v)}%</text>
            </g>
          );
        })}
        {/* X axis labels — every other point */}
        {pts.map((d,i) => i%2===0 && (
          <text key={i} x={xScale(i)} y={H-6} fontSize="7" fill="#3d6a4d" textAnchor="middle">{d.date}</text>
        ))}
        {/* Lines */}
        {CHART_TEAMS.map(team => {
          const color = CHART_COLORS[team];
          const path = pts.map((d,i) => `${i===0?"M":"L"}${xScale(i).toFixed(1)},${yScale(d[team]||0).toFixed(1)}`).join(" ");
          return <path key={team} d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" opacity={hover!==null?"0.25":"1"} style={{transition:"opacity .15s"}}/>;
        })}
        {/* Highlighted lines on hover */}
        {hover!==null && CHART_TEAMS.map(team => {
          const color = CHART_COLORS[team];
          const path = pts.map((d,i) => `${i===0?"M":"L"}${xScale(i).toFixed(1)},${yScale(d[team]||0).toFixed(1)}`).join(" ");
          return <path key={team} d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>;
        })}
        {/* Hover dots */}
        {hover!==null && CHART_TEAMS.map(team => {
          const d = pts[hover];
          const color = CHART_COLORS[team];
          return <circle key={team} cx={xScale(hover)} cy={yScale(d[team]||0)} r="3.5" fill={color} stroke="#060e0a" strokeWidth="1.5"/>;
        })}
        {/* Invisible hit areas */}
        {pts.map((d,i) => (
          <rect key={i} x={xScale(i)-12} y={PT} width={24} height={chartH} fill="transparent"
            onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}
            onTouchStart={()=>setHover(i)} onTouchEnd={()=>setHover(null)}
          />
        ))}
        {/* Vertical hover line */}
        {hover!==null && <line x1={xScale(hover)} y1={PT} x2={xScale(hover)} y2={PT+chartH} stroke="#3d6a4d" strokeWidth="1" strokeDasharray="3,2"/>}
      </svg>

      {/* Hover tooltip */}
      {hover!==null && (
        <div style={{position:"absolute",top:PT,left:Math.min(xScale(hover)+8, W-100),background:"#0c1a12",border:`1px solid #1a3828`,borderRadius:8,padding:"7px 10px",pointerEvents:"none",minWidth:90}}>
          <div style={{fontSize:10,color:"#3d6a4d",marginBottom:4,fontWeight:700}}>{pts[hover].date}</div>
          {CHART_TEAMS.slice().sort((a,b)=>(pts[hover][b]||0)-(pts[hover][a]||0)).map(team=>(
            <div key={team} style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:11,marginBottom:2}}>
              <span style={{color:CHART_COLORS[team],fontWeight:600}}>{team}</span>
              <span style={{color:"#d4ead9",fontWeight:700}}>{pts[hover][team]}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{display:"flex",flexWrap:"wrap",gap:"6px 12px",marginTop:8,paddingLeft:PL}}>
        {CHART_TEAMS.map(team=>(
          <div key={team} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:14,height:3,borderRadius:2,background:CHART_COLORS[team]}}/>
            <span style={{fontSize:10,color:"#7aaa8a"}}>{team}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PredTab({ tabTop=140, geoData={} }) {
  const top = PREDS.filter(p=>p.team!=="Others");
  const others = PREDS.find(p=>p.team==="Others");
  const max = top[0].poly;
  const _phRef = useRef(null); const _phH = useElemHeight(_phRef);
  return (
    <div>
      <div ref={_phRef} style={{position:"fixed",top:tabTop,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:700,willChange:"transform",zIndex:90,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:`0 2px 8px rgba(0,0,0,0.8)`,padding:"8px 13px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <span style={{fontWeight:700,fontSize:15,color:C.green}}>🎯 POLYMARKET ODDS</span>
            <span style={{fontSize:11,color:C.dim,marginLeft:8}}>Updated Jun 5, 2026</span>
          </div>
          <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:C.green,textDecoration:"none",border:`1px solid ${C.greenS}`,padding:"3px 9px",borderRadius:20}}>Live →</a>
        </div>
      </div>
      <div style={{height:(_phH||36)+8}}/>
      

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

// ── SIMULATOR TAB ──────────────────────────────────────────────────────────
// Runs Monte Carlo on mount. Shows win probabilities + most-likely bracket.
function SimTab({ tabTop=116 }) {
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
      <div ref={_simhRef} style={{position:"fixed",top:tabTop,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:700,willChange:"transform",zIndex:90,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:`0 2px 8px rgba(0,0,0,0.8)`,padding:"8px 13px"}}>
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
      <div style={{height:(_simhH||72)+8}}/>
      

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

// ── HEAD TO HEAD TAB ──────────────────────────────────────────────────────
const ALL_TEAMS = Object.values(GROUPS).flatMap(g => g.teams).sort();

// Convert app team name → Zafronix API name
const toZName = t =>
  t==="Czechia"?"Czech Republic":
  t==="Bosnia & Herz."?"Bosnia and Herzegovina":
  t==="Ivory Coast"?"Côte d'Ivoire":
  t==="Turkiye"?"Turkey":
  t==="Curacao"?"Curaçao":
  t==="DR Congo"?"Congo DR":
  t==="United States"?"USA":
  t==="South Korea"?"Korea Republic":
  t==="Iran"?"IR Iran":
  t==="Cape Verde"?"Cabo Verde":
  t;

// Derive career stats from appearances array
function wcStats(appearances=[]) {
  const past = appearances.filter(a => a.year < 2026);
  const total = past.length;
  const titles = past.filter(a => a.finalPosition===1).length;
  const finals = past.filter(a => a.finalPosition<=2).length;
  const sf     = past.filter(a => a.finalPosition<=4).length;
  const goals  = past.reduce((s,a) => s+(a.goalsScored||0), 0);
  const gs_w   = past.reduce((s,a) => s+(a.groupStage?.won ?? a.groupStage?.w ?? 0), 0);
  const gs_d   = past.reduce((s,a) => s+(a.groupStage?.drawn ?? a.groupStage?.d ?? 0), 0);
  const gs_l   = past.reduce((s,a) => s+(a.groupStage?.lost ?? a.groupStage?.l ?? 0), 0);
  const gs_p   = gs_w+gs_d+gs_l;
  const best   = past.length ? Math.min(...past.map(a=>a.finalPosition||99)) : null;
  return { total, titles, finals, sf, goals, gs_w, gs_d, gs_l, gs_p, best };
}

// Position label for final standings
function posLabel2(pos) {
  if(!pos) return "—";
  if(pos===1) return "🏆 Champion";
  if(pos===2) return "🥈 Runner-up";
  if(pos===3||pos===4) return "🥉 Semi-final";
  if(pos<=8)  return "QF";
  if(pos<=16) return "R16";
  if(pos<=32) return "Group";
  return `${pos}th`;
}
function posColor2(pos) {
  if(!pos) return C.dim;
  if(pos===1) return C.gold;
  if(pos===2) return "#c0c0c0";
  if(pos<=4)  return C.green;
  if(pos<=8)  return C.blue;
  return C.dim;
}

function H2HBar({ label, v1, v2, color1=C.green, color2=C.red }) {
  const total=(v1||0)+(v2||0);
  const p1=total?Math.round((v1/total)*100):50;
  const p2=100-p1;
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.mid,marginBottom:4}}>
        <span style={{fontWeight:700,color:color1}}>{v1}</span>
        <span style={{color:C.dim,fontSize:10}}>{label}</span>
        <span style={{fontWeight:700,color:color2}}>{v2}</span>
      </div>
      <div style={{height:6,borderRadius:3,background:C.s2,overflow:"hidden",display:"flex"}}>
        <div style={{width:`${p1}%`,background:color1,transition:"width .5s"}}/>
        <div style={{width:`${p2}%`,background:color2,transition:"width .5s"}}/>
      </div>
    </div>
  );
}

// All-time top 3 World Cup scorers per team (historical data)
const WC_TOP_SCORERS = {
  "Brazil":       [{name:"Ronaldo",goals:15},{name:"Pelé",goals:12},{name:"Vavá",goals:9}],
  "Germany":      [{name:"Miroslav Klose",goals:16},{name:"Gerd Müller",goals:14},{name:"Helmut Rahn",goals:8}],
  "France":       [{name:"Just Fontaine",goals:13},{name:"Kylian Mbappé",goals:12},{name:"Thierry Henry",goals:6}],
  "Argentina":    [{name:"Lionel Messi",goals:13},{name:"Gabriel Batistuta",goals:10},{name:"Guillermo Stábile",goals:8}],
  "Spain":        [{name:"David Villa",goals:9},{name:"Fernando Morientes",goals:7},{name:"Fernando Torres",goals:5}],
  "England":      [{name:"Gary Lineker",goals:10},{name:"Harry Kane",goals:8},{name:"Geoff Hurst",goals:5}],
  "Netherlands":  [{name:"Rob Rensenbrink",goals:6},{name:"Johan Neeskens",goals:5},{name:"Dennis Bergkamp",goals:4}],
  "Portugal":     [{name:"Eusébio",goals:9},{name:"Cristiano Ronaldo",goals:8},{name:"Pauleta",goals:6}],
  "Uruguay":      [{name:"Héctor Scarone",goals:8},{name:"Pedro Petrone",goals:7},{name:"Óscar Míguez",goals:8}],
  "Belgium":      [{name:"Romelu Lukaku",goals:6},{name:"Marc Wilmots",goals:6},{name:"Jan Ceulemans",goals:5}],
  "Croatia":      [{name:"Davor Šuker",goals:6},{name:"Ivan Perišić",goals:6},{name:"Andrej Kramarić",goals:5}],
  "Mexico":       [{name:"Javier Hernández",goals:10},{name:"Luis Hernández",goals:7},{name:"Jared Borgetti",goals:7}],
  "United States":[{name:"Clint Dempsey",goals:5},{name:"Brian McBride",goals:5},{name:"Landon Donovan",goals:5}],
  "Morocco":      [{name:"Youssef En-Nesyri",goals:4},{name:"Salaheddine Bassir",goals:2},{name:"Mbark Boussoufa",goals:1}],
  "Japan":        [{name:"Kunishige Kamamoto",goals:9},{name:"Keisuke Honda",goals:4},{name:"Shinji Okazaki",goals:3}],
  "South Korea":  [{name:"Son Heung-min",goals:4},{name:"Ahn Jung-hwan",goals:3},{name:"Park Ji-sung",goals:3}],
  "Colombia":     [{name:"James Rodríguez",goals:6},{name:"Adolfo Valencia",goals:4},{name:"Radamel Falcao",goals:3}],
  "Norway":       [{name:"Jørgen Juve",goals:7},{name:"Gunnar Nordahl",goals:4},{name:"Einar Gundersen",goals:4}],
  "Switzerland":  [{name:"Josef Hügi",goals:6},{name:"André Abegglen",goals:6},{name:"Xherdan Shaqiri",goals:5}],
  "Senegal":      [{name:"Sadio Mané",goals:3},{name:"Papa Bouba Diop",goals:3},{name:"Henri Camara",goals:3}],
  "Ecuador":      [{name:"Enner Valencia",goals:4},{name:"Agustín Delgado",goals:3},{name:"Carlos Tenorio",goals:2}],
  "Australia":    [{name:"Tim Cahill",goals:5},{name:"John Aloisi",goals:2},{name:"Brett Emerton",goals:2}],
  "Iran":         [{name:"Ali Daei",goals:4},{name:"Mehdi Taremi",goals:3},{name:"Karim Bagheri",goals:3}],
  "Algeria":      [{name:"Riyad Mahrez",goals:3},{name:"Lakhdar Belloumi",goals:2},{name:"Rabah Madjer",goals:2}],
  "Ghana":        [{name:"Asamoah Gyan",goals:6},{name:"André Ayew",goals:3},{name:"Sulley Muntari",goals:2}],
  "Ivory Coast":  [{name:"Didier Drogba",goals:2},{name:"Gervinho",goals:1},{name:"Wilfried Bony",goals:1}],
  "Scotland":     [{name:"Kenny Dalglish",goals:6},{name:"Denis Law",goals:4},{name:"Scott McTominay",goals:3}],
  "Canada":       [{name:"Alphonso Davies",goals:2},{name:"Jonathan David",goals:1},{name:"Cyle Larin",goals:1}],
  "Turkiye":      [{name:"Hakan Şükür",goals:6},{name:"Tuncay Şanlı",goals:3},{name:"Hakan Çalhanoğlu",goals:2}],
};

// Single team WC history card
function unwrapTeam(data) {
  if (!data) return null;
  // Direct: { name, appearances, flag, ... }
  if (Array.isArray(data.appearances)) return data;
  // Nested under .team
  if (data.team && Array.isArray(data.team.appearances)) return data.team;
  // Nested under .data
  if (data.data && Array.isArray(data.data.appearances)) return data.data;
  // appearances exists but is not array (shouldn't happen)
  return data;
}

function TeamHistoryCard({ team, data, color }) {
  const d = unwrapTeam(data);
  if (!d) return (
    <div style={{padding:"20px 10px",textAlign:"center"}}>
      <div style={{fontSize:"1.6rem",marginBottom:6}}>📭</div>
      <div style={{fontSize:13,fontWeight:700,color,marginBottom:4}}>No data available</div>
      <div style={{fontSize:11,color:C.dim,lineHeight:1.6}}>{team}'s World Cup history isn't in our database yet.</div>
    </div>
  );
  const apps = d.appearances || [];
  if (apps.length === 0) return (
    <div style={{fontSize:12,color:C.dim,textAlign:"center",padding:"16px 0"}}>No World Cup history found</div>
  );
  const past = [...apps].filter(a=>a.year<2026).reverse();
  const st = wcStats(apps);
  const topScorers = WC_TOP_SCORERS[team] || [];

  return (
    <div>
      {/* Row 1: Appearances, Titles, Goals */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:5}}>
        {[
          ["Appearances", st.total,  C.blue],
          ["🏆 Titles",   st.titles, C.gold],
          ["Goals",       st.goals,  C.green],
        ].map(([lbl,val,col])=>(
          <div key={lbl} style={{background:C.s2,borderRadius:8,padding:"8px 4px",textAlign:"center",border:`1px solid ${C.b1}`}}>
            <div style={{fontSize:17,fontWeight:900,color:col,lineHeight:1.1}}>{val}</div>
            <div style={{fontSize:9,color:C.dim,marginTop:3,lineHeight:1.2}}>{lbl}</div>
          </div>
        ))}
      </div>
      {/* Row 2: Best Finish, Finals, Semi-finals */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:10}}>
        {[
          ["Best Finish", st.best ? posLabel2(st.best) : "—", posColor2(st.best)],
          ["Finals",      st.finals, C.mid],
          ["Semi-finals", st.sf,     C.mid],
        ].map(([lbl,val,col])=>(
          <div key={lbl} style={{background:C.s2,borderRadius:8,padding:"8px 4px",textAlign:"center",border:`1px solid ${C.b1}`}}>
            <div style={{fontSize:lbl==="Best Finish"?10:17,fontWeight:900,color:col,lineHeight:1.1}}>{val}</div>
            <div style={{fontSize:9,color:C.dim,marginTop:3,lineHeight:1.2}}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Top 3 all-time scorers */}
      {topScorers.length > 0 && (
        <div style={{marginBottom:10}}>
          <div style={{fontSize:9,color:C.dim,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:5}}>ALL-TIME TOP SCORERS</div>
          {topScorers.map((s,i) => (
            <div key={s.name} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:`1px solid ${C.b1}`}}>
              <span style={{fontSize:12,minWidth:18}}>{i===0?"🥇":i===1?"🥈":"🥉"}</span>
              <span style={{fontSize:12,color:C.text,flex:1}}>{s.name}</span>
              <span style={{fontSize:13,fontWeight:700,color}}>{s.goals}⚽</span>
            </div>
          ))}
        </div>
      )}

      {/* Group stage record */}
      <div style={{background:C.s2,borderRadius:8,padding:"7px 10px",marginBottom:10,border:`1px solid ${C.b1}`}}>
        <div style={{fontSize:9,color:C.dim,fontWeight:700,marginBottom:4}}>GROUP STAGE RECORD</div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontWeight:700,color:C.green,fontSize:12}}>{st.gs_w}W</span>
          <span style={{color:C.dim,fontSize:10}}>/</span>
          <span style={{fontWeight:700,color:C.gold,fontSize:12}}>{st.gs_d}D</span>
          <span style={{color:C.dim,fontSize:10}}>/</span>
          <span style={{fontWeight:700,color:C.red,fontSize:12}}>{st.gs_l}L</span>
          <span style={{fontSize:9,color:C.dim,marginLeft:2}}>({st.gs_p} played)</span>
        </div>
      </div>

      {/* Year-by-year */}
      <div style={{fontSize:9,color:C.dim,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:5}}>TOURNAMENT HISTORY</div>
      <div style={{maxHeight:240,overflowY:"auto",scrollbarWidth:"none"}}>
        {past.map(a=>{
          const gs = a.groupStage;
          const gw = gs ? (gs.won  ?? gs.w ?? 0) : 0;
          const gd = gs ? (gs.drawn ?? gs.d ?? 0) : 0;
          const gl = gs ? (gs.lost  ?? gs.l ?? 0) : 0;
          const gf = gs ? (gs.gf ?? gs.goalsFor ?? 0) : 0;
          const ga = gs ? (gs.ga ?? gs.goalsAgainst ?? 0) : 0;
          const pc = posColor2(a.finalPosition);
          return (
            <div key={a.year} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0",borderBottom:`1px solid ${C.b1}`}}>
              <span style={{fontSize:11,fontWeight:700,color:C.mid,minWidth:32}}>{a.year}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:700,color:pc}}>{posLabel2(a.finalPosition)}</div>
                {gs && <div style={{fontSize:9,color:C.dim}}>Grp {gs.group||"?"} · {gw}W {gd}D {gl}L · {gf}–{ga}</div>}
              </div>
              <div style={{fontSize:11,fontWeight:600,color:C.dim}}>{a.goalsScored||0}⚽</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



function H2HTab({ tabTop=116 }) {
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [d1, setD1] = useState(null);
  const [d2, setD2] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [fetchErr, setFetchErr] = useState("");

  const swap = () => { setTeam1(team2); setTeam2(team1); setD1(d2); setD2(d1); };

  const fetchBoth = useCallback(async () => {
    if(!team1||!team2||team1===team2) return;
    setLoading(true); setFetched(false); setD1(null); setD2(null); setFetchErr("");
    try {
      const [r1, r2] = await Promise.all([
        zafronixGet("team", { name: toZName(team1) }),
        zafronixGet("team", { name: toZName(team2) }),
      ]);
      setD1(r1); setD2(r2);
      if (!r1 && !r2) setFetchErr("Could not load World Cup history — the data service may be temporarily unavailable. Try again in a moment.");
      else if (!r1) setFetchErr(`Could not load history for ${team1} — try again in a moment.`);
      else if (!r2) setFetchErr(`Could not load history for ${team2} — try again in a moment.`);
    } catch(e) {
      setFetchErr(e.message);
    }
    setLoading(false); setFetched(true);
  }, [team1, team2]);

  const simOdds = useMemo(() => {
    if(!team1||!team2||team1===team2) return null;
    const N=10000; let w1=0,w2=0,d=0;
    for(let i=0;i<N;i++){const r=simMatch(team1,team2);if(r.res==="home")w1++;else if(r.res==="away")w2++;else d++;}
    return{win1:((w1/N)*100).toFixed(1),draw:((d/N)*100).toFixed(1),win2:((w2/N)*100).toFixed(1)};
  }, [team1, team2]);

  const poly1 = PREDS.find(p=>p.team===team1);
  const _h2hRef = useRef(null); const _h2hH = useElemHeight(_h2hRef);
  const poly2 = PREDS.find(p=>p.team===team2);
  const t1app = TEAMS[team1]; const t2app = TEAMS[team2];
  const st1 = wcStats(unwrapTeam(d1)?.appearances||[]);
  const st2 = wcStats(unwrapTeam(d2)?.appearances||[]);

  return (
    <div>
      {/* Fixed team selector */}
      <div ref={_h2hRef} style={{position:"fixed",top:tabTop,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:700,willChange:"transform",zIndex:90,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:`0 2px 8px rgba(0,0,0,0.8)`,padding:"8px 13px"}}>
        <div style={{fontWeight:700,color:C.green,fontSize:15,marginBottom:8}}>{"⚔️ COMPARE TEAMS HEAD TO HEAD"}</div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:team1&&team2&&team1!==team2?8:0}}>
          <div style={{flex:1}}>
            <select value={team1} onChange={e=>{setTeam1(e.target.value);setD1(null);setFetched(false);}} style={{width:"100%",padding:"7px 10px",background:C.s2,border:`1px solid ${C.b2}`,borderRadius:8,color:C.text,fontSize:13,outline:"none"}}>
              <option value="">Team 1…</option>
              {ALL_TEAMS.map(t=><option key={t} value={t}>{getFlag(t)} {t}</option>)}
            </select>
          </div>
          <button onClick={swap} style={{padding:"7px 10px",background:C.b1,border:`1px solid ${C.b2}`,borderRadius:8,color:C.mid,fontSize:16,cursor:"pointer",flexShrink:0}}>⇄</button>
          <div style={{flex:1}}>
            <select value={team2} onChange={e=>{setTeam2(e.target.value);setD2(null);setFetched(false);}} style={{width:"100%",padding:"7px 10px",background:C.s2,border:`1px solid ${C.b2}`,borderRadius:8,color:C.text,fontSize:13,outline:"none"}}>
              <option value="">Team 2…</option>
              {ALL_TEAMS.map(t=><option key={t} value={t}>{getFlag(t)} {t}</option>)}
            </select>
          </div>
        </div>
        {team1&&team2&&team1!==team2 && (
          <button onClick={fetchBoth} disabled={loading} style={{width:"100%",padding:"9px 0",borderRadius:10,background:`linear-gradient(135deg,${C.green},#22c55e)`,border:"none",color:"#030a05",fontWeight:700,fontSize:13,cursor:"pointer",opacity:loading?0.6:1}}>
            {loading ? "Loading…" : "📜 Load World Cup History"}
          </button>
        )}
      </div>
      <div style={{height:(_h2hH||72)+8}}/>

      {/* Simulated match odds — always shown */}
      {team1!==team2 && simOdds && (
        <Card style={{marginBottom:12}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.b1}`}}>
            <span style={{fontWeight:700,color:C.gold,fontSize:13}}>🎮 SIMULATED ODDS · 10,000 RUNS</span>
          </div>
          <div style={{padding:14}}>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              <div style={{flex:1,textAlign:"center",padding:"10px 6px",background:`${C.green}18`,border:`1px solid ${C.green}44`,borderRadius:10}}>
                <div style={{fontSize:10,color:C.dim,marginBottom:3}}>{getFlag(team1)} {team1}</div>
                <div style={{fontWeight:900,fontSize:24,color:C.green}}>{simOdds.win1}%</div>
                <div style={{fontSize:10,color:C.dim}}>Win</div>
              </div>
              <div style={{flex:1,textAlign:"center",padding:"10px 6px",background:`${C.gold}18`,border:`1px solid ${C.gold}44`,borderRadius:10}}>
                <div style={{fontSize:10,color:C.dim,marginBottom:3}}>Draw</div>
                <div style={{fontWeight:900,fontSize:24,color:C.gold}}>{simOdds.draw}%</div>
                <div style={{fontSize:10,color:C.dim}}>90 mins</div>
              </div>
              <div style={{flex:1,textAlign:"center",padding:"10px 6px",background:`${C.red}18`,border:`1px solid ${C.red}44`,borderRadius:10}}>
                <div style={{fontSize:10,color:C.dim,marginBottom:3}}>{getFlag(team2)} {team2}</div>
                <div style={{fontWeight:900,fontSize:24,color:C.rival}}>{simOdds.win2}%</div>
                <div style={{fontSize:10,color:C.dim}}>Win</div>
              </div>
            </div>
            <H2HBar label="Team Strength" v1={gs(team1)} v2={gs(team2)} color1={C.green} color2={C.rival}/>
            {t1app&&t2app&&<>
              <H2HBar label="Attack"   v1={t1app.stats.ATT} v2={t2app.stats.ATT} color1={C.green} color2={C.rival}/>
              <H2HBar label="Midfield" v1={t1app.stats.MID} v2={t2app.stats.MID} color1={C.green} color2={C.rival}/>
              <H2HBar label="Defence"  v1={t1app.stats.DEF} v2={t2app.stats.DEF} color1={C.green} color2={C.rival}/>
              <H2HBar label="Fitness"  v1={t1app.stats.FIT} v2={t2app.stats.FIT} color1={C.green} color2={C.rival}/>
            </>}
          </div>
        </Card>
      )}

      {/* Polymarket */}
      {team1!==team2 && (poly1||poly2) && (
        <Card style={{marginBottom:12}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.b1}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,color:C.green,fontSize:13}}>🎯 POLYMARKET · WORLD CUP WINNER</span>
              <a href="https://polymarket.com/event/world-cup-winner" target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:C.green,textDecoration:"none",border:`1px solid ${C.greenS}`,padding:"3px 9px",borderRadius:20,fontWeight:600}}>Trade →</a>
            </div>
          </div>
          <div style={{padding:12,display:"flex",gap:10}}>
            {poly1&&<a href="https://polymarket.com/event/world-cup-winner" target="_blank" rel="noopener noreferrer" style={{flex:1,textDecoration:"none"}}><div style={{textAlign:"center",padding:"10px 6px",background:`${C.green}18`,border:`1px solid ${C.green}44`,borderRadius:10}}><div style={{fontSize:10,color:C.mid,marginBottom:3}}>{getFlag(team1)} {team1}</div><div style={{fontWeight:900,fontSize:24,color:C.green}}>{poly1.poly}%</div><div style={{fontSize:10,color:C.dim}}>{poly1.odds}</div></div></a>}
            {poly2&&<a href="https://polymarket.com/event/world-cup-winner" target="_blank" rel="noopener noreferrer" style={{flex:1,textDecoration:"none"}}><div style={{textAlign:"center",padding:"10px 6px",background:`${C.rival}18`,border:`1px solid ${C.rival}44`,borderRadius:10}}><div style={{fontSize:10,color:C.mid,marginBottom:3}}>{getFlag(team2)} {team2}</div><div style={{fontWeight:900,fontSize:24,color:C.rival}}>{poly2.poly}%</div><div style={{fontSize:10,color:C.dim}}>{poly2.odds}</div></div></a>}
          </div>
        </Card>
      )}

      {/* Loading spinner */}
      {loading && (
        <div style={{textAlign:"center",padding:"32px 0"}}>
          <div style={{width:28,height:28,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 10px"}}/>
          <div style={{fontSize:13,color:C.mid}}>Fetching World Cup histories…</div>
        </div>
      )}

      {/* Fetch error — shown as info, not crash */}
      {fetched && fetchErr && (
        <div style={{background:`${C.gold}12`,border:`1px solid ${C.gold}33`,borderRadius:10,padding:12,marginBottom:12}}>
          <div style={{fontSize:13,color:C.gold}}>ℹ️ {fetchErr}</div>
        </div>
      )}

      {/* Side-by-side World Cup history */}
      {fetched && !loading && (
        <div>
          {/* Career stat bars — only when BOTH teams have data */}
          {(d1 && d2) && (
            <Card style={{marginBottom:12}}>
              <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.b1}`}}>
                <span style={{fontWeight:700,color:C.green,fontSize:13}}>📊 WORLD CUP CAREER COMPARISON</span>
              </div>
              {/* Team name header */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 90px 1fr",padding:"10px 14px 6px",borderBottom:`1px solid ${C.b1}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}><Crest team={team1} size={22}/><span style={{fontWeight:700,color:C.green,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{team1}</span></div>
                <div/>
                <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}><span style={{fontWeight:700,color:C.rival,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{team2}</span><Crest team={team2} size={22}/></div>
              </div>
              <div style={{padding:"10px 14px"}}>
                <H2HBar label="World Cup Appearances"  v1={st1.total}  v2={st2.total}  color1={C.green} color2={C.rival}/>
                <H2HBar label="🏆 Titles"        v1={st1.titles} v2={st2.titles} color1={C.green} color2={C.rival}/>
                <H2HBar label="Finals reached"   v1={st1.finals} v2={st2.finals} color1={C.green} color2={C.rival}/>
                <H2HBar label="Semi-finals"      v1={st1.sf}     v2={st2.sf}     color1={C.green} color2={C.rival}/>
                <H2HBar label="Goals scored"     v1={st1.goals}  v2={st2.goals}  color1={C.green} color2={C.rival}/>
                <H2HBar label="Group stage wins" v1={st1.gs_w}   v2={st2.gs_w}   color1={C.green} color2={C.rival}/>
              </div>
            </Card>
          )}

          {/* Side-by-side tournament history */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {[{team:team1,data:d1,color:C.green},{team:team2,data:d2,color:C.rival}].map(({team,data,color})=>(
              <Card key={team}>
                <div style={{padding:"10px 12px",borderBottom:`1px solid ${C.b1}`,display:"flex",alignItems:"center",gap:8,background:C.s1}}>
                  <Crest team={team} size={26}/>
                  <span style={{fontWeight:700,color,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1}}>{team}</span>
                </div>
                <div style={{padding:"8px 10px"}}>
                  {data
                    ? <TeamHistoryCard team={team} data={data} color={color}/>
                    : <div style={{fontSize:12,color:C.dim,textAlign:"center",padding:"16px 0"}}>No data available</div>
                  }
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── DRAG-TO-REORDER LIST ──────────────────────────────────────────────────
// Works on mobile (touch) and desktop (mouse) via unified Pointer Events API.
function DragList({ items, onReorder, renderItem }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const itemHeight = useRef(0);
  const containerRef = useRef(null);
  const listRef = useRef(items);
  listRef.current = items;

  const handlePointerDown = (e, idx) => {
    // Only trigger on the drag handle (≡ icon)
    e.currentTarget.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    itemHeight.current = e.currentTarget.closest("[data-dragitem]")?.offsetHeight || 56;
    setDragIdx(idx);
    setOverIdx(idx);
    setDragging(false);
  };

  const handlePointerMove = (e, idx) => {
    if (dragIdx === null || dragIdx !== idx) return;
    const delta = e.clientY - startY.current;
    if (Math.abs(delta) > 4) setDragging(true);
    const newIdx = Math.max(0, Math.min(listRef.current.length - 1,
      idx + Math.round(delta / itemHeight.current)
    ));
    setOverIdx(newIdx);
  };

  const handlePointerUp = (e, idx) => {
    if (dragIdx === null) return;
    if (dragging && overIdx !== null && overIdx !== dragIdx) {
      const next = [...listRef.current];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(overIdx, 0, moved);
      onReorder(next);
    }
    setDragIdx(null);
    setOverIdx(null);
    setDragging(false);
  };

  // Build display order with drag preview
  const displayed = [...items];
  if (dragging && dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
    const [moved] = displayed.splice(dragIdx, 1);
    displayed.splice(overIdx, 0, moved);
  }

  return (
    <div ref={containerRef}>
      {displayed.map((item, displayIdx) => {
        const origIdx = items.indexOf(item);
        const isDragged = dragging && origIdx === dragIdx;
        return (
          <div
            key={item}
            data-dragitem="1"
            style={{
              display:"flex", alignItems:"center", gap:8,
              padding:"8px 6px", borderRadius:10, marginBottom:3,
              background: isDragged ? `${C.green}18` : displayIdx < 2 ? `${["",C.green,C.gold,"#94a3b8",C.dim][displayIdx+1]||C.dim}08` : "transparent",
              border: `1px solid ${isDragged ? C.green : displayIdx < 2 ? `${[C.green,C.gold][displayIdx]}33` : "transparent"}`,
              opacity: isDragged ? 0.85 : 1,
              transition: dragging ? "none" : "all .15s",
              boxShadow: isDragged ? `0 4px 20px rgba(0,0,0,0.4)` : "none",
              transform: isDragged ? "scale(1.01)" : "scale(1)",
            }}
          >
            {renderItem(item, displayIdx)}
            {/* Drag handle */}
            <div
              onPointerDown={e => handlePointerDown(e, origIdx)}
              onPointerMove={e => handlePointerMove(e, origIdx)}
              onPointerUp={e => handlePointerUp(e, origIdx)}
              onPointerCancel={e => handlePointerUp(e, origIdx)}
              style={{
                width:36, height:44, display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"grab", flexShrink:0, touchAction:"none", userSelect:"none",
                color: C.dim, fontSize:18, letterSpacing:"-1px",
              }}
            >⠿</div>
          </div>
        );
      })}
    </div>
  );
}

// ── MY BRACKET TAB ────────────────────────────────────────────────────────
const defaultBracketGroups=()=>Object.fromEntries(Object.entries(GROUPS).map(([g,{teams}])=>[g,[...teams]]));
function BracketMatchup({ match, t1, t2, winner, onPick, interactive=false, compact=false }) {
  const canPick = interactive && t1 && t2 && t1 !== "TBD" && t2 !== "TBD";
  const teamRow = (team, i) => {
    const isW = winner && team === winner;
    const disabled = !canPick || !team || team === "TBD";
    return (
      <button
        key={i}
        onClick={() => !disabled && onPick?.(team)}
        disabled={disabled}
        title={canPick ? `Pick ${team}` : undefined}
        style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:compact?"7px 8px":"10px 10px",background:isW?`${C.green}24`:"transparent",border:"none",borderBottom:i===0?`1px solid ${C.b1}`:"none",cursor:canPick?"pointer":"default",textAlign:"left",opacity:team?1:0.65}}
      >
        <Crest team={team||"TBD"} size={compact?16:22}/>
        <span style={{fontSize:compact?12:14,color:isW?C.green:team?C.text:C.dim,fontWeight:isW?800:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}}>{team||"TBD"}</span>
        {isW && <span style={{fontSize:12,color:C.green,fontWeight:900}}>✓</span>}
      </button>
    );
  };
  return (
    <div style={{position:"relative",background:`linear-gradient(135deg,${C.s1},${C.s2})`,border:`1px solid ${winner?C.greenS:C.b1}`,borderRadius:12,overflow:"hidden",width:"100%",boxShadow:winner?`0 0 0 1px ${C.greenS}, 0 8px 20px rgba(0,0,0,0.25)`:"0 5px 16px rgba(0,0,0,0.22)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",borderBottom:`1px solid ${C.b1}`,background:`${C.gold}10`}}>
        <span style={{fontSize:10,color:C.gold,fontWeight:900,letterSpacing:"0.08em"}}>M{match || "—"}</span>
        {interactive && <span style={{fontSize:9,color:canPick?C.green:C.dim,fontWeight:800}}>{canPick?"TAP PICK":"LOCKED"}</span>}
      </div>
      {teamRow(t1,0)}
      {teamRow(t2,1)}
    </div>
  );
}

function WideBracketView({ rounds, matchesById, bracket, pickMode="auto", onPick=()=>{}, completedCount=0 }) {
  // Official FIFA 2026 knockout path, arranged visually around the Final.
  // Left side feeds M101; right side feeds M102.
  const left = [
    {key:"r32L", short:"R32", label:"Round of 32", ids:[74,77,73,75,83,84,81,82], gap:8, padTop:0},
    {key:"r16L", short:"R16", label:"Round of 16", ids:[89,90,93,94], gap:70, padTop:38},
    {key:"qfL", short:"QF", label:"Quarterfinals", ids:[97,98], gap:224, padTop:130},
    {key:"sfL", short:"SF", label:"Semifinal", ids:[101], gap:0, padTop:318},
  ];
  const right = [
    {key:"sfR", short:"SF", label:"Semifinal", ids:[102], gap:0, padTop:318},
    {key:"qfR", short:"QF", label:"Quarterfinals", ids:[99,100], gap:224, padTop:130},
    {key:"r16R", short:"R16", label:"Round of 16", ids:[91,92,95,96], gap:70, padTop:38},
    {key:"r32R", short:"R32", label:"Round of 32", ids:[76,78,79,80,86,88,85,87], gap:8, padTop:0},
  ];

  const columnWidth = 166;
  const connector = (side, m, kind) => ({
    position:"absolute",
    [side]:-16,
    top:"50%",
    width:16,
    borderTop:`2px solid ${m.winner?C.greenS:C.b2}`,
    opacity:m.home&&m.away?1:0.35
  });

  const renderColumn = (round, side="left") => {
    const ids = round.ids || [];
    return (
      <div key={round.key} style={{width:columnWidth,flex:`0 0 ${columnWidth}px`,paddingTop:round.padTop}}>
        <div style={{position:"sticky",top:0,zIndex:2,textAlign:"center",marginBottom:10,background:`linear-gradient(135deg,${C.s1},${C.s2})`,border:`1px solid ${C.b1}`,borderRadius:999,padding:"6px 8px",boxShadow:"0 6px 14px rgba(0,0,0,0.25)"}}>
          <div style={{fontSize:10,fontWeight:900,color:round.short==="FINAL"?C.gold:C.green,letterSpacing:"0.08em"}}>{round.short}</div>
          <div style={{fontSize:9,color:C.dim,whiteSpace:"nowrap"}}>{round.label}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:round.gap}}>
          {ids.map((id) => {
            const m = matchesById[id] || {match:id,home:null,away:null,winner:null};
            const locked = !(m.home && m.away);
            return (
              <div key={id} style={{position:"relative",opacity:locked?0.58:1}}>
                {side === "left" && round.key !== "sfL" && <div style={connector("right", m)}/>}
                {side === "left" && round.key !== "r32L" && <div style={connector("left", m)}/>}
                {side === "right" && round.key !== "sfR" && <div style={connector("left", m)}/>}
                {side === "right" && round.key !== "r32R" && <div style={connector("right", m)}/>}
                <BracketMatchup match={m.match} t1={m.home} t2={m.away} winner={m.winner} interactive={pickMode==="manual"} onPick={(team)=>onPick(m,team)}/>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const finalMatch = matchesById[104] || (bracket?.final || [])[0] || {match:104,home:null,away:null,winner:null};

  return (
    <div style={{width:"100%",maxWidth:"100%",overflow:"hidden"}}>
      <div style={{marginBottom:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
        <div>
          <div style={{fontSize:10,color:C.gold,fontWeight:900,letterSpacing:"0.14em"}}>TOURNAMENT TREE</div>
          <div style={{fontSize:12,color:C.mid,marginTop:3}}>Swipe horizontally to follow the knockout path.</div>
        </div>
        <div style={{fontSize:10,color:C.dim,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:999,padding:"4px 8px",whiteSpace:"nowrap"}}>{completedCount}/31 picked</div>
      </div>
      <div style={{width:"100%",overflowX:"auto",overflowY:"hidden",WebkitOverflowScrolling:"touch",padding:"6px 0 18px",scrollPaddingLeft:24,overscrollBehaviorX:"contain"}}>
        <div style={{minWidth:1380,width:"max-content",padding:"6px 32px 14px 24px",margin:"0 auto"}}>
          <div style={{display:"flex",gap:16,alignItems:"flex-start",justifyContent:"center"}}>
            {left.map(r => renderColumn(r,"left"))}
            <div style={{width:190,flex:"0 0 190px",paddingTop:286,display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
              <div style={{fontSize:46,lineHeight:1,filter:"drop-shadow(0 10px 18px rgba(0,0,0,0.45))"}}>🏆</div>
              <div style={{fontSize:10,color:C.gold,fontWeight:900,letterSpacing:"0.14em",margin:"5px 0 10px"}}>FINAL</div>
              <div style={{position:"relative"}}>
                <div style={{position:"absolute",left:-16,top:"50%",width:16,borderTop:`2px solid ${finalMatch.winner?C.greenS:C.b2}`}}/>
                <div style={{position:"absolute",right:-16,top:"50%",width:16,borderTop:`2px solid ${finalMatch.winner?C.greenS:C.b2}`}}/>
                <BracketMatchup match={104} t1={finalMatch.home} t2={finalMatch.away} winner={finalMatch.winner} interactive={pickMode==="manual"} onPick={(team)=>onPick(finalMatch,team)}/>
              </div>
              <div style={{marginTop:14,background:`linear-gradient(135deg,${C.green}22,${C.gold}18)`,border:`1px solid ${bracket?.champion?C.greenS:C.gold}66`,borderRadius:16,padding:12,minWidth:168,textAlign:"center",boxShadow:"0 10px 26px rgba(0,0,0,0.28)"}}>
                <div style={{fontSize:9,color:C.dim,fontWeight:900,letterSpacing:"0.12em",marginBottom:6}}>CHAMPION</div>
                {bracket?.champion ? <><Crest team={bracket.champion} size={44}/><div style={{fontWeight:900,fontSize:15,color:C.green,marginTop:6}}>{bracket.champion}</div></> : <div style={{fontSize:12,color:C.dim,lineHeight:1.5}}>Pick the Final winner</div>}
              </div>
            </div>
            {right.map(r => renderColumn(r,"right"))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualBracketTree({ bracket, pickMode="auto", onPick=()=>{}, view="compact" }) {
  const byId = (matches=[]) => Object.fromEntries((matches||[]).map(m => [Number(m.match), m]));
  const matchesById = {
    ...byId(bracket?.r32),
    ...byId(bracket?.r16),
    ...byId(bracket?.qf),
    ...byId(bracket?.sf),
    ...byId(bracket?.final),
  };

  const rounds = [
    {key:"r32", short:"R32", label:"Round of 32", ids:[73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88]},
    {key:"r16", short:"R16", label:"Round of 16", ids:[89,90,91,92,93,94,95,96]},
    {key:"qf", short:"QF", label:"Quarterfinals", ids:[97,98,99,100]},
    {key:"sf", short:"SF", label:"Semifinals", ids:[101,102]},
    {key:"final", short:"FINAL", label:"Final", ids:[104]},
  ];

  const finalMatch = matchesById[104] || (bracket?.final || [])[0] || {match:104,home:null,away:null,winner:null};
  const completedCount = Object.values(matchesById).filter(m => m?.winner).length;

  if (view === "tree") {
    return <WideBracketView rounds={rounds} matchesById={matchesById} bracket={bracket} pickMode={pickMode} onPick={onPick} completedCount={completedCount}/>;
  }

  return (
    <div style={{width:"100%",maxWidth:"100%",overflow:"hidden"}}>
      <div style={{textAlign:"center",marginBottom:14,background:`linear-gradient(135deg,${C.s1},${C.s2})`,border:`1px solid ${C.b1}`,borderRadius:16,padding:14}}>
        <div style={{fontSize:34,lineHeight:1,filter:"drop-shadow(0 8px 14px rgba(0,0,0,0.35))"}}>🏆</div>
        <div style={{fontSize:10,color:C.gold,fontWeight:900,letterSpacing:"0.14em",marginTop:6}}>WORLD CUP PATH</div>
        <div style={{fontSize:12,color:C.mid,marginTop:5,lineHeight:1.45}}>
          {bracket?.champion
            ? <>Champion selected: <strong style={{color:C.green}}>{getFlag(bracket.champion)} {bracket.champion}</strong></>
            : <>Select winners round by round. New matchups unlock automatically.</>}
        </div>
        <div style={{fontSize:10,color:C.dim,marginTop:8}}>{completedCount} of 31 knockout winners selected</div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        {rounds.map(round => {
          const matches = round.ids.map(id => matchesById[id] || {match:id,home:null,away:null,winner:null});
          const unlocked = matches.filter(m => m.home && m.away).length;
          return (
            <section key={round.key} style={{background:`linear-gradient(180deg,${C.s1},transparent)`,border:`1px solid ${C.b1}`,borderRadius:16,padding:12,overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:10}}>
                <div>
                  <div style={{fontSize:11,fontWeight:900,color:round.key==="final"?C.gold:C.green,letterSpacing:"0.12em"}}>{round.short}</div>
                  <div style={{fontSize:16,fontWeight:900,color:C.text}}>{round.label}</div>
                </div>
                <div style={{fontSize:10,color:C.dim,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:999,padding:"4px 8px",whiteSpace:"nowrap"}}>{unlocked}/{matches.length} unlocked</div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:10}}>
                {matches.map(m => {
                  const locked = !(m.home && m.away);
                  return (
                    <div key={m.match} style={{opacity:locked?0.55:1,position:"relative"}}>
                      <BracketMatchup match={m.match} t1={m.home} t2={m.away} winner={m.winner} interactive={pickMode==="manual"} onPick={(team)=>onPick(m,team)}/>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div style={{marginTop:16,background:`linear-gradient(135deg,${C.green}22,${C.gold}18)`,border:`1px solid ${bracket?.champion?C.greenS:C.gold}66`,borderRadius:18,padding:16,textAlign:"center",boxShadow:"0 10px 26px rgba(0,0,0,0.28)"}}>
        <div style={{fontSize:9,color:C.dim,fontWeight:900,letterSpacing:"0.15em",marginBottom:8}}>CHAMPION</div>
        {bracket?.champion ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
            <Crest team={bracket.champion} size={46}/>
            <div style={{textAlign:"left"}}>
              <div style={{fontWeight:900,fontSize:22,color:C.green}}>{bracket.champion}</div>
              <div style={{fontSize:12,color:C.mid}}>Your World Cup winner</div>
            </div>
          </div>
        ) : (
          <div style={{fontSize:13,color:C.mid,lineHeight:1.5}}>Pick the Final winner to crown your champion.</div>
        )}
      </div>
    </div>
  );
}

const MY_BRACKET_STORAGE_KEY = "wc2026_my_bracket_v1";

function readSavedMyBracket() {
  try {
    const raw = localStorage.getItem(MY_BRACKET_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSavedMyBracket(state) {
  try {
    localStorage.setItem(MY_BRACKET_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("wc2026_my_bracket_changed", { detail: state }));
  } catch {}
}

function restoreSavedMyBracket(state) {
  try {
    if (state && Object.keys(state).length) {
      localStorage.setItem(MY_BRACKET_STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(MY_BRACKET_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent("wc2026_my_bracket_synced", { detail: state || {} }));
    window.dispatchEvent(new CustomEvent("wc2026_my_bracket_changed", { detail: state || {} }));
  } catch {}
}

function clearSavedMyBracket() {
  try {
    localStorage.removeItem(MY_BRACKET_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("wc2026_my_bracket_changed", { detail: {} }));
  } catch {}
}

function MyBracketTab({ tabTop=116 }) {
  const savedBracket = useMemo(() => readSavedMyBracket(), []);
  const isMobileBracket = typeof window !== "undefined" && window.innerWidth < 520;
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
  const [annexStatus,setAnnexStatus]=useState({state:"loading",message:"Loading FIFA Annex C table..."});
  const allThirds=Object.entries(groups).map(([g,teams])=>({group:g,team:teams[2]}));
  const toggleThird=(t)=>{setThirds(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t].slice(0,8));};
  const _mbhRef = useRef(null); const _mbhH = useElemHeight(_mbhRef);

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
    let alive=true;
    setAnnexStatus({state:"loading",message:"Loading FIFA Annex C table..."});
    loadAnnexCFromRemote()
      .then(table=>{
        if(!alive) return;
        setAnnexStatus({state:"ready",message:`FIFA Annex C loaded (${Object.keys(table).length} combinations).`});
      })
      .catch(err=>{
        if(!alive) return;
        console.warn("Unable to load FIFA Annex C table:", err);
        setAnnexStatus({state:"error",message:"FIFA Annex C could not be loaded. Brackets will use legacy fallback until the table is available."});
      });
    return()=>{alive=false};
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
      const qualifiedThirds = buildQualifiedThirdsFromSelectedTeams(groups, thirds);
      let thirdGroupsKey = "";
      try { thirdGroupsKey = buildThirdGroupsKey(groups, thirds); } catch(e) { thirdGroupsKey = ""; }

      console.log("Qualified third-place teams:", qualifiedThirds);
      console.log("Annex C group key:", thirdGroupsKey);

      let r32=[];
      let roundTemplates=null;
      let fifaEngineStatus="fifa-fallback";
      let fifaEngineMessage=annexStatus.state==="ready"
        ? "Official FIFA bracket rules could not be resolved."
        : "Official FIFA bracket rules are still loading.";

      try {
        const fifaBracket = buildFifa2026Bracket({ groups, qualifiedThirds });
        r32 = fifaBracket.r32.map(m => ({...m, winner:null}));
        roundTemplates = {
          r16: fifaBracket.r16,
          qf: fifaBracket.qf,
          sf: fifaBracket.sf,
          final: fifaBracket.final
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

  const handleManualPick = (match, team) => {
    if (playMode !== "manual" || !match?.match || !team || team === "TBD") return;
    setManualPicks(prev => {
      const next = {...prev, [match.match]: team};
      const m = Number(match.match);
      const cutoff = m < 89 ? 89 : m < 97 ? 97 : m < 101 ? 101 : m < 104 ? 104 : 105;
      Object.keys(next).forEach(k => { if (Number(k) >= cutoff) delete next[k]; });
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
      <div ref={_mbhRef} style={{position:"fixed",top:tabTop,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:700,willChange:"transform",zIndex:90,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:`0 2px 8px rgba(0,0,0,0.8)`,padding:isMobileBracket?"7px 8px":"8px 13px"}}>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <button onClick={()=>setBracketMode("simulation")} style={{flex:1,padding:"7px 8px",borderRadius:10,cursor:"pointer",background:bracketMode==="simulation"?`${C.green}22`:C.s1,border:`1px solid ${bracketMode==="simulation"?C.green:C.b1}`,color:bracketMode==="simulation"?C.green:C.mid,fontWeight:700,fontSize:12}}>🎮 Free Simulation</button>
          <button disabled title="Official mode will use live standings after the next integration step" style={{flex:1,padding:"7px 8px",borderRadius:10,cursor:"not-allowed",background:C.s1,border:`1px solid ${C.b1}`,color:C.dim,fontWeight:700,fontSize:12,opacity:0.65}}>🌐 Official Bracket · Soon</button>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,minWidth:0}}>
          <div style={{display:"flex",gap:6,flex:"1 1 auto",minWidth:0,overflowX:"auto",scrollbarWidth:"none",WebkitOverflowScrolling:"touch",paddingBottom:1}}>
            <Pill active={stage==="groups"} onClick={()=>setStage("groups")} color={C.green}>1 · Set Groups</Pill>
            <Pill active={stage==="thirds"} onClick={()=>setStage("thirds")} color={C.gold}>2 · Pick 3rds</Pill>
            <Pill active={stage==="bracket"} onClick={()=>setStage("bracket")} color={C.blue}>3 · Bracket</Pill>
          </div>
          {stage==="bracket" && result?.thirdGroupsKey && (
            <div style={{flex:"0 0 auto",fontSize:isMobileBracket?8:9,color:result.fifaEngineStatus==="fifa-ready"?C.green:C.gold,fontWeight:900,letterSpacing:"0.02em",background:result.fifaEngineStatus==="fifa-ready"?`${C.green}18`:`${C.gold}18`,border:`1px solid ${result.fifaEngineStatus==="fifa-ready"?C.greenS:C.gold}55`,borderRadius:999,padding:isMobileBracket?"5px 7px":"5px 8px",whiteSpace:"nowrap",maxWidth:isMobileBracket?86:240,overflow:"hidden",textOverflow:"ellipsis"}}>
              {result.fifaEngineStatus==="fifa-ready"?(isMobileBracket?"🏆 Ready":"🏆 FIFA 2026 Bracket Generated"):(isMobileBracket?"⚠️ Fallback":"⚠️ Fallback Bracket")}
            </div>
          )}
        </div>
      </div>
      
      <div style={{height:(_mbhH||72)+8}}/>
      {stage==="groups" && (
        <div>
          <div style={{fontSize:12,color:C.mid,marginBottom:14,lineHeight:1.6}}>
            <strong style={{color:C.green}}>Free Simulation:</strong> press and drag <span style={{color:C.dim,fontSize:14}}>⠿</span> to reorder teams. Top 2 qualify automatically. Generate the bracket, then tap winners match by match.
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
                        <span style={{fontSize:13,color:displayIdx<2?col:C.text,fontWeight:displayIdx<2?600:400,flex:1}}>{team}</span>
                        {displayIdx<2 && <span style={{fontSize:9,color:col,fontWeight:700,background:`${col}22`,padding:"2px 6px",borderRadius:6,flexShrink:0}}>Q</span>}
                        {displayIdx===2 && <span style={{fontSize:9,color:"#94a3b8",background:"#94a3b822",padding:"2px 6px",borderRadius:6,flexShrink:0}}>3rd</span>}
                      </>
                    );
                  }}
                />
              </div>
            </Card>
          ))}
          <button onClick={()=>setStage("thirds")} style={{width:"100%",padding:"12px 0",borderRadius:12,background:`linear-gradient(135deg,${C.gold},#f59e0b)`,border:"none",color:"#030a05",fontWeight:700,fontSize:15,cursor:"pointer",marginTop:4}}>Pick Best 3rd-Place Teams →</button>
        </div>
      )}
      {stage==="thirds" && (
        <div>
          <div style={{fontSize:12,color:C.mid,marginBottom:6,lineHeight:1.6}}>Select exactly <strong style={{color:C.gold}}>8 of 12</strong> third-place teams to advance.</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <span style={{fontSize:13,color:thirds.length===8?C.green:C.gold,fontWeight:700}}>{thirds.length}/8 selected</span>
            <button onClick={()=>{const sorted=[...allThirds].sort((a,b)=>gs(b.team)-gs(a.team)).slice(0,8).map(x=>x.team);setThirds(sorted);}} style={{fontSize:11,padding:"4px 10px",borderRadius:10,background:`${C.gold}22`,border:`1px solid ${C.gold}55`,color:C.gold,cursor:"pointer",fontWeight:600}}>Auto-select best 8</button>
          </div>
          {allThirds.map(({group,team})=>{const sel=thirds.includes(team);return(<div key={team} onClick={()=>toggleThird(team)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,marginBottom:6,cursor:"pointer",background:sel?`${C.green}18`:C.s1,border:`1px solid ${sel?C.green:C.b1}`}}><div style={{width:20,height:20,borderRadius:6,border:`2px solid ${sel?C.green:C.dim}`,background:sel?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sel&&<span style={{color:"#030a05",fontSize:12,fontWeight:900}}>✓</span>}</div><Crest team={team} size={24}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:sel?C.green:C.text}}>{team}</div><div style={{fontSize:10,color:C.dim}}>3rd place Group {group} · STR {gs(team)}</div></div></div>);})}
          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button onClick={()=>setStage("groups")} style={{flex:1,padding:"11px 0",borderRadius:12,background:"transparent",border:`1px solid ${C.b2}`,color:C.mid,fontWeight:600,fontSize:14,cursor:"pointer"}}>← Back</button>
            <button onClick={runBracket} disabled={thirds.length!==8||running} style={{flex:2,padding:"11px 0",borderRadius:12,background:thirds.length===8?`linear-gradient(135deg,${C.green},#22c55e)`:C.b2,border:"none",color:thirds.length===8?"#030a05":C.dim,fontWeight:700,fontSize:14,cursor:thirds.length===8?"pointer":"default",opacity:running?0.6:1}}>{running?"Generating...":"🏆 Generate FIFA Bracket →"}</button>
          </div>
        </div>
      )}
      {stage==="bracket" && result && (
        <div>
          <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
            <button onClick={()=>setStage("groups")} style={{padding:"7px 12px",borderRadius:10,background:"transparent",border:`1px solid ${C.b2}`,color:C.mid,fontSize:12,cursor:"pointer"}}>← Edit</button>
            <button onClick={resetWinners} style={{padding:"7px 12px",borderRadius:10,background:`${C.green}22`,border:`1px solid ${C.greenS}`,color:C.green,fontSize:12,fontWeight:700,cursor:"pointer"}}>🔄 Reset Winners</button>
            <button onClick={resetMyBracket} style={{padding:"7px 12px",borderRadius:10,background:`${C.gold}12`,border:`1px solid ${C.gold}44`,color:C.gold,fontSize:12,fontWeight:700,cursor:"pointer"}}>🗑 Reset Bracket</button>
            <button onClick={shareBracketCard} disabled={!displayedResult?.champion || sharing} title={!displayedResult?.champion?"Pick the Final winner before sharing":undefined} style={{padding:"7px 12px",borderRadius:10,background:displayedResult?.champion?`${C.blue}22`:C.s1,border:`1px solid ${displayedResult?.champion?C.blue:C.b1}`,color:displayedResult?.champion?C.blue:C.dim,fontSize:12,fontWeight:700,cursor:displayedResult?.champion&&!sharing?"pointer":"not-allowed",opacity:sharing?0.65:1}}>{sharing?"Creating...":"📤 Share Card"}</button>
            <button onClick={()=>{setPlayMode("manual");setManualPicks({});}} disabled={result.fifaEngineStatus!=="fifa-ready"} style={{padding:"7px 12px",borderRadius:10,background:playMode==="manual"?`${C.blue}22`:C.s1,border:`1px solid ${playMode==="manual"?C.blue:C.b1}`,color:playMode==="manual"?C.blue:C.mid,fontSize:12,fontWeight:700,cursor:result.fifaEngineStatus==="fifa-ready"?"pointer":"not-allowed",opacity:result.fifaEngineStatus==="fifa-ready"?1:0.55}}>👆 Manual Picks</button>
            <button disabled title="Prediction-based simulation will come later" style={{padding:"7px 12px",borderRadius:10,background:C.s1,border:`1px solid ${C.b1}`,color:C.dim,fontSize:12,fontWeight:700,cursor:"not-allowed",opacity:0.65}}>🔮 Prediction Sim · Soon</button>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:10,flexWrap:"wrap"}}>
            <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase"}}>Interactive Bracket Path</div>
            <div style={{display:"flex",gap:6,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:999,padding:3}}>
              <button onClick={()=>setBracketView("compact")} style={{border:"none",borderRadius:999,padding:"5px 9px",fontSize:10,fontWeight:800,cursor:"pointer",background:bracketView==="compact"?`${C.green}22`:"transparent",color:bracketView==="compact"?C.green:C.mid}}>📱 Compact</button>
              <button onClick={()=>setBracketView("tree")} style={{border:"none",borderRadius:999,padding:"5px 9px",fontSize:10,fontWeight:800,cursor:"pointer",background:bracketView==="tree"?`${C.gold}22`:"transparent",color:bracketView==="tree"?C.gold:C.mid}}>🌳 Tree</button>
            </div>
          </div>
          <VisualBracketTree bracket={displayedResult} pickMode={playMode} onPick={handleManualPick} view={bracketView}/>
        </div>
      )}
    </div>
  );
}

// ── SAVED TAB ──────────────────────────────────────────────────────────────
// ── SAVED TAB ──────────────────────────────────────────────────────────────
function SavedMatchCard({ item, onRemove, notifiedIds=new Set(), onNotified=()=>{} }) {
  const isPWA = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const [pushState, setPushState] = useState(() => {
    if (!("Notification" in window)) return "unsupported";
    if (!isPWA) return "needs-install";
    return Notification.permission;
  });
  const notified = notifiedIds.has(item.match?.id);
  const [showInstallTip, setShowInstallTip] = useState(false);
  const m = item.match;
  const handleCalendar = () => downloadICS([item]);
  const handlePush = async () => {
    if (pushState === "needs-install") { setShowInstallTip(v=>!v); return; }
    let state = pushState;
    if (state !== "granted") { state = await requestPushPermission(); setPushState(state); if (state !== "granted") return; }
    scheduleNotification(m, 60);
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array("BHlG2j1aEN_PheVmM_kw6eG5ho26LSMdtxSVEjiz9HnYqKTWWlOrdFdX-U3qUqR-VLxDrvOBik17FS7NJ1kJdr8") });
      await fetch("/api/push?action=subscribe", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ subscription: sub.toJSON(), matches:[m], minsBefore:60 }) });
    } catch(e) { console.warn("Push subscribe failed:", e); }
    try {
      const set = JSON.parse(localStorage.getItem("wc2026_push_set") || "[]");
      if (!set.includes(m.id)) { set.push(m.id); localStorage.setItem("wc2026_push_set", JSON.stringify(set)); }
    } catch {}
    onNotified(m.id);
  };
  return (
    <div style={{background:C.s2,border:`1px solid ${C.gold}33`,borderLeft:`3px solid ${C.gold}`,borderRadius:12,marginBottom:6,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px"}}>
        <Crest team={m.home} size={22}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{color:C.gold,fontSize:11}}>★</span>
            <span style={{fontWeight:700,color:C.text,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.home} vs {m.away}</span>
          </div>
          <div style={{fontSize:11,color:C.dim,marginTop:1}}>{m.date} · {m.time} · {m.venue?.split(",")[0]||""}</div>
        </div>
        <div style={{display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
          <button onClick={handleCalendar} title="Add to Calendar" style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${C.green}44`,background:`${C.green}15`,color:C.green,fontSize:12,fontWeight:600,cursor:"pointer"}}>📅 Calendar</button>
          <button onClick={handlePush} disabled={pushState==="denied"} title={pushState==="needs-install"?"Install app to enable push":"Set push notification"} style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${notified?C.green:pushState==="denied"?C.b2:C.gold}44`,background:notified?`${C.green}15`:pushState==="denied"?C.s1:`${C.gold}15`,color:notified?C.green:pushState==="denied"?C.dim:C.gold,fontSize:12,fontWeight:600,cursor:pushState==="denied"?"not-allowed":"pointer",opacity:pushState==="denied"?0.4:1}}>
            {notified?"🔔 Set":"🔔 Notify me"}
          </button>
          <button onClick={()=>onRemove(item.id)} style={{padding:"5px 7px",borderRadius:7,border:`1px solid ${C.b2}`,background:"none",color:C.dim,fontSize:15,cursor:"pointer",lineHeight:1}}>×</button>
        </div>
      </div>
      {pushState==="needs-install" && showInstallTip && (
        <div style={{padding:"10px 12px",borderTop:`1px solid ${C.b1}`,background:`${C.blue}08`}}>
          <div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:4}}>Install the app to get notifications</div>
          <div style={{fontSize:11,color:C.dim,lineHeight:1.6}}>
            <strong>iPhone:</strong> Safari → Share ↑ → Add to Home Screen<br/>
            <strong>Android:</strong> Chrome → ⋯ → Add to Home Screen<br/>
            <strong>Desktop:</strong> Click the install icon in your browser address bar
          </div>
        </div>
      )}
    </div>
  );
}

function SavedTab({ saved, onRemove, tabTop=116 }) {
  const _ref = useRef(null);
  const _h = useElemHeight(_ref);
  const savedStripRef = useRef(null);
  const [masterPushDone, setMasterPushDone] = useState(false);
  const [notifiedIds, setNotifiedIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("wc2026_push_set") || "[]")); } catch { return new Set(); }
  });
  const [filterMode, setFilterMode] = useState("all"); // all | group | team | date
  const [filterVal, setFilterVal] = useState(new Set()); // Set for multi-select
  const savedToday = new Date().toLocaleDateString("en-US", { month:"short", day:"numeric" });

  const sorted = [...saved].sort((a,b) => {
    const ta = MATCH_UTC[a.match?.id] ? new Date(MATCH_UTC[a.match.id]).getTime() : 0;
    const tb = MATCH_UTC[b.match?.id] ? new Date(MATCH_UTC[b.match.id]).getTime() : 0;
    return ta - tb;
  });

  // Filter options derived from saved matches
  const groups = [...new Set(sorted.map(x=>x.match?.group?.trim()).filter(Boolean))].sort();
  const teams  = [...new Set(sorted.flatMap(x=>[x.match?.home?.trim(),x.match?.away?.trim()]).filter(Boolean))].sort();
  const dates  = [...new Set(sorted.map(x=>x.match?.date?.trim()).filter(Boolean))];
  // Build date objects for the strip (only dates that have saved matches)
  const savedDates = sorted
    .filter(x => MATCH_UTC[x.match?.id])
    .reduce((acc, x) => {
      const d = new Date(MATCH_UTC[x.match.id]);
      const key = d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
      if (!acc.find(a=>a.key===key)) acc.push({key, date:d, day:d.getDate(), dow:d.toLocaleDateString("en-US",{weekday:"short"}).slice(0,1)});
      return acc;
    }, []);

  const filtered = sorted.filter(item => {
    const m = item.match;
    const home = m.home?.trim();
    const away = m.away?.trim();
    const group = m.group?.trim();
    const date = m.date?.trim();
    if (filterMode === "group") return filterVal.size===0 || filterVal.has(group);
    if (filterMode === "team")  return filterVal.size===0 || filterVal.has(home) || filterVal.has(away);
    if (filterMode === "date")  return !filterVal.size || filterVal.has(date);
    return true;
  });

  const handleMasterCalendar = () => downloadICS(saved);
  const handleMasterPush = async () => {
    const isPWA = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (!isPWA) { alert("Install the app first to enable push notifications"); return; }
    let state = "Notification" in window ? Notification.permission : "unsupported";
    if (state !== "granted") { state = await requestPushPermission(); if (state !== "granted") return; }
    saved.forEach(it => scheduleNotification(it.match, 60));
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:urlBase64ToUint8Array("BHlG2j1aEN_PheVmM_kw6eG5ho26LSMdtxSVEjiz9HnYqKTWWlOrdFdX-U3qUqR-VLxDrvOBik17FS7NJ1kJdr8") });
      await fetch("/api/push?action=subscribe", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ subscription:sub.toJSON(), matches:saved.map(x=>x.match), minsBefore:60 }) });
      setMasterPushDone(true);
      try {
        const ids = saved.map(x=>x.match?.id).filter(Boolean);
        const existing = JSON.parse(localStorage.getItem("wc2026_push_set") || "[]");
        const merged = [...new Set([...existing, ...ids])];
        localStorage.setItem("wc2026_push_set", JSON.stringify(merged));
        setNotifiedIds(new Set(merged));
      } catch {}
    } catch(e) { console.warn("Master push failed:", e); }
  };

  const ss = (active) => ({
    padding:"5px 12px", borderRadius:20, border:`1px solid ${active?C.green:C.b1}`,
    background:active?`${C.green}18`:"transparent", color:active?C.green:C.mid,
    fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap",
  });

  if (saved.length === 0) return (
    <div style={{textAlign:"center",padding:"50px 20px"}}>
      <div style={{fontSize:"2.8rem",marginBottom:10}}>⭐</div>
      <div style={{fontWeight:700,fontSize:18,color:C.mid,marginBottom:6}}>{"No matches saved yet"}</div>
      <div style={{fontSize:13,color:C.dim}}>Tap ☆ Add on any match to save it here.</div>
    </div>
  );

  return (
    <div style={{maxWidth:700,margin:"0 auto"}}>
      {/* Sticky controls */}
      <div ref={_ref} style={{position:"fixed",top:tabTop,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:700,willChange:"transform",zIndex:90,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:`0 2px 8px rgba(0,0,0,0.8)`,padding:"8px 13px"}}>
        {/* Master actions */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:700,color:C.mid,letterSpacing:"0.06em"}}>ALL MATCHES ({saved.length}){(filterMode!=="all"&&filterVal.size>0)&&filtered.length!==saved.length?<span style={{color:C.dim,fontWeight:400}}> · {filtered.length} shown</span>:null}</span>
          <button onClick={()=>saved.forEach(it=>onRemove(it.id))} style={{background:"none",border:`1px solid ${C.b2}`,color:C.dim,fontSize:11,cursor:"pointer",padding:"2px 8px",borderRadius:6}}>Clear all</button>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:8}}>
          <button onClick={handleMasterCalendar} style={{flex:1,padding:"6px 4px",borderRadius:8,cursor:"pointer",border:`1px solid ${C.green}44`,background:`${C.green}15`,color:C.green,fontSize:11,fontWeight:600}}>📅 Export all</button>
          <button onClick={handleMasterPush} style={{flex:1,padding:"6px 4px",borderRadius:8,cursor:"pointer",border:`1px solid ${masterPushDone?C.green:C.gold}44`,background:masterPushDone?`${C.green}15`:`${C.gold}15`,color:masterPushDone?C.green:C.gold,fontSize:11,fontWeight:600}}>{masterPushDone?"🔔 All set!":"🔔 Notify all"}</button>
        </div>
        {/* Filter pills */}
        <div style={{display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none"}}>
          <button style={ss(filterMode==="all")} onClick={()=>{setFilterMode("all");setFilterVal(new Set());}}>{"All"}</button>
          <button style={ss(filterMode==="group")} onClick={()=>{setFilterMode("group");setFilterVal(new Set());}}>🗂️ Group</button>
          <button style={ss(filterMode==="team")} onClick={()=>{setFilterMode("team");setFilterVal(new Set());}}>👥 Team</button>
          <button style={ss(filterMode==="date")} onClick={()=>{setFilterMode("date");setFilterVal(new Set());}}>📅 Date</button>
        </div>
        {/* Filter value selector */}
        {filterMode === "group" && (
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
            {groups.map(g=>{
              const active = filterVal.has(g);
              return (
                <button key={g} onClick={()=>setFilterVal(prev=>{const n=new Set(prev);active?n.delete(g):n.add(g);return n;})}
                  style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${active?C.green:C.b2}`,background:active?`${C.green}18`:"transparent",color:active?C.green:C.mid,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                  Group {g}
                </button>
              );
            })}
          </div>
        )}
        {filterMode === "team" && (
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
            {teams.map(t=>{
              const active = filterVal.has(t);
              return (
                <button key={t} onClick={()=>setFilterVal(prev=>{const n=new Set(prev);active?n.delete(t):n.add(t);return n;})}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:20,border:`1px solid ${active?C.green:C.b2}`,background:active?`${C.green}18`:"transparent",color:active?C.green:C.mid,fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>
                  <Crest team={t} size={14}/>{t}
                </button>
              );
            })}
          </div>
        )}
        {/* Date strip — same as Schedule tab */}
        {filterMode === "date" && (
          <div ref={savedStripRef} style={{display:"flex",overflowX:"auto",scrollbarWidth:"none",marginTop:8,gap:4}}>
            <div onClick={()=>setFilterVal(new Set())} style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:36,cursor:"pointer",padding:"4px 2px",borderRadius:8,background:filterVal.size===0?`${C.green}22`:"transparent",border:`1px solid ${filterVal.size===0?C.green:"transparent"}`}}>
              <span style={{fontSize:9,color:filterVal.size===0?C.green:C.dim,fontWeight:700}}>ALL</span>
              <span style={{fontSize:14,fontWeight:900,color:filterVal.size===0?C.green:C.dim}}>⚽</span>
            </div>
            {savedDates.map((d, idx) => {
              const isToday = d.key === savedToday;
              const isSel = filterVal.has(d.key);
              const prevD = savedDates[idx - 1];
              const monthChanged = prevD && d.date.getMonth() !== prevD.date.getMonth();
              return (
                <React.Fragment key={d.key}>
                  {monthChanged && (
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 4px",flexShrink:0}}>
                      <div style={{width:1,height:32,background:C.b2,margin:"0 2px"}}/>
                      <span style={{fontSize:8,color:C.dim,fontWeight:700,marginTop:2,letterSpacing:"0.05em"}}>{d.date.toLocaleDateString("en-US",{month:"short"}).toUpperCase()}</span>
                    </div>
                  )}
                  <div onClick={()=>setFilterVal(prev=>{const n=new Set(prev);isSel?n.delete(d.key):n.add(d.key);return n;})}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:36,cursor:"pointer",padding:"4px 6px",borderRadius:8,
                      background:isSel?`${C.green}22`:isToday?`${C.green}0a`:"transparent",
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
        )}
      </div>
      <div style={{height:(_h||140)+8}}/>
      {filtered.length === 0
        ? <div style={{textAlign:"center",padding:"32px 0",color:C.dim,fontSize:13}}>No matches match this filter.</div>
        : filtered.map(item=>(<SavedMatchCard key={item.id} item={item} onRemove={onRemove} notifiedIds={notifiedIds} onNotified={(id)=>setNotifiedIds(prev=>new Set([...prev,id]))}/>))
      }
    </div>
  );
}

const HOST_CITIES = {
  "New York/New Jersey": { country:"🇺🇸", tz:"America/New_York", lat:40.8135, lon:-74.0745, stadium:"MetLife Stadium", capacity:82500 },
  "Los Angeles":         { country:"🇺🇸", tz:"America/Los_Angeles", lat:33.9535, lon:-118.3392, stadium:"SoFi Stadium", capacity:70240 },
  "Dallas":              { country:"🇺🇸", tz:"America/Chicago", lat:32.7474, lon:-97.0945, stadium:"AT&T Stadium", capacity:80000 },
  "San Francisco":       { country:"🇺🇸", tz:"America/Los_Angeles", lat:37.4031, lon:-121.9694, stadium:"Levi's Stadium", capacity:68500 },
  "Miami":               { country:"🇺🇸", tz:"America/New_York", lat:25.9580, lon:-80.2389, stadium:"Hard Rock Stadium", capacity:65326 },
  "Atlanta":             { country:"🇺🇸", tz:"America/New_York", lat:33.7553, lon:-84.4006, stadium:"Mercedes-Benz Stadium", capacity:71000 },
  "Seattle":             { country:"🇺🇸", tz:"America/Los_Angeles", lat:47.5952, lon:-122.3316, stadium:"Lumen Field", capacity:69000 },
  "Boston":              { country:"🇺🇸", tz:"America/New_York", lat:42.3467, lon:-71.0972, stadium:"Gillette Stadium", capacity:65878 },
  "Philadelphia":        { country:"🇺🇸", tz:"America/New_York", lat:39.9012, lon:-75.1675, stadium:"Lincoln Financial Field", capacity:69796 },
  "Kansas City":         { country:"🇺🇸", tz:"America/Chicago", lat:39.0489, lon:-94.4839, stadium:"Arrowhead Stadium", capacity:76416 },
  "Houston":             { country:"🇺🇸", tz:"America/Chicago", lat:29.6847, lon:-95.4107, stadium:"NRG Stadium", capacity:72220 },
  "Toronto":             { country:"🇨🇦", tz:"America/Toronto", lat:43.6333, lon:-79.3891, stadium:"BMO Field", capacity:45000 },
  "Vancouver":           { country:"🇨🇦", tz:"America/Vancouver", lat:49.2767, lon:-123.1115, stadium:"BC Place", capacity:54500 },
  "Mexico City":         { country:"🇲🇽", tz:"America/Mexico_City", lat:19.3029, lon:-99.1505, stadium:"Estadio Azteca", capacity:87523 },
  "Guadalajara":         { country:"🇲🇽", tz:"America/Mexico_City", lat:20.6867, lon:-103.4079, stadium:"Estadio Akron", capacity:49850 },
  "Monterrey":           { country:"🇲🇽", tz:"America/Monterrey", lat:25.6694, lon:-100.2436, stadium:"Estadio BBVA", capacity:53500 },
};

const VENUE_TO_CITY = {
  "New York New Jersey Stadium, East Rutherford":"New York/New Jersey",
  "SoFi Stadium, Los Angeles":"Los Angeles",
  "Dallas Stadium, Dallas":"Dallas",
  "San Francisco Bay Area Stadium, San Francisco":"San Francisco",
  "Miami Stadium, Miami":"Miami",
  "Atlanta Stadium, Atlanta":"Atlanta",
  "Seattle Stadium, Seattle":"Seattle",
  "Boston Stadium, Boston":"Boston",
  "Philadelphia Stadium, Philadelphia":"Philadelphia",
  "Kansas City Stadium, Kansas City":"Kansas City",
  "Houston Stadium, Houston":"Houston",
  "Toronto Stadium, Toronto":"Toronto",
  "BC Place, Vancouver":"Vancouver",
  "Mexico City Stadium, Mexico City":"Mexico City",
  "Estadio Guadalajara, Zapopan":"Guadalajara",
  "Estadio Monterrey, Guadalupe":"Monterrey",
};

function useWeather(lat, lon, enabled) {
  const [wx, setWx] = useState(null);
  useEffect(() => {
    if (!enabled || !lat || !lon) return;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=fahrenheit&timezone=auto`)
      .then(r => r.json())
      .then(d => {
        const c = d?.current;
        if (!c) return;
        const code = c.weathercode;
        const icon = code <= 1 ? "☀️" : code <= 3 ? "⛅" : code <= 48 ? "🌫️" : code <= 67 ? "🌧️" : code <= 77 ? "🌨️" : code <= 82 ? "🌦️" : "⛈️";
        const tempF = Math.round(c.temperature_2m);
        const tempC = Math.round((tempF - 32) * 5/9);
        setWx({ temp: tempF, tempC, icon, wind: Math.round(c.windspeed_10m) });
      })
      .catch(() => {});
  }, [lat, lon, enabled]);
  return wx;
}

function MatchdayCard({ m, onAction, favTeam }) {
  const { favTeams=[] } = useContext(FavCtx);
  const { getScore } = useContext(LiveScoresCtx);
  const sc = getScore(m.home, m.away);
  const cityKey = VENUE_TO_CITY[m.venue];
  const city = cityKey ? HOST_CITIES[cityKey] : null;
  const wx = useWeather(city?.lat, city?.lon, !!city);
  const now = Date.now();
  const iso = MATCH_UTC[m.id];
  const msToKO = iso ? new Date(iso).getTime() - now : null;
  const hoursToKO = msToKO ? msToKO / 3600000 : null;
  const isMatchday = hoursToKO !== null && hoursToKO > 0 && hoursToKO < 24;
  const isFav = favTeams?.length && (favTeams.includes(m.home) || favTeams.includes(m.away));
  const { localTime } = matchTimes(m);
  const live = sc ? statusIsLive(sc.status) : false;
  const finished = sc ? statusIsFinished(sc.status) : false;
  const hasScore = sc && sc.hg !== null && sc.ag !== null;

  // Countdown
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    if (!isMatchday) return;
    const tick = () => {
      const diff = new Date(iso).getTime() - Date.now();
      if (diff <= 0) { setCountdown("KICK OFF!"); return; }
      const h = Math.floor(diff / 3600000);
      const min = Math.floor((diff % 3600000) / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setCountdown(h > 0 ? `${h}h ${min}m` : `${min}m ${sec}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [isMatchday, iso]);

  const cardBorder = isFav ? C.gold : live ? C.greenS : C.b1;
  const cardBg = live ? `linear-gradient(135deg,#0a1f10,#0d2815)` : `linear-gradient(135deg,${C.s1},${C.s2})`;

  return (
    <Card style={{marginBottom:8, border:`1px solid ${cardBorder}`, background:cardBg, opacity:finished?0.75:1}}>
      <div style={{padding:"11px 13px"}}>
        {/* Fav banner */}
        {isFav && !live && !finished && (
          <div style={{fontSize:10,color:C.gold,fontWeight:700,marginBottom:6,letterSpacing:"0.05em"}}>⭐ YOUR TEAM</div>
        )}
        {/* Header row */}
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
          {m.group ? <Badge>Group {m.group}</Badge> : <Badge color={C.gold}>{m.stage||"Knockout"}</Badge>}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {isMatchday && countdown && !live && <span style={{fontSize:11,fontWeight:700,color:C.gold}}>⏱ {countdown}</span>}
            {wx && <span style={{fontSize:11,color:C.mid}}>{wx.icon} {wx.temp}°F / {wx.tempC}°C</span>}
            <span style={{fontSize:11,color:C.dim}}>{localTime}</span>
          </div>
        </div>
        {/* Teams + score */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
          <Crest team={m.home} size={24}/>
          <span style={{fontWeight:700,color:favTeams?.includes(m.home)?C.gold:C.text,flex:1,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.home}</span>
          {hasScore ? (
            <div style={{textAlign:"center",minWidth:64}}>
              <div style={{fontWeight:900,fontSize:22,color:live?C.green:C.text,fontFamily:"monospace",lineHeight:1}}>{sc.hg} – {sc.ag}</div>
              {statusLabel(sc.status,sc.elapsed) && <div style={{fontSize:10,fontWeight:700,marginTop:2,color:live?C.green:C.dim}}>{live?"🔴 ":""}{statusLabel(sc.status,sc.elapsed)}</div>}
            </div>
          ) : (
            <span style={{fontSize:11,color:C.dim,fontWeight:700,minWidth:40,textAlign:"center"}}>VS</span>
          )}
          <span style={{fontWeight:700,color:favTeams?.includes(m.away)?C.gold:C.text,flex:1,fontSize:14,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.away}</span>
          <Crest team={m.away} size={24}/>
        </div>
        {/* Venue */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:m.tv?4:0}}>
          <span onClick={()=>openMaps(m.venue)} style={{fontSize:11,color:C.blue,cursor:"pointer"}}>📍 <span style={{textDecoration:"underline",textDecorationStyle:"dotted"}}>{m.venue}</span></span>
          {!finished && (()=>{ const isSaved=savedIds.has(m.id); return (
            <button onClick={()=>onAction(m)} style={{background:isSaved?`${C.gold}22`:`${C.green}22`,border:`1px solid ${isSaved?C.gold:C.greenS}`,color:isSaved?C.gold:C.green,padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
              <StarIcon filled={isSaved} size={12}/>{isSaved?"Saved":"Add"}
            </button>
          ); })()}
          {finished && <span style={{fontSize:10,color:C.dim,fontStyle:"italic"}}>Final</span>}
        </div>
        {m.tv && <div style={{fontSize:11,color:finished?C.dim:C.gold,marginBottom: isMatchday&&city?4:0}}>📺 {m.tv}</div>}
        {/* Matchday extra info */}
        {isMatchday && city && (
          <div style={{marginTop:8,padding:"8px 10px",background:C.bg,borderRadius:8,border:`1px solid ${C.b1}`}}>
            <div style={{fontSize:10,color:C.gold,fontWeight:700,marginBottom:5}}>🏟️ MATCHDAY INFO · {cityKey?.toUpperCase()}</div>
            <div style={{fontSize:11,color:C.mid,marginBottom:3}}>🚇 {city.transit}</div>
            <div style={{fontSize:11,color:C.mid,marginBottom:3}}>🅿️ {city.parking}</div>
            {wx && <div style={{fontSize:11,color:C.mid}}>🌡️ {wx.icon} {wx.temp}°F / {wx.tempC}°C · Wind {wx.wind} mph</div>}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── FAVORITE TEAM CONTEXT ─────────────────────────────────────────────────
const FavCtx = createContext({ favTeam:"", favTeams:[], setFavTeam:()=>{} });

// ── PREDICTOR — KV-backed multi-user ─────────────────────────────────────

// Stable userId — just a device key, not sensitive data
function getUserId() {
  try {
    let id = localStorage.getItem("wc2026_uid");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("wc2026_uid", id); }
    return id;
  } catch { return "anon"; }
}

function scoreOnePred(pred, actual) {
  if (!pred || actual.hg === null || actual.ag === null) return null;
  const ph = parseInt(pred.hg), pa = parseInt(pred.ag);
  const ah = parseInt(actual.hg), aa = parseInt(actual.ag);
  if (isNaN(ph)||isNaN(pa)) return null;
  if (ph===ah && pa===aa) return 3;
  const pr = ph>pa?"H":ph<pa?"A":"D";
  const ar = ah>aa?"H":ah<aa?"A":"D";
  return pr===ar ? 1 : 0;
}

async function apiPred(action, params={}, body=null) {
  const qs = new URLSearchParams({ action, ...params }).toString();
  const opts = body
    ? { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) }
    : { method:"GET" };
  const res = await fetch(`/api/predictor?${qs}`, opts);
  if (!res.ok) { const e = await res.json().catch(()=>({error:res.statusText})); throw new Error(e.error||res.statusText); }
  return res.json();
}

// Debounce helper — saves prediction 800ms after last keystroke
function useDebounce(fn, ms) {
  const t = useRef(null);
  return useCallback((...args) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), ms);
  }, [fn, ms]);
}

function PredictorTab({ syncProfile=null, displayName="", onShowSync=()=>{}, userAvatar=null }) {
  const { getScore, isFinished } = useContext(LiveScoresCtx);
  const { favTeam, favTeams=[] } = useContext(FavCtx);
  const userId = useMemo(getUserId, []);

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

  // ── Load user + their predictions on mount ──────────────────────────────
  useEffect(() => {
    (async () => {
      setUL(true);
      try {
        let u = await apiPred("getUser", { userId });
        // Auto-register if signed in via sync but not yet in predictor
        if (!u && displayName) {
          // Try with exact name first, then with suffix if taken
          const namesToTry = [
            displayName,
            displayName.slice(0, 18) + "2",
            displayName.slice(0, 17) + " FC",
          ];
          for (const name of namesToTry) {
            try {
              u = await apiPred("register", {}, { userId, name, avatar: null, city: "", country: "" });
              if (u) break;
            } catch(e) {
              if (!e.message?.includes("taken")) break; // non-name error, stop trying
            }
          }
        }
        setUser(u);
        if (u) {
          const p = await apiPred("getPreds", { userId });
          const normalised = {};
          Object.entries(p||{}).forEach(([k,v]) => { normalised[Number(k)] = v; });
          setPreds(normalised);
        }
      } catch(e) { console.error("predictor init", e); }
      finally { setUL(false); }
    })();
  }, [userId, displayName]);

  // ── Load leaderboard when that tab is active ────────────────────────────
  useEffect(() => {
    if (filter !== "board") return;
    setBL(true);
    apiPred("leaderboard")
      .then(b => setBoard(b))
      .catch(() => setBoard([]))
      .finally(() => setBL(false));
  }, [filter]);

  // ── Register ────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    const name = nameInput.trim() || displayName || "";
    if (!name) return;
    setNS(true); setNameErr("");
    try {
      const u = await apiPred("register", {}, { userId, name, avatar: null, city: "", country: "" });
      setUser(u);
    } catch(e) { setNameErr(e.message || "Could not save name"); }
    finally { setNS(false); }
  };

  // ── Save a single prediction to KV (debounced) ──────────────────────────
  const savePredToKV = useCallback(async (matchId, hg, ag) => {
    if (!user) return;
    setPSaving(p => ({...p, [matchId]: true}));
    try {
      await apiPred("savePred", {}, { userId, matchId, hg, ag });
    } catch(e) { console.error("savePred", e); }
    finally { setPSaving(p => ({...p, [matchId]: false})); }
  }, [userId, user]);

  const debouncedSave = useDebounce(savePredToKV, 800);

  const upd = (id, field, val) => {
    const clean = val.replace(/\D/,"");
    const next = { ...preds, [id]: { ...(preds[id]||{}), [field]: clean }};
    setPreds(next);
    const updated = next[id];
    if (updated?.hg !== undefined && updated?.ag !== undefined && updated.hg !== "" && updated.ag !== "") {
      debouncedSave(id, parseInt(updated.hg), parseInt(updated.ag));
    }
  };

  // ── Score totals ────────────────────────────────────────────────────────
  const upcoming  = MATCHES.filter(m => m.group && !isFinished(m.home, m.away));
  const finished  = MATCHES.filter(m => m.group &&  isFinished(m.home, m.away));
  let totalPts = 0, totalPossible = 0, exact = 0, correct = 0;
  finished.forEach(m => {
    const sc = getScore(m.home, m.away);
    if (!sc) return;
    const pts = scoreOnePred(preds[m.id], sc);
    if (pts !== null) { totalPts += pts; totalPossible += 3; if(pts===3)exact++; if(pts>=1)correct++; }
  });

  const shownMatches = filter==="fav"
    ? MATCHES.filter(m=>m.group&&(favTeams?.includes(m.home)||favTeams?.includes(m.away)))
    : filter==="finished" ? finished : upcoming;

  // ── Registration gate ───────────────────────────────────────────────────
  if (userLoading) return (
    <div style={{textAlign:"center",padding:"48px 20px"}}>
      <div style={{width:28,height:28,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/>
      <div style={{fontSize:13,color:C.mid}}>Loading predictor...</div>
    </div>
  );

  if (!user) return (
    <div style={{paddingTop:12}}>
      <div style={{background:`linear-gradient(135deg,${C.s1},${C.s2})`,border:`1px solid ${C.b2}`,borderRadius:12,padding:14,marginBottom:14,textAlign:"center"}}>
        <div style={{fontSize:"1.6rem",marginBottom:4}}>🔮</div>
        <div style={{fontWeight:700,fontSize:17,color:C.green,marginBottom:4}}>Match Predictor</div>
        <div style={{fontSize:12,color:C.mid,lineHeight:1.5}}>Pick scores for every group match. Compete with friends on the leaderboard.</div>
      </div>
      {(syncProfile && displayName) ? (
        /* Signed in but name registration failed — show retry */
        <Card style={{padding:18}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:`${C.green}22`,border:`1.5px solid ${C.green}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
              {userAvatar?.startsWith("data:") ? <img src={userAvatar} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} alt=""/> : "⭐"}
            </div>
            <div>
              <div style={{fontWeight:700,color:C.text,fontSize:15}}>Join as {displayName}?</div>
              <div style={{fontSize:11,color:C.dim}}>Tap to join the predictor</div>
            </div>
          </div>
          {nameErr && <div style={{fontSize:12,color:C.red,marginBottom:8}}>{nameErr}</div>}
          <button onClick={handleRegister} disabled={nameSaving}
            style={{width:"100%",padding:"12px 0",borderRadius:12,background:`linear-gradient(135deg,${C.green},#22c55e)`,border:"none",color:"#030a05",fontWeight:700,fontSize:15,cursor:"pointer",opacity:nameSaving?0.6:1}}>
            {nameSaving?"Joining...":"Join as " + displayName + " →"}
          </button>
          <div style={{fontSize:11,color:C.dim,marginTop:10,textAlign:"center"}}>
            Want a different name?
            <input value={nameInput===displayName?"":nameInput} onChange={e=>{setNameInput(e.target.value.slice(0,20));setNameErr("");}}
              placeholder="Type custom name..." maxLength={20}
              style={{display:"block",width:"100%",marginTop:8,padding:"10px 14px",background:C.s2,border:`1px solid ${nameErr?C.red:C.b2}`,borderRadius:10,color:C.text,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
        </Card>
      ) : (
        /* Not signed in — prompt to create account OR enter name */
        <div>
          <Card style={{padding:18,marginBottom:12}}>
            <div style={{fontWeight:700,color:C.text,fontSize:15,marginBottom:4}}>Choose your display name</div>
            <div style={{fontSize:12,color:C.dim,marginBottom:14}}>This is how you'll appear on the leaderboard.</div>
            <input value={nameInput} onChange={e=>{setNameInput(e.target.value.slice(0,20));setNameErr("");}}
              onKeyDown={e=>e.key==="Enter"&&handleRegister()}
              placeholder="e.g. Pablo, FootballFan99..." maxLength={20}
              style={{width:"100%",padding:"12px 14px",background:C.s2,border:`1px solid ${nameErr?C.red:C.b2}`,borderRadius:10,color:C.text,fontSize:15,outline:"none",marginBottom:8}}/>
            {nameErr && <div style={{fontSize:12,color:C.red,marginBottom:8}}>{nameErr}</div>}
            <div style={{fontSize:11,color:C.dim,marginBottom:14}}>{20-nameInput.length} characters remaining</div>
            <button onClick={handleRegister} disabled={nameSaving||!nameInput.trim()}
              style={{width:"100%",padding:"12px 0",borderRadius:12,background:nameInput.trim()?`linear-gradient(135deg,${C.green},#22c55e)`:C.b2,border:"none",color:nameInput.trim()?"#030a05":C.dim,fontWeight:700,fontSize:15,cursor:nameInput.trim()?"pointer":"default",opacity:nameSaving?0.6:1}}>
              {nameSaving?"Saving...":"Join the Predictor →"}
            </button>
          </Card>
          <button onClick={onShowSync}
            style={{width:"100%",padding:"12px 0",borderRadius:12,background:"transparent",border:`1px solid ${C.b2}`,color:C.mid,fontWeight:600,fontSize:13,cursor:"pointer"}}>
            🔗 Sign in with PIN to sync across devices
          </button>
        </div>
      )}
    </div>
  );

  // ── Main predictor UI ───────────────────────────────────────────────────
  return (
    <div style={{paddingTop:12}}>
      <div style={{background:`linear-gradient(135deg,${C.s1},${C.s2})`,border:`1px solid ${C.b2}`,borderRadius:12,padding:14,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:C.green}}>{"🔮 MATCH PREDICTOR"}</div>
            <div style={{fontSize:11,color:C.mid,marginTop:2}}>Playing as <strong style={{color:C.gold}}>{user.name}</strong></div>
          </div>
          <button onClick={()=>setShowInfo(v=>!v)} style={{background:"none",border:`1px solid ${C.b2}`,borderRadius:20,color:C.dim,fontSize:11,padding:"3px 10px",cursor:"pointer"}}>Scoring?</button>
        </div>
        {showInfo && (
          <div style={{marginTop:10,padding:10,background:C.bg,borderRadius:8,fontSize:12,color:C.mid,lineHeight:1.8}}>
            <div>⚽⚽⚽ <strong style={{color:C.green}}>3 pts</strong> — Exact score</div>
            <div>⚽ <strong style={{color:C.gold}}>1 pt</strong> — Correct result (Win / Draw / Loss)</div>
            <div>❌ <strong style={{color:C.red}}>0 pts</strong> — Wrong result</div>
            <div style={{marginTop:6,fontSize:11,color:C.dim}}>Predictions auto-save as you type. Lock-in before kick-off — no changes after!</div>
          </div>
        )}
        {totalPossible > 0 && (
          <div style={{display:"flex",gap:8,marginTop:12}}>
            {[
              [totalPts,       "POINTS",   C.green],
              [exact,          "EXACT",    C.gold],
              [correct,        "CORRECT",  C.blue],
              [totalPossible>0?Math.round((totalPts/totalPossible)*100):0, "ACCURACY %", C.mid],
            ].map(([v,l,col])=>(
              <div key={l} style={{flex:1,textAlign:"center",background:`${col}18`,border:`1px solid ${col}33`,borderRadius:10,padding:"8px 4px"}}>
                <div style={{fontWeight:900,fontSize:22,color:col}}>{v}{l==="ACCURACY %"?"%":""}</div>
                <div style={{fontSize:9,color:C.dim}}>{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14,overflowX:"auto",scrollbarWidth:"none"}}>
        <Pill active={filter==="upcoming"} onClick={()=>setFilter("upcoming")} color={C.green}>Upcoming ({upcoming.length})</Pill>
        <Pill active={filter==="finished"} onClick={()=>setFilter("finished")} color={C.gold}>Finished ({finished.length})</Pill>
        {favTeams?.length > 0 && <Pill active={filter==="fav"} onClick={()=>setFilter("fav")} color={C.gold}>⭐ My Teams</Pill>}
        <Pill active={filter==="board"} onClick={()=>setFilter("board")} color={C.rival}>🏅 Leaderboard</Pill>
      </div>

      {/* ── LEADERBOARD ── */}
      {filter==="board" && (
        <div>
          {boardLoading && <div style={{textAlign:"center",padding:"32px 0"}}><div style={{width:24,height:24,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto"}}/></div>}
          {!boardLoading && board && board.length === 0 && (
            <div style={{textAlign:"center",padding:"32px 20px",color:C.dim,fontSize:13}}>No predictions scored yet. Check back after June 11!</div>
          )}
          {!boardLoading && board && board.map((entry, i) => {
            const isMe = entry.userId === userId;
            const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
            return (
              <Card key={entry.userId} style={{marginBottom:7,border:`1px solid ${isMe?C.gold:C.b1}`,background:isMe?`linear-gradient(135deg,${C.gold}0a,${C.s1})`:""}}>
                <div style={{padding:"10px 13px",display:"flex",alignItems:"center",gap:10}}>
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
                {i===0&&entry.pts>0&&<div style={{height:2,background:`linear-gradient(90deg,${C.gold},transparent)`}}/>}
              </Card>
            );
          })}
          <div style={{textAlign:"center",marginTop:12}}>
            <button onClick={()=>{setBL(true);apiPred("leaderboard").then(b=>setBoard(b)).finally(()=>setBL(false));}} style={{fontSize:12,color:C.dim,background:"none",border:`1px solid ${C.b2}`,borderRadius:20,padding:"5px 14px",cursor:"pointer"}}>↻ Refresh</button>
          </div>
        </div>
      )}

      {/* ── MATCH LIST ── */}
      {filter !== "board" && (
        <>
          {shownMatches.length===0 && (
            <div style={{textAlign:"center",padding:"32px 20px",color:C.dim}}>
              <div style={{fontSize:"2rem",marginBottom:8}}>⏳</div>
              <div style={{fontSize:13}}>{filter==="upcoming"?"No upcoming matches yet — check back June 11!":"No finished matches yet."}</div>
            </div>
          )}
          {shownMatches.map(m => {
            const sc = getScore(m.home, m.away);
            const done = isFinished(m.home, m.away);
            const pred = preds[m.id] || {};
            const pts = done && sc ? scoreOnePred(pred, sc) : null;
            const ptColor = pts===3?C.green:pts===1?C.gold:pts===0?C.red:C.dim;
            const hasPred = pred.hg!==undefined && pred.ag!==undefined && pred.hg!=="" && pred.ag!=="";
            const saving = predSaving[m.id];
            return (
              <Card key={m.id} style={{marginBottom:8,border:`1px solid ${pts===3?C.green:pts===1?C.gold:pts===0?C.red:hasPred?`${C.green}44`:C.b1}`}}>
                <div style={{padding:"10px 13px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <Badge>Group {m.group} · {m.date}</Badge>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {saving && <span style={{fontSize:10,color:C.dim}}>saving...</span>}
                      {!saving && hasPred && !done && <span style={{fontSize:10,color:C.green}}>✓ saved</span>}
                      {pts !== null && <div style={{fontWeight:700,color:ptColor,fontSize:12}}>{pts===3?"⚽⚽⚽ +3":pts===1?"⚽ +1":"❌ 0"}pts</div>}
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Crest team={m.home} size={22}/>
                    <span style={{fontWeight:700,color:C.text,flex:1,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.home}</span>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                      {done && sc && (
                        <div style={{textAlign:"center",minWidth:48}}>
                          <div style={{fontSize:9,color:C.dim,marginBottom:1}}>Result</div>
                          <div style={{fontWeight:800,fontSize:18,color:C.text,fontFamily:"monospace"}}>{sc.hg}–{sc.ag}</div>
                        </div>
                      )}
                      {!done && (
                        <>
                          <input value={pred.hg||""} onChange={e=>upd(m.id,"hg",e.target.value)} placeholder="?" maxLength={2}
                            style={{width:34,textAlign:"center",background:C.s2,border:`1px solid ${hasPred?C.green:C.b2}`,borderRadius:8,color:C.green,fontSize:16,fontWeight:700,padding:"4px 0",outline:"none"}}/>
                          <span style={{color:C.dim,fontWeight:700}}>–</span>
                          <input value={pred.ag||""} onChange={e=>upd(m.id,"ag",e.target.value)} placeholder="?" maxLength={2}
                            style={{width:34,textAlign:"center",background:C.s2,border:`1px solid ${hasPred?C.green:C.b2}`,borderRadius:8,color:C.green,fontSize:16,fontWeight:700,padding:"4px 0",outline:"none"}}/>
                        </>
                      )}
                      {done && hasPred && (
                        <div style={{textAlign:"center",minWidth:48}}>
                          <div style={{fontSize:9,color:C.dim,marginBottom:1}}>Your pick</div>
                          <div style={{fontWeight:800,fontSize:18,color:ptColor,fontFamily:"monospace"}}>{pred.hg}–{pred.ag}</div>
                        </div>
                      )}
                    </div>
                    <span style={{fontWeight:700,color:C.text,flex:1,fontSize:13,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.away}</span>
                    <Crest team={m.away} size={22}/>
                  </div>
                </div>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}


// ── THEME CONTEXT (dark/light) ────────────────────────────────────────────
const ThemeCtx = createContext({ dark:true });
const DARK = {
  bg:"#060e0a", s1:"#0c1a12", s2:"#112618", b1:"#1a3828", b2:"#234833",
  green:"#4ade80", greenS:"#4ade8055", gold:"#fbbf24", blue:"#60a5fa",
  rival:"#38bdf8", red:"#f87171", text:"#d4ead9", mid:"#7aaa8a", dim:"#3d6a4d",
};
const LIGHT = {
  bg:"#f0faf3", s1:"#ffffff", s2:"#e8f5ec", b1:"#c5e0cc", b2:"#a8d4b0",
  green:"#16a34a", greenS:"#16a34a55", gold:"#d97706", blue:"#2563eb",
  rival:"#0284c7", red:"#dc2626", text:"#0f2d1a", mid:"#2d6a3f", dim:"#6b9e79",
};

// ── MATCH EVENTS API ──────────────────────────────────────────────────────
const eventsCache = {};
async function fetchMatchEvents(fixtureId) {
  if (eventsCache[fixtureId]) return eventsCache[fixtureId];
  try {
    const res = await fetch(`/api/matchevents?fixtureId=${fixtureId}`);
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    // Handle both old format (array) and new format ({events, stats})
    const result = Array.isArray(data) ? { events: data, stats: null } : data;
    eventsCache[fixtureId] = result;
    return result;
  } catch(e) {
    console.error("[matchevents]", e.message);
    return null;
  }
}

// ── MATCH EVENTS MODAL ────────────────────────────────────────────────────
// ── WEATHER BADGE ─────────────────────────────────────────────────────────
function WeatherBadge({ lat, lon }) {
  const wx = useWeather(lat, lon, true);
  if (!wx) return null;
  return (
    <div style={{textAlign:"center",flexShrink:0}}>
      <div style={{fontSize:18,lineHeight:1}}>{wx.icon}</div>
      <div style={{fontSize:11,fontWeight:700,color:C.text}}>{wx.temp}°F<span style={{color:C.dim}}> / {wx.tempC}°C</span></div>
      <div style={{fontSize:9,color:C.dim}}>at venue</div>
    </div>
  );
}

function MatchEventsModal({ match, open, onClose, onAction, savedIds=new Set(), userPredHg, userPredAg }) {
  const [events, setEvents] = useState(null);
  const [matchStats, setMatchStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const { getScore } = useContext(LiveScoresCtx);
  const { favTeams=[] } = useContext(FavCtx);
  const country = useContext(CountryCtx);
  const bc = getBroadcast(country);
  const isUS = country === "US" || !BROADCAST[country];

  useEffect(() => {
    if (!open || !match) return;
    setEvents(null); setLoading(true);
    fetchMatchEvents(`${match.home}|${match.away}`)
      .then(d => {
        setEvents(d?.events || []);
        setMatchStats(d?.stats || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, match]);

  const sc = match ? getScore(match.home, match.away) : null;
  const hasScore = sc && sc.hg !== null && sc.ag !== null;
  const live = sc ? statusIsLive(sc.status) : false;
  const finished = sc ? statusIsFinished(sc.status) : false;
  const { localTime } = match ? matchTimes(match) : {};

  // Polymarket odds
  const p1 = match ? PREDS.find(x=>x.team===match.home) : null;
  const p2 = match ? PREDS.find(x=>x.team===match.away) : null;

  // Simulated odds for draw probability
  const simOdds = useMemo(() => {
    if (!match) return null;
    const N = 5000; let w1=0, w2=0, d=0;
    for(let i=0;i<N;i++){const r=simMatch(match.home,match.away);if(r.res==="home")w1++;else if(r.res==="away")w2++;else d++;}
    return {
      win1: ((w1/N)*100).toFixed(0),
      draw: ((d/N)*100).toFixed(0),
      win2: ((w2/N)*100).toFixed(0),
    };
  }, [match?.home, match?.away]);

  if (!match) return null;

  const shareMatch = () => {
    const base = window.location.origin;
    const keyEvents = events && events.length > 0
      ? events.filter(ev=>ev.type==="Goal"||ev.type==="Card").slice(0,5)
          .map(ev=>({type:ev.type==="Goal"?"goal":ev.detail?.includes("Yellow")?"yellow":"red",name:ev.player?.name?.split(" ").pop()||"",min:ev.time?.elapsed||"",side:normTeam(ev.team?.name||"")===match.home?"home":"away"}))
      : [];
    const params = new URLSearchParams();
    params.set("home", match.home);
    params.set("away", match.away);
    if (hasScore) { params.set("hg", sc.hg); params.set("ag", sc.ag); }
    if (match.group) params.set("group", match.group);
    else params.set("stage", match.stage||"World Cup 2026");
    if (match.date) params.set("date", match.date);
    if (match.venue) params.set("venue", match.venue.split(",")[0]);
    if (!hasScore && p1) params.set("p1", p1.poly);
    if (!hasScore && p2) params.set("p2", p2.poly);
    if (keyEvents.length > 0) params.set("events", encodeURIComponent(JSON.stringify(keyEvents)));
    // Include user's prediction if passed as prop
    if (userPredHg !== undefined && userPredHg !== "" && userPredAg !== undefined && userPredAg !== "") {
      params.set("predHg", userPredHg);
      params.set("predAg", userPredAg);
    }
    const shareUrl = base + "/api/og?" + params.toString();
    const title = hasScore
      ? match.home + " " + sc.hg + "-" + sc.ag + " " + match.away + " · World Cup 2026"
      : match.home + " vs " + match.away + " · World Cup 2026";
    // Trim URL if too long (events JSON can bloat it) — Safari has ~2KB limit
    const finalUrl = shareUrl.length > 1800
      ? base + "/api/og?" + new URLSearchParams({
          home: match.home, away: match.away,
          ...(hasScore ? {hg: sc.hg, ag: sc.ag} : {}),
          ...(match.group ? {group: match.group} : {stage: match.stage||"World Cup 2026"}),
          ...(match.date ? {date: match.date} : {}),
          ...(match.venue ? {venue: match.venue.split(",")[0]} : {}),
        }).toString()
      : shareUrl;

    if (navigator.share) {
      const venueName = match.venue ? match.venue.split(",")[0] : "";
      const { localTime } = matchTimes(match);
      const shareText = hasScore
        ? `${match.home} ${sc.hg}-${sc.ag} ${match.away} · World Cup 2026${venueName ? " · " + venueName : ""}`
        : [
            `${match.home} vs ${match.away}`,
            `World Cup 2026`,
            match.date || "",
            localTime || "",
            venueName || "",
          ].filter(Boolean).join(" · ");
      navigator.share({
        title,
        text: shareText,
        url: finalUrl,
      }).catch(()=>{});
    } else {
      navigator.clipboard?.writeText(finalUrl).then(()=>alert("Link copied!")).catch(()=>{});
    }
  };

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.bg,border:`1px solid ${C.b2}`,borderRadius:"18px 18px 0 0",width:"100%",maxWidth:620,maxHeight:"92vh",overflowY:"auto",paddingBottom:20}}>

        {/* ── HERO HEADER ── */}
        <div style={{background:`linear-gradient(135deg,${C.s1},${C.s2})`,padding:"16px 18px 20px",position:"relative"}}>
          <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"none",border:"none",color:C.mid,fontSize:22,cursor:"pointer"}}>×</button>

          {/* Stage + match info */}
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:12,color:C.dim,fontWeight:700,letterSpacing:"0.1em"}}>{match.group?`GROUP ${match.group}`:(match.stage||"WORLD CUP 2026").toUpperCase()}</div>
            {match.date && <div style={{fontSize:13,color:C.mid,marginTop:2}}>{match.date} · {localTime}</div>}
          </div>

          {/* Teams hero */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
            {/* Home */}
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              <Crest team={match.home} size={64}/>
              <span style={{fontWeight:700,fontSize:16,color:favTeams.includes(match.home)?C.gold:C.text,textAlign:"center"}}>{match.home}</span>
            </div>
            {/* Score / vs */}
            <div style={{textAlign:"center",minWidth:80}}>
              {hasScore ? (
                <>
                  <div style={{fontWeight:900,fontSize:44,color:live?C.green:C.text,fontFamily:"monospace",lineHeight:1}}>{sc.hg}–{sc.ag}</div>
                  <div style={{fontSize:11,fontWeight:700,color:live?C.green:C.dim,marginTop:4}}>
                    {live?"🔴 ":""}{statusLabel(sc.status,sc.elapsed)||"FT"}
                  </div>
                </>
              ) : (
                <>
                  <div style={{fontSize:13,fontWeight:700,color:C.dim}}>VS</div>
                  <div style={{fontSize:11,color:C.dim,marginTop:4}}>Upcoming</div>
                </>
              )}
            </div>
            {/* Away */}
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              <Crest team={match.away} size={64}/>
              <span style={{fontWeight:700,fontSize:16,color:favTeams.includes(match.away)?C.gold:C.text,textAlign:"center"}}>{match.away}</span>
            </div>
          </div>
        </div>

        <div style={{padding:"14px 18px"}}>

          {/* ── VENUE ── */}
          <div onClick={()=>openMaps(match.venue)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,marginBottom:12,cursor:"pointer"}}>
            <span style={{fontSize:20}}>📍</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:C.blue,textDecoration:"underline",textDecorationStyle:"dotted"}}>{match.venue.split(",")[0]}</div>
              <div style={{fontSize:11,color:C.dim,marginTop:2}}>{match.venue.split(",").slice(1).join(",").trim()} · Tap for directions</div>
            </div>
            {(() => { const city = VENUE_TO_CITY[match.venue]; const cityData = city ? HOST_CITIES[city] : null; return cityData ? <WeatherBadge lat={cityData.lat} lon={cityData.lon}/> : null; })()}
          </div>

          {/* ── TV ── */}
          {match.tv && (
            <div style={{padding:"10px 14px",background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:bc.streaming?6:0}}>
                <span style={{fontSize:16}}>📺</span>
                <div style={{fontSize:13,color:C.gold,fontWeight:600}}>{isUS ? match.tv : `${bc.note} ${bc.primary}`}</div>
              </div>
              {bc.streaming && (
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16}}>💻</span>
                  <div style={{fontSize:12,color:C.mid}}>{bc.streaming}</div>
                </div>
              )}
            </div>
          )}

          {/* ── ODDS ── */}
          {!finished && simOdds && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>WIN PROBABILITY</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[
                  {label:match.home, sim:simOdds.win1, poly:p1?.poly, color:C.green},
                  {label:"Draw",     sim:simOdds.draw,  poly:null,     color:C.gold},
                  {label:match.away, sim:simOdds.win2, poly:p2?.poly, color:C.rival},
                ].map(({label,sim,poly,color})=>(
                  <div key={label} style={{background:C.s1,border:`1px solid ${color}33`,borderRadius:10,padding:"10px 6px",textAlign:"center"}}>
                    {/* Simulator always primary, Polymarket as secondary if available */}
                    <div style={{fontSize:22,fontWeight:900,color,lineHeight:1}}>{sim}%</div>
                    <div style={{fontSize:9,color:C.dim,marginTop:2,marginBottom:poly?4:0}}>Simulator</div>
                    {poly && (
                      <div style={{borderTop:`1px solid ${color}22`,paddingTop:4,fontSize:11,color:C.dim}}>
                        {poly}% <span style={{fontSize:9}}>🏆 to lift trophy</span>
                      </div>
                    )}
                    <div style={{fontSize:10,color:C.mid,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</div>
                  </div>
                ))}
              </div>
              {(p1||p2) && <div style={{fontSize:10,color:C.dim,marginTop:6,textAlign:"right"}}>Polymarket: chance to win the tournament · Simulator: match odds from {(5000).toLocaleString()} runs</div>}
              {(!p1&&!p2) && <div style={{fontSize:10,color:C.dim,marginTop:6,textAlign:"right"}}>Based on {(5000).toLocaleString()} simulated tournaments</div>}
            </div>
          )}

          {/* ── MATCH STATS ── */}
          {matchStats && (live || finished) && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>MATCH STATS</div>
              {[
                ["Possession", matchStats.home.possession, matchStats.away.possession, true, "%"],
                ["Shots", matchStats.home.shots, matchStats.away.shots, false, ""],
                ["Shots on Target", matchStats.home.shotsOn, matchStats.away.shotsOn, false, ""],
                ["Corners", matchStats.home.corners, matchStats.away.corners, false, ""],
                ["Fouls", matchStats.home.fouls, matchStats.away.fouls, true, ""],
                ["Pass Accuracy", matchStats.home.passAcc, matchStats.away.passAcc, true, "%"],
              ].filter(([,h,a]) => h!==null && a!==null).map(([label, hv, av, lowerBetter, unit]) => {
                const total = hv + av || 1;
                const hPct = Math.round((hv/total)*100);
                return (
                  <div key={label} style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                      <span style={{fontWeight:700,color:C.green}}>{hv}{unit}</span>
                      <span style={{color:C.dim,fontSize:11}}>{label}</span>
                      <span style={{fontWeight:700,color:C.rival}}>{av}{unit}</span>
                    </div>
                    <div style={{height:4,background:C.s2,borderRadius:2,overflow:"hidden",display:"flex"}}>
                      <div style={{width:`${hPct}%`,background:C.green,borderRadius:"2px 0 0 2px"}}/>
                      <div style={{flex:1,background:C.rival}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── MATCH EVENTS ── */}
          {(live || finished) && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>MATCH TIMELINE</div>
              {loading && (
                <div style={{textAlign:"center",padding:"20px 0"}}>
                  <div style={{width:22,height:22,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 8px"}}/>
                  <div style={{fontSize:12,color:C.mid}}>Loading events…</div>
                </div>
              )}
              {!loading && events && events.length > 0 && events.map((ev,i)=>{
                const isHome = normTeam(ev.team?.name||"")=== match.home;
                const icon = ev.type==="Goal"?(ev.detail==="Own Goal"?"⚽🔴":ev.detail==="Penalty"?"⚽🎯":"⚽"):ev.type==="Card"?(ev.detail==="Yellow Card"?"🟨":"🟥"):ev.type==="subst"?"🔄":"•";
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:`1px solid ${C.b1}`}}>
                    <div style={{flex:1,textAlign:"right"}}>
                      {isHome && <span style={{fontSize:13,color:C.text,fontWeight:ev.type==="Goal"?700:400}}>{ev.player?.name||""}</span>}
                      {isHome && ev.type==="subst" && <div style={{fontSize:10,color:C.dim}}>↑ {ev.assist?.name||""}</div>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:52,flexShrink:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.gold}}>{ev.time?.elapsed}{ev.time?.extra?`+${ev.time.extra}`:""}'</div>
                      <div style={{fontSize:16}}>{icon}</div>
                    </div>
                    <div style={{flex:1}}>
                      {!isHome && <span style={{fontSize:13,color:C.text,fontWeight:ev.type==="Goal"?700:400}}>{ev.player?.name||""}</span>}
                      {!isHome && ev.type==="subst" && <div style={{fontSize:10,color:C.dim}}>↑ {ev.assist?.name||""}</div>}
                    </div>
                  </div>
                );
              })}
              {!loading && events && events.length === 0 && <div style={{fontSize:12,color:C.dim,textAlign:"center",padding:"16px 0"}}>No events yet.</div>}
            </div>
          )}

          {/* ── ACTIONS ── */}
          <div style={{display:"flex",gap:8,marginTop:8}}>
            {!finished && (()=>{ const isSaved=savedIds.has(match.id); return (
              <button onClick={()=>{onAction(match);onClose();}} style={{flex:1,padding:"11px 0",borderRadius:12,background:isSaved?`${C.gold}22`:`linear-gradient(135deg,${C.green},#22c55e)`,border:isSaved?`1px solid ${C.gold}`:"none",color:isSaved?"#f59e0b":"#030a05",fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <StarIcon filled={isSaved} size={15}/>{isSaved?"Saved":"Save Match"}
              </button>
            ); })()}
            <button onClick={shareMatch} style={{flex:1,padding:"11px 0",borderRadius:12,background:`${C.blue}22`,border:`1px solid ${C.blue}44`,color:C.blue,fontWeight:700,fontSize:14,cursor:"pointer"}}>{"📤 Share"}</button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── TOP SCORERS TAB ───────────────────────────────────────────────────────
// Pre-tournament "ones to watch" — will be replaced by live data after Jun 11
const ONES_TO_WATCH = [
  {name:"Kylian Mbappé",    team:"France",       flag:"🇫🇷", pos:"FW", club:"Real Madrid",   note:"Golden Boot favourite"},
  {name:"Erling Haaland",   team:"Norway",        flag:"🇳🇴", pos:"FW", club:"Man City",       note:"Most prolific striker alive"},
  {name:"Vinicius Jr.",     team:"Brazil",        flag:"🇧🇷", pos:"FW", club:"Real Madrid",   note:"Ballon d'Or contender"},
  {name:"Harry Kane",       team:"England",       flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", pos:"FW", club:"Bayern Munich",  note:"England all-time top scorer"},
  {name:"Lamine Yamal",     team:"Spain",         flag:"🇪🇸", pos:"FW", club:"Barcelona",     note:"Euro 2024 breakout star"},
  {name:"Mohamed Salah",    team:"Egypt",         flag:"🇪🇬", pos:"FW", club:"Liverpool",     note:"World's best right now"},
  {name:"Lionel Messi",     team:"Argentina",     flag:"🇦🇷", pos:"FW", club:"Inter Miami",   note:"The GOAT · last hurrah"},
  {name:"Cristiano Ronaldo",team:"Portugal",      flag:"🇵🇹", pos:"FW", club:"Al Nassr",      note:"Final World Cup at 41"},
  {name:"Jamal Musiala",    team:"Germany",       flag:"🇩🇪", pos:"MF", club:"Bayern Munich",  note:"Silky dribbler"},
  {name:"Florian Wirtz",    team:"Germany",       flag:"🇩🇪", pos:"MF", club:"Bayer Leverkusen",note:"Bundesliga's best"},
  {name:"Pedri",            team:"Spain",         flag:"🇪🇸", pos:"MF", club:"Barcelona",     note:"Generational talent"},
  {name:"Martin Ødegaard",  team:"Norway",        flag:"🇳🇴", pos:"MF", club:"Arsenal",       note:"Arsenal captain"},
  {name:"Jude Bellingham",  team:"England",       flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", pos:"MF", club:"Real Madrid",   note:"World-class at 21"},
  {name:"Kevin De Bruyne",  team:"Belgium",       flag:"🇧🇪", pos:"MF", club:"Napoli",        note:"World's best midfielder"},
  {name:"Rodri",            team:"Spain",         flag:"🇪🇸", pos:"MF", club:"Man City",       note:"2024 Ballon d'Or"},
  {name:"Darwin Núñez",     team:"Uruguay",       flag:"🇺🇾", pos:"FW", club:"Liverpool",     note:"Powerful & explosive"},
  {name:"Luis Díaz",        team:"Colombia",      flag:"🇨🇴", pos:"FW", club:"Liverpool",     note:"PL class winger"},
  {name:"Son Heung-min",    team:"South Korea",   flag:"🇰🇷", pos:"FW", club:"Tottenham",     note:"Carries entire nation"},
  {name:"Takefusa Kubo",    team:"Japan",         flag:"🇯🇵", pos:"MF", club:"Real Sociedad",  note:"Japan's golden boy"},
  {name:"Achraf Hakimi",    team:"Morocco",       flag:"🇲🇦", pos:"DF", club:"PSG",           note:"World's best RB"},
];

function TopScorersTab({ tabTop=116 }) {
  const { allFixtures } = useContext(LiveScoresCtx);
  const [filter, setFilter] = useState("all");

  // Try to build live scorers from allFixtures events
  const liveScorers = useMemo(() => {
    if (!allFixtures?.length) return [];
    const scorers = {};
    allFixtures.forEach(f => {
      const events = f.events || [];
      events.forEach(ev => {
        if (ev.type !== "Goal" || ev.detail === "Own Goal") return;
        const player = ev.player?.name;
        const teamName = normTeam(ev.team?.name || "");
        if (!player) return;
        const key = player;
        if (!scorers[key]) scorers[key] = { name:player, team:teamName, goals:0, assists:0 };
        scorers[key].goals++;
      });
      // Assists
      events.forEach(ev => {
        if (ev.type !== "Goal" || ev.detail === "Own Goal") return;
        const player = ev.assist?.name;
        const teamName = normTeam(ev.team?.name || "");
        if (!player) return;
        if (!scorers[player]) scorers[player] = { name:player, team:teamName, goals:0, assists:0 };
        scorers[player].assists++;
      });
    });
    return Object.values(scorers).sort((a,b)=>b.goals-a.goals||(b.goals+b.assists)-(a.goals+a.assists));
  }, [allFixtures]);

  const hasLive = liveScorers.length > 0;
  const _tshRef = useRef(null); const _tshH = useElemHeight(_tshRef);

  return (
    <div>
      <div ref={_tshRef} style={{position:"fixed",top:tabTop,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:700,willChange:"transform",zIndex:90,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:`0 2px 8px rgba(0,0,0,0.8)`,padding:"8px 13px"}}>
        <div style={{fontWeight:700,fontSize:15,color:C.green,marginBottom:!hasLive?4:0}}>{"TOP SCORERS"} <span style={{fontSize:11,color:C.dim,fontWeight:400}}>{hasLive?"· "+"Live data":"· "+"Pre-tournament"}</span></div>
        {!hasLive && (
          <div style={{display:"flex",gap:6}}>
            <Pill active={filter==="all"} onClick={()=>setFilter("all")}  color={C.green}>{"All"}</Pill>
            <Pill active={filter==="FW"}  onClick={()=>setFilter("FW")}   color={C.red}>{"Strikers"}</Pill>
            <Pill active={filter==="MF"}  onClick={()=>setFilter("MF")}   color={C.gold}>{"Midfielders"}</Pill>
            <Pill active={filter==="DF"}  onClick={()=>setFilter("DF")}   color={C.blue}>{"Defenders"}</Pill>
          </div>
        )}
      </div>
      
      <div style={{height:(_tshH||68)+8}}/>
      {!hasLive && (
          <div>
          {ONES_TO_WATCH.filter(p=>filter==="all"||p.pos===filter).map((p,i) => (
            <Card key={p.name} style={{marginBottom:7}}>
              <div style={{padding:"10px 13px",display:"flex",alignItems:"center",gap:10}}>
                <div style={{fontWeight:700,color:C.dim,minWidth:24,fontSize:13,textAlign:"center"}}>#{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                    <span style={{fontWeight:700,color:C.text,fontSize:14}}>{p.name}</span>
                    <span style={{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:6,
                      background:p.pos==="FW"?`${C.red}22`:p.pos==="MF"?`${C.gold}22`:`${C.blue}22`,
                      color:p.pos==="FW"?C.red:p.pos==="MF"?C.gold:C.blue}}>{p.pos}</span>
                  </div>
                  <div style={{fontSize:11,color:C.dim}}>{p.flag} {p.team} · {p.club}</div>
                  <div style={{fontSize:11,color:C.mid,marginTop:2,fontStyle:"italic"}}>{p.note}</div>
                </div>
                <Crest team={p.team} size={28}/>
              </div>
            </Card>
          ))}
        </div>
      )}

      {hasLive && (
        <div>
          {liveScorers.slice(0,20).map((p,i) => {
            const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
            return (
              <Card key={p.name} style={{marginBottom:7}}>
                <div style={{padding:"10px 13px",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{fontWeight:700,color:C.dim,minWidth:26,fontSize:14,textAlign:"center"}}>{medal||`#${i+1}`}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:C.text,fontSize:14,marginBottom:2}}>{p.name}</div>
                    <div style={{fontSize:11,color:C.dim}}>{getFlag(p.team)} {p.team}</div>
                  </div>
                  <div style={{textAlign:"center",minWidth:40}}>
                    <div style={{fontWeight:900,fontSize:24,color:i===0?C.green:i<3?C.gold:C.mid,lineHeight:1}}>{p.goals}</div>
                    <div style={{fontSize:9,color:C.dim}}>goals</div>
                  </div>
                  <div style={{textAlign:"center",minWidth:36}}>
                    <div style={{fontWeight:700,fontSize:16,color:C.blue,lineHeight:1}}>{p.assists}</div>
                    <div style={{fontSize:9,color:C.dim}}>assists</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── FOOTBALL ICONS ─────────────────────────────────────────────────────────
const FLAG_CODES_MAP = {"Mexico":"mx","South Africa":"za","South Korea":"kr","Czechia":"cz","Canada":"ca","Bosnia & Herz.":"ba","Qatar":"qa","Switzerland":"ch","Brazil":"br","Morocco":"ma","Haiti":"ht","Scotland":"gb-sct","United States":"us","Paraguay":"py","Australia":"au","Turkiye":"tr","Germany":"de","Curacao":"cw","Ivory Coast":"ci","Ecuador":"ec","Netherlands":"nl","Japan":"jp","Sweden":"se","Tunisia":"tn","Belgium":"be","Egypt":"eg","Iran":"ir","New Zealand":"nz","Spain":"es","Cape Verde":"cv","Saudi Arabia":"sa","Uruguay":"uy","France":"fr","Senegal":"sn","Iraq":"iq","Norway":"no","Argentina":"ar","Algeria":"dz","Austria":"at","Jordan":"jo","Portugal":"pt","DR Congo":"cd","Uzbekistan":"uz","Colombia":"co","England":"gb-eng","Croatia":"hr","Ghana":"gh","Panama":"pa"};

const G_COL = "#4ade80", GO_COL = "#f59e0b";
const FOOTBALL_ICONS = [
  { id:"icon:ball",    label:"Ball",        el:(s)=><svg width={s} height={s} viewBox="0 0 76 76"><circle cx="32" cy="32" r="22" fill="none" stroke={G_COL} strokeWidth="2.5"/><circle cx="32" cy="32" r="7" fill={G_COL}/></svg> },
  { id:"icon:trophy",  label:"Trophy",      el:(s)=><svg width={s} height={s} viewBox="0 0 76 76"><path d="M20 10 L20 36 Q20 46 32 46 L44 46 Q56 46 56 36 L56 10 Z" fill="none" stroke={GO_COL} strokeWidth="2.2" strokeLinejoin="round"/><path d="M20 18 Q8 18 8 28 Q8 38 20 38" fill="none" stroke={GO_COL} strokeWidth="2.2"/><path d="M56 18 Q68 18 68 28 Q68 38 56 38" fill="none" stroke={GO_COL} strokeWidth="2.2"/><rect x="29" y="46" width="6" height="10" fill={GO_COL}/><rect x="22" y="56" width="20" height="4" rx="2" fill={GO_COL}/></svg> },
  { id:"icon:boot",    label:"Boot",        el:(s)=><svg width={s} height={s} viewBox="0 0 76 76"><path d="M22 52 L22 20 Q22 13 29 13 L42 13 Q49 13 49 20 L49 32 L58 32 Q65 32 65 39 L65 52 Q65 58 58 58 L29 58 Q22 58 22 52 Z" fill="none" stroke={G_COL} strokeWidth="2.2" strokeLinejoin="round"/></svg> },
  { id:"icon:goal",    label:"Goal",        el:(s)=><svg width={s} height={s} viewBox="0 0 76 76"><rect x="10" y="18" width="60" height="38" rx="2" fill="none" stroke={G_COL} strokeWidth="2.2"/><line x1="10" y1="56" x2="37" y2="24" stroke={G_COL} strokeWidth="1" opacity="0.35"/><line x1="37" y1="56" x2="64" y2="24" stroke={G_COL} strokeWidth="1" opacity="0.35"/><line x1="28" y1="18" x2="28" y2="56" stroke={G_COL} strokeWidth="1" opacity="0.35"/><line x1="46" y1="18" x2="46" y2="56" stroke={G_COL} strokeWidth="1" opacity="0.35"/></svg> },
  { id:"icon:whistle", label:"Whistle",     el:(s)=><svg width={s} height={s} viewBox="0 0 76 76"><circle cx="34" cy="36" r="18" fill="none" stroke={GO_COL} strokeWidth="2.2"/><circle cx="34" cy="36" r="7" fill={GO_COL}/><path d="M52 36 L66 29 L70 34 L56 41 Z" fill={GO_COL}/></svg> },
  { id:"icon:gloves",  label:"Gloves",      el:(s)=><svg width={s} height={s} viewBox="0 0 76 76"><path d="M24 54 L24 24 Q24 16 32 16 L34 16 Q40 16 40 22 L40 30 Q44 25 50 25 Q56 25 56 31 L56 36 Q60 31 66 33 Q72 36 70 42 L60 58 Q55 64 48 64 L34 64 Q24 64 24 54 Z" fill="none" stroke={G_COL} strokeWidth="2.2" strokeLinejoin="round"/></svg> },
  { id:"icon:jersey",  label:"Jersey",      el:(s)=><svg width={s} height={s} viewBox="0 0 76 76"><path d="M18 18 L8 38 L22 42 L22 68 L54 68 L54 42 L68 38 L58 18 Q50 26 38 26 Q26 26 18 18 Z" fill="none" stroke={G_COL} strokeWidth="2.2" strokeLinejoin="round"/></svg> },
  { id:"icon:var",     label:"VAR",         el:(s)=><svg width={s} height={s} viewBox="0 0 76 76"><rect x="10" y="20" width="56" height="34" rx="4" fill="none" stroke={GO_COL} strokeWidth="2.2"/><text x="38" y="43" textAnchor="middle" fontSize="14" fontWeight="700" fill={GO_COL} fontFamily="system-ui">VAR</text></svg> },
  { id:"icon:captain", label:"Captain",     el:(s)=><svg width={s} height={s} viewBox="0 0 76 76"><rect x="14" y="24" width="48" height="26" rx="13" fill="none" stroke={GO_COL} strokeWidth="2.2"/><text x="38" y="43" textAnchor="middle" fontSize="22" fontWeight="700" fill={GO_COL} fontFamily="system-ui">C</text></svg> },
  { id:"icon:flag",    label:"Corner flag", el:(s)=><svg width={s} height={s} viewBox="0 0 76 76"><line x1="32" y1="65" x2="32" y2="14" stroke={G_COL} strokeWidth="3" strokeLinecap="round"/><path d="M32 14 L60 24 L32 34 Z" fill={G_COL}/><circle cx="32" cy="68" r="5" fill={G_COL}/></svg> },
  { id:"icon:golden",  label:"Golden Boot", el:(s)=><svg width={s} height={s} viewBox="0 0 76 76"><path d="M22 50 L22 22 Q22 15 29 15 L44 15 Q51 15 51 22 L51 34 L62 34 Q69 34 69 41 L69 50 Q69 56 62 56 L29 56 Q22 56 22 50 Z" fill={GO_COL} opacity="0.9"/><circle cx="24" cy="10" r="5" fill={GO_COL}/><circle cx="36" cy="7" r="5" fill={GO_COL}/><circle cx="48" cy="10" r="5" fill={GO_COL}/></svg> },
  { id:"icon:tactics", label:"Tactics",     el:(s)=><svg width={s} height={s} viewBox="0 0 76 76"><rect x="8" y="14" width="60" height="44" rx="4" fill="#1a3828" stroke={G_COL} strokeWidth="2"/><circle cx="38" cy="26" r="5" fill={G_COL}/><circle cx="20" cy="36" r="5" fill={G_COL} opacity="0.7"/><circle cx="56" cy="36" r="5" fill={G_COL} opacity="0.7"/><circle cx="28" cy="47" r="5" fill={GO_COL}/><circle cx="48" cy="47" r="5" fill={GO_COL}/></svg> },
];

// ── SYNC MODAL ─────────────────────────────────────────────────────────────
function SyncModal({ open, onClose, syncProfile, setSyncProfile, syncUid, saved, favTeams, setToast, setSaved, setFavTeams, dark, setDark, geoData, locationOverride, setLocationOverride, onShowSaved, userAvatar, persistAvatar, displayName, persistDisplayName, onSignOut=()=>{} }) {
  const [screen, setScreen] = useState("home");
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [email, setEmail] = useState(syncProfile?.email || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [teamsExpanded, setTeamsExpanded] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarTab, setAvatarTab] = useState("icons");
  const [avatarSearch, setAvatarSearch] = useState("");
  const [nameInput, setNameInput] = useState(displayName || "");
  const [nameEditing, setNameEditing] = useState(false);

  useEffect(() => { if (open) { setScreen("home"); setError(""); } }, [open]);
  if (!open) return null;

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 640;
  const isSynced = !!syncProfile;
  const persistProfile = (p) => { setSyncProfile(p); try { localStorage.setItem("wc2026_syncprofile", JSON.stringify(p)); } catch {} };

  const ALL_TEAMS_LIST = Object.values(GROUPS).flatMap(g=>g.teams).sort();
  const filteredTeams = avatarSearch ? ALL_TEAMS_LIST.filter(t=>t.toLowerCase().includes(avatarSearch.toLowerCase())) : ALL_TEAMS_LIST;

  const selectPresetAvatar = (id) => { persistAvatar(id); setShowAvatarPicker(false); setToast("Avatar updated!"); };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image(); img.onload = () => {
        const canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = 160;
        const ctx = canvas.getContext("2d");
        const size = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width-size)/2, (img.height-size)/2, size, size, 0, 0, 160, 160);
        persistAvatar(canvas.toDataURL("image/jpeg", 0.7));
        setShowAvatarPicker(false); setToast("Avatar updated!");
      }; img.src = ev.target.result;
    }; reader.readAsDataURL(file);
  };

  const handleCreatePIN = async () => {
    if (pin.length < 6) { setError("Please enter a 6-digit PIN."); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/sync?action=pin-create", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ uid:syncUid, saved, favTeams, dark, locationOverride, displayName, avatar:userAvatar, myBracket:readSavedMyBracket(), chosenPin:pin }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error);
      persistProfile({ uid:syncUid, pin:d.pin, method:"pin" });
      setScreen("pin-created");
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const handleJoinPIN = async () => {
    if (pinInput.length < 6) return;
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/sync?action=pin-join", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ pin:pinInput }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || "PIN not found.");
      const p = d.profile;
      if (p.saved?.length) setSaved(p.saved);
      if (p.favTeams?.length) setFavTeams(p.favTeams);
      if (p.dark !== undefined) setDark(p.dark);
      if (p.locationOverride) { setLocationOverride(p.locationOverride); try { localStorage.setItem("wc2026_location", JSON.stringify(p.locationOverride)); } catch {} }
      if (p.avatar) persistAvatar(p.avatar);
      if (p.displayName) persistDisplayName(p.displayName);
      if (p.myBracket) restoreSavedMyBracket(p.myBracket);
      persistProfile({ uid:p.uid, pin:p.pin, email:p.email, method:"pin" });
      setToast("✅ Synced! Your progress has been restored."); onClose();
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const handleSendMagic = async () => {
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/sync?action=magic-send", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ email, uid:syncUid, saved, favTeams, dark, locationOverride, displayName, avatar:userAvatar, myBracket:readSavedMyBracket() }) });
      const d = await r.json();
      if (!d.ok && !d.dev) throw new Error(d.error);
      setScreen("email-sent");
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const inputStyle = { width:"100%", padding:"11px 14px", background:C.s2, border:`1px solid ${C.b2}`, borderRadius:10, color:C.text, fontSize:15, outline:"none", boxSizing:"border-box" };
  const btnPrimary = { width:"100%", padding:"13px 0", borderRadius:12, border:"none", background:`linear-gradient(135deg,${C.green},#22c55e)`, color:"#030a05", fontWeight:700, fontSize:15, cursor:"pointer" };
  const btnSecondary = { width:"100%", padding:"11px 0", borderRadius:12, border:`1px solid ${C.b2}`, background:C.s2, color:C.text, fontWeight:600, fontSize:14, cursor:"pointer", marginTop:8 };

  const screenTitle = { home:"My Account","pin-create":"Create PIN","pin-created":"Your PIN","pin-join":"Enter PIN",email:"Sign in with Email","email-sent":"Check Your Email",predictions:"My Predictions",teams:"My Teams",location:"Location","pin-change":"Change PIN" }[screen] || "My Account";

  const renderAvatarImg = (size) => {
    if (!userAvatar) return <span style={{fontSize:size*0.6}}>👤</span>;
    if (userAvatar.startsWith("data:")) return <img src={userAvatar} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="avatar"/>;
    if (userAvatar.startsWith("icon:")) { const ic=FOOTBALL_ICONS.find(i=>i.id===userAvatar); return ic?ic.el(size):<span style={{fontSize:size*0.6}}>⚽</span>; }
    if (userAvatar.startsWith("flag:")) { const code=FLAG_CODES_MAP[userAvatar.slice(5)]; return code?<img src={`https://flagcdn.com/w80/${code}.png`} crossOrigin="anonymous" style={{width:"100%",height:"100%",objectFit:"cover"}} alt="flag"/>:<span style={{fontSize:size*0.6}}>🏳️</span>; }
    return <span style={{fontSize:size*0.6}}>👤</span>;
  };

  const homeContent = (
    <div style={{padding:isDesktop?"18px 28px 0":"16px 20px 0"}}>
      {/* Account card */}
      <div style={{padding:isDesktop?"20px 26px":"16px 18px",background:`linear-gradient(135deg,${C.s2},${C.s1})`,borderRadius:18,marginBottom:18,border:`1px solid ${isSynced?C.green+"66":C.b1}`,boxShadow:"0 14px 34px rgba(0,0,0,0.24)"}}>
        <div style={{display:"flex",alignItems:"center",gap:isDesktop?22:14}}>
          <div onClick={()=>setShowAvatarPicker(true)} style={{position:"relative",width:isDesktop?74:62,height:isDesktop?74:62,borderRadius:"50%",flexShrink:0,background:isSynced?`${C.green}22`:C.bg,border:`3px solid ${isSynced?C.green:C.b2}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden"}}>
            {renderAvatarImg(isDesktop?54:42)}
            <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,.45)",fontSize:9,color:"#fff",textAlign:"center",padding:"2px 0",lineHeight:1.4}}>edit</div>
          </div>
          <div style={{flex:1,minWidth:0}}>
            {nameEditing
              ? <input autoFocus value={nameInput} onChange={e=>setNameInput(e.target.value)}
                  onBlur={()=>{persistDisplayName(nameInput.trim());setNameEditing(false);}}
                  onKeyDown={e=>{if(e.key==="Enter"){persistDisplayName(nameInput.trim());setNameEditing(false);}}}
                  maxLength={24}
                  style={{background:"none",border:"none",borderBottom:`1px solid ${C.green}`,outline:"none",color:C.text,fontSize:16,fontWeight:800,width:"100%",padding:"2px 0"}}/>
              : <div onClick={()=>{setNameInput(displayName||"");setNameEditing(true);}} style={{cursor:"text"}}>
                  <div style={{fontWeight:displayName?900:700,color:displayName?C.text:C.dim,fontSize:displayName?(isDesktop?24:19):(isDesktop?16:13),lineHeight:1.08,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                    {displayName||<span style={{color:C.dim,fontStyle:"italic"}}>Tap to add your name</span>}
                    {displayName && <span style={{fontSize:10,color:C.dim,marginLeft:6,fontWeight:400}}>✏️</span>}
                  </div>
                </div>
            }
            {isSynced ? <>
              <div style={{fontSize:isDesktop?15:13,color:C.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:6}}>{syncProfile.email||"PIN User"}</div>
              {syncProfile.pin && <div style={{fontSize:isDesktop?15:13,color:C.mid,marginTop:2}}>PIN: <strong style={{color:C.gold,letterSpacing:"0.1em"}}>{syncProfile.pin}</strong></div>}
              <div style={{fontSize:isDesktop?15:13,color:C.green,fontWeight:800,marginTop:3}}>✅ Syncing</div>
            </> : <div style={{fontSize:11,color:C.dim,marginTop:3}}>Sign in to sync your saved matches, teams and bracket picks.</div>}
          </div>
          {isSynced && <button onClick={()=>{persistProfile(null);onSignOut();setToast("Signed out.");onClose();}} style={{fontSize:isDesktop?14:12,color:C.mid,background:C.bg,border:`1px solid ${C.b2}`,borderRadius:12,padding:isDesktop?"9px 16px":"7px 12px",cursor:"pointer",fontWeight:700,flexShrink:0}}>Sign out</button>}
        </div>
      </div>

      {/* My Teams — collapsible */}
      <div style={{marginBottom:10}}>
        <button onClick={()=>setTeamsExpanded(v=>!v)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 13px",background:C.s2,border:`1px solid ${teamsExpanded?C.gold+"44":C.b1}`,borderRadius:teamsExpanded?"10px 10px 0 0":10,cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>⭐</span>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text}}>My Teams</div>
              <div style={{fontSize:11,color:favTeams.length?C.gold:C.dim}}>{favTeams.length?favTeams.join(", "):"Tap to select up to 4 teams"}</div>
            </div>
          </div>
          <span style={{color:C.dim,fontSize:16,transition:"transform .2s",transform:teamsExpanded?"rotate(90deg)":"none"}}>›</span>
        </button>
        {teamsExpanded && (
          <div style={{background:C.s2,border:`1px solid ${C.gold}44`,borderTop:`1px solid ${C.b1}`,borderRadius:"0 0 10px 10px",padding:"10px 12px"}}>
            {favTeams.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>{favTeams.map(t=><div key={t} style={{display:"flex",alignItems:"center",gap:5,padding:"4px 8px",background:C.bg,border:`1px solid ${C.gold}44`,borderRadius:16}}><Crest team={t} size={16}/><span style={{fontSize:11,color:C.gold,fontWeight:600}}>{t}</span><button onClick={()=>setFavTeams(prev=>{const n=prev.filter(x=>x!==t);try{localStorage.setItem("wc2026_favs",JSON.stringify(n))}catch{};return n;})} style={{background:"none",border:"none",color:C.dim,fontSize:13,cursor:"pointer",padding:0}}>×</button></div>)}</div>}
            {favTeams.length<4
              ? <div style={{display:"flex",gap:5,flexWrap:"wrap",maxHeight:150,overflowY:"auto"}}>{Object.values(GROUPS).flatMap(g=>g.teams).sort().filter(t=>!favTeams.includes(t)).map(t=><button key={t} onClick={()=>{setFavTeams(prev=>{if(prev.length>=4)return prev;const n=[...prev,t];try{localStorage.setItem("wc2026_favs",JSON.stringify(n))}catch{};if(n.length===4)setTeamsExpanded(false);return n;});}} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:14,border:`1px solid ${C.b2}`,background:C.bg,color:C.mid,fontSize:11,cursor:"pointer"}}><Crest team={t} size={13}/>{t}</button>)}</div>
              : <div style={{fontSize:11,color:C.gold,textAlign:"center",padding:"6px 0"}}>4/4 teams selected ✓<button onClick={()=>setTeamsExpanded(false)} style={{display:"block",margin:"6px auto 0",padding:"5px 14px",borderRadius:8,border:`1px solid ${C.b2}`,background:"none",color:C.mid,fontSize:11,cursor:"pointer"}}>Done</button></div>
            }
          </div>
        )}
      </div>

      {/* My Matches */}
      <button onClick={()=>{onClose();onShowSaved();}} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 14px",background:C.s2,border:`1px solid ${C.b1}`,borderRadius:12,cursor:"pointer",marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>⭐</span><div style={{textAlign:"left"}}><div style={{fontWeight:700,color:C.text,fontSize:14}}>{"My Matches"}</div><div style={{fontSize:11,color:C.dim}}>{saved.length} match{saved.length!==1?"es":""} saved</div></div></div>
        <span style={{color:C.mid,fontSize:18}}>›</span>
      </button>

      <div style={{borderTop:`1px solid ${C.b1}`,margin:"4px 0 8px"}}/>

      {/* Sync section */}
      {!isSynced ? (
        <div>
          <div style={{fontSize:11,color:C.mid,fontWeight:700,letterSpacing:"0.08em",marginBottom:10}}>{"🔗 SYNC ACROSS DEVICES"}</div>
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <button onClick={()=>setScreen("pin-create")} style={{flex:1,padding:"11px 8px",borderRadius:12,border:`1px solid ${C.green}44`,background:`${C.green}15`,color:C.green,fontWeight:700,fontSize:13,cursor:"pointer"}}>🔢 Create PIN</button>
            <button onClick={()=>setScreen("pin-join")} style={{flex:1,padding:"11px 8px",borderRadius:12,border:`1px solid ${C.b2}`,background:C.bg,color:C.mid,fontWeight:600,fontSize:13,cursor:"pointer"}}>I have a PIN</button>
          </div>
          <button onClick={()=>setScreen("email")} style={{...btnSecondary,marginTop:0,fontSize:13}}>✉️ Continue with Email</button>
        </div>
      ) : (
        <>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
          <div style={{fontSize:11,color:C.dim,flex:1}}>✅ Syncing across devices</div>
          {syncProfile?.pin&&<button onClick={()=>{setPin("");setScreen("pin-change");setError("");}} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${C.b2}`,background:C.s2,color:C.mid,fontSize:11,fontWeight:600,cursor:"pointer",flexShrink:0}}>🔁 Change PIN</button>}
        </div>
        <div style={{textAlign:"center",marginTop:10}}>
          <span style={{fontSize:10,color:C.dim}}>v{APP_VERSION} · {APP_DATE}</span>
        </div>
        </>
      )}

      {/* Avatar picker overlay */}
      {showAvatarPicker&&(
        <div onClick={()=>setShowAvatarPicker(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:1100,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.s1,border:`1px solid ${C.b2}`,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:520,maxHeight:"80vh",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px 12px",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
              <span style={{fontWeight:700,fontSize:16,color:C.green}}>Choose Avatar</span>
              <button onClick={()=>setShowAvatarPicker(false)} style={{background:"none",border:"none",color:C.mid,fontSize:22,cursor:"pointer"}}>×</button>
            </div>
            <div style={{display:"flex",borderBottom:`1px solid ${C.b1}`,flexShrink:0}}>
              {[["icons","⚽ Icons"],["flags","🏳️ Flags"],["upload","📷 Photo"]].map(([id,label])=>(
                <button key={id} onClick={()=>{setAvatarTab(id);setAvatarSearch("");}} style={{flex:1,padding:"10px 4px",background:"none",border:"none",borderBottom:`2px solid ${avatarTab===id?C.green:"transparent"}`,color:avatarTab===id?C.green:C.dim,fontWeight:avatarTab===id?700:400,fontSize:12,cursor:"pointer"}}>{label}</button>
              ))}
            </div>
            <div style={{overflowY:"auto",padding:12,flex:1}}>
              {avatarTab==="icons"&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{FOOTBALL_ICONS.map(icon=>{const active=userAvatar===icon.id;return(<button key={icon.id} onClick={()=>selectPresetAvatar(icon.id)} title={icon.label} style={{padding:"10px 4px",border:`2px solid ${active?C.green:C.b2}`,borderRadius:10,background:active?`${C.green}22`:C.s2,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>{icon.el(44)}<span style={{fontSize:9,color:active?C.green:C.dim,textAlign:"center"}}>{icon.label}</span></button>);})}</div>}
              {avatarTab==="flags"&&(<div><input value={avatarSearch} onChange={e=>setAvatarSearch(e.target.value)} placeholder="Search team..." style={{width:"100%",padding:"8px 12px",background:C.s2,border:`1px solid ${C.b2}`,borderRadius:8,color:C.text,fontSize:13,outline:"none",marginBottom:10,boxSizing:"border-box"}}/><div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6}}>{filteredTeams.map(team=>{const code=FLAG_CODES_MAP[team];const id=`flag:${team}`;const active=userAvatar===id;return code?(<button key={team} onClick={()=>selectPresetAvatar(id)} title={team} style={{padding:0,border:`2px solid ${active?C.green:"transparent"}`,borderRadius:8,background:"transparent",cursor:"pointer",overflow:"hidden",aspectRatio:"3/2",position:"relative"}}><img src={`https://flagcdn.com/w80/${code}.png`} crossOrigin="anonymous" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} alt={team} onError={e=>{e.target.style.display="none";}}/>{active&&<div style={{position:"absolute",top:2,right:2,width:12,height:12,borderRadius:"50%",background:C.green,fontSize:8,color:"#030a05",fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center"}}>✓</div>}</button>):null;})}</div></div>)}
              {avatarTab==="upload"&&<div style={{textAlign:"center",padding:"20px 0"}}><div style={{width:80,height:80,borderRadius:"50%",margin:"0 auto 16px",border:`2px dashed ${C.b2}`,background:C.s2,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{userAvatar?.startsWith("data:")?<img src={userAvatar} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="avatar"/>:<span style={{fontSize:32}}>📷</span>}</div><label style={{display:"inline-block",padding:"12px 24px",borderRadius:12,background:`linear-gradient(135deg,${C.green},#22c55e)`,color:"#030a05",fontWeight:700,fontSize:15,cursor:"pointer"}}>Choose Photo<input type="file" accept="image/*" onChange={handlePhotoUpload} style={{display:"none"}}/></label>{userAvatar?.startsWith("data:")&&<button onClick={()=>{persistAvatar(null);setToast("Photo removed.");}} style={{display:"block",margin:"12px auto 0",background:"none",border:"none",color:C.dim,fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Remove photo</button>}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const subScreenContent = (
    <div style={{padding:"16px 20px 24px"}}>
      {error&&<div style={{color:"#f87171",fontSize:13,marginBottom:12,padding:"10px 12px",background:"rgba(248,113,113,0.1)",borderRadius:8}}>{error}</div>}
      {screen==="pin-create"&&<div>
        <div style={{fontSize:13,color:C.dim,lineHeight:1.5,marginBottom:16}}>Choose a 6-digit PIN you'll remember. Enter it on any other device to sync your progress.</div>
        <input value={pin} onChange={e=>setPin(e.target.value.replace(/[^0-9]/g,"").slice(0,6))} placeholder="Choose a 6-digit PIN" inputMode="numeric" maxLength={6} style={{...inputStyle,fontSize:24,textAlign:"center",fontFamily:"monospace",letterSpacing:"0.2em",marginBottom:12}}/>
        <button onClick={handleCreatePIN} disabled={loading||pin.length<6} style={{...btnPrimary,opacity:loading||pin.length<6?0.5:1,marginBottom:8}}>{loading?"Saving...":"Set My PIN"}</button>
        <div style={{textAlign:"center",margin:"8px 0 4px",fontSize:12,color:C.dim}}>or</div>
        <button onClick={()=>setScreen("email")} style={{...btnSecondary,marginTop:0,fontSize:13}}>✉️ Sign in with Email instead</button>
      </div>}
      {screen==="pin-created"&&<div style={{textAlign:"center"}}>
        <div style={{fontSize:13,color:C.dim,marginBottom:16,lineHeight:1.5}}>Your sync PIN is set. Use it on any device to restore your progress.</div>
        <div style={{background:C.s2,border:`1px solid ${C.green}44`,borderRadius:14,padding:"20px 16px",marginBottom:20}}>
          <div style={{fontSize:11,color:C.mid,fontWeight:600,letterSpacing:"0.1em",marginBottom:8}}>YOUR PIN</div>
          <div style={{fontSize:40,fontWeight:900,color:C.green,letterSpacing:"0.2em",fontFamily:"monospace"}}>{syncProfile?.pin||pin}</div>
        </div>
        <div style={{fontSize:12,color:C.dim,marginBottom:20,lineHeight:1.5}}>Screenshot this. On another device, tap the profile icon → "I have a PIN".</div>
        <button onClick={onClose} style={btnPrimary}>Done</button>
        <button onClick={()=>{setPin("");setScreen("pin-change");setError("");}} style={{...btnSecondary,fontSize:13}}>🔁 Change PIN</button>
      </div>}
      {screen==="pin-change"&&<div>
        {syncProfile?.pin&&<div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:10,padding:"12px 14px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><div style={{fontSize:11,color:C.mid,fontWeight:600,marginBottom:2}}>CURRENT PIN</div><div style={{fontSize:24,fontWeight:900,color:C.dim,letterSpacing:"0.2em",fontFamily:"monospace"}}>{syncProfile.pin}</div></div><span style={{fontSize:11,color:C.dim}}>will be replaced</span></div>}
        <div style={{fontSize:13,color:C.dim,lineHeight:1.5,marginBottom:12}}>Enter a new 6-digit PIN.</div>
        <input value={pin} onChange={e=>setPin(e.target.value.replace(/[^0-9]/g,"").slice(0,6))} placeholder="New 6-digit PIN" inputMode="numeric" maxLength={6} style={{...inputStyle,fontSize:24,textAlign:"center",fontFamily:"monospace",letterSpacing:"0.2em",marginBottom:12}}/>
        <button onClick={async()=>{
          if(pin.length<6){setError("Please enter a 6-digit PIN.");return;}
          if(pin===syncProfile?.pin){setError("That's already your current PIN.");return;}
          setLoading(true);setError("");
          try{const r=await fetch("/api/sync?action=pin-change",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({uid:syncUid,oldPin:syncProfile?.pin,newPin:pin,saved,favTeams,dark,locationOverride,displayName,avatar:userAvatar,myBracket:readSavedMyBracket()})});const d=await r.json();if(!d.ok)throw new Error(d.error);persistProfile({...syncProfile,pin});setScreen("pin-created");}
          catch(e){setError(e.message);}
          setLoading(false);
        }} disabled={loading||pin.length<6} style={{...btnPrimary,opacity:loading||pin.length<6?0.5:1}}>{loading?"Saving...":"Update PIN"}</button>
      </div>}
      {screen==="pin-join"&&<div>
        <div style={{fontSize:13,color:C.dim,lineHeight:1.6,marginBottom:20}}>Enter the PIN from your other device to restore your progress here.</div>
        <input value={pinInput} onChange={e=>setPinInput(e.target.value.replace(/[^0-9]/g,"").slice(0,6))} placeholder="Enter 6-digit PIN" inputMode="numeric" maxLength={6} style={{...inputStyle,fontSize:24,textAlign:"center",fontFamily:"monospace",letterSpacing:"0.2em",marginBottom:12}}/>
        <button onClick={handleJoinPIN} disabled={loading||pinInput.length<6} style={{...btnPrimary,opacity:loading||pinInput.length<6?0.5:1}}>{loading?"Looking up...":"Restore My Progress"}</button>
      </div>}
      {screen==="email"&&<div>
        <div style={{fontSize:13,color:C.dim,lineHeight:1.6,marginBottom:20}}>Enter your email and we'll send a one-tap sign-in link. No password, no app to install.</div>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" type="email" inputMode="email" style={{...inputStyle,marginBottom:12}}/>
        <button onClick={handleSendMagic} disabled={loading} style={{...btnPrimary,opacity:loading?0.6:1}}>{loading?"Sending...":"Send Sign-in Link"}</button>
      </div>}
      {screen==="email-sent"&&<div style={{textAlign:"center",padding:"10px 0"}}>
        <div style={{fontSize:48,marginBottom:16}}>📬</div>
        <div style={{fontWeight:700,color:C.text,fontSize:17,marginBottom:8}}>Check your inbox</div>
        <div style={{fontSize:13,color:C.dim,lineHeight:1.6,marginBottom:20}}>We sent a sign-in link to <strong style={{color:C.text}}>{email}</strong>. The link expires in 15 minutes.</div>
        <div style={{fontSize:12,color:C.mid,background:C.s2,borderRadius:10,padding:"10px 14px"}}>Didn't get it? Check spam, or <button onClick={()=>setScreen("email")} style={{background:"none",border:"none",color:C.green,cursor:"pointer",fontSize:12,fontWeight:600,padding:0}}>try again</button>.</div>
      </div>}
    </div>
  );

  const header = (back) => (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 20px 14px",borderBottom:`1px solid ${C.b1}`,position:"sticky",top:0,background:C.s1,zIndex:1}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        {back&&<button onClick={()=>{setScreen("home");setError("");}} style={{background:"none",border:"none",color:C.mid,fontSize:22,cursor:"pointer",padding:"0 4px 0 0",lineHeight:1}}>‹</button>}
        <span style={{fontSize:17,fontWeight:700,color:C.green}}>{screenTitle}</span>
      </div>
      <button onClick={onClose} style={{background:"none",border:"none",color:C.mid,fontSize:24,cursor:"pointer"}}>×</button>
    </div>
  );

  const isHome = screen === "home";

  if (isDesktop) {
    return (
      <>
        <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:999}}/>
        <div onClick={e=>e.stopPropagation()} style={{position:"fixed",top:58,right:14,width:440,maxWidth:"calc(100vw - 28px)",background:C.s1,border:`1px solid ${C.b2}`,borderRadius:18,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",zIndex:1000,overflow:"hidden",maxHeight:"calc(92dvh - env(safe-area-inset-bottom))",overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:"env(safe-area-inset-bottom)"}}>
          {header(!isHome)}
          {isHome ? homeContent : subScreenContent}
        </div>
      </>
    );
  }

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.s1,border:`1px solid ${C.b2}`,borderRadius:"20px 20px 0 0",width:"100%",maxWidth:520,maxHeight:"calc(92dvh - env(safe-area-inset-bottom))",overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:"calc(48px + env(safe-area-inset-bottom))"}}>
        {header(!isHome)}
        {isHome ? homeContent : subScreenContent}
      </div>
    </div>
  );
}


// ── WC NEWS TAB ────────────────────────────────────────────────────────────
function timeAgo(isoStr) {
  const diff = (Date.now() - new Date(isoStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function QuickFacts({ tabTop }) {
  const { getScore, isFinished } = useContext(LiveScoresCtx);

  const finishedMatches = MATCHES.filter(m => isFinished(m.home, m.away));
  const scores = finishedMatches.map(m => {
    const sc = getScore(m.home, m.away);
    return sc ? { ...m, hg: sc.hg ?? 0, ag: sc.ag ?? 0 } : null;
  }).filter(Boolean);

  if (scores.length === 0) return (
    <div style={{background:C.s2,borderRadius:12,padding:16,marginBottom:16,border:`1px solid ${C.b1}`}}>
      <div style={{fontSize:12,fontWeight:700,color:C.mid,letterSpacing:"0.08em",marginBottom:8}}>{"⚡ TOURNAMENT FACTS"}</div>
      <div style={{fontSize:13,color:C.dim,textAlign:"center",padding:"12px 0"}}>{"Facts will appear here as matches are played."}</div>
    </div>
  );

  // Compute facts from live data
  const goalScorers = {};
  const matchGoals = scores.map(m => ({ m, total: m.hg + m.ag }));
  const highestScoring = matchGoals.sort((a,b)=>b.total-a.total)[0];
  const totalGoals = scores.reduce((s,m)=>s+m.hg+m.ag, 0);
  const avgGoals = (totalGoals / scores.length).toFixed(1);

  // Biggest upset: finished match where group underdog won
  // Use home/away position as proxy — away win = mild upset
  const awayWins = scores.filter(m => m.ag > m.hg);
  const biggestUpset = awayWins.length > 0 ? awayWins[awayWins.length - 1] : null;

  // Most one-sided match
  const mostOneSided = [...scores].sort((a,b)=>(Math.abs(b.hg-b.ag))-(Math.abs(a.hg-a.ag)))[0];
  const biggestMargin = mostOneSided ? Math.abs(mostOneSided.hg - mostOneSided.ag) : 0;

  // Clean sheets
  const cleanSheets = scores.filter(m => m.hg === 0 || m.ag === 0).length;

  const facts = [
    { icon:"⚽", label:"Goals scored", value:`${totalGoals} (avg ${avgGoals}/match)` },
    { icon:"🏟️", label:"Matches played", value:`${scores.length} of 72` },
    { icon:"🎯", label:"Clean sheets", value:`${cleanSheets}` },
    highestScoring && { icon:"🔥", label:"Highest-scoring match", value:`${highestScoring.m.home} ${highestScoring.m.hg}–${highestScoring.m.ag} ${highestScoring.m.away} (${highestScoring.total} goals)` },
    biggestMargin > 2 && mostOneSided && { icon:"💥", label:"Biggest win", value:`${mostOneSided.hg > mostOneSided.ag ? mostOneSided.home : mostOneSided.away} won ${Math.max(mostOneSided.hg,mostOneSided.ag)}–${Math.min(mostOneSided.hg,mostOneSided.ag)}` },
    biggestUpset && { icon:"😱", label:"Away win", value:`${biggestUpset.away} ${biggestUpset.ag}–${biggestUpset.hg} ${biggestUpset.home}` },
  ].filter(Boolean);

  return (
    <div style={{background:C.s2,borderRadius:12,padding:16,marginBottom:16,border:`1px solid ${C.b1}`}}>
      <div style={{fontSize:12,fontWeight:700,color:C.mid,letterSpacing:"0.08em",marginBottom:12}}>⚡ TOURNAMENT FACTS SO FAR</div>
      {facts.map((f,i) => (
        <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:i<facts.length-1?10:0}}>
          <span style={{fontSize:18,flexShrink:0}}>{f.icon}</span>
          <div>
            <div style={{fontSize:11,color:C.dim,fontWeight:600}}>{f.label}</div>
            <div style={{fontSize:13,color:C.text,fontWeight:600,marginTop:1}}>{f.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WCNewsTab({ tabTop=116 }) {
  const _ref = useRef(null);
  const _h = useElemHeight(_ref);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchNews = async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/news");
      const d = await r.json();
      if (d.articles?.length) { setArticles(d.articles); setLastFetch(Date.now()); }
      else setError("No articles found.");
    } catch(e) { setError("Couldn't load news. Try again."); }
    setLoading(false);
  };

  useEffect(() => { fetchNews(); }, []);

  return (
    <div>
      {/* Sticky header */}
      <div ref={_ref} style={{position:"fixed",top:tabTop,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:700,willChange:"transform",zIndex:90,background:C.bg,borderBottom:`1px solid ${C.b2}`,boxShadow:`0 2px 8px rgba(0,0,0,0.8)`,padding:"8px 13px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:15,fontWeight:700,color:C.green}}>{"📰 World Cup 2026 News"}</span>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {lastFetch && <span style={{fontSize:11,color:C.dim}}>Updated {timeAgo(new Date(lastFetch).toISOString())}</span>}
            <button onClick={fetchNews} disabled={loading} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${C.b2}`,background:C.s2,color:C.mid,fontSize:11,cursor:"pointer",opacity:loading?0.5:1}}>↻ Refresh</button>
          </div>
        </div>
      </div>
      

      <div style={{height:(_h||36)+8}}/>
      <div style={{padding:"0 0 20px"}}>
        {/* Tournament facts */}
        <QuickFacts tabTop={tabTop}/>

        {/* News feed */}
        <div style={{fontSize:12,fontWeight:700,color:C.mid,letterSpacing:"0.08em",marginBottom:10}}>{"🗞️ LATEST HEADLINES"}</div>

        {loading && (
          <div>
            {[1,2,3,4,5].map(i=><SkeletonNewsCard key={i}/>)}
          </div>
        )}

        {!loading && error && (
          <div style={{textAlign:"center",padding:"30px 0"}}>
            <div style={{fontSize:13,color:C.dim,marginBottom:12}}>{error}</div>
            <button onClick={fetchNews} style={{padding:"8px 20px",borderRadius:10,border:`1px solid ${C.green}`,background:`${C.green}15`,color:C.green,fontSize:13,cursor:"pointer"}}>Try again</button>
          </div>
        )}

        {!loading && !error && articles.map((a, i) => (
          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" style={{display:"block",textDecoration:"none",marginBottom:10}}>
            <div style={{background:C.s2,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden",display:"flex",gap:0,transition:"border-color .15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.green}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.b1}>
              {a.image && (
                <img src={a.image} alt="" style={{width:90,height:90,objectFit:"cover",flexShrink:0}}
                  onError={e=>{e.target.style.display="none";}}/>
              )}
              <div style={{padding:"10px 12px",flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.text,lineHeight:1.4,marginBottom:4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{a.title}</div>
                {a.description && <div style={{fontSize:11,color:C.dim,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",marginBottom:6}}>{a.description}</div>}
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:10,color:C.mid,fontWeight:600}}>{a.source}</span>
                  <span style={{fontSize:10,color:C.dim}}>·</span>
                  <span style={{fontSize:10,color:C.dim}}>{timeAgo(a.publishedAt)}</span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}



// ── SKELETON LOADERS ───────────────────────────────────────────────────────
function SkeletonBlock({ width="100%", height=14, radius=6, style={} }) {
  return (
    <div style={{
      width, height, borderRadius:radius,
      background:`linear-gradient(90deg,${C.s2} 25%,${C.b1} 50%,${C.s2} 75%)`,
      backgroundSize:"200% 100%",
      animation:"shimmer 1.4s infinite",
      flexShrink:0,
      ...style,
    }}/>
  );
}

function SkeletonMatchCard() {
  return (
    <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
        <SkeletonBlock width={80} height={11}/>
        <SkeletonBlock width={60} height={11}/>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"flex-start",gap:6}}>
          <SkeletonBlock width={28} height={28} radius={4}/>
          <SkeletonBlock width={70} height={12}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
          <SkeletonBlock width={48} height={28} radius={6}/>
          <SkeletonBlock width={40} height={10}/>
        </div>
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
          <SkeletonBlock width={28} height={28} radius={4}/>
          <SkeletonBlock width={70} height={12}/>
        </div>
      </div>
    </div>
  );
}

function SkeletonNewsCard() {
  return (
    <div style={{background:C.s1,border:`1px solid ${C.b1}`,borderRadius:12,padding:"13px",marginBottom:8,display:"flex",gap:12}}>
      <SkeletonBlock width={72} height={72} radius={8} style={{flexShrink:0}}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,justifyContent:"center"}}>
        <SkeletonBlock width="90%" height={13}/>
        <SkeletonBlock width="75%" height={13}/>
        <SkeletonBlock width="50%" height={10}/>
      </div>
    </div>
  );
}

// ── PULL TO REFRESH ────────────────────────────────────────────────────────
function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pullingRef = useRef(false);
  const pullYRef = useRef(0);
  const refreshingRef = useRef(false);
  const THRESHOLD = 72;

  useEffect(() => {
    const onTouchStart = (e) => {
      const scroller = document.getElementById("scroll-area");
      if (scroller && scroller.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      const scroller = document.getElementById("scroll-area");
      if (scroller && scroller.scrollTop > 0) return;

      const dy = e.touches[0].clientY - startY.current;
      if (dy > 8) {
        // Prevent iOS native bounce — only prevent when pulling down from top
        e.preventDefault();
        const clamped = Math.min(dy * 0.45, THRESHOLD + 20);
        pullingRef.current = true;
        pullYRef.current = clamped;
        setPulling(true);
        setPullY(clamped);
      }
    };

    const onTouchEnd = async () => {
      if (!pullingRef.current) return;
      if (pullYRef.current >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullY(THRESHOLD);
        await onRefresh();
        setRefreshing(false);
        refreshingRef.current = false;
      }
      pullingRef.current = false;
      pullYRef.current = 0;
      setPulling(false);
      setPullY(0);
    };

    // passive:false required to allow preventDefault on touchmove
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh]);

  return (
    <>
      {children}
      {/* Pull indicator — sticky at top of scroll area */}
      {(pulling || refreshing) && (
        <div style={{
          position:"fixed", top:"50%", left:"50%",
          transform:"translate(-50%,-50%)",
          zIndex:500, pointerEvents:"none",
        }}>
          <div style={{
            width:44, height:44, borderRadius:"50%",
            background:C.s1, border:`2px solid ${C.green}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 4px 20px rgba(0,0,0,.5)",
            opacity: Math.min(pullY / 20, 1),
          }}>
            {refreshing
              ? <div style={{width:18,height:18,border:`2.5px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={pullY>=THRESHOLD?C.green:C.mid} strokeWidth="2.5" strokeLinecap="round" style={{transform:`rotate(${(pullY/THRESHOLD)*180}deg)`,transition:"transform .1s"}}><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            }
          </div>
        </div>
      )}
    </>
  );
}


// ── ONBOARDING ─────────────────────────────────────────────────────────────
const ONBOARDING_SLIDES = [
  {
    icon: "⚽",
    title: "Your World Cup companion",
    sub: "Live scores, schedule, group standings, stats, predictions and more — everything about World Cup 2026 in one place.",
    color: "#4ade80",
  },
  {
    icon: "🏆",
    title: "Compete with your friends",
    sub: "Predict match scores, earn points and top the leaderboard. Create a PIN to sync your progress across all your devices.",
    color: "#f59e0b",
  },
];

function Onboarding({ onDone }) {
  const [slide, setSlide] = useState(0);
  const s = ONBOARDING_SLIDES[slide];
  const isLast = slide === ONBOARDING_SLIDES.length - 1;

  return (
    <div style={{position:"fixed",inset:0,background:"#060e0a",zIndex:9000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"0 32px"}}>
      {/* Skip */}
      {!isLast && (
        <button onClick={onDone} style={{position:"absolute",top:24,right:20,background:"none",border:"none",color:"#3d6a4d",fontSize:13,cursor:"pointer",padding:"8px 12px"}}>
          Skip
        </button>
      )}

      {/* Slide content */}
      <div key={slide} style={{textAlign:"center",maxWidth:340,animation:"onboardIn .35s ease forwards",opacity:0}}>
        <div style={{fontSize:64,marginBottom:24,lineHeight:1}}>{s.icon}</div>
        <div style={{fontSize:24,fontWeight:800,color:"#d4ead9",marginBottom:12,lineHeight:1.2}}>{s.title}</div>
        <div style={{fontSize:14,color:"#7aaa8a",lineHeight:1.6}}>{s.sub}</div>
      </div>

      {/* Dots */}
      <div style={{display:"flex",gap:8,margin:"40px 0 32px"}}>
        {ONBOARDING_SLIDES.map((_,i) => (
          <div key={i} style={{width:i===slide?20:7,height:7,borderRadius:4,background:i===slide?s.color:"#1a3828",transition:"all .25s"}}/>
        ))}
      </div>

      <style>{`@keyframes onboardIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {/* Button */}
      <button onClick={()=>{ if(isLast) onDone(); else setSlide(v=>v+1); }}
        style={{padding:"14px 48px",borderRadius:14,border:"none",background:`linear-gradient(135deg,${s.color},${s.color}cc)`,color:"#030a05",fontWeight:800,fontSize:16,cursor:"pointer",width:"100%",maxWidth:340}}>
        {isLast ? "Let's go ⚽" : "Next →"}
      </button>
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────
const TABS = [
  {id:"live",      icon:"🔴", label:"Live"},
  {id:"schedule",  icon:"📋", label:"Schedule"},
  {id:"groups",    icon:"🗂️", label:"Groups"},
  {id:"scorers",   icon:"⚽", label:"Scorers"},
  {id:"bracket",   icon:"🏆", label:"My Bracket"},
  {id:"stats",     icon:"📊", label:"Stats"},
  {id:"h2h",       icon:"⚔️", label:"H2H"},
  {id:"news",      icon:"📰", label:"WC News"},
  {id:"predict",   icon:"🎯", label:"Odds"},
  {id:"predictor", icon:"🔮", label:"Predictor"},
  {id:"sim",       icon:"🎮", label:"Simulator"},
];

// ── PWA INSTALL BANNER ────────────────────────────────────────────────────
function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("wc2026_install_dismissed") === "true"; } catch { return false; }
  });

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;

  useEffect(() => {
    if (isInStandaloneMode || dismissed) return;

    // Chrome/Android/Edge — capture the install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari — show manual instructions
    if (isIOS && !isInStandaloneMode) {
      setShowBanner(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Chrome/Android — trigger native prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      // iOS — show instructions modal
      setShowIOSInstructions(true);
    }
  };

  const dismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    try { localStorage.setItem("wc2026_install_dismissed", "true"); } catch {}
  };

  if (!showBanner || isInStandaloneMode || dismissed) return null;

  return (
    <>
      {/* Install banner */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:500,maxWidth:700,margin:"0 auto",padding:"12px 14px",background:`linear-gradient(135deg,${C.s1},${C.s2})`,borderTop:`1px solid ${C.green}44`,display:"flex",alignItems:"center",gap:10,boxShadow:"0 -4px 20px rgba(0,0,0,0.3)"}}>
        <img src="/icons/icon-192.png" alt="icon" style={{width:36,height:36,borderRadius:8,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,color:C.text,fontSize:13}}>Install World Cup 2026</div>
          <div style={{fontSize:11,color:C.dim}}>Add to your home screen for the best experience</div>
        </div>
        <button onClick={handleInstall} style={{padding:"8px 14px",borderRadius:20,background:`linear-gradient(135deg,${C.green},#22c55e)`,border:"none",color:"#030a05",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0}}>
          {isIOS ? "How to" : "Install"}
        </button>
        <button onClick={dismiss} style={{background:"none",border:"none",color:C.dim,fontSize:20,cursor:"pointer",padding:"0 4px",flexShrink:0}}>×</button>
      </div>

      {/* iOS instructions modal */}
      {showIOSInstructions && (
        <div onClick={()=>setShowIOSInstructions(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:600,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:C.s1,border:`1px solid ${C.b2}`,borderRadius:"18px 18px 0 0",width:"100%",maxWidth:700,padding:24,paddingBottom:40}}>
            <div style={{fontWeight:700,fontSize:18,color:C.green,marginBottom:4}}>Add to Home Screen</div>
            <div style={{fontSize:13,color:C.dim,marginBottom:20}}>Follow these steps in Safari:</div>
            {[
              ["1", "📤", "Tap the Share button at the bottom of Safari"],
              ["2", "📜", "Scroll down and tap \"Add to Home Screen\""],
              ["3", "✅", "Tap \"Add\" in the top right corner"],
            ].map(([num, icon, text]) => (
              <div key={num} style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:`${C.green}22`,border:`1px solid ${C.green}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.green,flexShrink:0}}>{num}</div>
                <div style={{fontSize:16,flexShrink:0}}>{icon}</div>
                <div style={{fontSize:13,color:C.text}}>{text}</div>
              </div>
            ))}
            <div style={{marginTop:8,padding:12,background:`${C.gold}18`,border:`1px solid ${C.gold}33`,borderRadius:10,fontSize:12,color:C.mid}}>
              💡 Must be using <strong style={{color:C.gold}}>Safari</strong> — Chrome on iOS doesn't support home screen install.
            </div>
            <button onClick={()=>setShowIOSInstructions(false)} style={{width:"100%",marginTop:16,padding:"12px 0",borderRadius:12,background:`linear-gradient(135deg,${C.green},#22c55e)`,border:"none",color:"#030a05",fontWeight:700,fontSize:15,cursor:"pointer"}}>Got it</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  const [onboardingDone, setOnboardingDone] = useState(() => {
    try { return localStorage.getItem("wc2026_onboarded") === "1"; } catch { return false; }
  });
  const completeOnboarding = () => {
    setOnboardingDone(true);
    try { localStorage.setItem("wc2026_onboarded", "1"); } catch {}
  };
  const [splashDone, setSplashDone] = useState(() => {
    // Skip splash on return visits within the same session
    try { return sessionStorage.getItem("wc2026_splash") === "1"; } catch { return false; }
  });
  useEffect(() => {
    if (splashDone) return;
    const t = setTimeout(() => {
      setSplashDone(true);
      try { sessionStorage.setItem("wc2026_splash", "1"); } catch {}
    }, 1800);
    return () => clearTimeout(t);
  }, []);
  const [tab, setTab] = useState("live");
  const geoData = useCountry();
  const [locationOverride, setLocationOverride] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wc2026_location") || "null"); } catch { return null; }
  });
  const country = locationOverride?.country || geoData.country;
  const [showSavedView, setShowSavedView] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncProfile, setSyncProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wc2026_syncprofile") || "null"); } catch { return null; }
  });
  const [syncUid] = useState(() => {
    try { let id=localStorage.getItem("wc2026_uid"); if(!id){id=crypto.randomUUID();localStorage.setItem("wc2026_uid",id);} return id; } catch { return crypto.randomUUID(); }
  });
  const [userAvatar, setUserAvatar] = useState(() => {
    try { return localStorage.getItem("wc2026_avatar") || null; } catch { return null; }
  });
  const [avatarTs, setAvatarTs] = useState(() => {
    try { return parseInt(localStorage.getItem("wc2026_avatar_ts") || "0"); } catch { return 0; }
  });
  const persistAvatar = (av) => {
    setUserAvatar(av);
    const ts = Date.now();
    setAvatarTs(ts);
    try { localStorage.setItem("wc2026_avatar", av||""); localStorage.setItem("wc2026_avatar_ts", String(ts)); } catch {}
  };
  const [displayName, setDisplayName] = useState(() => {
    try { return localStorage.getItem("wc2026_displayname") || ""; } catch { return ""; }
  });
  const [myBracketSyncRev, setMyBracketSyncRev] = useState(0);
  useEffect(() => {
    const bump = () => setMyBracketSyncRev(v => v + 1);
    window.addEventListener("wc2026_my_bracket_changed", bump);
    return () => window.removeEventListener("wc2026_my_bracket_changed", bump);
  }, []);
  const persistDisplayName = (n) => { setDisplayName(n); try { localStorage.setItem("wc2026_displayname", n); } catch {} };

  const tabBarRef = useRef(null);
  const [tabBarBottom, setTabBarBottom] = useState(140);
  useEffect(() => {
    const measure = () => {
      if (tabBarRef.current) setTabBarBottom(tabBarRef.current.getBoundingClientRect().bottom);
    };
    measure();
    window.addEventListener("resize", measure);
    const obs = new ResizeObserver(measure);
    if (tabBarRef.current) obs.observe(tabBarRef.current);
    return () => { window.removeEventListener("resize", measure); obs.disconnect(); };
  }, []);

  // Register service worker for PWA
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("[PWA] Service worker registered"))
        .catch(e => console.warn("[PWA] SW registration failed:", e));
    }
  }, []);
  const [statsTeam, setStatsTeam] = useState("");
  const [modal, setModal] = useState({open:false,match:null});
  const [eventsModal, setEventsModal] = useState({open:false,match:null});
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wc2026_saved") || "[]"); } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem("wc2026_saved", JSON.stringify(saved)); } catch {} }, [saved]);
  const [toast, setToast] = useState("");
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("wc2026_dark") !== "false"; } catch { return true; }});
  const [favTeams, setFavTeams] = useState(() => {
    try { return JSON.parse(localStorage.getItem("wc2026_favs") || "[]"); } catch { return []; }
  });
  const [showFavPicker, setShowFavPicker] = useState(false);
  const favTeam = favTeams[0] || "";

  // Client-triggered prediction scoring — fire on mount
  // Checks if any match ended in the last hour and triggers resolve
  useEffect(() => {
    const now = Date.now();
    const WINDOW_MS = 150 * 60 * 1000; // 2.5hr match window
    const GRACE_MS  =  60 * 60 * 1000; // 1hr grace period after
    Object.entries(MATCH_UTC).forEach(([id, kickoff]) => {
      const ko  = new Date(kickoff).getTime();
      const end = ko + WINDOW_MS;
      if (now > end && now < end + GRACE_MS) {
        fetch(`/api/resolve-match?matchId=${id}`).catch(() => {});
      }
    });
  }, []);

  // Analytics tracking — fire on mount
  useEffect(() => {
    const device = getDeviceType();
    fetch("/api/admin", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        uid: syncUid,
        event: "visit",
        device,
        city: geoData.city || "",
        country: geoData.country || "",
      })
    }).catch(() => {});
  }, [geoData.country]); // re-fire once geoData loads

  // Track tab changes
  useEffect(() => {
    if (!tab) return;
    fetch("/api/admin", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ uid: syncUid, event: "tab", tab })
    }).catch(() => {});
  }, [tab]);

  // Auto-pull on startup — if already signed in, fetch latest profile from KV
  useEffect(() => {
    if (!syncProfile?.uid) return;
    const t = setTimeout(() => {
    fetch("/api/sync?action=pull", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ uid: syncProfile.uid })
    })
      .then(r => r.json())
      .then(data => {
        if (!data.ok || !data.profile) return;
        const p = data.profile;
        const remoteAvatarTs = p.avatarTs || p.updatedAt || 0;
        if (p.avatar && remoteAvatarTs > avatarTs) {
          persistAvatar(p.avatar);
        }
        if (p.displayName) persistDisplayName(p.displayName);
        if (p.favTeams?.length) setFavTeams(p.favTeams);
        if (p.myBracket) restoreSavedMyBracket(p.myBracket);
        if (p.dark !== undefined) setDark(p.dark);
      })
      .catch(() => {});
    }, 800); // small delay ensures KV is settled
    return () => clearTimeout(t);
  }, [syncProfile?.uid]); // re-pull if uid changes (e.g. after sign-in)

  // Magic link redirect handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const syncStatus = params.get("sync");
    if (syncStatus === "ok") {
      try {
        const profile = JSON.parse(decodeURIComponent(params.get("profile") || "null"));
        if (profile?.uid) {
          fetch("/api/sync?action=pull", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ uid: profile.uid }) })
            .then(r=>r.json()).then(data=>{
              if (data.ok && data.profile) {
                const p = data.profile;
                if (p.saved?.length) setSaved(p.saved);
                if (p.favTeams?.length) setFavTeams(p.favTeams);
                if (p.dark !== undefined) setDark(p.dark);
                if (p.locationOverride) { setLocationOverride(p.locationOverride); try{localStorage.setItem("wc2026_location",JSON.stringify(p.locationOverride))}catch{} }
                if (p.myBracket) restoreSavedMyBracket(p.myBracket);
                if (p.avatar) persistAvatar(p.avatar);
                if (p.displayName) persistDisplayName(p.displayName);
                const prof = { uid:p.uid, email:p.email, pin:p.pin, method:"email" };
                setSyncProfile(prof); try{localStorage.setItem("wc2026_syncprofile",JSON.stringify(prof))}catch{}
                setToast("✅ Synced! Your progress has been restored.");
              }
            }).catch(()=>{});
        }
      } catch {}
      window.history.replaceState({}, "", window.location.pathname);
    } else if (syncStatus === "expired") {
      setToast("⚠️ Sign-in link expired. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Auto-push state to KV when synced
  useEffect(() => {
    if (!syncProfile?.uid) return;
    const t = setTimeout(() => {
      fetch("/api/sync?action=push", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ uid:syncProfile.uid, saved, favTeams, dark, locationOverride, avatar:userAvatar, avatarTs, displayName, myBracket:readSavedMyBracket() }) }).catch(()=>{});
    }, 1500);
    return () => clearTimeout(t);
  }, [saved, favTeams, dark, locationOverride, userAvatar, displayName, syncProfile, myBracketSyncRev]);

  // Apply theme — mutates C so all components pick up new colors on re-render
  const theme = dark ? DARK : LIGHT;
  Object.assign(C, theme);
  // Override hardcoded dark hex values that appear in inline styles
  const headerDark = dark ? "#091510" : "#e8f5ec";
  const cardDark   = dark ? "#0a1810" : "#f0fdf4";
  const codeDark   = dark ? "#091510" : "#f8fffe";

  const toggleDark = () => setDark(d => { const next=!d; try{localStorage.setItem("wc2026_dark",String(next))}catch{}; return next; });

  const toggleFav = (t) => {
    setFavTeams(prev => {
      const next = prev.includes(t) ? prev.filter(x=>x!==t) : prev.length < 4 ? [...prev, t] : prev;
      try { localStorage.setItem("wc2026_favs", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const onTeam=(t)=>{setStatsTeam(t);setTab("stats");};
  const { isLive: isMatchLive, refresh: refreshScores } = useContext(LiveScoresCtx);

  const hasLiveMatches = MATCHES.some(m => isMatchLive(m.home, m.away));
  const savedIds = new Set(saved.map(x=>x.match?.id));
  const onAction=(m)=>{
    if(savedIds.has(m.id)){ setSaved(s=>s.filter(x=>x.match?.id!==m.id)); setToast("Removed from saved"); }
    else { setSaved(s=>[...s,{id:`s${m.id}`,type:"saved",match:m}]); setToast("Match saved ⭐"); }
  };
  const onMatchTap=(m)=>setEventsModal({open:true,match:m});
  const onCal=(m,avail)=>{const id=`c${m.id}`;setSaved(s=>[...s.filter(x=>x.id!==id),{id,type:"cal",match:m,avail}]);setToast("Added to calendar");};
  const onRem=(m,ch,mins,contact)=>{const id=`r${m.id}`;setSaved(s=>[...s.filter(x=>x.id!==id),{id,type:"rem",match:m,ch,mins,contact}]);setToast("Reminder set");};
  const onRemove=(id)=>setSaved(s=>s.filter(x=>x.id!==id));

  const headerBg = dark ? `linear-gradient(180deg,#091510,${C.bg})` : `linear-gradient(180deg,#e8f5ec,${C.bg})`;
  const selectBg = dark ? "#0c1a12" : "#ffffff";

  if (splashDone && !onboardingDone) return <Onboarding onDone={completeOnboarding}/>;

  if (!splashDone) return (
    <div style={{position:"fixed",inset:0,background:"#060e0a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:9999}}>
      <div style={{animation:"splashIn .5s ease forwards",opacity:0}}>
        {/* App icon */}
        <div style={{width:100,height:100,margin:"0 auto 24px",borderRadius:22,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.5)"}}>
          <img src="/icons/icon-512.png" alt="WC 2026" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        </div>
        <div style={{textAlign:"center",marginBottom:8}}>
          <div style={{fontSize:11,color:"#4ade8088",fontWeight:700,letterSpacing:"0.15em",marginBottom:4}}>FIFA</div>
          <div style={{fontSize:28,fontWeight:900,color:"#d4ead9",lineHeight:1.1,letterSpacing:"0.02em"}}>WORLD CUP</div>
          <div style={{fontSize:28,fontWeight:900,color:"#4ade80",lineHeight:1.1,letterSpacing:"0.02em"}}>2026™</div>
        </div>
        <div style={{fontSize:12,color:"#3d6a4d",textAlign:"center",marginTop:8}}>Your tournament companion</div>
      </div>
      <style>{`@keyframes splashIn{to{opacity:1;transform:translateY(0)}from{opacity:0;transform:translateY(16px)}}`}</style>
    </div>
  );

  return (
    <LiveScoresProvider>
      <CountryCtx.Provider value={country}>
      <ThemeCtx.Provider value={{dark, toggle:toggleDark, headerDark, cardDark}}>
      <FavCtx.Provider value={{favTeam, favTeams, setFavTeam: toggleFav}}>
      <div style={{minHeight:"100vh",background:C.bg,maxWidth:700,margin:"0 auto",fontFamily:"system-ui,sans-serif",transition:"background .2s"}}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes scoreFlash{0%{transform:scale(1)}25%{transform:scale(1.18)}50%{transform:scale(1.12)}100%{transform:scale(1)}}*{box-sizing:border-box;margin:0;padding:0}select option{background:${C.s1}}::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-thumb{background:${C.b1};border-radius:2px}`}</style>
        <div ref={tabBarRef} style={{background:`linear-gradient(180deg,${headerDark},${C.bg})`,padding:"14px 14px 0",borderBottom:`1px solid ${C.b1}`,position:"sticky",top:0,zIndex:100,willChange:"transform",backdropFilter:"blur(10px)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div>
                <div style={{fontSize:9,color:C.dim,letterSpacing:"0.2em",fontWeight:700}}>FIFA</div>
                <div style={{fontSize:20,fontWeight:900,color:C.text,lineHeight:1}}>WORLD CUP</div>
                <div style={{fontSize:20,fontWeight:900,color:C.green,lineHeight:1}}>2026™</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {/* Dark/light toggle */}
              <button onClick={toggleDark} title={dark?"Switch to light mode":"Switch to dark mode"} style={{position:"relative",width:56,height:28,borderRadius:14,border:"none",background:dark?"#4ade80":"#1a3828",cursor:"pointer",flexShrink:0,padding:0,transition:"background .25s"}}>
                <span style={{position:"absolute",top:4,left:dark?32:4,width:20,height:20,borderRadius:"50%",background:"#e5e5ea",boxShadow:"0 1px 4px rgba(0,0,0,.35)",transition:"left .22s cubic-bezier(.4,0,.2,1)",display:"block"}}/>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(5,50,20,0.8)" strokeWidth="2.5" strokeLinecap="round" style={{position:"absolute",left:7,top:7,opacity:dark?1:0,transition:"opacity .2s",pointerEvents:"none"}}><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/></svg>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" stroke="none" style={{position:"absolute",right:7,top:8,opacity:dark?0:1,transition:"opacity .2s",pointerEvents:"none"}}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              </button>
              {/* Profile / sync avatar */}
              <button onClick={()=>setShowSyncModal(true)} title={"My Account"} style={{position:"relative",width:36,height:36,borderRadius:"50%",border:`2px solid ${syncProfile?C.green:dark?"#2a4f38":"#1a3828"}`,background:syncProfile?`${C.green}18`:dark?"#0c1a12":"#1a3828",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0,overflow:"hidden",padding:0}}>
                {userAvatar?.startsWith("data:") ? <img src={userAvatar} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}} alt="avatar"/>
                : userAvatar?.startsWith("icon:") ? (()=>{const ic=FOOTBALL_ICONS?.find(i=>i.id===userAvatar);return ic?ic.el(22):"⚽";})()
                : userAvatar?.startsWith("flag:") ? <img src={`https://flagcdn.com/w80/${FLAG_CODES_MAP[userAvatar.slice(5)]}.png`} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="avatar"/>
                : syncProfile?"⚽":"👤"}
                {syncProfile && <span style={{position:"absolute",bottom:1,right:1,width:9,height:9,borderRadius:"50%",background:C.green,border:`1.5px solid ${C.bg}`,zIndex:1}}/>}
                {!syncProfile && favTeams.length>0 && <span style={{position:"absolute",bottom:1,right:1,width:9,height:9,borderRadius:"50%",background:C.gold,border:`1.5px solid ${C.bg}`,zIndex:1}}/>}
              </button>
            </div>
          </div>

          <div style={{position:"relative"}}>
            <div style={{display:"flex",overflowX:"auto",scrollbarWidth:"none",marginBottom:-1}}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:"0 0 auto",padding:"8px 10px",background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?C.green:"transparent"}`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:tab===t.id?C.green:C.dim,position:"relative"}}>
                  <span style={{fontSize:14}}>{t.icon}</span>
                  <span style={{fontSize:9,fontWeight:600,whiteSpace:"nowrap"}}>{t.label}</span>
                  {t.id==="live" && hasLiveMatches && tab!=="live" && (
                    <span style={{position:"absolute",top:6,right:6,width:7,height:7,borderRadius:"50%",background:"#ef4444",boxShadow:"0 0 0 2px #ef444488",animation:"pulse 1.5s infinite"}}/>
                  )}
                </button>
              ))}
            </div>
            {/* Right fade hint */}
            <div style={{position:"absolute",top:0,right:0,bottom:0,width:40,background:`linear-gradient(to left,${C.bg} 0%,transparent 100%)`,pointerEvents:"none",zIndex:2}}/>
          </div>
        </div>
        <PullToRefresh onRefresh={async()=>{ if(refreshScores) await refreshScores(); }}>
        <div style={{padding:"0 13px 100px"}}>
          {tab==="live"      && <LiveTab onAction={onAction} onMatchTap={onMatchTap} favTeam={favTeam} tabTop={tabBarBottom} savedIds={savedIds}/>}
          {tab==="scorers"   && <TopScorersTab tabTop={tabBarBottom}/>}
          {tab==="schedule"  && <SchedTab onAction={onAction} onMatchTap={onMatchTap} favTeam={favTeam} tabTop={tabBarBottom} savedIds={savedIds}/>}
          {tab==="groups"    && <GrpTab onTeam={onTeam} onMatchTap={onMatchTap} tabTop={tabBarBottom}/>}
          {tab==="stats"     && <StatsTab initial={statsTeam} tabTop={tabBarBottom}/>}
          {tab==="h2h"       && <H2HTab tabTop={tabBarBottom}/>}
          {tab==="predict"   && <PredTab tabTop={tabBarBottom} geoData={geoData}/>}
          {tab==="predictor" && <PredictorTab syncProfile={syncProfile} displayName={displayName} onShowSync={()=>setShowSyncModal(true)} userAvatar={userAvatar}/>}
          {tab==="sim"       && <SimTab tabTop={tabBarBottom}/>}
          {tab==="bracket"   && <MyBracketTab tabTop={tabBarBottom}/>}
          {tab==="news"       && <WCNewsTab tabTop={tabBarBottom}/>}
          {tab==="saved"     && <div style={{paddingTop:14}}><SavedTab saved={saved} onRemove={onRemove}/></div>}
        </div>
        </PullToRefresh>
        {/* Saved view overlay */}
        {showSavedView && (
          <div style={{position:"fixed",inset:0,background:C.bg,zIndex:200,display:"flex",flexDirection:"column"}}>
            {/* Back header */}
            <div style={{width:"100%",borderBottom:`1px solid ${C.b1}`,background:C.s1,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px 12px",maxWidth:700,margin:"0 auto"}}>
                <button onClick={()=>setShowSavedView(false)} style={{background:"none",border:"none",color:C.green,fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,padding:"4px 10px 4px 0"}}>
                  <span style={{fontSize:20,lineHeight:1}}>‹</span> Back
                </button>
                <span style={{fontWeight:700,fontSize:17,color:C.green}}>{"My Matches"}</span>
                <span style={{fontSize:13,color:C.dim,marginLeft:"auto"}}>{saved.length} saved</span>
              </div>
            </div>
            {/* Scrollable content */}
            <div style={{flex:1,overflowY:"auto",position:"relative"}} id="saved-scroll">
              <div style={{maxWidth:700,margin:"0 auto",padding:"0 13px 80px"}}>
                <SavedTab saved={saved} onRemove={onRemove} tabTop={57}/>
              </div>
            </div>
          </div>
        )}
        <SyncModal
          open={showSyncModal} onClose={()=>setShowSyncModal(false)}
          syncProfile={syncProfile} setSyncProfile={setSyncProfile}
          syncUid={syncUid} saved={saved} favTeams={favTeams}
          setToast={setToast} setSaved={setSaved} setFavTeams={setFavTeams}
          dark={dark} setDark={setDark}
          geoData={geoData} locationOverride={locationOverride} setLocationOverride={setLocationOverride}
          onShowSaved={()=>setShowSavedView(true)}
          userAvatar={userAvatar} persistAvatar={persistAvatar}
          displayName={displayName} persistDisplayName={persistDisplayName}
          onSignOut={()=>{
            persistAvatar(null);
            persistDisplayName("");
            setFavTeams([]);
            try{localStorage.removeItem("wc2026_favs")}catch{}
          }}
        />
        <MatchEventsModal match={eventsModal.match} open={eventsModal.open} onClose={()=>setEventsModal({open:false,match:null})} onAction={onAction} savedIds={savedIds} userPredHg={eventsModal.predHg} userPredAg={eventsModal.predAg}/>
        <Toast msg={toast} onDone={()=>setToast("")}/>
        <InstallBanner/>
      </div>
      </FavCtx.Provider>
      </ThemeCtx.Provider>
      </CountryCtx.Provider>
    </LiveScoresProvider>
  );
}

