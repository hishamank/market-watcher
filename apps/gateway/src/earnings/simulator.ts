import type { EarningsSource } from "./source.ts";

export const simulatorEarningsSource: EarningsSource = {
  async load(symbol) {
    if (symbol !== "AAPL" && symbol !== "MSFT") return null;
    return {
      currency: "USD",
      basis: "gaap",
      nextReport: { dates: [Date.UTC(2027, 0, 28, 21)], confidence: "estimated" },
      quarters: [
        {
          fiscalQuarter: 1,
          fiscalYear: 2026,
          periodEnd: Date.UTC(2025, 11, 31),
          actual: "2.41",
          estimate: "2.35",
        },
        {
          fiscalQuarter: 2,
          fiscalYear: 2026,
          periodEnd: Date.UTC(2026, 2, 31),
          actual: "1.65",
          estimate: "1.71",
        },
        {
          fiscalQuarter: 3,
          fiscalYear: 2026,
          periodEnd: Date.UTC(2026, 5, 30),
          actual: "1.82",
          estimate: "1.78",
        },
        {
          fiscalQuarter: 4,
          fiscalYear: 2026,
          periodEnd: Date.UTC(2026, 8, 30),
          actual: "2.08",
          estimate: "1.96",
        },
      ],
    };
  },
};
