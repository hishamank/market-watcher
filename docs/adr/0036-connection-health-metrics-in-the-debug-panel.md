# Connection health metrics in the debug panel

Core tracks reconnect count, frames per second, and tick latency, which is arrival time against the quote's source time, corrected with the welcome's `serverTime`. The gateway adds each connection's skipped-frame count to its heartbeats, and exposes `GET /health` with connection count, upstream symbols and cache hit rate. The metrics appear in the debug panel next to the chaos controls (ADR 0030) and nowhere in the user-facing UI.
