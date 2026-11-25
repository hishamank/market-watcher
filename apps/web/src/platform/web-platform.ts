import type { AppLifecycle, KeyValueStore, NetworkStatus } from "@mini/core";
import { createLocalStorageStore } from "./local-storage-store.ts";
import { createOnlineStatus } from "./online-status.ts";
import { createPageVisibility } from "./page-visibility.ts";

export interface WebPlatform {
  readonly storage: KeyValueStore;
  readonly network: NetworkStatus;
  readonly lifecycle: AppLifecycle;
}

export function createWebPlatform(): WebPlatform {
  return {
    storage: createLocalStorageStore(),
    network: createOnlineStatus(),
    lifecycle: createPageVisibility(),
  };
}
