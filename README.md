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
- Full onboarding flow for new users via invite link: name → PIN → notifications → done
- League leaderboard with Points, Exact, Correct, Accuracy per member
- Your rank displayed prominently in each league
- Invite section: copy code or share link directly
- **Global league** — always visible, shows all app users ranked
- Smart UI: 0 leagues → Global + Create/Join; 1 league → straight to leaderboard; 2+ leagues → list with Global at bottom
- PIN required to join/create leagues
- Existing users without PIN prompted to create one to join
- Auto-join `BRZBRD` on startup for PIN users not yet in any league
- **Tap any user** in Rankings or league leaderboard to see their scored picks — same card layout as your own Scored tab, most recent first
- Admin: migrate all users, add/remove by PIN, merge user picks, cross-reference members vs accounts

### 🔔 Push Notifications
- Cron fixed from GET → POST (was silently failing for days)
- PIN-based individual notifications working across all devices
- `knownUids` registry links all devices under one PIN
- Desktop notifications without PWA install
- Smart re-subscribe: always runs full subscription flow
- Notification inbox: bell icon in header, 3-state smart empty state
- Onboarding popup: 5s delay, dismissible, re-shows Jun 18

### 🃏 Match Card Modal
- Smooth scrolling on iOS (overscrollBehavior: contain)
- Dynamic height — shrinks to fit content
- 3px side margins, rounded corners all sides
- Timeline pill wider to fit events summary
- Single ✕ button, no double-tap needed
- Score display: `2 – 2` with spaces

### ⚽ Fantasy Scoring
- Knockout stage: extra time goals count
- Penalty shootout does NOT count
- Per-user scored picks now viewable by all players

### 📋 Schedule
- 12AM ET matches display correctly (grouped under previous day)

### 🔧 Admin
- Accounts table shows: picks count, pts, notification status
- Merge user picks (copy picks from one user to another for unscored matches)
- Cross-reference league members vs accounts
- League management: view all, migrate, add/remove, merge

---

## Features

### Live
- Real-time scores via ESPN public API
- Injury time `90+5'`, match status labels
- Live cards: green border + glow
- Pull-to-refresh with direction lock

### Schedule
- 104 matches, timezone display, calendar export (.ics)
- Toggle filter bubbles (Group, Team, Venue, Round)
- Compact past-day cards, countdown to kickoff

### Match Modal
- Venue, weather (°F/°C), broadcast info
- Win probability, timeline, lineups, match stats
- Dynamic height, smooth iOS scroll

### Groups & Standings
- 12-group format (A–L), live points, GD, GF

### My Bracket
- Official FIFA R32 from hardcoded template
- Auto-simulation or manual picks

### Fantasy Picks (Bolão)
- Predict exact scores, picks lock at kickoff
- 3pts exact, 1pt correct result
- Extra time counts, penalties don't
- Tap any player to see their scored picks

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
- Fubo, NordVPN, Hard Rock Bet (geo-gated, pending)

---

## Architecture

### Frontend
- React 18 + Vite
- Single `src/App.jsx` (~7,800 lines) + 4 component files
- PWA — installable on iOS, Android, desktop

### Backend (Vercel Serverless)
```
api/
├── livescores.js      # ESPN scores, kickoff-imminent bypass, 3-day fetch
├── matchevents.js     # Events, stats, lineups, ESPN ID seeding
├── predictor.js       # Fantasy picks + leaderboard
├── league.js          # Fantasy leagues: create, join, leave, leaderboard
├── push.js            # Subscriptions, broadcast, individual PIN, cron
├── bracket-share.js   # Bracket sharing
├── news.js            # Multi-country WC news
├── sync.js            # Cross-device sync (PIN + magic link)
├── zafronix.js        # Squad rosters
├── og.js              # Share card image
└── admin.js           # Analytics, live ops, league mgmt, push, merge
```

### Data Sources
- **ESPN** — Live scores, match events, lineups
- **Zafronix** — Official squad rosters
- **Open-Meteo** — Venue weather
- **ip-api.com** — City/region detection (HTTPS)
- **GNews** — World Cup news
- **Polymarket** — Championship odds

---

## Push Notification System

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

### Default league
- Name: **Brazucas em Broward** · Code: `BRZBRD`
- Auto-joined on startup for all PIN users

### Scoring
- 3 pts — exact score
- 1 pt — correct result
- Extra time goals count · Penalties do NOT

### Invite link
```
https://world-cup-app-iota.vercel.app/?join=BRZBRD
```

---

## Admin Dashboard (`/admin`)

### ⚙️ Analytics
- Daily visitors, tab usage, accounts with picks/pts/notification status

### 🔧 Live Ops
- Flush cache, seed livescores, seed ESPN IDs
- View/edit persisted results, force re-score

### 🔔 Push
- Broadcast to all, individual by PIN

### 🏆 League Management
- View all leagues
- Cross-reference members vs accounts
- Migrate all users to a league
- Add/remove user by PIN
- Merge picks from one user into another

---

## Deployment

```bash
git add -A && git commit -m "updates" && npx vercel --prod
```

Preview (no prod impact):
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
- Fantasy Leagues (create, join, invite, leaderboard, Global)
- Tap any user to see their scored picks
- New user onboarding via league invite link
- Push cron fixed (GET → POST)
- PIN-based individual push across all devices
- Notification inbox with 3-state smart empty state
- Match card modal: iOS scroll fix, dynamic height
- Extra time counts for fantasy, penalties don't
- Admin: league mgmt, merge users, cross-reference, picks/pts in accounts table
- Auto-join BRZBRD on startup for PIN users

### v2.1.0 — June 14–15, 2026
- Full push notification system
- Shop tab with Amazon affiliate
- Live match cards: green border + glow
- Kickoff-imminent cache bypass
- Fantasy scored picks with Result/Your Pick boxes

### v2.0.0 — June 2026
- Bracket tree redesign, lineups in match modal
- 20+ Ask tab query types

### v1.0 — June 2026
- Live scores, schedule, groups, fantasy, bracket
- Match events, My Matches, cross-device sync

---

## License

Unofficial fan project. All World Cup trademarks belong to their respective owners.
