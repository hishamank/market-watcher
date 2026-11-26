import { useT, type StockEarningsView } from "@mini/core";
import { EarningsPlot } from "./earnings-plot.tsx";

type ReadyEarnings = Extract<StockEarningsView, { status: "ready" }>;

export function EarningsChart({ view }: { view: ReadyEarnings }) {
  const t = useT();
  return (
    <div
      data-testid="earnings-chart"
      className="mt-24 border-t border-border pt-20 xl:mt-0 xl:border-t-0 xl:border-s xl:ps-32 xl:pt-0"
    >
      <h3 className="text-label">{t("earnings.history")}</h3>
      <div
        dir="ltr"
        className="mt-24 grid [--label-width:56px] md:[--label-width:72px]"
        style={{
          gridTemplateColumns: `var(--label-width) repeat(${view.quarters.length}, minmax(0, 1fr))`,
        }}
      >
        <div className="grid grid-rows-[136px_44px_32px_32px] md:grid-rows-[160px_44px_32px_32px]">
          <div />
          <div />
          <div className="flex items-center gap-4 border-t border-border text-caption text-text-secondary">
            <span aria-hidden="true" className="size-[8px] shrink-0 rounded-[1px] bg-text" />
            <bdi>{t("earnings.actual")}</bdi>
          </div>
          <div className="flex items-center gap-4 text-caption text-text-secondary">
            <span
              aria-hidden="true"
              className="size-[8px] shrink-0 rounded-[1px] border border-border-strong bg-fill"
            />
            <bdi>{t("earnings.estimateShort")}</bdi>
          </div>
        </div>
        {view.quarters.map((quarter) => (
          <div
            key={quarter.id}
            data-testid="earnings-quarter"
            className="grid min-w-0 grid-rows-[136px_44px_32px_32px] text-center md:grid-rows-[160px_44px_32px_32px]"
          >
            <EarningsPlot quarter={quarter} zero={view.zero} />
            <p className="flex items-center justify-center px-4 text-caption text-text-secondary">
              {quarter.label}
            </p>
            <p className="flex items-center justify-center border-t border-border text-caption font-medium tabular-nums md:text-label">
              <span className="sr-only">{t("earnings.actual")} </span>
              {quarter.actual}
            </p>
            <p className="flex items-center justify-center text-caption tabular-nums text-text-secondary">
              <span className="sr-only">{t("earnings.estimate")} </span>
              {quarter.estimate}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-12 text-caption text-text-muted">{view.basis}</p>
    </div>
  );
}
