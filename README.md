# World Cup 2026 Companion App

A full-featured FIFA World Cup 2026 companion built with React, Vite, Vercel serverless functions, Upstash Redis, and a custom tournament engine.

The app combines live match tracking, fantasy score predictions, an official-style actual bracket, user bracket simulation, standings, tournament statistics, historical team profiles, and World Cup data exploration in one mobile-first experience.

## Live Demo

Production deployment: `https://world-cup-app-iota.vercel.app`

Project repository: `https://github.com/southflorida15/world-cup-app`

## Core Features

### Match Center

- Full 104-match World Cup 2026 schedule.
- Group-stage and knockout-stage match cards.
- Live status, final scores, match metadata, and TV information.
- Saved matches and match reminders.

### Live Scores

- Serverless `/api/livescores` endpoint.
- Primary source: `football-data.org`.
- Fallback source: Highlightly through RapidAPI, when available.
- Upstash Redis cache to avoid every user calling the upstream API directly.
- Smart TTL based on whether matches are live.
- Manual cache flush support for troubleshooting.

### Groups and Standings

- 12 official groups, A through L.
- Automatic standings calculation from match results.
- Points, goal difference, goals scored, wins, draws, losses, and qualification status.
- Best third-place team ranking support.

### Actual Bracket

- Official World Cup 2026 knockout structure.
- Round of 32 through Final.
- Uses group results and FIFA Annex C third-place mapping.
- Locked team indicators for confirmed teams.
- Provisional/leading team indicators where slots are not mathematically final.
- Automatic propagation through R16, QF, SF, and Final as actual results are known.

### My Bracket

- Manual bracket builder and simulator.
- Drag-and-drop group ordering.
- Select best third-place teams.
- Generate the knockout bracket.
- Pick winners round by round.
- Share bracket card.
- Local persistence using browser storage.

### Fantasy / Bolão

- Predict exact scores for tournament matches.
- Scoring rules:
  - 3 points for exact score.
  - 1 point for correct result.
  - Extra-time goals count.
  - Penalty shootout results do not change score-prediction scoring.
- Supports all 104 matches, not only the group phase.
- Knockout match cards appear chronologically.
- Future knockout matchups stay locked until both teams are actually known.
- Fantasy score picks do not populate the bracket; actual results do.

### Tournament Statistics

- Matches played out of 104.
- Total goals.
- Goals per match.
- Clean sheets.
- Most goals by team.
- Clean sheet leader.
- Highest-scoring match.
- Biggest win.
- Fastest goal, if reliable event data is available.
- Click-through cards for top-ranked stat details.

### Historical Team Statistics

- Team history from Zafronix data, with local continuity logic for historical country names.
- Merges historical records for countries whose football history is split across names in the API:
  - Germany + West Germany
  - Czech Republic / Czechia + Czechoslovakia
  - Serbia + Yugoslavia + Serbia and Montenegro
  - Russia + Soviet Union
  - DR Congo + Zaire
- Supports titles, appearances, finals, goals, tournament-by-tournament history, and top player records.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React + Vite |
| Hosting | Vercel |
| Serverless APIs | Vercel Functions |
| Cache | Upstash Redis |
| Live Scores | football-data.org, Highlightly fallback |
| Historical Stats | Zafronix |
| Flags | FlagCDN + fallback emoji flags |
| Tournament Engine | Custom JavaScript engine |
| Bracket Mapping | FIFA Annex C table |

## High-Level Architecture

```text
React App
  |
  |-- Static Data
  |     |-- Groups
  |     |-- Match schedule
  |     |-- Team metadata
  |
  |-- Tournament Engine
  |     |-- Standings
  |     |-- Best third-place teams
  |     |-- Annex C mapping
  |     |-- Knockout templates
  |
  |-- Serverless APIs
  |     |-- /api/livescores
  |     |-- /api/zafronix
  |     |-- /api/matchevents
  |     |-- /api/bracket-share
  |
  |-- External Sources
        |-- football-data.org
        |-- Zafronix
        |-- Highlightly
        |-- Upstash Redis
```

## Local Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Environment Variables

Configure these in Vercel and, if needed, in local `.env` files.

| Variable | Purpose |
| --- | --- |
| `FOOTBALL_DATA_API_KEY` | Primary live-score provider token |
| `RAPIDAPI_KEY` | Highlightly/RapidAPI fallback token |
| `RAPIDAPI_HOST` | RapidAPI host for fallback provider |
| `KV_REST_API_URL` | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | Upstash Redis REST token |
| `ZAFRONIX_API_KEY` | Zafronix API key, if required by proxy |

## Deployment

The app is deployed through Vercel and connected to the GitHub repository.

Typical workflow:

```bash
git add .
git commit -m "Describe the change"
git push
```

If Vercel does not automatically deploy from Git, use the deploy hook alias configured locally:

```bash
wcdeploy
```

## Documentation

Detailed documentation is available in `/docs`:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/TOURNAMENT_ENGINE.md`](docs/TOURNAMENT_ENGINE.md)
- [`docs/LIVE_SCORES.md`](docs/LIVE_SCORES.md)
- [`docs/FANTASY_MODE.md`](docs/FANTASY_MODE.md)
- [`docs/STATS_ENGINE.md`](docs/STATS_ENGINE.md)
- [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md)
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md)
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)

## Roadmap

See [`ROADMAP.md`](ROADMAP.md).

## Status

The app is actively evolving. The current priority is documentation, data accuracy, UI consistency, and maintainability before adding larger aspirational features such as a full World Cup Wiki.
