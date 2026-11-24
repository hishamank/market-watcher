# Gateway

Our market data server, between providers and devices: REST and one WebSocket.

- Providers plug in through four interfaces: LiveFeed, HistorySource, Catalogue and MarketCalendar, selected by `FEED`. A new provider is one adapter, and the hub, cache and routes stay as they are.
- The simulator is a pure function of seed, symbol and time. Tests inject the clock and the seed.
- Conflation follows ADR 0008: a set of changed symbols per connection, flushed every 250 ms, and skipped while the socket buffer holds more than 64 KB.
- Money maths goes through the contracts money module, and quotes leave the gateway pre-rounded.
- Every inbound message and REST input is parsed with the contracts schemas.
- Keys come only from the environment and stay out of logs and responses.
- Tests drive the real REST and socket interface, in-process.
