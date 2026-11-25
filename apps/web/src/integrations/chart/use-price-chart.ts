import type { Bar, Range, Session } from "@mini/contracts";
import type { Direction } from "@mini/core";
import { chart, type Theme } from "@mini/tokens";
import type { AutoscaleInfoProvider } from "lightweight-charts";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useMediaQuery } from "../use-media-query.ts";
import { chartOptions, seriesOptions, type ChartFormatters } from "./chart-options.ts";
import {
  placeOverlays,
  useChartParts,
  useDisposeChart,
  type ChartParts,
  type OverlayRefs,
  type OverlayState,
} from "./chart-parts.ts";
import { liveTail, sessionSlots, toChartPoints, type ChartPoint } from "./chart-points.ts";
import { useChartScrub, type ScrubHandles, type ScrubListener } from "./use-chart-scrub.ts";

export interface PriceChartInput {
  readonly datasetKey: string;
  readonly bars: readonly Bar[];
  readonly range: Range;
  readonly session: Session | undefined;
  readonly previousClose: string | undefined;
  readonly direction: Direction;
  readonly muted: boolean;
  readonly formatters: ChartFormatters;
  readonly onScrub: ScrubListener;
}

export interface PriceChartHandles {
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly overlays: OverlayRefs;
  readonly drawn: boolean;
  readonly scrub: ScrubHandles;
}

function fitRange(parts: ChartParts, slotCount: number) {
  const timeScale = parts.api.timeScale();
  if (slotCount === 0) timeScale.fitContent();
  else timeScale.setVisibleLogicalRange({ from: 0, to: slotCount - 1 });
}

interface Applied {
  key: string;
  points: ChartPoint[];
}

function useChartData(
  parts: ChartParts | null,
  input: PriceChartInput,
  refs: OverlayRefs,
  latestRef: RefObject<OverlayState>,
) {
  const applied = useRef<Applied>({ key: "", points: [] });
  const { datasetKey, bars, range, session, previousClose, muted } = input;
  useEffect(() => {
    if (parts === null) return undefined;
    const points = toChartPoints(bars, range);
    const key = `${datasetKey}:${session?.open ?? ""}`;
    const previous = applied.current;
    const tail = previous.key === key ? liveTail(previous.points, points) : -1;
    if (tail < 0) {
      parts.area.setData(points);
      const slots = sessionSlots(session);
      parts.slots.setData(slots);
      fitRange(parts, slots.length);
    } else {
      for (const point of points.slice(tail)) parts.area.update(point);
    }
    applied.current = { key, points };
    const state = {
      points,
      previousClose: previousClose === undefined ? undefined : Number(previousClose),
      livePoint: !muted,
    };
    latestRef.current = state;
    const place = () => placeOverlays(parts, refs, state);
    place();
    const frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [parts, datasetKey, bars, range, session, previousClose, muted, refs, latestRef]);

  useEffect(() => {
    if (parts === null) return undefined;
    let frame = 0;
    const place = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => placeOverlays(parts, refs, latestRef.current));
    };
    const timeScale = parts.api.timeScale();
    const observer = new ResizeObserver(place);
    observer.observe(parts.api.chartElement());
    timeScale.subscribeSizeChange(place);
    timeScale.subscribeVisibleLogicalRangeChange(place);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      timeScale.unsubscribeSizeChange(place);
      timeScale.unsubscribeVisibleLogicalRangeChange(place);
    };
  }, [parts, refs, latestRef]);
}

function useChartStyle(
  parts: ChartParts | null,
  containerRef: RefObject<HTMLDivElement | null>,
  theme: Theme,
  input: PriceChartInput,
) {
  const { direction, muted, formatters, range } = input;
  useEffect(() => {
    const container = containerRef.current;
    if (parts === null || container === null) return;
    const font = getComputedStyle(container).fontFamily;
    parts.api.applyOptions(chartOptions(theme, font, formatters, range === "1D"));
  }, [parts, containerRef, theme, formatters, range]);

  useEffect(() => {
    parts?.area.applyOptions(seriesOptions(theme, direction, muted));
  }, [parts, theme, direction, muted]);
}

function usePreviousCloseLine(
  parts: ChartParts | null,
  theme: Theme,
  previousClose: string | undefined,
) {
  useEffect(() => {
    if (parts === null || previousClose === undefined) return undefined;
    const price = Number(previousClose);
    const line = parts.area.createPriceLine({
      price,
      color: chart[theme].previousClose,
      lineWidth: 1,
      lineStyle: parts.dashed,
      axisLabelVisible: false,
    });
    const includePreviousClose: AutoscaleInfoProvider = (original) => {
      const info = original();
      if (info === null || info.priceRange === null) return info;
      const { minValue, maxValue } = info.priceRange;
      const priceRange = {
        minValue: Math.min(minValue, price),
        maxValue: Math.max(maxValue, price),
      };
      return { ...info, priceRange };
    };
    parts.area.applyOptions({ autoscaleInfoProvider: includePreviousClose });
    return () => {
      parts.area.removePriceLine(line);
      parts.area.applyOptions({ autoscaleInfoProvider: null });
    };
  }, [parts, theme, previousClose]);
}

export function usePriceChart(input: PriceChartInput): PriceChartHandles {
  const containerRef = useRef<HTMLDivElement>(null);
  const livePoint = useRef<HTMLSpanElement>(null);
  const previousClose = useRef<HTMLSpanElement>(null);
  const latestRef = useRef<OverlayState>({ points: [], previousClose: undefined, livePoint: true });
  const [overlays] = useState<OverlayRefs>(() => ({ livePoint, previousClose }));
  const theme: Theme = useMediaQuery("(prefers-color-scheme: dark)") ? "dark" : "light";
  const parts = useChartParts(containerRef);
  useChartStyle(parts, containerRef, theme, input);
  usePreviousCloseLine(parts, theme, input.previousClose);
  useChartData(parts, input, overlays, latestRef);
  const scrub = useChartScrub(parts, latestRef, input.datasetKey, input.onScrub);
  useDisposeChart(parts);
  return { containerRef, overlays, drawn: parts !== null, scrub };
}
