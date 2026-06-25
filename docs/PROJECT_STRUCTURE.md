# Project Structure

This document explains the major files and folders in the app.

## Current Structure

```text
world-cup-app/
  api/
  public/
  src/
    components/
    data/
    engine/
    App.jsx
  package.json
  README.md
```

## `src/App.jsx`

Main React application file.

Currently contains:

- Main tabs
- Match center
- Groups
- Standings
- Actual Bracket
- My Bracket
- Fantasy
- Stats
- Shared utilities
- UI cards and layout logic

This file is large and should gradually be split into feature modules.

## `src/components/`

Reusable React components.

Known components include:

- `FantasyScoringRules`
- `FantasyStatsSummary`
- `MatchHeader`
- `MatchInfoSection`

Future components should include:

- `TeamSlot`
- `StatCard`
- `MatchCard`
- `BracketMatchCard`
- `SectionHeader`
- `PageHeader`

## `src/data/`

Static or semi-static data.

Known file:

- `wcTeamHistory.js`

This contains match-by-match historical World Cup data for selected teams and can be expanded over time.

Potential future files:

- `matches.js`
- `groups.js`
- `teams.js`
- `venues.js`
- `teamHonors.js`

## `src/engine/`

Tournament logic.

Known responsibilities:

- FIFA Annex C mapping
- Qualified third-place team selection
- Knockout templates
- Bracket generation

Important files:

- `annexC.js`
- `fifa2026Bracket.js`

## `api/`

Vercel serverless functions.

### `api/livescores.js`

Fetches and normalizes live-score data. Uses Redis caching.

### `api/zafronix.js`

Fetches historical team data and applies historical alias merges.

### `api/matchevents.js`

Fetches or normalizes event-level match data where available.

### `api/bracket-share.js`

Creates shareable bracket cards or snapshots.

## Recommended Future Structure

```text
src/
  app/
    App.jsx
    routes.js
  components/
    Card.jsx
    Button.jsx
    TeamSlot.jsx
    StatCard.jsx
  features/
    actual-bracket/
    fantasy/
    groups/
    live-scores/
    my-bracket/
    stats/
  data/
    groups.js
    matches.js
    teams.js
    venues.js
  engine/
    annexC.js
    standings.js
    knockout.js
    fantasyScoring.js
  hooks/
    useLiveScores.js
    useLocalStorage.js
  utils/
    dates.js
    teams.js
    formatting.js
```

## Refactor Principle

Do not rewrite the app all at once.

Extract one feature at a time:

1. Shared UI components.
2. Stats feature.
3. Fantasy feature.
4. Bracket feature.
5. Static data files.
