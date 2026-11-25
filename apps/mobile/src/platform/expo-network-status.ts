import type { NetworkListener, NetworkState, NetworkStatus } from "@mini/core";
import {
  addNetworkStateListener,
  getNetworkStateAsync,
  type NetworkState as DeviceNetworkState,
} from "expo-network";

function toNetworkState(device: Pick<DeviceNetworkState, "isConnected">): NetworkState {
  return device.isConnected === false ? "offline" : "online";
}

export function createExpoNetworkStatus(): NetworkStatus {
  const listeners = new Set<NetworkListener>();
  let state: NetworkState = "online";
  let stop: (() => void) | null = null;

  const update = (device: Pick<DeviceNetworkState, "isConnected">): void => {
    const next = toNetworkState(device);
    if (next === state) return;
    state = next;
    for (const listener of Array.from(listeners)) listener(next);
  };

  const start = (): void => {
    let initialReadCurrent = true;
    const subscription = addNetworkStateListener((device) => {
      initialReadCurrent = false;
      update(device);
    });
    stop = () => {
      initialReadCurrent = false;
      subscription.remove();
    };
    getNetworkStateAsync().then(
      (device) => {
        if (initialReadCurrent) update(device);
      },
      () => {},
    );
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      if (stop === null) start();
      return () => {
        listeners.delete(listener);
        if (listeners.size > 0 || stop === null) return;
        stop();
        stop = null;
      };
    },
  };
}
