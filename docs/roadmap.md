# Roadmap

Regenerated from the final [`spec.md`](./spec.md) on 25 Nov 2026. Each ticket is one agent session and maps to a GitHub issue. Acceptance criteria name feature IDs from [`feature-map.md`](./feature-map.md), so the [verify skill](../.claude/skills/verify/SKILL.md) can check them.

> **Status note:** This document is the build plan used during development. All core tickets (`R01`–`R15`) and extra tickets listed below (`N01`–`N06`, `N08`–`N14`) have been merged except `N07` (#22, server-side watchlist), which was intentionally left out.

## Issues

Wave 1 tickets carried `ready-for-agent` at plan time. Later tickets received it when their wave launched, once their dependencies were merged.

| Ticket | Issue | Title | Labels |
| --- | --- | --- | --- |
| R01 | #1 | Scaffold, tooling and CI | lane:A, wave:1, ready-for-agent |
| R02 | #2 | Contracts and money module | lane:A, wave:1, ready-for-agent |
| R03 | #3 | Simulator adapters | lane:A, wave:1, ready-for-agent |
| R04 | #4 | Gateway hub and socket | lane:B, wave:1, ready-for-agent |
| R05 | #5 | Core realtime | lane:C, wave:1, ready-for-agent |
| R15 | #30 | Request IDs for subscribe replies | lane:B, ready-for-agent |
| D01 | #6 | Design directions (replaced by Claude Design, closed) | design |
| R06 | #7 | Gateway REST and history cache | lane:A, wave:2 |
| R07 | #8 | Core data | lane:B, wave:2 |
| R08 | #9 | Web shell and tokens | lane:C, wave:2 |
| R09 | #10 | Web list | lane:A, wave:3 |
| R10 | #11 | Web detail and chart | lane:B, wave:3 |
| R11 | #12 | Watchlist view | lane:A, wave:4 |
| R12 | #13 | Chaos controls | lane:C, wave:3 |
| R13 | #14 | Chart states and scrubbing | lane:B, wave:4 |
| R14 | #15 | Documentation | lane:B, wave:6 |
| N01 | #16 | Expo scaffold and list | owner pairing |
| N02 | #17 | Expo detail and chart | lane:C, wave:4 |
| N03 | #18 | Alpaca adapter | lane:A, wave:5 |
| N04 | #19 | Hosted demo | owner pairing |
| N05 | #20 | Search | lane:B, wave:5 |
| N06 | #21 | Connection health metrics | lane:C, wave:6 |
| N07 | #22 | Server-side watchlist (not implemented) | lane:C, wave:6 |
| N08 | #23 | Expo watchlist, lifecycle and states | lane:C, wave:5 |
| N09 | #93 | Core additions for the mobile settings, status strip and debug work | tier:extra, ready-for-agent |
| N10 | #94 | Mobile Settings screen with appearance and language | tier:extra, ready-for-agent |
| N11 | #95 | Mobile status strip with feed mode | tier:extra, ready-for-agent |
| N12 | #96 | Mobile market status in the status strip | tier:extra, ready-for-agent |
| N13 | #97 | Mobile search | tier:extra, ready-for-agent |
| N14 | #98 | Mobile chaos controls and connection health, simulated mode only | tier:extra, ready-for-agent |

## Rhythm and rules

- Work ran in dependency-ordered waves with up to three agent lanes at once. The owner reviewed and merged between waves, picked the design direction, and made the decisions that needed taste or judgement.
- Three lanes (A, B, C), each in its own worktree and branch (`t/<issue>-<slug>`), per [ADR 0025](./adr/0025-unattended-agents-in-worktrees-never-merge.md).
- **Only the owner merges to `main`.** An agent ends with a PR (a draft if verify fails) that includes the verify table.
- **Stacking:** inside a wave, a ticket that depends on an unmerged ticket branches from that ticket's branch, and its PR targets that branch. The owner merges the stack in order.
- **Blocked:** comment on the issue, label it `blocked`, push a draft PR, and take the next unblocked ticket in the same lane.
- **Done:** type check, lint, format check and tests pass, and verify passes for the ticket's feature IDs.
- **Core first.** No extra ticket starts while a core ticket in the same wave is unassigned.

## Must land first

`R01 scaffold` → `R02 contracts` → everything else. The simulator (`R03`) and the gateway socket (`R04`) follow straight after, in wave 1. `R15` request IDs ([ADR 0038](./adr/0038-subscribe-replies-carry-a-request-id.md)) lands before `R04` and `R05` merge, in the order contracts, then `R04`, then `R05`.

```
R01 ─► R02 ─┬─► R03 simulator ─┐
            ├─► R04 hub+socket ┼─► R06 REST+cache ─┐
            └─► R05 core live ─┴─► R07 core data ──┼─► R09 list ──┐
DESIGN.md (Graphite) ─────────────► R08 web shell ─┴─► R10 detail ┼─► R13 chart states (also needs R12)
                                                   ├─► R12 chaos   └─► R11 watchlist (stacked on R09)
                                                   └─► (freeze) ─► N01 Expo ─► N02 ─► N08
```

### Before wave 1

- Commit `.claude/settings.json` with the deny list from ADR 0025: no pushes to `main`, no force pushes, no `gh pr merge`, no reading `.env*` files.
- Run waves under `systemd-inhibit --what=sleep:idle` so the laptop does not sleep.
- Check usage for the three lanes' models. If a provider is low, run fewer lanes rather than a model outside the allowlist.
- Launch lane A on R01. Lanes B and C start when R02's PR is open. That is either the orchestrator thread waiting on lane A, or the owner at the next review.

### Core freeze (confirmed)

The core API freezes once R05 and R07 are merged, the thin list ticks against the real gateway, and you have reviewed the exports ([ADR 0020](./adr/0020-separate-platform-designs-shared-tokens-core-api-freeze.md)). Gaps found later by the web UI go through your sign-off.

## Core tickets

Each ticket lists what it delivers, what it depends on, the ADRs to read first, and its acceptance criteria. Every ticket also meets the general done rule above.

### R01. Scaffold, tooling and CI

- **Lane, wave:** A, 1, first. **Depends on:** nothing. **Read:** ADRs 0001, 0002, 0018, 0027, 0032.
- **Delivers:**
  - Turborepo with pnpm workspaces, pinned Node 26 and pnpm, and the six workspaces with package files and tsconfigs.
  - Core tsconfig without the DOM library. Core skeleton: `CoreProvider`, the storage, network status and lifecycle interfaces, and an `index.ts`.
  - Gateway stub on port 4000 serving `GET /stocks` with `feedMode: "simulated"`, `marketStatus: "open"` and an empty list. Web stub on 3000 rendering `app-root` with `data-feed-mode`.
  - OxLint config: the custom no-comments rule (directives allowed), `max-lines-per-function` 80 in apps, `max-lines` 200, the `useEffect` ban outside `integrations/` and core, and the DOM, Next.js and React Native import ban in core.
  - Oxfmt, Vitest, the physical-direction class check, gitleaks, and a GitHub Actions workflow running all of them plus the type check and build.
  - `.env.example`, `.nvmrc`, and `.gitignore` with `.env*` and `.verify/`.
  - The custom no-comments rule is time-boxed to 30 minutes, because the JS plugin API is alpha. If it fights back, ship without it, open a follow-up issue, and keep the critical path moving.
- **Acceptance:**
  - `pnpm i && pnpm dev` starts both stubs.
  - The verify skill's launch and doctor steps print `gateway-ok` and `web-ok`. If any command in the skill differs from what was built, the skill is fixed in this PR.
  - CI is green.
  - Each lint rule is proven by a fixture that fails it: a comment, an 81-line function, `useEffect` in a component, `window` in core, `ml-2` in web.

### R02. Contracts and money module

- **Lane, wave:** A, 1. **Depends on:** R01. **Read:** ADRs 0005, 0006, 0009, 0010, 0015, and the spec's socket and REST contract.
- **Delivers:**
  - Zod schemas and inferred types for every socket message and REST payload in the spec tables, including the quote, bars, error codes and `chaos`.
  - The money module: parse decimal strings into integer units of 1/10,000, subtract, percent, round to display precision (2 decimals at or above $1, 4 below), and format.
- **Acceptance:**
  - Unit tests: every message round-trips, invalid frames are rejected, and money cases cover sub-dollar prices, negative change, rounding at the boundaries, and that no float path exists.
  - Zod is the only runtime dependency.

### R03. Simulator adapters

- **Lane, wave:** A, 1. **Depends on:** R02. **Read:** ADRs 0003, 0011, 0013, 0022.
- **Delivers:**
  - A 30-minute spike on a price function that is a pure function of seed, symbol and time. If it fails, use the named fallback and write up why on the issue.
  - Simulator implementations of LiveFeed, HistorySource, Catalogue (a committed file of about 500 symbols, including the 50 list symbols, served in the asset-list shape) and MarketCalendar (always open, UTC-day sessions, force-closed hook).
  - Latency and failure-rate settings, and an injectable clock and seed.
- **Acceptance:**
  - Unit tests: the same seed and time give the same price across instances. The last bar of every range equals the live price at the same instant. History for a past day is unchanged after a restart. The previous close is the price at 00:00 UTC.

### R04. Gateway hub and socket

- **Lane, wave:** B, 1. **Depends on:** R02, from its branch. **Read:** ADRs 0005, 0006, 0008, 0010, 0028.
- **Delivers:**
  - Fastify with `@fastify/websocket` on `/ws?v=1`: `welcome`, set-semantics subscribe and unsubscribe, immediate snapshots, and partial success with `unknown_symbol` and `subscription_limit`.
  - Upstream reference counts. The latest quote per symbol. Per-connection conflation every 250 ms, with the 64 KB backpressure skip and a close after 10 s stuck.
  - Heartbeat every 5 s, protocol ping every 15 s, typed errors, the version check.
  - Limits: 16 KB messages, 20 per second, 100 subscriptions, 10 connections per IP. The origin allowlist, with a missing Origin allowed.
  - Uses a fake LiveFeed. The simulator is wired in once R03 and R04 are both on `main`.
- **Acceptance:** gateway-seam tests over a real socket cover:
  - subscribing twice, partial success, reference counts starting and stopping upstream
  - at most 4 frames per second under a spike
  - a slow consumer is skipped, not queued, and is closed after 10 s
  - heartbeat timing
  - `rate_limited`, and `unsupported_version` closing the socket

### R05. Core realtime

- **Lane, wave:** C, 1. **Depends on:** R02, from its branch. **Read:** ADRs 0002, 0006, 0007, 0009, 0010, 0012.
- **Delivers:**
  - The socket client with connection statuses (connecting, connected, stale, offline): stale on close and on 10 s of silence, connected only after welcome and snapshots arrive, backoff from 0.5 s to 30 s with full jitter, retry now, and offline from the network interface.
  - The keyed quote store with per-symbol listeners, where newest wins.
  - Reference counting with per-frame coalescing and the 2 s unsubscribe delay.
  - `useQuote` and `useConnectionStatus`. Re-subscribe in one message on reconnect.
  - An in-memory fake gateway for tests.
- **Acceptance:** core-seam tests in plain Node cover each status transition, backoff bounds and jitter, an older quote ignored, a tick notifying only that symbol's listeners, twenty mounts producing one subscribe, and an unmount followed by a remount within 2 s producing no unsubscribe.

### R15. Request IDs for subscribe replies

- **Lane, wave:** B, between waves 1 and 2. **Depends on:** R04 and R05 branches (`t/4-hub`, `t/5-core-realtime`). **Read:** ADR 0038 first, then 0006, 0008, 0010, 0028.
- **Delivers, in three PRs that all target `main`:**
  - **Contracts** on `t/15-request-ids`: `requestId` on `subscribe`, `snapshot`, the symbol errors and a subscribe's `rate_limited`, plus the new `unavailable` code, with schema tests. ADR 0038 and its amendments ride on this branch.
  - **Gateway** on `t/4-hub` (#28), after merging `t/15-request-ids` into it: exactly one terminal reply per parsed subscribe carrying its `requestId`, every requested symbol accounted for, `unavailable` for an upstream or handler failure, and `rate_limited` with the `requestId` for a subscribe over the limit.
  - **Core** on `t/5-core-realtime` (#27), after merging `t/15-request-ids` into it: settle by `requestId`, quotes from late replies still count, unaccounted symbols treated as `unavailable`, the 10 s deadline then one resend under a new ID then reconnect, re-queue after `rate_limited`, and pacing at 10 messages a second at most.
- **Frozen:** `CoreProvider`, `useQuote`, `useConnectionStatus` and the rest of core's public exports keep their signatures, because R08 builds against them in parallel.
- **Acceptance:**
  - Gateway-seam tests: replies echo the `requestId`; every symbol appears exactly once; a failed upstream snapshot gives `unavailable`; 22 subscribes in one second give 20 snapshots and 2 `rate_limited` replies, each with its ID; a reply under backpressure waits and is never dropped.
  - Core-seam tests against the fake gateway: out-of-order replies settle the right requests; a missing reply resends once under a new ID and then reconnects; `rate_limited` re-queues; a burst of mounts stays under 10 messages a second.
  - A scripted probe of real core against the real gateway, on a local merge of the three branches, replays Codex's round-3 scenarios (22 subscribes in one window, a snapshot sent while the buffer is over 64 KB, an adapter failure), and every subscribe settles. The output goes in the core PR. It is evidence, not a fourth test seam (ADR 0017).

### R06. Gateway REST and history cache

- **Lane, wave:** A, 2. **Depends on:** R03, R04. **Read:** ADRs 0011, 0013, 0021, 0023, 0028, 0029.
- **Delivers:**
  - `GET /stocks`, `?symbols=`, `/stocks/:symbol` (404 outside the catalogue) and `/stocks/:symbol/history?range=`, with bar sizes per ADR 0029, the session span for 1D and the previous close. Every response carries `feedMode` and `marketStatus`.
  - The history cache: in-flight sharing, stale-while-revalidate, 500-entry LRU, freshness by range and calendar, and the fallback chain with an "as of" age.
  - REST rate limit, CORS, and the simulator's HistorySource and Catalogue as the defaults.
- **Acceptance:**
  - Gateway-seam tests: ten concurrent identical requests make one source call, an expired entry is served at once and refreshed, failure falls back to the expired entry with its age and then to an error, and the cap evicts least recently used.
  - The verify doctor passes against real data.

### R07. Core data

- **Lane, wave:** B, 2. **Depends on:** R05. **Read:** ADRs 0012, 0014, 0015, 0016, 0023.
- **Delivers:**
  - A REST client. TanStack Query hooks for the list, a stock and history, with freshness per range. REST quotes seed the quote store.
  - The pure function that merges bars with the live quote.
  - Reconnect refetching the visible history.
  - The watchlist hook (`symbols`, `isStarred`, `toggle`) over the async storage interface: versioned, validated, corrupt values start empty, and a storage change subscription for cross-tab sync.
  - Formatters with explicit locale and time zone, and no `formatToParts`.
  - `useT` over i18next, with the English catalogue split into one file per feature to avoid merge conflicts.
  - `track` with a no-op adapter.
  - `useMarketStatus`, reading the status from `welcome` and `market_status`, for G2.
  - Replacing the `useT` and quote-formatting stand-ins that R08 put in `apps/web` with core's, and deleting them.
  - `CoreProvider` assembling everything, creating stores per instance. R01 fixes its props (platform adapters, gateway URL). R05 and R07 add internals only, never new required props, so R08 can mount it in parallel.
  - A reviewed `index.ts` as the freeze candidate.
- **Acceptance:** core-seam tests: the merge updates the last bar or appends one, watchlist ordering, a corrupt value starts empty, cross-tab events, two provider instances do not share state, and formatter output is identical under different machine time zones.

### R08. Web shell and tokens

- **Lane, wave:** C, 2. **Depends on:** R05. **Read:** ADRs 0020, 0023, 0027.
- **Design:** `docs/DESIGN.md` sections Foundations, Tokens, Layout, Right to left, App header, Connection banner, Stock row (views only), Star, Buttons, Skeletons, Empty state. Canvas artboards (each has a `Dark-` twin): [System-Foundations](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-System-Foundations), [System-Colour](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-System-Colour), [System-Type](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-System-Type), [System-Motion](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-System-Motion), [System-Shell](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-System-Shell), [System-Feedback](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-System-Feedback), [System-RTL-Rules](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-System-RTL-Rules), [Light-List-stale](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-List-stale), [Light-List-offline](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-List-offline).
- **Graphite from the start:** `packages/tokens` holds every token in `docs/DESIGN.md` (colour for light and dark, type with the Arabic line heights, spacing, radii, elevation, motion) and Tailwind's theme is generated from it. Alexandria is loaded through `next/font`. Build the shared views (star, price cell with the flash ring, day-change pill) to the Stock row and Star specs.
- **Delivers:**
  - `packages/tokens` from the chosen direction, and the Tailwind v4 theme generated from it.
  - Root layout and header with the feed-mode badge, market status label and connection banner with retry.
  - Web platform adapters: localStorage, online status, page visibility.
  - Providers with per-request stores and the `HydrationBoundary` plumbing.
  - The Playwright harness on ports 4100 and 3100, with test titles that start with the feature ID, and a CI job.
  - The shared views every page uses: the star button, the price cell with flash and reduced-motion handling, and the day-change cell with sign and arrow. R09 to R11 consume them and do not rebuild them.
- **Acceptance:**
  - Verify PASS for G1, and G3 steps 1, 4, 5 and 6, against the gateway on `main` (simulator wired in).
  - No hydration warnings.

### R09. Web list

- **Lane, wave:** A, 3. **Depends on:** R06, R07, R08. **Read:** ADRs 0007, 0012, 0023, 0029.
- **Design:** `docs/DESIGN.md` sections Stock row, Star, All and Watchlist control, Skeletons, Empty state (list error), Layout (768 and 1440 px). Canvas artboards (each has a `Dark-` twin): [System-Row](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-System-Row), [Light-List-first-load](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-List-first-load), [Light-List-live](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-List-live), [Light-List-error](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-List-error), [Light-List-closed](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-List-closed), [Light-Tablet-list](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Tablet-list), [Light-Desktop-list](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Desktop-list), [Light-Arabic-list](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Arabic-list).
- **Delivers:**
  - A virtualised list using TanStack Virtual with an initial rectangle, so the server renders the first rows. Connected rows over views.
  - Price flash, respecting reduced motion. Day change with sign and arrow.
  - Stars. The All and Watchlist toggle in the URL. The error state with retry.
- **Acceptance:** verify PASS for L1, L2, L3, L4, L5, W1 and G4 on the list page.

### R10. Web detail and chart

- **Lane, wave:** B, 3. **Depends on:** R06, R07, R08. **Read:** ADRs 0015, 0023, 0026, 0029.
- **Design:** `docs/DESIGN.md` sections Detail header, Range tabs, Price chart, Star, Empty state (not found), Layout (768 and 1440 px). Canvas artboards (each has a `Dark-` twin): [System-Detail](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-System-Detail), [Light-Detail-1D](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Detail-1D), [Light-Detail-1W](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Detail-1W), [Light-Detail-1M](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Detail-1M), [Light-Detail-3M](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Detail-3M), [Light-Detail-1Y](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Detail-1Y), [Light-Detail-5Y](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Detail-5Y), [Light-Detail-closed](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Detail-closed), [Light-Tablet-detail](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Tablet-detail), [Light-Desktop-detail](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Desktop-detail), [Light-Arabic-detail](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Arabic-detail), [Light-Not-found](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Not-found).
- **Delivers:**
  - The `/stocks/[symbol]` route with server prefetch.
  - A live header with range change through the money module.
  - Range tabs in the URL.
  - Lightweight Charts in `integrations/`: live `update()`, the 1D session axis using blank points, the previous-close line, and the attribution logo.
  - The detail star. The 404 page.
- **Acceptance:** verify PASS for D1, D2, D3, D7 and D8, and G4 on the detail page.

### R11. Watchlist view

- **Lane, wave:** A, 4, stacked on `main` after R09 merges. **Depends on:** R09 (the view lives inside its page and toggle). **Read:** ADR 0014.
- **Design:** `docs/DESIGN.md` sections Stock row (watchlist), Star, Skeletons, Empty state (watchlist). Canvas artboards (each has a `Dark-` twin): [Light-Watchlist-skeleton](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Watchlist-skeleton), [Light-Watchlist-empty](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Watchlist-empty), [Light-Watchlist-populated](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Watchlist-populated).
- **Delivers:**
  - The watchlist view: newest first, live rows, and symbols outside the list through `?symbols=`.
  - The empty state, the corrupt-storage fallback, and cross-tab sync wired to the browser storage event.
  - A neutral star on the server render.
- **Acceptance:** verify PASS for W2, W3, W4, W5, W6 and W7, and G4 on the watchlist view.

### R12. Chaos controls

- **Lane, wave:** C, 3. **Depends on:** R06, R08 (the panel mounts in the layout). **Read:** ADRs 0030, 0022.
- **Design:** `docs/DESIGN.md` sections Chaos controls (leave the health tiles to N06). Canvas artboards (each has a `Dark-` twin): [System-Chaos](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-System-Chaos), [Light-List-chaos](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-List-chaos).
- **Delivers:**
  - Gateway handlers for `chaos`, in simulator mode only. Per-connection: drop and freeze. Global with a 60 s automatic revert: tick spike, history latency, history failure rate of 50% or 100%, and force closed.
  - The web debug panel at `?debug=1`, with go offline wired to the network adapter and a countdown for the global controls.
- **Acceptance:** verify PASS for C1, C2, C3, G2, and G3 steps 2 and 3.

### R13. Chart states and scrubbing

- **Lane, wave:** B, 4. **Depends on:** R10, R12 (for the history chaos). **Read:** ADRs 0026, 0029.
- **Design:** `docs/DESIGN.md` sections Price chart (states, scrubbing, attribution), Detail header (scrubbing, chart loading, chart error, stale). Canvas artboards (each has a `Dark-` twin): [System-Chart-States](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-System-Chart-States), [Light-Detail-loading](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Detail-loading), [Light-Detail-scrubbing](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Detail-scrubbing), [Light-Detail-chart-error](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Detail-chart-error), [Light-Detail-as-of](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Detail-as-of), [Light-Detail-stale](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD#artboard-Light-Detail-stale).
- **Delivers:**
  - A skeleton of the same size and no layout shift.
  - An inline error with retry, with the header still live.
  - The "as of" note when an expired copy is served.
  - The scrub readout (price, time in ET, range change) with pointer and keyboard.
  - No gap after a reconnect.
- **Acceptance:** verify PASS for D3 (reconnect), D4, D5 and D6.

### R14. Documentation

- **Lane, wave:** B, 6. **Depends on:** the core build. **Read:** all ADRs.
- **Delivers:** setup, architecture and limitations docs. How to run the app. The architecture and data-flow diagrams. Decisions and trade-offs linked to the ADRs. Scaling to 100,000 users. The AI workflow (the grilling session, the ADRs, agents across three lanes, verify). What was not built. The TradingView notice.
- **Acceptance:** a fresh clone following only the README reaches a ticking list, and the Markdown link check passes.

## Design ticket

### D01. Design directions

- **Status:** replaced and done. The owner designed Graphite in Claude Design: the spec is `docs/DESIGN.md` and the drawings are on the [design canvas](https://claude.ai/artifact/T8HAm3Q6Y3tAnTsQXm6FAD). Web tickets build on it directly.
- **Lane, wave:** none. **Depends on:** nothing. Docs only.
- **Delivers:** using the frontend-design skill (or `impeccable` if it is not installed), three distinct aesthetic directions in `docs/design/`. Each one has a name, mood, type, palette for light and dark, motion and density, plus static HTML mockups of the web list and detail and the mobile list. They take cues from Robinhood and Google Finance without copying them.
- **Acceptance:** each direction opens in a browser, shows ticking-state examples (up, down, stale, closed), and passes contrast for text and for the up and down signals. You pick one, and it becomes `docs/DESIGN.md`.

## Extra tickets

In spec order, scheduled after the core work in their wave.

| ID | Ticket | Wave and lane | Depends on | Acceptance |
| --- | --- | --- | --- | --- |
| N01 | Expo scaffold and list: Expo Router tabs, platform adapters, live list, stars, `react-native-graph` check in Expo Go | owner pairing | Freeze | M1 and M2 PASS. The verify skill's Expo section is written. |
| N02 | Expo detail and chart: ranges, finger scrubbing, live point | Wave 4, C | N01, R10 | M3 PASS |
| N08 | Expo watchlist, lifecycle and states: 10 s background grace, foreground re-snapshot, stale and offline | Wave 5, C | N02 | M4 and M5 PASS |
| N04 | Hosted demo: Fly.io gateway (one always-on machine) and Vercel web, both simulator | owner pairing | Core build complete | HD1 PASS |
| N03 | Alpaca adapter: stream 30 symbols and poll the rest by batch snapshot, history, asset-list catalogue refreshed at open and close, clock and calendar, fail fast without keys | Wave 5, A | R06 | Adapter tests against recorded fixtures. A manual run with your paper keys shows Live, and Market closed outside hours. The batch limit is measured and noted. |
| N05 | Search: gateway endpoint over the catalogue, web search with debounce and cancellation, star from results | Wave 5, B | R06, R09 | S1, S2 and S3 PASS |
| N06 | Connection health metrics: core counters, heartbeat skipped count, `GET /health`, debug-panel readout | Wave 6, C | R12 | H1 PASS |
| N07 | Server-side watchlist: device ID, endpoints, Node SQLite, optimistic toggle with rollback, one-time upload | Wave 6, C | R11 | SW1 PASS |
| N09 | Core additions: `useFeedMode`, and English and Arabic strings for the mobile Settings, status strip and debug work | — | Owner sign-off (ADR 0041) | Type check, lint, format check and tests pass. No behaviour change on web or mobile. |
| N10 | Mobile Settings: gear button, stack screen, appearance (System, Light, Dark) and language | — | N09 | M6 PASS |
| N11 | Mobile status strip with the feed mode badge | — | N09 | M7 PASS |
| N12 | Mobile market status in the status strip | — | N11 | M8 PASS |
| N13 | Mobile search: full-screen route, field, states, results with stars | — | None | M9 PASS |
| N14 | Mobile chaos controls and connection health, simulated mode only, behind a Settings switch | — | N09, N10 | M10 PASS |

Design references for these tickets: search uses the `Search` section of `docs/DESIGN.md` and the `Search-*`, `Dropdown-*`, `Desktop-search` and `Arabic-search` artboards. The Expo tickets build from the 360 px artboards with the mobile notes in each `DESIGN.md` section. Health metrics fill the four tiles in the chaos panel, and the server-side watchlist uses the Toast.

Not planned now: quick authentication replacing the device ID, Yahoo history fallback, PostHog adapter, and orders and portfolio. Arabic translation was later built (ADR 0051, feature G6).

## Parallel safety

- Waves 1 and 2 touch separate workspaces per lane, so conflicts are unlikely.
- Wave 3 puts three lanes in `apps/web`: R09 owns `/`, R10 owns `/stocks/[symbol]`, and R12 owns the debug panel and the gateway's chaos handlers. The shared views, header and layout belong to R08 and are finished before wave 3. The string catalogue is one file per feature, from R07. R11 builds inside R09's page, so it runs in wave 4, after R09 merges. New test IDs are added to the feature map in the same PR.
- Any change to core after the freeze is called out in the PR title (`core:`) and waits for your sign-off.
