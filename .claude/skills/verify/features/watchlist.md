# Watchlist

A user stars stocks from the list, the detail page or search results. The watchlist view shows starred stocks newest first, with live prices. Stars survive a reload, sync across tabs, and recover from corrupt storage.

## Sub-features

- `W1` star from a row: `aria-pressed` toggles at once, and every star for that symbol agrees.
- `W2` watchlist view: rows newest first and ticking, and unstarring removes the row at once.
- `W3` persistence: stars and their order survive a reload, and are stored in `localStorage["watchlist:v1"]`.
- `W4` cross-tab sync: a star made in one tab shows in another within 1 s, with no reload.
- `W5` empty state: `watchlist-empty` shows when nothing is starred.
- `W6` corrupt storage: `watchlist:v1 = "not json"` loads as empty, and starring works again.
- `W7` symbols outside the 50-symbol list (ABNB, SHOP) appear with name and live price.
- `D8` star from the detail header agrees with the list.
- `S3` star from a search result.

## How to get to it (user POV)

- The star at the end of any row on `/`: `star-{SYMBOL}`.
- The star in the detail header on `/stocks/{SYMBOL}`: `detail-star`.
- The star on a search result. Type in `search-input` in the header, then use `search-result-star-{SYMBOL}`. At 360 px, open search with the "Search" button first.
- The Watchlist toggle on `/`: `view-toggle-watchlist`. Or open `/?view=watchlist` directly.

## Driving it with bin/journey

Preconditions:

- `bin/stack doctor` is all `ok`.
- The journey opens a fresh context, so the watchlist starts empty.

- **Empty state (W5).** Open `/?view=watchlist`. Run `bin/journey watchlist`. `watchlist-empty` is visible and `watchlist:v1` is `null`. Evidence: `W5-empty.png`.
- **Row stars (W1).** On `/`, press `star-MSFT`, then `star-NVDA`. Both have `aria-pressed="true"` and storage reads `["NVDA","MSFT"]`. Evidence: `W1-row-stars.png`.
- **Watchlist view (W2).** Press `view-toggle-watchlist`. The URL ends `?view=watchlist`, the `watchlist-row-*` order is NVDA then MSFT, and `stock-row-price-NVDA` changes within 10 s. Evidence: `W2-watchlist.png`.
- **Persistence (W3).** Reload. The rows are still NVDA, MSFT and storage is unchanged.
- **Cross-tab (W4).** Open `/` in a second page of the same context and press `star-TSLA` there. The first page shows `star-TSLA[aria-pressed="true"]` within 1 s.
- **Detail star (D8).** Open `/stocks/AAPL` at 1440 px and press `detail-star`. `detail-star` and the list pane's `star-AAPL` are both pressed. Going back, the list's `star-AAPL` is pressed. Evidence: `D8-detail-star.png`.
- **Outside the list (W7).** Open `/stocks/ABNB`, press `detail-star`, then open `/?view=watchlist`. The first row is ABNB, `stock-row-name-ABNB` reads "Airbnb, Inc." and it has a price. Evidence: `W7-outside-list.png`.
- **Search star (S3).** On `/`, type `shop` into `search-input` and press `search-result-star-SHOP`. It is pressed and storage starts with `SHOP`. Evidence: `S3-search-star.png`.
- **Unstar (W2).** On `/?view=watchlist`, press `star-NVDA`. `watchlist-row-NVDA` disappears within 200 ms.
- **Corrupt storage (W6).** Set `watchlist:v1` to `not json` and reload. `watchlist-empty` shows. Then on `/`, press `star-MSFT`: it is pressed and storage reads `["MSFT"]`.
- **Proof.** `storage.json` holds the final stored value. `steps.log` has PASS for W1 to W7, D8 and S3, and `console.txt` has no unexpected entries.

## Gotchas

- The server renders stars neutral and disabled. Wait for `toBeEnabled()` before pressing one, or the click is lost.
- The order is newest first, so each new star goes to the top. Assert the order of `watchlist-row-*`, not just that the rows exist.
- D8's list-pane check needs 1440 px. Below that, the detail page shows `list-pane-skeleton` and no `star-AAPL`.
- W4 relies on the `storage` event, which fires only across pages in the same browser context. A second context is a different profile.
- W3's "no layout shift on hydration" and W7's "no refetch of cached symbols" are measured only in E2E (`pnpm --filter ./apps/web e2e --project chromium --grep "W3|W7"`).
- SW1, the server-side watchlist, is not built, so there is nothing to drive.
