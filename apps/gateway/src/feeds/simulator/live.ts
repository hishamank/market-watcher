import type { Quote } from "@mini/contracts";
import type { LiveFeed } from "../types.ts";
import { quoteAt } from "./price.ts";

export interface LiveControl {
  getTickRateMultiplier(): number;
  isForceClosed(): boolean;
}

interface SimulatorLiveDependencies {
  seed: string;
  clock: () => number;
  baseTicksPerSecond: number;
  basePriceUnits: (symbol: string) => bigint | undefined;
  control: LiveControl;
  random: () => number;
}

export interface SimulatorLiveHandle {
  readonly live: LiveFeed;
  refreshSchedule(): void;
  stop(): void;
}

const MIN_INTERVAL_MS = 10;

export function createSimulatorLiveFeed(deps: SimulatorLiveDependencies): SimulatorLiveHandle {
  const timers = new Map<string, ReturnType<typeof setTimeout> | null>();
  const listeners = new Set<(quote: Quote) => void>();

  const nextDelayMs = (): number => {
    const rate = deps.baseTicksPerSecond * Math.max(deps.control.getTickRateMultiplier(), 0.01);
    const meanMs = 1000 / rate;
    const jitter = 0.5 + deps.random();
    return Math.max(MIN_INTERVAL_MS, Math.round(meanMs * jitter));
  };

  const clearTimer = (symbol: string): void => {
    const existing = timers.get(symbol);
    if (existing) {
      clearTimeout(existing);
    }
  };

  const scheduleSymbol = (symbol: string): void => {
    clearTimer(symbol);
    if (!timers.has(symbol) || deps.control.isForceClosed()) {
      if (timers.has(symbol)) timers.set(symbol, null);
      return;
    }
    const timer = setTimeout(() => {
      if (!timers.has(symbol) || deps.control.isForceClosed()) return;
      const quote = quoteAt(deps.seed, symbol, deps.clock(), deps.basePriceUnits(symbol));
      for (const listener of listeners) {
        listener(quote);
      }
      scheduleSymbol(symbol);
    }, nextDelayMs());
    timers.set(symbol, timer);
  };

  const live: LiveFeed = {
    subscribe: (symbols) => {
      for (const symbol of symbols) {
        if (timers.has(symbol)) continue;
        timers.set(symbol, null);
        scheduleSymbol(symbol);
      }
    },
    unsubscribe: (symbols) => {
      for (const symbol of symbols) {
        clearTimer(symbol);
        timers.delete(symbol);
      }
    },
    snapshot: async (symbols) => {
      const now = deps.clock();
      return symbols.map((symbol) => quoteAt(deps.seed, symbol, now, deps.basePriceUnits(symbol)));
    },
    onQuote: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  const refreshSchedule = (): void => {
    for (const symbol of timers.keys()) {
      scheduleSymbol(symbol);
    }
  };

  const stop = (): void => {
    for (const symbol of timers.keys()) {
      clearTimer(symbol);
    }
    timers.clear();
  };

  return { live, refreshSchedule, stop };
}
