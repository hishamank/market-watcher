import { useT, type StockEarningsView } from "@mini/core";
import { EarningsChart } from "./earnings-chart.tsx";

type ReadyEarnings = Extract<StockEarningsView, { status: "ready" }>;

export function EarningsContent({ view }: { view: ReadyEarnings }) {
  const t = useT();
  const hasSummary = Boolean(view.latest || view.next);
  return (
    <>
      <div
        className={
          view.quarters.length && hasSummary
            ? "mt-24 grid xl:grid-cols-[224px_minmax(0,1fr)] xl:gap-32"
            : "mt-24"
        }
      >
        {hasSummary && (
          <dl className="grid content-start grid-cols-2 gap-x-20 gap-y-24 md:gap-x-32 xl:grid-cols-1">
            {view.latest && (
              <div data-testid="earnings-latest" className="min-w-0">
                <dt className="text-caption text-text-secondary">{t("earnings.latest")}</dt>
                <dd className="mt-8 text-[32px] leading-[40px] font-semibold tracking-tight tabular-nums">
                  <bdi dir="ltr">{view.latest.actual}</bdi>
                </dd>
                <dd className="mt-4 text-caption text-text-secondary">
                  {t("earnings.estimate")} <bdi dir="ltr">{view.latest.estimate}</bdi>
                </dd>
                <dd className="mt-8 text-caption text-text-muted">{view.latest.quarter}</dd>
              </div>
            )}
            {view.next && (
              <div
                data-testid="earnings-next"
                className={
                  view.latest
                    ? view.next.needsWideSummary
                      ? "col-span-2 min-w-0 border-t border-border pt-20 md:col-span-1 md:border-t-0 md:border-s md:ps-32 md:pt-0 xl:border-s-0 xl:border-t xl:ps-0 xl:pt-20"
                      : "min-w-0 border-s border-border ps-20 md:ps-32 xl:border-s-0 xl:border-t xl:ps-0 xl:pt-20"
                    : "col-span-2 xl:col-span-1"
                }
              >
                <dt className="text-caption text-text-secondary">{t("earnings.next")}</dt>
                <dd className="mt-12 flex flex-wrap gap-x-6 text-body-strong leading-relaxed md:text-heading-md">
                  {view.next.dates.map((date, index, dates) => (
                    <span key={date} className="whitespace-nowrap">
                      {date}
                      {index < dates.length - 1 ? " – " : ""}
                    </span>
                  ))}
                </dd>
                <dd className="mt-8 inline-flex whitespace-nowrap rounded-pill border border-border px-8 py-4 text-caption text-text-secondary">
                  {view.next.confidence}
                </dd>
              </div>
            )}
          </dl>
        )}
        {view.quarters.length > 0 && <EarningsChart view={view} />}
      </div>
      <p data-testid="earnings-source" className="mt-12 text-caption text-text-muted">
        {view.attribution}
        {view.retrieved ? `\u00a0· ${view.retrieved}` : ""}
      </p>
    </>
  );
}
