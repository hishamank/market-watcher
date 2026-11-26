import { subtract } from "@mini/contracts";
import { directionOf, type FlashDirection } from "@mini/core";
import { duration } from "@mini/tokens";
import { useEffect, useRef, useState } from "react";

const MIN_FLASH_GAP_MS = 1000;

export interface TickFlash {
  readonly flash: FlashDirection | undefined;
  readonly flashKey: number | undefined;
  readonly from: string | undefined;
}

interface ActiveFlash {
  readonly direction: FlashDirection;
  readonly key: number;
  readonly from: string;
}

const NO_FLASH: TickFlash = { flash: undefined, flashKey: undefined, from: undefined };

export function useTickFlash(price: string | undefined, stale: boolean): TickFlash {
  const [active, setActive] = useState<ActiveFlash>();
  const previous = useRef(price);
  const lastFlashAt = useRef(0);

  useEffect(() => {
    const before = previous.current;
    previous.current = price;
    if (before === undefined || price === undefined || before === price) return;
    const now = Date.now();
    if (now - lastFlashAt.current < MIN_FLASH_GAP_MS) return;
    const direction = directionOf(subtract(price, before));
    if (direction === "flat") return;
    lastFlashAt.current = now;
    setActive({ direction, key: now, from: before });
  }, [price]);

  useEffect(() => {
    if (active === undefined) return undefined;
    const timer = setTimeout(() => setActive(undefined), duration.flash);
    return () => clearTimeout(timer);
  }, [active]);

  if (active === undefined || stale) return NO_FLASH;
  return { flash: active.direction, flashKey: active.key, from: active.from };
}
