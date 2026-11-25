import type { Bar } from "@mini/contracts";

export interface PlotPoint {
  readonly timestamp: number;
  readonly value: number;
}

export interface PlotGeometry {
  readonly points: PlotPoint[];
  readonly xDomain: [number, number];
}

export function plotGeometryOf(
  bars: readonly Bar[],
  sessionDomain: [number, number] | undefined,
): PlotGeometry {
  if (sessionDomain !== undefined) {
    return {
      points: bars.map((bar) => ({ timestamp: bar.time, value: Number(bar.close) })),
      xDomain: sessionDomain,
    };
  }
  return {
    points: bars.map((bar, index) => ({ timestamp: index, value: Number(bar.close) })),
    xDomain: [0, Math.max(bars.length - 1, 1)],
  };
}
