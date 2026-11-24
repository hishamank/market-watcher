# One pipeline for every data source, with the history cache in the first cut

Every data source, the simulator included, plugs into the same two interfaces from ADR 0003 and flows through the same pipeline. Live quotes go through the hub (reference counts, latest quote, conflation) to the socket. History goes through a fallback chain and a cache to REST. Adding a provider means writing one adapter. We build the cache in the core build, even though the simulator generates history instantly, so the first cut proves the path a real provider will use and Alpaca adds no rework.

## How the history path behaves

- **Chain by feed mode:** `[simulator]` in simulator mode, never touching real data, and `[alpaca, yahoo]` in Alpaca mode.
- **Cache key:** symbol and range. Each range has a fixed bar size, so the bar size is not part of the key.
- **Freshness:** 1D for 60 seconds during the regular session, 1W for 5 minutes, 1M and longer until the next close. While the market is closed, entries stay fresh until the next open.
- **Size:** at most 500 entries, least recently used evicted first.
- **In-flight sharing:** concurrent identical requests share one upstream call.
- **Stale-while-revalidate:** an entry expired by less than its own freshness window (for 1D, between 60 and 120 seconds old) is served at once, unmarked, and refreshed in the background.
- **Older entries:** an entry past that window is refreshed before responding.
- **Failure order:** each source in the chain, then the expired entry marked with its age (the client shows an "as of" note), then an error. A response carries an age only when a refresh has actually failed.

## Consequences

- The simulator has latency and failure-rate settings, driven from the chaos controls, so cache sharing, revalidation and fallback can be shown and tested without a real provider.
- At scale, the in-memory cache becomes Redis with the same keys.
