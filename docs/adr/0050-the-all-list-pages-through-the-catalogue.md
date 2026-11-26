# The All list pages through the catalogue

Amends ADR 0007, which limited the list to the default list of 50. This adds a new paging hook. The full list of frozen core API additions below (ADR 0041) is for the owner to confirm in the PR.

The All list now scrolls through the whole catalogue: the default list first, then every other symbol in symbol order. That is 500 symbols on the simulator and about 10,000 on Alpaca. The gateway serves it one page at a time, and the list asks for the next page when its last row comes within 10 rows of the viewport.

- **Wire:** `GET /stocks?limit=` (1 to 100) returns a page with `nextCursor`: the last symbol of that page, or `null` at the end. `GET /stocks?limit=&cursor=` returns the page after that symbol. `symbols` cannot be combined with `limit` or `cursor`. A bare `GET /stocks` still returns the default list unchanged, because the watchlist relies on it.
- **Cursor:** a symbol, not an offset, so a catalogue refresh cannot shift the pages. A cursor that has left the catalogue continues at the next symbol after it in symbol order.
- **Empty pages:** a later page whose symbols all lack a current quote comes back empty with its `nextCursor`, and core steps over at most two such pages per fetch. The first page has no such allowance: with no current quote it is a 503, as the bare list is, so a market-wide gap shows an error instead of a crawl through the catalogue. A failed snapshot is always a 503.
- **Live rows:** unchanged from ADR 0007. A row subscribes while it is mounted, so only rows near the viewport are live however far the user scrolls. Each page seeds the quote store, so a new row shows a price before its snapshot arrives. A fast scroll past more than 100 symbols within the 2-second linger is handled by the capacity retry (ADR 0038).
- **Freshness:** pages never go stale in the query cache. An infinite query refetches every loaded page, and live prices already arrive over the socket, so refetching pages would only spend the REST rate limit.
- **Core API additions:** `useStockPages`, `StockPagesResult`, `stockPagesQueryOptions`, `stockQueryKeys.pages`, `RestClient.listStockPage` and the `list.more.error` message key. `useStockList` keeps its shape for the watchlist.
- **Sorting is out of scope.** The order is fixed, so paging stays a simple cursor. Sorting belongs on the watchlist, where the client holds a price for every row. Sorting All would need the gateway to rank the whole catalogue on live fields.

> **Design note:** "All is a browse list in one fixed order, so paging is a cursor over the catalogue, and because subscribed already meant visible, scrolling through 10,000 stocks costs no more live data than 50."

## Considered options

- **Send the whole catalogue index to the client and virtualise over it:** fine at 500 symbols and workable at 10,000, but every row still needs a quote, so it ends up as paging by another name.
- **An offset cursor:** simpler, but a catalogue refresh at the open or close would shift the pages and skip or repeat rows.
- **Page from the bare `GET /stocks`:** one URL fewer, but it would change what the watchlist receives. An explicit `limit` keeps paging opt-in.
