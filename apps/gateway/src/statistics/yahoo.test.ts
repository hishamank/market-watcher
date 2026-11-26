import { expect, it, vi } from "vitest";
import { createYahooStatisticsSource } from "./yahoo.ts";

vi.mock("yahoo-finance2", () => ({
  default: class {
    async quoteSummary() {
      return {
        quoteType: { quoteType: "EQUITY" },
        summaryDetail: {
          currency: "USD",
          marketCap: -0,
          dividendYield: -0,
          fiftyTwoWeekLow: -0,
          fiftyTwoWeekHigh: 5,
        },
        defaultKeyStatistics: { trailingEps: -0 },
      };
    }
  },
}));

it("accepts upstream negative zero as zero across statistics fields", async () => {
  await expect(
    createYahooStatisticsSource().load("AAPL", new AbortController().signal),
  ).resolves.toMatchObject({
    marketCap: "0",
    dividendYield: "0",
    trailingEps: "0",
    yearRange: { low: "0", high: "5" },
  });
});
