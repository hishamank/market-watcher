# Architecture Decision Records (ADRs)

All architectural decisions live in [`docs/adr/`](adr/) as `NNNN-kebab-case.md`. `pnpm check:adrs` ([`scripts/check-adrs.ts`](../scripts/check-adrs.ts)) enforces unique numbering and filenames across every Markdown file inside `docs/adr/`, which is why this index sits beside that folder rather than inside it. On success `pnpm check:adrs` prints the total unique ADR count; on failure it reports problems and the next free number. Gaps in the sequence reflect non-contiguous reservations across concurrent branches.

## Index (`0001`–`0100`, 91 ADRs)

| ADR | Decision |
| --- | --- |
| [0001](adr/0001-turborepo-pnpm-nextjs-monorepo.md) | Turborepo monorepo with pnpm workspaces and Next.js |
| [0002](adr/0002-logic-free-components-and-platform-agnostic-core.md) | Logic-free components and a platform-agnostic core |
| [0003](adr/0003-split-live-feed-and-history-source.md) | Split LiveFeed and HistorySource, selected by one feed mode |
| [0004](adr/0004-explicit-feed-mode-and-gateway-owned-market-status.md) | Explicit feed mode and gateway-owned market status |
| [0005](adr/0005-socket-envelope-versioning-and-validation.md) | Socket envelope, versioning and validation |
| [0006](adr/0006-subscription-semantics-and-reference-counting.md) | Subscription semantics and reference counting |
| [0007](adr/0007-virtualised-list-with-visibility-driven-subscriptions.md) | Virtualised list with visibility-driven subscriptions |
| [0008](adr/0008-per-connection-conflation-in-the-gateway.md) | Per-connection conflation in the gateway |
| [0009](adr/0009-no-replay-source-timestamps-and-resnapshot-on-reconnect.md) | No replay: source timestamps, newest wins, re-snapshot on reconnect |
| [0010](adr/0010-two-way-liveness-checks-and-typed-errors.md) | Liveness checked in both directions, and typed errors |
| [0011](adr/0011-one-pipeline-for-every-data-source-with-history-cache.md) | One pipeline for every data source, with the history cache in the first cut |
| [0012](adr/0012-tanstack-query-for-requests-keyed-store-for-quotes.md) | TanStack Query for requested data, a keyed store for live quotes |
| [0013](adr/0013-symbol-catalogue-as-a-pluggable-source-for-search.md) | The symbol catalogue is a pluggable source, and search runs on it in gateway memory |
| [0014](adr/0014-watchlist-as-symbols-behind-a-storage-interface.md) | Watchlist as a set of symbols behind a storage interface |
| [0015](adr/0015-server-owns-money-maths-wire-carries-rounded-decimal-strings.md) | No floats for money, one shared money module, and pre-rounded decimal strings on the wire |
| [0016](adr/0016-day-one-conventions-rtl-i18n-analytics-platform-interfaces.md) | Day-one conventions: right-to-left readiness, i18n, analytics and platform interfaces |
| [0017](adr/0017-critical-path-unit-and-end-to-end-tests.md) | Critical-path unit and end-to-end tests |
| [0018](adr/0018-code-rules-enforced-by-tooling.md) | Code rules are enforced by tooling, not by convention |
| [0019](adr/0019-build-order-core-first-then-extras.md) | Build order: core first, then extras |
| [0020](adr/0020-separate-platform-designs-shared-tokens-core-api-freeze.md) | Separate platform designs, shared tokens, and a checkable core API freeze |
| [0021](adr/0021-alpaca-adapter-streams-30-and-polls-the-rest.md) | The Alpaca adapter streams 30 symbols and polls the rest |
| [0022](adr/0022-deterministic-simulator-with-pluggable-market-calendar.md) | A deterministic simulator and a pluggable market calendar |
| [0023](adr/0023-server-renders-first-frame-socket-takes-over-after-hydration.md) | The server renders the first frame, and the socket takes over after hydration |
| [0024](adr/0024-github-issues-for-tickets-spec-rewritten-in-place.md) | GitHub issues for tickets, and the spec rewritten in place |
| [0025](adr/0025-unattended-agents-in-worktrees-never-merge.md) | Unattended agents work in worktrees, open PRs and never merge |
| [0026](adr/0026-lightweight-charts-for-the-web-chart.md) | TradingView Lightweight Charts for the web chart |
| [0027](adr/0027-tailwind-on-web-stylesheet-on-mobile.md) | Tailwind on web, StyleSheet on mobile, both fed by tokens |
| [0028](adr/0028-fastify-gateway-with-explicit-limits.md) | Fastify gateway with explicit limits |
| [0029](adr/0029-chart-ranges-bar-sizes-and-range-change.md) | Chart ranges, bar sizes and range change |
| [0030](adr/0030-chaos-controls-in-simulator-mode.md) | Chaos controls in simulator mode |
| [0031](adr/0031-server-side-watchlist-keyed-by-device-id.md) | Server-side watchlist keyed by an anonymous device ID (planned, not implemented) |
| [0032](adr/0032-pinned-toolchain-and-one-command-start.md) | Pinned toolchain and a one-command start |
| [0033](adr/0033-expo-go-constraint-and-react-native-graph.md) | Expo Go as a constraint, and react-native-graph for the mobile chart (with wagmi fallback) |
| [0034](adr/0034-mobile-lifecycle-navigation-and-adapters.md) | Mobile lifecycle, navigation and platform adapters |
| [0035](adr/0035-hosted-demo-on-fly-and-vercel.md) | Hosted demo on Fly.io and Vercel |
| [0036](adr/0036-connection-health-metrics-in-the-debug-panel.md) | Connection health metrics in the debug panel |
| [0037](adr/0037-rounding-display-precision-and-baseline-policy.md) | Rounding, display precision and the baseline rule |
| [0038](adr/0038-subscribe-replies-carry-a-request-id.md) | Subscribe replies carry a request ID |
| [0039](adr/0039-core-client-modules-marked-use-client.md) | Core marks its client-only modules with "use client" |
| [0040](adr/0040-broadcast-chaos-state-with-revert-timestamps.md) | Broadcast chaos state with revert timestamps |
| [0041](adr/0041-the-frozen-core-api.md) | The frozen core API |
| [0042](adr/0042-native-sockets-send-an-origin.md) | Native sockets send an Origin, so the allowlist names the gateway's origin |
| [0043](adr/0043-the-as-of-range-change-measures-to-the-live-price.md) | The as-of range change measures to the live price |
| [0044](adr/0044-hub-enforces-quote-phase-from-timestamps.md) | The hub enforces the quote phase from its timestamp |
| [0045](adr/0045-last-known-quotes-after-failed-phase-refresh.md) | Last-known quotes after a failed phase refresh |
| [0046](adr/0046-last-known-requires-a-failed-request.md) | Last-known marks require a failed request |
| [0047](adr/0047-the-price-flash-follows-the-tick.md) | The price flash follows the tick |
| [0048](adr/0048-a-motion-layer-for-graphite.md) | A motion layer for Graphite |
| [0049](adr/0049-tablet-table-brand-mark-and-watchlist-suggestions.md) | Tablet table, brand mark and watchlist suggestions |
| [0050](adr/0050-the-list-view-toggle-switches-in-the-browser.md) | The list view toggle switches in the browser |
| [0051](adr/0051-arabic-with-an-in-place-language-switch.md) | Arabic with an in-place language switch |
| [0052](adr/0052-explicit-web-color-scheme.md) | An explicit colour scheme on web |
| [0053](adr/0053-the-all-list-pages-through-the-catalogue.md) | The All list pages through the catalogue |
| [0054](adr/0054-exact-versions-and-a-seven-day-release-age.md) | Exact versions and a seven-day release age |
| [0055](adr/0055-yahoo-company-overviews-stay-separate-from-prices.md) | Yahoo company overviews stay separate from prices |
| [0056](adr/0056-key-statistics-are-independent-supplemental-data.md) | Key statistics are independent supplemental data |
| [0057](adr/0057-stock-news-comes-through-the-gateway.md) | Stock news comes through the gateway |
| [0058](adr/0058-earnings-and-hidden-empty-sections.md) | Earnings and hidden empty sections |
| [0059](adr/0059-feed-mode-in-a-status-strip-below-desktop.md) | Feed mode in a status strip below desktop |
| [0060](adr/0060-a-two-option-language-switch-on-web.md) | A two-option language switch on web |
| [0061](adr/0061-route-metadata-describes-stocks-without-live-prices.md) | Route metadata describes stocks without live prices |
| [0062](adr/0062-star-motion-shows-where-the-star-went.md) | Star motion shows where the star went |
| [0063](adr/0063-day-high-and-low-from-both-feeds.md) | Day high and low from both feeds, shown from 1440 px |
| [0064](adr/0064-a-column-manager-driven-by-css-variables.md) | A column manager driven by CSS variables |
| [0065](adr/0065-watchlist-stocks-resolve-in-core.md) | Watchlist stocks resolve in core |
| [0066](adr/0066-always-apply-valid-unsubscribes.md) | Always apply valid unsubscribes |
| [0067](adr/0067-model-selection-per-assignment.md) | Choose models per assignment |
| [0068](adr/0068-index-the-hydration-quote-fallback.md) | Index the hydration quote fallback |
| [0069](adr/0069-mobile-settings-and-appearance-override.md) | Mobile Settings behind a gear, with an appearance override |
| [0070](adr/0070-mobile-status-strip-under-the-native-header.md) | Mobile status strip under the native header |
| [0071](adr/0071-mobile-chaos-controls-behind-a-settings-switch.md) | Mobile chaos controls behind a Settings switch |
| [0072](adr/0072-chaos-scope-keeps-shared-controls-off-public-gateways.md) | Chaos scope keeps shared controls off public gateways |
| [0075](adr/0075-gateway-closes-on-signals-and-reports-its-revision.md) | The gateway closes on signals and reports its revision |
| [0076](adr/0076-bound-socket-control-work-and-close-abusive-connections.md) | Bound socket control work and close abusive connections |
| [0077](adr/0077-feed-changes-require-a-new-client-session.md) | Feed changes require a new client session |
| [0078](adr/0078-share-initial-server-catalogue-reads.md) | Share initial server catalogue reads |
| [0079](adr/0079-chart-range-button-semantics.md) | Chart range button semantics |
| [0080](adr/0080-omit-unsupported-simulated-year-range.md) | Omit unsupported simulated price-dependent statistics |
| [0081](adr/0081-separate-readiness-from-symbol-diagnostics.md) | Separate readiness from symbol diagnostics |
| [0082](adr/0082-finalize-history-after-market-close.md) | Finalize history after market close |
| [0083](adr/0083-order-quote-metadata-and-track-symbol-availability.md) | Order quote metadata and track symbol availability |
| [0091](adr/0091-the-gateway-image-holds-only-what-runs.md) | The gateway image holds only what runs |
| [0092](adr/0092-a-total-connection-cap-and-ipv6-budgets-by-prefix.md) | A total connection cap, and IPv6 budgets by /64 |
| [0093](adr/0093-history-gets-a-share-of-the-alpaca-budget.md) | History gets a share of the Alpaca budget |
| [0094](adr/0094-web-security-headers-and-a-nonce-based-content-security-policy.md) | Web security headers and a nonce-based Content Security Policy |
| [0095](adr/0095-web-owns-table-column-choices.md) | Web owns table column choices |
| [0096](adr/0096-journey-screenshots-wait-for-view-transitions.md) | Journey screenshots wait for view transitions |
| [0097](adr/0097-the-language-switch-turns-the-page.md) | The language switch turns the page |
| [0098](adr/0098-a-range-switch-keeps-the-previous-chart.md) | A range switch keeps the previous chart |
| [0099](adr/0099-the-watchlist-tab-counts-its-stars.md) | The Watchlist tab counts its stars |
| [0100](adr/0100-the-watchlist-sorts-on-click-from-a-snapshot.md) | The watchlist sorts on click from a snapshot |
