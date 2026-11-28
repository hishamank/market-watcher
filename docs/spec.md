# Mini Trading App: Spec

Status: final v2, rewritten on 25 Nov 2026 after a grilling session that recorded 36 decisions in [`docs/adr`](./adr) and the vocabulary in [`docs/glossary.md`](./glossary.md).

Terms in **bold** on first use are defined in the glossary. ADR numbers in brackets point to the decision and its reasoning.

## Problem Statement

A person investing in US stocks wants a quick, trustworthy view of the market. They want a list of well-known stocks with prices that move as the market moves, a way to open one stock and see how it has performed over a day, a week or years, and a short personal list of the stocks they care about. They need to trust what they see: whether a price is real or simulated, whether it is current or stale, and whether the market is open. They often use their phone on unreliable connections.

The project also holds itself to a quality bar: build something a team can keep extending, with clear boundaries, a real-time design that holds at scale, honest states for every failure, and a visible, steerable AI workflow. It must run with one command and look alive at any hour.

## Solution

A monorepo with three apps and three shared packages [0001]:

- A **gateway**: our own Node backend that serves REST and one WebSocket. It sits between market data providers and users' devices, holds provider keys, shares one upstream connection across all users, and owns market hours.
- A Next.js web app, mobile-first and responsive.
- An Expo app (extra) that runs in Expo Go [0033].
- `packages/contracts` (message and REST schemas, plus the shared money module), `packages/core` (shared financial, connection and query logic, platform-agnostic) and `packages/tokens` (design values).

The user sees a list of 50 stocks with live prices, a detail page with a live price and a chart across six **ranges**, and a **watchlist** they build by **starring** stocks. A badge always says whether prices are Simulated or Live, a banner says when the connection is stale or the device is offline, and a Market closed label appears when it applies. By default the gateway runs a deterministic simulator that needs no keys and is open around the clock. Real data from Alpaca is opt-in through one environment variable.

## User Stories

### Stock list

1. As an investor, I want to see a list of well-known US stocks and ETFs with their name, symbol and current price, then the rest of the catalogue as I keep scrolling, so that I can scan the market at a glance and browse beyond it [0053].
2. As an investor, I want each price to update live without refreshing, so that I can see the market moving.
3. As an investor, I want each row to show today's change in money and percent, with a sign and an arrow, so that I can see direction without relying on colour.
4. As an investor, I want a brief visual flash when a price changes, so that I notice movement.
5. As an investor who prefers reduced motion, I want the flash suppressed, so that the app respects my system setting.
6. As an investor on a slow phone, I want the list to stay smooth while prices tick, so that scrolling never stutters.
7. As an investor, I want prices to appear immediately when the page loads, so that I never see blank cells.
8. As an investor, I want a clear error with a retry button if the list cannot load, so that I am never stuck on a spinner.
9. As an investor, I want to star a stock straight from its row, so that building my watchlist is one tap.

### Stock detail

10. As an investor, I want to open a stock and see its live price prominently, so that I know where it trades now.
11. As an investor, I want a price chart for 1D, 1W, 1M, 3M, 1Y and 5Y, so that I can judge performance over different horizons.
12. As an investor, I want the header's change to follow the range I select ("Today", "Past year"), so that the number matches the chart.
13. As an investor, I want the 1D chart to span the whole session with a dashed line at the previous close, so that I can see where today stands.
14. As an investor, I want the chart's last point to move with the live price, so that the chart and the header always agree.
15. As an investor, I want to scrub across the chart and see the price, the time in ET and the change from the start of the range, so that I can inspect any point.
16. As an investor, I want switching back to a range I already viewed to be instant, so that comparing ranges is fast.
17. As an investor, I want the chart area to keep its size while loading, so that the page does not jump.
18. As an investor, I want a chart error to show in place with a retry, while the live price keeps updating, so that one failure does not blank the page.
19. As an investor, I want a clear not-found page for an unknown symbol, so that a bad link does not look like a broken app.
20. As an investor, I want to share a link to a stock at a specific range, so that someone else sees what I see.
21. As an investor, I want the back button to return me to the list with my view intact, so that navigation feels native.
22. As an investor, I want to star the stock from its detail page, so that I can add it while reading about it.

