# Order quote metadata and track symbol availability

A trade timestamp orders prices, but does not order changes to reliability metadata. A REST request can begin before a socket marks the held quote last-known and finish afterwards with the same trade timestamp and no warning.

Each provider's quote store maintains a local revision counter and the latest revision per symbol. Stock query functions capture the revision before starting a REST request. A response with an equal trade timestamp cannot replace a symbol changed since that request began. Older trade timestamps remain rejected; strictly newer timestamps remain accepted. A request started after the change can apply equal-time corrections or clear a warning. This is local request precedence, not a new wire revision or a claim about provider event order. Cache hydration retains its strictly-newer rule.

Semantically identical quotes preserve object identity and do not notify quote subscribers. Comparison covers the fixed quote fields, including last-known and both day-range bounds. Equal-time corrections still notify only that symbol.

Transport health and symbol availability are independent. The additive core hook `useQuoteAvailability(symbol)` returns `available`, `recovering` or `unavailable`. Sending a subscription marks its symbols recovering. Only a correlated, current terminal settlement changes still-recovering symbols to unavailable; unknown and capacity-refused symbols are unavailable too. A valid socket quote confirms availability, including an identical quote. An older rejected quote cannot confirm it. A tick arriving before the terminal reply remains valid. REST and hydration writes update values but cannot confirm a live subscription.

Availability listeners are separate from quote-value listeners. There is no trade-age timer: a quiet stock remains available. Before subscribing, the absence of a known degradation defaults to available; SSR values therefore keep their existing presentation. Connection status still describes transport recovery. `Quote.lastKnown` independently describes the provider's held-price warning and must still be displayed even when a subscription is available.

This extends the frozen core API under the owner's financial-integrity assignment. The wire schema and protocol settlement semantics are unchanged. Both apps must consume the availability hook before the unavailable-data presentation fix is complete. Feed identity quarantine is a separate provider-scoped boundary (ADR 0073); it must reject incompatible data before any store write.
