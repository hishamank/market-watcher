import { describe, expect, it } from "vitest";
import { plotGeometryOf } from "./plot-points.ts";

const bars = [
  { time: 1_000, close: "10.00" },
  { time: 5_000, close: "11.00" },
  { time: 9_000, close: "12.00" },
];

describe("plotGeometryOf", () => {
  it("plots non-1D bars by index over [0, N-1], so drawing and touch share one domain", () => {
    expect(plotGeometryOf(bars, undefined)).toEqual({
      points: [
        { timestamp: 0, value: 10 },
        { timestamp: 1, value: 11 },
        { timestamp: 2, value: 12 },
      ],
      xDomain: [0, 2],
    });
  });

  it("keeps real times over the session domain on 1D", () => {
    expect(plotGeometryOf(bars, [0, 10_000])).toEqual({
      points: [
        { timestamp: 1_000, value: 10 },
        { timestamp: 5_000, value: 11 },
        { timestamp: 9_000, value: 12 },
      ],
      xDomain: [0, 10_000],
    });
  });

  it("gives a single bar a non-empty domain", () => {
    expect(plotGeometryOf(bars.slice(0, 1), undefined).xDomain).toEqual([0, 1]);
  });
});
