# ⚽ World Cup 2026 Companion App

> **v2.1.0** — Released June 14, 2026  
> Unofficial fan project. Not affiliated with, endorsed by, or sponsored by FIFA.

A Progressive Web App (PWA) for the FIFA World Cup 2026™ — live scores, bracket picks, fantasy predictions, match events, lineups, push notifications, and more.

**Live:** [world-cup-app-iota.vercel.app](https://world-cup-app-iota.vercel.app)  
**Admin:** [world-cup-app-iota.vercel.app/admin](https://world-cup-app-iota.vercel.app/admin)

---

## What's New in v2.1

### 🔔 Push Notifications (Full System)
- **Automatic 30-min kickoff alerts** — cron runs every 15 min during match hours (11AM–11PM ET)
- Users save matches + tap "Notify all" once to subscribe
- **Broadcast** — admin sends to all subscribers at once
- **Individual by PIN** — admin targets specific users by their 6-digit PIN
- Push subscriptions store UID + PIN for reliable multi-device matching
- `knownUids` registry links all devices under a single PIN
- Service worker updated to focus existing PWA window on notification tap (iOS fix)

### 🛍️ Shop Tab
- New tab after Fantasy with affiliate integrations
- **Fubo** — Watch Live (placeholder until approved)
- **NordVPN** — Watch Abroad (placeholder until approved)
- **Hard Rock Bet** — Bet on It, geo-gated to 10 eligible states
- **Amazon** — collapsible merchandise accordion (Jerseys, Balls, Watch Party Decor, Streaming Devices, WC Merchandise)
- Fan Shop section at bottom of WC News tab
- Amazon Associates tag: `worldcupapp-20`
- Affiliate disclaimer on all pages

### 🟢 Live Match Cards
- **3px green border + glow** on live matches
- Green-tinted background on live cards
- Finished cards consistently dimmed across Live and Schedule tabs
- Finished scores shown in `C.mid` color
- Upcoming cards no longer dimmed on Live tab

### 📋 Match Card Polish
- Venue and TV text use `C.mid` for better readability
- All cards use `b2` border for better definition
- Finished card opacity `0.8`

### 📅 Schedule Tab
- Group filter pills only appear when Group bubble is tapped
- All filter bubbles toggle on/off
- Default view shows all matches with no filter expanded

### ⏱️ Injury Time Clock
- Shows current elapsed extra minute: `90+5'`
- Parsed from ESPN's `displayClock` field

### 🏆 Bracket — Stability Fix
- Bypasses broken engine Annex C dependency entirely
- R32 built from hardcoded FIFA template
- Storage key `v3` with version stamping

### ⚡ Live Score Responsiveness
- KV cache bypassed within 10 min of kickoff (`isKickoffImminent`)
- Smart TTL: 30s imminent, 60s live, 1hr otherwise
- Yesterday + today + tomorrow fetched from ESPN

### 🔧 ESPN ID System
- Livescores KV checked first (correct real IDs)
- Hardcoded map as last resort only
- `seed-ids` action pre-populates 7-day lookahead
- Auto-seeds daily on first request

### 🎯 Fantasy Tab
- Result and Your Pick in distinct pill-style boxes
- Color-coded outcome labels (green/gold/red)
- All 10+ finished matches shown in Scored tab

### 🌍 City Detection
- Switched from `ipapi.co` (1k/day limit) to `ip-api.com` (45/min, no daily cap)
- Fallback to `ipapi.co` if primary fails

### 🧹 Code Cleanup
- Removed dead imports and unused components
- `loadAnnexCFromRemote()` removed
- `annexStatus` replaced with constant
- `elapsedTotal` removed

---

## Admin Dashboard (`/admin`)

Protected by admin secret. Features:

### ⚙️ Analytics Tools
- Mark device as admin/test (excludes from analytics)
- Reset analytics
- Pills: Daily Visitors, Tab Usage, Accounts, Predictor Users, All Visitors

### 🔧 Live Operations
- **Flush Livescores Cache** — force fresh ESPN fetch
- **Seed Livescores** — write all FT results to KV
- **Seed ESPN IDs** — populate 7-day ID map
- **Active Users Now** — who's on in last 30 min
- **View Push Subs** — inspect all push subscriptions
- **Persisted Results** — view/set/delete match results
- **Force Re-score** — re-run fantasy scoring
- **ESPN ID Map** — view/set/delete event IDs

### 🔔 Push Notifications
- **Broadcast** — send to all subscribers
- **Individual** — send by PIN or UID
- Click-to-close result boxes with explicit ✕ button

---

## Features

### Live
- Real-time scores via ESPN public API
- Match status: 1H, HT, 2H, ET, Pens, FT, AET
- Injury time: `90+5'`
- Live cards with green border + glow
- Pull-to-refresh with direction lock

### Schedule
- Full 104-match schedule
- Compact past-day cards
- Countdown to kickoff, venue timezone
- TV broadcast info (US and international)
- Calendar export (.ics)
- Toggle filter bubbles (Group, Team, Venue, Round)

### Match Modal
- Venue, weather (°F/°C), broadcast
- Win probability (simulator)
- Match stats, lineups, timeline
- Timeline opens by default

### Groups & Standings
- 12-group format (A–L)
- Live points, GD, GF, qualification

### My Bracket
- R32 from hardcoded FIFA template
- Interactive tree + compact mobile view
- Auto and manual pick modes

### Fantasy Picks (Bolão)
- Predict exact scores, lock at kickoff
- 3pts exact, 1pt correct result
- Color-coded Result vs Your Pick

### Shop
- Fubo, NordVPN, Hard Rock Bet (geo-gated)
- Amazon affiliate categories
- Fan Shop in WC News tab

### Ask, Stats, WC News, Odds, Simulator
- Natural language queries
- Squad viewer, H2H, historical records
- Multi-country news feed
- Championship odds (Polymarket)
- Poisson match + tournament simulator

---

## Architecture

### Frontend
- React 18 + Vite
- Single `src/App.jsx` (~6,800 lines) + 4 component files
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
├── livescores.js      # ESPN scores, kickoff-imminent bypass, yesterday+today+tomorrow
├── matchevents.js     # Events, stats, lineups, ESPN ID auto-seeding
├── predictor.js       # Fantasy picks + leaderboard
├── push.js            # Push subscriptions, broadcast, individual by PIN/UID, notify cron
├── bracket-share.js   # Bracket sharing
├── news.js            # Multi-country WC news
├── sync.js            # Cross-device sync
├── zafronix.js        # Squad rosters
├── og.js              # Share card image
└── admin.js           # Analytics, live ops, push management
```

### Data Sources
- **ESPN** — Live scores, match events, lineups
- **Zafronix** — Official squad rosters
- **Open-Meteo** — Venue weather
- **GNews** — World Cup news
- **Polymarket** — Championship odds
- **ip-api.com** — Geo/city detection

### Caching Strategy
| Data | TTL |
|------|-----|
| Live scores (4+ live) | 3min |
| Live scores (2+ live) | 2min |
| Live scores (1 live) | 60s |
| Kickoff imminent (T-10 to T+20) | bypass |
| No live matches | 1hr |
| Finished match events | Permanent |
| Squad rosters | 6hr |
| ESPN ID map | Permanent |

---

## Push Notification System

### How it works
1. User saves matches in My Matches
2. User taps "Notify all" → subscription saved with UID + PIN
3. External cron hits `/api/push?action=notify` every 15 min (11AM–11PM ET)
4. Matches in 25-35 min window get notifications sent
5. Tapping notification focuses existing PWA window

### Individual notifications (admin)
- Enter PIN in admin → **Send to User**
- PIN lookup finds all devices registered under that PIN via `knownUids`
- Works across multiple devices per user

### Cron schedule
```
*/15 11-23 * * *  (America/New_York)
```
Hits: `https://world-cup-app-iota.vercel.app/api/push?action=notify`  
Auth: `Authorization: Bearer $CRON_SECRET`

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

| Partner | Status | Tag/URL |
|---------|--------|---------|
| Amazon Associates | ✅ Active | `worldcupapp-20` |
| Fubo | ⏳ Pending | Placeholder |
| NordVPN | ⏳ Pending | Placeholder |
| Hard Rock Bet | ⏳ Pending | Placeholder (FL + 9 states) |

Swap placeholders in `AFFILIATE` config at top of `ShopTab` component.

---

## Changelog

### v2.1.0 — June 14–15, 2026
- Full push notification system (broadcast + individual by PIN)
- Automatic 30-min kickoff alerts via external cron
- Shop tab with Amazon affiliate + placeholder streaming/betting links
- Live match cards: 3px green border + glow
- Finished cards consistent across Live and Schedule tabs
- Bracket Annex C bypassed — R32 from hardcoded template
- Kickoff-imminent cache bypass for instant live scores
- ESPN ID livescores-first priority, daily auto-seed
- City detection via ip-api.com
- Schedule filter bubbles toggle
- Fantasy scored picks with Result/Your Pick boxes
- Admin dashboard: push management, ESPN ID editor, result editor
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
