import { BAR_SIZE_BY_RANGE, type Bar, type BarSize, type Range } from "@mini/contracts";
import type { HistoryRequest, HistorySeries, HistorySource, MarketCalendar } from "../types.ts";
import { DAY_MS, displayPriceAt, startOfUtcDay, startOfUtcWeek, WEEK_MS } from "./price.ts";

export type SimulatorFailureRate = 0 | 0.5 | 1;

export interface HistoryControl {
  getLatencyMs(): number;
  getFailureRate(): SimulatorFailureRate;
}

interface SimulatorHistoryDependencies {
  seed: string;
  calendar: MarketCalendar;
  basePriceUnits: (symbol: string) => bigint | undefined;
  control: HistoryControl;
  random: () => number;
}

const BAR_DURATION_MS: Record<BarSize, number> = {
  "5m": 5 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "1d": DAY_MS,
  "1w": WEEK_MS,
};

function floorBucket(timeMs: number, barMs: number): number {
  return Math.floor(timeMs / barMs) * barMs;
}

function rangeBounds(range: Range, now: number, barMs: number): { start: number; end: number } {
  if (range === "1D") {
    return { start: startOfUtcDay(now), end: floorBucket(now, barMs) };
  }
  if (range === "1W") {
    const end = floorBucket(now, barMs);
    return { start: end - 7 * DAY_MS, end };
  }
  if (range === "1M") {
    const end = floorBucket(now, barMs);
    return { start: end - 30 * DAY_MS, end };
  }
  if (range === "3M") {
    const end = startOfUtcDay(now);
    return { start: end - 89 * DAY_MS, end };
  }
  if (range === "1Y") {
    const end = startOfUtcDay(now);
    return { start: end - 364 * DAY_MS, end };
  }
  const end = startOfUtcWeek(now);
  return { start: end - 259 * WEEK_MS, end };
}

function abortError(signal: AbortSignal): Error {
  if (signal.reason instanceof Error) return signal.reason;
  return new Error("History request aborted");
}

function waitWithSignal(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError(signal));
  if (delayMs <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(abortError(signal!));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function shouldFail(rate: SimulatorFailureRate, random: () => number): boolean {
  if (rate === 0) return false;
  if (rate === 1) return true;
  return random() < rate;
}

function buildBars(
  seed: string,
  symbol: string,
  range: Range,
  now: number,
  basePrice: bigint | undefined,
): Bar[] {
  const barMs = BAR_DURATION_MS[BAR_SIZE_BY_RANGE[range]];
  const { start, end } = rangeBounds(range, now, barMs);
  const bars: Bar[] = [];
  let time = start;
  while (time < 0) time += barMs;
  for (; time <= end; time += barMs) {
    bars.push({ time, close: displayPriceAt(seed, symbol, time, basePrice) });
  }
  if (now > end) {
    bars.push({ time: now, close: displayPriceAt(seed, symbol, now, basePrice) });
  }
  return bars;
}

export function createSimulatorHistorySource(deps: SimulatorHistoryDependencies): HistorySource {
  return {
    async history(request: HistoryRequest): Promise<HistorySeries> {
      const now = Math.floor(request.now);
      await waitWithSignal(deps.control.getLatencyMs(), request.signal);
      if (request.signal?.aborted) {
        throw abortError(request.signal);
      }
      if (shouldFail(deps.control.getFailureRate(), deps.random)) {
        throw new Error(`Simulated history failure for ${request.symbol}`);
      }
      const basePrice = deps.basePriceUnits(request.symbol);
      const bars = buildBars(deps.seed, request.symbol, request.range, now, basePrice);
      const previousClose = displayPriceAt(
        deps.seed,
        request.symbol,
        startOfUtcDay(now),
        basePrice,
      );
      if (request.range === "1D") {
        return { bars, previousClose, session: deps.calendar.session(now) };
      }
      return { bars, previousClose };
    },
  };
}
