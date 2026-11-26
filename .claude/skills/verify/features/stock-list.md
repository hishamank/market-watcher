# Stock list

The home page lists 50 US stocks with name, symbol, price and day change. The rows arrive in the server HTML and then tick live over the gateway socket. The list is virtualised on small screens, and a toggle switches between All and Watchlist.

## Sub-features

- `L1` first paint from the server: the HTML before any JavaScript has rows with prices, and no row has an empty price.
- `L2` live ticks: prices change within seconds, and `data-flash` follows the row's day direction, not the tick-to-tick move.
- `L3` virtualisation at 360 × 740: fewer than 50 rows are mounted, scrolling to the bottom mounts the last symbol with a price, and there is no horizontal scroll.
- `L4` list error and retry when the gateway is down.
- `L5` All and Watchlist toggle, with browser back.

## How to get to it (user POV)

- Open `/`.
- Press **All** (`view-toggle-all`) on `/?view=watchlist`.
- Go back from a detail page: browser back, `detail-back` at 768 px, or `header-back` at 360 px. Both back controls are driven in [stock-detail](./stock-detail.md). The "Markets" title is not a link.

## Driving it with bin/journey

Preconditions:

- `bin/stack doctor` is all `ok`, and the gateway is answering.

- **Server HTML (L1).** Fetch `/` without a browser. Run `bin/journey stock-list`. At least 10 `stock-row-price-*` elements hold `$` prices, `stock-row-name-AAPL` reads "Apple Inc.", and `data-feed-mode="simulated"` is present. Evidence: `L1-server.html`.
- **Ticks (L2).** Open `/` at 1440 px and wait. The text of the `stock-row-price-*` elements changes within 10 s. The first `[data-flash]` element's `data-flash` equals its `data-direction`. Evidence: `L2-ticking.png`.
- **Toggle (L5).** Press `view-toggle-watchlist`, then browser back. The URL gains and then loses `?view=watchlist`, and `stock-list` is visible again. Press `view-toggle-watchlist` and then `view-toggle-all`: the URL is `/` again.
- **Virtualisation (L3).** At 360 × 740, open `/`. Fewer than 50 `stock-row-name-*` elements are mounted. Scroll to the bottom: the last symbol from `GET /stocks` (QQQ) is visible with a price, `stock-row-AAPL` has unmounted, and `scrollWidth` is at most 360. Evidence: `L3-top-360.png`, `L3-bottom-360.png`.
- **Proof.** `steps.log` has PASS for L1, L2, L3 and L5, and `frames.json` shows the `subscribe` frames for the visible symbols.

## Gotchas

- L4 needs the gateway stopped, and `bin/stack` has no "stop only the gateway" command. Cover it with `pnpm --filter ./apps/web e2e --project gateway-down --no-deps --grep L4`. Do not stop your walk gateway in the middle of a run.
- The 2-second unsubscribe delay for rows scrolled away (L3) is timed in E2E. The journey checks only mounting.
- `data-flash` lasts only a moment. Wait for any row to carry it, as the journey does, rather than waiting for a particular row.
- The reduced-motion half of L2 and React DevTools' highlight-updates check are not scripted. Use E2E for reduced motion (`--grep L2`) and a manual walk for highlight updates.
