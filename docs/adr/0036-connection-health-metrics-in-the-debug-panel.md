# Connection health metrics in the debug panel

Core tracks reconnect count, frames per second, and tick latency, which is arrival time against the quote's source time, corrected with the welcome's `serverTime`. The gateway adds each connection's skipped-frame count to its heartbeats, and exposes `GET /health` with connection count, upstream symbols and cache hit rate. The metrics appear in the debug panel next to the chaos controls (ADR 0030) and nowhere in the user-facing UI.

## Consequences

- Tick latency is an approximation for the debug panel, not a measured round trip. Core keeps the largest `serverTime - arrival` seen from the welcome and heartbeats as the clock offset. That value is the clock skew minus the smallest one-way delay seen, so reported latency undercounts by that delay. With a steady 100 ms one-way delay, a tick that is really 120 ms old reads as 20 ms. The offset only ever grows, so it cannot adapt after the client's clock moves forward. A more accurate estimate would need the offset to age out or reset, or a measured round trip.
- Skipped frames belong to one connection. A new welcome clears the count until the new connection's first heartbeat, and the reconnect count stays cumulative per provider.
- `GET /health` stays public behind the REST rate limit for the demo. In production, detailed operational metrics belong on an internal or authenticated endpoint, with a separate minimal liveness endpoint if one is needed. CORS is not authentication.
