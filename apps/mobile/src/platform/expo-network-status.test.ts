import { beforeEach, describe, expect, it, vi } from "vitest";
import { createExpoNetworkStatus } from "./expo-network-status.ts";

type DeviceState = { isConnected: boolean };

const device = vi.hoisted(() => ({
  listeners: [] as Array<(state: DeviceState) => void>,
  reads: [] as Array<(state: DeviceState) => void>,
}));

vi.mock("expo-network", () => ({
  addNetworkStateListener(listener: (state: DeviceState) => void) {
    device.listeners.push(listener);
    return {
      remove: () => {
        device.listeners = device.listeners.filter((entry) => entry !== listener);
      },
    };
  },
  getNetworkStateAsync: () =>
    new Promise<DeviceState>((resolve) => {
      device.reads.push(resolve);
    }),
}));

function emit(state: DeviceState): void {
  for (const listener of device.listeners) listener(state);
}

async function resolveRead(index: number, state: DeviceState): Promise<void> {
  device.reads[index]?.(state);
  await Promise.resolve();
  await Promise.resolve();
}

describe("expo network status initial read", () => {
  beforeEach(() => {
    device.listeners = [];
    device.reads = [];
  });

  it("ignores an initial read that resolves after a newer event", async () => {
    const network = createExpoNetworkStatus();
    const seen: string[] = [];
    network.subscribe((state) => seen.push(state));

    emit({ isConnected: true });
    await resolveRead(0, { isConnected: false });

    expect(network.getState()).toBe("online");
    expect(seen).toEqual([]);
  });

  it("applies the initial read when no event came first", async () => {
    const network = createExpoNetworkStatus();
    network.subscribe(() => {});

    await resolveRead(0, { isConnected: false });

    expect(network.getState()).toBe("offline");
  });

  it("ignores a read from an earlier subscription", async () => {
    const network = createExpoNetworkStatus();
    const unsubscribe = network.subscribe(() => {});
    unsubscribe();
    network.subscribe(() => {});

    await resolveRead(0, { isConnected: false });

    expect(network.getState()).toBe("online");
  });
});
