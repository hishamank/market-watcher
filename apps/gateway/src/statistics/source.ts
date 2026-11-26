import type { StockStatistics } from "@mini/contracts";

export interface StatisticsSource {
  load(symbol: string, signal: AbortSignal): Promise<StockStatistics | null>;
}
