"use client";

import type { Stock } from "@mini/contracts";
import { formatMarketTime, useConnectionStatus, useQuote, useT, useWatchlist } from "@mini/core";
import { StockRow } from "../components/stock-row.tsx";
import { useTickFlash } from "../integrations/use-tick-flash.ts";

export function ConnectedStockRow({ stock }: { stock: Stock }) {
  const t = useT();
  const quote = useQuote(stock.symbol) ?? stock.quote;
  const { status } = useConnectionStatus();
  const stale = status === "stale" || status === "offline";
  const { flash, flashKey } = useTickFlash(quote.timestamp, quote.change, stale);
  const watchlist = useWatchlist();
  return (
    <StockRow
      symbol={stock.symbol}
      name={stock.name}
      price={quote.price}
      change={quote.change}
      changePercent={quote.changePercent}
      previousClose={quote.previousClose}
      lastUpdate={t("list.lastUpdate", {
        time: formatMarketTime(quote.timestamp, { label: false }),
      })}
      stale={stale}
      flash={flash}
      flashKey={flashKey}
      starred={watchlist.isLoaded ? watchlist.isStarred(stock.symbol) : undefined}
      onToggleStar={() => watchlist.toggle(stock.symbol)}
    />
  );
}
