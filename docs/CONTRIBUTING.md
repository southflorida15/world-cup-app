# Contributing Notes

This project is evolving quickly during the World Cup. Favor small, testable changes.

## Development rules

- Do not break production to test experiments.
- Prefer local testing first.
- Keep major new UI in dedicated components when possible.
- Avoid duplicating scoring, standings or match status logic.
- Use existing helpers and design tokens.
- Mobile must be tested for every card and modal.

## Coding conventions

- Use clear helper names.
- Keep live-status logic centralized.
- Avoid one-off colors when design tokens exist.
- Prefer derived values from a single source of truth.
- Add comments around non-obvious tournament rules.

## Review checklist

- Does it work on mobile?
- Does it handle no data?
- Does it handle live matches?
- Does it handle simultaneous kickoffs?
- Does it need a `refreshVersion` bump?
- Does it follow `UI_GUIDELINES.md`?
