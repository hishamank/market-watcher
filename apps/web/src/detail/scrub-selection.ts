import type { Range } from "@mini/contracts";
import type { ScrubPoint } from "../integrations/chart/use-chart-scrub.ts";

export interface ScrubSelection {
  readonly range: Range;
  readonly point: ScrubPoint;
}

export function scrubFor(selection: ScrubSelection | undefined, range: Range) {
  return selection?.range === range ? selection.point : undefined;
}
