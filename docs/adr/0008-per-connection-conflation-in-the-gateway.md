# Per-connection conflation in the gateway

Prices are state, not events, so a client only ever needs the latest value. The gateway keeps the latest quote per symbol and, for each connection, the set of symbols that changed since its last frame. One timer runs every 250 ms. For each connection with changes, it sends one `quotes` frame with the current quote of every changed symbol and clears the set. If the socket's outbound buffer holds more than 64 KB, that connection is skipped for this round and its set is kept. The set holds symbol names, not prices, so it can never grow beyond the connection's subscriptions, and a slow client gets the latest prices when it recovers, never a backlog. A connection whose buffer stays above the threshold for 10 seconds is closed, and the client reconnects. Snapshots bypass the timer and are sent at once.

## Consequences

- At most 4 frames per second reach any client, whatever the upstream tick rate. A tick-rate spike from the chaos controls should show exactly that.
- Skipped flushes are counted, for connection health metrics.
- At scale, each gateway node runs the same loop for its own connections behind a shared pub/sub of latest quotes.

## Considered options

- **Forwarding every tick:** simple, but slow clients build a backlog and render stale prices in bursts.
- **A fixed 250 ms batch without checking the buffer:** caps the send rate but still queues frames for a slow socket.
