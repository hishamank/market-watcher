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
import { startStarTransition } from "../integrations/star-motion.ts";
import { useListNavigation } from "../integrations/use-list-navigation.ts";
import { StockRow } from "../components/stock-row.tsx";
import { useTickFlash } from "../integrations/use-tick-flash.ts";

export interface ConnectedStockRowProps {
  stock: Stock;
  morph?: boolean;
  reflowOnStar?: boolean | undefined;
}

export function ConnectedStockRow({ stock, morph = true, reflowOnStar }: ConnectedStockRowProps) {
  const t = useT();
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
      starred={starred}
      onToggleStar={reflowOnStar ? () => startStarTransition(starred !== true, toggle) : toggle}
      morph={morph}
    />
  );
}
