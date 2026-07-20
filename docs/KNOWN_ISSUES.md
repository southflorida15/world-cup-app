# Known Issues

## Top Scorers aggregate inflation

Status: fixed in v3.2.0/v3.2.1 packages.

Problem: the persisted scorer aggregate could double-count goals when matches were reprocessed.

Rule going forward: Top Scorers should use `/api/matchevents?action=scorers` and should not independently recalculate from stale aggregates in the UI.

## My WC Last Matches stale slot

Status: fixed in v3.2.1.

Problem: when a feed status was slow to flip to FT, Last Matches could show an earlier kickoff window.

Fix: My WC treats matches with a score and kickoff older than approximately 105 minutes as complete for status-board purposes.

## Mobile cached app state

Status: addressed with admin-controlled refresh in v3.2.0+.

Problem: mobile browsers may keep an old React state alive until the app is closed.

Fix: `version.json` controls startup/focus/visibility refreshes.
