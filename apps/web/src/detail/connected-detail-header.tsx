"use client";

import { changeBetween, type Range, type Stock } from "@mini/contracts";
import {
  formatMarketDateTime,
  useConnectionStatus,
  useLiveHistory,
  useQuote,
  useT,
  useWatchlist,
} from "@mini/core";
import { DetailHeader } from "../components/detail-header.tsx";
import type { ScrubPoint } from "../integrations/chart/use-chart-scrub.ts";
import { useTickFlash } from "../integrations/use-tick-flash.ts";
import { formatScrubTime } from "./scrub-time.ts";

export interface ConnectedDetailHeaderProps {
  stock: Stock;
  range: Range;
  scrub: ScrubPoint | undefined;
}

export function ConnectedDetailHeader({ stock, range, scrub }: ConnectedDetailHeaderProps) {
  const t = useT();
  const quote = useQuote(stock.symbol) ?? stock.quote;
  const history = useLiveHistory(stock.symbol, range);
  const { status } = useConnectionStatus();
  const stale = status === "stale" || status === "offline";
  const watchlist = useWatchlist();
  const scrubbed = scrub !== undefined && history.baseline !== undefined;
  const shownPrice = scrubbed ? scrub.close : quote.price;
  const rangeChange =
    scrubbed && history.baseline !== undefined
      ? changeBetween(history.baseline, shownPrice)
      : history.rangeChange;
  const { flash, flashKey, roll } = useTickFlash(quote.price, stale);
  return (
    <DetailHeader
      symbol={stock.symbol}
      name={stock.name}
      price={shownPrice}
      change={rangeChange?.change ?? quote.change}
      rangeChange={rangeChange}
      changeLoading={history.previousClose === undefined && history.status === "pending"}
      rangeLabel={scrubbed ? formatScrubTime(range, scrub.time) : t(`detail.range.${range}`)}
      asOf={
        quote.lastKnown
          ? t("quote.lastKnown.label", { time: formatMarketDateTime(quote.timestamp) })
          : undefined
      }
      asOfHelp={t("quote.lastKnown.help")}
      stale={stale}
      flash={scrubbed ? undefined : flash}
      flashKey={flashKey}
      flashRoll={scrubbed ? undefined : roll}
      starred={watchlist.isLoaded ? watchlist.isStarred(stock.symbol) : undefined}
      onToggleStar={() => watchlist.toggle(stock.symbol)}
    />
  );
}
