# The Alpaca adapter streams 30 symbols and polls the rest

Alpaca's free tier streams at most 30 symbols on one connection. Reference counting removes duplicates but does not raise that cap, so two users at different scroll positions, or a search hit from a 10,000-symbol catalogue, can need a 31st symbol. The Alpaca adapter handles this internally. The 30 most-watched symbols stream, and the rest are refreshed every 5 seconds through Alpaca's multi-symbol snapshot endpoint, one request per batch, about 12 requests a minute against the 200 allowed. Polled quotes flow through the same hub, conflation and timestamps, and symbols move between streamed and polled as watch counts change. Nothing on the wire or in the apps knows the difference. The simulator has no cap.

## Consequences

- The Alpaca ticket must measure the per-call symbol limit and the rate-limit cost of a batch, since neither is documented.
