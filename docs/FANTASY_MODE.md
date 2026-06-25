# Fantasy Mode

Fantasy Mode, also referred to as Bolão, lets users predict match scores and earn points based on prediction accuracy.

## Scope

Fantasy supports the full tournament:

- Group Stage
- Round of 32
- Round of 16
- Quarterfinals
- Semifinals
- Third-place match
- Final

It is not limited to the group phase.

## Scoring Rules

| Result | Points |
| --- | ---: |
| Exact score | 3 |
| Correct result only | 1 |
| Incorrect result | 0 |

Extra-time goals count for knockout matches. Penalty shootout outcomes do not alter score-prediction scoring.

## Important Product Rule

Fantasy score picks are not bracket picks.

A fantasy prediction such as:

```text
Brazil 2–1 Japan
```

means only:

```text
The user predicted Brazil 2, Japan 1 for that scheduled match.
```

It does not mean Brazil should automatically advance in the user's Fantasy UI.

Knockout progression in Fantasy should come from the Actual Bracket / actual tournament results.

## Knockout Match Availability

### Fully Known Match

When both teams are confirmed:

```text
Germany vs South Africa
```

Prediction inputs are enabled unless the match is locked by kickoff.

### Partially Known Match

When one team is known:

```text
Germany vs TBD
```

The card may be displayed for context, but prediction controls remain disabled.

### Unknown Match

When neither team is known:

```text
TBD vs TBD
```

The app may hide the card or show it as locked depending on UX preference.

## Chronological Ordering

Fantasy matches should be sorted by kickoff time, not by bracket id.

Users think in matchdays:

```text
Jun 28
Jun 29
Jun 30
Jul 1
...
```

not in bracket slot order.

## Mobile Behavior

Mobile cards must prioritize team names and score inputs.

Avoid long secondary labels such as:

```text
LEADING
PROVISIONAL
```

on small screens. These labels make team names harder to read.

Recommended mobile behavior:

- Keep lock icons.
- Grey out provisional teams visually.
- Suppress verbose status text.
- Keep card spacing compact.

## Locking Predictions

Predictions should lock at kickoff. After kickoff:

- Existing predictions remain visible.
- Inputs become disabled.
- User cannot change scores.

## Relationship to Actual Bracket

Fantasy receives resolved knockout teams from actual tournament data.

```text
Actual result: Winner M73 = South Africa
  |
  v
R16 fantasy card updates when both R16 teams are actual/confirmed
```

Fantasy does not use personal score predictions to populate R16.

## Future Enhancements

- Fantasy leagues
- Leaderboards
- Daily points
- Perfect picks
- Streaks
- Group vs knockout filters
- Shareable fantasy cards
- Knockout bonus system
- Champion pick bonus
