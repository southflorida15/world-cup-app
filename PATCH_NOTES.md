# Atlas Sprint 1 Lean Patch

This patch is intentionally small.

## Adds

- `scripts/` DevKit helpers
- `.github/` issue and PR templates
- `docs/deployment/RELEASE_PROCESS.md`
- `docs/development/DEVKIT.md`
- `docs/development/API_BUDGET.md`

## Updates

- `package.json` adds script aliases:
  - `npm run check`
  - `npm run doctor`
  - `npm run backup`
  - `npm run worldcup`

## Does not change

- No UI changes
- No API behavior changes
- No version bump
- No forced refresh
- No App.jsx refactor

## Manual note

Do not delete `api/scorers.js` yet. It is only flagged as a future consolidation candidate.
