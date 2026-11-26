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
            <dt>
              <button
                type="button"
                data-testid={`statistics-help-${fact.id}`}
                aria-expanded={fact.expanded}
                aria-controls={fact.expanded ? "statistics-help" : undefined}
                onClick={fact.toggleHelp}
                className="flex min-h-[44px] w-full items-center justify-between gap-4 rounded-xs text-start text-caption text-text-secondary hover:text-text"
              >
                <span>{fact.label}</span>
                <span
                  aria-hidden="true"
                  className="inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border border-border-strong text-[10px]"
                >
                  i
                </span>
              </button>
            </dt>
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
      {view.help && (
        <div
          id="statistics-help"
          role="note"
          className="mt-16 border-s-2 border-border-strong ps-12 text-body text-text-secondary"
        >
          <p className="text-label text-text">{view.help.title}</p>
          <p className="mt-4">{view.help.text}</p>
        </div>
      )}
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
