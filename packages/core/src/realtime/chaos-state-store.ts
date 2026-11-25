import type { ChaosFailureRateState, ChaosStateMessage, ChaosToggleState } from "@mini/contracts";

export interface ChaosSnapshot {
  readonly serverTime: number;
  readonly receivedAt: number;
  readonly tickSpike: ChaosToggleState;
  readonly historyLatency: ChaosToggleState;
  readonly historyFailureRate: ChaosFailureRateState;
  readonly forceClosed: ChaosToggleState;
}

export interface ChaosStateStore {
  get(): ChaosSnapshot | null;
  update(message: ChaosStateMessage): void;
  subscribe(listener: () => void): () => void;
}

export function createChaosStateStore(now: () => number = () => Date.now()): ChaosStateStore {
  let current: ChaosSnapshot | null = null;
  const listeners = new Set<() => void>();

  return {
    get: () => current,
    update(message) {
      current = {
        serverTime: message.serverTime,
        receivedAt: now(),
        tickSpike: message.tickSpike,
        historyLatency: message.historyLatency,
        historyFailureRate: message.historyFailureRate,
        forceClosed: message.forceClosed,
      };
      for (const listener of Array.from(listeners)) {
        listener();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
