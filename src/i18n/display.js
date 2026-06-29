// Display-only localization helpers for the World Cup app.
// Keep canonical team/stage values unchanged for APIs, scoring, brackets, and storage.

const TEAM_PT_BR = {
  "Algeria":"Argélia",
  "Argentina":"Argentina",
  "Australia":"Austrália",
  "Austria":"Áustria",
  "Belgium":"Bélgica",
  "Bosnia & Herz.":"Bósnia e Herzegovina",
  "Brazil":"Brasil",
  "Canada":"Canadá",
  "Cape Verde":"Cabo Verde",
  "Colombia":"Colômbia",
  "Croatia":"Croácia",
  "Curacao":"Curaçao",
  "Czechia":"Tchéquia",
  "DR Congo":"RD Congo",
  "Ecuador":"Equador",
  "Egypt":"Egito",
  "England":"Inglaterra",
  "France":"França",
  "Germany":"Alemanha",
  "Ghana":"Gana",
  "Haiti":"Haiti",
  "Iran":"Irã",
  "Iraq":"Iraque",
  "Ivory Coast":"Costa do Marfim",
  "Japan":"Japão",
  "Jordan":"Jordânia",
  "Mexico":"México",
  "Morocco":"Marrocos",
  "Netherlands":"Holanda",
  "New Zealand":"Nova Zelândia",
  "Norway":"Noruega",
  "Panama":"Panamá",
  "Paraguay":"Paraguai",
  "Portugal":"Portugal",
  "Qatar":"Catar",
  "Saudi Arabia":"Arábia Saudita",
  "Scotland":"Escócia",
  "Senegal":"Senegal",
  "South Africa":"África do Sul",
  "South Korea":"Coreia do Sul",
  "Spain":"Espanha",
  "Sweden":"Suécia",
  "Switzerland":"Suíça",
  "Tunisia":"Tunísia",
  "Turkiye":"Turquia",
  "Turkey":"Turquia",
  "Türkiye":"Turquia",
  "Congo DR":"RD Congo",
  "Bosnia-Herzegovina":"Bósnia e Herzegovina",
  "United States":"Estados Unidos",
  "Uruguay":"Uruguai",
  "Uzbekistan":"Uzbequistão",
};

const STAGE_PT_BR = {
  "Group Stage":"Fase de Grupos",
  "Group phase":"Fase de Grupos",
  "Round of 32":"16 avos de final",
  "Round of 16":"Oitavas de final",
  "Quarter-final":"Quartas de final",
  "Quarter-Finals":"Quartas de final",
  "Semi-final":"Semifinal",
  "Semi-Finals":"Semifinais",
  "3rd Place":"Disputa do 3º lugar",
  "Final":"Final",
  "Knockout":"Mata-mata",
  "Knockout Stage":"Mata-mata",
};

const VENUE_PT_BR_PARTS = [
  ["Stadium", "Estádio"],
  ["Houston", "Houston"],
  ["Boston", "Boston"],
  ["Dallas", "Dallas"],
  ["Seattle", "Seattle"],
  ["Philadelphia", "Filadélfia"],
  ["Kansas City", "Kansas City"],
  ["Atlanta", "Atlanta"],
  ["Toronto", "Toronto"],
  ["Vancouver", "Vancouver"],
  ["Los Angeles", "Los Angeles"],
  ["Miami", "Miami"],
  ["Mexico City", "Cidade do México"],
  ["New York New Jersey", "Nova York/Nova Jersey"],
  ["San Francisco Bay Area", "Baía de São Francisco"],
];

export function displayTeamName(team, language="en") {
  if (!team) return team;
  if (language !== "pt-BR") return team;
  const text = String(team);
  return TEAM_PT_BR[text] || text;
}

export function displayStageName(stage, language="en") {
  if (!stage) return language === "pt-BR" ? "Mata-mata" : "Knockout";
  if (language !== "pt-BR") return stage;
  const raw = String(stage);
  const st = raw.toLowerCase();
  if (st.includes("round of 32")) return STAGE_PT_BR["Round of 32"];
  if (st.includes("round of 16")) return STAGE_PT_BR["Round of 16"];
  if (st.includes("quarter")) return STAGE_PT_BR["Quarter-final"];
  if (st.includes("semi")) return STAGE_PT_BR["Semi-final"];
  if (st.includes("3rd")) return STAGE_PT_BR["3rd Place"];
  if (st.includes("final")) return STAGE_PT_BR["Final"];
  if (st.includes("group")) return STAGE_PT_BR["Group Stage"];
  if (st.includes("knockout")) return STAGE_PT_BR["Knockout"];
  return STAGE_PT_BR[raw] || raw;
}

export function displayGroupLabel(group, language="en") {
  if (!group) return displayStageName("Knockout", language);
  return language === "pt-BR" ? `Grupo ${group}` : `Group ${group}`;
}

export function displayVenueName(venue, language="en") {
  if (!venue || language !== "pt-BR") return venue;
  let text = String(venue);
  for (const [from, to] of VENUE_PT_BR_PARTS) text = text.replaceAll(from, to);
  return text;
}

export function displayMatchDate(date, language="en") {
  if (!date || language !== "pt-BR") return date;
  return String(date).replace(/^Jun\b/, "Jun").replace(/^Jul\b/, "Jul");
}
