# Build order: core first, then extras

The core build lands first and is built so later extras slot in without rework. Extras follow in the order below.

- **Core:**
  - gateway: simulator feed, hub with conflation, REST for the list, history and `?symbols=`, and the history cache
  - `packages/contracts` and `packages/core`
  - web app: list, detail with chart ranges, and watchlist, with every loading, stale, offline and error state
  - watchlist on the device
  - the day-one conventions
  - minimal chaos controls
  - unit and end-to-end tests, and CI
  - the committed AI setup and the README
  - `pnpm dev` starting the gateway and the web app
- **Extras, in order:**
  1. Expo app, which joins `pnpm dev` once it exists
  2. hosted demo
  3. Alpaca adapter
  4. search
  5. connection health metrics
  6. server-side watchlist, keyed by device ID (ADR 0031)
- **Optional:** quick authentication replacing the device ID, Yahoo history fallback, PostHog adapter, Arabic translation, and orders and portfolio.

The Expo app is first among the extras, and its code starts at the core API freeze (ADR 0020). Mobile design can start at any time.
