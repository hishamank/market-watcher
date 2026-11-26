import type { StockEarnings } from "@mini/contracts";

export interface EarningsSource {
  load(symbol: string, signal: AbortSignal): Promise<StockEarnings | null>;
}
