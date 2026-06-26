# Live Scores

![Live Scores Pipeline](../diagrams/LIVE_SCORES_PIPELINE.svg)

The live-score system is designed to avoid every user calling the provider directly.

## Flow

```text
React App → /api/livescores → Upstash Redis → football-data.org → fallback provider
```

## Why serverless?

- Keeps API keys out of the browser.
- Reduces upstream API calls.
- Enables provider normalization.
- Allows shared caching across all users.

## Cache strategy

The serverless function uses a smart TTL:

- Live matches: short TTL.
- No live matches: longer TTL.
- Stale cache may be returned when providers fail.

## Debug endpoints

```text
/api/livescores?debug=1
/api/livescores?flush=1
```

Use `flush=1` after provider fixes, manual overrides, or cache-related confusion.

## Known limitations

football-data.org may not expose every desired advanced metric. Do not add unavailable statistics such as ball-in-play time unless source data is confirmed.
