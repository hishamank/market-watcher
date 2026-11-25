"use client";

import { type QueryCache, type QueryClient, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  attachConnectionAnalytics,
  createNoopAnalytics,
  type AnalyticsAdapter,
  type AnalyticsEvent,
} from "./analytics/analytics.ts";
import { createI18n, type I18nService } from "./i18n/create-i18n.ts";
import type { AppLifecycle } from "./platform/app-lifecycle.ts";
import type { KeyValueStore } from "./platform/key-value-store.ts";
import type { NetworkStatus } from "./platform/network-status.ts";
import { createQuoteStore, type QuoteStore } from "./realtime/quote-store.ts";
import { createSocketClient } from "./realtime/socket-client.ts";
import type { SocketClient } from "./realtime/socket-types.ts";
import { buildSocketUrl, createDefaultSocket, type SocketFactory } from "./realtime/transport.ts";
import { refetchHistoryOnReconnect } from "./rest/history-refetch.ts";
import { syncQuotesFromQueryCache } from "./rest/quote-cache-sync.ts";
import { createRestClient, type HttpFetch, type RestClient } from "./rest/rest-client.ts";
import { createWatchlistStore, type WatchlistStore } from "./watchlist/watchlist-store.ts";

export interface CoreProviderProps {
  gatewayUrl: string;
  storage: KeyValueStore;
  network: NetworkStatus;
  lifecycle: AppLifecycle;
  socketFactory?: SocketFactory | undefined;
  fetch?: HttpFetch | undefined;
  locale?: string | undefined;
  analytics?: AnalyticsAdapter | undefined;
  children: ReactNode;
}

export interface CoreContextValue {
  gatewayUrl: string;
  storage: KeyValueStore;
  network: NetworkStatus;
  lifecycle: AppLifecycle;
  quoteStore: QuoteStore;
  queryCache: QueryCache | undefined;
  socketClient: SocketClient;
  restClient: RestClient;
  watchlistStore: WatchlistStore;
  i18n: I18nService;
  analytics: AnalyticsAdapter;
  track: (event: AnalyticsEvent) => void;
}

export function createCoreServices(
  platform: Omit<CoreProviderProps, "children">,
  queryClient?: QueryClient,
): CoreContextValue {
  const quoteStore = createQuoteStore();
  const socketClient = createSocketClient({
    url: buildSocketUrl(platform.gatewayUrl),
    quoteStore,
    network: platform.network,
    lifecycle: platform.lifecycle,
    socketFactory: platform.socketFactory ?? createDefaultSocket,
  });
  const i18n = createI18n(platform.locale);
  const analytics = platform.analytics ?? createNoopAnalytics();
  return {
    gatewayUrl: platform.gatewayUrl,
    storage: platform.storage,
    network: platform.network,
    lifecycle: platform.lifecycle,
    quoteStore,
    queryCache: queryClient?.getQueryCache(),
    socketClient,
    restClient: createRestClient({ gatewayUrl: platform.gatewayUrl, fetch: platform.fetch }),
    watchlistStore: createWatchlistStore(platform.storage),
    i18n,
    analytics,
    track: (event) => analytics.track(event),
  };
}

const CoreContext = createContext<CoreContextValue | null>(null);

export function CoreProvider({ children, ...platform }: CoreProviderProps) {
  const queryClient = useQueryClient();
  const [value] = useState<CoreContextValue>(() => createCoreServices(platform, queryClient));

  useEffect(() => {
    const unsubscribe = attachConnectionAnalytics(value.socketClient, value.analytics);
    value.socketClient.start();
    return () => {
      unsubscribe();
      value.socketClient.stop();
    };
  }, [value]);

  useEffect(() => {
    if (value.queryCache === undefined) return undefined;
    return syncQuotesFromQueryCache(value.queryCache, value.quoteStore);
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
