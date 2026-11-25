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
   - **C1:** `/?debug=1` shows no chaos panel.
6. Open a stock and switch through every range. Each chart draws, and 1D covers the regular session only.

### To measure on the first keyed run

The docs do not settle these, so the adapter uses a documented default and the run records the real value in ADR 0021:

- **Batch size:** `SNAPSHOT_BATCH_SIZE` in `apps/gateway/src/feeds/alpaca/config.ts` is 100 symbols per snapshot call. Call `/v2/stocks/snapshots` with 100, 500 and 1,000 symbols and note the largest that succeeds.
- **Batch cost:** read `X-RateLimit-Remaining` before and after one 100-symbol snapshot call. A drop of 1 confirms one request per batch, as ADR 0021 assumes.
- **Stream cap:** subscribe a 31st trade symbol and confirm error 405, "symbol limit exceeded".
- **Bad keys:** note whether the data API answers 401 or 403. The adapter treats both as rejected keys.
- **Calendar times:** confirm `/v2/calendar` gives `open` and `close` in New York time, so the session close equals `next_close` from `/v2/clock`.
- **Daily bars:** after hours, confirm the snapshot's `dailyBar.c` equals the 16:00 close and excludes extended-hours trades. Before the open, check whether `dailyBar` is still the previous session.

## Expo app

Not built yet. This section is filled in by the first Expo ticket and must cover:

- Launching Expo against the walk gateway in simulator mode, and the doctor check.
- How to drive the app: Expo Go on a device or simulator, and the tool used to tap by `testID` and take screenshots.
- Recipes for background and foreground (M4) and offline.
- Mapping of features M1 to M5 to checks, in the same report format.

Until then, mobile features are reported as BLOCKED.
