import { subtract } from "@mini/contracts";
import { directionOf, type FlashDirection } from "@mini/core";
import { duration } from "@mini/tokens";
import { useEffect, useRef, useState } from "react";

const MIN_FLASH_GAP_MS = 1000;

export interface FlashRoll {
  readonly from: string;
  readonly to: string;
}

export interface TickFlash {
  readonly flash: FlashDirection | undefined;
  readonly flashKey: number | undefined;
  readonly roll: FlashRoll | undefined;
}

interface ActiveFlash {
  readonly direction: FlashDirection;
  readonly key: number;
  readonly roll: FlashRoll;
}

const NO_FLASH: TickFlash = { flash: undefined, flashKey: undefined, roll: undefined };

export interface FlashStart {
  readonly direction: FlashDirection;
  readonly roll: FlashRoll;
}

export function flashStartOf(
  before: string | undefined,
  price: string | undefined,
  closed: boolean,
): FlashStart | undefined {
  if (closed || before === undefined || price === undefined || before === price) return undefined;
  const direction = directionOf(subtract(price, before));
  if (direction === "flat") return undefined;
  return { direction, roll: { from: before, to: price } };
}

export function useTickFlash(
  price: string | undefined,
  stale: boolean,
  closed: boolean,
): TickFlash {
  const [active, setActive] = useState<ActiveFlash>();
  const previous = useRef(price);
  const lastFlashAt = useRef(0);

  useEffect(() => {
    const before = previous.current;
    previous.current = price;
    const start = flashStartOf(before, price, closed);
    if (start === undefined) return;
    const now = Date.now();
    if (now - lastFlashAt.current < MIN_FLASH_GAP_MS) return;
    lastFlashAt.current = now;
    setActive({ ...start, key: now });
  }, [price, closed]);

  useEffect(() => {
    if (active === undefined) return undefined;
    const timer = setTimeout(() => setActive(undefined), duration.flash);
    return () => clearTimeout(timer);
  }, [active]);

  if (active === undefined || stale || closed) return NO_FLASH;
  return { flash: active.direction, flashKey: active.key, roll: active.roll };
}
