# The frozen core API

Amends ADR 0020.

The core public API is the list below, exported from `packages/core/src/index.ts` and nothing else. After this ADR merges, any change to that surface needs approval: a name added to or removed from `index.ts`, and any change to an exported signature, type or returned shape, wherever it is defined. Web and mobile can then build against it without breaking each other. Internals stay free to change: every module keeps its own exports, and core's tests import them by file path.

- **Provider:** `CoreProvider`, `CoreProviderProps`.
- **Platform interfaces:** `KeyValueStore`, `KeyValueListener`, `NetworkStatus`, `NetworkState`, `NetworkListener`, `AppLifecycle`, `LifecycleState`, `LifecycleListener`, `SocketFactory`, `HttpFetch`, `HttpRequestInit`, `HttpResponse`, `AbortSignalLike`.
- **Live hooks:** `useQuote`, `useConnectionStatus`, `ConnectionStatusResult`, `ConnectionStatus`, `useMarketStatus`.
- **Data hooks:** `useStockList`, `useStocks`, `useStock`, `useHistory`, `useLiveHistory`, `LiveHistoryResult`, `useWatchlist`, `WatchlistResult`.
- **Server prefetch:** `stockQueryKeys`, `stockListQueryOptions`, `stocksBySymbolsQueryOptions`, `stockQueryOptions`, `historyQueryOptions`, `createRestClient`, `buildRestBaseUrl`, `RestClient`, `RestClientError`, `RestClientErrorCode`.
- **Strings and formatting:** `useT`, `useLocale`, `MessageKey`, `Translate`, `TranslationValues`, `formatPrice`, `formatSignedAmount`, `formatSignedChange`, `formatSignedPercent`, `directionOf`, `Direction`, `FlashDirection`, `formatMarketTime`, `formatMarketDate`, `formatMarketDateTime`, `MarketTimeOptions`, `MarketDateOptions`, `MARKET_TIME_ZONE_LABEL`.
- **Analytics:** `AnalyticsAdapter`, `AnalyticsEvent`.
- **Chaos:** `useChaosControls`, `ChaosControlsResult`, `ChaosToggleView`, `ChaosFailureRateView`.

`index.test.ts` pins the sorted runtime export names, so an accidental export or removal fails the tests. Type-only exports are erased at runtime, so the test cannot see them. They are held by this rule, and a review of a core change checks every exported type it touches, not only `index.ts`.

`HttpRequestInit`, `HttpResponse` and `AbortSignalLike` are listed because an app that writes its own fetch adapter as a standalone function has to name its parameter and return types. They are types only and add nothing at runtime.

`useLiveHistory(symbol, range)` joins the list before the freeze, so the chart page only renders views. It derives everything from `useHistory` and `useQuote` during render, writes nothing, and memoises on the query's own fields, so a parent re-render returns the same result. A fallback copy (one with `ageMs`) keeps the gateway's bars unchanged, because a live point would put prices newer than its "as of" time on the chart. The range change measures from the previous close on 1D and from the first bar of the fetched history on every other range (ADR 0029), and it is `undefined` until the range has loaded once, which the header shows as a dash. It also returns the baseline for the scrub readout, the previous close for the 1D line, and `asOf` for a fallback copy.

## Considered options

- **Leave the wide barrel:** nothing to change now, but every internal helper becomes a promise to both apps, and refactoring core needs approval.
- **Snapshot the type exports too, with a declaration build:** catches type drift in CI, but adds a build step to a package that ships source.
- **Return the TanStack Query result spread with the extra fields:** matches `useHistory`, but spreading reads every tracked property, so the chart would re-render on every query change, and the frozen type would carry all of TanStack's result.

## Approved additions

These additive exports land with their feature PRs, which add each one to `index.ts` and to the pinning test. Nothing existing changes.

- **`useSearch`, `SearchResult`** (N05): debounced catalogue search over the gateway's search endpoint, cancelling superseded requests (ADR 0013).
- **`useConnectionHealth`, `ConnectionHealth`** (N06): read-only connection counters for the debug panel (ADR 0036).
- **`useTrack`** (detail analytics): returns `track`, so a connected component can record `stock_opened` and `range_changed`, which no data hook can fire for it.
- **`useLanguage`, `LanguageResult`, `parseLocale`, `localeDirection`, `Locale`, `TextDirection`, `LocaleSwitch`, and `CoreProviderProps.switchLocale`** (Arabic): the current locale and its direction, a way to switch it, and the platform hook that applies the switch (ADR 0051).

