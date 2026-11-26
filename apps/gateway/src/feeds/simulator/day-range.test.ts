import { QuoteSchema, toUnits, widenRange } from "@mini/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { createSimulatorFeed, DAY_MS, startOfUtcDay, type SimulatorFeed } from "./index.ts";

const FIXED_NOW = Date.UTC(2026, 10, 25, 14, 23, 17, 450);
const SEED = "test-seed-day-range";

const activeFeeds: SimulatorFeed[] = [];

function makeFeed(clock: () => number): SimulatorFeed {
  const feed = createSimulatorFeed({ seed: SEED, clock });
  activeFeeds.push(feed);
  return feed;
}

afterEach(() => {
  while (activeFeeds.length > 0) {
    activeFeeds.pop()?.close();
  }
});

describe("simulator day range", () => {
  it("spans exactly the prices the 1D chart draws", async () => {
    const feed = makeFeed(() => FIXED_NOW);
    for (const symbol of ["AAPL", "SNDL"]) {
      const day = await feed.history.history({ symbol, range: "1D", now: FIXED_NOW });
      const [quote] = await feed.live.snapshot([symbol]);
      const drawn = day.bars.reduce<ReturnType<typeof widenRange> | undefined>(
        (range, bar) => widenRange(range, bar.close),
        undefined,
      );
      expect(quote?.dayRange).toEqual(drawn);
      expect(QuoteSchema.safeParse(quote).success).toBe(true);
    }
  });

  it("never lowers the high or raises the low within a day, and resets at the next", async () => {
    let now = startOfUtcDay(FIXED_NOW) + 9 * 3_600_000;
    const feed = makeFeed(() => now);
    let previous = (await feed.live.snapshot(["NVDA"]))[0]!.dayRange!;
    for (let step = 0; step < 400; step += 1) {
      now += 37_000;
      const [quote] = await feed.live.snapshot(["NVDA"]);
      const range = quote!.dayRange!;
      expect(toUnits(range.high)).toBeGreaterThanOrEqual(toUnits(previous.high));
      expect(toUnits(range.low)).toBeLessThanOrEqual(toUnits(previous.low));
      expect(QuoteSchema.safeParse(quote).success).toBe(true);
      previous = range;
    }
    now = startOfUtcDay(FIXED_NOW) + DAY_MS + 60_000;
    const [nextDay] = await feed.live.snapshot(["NVDA"]);
    expect(nextDay?.dayRange).toEqual(feed.quoteAt("NVDA", now).dayRange);
  });
});
