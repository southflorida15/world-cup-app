# Architecture Decision Log

## Decision: Serverless API for live scores

Use Vercel functions rather than browser-direct provider calls.

Reason:

- Protects API keys
- Reduces provider request volume
- Enables shared caching
- Centralizes normalization

## Decision: Upstash Redis cache

Use Redis cache in front of live-score providers.

Reason:

- Prevents quota exhaustion
- Provides stable behavior during traffic spikes
- Allows stale fallback when providers fail

## Decision: Annex C stored locally

Keep FIFA Annex C in the local engine.

Reason:

- Official tournament logic should not depend on external APIs.
- Eliminates drift and same-group collision bugs.

## Decision: Historical aliases merged in backend

Merge country-history aliases in `api/zafronix.js`.

Reason:

- Fixes every frontend consumer.
- Avoids duplicate frontend correction logic.
- Keeps source-specific cleanup near the source adapter.

## Decision: No fake unavailable stats

Do not show metrics such as average ball-in-play time unless reliable source data exists.

Reason:

- Maintains user trust.
- Avoids misleading analytics.
