import type { Stock } from "@mini/contracts";
import {
  formatMarketDateTime,
  useConnectionStatus,
  useLocale,
  useMarketStatus,
  useQuote,
  useT,
  useWatchlist,
} from "@mini/core";
import { useRouter } from "expo-router";
import { StockRow } from "../components/stock-row.tsx";
import { useTickFlash } from "../integrations/use-tick-flash.ts";

export interface ConnectedStockRowProps {
  stock: Stock;
  testID: string;
}

export function ConnectedStockRow({ stock, testID }: ConnectedStockRowProps) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const quote = useQuote(stock.symbol) ?? stock.quote;
  const { status } = useConnectionStatus();
  const stale = status === "stale" || status === "offline";
  const closed = useMarketStatus() === "closed";
  const { flash, flashKey } = useTickFlash(quote.price, stale, closed);
  const watchlist = useWatchlist();
  return (
    <StockRow
      testID={testID}
      symbol={stock.symbol}
      name={stock.name}
      price={quote.price}
      change={quote.change}
      changePercent={quote.changePercent}
      asOf={
        quote.lastKnown
          ? t("quote.lastKnown.label", { time: formatMarketDateTime(quote.timestamp, { locale }) })
          : undefined
      }
      stale={stale}
      flash={flash}
      flashKey={flashKey}
      starred={watchlist.isLoaded ? watchlist.isStarred(stock.symbol) : undefined}
      onOpen={() => router.push(`/stocks/${stock.symbol}`)}
      onToggleStar={() => watchlist.toggle(stock.symbol)}
    />
  );
}
