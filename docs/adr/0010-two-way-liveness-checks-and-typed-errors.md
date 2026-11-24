# Liveness checked in both directions, and typed errors

A socket can die without either side noticing, which on a trading app means prices that silently stop moving. We check liveness in both directions:

- **Client checks gateway:** the gateway sends an application-level `heartbeat` every 5 seconds, using the interval from `welcome`. We need an application-level message because browser JavaScript cannot see WebSocket protocol pings. Any message counts as a sign of life. After 10 seconds of silence (two missed beats), the connection status becomes stale: prices stay visible but dimmed, with a reconnecting banner. The client then reconnects with exponential backoff from 0.5 seconds up to 30 seconds, with full jitter so clients do not reconnect in lockstep after an outage.
- **Gateway checks client:** a protocol-level ping every 15 seconds, which browsers and phones answer automatically. A connection that does not answer is closed, and its subscriptions are released.

## When the connection status changes

- **Before the first welcome:** connecting. REST prices show normally, since they are fresh.
- **Socket closed or errored:** stale at once, then reconnect with backoff.
- **Silence past two heartbeats:** stale.
- **Back to connected:** only once the welcome and the snapshots for every referenced symbol have arrived, not merely when the socket opens.
- **No network:** offline, which overrides stale.
- **Stale banner:** offers a retry that resets the backoff.

When the device reports no network, the status is offline and the client does not retry until the network returns, then reconnects at once. The connection statuses are connecting, connected, stale and offline. "Live" is reserved for the feed mode.

Errors carry typed codes (`unknown_symbol`, `subscription_limit`, `rate_limited`, `invalid_message`) and leave the connection open. Only `unsupported_version` (ADR 0005) and a client stuck behind a full buffer (ADR 0008) close it.
