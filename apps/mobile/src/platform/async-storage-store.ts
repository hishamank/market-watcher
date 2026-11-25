import type { KeyValueStore } from "@mini/core";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function createAsyncStorageStore(): KeyValueStore {
  return {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
    subscribe: () => () => {},
  };
}
