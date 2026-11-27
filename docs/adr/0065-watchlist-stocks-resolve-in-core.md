# Watchlist stocks resolve in core

Amends ADRs 0041 and 0046.

Core exports `useWatchlistStocks()`, `WatchlistStocksResult` and `WatchlistStockRow`. The hook reads the starred symbols in watchlist order. Web uses the overall status and ordered stocks. Mobile uses each row’s stock, loading state and retry action.

Both apps wait for the All list until its first failure. Web can now load starred stocks by symbol when the All list fails. The resolver reuses fresh list, symbol and detail data and in-flight symbol batches. Every requested batch seeds the provider’s quote store, so an overflow batch can mark an equal-timestamp quote as last-known. This removes the overflow caveat in ADR 0046.

## Considered options

- Sharing only the planner would leave the apps responsible for starting queries and updating the quote store.
- Separate hooks for rows and overall status would give the apps two places to implement waiting and retry rules.
