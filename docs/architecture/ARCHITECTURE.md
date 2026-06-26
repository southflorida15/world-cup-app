# Architecture

The app is a Vite + React single-page application deployed on Vercel. It combines static tournament structure, live score data, fantasy predictions, historical statistics, and FIFA 2026 knockout logic.

![App Architecture](../diagrams/APP_ARCHITECTURE.svg)

## Core layers

### 1. React UI

The UI renders tabs such as schedule, groups, actual bracket, fantasy, stats, saved matches, and match detail views.

### 2. Tournament engine

The engine owns tournament rules:

- 12 groups, A-L
- 72 group-stage matches
- 8 best third-place teams
- FIFA Annex C mapping
- Round of 32 placement
- Knockout propagation through Final

### 3. Serverless API layer

Vercel functions protect API keys, normalize provider responses, and reduce provider calls through caching.

### 4. Data providers

- football-data.org for live match schedules/scores.
- Highlightly/RapidAPI as a fallback.
- Zafronix for World Cup historical team data.
- static local data for team metadata, flags, and engine tables.

## Key principle

External APIs update data, but they should not control tournament rules. FIFA format logic belongs inside the local engine.
