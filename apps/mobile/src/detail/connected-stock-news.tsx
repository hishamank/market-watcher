import { useTrack } from "@mini/analytics";
import { useStockNews } from "@mini/core";
import { StockNews } from "../components/stock-news.tsx";

export function ConnectedStockNews({ symbol }: { symbol: string }) {
  const view = useStockNews(symbol);
  const track = useTrack();
  return (
    <StockNews
      view={view}
      onOpen={(position) => track({ name: "news_opened", symbol, position })}
    />
  );
}
