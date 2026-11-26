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
  readonly plot: RefObject<HTMLDivElement | null>;
}

export interface OverlayState {
  points: readonly ChartPoint[];
  previousClose: number | undefined;
  livePoint: boolean;
  future: boolean;
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

function placeLivePoint(
  parts: ChartParts,
  node: HTMLSpanElement | null,
  point: ChartPoint | undefined,
  shown: boolean,
) {
  if (node === null) return;
  node.dataset.price = point?.close ?? "";
  const x = point === undefined ? null : parts.api.timeScale().timeToCoordinate(point.time);
  const y = point === undefined ? null : parts.area.priceToCoordinate(point.value);
  node.style.visibility = !shown || x === null || y === null ? "hidden" : "visible";
  node.style.transform = `translate(${x ?? 0}px, ${y ?? 0}px)`;
}

function placePreviousClose(parts: ChartParts, node: HTMLSpanElement | null, price?: number) {
  if (node === null) return;
  const y = price === undefined ? null : parts.area.priceToCoordinate(price);
  node.style.visibility = y === null ? "hidden" : "visible";
  node.style.transform = `translateY(${y ?? 0}px) translateY(-50%)`;
}

function placePlot(parts: ChartParts, node: HTMLDivElement | null, state: OverlayState) {
  if (node === null) return;
  const height = parts.api.chartElement().clientHeight - parts.api.timeScale().height();
  const last = state.points.at(-1);
  const x = last === undefined ? null : parts.api.timeScale().timeToCoordinate(last.time);
  node.style.height = `${Math.max(0, height)}px`;
  node.style.setProperty("--future-x", `${x ?? 0}px`);
  node.dataset.future = String(state.future && state.livePoint && x !== null);
}

export function placeOverlays(parts: ChartParts, refs: OverlayRefs, state: OverlayState) {
  placePlot(parts, refs.plot.current, state);
  placeLivePoint(parts, refs.livePoint.current, state.points.at(-1), state.livePoint);
  placePreviousClose(parts, refs.previousClose.current, state.previousClose);
}
