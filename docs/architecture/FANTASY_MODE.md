# Fantasy Mode

![Fantasy Flow](../diagrams/FANTASY_FLOW.svg)

Fantasy mode lets users predict exact match scores.

## Scoring model

- Exact score: 3 points
- Correct result: 1 point
- Extra time counts
- Penalty shootout goals do not count as normal match goals

## Fantasy vs Bracket

Fantasy score picks do not populate later knockout rounds.

Correct separation:

```text
Fantasy pick = predicted score for a scheduled match
Actual Bracket = real/provisional tournament progression
My Bracket = user's simulated bracket
```

R16, QF, SF, and Final fantasy cards should be populated from actual tournament progression, not personal score predictions.

## Mobile behavior

On mobile, avoid verbose labels such as `LEADING` and `PROVISIONAL` when they make team names hard to read. Use visual treatment, lock icons, and simplified status labels instead.
