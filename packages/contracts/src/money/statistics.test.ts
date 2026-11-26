import { describe, expect, it } from "vitest";
import { formatCompactAmount, positionInRange, ratioToPercent } from "./statistics.ts";
import { StockStatisticsSchema, YearRangeSchema } from "../statistics.ts";

describe("statistics precision and range", () => {
  it("formats large amounts and small yields without losing scale", () => {
    expect(formatCompactAmount("2800000000000")).toBe("2.80T");
    expect(formatCompactAmount("52400000")).toBe("52.40M");
    expect(formatCompactAmount("12345678901234567")).toBe("12345.68T");
    expect(ratioToPercent("0.0045")).toBe("0.45");
    expect(ratioToPercent("0")).toBe("0.00");
    expect(ratioToPercent("0.00005")).toBe("0.01");
  });
  it("places and clamps the marker without inventing a position for a flat range", () => {
    const range = { low: "100", high: "200" };
    expect(positionInRange(range, "150")).toBe(50);
    expect(positionInRange(range, "99")).toBe(0);
    expect(positionInRange(range, "201")).toBe(100);
    expect(positionInRange({ low: "0.1", high: "0.2" }, "0.125")).toBe(25);
    expect(positionInRange({ low: "1", high: "1" }, "1")).toBeNull();
    expect(YearRangeSchema.safeParse({ low: "200", high: "100" }).success).toBe(false);
    expect(YearRangeSchema.safeParse({ low: "bad", high: "100" }).success).toBe(false);
  });
  it("preserves negative earnings and zero yield, rejects numeric money and foreign currency", () => {
    const stats = {
      currency: "USD",
      marketCap: null,
      trailingPE: null,
      trailingEps: "-2.25",
      dividendYield: "0",
      averageVolume: 0,
      yearRange: null,
    };
    expect(StockStatisticsSchema.parse(stats)).toEqual(stats);
    expect(StockStatisticsSchema.safeParse({ ...stats, marketCap: 100 }).success).toBe(false);
    expect(StockStatisticsSchema.safeParse({ ...stats, currency: "GBP" }).success).toBe(false);
  });
});
