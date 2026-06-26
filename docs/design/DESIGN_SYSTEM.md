# Design System

The app uses a dark World Cup-inspired theme with green, gold, blue, and neutral slate accents.

## Design goals

- Consistency across tabs
- Strong mobile readability
- Minimal visual noise
- Clear distinction between actual results, user predictions, and provisional data

## Core patterns

### Cards

Cards should use consistent radius, border, padding, and shadows. Avoid one-off heavy gradients.

### Icons

Icons should remain fully visible. Do not dim icons by applying opacity to entire cards or disabled buttons.

### Expandable cards

Expandable cards should show a subtle affordance but should not look visually brighter than non-expandable cards.

### Locking and provisional state

- Confirmed teams: show lock icon.
- Provisional teams: grey the team row/flag when space allows.
- Mobile: reduce verbose labels to preserve team-name readability.

## Future work

Extract shared UI components:

- `AppCard`
- `StatCard`
- `TeamSlot`
- `StatusBadge`
- `RoundDivider`
- `SectionHeader`
