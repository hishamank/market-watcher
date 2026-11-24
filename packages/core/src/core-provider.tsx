import { createContext, useContext, useState, type ReactNode } from "react";
import type { AppLifecycle } from "./platform/app-lifecycle.ts";
import type { KeyValueStore } from "./platform/key-value-store.ts";
import type { NetworkStatus } from "./platform/network-status.ts";

export interface CoreProviderProps {
  gatewayUrl: string;
  storage: KeyValueStore;
  network: NetworkStatus;
  lifecycle: AppLifecycle;
  children: ReactNode;
}

export interface CoreContextValue {
  gatewayUrl: string;
  storage: KeyValueStore;
  network: NetworkStatus;
  lifecycle: AppLifecycle;
}

const CoreContext = createContext<CoreContextValue | null>(null);

export function CoreProvider({ children, ...platform }: CoreProviderProps) {
  const [value] = useState<CoreContextValue>(() => platform);
  return <CoreContext value={value}>{children}</CoreContext>;
}

export function useCore(): CoreContextValue {
  const value = useContext(CoreContext);
  if (value === null) {
    throw new Error("useCore must be called inside CoreProvider");
  }
  return value;
}
