# Split LiveFeed and HistorySource, selected by one feed mode

The gateway reads market data through two interfaces: a LiveFeed that streams quotes and reports market status, and a HistorySource that returns bars. We split them because some providers can serve only history (Yahoo Finance), and a single interface would force fake implementations. One environment variable, `FEED=simulator|alpaca`, sets the feed mode and fixes both sides: the simulator serves live and history in simulator mode, and Alpaca serves both in Alpaca mode, with Yahoo as a fallback for history only. The default is the simulator, which needs no keys.

## Consequences

- If `FEED=alpaca` is set but the keys are missing or rejected, the gateway exits at startup with a clear error. It never falls back to the simulator, because that would mix simulated and real prices without telling the user.
- The core build has only the simulator behind both interfaces. Alpaca comes later and Yahoo is optional.

## Considered options

- **Yahoo Finance as a live feed:** rejected. Its stream is unofficial and undocumented, and it can change without notice. Alpaca's streaming cap is handled inside the Alpaca adapter (ADR 0021), its history limit by the cache (ADR 0011), and the simulator keeps the demo live at any hour. Adding another LiveFeed adapter later is a contained change.
