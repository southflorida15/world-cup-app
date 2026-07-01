# Changelog

All notable changes to this project are documented here.

---

## [3.5.0] - 2026-06-30

### Added
- **Circular bracket view** — Canvas-based sunburst bracket; real flag images clipped to circles on the outer ring; gold bracket lines trace each team's path inward ring by ring; winner flags advance to the next inner ring as teams progress; FIFA 3-letter country codes label each slot; hover/tap shows match details
- **`CircularBracket.jsx`** — self-contained Canvas component using `flagcdn.com` images (avoids SVG `foreignObject` iOS issues); hit-testing via scaled canvas coordinates; touch and click support
- Three-view toggle on the Actual Tournament Bracket: Compact / Tree / **⭕ Circle**

### Changed
- `RecentForm` component now pulls from `resolvedMatches` instead of raw `MATCHES` — correctly includes knockout round results (R32, R16, QF, SF, Final) that were previously missing because raw `MATCHES` uses slot placeholders, not real team names
- `RecentForm` header changed from "LAST 4 MATCHES" to **"World Cup 2026 matches"** with dynamic count; falls back to pre-tournament friendlies with a clear label if no WC matches exist yet
- `BracketMatchup` winner row background opacity bumped from 14% to 25%; checkmark changed from `✓` to `✅` at larger size

### Fixed
- Brazil, Canada, and other teams missing from "Last 4 Matches" due to knockout slot placeholder mismatch
- Service worker cache bumped to `wc2026-v7` to force refresh of stale PWA builds

---

## [3.4.0] - 2026-06-29

### Added
- **`formatDisplayMinute`** in `src/i18n/display.js` — canonical match time formatter producing period-relative annotations (e.g. `75' (30' 2H)`, `90+5' (45+5' 2H)`, `105+2' (15+2' ET1)`)
- PT-BR variants: `1T`/`2T`/`PT1`/`PT2` instead of `1H`/`2H`/`ET1`/`ET2`

### Changed
- `statusLabel` function now routes all live-minute branches (1H, 2H, ET) through `formatDisplayMinute`
- Match event timeline formatter replaced with single `formatDisplayMinute` call
- Eliminated the old `(${e-45}' H2)` inline formatter that produced wrong output

### Fixed
- 2H minutes showing `(e-45)' H2` (wrong label, wrong subtraction) instead of correct `(30' 2H)` format
- ET minutes showing bare `ET 105+2'` with no relative annotation

---

## [3.3.0] - 2026-06-27

### Added
- **PT-BR localization** — full Portuguese (Brazil) translation of team names, stage names, venue names, UI strings, and match times via `src/i18n/display.js`
- `display.js` exports: `displayTeamName`, `displayStageName`, `displayGroupLabel`, `displayVenueName`, `displayMatchDate`
- Language toggle (EN / PT-BR) persisted across sessions

### Changed
- All display-layer team and stage names routed through `display.js` helpers — canonical API values unchanged throughout

---

## [3.2.1] - 2026-06-26

### Changed
- My WC "Last Matches" now uses the latest completed kickoff window with fallback for stale feed statuses
- Countdown copy uses `min` instead of `m`

### Fixed
- Status board blank-state edge cases

---

## [3.2.0] - 2026-06-26

### Added
- **App.jsx refactor** — ~10 tab components extracted to `src/tabs/` reducing App.jsx from ~10,200 lines to ~7,200 lines
- Extracted tabs: `SchedTab`, `Bracket` (MyBracketTab), `Stats`, `GrpTab`, `Simulator`, `Odds`, `Fantasy`, `WCNews`, `Ask`, `MyWorldCupTab`
- Props-passing pattern to avoid circular imports; `FLAG_CODES_MAP` and shared utilities passed explicitly

### Changed
- Bracket tab now shows both "My Bracket" (editable) and "Actual Tournament Bracket" (live results) in the same view with a clear toggle

---

## [3.1.0] - 2026-06-26

### Added
- Match OG `Insights` tab
- `MATCH FLOW` momentum visualization
- Dedicated Commentary tab in match overlay
- Separate yellow-card and red-card indicators in event pills
- Momentum engine module at `engine/momentum/momentumEngine.js`

### Changed
- Renamed `Match Stats` tab to `Stats`
- Reorganized Match OG tabs

### Fixed
- Commentary tab black-screen issue
- Red cards counted under yellow-card-only pill

---

## [3.0.1] - 2026-06-25

### Added
- Professional repository documentation: README, CHANGELOG, ROADMAP, AUTHORS, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY

---

## [3.0.0] - 2026-06-25

### Added
- Initial production release
- Live scores with auto-refresh and Redis persistence
- Actual bracket with live result resolution
- My Bracket builder with drag-and-drop
- Fantasy/predictor tab with cross-device sync
- Tournament simulator (Poisson + Monte Carlo)
- Group standings with tiebreakers and clinch detection
- Team profiles with historical stats
- Match event timeline (goals, cards, subs, VAR)
- PWA with service worker and installability
- ESPN primary data source with Zafronix/RapidAPI secondary
