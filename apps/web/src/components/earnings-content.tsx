import { useT, type StockEarningsView } from "@mini/core";
import { EarningsChart } from "./earnings-chart.tsx";

type ReadyEarnings = Extract<StockEarningsView, { status: "ready" }>;

export function EarningsContent({ view }: { view: ReadyEarnings }) {
  const t = useT();
  return (
    <>
      <dl className="mt-20 flex flex-wrap gap-x-40 gap-y-20">
        {view.next && (
          <div data-testid="earnings-next">
            <dt className="text-caption text-text-secondary">{t("earnings.next")}</dt>
            <dd className="mt-8 text-body-strong">{view.next.date}</dd>
            <dd className="mt-4 text-caption text-text-muted">{view.next.confidence}</dd>
          </div>
        )}
        {view.latest && (
          <div data-testid="earnings-latest">
            <dt className="text-caption text-text-secondary">
              {t("earnings.latest")} · {view.latest.quarter}
            </dt>
            <dd dir="ltr" className="mt-8 text-heading-md tabular-nums">
              {view.latest.actual}
            </dd>
            <dd className="mt-4 text-caption text-text-secondary">
              {t("earnings.estimate")} <bdi dir="ltr">{view.latest.estimate}</bdi>
            </dd>
          </div>
        )}
      </dl>
      {view.quarters.length > 0 && <EarningsChart view={view} />}
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
