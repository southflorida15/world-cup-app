# API Reference

This document describes the app's serverless API endpoints.

## `/api/livescores`

Returns normalized live-score data.

### Query Parameters

| Parameter | Purpose |
| --- | --- |
| `debug=1` | Include diagnostic details |
| `flush=1` | Clear Redis live-score cache |

### Normal Response

```json
{
  "response": [],
  "cached": false,
  "source": "football-data.org"
}
```

## `/api/zafronix`

Proxies Zafronix historical/team data.

### Common Query

```text
/api/zafronix?endpoint=team&name=Germany
```

### Historical Alias Behavior

For selected teams, the endpoint merges historical names before returning the response.

Example:

```text
Germany = Germany + West Germany
```

## `/api/matchevents`

Provides event-level match data where available.

Used for stats such as fastest goal. The app should only display fastest-goal UI when reliable event data exists.

## `/api/bracket-share`

Creates or retrieves shareable bracket snapshots.

Used by My Bracket sharing.
