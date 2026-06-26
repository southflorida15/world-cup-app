# Version 3.1.0

## Release Name

**Match OG Insights**

---

## Release Summary

Version `3.1.0` upgrades the match experience with a redesigned Match OG information architecture, a new Insights tab, a renamed Match Flow visualization, improved commentary handling, and cleaner event indicators.

This is a minor feature release focused on making each match card feel more like a polished match center rather than a simple event modal.

---

## Release Goals

- Make match details easier to understand after a game.
- Separate chronology, statistics, analysis, and commentary into clearer tabs.
- Improve the Match Flow experience without overcomplicating the UI.
- Fix disciplinary-event display so yellow and red cards are shown separately.
- Establish a stronger foundation for future Match OG analytics such as shot maps, player ratings, and richer match stories.

---

## Highlights

- `Momentum` tab renamed to `Insights`.
- `MATCH MOMENTUM` visualization renamed to `MATCH FLOW`.
- `Match Stats` tab renamed to `Stats`.
- Commentary moved into its own dedicated tab.
- Yellow and red cards now show separately inside the event pills.
- Insight cards use clearer labels such as Strongest Spell, Longest Control, and Biggest Swing.
- Match Flow rendering received final visual polish and event handling refinements.
- Added a dedicated momentum engine module for easier future iteration.
- Added maintenance support for flushing match-event cache during development.

---

## Architecture Notes

This release keeps the existing React/Vite/Vercel architecture while improving separation around match analysis logic.

Key implementation areas:

- `App.jsx` contains the Match OG UI and tab structure.
- `api/matchevents.js` handles ESPN event resolution, parsed events, stats, lineups, commentary, and cache actions.
- `engine/momentum/momentumEngine.js` contains the Match Flow calculation logic.
- `public/version.json` exposes the release version to the app UI.

---

## Known Limitations

- Match Flow is derived from the available ESPN summary data, not from full on-ball tracking or proprietary live pressure data.
- Commentary availability depends on ESPN coverage for each match.
- Shot maps and deeper player analytics are not included yet.
- Some advanced stats may vary by match depending on source data coverage.

---

## Next Release

Expected focus for `v3.2.0`:

- Richer Match OG analytics.
- Better player-level match summaries.
- Potential shot map/xG enhancements if source data is available.
- Continued mobile layout polish.
- Additional live and post-match insights.

---

## Status

Current version: `3.1.0`  
Release type: Minor feature release  
Project status: Active development
