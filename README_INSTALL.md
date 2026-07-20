# v3.3 Settings & Broadcasters Patch

Copy the files in this zip into your project by merging individual files, not replacing whole folders.

## Files

- `src/App.jsx` — patched from your uploaded `App(46).jsx`
- `src/components/BroadcastBadges.jsx`
- `src/components/WatchingFromSelector.jsx`
- `src/data/broadcasting.js`
- `src/utils/broadcasts.js`
- `src/utils/broadcastCountry.js`

## Important

Do not drag/drop the whole `src/components` or `src/data` folder over GitHub. That is what removed existing files before. Open each destination folder and upload/replace only the individual files above.

## What changed

- Adds a Preferences block in My Account.
- Adds “Watching from” selector with localStorage persistence.
- Uses browser locale fallback on first launch.
- Live/match cards use `BroadcastBadges` instead of hardcoded `match.tv`.
- Share/notification text uses the broadcaster engine.
- Mexico defaults to `ViX · TUDN`; Brazil defaults to `CazéTV`; US defaults to `FOX One · Telemundo · Peacock`.

## Testing

1. Deploy.
2. Open My Account. You should see ⚙️ Preferences and Watching from.
3. Change to Mexico. App reloads and cards should show ViX/TUDN badges.
4. Change to Brazil. Cards should show CazéTV fallback.
