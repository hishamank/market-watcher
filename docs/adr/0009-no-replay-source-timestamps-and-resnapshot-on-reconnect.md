# No replay: source timestamps, newest wins, re-snapshot on reconnect

Prices are state, not events, so missed ticks are never replayed. Every quote carries the time the price was observed at the source (the provider's trade time, or the simulator's clock), set by the gateway and never by the device. The client store keeps the newest quote per symbol and ignores any older one. When two quotes share a timestamp, the later arrival wins. This matters mainly for the race between the REST list response and socket snapshots, where a slow REST reply would otherwise move a price backwards.

On reconnect, the client re-subscribes to every symbol it still references in one message, takes the fresh snapshots, and refetches the history of any chart on screen so it has no gap where the outage was. Whether prices are stale depends on connection health, not quote age, because quotes are legitimately hours old while the market is closed.

## Considered options

- **Sequence numbers and replay of missed ticks:** needs a per-symbol log on the gateway and buys nothing, since only the latest price is shown.
