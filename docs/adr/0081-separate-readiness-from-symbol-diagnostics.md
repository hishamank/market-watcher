# Separate readiness from symbol diagnostics

The existing connection counters cannot explain a connected transport with unavailable data or a subscription waiting for its terminal reply. Expose a read-only diagnostic snapshot through the socket client and the existing once-per-second health hook. Show it only in the existing debug panel on web and the mobile chaos sheet.

The snapshot distinguishes an open socket, a completed handshake, settled recovery and each referenced symbol's availability and last-known warning. Pending subscriptions include their request IDs, local deadline timestamps and retry flags. Queue depth counts client control messages waiting for the local send budget, not gateway work or upstream provider readiness. No public server endpoint is added. Gateway queue metrics remain the security owner's separate interface.

Record only the latest recovery reason and gateway error code/symbols. Do not retain frame history, provider URLs, raw upstream error messages or credentials. Existing server-side upstream failure logs remain authoritative for provider diagnosis. Snapshot arrays are copied so diagnostic consumers cannot mutate request tracking.

These fields explain state; they do not authorize recovery. Feed-session quarantine remains terminal until reload (ADR 0077), even when transport status reads stale. A completed recovery can legitimately contain unavailable symbols, and a quiet stock remains available without a trade-age timer. Debug polling neither changes deadlines nor issues requests.
