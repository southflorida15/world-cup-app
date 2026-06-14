# ⚽ World Cup 2026 Companion App

> **v2.1.0** — Released June 14, 2026  
> Unofficial fan project. Not affiliated with, endorsed by, or sponsored by FIFA.

A Progressive Web App (PWA) for the FIFA World Cup 2026™ — live scores, bracket picks, fantasy predictions, match events, lineups, and more.

**Live:** [world-cup-app-iota.vercel.app](https://world-cup-app-iota.vercel.app)

---

## What's New in v2.1

### 🟢 Live Match Cards
- **3px green border + glow** on live matches — unmistakable at a glance
- Green-tinted background on live cards
- Finished match cards consistently dimmed across both Live and Schedule tabs
- Finished scores shown in muted color, team names retain contrast
- Upcoming cards no longer dimmed on Live tab

### 📋 Match Card Polish
- Venue and TV broadcast text use `C.mid` for better readability on upcoming matches
- Footer border bumped to `b2` for clearer card separation
- All cards use `b2` border for better definition
- Finished card opacity `0.8` — readable but clearly settled

### 📅 Schedule Tab
- Group filter pills only appear when **Group** bubble is tapped (saves vertical space)
- All filter bubbles toggle — tap again to collapse
- Default view shows all matches with no filter expanded

### ⏱️ Injury Time Clock
- Extra time shows current elapsed extra minute: `90+5'`
- Parsed from ESPN's `displayClock` field (MM:SS format)

### 🏆 Bracket — Stability Fix
- Completely bypasses broken engine Annex C dependency
- R32 built directly from hardcoded FIFA template — no Wikipedia fetch, no runtime failures
- Storage key bumped to `v3` with version stamping for future forced resets

### ⚡ Live Score Responsiveness
- KV cache **bypassed entirely** within 10 minutes of kickoff
- `isKickoffImminent()` window: T-10min to T+20min
- Smart TTL: 30s when imminent, 60s with live matches, 1hr otherwise
- Today + tomorrow UTC dates fetched — midnight ET matches never missed

### 🔧 API & Data
- `matchevents.js` — `seed-ids` action, auto-seeds daily, 37 ESPN IDs stored
- `normESPN()` strips unicode accents — handles `Türkiye`, `Curaçao`, Bosnia variants
- `livescores.js` fetches both today + tomorrow UTC dates simultaneously

### 🎯 Fantasy Tab
- Result and Your Pick each have distinct pill-style boxes
- `YOUR PICK` label colored with outcome color (green/gold/red)

### 🧹 Code Cleanup
- Removed dead imports and unused components (`MatchActions`, `FantasyLeaderboard`, `BracketMatchCard`, `MatchDetailCard`)
- `loadAnnexCFromRemote()` removed, `annexStatus` replaced with constant
- `elapsedTotal` removed — ESPN doesn't expose total added time

---

## Features

### Live
- Real-time scores via ESPN public API
- Match status: pre-match, 1H, HT, 2H, ET, Pens, FT, AET
- Injury time display: `90+5'`
- Live cards with green border + glow, finished cards dimmed
- Pull-to-refresh

### Schedule
- Full 104-match schedule, group stage through Final
- Compact past-day cards, full cards for upcoming/today
- Countdown to kickoff, venue timezone display
- TV broadcast info (US and international)
- Calendar export (.ics)
- Filter bubbles toggle on/off (Group, Team, Venue, Round)

### Match Modal
- Venue, weather (°F/°C), broadcast
- Win probability (simulator)
- Match stats (10 metrics)
- Lineups: starting XI + bench + formation
- Match timeline: goals, cards, substitutions
- Save to My Matches, Share card

### Groups & Standings
- 12-group format (A–L)
- Live points, GD, GF, qualification tracking

### My Bracket
- Official FIFA 2026 bracket — R32 from hardcoded template (no Annex C dependency)
- Interactive tree view + compact mobile view
- Auto (simulator) and manual pick modes
- Storage versioning for forced resets

### Fantasy Picks (Bolão)
- Predict exact scores for every match
- Picks lock at kickoff
- Scoring: 3pts exact, 1pt correct result
- Global leaderboard, color-coded Result vs Your Pick

### Ask
- Natural language queries over schedule, results, stats, team data
- 20+ supported question types

### Stats
- Tournament facts (live)
- Team squad viewer (official rosters via Zafronix)
- H2H comparison, historical WC records per team

### WC News
- Multi-country news feed (10 locales), round-robin interleaved

### Odds & Simulator
- Championship odds (Polymarket)
- Match + tournament simulator (Poisson model with xG, form, venue)

---

## Architecture

### Frontend
- React 18 + Vite
- Single `src/App.jsx` (~6,600 lines) + 4 component files
- PWA — installable on iOS, Android, desktop

### Components (`src/components/`)
```
FantasyScoringRules.jsx
FantasyStatsSummary.jsx
MatchHeader.jsx
MatchInfoSection.jsx
```

### Backend (Vercel Serverless)
```
api/
├── livescores.js      # ESPN live scores, smart TTL, kickoff-imminent cache bypass
├── matchevents.js     # Events, stats, lineups, ESPN ID auto-seeding
├── predictor.js       # Fantasy picks + leaderboard
├── bracket-share.js   # Bracket sharing
├── news.js            # Multi-country WC news feed
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
- **Upstash Redis (KV)** — Live score cache, persisted match events, lineup cache, predictor data, bracket shares, ESPN ID map
- **localStorage** — Saved matches, bracket picks, user preferences

### Caching Strategy
| Data | TTL |
|------|-----|
| Live scores (4+ live) | 3min |
| Live scores (2+ live) | 2min |
| Live scores (1 live) | 60s |
| Kickoff imminent (T-10 to T+20) | bypass cache |
| No live matches | 1hr |
| Finished match events | Permanent |
| Pre-match lineups | 5min |
| Squad rosters | 6hr |
| ESPN ID map | Permanent |

---

## Deployment

```bash
git add -A && git commit -m "updates" && npx vercel --prod
```

- **Host:** Vercel Hobby
- **Repo:** `southflorida15/world-cup-app`
- **Live:** [world-cup-app-iota.vercel.app](https://world-cup-app-iota.vercel.app)

---

## Changelog

### v2.1.0 — June 14, 2026
- Live match cards: 3px green border + glow, green-tinted background
- Finished cards consistent across Live and Schedule tabs
- Bracket Annex C bypassed — R32 from hardcoded template
- Kickoff-imminent cache bypass for instant live score updates
- ESPN ID auto-seeding (7-day lookahead, daily refresh)
- Midnight ET matches always captured (dual-date ESPN fetch)
- Team name normalization with accent stripping
- Schedule filter bubbles toggle on/off
- Fantasy scored picks with distinct Result / Your Pick boxes
- Dead code cleanup (4 unused components, dead imports, stub functions)

### v2.0.0 — June 2026
- Bracket tree view redesign with exact geometry
- Lineups in match modal (from ESPN rosters)
- 20+ Ask tab query types
- Extra time display (`ET 90+7'`)
- Past-day compact cards (venue timezone)
- iOS scroll fix
- Tournament Facts moved to Stats tab

### v1.0 — June 2026
- Live scores, schedule, groups
- Fantasy Picks (Bolão)
- Bracket engine with Annex C
- Match events modal
- My Matches + notifications
- Cross-device sync
- WC News, Stats, Odds, Simulator

---

## License

Unofficial fan project. All World Cup trademarks, logos, team names and related intellectual property belong to their respective owners.
