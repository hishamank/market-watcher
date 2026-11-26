import { describe, expect, it } from "vitest";
import { earningsBarGeometry, formatEarningsPerShare } from "./earnings.ts";
import { StockEarningsSchema, type EarningsQuarter } from "../earnings.ts";

function quarter(actual: string | null, estimate: string | null): EarningsQuarter {
  return { fiscalYear: 2026, fiscalQuarter: 1, periodEnd: 1, actual, estimate };
}

describe("earnings chart geometry", () => {
  it("formats EPS in cents, preserving negative and zero earnings", () => {
    expect(formatEarningsPerShare("0")).toBe("$0.00");
    expect(formatEarningsPerShare("-0.5")).toBe("-$0.50");
    expect(formatEarningsPerShare("1.98483")).toBe("$1.98");
  });
  it("shares a zero baseline across losses and profits", () => {
    const geometry = earningsBarGeometry([quarter("-2", "1"), quarter("2", "0")]);
    expect(geometry.zero).toBe(50);
    expect(geometry.bars).toEqual([
      { actual: { bottom: 0, height: 50 }, estimate: { bottom: 50, height: 25 } },
      { actual: { bottom: 50, height: 50 }, estimate: { bottom: 50, height: 0 } },
    ]);
  });
  it("keeps missing amounts absent and zero amounts real without dividing by zero", () => {
    expect(earningsBarGeometry([quarter("0", null)])).toEqual({
      zero: 50,
      bars: [{ actual: { bottom: 50, height: 0 }, estimate: null }],
    });
    expect(earningsBarGeometry([quarter("-1", "-2")]).zero).toBe(100);
    expect(earningsBarGeometry([quarter("0.0001", "0.0002")]).bars[0]?.actual?.height).toBe(50);
  });
  it("requires currency for EPS, preserves date ranges and rejects empty quarter records", () => {
    const sample = {
      currency: "USD",
      basis: "gaap",
      nextReport: { dates: [1000, 2000], confidence: "unknown" },
      quarters: [quarter("-1.25", "0")],
    };
    expect(StockEarningsSchema.parse(sample)).toEqual(sample);
    expect(StockEarningsSchema.safeParse({ ...sample, currency: null }).success).toBe(false);
    expect(
      StockEarningsSchema.safeParse({ ...sample, quarters: [quarter(null, null)] }).success,
    ).toBe(false);
  });
});
