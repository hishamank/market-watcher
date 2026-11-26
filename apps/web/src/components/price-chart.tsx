import type { Direction } from "@mini/core";
import type { KeyboardEvent, RefObject } from "react";
import {
  ChartAsOf,
  ChartError,
  ChartReadout,
  ChartSkeleton,
  type ChartReadoutValue,
} from "./chart-states.tsx";

export type ChartState = "loading" | "ready" | "error";

export interface PriceChartProps {
  state: ChartState;
  direction: Direction;
  drawn: boolean;
  label: string;
  previousCloseLabel: string | undefined;
  asOfLabel: string | undefined;
  readout: ChartReadoutValue | undefined;
  onRetry: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onBlur: () => void;
  containerRef: RefObject<HTMLDivElement | null>;
  livePointRef: RefObject<HTMLSpanElement | null>;
  plotRef: RefObject<HTMLDivElement | null>;
}

const pointTones: Record<Direction, string> = {
  up: "text-chart-gain-line",
  down: "text-chart-loss-line",
  flat: "text-chart-gain-line",
};

export function PriceChart(props: PriceChartProps) {
  const { state, direction, drawn } = props;
  const showSkeleton = state === "loading" || (state === "ready" && !drawn);
  const showChart = state === "ready" && drawn;
  return (
    <div dir="ltr" className="relative pt-[36px]">
      <div className="absolute start-0 end-0 top-0 h-[36px]">
        {showChart && props.asOfLabel !== undefined ? <ChartAsOf label={props.asOfLabel} /> : null}
        {showChart && props.previousCloseLabel !== undefined && props.readout === undefined ? (
          <span className="absolute end-0 top-[4px] py-[3px] text-caption text-text-muted">
            {props.previousCloseLabel}
          </span>
        ) : null}
        <ChartReadout value={showChart ? props.readout : undefined} />
      </div>
      <div
        role="application"
        aria-label={props.label}
        tabIndex={showChart ? 0 : undefined}
        onKeyDown={props.onKeyDown}
        onBlur={props.onBlur}
        data-testid="price-chart"
        data-state={state}
        data-direction={direction}
        className="relative h-[200px] rounded-lg md:h-[344px]"
      >
        <div
          ref={props.plotRef}
          aria-hidden="true"
          className={`group pointer-events-none absolute start-0 end-0 top-0 overflow-hidden ${showChart ? "" : "invisible"}`}
        >
          <span className="absolute inset-x-0 top-1/3 border-t border-chart-grid" />
          <span className="absolute inset-x-0 top-2/3 border-t border-chart-grid" />
          <span className="absolute inset-y-0 start-0 hidden w-full translate-x-(--future-x) bg-fill/35 group-data-[future=true]:block" />
        </div>
        <div
          ref={props.containerRef}
          className={`absolute inset-0 ${showChart ? "" : "invisible"}`}
        />
        <span
          ref={props.livePointRef}
          data-testid="chart-last-price"
          aria-hidden="true"
          className={`pointer-events-none invisible absolute start-0 top-0 ${pointTones[direction]} ${showChart ? "" : "hidden"}`}
        >
          <span className="absolute size-[20px] -translate-1/2 rounded-full bg-current opacity-[0.22]" />
          <span className="absolute size-[20px] -translate-1/2 rounded-full bg-current opacity-0 motion-safe:animate-halo" />
          <span className="absolute size-[8px] -translate-1/2 rounded-full bg-current" />
        </span>
        {showSkeleton ? <ChartSkeleton /> : null}
        {state === "error" ? <ChartError onRetry={props.onRetry} /> : null}
      </div>
    </div>
  );
}
