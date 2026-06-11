# ⚽ World Cup 2026 Predictor & Companion App

## Overview

World Cup 2026 Predictor & Companion App is a Progressive Web App (PWA) built specifically for the FIFA World Cup 2026™.

The application combines:

- Live tournament tracking
- Official FIFA 2026 bracket generation
- Fantasy Picks (Bolão)
- Team and player intelligence
- Match tracking and notifications
- Historical World Cup data
- Cross-device synchronization

into a single fan-focused experience.

> Disclaimer: Unofficial fan project. Not affiliated with, endorsed by, or sponsored by FIFA.

---

# Vision

Build the ultimate World Cup companion application:

- Follow every match live
- Track teams, players and standings
- Generate official tournament brackets
- Make score predictions
- Compete on leaderboards
- Save and track favorite matches
- Sync seamlessly across devices
- Explore historical World Cup information

---

# Current Product Modules

## Live Tournament

### Live Scores
- Real-time match updates
- Match status indicators
- Match events
- Cached API responses
- Mobile-optimized UI

### Schedule
- Full 104-match World Cup schedule
- Group stage
- Round of 32
- Round of 16
- Quarter-finals
- Semi-finals
- Third-place match
- Final

### Groups & Standings
- 12-group format
- Points
- Goal difference
- Goals scored
- Qualification tracking

### Teams
- All qualified nations
- Squad information
- Team profiles
- Historical context
- World Cup records

### Players
- Squad rosters
- Player profiles
- Club information
- Tournament context

### News
- World Cup-specific news feed
- Cached updates
- Mobile-friendly cards

---

# Fantasy Picks (Bolão)

The Fantasy Picks module allows users to predict every World Cup match score and compete against other participants.

## Features

### Match Predictions
- Predict exact scores
- Edit predictions before kickoff
- Automatic save
- Cross-device sync

### Pick Locking
- Picks lock automatically at kickoff
- Locked picks become read-only
- Visual lock indicators
- Lock countdown support

### Scoring

| Outcome | Points |
|----------|----------|
| Exact score | 3 |
| Correct result | 1 |
| Incorrect result | 0 |

### Rankings
- Global leaderboard
- User ranking
- Total points
- Exact-score tracking
- Correct-result tracking

### Current Scope (MVP)

- Predictions
- Locking
- Scoring
- Rankings
- User rank

### Future Roadmap

#### Private Leagues
- League creation
- Invite codes
- League-specific rankings

#### Weekly Competitions
- Matchday winners
- Weekly winners

#### Bonus Challenges
- Match of the Day
- Upset picks
- Golden Boot predictions

#### Achievements
- Exact-score streaks
- Perfect-round badges
- Tournament milestones

#### Social Features
- Friend comparisons
- Prediction sharing
- Community features

---

# Bracket Engine

One of the flagship features of the application.

## FIFA World Cup 2026 Format

The engine fully supports the official tournament format:

- 48 teams
- 12 groups
- Top 2 qualify automatically
- Best 8 third-place teams qualify
- Round of 32
- Round of 16
- Quarter-finals
- Semi-finals
- Final

## FIFA Annex C Support

The bracket engine implements FIFA Annex C qualification logic.

Capabilities:

- Third-place qualification calculations
- Annex C mapping
- 495 possible qualification combinations
- Automatic Round-of-32 placement
- Official FIFA bracket generation

## Bracket Views

### Interactive Tree View
Visual tournament progression.

### Compact Mobile View
Optimized for smaller screens.

## Sharing

Users can share:

- Tournament brackets
- Champion picks
- Tournament outcomes

---

# My Matches

Personalized match tracking.

## Features

- Save matches
- Favorite teams
- Match reminders
- Calendar export
- Team filtering
- Group filtering

## Notifications

Push notification support:

- Upcoming matches
- Saved matches
- Key tournament moments

Supported platforms:

- iPhone (installed PWA)
- Android
- Desktop browsers

---

# Cross-Device Sync

Users can create lightweight accounts using:

- Display name
- Optional email
- PIN

## Synced Data

- Fantasy Picks
- Bracket selections
- Saved matches
- Preferences
- Notifications

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

Example queries:

- Which player scored the most goals?
- Show all matches in Miami.
- Brazil vs France World Cup history.
- Which stadium hosted the most World Cup matches?

---

# Architecture

## Frontend

### Core Stack

- React 18
- Vite
- Progressive Web App (PWA)

### Major UI Modules

Recent refactoring extracted major UI areas into reusable components:

#### Match Experience
- MatchHeader
- MatchInfoSection
- MatchDetailCard

#### Fantasy Module
- FantasyPickLockStatus
- FantasyScoringRules
- FantasyStatsSummary

#### Bracket Engine
- fifa2026Bracket.js
- Annex C support utilities

This modular architecture reduces App.jsx complexity and makes feature development significantly easier.

---

# Backend Architecture

Serverless architecture deployed on Vercel.

## API Functions

```text
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

Responsibilities

predictor.js -> Fantasy Picks storage and rankings.

annexc.js -> FIFA Annex C lookup and qualification support.

bracket-share.js -> Bracket sharing and rendering.

sync.js -> Cross-device synchronization.

push.js -> Push notifications.

livescores.js -> Live score aggregation and caching.

zafronix.js -> Teams, fixtures, statistics and historical data.

⸻

Data Sources

* RapidAPI providers
* Zafronix
* Highlightly
* GNews
* Open-Meteo

⸻

Storage

* Upstash Redis
* Local browser caching
* Session persistence

⸻

Performance Strategy

Designed to operate within API limits.

Techniques:

* Redis caching
* In-memory caching
* Shared cache layers
* Scheduled refreshes
* Optimized API aggregation

Goals:

* Fast mobile experience
* Low API cost
* Reliable live updates

⸻

Progressive Web App

Installable on:

* iPhone
* iPad
* Android
* Desktop

Benefits:

* Home screen installation
* Full-screen experience
* Push notifications
* Offline-ready architecture

Deployment

Development

* Local Vite environment
* Component-based development
* GitHub source control

Production

* Vercel hosting
* Automatic deployments
* Serverless APIs
* Edge delivery

⸻

Roadmap

Version 1.0

* Live Scores
* Schedule
* Groups
* Teams
* Stats
* Fantasy Picks
* Bracket Engine
* Notifications
* Sync
* Sharing

Version 1.1

* Ask World Cup
* Enhanced sharing
* Expanded statistics

Version 1.2

* Official standings-to-bracket automation
* Official tournament mode

Long-Term

* Private leagues
* Social features
* AI insights
* Advanced analytics
* Community experiences

⸻

License

Unofficial fan project.

All World Cup trademarks, logos, team names and related intellectual property belong to their respective owners.