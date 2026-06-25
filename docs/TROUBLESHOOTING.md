# Troubleshooting Guide

This guide documents common issues encountered while building and deploying the World Cup app.

## Vercel deployment did not update

### Symptoms

- Git push succeeds.
- GitHub shows latest commit.
- Production app still shows old UI.

### Checks

1. Confirm the commit hash in Vercel deployment details.
2. Confirm the deployment source branch is `main`.
3. Trigger the deploy hook manually if needed.

### Local alias

```bash
wcdeploy
```

If the alias is not available, check `~/.zshrc`.

---

## `npm run dev` triggers recursive Vercel error

### Error

```text
vercel dev must not recursively invoke itself
```

### Cause

The Vercel Development Command or `package.json` dev script is invoking `vercel dev` recursively.

### Fix

Use Vite directly for local development unless intentionally testing Vercel functions.

Expected scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

---

## Live scores return stale or wrong data

### Checks

Flush cache:

```text
/api/livescores?flush=1
```

Debug response:

```text
/api/livescores?debug=1
```

Inspect:

- `source`
- `cached`
- `age`
- match `fixture.status.short`
- match `goals.home` / `goals.away`

### Common causes

- Upstream provider delay.
- Cache still serving old response.
- Match window guard suppressing calls.
- API quota failure from fallback provider.

---

## football-data.org returns no live score

### Possible causes

- Provider has not updated status.
- Match is not marked `IN_PLAY` yet.
- Free tier exposes schedule but not rich event data.

### App behavior

The serverless mapper normalizes provider status into internal short statuses such as:

```text
NS, LIVE, 1H, HT, 2H, ET, FT
```

Do not rely on raw provider status values in UI code.

---

## Germany shows one World Cup title

### Cause

Historical provider records split Germany and West Germany.

### Fix

`api/zafronix.js` should merge:

```text
Germany + West Germany
```

Expected result:

```text
Germany titles: 4
```

---

## Other historical country records look incomplete

Check for historical aliases:

- Czechia / Czech Republic + Czechoslovakia
- Serbia + Yugoslavia + Serbia and Montenegro
- Russia + Soviet Union
- DR Congo + Zaire

If a team appears to have too few appearances, query both modern and historical names through:

```text
/api/zafronix?endpoint=team&name=<TEAM_NAME>
```

---

## Fantasy R16 does not populate from user picks

This is expected.

Fantasy score predictions should not determine bracket progression.

R16 Fantasy cards should populate from actual results / Actual Bracket state, not from predicted score winners.

Use My Bracket for personal winner simulation.

---

## Fantasy card is too crowded on mobile

Mobile Fantasy cards intentionally suppress verbose labels such as:

- `LEADING`
- `provisional`

The design goal is to preserve team-name readability on small screens.

---

## Stats icons look dimmed

### Cause

Disabled buttons or card opacity can dim child icons.

### Fix

Avoid disabling clickable-looking stat cards purely for visual reasons. If a stat has no expansion behavior, make it a non-disabled element or keep button opacity at `1`.

Do not apply opacity to the entire card unless all children should appear dimmed.

---

## Build fails with JSX bracket errors

### Common errors

```text
Expected "}" but found ";"
Expected ")" but found "}"
Unexpected "const"
```

### Cause

Usually a mismatched JSX conditional around blocks such as:

```jsx
{condition && (
  <div>...</div>
)}
```

### Fix

Check the block immediately before the reported line. The actual mismatch is often above the reported line.

---

## Kickoff time appears one hour off

### Cause

Static schedule and UTC mapping can disagree.

Example:

```text
8PM EDT = 00:00 UTC next day
9PM EDT = 01:00 UTC next day
```

### Fix

Search for the affected match ID and UTC timestamp in the project. Confirm both static display time and UTC value match.

---

## Useful debug searches

```bash
grep -n "Fantasy" src/App.jsx
grep -n "toLocaleTimeString" src/App.jsx
grep -n "Intl.DateTimeFormat" src/App.jsx
grep -n "finalPosition" src/App.jsx
grep -n "livescores" api/livescores.js
grep -n "HISTORY_ALIASES" api/zafronix.js
```
