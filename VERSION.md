# World Cup App

Version: 3.6.0
Release: Match Card & Timeline Polish
Released: 2026-07-01
Refresh Version: 7 (sw.js cache: wc2026-v7)

## Highlights

- Circular bracket tap-to-open now works — match card opens correctly from all flag positions
- Timeline event duplication fixed at API level — ESPN multi-source duplicates (details + keyEvents + commentary) collapsed to one event per goal/card per minute
- Score inflation fixed — correctedSc now trusts getScore() unconditionally when live score is available
- Goal pill counters use persisted score (hg+ag) not raw event count
- getFlag / FLAG_CODES_MAP wired through to MyBracketTab — bracket tab no longer crashes on render
- flush-events maintenance endpoint added to api/matchevents.js