### Company overview

Show an independently loaded company or fund overview beneath the chart on web and mobile. Live mode uses Yahoo Finance for descriptions, sector, industry, exchange and website. Simulator mode uses labelled sample profiles without external calls. Failure stays within the overview. Expand long descriptions, omit missing fields, and show source and retrieval time. The news section is specified below. See ADR 0055 and feature D9.

### Key statistics

Also show market cap, trailing P/E and EPS, indicated dividend yield, three-month average daily volume and a 52-week range between the chart and company overview on web and mobile. Yahoo supplies supplemental statistics in live mode; the simulator uses labelled samples except for unsupported trailing P/E and 52-week ranges (ADR 0080). Missing data is a dash, zero remains zero, and negative EPS remains negative. Show plain, non-interactive field labels, identify USD and source/retrieval time, and keep failures independent of prices and profiles. When a source supplies a range, its marker uses the latest gateway quote. See ADR 0056, ADR 0080 and feature D10.

### Company news

Also show three recent stories below the overview, with headlines, publisher when supplied (otherwise destination site), publication date/time in ET and optional feed thumbnails. Show more reveals the rest of a batch of up to nine stories; Show less restores three. Live story links open externally. All news data comes through `/stocks/:symbol/news`, with ten-minute caching, deduplication and isolated failure/retry. Simulator mode uses clearly labelled fictional, non-clickable sample stories. No article scraping or full-text republishing. See ADR 0057 and feature D11.

### Earnings and unavailable data

Also show the next earnings report date (or range) and its confirmation status, last actual EPS against its estimate, and up to four fiscal quarters of actual versus estimated EPS. Label accounting basis, USD, source and retrieval time. Hide earnings for funds or when neither dates nor quarterly values exist. Omit unavailable subparts. The same hide-empty rule applies to overview, statistics and news, including all-null records; transient errors retain retry. See ADR 0058 and feature D12.

### Watchlist

23. As an investor, I want a Watchlist view next to All, so that I can focus on the stocks I care about.
24. As an investor, I want my starred stocks to stay starred after a reload, so that the list is really mine.
25. As an investor, I want starring to update every star on screen instantly, so that the app feels consistent.
26. As an investor, I want my most recently starred stock at the top, so that new interests are easy to find.
27. As an investor, I want a friendly hint when my watchlist is empty, so that I know how to fill it.
28. As an investor with two tabs open, I want a star in one tab to appear in the other, so that the tabs never disagree.
29. As an investor, I want watchlist rows to tick live like list rows, so that the watchlist is not a second-class view.
30. As an investor, I want to star any stock in the catalogue, not only the 50 in the list, so that my watchlist is not limited by the default list.

### Trust and connection

