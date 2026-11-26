import { useT } from "@mini/core";
import { useState } from "react";
import { flyStarToWatchlist } from "../integrations/star-motion.ts";
import { StarIcon } from "./icons.tsx";

export interface StarButtonProps {
  name: string;
  starred: boolean | undefined;
  onToggle: () => void;
  testId: string;
}

const rays = [0, 60, 120, 180, 240, 300];

function StarBurst() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 grid place-items-center motion-reduce:hidden"
    >
      <span className="absolute size-[28px] animate-star-ring rounded-full border border-accent-fill" />
      {rays.map((angle) => (
        <span
          key={angle}
          className="absolute grid place-items-center"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <span className="absolute size-[3px] animate-star-dot rounded-full bg-accent-fill" />
        </span>
      ))}
    </span>
  );
}

export function StarButton({ name, starred, onToggle, testId }: StarButtonProps) {
  const t = useT();
  const [celebrate, setCelebrate] = useState(false);
  const playing = celebrate && starred === true;
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={starred ?? false}
      aria-label={t("star.label", { name })}
      disabled={starred === undefined}
      onClick={(event) => {
        if (starred === false) flyStarToWatchlist(event.currentTarget);
        setCelebrate(
          starred === false && !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        );
        onToggle();
      }}
      className="relative grid size-[44px] shrink-0 place-items-center rounded-md text-text-muted hover:text-accent-fill aria-pressed:text-accent-fill disabled:text-border"
    >
      {playing ? <StarBurst /> : null}
      <span
        className={playing ? "motion-safe:animate-star-on" : undefined}
        onAnimationEnd={() => setCelebrate(false)}
      >
        <StarIcon filled={starred === true} />
      </span>
    </button>
  );
}
