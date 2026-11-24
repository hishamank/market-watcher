import { BAR_SIZE_BY_RANGE, HistoryResponseSchema, RANGES, type Range } from "@mini/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { createSimulatorFeed, type SimulatorFeed } from "./index.ts";

const SEED = "test-seed-r03";
const GRID_INSTANT = Date.UTC(2026, 10, 25, 10, 0, 0);
const BETWEEN_GRID = GRID_INSTANT + 7 * 60_000 + 13_000;

const feeds: SimulatorFeed[] = [];

function feedAt(now: number): SimulatorFeed {
  const feed = createSimulatorFeed({ seed: SEED, clock: () => now });
  feeds.push(feed);
  return feed;
}

afterEach(() => {
  while (feeds.length > 0) feeds.pop()?.close();
});

async function closeAt(feed: SimulatorFeed, range: Range, now: number, time: number) {
  const series = await feed.history.history({ symbol: "AAPL", range, now });
  return series.bars.find((bar) => bar.time === time)?.close;
}

describe("bar timestamps", () => {
  it("labels every bar with the instant its price was sampled", async () => {
    const feed = feedAt(BETWEEN_GRID);
    const live = feed.priceAt("AAPL", GRID_INSTANT);
    const closes = await Promise.all(
      (["1D", "1W", "1M"] as const).map((range) =>
        closeAt(feed, range, BETWEEN_GRID, GRID_INSTANT),
      ),
    );
    expect(closes).toEqual([live, live, live]);
  });

  it("ends every range on a point at the current instant", async () => {
    const feed = feedAt(BETWEEN_GRID);
    const [quote] = await feed.live.snapshot(["AAPL"]);
    for (const range of RANGES) {
      const series = await feed.history.history({ symbol: "AAPL", range, now: BETWEEN_GRID });
      expect(series.bars.at(-1)).toEqual({ time: BETWEEN_GRID, close: quote?.price });
    }
  });

  it("keeps history inside the contract for an epoch-zero clock", async () => {
    const feed = feedAt(0);
    for (const range of RANGES) {
      const series = await feed.history.history({ symbol: "AAPL", range, now: 0 });
      const parsed = HistoryResponseSchema.safeParse({
        feedMode: "simulated",
        marketStatus: feed.calendar.status(0),
        symbol: "AAPL",
        range,
        barSize: BAR_SIZE_BY_RANGE[range],
        ...series,
      });
      expect(parsed.success).toBe(true);
    }
  });
});
