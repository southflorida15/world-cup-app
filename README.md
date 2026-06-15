# ⚽ World Cup 2026 Companion App

> **v2.1.0** — Released June 14–15, 2026  
> Unofficial fan project. Not affiliated with, endorsed by, or sponsored by FIFA.

A Progressive Web App (PWA) for the FIFA World Cup 2026™ — live scores, bracket picks, fantasy predictions, match events, lineups, push notifications, and more.

**Live:** [world-cup-app-iota.vercel.app](https://world-cup-app-iota.vercel.app)  
**Admin:** [world-cup-app-iota.vercel.app/admin](https://world-cup-app-iota.vercel.app/admin)

---

## What's New in v2.1

### 🔔 Push Notification System
- **Automatic 30-min kickoff alerts** — external cron every 15 min, 11AM–11PM ET
- Users save matches + tap "Notify all" once to subscribe
- Works on desktop and mobile (no PWA install required)
- **Broadcast** — admin sends to all subscribers at once
- **Individual by PIN** — target specific users by 6-digit PIN
- `knownUids` registry links all devices under a single PIN
- Push subscriptions store UID + PIN for reliable multi-device matching
- Smart onboarding popup with 5-second delay, dismissible, re-shows Jun 18
- **Notification inbox** — bell icon in header shows received notifications
- Smart empty state: detects subscription + saved match status
- Service worker stores messages, broadcasts to open windows
- Notification tap focuses existing PWA window (iOS fix)

### 📱 Cross-Device Sync
- Auto-pull on every app open — always shows latest saved matches from KV
- PIN-based sync: enter PIN on any device to restore all data
- Last-write-wins — most recent change always wins across devices
- Syncs: saved matches, favorites, bracket, dark mode, display name, avatar

### 🛍️ Shop Tab
- New tab after Fantasy with affiliate integrations
- **Fubo** — Watch Live (placeholder until approved)
- **NordVPN** — Watch Abroad (placeholder until approved)
- **Hard Rock Bet** — geo-gated to FL + 9 states (21+)
- **Amazon** — collapsible merchandise accordion
- Fan Shop section at bottom of WC News tab
- Amazon Associates tag: `worldcupapp-20`

### 🟢 Live Match Cards
- 3px green border + glow on live matches
- Finished cards consistently dimmed across Live and Schedule tabs
- Finished scores in muted color, team names retain contrast
- Upcoming cards no longer dimmed on Live tab

### 📋 Match Card Polish
- Venue and TV text use `C.mid` for better readability
- All cards use `b2` border for better definition
- Finished card opacity `0.8`

### 📅 Schedule Tab
- Group filter pills only appear when Group bubble tapped
- All filter bubbles toggle on/off
- Default shows all matches unfiltered

### ⏱️ Injury Time
- Shows current elapsed extra minute: `90+5'`
- Parsed from ESPN `displayClock` field

### 🏆 Bracket Stability Fix
- Bypasses broken Annex C engine entirely
- R32 from hardcoded FIFA template
- Storage key `v3` with version stamping

### ⚡ Live Score Responsiveness
- KV cache bypassed within 10 min of kickoff
- Smart TTL: 30s imminent, 60s live, 1hr otherwise
- Yesterday + today + tomorrow fetched from ESPN

### 🔧 ESPN ID System
- Livescores KV checked first (correct real IDs)
- Hardcoded map as last resort only
- `seed-ids` action — 7-day lookahead
- Auto-seeds daily on first request

### 🎯 Fantasy Tab
- Result and Your Pick in distinct pill-style boxes
- Color-coded outcome labels
- All finished matches shown in Scored tab

### 🌍 City Detection
- Primary: `ip-api.com` (HTTPS, 45 req/min, no daily cap)
- Fallback: `ipapi.co`

---

## Features

### Live
- Real-time scores via ESPN public API
- Injury time: `90+5'`, match status labels
- Live cards: green border + glow, finished dimmed
- Pull-to-refresh with direction lock (no accidental triggers)

### Schedule
- 104 matches, timezone display, calendar export (.ics)
- Toggle filter bubbles (Group, Team, Venue, Round)
- Compact past-day cards, countdown to kickoff

### Match Modal
- Venue, weather (°F/°C), broadcast info
- Win probability (simulator)
- Timeline opens by default; Lineups + Stats on demand

### Groups & Standings
- 12-group format (A–L), live points, GD, GF

### My Bracket
- Official FIFA R32 from hardcoded template
- Auto-simulation or manual picks
- Tree view + compact mobile view

### Fantasy Picks (Bolão)
- Predict exact scores, picks lock at kickoff
- 3pts exact, 1pt correct result
- Color-coded Result vs Your Pick display

### My Matches + Notifications
- Save any match, export to calendar
- Push notifications: auto 30-min kickoff alerts
- Notification inbox in header bell icon
- Re-subscribe anytime via "Notify all" (always fresh)

### Shop (Affiliate)
- Fubo, NordVPN, Hard Rock Bet (geo-gated)
- Amazon Associates: jerseys, balls, decor, devices, merch
- Fan Shop in WC News tab footer

### Ask, Stats, WC News, Odds, Simulator
- Natural language queries (20+ types)
- Squad viewer, H2H, historical records
- Multi-country news (10 locales)
- Championship odds (Polymarket)
- Poisson match + tournament simulator

---

## Architecture

### Frontend
- React 18 + Vite
- Single `src/App.jsx` (~6,900 lines) + 4 component files
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
├── livescores.js      # ESPN scores, kickoff-imminent bypass, 3-day fetch
├── matchevents.js     # Events, stats, lineups, ESPN ID seeding
├── predictor.js       # Fantasy picks + leaderboard
├── push.js            # Subscriptions, broadcast, individual PIN, cron notify
├── bracket-share.js   # Bracket sharing
├── news.js            # Multi-country WC news
├── sync.js            # Cross-device sync (PIN + magic link)
├── zafronix.js        # Squad rosters
├── og.js              # Share card image
└── admin.js           # Analytics, live ops, ESPN ID editor, push mgmt
```

### Data Sources
- **ESPN** — Live scores, match events, lineups (free public API)
- **Zafronix** — Official squad rosters
- **Open-Meteo** — Venue weather
- **ip-api.com** — City/region detection (HTTPS)
- **GNews** — World Cup news
- **Polymarket** — Championship odds

### Caching Strategy
| Data | TTL |
|------|-----|
| Live scores (4+ live) | 3 min |
| Live scores (2+ live) | 2 min |
| Live scores (1 live) | 60s |
| Kickoff imminent (T-10 to T+20) | bypass |
| No live matches | 1 hr |
| Finished match events | Permanent |
| Squad rosters | 6 hr |
| ESPN ID map | Permanent |
| Push subscriptions | 90 days |

---

## Push Notification System

### User flow
1. Save matches in My Matches
2. Tap "Notify all" → subscription saved with UID + PIN + knownUids
3. External cron hits `/api/push?action=notify` every 15 min
4. Matches 25-35 min from kickoff trigger notifications
5. Tap notification → app opens, message appears in inbox

### Admin (individual)
- Enter PIN in admin → Send to User
- Matches all devices registered under that PIN via `knownUids`

### Cron schedule
```
*/15 11-23 * * *  (America/New_York timezone)
```
URL: `https://world-cup-app-iota.vercel.app/api/push?action=notify`  
Auth: `Authorization: Bearer $CRON_SECRET`

### Notification onboarding popup
- Shows 5 seconds after app load on Live tab
- Dismissed permanently (stores timestamp in localStorage)
- Re-shows on Jun 18 for users who dismissed before that date
- Two states: "not subscribed" (gold) and "subscribed but no matches" (green)

---

## Admin Dashboard (`/admin`)

Password-protected. All actions via POST with Bearer token.

### ⚙️ Analytics Tools
- Mark device as admin/test
- Reset analytics
- Pills: Daily Visitors, Tab Usage, Accounts, Predictor Users, All Visitors

### 🔧 Live Operations
- Flush Livescores Cache
- Seed Livescores (writes all FT results to KV)
- Seed ESPN IDs (7-day lookahead)
- Active Users Now (last 30 min)
- View Push Subscriptions (uid, pin, matchCount per sub)
- Persisted Results: view / set / delete
- Force Re-score All Picks
- ESPN ID Map: view / set / delete

### 🔔 Push Notifications
- Broadcast to all subscribers
- Individual by PIN or UID
- Result boxes stay open (explicit ✕ close button)

---

## Deployment

```bash
git add -A && git commit -m "updates" && npx vercel --prod
```

- **Host:** Vercel Hobby
- **Repo:** `southflorida15/world-cup-app`
- **Live:** [world-cup-app-iota.vercel.app](https://world-cup-app-iota.vercel.app)

---

## Affiliate Links

| Partner | Status | Details |
|---------|--------|---------|
| Amazon Associates | ✅ Active | Tag: `worldcupapp-20` · 10% commission |
| Fubo TV | ⏳ Pending | Watch Live streaming |
| NordVPN | ⏳ Pending | Watch Abroad |
| Hard Rock Bet | ⏳ Pending | FL + 9 states · 21+ |
| Fanatics Merchandise | ⏳ Pending | Official WC gear |
| Fanatics Sportsbook | ⏳ Pending | 23 states |

Swap placeholders in `AFFILIATE` config at top of `ShopTab` component in App.jsx.

---

## Changelog

### v2.1.0 — June 14–15, 2026
- Full push notification system (broadcast + individual PIN + auto kickoff)
- Notification inbox with smart empty state
- Cross-device sync: auto-pull on every app open
- Shop tab with Amazon affiliate + placeholder partners
- Live match cards: 3px green border + glow
- Bracket Annex C bypassed — R32 from hardcoded template
- Kickoff-imminent cache bypass
- ESPN ID livescores-first priority, daily auto-seed
- City detection via ip-api.com (HTTPS)
- Schedule filter bubbles toggle
- Fantasy scored picks with Result/Your Pick boxes
- Admin: push management, ESPN ID editor, result editor
- Notification onboarding popup (5s delay, dismissible, Jun 18 re-show)
- Dead code cleanup

### v2.0.0 — June 2026
- Bracket tree redesign, lineups in match modal
- 20+ Ask tab query types, extra time display
- Past-day compact cards, iOS scroll fix

### v1.0 — June 2026
- Live scores, schedule, groups, fantasy, bracket
- Match events, My Matches, cross-device sync
- WC News, Stats, Odds, Simulator

---

## License

Unofficial fan project. All World Cup trademarks belong to their respective owners.
