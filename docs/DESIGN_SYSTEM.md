# Design System

The app uses a dark, stadium-inspired visual design with green, gold, and blue accents. Recent work has focused on reducing inconsistent gradients, shadows, spacing, and card styles.

## Design Goals

1. Mobile-first.
2. High contrast.
3. Consistent cards.
4. Clear hierarchy.
5. Avoid excessive gradients and shadows.
6. Keep team names readable on small screens.

## Theme Colors

Core palette currently lives in `App.jsx` as `C`.

Important values:

| Token | Purpose |
| --- | --- |
| `bg` | App background |
| `s1` | Primary surface |
| `s2` | Secondary surface |
| `b1` | Subtle border |
| `b2` | Stronger border |
| `green` | Primary success/active color |
| `gold` | Trophy/highlight color |
| `blue` | Secondary action color |
| `red` | Warning/loss/error color |
| `text` | Primary text |
| `mid` | Secondary text |
| `dim` | Muted decorative text |

## Design Tokens

A small `DS` token object exists for:

- spacing
- border radius
- shadows
- borders

Recommended usage:

```js
DS.space.sm
DS.radius.md
DS.shadow.card
DS.border.subtle
```

## Cards

Cards should use:

- consistent padding
- consistent border radius
- subtle border
- limited shadow
- no unnecessary opacity dimming

Avoid dimming an entire card just to show disabled/inactive state, because it also dims icons and important values.

Instead:

- change border
- change background
- show a status badge
- disable only controls

## Icons

Stat and feature icons should remain bright and readable.

Avoid:

```js
opacity: 0.45
```

for icons unless the entire item is intentionally unavailable.

Disabled buttons can dim child content by default. If a card is not clickable, prefer a non-button wrapper rather than a disabled button.

## Mobile Cards

Mobile cards should prioritize:

1. Team names
2. Scores
3. Status
4. Actions

Avoid long labels like:

- `PROVISIONAL`
- `LEADING`

when they make team names hard to read.

Use visual states instead:

- greyed-out provisional team
- lock icon for confirmed team
- subtle border for pending state

## Gradients

Use gradients sparingly.

Good use cases:

- Trophy/champion cards
- Major section headers
- One or two hero elements

Avoid gradients on every card.

## Shadows

Use minimal, consistent shadows.

Avoid heavy glow effects unless they communicate a specific state such as champion, live, or selected.

## Buttons

Recommended button types:

- Primary action
- Secondary action
- Danger/reset action
- Pill toggle
- Icon action

Each type should have a consistent color and border treatment.

## Status Badges

Common statuses:

- LIVE
- HT
- FT
- LOCKED
- TBD
- QUALIFIED
- ELIMINATED
- CHAMPION

Badges should be short and legible.

## Future Design Cleanup

1. Extract shared `Card` component.
2. Extract shared `Button` component.
3. Extract shared `Badge` component.
4. Extract shared `TeamSlot` component.
5. Normalize all tab headers.
6. Normalize all spacing between tabs and section content.
