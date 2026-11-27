import {
  type AnalyticsAdapter,
  createConsoleAnalytics,
  createNoopAnalytics,
} from "@mini/analytics";
import type { AppLifecycle, KeyValueStore, NetworkStatus } from "@mini/core";
import { Platform } from "react-native";
import { createAppStateLifecycle } from "./app-state-lifecycle.ts";
import { createAsyncStorageStore } from "./async-storage-store.ts";
import { createExpoNetworkStatus } from "./expo-network-status.ts";

export interface NativePlatform {
  readonly analytics: AnalyticsAdapter;
  readonly storage: KeyValueStore;
  readonly network: NetworkStatus;
  readonly lifecycle: AppLifecycle;
}

export function createNativePlatform(): NativePlatform {
  return {
    analytics: __DEV__
      ? createConsoleAnalytics({
          platform: Platform.OS === "ios" ? "ios" : "android",
          log: (label, payload) => console.info(label, payload),
        })
      : createNoopAnalytics(),
    storage: createAsyncStorageStore(),
    network: createExpoNetworkStatus(),
    lifecycle: createAppStateLifecycle(),
  };
}
