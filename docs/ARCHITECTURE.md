# Architecture

The World Cup 2026 Companion App is a React/Vite application backed by several Vercel serverless APIs. The core design principle is that the browser should render and interact quickly, while expensive or rate-limited data access happens through shared server-side functions and cache layers.

## Architectural Goals

1. Keep the user experience mobile-first and fast.
2. Avoid direct browser calls to paid or rate-limited APIs.
3. Treat tournament logic as local deterministic logic, not as something owned by an external provider.
4. Keep actual results, fantasy picks, and user simulations separate.
5. Centralize historical-stat corrections in the API/data layer, not scattered across UI components.

## Main Layers

```text
User Interface
  |
  |-- React components
  |-- Tabs and cards
  |-- Mobile-specific layout behavior

Application State
  |
  |-- Live scores provider
  |-- Fantasy state
  |-- Saved matches
  |-- Bracket state

Tournament Engine
  |
  |-- Static schedule
  |-- Group standings
  |-- Third-place ranking
  |-- Annex C lookup
  |-- Knockout templates

Serverless Data Layer
  |
  |-- /api/livescores
  |-- /api/zafronix
  |-- /api/matchevents
  |-- /api/bracket-share

External Providers
  |
  |-- football-data.org
  |-- Zafronix
  |-- Highlightly/RapidAPI
  |-- Upstash Redis
```

## UI Layer

Most of the app currently lives in `src/App.jsx`. The file includes the main tabs, match rendering, stats, bracket UI, fantasy UI, and shared utilities.

This is functional but large. Future cleanup should gradually extract features into smaller files:

```text
src/
  components/
    MatchCard.jsx
    TeamSlot.jsx
    StatCard.jsx
    BracketMatch.jsx
  features/
    fantasy/
    bracket/
    stats/
    match-center/
  data/
  engine/
```

## Data Flow: Live Scores

```text
Browser
  |
  | fetch('/api/livescores')
  v
Vercel Function
  |
  | check Upstash Redis cache
  v
football-data.org / fallback provider
  |
  v
Normalized match objects
  |
  v
React LiveScoresProvider
  |
  v
Match cards, standings, stats
```

The key architectural decision is that all users share the same cached live-score response instead of each user consuming upstream API quota.

## Data Flow: Actual Bracket

```text
Completed group matches
  |
  v
Group standings
  |
  v
Top 2 from each group + best 8 third-place teams
  |
  v
FIFA Annex C mapping
  |
  v
Round of 32
  |
  v
Actual winners propagate through R16, QF, SF, Final
```

The Actual Bracket is source-backed. It should reflect real tournament status and should not be changed by personal fantasy picks.

## Data Flow: Fantasy

```text
Official match schedule
  |
  v
Resolved teams from actual bracket where available
  |
  v
Fantasy score-prediction cards
  |
  v
User predictions
  |
  v
Scoring against final actual scores
```

Fantasy score predictions do not determine who advances. Actual match results determine knockout progression.

## Data Flow: My Bracket

```text
User group ordering
  |
  v
User-selected best third-place teams
  |
  v
Generated bracket
  |
  v
Manual winner picks
  |
  v
Shareable bracket card
```

My Bracket is intentionally separate from Actual Bracket and Fantasy. It is a user simulation experience.

## Serverless API Layer

### `/api/livescores`

Normalizes live match data and caches it in Redis.

### `/api/zafronix`

Proxies historical and team data. Also owns historical alias merging such as Germany + West Germany.

### `/api/matchevents`

Provides event-level data where available, such as goals and potentially fastest-goal calculations.

### `/api/bracket-share`

Creates shareable bracket snapshots.

## Current Architectural Debt

1. `App.jsx` is very large and should be split over time.
2. Some static and dynamic data normalization still happens in UI code.
3. Data source limitations should be documented close to the relevant API module.
4. Design-system tokens exist but are not yet consistently applied everywhere.

## Recommended Next Refactors

1. Extract common card and stat components.
2. Extract fantasy feature into `src/features/fantasy`.
3. Extract tournament stats into `src/features/stats`.
4. Extract team rendering into a shared `TeamSlot` component.
5. Move static schedule data into `src/data/matches.js`.
6. Keep historical alias logic in `/api/zafronix.js`.
