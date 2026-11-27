import { changeBetween, type Range, type Stock } from "@mini/contracts";
import {
  useConnectionStatus,
  useLiveHistory,
  useLocale,
  useMarketStatus,
  useQuote,
  useQuoteWarning,
  useT,
  useWatchlist,
} from "@mini/core";
import { DetailHeader } from "../components/detail-header.tsx";
import { useTickFlash } from "../integrations/use-tick-flash.ts";
import { formatScrubTime } from "./chart-time.ts";
import { scrubPointOf, type ScrubSelection } from "./scrub.ts";

export interface ConnectedDetailHeaderProps {
  stock: Stock;
  range: Range;
  selection: ScrubSelection | undefined;
}

export function ConnectedDetailHeader({ stock, range, selection }: ConnectedDetailHeaderProps) {
  const t = useT();
  const locale = useLocale();
  const quote = useQuote(stock.symbol) ?? stock.quote;
  const history = useLiveHistory(stock.symbol, range);
  const warning = useQuoteWarning(quote);
  const { status } = useConnectionStatus();
  const stale = status === "stale" || status === "offline" || warning.degraded;
  const closed = useMarketStatus() === "closed";
  const watchlist = useWatchlist();
  const baseline = history.baseline;
  const scrub = scrubPointOf(selection, range, history);
  const scrubbed = scrub !== undefined && baseline !== undefined;
  const rangeChange = scrubbed ? changeBetween(baseline, scrub.close) : history.rangeChange;
  const { flash, flashKey } = useTickFlash(quote.price, stale, closed);
  return (
    <DetailHeader
      symbol={stock.symbol}
      name={stock.name}
      price={scrubbed ? scrub.close : quote.price}
      rangeChange={rangeChange}
      rangeLabel={
        scrubbed ? formatScrubTime(range, scrub.time, locale) : t(`detail.range.${range}`)
      }
      asOf={warning.label}
      asOfHelp={warning.help}
      stale={stale}
      flash={scrubbed ? undefined : flash}
      flashKey={flashKey}
      starred={watchlist.isLoaded ? watchlist.isStarred(stock.symbol) : undefined}
      onToggleStar={() => watchlist.toggle(stock.symbol)}
    />
  );
}
