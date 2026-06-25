# Stats Engine

The Stats Engine powers current tournament statistics and historical World Cup team records.

## Tournament Stats

Tournament-wide stats should be calculated from completed match data.

Current supported stats include:

- Matches played out of 104
- Total goals
- Goals per match
- Clean sheets
- Most goals by team
- Clean sheet leader
- Highest-scoring match
- Biggest win
- Fastest goal, when reliable event data exists

## Total Matches

World Cup 2026 has 104 matches.

The denominator should be constant:

```js
const TOTAL_MATCHES = 104;
```

The numerator should be completed matches.

Example:

```text
54 of 104 matches
```

## Goals Per Match

```text
Total goals / completed matches
```

Only completed matches should be included.

## Clean Sheets

A clean sheet is awarded when a team concedes zero goals in a completed match.

For each completed match:

- Home clean sheet if away goals = 0.
- Away clean sheet if home goals = 0.
- A 0–0 draw gives clean sheets to both teams.

## Most Goals by Team

Aggregate goals scored by team across completed matches.

The primary card can show the top team, with click-through expansion for the top 3.

## Fastest Goal

Fastest goal requires event-level data.

Do not display this card unless a reliable goal-minute source exists.

If event data exists, rank goals by minute:

```text
lowest minute = fastest goal
```

## Average Attendance

Average attendance should not be displayed unless a reliable attendance source exists.

Do not render placeholder text such as:

```text
Not available yet
```

If reliable attendance data becomes available:

```text
Average attendance = total attendance / matches with attendance data
```

## Historical Team Stats

Historical team stats come primarily from Zafronix team history data.

The key fields include:

- appearances
- finalPosition
- groupStage
- squadSize
- goalsScored

## Country Continuity Aliases

Some national-team histories are split by historical country names in the provider data. The app merges these records at the API/proxy layer so the UI sees one national lineage.

Current alias merges:

| Display Team | Source Records |
| --- | --- |
| Germany | Germany + West Germany |
| Czechia / Czech Republic | Czech Republic + Czechoslovakia |
| Serbia | Serbia + Yugoslavia + Serbia and Montenegro |
| Russia | Russia + Soviet Union |
| DR Congo | DR Congo + Zaire |

## Why Merge in the API Layer

Merging in `/api/zafronix.js` ensures all UI components benefit:

- Team cards
- Stats tab
- Comparisons
- Historical profiles
- Future Wiki pages

If merging happened only in one UI component, other pages could still show incorrect records.

## Germany Example

Zafronix returns:

```text
Germany = 1934, 1938, 1994–2026
West Germany = 1954–1990
```

The app should display the combined historical record:

```text
Germany = Germany + West Germany
```

This produces the correct title count:

```text
1954, 1974, 1990, 2014 = 4 titles
```

## Data Quality Principles

1. Prefer provider data where reliable.
2. Normalize naming inconsistencies centrally.
3. Do not invent metrics if the source does not provide them.
4. Hide unavailable stat cards rather than showing placeholder values.
5. Document known provider limitations.
