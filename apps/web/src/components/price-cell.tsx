import { directionOf, formatPrice, type FlashDirection } from "@mini/core";
import type { FlashRoll } from "../integrations/use-tick-flash.ts";
import { ClockIcon } from "./icons.tsx";

export interface PriceCellProps {
  asOf?: string | undefined;
  price: string;
  change: string;
  stale: boolean;
  flash: FlashDirection | undefined;
  flashKey?: number | undefined;
  flashRoll?: FlashRoll | undefined;
  testId: string;
  display?: boolean;
}

const tints: Record<FlashDirection, string> = {
  up: "bg-gain-tint",
  down: "bg-loss-tint",
};

function changedFromEnd(roll: FlashRoll): Set<number> {
  const from = formatPrice(roll.from);
  const to = formatPrice(roll.to);
  const changed = new Set<number>();
  for (let fromEnd = 0; fromEnd < to.length; fromEnd += 1) {
    if (to.at(-1 - fromEnd) !== from.at(-1 - fromEnd)) changed.add(fromEnd);
  }
  return changed;
}

function RollingDigits({
  text,
  roll,
  rollKey,
}: {
  text: string;
  roll: FlashRoll;
  rollKey: number;
}) {
  const changed = changedFromEnd(roll);
  return Array.from(text, (char, index) => {
    const fromEnd = text.length - 1 - index;
    return !changed.has(fromEnd) ? (
      <span key={fromEnd}>{char}</span>
    ) : (
      <span key={`${rollKey}-${fromEnd}`} className="inline-block motion-safe:animate-digit-roll">
        {char}
      </span>
    );
  });
}

export function PriceCell(props: PriceCellProps) {
  const { asOf, price, stale, flash, flashKey, flashRoll, testId, display = false } = props;
  const size = display ? "text-numeric-display" : "text-numeric-price";
  const text = formatPrice(price);
  const rolling = flash !== undefined && flashKey !== undefined && flashRoll !== undefined;
  return (
    <bdi
      dir="ltr"
      data-testid={testId}
      data-direction={directionOf(props.change)}
      data-flash={flash}
      className={`relative isolate inline-block ${size} ${stale ? "text-text-muted" : "text-text"}`}
    >
      {flash === undefined ? null : (
        <span
          key={flashKey}
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-x-4 inset-y-0 -z-10 animate-flash rounded-xs motion-reduce:hidden ${tints[flash]}`}
        />
      )}
      {asOf ? (
        <span
          title={asOf}
          data-testid={testId.replace("price-", "as-of-")}
          className="me-4 inline-flex align-middle text-stale"
        >
          <ClockIcon className="size-[14px]" />
          <span className="sr-only">{asOf}, </span>
        </span>
      ) : null}
      {rolling ? <RollingDigits text={text} roll={flashRoll} rollKey={flashKey} /> : text}
    </bdi>
  );
}
