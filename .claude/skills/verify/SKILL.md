---
name: verify
description: Prove that a change works in the running app by driving the flows in docs/feature-map.md against the gateway in simulator mode, and report pass or fail per feature ID. Use before calling any ticket done, before opening or updating a PR, and when asked to verify, check or prove a feature.
---

# Verify

A ticket is done only when verify passes for every feature ID it touched. The source of truth for what to check is [`docs/feature-map.md`](../../../docs/feature-map.md). This skill covers how to check it.

Each feature in the map is checked one of two ways:

- **E2E:** the Playwright suite, the mechanical proof.
- **Walk:** you drive a real browser and judge what a user would see: layout, motion, focus, console.

A feature marked both needs both.

## 1. Pick the features

- Every feature ID listed on the ticket or PR.
- Every feature whose route, component, hook or gateway path your diff touches, even if the ticket did not list it. Search the feature map for the test IDs and routes in your diff.
- Always the smoke set: **G1, G3 (step 1), L1, L2, D1.**

Write the list down before launching. It is your completion criterion: every ID on it ends as PASS, FAIL or BLOCKED, with evidence.

## 2. Launch

Two isolated stacks, so verification never fights a developer's running servers:

| Use | Gateway | Web | Started by |
| --- | --- | --- | --- |
| Walk | `http://localhost:4000` | `http://localhost:3000` | you, below |
| E2E | `http://localhost:4100` | `http://localhost:3100` | Playwright's own `webServer` config |

Start the walk stack from the repo root, each in its own background shell under `setsid`, so each server and its children share one session:

```bash
FEED=simulator SIM_SEED=42 PORT=4000 setsid pnpm --filter ./apps/gateway dev
NEXT_PUBLIC_GATEWAY_URL=http://localhost:4000 PORT=3000 setsid pnpm --filter ./apps/web dev
```

Keep each session ID: the `SID` column of `ps -eo pid,sid,args | grep 'pnpm --filter'`. `setsid` may fork, so `$!` is not always the session ID.

The stack is ready when both checks in step 3 pass. If a port is already taken by a process you did not start, stop and report it. Never kill it.

If a command here fails because a script was renamed, the root `package.json` and the workspace `package.json` files are the source of truth. Use what they define, then fix this skill in the same PR.

## 3. Doctor

Read-only checks. Run them first, and again whenever anything looks off:

```bash
curl -sf http://localhost:4000/stocks | grep -q '"feedMode":"simulated"' && echo gateway-ok
curl -sf http://localhost:3000/ | grep -q 'data-feed-mode="simulated"' && echo web-ok
```

Both must print. A gateway answering with `"feedMode":"live"` means the wrong environment, so stop.

## 4. Drive

### E2E features

```bash
pnpm --filter ./apps/web e2e -- --grep "<feature IDs separated by |>"
```

Each Playwright test title starts with its feature ID (for example `L2 live ticks`), so `--grep "G1|L1|D2"` runs exactly those. Paste the summary lines into the report. A flaky pass (fails, then passes on retry) counts as FAIL, with a note.

### Walk features

Use the browser tool your harness provides: the T3 preview tools when they are loaded, otherwise a throwaway Playwright script in your scratchpad directory, never in the repo. Use stable handles only: `data-testid`, ARIA roles and the state attributes in the feature map's Conventions. Never use coordinates, tab order or copy text.

For each feature, follow its steps in the map and observe its expected result exactly. Always:

- Check the browser console after each flow. Any hydration warning or error is a FAIL for that feature.
- Check at 360 × 740 and at 1440 × 900 when the feature has layout.
- Open `?debug=1` for chaos controls. They exist only in simulator mode.

Recipes for states that are hard to reach:

| State | How |
| --- | --- |
| Stale after silence | chaos **Freeze feed**, then wait 11 s |
| Stale on close | chaos **Drop connection**, or stop the gateway process you started |
| Offline | chaos **Go offline**, or the browser's offline emulation |
| Reduced motion | the browser's reduced-motion emulation |
| Cross-tab | two pages in the same browser context |
| Corrupt storage | set `localStorage["watchlist:v1"] = "not json"`, then reload |
| Slow or failing history | chaos **History latency** and **History failures** at 100% |
| Market closed | chaos **Force market closed** (reverts after 60 s) |

Proof standard: drive the path a user takes. Do not call hooks, stores or test-only endpoints to fake a state. The chaos controls are a product feature, so using them is the real path.

## 5. Evidence

Write everything to `.verify/<YYYYMMDD-HHMM>-<branch>/` at the repo root (git-ignored), with each `/` in the branch name replaced by `-` (`t/1-scaffold` becomes `t-1-scaffold`):

- `report.md`: the report below.
- One screenshot per Walk feature, named by feature ID (`G3-stale.png`), taken after the expected state appears.
- `e2e.txt`: the Playwright output.
- `console.txt`: console messages collected during the walk.

## 6. Report

End every run with this table, in your reply and in the PR description:

