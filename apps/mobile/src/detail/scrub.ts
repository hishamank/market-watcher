import type { Bar, Range, Session } from "@mini/contracts";

export interface ScrubPoint {
  readonly time: number;
  readonly close: string;
  readonly fraction: number;
}

export interface ScrubSelection {
  readonly range: Range;
  readonly index: number;
}

function fractionOf(bars: readonly Bar[], index: number, session: Session | undefined): number {
  const bar = bars[index];
  if (session !== undefined && bar !== undefined) {
    return (bar.time - session.open) / (session.close - session.open);
  }
  return bars.length > 1 ? index / (bars.length - 1) : 0;
}

export function scrubPointOf(
  selection: ScrubSelection | undefined,
  range: Range,
  history: { readonly bars: readonly Bar[]; readonly session: Session | undefined },
): ScrubPoint | undefined {
  if (selection?.range !== range) return undefined;
  const bar = history.bars[selection.index];
  if (bar === undefined) return undefined;
  return {
    time: bar.time,
    close: bar.close,
    fraction: fractionOf(history.bars, selection.index, history.session),
  };
}
