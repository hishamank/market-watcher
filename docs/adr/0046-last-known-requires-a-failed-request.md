# Last-known marks require a failed request

Amends ADR 0045 after the PR #61 review reproduced a false mark at a healthy close.

Only the failure path reads the held fallback. A successful empty result, including a response discarded because it crossed a session boundary, remains unavailable and retryable without a mark. This can briefly return REST 503 during the five-second reuse window; the open screen retains its real quote until a current snapshot arrives.

The Alpaca adapter remembers failed requests per symbol and session. A failure from the previous phase cannot mark a skipped refresh in the new phase. A skipped refresh inside the reuse window still reports that failure; it cannot masquerade as empty success. An actual response missing requested symbols counts as a failed refresh. A boundary-discarded response clears the previous failure and can be retried after the existing reuse window.

Watchers retain marked symbols in the retry set independently of delivery. Conflation queues an identical marked copy once per member; a changed marked copy or a real quote queues another update. The hub retry path must work without adapter polls or trade events.

Core remains frozen. Socket quotes and snapshots, and REST refetches through the stock query functions (`stock-queries.ts`), go through `upsertMany`, whose upsert accepts an equal timestamp, so an open screen receives the mark. Only the query-cache sync path (`quote-cache-sync.ts`) compares strictly. It covers the server-prefetched list and detail and each app's overflow watchlist chunks, where a marked copy with the same timestamp as the held quote is not applied until the socket tick or snapshot delivers it. No core change is proposed.
