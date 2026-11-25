# Subscribe replies carry a request ID

Amends ADRs 0006 and 0010.

Every `subscribe` carries a `requestId` that the client chooses: a positive integer, unique within one connection. Every reply to that subscribe carries the same `requestId`, so the client matches a reply to its request by identity, not by arrival order. Order broke under rate limiting, slow sockets and upstream failures: the gateway answered out of order, answered anonymously, or not at all, and the client waited forever. A request ID belongs to one connection. On reconnect, the client drops every pending request and resubscribes its whole set under new IDs.

The gateway answers every subscribe it parses with exactly one terminal reply: a `snapshot`, or a `rate_limited` error when the subscribe arrived over the rate limit. Before the snapshot, it may send `unknown_symbol`, `subscription_limit` and `unavailable` errors carrying the same `requestId`. Each requested symbol, once duplicates are removed, appears exactly once, either as a quote in the snapshot or in one of those errors:

- **`unknown_symbol`:** not in the catalogue. Not subscribed.
- **`subscription_limit`:** beyond `maxSubscriptions`. Not subscribed.
- **`unavailable`:** a known symbol the gateway has subscribed to but cannot quote yet, because the upstream snapshot failed. It stays subscribed, and its first quote arrives as an ordinary `quotes` tick once the upstream recovers. `unavailable` is a promise that the subscription is kept, so the gateway sends it only for a symbol it has subscribed to.

If handling a subscribe throws inside the gateway, for example because the catalogue lookup fails, the gateway drops that connection's subscriptions and closes it with code 1011 (internal error) instead of answering. The client reconnects through the normal backoff and resubscribes its whole set. A gateway that cannot keep its promise ends the session rather than answer falsely.

The gateway never drops a terminal reply. A reply waits for the outbound buffer to drain, and a connection whose buffer stays full for 10 seconds is closed under ADR 0008, so the client reconnects and gets a fresh snapshot. A subscribe over the rate limit is still parsed and answered with `rate_limited` and its `requestId`. Other messages over the limit are dropped, with at most one `rate_limited` notice per second and no `requestId`. A frame that fails to parse gets `invalid_message` without a `requestId`, since nothing in it can be trusted.

The client settles a request when its terminal reply arrives:

- **Quotes always count.** A snapshot updates the quote store whether or not its `requestId` is pending, under the existing newest-timestamp rule. A late or unknown ID settles nothing.
- **A symbol the reply does not account for** is treated as `unavailable`: it stays subscribed and waits for its first tick.
- **`rate_limited`** settles the request, and its symbols are queued again for a flush at least 1 second later.
- **No terminal reply within 10 seconds:** the client resends once under a new `requestId`. If that also goes unanswered for 10 seconds, it closes the socket and reconnects through the normal backoff. A late reply to an abandoned ID still updates quotes but settles nothing.
- **Pacing:** the client sends at most 10 messages a second per connection, half the gateway's limit. Coalescing already batches subscribes and unsubscribes into one message each per flush, and flushes are spaced at least 200 ms apart.

The protocol version stays at 1, because no client of the old shape was ever released.

## Considered options

- **Keep matching by order and close the gaps:** three review rounds kept finding new cases where async handlers, the rate limiter or backpressure broke the order. Correctness that depends on timing is fragile.
- **Fold the symbol errors into the snapshot:** one message per request is easier to correlate, but it restructures every reply and the error union that the gateway and core already build on.
- **Keep a failed subscribe pending and retry it:** keeps the connection open, but needs new pending state, and a symbol later found unknown has no clean way to be reported, because its request is already answered.
- **Close the connection on a rate-limit breach:** fewer reply rules, but one burst would flip every price on screen to stale. A paced client never hits the limit, so an answer that keeps the connection open costs little.
