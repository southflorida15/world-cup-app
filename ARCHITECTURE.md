# Architecture

## High Level

    ESPN / News / Odds APIs
              │
              ▼
         API Endpoints
              │
              ▼
          Match Store (planned)
              │
     ┌────────┼────────┐
     ▼        ▼        ▼
    Status  Timeline  Localization
    Engine   Engine     Helpers
              │
              ▼
    Pages / Tabs / Components

## Guiding Principles

-   Single source of truth for match data.
-   One timeline formatter.
-   One status engine.
-   Shared localization helpers.
-   Production-first changes.

## Current Technical Debt

-   `src/App.jsx` should be modularized gradually.
-   Duplicate timeline formatting logic.
-   Continue extracting shared utilities into `src/i18n`.
