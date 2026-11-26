import type { StockStatistics } from "@mini/contracts";
import type { StatisticsSource } from "./source.ts";

const sample: StockStatistics = {
  currency: "USD",
  marketCap: "2800000000000",
  trailingPE: "28.42",
  trailingEps: "6.43",
  dividendYield: "0.0045",
  averageVolume: 52400000,
  yearRange: { low: "124.17", high: "320.49" },
};

export const simulatorStatisticsSource: StatisticsSource = {
  async load(symbol) {
    if (symbol === "AAPL" || symbol === "MSFT") return sample;
    if (["SPY", "QQQ", "VTI"].includes(symbol))
      return {
        ...sample,
        marketCap: null,
        trailingPE: null,
        trailingEps: null,
        dividendYield: "0.012",
        averageVolume: 71300000,
        yearRange: { low: "400.25", high: "650.80" },
      };
    return null;
  },
};
