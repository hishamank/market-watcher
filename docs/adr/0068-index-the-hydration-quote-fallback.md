# Index the hydration quote fallback

`useQuote` reads the symbol store first. Before effects attach, server and hydrated renders can only find a quote in the query cache. Scanning and flattening every cached page for each row makes that fallback scale with both the cached catalogue and the mounted rows.

Keep one lazy symbol index per QueryCache in a WeakMap. Reuse quote objects and choose the newest timestamp, retaining the first source on a tie. Before reusing the index, compare query identities and data references. Additions, removals, replacement data and nested hydration therefore invalidate the index even before the provider's effect subscribes. Immutable query-cache writes are required, as they already are by TanStack Query.

Building costs O(Q + N) time and O(N + Q) retained references, where Q is the number of queries and N the cached quote count. Repeated fallback reads cost O(Q) for source validation and a map lookup; they do not traverse stock pages again. The normal seeded-store path is unchanged. The index is rebuilt lazily, so cache changes do no indexing work if the store already has the requested quote.

A subscription created during render would avoid the query-reference check, but abandoned renders and server rendering would have no cleanup lifecycle. An effect-only index would miss first-render and nested hydration data. Retain the small reference check instead. No new core API, dependency or subscription is needed.
