export { CoreProvider } from "./core-provider.tsx";
export type { CoreProviderProps } from "./core-provider.tsx";

export type { AppLifecycle, LifecycleListener, LifecycleState } from "./platform/app-lifecycle.ts";
export type { KeyValueListener, KeyValueStore } from "./platform/key-value-store.ts";
export type { NetworkListener, NetworkState, NetworkStatus } from "./platform/network-status.ts";
export type { SocketFactory } from "./realtime/transport.ts";
export type {
  AbortSignalLike,
  HttpFetch,
  HttpRequestInit,
  HttpResponse,
} from "./rest/rest-client.ts";

export { useQuoteWarning } from "./hooks/use-quote-warning.ts";
export { useQuoteAvailability } from "./hooks/use-quote-availability.ts";
export type { QuoteAvailability } from "./realtime/quote-store.ts";
export { useQuote } from "./hooks/use-quote.ts";
export { useConnectionStatus } from "./hooks/use-connection-status.ts";
export type { ConnectionStatusResult } from "./hooks/use-connection-status.ts";
export type { ConnectionStatus } from "./realtime/socket-types.ts";
export { useMarketStatus } from "./hooks/use-market-status.ts";
export { useFeedMode } from "./hooks/use-feed-mode.ts";

export { useHistory, useStock, useStockList, useStocks } from "./hooks/use-stocks.ts";
export { useStockPages } from "./hooks/use-stock-pages.ts";
export type { StockPagesResult } from "./hooks/use-stock-pages.ts";
export { useLiveHistory } from "./hooks/use-live-history.ts";
export type { LiveHistoryOptions, LiveHistoryResult } from "./hooks/use-live-history.ts";
export { useWatchlist } from "./hooks/use-watchlist.ts";
export type { WatchlistResult } from "./hooks/use-watchlist.ts";
export { useWatchlistStocks } from "./hooks/use-watchlist-stocks.ts";
export type { WatchlistStockRow, WatchlistStocksResult } from "./hooks/use-watchlist-stocks.ts";

export {
  historyQueryOptions,
  stockListQueryOptions,
  stockPagesQueryOptions,
  stockQueryKeys,
  stockQueryOptions,
  stocksBySymbolsQueryOptions,
} from "./rest/stock-queries.ts";
export { buildRestBaseUrl, createRestClient, RestClientError } from "./rest/rest-client.ts";
export type { RestClient, RestClientErrorCode } from "./rest/rest-client.ts";

export { useLanguage, useLocale, useT } from "./hooks/use-t.ts";
export type { LanguageResult } from "./hooks/use-t.ts";
export { localeDirection, parseLocale } from "./i18n/locale.ts";
export type { Locale, LocaleSwitch, TextDirection } from "./i18n/locale.ts";
export type { MessageKey, Translate, TranslationValues } from "./i18n/locales/en/index.ts";
export {
  directionOf,
  formatPrice,
  formatSignedAmount,
  formatSignedChange,
  formatSignedPercent,
} from "./format/money-format.ts";
export type { Direction, FlashDirection } from "./format/money-format.ts";
export { formatMarketDate, formatMarketDateTime, formatMarketTime } from "./format/time-format.ts";
export type { MarketDateOptions, MarketTimeOptions } from "./format/time-format.ts";
export { MARKET_TIME_ZONE_LABEL } from "./format/constants.ts";

export type { AnalyticsAdapter, AnalyticsEvent } from "./analytics/analytics.ts";

export { useChaosControls } from "./hooks/use-chaos-controls.ts";
export type {
  ChaosControlsResult,
  ChaosFailureRateView,
  ChaosToggleView,
} from "./hooks/use-chaos-controls.ts";

export { useConnectionHealth } from "./hooks/use-connection-health.ts";
export type { ConnectionHealth } from "./hooks/use-connection-health.ts";
export { useSearch } from "./hooks/use-search.ts";
export { useTrack } from "./hooks/use-track.ts";
export type { SearchResult } from "./hooks/use-search.ts";

export { useColorScheme } from "./hooks/use-color-scheme.ts";
export type { ColorScheme, ColorSchemeStore } from "./platform/color-scheme.ts";
export { useCompanyProfile } from "./hooks/use-company-profile.ts";
export type { CompanyProfileView } from "./hooks/use-company-profile.ts";

export { useStockStatistics, type StockStatisticsView } from "./hooks/use-stock-statistics.ts";

export { useStockNews, type StockNewsView } from "./hooks/use-stock-news.ts";

export { useStockEarnings, type StockEarningsView } from "./hooks/use-stock-earnings.ts";

export { createI18n } from "./i18n/create-i18n.ts";

export { useFeedSession } from "./hooks/use-feed-session.ts";
