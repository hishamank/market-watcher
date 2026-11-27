import type { Change } from "@mini/contracts";
import {
  directionOf,
  formatPrice,
  formatSignedAmount,
  formatSignedPercent,
  useT,
  type Direction,
} from "@mini/core";
import { Button } from "./button.tsx";
import { AlertIcon, ClockIcon, DirectionIcon, SpinnerIcon } from "./icons.tsx";
import { Skeleton } from "./skeleton.tsx";

export interface ChartReadoutValue {
  readonly time: string;
  readonly price: string;
  readonly change: Change;
  readonly fraction: number;
}

const changeTones: Record<Direction, string> = {
  up: "text-gain",
  down: "text-loss",
  flat: "text-flat",
};

export function ChartSkeleton() {
  return (
    <div className="absolute inset-0 flex flex-col">
      <Skeleton className="flex-1 rounded-lg" />
      <span className="flex h-[24px] items-center justify-between">
        <Skeleton className="h-[10px] w-[40px]" />
        <Skeleton className="h-[10px] w-[40px]" />
        <Skeleton className="h-[10px] w-[56px]" />
      </span>
    </div>
  );
}

export function ChartUpdating() {
  return (
    <div
      aria-hidden="true"
      data-testid="chart-updating"
      className="pointer-events-none absolute inset-0 grid animate-delayed-fade-in place-items-center"
    >
      <span className="grid size-[40px] place-items-center rounded-full border border-border bg-raised text-text-secondary shadow-2">
        <SpinnerIcon className="motion-safe:animate-spin" />
      </span>
    </div>
  );
}

export function ChartError({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <div className="absolute start-0 end-0 top-0 flex h-[176px] flex-col items-center justify-center gap-6 rounded-lg border border-dashed border-border-strong text-center md:h-[320px]">
      <AlertIcon className="text-error" />
      <p className="text-label">{t("detail.chart.error")}</p>
      <div className="mt-4">
        <Button testId="chart-retry" onClick={onRetry} compact>
          {t("detail.chart.retry")}
        </Button>
      </div>
    </div>
  );
}

export function ChartAsOf({ label }: { label: string }) {
  return (
    <span
      data-testid="chart-as-of"
      className="absolute start-0 top-[4px] inline-flex items-center gap-6 rounded-pill bg-stale-tint px-10 py-[3px] text-caption font-medium text-text"
    >
      <ClockIcon className="text-stale" />
      {label}
    </span>
  );
}

export function ChartReadout({ value }: { value: ChartReadoutValue | undefined }) {
  const direction = value === undefined ? "flat" : directionOf(value.change.change);
  const share = `${(value?.fraction ?? 0) * 100}%`;
  return (
    <span aria-live="polite" className="pointer-events-none absolute inset-0">
      {value === undefined ? null : (
        <span
          data-testid="chart-readout"
          style={{ insetInlineStart: share, transform: `translateX(-${share})` }}
          className="absolute top-[2px] flex items-center gap-8 rounded-[10px] border border-border bg-raised px-10 py-[5px] text-caption whitespace-nowrap shadow-2"
        >
          <span className="text-text-secondary">{value.time}</span>
          <span className="font-semibold text-text">{formatPrice(value.price)}</span>
          <span className={`inline-flex items-center gap-[5px] ${changeTones[direction]}`}>
            <DirectionIcon direction={direction} />
            {`${formatSignedAmount(value.change.change)} (${formatSignedPercent(value.change.changePercent)})`}
          </span>
        </span>
      )}
    </span>
  );
}
