import type { MouseEventParams } from "lightweight-charts";
import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import type { ChartParts, OverlayState } from "./chart-parts.ts";
import type { ChartPoint } from "./chart-points.ts";

export interface ScrubPoint {
  readonly time: number;
  readonly close: string;
  readonly fraction: number;
}

export type ScrubListener = (point: ScrubPoint | undefined) => void;

export interface ScrubHandles {
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly onBlur: () => void;
}

const STEPS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };

function nearestIndex(points: readonly ChartPoint[], time: number): number {
  let index = 0;
  while (index + 1 < points.length && (points[index + 1]?.time ?? Infinity) <= time) index += 1;
  return index;
}

function scrubAt(parts: ChartParts, point: ChartPoint): ScrubPoint {
  const timeScale = parts.api.timeScale();
  const x = timeScale.timeToCoordinate(point.time) ?? 0;
  const width = timeScale.width();
  const fraction = width > 0 ? Math.min(1, Math.max(0, x / width)) : 0;
  return { time: point.at, close: point.close, fraction };
}

export function useChartScrub(
  parts: ChartParts | null,
  latestRef: RefObject<OverlayState>,
  datasetKey: string,
  onScrub: ScrubListener,
): ScrubHandles {
  const index = useRef<number | undefined>(undefined);

  useEffect(() => {
    index.current = undefined;
  }, [datasetKey]);

  useEffect(() => {
    if (parts === null) return undefined;
    const handle = (param: MouseEventParams) => {
      if (param.point !== undefined && param.sourceEvent === undefined) return;
      const { points } = latestRef.current;
      if (param.point === undefined || param.time === undefined || points.length === 0) {
        index.current = undefined;
        onScrub(undefined);
        return;
      }
      index.current = nearestIndex(points, Number(param.time));
      const point = points[index.current];
      onScrub(point === undefined ? undefined : scrubAt(parts, point));
    };
    parts.api.subscribeCrosshairMove(handle);
    return () => parts.api.unsubscribeCrosshairMove(handle);
  }, [parts, latestRef, onScrub]);

  return {
    onKeyDown: (event) => {
      const step = STEPS[event.key];
      const { points } = latestRef.current;
      if (step === undefined || parts === null || points.length === 0) return;
      event.preventDefault();
      const last = points.length - 1;
      const next = Math.min(last, Math.max(0, (index.current ?? last + 1) + step));
      const point = points[next];
      if (point === undefined) return;
      index.current = next;
      parts.api.setCrosshairPosition(point.value, point.time, parts.area);
      onScrub(scrubAt(parts, point));
    },
    onBlur: () => {
      index.current = undefined;
      parts?.api.clearCrosshairPosition();
      onScrub(undefined);
    },
  };
}
