import type { Bar } from "@mini/contracts";
import { describe, expect, it } from "vitest";
import { makeQuote } from "../testing/fake-platform.ts";
import { BAR_SIZE_MS, type LiveHistory, mergeLiveQuote } from "./merge-live-quote.ts";

const FIVE_MIN = BAR_SIZE_MS["5m"];
const bucketStart = 1_000 * FIVE_MIN;
const livePointAt = bucketStart + 90_000;

const bars: readonly Bar[] = Object.freeze([
  { time: bucketStart - FIVE_MIN, close: "101.00" },
  { time: bucketStart, close: "101.50" },
  { time: livePointAt, close: "101.75" },
]);

const allDay = { open: 0, close: Number.MAX_SAFE_INTEGER };
const history = {
  symbol: "AAPL",
  range: "1D",
  barSize: "5m",
  bars: bars as Bar[],
  session: allDay,
} as const;

describe("merging bars with the live quote", () => {
  it("replaces the live point while the quote stays in the same bar bucket", () => {
    const quote = makeQuote("AAPL", "102.10", livePointAt + 60_000);

    const merged = mergeLiveQuote(history, quote);

    expect(merged).toHaveLength(3);
    expect(merged.at(-1)).toEqual({ time: livePointAt + 60_000, close: "102.10" });
    expect(merged.slice(0, 2)).toEqual(bars.slice(0, 2));
  });

  it("appends a point once the quote falls in a later bucket", () => {
    const quote = makeQuote("AAPL", "99.9900", bucketStart + FIVE_MIN + 1);

    const merged = mergeLiveQuote(history, quote);

    expect(merged).toHaveLength(4);
    expect(merged.slice(0, 3)).toEqual(bars);
    expect(merged.at(-1)).toEqual({ time: bucketStart + FIVE_MIN + 1, close: "99.9900" });
  });

  it("keeps the prices as the exact decimal strings from the quote", () => {
    const merged = mergeLiveQuote(history, makeQuote("AAPL", "0.4387", livePointAt + 1));

    expect(merged.at(-1)?.close).toBe("0.4387");
  });

  it("returns the bars unchanged for no quote, an older quote or another symbol", () => {
    expect(mergeLiveQuote(history, undefined)).toBe(bars);
    expect(mergeLiveQuote(history, makeQuote("AAPL", "1.00", livePointAt - 1))).toBe(bars);
    expect(mergeLiveQuote(history, makeQuote("AAPL", "1.00", livePointAt))).toBe(bars);
    expect(mergeLiveQuote(history, makeQuote("MSFT", "1.00", livePointAt + 1))).toBe(bars);
  });

  it("starts a series from the quote when there are no bars", () => {
    const quote = makeQuote("AAPL", "150.00", livePointAt);

    expect(mergeLiveQuote({ ...history, bars: [] }, quote)).toEqual([
      { time: livePointAt, close: "150.00" },
    ]);
  });

  it("buckets by the range's bar size", () => {
    const dayHistory = { symbol: "AAPL", range: "3M", barSize: "1d", bars: bars as Bar[] } as const;

    expect(mergeLiveQuote(dayHistory, makeQuote("AAPL", "1.00", bucketStart + FIVE_MIN))).toEqual([
      ...bars.slice(0, 2),
      { time: bucketStart + FIVE_MIN, close: "1.00" },
    ]);
  });

  it("starts weekly buckets on the gateway's UTC Monday", () => {
    const weekly = (time: number): LiveHistory => ({
      symbol: "AAPL",
      range: "5Y",
      barSize: "1w",
      bars: [{ time, close: "1.00" }],
    });
    const sundayLate = Date.UTC(2026, 10, 22, 23, 59);
    const mondayEarly = Date.UTC(2026, 10, 23, 0, 1);
    const wednesdayLate = Date.UTC(2026, 10, 25, 23, 59);
    const thursdayEarly = Date.UTC(2026, 10, 26, 0, 1);

    expect(mergeLiveQuote(weekly(sundayLate), makeQuote("AAPL", "2.00", mondayEarly))).toHaveLength(
      2,
    );
    expect(mergeLiveQuote(weekly(wednesdayLate), makeQuote("AAPL", "2.00", thursdayEarly))).toEqual(
      [{ time: thursdayEarly, close: "2.00" }],
    );
  });

  it("merges 1D quotes only inside the session, which ends at its close", () => {
    const session = { open: Date.UTC(2026, 10, 25), close: Date.UTC(2026, 10, 26) };
    const lastBar = { time: Date.UTC(2026, 10, 25, 23, 59), close: "1.00" };
    const today = { ...history, bars: [lastBar], session };
    const justBeforeClose = makeQuote("AAPL", "2.00", session.close - 1);

    expect(mergeLiveQuote(today, justBeforeClose)).toEqual([
      { time: session.close - 1, close: "2.00" },
    ]);
    expect(mergeLiveQuote(today, makeQuote("AAPL", "3.00", session.close))).toBe(today.bars);
    const nextSession = makeQuote("AAPL", "3.00", Date.UTC(2026, 10, 26, 0, 1));
    expect(mergeLiveQuote(today, nextSession)).toBe(today.bars);
    expect(mergeLiveQuote({ ...today, bars: [] }, nextSession)).toEqual([]);
  });
});
