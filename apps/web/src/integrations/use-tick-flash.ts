import { duration } from "@mini/tokens";
import { useEffect, useState } from "react";
import { directionOf, type FlashDirection } from "../format/quote-format.ts";

export interface TickFlash {
  readonly flash: FlashDirection | undefined;
  readonly flashKey: number | undefined;
}

export function useTickFlash(
  timestamp: number | undefined,
  change: string | undefined,
  stale: boolean,
): TickFlash {
  const [settledTimestamp, setSettledTimestamp] = useState(timestamp);

  useEffect(() => {
    if (timestamp === settledTimestamp) {
      return undefined;
    }
    const timer = setTimeout(() => setSettledTimestamp(timestamp), duration.flash);
    return () => clearTimeout(timer);
  }, [timestamp, settledTimestamp]);

  const direction = change === undefined ? "flat" : directionOf(change);
  if (timestamp === settledTimestamp || stale || direction === "flat") {
    return { flash: undefined, flashKey: undefined };
  }
  return { flash: direction, flashKey: timestamp };
}