```markdown
| Feature | Check | Result | Evidence |
| --- | --- | --- | --- |
| G1 | E2E | PASS | e2e.txt: "G1 feed mode badge" passed |
| G3 | E2E + Walk | FAIL | stale banner never appeared after Freeze feed (G3-freeze.png) |
| D4 | Walk | BLOCKED | chart not rendered yet: ticket #12 lands it |
```

- **PASS:** the expected result was observed, with evidence.
- **FAIL:** observed something else. Say what you saw.
- **BLOCKED:** cannot be checked yet, because the feature or a dependency does not exist. Name the blocker.

The ticket is done only when every feature it touched is PASS. A FAIL means fix and re-run. A ticket with a remaining FAIL opens as a draft PR with the table.

## 7. Cleanup

Stop only the processes you started, by the session IDs from step 2. `pnpm`, Turborepo and `next dev` leave child processes behind, so stop the whole session, then confirm both ports are free:

```bash
pkill -TERM -s <gateway session ID>
pkill -TERM -s <web session ID>
ss -ltn | grep -E ':(3000|4000)\b' || echo ports-released
```

Never kill by name or port. Leave `.verify/` in place: the evidence must survive cleanup.

## Live mode

Live mode needs the owner's Alpaca paper-trading keys, so an agent cannot run it. An agent reports the Live mode rows of G1, G2 and C1 as BLOCKED with "needs the owner's keys", and the gateway's Alpaca tests (`apps/gateway/src/feeds/alpaca/`) stand in until the owner runs it.

The owner's manual run, from the repo root:

1. Export `FEED=alpaca`, `ALPACA_KEY_ID` and `ALPACA_SECRET_KEY` in the shell. The gateway reads only its environment and does not load `.env` by itself. Leave `ALPACA_TRADING_URL`, `ALPACA_DATA_URL` and `ALPACA_STREAM_URL` unset to use paper trading, the market data API and the IEX stream.
2. Check the fail-fast path first: `FEED=alpaca ALPACA_KEY_ID= ALPACA_SECRET_KEY= pnpm --filter ./apps/gateway start` must exit with status 1 and print "FEED=alpaca needs ALPACA_KEY_ID and ALPACA_SECRET_KEY". A wrong secret must exit with "Alpaca rejected ALPACA_KEY_ID and ALPACA_SECRET_KEY". Neither may start the simulator.
3. Start the gateway with the keys (`PORT=4000 setsid pnpm --filter ./apps/gateway start`) and the web app as in step 2 of the launch.
4. Doctor: `curl -sf http://localhost:4000/stocks | grep -q '"feedMode":"live"' && echo live-ok`.
5. Open `/`. Expect:
   - **G1:** the badge reads "Live", and `data-feed-mode="live"` is in the server-rendered HTML.
   - **G2:** outside 09:30 to 16:00 New York time on a trading day, including pre-market and after-hours, "Market closed" shows, `data-market-status="closed"`, and prices hold the last close without ticking. During the session the label is gone and streamed prices tick.
     Known limitation: if Alpaca was unreachable at the close, a stock can show its last intraday trade under "Market closed" until the adapter's resync succeeds (#52). Record it as a note, not a G2 failure.
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

## Expo app

The mobile app runs in Expo Go on a real phone. No agent tool here can tap a phone, so the owner walks mobile features by hand, following the steps below, and reports in the same table. Every control and value the steps name has a `testID` from [`docs/feature-map.md`](../../../docs/feature-map.md), ready for a device driver such as Maestro if one is ever added (it is not a dependency today).

### Launch

The phone and the computer must be on the same Wi-Fi network. Find the computer's LAN IP first: `ipconfig getifaddr en0` on macOS, `hostname -I | awk '{print $1}'` on Linux.

Start the walk gateway on all interfaces, from the repo root, in its own terminal. Use the `pnpm --filter` form: `pnpm dev` runs through Turborepo, which does not pass `HOST` through.

```bash
HOST=0.0.0.0 ALLOWED_ORIGINS=http://localhost:3000,http://<LAN IP>:4000 \
  FEED=simulator SIM_SEED=42 PORT=4000 pnpm --filter ./apps/gateway dev
```

- `HOST=0.0.0.0` lets the phone reach the gateway.
- `ALLOWED_ORIGINS` must list `http://<LAN IP>:4000`. React Native's WebSocket sends an `Origin` header made from the socket URL, on both iOS and Android, and the gateway refuses origins it does not know. Without it, prices load over REST but never tick. Setting the variable replaces the default list, so keep `http://localhost:3000` in it for the web walk.

Start Expo in a second terminal, with the gateway's LAN address baked into the bundle. It prints a QR code.

```bash
EXPO_PUBLIC_GATEWAY_URL=http://<LAN IP>:4000 pnpm --filter ./apps/mobile start
```

`EXPO_PUBLIC_GATEWAY_URL` is read when Metro bundles, so after changing it, restart with `pnpm --filter ./apps/mobile start --clear`. A value set only on the command line does not survive the restart: repeat it, as in `EXPO_PUBLIC_GATEWAY_URL=http://<LAN IP>:4000 pnpm --filter ./apps/mobile start --clear`. Without it the app uses `http://localhost:4000`, which only works in a simulator on the same machine.

