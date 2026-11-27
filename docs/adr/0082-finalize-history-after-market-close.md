# Finalize history after market close

Amends ADR 0011's closed-market freshness rule. An entry fetched while open is not finalized merely because its freshness window extends beyond the close. At close, refresh it once through the existing source chain. Only an entry fetched successfully while closed stays fresh until the next open.

Before publishing a fetched history series, compare the current market status, session open and observed open generation with those captured when the source request began. A response that crossed a phase is discarded rather than cached or returned as current. The next request fetches the current phase. If an older cache entry exists, the normal fallback returns it with its age measured at response completion; otherwise the request returns unavailable (503). A 503 follows the existing client retry policy. A successful fallback response stays labelled "as of" until the next scheduled refetch: 60 seconds for 1D, five minutes for 1W and one hour for longer ranges. Neither path introduces a second internal request loop.

This deliberately prefers an explicit temporary failure over presenting incomplete pre-close data as a finalized session. In-flight deduplication and source timeouts are unchanged. Successful closed-phase history remains cached, and failed finalization remains retryable. The change applies to natural market close and simulator force-close without mixing their sources.

The wire schema is unchanged. The gateway relies on the selected history adapter to return the completed session data for a closed-phase request; the cache cannot infer provider publication lag from bar timestamps alone.
