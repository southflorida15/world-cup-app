# Changelog

This changelog summarizes major project milestones. Dates and version numbers can be refined as releases are tagged.

## v3.0 — Documentation and Stabilization

Planned / in progress:

- Professional README.
- Architecture documentation.
- Tournament engine documentation.
- Live-score documentation.
- Fantasy documentation.
- Stats engine documentation.
- Data source documentation.
- Deployment guide.
- Design-system guide.
- Roadmap.

## v2.8 — Tournament Stats Polish

- Added tournament-wide stat cards.
- Added matches played out of 104.
- Added total goals and goals per match.
- Added clean sheets.
- Added most goals by team.
- Added highest-scoring match.
- Added biggest win.
- Added click-through behavior for top stats.
- Avoided unsupported stats such as average attendance or ball-in-play time unless reliable data exists.
- Fixed dimmed stat icons by avoiding disabled-button opacity behavior.

## v2.7 — Historical Stats Continuity

- Identified Zafronix historical split for Germany and West Germany.
- Added historical alias strategy for countries with split records.
- Confirmed likely alias merges:
  - Germany + West Germany
  - Czech Republic / Czechia + Czechoslovakia
  - Serbia + Yugoslavia + Serbia and Montenegro
  - Russia + Soviet Union
  - DR Congo + Zaire

## v2.6 — Fantasy Knockout Expansion

- Extended Fantasy beyond group stage.
- Added all 104 matches.
- Added knockout dividers.
- Sorted Fantasy matches chronologically.
- Added lock/provisional behavior based on Actual Bracket state.
- Reduced mobile labels for readability.
- Kept fantasy score predictions separate from actual bracket progression.

## v2.5 — Actual Bracket Polish

- Added locked-team indicators.
- Added provisional/leading team states.
- Improved bracket display and mobile behavior.
- Improved R32/R16/QF/SF/Final propagation.

## v2.4 — Live Scores Reliability

- Added `/api/livescores` serverless endpoint.
- Added football-data.org as primary live-score provider.
- Added Highlightly/RapidAPI fallback.
- Added Upstash Redis shared cache.
- Added cache flush and debug behavior.
- Reduced direct provider calls from clients.

## v2.3 — FIFA Annex C Engine

- Added official Annex C third-place assignment logic.
- Centralized bracket generation in engine files.
- Removed duplicate Annex C logic from UI code.
- Fixed same-group collision risk.

## v2.2 — My Bracket

- Added manual group ranking.
- Added best third-place team selection.
- Added bracket generation.
- Added manual winner picking.
- Added bracket sharing.
- Added local persistence.

## v2.1 — Fantasy / Bolão

- Added score predictions.
- Added scoring rules.
- Added identity/lock behavior.
- Added fantasy summary components.

## v2.0 — Stats Hub

- Added team history views.
- Added historical World Cup data.
- Added player scoring logs where available.
- Added team comparison and stat cards.

## v1.x — Core App

- Added schedule.
- Added groups.
- Added standings.
- Added match cards.
- Added saved matches.
- Added responsive/mobile layout.