An agent starting these itself (to check the bundle, not to walk) uses the `setsid` pattern from step 2, adds `CI=1` to `expo start`, and uses a spare `--port` if 8081 is taken.

### Doctor

Read-only checks, in this order. Each one rules out a layer before the next:

1. On the computer: `curl -sf http://<LAN IP>:4000/stocks | grep -q '"feedMode":"simulated"' && echo gateway-lan-ok`. If this fails, the gateway is not bound to the LAN: check `HOST=0.0.0.0`.
2. On the computer, the socket handshake with the phone's origin must answer `101`. A `403` means `ALLOWED_ORIGINS` is missing the LAN origin.

   ```bash
   curl -s -o /dev/null --max-time 2 -w "%{http_code}\n" -H "Origin: http://<LAN IP>:4000" \
     -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" "http://<LAN IP>:4000/ws?v=1"
   ```

3. On the computer: `curl -s http://localhost:8081/status` prints `packager-status:running`. If Expo was started with `--port`, use that port instead of 8081.
4. **On the phone's browser**, open `http://<LAN IP>:4000/stocks`. It must show JSON containing `"feedMode":"simulated"`. If the computer passes steps 1 and 2 and the phone fails here, the problem is the network, not the app: a different Wi-Fi, a guest network that isolates clients, or the computer's firewall blocking Node.

### Open in Expo Go

Install Expo Go from the App Store or Play Store; it must be the build for SDK 58. Scan the QR code (the Camera app on iOS, Expo Go itself on Android). The first load bundles for a few seconds. A red error screen is a FAIL for every feature: copy its text into the report.

### Walk

Follow each feature's steps in the feature map and observe the expected result. For each one, take a phone screenshot after the expected state appears and save it in the run's `.verify/` folder, named by feature ID (`M2-ticks.png`). Note anything Expo Go's console or the Metro terminal prints in red.

| Feature | What to do and see |
| --- | --- |
| M1 | The app opens on **Markets**, with Markets and Watchlist tabs at the bottom. Tap a row: a detail screen opens with the ticker as its title, the company name and a price that ticks. Back returns to the list where it was. Switch to Watchlist and back. |
| M2 | Rows show name, ticker, price and a day-change pill with an arrow, a sign and a percent. Within a few seconds prices change, and a thin ring flashes round the pill in the row's day colour. Scroll to the bottom: the last rows have a price at once and start ticking. Star MSFT, then NVDA: each star fills amber at once. The Watchlist tab lists NVDA first, then MSFT, both ticking. Unstar NVDA there: its row goes at once. Close Expo Go from the app switcher and reopen: MSFT is still starred. Unstar it: the Watchlist tab shows "Your watchlist is empty", and "See all stocks" returns to Markets. |
| M2, motion and failure | With a stock starred, stop the gateway (`Ctrl+C`), then close and reopen Expo Go. Markets shows skeleton rows that pulse gently for about 7 s while requests retry (three retries, 1 s, 2 s and 4 s apart), then "Couldn't load stocks" with Retry. The Watchlist tab keeps the starred ticker, with the same error and Retry, never a blank screen. Start the gateway again and tap Retry on Markets, then on each Watchlist row: the rows load and tick. Star a stock: the star grows slightly as it fills. |
| M2, reduced motion | Turn on Reduce Motion (iOS: Settings > Accessibility > Motion; Android: Settings > Accessibility > Remove animations). Then close and reopen Expo Go: the flash ring reads the setting at launch. Prices still change, but no ring flashes round the pill. Star a stock: it fills at once, with no scale. Repeat the gateway stop from the row above: for those 7 s the skeleton rows are a static grey fill, with no pulse. Turn the setting off and reopen Expo Go afterwards. |
| Graph check (ADR 0033) | On any detail screen, below the price, two green lines render: a short static one and a taller animated one. Press and hold the taller line for about half a second, then drag: a dot follows your finger along the line. A dashed box with error text instead of the lines is a FAIL: copy the text. |
| M3 | BLOCKED until N02 (detail and chart). |
| M4 | BLOCKED until N08 (lifecycle). Recipe for then: press home, wait 15 s, return; the socket must have closed and reopened with fresh prices. Under 10 s, it must not reconnect. |
| M5 | BLOCKED until N08 (connection states). Recipe for then: stop the gateway for stale, and airplane mode for offline. Airplane mode also cuts Metro, but the loaded app keeps running. |

Report the graph check as its own row, `ADR 0033`, so a FAIL there is not mistaken for a list failure. A red error screen that appears only when a detail screen opens also belongs in that row. If it fails, the fallback is `react-native-wagmi-charts` (ADR 0033).

If prices show but never change, the socket is being refused: re-run doctor step 2.

### Stop

Press `Ctrl+C` in both terminals. An agent stops only the sessions it started, as in step 7.
