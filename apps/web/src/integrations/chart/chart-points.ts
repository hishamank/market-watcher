import {
  BAR_SIZE_BY_RANGE,
  type Bar,
  type BarSize,
  type Range,
  type Session,
} from "@mini/contracts";
import type { UTCTimestamp } from "lightweight-charts";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const MONDAY_OFFSET_MS = 4 * DAY_MS;

const SLOT_MS: Readonly<Record<BarSize, number>> = {
  "5m": 5 * MINUTE_MS,
  "30m": 30 * MINUTE_MS,
  "1h": 60 * MINUTE_MS,
  "1d": DAY_MS,
  "1w": 7 * DAY_MS,
};

export interface ChartPoint {
  readonly time: UTCTimestamp;
  readonly value: number;
  readonly close: string;
}

function slotOf(timeMs: number, barSize: BarSize): number {
  const offset = barSize === "1w" ? MONDAY_OFFSET_MS : 0;
  const size = SLOT_MS[barSize];
  return Math.floor((timeMs - offset) / size) * size + offset;
}

function toSeconds(timeMs: number): UTCTimestamp {
  return (timeMs / 1000) as UTCTimestamp;
}

export function toChartPoints(bars: readonly Bar[], range: Range): ChartPoint[] {
  const barSize = BAR_SIZE_BY_RANGE[range];
  const points: ChartPoint[] = [];
  for (const bar of bars) {
    const point = {
      time: toSeconds(slotOf(bar.time, barSize)),
      value: Number(bar.close),
      close: bar.close,
    };
    const last = points.at(-1);
    if (last !== undefined && point.time <= last.time) points[points.length - 1] = point;
    else points.push(point);
  }
  return points;
}

export function sessionSlots(session: Session | undefined): Array<{ time: UTCTimestamp }> {
  if (session === undefined) return [];
  const size = SLOT_MS[BAR_SIZE_BY_RANGE["1D"]];
  const slots: Array<{ time: UTCTimestamp }> = [];
  for (let time = slotOf(session.open, "5m"); time <= session.close; time += size) {
    slots.push({ time: toSeconds(time) });
  }
  return slots;
}

function samePoint(a: ChartPoint | undefined, b: ChartPoint | undefined): boolean {
  return a !== undefined && b !== undefined && a.time === b.time && a.value === b.value;
}

export function liveTail(previous: readonly ChartPoint[], next: readonly ChartPoint[]): number {
  const grown = next.length - previous.length;
  if (previous.length === 0 || grown < 0 || grown > 1) return -1;
  const stable = previous.length - 1;
  for (let index = 0; index < stable; index += 1) {
    if (!samePoint(previous[index], next[index])) return -1;
  }
  return stable;
}
