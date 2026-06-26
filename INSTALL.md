# Install Notes — v3.1.0 Match OG Insights

Replace these files in your project:

```text
src/App.jsx
api/matchevents.js
engine/momentum/momentumEngine.js
public/version.json
VERSION
VERSION.md
CHANGELOG.md
```

After deploying, clear the match-event memory cache:

```text
https://world-cup-app-iota.vercel.app/api/matchevents?action=flush-all
```

Then hard refresh the app.
