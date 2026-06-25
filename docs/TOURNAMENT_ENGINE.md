# Tournament Engine

The tournament engine is responsible for translating match results and user inputs into group standings, third-place rankings, and knockout brackets.

## Tournament Format

The FIFA World Cup 2026 format contains:

- 48 teams
- 12 groups of 4 teams
- 72 group-stage matches
- 32 knockout teams
- 16 Round of 32 matches
- 8 Round of 16 matches
- 4 Quarterfinals
- 2 Semifinals
- Third-place match
- Final
- 104 total matches

## Group Stage

Each group contains four teams. Group standings are based on match results:

1. Points
2. Goal difference
3. Goals scored
4. Additional tiebreakers as needed

The app currently calculates the primary standings metrics needed for qualification and UI display.

## Automatic Qualifiers

The top two teams from each group qualify automatically:

```text
12 groups × 2 teams = 24 automatic qualifiers
```

## Third-Place Qualifiers

The eight best third-place teams also qualify:

```text
12 third-place teams → best 8 qualify
```

They are ranked using points, goal difference, goals scored, and additional tiebreakers where available.

## FIFA Annex C

The Round of 32 opponents for third-place teams are not arbitrary. FIFA Annex C defines how the eight qualifying third-place groups map into specific Round of 32 slots.

The app uses a complete Annex C mapping through `engine/annexC.js` and related engine utilities.

The key idea:

```text
Qualified third-place groups → Annex C key → official assignment table → R32 slots
```

Example conceptual flow:

```text
Third-place qualifiers: A, B, D, E, H, I, K, L
Key: ABDEHIKL
Annex C lookup returns assignments for the 3rd-place slots
```

## Knockout Templates

The knockout bracket is built from templates.

### Round of 32

Matches 73 through 88.

### Round of 16

```text
M89 = W73 vs W75
M90 = W74 vs W77
M91 = W76 vs W78
M92 = W79 vs W80
M93 = W83 vs W84
M94 = W81 vs W82
M95 = W86 vs W88
M96 = W85 vs W87
```

### Quarterfinals

```text
M97  = W89 vs W90
M98  = W93 vs W94
M99  = W91 vs W92
M100 = W95 vs W96
```

### Semifinals

```text
M101 = W97 vs W98
M102 = W99 vs W100
```

### Final and Third Place

```text
M104 = W101 vs W102
M103 = L101 vs L102
```

## Actual Bracket vs My Bracket

The app has two bracket concepts.

### Actual Bracket

- Driven by real group standings and actual match results.
- Used for the real tournament view.
- Populates Fantasy knockout cards only when actual teams are known.

### My Bracket

- Driven by user-selected group orderings and manual picks.
- Used for personal simulation and sharing.
- Does not affect actual results or Fantasy scoring.

## Locked and Provisional Teams

The app distinguishes between:

| State | Meaning |
| --- | --- |
| Locked | Team is mathematically confirmed in that slot |
| Provisional / Leading | Team currently occupies the slot but is not mathematically confirmed |
| TBD | Slot cannot be resolved yet |

Mobile views reduce secondary labels to keep team names readable.

## Fantasy Relationship to Knockout Engine

Fantasy uses the tournament schedule and resolved actual teams. It does not let a user's predicted score determine future match participants.

Correct behavior:

```text
Fantasy prediction for R32: Brazil 2–1 Japan
```

This saves a score prediction only. It does not place Brazil into R16. R16 becomes available when the actual R32 winner is known.
