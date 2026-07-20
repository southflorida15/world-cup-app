# DevKit

The `scripts/` folder contains small helpers for local development and release checks.

## Commands

```bash
npm run check
npm run doctor
npm run backup
npm run worldcup
```

## Principles

- Scripts should not change production unless they explicitly run git push.
- `doctor` runs a production build and basic repository checks.
- `backup` creates a source backup excluding heavy/generated folders.
