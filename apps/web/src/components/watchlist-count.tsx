import { useT } from "@mini/core";
import { useState, type CSSProperties } from "react";
import { useStarsInFlight } from "../integrations/star-motion.ts";

export interface WatchlistCountProps {
  count: number;
  loaded: boolean;
}

interface Flip {
  value: number;
  previous: number | undefined;
  turn: number;
  loaded: boolean;
}

const digit = "col-start-1 row-start-1 backface-hidden";

export function WatchlistCount({ count, loaded }: WatchlistCountProps) {
  const t = useT();
  const shown = Math.max(0, count - useStarsInFlight());
  const [flip, setFlip] = useState<Flip>({ value: shown, previous: undefined, turn: 0, loaded });
  if (flip.value !== shown || flip.loaded !== loaded) {
    const previous = flip.loaded && flip.value !== shown ? flip.value : undefined;
    setFlip({ value: shown, previous, turn: flip.turn + 1, loaded });
  }
  const direction = { "--flip-dir": shown < (flip.previous ?? shown) ? -1 : 1 } as CSSProperties;
  return (
    <>
      <span
        aria-hidden="true"
        dir="ltr"
        data-star-target=""
        data-testid="watchlist-count"
        data-count={shown}
        style={direction}
        className="inline-grid h-[20px] min-w-[20px] place-items-center rounded-full bg-accent-tint px-6 text-caption font-semibold text-accent-fill tabular-nums perspective-[60px]"
      >
        {flip.previous === undefined ? (
          <span className={digit}>{shown}</span>
        ) : (
          <>
            <span
              key={`out-${flip.turn}`}
              className={`${digit} motion-safe:animate-count-out motion-reduce:hidden`}
            >
              {flip.previous}
            </span>
            <span key={`in-${flip.turn}`} className={`${digit} motion-safe:animate-count-in`}>
              {shown}
            </span>
          </>
        )}
      </span>
      <span className="sr-only">{t("list.count", { count: shown })}</span>
    </>
  );
}
