import { directionOf, formatPrice, type FlashDirection } from "@mini/core";
import { ClockIcon } from "./icons.tsx";

export interface PriceCellProps {
  asOf?: string | undefined;
  price: string;
  change: string;
  stale: boolean;
  flash: FlashDirection | undefined;
  flashKey?: number | undefined;
  flashFrom?: string | undefined;
  testId: string;
  display?: boolean;
}

const tints: Record<FlashDirection, string> = {
  up: "bg-gain-tint",
  down: "bg-loss-tint",
};

function RollingDigits({ text, from, rollKey }: { text: string; from: string; rollKey: number }) {
  const offset = text.length - from.length;
  return Array.from(text, (char, index) =>
    char === from[index - offset] ? (
      <span key={index}>{char}</span>
    ) : (
      <span key={`${rollKey}-${index}`} className="inline-block motion-safe:animate-digit-roll">
        {char}
      </span>
    ),
  );
}

export function PriceCell(props: PriceCellProps) {
  const { asOf, price, stale, flash, flashKey, flashFrom, testId, display = false } = props;
  const size = display ? "text-numeric-display" : "text-numeric-price";
  const text = formatPrice(price);
  const rolling = flash !== undefined && flashKey !== undefined && flashFrom !== undefined;
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
      {rolling ? (
        <RollingDigits text={text} from={formatPrice(flashFrom)} rollKey={flashKey} />
      ) : (
        text
      )}
    </bdi>
  );
}
