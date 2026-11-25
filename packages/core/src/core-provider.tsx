import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
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
  children: ReactNode;
}

export interface CoreContextValue {
  gatewayUrl: string;
  storage: KeyValueStore;
  network: NetworkStatus;
  lifecycle: AppLifecycle;
  quoteStore: QuoteStore;
  socketClient: SocketClient;
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
  return {
    gatewayUrl: platform.gatewayUrl,
    storage: platform.storage,
    network: platform.network,
    lifecycle: platform.lifecycle,
    quoteStore,
    socketClient,
  };
}

const CoreContext = createContext<CoreContextValue | null>(null);

export function CoreProvider({ children, ...platform }: CoreProviderProps) {
  const [value] = useState<CoreContextValue>(() => createCoreServices(platform));

  useEffect(() => {
    value.socketClient.start();
    return () => {
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
