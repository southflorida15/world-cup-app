# Contributing

Thank you for your interest in contributing to World Cup App.

This project is actively evolving, and thoughtful contributions are welcome.

---

## Ways to Contribute

You can help by:

- Reporting bugs.
- Suggesting features.
- Improving documentation.
- Improving UI polish.
- Adding screenshots.
- Improving tournament data.
- Testing live score behavior.
- Reviewing bracket logic.
- Improving accessibility.
- Improving performance.

---

## Development Setup

```bash
git clone https://github.com/southflorida15/world-cup-app.git
cd world-cup-app
npm install
npm run dev
```

---

## Before Opening a Pull Request

Please make sure:

- The app runs locally.
- The production build succeeds.
- Your change is focused.
- You describe what changed and why.
- You avoid committing API keys or secrets.
- You update documentation when needed.

Recommended checks:

```bash
npm run build
npm run lint
```

---

## Commit Style

Use clear, descriptive commit messages.

Examples:

```text
Improve match card layout
Add roadmap documentation
Fix third-place qualifier display
Update live score status handling
```

---

## Pull Request Guidelines

A good pull request should include:

- Summary of changes.
- Reason for the change.
- Screenshots for UI changes.
- Notes about testing.
- Any known limitations.

---

## Data Accuracy

Because this app involves tournament structure, match schedules, and live data, accuracy matters.

Please include a source or explanation when updating:

- Fixtures.
- Teams.
- Bracket logic.
- Historical records.
- Broadcasting information.
- Tournament rules.

---

## Security

Do not commit:

- API keys.
- Tokens.
- Credentials.
- Private configuration.
- Personal data.

See [SECURITY.md](SECURITY.md) for responsible disclosure.
