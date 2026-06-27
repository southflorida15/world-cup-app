# World Cup App UI Guidelines

> North Star: the app should feel like a TV broadcast control room in your pocket.

The app should help users understand what just happened, what is happening now, what comes next, and why it matters.

## Design principles

- Information first; navigation second.
- Mobile-first, but never watered down.
- Live data takes priority over static content.
- Every screen should answer at least one of these questions: what happened, what is happening, what is next, why does it matter?
- Cards should be useful even before the user taps them.
- Never show empty states without explaining what the user can do next.

## Time and status formatting

### Countdown before kickoff

Use clear words. Do not use `m`, because it can be read as meters.

Preferred:

- `Kickoff in 8 min`
- `Kickoff in 1 h 20 min`
- `Kickoff tomorrow`
- `Kickoff in 2 days`

Avoid:

- `8m`
- `1h 20m`

### Match clock

Use standard football notation:

- `17'`
- `45+2'`
- `HT`
- `62'`
- `90+5'`
- `ET`
- `PEN`
- `FT`

## My World Cup status board

Default cards:

1. Last Matches
2. Today or Live Matches
3. Next Matches
4. Fantasy Rank
5. Top Scorers
6. Team Watch

If any match is live, replace Today with Live Matches.

- Last Matches = latest completed kickoff window.
- Live Matches = all currently live matches.
- Next Matches = next scheduled kickoff window.

Do not arbitrarily show the last two or next three matches. Always use the kickoff window logic.

## Match cards

Desktop:

`🇧🇷 Brazil 3 - 1 Japan 🇯🇵`

Mobile:

`🇧🇷 3 - 1 🇯🇵`

Always use spaces around the score dash.

For mobile, use flags only when team names risk wrapping.

## Favorite teams

Favorite-team matches should be visually emphasized with a ⭐.

If the user has no saved teams, show a friendly setup state instead of empty cards:

`Choose your teams to personalize Last Matches, Next Matches, Team Watch and alerts.`

## Team Watch

Each favorite team section should include:

- Total goals.
- Campaign form from oldest to newest: W, D, L.
- Latest match.
- Next match.

Colors:

- W = green.
- D = orange/gold.
- L = red.

## Insights / Match Flow

For live matches, Insights are calculated only through the current minute.

Live labels:

- Strongest Spell (so far)
- Longest Control (so far)
- Biggest Swing (so far)

Finished labels:

- Strongest Spell
- Longest Control
- Biggest Swing

Never show future synthetic minutes in live match insights.

## Icons

- ⚽ Goals
- 🅰️ Assists
- 🟨 Yellow cards
- 🟥 Red cards
- 🔄 Substitutions
- ⭐ Favorite team
- 🔴 Live
- 🏆 Champion / trophy context
- 📈 Momentum / trend
- ⚡ Strongest Spell
- 🔥 Biggest Swing

## Color semantics

- Green: positive / win / success / active.
- Gold or orange: neutral / draw / pending / warning.
- Red: negative / loss / urgent.
- Blue: informational.
- Purple: Fantasy.

## Empty states

Never leave a card blank. Examples:

- `No live matches right now. Next kickoff in 2 h 15 min.`
- `Choose your teams to unlock this card.`
- `Scorers will appear once live data loads.`

## Release update UX

Users do not choose whether to refresh. The app informs them, then refreshes automatically when the deployed `refreshVersion` requires it.

Message style:

`🏆 World Cup App Updated — Updating to v3.2.1...`

Check for forced refresh:

- on startup,
- when the browser tab regains focus,
- when the page becomes visible again on mobile.

## The Felipe Test

Before every release, ask:

> If I opened this app during the World Cup, would this be the first thing I need to know?

If not, simplify or move it out of the main path.
