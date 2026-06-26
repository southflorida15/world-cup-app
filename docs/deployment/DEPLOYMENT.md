# Deployment

The app is deployed on Vercel and connected to the GitHub repository.

## Repository

```text
https://github.com/southflorida15/world-cup-app
```

## Production App

```text
https://world-cup-app-iota.vercel.app
```

## Standard Deployment Flow

```bash
git status
git add .
git commit -m "Describe the change"
git push
```

Vercel should detect the push to `main` and create a new deployment.

## Manual Deploy Hook

A deploy hook can be used when automatic Git deployments do not trigger.

Example shell alias:

```bash
alias wcdeploy='curl -X POST "YOUR_VERCEL_DEPLOY_HOOK_URL"'
```

Run:

```bash
wcdeploy
```

Expected response includes a pending job id.

## Local Development

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview:

```bash
npm run preview
```

## Vercel Project Settings

Important settings:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: project root

Avoid recursive dev command settings that call `vercel dev` from inside `npm run dev` in a way that creates recursion.

## Environment Variables

Configure in Vercel project settings:

| Variable | Required | Purpose |
| --- | --- | --- |
| `FOOTBALL_DATA_API_KEY` | Yes | Primary live-score API |
| `KV_REST_API_URL` | Yes | Upstash Redis URL |
| `KV_REST_API_TOKEN` | Yes | Upstash Redis token |
| `RAPIDAPI_KEY` | Optional | Highlightly fallback |
| `RAPIDAPI_HOST` | Optional | Highlightly host |
| `ZAFRONIX_API_KEY` | If required | Historical stats provider |

## Troubleshooting

### Deployment not updating

Check Vercel deployment details:

- Source branch is `main`.
- Commit hash matches the pushed commit.
- Build succeeded.
- Production alias points to the newest deployment.

If Git deployment is stuck, trigger manual deploy hook.

### Build fails with JSX syntax error

Run locally:

```bash
npm run build
```

Look at the line number in `src/App.jsx`. Common causes:

- Missing closing `}`
- Missing closing `)`
- Extra `</div>`
- JSX conditional block not closed correctly

### Live scores stale

Flush cache:

```text
/api/livescores?flush=1
```

Then inspect:

```text
/api/livescores?debug=1
```

### Historical stats wrong

Check Zafronix endpoint output:

```text
/api/zafronix?endpoint=team&name=Germany
```

If historical data is split, add or verify alias merge in `/api/zafronix.js`.
