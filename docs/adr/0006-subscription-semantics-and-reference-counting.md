# Subscription semantics and reference counting

A connection's subscriptions are a set, so subscribing to a symbol twice does no harm. `subscribe{symbols}` is answered by one `snapshot` message holding a quote for each requested symbol, including ones already held. Requests can partly succeed. Valid symbols are subscribed. Unknown symbols come back in one `unknown_symbol` error, and symbols beyond `maxSubscriptions` come back in one `subscription_limit` error. Unsubscribing from a symbol the connection does not hold does nothing.

Both ends count references. The gateway counts connections per symbol and starts the upstream stream when the count goes from 0 to 1, stopping it when it returns to 0. Alpaca's free tier streams at most 30 symbols on one connection, so the cost tracks distinct watched symbols, not users. The client counts components per symbol and coalesces queued subscribes and unsubscribes into one message per frame, so twenty rows mounting together send one message.

## Considered options

- **One snapshot message per symbol:** more frames for no benefit.
- **Rejecting a whole request because one symbol is bad:** one stale symbol in a watchlist would blank every price on screen.
