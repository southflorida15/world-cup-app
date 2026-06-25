# Live Scores

Live scores are delivered through a serverless architecture designed to avoid upstream API quota problems and to keep the app responsive during live match windows.

## Goals

1. Do not expose provider keys in the browser.
2. Do not make every user call the upstream API.
3. Cache shared responses in Upstash Redis.
4. Use a primary provider and fallback provider.
5. Keep the frontend data shape stable even if providers differ.

## Architecture

```text
React App
  |
  | fetch('/api/livescores')
  v
Vercel Serverless Function
  |
  | check cache
  v
Upstash Redis
  |
  | cache miss
  v
football-data.org
  |
  | fallback when needed
  v
Highlightly / RapidAPI
```

## Primary Provider

Primary live-score provider:

```text
football-data.org
```

The app uses the World Cup competition code where available and normalizes provider-specific fields into a consistent internal shape.

## Fallback Provider

Fallback provider:

```text
Highlightly through RapidAPI
```

This provider may have strict quota limits, so it should only be used when the primary provider fails or does not return usable data.

## Cache Layer

Upstash Redis is used for shared caching.

Typical keys:

```text
wc2026:livescores
wc2026:livescores:ts
```

## Smart TTL Strategy

Live-score cache TTL changes depending on match state.

Suggested behavior:

| Situation | TTL |
| --- | ---: |
| One live match | ~60 seconds |
| Multiple live matches | 2–3 minutes |
| No live matches | ~1 hour |

This keeps live scores reasonably fresh without burning API quota.

## Match Window Guard

The endpoint can skip upstream calls outside known match windows. This is especially useful during tournament off-hours.

The app stores a kickoff list and checks whether current time is close to any scheduled match.

## Normalized Match Shape

The frontend expects a consistent shape:

```js
{
  fixture: {
    id,
    date,
    status: { short, elapsed },
    venue: { name, city }
  },
  league: { id, season },
  teams: {
    home: { id, name },
    away: { id, name }
  },
  goals: {
    home,
    away
  },
  score: {
    fulltime: { home, away }
  },
  events: [],
  _source: "football-data.org"
}
```

## Cache Flush

For debugging:

```text
/api/livescores?flush=1
```

Expected response:

```json
{ "ok": true, "flushed": true }
```

## Debug Mode

For inspecting provider behavior:

```text
/api/livescores?debug=1
```

Debug output should help answer:

- Was the response cached?
- Which source was used?
- How old is the cache?
- Were there provider errors?
- How many live matches were detected?

## Known Limitations

- Some providers may not update live status immediately.
- Some providers may provide fixture schedules but not reliable live scores.
- Free APIs may have quotas, missing events, or delayed data.
- Manual overrides should be used only as emergency stopgaps.

## Recommended Future Improvements

1. Add provider health panel in debug output.
2. Log provider latency.
3. Track fallback usage count.
4. Add source confidence labels.
5. Add provider-specific validation tests.
