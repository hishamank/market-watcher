import type { StockEarningsView } from "@mini/core";

type ReadyEarnings = Extract<StockEarningsView, { status: "ready" }>;

export function EarningsPlot({
  quarter,
  zero,
}: {
  quarter: ReadyEarnings["quarters"][number];
  zero: number;
}) {
  return (
    <div aria-hidden="true" className="relative">
      <div className="absolute inset-x-0 inset-y-8">
        <div className="absolute inset-x-0 border-t border-border" style={{ bottom: `${zero}%` }} />
        {quarter.estimateBar && (
          <div
            className="absolute start-1/2 ms-[3px] min-h-[2px] w-[14px] rounded-[3px] border border-border-strong bg-fill md:w-[24px]"
            style={{
              bottom: `${quarter.estimateBar.bottom}%`,
              height: `${quarter.estimateBar.height}%`,
            }}
          />
        )}
        {quarter.actualBar && (
          <div
            className="absolute start-1/2 -ms-[17px] min-h-[2px] w-[14px] rounded-[3px] bg-text md:-ms-[27px] md:w-[24px]"
            style={{
              bottom: `${quarter.actualBar.bottom}%`,
              height: `${quarter.actualBar.height}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}
