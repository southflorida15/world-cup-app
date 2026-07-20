# ⚽ World Cup 2026 Companion App

A live, mobile-first Progressive Web App for following the 2026 FIFA World Cup. Built with React/Vite and deployed on Vercel.

**Live:** [world-cup-app-iota.vercel.app](https://world-cup-app-iota.vercel.app)

---

## Features

### Live Data
- **Live scores** — auto-refreshing match cards with minute-by-minute status, goals, and match events
- **Match timeline** — goal scorers, cards, substitutions, and VAR events with period-relative time display (e.g. `75' (30' 2H)`)
- **Live badge** — pulsing indicator on any in-progress match
- **Persisted results** — finished scores stored in Redis so they survive ESPN feed expiry

### Schedule & Groups
- **Full schedule** — all 104 matches with venue, date/time in local timezone, and broadcast info
- **Group standings** — live tiebreaker-aware standings with clinch detection
- **Knockout bracket** — auto-resolves from live standings; three views: Compact, Tree, and Circle

### Bracket Views
- **Compact** — scrollable match list grouped by round
- **Tree** — traditional left-to-right bracket tree
- **Circle** — sunburst circular bracket with real flag images; winners advance inward ring by ring; gold lines trace each team's path; FIFA 3-letter codes label the outer ring

### My Bracket
- Build and save your own predicted bracket
- Drag-and-drop group ordering
- Scored against actual results

### Fantasy / Predictor
- Predict scorelines for every match
- Points system with leaderboard
- Cross-device sync via UUID + 6-digit PIN

### Team Profiles & Stats
- Team detail pages with squad info, group context, and recent form
- World Cup 2026 match history (auto-updates as knockout rounds are played)
- Pre-tournament friendly results as fallback

### Tournament Simulator
- Poisson-model match probability engine
- Monte Carlo tournament simulator
- Odds tab showing win probabilities

### Localization
- Full English / PT-BR toggle
- FIFA official team and stage name translations
- Period-relative match time in both languages (1H/2H/ET1/ET2 and 1T/2T/PT1/PT2)

### PWA
- Installable on iOS and Android
- Service worker with versioned cache (`wc2026-v7`)
- Offline-friendly for previously loaded data

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5 |
| Styling | Inline styles, CSS variables |
| State | React Context, `useState`/`useEffect` |
| Data | ESPN API (primary), Zafronix/RapidAPI (secondary) |
| Cache | Upstash Redis (`@upstash/redis`) |
| Deploy | Vercel (Hobby plan, 12-file API limit) |
| PWA | Custom service worker |
| Charts | Canvas 2D API (circular bracket) |

---

## Architecture

```
src/
  App.jsx                  # Main app shell, shared state, contexts
  tabs/                    # Extracted tab components
    SchedTab.jsx           # Schedule
    Bracket.jsx            # My Bracket + Actual Bracket (all three views)
    CircularBracket.jsx    # Canvas-based sunburst bracket
    Stats.jsx              # Team stats & profiles
    GrpTab.jsx             # Group standings
    Simulator.jsx          # Tournament simulator
    Odds.jsx               # Win probability odds
    Fantasy.jsx            # Predictor / fantasy tab
    WCNews.jsx             # News feed
    Ask.jsx                # AI assistant tab
    MyWorldCupTab.jsx      # Personal match tracker
  engine/
    fifa2026Bracket.js     # Bracket slot templates and resolution logic
    annexC.js              # Annex C third-place qualification mapping
  i18n/
    display.js             # Display-only localization (team names, stages, venues, minutes)

api/                       # Vercel serverless functions
  livescores.js            # ESPN live feed + Redis persistence
  matchevents.js           # Match timeline events
  predictor.js             # Fantasy prediction storage
  ...

public/
  sw.js                    # Service worker (cache versioning)
```

### Key Architectural Constraints
- **Vercel Hobby plan**: 12 serverless function file limit — API files are carefully budgeted
- **No paid APIs**: ESPN public endpoints as primary source; Zafronix/RapidAPI as secondary
- **Redis namespacing**: `wc2026:` prefix for match data; `scce:` for SCCE planner (separate app, shared Redis instance)
- **Score persistence**: Finished match scores are written to Redis so they survive the ESPN feed expiry window

---

## Development

```bash
npm install
npm run dev        # local dev server
npm run build      # production build
npm run check      # syntax check
```

Deploy by pushing to `main` (GitHub integration) or:
```bash
vercel --prod      # bypass GitHub integration quota
```

### Environment Variables
```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RAPIDAPI_KEY=          # Zafronix secondary feed
```

---

## Authors

Built by **Felipe Maldonado Garcia** with AI-assisted development (Claude, Anthropic).

---

## License

Private repository. All rights reserved.
