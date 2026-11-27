# Feature Map

Every feature from the user's point of view: where it lives, how to reach it, how to find it on the page, and what must be true. The verify skill (`.claude/skills/verify`) drives these flows and reports pass or fail per feature ID. Tickets list the feature IDs they touch, and a ticket is not done until verify passes for those IDs.

Terms follow [`glossary.md`](./glossary.md). Decisions are in [`adr/`](./adr), and the spec is [`spec.md`](./spec.md).

## Conventions

- **Environment for verification:** gateway on `http://localhost:4000` with `FEED=simulator` and `SIM_SEED=42`, and web on `http://localhost:3000`. The verify skill's `bin/stack up` starts both, and its `features/` folder holds the driving recipe for each web feature.
- **Selectors:** `data-testid` on web and `testID` on mobile, with the same names. Per-symbol IDs end with the uppercase symbol, for example `stock-row-AAPL`.
- **State attributes,** so checks never depend on copy or colour:
  - `app-root` has `data-connection` (`connecting`, `connected`, `stale`, `offline`), `data-feed-mode` (`simulated`, `live`) and `data-market-status` (`open`, `closed`).
  - A price element has `data-direction` (`up`, `down`, `flat`) and, briefly after a tick, `data-flash` (`up`, `down`).
  - A star is a button with `aria-pressed`.
  - Web range buttons use `aria-pressed` in a labelled group.
  - The chart container has `data-state` (`loading`, `ready`, `error`) and `data-direction` (`up`, `down`, `flat`), the range's direction that sets the line colour.
  - The chart's live point has `data-price`, the close of the last point drawn on the chart, written right after the chart call.
- **Check type:** **E2E** means covered by the Playwright suite, and **Walk** means the agent checks it in a real browser for look and feel. Most features are both.
- **Stage:** R features were built first, N features followed, O features were optional.

## Global

### G1. Feed mode badge (R, E2E)

- **Where:** header on every page.
- **Test IDs:** `feed-mode-badge`, `app-root[data-feed-mode]`.
- **Steps:** open `/`.
- **Expected:** the badge reads "Simulated", and `data-feed-mode="simulated"` is present in the server-rendered HTML, before hydration. With `FEED=alpaca` the badge reads "Live". The badge never changes while the page is open.

### G2. Market status (R, E2E + Walk)

- **Where:** header, and the detail header.
- **Test IDs:** `market-status-label`, `app-root[data-market-status]`, `chaos-force-closed`.
- **Steps:** open `/?debug=1`, then press **Force market closed**.
- **Expected:**
  - **Open (simulator default):** `data-market-status="open"` and no Market closed label.
  - **After forcing closed:** within 1 s, `data-market-status="closed"`, "Market closed" is shown, and prices stop ticking.
  - **After 60 s:** it reverts by itself to open, and ticks resume.

### G3. Connection status (R, E2E + Walk)

- **Where:** a banner under the header, on every page.
- **Test IDs:** `connection-banner`, `connection-retry`, `app-root[data-connection]`, `chaos-drop`, `chaos-freeze`, `chaos-offline`.
- **Steps and expected:**
  1. Load `/`. `data-connection` goes from `connecting` to `connected` within 2 s. No banner shows while connected, and REST prices are not dimmed while connecting.
  2. **Drop:** press **Drop connection**. At once, `data-connection="stale"`, the banner reads as reconnecting, and prices are dimmed. Within a few seconds it returns to `connected`, the banner disappears, and prices are fresh.
  3. **Freeze:** press **Freeze feed**. After 10 to 11 s, `stale` and the banner show. It then reconnects and recovers.
  4. **Gateway stopped:** stop the gateway process. At once, `stale`, and the backoff grows (attempts spread out up to 30 s). Press `connection-retry` and an attempt happens at once. Start the gateway, and it returns to `connected` without a reload.
  5. **Offline:** press **Go offline**, or set the browser offline. `data-connection="offline"`, the banner says Offline, and no reconnect attempts are made. Going back online reconnects at once.
  6. **Recovery rule:** `connected` returns only after the welcome and the snapshots for all visible symbols have arrived, not when the socket merely opens.

### G4. Quality bar (R, Walk)

- **Where:** every page.
- **Expected:**
  - It works at 360 px and 1440 px wide, with no horizontal scroll at 360 px.
  - Everything is reachable and operable by keyboard, with visible focus.
  - Gains and losses carry a sign and an arrow, not colour alone.
  - With reduced motion set, there is no price flash.
  - Buttons, rows and segmented controls answer the pointer (hover, press, sliding indicator), and with reduced motion everything rests in its final state (ADR 0048).
  - Opening a stock from a list row moves its name and price into the detail header where the browser supports view transitions.
  - From 768 px to 1279 px the list is a compact table with a header row; the header shows the brand mark before "Markets" (ADR 0049).
  - From 1440 px the table adds "Day high" and "Day low" after "Previous close" (`stock-row-high-{SYMBOL}`, `stock-row-low-{SYMBOL}`). Each row's low is at or below its price and its high at or above it, the high never falls and the low never rises while the list ticks, and that stock's 1D chart never goes above the high or below the low. From 1280 px to 1439 px the table has no such columns (ADR 0063).
  - The console shows no hydration warnings and no errors during any flow.
  - Nothing in the layout uses physical left or right; the CI check enforces this.

