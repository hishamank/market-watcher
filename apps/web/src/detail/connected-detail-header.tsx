"use client";

import type { Range, Stock } from "@mini/contracts";
import { useConnectionStatus, useLiveHistory, useQuote, useT, useWatchlist } from "@mini/core";
import { DetailHeader } from "../components/detail-header.tsx";
import { useTickFlash } from "../integrations/use-tick-flash.ts";

export interface ConnectedDetailHeaderProps {
  stock: Stock;
  range: Range;
}

export function ConnectedDetailHeader({ stock, range }: ConnectedDetailHeaderProps) {
  const t = useT();
  const quote = useQuote(stock.symbol) ?? stock.quote;
  const { rangeChange } = useLiveHistory(stock.symbol, range);
  const { status } = useConnectionStatus();
  const stale = status === "stale" || status === "offline";
  const { flash, flashKey } = useTickFlash(quote.timestamp, rangeChange?.change, stale);
  const watchlist = useWatchlist();
  return (
    <DetailHeader
      symbol={stock.symbol}
      name={stock.name}
      price={quote.price}
      change={rangeChange?.change ?? quote.change}
      rangeChange={rangeChange}
      rangeLabel={t(`detail.range.${range}`)}
      stale={stale}
      flash={flash}
      flashKey={flashKey}
      starred={watchlist.isLoaded ? watchlist.isStarred(stock.symbol) : undefined}
      onToggleStar={() => watchlist.toggle(stock.symbol)}
    />
  );
}
