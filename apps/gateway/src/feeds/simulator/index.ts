import type { Quote } from "@mini/contracts";
import type { Feed } from "../types.ts";
import { createSimulatorCalendar } from "./calendar.ts";
import { createSimulatorCatalogue } from "./catalogue.ts";
import { createSimulatorHistorySource, type SimulatorFailureRate } from "./history.ts";
import { createSimulatorLiveFeed } from "./live.ts";
import { displayPriceAt } from "./price.ts";
import { quoteAt } from "./quote.ts";

export type { SimulatorFailureRate } from "./history.ts";
export { DAY_MS, displayPriceAt, priceUnitsAt, startOfUtcDay } from "./price.ts";
export { quoteAt } from "./quote.ts";

export const DEFAULT_SIMULATOR_SEED = "demo-v1";
export const DEFAULT_BASE_TICKS_PER_SECOND = 3;

export interface SimulatorChaosSettings {
  tickRateMultiplier: number;
  historyLatencyMs: number;
  historyFailureRate: SimulatorFailureRate;
  forceClosed: boolean;
}

export interface SimulatorOptions {
  seed?: string;
  clock?: () => number;
  baseTicksPerSecond?: number;
  random?: () => number;
  initialSettings?: Partial<SimulatorChaosSettings>;
}

export interface SimulatorFeed extends Feed {
  readonly seed: string;
  getSettings(): Readonly<SimulatorChaosSettings>;
  updateSettings(patch: Partial<SimulatorChaosSettings>): void;
  resetSettings(): void;
  priceAt(symbol: string, timeMs: number): string;
  quoteAt(symbol: string, timeMs: number): Quote;
  close(): void;
}

const DEFAULT_SETTINGS: Readonly<SimulatorChaosSettings> = {
  tickRateMultiplier: 1,
  historyLatencyMs: 0,
  historyFailureRate: 0,
  forceClosed: false,
};

export function createSimulatorFeed(options: SimulatorOptions = {}): SimulatorFeed {
  const seed = options.seed ?? DEFAULT_SIMULATOR_SEED;
  const clock = options.clock ?? (() => Date.now());
  const baseTicksPerSecond = options.baseTicksPerSecond ?? DEFAULT_BASE_TICKS_PER_SECOND;
  const random = options.random ?? (() => Math.random());

  const settings: SimulatorChaosSettings = {
    ...DEFAULT_SETTINGS,
    ...options.initialSettings,
  };

  const catalogueHandle = createSimulatorCatalogue();
  const calendarHandle = createSimulatorCalendar(settings.forceClosed);

  const history = createSimulatorHistorySource({
    seed,
    calendar: calendarHandle.calendar,
    basePriceUnits: catalogueHandle.basePriceUnits,
    control: {
      getLatencyMs: () => settings.historyLatencyMs,
      getFailureRate: () => settings.historyFailureRate,
    },
    random,
  });

  const liveHandle = createSimulatorLiveFeed({
    seed,
    clock,
    baseTicksPerSecond,
    basePriceUnits: catalogueHandle.basePriceUnits,
    control: {
      getTickRateMultiplier: () => settings.tickRateMultiplier,
      isForceClosed: () => calendarHandle.isForceClosed(),
    },
    random,
  });

  const updateSettings = (patch: Partial<SimulatorChaosSettings>): void => {
    let reschedule = false;
    if (patch.tickRateMultiplier !== undefined) {
      settings.tickRateMultiplier = patch.tickRateMultiplier;
      reschedule = true;
    }
    if (patch.historyLatencyMs !== undefined) {
      settings.historyLatencyMs = patch.historyLatencyMs;
    }
    if (patch.historyFailureRate !== undefined) {
      settings.historyFailureRate = patch.historyFailureRate;
    }
    if (patch.forceClosed !== undefined) {
      settings.forceClosed = patch.forceClosed;
      calendarHandle.setForceClosed(patch.forceClosed);
      reschedule = true;
    }
    if (reschedule) {
      liveHandle.refreshSchedule();
    }
  };

  return {
    seed,
    live: liveHandle.live,
    history,
    catalogue: catalogueHandle.catalogue,
    calendar: calendarHandle.calendar,
    getSettings: () => ({ ...settings }),
    updateSettings,
    resetSettings: () => updateSettings(DEFAULT_SETTINGS),
    priceAt: (symbol, timeMs) =>
      displayPriceAt(seed, symbol, timeMs, catalogueHandle.basePriceUnits(symbol)),
    quoteAt: (symbol, timeMs) =>
      quoteAt(seed, symbol, timeMs, catalogueHandle.basePriceUnits(symbol)),
    close: () => liveHandle.stop(),
  };
}
