import type { DayRange } from "@mini/contracts";
import { formatPrice, useT } from "@mini/core";

export interface DetailFactsProps {
  previousClose: string;
  dayRange: DayRange | undefined;
  lastUpdate: string;
}

export function DetailFacts({ previousClose, dayRange, lastUpdate }: DetailFactsProps) {
  const t = useT();
  const none = t("quote.dayRange.none");
  const facts = [
    { label: t("detail.previousClose"), value: formatPrice(previousClose), id: "previous-close" },
    {
      label: t("detail.dayHigh"),
      value: dayRange ? formatPrice(dayRange.high) : none,
      id: "day-high",
    },
    {
      label: t("detail.dayLow"),
      value: dayRange ? formatPrice(dayRange.low) : none,
      id: "day-low",
    },
    { label: t("detail.lastUpdate"), value: lastUpdate, id: "last-update" },
  ];
  return (
    <dl className="mx-16 rounded-xl border border-border bg-surface px-16 shadow-1 md:mx-0 md:flex md:flex-wrap md:gap-x-40 md:gap-y-12 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:shadow-none">
      {facts.map((fact) => (
        <div
          key={fact.id}
          className="flex justify-between gap-12 border-b border-border py-12 text-label font-normal last:border-b-0 md:flex-col md:items-start md:gap-2 md:border-0 md:py-0"
        >
          <dt className="text-text-secondary">{fact.label}</dt>
          <dd className="font-medium md:text-body-strong">
            <bdi dir="ltr" data-testid={`detail-${fact.id}`}>
              {fact.value}
            </bdi>
          </dd>
        </div>
      ))}
    </dl>
  );
}
