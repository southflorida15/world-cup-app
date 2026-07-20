# TV Broadcasters + Watching From Settings Patch

## What this adds

- `src/data/broadcasting.js` — broadcaster metadata, defaults, and match-specific override table.
- `src/utils/broadcasts.js` — match/country broadcaster lookup helpers.
- `src/utils/broadcastCountry.js` — saved country preference + browser locale fallback.
- `src/components/BroadcastBadges.jsx` — reusable broadcaster badges.
- `src/components/WatchingFromSelector.jsx` — reusable “Watching from” selector for your user/settings modal.

## Where each file goes

```txt
world-cup-app/
├── src/
│   ├── components/
│   │   ├── BroadcastBadges.jsx
│   │   └── WatchingFromSelector.jsx
│   ├── data/
│   │   └── broadcasting.js
│   └── utils/
│       ├── broadcasts.js
│       └── broadcastCountry.js
└── INTEGRATION_GUIDE.md
```

## Behavior

The broadcaster country is resolved in this order:

1. User-selected country saved in `localStorage` as `broadcastCountry`.
2. Browser locale, for example `es-MX` becomes `MX`.
3. Fallback to `US`.

So Felipe in Mexico should default to Mexico. If he changes it to Brazil, the app remembers Brazil until he changes it again.

## Add the setting to your existing user/account modal

In the component/modal where you already show the app version, add:

```jsx
import WatchingFromSelector from "./components/WatchingFromSelector.jsx";
```

If that modal is inside `src/tabs` or another folder, adjust the path, for example:

```jsx
import WatchingFromSelector from "../components/WatchingFromSelector.jsx";
```

Then place this inside the modal body:

```jsx
<WatchingFromSelector C={C} onChange={() => window.location.reload()} />
```

The reload is optional, but it is the simplest way to make Schedule and Live immediately refresh everywhere after changing the country.

## Use the selected country in App.jsx

Add:

```js
import { getBroadcastCountry } from "./utils/broadcastCountry";
import { enrichMatchWithBroadcasts } from "./utils/broadcasts";
```

Then inside `App`, add:

```js
const userCountry = getBroadcastCountry("US");
```

Where matches are passed to Schedule/Live, enrich them:

```jsx
const matchesWithBroadcasts = MATCHES.map(m => enrichMatchWithBroadcasts(m, userCountry));
```

Then pass `matchesWithBroadcasts` instead of raw `MATCHES` where possible.

## Add broadcaster badges to match cards

Import:

```js
import BroadcastBadges from "./components/BroadcastBadges.jsx";
```

Inside your match card, below time/venue or where the current `tv` text appears:

```jsx
<BroadcastBadges match={m} country={userCountry} C={C} compact showConfidence />
```

If `userCountry` is not in scope inside the card, you can omit it because `BroadcastBadges` now reads the saved country automatically:

```jsx
<BroadcastBadges match={m} C={C} compact showConfidence />
```

## Mexico testing

From Mexico, first launch should default to:

```txt
MX
```

The fallback broadcaster list is currently:

```txt
ViX · TUDN
```

As match-specific Mexico listings are confirmed, add them in `src/data/broadcasting.js`:

```js
export const BROADCAST_BY_MATCH_ID = {
  86: {
    MX: ["vix", "canal5", "azteca7", "tudn"],
  },
};
```

## Brazil testing

Brazil currently falls back to CazéTV because it is the safest broad coverage fallback. Add Globo, SporTV, SBT, ge TV, or N Sports only when you confirm the exact match listing.
