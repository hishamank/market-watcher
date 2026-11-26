"use client";

import type { Stock } from "@mini/contracts";
import {
  formatMarketDateTime,
  formatMarketTime,
  useConnectionStatus,
  useLocale,
  useQuote,
  useT,
  useWatchlist,
} from "@mini/core";
import { useListNavigation } from "../integrations/use-list-navigation.ts";
import { StockRow } from "../components/stock-row.tsx";
import { useTickFlash } from "../integrations/use-tick-flash.ts";

export interface ConnectedStockRowProps {
  stock: Stock;
  morph?: boolean;
  reflowStar?: ((symbol: string) => void) | undefined;
}

export function ConnectedStockRow({ stock, morph = true, reflowStar }: ConnectedStockRowProps) {
  const t = useT();
  const locale = useLocale();
  const { stockHref } = useListNavigation();
  const quote = useQuote(stock.symbol) ?? stock.quote;
  const { status } = useConnectionStatus();
  const stale = status === "stale" || status === "offline";
  const { flash, flashKey, roll } = useTickFlash(quote.price, stale);
  const watchlist = useWatchlist();
  const starred = watchlist.isLoaded ? watchlist.isStarred(stock.symbol) : undefined;
  const toggle = () => watchlist.toggle(stock.symbol);
  return (
    <StockRow
      href={stockHref(stock.symbol)}
      symbol={stock.symbol}
      name={stock.name}
      price={quote.price}
      change={quote.change}
      changePercent={quote.changePercent}
      previousClose={quote.previousClose}
      lastUpdate={
        quote.lastKnown
          ? formatMarketDateTime(quote.timestamp, { locale })
          : t("list.lastUpdate", {
              time: formatMarketTime(quote.timestamp, { locale, label: false }),
            })
      }
      asOf={
        quote.lastKnown
          ? t("quote.lastKnown.label", { time: formatMarketDateTime(quote.timestamp, { locale }) })
          : undefined
      }
      stale={stale}
      flash={flash}
      flashKey={flashKey}
      flashRoll={roll}
      starred={starred}
      onToggleStar={reflowStar ? () => reflowStar(stock.symbol) : toggle}
      morph={morph}
    />
  );
}
