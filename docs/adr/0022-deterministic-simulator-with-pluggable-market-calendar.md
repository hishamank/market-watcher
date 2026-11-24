# A deterministic simulator and a pluggable market calendar

A simulated price is a pure function of seed, symbol and time. History and live ticks both read from it, so the last point of every chart equals the live price by construction, a gateway restart does not change the past, and two gateway instances agree. Tests inject a clock and a seed and can assert exact prices. The intended construction is seeded daily closes with seeded paths between them, so daily, intraday and per-second samples agree. The simulator ticket starts with a 30-minute spike on that construction. If it proves impractical, the fallback is deterministic history per range with its last point pinned to the live price. That keeps the visible guarantee and drops cross-range agreement.

The market calendar is a fourth pluggable piece selected by the feed mode, next to LiveFeed, HistorySource and the catalogue. The simulator calendar is always open, and each UTC day is one session: the previous close is the price at 00:00 UTC, and the 1D chart is today's session on a full-day axis. That keeps the demo alive at any hour, and the Simulated badge keeps it honest. In Alpaca mode the calendar comes from Alpaca's clock and calendar endpoints, which cover holidays and early closes. The gateway is the only place that reads the calendar. The chaos controls can force the market closed in simulator mode, so the closed state can be shown.

## Considered options

- **Following the New York calendar in simulator mode:** anyone outside New York market hours would see a closed, frozen app.
- **A random walk that keeps state:** history and live drift apart, and restarts rewrite the past.
