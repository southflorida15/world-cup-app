# Stats Engine

![Stats History Merge](../diagrams/STATS_HISTORY_MERGE.svg)

The stats engine combines live tournament results, static match metadata, and historical World Cup records.

## Tournament-wide stats

Currently supported tournament stats include:

- Matches played out of 104
- Total goals
- Goals per match
- Clean sheets
- Most goals by team
- Clean sheet leader
- Highest-scoring match
- Biggest win
- Fastest goal, when match-event data exists

Do not display unavailable metrics with placeholder text. If a source does not provide a metric, hide it.

## Historical continuity

Some national team records are split by historical naming in the source API. The app merges these lineages where appropriate:

| Current display | Historical aliases |
|---|---|
| Germany | West Germany |
| Czechia / Czech Republic | Czechoslovakia |
| Serbia | Yugoslavia, Serbia and Montenegro |
| Russia | Soviet Union |
| DR Congo | Zaire |

This ensures historical stats such as titles, appearances, finals, and goals are not undercounted.

## Germany example

Zafronix returns modern Germany and West Germany separately. The app should present them as one German World Cup lineage for historical team stats.
