# Roadmap

Product direction for World Cup 2026 Companion App.

Priorities evolve as the tournament progresses and live data improves.

---

## Current Release: v3.5.0

### Theme: Circular Bracket & RecentForm Fix

### Shipped
- Circular sunburst bracket view (Canvas, real flag images, gold bracket lines)
- RecentForm now correctly shows knockout round results
- `formatDisplayMinute` canonical time formatter
- Full PT-BR localization
- App.jsx modularization into `src/tabs/`

---

## v3.6 — Bracket Completion

### Theme: Full knockout bracket experience

### Objectives
- As QF, SF, and Final matches are played, verify circular bracket renders correctly at each stage
- Add bracket share / screenshot feature
- Add "My Bracket vs Actual" comparison view
- Explore printable bracket export

### Priority: High  
### Status: Active tournament — iterate as matches play out

---

## v3.7 — Match Day Polish

### Theme: Better live match experience

### Objectives
- Improve live score refresh reliability during high-traffic match windows
- Add match countdown with pre-match lineup info if available
- Improve match event display (cleaner timeline, better penalty shootout handling)
- Add halftime and full-time summary cards

### Priority: High  
### Status: Planned

---

## v3.8 — Stats & Insights

### Theme: Tournament data at a glance

### Objectives
- Top scorers leaderboard (live)
- Most assists, cards, clean sheets
- Group stage summary stats
- Team-by-team tournament path visualization
- Match quality metrics if data available

### Priority: Medium  
### Status: Planned

---

## v3.9 — Social & Sharing

### Theme: Make it shareable

### Objectives
- Share a bracket outcome (image or link)
- Share a match result card
- Fantasy leaderboard public link
- "Who do you support?" quick poll

### Priority: Medium  
### Status: Future

---

## v4.0 — Post-Tournament Edition

### Theme: A complete World Cup archive

### Objectives
- Full tournament results archive
- All-time top scorers and records
- Complete bracket with all results filled in
- "How did my bracket do?" scoring summary
- Convert to a reusable template for future tournaments

### Priority: Long-term  
### Status: Future

---

## Guiding Principles

1. **Accuracy first** — tournament structure and match data must be correct; wrong data is worse than missing data
2. **Mobile-native** — every feature is designed for a phone screen first
3. **Zero cost** — no paid APIs; ESPN public endpoints + Redis caching
4. **Ship and iterate** — deploy frequently during the tournament; users are active now
5. **No breaking changes in production** — always test locally before pushing to main
