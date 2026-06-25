# Roadmap

## Current Focus

The current priority is stabilization, documentation, data accuracy, and UI consistency.

## Near-Term Priorities

### 1. Documentation

- README
- Architecture
- Tournament Engine
- Live Scores
- Fantasy
- Stats Engine
- Data Sources
- Deployment
- Design System

### 2. Data Accuracy

- Verify all historical country continuity aliases.
- Verify all team title counts.
- Verify schedule kickoff times.
- Verify total tournament match counts.
- Avoid unsupported stats unless source data exists.

### 3. UI Consistency

- Normalize cards.
- Normalize spacing.
- Normalize shadows.
- Normalize badges.
- Normalize tab headers.
- Remove unnecessary gradients.
- Improve mobile readability.

### 4. Feature Modularization

Gradually extract large `App.jsx` sections into features:

- Fantasy
- Actual Bracket
- My Bracket
- Stats
- Match Center
- Live Scores

## Medium-Term Features

- Fantasy leagues
- Leaderboards
- Daily fantasy points
- Shareable fantasy cards
- Advanced match center
- Team comparison
- Stadium pages
- Player profiles
- Enhanced search

## Long-Term Ideas

### World Cup Wiki

A full internal World Cup encyclopedia is aspirational and should come after the core app is stable.

Potential Wiki areas:

- Team pages
- Player pages
- Stadium pages
- Match pages
- Historical tournament pages
- Records pages
- Rivalries
- Timeline view

A good portion of the Wiki foundation already exists in the Stats page and historical data model.

## Not Yet Planned

Do not add these until reliable data sources are confirmed:

- Ball-in-play time
- xG
- Shot maps
- Full player heatmaps
- Referee VAR analytics
- Attendance averages
