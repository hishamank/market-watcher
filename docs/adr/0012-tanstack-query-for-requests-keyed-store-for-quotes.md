# TanStack Query for requested data, a keyed store for live quotes

Requested data and streamed data have different lifecycles, so they live in different places. TanStack Query owns everything the app asks for once: the stock list and history. A small keyed quote store in `packages/core`, with no new dependency, owns live quotes. It notifies listeners per symbol and plugs into React through `useSyncExternalStore`, so a tick for AAPL re-renders only the components showing AAPL, on web and React Native alike.

REST responses carry timestamped quotes. Once `CoreProvider` mounts, a query-cache subscription copies them into the quote store outside render, newer quotes only, so newest-wins (ADR 0009) applies. Until the store holds a symbol, `useQuote` falls back to the cached REST quote, which gives the first frame a price without seeding during render. Cached history is never modified by ticks. A pure function in core merges a symbol's bars with its live quote at render: it updates the last bar when the quote falls inside it, and appends a new bar when it falls after. Client freshness per range mirrors the gateway's (ADR 0011).

## Considered options

- **Live quotes in TanStack Query:** its fetch, refetch and garbage-collection model fights a stream.
- **Zustand:** runs every subscriber's selector on every change, whereas per-symbol listeners make one-row re-renders structural rather than hoped for, and need no dependency.
