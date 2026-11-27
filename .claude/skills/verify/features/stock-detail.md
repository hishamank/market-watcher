# Stock detail

A stock's page shows its name, live price and change, and a price chart with six ranges. The chart's last point follows the live price, and a pointer or the keyboard can scrub through history. Unknown symbols get a 404 page.

## Sub-features

- `D1` open a stock: from a row or by URL, with a live header, the "Today" label on 1D, and back to the list.
- `D2` range switching: each range button sets `aria-pressed`, its label and a ready chart, and `?range=` deep links work.
- `D3` live point: `chart-last-price[data-price]` equals `detail-price` after every tick.
- `D4` scrubbing: `chart-readout` shows the time in ET, the price and the change, and the header returns to live when the pointer leaves.
- `D5` loading skeleton without layout shift, and `D6` history error with retry.
- `D7` unknown symbol: HTTP 404 with `not-found`.

## How to get to it (user POV)

- Click a row's name on `/`, for example `stock-row-name-AAPL`.
- Open `/stocks/AAPL` or `/stocks/AAPL?range=1Y` directly.
- Select a search result: `search-result-{SYMBOL}`, then its link.
- At 1440 px, click a row in the list pane beside the detail page.

## Driving it with bin/journey

Preconditions:

- `bin/stack doctor` is all `ok`, and History failures and latency are off in the chaos panel.

- **Open (D1).** On `/`, click `stock-row-name-AAPL`. Run `bin/journey stock-detail`. The URL is `/stocks/AAPL`, `detail-name` reads "Apple Inc.", `detail-change-label` reads "Today", and `detail-price` changes within 10 s. Evidence: `D1-detail.png`.
- **Live point (D3).** With `price-chart[data-state="ready"]`, wait for four ticks. After each one, `chart-last-price[data-price]` equals the number in `detail-price`.
- **Scrub (D4).** Move the pointer to 30% of the chart's width. `chart-readout` is visible and `detail-change-label` ends in " ET". Move the pointer above the chart: the label returns to "Today". Evidence: `D4-scrub.png`.
- **Ranges (D2).** Press `range-tab-1W`, `1M`, `3M`, `1Y`, `5Y` and `1D` in turn. Each gets `aria-pressed="true"`, the label reads "Past week", "Past month", "Past 3 months", "Past year", "Past 5 years" or "Today", and the chart reaches `ready`. Then open `/stocks/AAPL?range=1Y`: 1Y is selected and the label reads "Past year". Evidence: `D2-1Y.png`.
- **Unknown symbol (D7).** Open `/stocks/NOPE123`. The response status is 404 and `not-found` is visible. Evidence: `D7-not-found.png`.
- **From search (D1).** On `/`, type `msft` into `search-input` and click the link inside `search-result-MSFT`. The URL is `/stocks/MSFT` and `detail-name` reads "Microsoft Corporation".
- **From the list pane (D1).** At 1440 px on `/stocks/AAPL`, click `stock-row-name-NVDA` inside `list-pane`. The URL is `/stocks/NVDA`. Evidence: `D1-list-pane-1440.png`.
- **Tablet back (D1).** At 768 × 1024 on `/stocks/AAPL`, press `detail-back`. `stock-list` is visible.
- **Phone back (D1).** At 360 × 740, open AAPL from the list and press `header-back`. `stock-list` is visible. Evidence: `D1-detail-360.png`.
- **Proof.** `steps.log` has PASS for D1 to D4 and D7, and the 404 is listed in `console.txt` as allowed, with its reason.

## Gotchas

- `shot()` waits for the active native view transition before full-page capture. A visible detail price can precede transition readiness; capturing then can stall Chromium's transition capture (issue #92, ADR 0096). Keep the console gate and use the shared helper. The warm-route phone regression is in `journey-capture.spec.mjs`.
- D7's 404 makes the browser log "Failed to load resource: … 404". The journey allows exactly that message during D7. Do not widen the allowance to other steps.
- `detail-price` text has `$` and thousands separators, and `data-price` is a plain number. Strip `$` and `,` before comparing.
- Scrubbing replaces the header label with the scrubbed time. Assert on the label, not the price, to tell whether scrubbing is active.
- D5 and D6 need History latency or failures at 100%. Those are gateway-wide for 60 s and would break the next journey, so they are left to E2E (`pnpm --filter ./apps/web e2e --project chromium --grep "D5|D6"`). If you walk them by hand, set them back to off afterwards.
- `detail-error` and `detail-retry` (a stock that cannot load at all) need the gateway down. Cover them with E2E (`pnpm --filter ./apps/web e2e --project gateway-down --no-deps --grep D1`).
