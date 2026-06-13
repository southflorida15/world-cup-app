# ⚽ World Cup 2026 Companion App

> **v2.0** — Released June 2026  
> Unofficial fan project. Not affiliated with, endorsed by, or sponsored by FIFA.

A Progressive Web App (PWA) for the FIFA World Cup 2026™ — live scores, bracket picks, fantasy predictions, match events, lineups, and more.

**Live:** [world-cup-app-iota.vercel.app](https://world-cup-app-iota.vercel.app)

---

## What's New in V2

### 🏟️ Bracket — Complete Redesign
- Full interactive tree view with mathematically precise geometry
- Correct FIFA 2026 pairing order derived from the official bracket engine (Annex C)
- Date, time, and venue shown on every bracket card
- CSS-based L-shaped connectors (no SVG overflow issues)
- Final card aligned and connected to both SF cards
- Picks now persist correctly — cascade only triggers when changing an existing pick
- "tap a team to pick the winner" hint

### 📋 Match Cards
- Whole card is tappable to open the match modal
- Compact past-day cards — header retained, footer removed (venue timezone-aware)
- Countdown timer appears 30 minutes before kickoff
- `isPastDay` uses the venue's local timezone, not EDT

### 📊 Match Modal
- Save ⭐ and Share 📤 moved to icon buttons in the top-left
- Venue + weather in a single compact row; weather taps to weather.com
- Broadcast in a single compact row
- Venue/weather/broadcast hidden for past-day matches
- Collapsible match timeline with filter pills (Goals / Cards / Subs)
- Expanded match stats: Shots, Shots on Target, Saves, Corners, Fouls, Offsides, Passes, Pass Accuracy
- **Lineups section** — Starting XI, bench, jersey numbers, formation, substitution indicators (↑↓)

### 🔴 Live
- Extra time displays correctly: `🔴 ET 90+7'`
- Live tab icon pulses when matches are in progress
- Feed-first logic — no phantom "live" indicators when ESPN returns a result

### 🔍 Ask Tab — Natural Language Queries
20+ questions now answered from real app data:
- First-time World Cup teams & long-absent nations
- Most international caps at this tournament
- Top players by international goals
- WC title holders
- Head coaches per team or all teams
- Teams by confederation (UEFA, CONMEBOL, CAF, AFC, CONCACAF)
- Championship odds (Polymarket)
- Strongest teams (simulator ratings)
- Best form teams (last 5 games)
- Total goals scored + avg per match
- Highest scoring matches
- Biggest wins
- Unbeaten teams / teams with wins
- How many matches remain
- All-time WC top scorers per team
- Historical team vs team queries
- Schedule by date, city, group, team, time
- Questions wrap on mobile — no horizontal scroll

### 📈 Stats Tab
- Tournament Facts card moved here from WC News (goals, clean sheets, highest-scoring match, biggest win)

### ⚙️ API Changes
- `matchevents.js` — parses and returns lineups from ESPN (`data.rosters`); pre-match lineups cached with 5min TTL
- `matchevents.js` — adds `passes` to stats parser
- `livescores.js` — parses `elapsedExtra` for injury time display

### 🐛 Fixes
- iOS Safari scroll fixed — `PullToRefresh` no longer blocks native vertical scroll
- Saved tab match cards tappable to open modal
- Ask tab build error fixed (missing `if` wrapper)

---

## Features

### Live
- Real-time scores via ESPN public API
- Match status: pre-match, 1H, HT, 2H, ET, Pens, FT, AET
- Injury time and extra time display
- Live tab pulses when games are active
- Pull-to-refresh

### Schedule
- Full 104-match schedule
- Group stage through Final
- Compact past-day cards, full cards for upcoming/today
- Countdown to kickoff
- Venue timezone display
- TV broadcast info (US and international)
- Calendar export (.ics)

### Match Modal
- Match info: venue, weather (°F/°C), broadcast
- Win probability (simulator)
- Match stats (10 metrics)
- Lineups: starting XI + bench + formation
- Match timeline: goals, cards, substitutions
- Save to My Matches
- Share card (OG image)

### Groups & Standings
- 12-group format (A–L)
- Live points, GD, GF, qualification tracking

### My Bracket
- Official FIFA 2026 bracket with Annex C support
- Interactive tree view + compact mobile view
- Auto (simulator) and manual pick modes
- Bracket sharing card

### Fantasy Picks (Bolão)
- Predict exact scores for every match
- Picks lock at kickoff
- Scoring: 3pts exact, 1pt correct result
- Global leaderboard

### Ask
- Natural language queries over schedule, results, stats, team data
- 20+ supported question types

### Stats
- Tournament facts (live)
- Team squad viewer (official rosters via Zafronix)
- H2H comparison
- Historical WC records per team

### WC News
- World Cup news feed

### Odds & Simulator
- Championship odds (Polymarket)
- Match simulator (Poisson model with xG, form, venue)
- Tournament simulator

---

## Architecture

### Frontend
- React 18 + Vite
- Single `src/App.jsx` (~6,400 lines) + component files
- PWA — installable on iOS, Android, desktop

### Backend (Vercel Serverless)
```
api/
├── livescores.js      # ESPN live scores + elapsedExtra
├── matchevents.js     # Events, stats, lineups (ESPN)
├── predictor.js       # Fantasy picks + leaderboard
├── bracket-share.js   # Bracket sharing
├── news.js            # WC news feed
├── sync.js            # Cross-device sync
├── push.js            # Push notifications
├── zafronix.js        # Squad rosters + team data
├── og.js              # Share card image
└── admin.js           # Admin utilities
```

### Data Sources
- **ESPN** — Live scores, match events, lineups (free public API)
- **Zafronix** — Official squad rosters
- **Open-Meteo** — Venue weather
- **GNews** — World Cup news
- **Polymarket** — Championship odds

### Storage
- **Upstash Redis (KV)** — Live score cache, persisted match events, lineup cache, predictor data, bracket shares
- **localStorage** — Saved matches, bracket picks, user preferences

### Caching Strategy
| Data | TTL |
|------|-----|
| Live scores | 30s |
| Finished match events | Permanent |
| Pre-match lineups | 5min |
| Squad rosters | 6hr |
| News | 15min |

---

## Changelog

### v2.0 — June 2026
- Bracket tree view redesign with exact geometry
- Lineups in match modal (from ESPN rosters)
- 20+ Ask tab query types
- Extra time display (`ET 90+7'`)
- Past-day compact cards (venue timezone)
- iOS scroll fix
- Tournament Facts moved to Stats tab
- Picks persistence fix

### v1.0 — June 2026
- Live scores, schedule, groups
- Fantasy Picks (Bolão)
- Bracket engine with Annex C
- Match events modal
- My Matches + notifications
- Cross-device sync
- WC News, Stats, Odds, Simulator

---

## Deployment

- **Host:** Vercel Hobby
- **Repo:** `southflorida15/world-cup-app`
- **Live:** [world-cup-app-iota.vercel.app](https://world-cup-app-iota.vercel.app)
- Auto-deploys on push to `main`

---

## License

Unofficial fan project. All World Cup trademarks, logos, team names and related intellectual property belong to their respective owners.
