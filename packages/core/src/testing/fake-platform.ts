import type { Quote } from "@mini/contracts";
import { scheduleTimeout } from "../realtime/timers.ts";
import type { AppLifecycle, LifecycleListener, LifecycleState } from "../platform/app-lifecycle.ts";
import type { KeyValueListener, KeyValueStore } from "../platform/key-value-store.ts";
import type { NetworkListener, NetworkState, NetworkStatus } from "../platform/network-status.ts";

export interface FakeNetworkStatus extends NetworkStatus {
  setState(next: NetworkState): void;
}

export interface FakeAppLifecycle extends AppLifecycle {
  setState(next: LifecycleState): void;
}

export function createFakeNetwork(initial: NetworkState = "online"): FakeNetworkStatus {
  let state: NetworkState = initial;
  const listeners = new Set<NetworkListener>();
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setState(next) {
      if (state === next) {
        return;
      }
      state = next;
      for (const listener of Array.from(listeners)) {
        listener(next);
      }
    },
  };
}

export function createFakeLifecycle(initial: LifecycleState = "foreground"): FakeAppLifecycle {
  let state: LifecycleState = initial;
  const listeners = new Set<LifecycleListener>();
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setState(next) {
      if (state === next) {
        return;
      }
      state = next;
      for (const listener of Array.from(listeners)) {
        listener(next);
      }
    },
  };
}

export function createFakeStorage(): KeyValueStore {
  const map = new Map<string, string>();
  const listeners = new Set<KeyValueListener>();
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
      for (const listener of Array.from(listeners)) {
        listener(key);
      }
    },
    removeItem: async (key) => {
      map.delete(key);
      for (const listener of Array.from(listeners)) {
        listener(key);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function makeQuote(
  symbol: string,
  price: string,
  timestamp: number,
  previousClose = "100.00",
): Quote {
  return {
    symbol,
    price,
    change: "0.00",
    changePercent: "0.00",
    previousClose,
    timestamp,
  };
}

export function settle(): Promise<void> {
  return new Promise((resolve) => {
    scheduleTimeout(resolve, 0);
  });
}
