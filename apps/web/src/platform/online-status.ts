import type { NetworkListener, NetworkState, NetworkStatus } from "@mini/core";

export interface ControllableNetworkStatus extends NetworkStatus {
  isForcedOffline(): boolean;
  setForcedOffline(offline: boolean): void;
  subscribeForcedOffline(listener: () => void): () => void;
}

function readBrowserState(): NetworkState {
  if (typeof navigator === "undefined" || navigator.onLine) {
    return "online";
  }
  return "offline";
}

export function createOnlineStatus(): ControllableNetworkStatus {
  let forcedOffline = false;
  const networkListeners = new Set<NetworkListener>();
  const forcedListeners = new Set<() => void>();

  const getState = (): NetworkState => (forcedOffline ? "offline" : readBrowserState());

  const notifyNetwork = (): void => {
    const state = getState();
    for (const listener of Array.from(networkListeners)) {
      listener(state);
    }
  };

  return {
    getState,
    subscribe(listener) {
      networkListeners.add(listener);
      if (typeof window === "undefined") {
        return () => {
          networkListeners.delete(listener);
        };
      }
      const onChange = () => listener(getState());
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        networkListeners.delete(listener);
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
    isForcedOffline: () => forcedOffline,
    setForcedOffline(offline) {
      if (forcedOffline === offline) {
        return;
      }
      forcedOffline = offline;
      for (const listener of Array.from(forcedListeners)) {
        listener();
      }
      notifyNetwork();
    },
    subscribeForcedOffline(listener) {
      forcedListeners.add(listener);
      return () => {
        forcedListeners.delete(listener);
      };
    },
  };
}
