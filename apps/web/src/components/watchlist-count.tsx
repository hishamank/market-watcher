import { useT } from "@mini/core";
import { useState, type CSSProperties } from "react";
import { useStarsInFlight } from "../integrations/star-motion.ts";

export interface WatchlistCountProps {
  symbols: readonly string[];
  loaded: boolean;
}

interface Flip {
  count: number;
  label: string;
  previous: string | undefined;
  rising: boolean;
  turn: number;
  loaded: boolean;
}

const MAX_SHOWN = 99;
const digit = "col-start-1 row-start-1 backface-hidden";

function badgeLabel(count: number): string {
  return count > MAX_SHOWN ? `${MAX_SHOWN}+` : String(count);
}

export function WatchlistCount({ symbols, loaded }: WatchlistCountProps) {
  const t = useT();
  const landing = useStarsInFlight().filter((symbol) => symbols.includes(symbol));
  const shown = symbols.length - landing.length;
  const label = badgeLabel(shown);
  const [flip, setFlip] = useState<Flip>({
    count: shown,
    label,
    previous: undefined,
    rising: true,
    turn: 0,
    loaded,
  });
  if (flip.count !== shown || flip.loaded !== loaded) {
    const previous = flip.loaded && flip.label !== label ? flip.label : undefined;
    const rising = shown > flip.count;
    setFlip({ count: shown, label, previous, rising, turn: flip.turn + 1, loaded });
  }
  const direction = { "--flip-dir": flip.rising ? 1 : -1 } as CSSProperties;
  return (
    <>
      <span
        aria-hidden="true"
        dir="ltr"
        data-star-target=""
        data-testid="watchlist-count"
        data-count={shown}
        style={direction}
        className="inline-grid size-[24px] place-items-center rounded-full bg-accent-tint text-caption font-semibold text-accent-fill tabular-nums perspective-[60px]"
      >
        {flip.previous === undefined ? (
          <span className={digit}>{label}</span>
        ) : (
          <>
            <span
              key={`out-${flip.turn}`}
              className={`${digit} motion-safe:animate-count-out motion-reduce:hidden`}
            >
              {flip.previous}
            </span>
            <span key={`in-${flip.turn}`} className={`${digit} motion-safe:animate-count-in`}>
              {label}
            </span>
          </>
        )}
      </span>
      <span className="sr-only">{t("list.count", { count: shown })}</span>
    </>
  );
}
