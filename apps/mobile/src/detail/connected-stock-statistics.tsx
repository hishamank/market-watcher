import { useStockStatistics } from "@mini/core";
import { StockStatistics } from "../components/stock-statistics.tsx";

export function ConnectedStockStatistics({ symbol }: { symbol: string }) {
  const view = useStockStatistics(symbol);
  return <StockStatistics view={view} />;
}
