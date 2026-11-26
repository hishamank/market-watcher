import { duration } from "@mini/tokens";
import { useEffect, useState } from "react";
import { useMediaQuery } from "./use-media-query.ts";

export interface Presence<T> {
  readonly value: T | undefined;
  readonly open: boolean;
}

export function usePresence<T>(value: T | undefined): Presence<T> {
  const reduce = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [held, setHeld] = useState(value);
  const [open, setOpen] = useState(value !== undefined);
  const visible = value !== undefined;
  if (visible && value !== held) setHeld(value);
  if (!visible && open) setOpen(false);

  useEffect(() => {
    if (visible) {
      const frame = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(frame);
    }
    const timer = setTimeout(() => setHeld(undefined), reduce ? 0 : duration.base);
    return () => clearTimeout(timer);
  }, [visible, reduce]);

  return { value: held, open: open && visible };
}
