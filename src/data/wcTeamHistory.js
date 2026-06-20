// Per-tournament World Cup history: match-by-match results, top scorers, and
// full squads — one level deeper than the appearances summary already shown
// in TeamHistoryCard (which comes from the Zafronix API's aggregate data).
//
// This is hand-compiled from verified sources (Wikipedia, official squad
// announcements, ESPN/BBC reporting) since no connected API provides this
// depth of historical data. Coverage starts intentionally small — validate
// the UI/UX here, then expand team-by-team, tournament-by-tournament.
//
// Schema per team per year:
// {
//   host: string,
//   result: string,            // how far they got, in plain English
//   group: string,              // group letter that year
//   coach: string,
//   matches: [
//     { stage, opponent, score, result: "W"|"D"|"L", scorers?: string[] }
//   ],
//   topScorers: [ { name, goals } ],   // that team, that tournament only
//   squad: [ { name, pos: "GK"|"DF"|"MF"|"FW", club } ],
// }
//
// Team names are keyed to match the canonical names used elsewhere in the
// app (see Z_NAME_MAP / GROUPS team strings) — "United States", not "USA".

export const WC_TEAM_HISTORY = {
  "Brazil": {
    2022: {
      host: "Qatar",
      result: "Quarterfinals",
      group: "G",
      coach: "Tite",
      matches: [
        { stage: "Group G", opponent: "Serbia",      score: "2–0", result: "W", scorers: ["Richarlison 2"] },
        { stage: "Group G", opponent: "Switzerland", score: "1–0", result: "W", scorers: ["Casemiro"] },
        { stage: "Group G", opponent: "Cameroon",    score: "0–1", result: "L" },
        { stage: "Round of 16", opponent: "South Korea", score: "4–1", result: "W", scorers: ["Vinícius Júnior", "Neymar (pen)", "Richarlison", "Lucas Paquetá"] },
        { stage: "Quarterfinals", opponent: "Croatia", score: "1–1 (2–4 pens)", result: "L", scorers: ["Neymar"] },
      ],
      topScorers: [
        { name: "Richarlison", goals: 3 },
        { name: "Neymar", goals: 2 },
        { name: "Lucas Paquetá", goals: 1 },
      ],
      squad: [
        { name: "Alisson Becker", pos: "GK", club: "Liverpool" },
        { name: "Ederson", pos: "GK", club: "Manchester City" },
        { name: "Weverton", pos: "GK", club: "Palmeiras" },
        { name: "Thiago Silva", pos: "DF", club: "Chelsea" },
        { name: "Marquinhos", pos: "DF", club: "Paris Saint-Germain" },
        { name: "Danilo", pos: "DF", club: "Juventus" },
        { name: "Éder Militão", pos: "DF", club: "Real Madrid" },
        { name: "Alex Telles", pos: "DF", club: "Sevilla" },
        { name: "Alex Sandro", pos: "DF", club: "Juventus" },
        { name: "Bremer", pos: "DF", club: "Juventus" },
        { name: "Dani Alves", pos: "DF", club: "Pumas UNAM" },
        { name: "Casemiro", pos: "MF", club: "Manchester United" },
        { name: "Lucas Paquetá", pos: "MF", club: "West Ham United" },
        { name: "Fabinho", pos: "MF", club: "Liverpool" },
        { name: "Fred", pos: "MF", club: "Manchester United" },
        { name: "Everton Ribeiro", pos: "MF", club: "Flamengo" },
        { name: "Bruno Guimarães", pos: "MF", club: "Newcastle United" },
        { name: "Neymar", pos: "FW", club: "Paris Saint-Germain" },
        { name: "Richarlison", pos: "FW", club: "Tottenham Hotspur" },
        { name: "Vinícius Júnior", pos: "FW", club: "Real Madrid" },
        { name: "Antony", pos: "FW", club: "Manchester United" },
        { name: "Raphinha", pos: "FW", club: "Barcelona" },
        { name: "Rodrygo", pos: "FW", club: "Real Madrid" },
        { name: "Pedro", pos: "FW", club: "Flamengo" },
        { name: "Gabriel Jesus", pos: "FW", club: "Arsenal" },
        { name: "Gabriel Martinelli", pos: "FW", club: "Arsenal" },
      ],
    },
  },

  "United States": {
    2022: {
      host: "Qatar",
      result: "Round of 16",
      group: "B",
      coach: "Gregg Berhalter",
      matches: [
        { stage: "Group B", opponent: "Wales",   score: "1–1", result: "D", scorers: ["Timothy Weah"] },
        { stage: "Group B", opponent: "England", score: "0–0", result: "D" },
        { stage: "Group B", opponent: "Iran",    score: "1–0", result: "W", scorers: ["Christian Pulisic"] },
        { stage: "Round of 16", opponent: "Netherlands", score: "1–3", result: "L", scorers: ["Haji Wright"] },
      ],
      topScorers: [
        { name: "Christian Pulisic", goals: 1 },
        { name: "Timothy Weah", goals: 1 },
        { name: "Haji Wright", goals: 1 },
      ],
      squad: [
        { name: "Ethan Horvath", pos: "GK", club: "Luton Town" },
        { name: "Sean Johnson", pos: "GK", club: "New York City FC" },
        { name: "Matt Turner", pos: "GK", club: "Arsenal" },
        { name: "Cameron Carter-Vickers", pos: "DF", club: "Celtic" },
        { name: "Sergiño Dest", pos: "DF", club: "AC Milan" },
        { name: "Aaron Long", pos: "DF", club: "New York Red Bulls" },
        { name: "Shaq Moore", pos: "DF", club: "Nashville SC" },
        { name: "Tim Ream", pos: "DF", club: "Fulham" },
        { name: "Antonee Robinson", pos: "DF", club: "Fulham" },
        { name: "Joe Scally", pos: "DF", club: "Borussia Mönchengladbach" },
        { name: "DeAndre Yedlin", pos: "DF", club: "Inter Miami" },
        { name: "Walker Zimmerman", pos: "DF", club: "Nashville SC" },
        { name: "Brenden Aaronson", pos: "MF", club: "Leeds United" },
        { name: "Kellyn Acosta", pos: "MF", club: "LAFC" },
        { name: "Tyler Adams", pos: "MF", club: "Leeds United" },
        { name: "Luca de la Torre", pos: "MF", club: "Celta Vigo" },
        { name: "Weston McKennie", pos: "MF", club: "Juventus" },
        { name: "Yunus Musah", pos: "MF", club: "Valencia" },
        { name: "Cristian Roldan", pos: "MF", club: "Seattle Sounders" },
        { name: "Jesús Ferreira", pos: "FW", club: "FC Dallas" },
        { name: "Jordan Morris", pos: "FW", club: "Seattle Sounders" },
        { name: "Christian Pulisic", pos: "FW", club: "Chelsea" },
        { name: "Giovanni Reyna", pos: "FW", club: "Borussia Dortmund" },
        { name: "Josh Sargent", pos: "FW", club: "Norwich City" },
        { name: "Timothy Weah", pos: "FW", club: "Lille" },
        { name: "Haji Wright", pos: "FW", club: "Antalyaspor" },
      ],
    },
  },
};

// Search every compiled team-year for a player by (partial, case-insensitive)
// name match. Returns [{ team, year, club, pos }]. Only searches whatever's
// in WC_TEAM_HISTORY above — expands automatically as more years are added.
export function findPlayerWCHistory(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const hits = [];
  Object.entries(WC_TEAM_HISTORY).forEach(([team, years]) => {
    Object.entries(years).forEach(([year, data]) => {
      (data.squad || []).forEach(p => {
        if (p.name.toLowerCase().includes(q)) {
          hits.push({ team, year: Number(year), club: p.club, pos: p.pos });
        }
      });
    });
  });
  return hits.sort((a, b) => a.year - b.year);
}
