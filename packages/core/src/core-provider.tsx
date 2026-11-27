"use client";

import type { FeedMode } from "@mini/contracts";

import { type QueryCache, type QueryClient, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  attachConnectionAnalytics,
  createNoopAnalytics,
  type AnalyticsAdapter,
  type AnalyticsEvent,
} from "./analytics/analytics.ts";
import { createI18n, type I18nService } from "./i18n/create-i18n.ts";
import type { LocaleSwitch } from "./i18n/locale.ts";
import type { ColorSchemeStore } from "./platform/color-scheme.ts";
import type { AppLifecycle } from "./platform/app-lifecycle.ts";
import type { KeyValueStore } from "./platform/key-value-store.ts";
import type { NetworkStatus } from "./platform/network-status.ts";
import {
  createConnectionHealth,
  type ConnectionHealthRecorder,
} from "./realtime/connection-health.ts";
import { watchCachedFeed } from "./realtime/feed-cache.ts";
import { createFeedSession, type FeedSession } from "./realtime/feed-session.ts";
import { createQuoteStore, type QuoteStore } from "./realtime/quote-store.ts";
import { createSocketClient } from "./realtime/socket-client.ts";
import type { SocketClient } from "./realtime/socket-types.ts";
import { buildSocketUrl, createDefaultSocket, type SocketFactory } from "./realtime/transport.ts";
import { refetchHistoryOnReconnect } from "./rest/history-refetch.ts";
import { syncQuotesFromQueryCache } from "./rest/quote-cache-sync.ts";
import { createRestClient, type HttpFetch, type RestClient } from "./rest/rest-client.ts";
import { createEarningsFetcher, type EarningsFetcher } from "./rest/earnings-query.ts";
import { createNewsFetcher, type NewsFetcher } from "./rest/news-query.ts";
import { createStatisticsFetcher, type StatisticsFetcher } from "./rest/statistics-query.ts";
import { createProfileFetcher, type ProfileFetcher } from "./rest/profile-query.ts";
import { createSearchFetcher, type SearchFetcher } from "./rest/search-query.ts";
import { createWatchlistStore, type WatchlistStore } from "./watchlist/watchlist-store.ts";

export interface CoreProviderProps {
  gatewayUrl: string;
  initialFeedMode?: FeedMode | null;
  storage: KeyValueStore;
  network: NetworkStatus;
  lifecycle: AppLifecycle;
  socketFactory?: SocketFactory | undefined;
  fetch?: HttpFetch | undefined;
  locale?: string | undefined;
  switchLocale?: LocaleSwitch | undefined;
  analytics?: AnalyticsAdapter | undefined;
  colorScheme?: ColorSchemeStore | undefined;
  children: ReactNode;
}

export interface CoreContextValue {
  feedSession: FeedSession;
  gatewayUrl: string;
  storage: KeyValueStore;
  network: NetworkStatus;
  lifecycle: AppLifecycle;
  quoteStore: QuoteStore;
  queryCache: QueryCache | undefined;
  socketClient: SocketClient;
  health: ConnectionHealthRecorder;
  restClient: RestClient;
  searchStocks: SearchFetcher;
  fetchProfile: ProfileFetcher;
  fetchStatistics: StatisticsFetcher;
  fetchNews: NewsFetcher;
  fetchEarnings: EarningsFetcher;
  watchlistStore: WatchlistStore;
  i18n: I18nService;
  switchLocale: LocaleSwitch;
  analytics: AnalyticsAdapter;
  colorScheme: ColorSchemeStore | undefined;
  track: (event: AnalyticsEvent) => void;
}

export function createCoreServices(
  platform: Omit<CoreProviderProps, "children">,
  queryClient?: QueryClient,
): CoreContextValue {
  const feedSession = createFeedSession(platform.initialFeedMode);
  const restOptions = {
    gatewayUrl: platform.gatewayUrl,
    fetch: platform.fetch,
    session: feedSession,
  };
  const quoteStore = createQuoteStore();
  const health = createConnectionHealth();
  const socketClient = createSocketClient({
    url: buildSocketUrl(platform.gatewayUrl),
    quoteStore,
    session: feedSession,
    health,
    network: platform.network,
    lifecycle: platform.lifecycle,
    socketFactory: platform.socketFactory ?? createDefaultSocket,
  });
  socketClient.subscribeReconnect(health.reconnect);
  const i18n = createI18n(platform.locale);
  const analytics = platform.analytics ?? createNoopAnalytics();
  return {
    feedSession,
    gatewayUrl: platform.gatewayUrl,
    storage: platform.storage,
    network: platform.network,
    lifecycle: platform.lifecycle,
    quoteStore,
    queryCache: queryClient?.getQueryCache(),
    socketClient,
    health,
    restClient: createRestClient(restOptions),
    fetchEarnings: createEarningsFetcher(restOptions),
    fetchNews: createNewsFetcher(restOptions),
    fetchStatistics: createStatisticsFetcher(restOptions),
    fetchProfile: createProfileFetcher(restOptions),
    searchStocks: createSearchFetcher(restOptions),
    watchlistStore: createWatchlistStore(platform.storage),
    i18n,
    switchLocale: platform.switchLocale ?? ((_next, apply) => apply()),
    analytics,
    colorScheme: platform.colorScheme,
    track: (event) => analytics.track(event),
  };
}

const CoreContext = createContext<CoreContextValue | null>(null);

export function CoreProvider({ children, ...platform }: CoreProviderProps) {
  const queryClient = useQueryClient();
  const [value] = useState<CoreContextValue>(() => createCoreServices(platform, queryClient));

  useEffect(() => {
    const stopFeedCache = watchCachedFeed(queryClient.getQueryCache(), value.feedSession);
    const stopFeed = value.feedSession.subscribe(() => {
      void queryClient.cancelQueries();
    });
    const unsubscribe = attachConnectionAnalytics(value.socketClient, value.analytics);
    value.socketClient.start();
    return () => {
      unsubscribe();
      stopFeedCache();
      stopFeed();
      value.socketClient.stop();
    };
  }, [value, queryClient]);

  useEffect(() => {
    if (value.queryCache === undefined) return undefined;
    return syncQuotesFromQueryCache(
      value.queryCache,
      value.quoteStore,
      () => !value.feedSession.isBlocked(),
    );
  }, [value]);

  useEffect(() => refetchHistoryOnReconnect(value.socketClient, queryClient), [value, queryClient]);

  return <CoreContext value={value}>{children}</CoreContext>;
}

export function useCore(): CoreContextValue {
  const value = useContext(CoreContext);
  if (value === null) {
    throw new Error("useCore must be called inside CoreProvider");
  }
  return value;
}
