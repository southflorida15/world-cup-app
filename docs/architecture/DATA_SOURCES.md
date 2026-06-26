# Data Sources

## football-data.org

Purpose:

- Match schedule
- Match status
- Scores

Limitations:

- May not provide advanced event-level data.
- Live status timing can lag.

## Highlightly / RapidAPI

Purpose:

- Fallback provider when football-data.org fails.

Limitations:

- Basic/free plans may have daily request quotas.

## Upstash Redis

Purpose:

- Shared API cache
- Reduces provider traffic
- Provides stale fallback behavior

## Zafronix

Purpose:

- World Cup historical team appearances
- Team flags and World Cup history records

Known issue:

- Historical lineages may be split by name, such as Germany and West Germany.

## Local static data

Purpose:

- Group composition
- Match schedule constants
- Team metadata
- FIFA Annex C mapping
- Design and display metadata

## FIFA Regulations Annex C

Purpose:

- Official Round-of-32 placement for the eight best third-place teams.

Stored locally in `engine/annexC.js`.
