# Broadcast chaos state with revert timestamps

Amends ADRs 0005 and 0030.

Global chaos controls (`tick_spike`, `history_latency`, `history_failure_rate` and `force_closed`) affect every connection in simulator mode and revert automatically after 60 seconds. To keep every open debug panel in sync — including newly opened or reconnected panels — the server socket union gains an additive `chaos_state` message carrying:

- `serverTime`: the gateway clock (UTC epoch milliseconds) when the frame was built, so clients compute remaining seconds from the duration `revertsAt - serverTime` without depending on clock alignment between browser and gateway.
- Each global control's current value (`enabled` or `rate`) and its `revertsAt` timestamp (`EpochMs | null`).

In simulator mode, the gateway sends `chaos_state` immediately after `welcome` on every new connection and broadcasts it to all connections whenever a global control changes or reverts. In Live mode, `chaos_state` is never sent and every inbound `chaos` message is answered with `invalid_message` while leaving the socket open.

The protocol version stays at 1 because `chaos_state` is strictly additive and no older client relies on rejecting unknown message types.

## Considered options

- **Keep countdown state local to the client that toggled it:** simpler on the wire, but a second browser tab or a client reconnecting after a drop would show every control as off while the gateway is still running a tick spike or failing history.
- **Add chaos fields onto `welcome` only:** handles reconnects, but does not inform already-connected panels when another tab toggles a global control or when the 60-second timer reverts it.
- **Expose a REST endpoint and poll it from the panel:** adds a polling loop when the socket is already connected and pushes `market_status` the same way.
