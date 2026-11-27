---
name: verify
description: Prove that a change works end to end in the running app, and report PASS, FAIL or BLOCKED for each feature ID in docs/feature-map.md. It starts an isolated simulator stack, runs the E2E suite and the scripted browser journeys, walks what needs judgement, and covers the Expo app and Live mode. Use before calling any ticket done, before opening or updating a PR, and when asked to verify, check or prove a feature.
---

# Verify

A ticket is done only when verify passes for every feature ID it touched. [`docs/feature-map.md`](../../../docs/feature-map.md) says what must be true for each feature. [`features/`](features/README.md) says how to reach and drive the web features. This file is the run.

Each feature is checked in one or more of three ways:

- **E2E:** the Playwright suite. It is the mechanical proof, against a production build.
- **Journey:** `bin/journey <name>`, a scripted browser run against the walk stack. It saves screenshots, console output, socket frames and a side effect for every step.
- **Walk:** your judgement in a real browser or on a phone: layout, motion, focus and feel. Start from the journey's screenshots, then drive by hand whatever the map asks you to judge.

The map marks each feature E2E, Walk or both. A Walk feature with a journey gets the journey and your judgement.

All commands run from the repo root, with `S=.claude/skills/verify`.

## 1. Pick the features

- Every feature ID listed on the ticket or PR.
- Every feature whose route, component, hook or gateway path your diff touches, even if the ticket did not list it. Search the feature map and `features/` for the test IDs and routes in your diff.
- Always the smoke set: **G1, G3 (step 1), L1, L2, D1.**

Write the list down before launching. It is your completion criterion: every ID on it ends as PASS, FAIL or BLOCKED, with evidence.

## 2. Launch

There are two isolated web stacks, so verification never fights a developer's running servers:

| Use | Gateway | Web | Started by |
| --- | --- | --- | --- |
| Journeys and Walk | `http://localhost:4000` | `http://localhost:3000` | `$S/bin/stack up` |
| E2E | `http://localhost:4100` | `http://localhost:3100` | Playwright's own `webServer` config. Set `E2E_GATEWAY_PORT` and `E2E_WEB_PORT` to run beside another worktree's suite |

```bash
S=.claude/skills/verify
$S/bin/stack up
```

`bin/stack up` does the following:

- It refuses to start if port 4000 or 3000 is already listening. Never kill that process: it is someone else's server or another worktree's stack. To run beside it, pick other ports, for example `VERIFY_GATEWAY_PORT=4200 VERIFY_WEB_PORT=3200 $S/bin/stack up`. `ALLOWED_ORIGINS` follows the web port.
- It runs `pnpm install --frozen-lockfile` if `node_modules` is missing. Journeys also need Playwright's Chromium. On a fresh machine, run `pnpm --filter ./apps/web exec playwright install chromium` once.
- It starts `FEED=simulator SIM_SEED=42 pnpm --filter ./apps/gateway dev` and `pnpm --filter ./apps/web dev`, each in its own `setsid` session. Both session IDs go into `.verify/stack.env`.
- It creates the run folder `.verify/<YYYYMMDD-HHMM>-<branch>/`, with each `/` in the branch replaced by `-`, and writes `gateway.log` and `web.log` there.
- It polls the doctor until every check passes, then prints `stack: ready`. From a cold start this takes 5 to 30 s. If it is not ready after about 3 minutes, it exits non-zero and names the logs. Then run step 7.

The simulator has no database and no seed step. Prices come from `SIM_SEED=42` and the clock, and the catalogue is `apps/gateway/data/catalogue.json`. `stack up` refuses while `.verify/stack.env` exists: one stack per checkout.

Other targets have their own launch:

- **Expo app (M1 to M5):** [`mobile.md`](mobile.md).
- **Live mode rows (G1, G2, C1) and G5:** [`live-mode.md`](live-mode.md).

If a command here fails because a script was renamed, the root `package.json` and the workspace `package.json` files are the source of truth. Use what they define, then fix this skill in the same PR.

## 3. Doctor

