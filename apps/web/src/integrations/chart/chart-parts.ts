import type { IChartApi, ISeriesApi } from "lightweight-charts";
import { useEffect, useState, type RefObject } from "react";
import type { ChartPoint } from "./chart-points.ts";

export interface ChartParts {
  readonly api: IChartApi;
  readonly area: ISeriesApi<"Area">;
  readonly slots: ISeriesApi<"Line">;
  readonly dashed: number;
}

export interface OverlayRefs {
  readonly livePoint: RefObject<HTMLSpanElement | null>;
  readonly previousClose: RefObject<HTMLSpanElement | null>;
}

export interface OverlayState {
  points: readonly ChartPoint[];
  previousClose: number | undefined;
}

export function useChartParts(containerRef: RefObject<HTMLDivElement | null>): ChartParts | null {
  const [parts, setParts] = useState<ChartParts | null>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return undefined;
    let disposed = false;
    void import("lightweight-charts").then((lib) => {
      if (disposed) return;
      const api = lib.createChart(container, { autoSize: true });
      const area = api.addSeries(lib.AreaSeries);
      const slots = api.addSeries(lib.LineSeries, { visible: false });
      setParts({ api, area, slots, dashed: lib.LineStyle.Dashed });
    });
    return () => {
      disposed = true;
    };
  }, [containerRef]);
  return parts;
}

export function useDisposeChart(parts: ChartParts | null) {
  useEffect(() => () => parts?.api.remove(), [parts]);
}

function placeLivePoint(parts: ChartParts, node: HTMLSpanElement | null, point?: ChartPoint) {
  if (node === null) return;
  node.dataset.price = point?.close ?? "";
  const x = point === undefined ? null : parts.api.timeScale().timeToCoordinate(point.time);
  const y = point === undefined ? null : parts.area.priceToCoordinate(point.value);
  node.style.visibility = x === null || y === null ? "hidden" : "visible";
  node.style.transform = `translate(${x ?? 0}px, ${y ?? 0}px)`;
}

function placePreviousClose(parts: ChartParts, node: HTMLSpanElement | null, price?: number) {
  if (node === null) return;
  const y = price === undefined ? null : parts.area.priceToCoordinate(price);
  node.style.visibility = y === null ? "hidden" : "visible";
  node.style.transform = `translateY(${y ?? 0}px) translateY(-50%)`;
}

export function placeOverlays(parts: ChartParts, refs: OverlayRefs, state: OverlayState) {
  placeLivePoint(parts, refs.livePoint.current, state.points.at(-1));
  placePreviousClose(parts, refs.previousClose.current, state.previousClose);
}
