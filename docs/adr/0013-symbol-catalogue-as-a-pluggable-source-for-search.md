# The symbol catalogue is a pluggable source, and search runs on it in gateway memory

Search results must be exactly the symbols our live feed can price, so the catalogue is a third pluggable source next to LiveFeed and HistorySource (ADR 0003), selected by the feed mode. In simulator mode it is a committed JSON file of about 500 symbols, which the simulator can price, served through the same mocked asset-list shape as Alpaca. In Alpaca mode it is Alpaca's asset list, about 10,000 US symbols. The gateway loads it at startup, keeps it in memory, and refreshes it at every market open and close, when new listings appear. Alpaca has no search endpoint, only the full list, so keystrokes never cost a provider call.

Matching ranks an exact ticker first, then a ticker prefix, then the start of a word in the name, and returns at most 10 results. The client waits 150 ms after the last keystroke and cancels superseded requests, so a slow answer cannot replace a newer one. Results can be starred directly. Search is an extra, but it is self-contained and suited to a parallel agent.

## Considered options

- **Yahoo Finance search:** unofficial, and it returns foreign listings, funds and crypto that our feed cannot price.
- **Searching on the device:** fine at 500 symbols, not at 10,000, and the gateway is already the authority on which symbols are valid.
