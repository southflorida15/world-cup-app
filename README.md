# ⚽ FIFA World Cup 2026 — Companion App

An unofficial fan companion app for the 2026 FIFA World Cup, built entirely with Claude (AI), GitHub, and Vercel. No local development environment. No Claude Code or Copilot. Just a browser.

> **Disclaimer:** This is an unofficial fan project. Not affiliated with or endorsed by FIFA.

**Live app:** [world-cup-app-iota.vercel.app](https://world-cup-app-iota.vercel.app)

---

## What it does

| Feature | Description |
|---|---|
| 🔴 Live Scores | Real-time match scores with auto-refresh and skeleton loaders |
| 📋 Schedule | Full 104-match schedule with date strip, group, team, venue, round filters, match counter, month divider |
| 🗂️ Groups | Live group standings updated as matches are scored |
| ⚽ Top Scorers | Pre-tournament ones to watch, upgrades to live data after Jun 11 |
| 📊 Stats | 26-man squads, player details, recent form for all 48 teams |
| ⚔️ H2H | Head-to-head World Cup history between any two teams |
| 📰 WC News | Live news feed powered by GNews API, cached every 30 min |
| 🎯 Odds | Polymarket win probabilities + tournament simulator |
| 🔮 Predictor | Pick match scores, earn points, compete on a leaderboard. Auto-registers from account name. |
| 🎮 Simulator | Monte Carlo tournament simulator (10,000 runs) |
| 🏆 My Bracket | Build your own knockout bracket |
| ⭐ My Matches | Save matches, export to calendar, set push notifications, multi-select filters with flag pills |
| 🔗 Sync | Cross-device sync via user-chosen 6-digit PIN or email |
| 📤 Share | Rich match share cards with venue, weather and your prediction |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite (single `src/App.jsx`) |
| Hosting | Vercel (Hobby plan — free) |
| Database | Upstash Redis via `@upstash/redis` (Vercel KV) |
| Live scores | Football Highlights API (Highlightly) via RapidAPI — KV cached |
| Squad / stats | Zafronix FIFA World Cup API via RapidAPI — memory cached 6hr |
| News | GNews API |
| Weather | Open-Meteo (no key required) |
| Push notifications | Web Push (`web-push` library) + VAPID keys |
| Cron jobs | cron-job.org (free tier) |
| CI/CD | GitHub → Vercel auto-deploy |

---

## Project Structure

```
world-cup-app/
├── src/
│   └── App.jsx              # Entire frontend (~4,800 lines)
├── api/
│   ├── livescores.js        # Live scores proxy (Highlightly, KV cached)
│   ├── zafronix.js          # Squad/stats proxy (Zafronix, memory cached)
│   ├── predictor.js         # Match predictions + leaderboard (avatar, city, country support)
│   ├── sync.js              # Cross-device sync (PIN + email magic link)
│   ├── push-subscribe.js    # Web Push subscription storage
│   ├── push-notify.js       # Push notification cron handler
│   ├── news.js              # GNews feed proxy (KV cached 30 min)
│   ├── og.js                # Share card generator (SVG image + HTML page)
│   ├── analytics.js         # Anonymous visit + tab usage tracking
│   ├── admin.js             # Admin analytics API (protected)
│   └── cron/
│       └── score.js         # Auto-scores predictions (Highlightly, KV cached)
├── public/
│   ├── admin.html           # Admin dashboard (password protected)
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker
├── package.json
└── vercel.json
```

---

## Environment Variables

Set these in **Vercel → Settings → Environment Variables**. Never commit values to the repo.

| Variable | Required | Description |
|---|---|---|
| `KV_REST_API_URL` | ✅ | Upstash Redis REST URL |
| `KV_REST_API_TOKEN` | ✅ | Upstash Redis REST token |
| `RAPIDAPI_KEY` | ✅ | Universal RapidAPI key (works for all subscribed APIs) |
| `RAPIDAPI_HOST` | ✅ | `football-highlights-api.p.rapidapi.com` (Highlightly — live scores) |
| `RAPIDAPI_HOST_ZAFRONIX` | ✅ | `zafronix-fifa-world-cup-api.p.rapidapi.com` (squad/stats) |
| `ZAFRONIX_API_KEY` | ✅ | Zafronix direct API key (from api.zafronix.com) |
| `GNEWS_API_KEY` | ✅ | GNews API key (news feed) |
| `PREDICTOR_ADMIN_SECRET` | ✅ | Secret for admin panel + cron auth |
| `CRON_SECRET` | ✅ | Bearer token for cron-job.org jobs (same value as above) |
| `VAPID_PUBLIC_KEY` | ✅ | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | ✅ | Web Push VAPID private key |
| `RESEND_API_KEY` | Optional | For email magic link sign-in |

### Generating VAPID keys

```bash
npx web-push generate-vapid-keys
```

---

## API Usage & Quotas

| API | Used for | Free tier | Risk |
|---|---|---|---|
| **Football Highlights API** (Highlightly) | Live scores (`livescores.js`), prediction scoring (`cron/score.js`) | 100 req/day | Tight on busy match days — KV cache mitigates |
| **Zafronix FIFA World Cup API** | Squad data, player stats, rosters (Stats tab) | 500k req/month, 20 req/hour | None — cached 6hr |
| **World Cup 2026** (Maayan Lay) | Currently unused — teams/players only, no live scores | 500k req/month | N/A |
| **GNews API** | WC News tab | Free tier | Low — cached 30min |
| **Open-Meteo** | Match weather in share cards | Unlimited, no key | None |

### KV Cache Strategy (livescores.js)

`livescores.js` uses **Upstash Redis (KV) as a shared cache** across all serverless instances. This is critical for staying within the 100 req/day limit:

- **Live match**: 1 real API call per 4 minutes → ~24 calls per 90-min match
- **Off-peak**: 1 real API call per 15 minutes → ~4 calls/hour
- **All finished**: 1 real API call per 30 minutes → ~2 calls overnight

Without KV caching, every Vercel cold start makes a fresh API call — easily exhausting the quota with multiple concurrent users.

---

## Cron Jobs

Both jobs run via [cron-job.org](https://cron-job.org) (free). Set up two jobs:

| Job | URL | Schedule | Auth header |
|---|---|---|---|
| Score predictor | `POST /api/cron/score` | Every 15 min | `Bearer <CRON_SECRET>` |
| Push notifications | `POST /api/push-notify` | Every 15 min | `Bearer <CRON_SECRET>` |

The score cron fetches finished matches from Highlightly and auto-scores all user predictions. The push cron sends notifications ~60 minutes before kickoff.

---

## Key Features Added Jun 9, 2026

### UI / UX
- Splash screen (1.8s, skips on return) with app icon
- Onboarding slides (2 slides, skips after first view)
- Skeleton loaders on Live and News tabs
- Score flash animations on goals (green pulse)
- Pull-to-refresh with visual indicator
- Consistent `position:fixed` tab headers with `willChange:transform` for iOS
- All headers full viewport width (no edge artifacts on desktop)

### Schedule Tab
- Date strip scrollable to Jul 19 (all 104 matches in MATCH_UTC)
- Month divider between Jun 30 → Jul 1
- Round filter: Group Stage / R32 / R16 / QF / SF / 3rd Place / Final
- Match counter: "Displaying XX matches" on same row as My Time/Venue toggle
- Official R32 bracket matchups (2A vs 2B, 1C vs 2F, etc.)
- Match numbers (#1–#104) on every match card

### My Matches Tab
- Multi-select team filter with flag pills (Crest component)
- Multi-select group filter
- Date filter uses same swipeable calendar strip as Schedule tab (with month divider)

### Account / Predictor
- Version `v1.0.0 · Jun 9, 2026` moved to bottom of account modal
- Sync section compact when signed in: "✅ Syncing across devices" + Change PIN inline
- Predictor auto-registers from sync profile display name — no name prompt for signed-in users
- Predictor gate shows "Join as {name}?" for signed-in users, or name input + PIN CTA for guests

### API
- `livescores.js` migrated to KV-based shared cache (was in-memory per instance)
- `cron/score.js` migrated from API-Football (403 — unsubscribed) to Highlightly
- Predictor register endpoint updated with avatar, city, country storage + batch avatar fetch in leaderboard

---

## Deployment Workflow

This app was built and deployed **entirely through the browser** — no local development environment required.

1. Edit files via **GitHub web editor** (github.com → navigate to file → pencil icon)
2. Commit directly to `main`
3. Vercel auto-deploys on every push
4. For manual redeploy: trigger the saved **Vercel deploy hook URL** in the browser

---

## Key Architecture Decisions

**Why one giant `App.jsx`?**
Built iteratively in Claude's artifact environment before migrating to Vercel. Code splitting would improve load time but wasn't prioritised for an MVP.

**Why `@upstash/redis` not `@vercel/kv`?**
Vercel KV is built on Upstash. Using `@upstash/redis` directly gives more control and avoids Vercel's wrapper which had import issues in some serverless contexts.

**Why cron-job.org instead of Vercel cron?**
Vercel Hobby plan limits cron jobs to once per day. cron-job.org allows every 15 minutes on the free tier.

**Why is live scores cached in KV (not memory)?**
Vercel serverless functions are stateless — each invocation may spin up a new instance with empty memory. KV cache is shared across all instances, ensuring only one real API call per TTL window regardless of how many users hit the app simultaneously.

**Why RECENT4 static data?**
The live scores API only covers WC 2026 (League ID 1635), not pre-tournament friendlies. RECENT4 is a manually verified dataset of each team's last 4 matches. Once WC matches start scoring, `RecentForm` automatically switches to live data.

---

## Admin Panel

Visit `/admin.html` and enter your `PREDICTOR_ADMIN_SECRET` to see:

- Unique visitor count (daily + total)
- 14-day daily visitor chart
- Tab usage analytics (which features are used most)
- Registered predictor users with location and device
- All anonymous visitors with device type and visit history

---

## PWA Installation

The app is a Progressive Web App (PWA). Users can install it to their home screen:

- **iPhone:** Safari → Share ↑ → Add to Home Screen
- **Android:** Chrome → ⋯ → Add to Home Screen
- **Desktop:** Click the install icon in the browser address bar

Once installed, it behaves like a native app with its own icon, offline splash screen, and push notification support.

---

## Built With

This entire project was built using **Claude** (claude.ai) — conversational AI, no special coding tools. The workflow:

1. Describe a feature or fix in plain English
2. Claude generates the code
3. Copy-paste into GitHub web editor
4. Commit → Vercel auto-deploys
5. Test on the live URL, iterate

No terminal. No local server. No IDE. Just a browser and Claude.

---

## License

Unofficial fan project. All team names, logos, and tournament branding belong to their respective owners. Not affiliated with FIFA.
