# Release Process

## Source of truth

Use `public/version.json` for application release control.

Example:

```json
{
  "appVersion": "3.2.1",
  "version": "3.2.1",
  "refreshVersion": "11",
  "releaseName": "Status Board Polish",
  "releaseDate": "2026-06-26",
  "forceRefresh": true,
  "message": "Updating your World Cup app with matchday status-board fixes."
}
```

## Field meanings

- `appVersion`: visible product version.
- `version`: compatibility alias for `appVersion`.
- `refreshVersion`: admin-controlled forced-refresh key.
- `releaseName`: friendly release label.
- `releaseDate`: release date.
- `forceRefresh`: whether users are automatically refreshed.
- `message`: update message shown before reload.

## When to bump versions

| Change type | appVersion | refreshVersion |
| --- | --- | --- |
| Typo or copy tweak | optional | no change |
| CSS-only polish | optional | no change |
| New user-facing feature | bump | bump |
| API or data model fix | optional | bump |
| Cache/state fix | optional | bump |
| Major release | bump | bump |

## Deployment workflow

1. Make local changes.
2. Run `npm run dev`.
3. Test key screens.
4. Update `public/version.json` if users should refresh.
5. Deploy to Vercel.
6. Verify `/version.json` reflects the deployed values.
7. Verify critical API endpoints.

## Forced refresh behavior

Users do not choose whether to refresh. When `refreshVersion` changes and `forceRefresh` is true, the app informs them, waits briefly and reloads.

The app checks:

- on startup,
- when the tab gets focus,
- when the page becomes visible again.

## Rollback

Keep downloaded ZIP releases by version:

```text
/releases/v3.2.0/
/releases/v3.2.1/
```

To recover locally, replace the current files with the previous known-good ZIP.

Production only changes after deployment.
