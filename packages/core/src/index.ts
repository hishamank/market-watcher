export { CoreProvider, createCoreServices, useCore } from "./core-provider.tsx";
export type { CoreContextValue, CoreProviderProps } from "./core-provider.tsx";
export { useConnectionStatus } from "./hooks/use-connection-status.ts";
export type { ConnectionStatusResult } from "./hooks/use-connection-status.ts";
export { useQuote } from "./hooks/use-quote.ts";
export type { AppLifecycle, LifecycleListener, LifecycleState } from "./platform/app-lifecycle.ts";
export type { KeyValueListener, KeyValueStore } from "./platform/key-value-store.ts";
export type { NetworkListener, NetworkState, NetworkStatus } from "./platform/network-status.ts";
export {
  BACKOFF_BASE_MS,
  BACKOFF_MAX_MS,
  computeBackoffCeiling,
  computeBackoffDelay,
} from "./realtime/backoff.ts";
export { createQuoteStore } from "./realtime/quote-store.ts";
export type { QuoteListener, QuoteStore } from "./realtime/quote-store.ts";
export { createSocketClient } from "./realtime/socket-client.ts";
export type {
  ConnectionStatus,
  ReconnectListener,
  SocketClient,
  SocketClientOptions,
  StatusListener,
} from "./realtime/socket-types.ts";
export { UNSUBSCRIBE_DELAY_MS } from "./realtime/subscription-manager.ts";
export { buildSocketUrl, createDefaultSocket, SOCKET_READY_STATE } from "./realtime/transport.ts";
export type {
  RealtimeSocket,
  SocketCloseEvent,
  SocketFactory,
  SocketMessageEvent,
} from "./realtime/transport.ts";
export { mergeLiveQuote, BAR_SIZE_MS } from "./history/merge-live-quote.ts";
export type { LiveHistory } from "./history/merge-live-quote.ts";
export { useHistory, useStock, useStockList, useStocks } from "./hooks/use-stocks.ts";
export { useWatchlist } from "./hooks/use-watchlist.ts";
export type { WatchlistResult } from "./hooks/use-watchlist.ts";
export { refetchHistoryOnReconnect } from "./rest/history-refetch.ts";
export {
  buildRestBaseUrl,
  createDefaultFetch,
  createRestClient,
  RestClientError,
} from "./rest/rest-client.ts";
export type {
  AbortSignalLike,
  HttpFetch,
  HttpRequestInit,
  HttpResponse,
  RestClient,
  RestClientErrorCode,
  RestClientOptions,
} from "./rest/rest-client.ts";
export {
  HISTORY_STALE_MS,
  historyQueryOptions,
  normaliseSymbols,
  shouldRetryRestError,
  STOCK_STALE_MS,
  stockListQueryOptions,
  stockQueryKeys,
  stockQueryOptions,
  stocksBySymbolsQueryOptions,
} from "./rest/stock-queries.ts";
export {
  createWatchlistStore,
  EMPTY_WATCHLIST,
  parseWatchlist,
  WATCHLIST_STORAGE_KEY,
} from "./watchlist/watchlist-store.ts";
export type {
  WatchlistListener,
  WatchlistSnapshot,
  WatchlistStore,
} from "./watchlist/watchlist-store.ts";

export { createNoopAnalytics, track } from "./analytics/analytics.ts";
export type { AnalyticsAdapter, AnalyticsEvent } from "./analytics/analytics.ts";
export {
  DEFAULT_LOCALE,
  MARKET_TIME_ZONE,
  MARKET_TIME_ZONE_LABEL,
  MINUS_SIGN,
} from "./format/constants.ts";
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
export { useMarketStatus } from "./hooks/use-market-status.ts";
export { useLocale, useT } from "./hooks/use-t.ts";
export { createI18n } from "./i18n/create-i18n.ts";
export type { I18nService } from "./i18n/create-i18n.ts";
export type { MessageKey, Translate, TranslationValues } from "./i18n/locales/en/index.ts";
export type { MarketStatusListener } from "./realtime/socket-types.ts";

export { useChaosControls } from "./hooks/use-chaos-controls.ts";
export type {
  ChaosControlsResult,
  ChaosFailureRateView,
  ChaosToggleView,
} from "./hooks/use-chaos-controls.ts";
export type { ChaosSnapshot } from "./realtime/chaos-state-store.ts";
export type { ChaosStateListener } from "./realtime/socket-types.ts";
