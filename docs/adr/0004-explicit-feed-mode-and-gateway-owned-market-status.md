# Explicit feed mode and gateway-owned market status

Users must always know whether a price is real. The gateway announces the feed mode in its welcome message, and the app header always shows a Simulated or Live badge. Prices come only from the current feed mode. If the live provider fails, the UI shows stale prices and never switches to simulated ones.

Market status has two values: open, during the regular New York session (09:30 to 16:00 ET), and closed. Pre-market and after-hours count as closed. In Live mode while closed, prices show the last close with a Market closed label, and the gateway drops extended-hours trades so prices do not move under that label. In simulator mode the simulator's own calendar applies instead (ADR 0022). The gateway is the only place that knows market hours. It sends the status in the welcome message and whenever it changes, and clients never compute it.

## Considered options

- **Showing extended-hours prices:** rejected for now. It needs a third status and its own labels, and it adds no value for a demo that runs on the simulator by default.
