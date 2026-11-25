import type { AppLifecycle, KeyValueStore } from "@mini/core";
import { createLocalStorageStore } from "./local-storage-store.ts";
import { type ControllableNetworkStatus, createOnlineStatus } from "./online-status.ts";
import { createPageVisibility } from "./page-visibility.ts";

export interface WebPlatform {
  readonly storage: KeyValueStore;
  readonly network: ControllableNetworkStatus;
  readonly lifecycle: AppLifecycle;
}

export function createWebPlatform(): WebPlatform {
  return {
    storage: createLocalStorageStore(),
    network: createOnlineStatus(),
    lifecycle: createPageVisibility(),
  };
}
