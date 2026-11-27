"use client";

import { changeBetween, type Range, type Stock } from "@mini/contracts";
import {
  useConnectionStatus,
  useLiveHistory,
  useLocale,
  useQuote,
  useQuoteWarning,
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
  const locale = useLocale();
  const quote = useQuote(stock.symbol) ?? stock.quote;
  const history = useLiveHistory(stock.symbol, range, { keepPrevious: true });
  const warning = useQuoteWarning(quote);
  const { status } = useConnectionStatus();
  const stale = status === "stale" || status === "offline" || warning.degraded;
  const watchlist = useWatchlist();
  const scrubbed = scrub !== undefined && history.baseline !== undefined && !history.updating;
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
      changeUpdating={history.updating}
      rangeLabel={
        scrubbed
          ? formatScrubTime(range, scrub.time, locale)
          : t(`detail.range.${history.range ?? range}`)
      }
      asOf={warning.label}
      asOfHelp={warning.help}
      stale={stale}
      flash={scrubbed ? undefined : flash}
      flashKey={flashKey}
      flashRoll={scrubbed ? undefined : roll}
      starred={watchlist.isLoaded ? watchlist.isStarred(stock.symbol) : undefined}
      onToggleStar={() => watchlist.toggle(stock.symbol)}
    />
  );
}
