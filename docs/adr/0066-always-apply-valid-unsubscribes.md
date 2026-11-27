# Always apply valid unsubscribes

Amends ADR 0038's rule that messages other than subscribes are dropped over the socket rate limit.

A valid `unsubscribe` is always applied, including when the connection has exhausted its 20-message rolling one-second budget. It still consumes the budget when capacity remains. The gateway sends at most one anonymous `rate_limited` notice per second for over-limit non-subscribe messages, as before. Over-limit subscribes still receive a correlated refusal; chaos messages still do not execute. Malformed frames and oversized frames keep their existing handling.

The client removes a symbol from its subscription tracking when it sends the unsubscribe. Dropping that message at the gateway leaves the symbol subscribed indefinitely while heartbeats keep the connection healthy. Client pacing does not guarantee arrival pacing: a network stall can deliver several seconds of paced messages as a burst.

Unsubscribe removes membership and is idempotent. Repeating it does not add upstream work, and upstream subscription starts remain bounded by the subscribe limit. Always applying it also repairs released web and mobile clients without changing their wire messages. It must pass through `hub.unsubscribe` and its per-member queue: filtering against current membership before queuing would lose an unsubscribe whose preceding subscribe has not yet run.

This keeps the existing exposure to queued work while a subscribe waits for upstream data or a writable socket. Each frame remains limited to 16 KB and 500 requested symbols, and connections remain limited per IP. This change does not introduce a bound on the number of queued unsubscribe messages; overload handling that closes a connection can be added separately if needed.

## Considered options

- **Acknowledgements, request IDs and retries:** add protocol and client state, do not repair clients already released, and are unnecessary when the gateway processes every valid unsubscribe on the ordered socket. A lost socket already clears membership and reconnects from the client's current references.
- **Close on an over-limit unsubscribe:** repairs existing clients but makes all visible prices stale after one burst. Applying the removal keeps the healthy connection usable.
- **Retry on an anonymous rate-limit notice:** cannot identify the rejected operation and still requires new client state.

The protocol version stays at 1. No new dependency, client release or glossary term is required. The fix takes effect when the gateway is deployed; merging the PR alone does not deploy it.
