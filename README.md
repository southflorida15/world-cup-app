# ⚽ World Cup 2026 Predictor & Companion App

## Overview

World Cup 2026 Predictor & Companion App is a comprehensive fan platform built for the FIFA World Cup 2026™. It combines live tournament tracking, historical World Cup data, predictive tools, a FIFA-compliant knockout bracket engine, cross-device synchronization, notifications, and rich sharing into a single Progressive Web App (PWA).

> Disclaimer: Unofficial fan project. Not affiliated with, endorsed by, or sponsored by FIFA.

Live App: https://world-cup-app-iota.vercel.app

---

# Vision

The goal is to create the ultimate World Cup companion experience:

- Follow the tournament live
- Track teams, players, standings, and news
- Build your own bracket
- Compare predictions
- Sync across devices
- Share your bracket visually
- Explore historical World Cup data
- Eventually query the tournament using natural language

---

# Major Features

## Live Tournament Experience

### Live Scores
- Real-time match scores
- Automatic refresh
- Match status indicators
- Goal and event updates
- Cached to protect API quotas

### Schedule
- Full 104-match schedule
- Group-stage and knockout-stage matches
- Date filtering
- Venue filtering
- Round filtering
- Match counters
- Local time conversion

### Groups & Standings
- Group tables
- Team rankings
- Points
- Goal difference
- Goals scored

### News
- World Cup-focused news feed
- Cached updates
- Mobile-friendly cards

### Team & Player Statistics
- 48 participating teams
- Squad rosters
- Player information
- Historical data support

---

# My Bracket

One of the flagship features of the application.

## FIFA World Cup 2026 Format

The application supports the official tournament structure:

- 48 teams
- 12 groups
- Top 2 teams from each group qualify
- Best 8 third-placed teams qualify
- Round of 32
- Round of 16
- Quarter-finals
- Semi-finals
- Final

## FIFA Annex C Implementation

The bracket engine implements FIFA's Annex C logic.

Features:

- Official third-place qualification handling
- Full Annex C mapping support
- 495 possible third-place combinations
- Automatic Round-of-32 assignment

## Manual Picks Mode

Users can:

- Build groups
- Select qualifying third-place teams
- Generate the official knockout bracket
- Pick winners match-by-match
- Advance teams through every round
- Select a champion

## Official Mode (Roadmap)

Official Mode will:

- Pull live standings
- Determine qualified teams
- Apply Annex C
- Generate the official tournament bracket automatically

## Bracket Views

### Tree View
Visual tournament tree with progression through every round.

### Compact View
Mobile-optimized bracket layout.

## Bracket Sharing

Users can share:

- In-progress brackets
- Completed brackets
- Champion picks

Shared cards include:

- Bracket tree
- Country flags
- Champion
- Runner-up
- Semifinalists

---

# Predictor

Users can:

- Predict match scores
- Compete with other users
- Earn points automatically
- Appear on leaderboards

Future improvements:

- Public leagues
- Friends leagues
- Prediction analytics

---

# Simulator

Tournament simulation engine:

- Monte Carlo simulations
- Probability-based outcomes
- Alternative tournament paths

Future:

- Team strength weighting
- FIFA ranking integration
- Form-based simulation

---

# My Matches

Users can:

- Save matches
- Receive reminders
- Export matches to calendar
- Filter by teams
- Filter by groups

## Notifications

Push notifications support:

- Upcoming match reminders
- Saved matches
- PWA notifications

Supported platforms:

- iPhone (installed PWA)
- Android
- Desktop browsers

---

# Cross-Device Sync

Users can create an account using:

- Display name
- Email (optional)
- 6-digit PIN

Synced data:

- My Matches
- Notifications
- Predictor entries
- Bracket selections
- User preferences

Goal:

Start on desktop, continue on mobile.

---

# Ask World Cup (Planned)

Natural-language search across:

- Current tournament data
- Historical World Cup data
- Teams
- Players
- Stadiums
- Statistics

Examples:

- Which player has the most yellow cards?
- Show matches at 9 PM ET.
- Brazil vs France World Cup history.
- Which stadium hosted the most World Cup matches?

---

# API Architecture

Current serverless functions:

api/
├── admin.js
├── annexc.js
├── bracket-share.js
├── livescores.js
├── matchevents.js
├── news.js
├── og.js
├── predictor.js
├── push.js
├── sync.js
└── zafronix.js

## Responsibilities

### livescores.js
Live score aggregation and caching.

### zafronix.js
World Cup statistics, teams, squads, fixtures, and historical data.

### annexc.js
FIFA Annex C lookup support.

### bracket-share.js
Bracket sharing and share-page generation.

### predictor.js
Prediction storage and leaderboard logic.

### sync.js
Cross-device synchronization.

### push.js
Notification subscription and delivery.

### news.js
World Cup news feed.

### og.js
Open Graph card generation.

### matchevents.js
Detailed match-event data.

### admin.js
Administration and analytics.

---

# Tech Stack

Frontend:
- React 18
- Vite

Hosting:
- Vercel

Storage:
- Upstash Redis

Data Providers:
- RapidAPI services
- Zafronix
- Highlightly
- GNews
- Open-Meteo

Notifications:
- Web Push
- VAPID

CI/CD:
- GitHub
- Vercel Auto Deploy

---

# Progressive Web App

Install on:

- iPhone
- iPad
- Android
- Desktop

Benefits:

- Home-screen icon
- Full-screen experience
- Push notifications
- Fast startup

---

# Performance Strategy

The application uses aggressive caching to remain within API limits.

Methods:

- Redis KV caching
- Memory caching
- Scheduled refreshes
- Shared cache layers

Goals:

- Lower API costs
- Faster responses
- Better mobile experience

---

# Roadmap

## Version 1.0
- Live Scores
- Schedule
- Groups
- Stats
- Predictor
- My Matches
- Bracket Engine
- Sync
- Sharing

## Version 1.1
- Ask World Cup
- Improved sharing
- Enhanced notifications

## Version 1.2
- Official Mode
- Automatic standings-to-bracket generation

## Version 2.0
- AI insights
- Advanced analytics
- Public leagues
- Community features

---

# Development Story

This project was built almost entirely through conversational AI and browser-based development.

Workflow:

1. Define feature
2. Generate implementation
3. Edit through GitHub Web
4. Deploy through Vercel
5. Test on live environment
6. Iterate

No traditional local development workflow was required.

---

# License

Unofficial fan project.

All World Cup trademarks, logos, team names, and related intellectual property belong to their respective owners.
