import type { Range } from "@mini/contracts";
import { useSearchParams } from "next/navigation";
import { parseRange } from "./parse-range.ts";

export interface RangeParam {
  readonly range: Range;
  readonly selectRange: (range: Range) => void;
}

export function useRangeParam(): RangeParam {
  const searchParams = useSearchParams();
  return {
    range: parseRange(searchParams.get("range")),
    selectRange: (range) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("range", range);
      window.history.pushState(null, "", `?${next.toString()}`);
    },
  };
}
