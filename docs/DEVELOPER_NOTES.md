# Developer Notes

This document captures project-specific implementation notes that are easy to forget while working on the World Cup app.

## Working Style

The app has historically been updated through full-file replacements, especially `src/App.jsx`. That has been convenient for fast iteration, but the long-term goal is to modularize the code so future changes can be isolated to smaller files.

Recommended direction:

- Keep `App.jsx` as the shell/router-level file.
- Move Fantasy logic into `src/features/fantasy/`.
- Move Actual Bracket logic into `src/features/bracket/`.
- Move Stats logic into `src/features/stats/`.
- Keep tournament rules inside `src/engine/`.
- Keep static/reference data inside `src/data/`.

## Critical Architectural Rules

### Actual Bracket is the source of truth for real knockout teams

Fantasy should not invent or propagate teams based on a user's score predictions. Knockout Fantasy cards should be populated from actual tournament results / Actual Bracket state.

Fantasy pick = predicted score.

Bracket pick = projected winner.

Those concepts must stay separate.

### Annex C must remain single-source

The official FIFA 2026 third-place placement table is handled by `engine/annexC.js`. Do not duplicate Annex C mapping elsewhere in `App.jsx` or separate components.

If the app needs Round of 32 placement, it should call the engine instead of reimplementing the table.

### Historical country continuity matters

Some countries have historical records split across legacy names in the data provider.

Current merge rules:

- Germany = Germany + West Germany
- Czechia / Czech Republic = Czech Republic + Czechoslovakia
- Serbia = Serbia + Yugoslavia + Serbia and Montenegro
- Russia = Russia + Soviet Union
- DR Congo = DR Congo + Zaire

These should be handled in the API/data layer, not manually patched in UI components.

## Deployment Workflow

The project deploys on Vercel from the GitHub repository.

The deploy hook alias previously used locally:

```bash
alias wcdeploy='curl -X POST "<VERCEL_DEPLOY_HOOK_URL>"'
```

Do not commit deploy hook URLs into the repository. Keep them local in `~/.zshrc`.

Typical safe workflow:

```bash
npm run build
git status
git add .
git commit -m "Describe change"
git push
wcdeploy
```

## Local Development Notes

The app uses Vite. The development script should run Vite directly, not recursively call `vercel dev` from a Vercel Development Command.

If this error appears:

```text
vercel dev must not recursively invoke itself
```

check `package.json` and Vercel project settings.

## Known Technical Debt

- `App.jsx` is too large and should be decomposed.
- Several features still share UI patterns through copied inline styles.
- Design tokens exist but are not fully enforced everywhere.
- Some match schedule data is static while live score data comes from APIs.
- Some statistics depend on provider data shape and should be validated defensively.

## Safe Refactoring Principle

Refactor by feature, not by visual section.

Better:

```text
src/features/fantasy/
src/features/stats/
src/features/bracket/
```

Riskier:

```text
move random functions from App.jsx into utils without ownership
```

The goal is to make future work faster without breaking production.
