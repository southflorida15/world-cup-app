# ⚽ World Cup 2026 Companion App

> **v2.2.0** — Released June 16, 2026  
> Unofficial fan project. Not affiliated with, endorsed by, or sponsored by FIFA.

A Progressive Web App (PWA) for the FIFA World Cup 2026™ — live scores, bracket picks, fantasy predictions, match events, lineups, push notifications, fantasy leagues, and more.

**Live:** [world-cup-app-iota.vercel.app](https://world-cup-app-iota.vercel.app)  
**Admin:** [world-cup-app-iota.vercel.app/admin](https://world-cup-app-iota.vercel.app/admin)

---

## What's New in v2.2

### 🏆 Fantasy Leagues
- Create private leagues with a custom name — get a 6-character invite code
- Join leagues via code or shareable invite link (`/?join=CODE`)
- Full onboarding flow for new users joining via invite link: name → PIN → notifications → done
- League leaderboard with Points, Exact, Correct, Accuracy per member
- Your rank displayed prominently in each league
- Invite section: copy code or share link directly
- **Global league** — always visible, shows all app users ranked
- Smart UI: 0 leagues → Global + Create/Join; 1 league → straight to leaderboard; 2+ leagues → list with Global at bottom
- PIN required to join/create leagues
- Admin: migrate all existing fantasy users to a league, add/remove by PIN, view all leagues
- Default league: "Brazucas em Broward" (code: `BRZBRD`)

### 🔔 Push Notification Improvements
- Cron fixed from GET → POST (was silently failing)
- PIN-based individual notifications working across all devices
- `knownUids` registry links all devices under one PIN
- Subscribe on desktop without PWA install required
- Smart re-subscribe: "All set!" button always re-runs subscription flow
- Notification inbox: bell icon in header, smart empty state (3 states based on subscription status)
- Onboarding popup: 5s delay, dismissible, re-shows Jun 18 for users who dismissed before

### 🎯 Fantasy Tab Polish
- Leagues pill moved to first position in filter row
- My Teams pill removed from Fantasy filters
- Stats disclaimer banner removed
- Per-league stats (Points, Exact, Correct, Accuracy) shown in each league view for multi-league users

### ⚽ Scoring Fix
- Knockout stage: extra time goals count toward fantasy score
- Penalty shootout results do NOT count (only regular + extra time)
- Uses `score.extratime ?? score.fulltime ?? goals` priority

### 🃏 Match Card Modal
- Smooth scrolling fixed on iOS (overscrollBehavior: contain)
- Dynamic height — shrinks to fit content, maxes at screen height
- 3px side margins, rounded corners on all sides
- Pills equally distributed: Timeline wider to fit events summary
- Single ✕ button, no double-tap needed
- Score display: `2 – 2` with spaces around dash

### 📋 Schedule
- 12AM ET matches display correctly (group under previous day)
- Midnight UTC timestamps fixed (03:59 → correct display)

### 🌍 Other
- ip-api.com switched to HTTPS (was blocked as mixed content)
- ESPN ID auto-seed covers 7-day lookahead
- Admin dashboard: league management section, notification column in accounts table

---

## Features

### Live
- Real-time scores via ESPN public API
- Injury time `90+5'`, match status labels
- Live cards: green border + glow, finished dimmed
- Pull-to-refresh with direction lock

### Schedule
- 104 matches, timezone display, calendar export (.ics)
- Toggle filter bubbles (Group, Team, Venue, Round)
- Compact past-day cards, countdown to kickoff

### Match Modal
- Venue, weather (°F/°C), broadcast info
- Win probability, timeline, lineups, match stats
- Dynamic height, smooth iOS scroll, swipe-aware

### Groups & Standings
- 12-group format (A–L), live points, GD, GF

### My Bracket
- Official FIFA R32 from hardcoded template
- Auto-simulation or manual picks

### Fantasy Picks (Bolão)
- Predict exact scores, picks lock at kickoff
- 3pts exact, 1pt correct result, extra time counts, penalties don't
- Color-coded Result vs Your Pick

### 🏆 Fantasy Leagues
- Private leagues with invite codes/links
- Global league for all users
- Per-league leaderboard with personal stats
- New user onboarding via invite link

### My Matches + Notifications
- Save any match, export to calendar
- Push notifications: 30-min kickoff alerts
- Notification inbox with smart empty state

### Shop (Affiliate)
- Amazon Associates: `worldcupapp-20`
- Fubo, NordVPN, Hard Rock Bet (geo-gated, pending approval)

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
- Single `src/App.jsx` (~7,700 lines) + 4 component files
- PWA — installable on iOS, Android, desktop

### Backend (Vercel Serverless)
```
api/
├── livescores.js      # ESPN scores, kickoff-imminent bypass, 3-day fetch
├── matchevents.js     # Events, stats, lineups, ESPN ID seeding
├── predictor.js       # Fantasy picks + leaderboard
├── league.js          # Fantasy leagues: create, join, leave, leaderboard
├── push.js            # Subscriptions, broadcast, individual PIN, cron notify
├── bracket-share.js   # Bracket sharing
├── news.js            # Multi-country WC news
├── sync.js            # Cross-device sync (PIN + magic link)
├── zafronix.js        # Squad rosters
├── og.js              # Share card image
└── admin.js           # Analytics, live ops, ESPN ID editor, push + league mgmt
```

### Data Sources
- **ESPN** — Live scores, match events, lineups
- **Zafronix** — Official squad rosters
- **Open-Meteo** — Venue weather
- **ip-api.com** — City/region detection (HTTPS, 45/min)
- **GNews** — World Cup news
- **Polymarket** — Championship odds

### Caching Strategy
| Data | TTL |
|------|-----|
| Live scores (4+ live) | 3 min |
| Live scores (1-3 live) | 60-120s |
| Kickoff imminent (T-10 to T+20) | bypass |
| No live matches | 1 hr |
| Finished match events | Permanent |
| Squad rosters | 6 hr |
| ESPN ID map | Permanent |
| Push subscriptions | 90 days |
| League data | Permanent |

---

## Push Notification System

### User flow
1. Save matches in My Matches
2. Tap "Notify all" → subscription saved with UID + PIN + knownUids
3. External cron hits `/api/push?action=notify` every 15 min
4. Matches 25-35 min from kickoff trigger notifications
5. Tap notification → app opens, message in inbox bell

### Cron schedule
```
*/15 11-23 * * *  (America/New_York)
```
URL: `https://world-cup-app-iota.vercel.app/api/push?action=notify`  
Method: **POST**  
Auth: `Authorization: Bearer $CRON_SECRET`

---

## Fantasy Leagues

### KV keys
- `league:{CODE}` → `{ code, name, ownerPin, ownerUid, members[], createdAt }`
- `pin-leagues:{PIN}` → `[code1, code2, ...]`

### Invite link
```
https://world-cup-app-iota.vercel.app/?join=BRZBRD
```

### Default league
- Name: **Brazucas em Broward**
- Code: `BRZBRD`
- Created via admin → League Management → Migrate All

### Scoring (Fantasy)
- 3 pts — exact score
- 1 pt — correct result
- Extra time goals count
- Penalty shootout does NOT count

---

## Admin Dashboard (`/admin`)

### ⚙️ Analytics
- Daily visitors, tab usage, accounts, predictor users

### 🔧 Live Ops
- Flush cache, seed livescores, seed ESPN IDs
- View/edit persisted results, force re-score

### 🔔 Push
- Broadcast to all, individual by PIN

### 🏆 League Management
- View all leagues
- Migrate all fantasy users to a league by code
- Add/remove user by PIN

---

## Deployment

```bash
git add -A && git commit -m "updates" && npx vercel --prod
```

Preview only (no prod impact):
```bash
npx vercel
```

---

## Affiliate Links

| Partner | Status | Details |
|---------|--------|---------|
| Amazon Associates | ✅ Active | Tag: `worldcupapp-20` |
| Fubo TV | ⏳ Pending | Watch Live |
| NordVPN | ⏳ Pending | Watch Abroad |
| Hard Rock Bet | ⏳ Pending | FL + 9 states · 21+ |

---

## Changelog

### v2.2.0 — June 16, 2026
- Fantasy Leagues system (create, join, invite, leaderboard, Global)
- New user onboarding via league invite link
- Push notification cron fixed (GET → POST)
- PIN-based individual push across all devices
- Notification inbox with 3-state smart empty state
- Match card modal: iOS scroll fix, dynamic height, pill layout
- Extra time counts for fantasy, penalties don't
- Leagues pill first in Fantasy filter row, My Teams removed
- ip-api.com HTTPS fix
- Admin: league management, notification status column
- Version bump to v2.2.0

### v2.1.0 — June 14–15, 2026
- Full push notification system
- Shop tab with Amazon affiliate
- Live match cards: green border + glow
- Kickoff-imminent cache bypass
- ESPN ID livescores-first priority
- Fantasy scored picks with Result/Your Pick boxes

### v2.0.0 — June 2026
- Bracket tree redesign, lineups in match modal
- 20+ Ask tab query types, extra time display

### v1.0 — June 2026
- Live scores, schedule, groups, fantasy, bracket
- Match events, My Matches, cross-device sync

---

## License

Unofficial fan project. All World Cup trademarks belong to their respective owners.
