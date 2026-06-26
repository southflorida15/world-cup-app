# Troubleshooting

## Vercel deployment did not trigger

Use the manual deploy hook alias:

```bash
wcdeploy
```

Then check Vercel deployments.

## Local dev recursion error

If `vercel dev` recursively invokes itself, check `package.json` and Vercel project settings. Do not configure Vercel's development command to call itself.

## Live scores are stale

Flush cache:

```text
/api/livescores?flush=1
```

Then inspect:

```text
/api/livescores?debug=1
```

## Germany historical stats are wrong

Check:

```text
/api/zafronix?endpoint=team&name=Germany
/api/zafronix?endpoint=team&name=West%20Germany
```

The production endpoint should merge these for Germany display.

## Fantasy R16 is not populated

Fantasy R16 should populate from actual R32 results, not user fantasy score picks. Verify Actual Bracket progression first.

## Icons are dimmed in Stats

Avoid applying opacity to entire cards or using disabled buttons that dim their children. Use enabled buttons with non-clickable behavior or style icons explicitly at full opacity.
