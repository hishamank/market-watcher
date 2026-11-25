import type { KeyValueStore } from "@mini/core";

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function createLocalStorageStore(): KeyValueStore {
  const knownKeys = new Set<string>();
  return {
    getItem: async (key) => {
      knownKeys.add(key);
      try {
        return browserStorage()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem: async (key, value) => {
      knownKeys.add(key);
      try {
        browserStorage()?.setItem(key, value);
      } catch {
        return;
      }
    },
    removeItem: async (key) => {
      knownKeys.add(key);
      try {
        browserStorage()?.removeItem(key);
      } catch {
        return;
      }
    },
    subscribe(listener) {
      if (typeof window === "undefined") {
        return () => {};
      }
      const onStorage = (event: StorageEvent) => {
        if (event.storageArea !== browserStorage()) return;
        if (event.key !== null) {
          listener(event.key);
          return;
        }
        for (const key of knownKeys) listener(key);
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
  };
}
