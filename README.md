# World Cup App v3.2.1 — Status Board Polish

This package includes the latest My WC status-board fix and the new documentation pack.

## Replace these files/folders

- `src/App.jsx`
- `api/matchevents.js`
- `public/version.json`
- `docs/`
- `VERSION.md`

## Notes

- `refreshVersion` is set to `11`, so this release is configured as a forced refresh.
- Last Matches now uses the latest completed kickoff window, with a fallback for stale feed statuses when scores are available.
- Countdown copy now uses `min` instead of `m`.