Day high and low are added in the table and on the stock page (ADR 0063). That widens two exported types and adds no export: `Quote`, which `useQuote` returns, gains an optional `dayRange`, and `MessageKey` gains `list.column.dayHigh`, `list.column.dayLow`, `detail.dayHigh`, `detail.dayLow` and `quote.dayRange.none`.

A column manager is added (ADR 0064). It adds `useTableColumns` and the types `TableColumn` and `TableColumnsResult`, and `MessageKey` gains `list.columns.button`, `list.columns.title` and `list.columns.reset`.

One change in meaning, with no export or shape change: ADR 0043 measures a fallback copy's `useLiveHistory` range change to the live price.

Watchlist stock resolution moves into core (ADR 0065). It adds `useWatchlistStocks` and the types `WatchlistStocksResult` and `WatchlistStockRow`. Nothing existing changes.

The core additions for mobile Settings, status strip and debug work (N09) add `useFeedMode`, which returns the feed mode from the socket's welcome with no extra request: `null` until the first welcome, and the same value after that, whatever a later welcome says. `MessageKey` gains `settings.title`, `settings.open`, `settings.appearance`, `settings.appearance.system`, `settings.appearance.light`, `settings.appearance.dark`, `settings.debug`, `settings.debug.chaosHelp` and `chaos.open`. Nothing existing changes.

## Subsequent additions and current export surface

Several later features recorded their own core exports directly in their ADRs, and [ADR 0053](0053-the-all-list-pages-through-the-catalogue.md) noted on 26 Nov 2026 that the strict freeze was relaxed while the remaining features landed:

- **Web colour scheme ([ADR 0052](0052-explicit-web-color-scheme.md)):** `useColorScheme`, `ColorScheme`, `ColorSchemeStore`, and optional `CoreProviderProps.colorScheme`.
- **Catalogue paging ([ADR 0053](0053-the-all-list-pages-through-the-catalogue.md)):** `useStockPages`, `StockPagesResult`, `stockPagesQueryOptions`, `stockQueryKeys.pages`, and `RestClient.listStockPage`.
- **Supplemental stock page data ([ADRs 0055–0058](0055-yahoo-company-overviews-stay-separate-from-prices.md)):** `useCompanyProfile`, `CompanyProfileView`, `useStockStatistics`, `StockStatisticsView`, `useStockNews`, `StockNewsView`, `useStockEarnings`, and `StockEarningsView`.
- **Server-side route metadata ([ADR 0061](0061-route-metadata-describes-stocks-without-live-prices.md)):** `createI18n`.
- **Feed-session quarantine ([ADR 0077](0077-feed-changes-require-a-new-client-session.md)):** `useFeedSession` and optional `CoreProviderProps.initialFeedMode`.
- **Per-symbol quote availability ([ADR 0083](0083-order-quote-metadata-and-track-symbol-availability.md)):** `useQuoteAvailability`, `QuoteAvailability`, and `useQuoteWarning`.
- **Realtime debug diagnostics ([ADR 0081](0081-separate-readiness-from-symbol-diagnostics.md)):** additive `ConnectionHealth.diagnostics` field on `useConnectionHealth()` (no new barrel export).
- **Web-owned table columns ([ADR 0095](0095-web-owns-table-column-choices.md)):** `useTableColumns`, `TableColumn`, and `TableColumnsResult` moved out of `packages/core` into `apps/web/src/columns`.
- **Range switch keeps the previous chart ([ADR 0098](0098-a-range-switch-keeps-the-previous-chart.md)):** the `LiveHistoryOptions` type, an optional third argument on `useLiveHistory` and `useHistory`, and the `updating` and `range` fields on `LiveHistoryResult`.
- **Watchlist sorting ([ADR 0099](0099-the-watchlist-sorts-on-click-from-a-snapshot.md)):** `useSortedStocks`, `nextStockSort`, `firstStockSortDirection`, `STOCK_SORT_FIELDS`, `StockSort`, `StockSortField` and `StockSortDirection`. `MessageKey` gains `list.sort.label`, `list.sort.button`, `list.sort.ascending` and `list.sort.descending`.

The authoritative current export surface is [`packages/core/src/index.ts`](../../packages/core/src/index.ts), pinned at runtime by [`packages/core/src/index.test.ts`](../../packages/core/src/index.test.ts).
