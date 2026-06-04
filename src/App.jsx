import { useState, useEffect } from "react";

const C = {
  bg:"#060e0a", s1:"#0c1a12", s2:"#112618",
  b1:"#1a3828", b2:"#234833",
  green:"#4ade80", greenS:"#4ade8055",
  gold:"#fbbf24", blue:"#60a5fa", red:"#f87171",
  text:"#d4ead9", mid:"#7aaa8a", dim:"#3d6a4d",
};

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

const getFlag = t => { for (const g of Object.values(GROUPS)) { const i = g.teams.indexOf(t); if (i !== -1) return g.flags[i]; } return "🏳️"; };

const MATCHES = [
  // ── GROUP STAGE ──────────────────────────────────────────────────────────
  // Jun 11
  {id:1,  date:"Jun 11", time:"3PM ET",      home:"Mexico",            away:"South Africa",       venue:"Mexico City Stadium, Mexico City",       group:"A",tv:"FOX · Telemundo · Tubi (free)"},
  {id:2,  date:"Jun 11", time:"10PM ET",     home:"South Korea",       away:"Czechia",            venue:"Estadio Guadalajara, Zapopan",           group:"A",tv:"FS1 · Telemundo"},
  // Jun 12
  {id:3,  date:"Jun 12", time:"3PM ET",      home:"Canada",            away:"Bosnia & Herz.",     venue:"Toronto Stadium, Toronto",              group:"B",tv:"FS1 · Telemundo"},
  {id:4,  date:"Jun 12", time:"9PM ET",      home:"United States",     away:"Paraguay",           venue:"SoFi Stadium, Los Angeles",             group:"D",tv:"FOX · Telemundo · Tubi (free)"},
  // Jun 13
  {id:5,  date:"Jun 13", time:"3PM ET",      home:"Qatar",             away:"Switzerland",        venue:"San Francisco Bay Area Stadium, San Francisco", group:"B",tv:"FS1 · Telemundo"},
  {id:6,  date:"Jun 13", time:"6PM ET",      home:"Brazil",            away:"Morocco",            venue:"New York New Jersey Stadium, East Rutherford", group:"C",tv:"FOX · Telemundo"},
  {id:7,  date:"Jun 13", time:"9PM ET",      home:"Haiti",             away:"Scotland",           venue:"Boston Stadium, Boston",                group:"C",tv:"FS1 · Telemundo"},
  {id:8,  date:"Jun 13", time:"11:59PM ET",  home:"Australia",         away:"Turkiye",            venue:"BC Place, Vancouver",                   group:"D",tv:"FS1 · Telemundo"},
  // Jun 14
  {id:9,  date:"Jun 14", time:"1PM ET",      home:"Germany",           away:"Curacao",            venue:"Houston Stadium, Houston",              group:"E",tv:"FS1 · Telemundo"},
  {id:10, date:"Jun 14", time:"4PM ET",      home:"Netherlands",       away:"Japan",              venue:"Dallas Stadium, Dallas",                group:"F",tv:"FS1 · Telemundo"},
  {id:11, date:"Jun 14", time:"7PM ET",      home:"Ivory Coast",       away:"Ecuador",            venue:"Philadelphia Stadium, Philadelphia",    group:"E",tv:"FS1 · Telemundo"},
  {id:12, date:"Jun 14", time:"10PM ET",     home:"Sweden",            away:"Tunisia",            venue:"Estadio Monterrey, Guadalupe",          group:"F",tv:"FS1 · Telemundo"},
  // Jun 15
  {id:13, date:"Jun 15", time:"12PM ET",     home:"Spain",             away:"Cape Verde",         venue:"Atlanta Stadium, Atlanta",             group:"H",tv:"FOX · Telemundo"},
  {id:14, date:"Jun 15", time:"3PM ET",      home:"Belgium",           away:"Egypt",              venue:"BC Place, Vancouver",                   group:"G",tv:"FS1 · Telemundo"},
  {id:15, date:"Jun 15", time:"6PM ET",      home:"Saudi Arabia",      away:"Uruguay",            venue:"Miami Stadium, Miami",                  group:"H",tv:"FOX · Telemundo"},
  {id:16, date:"Jun 15", time:"9PM ET",      home:"Iran",              away:"New Zealand",        venue:"SoFi Stadium, Los Angeles",             group:"G",tv:"FS1 · Telemundo"},
  // Jun 16
  {id:17, date:"Jun 16", time:"3PM ET",      home:"France",            away:"Senegal",            venue:"New York New Jersey Stadium, East Rutherford", group:"I",tv:"FOX · Telemundo"},
  {id:18, date:"Jun 16", time:"6PM ET",      home:"Iraq",              away:"Norway",             venue:"Boston Stadium, Boston",                group:"I",tv:"FS1 · Telemundo"},
  {id:19, date:"Jun 16", time:"9PM ET",      home:"Argentina",         away:"Algeria",            venue:"Kansas City Stadium, Kansas City",      group:"J",tv:"FOX · Telemundo"},
  {id:20, date:"Jun 16", time:"11:59PM ET",  home:"Austria",           away:"Jordan",             venue:"San Francisco Bay Area Stadium, San Francisco", group:"J",tv:"FS1 · Telemundo"},
  // Jun 17
  {id:21, date:"Jun 17", time:"1PM ET",      home:"Portugal",          away:"DR Congo",           venue:"Houston Stadium, Houston",              group:"K",tv:"FS1 · Telemundo"},
  {id:22, date:"Jun 17", time:"4PM ET",      home:"England",           away:"Croatia",            venue:"Dallas Stadium, Dallas",                group:"L",tv:"FOX · Telemundo"},
  {id:23, date:"Jun 17", time:"7PM ET",      home:"Ghana",             away:"Panama",             venue:"Toronto Stadium, Toronto",              group:"L",tv:"FS1 · Telemundo"},
  {id:24, date:"Jun 17", time:"10PM ET",     home:"Uzbekistan",        away:"Colombia",           venue:"Mexico City Stadium, Mexico City",      group:"K",tv:"FS1 · Telemundo"},
  // Jun 18
  {id:25, date:"Jun 18", time:"12PM ET",     home:"Czechia",           away:"South Africa",       venue:"Atlanta Stadium, Atlanta",             group:"A",tv:"FS1 · Telemundo"},
  {id:26, date:"Jun 18", time:"3PM ET",      home:"Switzerland",       away:"Bosnia & Herz.",     venue:"SoFi Stadium, Los Angeles",             group:"B",tv:"FS1 · Telemundo"},
  {id:27, date:"Jun 18", time:"6PM ET",      home:"Canada",            away:"Qatar",              venue:"BC Place, Vancouver",                   group:"B",tv:"FS1 · Telemundo"},
  {id:28, date:"Jun 18", time:"9PM ET",      home:"Mexico",            away:"South Korea",        venue:"Estadio Guadalajara, Zapopan",          group:"A",tv:"FS1 · Telemundo"},
  // Jun 19
  {id:29, date:"Jun 19", time:"3PM ET",      home:"United States",     away:"Australia",          venue:"Seattle Stadium, Seattle",              group:"D",tv:"FOX · Telemundo"},
  {id:30, date:"Jun 19", time:"6PM ET",      home:"Scotland",          away:"Morocco",            venue:"Boston Stadium, Boston",                group:"C",tv:"FS1 · Telemundo"},
  {id:31, date:"Jun 19", time:"8:30PM ET",   home:"Brazil",            away:"Haiti",              venue:"Philadelphia Stadium, Philadelphia",    group:"C",tv:"FS1 · Telemundo"},
  {id:32, date:"Jun 19", time:"11PM ET",     home:"Turkiye",           away:"Paraguay",           venue:"San Francisco Bay Area Stadium, San Francisco", group:"D",tv:"FS1 · Telemundo"},
  // Jun 20
  {id:33, date:"Jun 20", time:"1PM ET",      home:"Netherlands",       away:"Sweden",             venue:"Houston Stadium, Houston",              group:"F",tv:"FOX · Telemundo"},
  {id:34, date:"Jun 20", time:"4PM ET",      home:"Germany",           away:"Ivory Coast",        venue:"Toronto Stadium, Toronto",              group:"E",tv:"FS1 · Telemundo"},
  {id:35, date:"Jun 20", time:"8PM ET",      home:"Ecuador",           away:"Curacao",            venue:"Kansas City Stadium, Kansas City",      group:"E",tv:"FS1 · Telemundo"},
  {id:36, date:"Jun 20", time:"11:59PM ET",  home:"Tunisia",           away:"Japan",              venue:"Estadio Monterrey, Guadalupe",          group:"F",tv:"FS1 · Telemundo"},
  // Jun 21
  {id:37, date:"Jun 21", time:"12PM ET",     home:"Spain",             away:"Saudi Arabia",       venue:"Atlanta Stadium, Atlanta",             group:"H",tv:"FOX · Telemundo"},
  {id:38, date:"Jun 21", time:"3PM ET",      home:"Belgium",           away:"Iran",               venue:"SoFi Stadium, Los Angeles",             group:"G",tv:"FS1 · Telemundo"},
  {id:39, date:"Jun 21", time:"6PM ET",      home:"Uruguay",           away:"Cape Verde",         venue:"Miami Stadium, Miami",                  group:"H",tv:"FS1 · Telemundo"},
  {id:40, date:"Jun 21", time:"9PM ET",      home:"New Zealand",       away:"Egypt",              venue:"BC Place, Vancouver",                   group:"G",tv:"FS1 · Telemundo"},
  // Jun 22
  {id:41, date:"Jun 22", time:"1PM ET",      home:"Argentina",         away:"Austria",            venue:"Dallas Stadium, Dallas",                group:"J",tv:"FOX · Telemundo"},
  {id:42, date:"Jun 22", time:"5PM ET",      home:"France",            away:"Iraq",               venue:"Philadelphia Stadium, Philadelphia",    group:"I",tv:"FS1 · Telemundo"},
  {id:43, date:"Jun 22", time:"8PM ET",      home:"Norway",            away:"Senegal",            venue:"New York New Jersey Stadium, East Rutherford", group:"I",tv:"FOX · Telemundo"},
  {id:44, date:"Jun 22", time:"11PM ET",     home:"Jordan",            away:"Algeria",            venue:"San Francisco Bay Area Stadium, San Francisco", group:"J",tv:"FS1 · Telemundo"},
  // Jun 23
  {id:45, date:"Jun 23", time:"1PM ET",      home:"Portugal",          away:"Uzbekistan",         venue:"Houston Stadium, Houston",              group:"K",tv:"FS1 · Telemundo"},
  {id:46, date:"Jun 23", time:"4PM ET",      home:"England",           away:"Ghana",              venue:"Boston Stadium, Boston",                group:"L",tv:"FS1 · Telemundo"},
  {id:47, date:"Jun 23", time:"7PM ET",      home:"Panama",            away:"Croatia",            venue:"Toronto Stadium, Toronto",              group:"L",tv:"FOX · Telemundo"},
  {id:48, date:"Jun 23", time:"10PM ET",     home:"Colombia",          away:"DR Congo",           venue:"Estadio Guadalajara, Zapopan",          group:"K",tv:"FS1 · Telemundo"},
  // Jun 24 (simultaneous matchday 3)
  {id:49, date:"Jun 24", time:"3PM ET",      home:"Switzerland",       away:"Canada",             venue:"BC Place, Vancouver",                   group:"B",tv:"FS1 · Universo"},
  {id:50, date:"Jun 24", time:"3PM ET",      home:"Bosnia & Herz.",    away:"Qatar",              venue:"Seattle Stadium, Seattle",              group:"B",tv:"FS1 · Universo"},
  {id:51, date:"Jun 24", time:"6PM ET",      home:"Scotland",          away:"Brazil",             venue:"Miami Stadium, Miami",                  group:"C",tv:"FOX · Universo"},
  {id:52, date:"Jun 24", time:"6PM ET",      home:"Morocco",           away:"Haiti",              venue:"Atlanta Stadium, Atlanta",             group:"C",tv:"FS1 · Universo"},
  {id:53, date:"Jun 24", time:"9PM ET",      home:"Czechia",           away:"Mexico",             venue:"Mexico City Stadium, Mexico City",      group:"A",tv:"FS1 · Universo"},
  {id:54, date:"Jun 24", time:"9PM ET",      home:"South Africa",      away:"South Korea",        venue:"Estadio Monterrey, Guadalupe",          group:"A",tv:"FS1 · Universo"},
  // Jun 25
  {id:55, date:"Jun 25", time:"4PM ET",      home:"Curacao",           away:"Ivory Coast",        venue:"Philadelphia Stadium, Philadelphia",    group:"E",tv:"FS1 · Universo"},
  {id:56, date:"Jun 25", time:"4PM ET",      home:"Ecuador",           away:"Germany",            venue:"New York New Jersey Stadium, East Rutherford", group:"E",tv:"FOX · Universo"},
  {id:57, date:"Jun 25", time:"7PM ET",      home:"Japan",             away:"Sweden",             venue:"Dallas Stadium, Dallas",                group:"F",tv:"FS1 · Universo"},
  {id:58, date:"Jun 25", time:"7PM ET",      home:"Tunisia",           away:"Netherlands",        venue:"Kansas City Stadium, Kansas City",      group:"F",tv:"FS1 · Universo"},
  {id:59, date:"Jun 25", time:"10PM ET",     home:"Turkiye",           away:"United States",      venue:"SoFi Stadium, Los Angeles",             group:"D",tv:"FS1 · Universo"},
  {id:60, date:"Jun 25", time:"10PM ET",     home:"Paraguay",          away:"Australia",          venue:"San Francisco Bay Area Stadium, San Francisco", group:"D",tv:"FS1 · Universo"},
  // Jun 26
  {id:61, date:"Jun 26", time:"3PM ET",      home:"Norway",            away:"France",             venue:"Boston Stadium, Boston",                group:"I",tv:"FS1 · Universo"},
  {id:62, date:"Jun 26", time:"3PM ET",      home:"Senegal",           away:"Iraq",               venue:"Toronto Stadium, Toronto",              group:"I",tv:"FS1 · Universo"},
  {id:63, date:"Jun 26", time:"8PM ET",      home:"Cape Verde",        away:"Saudi Arabia",       venue:"Houston Stadium, Houston",              group:"H",tv:"FS1 · Universo"},
  {id:64, date:"Jun 26", time:"8PM ET",      home:"Uruguay",           away:"Spain",              venue:"Estadio Guadalajara, Zapopan",          group:"H",tv:"FOX · Universo"},
  {id:65, date:"Jun 26", time:"11PM ET",     home:"Egypt",             away:"Iran",               venue:"Seattle Stadium, Seattle",              group:"G",tv:"FS1 · Universo"},
  {id:66, date:"Jun 26", time:"11PM ET",     home:"New Zealand",       away:"Belgium",            venue:"BC Place, Vancouver",                   group:"G",tv:"FS1 · Universo"},
  // Jun 27
  {id:67, date:"Jun 27", time:"5PM ET",      home:"Panama",            away:"England",            venue:"New York New Jersey Stadium, East Rutherford", group:"L",tv:"FOX · Universo"},
  {id:68, date:"Jun 27", time:"5PM ET",      home:"Croatia",           away:"Ghana",              venue:"Philadelphia Stadium, Philadelphia",    group:"L",tv:"FS1 · Universo"},
  {id:69, date:"Jun 27", time:"7:30PM ET",   home:"Colombia",          away:"Portugal",           venue:"Miami Stadium, Miami",                  group:"K",tv:"FOX · Universo"},
  {id:70, date:"Jun 27", time:"7:30PM ET",   home:"DR Congo",          away:"Uzbekistan",         venue:"Atlanta Stadium, Atlanta",             group:"K",tv:"FS1 · Universo"},
  {id:71, date:"Jun 27", time:"10PM ET",     home:"Algeria",           away:"Austria",            venue:"Kansas City Stadium, Kansas City",      group:"J",tv:"FS1 · Universo"},
  {id:72, date:"Jun 27", time:"10PM ET",     home:"Jordan",            away:"Argentina",          venue:"Dallas Stadium, Dallas",                group:"J",tv:"FOX · Universo"},

  // ── ROUND OF 32 (Jun 28 – Jul 3) ─────────────────────────────────────────
  {id:73,  date:"Jun 28", time:"3PM ET",     home:"R32 Match 1",  away:"TBD", venue:"SoFi Stadium, Los Angeles",             group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:74,  date:"Jun 29", time:"1PM ET",     home:"R32 Match 2",  away:"TBD", venue:"Houston Stadium, Houston",              group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:75,  date:"Jun 29", time:"4:30PM ET",  home:"R32 Match 3",  away:"TBD", venue:"Boston Stadium, Boston",                group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:76,  date:"Jun 29", time:"9PM ET",     home:"R32 Match 4",  away:"TBD", venue:"Estadio Monterrey, Guadalupe",          group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:77,  date:"Jun 30", time:"1PM ET",     home:"R32 Match 5",  away:"TBD", venue:"Dallas Stadium, Dallas",                group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:78,  date:"Jun 30", time:"5PM ET",     home:"R32 Match 6",  away:"TBD", venue:"New York New Jersey Stadium, East Rutherford", group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:79,  date:"Jun 30", time:"9PM ET",     home:"R32 Match 7",  away:"TBD", venue:"Mexico City Stadium, Mexico City",      group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:80,  date:"Jul 1",  time:"12PM ET",    home:"R32 Match 8",  away:"TBD", venue:"Atlanta Stadium, Atlanta",             group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:81,  date:"Jul 1",  time:"4PM ET",     home:"R32 Match 9",  away:"TBD", venue:"Seattle Stadium, Seattle",              group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:82,  date:"Jul 1",  time:"8PM ET",     home:"R32 Match 10", away:"TBD", venue:"San Francisco Bay Area Stadium, San Francisco", group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:83,  date:"Jul 2",  time:"3PM ET",     home:"R32 Match 11", away:"TBD", venue:"SoFi Stadium, Los Angeles",             group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:84,  date:"Jul 2",  time:"7PM ET",     home:"R32 Match 12", away:"TBD", venue:"Toronto Stadium, Toronto",              group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:85,  date:"Jul 2",  time:"11PM ET",    home:"R32 Match 13", away:"TBD", venue:"BC Place, Vancouver",                   group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:86,  date:"Jul 3",  time:"2PM ET",     home:"R32 Match 14", away:"TBD", venue:"Dallas Stadium, Dallas",                group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:87,  date:"Jul 3",  time:"6PM ET",     home:"R32 Match 15", away:"TBD", venue:"Miami Stadium, Miami",                  group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},
  {id:88,  date:"Jul 3",  time:"9:30PM ET",  home:"R32 Match 16", away:"TBD", venue:"Kansas City Stadium, Kansas City",      group:"", stage:"Round of 32",tv:"FS1 · Telemundo"},

  // ── ROUND OF 16 (Jul 4–7) ────────────────────────────────────────────────
  {id:89,  date:"Jul 4",  time:"1PM ET",     home:"R16 Match 1",  away:"TBD", venue:"Houston Stadium, Houston",              group:"", stage:"Round of 16",tv:"FOX · Telemundo"},
  {id:90,  date:"Jul 4",  time:"5PM ET",     home:"R16 Match 2",  away:"TBD", venue:"Philadelphia Stadium, Philadelphia",    group:"", stage:"Round of 16",tv:"FOX · Telemundo"},
  {id:91,  date:"Jul 5",  time:"4PM ET",     home:"R16 Match 3",  away:"TBD", venue:"New York New Jersey Stadium, East Rutherford", group:"", stage:"Round of 16",tv:"FOX · Telemundo"},
  {id:92,  date:"Jul 5",  time:"8PM ET",     home:"R16 Match 4",  away:"TBD", venue:"Mexico City Stadium, Mexico City",      group:"", stage:"Round of 16",tv:"FOX · Telemundo"},
  {id:93,  date:"Jul 6",  time:"3PM ET",     home:"R16 Match 5",  away:"TBD", venue:"Dallas Stadium, Dallas",                group:"", stage:"Round of 16",tv:"FOX · Telemundo"},
  {id:94,  date:"Jul 6",  time:"8PM ET",     home:"R16 Match 6",  away:"TBD", venue:"Seattle Stadium, Seattle",              group:"", stage:"Round of 16",tv:"FOX · Telemundo"},
  {id:95,  date:"Jul 7",  time:"12PM ET",    home:"R16 Match 7",  away:"TBD", venue:"Atlanta Stadium, Atlanta",             group:"", stage:"Round of 16",tv:"FOX · Telemundo"},
  {id:96,  date:"Jul 7",  time:"4PM ET",     home:"R16 Match 8",  away:"TBD", venue:"BC Place, Vancouver",                   group:"", stage:"Round of 16",tv:"FOX · Telemundo"},

  // ── QUARTER-FINALS (Jul 9–11) ────────────────────────────────────────────
  {id:97,  date:"Jul 9",  time:"4PM ET",     home:"QF Match 1",   away:"TBD", venue:"Boston Stadium, Boston",                group:"", stage:"Quarter-final",tv:"FOX · Telemundo"},
  {id:98,  date:"Jul 10", time:"3PM ET",     home:"QF Match 2",   away:"TBD", venue:"SoFi Stadium, Los Angeles",             group:"", stage:"Quarter-final",tv:"FOX · Telemundo"},
  {id:99,  date:"Jul 11", time:"5PM ET",     home:"QF Match 3",   away:"TBD", venue:"Miami Stadium, Miami",                  group:"", stage:"Quarter-final",tv:"FOX · Telemundo"},
  {id:100, date:"Jul 11", time:"9PM ET",     home:"QF Match 4",   away:"TBD", venue:"Kansas City Stadium, Kansas City",      group:"", stage:"Quarter-final",tv:"FOX · Telemundo"},

  // ── SEMI-FINALS (Jul 14–15) ──────────────────────────────────────────────
  {id:101, date:"Jul 14", time:"3PM ET",     home:"SF Match 1",   away:"TBD", venue:"Dallas Stadium, Dallas",                group:"", stage:"Semi-final",tv:"FOX · Telemundo"},
  {id:102, date:"Jul 15", time:"3PM ET",     home:"SF Match 2",   away:"TBD", venue:"Atlanta Stadium, Atlanta",             group:"", stage:"Semi-final",tv:"FOX · Telemundo"},

  // ── THIRD PLACE (Jul 18) ─────────────────────────────────────────────────
  {id:103, date:"Jul 18", time:"5PM ET",     home:"3rd Place",    away:"TBD", venue:"Miami Stadium, Miami",                  group:"", stage:"3rd Place",tv:"FOX · Telemundo"},

  // ── FINAL (Jul 19) ───────────────────────────────────────────────────────
  {id:104, date:"Jul 19", time:"3PM ET",     home:"World Cup Final", away:"TBD", venue:"New York New Jersey Stadium, East Rutherford", group:"", stage:"🏆 Final",tv:"FOX · Telemundo"},
];

