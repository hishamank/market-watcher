import { useT, type StockEarningsView } from "@mini/core";

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
        className="mt-24 grid"
        style={{ gridTemplateColumns: `64px repeat(${view.quarters.length}, minmax(0, 1fr))` }}
      >
        <div className="grid grid-rows-[136px_44px_32px_32px] md:grid-rows-[160px_44px_32px_32px]">
          <div />
          <div />
          <div className="flex items-center gap-6 border-t border-border text-caption text-text-secondary">
            <span aria-hidden="true" className="size-[6px] shrink-0 rounded-[1px] bg-text" />
            <bdi>{t("earnings.actual")}</bdi>
          </div>
          <div className="flex items-center gap-6 text-caption text-text-secondary">
            <span
              aria-hidden="true"
              className="size-[6px] shrink-0 rounded-[1px] border border-border-strong"
            />
            <bdi>{t("earnings.estimate")}</bdi>
          </div>
        </div>
        {view.quarters.map((quarter) => (
          <div
            key={quarter.id}
            data-testid="earnings-quarter"
            className="grid min-w-0 grid-rows-[136px_44px_32px_32px] text-center md:grid-rows-[160px_44px_32px_32px]"
          >
            <div aria-hidden="true" className="relative">
              <div
                className="absolute inset-x-0 border-t border-border"
                style={{ bottom: `${view.zero}%` }}
              />
              {quarter.estimateBar && (
                <div
                  className="absolute start-1/2 ms-[3px] w-[14px] md:w-[20px] rounded-[3px] border border-border-strong bg-fill"
                  style={{
                    bottom: `${quarter.estimateBar.bottom}%`,
                    height: `${quarter.estimateBar.height}%`,
                  }}
                />
              )}
              {quarter.actualBar && (
                <div
                  className="absolute start-1/2 -ms-[17px] md:-ms-[23px] w-[14px] md:w-[20px] rounded-[3px] bg-text"
                  style={{
                    bottom: `${quarter.actualBar.bottom}%`,
                    height: `${quarter.actualBar.height}%`,
                  }}
                />
              )}
            </div>
            <p className="flex items-center justify-center px-4 text-caption text-text-secondary">
              {quarter.label}
            </p>
            <p className="flex items-center justify-center border-t border-border text-label tabular-nums">
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
      <p className="mt-16 text-caption text-text-muted">{view.basis}</p>
    </div>
  );
}
