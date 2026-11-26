import { useT, type StockEarningsView } from "@mini/core";

type ReadyEarnings = Extract<StockEarningsView, { status: "ready" }>;

export function EarningsChart({ view }: { view: ReadyEarnings }) {
  const t = useT();
  return (
    <div data-testid="earnings-chart" className="mt-24 border-t border-border pt-20">
      <div className="mb-20 flex flex-wrap items-center justify-between gap-8">
        <h3 className="text-label">{t("earnings.history")}</h3>
        <div className="flex gap-16 text-caption text-text-secondary">
          <span className="inline-flex items-center gap-6">
            <span aria-hidden="true" className="h-[8px] w-[8px] rounded-xs bg-text" />
            {t("earnings.actual")}
          </span>
          <span className="inline-flex items-center gap-6">
            <span
              aria-hidden="true"
              className="h-[8px] w-[8px] rounded-xs border border-dashed border-border-strong bg-fill"
            />
            {t("earnings.estimate")}
          </span>
        </div>
      </div>
      <div
        dir="ltr"
        className="grid gap-12 md:gap-24"
        style={{ gridTemplateColumns: `repeat(${view.quarters.length}, minmax(0, 1fr))` }}
      >
        {view.quarters.map((quarter) => (
          <div key={quarter.id} data-testid="earnings-quarter" className="min-w-0 text-center">
            <div aria-hidden="true" className="relative h-[120px]">
              <div
                className="absolute inset-x-0 border-t border-border"
                style={{ bottom: `${view.zero}%` }}
              />
              {quarter.actualBar && (
                <div
                  className="absolute start-[15%] w-[30%] rounded-t-xs bg-text"
                  style={{
                    bottom: `${quarter.actualBar.bottom}%`,
                    height: `${quarter.actualBar.height}%`,
                  }}
                />
              )}
              {quarter.estimateBar && (
                <div
                  className="absolute start-[55%] w-[30%] rounded-t-xs border border-dashed border-border-strong bg-fill"
                  style={{
                    bottom: `${quarter.estimateBar.bottom}%`,
                    height: `${quarter.estimateBar.height}%`,
                  }}
                />
              )}
            </div>
            <p className="mt-12 text-caption text-text-secondary">{quarter.label}</p>
            <p className="mt-6 break-words text-label tabular-nums">
              <span className="sr-only">{t("earnings.actual")} </span>
              {quarter.actual}
            </p>
            <p className="mt-4 break-words text-caption tabular-nums text-text-secondary">
              <span className="sr-only">{t("earnings.estimate")} </span>
              {quarter.estimate}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-16 text-caption text-text-muted">{view.basis}</p>
    </div>
  );
}
