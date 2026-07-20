# Developer Notes

## App.jsx is large

`App.jsx` currently contains many features. Continue feature development carefully, but the long-term goal is to extract major sections into modules.

Suggested extraction order:

1. Stats tab
2. Fantasy tab
3. Actual Bracket
4. My Bracket
5. Team profile/history views
6. Shared UI components

## Fantasy and bracket separation

Do not allow fantasy score predictions to advance teams in the knockout bracket. Actual progression should come from actual match results or Actual Bracket logic.

## Historical aliases

Use backend merging in `api/zafronix.js` so all frontend consumers receive corrected historical records.

## Provider data

If a provider does not reliably supply a metric, do not display a placeholder card. Hide the metric until data is confirmed.
