import { useT, type StockStatisticsView } from "@mini/core";

type ReadyStatistics = Extract<StockStatisticsView, { status: "ready" }>;

function YearRange({ range }: { range: ReadyStatistics["range"] }) {
  if (!range) return <span>—</span>;
  return (
    <div dir="ltr" data-testid="statistics-year-range">
      <div className="flex justify-between gap-4 text-label tabular-nums">
        <span>{range.low}</span>
        <span>{range.high}</span>
      </div>
      <div aria-hidden="true" className="relative my-8 h-[4px] rounded-full bg-border-strong">
        {range.position !== null && (
          <span
            data-testid="statistics-range-marker"
            className="absolute top-1/2 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-text"
            style={{ insetInlineStart: `${range.position}%` }}
          />
        )}
      </div>
      {range.priceLabel && (
        <p className="text-caption font-normal text-text-secondary">{range.priceLabel}</p>
      )}
    </div>
  );
}

export function StatisticsContent({ view }: { view: ReadyStatistics }) {
  const t = useT();
  return (
    <>
      <dl className="mt-12 grid grid-cols-2 gap-x-20 gap-y-12 md:grid-cols-3 md:gap-x-24">
        {view.facts.map((fact) => (
          <div key={fact.id} className="min-w-0 border-t border-border pt-4 pb-8">
            <dt className="py-12 text-caption text-text-secondary">{fact.label}</dt>
            <dd
              data-testid={`statistics-${fact.id}`}
              className="text-heading-md font-medium tabular-nums"
            >
              {fact.id === "yearRange" ? (
                <YearRange range={view.range} />
              ) : (
                <bdi dir="ltr">{fact.value}</bdi>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div
        data-testid="statistics-source"
        className="mt-16 flex flex-wrap gap-x-8 gap-y-4 text-caption text-text-muted"
      >
        <span>{view.attribution}</span>
        {view.retrieved && (
          <>
            <span>{t("statistics.note")}</span>
            <span>{view.retrieved}</span>
          </>
        )}
      </div>
    </>
  );
}
