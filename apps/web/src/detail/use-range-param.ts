import type { Range } from "@mini/contracts";
import { useTrack } from "@mini/analytics";
import { useSearchParams } from "next/navigation";
import { parseRange } from "./parse-range.ts";

export interface RangeParam {
  readonly range: Range;
  readonly selectRange: (range: Range) => void;
}

export function useRangeParam(symbol: string): RangeParam {
  const searchParams = useSearchParams();
  const track = useTrack();
  const current = parseRange(searchParams.get("range"));
  return {
    range: current,
    selectRange: (range) => {
      if (range === current) return;
      track({ name: "range_changed", symbol, range });
      const next = new URLSearchParams(searchParams.toString());
      next.set("range", range);
      window.history.pushState(null, "", `?${next.toString()}`);
    },
  };
}
