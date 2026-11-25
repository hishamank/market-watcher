import type { NetworkState, NetworkStatus } from "@mini/core";

function readNetworkState(): NetworkState {
  if (typeof navigator === "undefined" || navigator.onLine) {
    return "online";
  }
  return "offline";
}

export function createOnlineStatus(): NetworkStatus {
  return {
    getState: readNetworkState,
    subscribe(listener) {
      if (typeof window === "undefined") {
        return () => {};
      }
      const onChange = () => listener(readNetworkState());
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
  };
}
