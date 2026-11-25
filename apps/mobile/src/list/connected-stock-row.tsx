import type { Stock } from "@mini/contracts";
import { useConnectionStatus, useQuote, useWatchlist } from "@mini/core";
import { useRouter } from "expo-router";
import { StockRow } from "../components/stock-row.tsx";
import { useTickFlash } from "../integrations/use-tick-flash.ts";

export interface ConnectedStockRowProps {
  stock: Stock;
  testID: string;
}

export function ConnectedStockRow({ stock, testID }: ConnectedStockRowProps) {
  const router = useRouter();
  const quote = useQuote(stock.symbol) ?? stock.quote;
  const { status } = useConnectionStatus();
  const stale = status === "stale" || status === "offline";
  const { flash, flashKey } = useTickFlash(quote.timestamp, quote.change, stale);
  const watchlist = useWatchlist();
  return (
    <StockRow
      testID={testID}
      symbol={stock.symbol}
      name={stock.name}
      price={quote.price}
      change={quote.change}
      changePercent={quote.changePercent}
      stale={stale}
      flash={flash}
      flashKey={flashKey}
      starred={watchlist.isLoaded ? watchlist.isStarred(stock.symbol) : undefined}
      onOpen={() => router.push(`/stocks/${stock.symbol}`)}
      onToggleStar={() => watchlist.toggle(stock.symbol)}
    />
  );
}