const TEAMS = {
  "Argentina":{flag:"🇦🇷",conf:"CONMEBOL",rank:2,ss:8.1,titles:3,coach:"Scaloni",form:["W","W","D","W","W"],stats:{ATT:8.4,MID:7.9,DEF:7.8,FIT:8.0,TW:8.6},players:[{name:"Lionel Messi",pos:"FW",club:"Inter Miami",caps:191,goals:109,ss:9.2,note:"GOAT · 2022 WC Golden Ball"},{name:"Julian Alvarez",pos:"FW",club:"Atletico Madrid",caps:45,goals:26,ss:8.0,note:"2022 WC hero"},{name:"Rodrigo De Paul",pos:"MF",club:"Atletico Madrid",caps:78,goals:9,ss:7.6,note:"Midfield engine"},{name:"E. Martinez",pos:"GK",club:"Aston Villa",caps:43,goals:0,ss:8.1,note:"2022 WC Golden Glove"}],note:"Defending champions. Messi hunting a historic second title. Battle-hardened and tactically flexible."},
  "France":{flag:"🇫🇷",conf:"UEFA",rank:3,ss:8.3,titles:2,coach:"Deschamps",form:["W","W","W","D","W"],stats:{ATT:9.0,MID:8.1,DEF:8.2,FIT:8.5,TW:8.0},players:[{name:"Kylian Mbappe",pos:"FW",club:"Real Madrid",caps:87,goals:51,ss:9.4,note:"Golden Boot favourite"},{name:"Antoine Griezmann",pos:"FW",club:"Atletico Madrid",caps:137,goals:46,ss:8.2,note:"2018 Golden Ball"},{name:"A. Tchouameni",pos:"MF",club:"Real Madrid",caps:47,goals:6,ss:7.9,note:"World-class DM"},{name:"Mike Maignan",pos:"GK",club:"AC Milan",caps:28,goals:0,ss:8.3,note:"Elite keeper"}],note:"Most talented squad on paper. Mbappe is the standout Golden Boot favourite. World-class throughout."},
  "Brazil":{flag:"🇧🇷",conf:"CONMEBOL",rank:5,ss:8.0,titles:5,coach:"Ancelotti",form:["W","D","W","W","W"],stats:{ATT:8.8,MID:7.8,DEF:7.6,FIT:8.1,TW:7.9},players:[{name:"Vinicius Jr.",pos:"FW",club:"Real Madrid",caps:39,goals:14,ss:9.1,note:"Ballon d'Or contender"},{name:"Rodrygo",pos:"FW",club:"Real Madrid",caps:44,goals:18,ss:8.1,note:"Clutch in big games"},{name:"Casemiro",pos:"MF",club:"Man United",caps:83,goals:8,ss:7.5,note:"Veteran anchor"},{name:"Alisson",pos:"GK",club:"Liverpool",caps:72,goals:1,ss:8.5,note:"World-class"}],note:"Renewed optimism under Ancelotti. Vinicius Jr. could be the most dangerous player. 24-year title drought."},
  "England":{flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",conf:"UEFA",rank:4,ss:8.1,titles:1,coach:"Southgate",form:["W","W","W","W","D"],stats:{ATT:8.5,MID:8.6,DEF:8.0,FIT:8.2,TW:8.1},players:[{name:"Jude Bellingham",pos:"MF",club:"Real Madrid",caps:52,goals:17,ss:9.0,note:"World-class midfielder"},{name:"Harry Kane",pos:"FW",club:"Bayern Munich",caps:98,goals:68,ss:8.7,note:"All-time England top scorer"},{name:"Phil Foden",pos:"MF",club:"Man City",caps:46,goals:13,ss:8.3,note:"PL Player of Year"},{name:"Jordan Pickford",pos:"GK",club:"Everton",caps:64,goals:0,ss:7.8,note:"Shootout specialist"}],note:"Finally delivering on the golden generation promise. Bellingham + Kane is one of the world's deadliest partnerships."},
  "Spain":{flag:"🇪🇸",conf:"UEFA",rank:1,ss:8.5,titles:1,coach:"De la Fuente",form:["W","W","W","W","W"],stats:{ATT:8.7,MID:9.1,DEF:8.3,FIT:8.4,TW:9.0},players:[{name:"Pedri",pos:"MF",club:"Barcelona",caps:42,goals:7,ss:8.9,note:"Generational talent"},{name:"Lamine Yamal",pos:"FW",club:"Barcelona",caps:28,goals:12,ss:9.1,note:"Euro 2024 star · youngest ever scorer"},{name:"Rodri",pos:"MF",club:"Man City",caps:61,goals:9,ss:8.8,note:"2024 Ballon d'Or"},{name:"Dani Carvajal",pos:"DF",club:"Real Madrid",caps:76,goals:4,ss:7.9,note:"Euro 2024 winner"}],note:"Ranked #1 globally, back-to-back Euro champions. The most attractive football on earth."},
  "Germany":{flag:"🇩🇪",conf:"UEFA",rank:12,ss:7.8,titles:4,coach:"Nagelsmann",form:["W","W","D","W","W"],stats:{ATT:8.3,MID:8.5,DEF:7.9,FIT:8.3,TW:8.0},players:[{name:"Jamal Musiala",pos:"MF",club:"Bayern Munich",caps:42,goals:15,ss:8.9,note:"Silky dribbler"},{name:"Florian Wirtz",pos:"MF",club:"Bayer Leverkusen",caps:35,goals:12,ss:8.8,note:"Bundesliga's best"},{name:"Kai Havertz",pos:"FW",club:"Arsenal",caps:68,goals:23,ss:7.8,note:"Big-game scorer"},{name:"Manuel Neuer",pos:"GK",club:"Bayern Munich",caps:124,goals:1,ss:7.5,note:"Final WC · legend"}],note:"Musiala + Wirtz is the most exciting young midfield pair in Europe. Genuine dark horse."},
  "Portugal":{flag:"🇵🇹",conf:"UEFA",rank:7,ss:7.9,titles:0,coach:"Martinez",form:["W","W","W","W","D"],stats:{ATT:8.4,MID:7.8,DEF:7.7,FIT:7.9,TW:7.6},players:[{name:"Cristiano Ronaldo",pos:"FW",club:"Al Nassr",caps:217,goals:135,ss:8.0,note:"All-time international top scorer"},{name:"Bruno Fernandes",pos:"MF",club:"Man United",caps:84,goals:25,ss:8.3,note:"Captain"},{name:"Rafael Leao",pos:"FW",club:"AC Milan",caps:38,goals:11,ss:8.1,note:"Electric winger"},{name:"Ruben Dias",pos:"DF",club:"Man City",caps:67,goals:5,ss:8.4,note:"Elite CB"}],note:"Ronaldo's last World Cup at 41. Will CR7 finally win the one trophy that has eluded him?"},
  "Netherlands":{flag:"🇳🇱",conf:"UEFA",rank:8,ss:7.8,titles:0,coach:"Koeman",form:["W","D","W","W","W"],stats:{ATT:7.9,MID:7.6,DEF:8.5,FIT:8.0,TW:7.8},players:[{name:"Virgil van Dijk",pos:"DF",club:"Liverpool",caps:75,goals:9,ss:8.7,note:"World's best CB"},{name:"Cody Gakpo",pos:"FW",club:"Liverpool",caps:40,goals:18,ss:8.1,note:"2022 WC breakout star"},{name:"Xavi Simons",pos:"MF",club:"PSG",caps:29,goals:8,ss:8.0,note:"Rising star"},{name:"Memphis Depay",pos:"FW",club:"Atletico Madrid",caps:103,goals:45,ss:7.6,note:"Experienced"}],note:"Three-time finalist, never won. Van Dijk leads a balanced squad. Could quietly go all the way."},
  "Belgium":{flag:"🇧🇪",conf:"UEFA",rank:3,ss:7.7,titles:0,coach:"Tedesco",form:["W","W","D","W","D"],stats:{ATT:8.1,MID:7.8,DEF:7.7,FIT:7.8,TW:7.6},players:[{name:"Kevin De Bruyne",pos:"MF",club:"Man City",caps:102,goals:27,ss:8.9,note:"World's best midfielder"},{name:"Romelu Lukaku",pos:"FW",club:"Napoli",caps:110,goals:73,ss:8.1,note:"Belgium all-time top scorer"},{name:"Jeremy Doku",pos:"FW",club:"Man City",caps:34,goals:7,ss:8.1,note:"Explosive winger"},{name:"Thibaut Courtois",pos:"GK",club:"Real Madrid",caps:101,goals:0,ss:8.8,note:"World's best GK"}],note:"The Golden Generation's last chance. Must win this or be remembered as underachievers."},
  "Norway":{flag:"🇳🇴",conf:"UEFA",rank:31,ss:7.1,titles:0,coach:"Solbakken",form:["W","W","D","W","W"],stats:{ATT:7.6,MID:7.0,DEF:7.0,FIT:8.0,TW:7.4},players:[{name:"Erling Haaland",pos:"FW",club:"Man City",caps:38,goals:32,ss:9.3,note:"Most prolific striker on Earth"},{name:"Martin Odegaard",pos:"MF",club:"Arsenal",caps:71,goals:24,ss:8.7,note:"Arsenal captain"},{name:"Alexander Sorloth",pos:"FW",club:"Atletico Madrid",caps:52,goals:25,ss:7.8,note:"Physical striker"},{name:"Rune Jarstein",pos:"GK",club:"Hertha",caps:48,goals:0,ss:6.8,note:"Veteran"}],note:"Haaland + Odegaard: potentially the most devastating partnership in the tournament. Dark horse."},
  "Mexico":{flag:"🇲🇽",conf:"CONCACAF",rank:15,ss:7.2,titles:0,coach:"Aguirre",form:["W","D","W","D","W"],stats:{ATT:7.2,MID:7.4,DEF:7.5,FIT:7.8,TW:8.1},players:[{name:"Hirving Lozano",pos:"FW",club:"PSV",caps:101,goals:31,ss:7.8,note:"Pacey winger"},{name:"Raul Jimenez",pos:"FW",club:"Fulham",caps:93,goals:36,ss:7.5,note:"Target man"},{name:"Edson Alvarez",pos:"MF",club:"West Ham",caps:86,goals:9,ss:7.7,note:"Dominant DM"},{name:"Guillermo Ochoa",pos:"GK",club:"America",caps:148,goals:0,ss:7.9,note:"6th World Cup · legend"}],note:"Host nation opening at the iconic Estadio Azteca. Home crowd advantage is massive."},
  "United States":{flag:"🇺🇸",conf:"CONCACAF",rank:11,ss:7.4,titles:0,coach:"Pochettino",form:["W","W","D","W","W"],stats:{ATT:7.6,MID:7.5,DEF:7.4,FIT:8.4,TW:7.9},players:[{name:"Christian Pulisic",pos:"FW",club:"AC Milan",caps:72,goals:27,ss:7.9,note:"Captain"},{name:"Gio Reyna",pos:"MF",club:"Dortmund",caps:32,goals:8,ss:7.7,note:"Gifted playmaker"},{name:"Weston McKennie",pos:"MF",club:"Juventus",caps:61,goals:13,ss:7.5,note:"Box-to-box"},{name:"Matt Turner",pos:"GK",club:"Crystal Palace",caps:43,goals:0,ss:7.2,note:"Reliable"}],note:"Host nation transformed by Pochettino. Massive home crowd advantage. Exciting young core."},
  "Morocco":{flag:"🇲🇦",conf:"CAF",rank:14,ss:7.3,titles:0,coach:"Regragui",form:["W","W","D","W","L"],stats:{ATT:7.1,MID:7.4,DEF:7.9,FIT:8.1,TW:8.3},players:[{name:"Achraf Hakimi",pos:"DF",club:"PSG",caps:82,goals:14,ss:8.5,note:"World's best RB"},{name:"Hakim Ziyech",pos:"MF",club:"Galatasaray",caps:60,goals:22,ss:7.5,note:"Creative"},{name:"Y. En-Nesyri",pos:"FW",club:"Fenerbahce",caps:49,goals:26,ss:7.6,note:"Striker"},{name:"Yassine Bounou",pos:"GK",club:"Al Hilal",caps:48,goals:0,ss:8.2,note:"World-class"}],note:"2022 semi-finalists. Proved Africa can go deep. Hakimi is world-class. Hard to break down."},
  "Uruguay":{flag:"🇺🇾",conf:"CONMEBOL",rank:9,ss:7.4,titles:2,coach:"Bielsa",form:["W","W","D","W","L"],stats:{ATT:7.4,MID:7.3,DEF:7.8,FIT:7.9,TW:8.0},players:[{name:"Darwin Nunez",pos:"FW",club:"Liverpool",caps:43,goals:22,ss:7.9,note:"Powerful striker"},{name:"Federico Valverde",pos:"MF",club:"Real Madrid",caps:56,goals:13,ss:8.5,note:"World-class engine"},{name:"R. Bentancur",pos:"MF",club:"Tottenham",caps:59,goals:8,ss:7.6,note:"Technical"},{name:"Sergio Rochet",pos:"GK",club:"Nacional",caps:28,goals:0,ss:7.1,note:"Keeper"}],note:"Valverde and Nunez make Uruguay dangerous. Always battle hard. Could go deep."},
  "Croatia":{flag:"🇭🇷",conf:"UEFA",rank:10,ss:7.5,titles:0,coach:"Dalic",form:["W","D","W","W","D"],stats:{ATT:7.3,MID:8.1,DEF:7.6,FIT:7.7,TW:8.2},players:[{name:"Luka Modric",pos:"MF",club:"Real Madrid",caps:173,goals:24,ss:8.4,note:"2018 Golden Ball · final WC"},{name:"Mateo Kovacic",pos:"MF",club:"Man City",caps:100,goals:5,ss:8.0,note:"PL champion"},{name:"Ivan Perisic",pos:"FW",club:"Hajduk Split",caps:130,goals:33,ss:7.2,note:"Veteran"},{name:"D. Livakovic",pos:"GK",club:"Fenerbahce",caps:50,goals:0,ss:7.8,note:"2022 shootout hero"}],note:"Modric at 40 · his final World Cup. Croatia always over-perform. Midfield remains world-class."},
  "Japan":{flag:"🇯🇵",conf:"AFC",rank:20,ss:7.4,titles:0,coach:"Moriyasu",form:["W","W","W","D","W"],stats:{ATT:7.4,MID:7.5,DEF:7.2,FIT:8.3,TW:8.2},players:[{name:"Takefusa Kubo",pos:"MF",club:"Real Sociedad",caps:41,goals:10,ss:8.0,note:"Japan's golden boy"},{name:"Ritsu Doan",pos:"MF",club:"Freiburg",caps:55,goals:17,ss:7.7,note:"Bundesliga star"},{name:"Daichi Kamada",pos:"MF",club:"Lazio",caps:47,goals:14,ss:7.5,note:"Technical"},{name:"Daniel Schmidt",pos:"GK",club:"Sint-Truiden",caps:20,goals:0,ss:7.1,note:"Keeper"}],note:"Beat Germany and Spain at 2022 WC. The most improved AFC team. Never underestimate Japan."},
  "Senegal":{flag:"🇸🇳",conf:"CAF",rank:17,ss:7.3,titles:0,coach:"Cisse",form:["W","D","W","W","D"],stats:{ATT:7.4,MID:7.2,DEF:7.3,FIT:8.3,TW:7.9},players:[{name:"Sadio Mane",pos:"FW",club:"Al Nassr",caps:99,goals:39,ss:8.0,note:"Africa's greatest"},{name:"Idrissa Gueye",pos:"MF",club:"Everton",caps:98,goals:4,ss:7.2,note:"Veteran"},{name:"Ismila Sarr",pos:"FW",club:"Marseille",caps:51,goals:16,ss:7.7,note:"Explosive winger"},{name:"E. Mendy",pos:"GK",club:"Al Ahli",caps:42,goals:0,ss:7.8,note:"Former Chelsea"}],note:"2021 AFCON champions. Mane still world class. Real rivals for France in Group I."},
  "Egypt":{flag:"🇪🇬",conf:"CAF",rank:35,ss:6.8,titles:0,coach:"El-Badry",form:["W","D","W","W","L"],stats:{ATT:7.2,MID:6.8,DEF:6.9,FIT:7.4,TW:7.3},players:[{name:"Mohamed Salah",pos:"FW",club:"Liverpool",caps:98,goals:58,ss:9.0,note:"World's best"},{name:"Omar Marmoush",pos:"FW",club:"Man City",caps:26,goals:10,ss:7.8,note:"Man City star"},{name:"Tarek Hamed",pos:"MF",club:"Sharjah",caps:66,goals:2,ss:6.5,note:"Veteran DM"},{name:"M. El Shenawy",pos:"GK",club:"Al Ahly",caps:55,goals:0,ss:7.2,note:"Keeper"}],note:"Salah and Marmoush is a devastating partnership. Salah desperate to shine on the biggest stage."},
  "Colombia":{flag:"🇨🇴",conf:"CONMEBOL",rank:10,ss:7.3,titles:0,coach:"Lorenzo",form:["W","W","D","W","D"],stats:{ATT:7.6,MID:7.4,DEF:7.1,FIT:7.8,TW:7.5},players:[{name:"James Rodriguez",pos:"MF",club:"Rayo Vallecano",caps:101,goals:35,ss:7.5,note:"2014 Golden Boot"},{name:"Luis Diaz",pos:"FW",club:"Liverpool",caps:59,goals:21,ss:8.3,note:"Liverpool's electric winger"},{name:"Richard Rios",pos:"MF",club:"Palmeiras",caps:28,goals:4,ss:7.6,note:"Energetic"},{name:"Camilo Vargas",pos:"GK",club:"Atlas",caps:41,goals:0,ss:7.1,note:"Keeper"}],note:"2024 Copa America runners-up. Luis Diaz is Premier League class. Dark horses to go deep."},
  "South Korea":{flag:"🇰🇷",conf:"AFC",rank:23,ss:7.0,titles:0,coach:"Hong",form:["W","D","W","L","W"],stats:{ATT:7.0,MID:7.2,DEF:6.9,FIT:8.0,TW:7.5},players:[{name:"Son Heung-min",pos:"FW",club:"Tottenham",caps:126,goals:50,ss:8.3,note:"Captain"},{name:"Kim Min-jae",pos:"DF",club:"Bayern Munich",caps:61,goals:5,ss:8.0,note:"Elite CB"},{name:"Lee Jae-sung",pos:"MF",club:"Mainz",caps:77,goals:14,ss:7.1,note:"Midfielder"},{name:"Jo Hyeon-woo",pos:"GK",club:"Ulsan HD",caps:40,goals:0,ss:7.0,note:"Keeper"}],note:"Son carries enormous expectations. Kim Min-jae is world-class. Can they replicate 2002 magic?"},
  "Canada":{flag:"🇨🇦",conf:"CONCACAF",rank:47,ss:6.8,titles:0,coach:"Marsch",form:["W","W","D","W","L"],stats:{ATT:6.9,MID:6.8,DEF:6.7,FIT:8.2,TW:7.4},players:[{name:"Alphonso Davies",pos:"DF",club:"Bayern Munich",caps:63,goals:13,ss:8.4,note:"World-class LB"},{name:"Jonathan David",pos:"FW",club:"Lille",caps:50,goals:30,ss:8.0,note:"Lethal finisher"},{name:"Tajon Buchanan",pos:"MF",club:"Inter Milan",caps:42,goals:8,ss:7.4,note:"Winger"},{name:"M. Crepeau",pos:"GK",club:"LA Galaxy",caps:34,goals:0,ss:7.0,note:"Keeper"}],note:"Host nation with genuine talent. Davies and David are top European players."},
  "Switzerland":{flag:"🇨🇭",conf:"UEFA",rank:19,ss:7.1,titles:0,coach:"Yakin",form:["D","W","W","D","W"],stats:{ATT:7.0,MID:7.3,DEF:7.4,FIT:7.5,TW:7.8},players:[{name:"Granit Xhaka",pos:"MF",club:"Bayer Leverkusen",caps:127,goals:17,ss:7.8,note:"Captain"},{name:"Breel Embolo",pos:"FW",club:"Monaco",caps:66,goals:17,ss:7.5,note:"Physical FW"},{name:"Xherdan Shaqiri",pos:"MF",club:"Chicago Fire",caps:116,goals:32,ss:7.2,note:"Experienced"},{name:"Yann Sommer",pos:"GK",club:"Inter Milan",caps:95,goals:0,ss:8.0,note:"Elite keeper"}],note:"Always reliable. Switzerland punch above their weight every tournament."},
  "Austria":{flag:"🇦🇹",conf:"UEFA",rank:25,ss:6.9,titles:0,coach:"Rangnick",form:["W","W","W","D","W"],stats:{ATT:7.0,MID:7.2,DEF:7.0,FIT:7.9,TW:7.8},players:[{name:"David Alaba",pos:"DF",club:"Real Madrid",caps:101,goals:16,ss:8.0,note:"Captain"},{name:"C. Baumgartner",pos:"MF",club:"RB Leipzig",caps:42,goals:12,ss:7.7,note:"Creative"},{name:"Marcel Sabitzer",pos:"MF",club:"Dortmund",caps:72,goals:18,ss:7.5,note:"Box-to-box"},{name:"Patrick Pentz",pos:"GK",club:"Bayer Leverkusen",caps:18,goals:0,ss:7.3,note:"Keeper"}],note:"Rangnick's high press has transformed Austria. Euro 2024 quarter-finalists."},
  "Sweden":{flag:"🇸🇪",conf:"UEFA",rank:28,ss:7.0,titles:0,coach:"Tomasson",form:["D","W","W","D","W"],stats:{ATT:7.1,MID:7.0,DEF:7.2,FIT:7.8,TW:7.6},players:[{name:"Alexander Isak",pos:"FW",club:"Newcastle",caps:37,goals:20,ss:8.2,note:"Elite PL striker"},{name:"Dejan Kulusevski",pos:"MF",club:"Tottenham",caps:44,goals:12,ss:8.0,note:"Creative"},{name:"Victor Lindelof",pos:"DF",club:"Man United",caps:80,goals:5,ss:7.2,note:"CB"},{name:"Robin Olsen",pos:"GK",club:"Aston Villa",caps:56,goals:0,ss:7.2,note:"Keeper"}],note:"Isak and Kulusevski give Sweden serious quality. Post-Ibrahimovic era steady."},
  "Iran":{flag:"🇮🇷",conf:"AFC",rank:21,ss:6.9,titles:0,coach:"Ghalenoei",form:["W","D","W","D","W"],stats:{ATT:6.7,MID:7.0,DEF:7.3,FIT:7.7,TW:7.8},players:[{name:"Mehdi Taremi",pos:"FW",club:"Inter Milan",caps:89,goals:44,ss:7.8,note:"Inter striker"},{name:"Sardar Azmoun",pos:"FW",club:"Roma",caps:72,goals:43,ss:7.6,note:"Technical"},{name:"A. Jahanbakhsh",pos:"MF",club:"Feyenoord",caps:80,goals:20,ss:7.2,note:"Winger"},{name:"A. Beiranvand",pos:"GK",club:"Antwerp",caps:55,goals:0,ss:7.5,note:"Keeper"}],note:"Taremi at Inter gives them a top European striker. Very hard to beat physically."},
  "Morocco":{flag:"🇲🇦",conf:"CAF",rank:14,ss:7.3,titles:0,coach:"Regragui",form:["W","W","D","W","L"],stats:{ATT:7.1,MID:7.4,DEF:7.9,FIT:8.1,TW:8.3},players:[{name:"Achraf Hakimi",pos:"DF",club:"PSG",caps:82,goals:14,ss:8.5,note:"World's best RB"},{name:"Hakim Ziyech",pos:"MF",club:"Galatasaray",caps:60,goals:22,ss:7.5,note:"Creative"},{name:"Y. En-Nesyri",pos:"FW",club:"Fenerbahce",caps:49,goals:26,ss:7.6,note:"Striker"},{name:"Yassine Bounou",pos:"GK",club:"Al Hilal",caps:48,goals:0,ss:8.2,note:"World-class"}],note:"2022 semi-finalists. Proved Africa can go deep. Hakimi is world-class. Hard to break down."},
  "Algeria":{flag:"🇩🇿",conf:"CAF",rank:32,ss:6.7,titles:0,coach:"Petkovic",form:["W","D","W","L","W"],stats:{ATT:6.8,MID:6.9,DEF:6.7,FIT:7.5,TW:7.2},players:[{name:"Riyad Mahrez",pos:"FW",club:"Al Ahli",caps:99,goals:30,ss:7.6,note:"Algeria's greatest"},{name:"Ismael Bennacer",pos:"MF",club:"AC Milan",caps:50,goals:3,ss:7.8,note:"Serie A star"},{name:"Youcef Atal",pos:"DF",club:"Nottingham Forest",caps:34,goals:7,ss:7.3,note:"RB"},{name:"Rais M'Bolhi",pos:"GK",club:"Al-Qadsia",caps:87,goals:0,ss:6.8,note:"Veteran"}],note:"Mahrez and Bennacer give real quality. Drawn against Argentina in Group J."},
  "Ecuador":{flag:"🇪🇨",conf:"CONMEBOL",rank:44,ss:6.6,titles:0,coach:"Beccacece",form:["W","D","W","L","W"],stats:{ATT:6.7,MID:6.5,DEF:6.6,FIT:7.7,TW:7.2},players:[{name:"Moises Caicedo",pos:"MF",club:"Chelsea",caps:44,goals:5,ss:8.1,note:"World-class DM"},{name:"Enner Valencia",pos:"FW",club:"Internacional",caps:87,goals:40,ss:7.0,note:"All-time scorer"},{name:"Jeremy Sarmiento",pos:"MF",club:"Brighton",caps:25,goals:4,ss:7.2,note:"Winger"},{name:"A. Dominguez",pos:"GK",club:"LDU Quito",caps:75,goals:0,ss:6.8,note:"Keeper"}],note:"Caicedo is genuinely world-class at Chelsea. Could cause trouble in Group E with Germany."},
  "Paraguay":{flag:"🇵🇾",conf:"CONMEBOL",rank:53,ss:6.4,titles:0,coach:"Alfaro",form:["D","W","L","D","W"],stats:{ATT:6.2,MID:6.4,DEF:6.7,FIT:7.4,TW:7.0},players:[{name:"Miguel Almiron",pos:"MF",club:"Atletico Madrid",caps:67,goals:13,ss:7.6,note:"Tireless"},{name:"Julio Enciso",pos:"FW",club:"Brighton",caps:24,goals:6,ss:7.4,note:"Explosive talent"},{name:"Omar Alderete",pos:"DF",club:"Getafe",caps:35,goals:2,ss:6.7,note:"Defender"},{name:"Antony Silva",pos:"GK",club:"Libertad",caps:84,goals:0,ss:6.8,note:"Veteran"}],note:"Almiron and Enciso give Paraguay options. Historically hard to beat."},
  "Scotland":{flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",conf:"UEFA",rank:39,ss:6.6,titles:0,coach:"Clarke",form:["D","W","W","D","L"],stats:{ATT:6.5,MID:6.8,DEF:6.7,FIT:7.5,TW:7.3},players:[{name:"Andy Robertson",pos:"DF",club:"Liverpool",caps:82,goals:5,ss:8.0,note:"World-class LB"},{name:"Scott McTominay",pos:"MF",club:"Napoli",caps:57,goals:16,ss:7.8,note:"Goals machine"},{name:"Che Adams",pos:"FW",club:"Torino",caps:33,goals:12,ss:7.1,note:"FW"},{name:"Angus Gunn",pos:"GK",club:"Norwich",caps:18,goals:0,ss:6.9,note:"Keeper"}],note:"McTominay fired Scotland to qualification. Robertson is world-class. Tough group."},
  "Australia":{flag:"🇦🇺",conf:"AFC",rank:24,ss:6.9,titles:0,coach:"Popovic",form:["W","D","W","W","L"],stats:{ATT:6.8,MID:7.0,DEF:6.9,FIT:8.0,TW:7.6},players:[{name:"Mathew Ryan",pos:"GK",club:"Real Sociedad",caps:86,goals:0,ss:7.4,note:"La Liga keeper"},{name:"Mitch Duke",pos:"FW",club:"Fagiano Okayama",caps:38,goals:14,ss:6.8,note:"Target man"},{name:"Ajdin Hrustic",pos:"MF",club:"Bologna",caps:36,goals:7,ss:7.2,note:"Creative"},{name:"Milos Degenek",pos:"DF",club:"Columbus Crew",caps:58,goals:2,ss:6.8,note:"CB"}],note:"Back-to-back Round of 16 appearances. A tough group but Australia always compete hard."},
  "Turkiye":{flag:"🇹🇷",conf:"UEFA",rank:29,ss:7.0,titles:0,coach:"Montella",form:["W","W","D","W","L"],stats:{ATT:7.3,MID:7.1,DEF:6.8,FIT:7.6,TW:7.2},players:[{name:"Hakan Calhanoglu",pos:"MF",club:"Inter Milan",caps:89,goals:22,ss:8.2,note:"Serie A champion"},{name:"Arda Guler",pos:"MF",club:"Real Madrid",caps:22,goals:8,ss:8.0,note:"Teen sensation"},{name:"Kerem Akturkoglu",pos:"FW",club:"Galatasaray",caps:38,goals:13,ss:7.7,note:"Winger"},{name:"Altay Bayindir",pos:"GK",club:"Man United",caps:20,goals:0,ss:7.2,note:"GK"}],note:"Arda Guler could be the tournament's revelation. Calhanoglu is world-class. Potential dark horses."},
  "Ivory Coast":{flag:"🇨🇮",conf:"CAF",rank:48,ss:6.8,titles:0,coach:"Fae",form:["W","W","D","W","L"],stats:{ATT:7.0,MID:6.9,DEF:6.6,FIT:7.8,TW:7.1},players:[{name:"Sebastien Haller",pos:"FW",club:"Dortmund",caps:44,goals:19,ss:7.5,note:"Inspirational comeback"},{name:"Franck Kessie",pos:"MF",club:"Barcelona",caps:71,goals:12,ss:7.4,note:"Box-to-box"},{name:"Simon Adingra",pos:"FW",club:"Brighton",caps:22,goals:8,ss:7.6,note:"Exciting winger"},{name:"Yahia Fofana",pos:"GK",club:"Chelsea",caps:30,goals:0,ss:7.3,note:"Chelsea GK"}],note:"2023 AFCON champions. Full of European talent. Could surprise Germany in Group E."},
  "Tunisia":{flag:"🇹🇳",conf:"CAF",rank:30,ss:6.7,titles:0,coach:"Kadri",form:["W","D","L","W","D"],stats:{ATT:6.6,MID:6.8,DEF:7.0,FIT:7.5,TW:7.4},players:[{name:"Wahbi Khazri",pos:"FW",club:"Montpellier",caps:71,goals:25,ss:7.0,note:"Veteran FW"},{name:"Aissa Laidouni",pos:"MF",club:"Watford",caps:34,goals:3,ss:7.2,note:"Midfielder"},{name:"Youssef Msakni",pos:"MF",club:"Al-Qadsia",caps:99,goals:30,ss:6.8,note:"Technical"},{name:"Aymen Dahmen",pos:"GK",club:"Al Qadsiah",caps:24,goals:0,ss:7.0,note:"Keeper"}],note:"Organized and hard to beat. Will be tough for Sweden and Netherlands in Group F."},
  "Saudi Arabia":{flag:"🇸🇦",conf:"AFC",rank:58,ss:6.3,titles:0,coach:"Renard",form:["D","W","L","W","D"],stats:{ATT:6.3,MID:6.4,DEF:6.5,FIT:7.3,TW:7.1},players:[{name:"Salem Al-Dawsari",pos:"FW",club:"Al Hilal",caps:89,goals:25,ss:7.1,note:"Scored vs Argentina 2022"},{name:"Mohamed Kanno",pos:"MF",club:"Al Hilal",caps:51,goals:7,ss:6.9,note:"Midfielder"},{name:"Ali Al-Bulayhi",pos:"DF",club:"Al Hilal",caps:79,goals:2,ss:6.7,note:"Defender"},{name:"M. Al-Owais",pos:"GK",club:"Al Hilal",caps:64,goals:0,ss:7.2,note:"Best Saudi GK"}],note:"Famous for beating Argentina in 2022. Group H with Spain is very tough."},
  "Ghana":{flag:"🇬🇭",conf:"CAF",rank:60,ss:6.5,titles:0,coach:"Queiroz",form:["W","D","L","W","D"],stats:{ATT:6.6,MID:6.5,DEF:6.4,FIT:7.9,TW:7.0},players:[{name:"Mohammed Kudus",pos:"MF",club:"West Ham",caps:39,goals:16,ss:8.1,note:"West Ham star"},{name:"Thomas Partey",pos:"MF",club:"Arsenal",caps:55,goals:14,ss:7.8,note:"Arsenal DM"},{name:"Jordan Ayew",pos:"FW",club:"Leicester",caps:99,goals:23,ss:7.1,note:"Veteran"},{name:"L. Ati-Zigi",pos:"GK",club:"Lorient",caps:22,goals:0,ss:7.2,note:"Keeper"}],note:"Kudus and Partey are PL stars. Ghana always have flair. Can spring a surprise in Group L."},
  "DR Congo":{flag:"🇨🇩",conf:"CAF",rank:52,ss:6.4,titles:0,coach:"Desabre",form:["W","W","D","L","W"],stats:{ATT:6.5,MID:6.4,DEF:6.3,FIT:7.9,TW:7.0},players:[{name:"Cedric Bakambu",pos:"FW",club:"Marseille",caps:72,goals:28,ss:7.2,note:"Top scorer"},{name:"Chancel Mbemba",pos:"DF",club:"Marseille",caps:55,goals:4,ss:7.4,note:"Solid CB"},{name:"Yannick Bolasie",pos:"FW",club:"retired",caps:38,goals:9,ss:6.5,note:"Winger"},{name:"Joel Kiassumbua",pos:"GK",club:"OH Leuven",caps:45,goals:0,ss:6.8,note:"Keeper"}],note:"Some real European talent. Group K with Portugal is a massive challenge."},
  "Uzbekistan":{flag:"🇺🇿",conf:"AFC",rank:74,ss:6.1,titles:0,coach:"Katanec",form:["W","D","W","D","W"],stats:{ATT:5.9,MID:6.2,DEF:6.2,FIT:7.5,TW:7.1},players:[{name:"Eldor Shomurodov",pos:"FW",club:"Roma",caps:60,goals:24,ss:7.3,note:"Serie A striker"},{name:"J. Masharipov",pos:"MF",club:"Pakhtakor",caps:62,goals:18,ss:6.8,note:"Creative"},{name:"D. Khamdamov",pos:"MF",club:"AGMK",caps:18,goals:4,ss:6.6,note:"Young talent"},{name:"Utkir Yusupov",pos:"GK",club:"Pakhtakor",caps:39,goals:0,ss:6.7,note:"Keeper"}],note:"First World Cup. Shomurodov at Roma shows they have top-level talent. Historic achievement."},
  "Cape Verde":{flag:"🇨🇻",conf:"CAF",rank:61,ss:6.2,titles:0,coach:"Bubista",form:["W","D","W","L","W"],stats:{ATT:6.1,MID:6.3,DEF:6.2,FIT:7.6,TW:7.0},players:[{name:"Garry Rodrigues",pos:"FW",club:"Moreirense",caps:55,goals:17,ss:6.8,note:"Winger"},{name:"Ryan Mendes",pos:"FW",club:"Angers",caps:58,goals:20,ss:6.7,note:"Top scorer"},{name:"Stopira",pos:"DF",club:"Kaiserslautern",caps:72,goals:3,ss:6.5,note:"Veteran"},{name:"Vozinha",pos:"GK",club:"Al Fayha",caps:42,goals:0,ss:6.9,note:"GK"}],note:"First World Cup appearance. A proud moment for the island nation drawn against Spain."},
  "Qatar":{flag:"🇶🇦",conf:"AFC",rank:58,ss:6.0,titles:0,coach:"Lopez",form:["L","D","W","L","W"],stats:{ATT:5.8,MID:6.1,DEF:6.0,FIT:7.2,TW:6.5},players:[{name:"Akram Afif",pos:"FW",club:"Al Sadd",caps:75,goals:34,ss:7.2,note:"Best player"},{name:"Almoez Ali",pos:"FW",club:"Al Duhail",caps:80,goals:42,ss:6.9,note:"Top scorer"},{name:"Hassan Al-Haydos",pos:"MF",club:"Al Sadd",caps:170,goals:38,ss:6.7,note:"Captain"},{name:"M. Barsham",pos:"GK",club:"Al Sadd",caps:35,goals:0,ss:6.8,note:"GK"}],note:"Hosts of 2022, now guests. Have improved significantly through Aspire Academy investment."},
  "Bosnia & Herz.":{flag:"🇧🇦",conf:"UEFA",rank:55,ss:6.5,titles:0,coach:"Barbarez",form:["W","D","L","W","D"],stats:{ATT:6.7,MID:6.4,DEF:6.3,FIT:7.0,TW:6.6},players:[{name:"Edin Dzeko",pos:"FW",club:"Fenerbahce",caps:130,goals:65,ss:7.0,note:"All-time scorer"},{name:"Miralem Pjanic",pos:"MF",club:"Sharjah",caps:103,goals:18,ss:6.8,note:"Elegant passer"},{name:"Sead Kolasinac",pos:"DF",club:"Marseille",caps:62,goals:3,ss:6.6,note:"LB"},{name:"Ibrahim Sehic",pos:"GK",club:"FK Sarajevo",caps:52,goals:0,ss:6.5,note:"Veteran"}],note:"The Golden Generation era of Dzeko and Pjanic nearing its end. Physical style could cause upsets."},
  "South Africa":{flag:"🇿🇦",conf:"CAF",rank:65,ss:6.1,titles:0,coach:"Broos",form:["D","W","L","D","W"],stats:{ATT:5.8,MID:6.2,DEF:6.4,FIT:7.0,TW:6.8},players:[{name:"Percy Tau",pos:"FW",club:"Al Ahly",caps:61,goals:14,ss:7.0,note:"Creative FW"},{name:"Themba Zwane",pos:"MF",club:"Mamelodi Sundowns",caps:44,goals:9,ss:6.7,note:"Technical"},{name:"Bongani Zungu",pos:"MF",club:"Amiens",caps:56,goals:4,ss:6.4,note:"DM"},{name:"Ronwen Williams",pos:"GK",club:"Mamelodi Sundowns",caps:38,goals:0,ss:7.2,note:"Good keeper"}],note:"Back at the WC for first time since hosting in 2010. Tough group but capable of an upset."},
  "Haiti":{flag:"🇭🇹",conf:"CONCACAF",rank:83,ss:5.5,titles:0,coach:"Collat",form:["W","L","D","L","W"],stats:{ATT:5.4,MID:5.6,DEF:5.5,FIT:7.3,TW:6.2},players:[{name:"Duckens Nazon",pos:"FW",club:"Pau FC",caps:44,goals:18,ss:6.3,note:"Top scorer"},{name:"Frantzdy Pierrot",pos:"FW",club:"Nashville SC",caps:38,goals:14,ss:6.1,note:"MLS FW"},{name:"Steeven Saba",pos:"MF",club:"Rodez AF",caps:30,goals:5,ss:5.9,note:"Midfielder"},{name:"Josue Duverger",pos:"GK",club:"Violette AC",caps:35,goals:0,ss:6.0,note:"GK"}],note:"Historic return to the World Cup after 52 years. Will face enormous challenges."},
  "New Zealand":{flag:"🇳🇿",conf:"OFC",rank:97,ss:5.9,titles:0,coach:"Bazeley",form:["W","D","L","W","D"],stats:{ATT:5.6,MID:6.0,DEF:6.1,FIT:7.4,TW:6.9},players:[{name:"Chris Wood",pos:"FW",club:"Nottingham Forest",caps:90,goals:31,ss:7.2,note:"PL striker"},{name:"Liberato Cacace",pos:"DF",club:"Empoli",caps:29,goals:2,ss:7.1,note:"LB"},{name:"Clayton Lewis",pos:"MF",club:"Al-Qadsiah",caps:39,goals:6,ss:6.8,note:"Midfielder"},{name:"Max Crocombe",pos:"GK",club:"St Mirren",caps:21,goals:0,ss:6.6,note:"GK"}],note:"OFC representatives. Chris Wood is a proven Premier League striker."},
  "Jordan":{flag:"🇯🇴",conf:"AFC",rank:69,ss:6.0,titles:0,coach:"Hamad",form:["D","W","L","D","W"],stats:{ATT:5.8,MID:6.0,DEF:6.2,FIT:7.2,TW:6.8},players:[{name:"Yazan Al-Naimat",pos:"FW",club:"Al Wihdat",caps:31,goals:12,ss:6.4,note:"Top scorer"},{name:"Baha Faisal",pos:"MF",club:"Al Faisaly",caps:38,goals:6,ss:6.2,note:"Midfielder"},{name:"Sanad Nasser",pos:"DF",club:"Al Faisaly",caps:44,goals:1,ss:6.3,note:"CB"},{name:"Amer Shafi",pos:"GK",club:"Al Ahli Amman",caps:88,goals:0,ss:6.7,note:"Legend"}],note:"Jordan's first ever World Cup. A historic moment for the nation."},
  "Iraq":{flag:"🇮🇶",conf:"AFC",rank:62,ss:6.0,titles:0,coach:"Casas",form:["W","D","L","W","D"],stats:{ATT:5.9,MID:6.1,DEF:6.0,FIT:7.1,TW:6.6},players:[{name:"Amjed Attwan",pos:"FW",club:"Al Zawraa",caps:38,goals:14,ss:6.4,note:"Top scorer"},{name:"Mohanad Ali",pos:"MF",club:"Al Quwa Al Jawiya",caps:32,goals:8,ss:6.3,note:"Midfielder"},{name:"Ali Adnan",pos:"DF",club:"Al Zawraa",caps:72,goals:6,ss:6.8,note:"LB"},{name:"Jalal Hassan",pos:"GK",club:"Erbil SC",caps:52,goals:0,ss:6.5,note:"GK"}],note:"Iraq's return to the WC after 40 years. Group I with France is a massive challenge."},
  "Panama":{flag:"🇵🇦",conf:"CONCACAF",rank:49,ss:6.2,titles:0,coach:"Christiansen",form:["D","W","D","W","L"],stats:{ATT:6.0,MID:6.2,DEF:6.5,FIT:7.6,TW:7.3},players:[{name:"Ismael Diaz",pos:"FW",club:"Porto",caps:25,goals:9,ss:7.3,note:"Porto FW"},{name:"A. Carrasquilla",pos:"MF",club:"Houston Dynamo",caps:45,goals:8,ss:7.0,note:"Creative"},{name:"R. Blackburn",pos:"FW",club:"Club Tijuana",caps:34,goals:12,ss:6.7,note:"Physical"},{name:"Luis Mejia",pos:"GK",club:"Modena",caps:32,goals:0,ss:7.0,note:"Keeper"}],note:"Will defend resolutely and look for set-piece goals. Group L with England is very tough."},
  "Curacao":{flag:"🇨🇼",conf:"CONCACAF",rank:79,ss:5.8,titles:0,coach:"Bicentini",form:["W","L","D","W","L"],stats:{ATT:5.7,MID:5.9,DEF:5.8,FIT:7.1,TW:6.5},players:[{name:"Leandro Bacuna",pos:"MF",club:"Cardiff City",caps:61,goals:11,ss:6.8,note:"Most capped"},{name:"Quentin Bericot",pos:"FW",club:"Guingamp",caps:20,goals:7,ss:6.3,note:"FW"},{name:"Eloy Room",pos:"GK",club:"Alaves",caps:47,goals:0,ss:6.9,note:"GK"},{name:"Cuco Martina",pos:"DF",club:"retired",caps:55,goals:2,ss:6.2,note:"Veteran"}],note:"Historic debut at the World Cup. Drawn against Germany. A proud moment."},
  "Czechia":{flag:"🇨🇿",conf:"UEFA",rank:36,ss:6.7,titles:0,coach:"Hasek",form:["W","W","D","L","W"],stats:{ATT:6.6,MID:6.8,DEF:6.9,FIT:7.1,TW:7.2},players:[{name:"Patrik Schick",pos:"FW",club:"Bayer Leverkusen",caps:53,goals:27,ss:7.6,note:"Clinical"},{name:"Tomas Soucek",pos:"MF",club:"West Ham",caps:79,goals:18,ss:7.3,note:"Box-to-box"},{name:"Vladimir Coufal",pos:"DF",club:"West Ham",caps:44,goals:2,ss:6.8,note:"RB"},{name:"Jiri Stanek",pos:"GK",club:"Atletico Madrid",caps:22,goals:0,ss:7.1,note:"Keeper"}],note:"Schick and Soucek are genuine top-level players. Defending will be key to progression."},
};

const RECENT4 = {
  "Argentina":[
    {date:"Apr 1, 2026",opp:"Zambia",score:"5-0",loc:"Buenos Aires",comp:"Friendly",res:"W"},
    {date:"Mar 28, 2026",opp:"Mauritania",score:"2-1",loc:"Buenos Aires",comp:"Friendly",res:"W"},
    {date:"Nov 14, 2025",opp:"Angola",score:"2-0",loc:"Luanda",comp:"Friendly",res:"W"},
    {date:"Oct 15, 2025",opp:"Puerto Rico",score:"6-0",loc:"San Juan",comp:"Friendly",res:"W"},
  ],
  "France":[
    {date:"Mar 29, 2026",opp:"Colombia",score:"3-1",loc:"Paris",comp:"Friendly",res:"W"},
    {date:"Mar 26, 2026",opp:"Brazil",score:"2-1",loc:"Paris",comp:"Friendly",res:"W"},
    {date:"Nov 16, 2025",opp:"Azerbaijan",score:"3-1",loc:"Baku",comp:"WC Qualifier",res:"W"},
    {date:"Nov 13, 2025",opp:"Iceland",score:"2-2",loc:"Reykjavik",comp:"WC Qualifier",res:"D"},
  ],
  "Brazil":[
    {date:"Mar 26, 2026",opp:"France",score:"1-2",loc:"Paris",comp:"Friendly",res:"L"},
    {date:"Mar 22, 2026",opp:"Germany",score:"2-1",loc:"Frankfurt",comp:"Friendly",res:"W"},
    {date:"Nov 18, 2025",opp:"Uruguay",score:"2-1",loc:"Montevideo",comp:"WC Qualifier (CONMEBOL)",res:"W"},
    {date:"Nov 14, 2025",opp:"Venezuela",score:"3-0",loc:"Brasilia",comp:"WC Qualifier (CONMEBOL)",res:"W"},
  ],
  "England":[
    {date:"Mar 31, 2026",opp:"Japan",score:"0-1",loc:"London, Wembley",comp:"Friendly",res:"L"},
    {date:"Mar 27, 2026",opp:"Uruguay",score:"1-1",loc:"London, Wembley",comp:"Friendly",res:"D"},
    {date:"Nov 16, 2025",opp:"Albania",score:"2-0",loc:"Tirana",comp:"WC Qualifier (UEFA)",res:"W"},
    {date:"Nov 13, 2025",opp:"Serbia",score:"2-0",loc:"London, Wembley",comp:"WC Qualifier (UEFA)",res:"W"},
  ],
  "Spain":[
    {date:"Mar 28, 2026",opp:"Portugal",score:"1-1",loc:"Seville",comp:"Friendly",res:"D"},
    {date:"Mar 25, 2026",opp:"Germany",score:"2-0",loc:"Madrid",comp:"Friendly",res:"W"},
    {date:"Nov 15, 2025",opp:"Turkiye",score:"2-2",loc:"Istanbul",comp:"WC Qualifier (UEFA)",res:"D"},
    {date:"Nov 11, 2025",opp:"Denmark",score:"3-0",loc:"Madrid",comp:"WC Qualifier (UEFA)",res:"W"},
  ],
  "Germany":[
    {date:"May 26, 2026",opp:"Ghana",score:"2-1",loc:"Nuremberg",comp:"Friendly",res:"W"},
    {date:"Mar 25, 2026",opp:"Spain",score:"0-2",loc:"Madrid",comp:"Friendly",res:"L"},
    {date:"Mar 22, 2026",opp:"Brazil",score:"1-2",loc:"Frankfurt",comp:"Friendly",res:"L"},
    {date:"Nov 16, 2025",opp:"Slovakia",score:"6-0",loc:"Dusseldorf",comp:"WC Qualifier (UEFA)",res:"W"},
  ],
  "Portugal":[
    {date:"Mar 28, 2026",opp:"Spain",score:"1-1",loc:"Seville",comp:"Friendly",res:"D"},
    {date:"Mar 24, 2026",opp:"Argentina",score:"1-1",loc:"Lisbon",comp:"Friendly",res:"D"},
    {date:"Nov 15, 2025",opp:"Armenia",score:"9-1",loc:"Lisbon",comp:"WC Qualifier (UEFA)",res:"W"},
    {date:"Jun 8, 2025",opp:"Spain",score:"2-2 (5-3p)",loc:"Munich",comp:"UEFA Nations League Final",res:"W"},
  ],
  "Netherlands":[
    {date:"Mar 26, 2026",opp:"Cameroon",score:"4-0",loc:"Amsterdam",comp:"Friendly",res:"W"},
    {date:"Mar 22, 2026",opp:"Portugal",score:"2-1",loc:"Rotterdam",comp:"Friendly",res:"W"},
    {date:"Nov 15, 2025",opp:"Lithuania",score:"4-0",loc:"Amsterdam",comp:"WC Qualifier (UEFA)",res:"W"},
    {date:"Nov 11, 2025",opp:"Malta",score:"8-0",loc:"Eindhoven",comp:"WC Qualifier (UEFA)",res:"W"},
  ],
  "Belgium":[
    {date:"Mar 29, 2026",opp:"United States",score:"2-0",loc:"Brussels",comp:"Friendly",res:"W"},
    {date:"Mar 25, 2026",opp:"Portugal",score:"1-3",loc:"Lisbon",comp:"Friendly",res:"L"},
    {date:"Nov 15, 2025",opp:"Liechtenstein",score:"7-0",loc:"Brussels",comp:"WC Qualifier (UEFA)",res:"W"},
    {date:"Nov 11, 2025",opp:"Wales",score:"4-3",loc:"Brussels",comp:"WC Qualifier (UEFA)",res:"W"},
  ],
  "Norway":[
    {date:"Mar 28, 2026",opp:"Scotland",score:"3-1",loc:"Oslo",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Turkiye",score:"2-0",loc:"Oslo",comp:"Friendly",res:"W"},
    {date:"Nov 14, 2025",opp:"Italy",score:"4-1",loc:"Rome",comp:"WC Qualifier (UEFA)",res:"W"},
    {date:"Nov 11, 2025",opp:"Estonia",score:"1-0",loc:"Oslo",comp:"WC Qualifier (UEFA)",res:"W"},
  ],
  "Mexico":[
    {date:"Mar 28, 2026",opp:"Costa Rica",score:"2-0",loc:"Mexico City",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Chile",score:"1-1",loc:"Mexico City",comp:"Friendly",res:"D"},
    {date:"Nov 18, 2025",opp:"Canada",score:"2-1",loc:"Toronto",comp:"Concacaf Nations League",res:"W"},
    {date:"Nov 14, 2025",opp:"United States",score:"2-2",loc:"Mexico City",comp:"Concacaf Nations League",res:"D"},
  ],
  "United States":[
    {date:"Mar 29, 2026",opp:"Belgium",score:"0-2",loc:"Brussels",comp:"Friendly",res:"L"},
    {date:"Mar 25, 2026",opp:"Germany",score:"1-2",loc:"Dusseldorf",comp:"Friendly",res:"L"},
    {date:"Nov 18, 2025",opp:"Jamaica",score:"3-0",loc:"Austin",comp:"Concacaf Nations League",res:"W"},
    {date:"Nov 14, 2025",opp:"Mexico",score:"2-2",loc:"Mexico City",comp:"Concacaf Nations League",res:"D"},
  ],
  "Morocco":[
    {date:"Mar 27, 2026",opp:"Senegal",score:"1-0",loc:"Casablanca",comp:"Friendly",res:"W"},
    {date:"Mar 23, 2026",opp:"Egypt",score:"2-1",loc:"Casablanca",comp:"Friendly",res:"W"},
    {date:"Nov 19, 2025",opp:"Gabon",score:"3-0",loc:"Rabat",comp:"AFCON Qualifier",res:"W"},
    {date:"Nov 15, 2025",opp:"Tanzania",score:"4-0",loc:"Dar es Salaam",comp:"AFCON Qualifier",res:"W"},
  ],
  "Uruguay":[
    {date:"Mar 29, 2026",opp:"England",score:"1-1",loc:"London",comp:"Friendly",res:"D"},
    {date:"Mar 24, 2026",opp:"Algeria",score:"1-1",loc:"Paris",comp:"Friendly",res:"D"},
    {date:"Nov 18, 2025",opp:"Brazil",score:"1-2",loc:"Montevideo",comp:"WC Qualifier (CONMEBOL)",res:"L"},
    {date:"Nov 14, 2025",opp:"Argentina",score:"0-1",loc:"Montevideo",comp:"WC Qualifier (CONMEBOL)",res:"L"},
  ],
  "Colombia":[
    {date:"Mar 29, 2026",opp:"France",score:"1-3",loc:"Paris",comp:"Friendly",res:"L"},
    {date:"Mar 25, 2026",opp:"Netherlands",score:"2-2",loc:"Amsterdam",comp:"Friendly",res:"D"},
    {date:"Nov 18, 2025",opp:"Ecuador",score:"2-0",loc:"Bogota",comp:"WC Qualifier (CONMEBOL)",res:"W"},
    {date:"Nov 14, 2025",opp:"Peru",score:"3-0",loc:"Barranquilla",comp:"WC Qualifier (CONMEBOL)",res:"W"},
  ],
  "Croatia":[
    {date:"Mar 28, 2026",opp:"Sweden",score:"2-0",loc:"Zagreb",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Denmark",score:"1-1",loc:"Copenhagen",comp:"Friendly",res:"D"},
    {date:"Nov 15, 2025",opp:"Montenegro",score:"2-3",loc:"Podgorica",comp:"WC Qualifier (UEFA Playoff)",res:"L"},
    {date:"Nov 11, 2025",opp:"Czechia",score:"5-1",loc:"Zagreb",comp:"WC Qualifier (UEFA Playoff)",res:"W"},
  ],
  "Japan":[
    {date:"Mar 31, 2026",opp:"England",score:"1-0",loc:"London, Wembley",comp:"Friendly",res:"W"},
    {date:"Mar 27, 2026",opp:"France",score:"0-2",loc:"Paris",comp:"Friendly",res:"L"},
    {date:"Nov 19, 2025",opp:"China",score:"3-1",loc:"Tokyo",comp:"WC Qualifier (AFC)",res:"W"},
    {date:"Nov 15, 2025",opp:"Indonesia",score:"4-0",loc:"Jakarta",comp:"WC Qualifier (AFC)",res:"W"},
  ],
  "Senegal":[
    {date:"Mar 27, 2026",opp:"Morocco",score:"0-1",loc:"Casablanca",comp:"Friendly",res:"L"},
    {date:"Mar 23, 2026",opp:"Ivory Coast",score:"1-1",loc:"Dakar",comp:"Friendly",res:"D"},
    {date:"Nov 14, 2025",opp:"Botswana",score:"3-0",loc:"Dakar",comp:"AFCON Qualifier",res:"W"},
    {date:"Nov 10, 2025",opp:"Mozambique",score:"2-0",loc:"Maputo",comp:"AFCON Qualifier",res:"W"},
  ],
  "Egypt":[
    {date:"Mar 27, 2026",opp:"Morocco",score:"1-2",loc:"Casablanca",comp:"Friendly",res:"L"},
    {date:"Mar 23, 2026",opp:"Nigeria",score:"2-1",loc:"Cairo",comp:"Friendly",res:"W"},
    {date:"Nov 15, 2025",opp:"Guinea",score:"2-0",loc:"Cairo",comp:"AFCON Qualifier",res:"W"},
    {date:"Nov 11, 2025",opp:"Djibouti",score:"5-0",loc:"Cairo",comp:"AFCON Qualifier",res:"W"},
  ],
  "Ecuador":[
    {date:"Mar 27, 2026",opp:"Peru",score:"2-0",loc:"Quito",comp:"Friendly",res:"W"},
    {date:"Mar 23, 2026",opp:"Bolivia",score:"3-1",loc:"Quito",comp:"Friendly",res:"W"},
    {date:"Nov 18, 2025",opp:"Chile",score:"1-0",loc:"Santiago",comp:"WC Qualifier (CONMEBOL)",res:"W"},
    {date:"Nov 14, 2025",opp:"Paraguay",score:"0-1",loc:"Asuncion",comp:"WC Qualifier (CONMEBOL)",res:"L"},
  ],
  "Austria":[
    {date:"Mar 28, 2026",opp:"Slovakia",score:"2-0",loc:"Vienna",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Serbia",score:"1-1",loc:"Belgrade",comp:"Friendly",res:"D"},
    {date:"Nov 15, 2025",opp:"Bosnia & Herz.",score:"1-1",loc:"Sarajevo",comp:"WC Qualifier (UEFA)",res:"D"},
    {date:"Nov 11, 2025",opp:"Romania",score:"2-0",loc:"Vienna",comp:"WC Qualifier (UEFA)",res:"W"},
  ],
  "Switzerland":[
    {date:"Mar 27, 2026",opp:"Poland",score:"3-0",loc:"Zurich",comp:"Friendly",res:"W"},
    {date:"Mar 23, 2026",opp:"Kosovo",score:"1-1",loc:"Pristina",comp:"WC Qualifier (UEFA Playoff)",res:"D"},
    {date:"Nov 16, 2025",opp:"Slovenia",score:"1-1",loc:"Ljubljana",comp:"WC Qualifier (UEFA)",res:"D"},
    {date:"Nov 11, 2025",opp:"Kosovo",score:"1-1",loc:"Zurich",comp:"WC Qualifier (UEFA)",res:"D"},
  ],
  "Sweden":[
    {date:"Mar 28, 2026",opp:"Croatia",score:"0-2",loc:"Zagreb",comp:"Friendly",res:"L"},
    {date:"Mar 24, 2026",opp:"Romania",score:"2-0",loc:"Stockholm",comp:"Friendly",res:"W"},
    {date:"Nov 16, 2025",opp:"Slovenia",score:"1-1",loc:"Malmo",comp:"WC Qualifier (UEFA Playoff)",res:"D"},
    {date:"Nov 11, 2025",opp:"Kosovo",score:"3-0",loc:"Gothenburg",comp:"WC Qualifier (UEFA Playoff)",res:"W"},
  ],
  "South Korea":[
    {date:"Mar 28, 2026",opp:"Iceland",score:"2-0",loc:"Seoul",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Costa Rica",score:"1-0",loc:"Seoul",comp:"Friendly",res:"W"},
    {date:"Nov 19, 2025",opp:"Kuwait",score:"3-1",loc:"Seoul",comp:"WC Qualifier (AFC)",res:"W"},
    {date:"Nov 15, 2025",opp:"Palestine",score:"2-0",loc:"Amman",comp:"WC Qualifier (AFC)",res:"W"},
  ],
  "Canada":[
    {date:"Mar 28, 2026",opp:"Jamaica",score:"3-0",loc:"Toronto",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Panama",score:"2-0",loc:"Vancouver",comp:"Friendly",res:"W"},
    {date:"Nov 18, 2025",opp:"Mexico",score:"1-2",loc:"Toronto",comp:"Concacaf Nations League",res:"L"},
    {date:"Nov 14, 2025",opp:"Cuba",score:"4-0",loc:"Toronto",comp:"Concacaf Nations League",res:"W"},
  ],
  "Iran":[
    {date:"Mar 27, 2026",opp:"Ukraine",score:"1-1",loc:"Tehran",comp:"Friendly",res:"D"},
    {date:"Mar 23, 2026",opp:"Oman",score:"2-0",loc:"Tehran",comp:"Friendly",res:"W"},
    {date:"Nov 19, 2025",opp:"Qatar",score:"3-0",loc:"Tehran",comp:"WC Qualifier (AFC)",res:"W"},
    {date:"Nov 15, 2025",opp:"Uzbekistan",score:"2-2",loc:"Tehran",comp:"WC Qualifier (AFC)",res:"D"},
  ],
  "Ivory Coast":[
    {date:"Mar 27, 2026",opp:"Senegal",score:"1-1",loc:"Dakar",comp:"Friendly",res:"D"},
    {date:"Mar 23, 2026",opp:"Guinea",score:"2-0",loc:"Abidjan",comp:"Friendly",res:"W"},
    {date:"Nov 15, 2025",opp:"Angola",score:"3-1",loc:"Abidjan",comp:"AFCON Qualifier",res:"W"},
    {date:"Nov 11, 2025",opp:"Gabon",score:"2-0",loc:"Libreville",comp:"AFCON Qualifier",res:"W"},
  ],
  "Ghana":[
    {date:"Mar 27, 2026",opp:"Zambia",score:"2-1",loc:"Accra",comp:"Friendly",res:"W"},
    {date:"Mar 23, 2026",opp:"Mali",score:"1-1",loc:"Bamako",comp:"Friendly",res:"D"},
    {date:"Nov 15, 2025",opp:"Madagascar",score:"3-0",loc:"Accra",comp:"AFCON Qualifier",res:"W"},
    {date:"Nov 11, 2025",opp:"Comoros",score:"2-0",loc:"Moroni",comp:"AFCON Qualifier",res:"W"},
  ],
  "DR Congo":[
    {date:"Mar 28, 2026",opp:"Cameroon",score:"1-0",loc:"Kinshasa",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Burundi",score:"3-1",loc:"Kinshasa",comp:"Friendly",res:"W"},
    {date:"Nov 15, 2025",opp:"Mauritania",score:"2-0",loc:"Kinshasa",comp:"AFCON Qualifier",res:"W"},
    {date:"Nov 11, 2025",opp:"Sudan",score:"1-1",loc:"Omdurman",comp:"AFCON Qualifier",res:"D"},
  ],
  "Algeria":[
    {date:"Mar 27, 2026",opp:"Tunisia",score:"0-1",loc:"Tunis",comp:"Friendly",res:"L"},
    {date:"Mar 24, 2026",opp:"Uruguay",score:"1-1",loc:"Paris",comp:"Friendly",res:"D"},
    {date:"Nov 15, 2025",opp:"Eq. Guinea",score:"3-0",loc:"Algiers",comp:"AFCON Qualifier",res:"W"},
    {date:"Nov 11, 2025",opp:"Sudan",score:"2-0",loc:"Algiers",comp:"AFCON Qualifier",res:"W"},
  ],
  "Turkiye":[
    {date:"Mar 28, 2026",opp:"Greece",score:"2-1",loc:"Istanbul",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Norway",score:"0-2",loc:"Oslo",comp:"Friendly",res:"L"},
    {date:"Nov 15, 2025",opp:"Georgia",score:"3-2",loc:"Istanbul",comp:"WC Qualifier (UEFA Playoff)",res:"W"},
    {date:"Nov 11, 2025",opp:"Spain",score:"2-2",loc:"Istanbul",comp:"WC Qualifier (UEFA)",res:"D"},
  ],
  "Paraguay":[
    {date:"Mar 29, 2026",opp:"Venezuela",score:"2-0",loc:"Asuncion",comp:"Friendly",res:"W"},
    {date:"Mar 25, 2026",opp:"Chile",score:"1-0",loc:"Santiago",comp:"Friendly",res:"W"},
    {date:"Nov 18, 2025",opp:"Ecuador",score:"1-0",loc:"Asuncion",comp:"WC Qualifier (CONMEBOL)",res:"W"},
    {date:"Nov 14, 2025",opp:"Venezuela",score:"2-1",loc:"Caracas",comp:"WC Qualifier (CONMEBOL)",res:"W"},
  ],
  "Australia":[
    {date:"Mar 28, 2026",opp:"South Korea",score:"1-2",loc:"Sydney",comp:"Friendly",res:"L"},
    {date:"Mar 24, 2026",opp:"Japan",score:"1-1",loc:"Melbourne",comp:"Friendly",res:"D"},
    {date:"Nov 19, 2025",opp:"Saudi Arabia",score:"2-0",loc:"Sydney",comp:"WC Qualifier (AFC)",res:"W"},
    {date:"Nov 15, 2025",opp:"Indonesia",score:"3-0",loc:"Sydney",comp:"WC Qualifier (AFC)",res:"W"},
  ],
  "Saudi Arabia":[
    {date:"Mar 28, 2026",opp:"Iraq",score:"2-1",loc:"Riyadh",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Jordan",score:"1-0",loc:"Amman",comp:"Friendly",res:"W"},
    {date:"Nov 19, 2025",opp:"Bahrain",score:"3-0",loc:"Riyadh",comp:"WC Qualifier (AFC)",res:"W"},
    {date:"Nov 15, 2025",opp:"Australia",score:"0-2",loc:"Sydney",comp:"WC Qualifier (AFC)",res:"L"},
  ],
  "Scotland":[
    {date:"Mar 28, 2026",opp:"Norway",score:"1-3",loc:"Oslo",comp:"Friendly",res:"L"},
    {date:"Mar 24, 2026",opp:"Finland",score:"2-1",loc:"Glasgow",comp:"Friendly",res:"W"},
    {date:"Nov 16, 2025",opp:"Denmark",score:"4-2",loc:"Copenhagen",comp:"WC Qualifier (UEFA Playoff)",res:"W"},
    {date:"Nov 11, 2025",opp:"Greece",score:"0-0",loc:"Athens",comp:"WC Qualifier (UEFA Playoff)",res:"D"},
  ],
  "Tunisia":[
    {date:"Mar 28, 2026",opp:"Germany",score:"1-1",loc:"Tunis",comp:"Friendly",res:"D"},
    {date:"Mar 24, 2026",opp:"Algeria",score:"0-1",loc:"Tunis",comp:"Friendly",res:"L"},
    {date:"Nov 15, 2025",opp:"Eq. Guinea",score:"2-0",loc:"Tunis",comp:"AFCON Qualifier",res:"W"},
    {date:"Nov 11, 2025",opp:"Malawi",score:"3-1",loc:"Blantyre",comp:"AFCON Qualifier",res:"W"},
  ],
  "Cape Verde":[
    {date:"Mar 28, 2026",opp:"Mauritania",score:"1-0",loc:"Praia",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Chile",score:"1-2",loc:"Santiago",comp:"Friendly",res:"L"},
    {date:"Nov 15, 2025",opp:"Cameroon",score:"1-1",loc:"Yaounde",comp:"AFCON Qualifier",res:"D"},
    {date:"Nov 11, 2025",opp:"Kenya",score:"2-0",loc:"Praia",comp:"AFCON Qualifier",res:"W"},
  ],
  "South Africa":[
    {date:"Mar 28, 2026",opp:"Nigeria",score:"1-1",loc:"Lagos",comp:"Friendly",res:"D"},
    {date:"Mar 24, 2026",opp:"Zambia",score:"2-0",loc:"Johannesburg",comp:"Friendly",res:"W"},
    {date:"Nov 15, 2025",opp:"Eswatini",score:"3-0",loc:"Johannesburg",comp:"AFCON Qualifier",res:"W"},
    {date:"Nov 11, 2025",opp:"Uganda",score:"1-0",loc:"Kampala",comp:"AFCON Qualifier",res:"W"},
  ],
  "Czechia":[
    {date:"Mar 28, 2026",opp:"Romania",score:"2-0",loc:"Prague",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Bulgaria",score:"3-1",loc:"Sofia",comp:"Friendly",res:"W"},
    {date:"Nov 15, 2025",opp:"Gibraltar",score:"6-0",loc:"Prague",comp:"WC Qualifier (UEFA)",res:"W"},
    {date:"Nov 11, 2025",opp:"Montenegro",score:"2-3",loc:"Podgorica",comp:"WC Qualifier (UEFA Playoff)",res:"L"},
  ],
  "Qatar":[
    {date:"Mar 28, 2026",opp:"Jordan",score:"2-0",loc:"Doha",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Bahrain",score:"1-0",loc:"Doha",comp:"Friendly",res:"W"},
    {date:"Nov 19, 2025",opp:"India",score:"3-0",loc:"Doha",comp:"WC Qualifier (AFC)",res:"W"},
    {date:"Nov 15, 2025",opp:"Afghanistan",score:"5-0",loc:"Doha",comp:"WC Qualifier (AFC)",res:"W"},
  ],
  "Bosnia & Herz.":[
    {date:"Mar 28, 2026",opp:"Greece",score:"1-1",loc:"Sarajevo",comp:"Friendly",res:"D"},
    {date:"Mar 24, 2026",opp:"Hungary",score:"2-1",loc:"Budapest",comp:"Friendly",res:"W"},
    {date:"Nov 14, 2025",opp:"Italy",score:"1-1",loc:"Sarajevo",comp:"WC Qualifier (UEFA Playoff)",res:"D"},
    {date:"Nov 11, 2025",opp:"Wales",score:"1-1 (4-2p)",loc:"Cardiff",comp:"WC Qualifier (UEFA Playoff)",res:"W"},
  ],
  "New Zealand":[
    {date:"Mar 28, 2026",opp:"Solomon Islands",score:"4-0",loc:"Auckland",comp:"OFC Nations Cup",res:"W"},
    {date:"Mar 24, 2026",opp:"Vanuatu",score:"3-0",loc:"Auckland",comp:"OFC Nations Cup",res:"W"},
    {date:"Nov 19, 2025",opp:"Tahiti",score:"5-1",loc:"Auckland",comp:"WC Qualifier (OFC)",res:"W"},
    {date:"Nov 15, 2025",opp:"Papua New Guinea",score:"3-1",loc:"Port Moresby",comp:"WC Qualifier (OFC)",res:"W"},
  ],
  "Jordan":[
    {date:"Mar 28, 2026",opp:"Saudi Arabia",score:"0-1",loc:"Amman",comp:"Friendly",res:"L"},
    {date:"Mar 24, 2026",opp:"Iraq",score:"1-1",loc:"Amman",comp:"Friendly",res:"D"},
    {date:"Nov 19, 2025",opp:"Kuwait",score:"2-0",loc:"Amman",comp:"WC Qualifier (AFC)",res:"W"},
    {date:"Nov 15, 2025",opp:"Afghanistan",score:"4-0",loc:"Amman",comp:"WC Qualifier (AFC)",res:"W"},
  ],
  "Iraq":[
    {date:"Mar 28, 2026",opp:"Jordan",score:"1-1",loc:"Amman",comp:"Friendly",res:"D"},
    {date:"Mar 24, 2026",opp:"Saudi Arabia",score:"1-2",loc:"Riyadh",comp:"Friendly",res:"L"},
    {date:"Nov 19, 2025",opp:"Yemen",score:"3-0",loc:"Baghdad",comp:"WC Qualifier (AFC)",res:"W"},
    {date:"Nov 15, 2025",opp:"Kyrgyzstan",score:"2-0",loc:"Baghdad",comp:"WC Qualifier (AFC)",res:"W"},
  ],
  "Panama":[
    {date:"Mar 28, 2026",opp:"Venezuela",score:"1-0",loc:"Panama City",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Canada",score:"0-2",loc:"Vancouver",comp:"Friendly",res:"L"},
    {date:"Nov 18, 2025",opp:"Honduras",score:"2-0",loc:"Panama City",comp:"Concacaf Nations League",res:"W"},
    {date:"Nov 14, 2025",opp:"Trinidad",score:"3-1",loc:"Panama City",comp:"Concacaf Nations League",res:"W"},
  ],
  "Haiti":[
    {date:"Mar 28, 2026",opp:"Trinidad & Tobago",score:"2-1",loc:"Port-au-Prince",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Cuba",score:"1-0",loc:"Port-au-Prince",comp:"Friendly",res:"W"},
    {date:"Nov 18, 2025",opp:"Honduras",score:"0-1",loc:"Tegucigalpa",comp:"Concacaf Nations League",res:"L"},
    {date:"Nov 14, 2025",opp:"Guatemala",score:"2-2",loc:"Guatemala City",comp:"Concacaf Nations League",res:"D"},
  ],
  "Curacao":[
    {date:"Mar 28, 2026",opp:"Suriname",score:"2-0",loc:"Willemstad",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Barbados",score:"3-0",loc:"Willemstad",comp:"Friendly",res:"W"},
    {date:"Nov 18, 2025",opp:"Belize",score:"4-1",loc:"Willemstad",comp:"Concacaf Nations League",res:"W"},
    {date:"Nov 14, 2025",opp:"Suriname",score:"1-0",loc:"Willemstad",comp:"Concacaf Nations League",res:"W"},
  ],
  "Uzbekistan":[
    {date:"Mar 28, 2026",opp:"Tajikistan",score:"2-0",loc:"Tashkent",comp:"Friendly",res:"W"},
    {date:"Mar 24, 2026",opp:"Kazakhstan",score:"1-0",loc:"Tashkent",comp:"Friendly",res:"W"},
    {date:"Nov 19, 2025",opp:"UAE",score:"2-1",loc:"Tashkent",comp:"WC Qualifier (AFC)",res:"W"},
    {date:"Nov 15, 2025",opp:"Iran",score:"2-2",loc:"Tehran",comp:"WC Qualifier (AFC)",res:"D"},
  ],
};

// ── LIVE SCORES ──────────────────────────────────────────────────────────
const RAPIDAPI_KEY = "79e084bb92mshe49889427f83390p16a3c7jsn793e5bc48bb0";
const WC2026_LEAGUE_ID = 1; // FIFA World Cup 2026 on API-Football

async function fetchLiveScores() {
  try {
    // Fetch live/today fixtures for WC 2026
    const res = await fetch(
      "https://api-football-v1.p.rapidapi.com/v3/fixtures?league=" + WC2026_LEAGUE_ID + "&season=2026&live=all",
      { headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com" } }
    );
    const data = await res.json();
    return data.response || [];
  } catch(e) {
    return [];
  }
}

async function fetchTodayFixtures() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(
      "https://api-football-v1.p.rapidapi.com/v3/fixtures?league=" + WC2026_LEAGUE_ID + "&season=2026&date=" + today,
      { headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com" } }
    );
    const data = await res.json();
    return data.response || [];
  } catch(e) {
    return [];
  }
}

async function fetchFixturesByDate(dateStr) {
  // dateStr = "YYYY-MM-DD"
  try {
    const res = await fetch(
      "https://api-football-v1.p.rapidapi.com/v3/fixtures?league=" + WC2026_LEAGUE_ID + "&season=2026&date=" + dateStr,
      { headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com" } }
    );
    const data = await res.json();
    return data.response || [];
  } catch(e) {
    return [];
  }
}

// Map API fixture to a score object: { home, away, homeGoals, awayGoals, status, elapsed }
function parseFixture(f) {
  return {
    apiId: f.fixture.id,
    home: f.teams.home.name,
    away: f.teams.away.name,
    homeGoals: f.goals.home,
    awayGoals: f.goals.away,
    status: f.fixture.status.short, // NS, 1H, HT, 2H, FT, AET, PEN etc.
    elapsed: f.fixture.status.elapsed,
    date: f.fixture.date,
  };
}

// ── LIVE SCORES TAB ───────────────────────────────────────────────────────
function LiveTab() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [apiKey, setApiKey] = useState(RAPIDAPI_KEY);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      // Try live first, then fallback to today
      let data = await fetchLiveScores();
      if (data.length === 0) data = await fetchTodayFixtures();
      setFixtures(data.map(parseFixture));
      setLastUpdate(new Date().toLocaleTimeString());
    } catch(e) {
      setError("Could not fetch scores. Check your API key or connection.");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  const statusLabel = (s, elapsed) => {
    if (s === "NS") return "Not Started";
    if (s === "1H") return `LIVE ${elapsed}'`;
    if (s === "HT") return "Half Time";
    if (s === "2H") return `LIVE ${elapsed}'`;
    if (s === "ET") return `Extra Time ${elapsed}'`;
    if (s === "BT") return "Break Time";
    if (s === "P")  return "Penalties";
    if (s === "FT") return "Full Time";
    if (s === "AET") return "After ET";
    if (s === "PEN") return "After Pens";
    if (s === "SUSP") return "Suspended";
    if (s === "PST") return "Postponed";
    return s;
  };

  const isLive = s => ["1H","HT","2H","ET","BT","P"].includes(s);
  const isFinished = s => ["FT","AET","PEN"].includes(s);

  return <div>
    {/* Header */}
    <div style={{background:`linear-gradient(135deg,#0a1f10,#0c2815)`,border:`1px solid ${C.b2}`,borderRadius:12,padding:14,marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div>
          <div style={{fontWeight:700,fontSize:18,color:C.green}}>LIVE SCORES</div>
          <div style={{fontSize:11,color:C.dim}}>FIFA World Cup 2026 · API-Football</div>
        </div>
        <button onClick={load} disabled={loading} style={{padding:"7px 14px",borderRadius:20,border:`1px solid ${C.greenS}`,background:`${C.green}22`,color:C.green,fontWeight:700,fontSize:13,cursor:"pointer",opacity:loading?0.5:1}}>
          {loading ? "..." : "↻ Refresh"}
        </button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.mid}}>
          <div onClick={()=>setAutoRefresh(a=>!a)} style={{width:36,height:20,borderRadius:10,background:autoRefresh?C.green:C.b2,cursor:"pointer",position:"relative",transition:"background .2s"}}>
            <div style={{position:"absolute",top:2,left:autoRefresh?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
          </div>
          Auto-refresh every 60s
        </div>
        {lastUpdate && <span style={{fontSize:11,color:C.dim,marginLeft:"auto"}}>Updated {lastUpdate}</span>}
      </div>
    </div>

    {error && <div style={{padding:14,background:`${C.red}18`,border:`1px solid ${C.red}44`,borderRadius:10,color:C.red,fontSize:13,marginBottom:12}}>{error}</div>}

    {!loading && fixtures.length === 0 && !error && (
      <div style={{textAlign:"center",padding:"48px 20px"}}>
        <div style={{fontSize:"2.5rem",marginBottom:10}}>⚽</div>
        <div style={{fontWeight:700,fontSize:16,color:C.mid,marginBottom:6}}>No matches today</div>
        <div style={{fontSize:13,color:C.dim}}>Live scores will appear here on match days.</div>
        <div style={{fontSize:12,color:C.dim,marginTop:12}}>Tournament starts Jun 11, 2026</div>
      </div>
    )}

    {loading && (
      <div style={{textAlign:"center",padding:"40px 0"}}>
        <div style={{width:32,height:32,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/>
        <div style={{fontSize:13,color:C.mid}}>Fetching scores...</div>
      </div>
    )}

    {!loading && fixtures.map((f,i) => {
      const live = isLive(f.status);
      const finished = isFinished(f.status);
      const scoreColor = live ? C.green : finished ? C.text : C.dim;
      return <Card key={i} style={{marginBottom:8,border:`1px solid ${live ? C.greenS : C.b1}`}}>
        <div style={{padding:"12px 14px"}}>
          {/* Status bar */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:11,fontWeight:700,color:live?C.green:finished?C.mid:C.dim,background:live?`${C.green}18`:"transparent",padding:live?"2px 8px":"0",borderRadius:10}}>
              {live && <span style={{marginRight:4}}>🔴</span>}{statusLabel(f.status, f.elapsed)}
            </span>
            <span style={{fontSize:10,color:C.dim}}>{new Date(f.date).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
          </div>
          {/* Teams & Score */}
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Crest team={f.home} size={28}/>
            <span style={{fontWeight:700,color:C.text,flex:1,fontSize:15}}>{f.home}</span>
            <div style={{textAlign:"center",minWidth:60}}>
              {(f.homeGoals !== null && f.awayGoals !== null)
                ? <span style={{fontWeight:900,fontSize:22,color:scoreColor,fontFamily:"monospace"}}>{f.homeGoals} – {f.awayGoals}</span>
                : <span style={{fontSize:14,color:C.dim,fontWeight:700}}>vs</span>
              }
            </div>
            <span style={{fontWeight:700,color:C.text,flex:1,textAlign:"right",fontSize:15}}>{f.away}</span>
            <Crest team={f.away} size={28}/>
          </div>
        </div>
      </Card>;
    })}

    <div style={{fontSize:11,color:C.dim,textAlign:"center",marginTop:12,lineHeight:1.6}}>
      Powered by API-Football · Free tier: 100 requests/day
    </div>
  </div>;
}

const PREDS = [
  {team:"France",flag:"🇫🇷",poly:18.3,odds:"+451",trend:"📈"},
  {team:"Spain",flag:"🇪🇸",poly:16.7,odds:"+501",trend:"📉"},
  {team:"England",flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",poly:11.3,odds:"+781",trend:"➡️"},
  {team:"Brazil",flag:"🇧🇷",poly:9.0,odds:"+1010",trend:"📈"},
  {team:"Argentina",flag:"🇦🇷",poly:8.3,odds:"+1100",trend:"➡️"},
  {team:"Germany",flag:"🇩🇪",poly:7.1,odds:"+1300",trend:"📈"},
  {team:"Portugal",flag:"🇵🇹",poly:5.4,odds:"+1750",trend:"➡️"},
  {team:"Netherlands",flag:"🇳🇱",poly:4.8,odds:"+1950",trend:"📉"},
  {team:"Belgium",flag:"🇧🇪",poly:3.2,odds:"+3000",trend:"📉"},
  {team:"United States",flag:"🇺🇸",poly:2.8,odds:"+3400",trend:"📈"},
  {team:"Mexico",flag:"🇲🇽",poly:2.1,odds:"+4500",trend:"📈"},
  {team:"Norway",flag:"🇳🇴",poly:1.0,odds:"+9000",trend:"📈"},
  {team:"Others",flag:"🌍",poly:10.0,odds:"—",trend:""},
];

const STR = {Spain:87,France:86,England:83,Brazil:82,Argentina:81,Germany:79,Portugal:77,Netherlands:76,Belgium:73,Uruguay:71,Colombia:70,Mexico:69,Morocco:68,"United States":67,Croatia:66,Japan:65,Senegal:64,Switzerland:63,Sweden:62,"South Korea":61,Ecuador:60,Norway:59,Australia:57,Austria:56,Czechia:55,"Bosnia & Herz.":54,"Ivory Coast":53,Paraguay:52,Ghana:51,Algeria:50,Iran:48,"DR Congo":46,Uzbekistan:41,"New Zealand":40,Jordan:39,Iraq:38,Panama:38,Curacao:37,Haiti:36,"South Africa":43,"Cape Verde":42,Qatar:44,Tunisia:50,Turkiye:60,Egypt:66,Scotland:58,"Saudi Arabia":49,"Cape Verde":42};
const gs = t => STR[t] || 48;

// Simulator
function simMatch(h, a) {
  const hs = gs(h) + 3, as = gs(a), t = hs + as, r = Math.random();
  const res = r < hs/t*0.65 ? "home" : r < hs/t*0.65+0.22 ? "draw" : "away";
  const hg = res==="home" ? Math.floor(Math.random()*3)+1 : res==="draw" ? Math.floor(Math.random()*2)+1 : Math.floor(Math.random()*2);
  const ag = res==="away" ? Math.floor(Math.random()*3)+1 : res==="draw" ? hg : Math.floor(Math.random()*2);
  return { hg, ag, res };
}

function calcStandings(letter, results) {
  const teams = GROUPS[letter].teams;
  const tbl = Object.fromEntries(teams.map(t => [t, {team:t,p:0,w:0,d:0,l:0,gf:0,ga:0,gd:0,pts:0}]));
  results.forEach(r => {
    if (r.hg==="" || r.ag==="") return;
    const hg = parseInt(r.hg), ag = parseInt(r.ag);
    if (isNaN(hg)||isNaN(ag)) return;
    tbl[r.home].p++; tbl[r.away].p++;
    tbl[r.home].gf+=hg; tbl[r.home].ga+=ag; tbl[r.home].gd+=hg-ag;
    tbl[r.away].gf+=ag; tbl[r.away].ga+=hg; tbl[r.away].gd+=ag-hg;
    if(hg>ag){tbl[r.home].w++;tbl[r.home].pts+=3;tbl[r.away].l++;}
    else if(hg===ag){tbl[r.home].d++;tbl[r.home].pts++;tbl[r.away].d++;tbl[r.away].pts++;}
    else{tbl[r.away].w++;tbl[r.away].pts+=3;tbl[r.home].l++;}
  });
  return [...teams].sort((a,b)=>tbl[b].pts-tbl[a].pts||tbl[b].gd-tbl[a].gd||tbl[b].gf-tbl[a].gf).map((t,i)=>({...tbl[t],pos:i+1}));
}

function runSim() {
  const gr = {};
  Object.entries(GROUPS).forEach(([g, grp]) => {
    const t = grp.teams, pts={}, gd={}, gf={};
    t.forEach(x=>{pts[x]=0;gd[x]=0;gf[x]=0;});
    [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]].forEach(([i,j])=>{
      const r = simMatch(t[i],t[j]);
      gf[t[i]]+=r.hg;gf[t[j]]+=r.ag;gd[t[i]]+=r.hg-r.ag;gd[t[j]]+=r.ag-r.hg;
      if(r.res==="home")pts[t[i]]+=3;else if(r.res==="draw"){pts[t[i]]++;pts[t[j]]++;}else pts[t[j]]+=3;
    });
    gr[g] = [...t].sort((a,b)=>pts[b]-pts[a]||gd[b]-gd[a]||gf[b]-gf[a]).map(x=>({team:x,pts:pts[x],gd:gd[x]}));
  });
  let r32 = [...Object.values(gr).flatMap(s=>[s[0].team,s[1].team])];
  r32 = [...r32,...Object.values(gr).map(s=>s[2]).sort((a,b)=>b.pts-a.pts||b.gd-a.gd).slice(0,8).map(x=>x.team)];
  const ko = arr => { const n=[]; for(let i=0;i<arr.length;i+=2){const r=simMatch(arr[i],arr[i+1]);n.push(r.res==="draw"?Math.random()<gs(arr[i])/(gs(arr[i])+gs(arr[i+1]))?arr[i]:arr[i+1]:r.res==="home"?arr[i]:arr[i+1]);} return n; };
  const r16=ko(r32),qf=ko(r16),sf=ko(qf),champ=ko([sf[0],sf[1]])[0];
  return {gr,r16,qf,sf,champion:champ,runnerUp:sf.find(x=>x!==champ)};
}

// Team crest from Wikipedia
const _cc = {};
function Crest({ team, size=26 }) {
  const slugs = {"Mexico":"Mexico_national_football_team","South Africa":"South_Africa_national_football_team","South Korea":"South_Korea_national_football_team","Czechia":"Czech_Republic_national_football_team","Canada":"Canada_national_soccer_team","Bosnia & Herz.":"Bosnia_and_Herzegovina_national_football_team","Qatar":"Qatar_national_football_team","Switzerland":"Switzerland_national_football_team","Brazil":"Brazil_national_football_team","Morocco":"Morocco_national_football_team","Haiti":"Haiti_national_football_team","Scotland":"Scotland_national_football_team","United States":"United_States_men%27s_national_soccer_team","Paraguay":"Paraguay_national_football_team","Australia":"Australia_national_football_team","Turkiye":"Turkey_national_football_team","Germany":"Germany_national_football_team","Curacao":"Curacao_national_football_team","Ivory Coast":"Ivory_Coast_national_football_team","Ecuador":"Ecuador_national_football_team","Netherlands":"Netherlands_national_football_team","Japan":"Japan_national_football_team","Sweden":"Sweden_national_football_team","Tunisia":"Tunisia_national_football_team","Belgium":"Belgium_national_football_team","Egypt":"Egypt_national_football_team","Iran":"Iran_national_football_team","New Zealand":"New_Zealand_national_football_team","Spain":"Spain_national_football_team","Cape Verde":"Cape_Verde_national_football_team","Saudi Arabia":"Saudi_Arabia_national_football_team","Uruguay":"Uruguay_national_football_team","France":"France_national_football_team","Senegal":"Senegal_national_football_team","Iraq":"Iraq_national_football_team","Norway":"Norway_national_football_team","Argentina":"Argentina_national_football_team","Algeria":"Algeria_national_football_team","Austria":"Austria_national_football_team","Jordan":"Jordan_national_football_team","Portugal":"Portugal_national_football_team","DR Congo":"DR_Congo_national_football_team","Uzbekistan":"Uzbekistan_national_football_team","Colombia":"Colombia_national_football_team","England":"England_national_football_team","Croatia":"Croatia_national_football_team","Ghana":"Ghana_national_football_team","Panama":"Panama_national_football_team"};
  const [url, setUrl] = useState(_cc[team]||null);
  const [err, setErr] = useState(false);
  useEffect(()=>{
    if(url||err||!slugs[team])return;
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slugs[team]}`)
      .then(r=>r.json()).then(d=>{const s=d?.thumbnail?.source;if(s){_cc[team]=s;setUrl(s);}else setErr(true);}).catch(()=>setErr(true));
  },[team]);
  if(!url||err) return <span style={{fontSize:size*0.7,lineHeight:1}}>{getFlag(team)}</span>;
  return <img src={url} alt={team} width={size} height={size} style={{objectFit:"contain",flexShrink:0,borderRadius:2}} onError={()=>setErr(true)}/>;
}

// UI primitives
const Card = ({children,style={}}) => <div style={{background:`linear-gradient(135deg,${C.s1},${C.s2})`,border:`1px solid ${C.b1}`,borderRadius:12,overflow:"hidden",...style}}>{children}</div>;
const Badge = ({children,color=C.green}) => <span style={{display:"inline-flex",padding:"2px 8px",borderRadius:20,background:`${color}18`,color,fontSize:11,fontWeight:600,textTransform:"uppercase"}}>{children}</span>;
const Pill = ({children,active,onClick,color=C.green}) => <button onClick={onClick} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${active?color:C.b1}`,background:active?`${color}18`:"transparent",color:active?color:C.mid,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{children}</button>;
const RC = ({v,sz=40}) => { const col=v>=8.5?C.green:v>=7.5?C.gold:v>=6.5?"#fb923c":C.red; return <div style={{width:sz,height:sz,borderRadius:"50%",background:`${col}22`,border:`2px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:sz*0.33,fontWeight:700,color:col,flexShrink:0}}>{v.toFixed(1)}</div>; };

const Modal = ({open,onClose,title,children}) => {
  if(!open) return null;
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.s1,border:`1px solid ${C.b2}`,borderRadius:"18px 18px 0 0",width:"100%",maxWidth:620,maxHeight:"90vh",overflowY:"auto",paddingBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px 12px",borderBottom:`1px solid ${C.b1}`,position:"sticky",top:0,background:C.s1}}>
        <span style={{fontSize:17,fontWeight:700,color:C.green}}>{title}</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:C.mid,fontSize:22,cursor:"pointer"}}>×</button>
      </div>
      <div style={{padding:18}}>{children}</div>
    </div>
  </div>;
};

const Toast = ({msg,onDone}) => {
  useEffect(()=>{if(msg){const t=setTimeout(onDone,3000);return()=>clearTimeout(t);}},[msg]);
  if(!msg) return null;
  return <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:C.green,color:"#030a05",padding:"10px 20px",borderRadius:24,fontWeight:700,fontSize:13,zIndex:2000}}>{msg}</div>;
};

const RO = [{l:"15 min before",v:15},{l:"30 min before",v:30},{l:"1 hour before",v:60},{l:"2 hours before",v:120},{l:"1 day before",v:1440}];

function generateICS(saved) {
  const pad = n => String(n).padStart(2,"0");
  const toICSDate = isoStr => {
    // isoStr like "2026-06-11T19:00:00Z"
    const d = new Date(isoStr);
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  };
  // Map match id to ISO time
  const isoMap = {
    1:"2026-06-11T19:00:00Z", 2:"2026-06-12T02:00:00Z",
    3:"2026-06-12T19:00:00Z", 4:"2026-06-13T01:00:00Z",
    5:"2026-06-13T22:00:00Z", 6:"2026-06-13T22:00:00Z", 7:"2026-06-14T01:00:00Z",
    8:"2026-06-14T16:00:00Z", 9:"2026-06-14T17:00:00Z", 10:"2026-06-14T20:00:00Z",
    11:"2026-06-14T23:00:00Z", 12:"2026-06-15T02:00:00Z",
    13:"2026-06-15T16:00:00Z", 14:"2026-06-15T19:00:00Z", 15:"2026-06-15T22:00:00Z", 16:"2026-06-16T01:00:00Z",
    17:"2026-06-16T19:00:00Z", 18:"2026-06-16T22:00:00Z", 19:"2026-06-17T01:00:00Z",
    20:"2026-06-17T04:00:00Z", 21:"2026-06-17T17:00:00Z", 22:"2026-06-17T20:00:00Z",
    23:"2026-06-17T23:00:00Z", 24:"2026-06-18T02:00:00Z",
    25:"2026-06-18T16:00:00Z", 26:"2026-06-18T19:00:00Z", 27:"2026-06-18T22:00:00Z", 28:"2026-06-19T01:00:00Z",
    29:"2026-06-19T19:00:00Z", 30:"2026-06-19T22:00:00Z", 31:"2026-06-20T00:30:00Z", 32:"2026-06-20T03:00:00Z",
    33:"2026-06-20T17:00:00Z", 34:"2026-06-20T20:00:00Z", 35:"2026-06-21T00:00:00Z",
    36:"2026-06-21T04:00:00Z", 37:"2026-06-21T16:00:00Z", 38:"2026-06-21T19:00:00Z",
    39:"2026-06-21T22:00:00Z", 40:"2026-06-22T01:00:00Z",
    41:"2026-06-22T17:00:00Z", 42:"2026-06-22T21:00:00Z", 43:"2026-06-23T00:00:00Z", 44:"2026-06-23T03:00:00Z",
    45:"2026-06-23T17:00:00Z", 46:"2026-06-23T20:00:00Z", 47:"2026-06-23T23:00:00Z", 48:"2026-06-24T02:00:00Z",
    49:"2026-06-24T19:00:00Z", 50:"2026-06-24T19:00:00Z", 51:"2026-06-24T22:00:00Z", 52:"2026-06-24T22:00:00Z",
    53:"2026-06-25T01:00:00Z", 54:"2026-06-25T01:00:00Z",
    55:"2026-06-25T20:00:00Z", 56:"2026-06-25T20:00:00Z", 57:"2026-06-25T23:00:00Z", 58:"2026-06-25T23:00:00Z",
    59:"2026-06-26T02:00:00Z", 60:"2026-06-26T02:00:00Z",
    61:"2026-06-26T19:00:00Z", 62:"2026-06-26T19:00:00Z", 63:"2026-06-27T00:00:00Z", 64:"2026-06-27T00:00:00Z",
    65:"2026-06-27T03:00:00Z", 66:"2026-06-27T03:00:00Z",
    67:"2026-06-27T21:00:00Z", 68:"2026-06-27T21:00:00Z", 69:"2026-06-27T23:30:00Z", 70:"2026-06-27T23:30:00Z",
    71:"2026-06-28T02:00:00Z", 72:"2026-06-28T02:00:00Z",
  };

  const now = toICSDate(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FIFA World Cup 2026//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:FIFA World Cup 2026",
    "X-WR-TIMEZONE:UTC",
  ];

  saved.forEach(item => {
    const m = item.match;
    const startISO = isoMap[m.id] || "2026-06-11T19:00:00Z";
    const startDT = toICSDate(startISO);
    // End = start + 2 hours
    const endD = new Date(startISO);
    endD.setHours(endD.getUTCHours()+2);
    const endDT = toICSDate(endD.toISOString());
    const uid = `wc2026-match-${m.id}@worldcup2026app`;
    const summary = `⚽ ${m.home} vs ${m.away} - FIFA World Cup 2026`;
    const desc = `Group ${m.group} · ${m.date} · ${m.time}\nVenue: ${m.venue}\n\nFIFA World Cup 2026`;
    const busyStr = item.avail === "free" ? "TRANSPARENT" : "OPAQUE";

    // Add alarm if reminder saved
    const alarmMins = item.type==="rem" ? item.mins : null;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${startDT}`);
    lines.push(`DTEND:${endDT}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${desc}`);
    lines.push(`LOCATION:${m.venue}`);
    lines.push(`TRANSP:${busyStr}`);
    lines.push("STATUS:CONFIRMED");
    if (alarmMins) {
      lines.push("BEGIN:VALARM");
      lines.push("ACTION:DISPLAY");
      lines.push(`DESCRIPTION:Reminder: ${m.home} vs ${m.away}`);
      lines.push(`TRIGGER:-PT${alarmMins}M`);
      lines.push("END:VALARM");
    }
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadICS(saved) {
  const ics = generateICS(saved);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  if (isIOS) {
    // iOS: open in new tab so Safari intercepts as calendar import
    const win = window.open();
    if (win) {
      win.document.open("text/calendar");
      win.document.write(ics);
      win.document.close();
    } else {
      // Popup blocked — fallback: show the raw ICS text for user to copy
      alert("Popup blocked. Please allow popups for this site, then try again.");
    }
  } else {
    // Desktop / Android: standard blob download
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "WorldCup2026_Matches.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

function AddModal({match,open,onClose,onCal,onRem}) {
  const [tab,setTab] = useState("cal");
  const [avail,setAvail] = useState("busy");
  const [mins,setMins] = useState(60);
  const [ch,setCh] = useState("email");
  const [contact,setContact] = useState("");
  if(!match) return null;
  return <Modal open={open} onClose={onClose} title={`${match.home} vs ${match.away}`}>
    <div style={{display:"flex",gap:8,marginBottom:16}}>
      <Pill active={tab==="cal"} onClick={()=>setTab("cal")}>📅 Calendar</Pill>
      <Pill active={tab==="rem"} onClick={()=>setTab("rem")} color={C.gold}>🔔 Reminder</Pill>
    </div>
    {tab==="cal" && <div>
      <div style={{background:C.s2,borderRadius:10,padding:14,marginBottom:14}}>
        <div style={{fontWeight:700,color:C.text,marginBottom:3}}>{getFlag(match.home)} {match.home} vs {match.away} {getFlag(match.away)}</div>
        <div style={{fontSize:12,color:C.dim}}>{match.date} · {match.time} · {match.venue}</div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,color:C.mid,marginBottom:8,fontWeight:600}}>Show as</div>
        <div style={{display:"flex",gap:8}}>
          {["busy","free"].map(o=><button key={o} onClick={()=>setAvail(o)} style={{flex:1,padding:"10px 0",borderRadius:10,cursor:"pointer",border:`1px solid ${avail===o?C.green:C.b1}`,background:avail===o?`${C.green}22`:C.s2,color:avail===o?C.green:C.mid,fontSize:13,fontWeight:600}}>{o==="busy"?"🔴 Busy":"🟢 Free"}</button>)}
        </div>
      </div>
      <button onClick={()=>{onCal(match,avail);onClose();}} style={{width:"100%",padding:"12px 0",borderRadius:12,cursor:"pointer",background:`linear-gradient(135deg,${C.green},#22c55e)`,border:"none",color:"#030a05",fontWeight:700,fontSize:15}}>Add to Calendar</button>
    </div>}
    {tab==="rem" && <div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,color:C.mid,marginBottom:8,fontWeight:600}}>Via</div>
        <div style={{display:"flex",gap:8}}>
          {[["email","✉️ Email"],["sms","📱 SMS"],["whatsapp","💬 WhatsApp"]].map(([v,l])=><button key={v} onClick={()=>setCh(v)} style={{flex:1,padding:"9px 4px",borderRadius:10,cursor:"pointer",border:`1px solid ${ch===v?C.gold:C.b1}`,background:ch===v?`${C.gold}22`:C.s2,color:ch===v?C.gold:C.mid,fontSize:12,fontWeight:600}}>{l}</button>)}
        </div>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:12,color:C.mid,marginBottom:6,fontWeight:600}}>{ch==="email"?"Email":"Phone number"}</div>
        <input value={contact} onChange={e=>setContact(e.target.value)} placeholder={ch==="email"?"you@example.com":"+1 555 0000"} style={{width:"100%",padding:"10px 14px",background:C.s2,border:`1px solid ${C.b2}`,borderRadius:10,color:C.text,fontSize:14,outline:"none"}}/>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:12,color:C.mid,marginBottom:6,fontWeight:600}}>How far in advance</div>
        <select value={mins} onChange={e=>setMins(Number(e.target.value))} style={{width:"100%",padding:"10px 14px",background:C.s1,border:`1px solid ${C.b2}`,borderRadius:10,color:C.text,fontSize:14,outline:"none"}}>
          {RO.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </div>
      <button onClick={()=>{onRem(match,ch,mins,contact);onClose();}} style={{width:"100%",padding:"12px 0",borderRadius:12,cursor:"pointer",background:`linear-gradient(135deg,${C.gold},#f59e0b)`,border:"none",color:"#030a05",fontWeight:700,fontSize:15}}>Set Reminder</button>
    </div>}
  </Modal>;
}

// ── SCHEDULE
function SchedTab({onAction}) {
  const [filterMode, setFilterMode] = useState("group"); // group | team | venue
  const [groupF, setGroupF] = useState("All");
  const [teamF, setTeamF] = useState("");
  const [venueF, setVenueF] = useState("");

  const allTeams = [...new Set(MATCHES.flatMap(m=>[m.home,m.away]))].sort();
  const allVenues = [...new Set(MATCHES.map(m=>m.venue))].sort();

  const shown = MATCHES.filter(m => {
    if (filterMode==="group") {
      if (groupF==="All") return true;
      if (groupF==="Knockout") return !m.group;
      return m.group===groupF;
    }
    if (filterMode==="team") return !teamF || m.home===teamF || m.away===teamF;
    if (filterMode==="venue") return !venueF || m.venue===venueF;
    return true;
  });
  const byDate = shown.reduce((a,m)=>{(a[m.date]=a[m.date]||[]).push(m);return a;},{});

  const selStyle = (active) => ({
    padding:"5px 12px", borderRadius:20, border:`1px solid ${active?C.green:C.b1}`,
    background:active?`${C.green}18`:"transparent", color:active?C.green:C.mid,
    fontSize:12, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap"
  });

  return <div>
    {/* Filter mode tabs */}
    <div style={{display:"flex",gap:8,marginBottom:12}}>
      <button style={selStyle(filterMode==="group")} onClick={()=>setFilterMode("group")}>🗂 Group</button>
      <button style={selStyle(filterMode==="team")} onClick={()=>setFilterMode("team")}>👥 Team</button>
      <button style={selStyle(filterMode==="venue")} onClick={()=>setFilterMode("venue")}>📍 Venue</button>
    </div>

    {/* Group filter */}
    {filterMode==="group" && (
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:14,scrollbarWidth:"none"}}>
        {["All","A","B","C","D","E","F","G","H","I","J","K","L","Knockout"].map(g=>(
          <Pill key={g} active={groupF===g} onClick={()=>setGroupF(g)} color={g==="Knockout"?C.gold:C.green}>
            {g==="All"?"All Groups":g==="Knockout"?"🏆 KO":g}
          </Pill>
        ))}
      </div>
    )}

    {/* Team filter */}
    {filterMode==="team" && (
      <div style={{marginBottom:14}}>
        <select value={teamF} onChange={e=>setTeamF(e.target.value)} style={{width:"100%",padding:"10px 14px",background:C.s1,border:`1px solid ${C.b2}`,borderRadius:10,color:C.text,fontSize:14,outline:"none"}}>
          <option value="">All teams</option>
          {allTeams.map(t=><option key={t} value={t}>{getFlag(t)} {t}</option>)}
        </select>
        {teamF && (
          <div style={{display:"flex",alignItems:"center",gap:10,marginTop:10,padding:"10px 14px",background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`}}>
            <Crest team={teamF} size={32}/>
            <div>
              <div style={{fontWeight:700,color:C.text,fontSize:15}}>{teamF}</div>
              <div style={{fontSize:11,color:C.dim}}>{shown.length} match{shown.length!==1?"es":""} in group stage</div>
            </div>
          </div>
        )}
      </div>
    )}

    {/* Venue filter */}
    {filterMode==="venue" && (
      <div style={{marginBottom:14}}>
        <select value={venueF} onChange={e=>setVenueF(e.target.value)} style={{width:"100%",padding:"10px 14px",background:C.s1,border:`1px solid ${C.b2}`,borderRadius:10,color:C.text,fontSize:14,outline:"none"}}>
          <option value="">All venues</option>
          {allVenues.map(v=><option key={v} value={v}>{v}</option>)}
        </select>
        {venueF && (
          <div style={{marginTop:10,padding:"10px 14px",background:C.s2,borderRadius:10,border:`1px solid ${C.b1}`}}>
            <div style={{fontWeight:700,color:C.text,fontSize:13}}>📍 {venueF}</div>
            <div style={{fontSize:11,color:C.dim,marginTop:3}}>{shown.length} match{shown.length!==1?"es":""} at this venue</div>
          </div>
        )}
      </div>
    )}

    {/* Match count */}
    {shown.length===0 ? (
      <div style={{textAlign:"center",padding:"32px 20px",color:C.dim,fontSize:13}}>No matches found for this filter</div>
    ) : (
      Object.entries(byDate).map(([date,ms])=><div key={date} style={{marginBottom:18}}>
        <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{date}</div>
        {ms.map(m=><Card key={m.id} style={{marginBottom:8}}>
          <div style={{padding:"11px 13px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
              {m.group ? <Badge>Group {m.group}</Badge> : <Badge color={C.gold}>{m.stage||"Knockout"}</Badge>}
              <span style={{fontSize:11,color:C.dim}}>{m.time}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <Crest team={m.home} size={24}/><span style={{fontWeight:700,color:C.text,flex:1,fontSize:14}}>{m.home}</span>
              <span style={{fontSize:11,color:C.dim}}>VS</span>
              <span style={{fontWeight:700,color:C.text,flex:1,textAlign:"right",fontSize:14}}>{m.away}</span><Crest team={m.away} size={24}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:m.tv?5:0}}>
              <span style={{fontSize:11,color:C.dim}}>📍 {m.venue}</span>
              <button onClick={()=>onAction(m)} style={{background:`${C.green}22`,border:`1px solid ${C.greenS}`,color:C.green,padding:"3px 11px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer"}}>+ Add</button>
            </div>
            {m.tv && <div style={{fontSize:11,color:C.gold}}>📺 {m.tv}</div>}
          </div>
        </Card>)}
      </div>)
    )}

    <Card style={{marginTop:4}}>
      <div style={{padding:14}}>
        <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Knockout Stage</div>
        {[["Round of 32","Jun 28–Jul 3"],["Round of 16","Jul 4–7"],["Quarter-finals","Jul 9–11"],["Semi-finals","Jul 14–15"],["3rd Place","Jul 18"],["🏆 Final","Jul 19 · MetLife, NJ"]].map(([s,d])=><div key={s} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.b1}`}}><span style={{fontSize:13,color:C.mid}}>{s}</span><span style={{fontWeight:700,fontSize:13,color:C.text}}>{d}</span></div>)}
      </div>
    </Card>
  </div>;
}

// ── GROUPS
function GrpTab({onTeam}) {
  const [sel,setSel] = useState("A");
  const [view,setView] = useState("standings");
  const [allR,setAllR] = useState(()=>{
    try {
      const s = localStorage.getItem("wc2026_scores");
      if (s) return JSON.parse(s);
    } catch {}
    const init={};
    Object.keys(GROUPS).forEach(g=>{init[g]=MATCHES.filter(m=>m.group===g).map(m=>({id:m.id,home:m.home,away:m.away,date:m.date,hg:"",ag:""}));});
    return init;
  });
  useEffect(()=>{ try { localStorage.setItem("wc2026_scores", JSON.stringify(allR)); } catch {} },[allR]);
  const results = allR[sel]||[];
  const standings = calcStandings(sel,results);
  const upd = (id,f,v) => setAllR(p=>({...p,[sel]:p[sel].map(r=>r.id===id?{...r,[f]:v.replace(/\D/g,"")}:r)}));
  const qc = pos => pos<=2?C.green:pos===3?C.gold:"transparent";

  return <div>
    <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:6,marginBottom:12,scrollbarWidth:"none"}}>
      {Object.keys(GROUPS).map(g=><Pill key={g} active={sel===g} onClick={()=>setSel(g)}>{g}</Pill>)}
    </div>
    <div style={{display:"flex",gap:8,marginBottom:14}}>
      <Pill active={view==="standings"} onClick={()=>setView("standings")} color={C.gold}>📊 Standings</Pill>
      <Pill active={view==="matches"} onClick={()=>setView("matches")} color={C.gold}>📋 Matches</Pill>
      <Pill active={view==="all"} onClick={()=>setView("all")} color={C.gold}>🗂 All</Pill>
    </div>

    {view==="standings" && <div>
      <Card style={{marginBottom:12}}>
        <div style={{padding:"8px 13px",borderBottom:`1px solid ${C.b1}`,background:"#0a1810",display:"flex",justifyContent:"space-between"}}>
          <span style={{fontWeight:700,color:C.green,fontSize:16}}>GROUP {sel}</span>
          <span style={{fontSize:10,color:C.dim}}>Tap team for stats</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"20px 1fr 24px 24px 24px 24px 28px 28px",padding:"4px 10px",borderBottom:`1px solid ${C.b1}`,background:"#091510"}}>
          {["#","Team","P","W","D","L","GD","Pts"].map((h,i)=><div key={i} style={{fontSize:9,color:C.dim,fontWeight:700,textAlign:i>=2?"center":"left"}}>{h}</div>)}
        </div>
        {standings.map((row,i)=><div key={row.team} onClick={()=>onTeam(row.team)}
          style={{display:"grid",gridTemplateColumns:"20px 1fr 24px 24px 24px 24px 28px 28px",padding:"8px 10px",borderBottom:i<3?`1px solid ${C.b1}`:"none",cursor:"pointer",borderLeft:`3px solid ${qc(row.pos)}`,background:row.pos<=2?`${C.green}08`:row.pos===3?`${C.gold}08`:"transparent"}}
          onMouseEnter={e=>e.currentTarget.style.background=`${C.green}12`}
          onMouseLeave={e=>e.currentTarget.style.background=row.pos<=2?`${C.green}08`:row.pos===3?`${C.gold}08`:"transparent"}>
          <div style={{fontSize:11,color:C.dim,display:"flex",alignItems:"center"}}>{row.pos}</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}><Crest team={row.team} size={18}/><span style={{fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.team}</span></div>
          {[row.p,row.w,row.d,row.l].map((v,j)=><div key={j} style={{fontSize:12,color:C.mid,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>{v}</div>)}
          <div style={{fontSize:12,color:row.gd>0?C.green:row.gd<0?C.red:C.mid,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:600}}>{row.gd>0?"+":""}{row.gd}</div>
          <div style={{fontSize:15,fontWeight:700,color:C.text,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>{row.pts}</div>
        </div>)}
        <div style={{padding:"6px 12px",borderTop:`1px solid ${C.b1}`,display:"flex",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.dim}}><div style={{width:8,height:8,borderRadius:2,background:C.green}}/>Top 2 Qualify</div>
          <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.dim}}><div style={{width:8,height:8,borderRadius:2,background:C.gold}}/>Best 3rd</div>
        </div>
      </Card>
      <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>ENTER SCORES</div>
      {results.map(r=><div key={r.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,background:C.s1,border:`1px solid ${C.b1}`,borderRadius:10,padding:"7px 11px"}}>
        <Crest team={r.home} size={18}/>
        <span style={{fontSize:11,color:C.text,flex:1,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.home}</span>
        <input value={r.hg} onChange={e=>upd(r.id,"hg",e.target.value)} placeholder="-" maxLength={2} style={{width:28,textAlign:"center",background:C.s2,border:`1px solid ${C.b2}`,borderRadius:6,color:C.text,fontSize:14,fontWeight:700,padding:"3px 0",outline:"none"}}/>
        <span style={{color:C.dim,fontWeight:700}}>:</span>
        <input value={r.ag} onChange={e=>upd(r.id,"ag",e.target.value)} placeholder="-" maxLength={2} style={{width:28,textAlign:"center",background:C.s2,border:`1px solid ${C.b2}`,borderRadius:6,color:C.text,fontSize:14,fontWeight:700,padding:"3px 0",outline:"none"}}/>
        <span style={{fontSize:11,color:C.text,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.away}</span>
        <Crest team={r.away} size={18}/>
      </div>)}
      <div style={{fontSize:11,color:C.dim,marginTop:4,textAlign:"center"}}>Standings update live as you enter scores</div>
    </div>}

    {view==="matches" && <div>
      {results.map(r=><Card key={r.id} style={{marginBottom:8}}>
        <div style={{padding:"11px 13px"}}>
          <div style={{fontSize:10,color:C.dim,marginBottom:6}}>{r.date}</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Crest team={r.home} size={26}/>
            <span style={{fontWeight:700,color:C.text,flex:1,fontSize:14}}>{r.home}</span>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <input value={r.hg} onChange={e=>upd(r.id,"hg",e.target.value)} placeholder="-" maxLength={2} style={{width:32,textAlign:"center",background:C.s2,border:`1px solid ${C.b2}`,borderRadius:8,color:C.text,fontSize:16,fontWeight:700,padding:"4px 0",outline:"none"}}/>
              <span style={{color:C.dim}}>:</span>
              <input value={r.ag} onChange={e=>upd(r.id,"ag",e.target.value)} placeholder="-" maxLength={2} style={{width:32,textAlign:"center",background:C.s2,border:`1px solid ${C.b2}`,borderRadius:8,color:C.text,fontSize:16,fontWeight:700,padding:"4px 0",outline:"none"}}/>
            </div>
            <span style={{fontWeight:700,color:C.text,flex:1,textAlign:"right",fontSize:14}}>{r.away}</span>
            <Crest team={r.away} size={26}/>
          </div>
        </div>
      </Card>)}
    </div>}

    {view==="all" && <div>
      {Object.entries(GROUPS).map(([letter])=>{
        const gs2 = calcStandings(letter,allR[letter]||[]);
        return <Card key={letter} style={{marginBottom:10}}>
          <div style={{padding:"7px 12px",borderBottom:`1px solid ${C.b1}`,background:"#0a1810",display:"flex",justifyContent:"space-between",cursor:"pointer"}} onClick={()=>{setSel(letter);setView("standings");}}>
            <span style={{fontWeight:700,color:C.green}}>GROUP {letter}</span>
            <span style={{fontSize:10,color:C.dim}}>expand →</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"16px 1fr 20px 20px 20px 20px 24px 26px",padding:"3px 10px",borderBottom:`1px solid ${C.b1}`,background:"#091510"}}>
            {["#","","P","W","D","L","GD","Pts"].map((h,i)=><div key={i} style={{fontSize:8,color:C.dim,fontWeight:700,textAlign:i>=2?"center":"left"}}>{h}</div>)}
          </div>
          {gs2.map((row,i)=><div key={row.team} onClick={()=>onTeam(row.team)}
            style={{display:"grid",gridTemplateColumns:"16px 1fr 20px 20px 20px 20px 24px 26px",padding:"5px 10px",borderBottom:i<3?`1px solid ${C.b1}`:"none",cursor:"pointer",borderLeft:`2px solid ${qc(row.pos)}`}}
            onMouseEnter={e=>e.currentTarget.style.background=`${C.green}09`}
            onMouseLeave={e=>e.currentTarget.style.background=""}>
            <div style={{fontSize:10,color:C.dim,display:"flex",alignItems:"center"}}>{row.pos}</div>
            <div style={{display:"flex",alignItems:"center",gap:5}}><Crest team={row.team} size={14}/><span style={{fontSize:11,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{row.team}</span></div>
            {[row.p,row.w,row.d,row.l].map((v,j)=><div key={j} style={{fontSize:11,color:C.mid,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>{v}</div>)}
            <div style={{fontSize:11,color:row.gd>0?C.green:row.gd<0?C.red:C.mid,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:600}}>{row.gd>0?"+":""}{row.gd}</div>
            <div style={{fontSize:13,fontWeight:700,color:C.text,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>{row.pts}</div>
          </div>)}
        </Card>;
      })}
    </div>}
  </div>;
}

// ── STATS
function StatsTab({initial=""}) {
  const [sel,setSel] = useState(initial);
  const d = sel ? TEAMS[sel] : null;
  return <div>
    <select value={sel} onChange={e=>setSel(e.target.value)} style={{width:"100%",padding:"10px 14px",background:C.s1,border:`1px solid ${C.b2}`,borderRadius:10,color:C.text,fontSize:14,outline:"none",marginBottom:14}}>
      <option value="">Select any of the 48 teams</option>
      {Object.keys(GROUPS).map(g=><optgroup key={g} label={`Group ${g}`}>
        {GROUPS[g].teams.map(t=><option key={t} value={t}>{getFlag(t)} {t}</option>)}
      </optgroup>)}
    </select>
    {!d && <div style={{textAlign:"center",padding:"44px 20px",color:C.dim,fontSize:13}}>Select any team to view their federation crest, Sofascore ratings, key players and analysis</div>}
    {d && <div>
      <Card style={{marginBottom:12}}>
        <div style={{padding:16}}>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14}}>
            <Crest team={sel} size={58}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:20,color:C.text,lineHeight:1}}>{sel}</div>
              <div style={{fontSize:11,color:C.mid,marginTop:4}}>{d.conf} · Coach: {d.coach}</div>
              <div style={{fontSize:11,color:C.dim,marginTop:2}}>FIFA Rank: #{d.rank}</div>
            </div>
            <RC v={d.ss} sz={48}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
            {[["Titles",d.titles],["WC Apps",d.apps],["Form",d.form.slice(-3).join("")]].map(([l,v])=><div key={l} style={{background:C.s2,borderRadius:10,padding:"9px 8px",textAlign:"center"}}>
              <div style={{fontWeight:700,fontSize:18,color:C.green}}>{v}</div>
              <div style={{fontSize:9,color:C.dim,marginTop:2}}>{l}</div>
            </div>)}
          </div>
          <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Sofascore Attributes</div>
          <div style={{display:"flex",justifyContent:"space-between",gap:4}}>
            {Object.entries(d.stats).map(([k,v])=><div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <RC v={v} sz={34}/>
              <span style={{fontSize:8,color:C.dim,textTransform:"uppercase",textAlign:"center"}}>{k}</span>
            </div>)}
          </div>
        </div>
      </Card>
      <Card style={{marginBottom:12}}>
        <div style={{padding:"10px 13px",borderBottom:`1px solid ${C.b1}`}}><span style={{fontWeight:700,color:C.green,fontSize:13}}>KEY PLAYERS · SOFASCORE RATINGS</span></div>
        {d.players.map((p,i)=><div key={p.name} style={{padding:"11px 13px",borderBottom:i<d.players.length-1?`1px solid ${C.b1}`:"none"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
            <div>
              <span style={{fontWeight:700,color:C.text,fontSize:14}}>{p.name}</span>
              <span style={{fontSize:11,color:C.dim,marginLeft:8}}>{p.pos} · {p.club}</span>
            </div>
            <RC v={p.ss} sz={34}/>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:3}}>
            <Badge color={C.blue}>{p.caps} caps</Badge>
            {p.goals>0 && <Badge color={C.gold}>{p.goals} goals</Badge>}
          </div>
          <div style={{fontSize:11,color:C.dim,fontStyle:"italic"}}>{p.note}</div>
        </div>)}
      </Card>
      <Card>
        <div style={{padding:14}}>
          <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>2026 Analysis</div>
          <p style={{fontSize:13,color:C.mid,lineHeight:1.7}}>{d.note}</p>
        </div>
      </Card>
      {RECENT4[sel] && <Card style={{marginTop:12}}>
        <div style={{padding:"11px 14px",borderBottom:`1px solid ${C.b1}`}}>
          <span style={{fontWeight:700,color:C.green,fontSize:13,letterSpacing:"0.05em"}}>LAST 4 MATCHES</span>
        </div>
        {RECENT4[sel].map((g,i)=>{
          const rc=g.res==="W"?C.green:g.res==="D"?C.gold:C.red;
          const isFriendly=g.comp==="Friendly";
          return <div key={i} style={{padding:"11px 14px",borderBottom:i<3?`1px solid ${C.b1}`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:`${rc}22`,border:`2px solid ${rc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:rc,flexShrink:0}}>{g.res}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontWeight:700,color:C.text,fontSize:13}}>vs {g.opp}</span>
                  <span style={{fontWeight:700,color:rc,fontSize:13}}>{g.score}</span>
                </div>
                <div style={{fontSize:11,color:C.dim,marginTop:2}}>{g.date} · 📍 {g.loc}</div>
              </div>
              <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:isFriendly?`${C.dim}22`:`${C.blue}18`,color:isFriendly?C.dim:C.blue,fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>{g.comp}</span>
            </div>
          </div>;
        })}
      </Card>}
    </div>}
  </div>;
}

// ── PREDICTIONS
function PredTab() {
  const top = PREDS.filter(p=>p.team!=="Others"), others = PREDS.find(p=>p.team==="Others"), max = top[0].poly;
  return <div>
    <div style={{background:`linear-gradient(135deg,#0a1f10,#0c2815)`,border:`1px solid ${C.b2}`,borderRadius:12,padding:14,marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <div>
          <div style={{fontWeight:700,fontSize:18,color:C.green}}>POLYMARKET ODDS</div>
          <div style={{fontSize:11,color:C.dim}}>Live prediction market · Updated May 19, 2026</div>
        </div>
        <a href="https://polymarket.com" target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:C.green,textDecoration:"none",border:`1px solid ${C.greenS}`,padding:"3px 9px",borderRadius:20}}>Live →</a>
      </div>
      <div style={{fontSize:12,color:C.dim}}>18% = 18¢ per dollar · crowd-sourced probability</div>
    </div>
    {top.map((p,i)=><Card key={p.team} style={{marginBottom:7}}>
      <div style={{padding:"11px 13px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
          <div style={{fontWeight:700,color:C.dim,minWidth:22,fontSize:14}}>#{i+1}</div>
          <Crest team={p.team} size={26}/>
          <span style={{fontWeight:700,color:C.text,flex:1,fontSize:14}}>{p.team}</span>
          <div style={{textAlign:"right"}}>
            <div style={{fontWeight:700,fontSize:20,color:p.poly>=15?C.green:p.poly>=8?C.gold:C.mid}}>{p.poly}%</div>
            <div style={{fontSize:10,color:C.dim}}>{p.odds}</div>
          </div>
          <span style={{fontSize:13}}>{p.trend}</span>
        </div>
        <div style={{height:4,background:C.s2,borderRadius:2,overflow:"hidden"}}>
          <div style={{height:4,borderRadius:2,width:`${(p.poly/max)*100}%`,background:`linear-gradient(90deg,#1a4a2a,${C.green})`}}/>
        </div>
        {TEAMS[p.team] && <div style={{display:"flex",gap:6,marginTop:7}}>
          <Badge color={C.blue}>SS {TEAMS[p.team].ss}</Badge>
          <Badge color={C.dim}>#{TEAMS[p.team].rank} FIFA</Badge>
        </div>}
      </div>
    </Card>)}
    <Card style={{marginTop:4}}><div style={{padding:12,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:C.mid}}>🌍 All others</span><span style={{fontWeight:700,color:C.dim,fontSize:18}}>{others.poly}%</span></div></Card>
  </div>;
}

// ── SIMULATOR
function SimTab() {
  const [res,setRes] = useState(null);
  const [running,setRunning] = useState(false);
  const [sims,setSims] = useState(1000);
  const [mc,setMc] = useState(null);
  const doSingle = () => { setRunning(true); setTimeout(()=>{setRes(runSim());setMc(null);setRunning(false);},80); };
  const doMC = () => { setRunning(true); setTimeout(()=>{ const c={}; for(let i=0;i<sims;i++){const r=runSim();c[r.champion]=(c[r.champion]||0)+1;} setMc(Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([t,n])=>({team:t,pct:((n/sims)*100).toFixed(1)}))); setRes(null);setRunning(false); },50); };
  return <div>
    <div style={{background:`linear-gradient(135deg,#0a1f10,#0c2815)`,border:`1px solid ${C.b2}`,borderRadius:12,padding:14,marginBottom:14}}>
      <div style={{fontWeight:700,fontSize:18,color:C.green,marginBottom:6}}>WORLD CUP SIMULATOR</div>
      <p style={{fontSize:13,color:C.mid,lineHeight:1.6,marginBottom:12}}>Simulates the full tournament using FIFA rankings + Sofascore strength scores. Run Monte Carlo for win probabilities across thousands of simulations.</p>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <button onClick={doSingle} disabled={running} style={{flex:1,padding:"11px 0",borderRadius:10,cursor:"pointer",background:`linear-gradient(135deg,${C.green},#22c55e)`,border:"none",color:"#030a05",fontWeight:700,fontSize:14,opacity:running?.6:1}}>▶ Simulate Once</button>
        <button onClick={doMC} disabled={running} style={{flex:1,padding:"11px 0",borderRadius:10,cursor:"pointer",background:`${C.gold}22`,border:`1px solid ${C.gold}55`,color:C.gold,fontWeight:700,fontSize:14,opacity:running?.6:1}}>🎲 Monte Carlo ({sims}×)</button>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {[100,500,1000,5000,10000,50000].map(n=><Pill key={n} active={sims===n} onClick={()=>setSims(n)} color={C.gold}>{n>=10000?n.toLocaleString():n}</Pill>)}
      </div>
    </div>
    {running && <div style={{textAlign:"center",padding:"36px 0"}}>
      <div style={{width:32,height:32,border:`3px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 10px"}}/>
      <div style={{fontSize:13,color:C.mid}}>Running simulation...</div>
    </div>}
    {!running && mc && <div>
      <div style={{fontWeight:700,color:C.gold,marginBottom:12,fontSize:16}}>MONTE CARLO · {sims} SIMULATIONS</div>
      {mc.slice(0,12).map((r,i)=><Card key={r.team} style={{marginBottom:6}}>
        <div style={{padding:"9px 13px",display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontWeight:700,color:C.dim,minWidth:22,fontSize:13}}>#{i+1}</div>
          <Crest team={r.team} size={22}/>
          <span style={{fontWeight:700,color:C.text,flex:1,fontSize:14}}>{r.team}</span>
          <div style={{width:70,height:4,background:C.s2,borderRadius:2}}><div style={{height:4,borderRadius:2,width:`${r.pct}%`,background:i===0?C.green:i<3?C.gold:C.mid}}/></div>
          <div style={{fontWeight:700,fontSize:17,color:i===0?C.green:i<3?C.gold:C.mid,minWidth:42,textAlign:"right"}}>{r.pct}%</div>
          {i===0 && <span>🏆</span>}
        </div>
      </Card>)}
    </div>}
    {!running && res && !mc && <div>
      <div style={{marginBottom:14,padding:14,background:`${C.green}18`,border:`1px solid ${C.greenS}`,borderRadius:12,textAlign:"center"}}>
        <div style={{fontSize:"2.2rem",marginBottom:8}}>🏆</div>
        <div style={{fontSize:11,color:C.dim,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6}}>Simulated Champion</div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
          <Crest team={res.champion} size={46}/>
          <span style={{fontWeight:700,fontSize:26,color:C.green}}>{res.champion}</span>
        </div>
        <div style={{fontSize:13,color:C.mid,marginTop:6}}>Runner-up: {getFlag(res.runnerUp)} {res.runnerUp}</div>
      </div>
      {[["SEMI-FINALS",res.sf],["QUARTER-FINALS",res.qf],["ROUND OF 16",res.r16]].map(([label,teams])=><div key={label} style={{marginBottom:12}}>
        <div style={{fontSize:11,color:C.dim,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:7}}>{label}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {teams.map(t=><div key={t} style={{display:"flex",alignItems:"center",gap:5,background:C.s2,border:`1px solid ${C.b1}`,borderRadius:8,padding:"4px 9px"}}>
            <Crest team={t} size={16}/><span style={{fontSize:12,color:C.text}}>{t}</span>
          </div>)}
        </div>
      </div>)}
    </div>}
  </div>;
}

// ── SAVED
function SavedTab({saved,onRemove}) {
  const [synced,setSynced] = useState(false);

  const handleSync = () => {
    downloadICS(saved);
    setSynced(true);
    setTimeout(()=>setSynced(false),3000);
  };

  return <div>
    {saved.length===0 ? <div style={{textAlign:"center",padding:"50px 20px"}}>
      <div style={{fontSize:"2.8rem",marginBottom:10}}>📅</div>
      <div style={{fontWeight:700,fontSize:18,color:C.mid,marginBottom:6}}>No matches saved yet</div>
      <div style={{fontSize:13,color:C.dim}}>Tap + Add on any match in the Schedule tab to save matches here.</div>
    </div> : <div>
      {/* Sync banner */}
      <div style={{background:`linear-gradient(135deg,#0a1f10,#0c2815)`,border:`1px solid ${C.b2}`,borderRadius:12,padding:14,marginBottom:16}}>
        <div style={{fontWeight:700,color:C.text,fontSize:14,marginBottom:4}}>📅 Sync to Google Calendar</div>
        <div style={{fontSize:12,color:C.mid,marginBottom:12,lineHeight:1.5}}>Download a <strong style={{color:C.green}}>.ics file</strong> of all your saved matches. Open it to import directly into Google Calendar, Apple Calendar, or Outlook.</div>
        <button onClick={handleSync} style={{width:"100%",padding:"11px 0",borderRadius:10,cursor:"pointer",background:synced?`${C.green}33`:`linear-gradient(135deg,${C.green},#22c55e)`,border:synced?`1px solid ${C.green}`:"none",color:synced?C.green:"#030a05",fontWeight:700,fontSize:14,transition:"all .3s"}}>
          {synced ? "✅ Opening calendar import..." : `📅 Export to Calendar (${saved.length} match${saved.length!==1?"es":""})`}
        </button>
        <div style={{fontSize:11,color:C.dim,marginTop:8,lineHeight:1.6}}>
          <strong style={{color:C.mid}}>iPhone:</strong> Tap → a new tab opens → Safari asks "Add to Calendar" → tap Add All<br/>
          <strong style={{color:C.mid}}>Android/Mac/PC:</strong> Downloads a .ics file → open it → import into Google Calendar
        </div>
      </div>

      {/* Match list */}
      <div style={{fontSize:12,color:C.dim,marginBottom:10}}>{saved.length} match{saved.length!==1?"es":""} saved</div>
      {saved.map(item=><Card key={item.id} style={{marginBottom:8}}>
        <div style={{padding:"11px 13px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Crest team={item.match.home} size={24}/>
              <div>
                <div style={{fontWeight:700,color:C.text,marginBottom:2,fontSize:14}}>{item.match.home} vs {item.match.away}</div>
                <div style={{fontSize:11,color:C.dim}}>{item.match.date} · {item.match.time} · {item.match.venue}</div>
              </div>
            </div>
            <button onClick={()=>onRemove(item.id)} style={{background:"none",border:"none",color:C.dim,fontSize:20,cursor:"pointer",flexShrink:0}}>×</button>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {item.type==="cal" && <Badge color={C.green}>📅 {item.avail}</Badge>}
            {item.type==="rem" && <Badge color={C.gold}>🔔 {item.ch} · {RO.find(o=>o.v===item.mins)?.l}</Badge>}
            {item.match.group && <Badge color={C.dim}>Group {item.match.group}</Badge>}
          </div>
          {item.contact && <div style={{fontSize:11,color:C.dim,marginTop:5}}>→ {item.contact}</div>}
        </div>
      </Card>)}

      {/* Bottom sync button */}
      {saved.length > 1 && (
        <button onClick={handleSync} style={{width:"100%",padding:"11px 0",borderRadius:10,cursor:"pointer",background:`${C.green}22`,border:`1px solid ${C.greenS}`,color:C.green,fontWeight:700,fontSize:14,marginTop:8}}>
          ⬇️ Sync all {saved.length} matches to Calendar
        </button>
      )}
    </div>}
  </div>;
}

// ── APP
const TABS = [
  {id:"live",icon:"🔴",label:"Live"},
  {id:"schedule",icon:"📋",label:"Schedule"},
  {id:"groups",icon:"🗂️",label:"Groups"},
  {id:"stats",icon:"📊",label:"Stats"},
  {id:"predict",icon:"🎯",label:"Predictions"},
  {id:"sim",icon:"🎮",label:"Simulator"},
  {id:"saved",icon:"⭐",label:"My Matches"},
];

export default function App() {
  const [tab,setTab] = useState("live");
  const [statsTeam,setStatsTeam] = useState("");
  const [modal,setModal] = useState({open:false,match:null});
  const [saved,setSaved] = useState(()=>{
    try {
      const s = localStorage.getItem("wc2026_saved");
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  useEffect(()=>{ try { localStorage.setItem("wc2026_saved", JSON.stringify(saved)); } catch {} },[saved]);
  const [toast,setToast] = useState("");

  const onTeam = t => { setStatsTeam(t); setTab("stats"); };
  const onAction = m => setModal({open:true,match:m});
  const onCal = (m,avail) => { const id=`c${m.id}`; setSaved(s=>[...s.filter(x=>x.id!==id),{id,type:"cal",match:m,avail}]); setToast("Added to calendar"); };
  const onRem = (m,ch,mins,contact) => { const id=`r${m.id}`; setSaved(s=>[...s.filter(x=>x.id!==id),{id,type:"rem",match:m,ch,mins,contact}]); setToast("Reminder set"); };
  const onRemove = id => setSaved(s=>s.filter(x=>x.id!==id));

  return (
    <div style={{minHeight:"100vh",background:C.bg,maxWidth:700,margin:"0 auto",fontFamily:"system-ui,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0;padding:0}select option{background:#0c1a12}::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-thumb{background:#1a3828;border-radius:2px}`}</style>
      <div style={{background:`linear-gradient(180deg,#091510,${C.bg})`,padding:"18px 14px 0",borderBottom:`1px solid ${C.b1}`,position:"sticky",top:0,zIndex:100,backdropFilter:"blur(10px)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12}}>
          <div>
            <div style={{fontSize:10,color:C.dim,letterSpacing:"0.2em",fontWeight:700}}>FIFA</div>
            <div style={{fontSize:26,fontWeight:900,color:C.text,lineHeight:1}}>WORLD CUP</div>
            <div style={{fontSize:26,fontWeight:900,color:C.green,lineHeight:1}}>2026™</div>
          </div>
          <div style={{textAlign:"right",fontSize:11,color:C.dim,paddingBottom:2}}>
            <div>🇺🇸 🇨🇦 🇲🇽</div>
            <div style={{marginTop:2}}>Jun 11 – Jul 19</div>
            <div>48 teams · 104 matches</div>
          </div>
        </div>
        <div style={{display:"flex",overflowX:"auto",scrollbarWidth:"none",marginBottom:-1}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:"0 0 auto",padding:"9px 11px",background:"none",border:"none",borderBottom:`2px solid ${tab===t.id?C.green:"transparent"}`,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:tab===t.id?C.green:C.dim}}>
              <span style={{fontSize:15}}>{t.icon}</span>
              <span style={{fontSize:9,fontWeight:600,whiteSpace:"nowrap"}}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{padding:"14px 13px 100px"}}>
        {tab==="live" && <LiveTab/>}
        {tab==="schedule" && <SchedTab onAction={onAction}/>}
        {tab==="groups" && <GrpTab onTeam={onTeam}/>}
        {tab==="stats" && <StatsTab initial={statsTeam}/>}
        {tab==="predict" && <PredTab/>}
        {tab==="sim" && <SimTab/>}
        {tab==="saved" && <SavedTab saved={saved} onRemove={onRemove}/>}
      </div>
      <AddModal match={modal.match} open={modal.open} onClose={()=>setModal({open:false,match:null})} onCal={onCal} onRem={onRem}/>
      <Toast msg={toast} onDone={()=>setToast("")}/>
    </div>
  );
}