### G6. Arabic and right to left (O, E2E + Walk)

- **Where:** the header on every page on web, and Settings on mobile.
- **Test IDs:** `language-toggle[data-locale]`, `language-option-en`, `language-option-ar`, `html[lang]`, `html[dir]`.
- **Steps:** open `/`, press "ع", reload, then press "EN".
- **Expected:**
  - On web the toggle shows "EN" and "ع" in that order in both languages, with the current one filled (`aria-pressed`). Pressing the other slides the fill across and swipes the labels; where the page turns, only the end of the swipe is seen. With reduced motion it switches at once. On mobile the language rows in Settings read "English" and "العربية", with a check on the current one (M6).
  - Pressing it switches every string to Arabic and mirrors the layout in place, with no reload. The socket stays connected and prices keep ticking. Where the browser supports view transitions the page turns like a card, one way to Arabic and the other way back, and `html[data-locale-turn]` is set while it turns (ADR 0097); with reduced motion it switches at once.
  - `html` has `lang="ar"` and `dir="rtl"`. After a reload the server render already has them, from the `locale` cookie, with no flash of English and no hydration warning.
  - Prices, symbols, percentages, times and the chart stay left to right, with Latin digits. Month names are Arabic ("26 نوفمبر"). The back chevron mirrors; arrows, star and search do not. Range tabs and the view control mirror, and the selected indicator follows the flip.
  - Arabic counts use their plural forms ("سهمان" for 2, "3 أسهم", "11 سهمًا").
  - **Mobile:** the rows sit in Settings, behind the gear at the end of the tab header. They flip in place too (root `direction` style and Expo Router's `LocaleProvider`), and the choice is saved on the device.

### G7. Web theme switch (O, E2E + Walk)

- **Where:** header on every web page, including phone widths.
- **Test IDs:** `theme-switch` (`role="switch"`, `aria-checked` indicates dark mode), `html[data-theme]`.
- **Expected:** follows the system until toggled; clicking, Space or Enter switches the page and chart between light and dark. The choice survives navigation and reload and syncs across tabs. Invalid or blocked storage keeps the control usable. Saved themes apply before hydration.
- **Walk:** at 360 and 1440 px, inspect list and detail in both themes, hover the sun/moon to reveal its orbit, and toggle to see the eclipse. Focus is visible from the keyboard, reduced motion is immediate, and the header and search remain usable without overflow. Check the canvas axes, series and previous-close line follow the theme while prices keep ticking.

## Stock list (`/`)

### L1. First paint from the server (R, E2E)

- **Reach:** open `/`.
- **Test IDs:** `stock-list`, `stock-row-{SYMBOL}`, `stock-row-name-{SYMBOL}`, `stock-row-price-{SYMBOL}`, `stock-row-change-{SYMBOL}`.
- **Expected:**
  - The HTML response, before any JavaScript runs, contains rows with name, symbol, price and day change for the first window of the list.
  - No row ever shows an empty price.
  - Day change shows money and percent, with a sign and an arrow.
  - Prices use tabular numerals, with 2 decimals at or above $1 and 4 below.

### L2. Live ticks (R, E2E + Walk)

- **Reach:** open `/` and wait.
- **Test IDs:** `stock-row-price-{SYMBOL}[data-flash]`.
- **Expected:**
  - Visible rows' prices change within a few seconds. When a row's price changes, `data-flash` is briefly set to the tick's direction: `up` when the new price is above the one before, `down` when below, whatever the day did. A tint fades behind the price and the changed digits roll up. A row flashes at most once a second, and never on first render (ADR 0047).
  - With reduced motion, `data-flash` is set but no tint or roll plays.
  - A tick re-renders only the rows whose symbol changed. Check with React DevTools' highlight updates during the walk.

### L3. Virtualisation, infinite scroll and visible subscriptions (R, E2E + Walk)

- **Reach:** open `/` at 360 × 740.
- **Test IDs:** `list-more-loading` (rows shown while the next page loads), `list-more-error`, `list-more-retry`.
- **Expected:**
  - Fewer than 50 `stock-row-*` elements are in the DOM.
  - Scrolling to the bottom mounts later rows (the 50th symbol is reachable), and each newly visible row shows a price at once and starts ticking.
  - Scrolling past the 50th symbol loads the next page of the catalogue, and keeps going to the end of the catalogue. No symbol appears twice (ADR 0053).
  - If a page fails to load, or the next pages have no current prices, `list-more-error` appears below the rows with `list-more-retry`, the list stops asking for pages until it is pressed, and the rows already loaded stay live.
  - In the socket frames, symbols that scrolled away are unsubscribed about 2 s after leaving, and fast scrolling back within 2 s causes no unsubscribe.

### L4. List error and retry (R, E2E)

- **Reach:** stop the gateway, then open `/`.
- **Test IDs:** `list-error`, `list-retry`, `list-skeleton` (rows shown while the list loads in the browser).
- **Expected:** an error message with a retry button, and no infinite spinner and no blank page. Start the gateway and press `list-retry`, and the list appears without a reload.

### L5. All and Watchlist toggle (R, E2E)

- **Test IDs:** `view-toggle-all`, `view-toggle-watchlist`.
- **Expected:**
  - Selecting Watchlist sets `?view=watchlist`, and selecting All removes it. The switch is instant, with no server render (ADR 0050).
  - The back button restores the previous view.
  - Loading `/?view=watchlist` directly shows a skeleton (`watchlist-skeleton`) on the server render, then the watchlist after hydration.
  - The selected option's indicator slides to the new option (Walk). With reduced motion it jumps.

### L6. Column manager (N, Walk)

- **Reach:** from 768 px, press **Columns** next to the All and Watchlist toggle, on `/` or `/?view=watchlist`.
- **Test IDs:** `columns-button`, `columns-menu`, `column-toggle-{column}` (`name`, `symbol`, `price`, `change`, `changePercent`, `previousClose`, `dayHigh`, `dayLow`, `lastUpdate`), `columns-reset`.
- **Expected:**
  - Until someone changes a column, each width shows its usual layout, and the menu's checkboxes match it. Name and Price are checked and disabled.
  - Unchecking or checking a column removes or adds it in the header and every row at once, and saves the choice to `localStorage["table-columns:v1"]`. The choice survives a reload, applies at every width from 768 px and follows to other tabs.
  - When the chosen columns are wider than the list, the list scrolls sideways, with Name pinned at the start. The page itself never scrolls sideways.
  - **Reset to default** appears only after a change. It clears the saved choice and brings back the usual layout for each width.
  - The menu stays within the space below the button and scrolls when the window is short (for example 1024 × 360), so every option and Reset stay reachable. It closes on Escape or on a click outside it. Below 768 px there is no Columns button, and the list pane beside the stock page keeps its rows (ADR 0064).

## Stock detail (`/stocks/[symbol]`)

### D1. Open a stock (R, E2E)

- **Reach:** click `stock-row-AAPL`, or open `/stocks/AAPL`.
- **Test IDs:** `detail-header`, `detail-name`, `detail-price`, `detail-change`, `detail-change-label`, `detail-previous-close`, `detail-day-high`, `detail-day-low`, `detail-last-update`, `detail-back` (back link at every width from 768 px), `header-back` (360 px back button), `list-pane` (the 1440 px list beside the detail), `list-pane-skeleton` (its server render and below 1440 px), `detail-error` and `detail-retry` (the stock itself could not be loaded).
- **Expected:**
  - The URL is `/stocks/AAPL` and the header shows name, symbol and the live price, which ticks.
  - With the default range 1D, the change label reads "Today".
  - The server render contains the header with a price.
  - Below the tabs, "Day high" and "Day low" sit between previous close and last update. They move with the live price, the low is at or below it and the high at or above it, and the 1D chart never goes above the high or below the low (ADR 0063).
  - From 768 px, `detail-back` stays visible even beside the desktop list pane. It returns to `/` or `/?view=watchlist` according to the detail URL’s `view` parameter; unknown or absent values default to all. The phone uses `header-back` with the same destination. Row and search navigation preserve this parameter, including across range changes, reloads and pane navigation.
  - If the stock cannot be loaded at all (gateway down), `detail-error` replaces the header skeleton, and `detail-retry` loads it once the gateway answers.

### D2. Range switching (R, E2E)

- **Test IDs:** `range-tab-1D`, `range-tab-1W`, `range-tab-1M`, `range-tab-3M`, `range-tab-1Y`, `range-tab-5Y`.
- **Expected:**
  - Selecting a range button sets `?range=` and `aria-pressed`, redraws the chart, and changes the header's change and label (for example "Past year" on 1Y).
  - Returning to a range already viewed draws at once, with no `data-state="loading"`.
  - Opening `/stocks/AAPL?range=1Y` directly renders 1Y.
  - Chart colour matches the range direction, and the header shows a sign and an arrow.

### D3. Chart with live point (R, E2E + Walk)

- **Test IDs:** `price-chart[data-state]`, `price-chart[data-direction]`, `chart-last-price[data-price]`.
- **Expected:**
  - On 1D the x-axis spans the full session, with a dashed previous-close line, and the line ends at the current time. The "Previous close" label sits in the strip above the plot, never on the line or the live point.
  - The chart's last point equals `detail-price` at every tick.
  - After a reconnect (G3, step 2), the 1D line has no flat gap.

### D4. Scrubbing (R, Walk)

- **Steps:** move the pointer across the chart, or use arrow keys when it is focused.
- **Test IDs:** `price-chart` (focusable), `chart-readout`, `detail-change-label`.
- **Expected:** the readout shows the price at the point, its time in ET, and the change from the start of the range. On 1D, moving into the shaded future part keeps the crosshair and readout on the live point. Leaving the chart returns the header to the live price.

### D5. Range switch keeps the chart without layout shift (R, E2E + Walk)

- **Steps:** open `/stocks/AAPL?debug=1`, set **History latency** on, then switch to a range not yet viewed.
- **Test IDs:** `price-chart[data-state]`, `price-chart[aria-busy]`, `chart-updating`, `detail-change-label`, `chaos-history-latency`.
- **Expected:** the previous range stays drawn with `price-chart[data-state="ready"][aria-busy="true"]` for about 2 s, with no skeleton. After 150 ms the chart and the header's change row dim and `chart-updating` shows a spinner over the plot. The header label keeps the previous range until the new one arrives, then the chart, change and label switch together and `aria-busy` turns `false`. Nothing on the page moves (layout shift is about 0).

### D6. History error and retry (R, E2E)

- **Steps:** in the chaos panel, set **History failures** to 100%, then switch to a range not yet viewed.
- **Test IDs:** `price-chart[data-state="error"]`, `chart-retry`, `chart-as-of`, `chaos-history-failures-0`, `chaos-history-failures-50`, `chaos-history-failures-100`.
- **Expected:**
  - The chart area shows an error with retry, and the header keeps ticking.
  - Turn failures off and press `chart-retry`, and the chart draws.
  - With failures at 100% on 1D, viewed more than 2 minutes earlier, the chart shows the older copy with an "as of" note instead of an error. A 1D copy between 60 and 120 seconds old shows without a note, because it is refreshed in the background.

### D7. Unknown symbol (R, E2E)

- **Reach:** open `/stocks/NOPE123`.
- **Test IDs:** `not-found`.
- **Expected:** a not-found page with HTTP status 404 and a link back to the list.

### D8. Star from detail (R, E2E)

- **Test IDs:** `detail-star`.
- **Expected:** pressing it toggles `aria-pressed`. Starring pops the icon and bursts an amber ring and six dots over 400 ms, only on the pressed button. Unstarring, hydration and remounts stay still. Reduced motion fills at once with no animation. Hover has no square fill; mouse clicks have no focus ring, keyboard focus keeps its visible outline. Going back to the list shows the same state on `star-AAPL`.

### D9. Company overview (N, E2E + Walk)

- **Where:** below key statistics on web and mobile.
- **Test IDs:** `company-profile` with `data-state` loading/ready/error on web (absent when empty), `company-description`, `company-profile-toggle`, `company-profile-sector`, `company-profile-industry`, `company-profile-exchange`, `company-profile-website`, `company-profile-source`, `company-profile-retry`.
- **Expected:** readable description, Read more/Show less with expanded state, compact facts and a safe external website link where supplied. Fund profiles say About the fund and omit company-only facts. Missing fields are omitted. Source and retrieval time identify Yahoo data; simulator profiles explicitly say Sample company information.
- **Isolation:** profile failure offers retry without blanking the quote/chart. Absent or all-null profiles hide the section. Switching symbols never shows the previous company's profile or expanded state.
- **Walk:** 360 px and 1440 px, both themes, long expanded description, keyboard focus, and no horizontal overflow. Mobile uses the same data and can scroll through the overview. Mobile device walk remains owner-run.
- **Live proof:** directly request Yahoo profiles for an equity and an ETF. No credentials are needed. Real provider availability is not a CI requirement.

### D10. Key statistics (N, E2E + Walk)

- **Where:** below the price card/detail facts and above the company overview.
- **Test IDs:** `stock-statistics` with `data-state` loading/ready/error on web (absent when empty), `statistics-{marketCap,trailingPE,trailingEps,dividendYield,averageVolume,yearRange}`, `statistics-range-marker`, `statistics-source`, `statistics-retry`.
- **Expected:** six metrics, two columns on phones and three on desktop; compact market cap/volume, trailing P/E and EPS labels, indicated dividend yield, and a labelled 52-week bar where the source supplies one. Simulator trailing P/E and year range show — (ADR 0080). Missing values show —, zero is preserved and negative EPS retains its minus. Funds omit company-only valuations. Monetary values are USD. Yahoo source/retrieval time or sample attribution is visible.
- **Isolation:** statistics failures offer retry while prices and the company overview remain available; absent or all-null statistics hide the section. Symbol changes never reuse another symbol's statistics.
- **Range:** when supplied, the latest gateway price sets the marker, clamped to the endpoints; a flat range has no marker. An absent range, including the simulator default, shows —. The last price remains readable independently. Labels are static; there are no information buttons or expanding explanations.
- **Walk:** 360, 768 and 1440 px; light/dark and Arabic; static field labels, no horizontal overflow and left-to-right numbers/range. Mobile device walk remains owner-run.
- **Live proof:** direct Yahoo AAPL and SPY statistics requests, without credentials. Full live Alpaca flow is separate.

### D11. Company news (N, E2E + Walk)

- **Where:** below the company overview on web and mobile.
- **Test IDs:** `stock-news` with `data-state` loading/ready/error on web (absent when empty), `news-story`, `news-more`, `news-retry`, `news-source` (web).
- **Expected:** three headlines initially, publisher or destination site, dates with year and ET, and thumbnails only where supplied. Show more reveals up to nine stories; Show less restores three. Symbol navigation resets expansion. Live links open externally with safe new-tab attributes on web; simulated headlines are labelled fictional and have no article links. Yahoo attribution and retrieval time appear for live data.
- **Isolation:** unavailable news retries independently while prices, profile and statistics stay usable. Empty feeds hide the section. Failed thumbnails disappear without hiding the headline.
- **Walk:** phone/tablet/desktop, both themes and languages; no horizontal overflow; keyboard expansion and safe external links; clean thumbnail-free rows. Mobile device walk remains owner-run.
- **Live proof:** direct gateway-adapter RSS requests for AAPL and SPY. No credentials needed; upstream availability is not required in CI.

### D12. Earnings (N, E2E + Walk)

- **Where:** between key statistics and the company overview.
- **Test IDs:** `stock-earnings` with loading/ready/error state on web, `earnings-next`, `earnings-latest`, `earnings-chart`, `earnings-quarter` (web), `earnings-source`, `earnings-retry`.
- **Expected:** future report date/range with Scheduled, Estimated or Date not confirmed; latest actual EPS and estimate; up to four chronological fiscal quarters with actual/estimate bars and readable amounts. USD and GAAP/non-GAAP/unknown basis are explicit. Zero is $0.00, losses remain negative and missing estimates use —. All bars share a zero baseline. Source/retrieval time or sample attribution is visible.
- **Unavailable:** no earnings section for ETFs or empty responses, and no blank date/chart subparts for partial data. D9/D10/D11 also omit empty sections. Failure offers retry without stopping live prices.
- **Walk:** 360/768/1440 px, light/dark, English/Arabic; fiscal sequence and numeric chart stay LTR, no overflow; losses, zero and missing estimates; phone interactions remain owner-run.
- **Live proof:** AAPL/MSFT have fiscal EPS/date data; SPY returns no earnings without requesting equity-only modules. Full authenticated Alpaca flow is separate.

## Watchlist

### W1. Star from a row (R, E2E)

- **Test IDs:** `star-{SYMBOL}`.
- **Expected:** pressing it toggles `aria-pressed` at once, and every star for that symbol on screen agrees. On All, starring sends a star along a curve into `view-toggle-watchlist`, which bumps, when that toggle is on screen and not covered. Nothing flies under reduced motion (ADR 0062).

### W2. Watchlist view (R, E2E + Walk)

- **Reach:** star MSFT, then NVDA, then select `view-toggle-watchlist`.
- **Test IDs:** `watchlist`, `watchlist-row-{SYMBOL}`.
- **Expected:** NVDA is first, then MSFT. Rows show name, price and day change, and they tick. Unstarring removes the row at once.

### W3. Persistence (R, E2E)

- **Steps:** star two symbols, then reload.
- **Expected:** both are still starred, in the same order. On the server render the stars are neutral, and they fill after hydration without a layout shift.
- **Write failure:** a rejected storage write rolls back only the failed intent and shows a localized accessible error. Later toggles remain usable, and reloading reflects the successfully persisted stars.

### W4. Cross-tab sync (R, E2E)

- **Steps:** open `/` in two tabs and star TSLA in one.
- **Expected:** the other tab shows TSLA starred within 1 s, with no reload. A failed write does not change the other tab; the next successful toggle synchronizes normally.

### W5. Empty state (R, E2E)

- **Reach:** clear site data, then open `/?view=watchlist`.
- **Test IDs:** `watchlist-empty`, `watchlist-suggestions`.
- **Expected:** a friendly hint explaining how to star, and no error. Below it, three live stock rows with stars under "Start with one of these". Starring one shows the watchlist with that stock. In browsers with view transitions, that row moves into the watchlist and the empty state fades out, and unstarring the last row reverses it. With reduced motion the swap is instant (ADR 0062).

### W6. Corrupt storage (R, E2E)

- **Steps:** set the stored `watchlist:v1` value to `not json`, then reload.
- **Expected:** the app loads with an empty watchlist and no error overlay, and starring works afterwards.

### W7. Symbols outside the list (R, E2E)

- **Steps:** open `/stocks/ABNB`, star it, then open the watchlist view.
- **Expected:** ABNB appears with its name and a live price, even though it is not one of the 50 list symbols.

### W8. Watchlist sorting (N, E2E + Walk)

- **Reach:** from 768 px, star MSFT, NVDA and AAPL, then open the watchlist.
- **Test IDs:** `watchlist-sort-{column}` (`name`, `symbol`, `price`, `change`, `changePercent`, `previousClose`, `dayHigh`, `dayLow`, `lastUpdate`), each with `data-sort` (`asc`, `desc`, `none`).
- **Expected:**
  - Only the watchlist header has sort buttons; All keeps its fixed order. Below 768 px there is no header and no sorting: a `sort` in the URL is ignored there. A malformed `sort` is ignored at every width.
  - Hovering or focusing a label shows a faint arrow beside it, in the gap between columns, without moving any label (Walk). The sorted column's arrow is solid. Pressing `view-toggle-all` from a sorted watchlist fades that arrow out in place instead of removing it at once, and with reduced motion it goes at once (Walk).
  - Pressing a button sorts the rows and sets `?sort={column}-{direction}`. Name and Symbol start ascending; the others start descending. Rows without a day range sort last on Day high and Day low. The second press reverses, and the third returns to newest-starred order and removes `sort`.
  - The order stays still while prices tick. Unstarring a row keeps the others in place.
  - Reloading, or opening a stock and coming back, keeps the sort (ADR 0099).

## Chaos controls (`?debug=1`)

### C1. Panel availability (R, E2E)

- **Test IDs:** `chaos-panel`, `chaos-close`.
- **Expected:** with `?debug=1` in simulator mode, the panel opens. Without the flag, or in Live mode, it is not rendered, and the gateway rejects `chaos` messages in Live mode.

### C2. Tick-rate spike shows conflation (R, E2E)

- **Test IDs:** `chaos-tick-spike`.
- **Expected:** after pressing it, prices move far more within each frame, but the socket still receives at most 4 `quotes` frames per second. The E2E test counts frames.

### C3. Automatic revert (R, E2E)

- **Test IDs:** `chaos-tick-spike`, `chaos-history-latency`, `chaos-history-failures-0`, `chaos-history-failures-50`, `chaos-history-failures-100`, `chaos-force-closed`, `chaos-countdown-tick-spike`, `chaos-countdown-history-latency`, `chaos-countdown-history-failures`, `chaos-countdown-force-closed`.
- **Expected:** every control that affects all connections (tick spike, history latency, history failures, force closed) turns itself off after 60 s, and the panel shows a countdown. Sending an active control again does not restart its 60 s. With `CHAOS_SCOPE=connection` (the hosted gateway), the gateway refuses these four controls with `invalid_message` and nothing changes for any connection ([ADR 0072](adr/0072-chaos-scope-keeps-shared-controls-off-public-gateways.md)).

## Search (N)

### S1. Search by ticker or name (N, E2E)

- **Test IDs:** `search-input`, `search-result-{SYMBOL}`.
- **Expected:** typing "aapl" lists AAPL first, and typing "app" includes Apple. At most 10 results. A request is sent 150 ms after typing stops.

### S2. No out-of-order results (N, E2E)

- **Steps:** throttle the network (browser "Slow 3G", or a Playwright route delay), then type "a", then "ap", then "apple" quickly.
- **Expected:** the final results match "apple", and earlier requests show as cancelled in the network log.

### S3. Star and open from results (N, E2E)

- **Expected:** `search-result-star-{SYMBOL}` toggles the star, and selecting a result opens its detail page.

## Connection health (N)

### H1. Metrics in the debug panel (N, E2E + Walk)

- **Test IDs:** `health-reconnects`, `health-fps`, `health-latency`, `health-skipped`, `health-diagnostics`.
- **Expected:**
  - The values update live, and the reconnect count goes up after **Drop connection**.
  - Expand diagnostics to inspect transport, handshake, settled recovery, symbol availability, pending request deadlines and the client send queue. Web output scrolls within a 256px height limit; mobile shows selectable diagnostic text. Raw upstream messages are excluded.
  - After a brief slow-network spell pushes the send buffer over 64 KB and recovers within 10 s, the next delivered heartbeat reports more skipped frames, and quotes resume with the latest prices. Browser tab throttling does not create this backpressure.
  - `GET /health` on the gateway returns connections, upstream symbols and cache hit rate.
- **Proof for skipped frames:** no Walk. The gateway conflation seam test, the core seam test, and a scripted probe: a client that pauses its socket against the real gateway, then resumes and reads the next heartbeat. The probe runs in a network namespace with a 1500-byte MTU and TCP buffers capped at 64 KB, because default Linux buffers absorb several hundred KB before the gateway's own buffer grows.

## Server-side watchlist (N — planned, not implemented)

### SW1. Watchlist follows the device ID (N, planned — not implemented; see #22)

- **Status:** Intentionally deferred (issue #22). Included here only as the planned acceptance criteria from [ADR 0031](./adr/0031-server-side-watchlist-keyed-by-device-id.md); the current implementation stores the watchlist on device only (W1–W7).
- **Expected (when implemented):**
  - Stars persist after clearing local storage but keeping the device ID.
  - Stars made before the feature existed are uploaded once.
  - A failed toggle (gateway stopped) rolls back with a toast.

## Hosted demo (N)

### HD1. Public demo smoke test (N, Walk)

- **Expected:** the Vercel URL loads with the Simulated badge and ticking prices at any hour, and `?debug=1` works there.

## Mobile app (N)

The app runs in Expo Go against the walk gateway on the LAN, and the owner walks it on a phone. Launch and doctor steps are in the verify skill's [`mobile.md`](../.claude/skills/verify/mobile.md). Test IDs are `testID`s, named as on web.

### M1. Tabs and navigation (N, Walk)

- **Reach:** open the app in Expo Go.
- **Test IDs:** `tab-markets`, `tab-watchlist`, `stock-row-{SYMBOL}`, `detail-header`, `detail-name`, `detail-price`.
- **Expected:**
  - The app opens on Markets, with Markets and Watchlist tabs.
  - Tapping a row opens the detail screen for that symbol, titled with the ticker, with the name and a ticking price. Back returns to the list at the same scroll position.

### M2. List (N, Walk)

- **Reach:** the Markets tab, then the Watchlist tab.
- **Test IDs:** `stock-list`, `stock-row-{SYMBOL}`, `stock-row-name-{SYMBOL}`, `stock-row-price-{SYMBOL}`, `stock-row-change-{SYMBOL}`, `star-{SYMBOL}`, `list-skeleton`, `list-error`, `list-retry`, `list-more-error`, `list-more-retry`, `watchlist`, `watchlist-row-{SYMBOL}`, `watchlist-skeleton`, `watchlist-empty`.
- **Expected:**
  - Rows show name, symbol, price and day change (arrow, signed money, signed percent). Prices tick within a few seconds, and a tint flashes behind a price that moved, green when it rose and coral when it fell, at most once a second per row. With reduced motion, no tint shows.
  - Tab and star icons are drawn icons, not text characters. Starring gives a light haptic tap, and changing range a selection tick.
  - The list is virtualised: only rows near the screen are mounted, and rows scrolled into view show a price at once and start ticking.
  - Scrolling Markets past the 50th stock loads the next page of the catalogue, with a skeleton row while it loads and `list-more-error` with `list-more-retry` if it fails (ADR 0053).
  - A star toggles at once and agrees across both tabs. The watchlist lists starred stocks newest first, they tick, and unstarring removes the row at once. Stars survive closing and reopening the app.
  - With nothing starred, the Watchlist tab shows the empty state, and its action returns to Markets. Switching between the empty state and the list fades the new content in, and the empty state's star pops when it returns. Neither plays when the tab first loads.
  - Skeletons pulse between 100% and 55% opacity, and a user starring a stock gets a 400 ms pop, expanding amber ring and six dots. Saved stars stay still on mount. With reduced motion both are static.
  - A saved stock that fails to load keeps its row, with its ticker, the list error, Retry and its star, so the Watchlist tab is never blank.

### M3. Detail (N, Walk)

- **Reach:** tap `stock-row-AAPL` on the Markets tab.
- **Persistence failure:** a failed star change rolls back and announces a localized error, as in W3. `watchlist-error-dismiss` dismisses the error; later toggles remain usable. The same error is available in Markets, Watchlist and Search.
- **Test IDs:** `detail-header`, `detail-name`, `detail-price`, `detail-change`, `detail-change-label`, `detail-star`, `range-tab-1D`, `range-tab-1W`, `range-tab-1M`, `range-tab-3M`, `range-tab-1Y`, `range-tab-5Y`, `price-chart` (its accessibility value is `loading`, `ready` or `error`), `chart-skeleton`, `chart-updating`, `chart-error`, `chart-retry`, `chart-as-of`, `chart-readout`, `detail-day-change`, `detail-previous-close`, `detail-day-high`, `detail-day-low`, `detail-last-update`, `detail-skeleton`, `detail-error`, `detail-retry`, `not-found`.
- **Expected:**
  - The header shows the symbol, name, live price and the range change with its label ("Today" on 1D), and below the tabs the day change, previous close, day high, day low and last update in ET. A range that has never loaded shows a dash in place of its change.
  - Each range tab redraws the chart and changes the header's change and label (for example "Past year" on 1Y). A range already viewed draws at once. The line is green or coral by the range's direction, and the header pill keeps its sign and arrow.
  - On 1D the axis spans the whole session, a dashed line marks the previous close, and the line ends in a live point that moves with the header price.
  - Pressing and dragging on the chart shows a crosshair and a readout with the time in ET, the price and the change from the start of the range. The header follows the finger. Lifting the finger returns the header to the live price.
  - While the range loads, a skeleton of the final size shows. If it fails, the chart area shows "Couldn't load this chart" with `chart-retry`, and the header keeps ticking. An older copy of the range shows a muted line with no live point and `chart-as-of`.
  - The star toggles at once and agrees with the list.

- **M4. Lifecycle:** background for more than 10 s closes the socket, and foreground reconnects with fresh prices and no chart gap.
- **M5. Connection states:** stale, offline and recovery, as in G3. On Markets, Watchlist and detail, `connection-banner` appears below the header. Stale offers `connection-retry`; offline does not. Connecting and connected hide the banner. Prices are muted while stale or offline.

### M6. Settings (N, Walk)

- **Reach:** tap `settings-button` at the end of the Markets or Watchlist tab header.
- **Test IDs:** `settings-button`, `settings-screen`, `theme-option-system`, `theme-option-light`, `theme-option-dark`, `language-option-en`, `language-option-ar`.
- **Expected:**
  - The gear pushes the Settings stack screen. Settings is not a tab.
  - The theme choice applies at once to every screen, including the chart, and survives a relaunch. System follows the OS live.
  - Switching language flips the app in place, and the socket stays connected.
  - With reduced motion, the segmented indicator jumps instead of sliding.
  - In Arabic, check the header, the back chevron and the segmented control.
  - If `Appearance.setColorScheme` cannot override the theme in Expo Go, the fallback allowed by #94 replaces the segmented control with a single Dark mode switch (`theme-dark-switch`). Then check that on and off apply at once to every screen and survive a relaunch, and that the PR records why.

### M7. Status strip with feed mode (N, Walk)

- **Reach:** Markets, Watchlist or the detail screen.
- **Test IDs:** `status-strip`, `feed-mode-badge`.
- **Expected:**
  - The strip reads "Simulated" with a hollow dot, and "Live" with a filled dot when the gateway runs with `FEED=alpaca`.
  - It never changes while the app is open, and the list never shifts when the feed mode arrives.
  - With the gateway down, the strip stays empty.
  - In Arabic, the dot and the word follow the reading direction.

### M8. Market status in the status strip (N, Walk)

- **Reach:** turn on **Force market closed** from the web chaos panel at `/?debug=1` against the same gateway, or from M10.
- **Test IDs:** `market-status-label`.
- **Expected:**
  - Within 1 s, "Market closed" shows with a moon icon and prices stop flashing. Nothing shows while the market is open.
  - It reverts by itself after 60 s, and the strip's height never changes.
  - Screen readers announce it politely when it appears.

### M9. Search (N, Walk)

- **Reach:** tap `search-open` in the Markets or Watchlist tab header, or open the `/search` deep link.
- **Test IDs:** `search-open`, `search-back`, `search-input`, `search-clear`, `search-idle`, `search-skeleton`, `search-no-results`, `search-error`, `search-retry`, `search-results`, `search-result-{SYMBOL}`, `search-result-star-{SYMBOL}`.
- **Expected:**
  - Search opens full screen, sliding up from the bottom (fading with reduced motion), with no native header, a back chevron beside the field and the keyboard up. Search is not a tab. The back button is announced as "Close", whichever tab opened Search. The focused field shows the focus border and ring, and nothing shifts on focus or blur.
  - Idle shows "Find a stock". Typing "aapl" lists AAPL first, with at most 10 results, each with its symbol, name and star. Loading shows 56 px skeleton rows, and an unknown query shows the no-results state.
  - The results fit the space above the keyboard, so on a small phone the list of 10 results ends at the top of the keyboard and scrolls to the last row.
  - The first tap on a result opens its detail screen while the keyboard is up. Opening a result and going back keeps the query. From a cold `/search` deep link, Back goes to Markets.
  - The star agrees with Markets, Watchlist and detail.
  - With the gateway down the error state offers `search-retry`, and Retry loads results once the gateway is back. Offline and stale show `connection-banner` below the field.
  - In Arabic, the symbol and name stay left to right. The back chevron mirrors, and the search icon does not.

### M10. Chaos controls and connection health (N, Walk)

- **Reach:** in simulated mode, turn on `debug-toggle` in the Settings Debug section, then tap `chaos-open` in a tab or detail header.
- **Test IDs:** `debug-toggle`, `chaos-open`, `chaos-drop`, `chaos-freeze`, and web's other `chaos-*` and `health-*` IDs from C1 to C3 and H1.
- **Expected:**
  - Diagnostic JSON remains left-to-right in both languages, including brackets. The sheet scrolls the full diagnostic text; dragging from tiles or controls still reaches the last line in global scope.
  - The controls and their revert behave as C1, C3 and H1 on web. The entry point is the Settings switch, not a `?debug=1` URL.
  - The Debug section is hidden until the feed mode is known, shows only when it is simulated, and is absent in Live mode.
  - `debug-toggle` starts off, and `chaos-open` appears in the headers only while it is on. The choice survives a relaunch.
  - The reconnect count rises after **Drop connection**.

### G5. Last-known quote (Live-only, automated seam + view tests)

- **Where:** list row and detail, web and mobile.
- **Test IDs:** `stock-row-as-of-{SYMBOL}`, `detail-price-as-of`.
- **Proof:** Alpaca gateway tests cross a close with snapshot failures: existing watcher tick, new subscriber snapshot, REST list/detail including unwatched holdings, recovery without the mark, and 503 without a held copy. Healthy boundaries remain unmarked. Contracts reject false.
- **Views:** web rendered view test and mobile props-mapping test prove clock, neutral signed change, accessible sentence and detail explanation. Date and time use formatMarketDateTime; connection stale keeps the clock and mutes the price.
- **Verification:** automated tests only for the marked state. Simulator quotes are stamped now, so no simulator browser/device walk can reach it. Full web E2E and mobile checks cover regressions.

### G9. Per-symbol quote availability (E2E, Walk)

- **Where:** list row and detail, web and mobile.
- **Test IDs:** `stock-row-as-of-{SYMBOL}`, `detail-price-as-of`.
- **Expected:** a healthy initial subscription awaiting settlement adds no financial warning or layout shift. An unavailable terminal response shows "Current price unavailable" and mutes that symbol's price. This failure remains visible through retries until a valid quote arrives. A healthy transport and other symbols remain healthy. A valid quote restores availability, independently of its last-known warning. Quiet symbols do not age into unavailable.
- **Verification:** production socket-proxy regression covers real request IDs, unavailable plus terminal snapshot, healthy neighbors, last-known recovery and full recovery at desktop and 360px. Native interaction requires a device; core tests cover capacity refusal and restart recovery.

### G8. Web metadata and discoverability (R, E2E)

- **Where:** `/`, `/stocks/[symbol]`, `/robots.txt`, `/sitemap.xml`, `/icon.svg`.
- **Expected:** each stock has a company-and-symbol title, description and matching social metadata in crawler HTML. Range and view parameters use the base route canonical. Language switching updates metadata and persists after reload. The app icon resolves. Unknown symbols return noindex and a 404 to non-streaming crawlers; gateway failures retain a symbol title and noindex. Production sitemap lists the homepage and initial gateway stock list; preview pages emit noindex. See ADR 0061.

## Feed identity recovery (A1, issue #111)

G1 additionally requires that a replacement gateway cannot mix Live and Simulated data. A conflicting welcome, REST result or hydrated response hides all market content behind `feed-reload-required`. Web's `feed-reload` button reloads the document; mobile explains that the app must be restarted. Retry and network/lifecycle changes do not dismiss this state. Same-feed reconnects retain G3 behavior.

Verification: core regression tests cover both mode directions, pending REST/history/supplemental data and hydration. Chromium covers replacement welcome, incompatible history and full reload. Mobile M1/M4/M7 require observing the blocking screen, readable English/Arabic instructions and successful recovery after an app restart.
