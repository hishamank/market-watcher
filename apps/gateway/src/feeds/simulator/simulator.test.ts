import {
  BAR_SIZE_BY_RANGE,
  HistoryResponseSchema,
  percentChange,
  QuoteSchema,
  RANGES,
  roundToDisplay,
  subtract,
  SymbolSchema,
} from "@mini/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { createSimulatorFeed, DAY_MS, startOfUtcDay, type SimulatorFeed } from "./index.ts";

const FIXED_NOW = Date.UTC(2026, 10, 25, 14, 23, 17, 450);
const SEED = "test-seed-r03";

const activeFeeds: SimulatorFeed[] = [];

function makeFeed(options: { seed?: string; now?: number } = {}): SimulatorFeed {
  const now = options.now ?? FIXED_NOW;
  const feed = createSimulatorFeed({
    seed: options.seed ?? SEED,
    clock: () => now,
  });
  activeFeeds.push(feed);
  return feed;
}

afterEach(() => {
  while (activeFeeds.length > 0) {
    activeFeeds.pop()?.close();
  }
});

describe("simulator determinism and history agreement", () => {
  it("gives the same price and quote across two instances for the same seed and time", async () => {
    const first = makeFeed();
    const second = makeFeed();
    const [firstQuote] = await first.live.snapshot(["AAPL"]);
    const [secondQuote] = await second.live.snapshot(["AAPL"]);

    expect(firstQuote).toEqual(secondQuote);
    expect(first.priceAt("AAPL", FIXED_NOW)).toBe(second.priceAt("AAPL", FIXED_NOW));

    const otherSeed = makeFeed({ seed: "different-seed" });
    expect(otherSeed.priceAt("AAPL", FIXED_NOW)).not.toBe(first.priceAt("AAPL", FIXED_NOW));
  });

  it("matches the last bar of every range to the live price at the same instant", async () => {
    const feed = makeFeed();
    for (const symbol of ["AAPL", "SNDL"]) {
      const [liveQuote] = await feed.live.snapshot([symbol]);
      expect(liveQuote).toBeDefined();
      QuoteSchema.parse(liveQuote);

      for (const range of RANGES) {
        const series = await feed.history.history({ symbol, range, now: FIXED_NOW });
        expect(series.bars.length).toBeGreaterThan(0);
        expect(series.bars.at(-1)?.close).toBe(liveQuote?.price);
        expect(series.previousClose).toBe(liveQuote?.previousClose);

        HistoryResponseSchema.parse({
          feedMode: "simulated",
          marketStatus: feed.calendar.status(FIXED_NOW),
          symbol,
          range,
          barSize: BAR_SIZE_BY_RANGE[range],
          ...series,
        });
        if (range === "1D") {
          expect(series.session).toEqual({
            open: startOfUtcDay(FIXED_NOW),
            close: startOfUtcDay(FIXED_NOW) + DAY_MS,
          });
        } else {
          expect(series.session).toBeUndefined();
        }
      }
    }
  });

  it("keeps history for a past day unchanged after a restart", async () => {
    const pastDayNow = Date.UTC(2026, 10, 20, 23, 59, 59, 0);
    const beforeRestart = makeFeed({ now: pastDayNow });
    const firstSeries = await beforeRestart.history.history({
      symbol: "MSFT",
      range: "1D",
      now: pastDayNow,
    });

    const afterRestart = makeFeed({ now: FIXED_NOW + 3 * DAY_MS });
    const secondSeries = await afterRestart.history.history({
      symbol: "MSFT",
      range: "1D",
      now: pastDayNow,
    });

    expect(secondSeries).toEqual(firstSeries);
  });
});

describe("simulator cross-range boundaries, quotes and catalogue", () => {
  it("agrees across ranges on completed bar boundaries", async () => {
    const feed = makeFeed();
    const todayOpen = startOfUtcDay(FIXED_NOW);
    const yesterdayOpen = todayOpen - DAY_MS;

    const yearSeries = await feed.history.history({ symbol: "NVDA", range: "1Y", now: FIXED_NOW });
    const monthSeries = await feed.history.history({ symbol: "NVDA", range: "1M", now: FIXED_NOW });

    const yesterdayDailyBar = yearSeries.bars.find((bar) => bar.time === yesterdayOpen);
    const yesterdayLastHourBar = monthSeries.bars.find((bar) => bar.time === todayOpen - 3_600_000);

    expect(yesterdayDailyBar?.close).toBe(yearSeries.previousClose);
    expect(yesterdayLastHourBar?.close).toBe(yearSeries.previousClose);
  });

  it("sets previousClose to the 00:00 UTC price and derives change from rounded display strings", async () => {
    const feed = makeFeed();
    const midnight = startOfUtcDay(FIXED_NOW);

    for (const symbol of ["AAPL", "SNDL"]) {
      const [quote] = await feed.live.snapshot([symbol]);
      expect(quote).toBeDefined();
      expect(quote?.previousClose).toBe(feed.priceAt(symbol, midnight));

      const expectedChange = roundToDisplay(
        subtract(quote!.price, quote!.previousClose),
        quote!.price,
      );
      expect(quote?.change).toBe(expectedChange);
      expect(quote?.changePercent).toBe(percentChange(quote!.previousClose, quote!.price));
    }

    const [penny] = await feed.live.snapshot(["SNDL"]);
    expect(penny?.price).toMatch(/^0\.\d{4}$/);
    expect(penny?.previousClose).toMatch(/^0\.\d{4}$/);

    const atMidnight = feed.quoteAt("AAPL", midnight);
    expect(atMidnight.price).toBe(atMidnight.previousClose);
    expect(atMidnight.change).toBe("0.00");
    expect(atMidnight.changePercent).toBe("0.00");
  });

  it("serves a 500-symbol catalogue with a valid 50-symbol default list", () => {
    const feed = makeFeed();
    const all = feed.catalogue.all();
    const defaults = feed.catalogue.defaultList();

    expect(all).toHaveLength(500);
    expect(defaults).toHaveLength(50);
    expect(new Set(defaults).size).toBe(50);
    expect(new Set(all.map((entry) => entry.symbol)).size).toBe(all.length);

    for (const entry of all) {
      expect(SymbolSchema.safeParse(entry.symbol).success).toBe(true);
      expect(entry.name.length).toBeGreaterThan(0);
    }

    for (const symbol of defaults) {
      expect(feed.catalogue.get(symbol)?.symbol).toBe(symbol);
    }
    expect(feed.catalogue.get("NOTREAL")).toBeUndefined();
  });
});
