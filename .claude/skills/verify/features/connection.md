# Connection and chaos

Every page shows whether prices are simulated, whether the market is open, and whether the live connection is healthy. In simulator mode, `?debug=1` opens a chaos panel that breaks the connection or the market on purpose, so a user can watch the app recover.

## Sub-features

- `G1` feed mode badge: "Simulated", and `data-feed-mode="simulated"` in the server HTML.
- `G2` market status: Force market closed sets `data-market-status="closed"` and shows `market-status-label`, and turning it off reopens the market.
- `G3` connection status: after a drop, `data-connection` goes stale and then connected again with no banner left. Offline shows the banner and reconnects when the switch is turned off.
- `C1` the chaos panel renders with `?debug=1` in simulator mode.
- `H1` `GET /health` reports connections.

## How to get to it (user POV)

- The header on any page shows the badge and the market label.
- The banner under the header shows connection state.
- Add `?debug=1` to any URL to open `chaos-panel`, which has `chaos-drop`, `chaos-freeze`, `chaos-offline`, `chaos-force-closed`, `chaos-tick-spike`, `chaos-history-latency` and `chaos-history-failures-{0,50,100}`.
- `GET {GATEWAY_URL}/health` on the gateway.

## Driving it with bin/journey

Preconditions:

- `bin/stack doctor` is all `ok`, and no other journey is running. These chaos switches act on the whole gateway.

- **Badge (G1).** Fetch `/`: the HTML has `data-feed-mode="simulated"`. Open `/?debug=1`: `feed-mode-badge` reads "Simulated". Run `bin/journey connection`.
- **Panel (C1).** On `/?debug=1`, `chaos-panel` is visible. Evidence: `C1-chaos-panel.png`.
- **Drop (G3).** Press `chaos-drop`. The recorded `data-connection` transitions include `stale` followed by `connected`, and `connection-banner` is gone afterwards.
- **Offline (G3).** Press `chaos-offline`. `data-connection="offline"` and `connection-banner` is visible. Press it again: the state returns to `connected`. Evidence: `G3-offline.png`.
- **Market closed (G2).** Press `chaos-force-closed`. Within 1 s, `data-market-status="closed"`, and `market-status-label` and `chaos-countdown-force-closed` are visible. Press it again: the status is `open`. Evidence: `G2-market-closed.png`.
- **Health (H1).** `GET /health` reports at least one connection. Evidence: `health.json`.
- **Proof.** `steps.log` has PASS for G1, C1, G3, G2 and H1. `frames.json` shows the `chaos` messages sent and the reconnect's `subscribe`.

## Gotchas

- Every chaos switch except offline and drop is gateway-wide and lasts 60 s. Always switch it back off in the same journey, or the next journey starts with a closed market or failing history. Run `bin/stack doctor` after any interrupted run. If prices are not ticking, wait 60 s for the revert.
- Freeze (G3 step 3) takes 10 to 11 s to go stale, so it is left to E2E (`pnpm --filter ./apps/web e2e --project chromium --grep G3`).
- The gateway-stopped case (G3 step 4: backoff, `connection-retry`, recovery without a reload) has no E2E test and no journey, because `bin/stack` cannot restart the gateway on its own. Walk it by hand: open `/` in a browser, run `pkill -TERM -s <GATEWAY_SID>` (from `bin/stack env`), check that the state is `stale` and `connection-retry` shows, then start the gateway again with the `FEED=simulator SIM_SEED=42 PORT=<GATEWAY_PORT> ALLOWED_ORIGINS=<WEB_URL> setsid pnpm --filter ./apps/gateway dev` line from Launch. Finally, run `bin/stack down`, then stop that new gateway's session yourself, because `stack.env` does not know about it.
- The 60-second automatic revert (C3) and the tick-spike conflation of at most 4 frames per second (C2) are timed in E2E. The journey does not wait 60 s.
- Live mode (the "Live" badge, no chaos panel, no fallback to the simulator) needs the owner's Alpaca keys. See [`live-mode.md`](../live-mode.md).
- G4, the quality bar (keyboard focus, sign and arrow on gains and losses, reduced motion), is a judgement walk across every page and has no journey. Use the screenshots here as a start, then walk it by hand.
