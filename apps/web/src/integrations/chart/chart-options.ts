import type { Direction } from "@mini/core";
import { chart, chartArea, color, type Theme } from "@mini/tokens";
import type {
  AreaSeriesPartialOptions,
  ChartOptions,
  DeepPartial,
  TickMarkFormatter,
} from "lightweight-charts";

export interface ChartFormatters {
  readonly time: (epochMs: number) => string;
  readonly tick: (epochMs: number, kind: "year" | "date" | "time") => string;
}

function withAlpha(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${alpha}`;
}

export function lineColor(theme: Theme, direction: Direction): string {
  return direction === "down" ? chart[theme].lossLine : chart[theme].gainLine;
}

export function seriesOptions(theme: Theme, direction: Direction): AreaSeriesPartialOptions {
  const line = lineColor(theme, direction);
  return {
    lineColor: line,
    lineWidth: 2,
    topColor: withAlpha(line, chartArea.topOpacity),
    bottomColor: withAlpha(line, chartArea.bottomOpacity),
    priceLineVisible: false,
    lastValueVisible: false,
    crosshairMarkerVisible: false,
  };
}

function tickFormatter(formatters: ChartFormatters, timeOnly: boolean): TickMarkFormatter {
  return (time, tickType) => {
    const epochMs = Number(time) * 1000;
    if (timeOnly) return formatters.tick(epochMs, "time");
    if (tickType === 0) return formatters.tick(epochMs, "year");
    return formatters.tick(epochMs, tickType >= 3 ? "time" : "date");
  };
}

export function themeOptions(theme: Theme, fontFamily: string): DeepPartial<ChartOptions> {
  return {
    layout: {
      background: { color: "transparent" },
      textColor: color[theme].textMuted,
      fontFamily,
      fontSize: 11,
    },
    grid: { vertLines: { visible: false }, horzLines: { color: chart[theme].grid } },
    crosshair: {
      vertLine: { color: chart[theme].crosshair, labelVisible: false },
      horzLine: { visible: false, labelVisible: false },
    },
    timeScale: { borderVisible: false },
  };
}

export function chartOptions(
  theme: Theme,
  fontFamily: string,
  formatters: ChartFormatters,
  timeOnly: boolean,
): DeepPartial<ChartOptions> {
  const themed = themeOptions(theme, fontFamily);
  return {
    ...themed,
    autoSize: true,
    handleScroll: false,
    handleScale: false,
    rightPriceScale: { visible: false },
    leftPriceScale: { visible: false },
    localization: {
      locale: "en-US",
      timeFormatter: (time: number) => formatters.time(time * 1000),
    },
    timeScale: {
      ...themed.timeScale,
      lockVisibleTimeRangeOnResize: true,
      timeVisible: true,
      tickMarkFormatter: tickFormatter(formatters, timeOnly),
    },
    layout: { ...themed.layout, attributionLogo: true },
  };
}
