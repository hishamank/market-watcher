# Verification evidence and limitations

This page records both:

1. **An earlier pre-hardening check pass measured on `a4a1b7a`** (2026-11-27), with its exact workload parameters and measurement boundaries.
2. **Post-merge verification on reconciled `main` (`1cc9a77` + PR `#121`)** after all 24 hardening, reliability, architecture, QA and documentation PRs merged (`#112`–`#136`, excluding `#121`).

> **Revision scope:** Never attribute a measurement from an earlier commit to a later commit without rerunning that check. Each table below pins its exact revision and states which checks were and were not executed.

## Post-merge local verification (`1cc9a77` + PR `#121`)

After merging `#112`–`#136` (all code/docs PRs ahead of `#121`) into `main` (`1cc9a77`, 2026-11-27):

- **Static, ADR & link gates:** `pnpm format:check`, `pnpm lint`, `pnpm lint:fixtures`, `pnpm check:direction`, `pnpm check:adrs` (**86 ADRs**, each with a unique number), `pnpm typecheck`, and local Markdown file-link / heading-anchor / HTML `<img>` checks all passed on the reconciled commit.
- **Unit & integration suites (fresh uncached `pnpm exec turbo run test --force`):** **644 passing tests across 132 files** (`@mini/contracts`: 175 across 10 files; `@mini/core`: 194 across 50 files; `@mini/gateway`: 239 across 60 files; `@mini/mobile`: 21 across 8 files; `@mini/web`: 15 across 4 files; `@mini/tokens`: no tests, exit 0; 0 cached, 6/6 tasks passed).
- **What was NOT rerun in this documentation reconciliation commit:** Production Playwright E2E, browser journeys, local WebSocket load tests, native mobile runtime walks and real-provider Alpaca/Yahoo tests were not re-executed by this docs-only pass; per-PR code verification evidence is recorded in each merged PR's verification table.

## Earlier check evidence on baseline `a4a1b7a`

| Area | Observed result on `a4a1b7a` | Notes / Scope |
| --- | --- | --- |
| Unit & integration tests | **557 passing tests across 110 files** | Fresh separate runs across `@mini/contracts`, `@mini/core`, `@mini/gateway`, `@mini/web`, `@mini/mobile` |
| Production web E2E | **101 passing production Chromium tests, 0 retries** | Executed in a separate QA pass against a production Next.js build and seed-42 simulator gateway |
| Cross-browser smoke | Functional smoke checks passed on **Chromium, Firefox and WebKit** | Smoke coverage only; full 101-test E2E suite ran on Chromium |
| Fresh clone & static gates | Clean install, `format:check`, `lint`, `check:direction`, `check:adrs`, `typecheck` and production web `build` succeeded | Verified locally; see CI note below |
| Live-tick render isolation | No unrelated stock-row or list-parent executions observed during single-symbol updates | Controlled check at phone and desktop widths |
| Local simulator WebSocket load test | Tested at **10, 100, 500 and 1,000 concurrent connections**. At **1,000 connections** (**17.03 s** including ramp-up): all snapshots received, **0 recorded connection errors**, **~3,755 frames/s**, **256 ms p99 quote age**; active connections and upstream watchers returned to **0** after cleanup | Short local loopback run against simulator; see [workload details](#local-load-test-workload) and limitations below |
| Hydration fallback microbenchmark | 10,000-stock cold-cache snapshot batch fell from 25.25 ms to 1.91 ms median (~13.2×); 50-stock saving ~0.36 ms | Controlled Node A/B microbenchmark on `cc4212a` → indexed implementation; full raw data and limits in [`docs/performance/quote-cache-index.md`](performance/quote-cache-index.md) |
| Repository history security scan | No confirmed leaked credentials found in scanned repository history | Static/history scan (PR `#116` later added `.gitleaksignore` for 4 confirmed false positives by fingerprint); does not replace runtime security testing |

### Local load-test workload

The `a4a1b7a` 10/100/500/1,000-connection simulator run exercised a separate gateway process (`buildApp` + `createSimulatorFeed`) with logging disabled to isolate transport cost. Each client opened one subscription for the **same 50 shared symbols**, using distinct `127/8` loopback source addresses (**10 connections per address**) to stay within the unchanged 10-connections-per-IP admission limit. Connections ramped in batches of 50 every 100 ms, ran 15 s of steady delivery, and waited 3 s after close (total 1,000-connection sample duration: **17.03 s**, including ramp-up).

Separately, [ADR 0092](adr/0092-a-total-connection-cap-and-ipv6-budgets-by-prefix.md) (PR `#130`) recorded a local 1-core, 512 MB container check of the simulator image at 500–3,000 sockets subscribed to the 50 default symbols (170 MB RSS and 43–61% of one laptop core at 2,000 sockets) to choose the gateway's 2,000-socket admission guardrail—not as proof of production capacity.

## CI status

The GitHub Actions workflow ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) is committed, but GitHub account billing limits prevented Actions jobs from running during development. All verification gates ran locally, and PRs record local command output and verification tables.

## Measurement limitations and caveats

Read the results above with every limitation below in mind:

1. **Short local simulator benchmarks:** The 1,000-connection WebSocket load test on `a4a1b7a` (and the 500–3,000-socket container check in ADR 0092) were short simulator runs, not long-duration soak tests.
2. **Shared development host:** Measurements ran on a shared development machine rather than isolated production hardware.
3. **Loopback transport without TLS:** Load traffic ran over local loopback without TLS handshakes, reverse-proxy hops, packet loss or real internet RTT.
4. **Quote age is not pure network latency:** The reported 256 ms p99 quote age includes gateway conflation flush cadence (250 ms) and timestamp age, not pure wire latency.
5. **No proof of production or 100k capacity:** Local single-node simulator results do **not** prove sustained production capacity or the projected 100,000-user multi-node design in [`docs/scaling.md`](scaling.md).
6. **Native interactive mobile verification was blocked in the `a4a1b7a` separate QA pass:** The screenshots in [`docs/screenshots/`](screenshots/) are visual captures from an iPhone 17 simulator running Expo Go; they are not interactive mobile runtime verification. (Subsequent PR merges ran targeted Android Expo checks where noted in their PRs, not a full separate mobile pass of final `main`.)
7. **Real-provider live feeds were not verified in those separate checks:** Alpaca streaming/polling (`FEED=alpaca`) and live Yahoo supplemental endpoints were not exercised in the separate check runs above (real-provider credentials are kept outside agent-accessible files).
8. **HTTP 429 encountered in one `a4a1b7a` reliability browser journey:** Overlapping local traffic in the `a4a1b7a` stock-list journey hit the gateway's 120 req/min per-IP rate limit (PR `#117` / ADR 0078 later reduced home SSR reads from 3 to 2 and removed speculative row prefetching).
9. **Catalogue-walk timeout in one constrained `a4a1b7a` security test run:** One constrained test run hit a catalogue-walk timeout that passed in isolation (PR `#125` subsequently gave the full catalogue walk a 10 s test budget).

## Reproducing checks on a target revision

See [`docs/running.md`](running.md#tests-static-checks-and-verification) for every check command and Playwright E2E invocation, and [`.claude/skills/verify/SKILL.md`](../.claude/skills/verify/SKILL.md) for the full feature-map verification workflow (including the documentation-only check path). Before tagging a release, run the full production E2E and build checks on final merged `main` if you need fresh post-merge runtime proof.
