import type { Direction } from "@mini/core";
import type { RefObject } from "react";
import { Skeleton } from "./skeleton.tsx";

export type ChartState = "loading" | "ready" | "error";

export interface PriceChartProps {
  state: ChartState;
  direction: Direction;
  drawn: boolean;
  label: string;
  previousCloseLabel: string | undefined;
  containerRef: RefObject<HTMLDivElement | null>;
  livePointRef: RefObject<HTMLSpanElement | null>;
  previousCloseRef: RefObject<HTMLSpanElement | null>;
}

const pointTones: Record<Direction, string> = {
  up: "text-chart-gain-line",
  down: "text-chart-loss-line",
  flat: "text-chart-gain-line",
};

function ChartSkeleton() {
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

export function PriceChart(props: PriceChartProps) {
  const { state, direction, drawn } = props;
  const showSkeleton = !drawn || state === "loading";
  return (
    <div className="pt-[36px]">
      <div
        dir="ltr"
        role="img"
        aria-label={props.label}
        data-testid="price-chart"
        data-state={state}
        data-direction={direction}
        className="relative h-[200px] md:h-[344px]"
      >
        <div
          ref={props.containerRef}
          className={`absolute inset-0 ${showSkeleton ? "invisible" : ""}`}
        />
        <span
          ref={props.livePointRef}
          data-testid="chart-last-price"
          aria-hidden="true"
          className={`pointer-events-none invisible absolute start-0 top-0 ${pointTones[direction]} ${showSkeleton ? "hidden" : ""}`}
        >
          <span className="absolute size-[20px] -translate-1/2 rounded-full bg-current opacity-[0.22]" />
          <span className="absolute size-[8px] -translate-1/2 rounded-full bg-current" />
        </span>
        {props.previousCloseLabel === undefined || showSkeleton ? null : (
          <span
            ref={props.previousCloseRef}
            className="pointer-events-none invisible absolute end-0 top-0 rounded-pill border border-border bg-surface px-8 py-2 text-numeric-axis text-text-secondary"
          >
            {props.previousCloseLabel}
          </span>
        )}
        {showSkeleton ? <ChartSkeleton /> : null}
      </div>
    </div>
  );
}
