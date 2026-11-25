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

export interface CoreProviderProps {
  gatewayUrl: string;
  storage: KeyValueStore;
  network: NetworkStatus;
  lifecycle: AppLifecycle;
  socketFactory?: SocketFactory | undefined;
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
  socketClient: SocketClient;
  i18n: I18nService;
  analytics: AnalyticsAdapter;
  track: (event: AnalyticsEvent) => void;
}

export function createCoreServices(
  platform: Omit<CoreProviderProps, "children">,
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
    socketClient,
    i18n,
    analytics,
    track: (event) => analytics.track(event),
  };
}

const CoreContext = createContext<CoreContextValue | null>(null);

export function CoreProvider({ children, ...platform }: CoreProviderProps) {
  const [value] = useState<CoreContextValue>(() => createCoreServices(platform));

  useEffect(() => {
    const unsubscribe = attachConnectionAnalytics(value.socketClient, value.analytics);
    value.socketClient.start();
    return () => {
      unsubscribe();
      value.socketClient.stop();
    };
  }, [value]);

  return <CoreContext value={value}>{children}</CoreContext>;
}

export function useCore(): CoreContextValue {
  const value = useContext(CoreContext);
  if (value === null) {
    throw new Error("useCore must be called inside CoreProvider");
  }
  return value;
}
