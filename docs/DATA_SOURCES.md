# Data Sources

This app uses a mix of static tournament data, custom engine logic, and external APIs.

## Summary

| Source | Purpose | Notes |
| --- | --- | --- |
| Static app data | Groups, schedule, teams, venues | Reliable for fixed tournament structure |
| FIFA Annex C | Third-place knockout mapping | Implemented locally in engine |
| football-data.org | Live scores and fixtures | Primary live data source |
| Highlightly / RapidAPI | Fallback live data | Quota-limited fallback |
| Upstash Redis | Shared cache | Reduces provider calls |
| Zafronix | Historical team stats | Requires historical alias merging |
| FlagCDN | Country flags | Used for flag images |
| Manual event sources | Fastest goal and event stats where available | Only displayed if reliable |

## Static Tournament Data

The app includes a static 104-match schedule and group definitions. This is appropriate because the official tournament structure is fixed.

Static data includes:

- Groups A–L
- Teams
- Match ids
- Dates
- Kickoff times
- Venues
- Broadcast text
- Knockout placeholder slots

## FIFA Annex C

Annex C determines which third-place teams play which group winners in the Round of 32.

This is implemented locally instead of being fetched from an external provider.

Benefits:

- No network dependency.
- Reproducible bracket generation.
- Avoids drift between Actual Bracket and My Bracket.

## football-data.org

Used as the primary live-score provider.

Expected responsibilities:

- Match schedule
- Match status
- Scores
- Final results

Known limitations:

- Some statuses may lag.
- Free-tier data may not include every desired event detail.
- It may not provide attendance or ball-in-play time.

## Highlightly / RapidAPI

Used as a fallback provider.

Known limitations:

- Daily quota limits.
- Provider response shape differs from football-data.org.
- Should not be used as the primary source if quota is limited.

## Upstash Redis

Used for server-side shared caching.

Benefits:

- Prevents every browser session from calling the upstream provider.
- Reduces quota usage.
- Improves response time.

## Zafronix

Used for historical World Cup team data.

Data includes:

- Appearances
- Final positions
- Group-stage records
- Goals scored
- Squad size

Known limitation:

Historical country records may be split by historical names, such as Germany and West Germany.

The app fixes this by merging known aliases in `/api/zafronix.js`.

## FlagCDN

Used for country flag images where available.

Fallbacks include emoji flags or Wikimedia-hosted historical flags for legacy countries.

## Event-Level Data

Some stats require event-level match data:

- Fastest goal
- Goal minute
- Scorers
- Cards
- Substitutions

These should only be displayed when reliable event data exists.

## Metrics Not Yet Supported

Do not display these until source availability is confirmed:

- Average attendance
- Ball-in-play time
- xG
- Shot maps
- Player heatmaps
- Referee VAR interventions

## Data Philosophy

The app should avoid fake precision.

If a source does not provide a reliable metric, the UI should hide that metric rather than show a placeholder or guessed value.
