# Last-known quotes after a failed phase refresh

Amends ADR 0044. Issue #58 authorizes the additive ADR 0041 change: optional literal true `Quote.lastKnown` and two translation keys, with no new core exports and protocol version 1.

After a refresh cannot supply a current-phase quote, the gateway serves the held copy with `lastKnown: true`. A missing symbol in a completed snapshot counts as a failed refresh for that symbol. Successful refreshes never mark a quote. Alpaca exposes its held map through optional `LiveFeed.lastKnown(symbols)`; the simulator does not implement it. The hub book retains marked copies for snapshots and conflation, while keeping those symbols in the retry set. REST uses the same fallback helper, including for symbols no socket watches.

A watcher receives the mark as an equal-timestamp replacement; the newer real quote clears it. Core logic and flash timestamps stay unchanged. Connection staleness wins for price colour but keeps the clock. Rows retain signed changes in a neutral pill, a non-interactive clock and accessible date and time. Detail explains the copy visibly below the change. Chart fallback notes remain independent.

No held copy after restart means unavailable on the socket and 503 for a REST request with no available quotes. Partial REST lists continue serving available entries. The mark waits until the first unsuccessful refresh; no client timer or normal-boundary flash is introduced.
