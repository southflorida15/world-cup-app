# Tournament Engine

The tournament engine models the official FIFA World Cup 2026 format.

![Tournament Engine Flow](../diagrams/TOURNAMENT_ENGINE_FLOW.svg)

## Group stage

- 48 teams
- 12 groups
- 4 teams per group
- Top 2 teams from each group qualify automatically
- 8 of 12 third-place teams also qualify

## Round of 32

The Round of 32 is not a simple sequential bracket. It depends on FIFA Annex C, which assigns the eight qualifying third-place teams to specific group winners.

## Annex C

`engine/annexC.js` contains the complete 495-row assignment table. This file is the single source of truth and should not be duplicated.

## Knockout propagation

Later rounds use winner references:

```text
W73 + W75 → Match 89
W74 + W77 → Match 90
...
W101 + W102 → Match 104
```

Actual Bracket and Fantasy should use actual results to populate future rounds, not a user's fantasy score prediction.
