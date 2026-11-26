"use client";

import type { Stock } from "@mini/contracts";
import {
  formatMarketDateTime,
  formatMarketTime,
  useConnectionStatus,
  useQuote,
  useT,
  useWatchlist,
} from "@mini/core";
import { StockRow } from "../components/stock-row.tsx";
import { useTickFlash } from "../integrations/use-tick-flash.ts";

export function ConnectedStockRow({ stock, morph = true }: { stock: Stock; morph?: boolean }) {
  const t = useT();
  const quote = useQuote(stock.symbol) ?? stock.quote;
  const { status } = useConnectionStatus();
  const stale = status === "stale" || status === "offline";
  const { flash, flashKey, from } = useTickFlash(quote.price, stale);
  const watchlist = useWatchlist();
  return (
    <StockRow
      symbol={stock.symbol}
      name={stock.name}
      price={quote.price}
      change={quote.change}
      changePercent={quote.changePercent}
      previousClose={quote.previousClose}
      lastUpdate={
        quote.lastKnown
          ? formatMarketDateTime(quote.timestamp)
          : t("list.lastUpdate", {
              time: formatMarketTime(quote.timestamp, { label: false }),
            })
      }
      asOf={
        quote.lastKnown
          ? t("quote.lastKnown.label", { time: formatMarketDateTime(quote.timestamp) })
          : undefined
      }
      stale={stale}
      flash={flash}
      flashKey={flashKey}
      flashFrom={from}
      starred={watchlist.isLoaded ? watchlist.isStarred(stock.symbol) : undefined}
      onToggleStar={() => watchlist.toggle(stock.symbol)}
      morph={morph}
    />
  );
}
