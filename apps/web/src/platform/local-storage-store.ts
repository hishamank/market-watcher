import type { KeyValueStore } from "@mini/core";

function browserStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function createLocalStorageStore(): KeyValueStore {
  return {
    getItem: async (key) => browserStorage()?.getItem(key) ?? null,
    setItem: async (key, value) => {
      browserStorage()?.setItem(key, value);
    },
    removeItem: async (key) => {
      browserStorage()?.removeItem(key);
    },
    subscribe(listener) {
      if (typeof window === "undefined") {
        return () => {};
      }
      const onStorage = (event: StorageEvent) => {
        if (event.key !== null && event.storageArea === browserStorage()) {
          listener(event.key);
        }
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
  };
}