31. As an investor, I want a badge that says Simulated or Live, so that I always know whether prices are real.
32. As an investor, I want simulated and real prices never to be mixed, so that I can trust the badge.
33. As an investor, I want a Market closed label with the last close when the market is closed, so that I do not mistake a quiet market for a broken app.
    Live-only fallback (#58): after a failed phase refresh, show a last-known price with its source date and time, clock and visible detail explanation. This is not the last-close caption.
    If Alpaca is unreachable at a session boundary, REST omits the unavailable quote and new socket subscribers receive `unavailable`. Existing screens hold their last price. Both existing and waiting subscribers receive a tick when a current quote arrives (#52, [ADR 0044](adr/0044-hub-enforces-quote-phase-from-timestamps.md)).
34. As an investor, I want prices dimmed with a reconnecting banner when the connection goes quiet or drops, so that I never act on prices that silently stopped.
35. As an investor, I want a retry button on that banner, so that I can reconnect without waiting for the next attempt.
36. As an investor, I want a distinct Offline state when my device has no network, so that I know the problem is my connection.
37. As an investor, I want the app to recover by itself when the connection returns, with fresh prices and a chart without gaps, so that I do not have to reload.

### Search (extra)

38. As an investor, I want to search by ticker or company name with results as I type, so that I can find any stock quickly.
39. As an investor, I want exact ticker matches first, so that typing AAPL gives me Apple straight away.
40. As an investor, I want results never to flicker back to an older query, so that typing fast is safe.
41. As an investor, I want to star a stock straight from search results, so that I can add it without opening it.

### Mobile (extra)

42. As a mobile investor, I want Markets and Watchlist tabs and a detail screen, so that the app feels native on my phone.
43. As a mobile investor, I want the app to stop using data in the background and catch up when I return, so that it saves battery without showing old prices.
44. As a mobile investor, I want to scrub the chart with my finger, so that I can inspect prices on a small screen.

### Trying and developing

45. As a new user, I want to run everything with `pnpm i && pnpm dev` and no keys, so that I can try the app in minutes.
46. As a new user, I want chaos controls to drop the connection, freeze the feed, go offline, spike ticks, slow or fail history and close the market, so that I can see every failure state on demand.
47. As a new user, I want a hosted demo that is alive at any hour, so that I can look without installing anything.
48. As a developer, I want every socket and REST message validated against one shared schema, so that the gateway and the apps cannot drift.
49. As a developer, I want to add a data provider by writing one adapter, so that the pipeline never changes for a new source.
50. As a developer, I want the core logic to run unchanged on web and React Native, so that the mobile app is UI work only.
51. As a developer, I want lint to stop comments, physical-direction styles, oversized components and stray effects, so that the conventions hold without reviews catching them.
52. As a developer joining later, I want ADRs for every real decision, so that I know why things are the way they are before I change them.
53. As an operator (extra), I want connection health metrics and a health endpoint, so that I can see reconnects, latency and skipped frames.
54. As an investor on a second device (extra), I want my watchlist kept on the server, so that it survives clearing my browser storage.

## Implementation Decisions

### Workspaces and boundaries

- One Turborepo with pnpm workspaces: `apps/web` (Next.js App Router), `apps/mobile` (Expo), `apps/gateway` (Node), `packages/contracts`, `packages/core`, `packages/tokens`. A new workspace needs a reason [0001].
- **Contracts** is the only source of message and REST types, as Zod 4 schemas with inferred types. It also holds the shared money module [0005, 0015].
- **Core** holds every hook, store, service, the socket client and formatters, and runs unchanged on React and React Native. It depends on React and TanStack Query as peers and bans DOM, Next.js and React Native imports, through lint and a TypeScript config without the DOM library [0002].
- **Apps** hold UI only. **Views** are props-only. **Connected components** (including screens and routes) call one or two core hooks and pass the results to views, with no branching logic, fetching, timers or derived calculations [0002].
- Platform pieces are interfaces in core, implemented per app and injected through one `CoreProvider`: storage, network status and app lifecycle [0002, 0016].
- **Tokens** holds raw values only: colours (light and dark), spacing, type scale, radii, motion. Web turns them into Tailwind theme variables, and mobile imports them [0020, 0027].
- The core public API is one export surface, frozen once web's list, detail and watchlist work end to end and the owner has reviewed it. Expo code starts at the freeze [0020].

### Gateway pipeline

- Four pluggable pieces, all selected by one `FEED=simulator|alpaca` variable that defaults to the simulator [0003, 0013, 0022]:

| Piece | Simulator mode | Alpaca mode |
| --- | --- | --- |
| LiveFeed | simulator | Alpaca stream, 30 symbols, the rest polled every 5 s through batch snapshots [0021] |
| HistorySource chain | simulator | Alpaca, then Yahoo (optional) |
| Catalogue | committed file of about 500 symbols, served in the same asset-list shape | Alpaca asset list, about 10,000 symbols, refreshed at each open and close |
| Market calendar | always open, each UTC day one session | Alpaca clock and calendar |

- `FEED=alpaca` with missing or rejected keys exits at startup. The gateway never falls back to the simulator [0003].
- **Live path:** LiveFeed, then the hub, then the socket. The hub reference-counts connections per symbol and starts and stops upstream streams at 0 to 1 and 1 to 0. It keeps the latest quote per symbol and runs per-connection **conflation**. Every 250 ms one timer flushes each connection's set of changed symbols as one `quotes` frame. A socket whose outbound buffer exceeds 64 KB is skipped for that round, and one stuck above it for 10 s is closed. Snapshots bypass the timer [0006, 0008].
- **History path:** the chain for the feed mode, then the cache, then REST [0011]. Every source goes through the same pipeline, the simulator included. Cache behaviour:
  - Key: symbol and range.
  - Freshness: 1D for 60 s during a session, 1W for 5 min, 1M and longer until the next close. While closed, only a successful closed-phase refresh stays fresh until the next open; pre-close entries require refresh and failed refreshes remain labelled with their age [0011, 0082].
  - Size: 500 entries, least recently used evicted first.
  - Concurrency: concurrent identical requests share one upstream call.
  - Expiry: an entry expired by less than its freshness window is served immediately and refreshed in the background. An older entry is refreshed before responding.
  - Failure order: each source in the chain, then the expired entry marked with its age (shown as "as of"), then an error.
- **Simulator:** a price is a pure function of seed, symbol and time, built from seeded daily closes with seeded paths between them, so history at any bar size and live ticks agree. The ticket starts with a 30-minute spike on that construction. The fallback is deterministic history per range with its last point pinned to the live price. It has latency and failure-rate settings for the chaos controls [0022].
- **Market status** is open or closed, owned by the gateway, and sent in `welcome` and on every change. In Live mode, pre-market and after-hours count as closed, and extended-hours trades are dropped [0004].
- **Framework and hardening:** Fastify with `@fastify/websocket`, `@fastify/rate-limit`, `@fastify/cors` and structured logging [0028].
  - Origin: client origins are allowlisted explicitly. React Native's WebSocket also sends an Origin, taken from the socket URL, so the allowlist names the LAN gateway origin in development and the hosted origin in production. A missing Origin is accepted [0028, 0042].
  - Socket limits: inbound messages of at most 16 KB and 20 per second per connection, and at most 10 connections per IP.
  - REST limit: 120 requests a minute per IP.
  - Keys: only in the gateway's environment, never in responses or logs.

### Socket contract

- The client connects to `/ws?v=1`. An unsupported version gets `unsupported_version` and a close. Every message is `{ type, ...payload }`, a union on `type`, parsed with Zod on both ends. A frame that fails to parse is logged and dropped [0005].
- **Quote** fields: `symbol`, `price`, `change`, `changePercent`, `previousClose` (decimal strings pre-rounded by the gateway: 2 decimals at or above $1, 4 below, 2 for percent; the previous close is always positive), `timestamp` (UTC epoch milliseconds, the time observed at the source) and an optional `dayRange` of `low` and `high`, pre-rounded the same way, that always holds the price [0009, 0015, 0037, 0063].

| Direction | Type | Payload |
| --- | --- | --- |
| client to server | `subscribe` | `symbols` |
| client to server | `unsubscribe` | `symbols` |
| client to server | `chaos` | action and settings, accepted only in simulator mode [0030] |
| server to client | `welcome` | `protocolVersion`, `feedMode`, `marketStatus`, `heartbeatIntervalMs`, `maxSubscriptions`, `serverTime` |
| server to client | `snapshot` | `quotes` for the symbols just subscribed, sent immediately |
| server to client | `quotes` | `quotes` changed since the last frame, at most every 250 ms |
| server to client | `heartbeat` | `serverTime`, and the connection's skipped-frame count (extra) |
| server to client | `market_status` | `marketStatus` |
| server to client | `error` | `code`, `message`, and `symbols` where relevant |

- Subscriptions are a set per connection. Subscribing twice re-sends the snapshot, and unsubscribing something not held does nothing. Requests partly succeed: unknown symbols come back in one `unknown_symbol` error, and symbols beyond `maxSubscriptions` (100) come back in one `subscription_limit` error [0006, 0007].
- Valid unsubscribes are applied even over the socket rate limit, in order after earlier subscription changes. Repeats are no-ops. The gateway still sends at most one anonymous rate-limit notice per second; over-limit subscribes are refused under their request IDs and over-limit chaos messages are dropped [0066]. A connection may hold at most 256 pending subscribe, unsubscribe and refusal operations, and one that sends more than 300 over-limit messages in 10 s is closed with 1008; its address then waits 30 s before it can connect again [0076].
- Error codes: `unknown_symbol`, `subscription_limit`, `rate_limited`, `invalid_message` leave the connection open. `unsupported_version` and a stuck slow client close it [0010].
- **Liveness:** the gateway sends `heartbeat` every 5 s, and any message counts as life. The gateway also sends protocol pings every 15 s and closes connections that do not answer [0010].

### REST contract

- Every response carries `feedMode` and `marketStatus`, so the badge can render on the server [0023].
- `GET /stocks`: the 50 default list symbols, each with name and quote. `GET /stocks?symbols=` does the same for any catalogue symbols, which the watchlist uses [0007, 0014]. `GET /stocks?limit=&cursor=` pages through the whole catalogue in browse order and returns `nextCursor` [0053].
- `GET /stocks/:symbol`: name and quote, or 404 for a symbol outside the catalogue.
- `GET /stocks/:symbol/history?range=`: the symbol, the range, its bar size, the session's open and close for 1D, the previous close, the bars (time and close as a decimal string), and an "as of" age when served from an expired entry [0011, 0029].
- Extra: `GET /stocks/search?q=` (at most 10 results, ranked exact ticker, then ticker prefix, then name word prefix) [0013], `GET /health` [0036], and the watchlist endpoints [0031] (planned, not implemented; see issue #22).

### Client data and state

- TanStack Query owns requested data (list, history), with freshness per range mirroring the gateway's [0012].
- A keyed quote store in core, with no new dependency and per-symbol listeners through `useSyncExternalStore`, owns live quotes. A tick for AAPL re-renders only what shows AAPL. The store is created inside `CoreProvider`, never at module scope, and seeded from REST data [0012, 0023].
- Newest wins: the store ignores a quote older than the one it holds, and on equal timestamps the later arrival wins. Nothing is replayed [0009].
- The client counts references per symbol across components and coalesces subscribe and unsubscribe changes into one message per frame. A list row subscribes on mount and unsubscribes 2 s after unmount. The list is virtualised, so subscribed means visible [0006, 0007].
- **Connection status** is connecting, connected, stale or offline [0010]:
  - It becomes stale at once when the socket closes, and after 10 s of silence.
  - It returns to connected only after `welcome` and the snapshots for every referenced symbol have arrived.
  - Offline overrides stale, and there are no retries while offline.
  - Reconnects back off from 0.5 s to 30 s with full jitter, and the banner offers a retry that resets the backoff.
- On reconnect the client re-subscribes in one message and refetches the visible chart's history [0009].
- The chart merges bars with the live quote at render, through a pure function in core. Cached history is never modified [0012].
- The watchlist holds symbols only, behind an async storage interface, versioned and validated on read, with a corrupt value starting empty. Web syncs across tabs. The hook is `symbols`, `isStarred`, `toggle`, and `toggle` returns at once, so the server version later is an optimistic update behind the same API [0014].
- Money: no floats anywhere. One shared integer-unit money module in contracts is used by the gateway, and by clients only for values that depend on live data on the device, such as range change at the live or scrubbed point [0015].

### Web app

- Routes: `/` for the list, with `?view=watchlist` for the watchlist toggle, and `/stocks/[symbol]` for detail, with `?range=`. View state lives in the URL [0023].
- **Server rendering:**
  - Server components prefetch the list, the detail quote and the default range's history, and hand them over through `HydrationBoundary`.
  - Formatters always pass `en-US` and `America/New_York` explicitly, and no relative time is rendered on the server.
  - The chart is browser-only behind a skeleton of the same size.
  - Stars render neutral and the watchlist view shows a skeleton until hydration.
  - The socket opens after hydration.
  - Fallback if this proves costly: server-rendered skeletons filled on the client [0023].
- **Chart:** TradingView Lightweight Charts in the app's `integrations/` folder. It uses `update()` for the live point and blank points to extend the 1D axis to the session close. Its attribution logo stays on, and the notice goes in the README. Line and area only [0026].
- **Ranges:** 1D at 5 min, 1W at 30 min, 1M at 1 h, 3M and 1Y at 1 day, 5Y at 1 week. The header change follows the range (1D from the previous close, other ranges from the first bar), and the list shows **day change**. Colour is always paired with a sign and an arrow [0029].
- **Styling:** Tailwind v4 from tokens, logical utilities only, and a CI check that rejects physical-direction classes [0027].
- **List virtualisation** uses TanStack Virtual, with an initial rectangle so the server renders the first rows.

### Mobile app (extra)

- Runs in Expo Go with no custom native modules. Expo Router with Markets and Watchlist tabs and a stack for detail. AsyncStorage and `expo-network` implement the core interfaces. `StyleSheet` with tokens and start and end properties [0027, 0033, 0034].
- Chart: `react-native-graph`, confirmed on SDK 58 in Expo Go within the first hour of the ticket, with `react-native-wagmi-charts` as the fallback [0033].
- The socket closes 10 s after the app goes to the background. On foreground the app reconnects, re-snapshots and refetches the visible chart [0034].

### Day-one conventions

- Right-to-left readiness: logical properties only. Prices, tickers and charts are always laid out left to right [0016].
- i18n: every string goes through `useT()` in core, backed by i18next, with English and Arabic catalogues shared by both apps and the `intl-pluralrules` polyfill for Hermes. A header toggle switches language and direction in place; web keeps the choice in a `locale` cookie so the server renders `lang` and `dir`. Formatters take the locale explicitly and avoid `formatToParts` [0016, 0051].
- Analytics: `@mini/analytics` holds a typed event catalogue and the adapters. Events fire from the core hook that owns the action, or from an app event handler through `useTrack()`, never during render. Core adds the locale and feed mode to each event. For now both apps log events to the console in development and drop them in production, and a provider adapter can replace the console sink without changing call sites [0016, 0101].

### Code rules and tooling

- No comments, enforced by a custom OxLint rule (tool directives allowed, OxLint version pinned). At most 80 lines per function in apps and 200 per file everywhere. `useEffect` banned in app components outside `integrations/`, through `no-restricted-imports` and `no-restricted-properties`. React Compiler on in both apps, and no hand-written memoisation without a profile. Simplest solution and smallest fix [0018].
- Node 26 LTS and pnpm pinned. `pnpm i && pnpm dev` runs the gateway in simulator mode and the web app, and `.env.example` documents every variable [0032].

### Chaos controls

- A debug panel in simulator mode only, opened with `?debug=1` [0030].
- Controls that affect only your own connection: drop connection, freeze feed, go offline.
- Controls that affect everyone and revert after 60 s: tick-rate spike, 2 s history latency, a history failure rate of 50% or 100%, force market closed. The gateway accepts them only when `CHAOS_SCOPE` is `global`; the hosted gateway runs with `connection` [0072].
- With connection health metrics (extra), it also shows reconnects, frames per second, tick latency and skipped frames [0036].

### Hosting (extra)

- The gateway on Fly.io (one always-on machine), the web app on Vercel, both in simulator mode. The gateway's allowlist holds the Vercel domain, and the Expo app reads the gateway URL from its environment [0035].

### Process

- GitHub repository. Tickets are GitHub issues, and `docs/roadmap.md` orders them [0024].
- Agents work in their own worktrees on `t/<issue>-<slug>` branches, open PRs and never merge.
  - Models: Opus (high) and Gemini Neon (high) implement, and Codex reviews every ticket PR, a different family from the author [0025].
  - Permissions: a committed deny list blocks pushes to `main`, force pushes, merges and reading `.env*` files.
  - Availability: the machine is kept awake, and a lane pauses rather than falling back to a model outside the allowlist.
  - Blockers: a blocked agent comments, labels the issue and moves on.
  - History: Conventional Commits, verify output in every PR, and Co-Authored-By trailers [0025].

## Testing Decisions

- A good test checks behaviour through a public interface and would survive a refactor of the internals. We test where a bug would be silent and expensive, not for coverage [0017].
- **Three seams**, each the highest boundary available [0017]:
  1. The gateway through its real REST and socket interface, started in-process, with the simulator on an injected clock and seed.
  2. Core's public API against an in-memory fake gateway that speaks the contracts. It runs in plain Node, because core has no DOM.
  3. The browser, through Playwright against the real gateway in simulator mode with a fixed seed.
- **Unit tests (Vitest), critical paths only:**
  - contracts: schemas and the money module
  - core: socket client reconnect, stale and backoff; quote store newest-wins and per-symbol notification; subscription counting and coalescing; the bars and live-quote merge; watchlist storage (corrupt values, cross-tab sync)
  - gateway: hub reference counts, conflation and the backpressure skip; cache in-flight sharing, stale-while-revalidate and fallback; simulator determinism (history and live agree)
- **End-to-end tests (Playwright), core:**
  - the list loads and ticks
  - the detail chart switches range
  - a star survives a reload
  - the stale banner appears when the gateway stops and clears when it returns

  They are the mechanical half of the verify skill, and the agent's browser walk-through is the judgement half.
- **CI** (GitHub Actions): OxLint, `oxfmt --check`, type check, Vitest, build, Playwright, the physical-direction class check, and a gitleaks secret scan.
- There is no prior art in the repo yet. The first tests in each seam become the pattern for the rest.

## Build order

The core build lands first and is built so later extras slot in without rework. Extras follow in the order below [0019].

**Core**

- Gateway: simulator feed and calendar, hub with conflation, REST for the list, detail, history and `?symbols=`, and the history cache.
- `packages/contracts` (with the money module), `packages/core`, `packages/tokens`.
- Web app: list, detail with chart ranges, and watchlist, with every loading, stale, offline and error state.
- Watchlist on the device.
- The day-one conventions and the lint rules.
- Minimal chaos controls.
- Unit and end-to-end tests, and CI.
- The committed AI setup (`CLAUDE.md` files, the verify skill, ADRs, glossary, spec, feature map, roadmap) and the README.
- `pnpm dev` starting the gateway and the web app.

**Extras, in order**

1. Expo app, from the core API freeze.
2. Hosted demo.
3. Alpaca adapter, with the 30-symbol stream and the polling fallback.
4. Search, a self-contained ticket suited to a parallel agent.
5. Connection health metrics.
6. Server-side watchlist keyed by device ID (not implemented, #22).

**Optional**

- Quick authentication replacing the device ID.
- Yahoo history fallback.
- PostHog analytics adapter.
- Arabic translation, with an in-place switch to right to left (done, ADR 0051).
- Orders and portfolio.

## Out of Scope

- Placing orders, holdings, portfolio value and any money movement.
- Extended-hours prices and a third market status [0004].
- Candlestick charts, technical indicators and volume.
- A Yahoo live stream or Yahoo search [0003, 0013].
- Accounts and authentication, apart from the optional quick authentication.
- Push notifications and price alerts.
- Replaying missed ticks after a disconnect [0009].
- Custom native modules or a dev build for mobile [0033].
- Redis, multiple gateway nodes and pub/sub, which are described in the README as the scaling path but not built.

## Further Notes

- **First-run experience:** one command, no keys, a hosted demo, screenshots, and docs for contributors.
- **AI setup committed with the repo:** a short root `CLAUDE.md` and one per workspace, the verify skill built on `docs/feature-map.md`, this spec, the ADRs, the glossary, the roadmap, and the research notes in `docs/research`. The workflow: a goals session, a grilling session that produced the ADRs, this spec, then up to three agents in parallel on tickets with review across model families.
- **Skills used:** grill-with-docs (grilling plus domain modelling), to-spec, a project verify skill, and frontend-design with `docs/DESIGN.md` when UI work starts. Design commits to one aesthetic direction before components are written, taking cues from Robinhood and Google Finance without copying them.
- **Facts behind decisions** are in `docs/research/tooling-facts.md`, checked on 24 and 25 Nov 2026. Several items are marked unverified there, and the tickets that depend on them start by confirming them.
