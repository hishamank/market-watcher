import type { AppLifecycle, KeyValueStore, NetworkStatus } from "@mini/core";
import { createAppStateLifecycle } from "./app-state-lifecycle.ts";
import { createAsyncStorageStore } from "./async-storage-store.ts";
import { createExpoNetworkStatus } from "./expo-network-status.ts";

export interface NativePlatform {
  readonly storage: KeyValueStore;
  readonly network: NetworkStatus;
  readonly lifecycle: AppLifecycle;
}

export function createNativePlatform(): NativePlatform {
  return {
    storage: createAsyncStorageStore(),
    network: createExpoNetworkStatus(),
    lifecycle: createAppStateLifecycle(),
  };
}
