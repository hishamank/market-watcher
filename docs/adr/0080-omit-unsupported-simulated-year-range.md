# Omit unsupported simulated price-dependent statistics

Amends [ADR 0056](0056-key-statistics-are-independent-supplemental-data.md).

Simulated prices and history depend on seed, symbol and time. The sample company statistics supplied a fixed 52-week range unrelated to that function: at 2026-11-27 12:00 UTC, the default seed produces AAPL at 327.80 while its sample high was 320.49.

Return `yearRange: null` for simulated statistics. The existing web and mobile statistics views already display a missing-value marker for that optional field. The fixed trailing P/E also contradicts the displayed price and sample EPS: 327.80 divided by 6.43 is 50.98, not the sample 28.42. Return `trailingPE: null` rather than cache a price-dependent ratio independently of the quote. Other sample fundamentals remain explicitly simulated, and live provider statistics are unchanged.

Computing daily closes would produce a sampled close range, not the intraday extrema implied by the displayed 52-week label. Including the current quote would also require updating the statistics cache as prices move. Omission is the smallest truthful correction for this change. A future simulated year range must specify its sampling definition, derive every sample from the same seed and price function, label that definition in both apps, and include the current price when the definition requires it.
