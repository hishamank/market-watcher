"use client";

import type { Stock } from "@mini/contracts";
import {
  formatMarketDateTime,
  formatMarketTime,
  formatPrice,
  useConnectionStatus,
  useQuote,
  useT,
  useWatchlist,
} from "@mini/core";
import { useListNavigation } from "../integrations/use-list-navigation.ts";
import { StockRow } from "../components/stock-row.tsx";
import { useTickFlash } from "../integrations/use-tick-flash.ts";

export function ConnectedStockRow({ stock, morph = true }: { stock: Stock; morph?: boolean }) {
  const t = useT();
  const { stockHref } = useListNavigation();
  const quote = useQuote(stock.symbol) ?? stock.quote;
  const { status } = useConnectionStatus();
  const stale = status === "stale" || status === "offline";
  const { flash, flashKey, roll } = useTickFlash(quote.price, stale);
  const watchlist = useWatchlist();
  return (
    <StockRow
      href={stockHref(stock.symbol)}
      symbol={stock.symbol}
      name={stock.name}
      price={quote.price}
      change={quote.change}
      changePercent={quote.changePercent}
      previousClose={quote.previousClose}
      dayHigh={quote.dayRange ? formatPrice(quote.dayRange.high) : t("quote.dayRange.none")}
      dayLow={quote.dayRange ? formatPrice(quote.dayRange.low) : t("quote.dayRange.none")}
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
      flashRoll={roll}
      starred={watchlist.isLoaded ? watchlist.isStarred(stock.symbol) : undefined}
      onToggleStar={() => watchlist.toggle(stock.symbol)}
      morph={morph}
    />
  );
}
