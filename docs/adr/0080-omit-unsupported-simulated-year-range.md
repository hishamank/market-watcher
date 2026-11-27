# Omit unsupported simulated price-dependent statistics

Amends [ADR 0056](0056-key-statistics-are-independent-supplemental-data.md).

Simulated prices and history depend on seed, symbol and time, while the sample statistics carried a fixed 52-week range unrelated to that function, so a simulated price can fall outside the range and contradict it.

Return `yearRange: null` for simulated statistics. The existing web and mobile statistics views already display a missing-value marker for that optional field. The fixed trailing P/E is also price-dependent: a simulated price and a fixed EPS can produce a different ratio than the sample. Return `trailingPE: null` rather than cache a price-dependent ratio independently of the quote. Other sample fundamentals remain explicitly simulated, and live provider statistics are unchanged.

Computing daily closes would produce a sampled close range, not the intraday extrema implied by the displayed 52-week label. Including the current quote would also require updating the statistics cache as prices move. Omission is the smallest truthful correction for this change. A future simulated year range must specify its sampling definition, derive every sample from the same seed and price function, label that definition in both apps, and include the current price when the definition requires it.
