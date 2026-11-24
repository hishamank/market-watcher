import { QuoteSchema, type MarketStatus, type Quote } from "@mini/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSimulatorFeed, DAY_MS, startOfUtcDay, type SimulatorFeed } from "./index.ts";

const FIXED_NOW = Date.UTC(2026, 10, 25, 14, 23, 17, 450);
const SEED = "chaos-test-seed";

const activeFeeds: SimulatorFeed[] = [];

function trackFeed(feed: SimulatorFeed): SimulatorFeed {
  activeFeeds.push(feed);
  return feed;
}

afterEach(() => {
  while (activeFeeds.length > 0) {
    activeFeeds.pop()?.close();
  }
  vi.useRealTimers();
});

describe("simulator calendar and history chaos controls", () => {
  it("reports open UTC-day sessions and flips status on forceClosed", () => {
    const feed = trackFeed(createSimulatorFeed({ seed: SEED, clock: () => FIXED_NOW }));
    const events: MarketStatus[] = [];
    const unsubscribe = feed.calendar.onStatusChange((status) => events.push(status));

    expect(feed.calendar.status(FIXED_NOW)).toBe("open");
    expect(feed.calendar.session(FIXED_NOW)).toEqual({
      open: startOfUtcDay(FIXED_NOW),
      close: startOfUtcDay(FIXED_NOW) + DAY_MS,
    });

    feed.updateSettings({ forceClosed: true });
    expect(feed.calendar.status(FIXED_NOW)).toBe("closed");
    feed.updateSettings({ forceClosed: true });
    feed.updateSettings({ forceClosed: false });
    expect(feed.calendar.status(FIXED_NOW)).toBe("open");

    unsubscribe();
    feed.updateSettings({ forceClosed: true });
    expect(events).toEqual(["closed", "open"]);
  });

  it("rejects history when failure rate is 1 and honours 0 and 0.5", async () => {
    let draw = 0.25;
    const feed = trackFeed(
      createSimulatorFeed({
        seed: SEED,
        clock: () => FIXED_NOW,
        random: () => draw,
      }),
    );

    feed.updateSettings({ historyFailureRate: 1 });
    await expect(
      feed.history.history({ symbol: "AAPL", range: "1D", now: FIXED_NOW }),
    ).rejects.toThrow("Simulated history failure");

    feed.updateSettings({ historyFailureRate: 0.5 });
    await expect(
      feed.history.history({ symbol: "AAPL", range: "1D", now: FIXED_NOW }),
    ).rejects.toThrow("Simulated history failure");

    draw = 0.75;
    const okSeries = await feed.history.history({ symbol: "AAPL", range: "1D", now: FIXED_NOW });
    expect(okSeries.bars.length).toBeGreaterThan(0);

    feed.resetSettings();
    expect(feed.getSettings()).toEqual({
      tickRateMultiplier: 1,
      historyLatencyMs: 0,
      historyFailureRate: 0,
      forceClosed: false,
    });
  });
});

describe("simulator history latency", () => {
  it("applies history latency and cancels immediately on AbortSignal", async () => {
    vi.useFakeTimers();
    const feed = trackFeed(
      createSimulatorFeed({
        seed: SEED,
        clock: () => FIXED_NOW,
        initialSettings: { historyLatencyMs: 2_000 },
      }),
    );

    let resolved = false;
    const pending = feed.history
      .history({ symbol: "AAPL", range: "1D", now: FIXED_NOW })
      .then((result) => {
        resolved = true;
        return result;
      });

    await vi.advanceTimersByTimeAsync(1_999);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
    await expect(pending).resolves.toBeDefined();

    const controller = new AbortController();
    const aborted = feed.history.history({
      symbol: "AAPL",
      range: "1D",
      now: FIXED_NOW,
      signal: controller.signal,
    });
    controller.abort(new Error("cancelled"));
    await expect(aborted).rejects.toThrow("cancelled");
  });
});

describe("simulator live tick controls", () => {
  it("emits jittered ticks for subscribed symbols, scales with multiplier and pauses when closed", async () => {
    vi.useFakeTimers();
    let now = FIXED_NOW;
    const feed = trackFeed(
      createSimulatorFeed({
        seed: SEED,
        clock: () => now,
        baseTicksPerSecond: 2,
        random: () => 0.5,
      }),
    );

    const quotes: Quote[] = [];
    feed.live.onQuote((quote) => quotes.push(quote));
    feed.live.subscribe(["AAPL"]);

    now += 500;
    await vi.advanceTimersByTimeAsync(1_000);
    const baselineCount = quotes.length;
    expect(baselineCount).toBe(2);
    for (const quote of quotes) {
      QuoteSchema.parse(quote);
      expect(quote.symbol).toBe("AAPL");
    }

    quotes.length = 0;
    feed.updateSettings({ tickRateMultiplier: 5 });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(quotes.length).toBeGreaterThan(baselineCount);

    quotes.length = 0;
    feed.updateSettings({ forceClosed: true });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(quotes).toHaveLength(0);

    feed.updateSettings({ forceClosed: false });
    await vi.advanceTimersByTimeAsync(1_000);
    expect(quotes.length).toBeGreaterThan(0);

    quotes.length = 0;
    feed.live.unsubscribe(["AAPL"]);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(quotes).toHaveLength(0);
  });
});
