import { useT, type StockEarningsView } from "@mini/core";
import { EarningsChart } from "./earnings-chart.tsx";

type ReadyEarnings = Extract<StockEarningsView, { status: "ready" }>;

export function EarningsContent({ view }: { view: ReadyEarnings }) {
  const t = useT();
  return (
    <>
      <div
        className={
          view.quarters.length ? "mt-24 grid xl:grid-cols-[200px_minmax(0,1fr)] xl:gap-32" : "mt-24"
        }
      >
        <dl className="grid grid-cols-2 gap-x-20 gap-y-24 md:gap-x-32 xl:grid-cols-1">
          {view.latest && (
            <div data-testid="earnings-latest" className="min-w-0">
              <dt className="text-caption text-text-secondary">{t("earnings.latest")}</dt>
              <dd
                dir="ltr"
                className="mt-8 text-[32px] leading-[40px] font-semibold tracking-tight tabular-nums"
              >
                {view.latest.actual}
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
                  ? "min-w-0 border-s border-border ps-20 md:ps-32 xl:border-s-0 xl:border-t xl:ps-0 xl:pt-20"
                  : "col-span-2 xl:col-span-1"
              }
            >
              <dt className="text-caption text-text-secondary">{t("earnings.next")}</dt>
              <dd className="mt-12 text-body-strong leading-relaxed md:text-heading-md">
                {view.next.date}
              </dd>
              <dd className="mt-8 inline-flex rounded-pill border border-border px-8 py-4 text-caption text-text-secondary">
                {view.next.confidence}
              </dd>
            </div>
          )}
        </dl>
        {view.quarters.length > 0 && <EarningsChart view={view} />}
      </div>
      <div
        data-testid="earnings-source"
        className="mt-20 flex flex-wrap gap-x-8 gap-y-4 text-caption text-text-muted"
      >
        <span>{view.attribution}</span>
        {view.retrieved && <span>{view.retrieved}</span>}
      </div>
    </>
  );
}
