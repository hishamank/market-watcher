# Verify Live mode and G5

Reached from step 2 of [`SKILL.md`](SKILL.md) when the features to check include a Live mode row (G1, G2, C1) or G5.

## Live mode

Live mode needs the owner's Alpaca paper-trading keys, so an agent cannot run it. An agent reports the Live mode rows of G1, G2 and C1 as BLOCKED with "needs the owner's keys", and the gateway's Alpaca tests (`apps/gateway/src/feeds/alpaca/`) stand in until the owner runs it.

The owner's manual run, from the repo root:

1. Export `FEED=alpaca`, `ALPACA_KEY_ID` and `ALPACA_SECRET_KEY` in the shell. The gateway reads only its environment and does not load `.env` by itself. Leave `ALPACA_TRADING_URL`, `ALPACA_DATA_URL` and `ALPACA_STREAM_URL` unset to use paper trading, the market data API and the IEX stream.
2. Check the fail-fast path first: `FEED=alpaca ALPACA_KEY_ID= ALPACA_SECRET_KEY= pnpm --filter ./apps/gateway start` must exit with status 1 and print "FEED=alpaca needs ALPACA_KEY_ID and ALPACA_SECRET_KEY". A wrong secret must exit with "Alpaca rejected ALPACA_KEY_ID and ALPACA_SECRET_KEY". Neither may start the simulator.
3. Start the gateway with the keys (`PORT=4000 setsid pnpm --filter ./apps/gateway start`) and the web app with `NEXT_PUBLIC_GATEWAY_URL=http://localhost:4000 PORT=3000 setsid pnpm --filter ./apps/web dev`. `bin/stack` cannot start this gateway: it always runs the simulator.
4. Doctor: `curl -sf http://localhost:4000/stocks | grep -q '"feedMode":"live"' && echo live-ok`.
5. Open `/`. Expect:
   - **G1:** the badge reads "Live", and `data-feed-mode="live"` is in the server-rendered HTML.
   - **G2:** outside 09:30 to 16:00 New York time on a trading day, including pre-market and after-hours, "Market closed" shows, `data-market-status="closed"`, and prices hold the last close without ticking. During the session the label is gone and streamed prices tick.
     If Alpaca is unreachable at the close, held quotes are marked last-known after a failed refresh. Watchers get a tick and new subscribers get the marked snapshot; only symbols with no held copy get `unavailable`. Recovery supplies the unmarked close (#58, ADR 0045).
   - **C1:** `/?debug=1` shows no chaos panel.
6. Open a stock and switch through every range. Each chart draws, and 1D covers the regular session only.

### To measure on the first keyed run

The docs do not settle these, so the adapter uses a documented default and the run records the real value in ADR 0021:

- **Batch size:** `SNAPSHOT_BATCH_SIZE` in `apps/gateway/src/feeds/alpaca/config.ts` is 100 symbols per snapshot call. Call `/v2/stocks/snapshots` with 100, 500 and 1,000 symbols and note the largest that succeeds.
- **Batch cost:** read `X-RateLimit-Remaining` before and after one 100-symbol snapshot call. A drop of 1 confirms one request per batch, as ADR 0021 assumes.
- **Stream cap:** subscribe a 31st trade symbol and confirm error 405, "symbol limit exceeded".
- **Bad keys:** note whether the data API answers 401 or 403. The adapter treats both as rejected keys.
- **Calendar times:** confirm `/v2/calendar` gives `open` and `close` in New York time, so the session close equals `next_close` from `/v2/clock`.
- **Hourly bars:** check whether `1Hour` bars start on the hour (09:00, 10:00) or at the open (09:30). The adapter keeps every intraday bar that overlaps the session, so an hourly bar starting at 09:00 also carries pre-market trades from 09:00 to 09:30.
- **Daily bars:** after hours, confirm the snapshot's `dailyBar.c` equals the 16:00 close and excludes extended-hours trades. Before the open, check whether `dailyBar` is still the previous session.

## G5: last-known quotes

G5 is Live-only and proved by automated tests, not a simulator walk: the simulator always stamps quotes now. Run contracts schema tests, Alpaca last-known gateway seam tests, web rendered view tests and mobile props-mapping tests. Check their failure with the feature removed. Also run the full web E2E suite and mobile typecheck, tests, Expo dependency check and Android export. Report these separately from any device walk; no keyed run is required for G5.
