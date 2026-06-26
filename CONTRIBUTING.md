# Contributing

## Safe change process

1. Pull latest `main`.
2. Make a small, focused change.
3. Run:

```bash
npm run build
```

4. Test the affected tab locally.
5. Commit with a descriptive message.
6. Push and verify Vercel deployment.

## Code principles

- Keep tournament rules in `src/engine`.
- Keep provider-specific API logic in `api/`.
- Avoid duplicating match, bracket, or historical-stat logic in UI components.
- Prefer shared renderers for team rows, badges, cards, and status indicators.
- Do not fake unavailable metrics. Hide metrics until a reliable source exists.

## Documentation rule

Any major feature change should update the relevant document under `docs/`.
