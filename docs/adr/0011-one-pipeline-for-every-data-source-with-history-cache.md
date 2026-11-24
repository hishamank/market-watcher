# One pipeline for every data source, with the history cache in the first cut

Every data source, the simulator included, plugs into the same two interfaces from ADR 0003 and flows through the same pipeline. Live quotes go through the hub (reference counts, latest quote, conflation) to the socket. History goes through a fallback chain and a cache to REST. Adding a provider means writing one adapter. We build the cache in the core build, even though the simulator generates history instantly, so the first cut proves the path a real provider will use and Alpaca adds no rework.

## How the history path behaves

- **Chain by feed mode:** `[simulator]` in simulator mode, never touching real data, and `[alpaca, yahoo]` in Alpaca mode.
- **Cache key:** symbol and range. Each range has a fixed bar size, so the bar size is not part of the key.
- **Freshness:** 1D for 60 seconds during the regular session, 1W for 5 minutes, 1M and longer until the next close. While the market is closed, entries stay fresh until the next open.
- **Size:** at most 500 entries, least recently used evicted first.
- **In-flight sharing:** concurrent identical requests share one upstream call.
- **Stale-while-revalidate:** an expired entry is served at once and refreshed in the background.
- **Failure order:** each source in the chain, then any expired entry (marked with its age), then an error.

## Consequences

- The simulator has latency and failure-rate settings, driven from the chaos controls, so cache sharing, revalidation and fallback can be shown and tested without a real provider.
- At scale, the in-memory cache becomes Redis with the same keys.
