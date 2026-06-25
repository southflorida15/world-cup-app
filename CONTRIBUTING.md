# Contributing

This project is actively evolving. Contributions should prioritize stability, data accuracy, and maintainability.

## Development Workflow

1. Create a branch.
2. Make a small focused change.
3. Run the build.
4. Commit with a clear message.
5. Push and deploy through Vercel.

```bash
npm install
npm run build
git add .
git commit -m "Describe the change"
git push
```

## Coding Principles

- Keep tournament logic deterministic.
- Do not mix Fantasy predictions with Actual Bracket progression.
- Do not call upstream APIs directly from the browser if credentials or quotas are involved.
- Hide unsupported stats rather than showing placeholder text.
- Normalize provider data in the API layer when possible.
- Prefer small reusable components over duplicating JSX.

## Data Principles

- Verify historical records before hardcoding overrides.
- Use historical alias merging for split country records.
- Keep external source limitations documented.
- Do not invent metrics that are not supported by source data.

## UI Principles

- Keep icons and important values readable.
- Avoid dimming entire cards unless they are truly unavailable.
- Maintain consistent spacing, radius, borders, and shadows.
- Design mobile first.
- Keep team names readable on small screens.

## Before Adding a Feature

Ask:

1. Does this belong in the UI, engine, data layer, or API layer?
2. Does it duplicate existing logic?
3. Does it need source data we do not have?
4. Will it work on mobile?
5. Will it confuse Fantasy, My Bracket, or Actual Bracket concepts?