```bash
$S/bin/stack doctor
```

This is read-only. Run it first, after any FAIL, and whenever anything looks off. Every line must start with `ok`:

- The gateway and web sessions in `stack.env` are alive.
- Ports 4000 and 3000 are owned by processes in those sessions, so you are driving your own stack.
- `GET /stocks` answers `"feedMode":"simulated"`. A `live` answer means the wrong environment, so stop.
- `GET /health` answers.
- `GET /` renders `data-feed-mode="simulated"` in the server HTML.

`$S/bin/stack env` prints the URLs, session IDs and run folder.

## 4. Drive

### E2E

```bash
pnpm --filter ./apps/web e2e --project chromium --grep "<IDs separated by |>"
pnpm --filter ./apps/web e2e --project gateway-down --no-deps --grep "L4|D1"
```

Each Playwright test title starts with its feature ID (for example `L2 live ticks`). The `gateway-down` project holds the tests that stop the gateway (L4, and D1's error state). Write the flags straight after `e2e`. A `--` before them reaches Playwright literally, the filter is ignored, and all 55 tests run. Without `--project`, the `gateway-down` project's dependency pulls in every chromium test. The suite builds and starts its own stack, which takes about 2 minutes. Paste the summary lines into the report. A flaky pass (fails, then passes on retry) counts as FAIL, with a note.

### Journeys

```bash
$S/bin/journey watchlist      # W1–W7, D8, S3: stars from row, detail and search, order, persistence, cross-tab, corrupt storage
$S/bin/journey stock-list     # L1, L2, L3, L5: server HTML, ticks and flash, virtualisation at 360 px, view toggle
$S/bin/journey stock-detail   # D1–D4, D7: open from a row, search and the list pane, live point, scrubbing, ranges, 404, back at 768 and 360
$S/bin/journey connection     # G1, C1, G3 drop and offline, G2 force closed, H1 /health
```

Run them one at a time: `connection` flips gateway-wide chaos switches. Each journey runs the doctor first and refuses an unhealthy stack. It then prints `[<ID>] <action>` followed by `[<ID>] PASS <what was observed>` or `[<ID>] FAIL <error>`, and exits non-zero on any FAIL. A FAIL does not stop the run.

The recipe for each feature, its entry points and its gotchas are in [`features/`](features/README.md). To cover a feature no journey drives yet, copy the closest journey in `journeys/` and use these helpers from `journeys/lib.mjs`:

- `startJourney(feature, { width, height })` opens a fresh context. The default is 1440 × 900.
- `step(id, action, fn)` runs and logs a step. `fn` returns what it observed.
- `openConnected(path)` waits for `app-root[data-connection="connected"]`.
- `shot(name)`, `save(name, data)` and `finish()` record evidence.
- `allowConsole(regex, reason)` lets a step expect a console message, as D7 does for its 404. Every allowed message is still logged with its reason.

### Walk

Drive the stack from step 2 with the browser tool your harness provides: the T3 preview tools when they are loaded, otherwise a throwaway Playwright script in your scratchpad directory, never in the repo. Use stable handles only: `data-testid`, ARIA state (`aria-pressed`, `aria-selected`, `aria-checked`) and the `app-root` state attributes from the feature map's Conventions. Never use coordinates, tab order or copy text, except labels that the map itself gives as the expected result.

For each Walk feature, follow its steps in the map and observe the expected result exactly. Always:

- Check the browser console after each flow. Any hydration warning or error is a FAIL for that feature.
- Check at 360 × 740 and at 1440 × 900 when the feature has layout.
- Open `?debug=1` for chaos controls. They exist only in simulator mode.

Recipes for states that are hard to reach:

| State | How |
| --- | --- |
| Stale after silence | chaos **Freeze feed**, then wait 11 s |
| Stale on close | chaos **Drop connection**. For the gateway-stopped case (G3 step 4), follow the manual walk in [`features/connection.md`](features/connection.md) |
| Offline | chaos **Go offline**, or the browser's offline emulation |
| Reduced motion | the browser's reduced-motion emulation |
| Cross-tab | two pages in the same browser context |
| Corrupt storage | set `localStorage["watchlist:v1"] = "not json"`, then reload |
| Slow or failing history | chaos **History latency** and **History failures** at 100% |
| Market closed | chaos **Force market closed** (reverts after 60 s) |

Chaos switches other than drop and offline are gateway-wide and last 60 s. Turn each one back off before the next journey.

Proof standard: drive the path a user takes. Never call hooks, stores or test-only endpoints to fake a state. The chaos controls are a product feature, so using them is the real path. Check the side effect as well as the screen. A FAIL stays a FAIL: never weaken a step to make it pass.

## 5. Evidence

Everything goes to the run folder `.verify/<YYYYMMDD-HHMM>-<branch>/` at the repo root, which is git-ignored:

- `report.md`: the report from step 6.
- `e2e.txt`: the Playwright output.
- One folder per journey, holding:
  - `steps.log`: action and result per feature ID.
  - `<ID>-<state>.png`, plus `<ID>-failure.png` when a step failed.
  - `console.txt`: unexpected messages first, then allowed ones with their reasons.
  - `frames.json`: gateway socket frames.
  - The side effect: `storage.json`, `L1-server.html` or `health.json`.
- One screenshot per Walk feature, named by feature ID (`G4-focus.png`), taken after the expected state appears, and `console.txt` from the walk.
- `gateway.log` and `web.log` from the stack.

## 6. Report

Record the tested commit SHA (`git rev-parse HEAD`), whether the worktree was dirty and which changes were included, the date, platform, feed mode, URLs/ports, and exact commands with exit codes. Record documentation-only changes made after the run; rerun affected checks after code changes.

Local `.verify/` paths preserve raw evidence but are not accessible to a PR reviewer. Paste sanitized command summaries and step results into the PR and attach relevant screenshots or link retained artifacts the reviewer can access. Inspect evidence for credentials or personal data before publishing. Keep the local paths in the full report as well.

End every run with this table, in your reply and in the PR description. The example filenames below must be accompanied by pasted results or accessible artifact links:

```markdown
| Feature | Check | Result | Evidence |
| --- | --- | --- | --- |
| G1 | E2E + Journey | PASS | e2e.txt: "G1 feed mode badge" passed; connection/steps.log [G1] PASS |
| G3 | E2E + Journey + Walk | FAIL | stale banner never appeared after Freeze feed (G3-freeze.png) |
| M3 | Walk | BLOCKED | needs the owner's phone |
```

- **PASS:** the expected result was observed, with evidence.
- **FAIL:** something else was observed. Say what you saw.
- **BLOCKED:** it cannot be checked yet, because the feature, a dependency or a prerequisite is missing. Name the blocker.

The ticket is done only when every feature it touched is PASS. A FAIL means fix and re-run. A ticket with a required FAIL or BLOCKED result opens or remains as a draft PR with the table and the action needed to unblock it.

## 7. Cleanup

```bash
$S/bin/stack down
```

This stops only the two sessions in `stack.env`: it sends `pkill -TERM -s <sid>`, then `-KILL` after 10 s. It deletes `stack.env`, confirms both ports are released, and prints the run folder. Run it after every failed launch or drive iteration too. If `stack.env` is gone but a port is still busy, find the process's session with `ps -o sid= -p <pid>`. Stop it only if that session ID matches `gateway.sid` or `web.sid` in your run folder. Never kill by name or port. The run folder stays: the evidence must survive cleanup.

## Limits

- The stack runs `next dev`, so React StrictMode mounts twice. Every full page load logs one "WebSocket is closed before the connection is established" warning. Journeys allow that message at most once per page load, and more fails the run as a reconnect loop. The production E2E suite asserts that the console is clean.
- `apps/gateway` runs `tsx watch`, so editing gateway source mid-run restarts it and every page goes stale.
- The helpers are Linux-only: they use `setsid`, `ss -ltnp` and `pkill -s`.
