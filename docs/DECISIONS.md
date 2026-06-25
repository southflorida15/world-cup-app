# Technical Decision Log

This document records the key technical and product decisions behind the World Cup app.

## Decision 1: Use Vercel Serverless Functions for API access

### Decision

The frontend should call internal API routes such as `/api/livescores` instead of calling third-party APIs directly from the browser.

### Rationale

- Keeps API keys off the client.
- Reduces duplicate upstream API calls.
- Allows caching and fallback logic.
- Makes rate limits easier to manage.

### Consequences

- Requires Vercel environment variables.
- Requires serverless handler maintenance.
- Allows shared cache architecture through Upstash Redis.

---

## Decision 2: Use Upstash Redis as shared cache

### Decision

Use Upstash Redis/KV to cache live score responses.

### Rationale

Without a shared cache, every user session could trigger separate upstream API calls. During World Cup match windows, that can quickly exhaust free API quotas.

### Consequences

- Live data may be slightly delayed based on TTL.
- Cache flush endpoint is useful for emergency debugging.
- Cache keys and TTLs must be documented.

---

## Decision 3: football-data.org as primary live score provider

### Decision

Use football-data.org as the primary live fixture/score source, with Highlightly/RapidAPI only as fallback if available.

### Rationale

Highlightly/RapidAPI previously hit daily quota limits. football-data.org provided a more stable free-tier path for World Cup fixtures.

### Consequences

- football-data.org may not provide every desired advanced stat.
- Some live status values require normalization.
- Scores and statuses should be mapped into the app's internal fixture shape.

---

## Decision 4: Do not build unavailable metrics

### Decision

Do not show placeholder stat cards such as "Average Ball in Play — Not available yet."

### Rationale

The app should feel authoritative. If the data source does not reliably provide a stat, the stat should be omitted rather than displayed as unavailable.

### Consequences

- Ball-in-play time is not currently included.
- Average attendance should only be added if a reliable attendance field is available.
- Fastest goal should only render when event timing data exists.

---

## Decision 5: Fantasy predictions must not populate knockout rounds

### Decision

A user's Fantasy score prediction should not determine which teams appear in later Fantasy knockout cards.

### Rationale

Fantasy mode predicts scores. My Bracket predicts progression. Mixing them would confuse users and corrupt leaderboard logic.

### Consequences

- R16/QF/SF/Final Fantasy cards should populate from Actual Bracket / real results.
- Fantasy score inputs should stay locked until both actual teams are known.
- My Bracket remains the place for personal winner simulation.

---

## Decision 6: Historical continuity belongs in the API/data layer

### Decision

Legacy country records should be merged before data reaches UI components.

### Rationale

Germany appearing with only one World Cup title exposed that provider records can be split by historical country names. Fixing this in UI components would create inconsistent behavior.

### Current aliases

```js
{
  Germany: ["Germany", "West Germany"],
  Czechia: ["Czech Republic", "Czechoslovakia"],
  Serbia: ["Serbia", "Yugoslavia", "Serbia and Montenegro"],
  Russia: ["Russia", "Soviet Union"],
  "DR Congo": ["DR Congo", "Zaire"]
}
```

### Consequences

- The Stats tab becomes more historically accurate.
- Future Team Wiki pages can reuse the same merged history.
- API cache keys must account for merged aliases.

---

## Decision 7: Documentation is part of v3.0

### Decision

Treat documentation as a first-class project deliverable.

### Rationale

The app now contains enough tournament logic, API behavior, and product decisions that the code alone is not sufficient documentation.

### Consequences

- Major new features should update relevant docs.
- Architecture decisions should be captured here.
- Known limitations should be documented instead of rediscovered repeatedly.
