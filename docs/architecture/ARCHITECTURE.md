# Architecture

The World Cup App is a Vite + React app with Vercel serverless APIs.

## Main surfaces

- My WC: personalized status board.
- Live: live match list and match access.
- Schedule: full tournament schedule.
- Groups: standings and qualification state.
- Bracket: actual and simulated knockout paths.
- Fantasy: user predictions and leaderboard.
- Stats: team stats, head-to-head, scorers.
- Match OG: match center with lineups, timeline, stats, insights and commentary.

## Key data flows

### Live scores

`/api/livescores` feeds match status, scores and elapsed minute.

### Match events

`/api/matchevents` feeds Match OG, scorers, cards, lineups, stats, commentary and momentum inputs.

### Top scorers

Top scorers must come from the corrected match-events scorer endpoint:

`/api/matchevents?action=scorers`

Do not maintain independent scorer calculations in UI cards.

### My World Cup

My WC combines:

- saved favorite teams,
- schedule data,
- live score context,
- fantasy leaderboard and picks,
- scorer endpoint data.

The three match-status cards use kickoff-window logic:

- Last Matches: latest completed kickoff window.
- Live Matches: all live matches.
- Next Matches: next scheduled kickoff window.

### Version refresh service

`public/version.json` is the release control source.

The app compares deployed `refreshVersion` with the locally stored refresh version.

If changed and `forceRefresh` is true, the app shows an update message, stores the new refresh version and reloads.

## Local storage

Local storage is used for user preferences, saved teams, saved matches, fantasy identity and refresh metadata.

Do not rely on local storage as a source of truth for live tournament facts.

## Design direction

The app should be modularized over time. New major features should move into dedicated components rather than further expanding `App.jsx`.
