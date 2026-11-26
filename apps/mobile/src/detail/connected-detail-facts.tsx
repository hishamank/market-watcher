import type { Stock } from "@mini/contracts";
import {
  formatMarketDateTime,
  formatMarketTime,
  formatPrice,
  useConnectionStatus,
  useLocale,
  useQuote,
  useT,
} from "@mini/core";
import { ChangePill } from "../components/change-pill.tsx";
import { DetailFacts } from "../components/detail-facts.tsx";

export function ConnectedDetailFacts({ stock }: { stock: Stock }) {
  const t = useT();
  const locale = useLocale();
  const quote = useQuote(stock.symbol) ?? stock.quote;
  const { status } = useConnectionStatus();
  const stale = status === "stale" || status === "offline";
  return (
    <DetailFacts
      facts={[
        {
          label: t("detail.range.1D"),
          testID: "detail-day-change",
          value: (
            <ChangePill
              change={quote.change}
              changePercent={quote.changePercent}
              stale={stale || !!quote.lastKnown}
              testID="detail-day-change-pill"
            />
          ),
        },
        {
          label: t("detail.previousClose"),
          testID: "detail-previous-close",
          value: formatPrice(quote.previousClose),
        },
        {
          label: t("detail.dayHigh"),
          testID: "detail-day-high",
          value: quote.dayRange ? formatPrice(quote.dayRange.high) : t("quote.dayRange.none"),
        },
        {
          label: t("detail.dayLow"),
          testID: "detail-day-low",
          value: quote.dayRange ? formatPrice(quote.dayRange.low) : t("quote.dayRange.none"),
        },
        {
          label: t("detail.lastUpdate"),
          testID: "detail-last-update",
          value: quote.lastKnown
            ? formatMarketDateTime(quote.timestamp, { locale })
            : formatMarketTime(quote.timestamp, { locale }),
        },
      ]}
    />
  );
}
