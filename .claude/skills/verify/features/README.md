# Web feature recipes

This folder is the source for proving the web app's user-facing behaviour with `bin/journey`. Feature IDs and test IDs match [`docs/feature-map.md`](../../../../docs/feature-map.md), which stays the product's list of what must be true. These files say how to reach each feature and drive it. If the two disagree, the product map wins, and the file here is drift to fix.

## Baseline preconditions

- `bin/stack up` has printed `stack: ready`, and `bin/stack doctor` shows every line as `ok`.
- The gateway is in simulator mode with `SIM_SEED=42`. The market is open by default, and no chaos switch is on.
- Each journey opens a fresh Chromium context, so `localStorage` is empty and the watchlist starts empty.
- Nothing else is driving this stack. Journeys run one at a time.

## Driving conventions

- Paths are relative to `WEB_URL`, which is `http://localhost:3000` unless `VERIFY_WEB_PORT` is set. Check with `bin/stack env`.
- Wait for `app-root[data-connection="connected"]` before acting on prices or stars. Stars are disabled until the page hydrates.
- Prefer `data-testid` and ARIA state. Per-symbol IDs end in the uppercase symbol, for example `star-AAPL`.
- Layout depends on width. At 1440 px a list pane sits beside the detail page, from 768 px up there is a `detail-back` link that returns to the list view the stock was opened from, and at 360 px there is a `header-back` button and search sits behind a "Search" button.
- Switch any chaos control you turn on back off before the journey ends. They are gateway-wide and otherwise revert only after 60 s.

## Proof and skip reporting

- Every step logs the action and the observed state in `steps.log`, under its feature ID.
- UI proof is a full-page screenshot taken after the expected state appears.
- Mutation proof is a second view of the stored value: `storage.json`, the state after a reload, or another tab.
- Console proof is `console.txt`. Any unexpected error or warning fails the journey.
- When a step cannot run, report the feature as BLOCKED with the unmet precondition. Never report it as verified through a different entry point.

## Feature entry contract

Each file has an H1 and a one-paragraph description, then exactly these H2s in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with bin/journey` (starting with `Preconditions:`), and `Gotchas`.

## Features

- [Watchlist](./watchlist.md): starring from a row, the detail page and search, plus order, persistence, cross-tab sync, empty and corrupt storage, and symbols outside the list.
- [Stock list](./stock-list.md): the first paint from the server, live ticks and flash, virtualisation at phone width, and the All and Watchlist toggle.
- [Stock detail](./stock-detail.md): opening a stock, the live chart point, scrubbing, range switching, deep links, the unknown-symbol 404 and phone back.
- [Language](./language.md): the English and Arabic toggle, the in-place switch to right to left, and the server render from the `locale` cookie.
- [Connection and chaos](./connection.md): the feed mode badge, the chaos panel, dropped and offline connections, forcing the market closed, and gateway health.
- The Expo app (M1 to M5) is walked on a phone or emulator. See [`../mobile.md`](../mobile.md).
