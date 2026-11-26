import { directionOf, formatPrice, type FlashDirection } from "@mini/core";
import { ClockIcon } from "./icons.tsx";

export interface PriceCellProps {
  asOf?: string | undefined;
  price: string;
  change: string;
  stale: boolean;
  flash: FlashDirection | undefined;
  testId: string;
  display?: boolean;
}

export function PriceCell({
  asOf,
  price,
  change,
  stale,
  flash,
  testId,
  display = false,
}: PriceCellProps) {
  const size = display ? "text-numeric-display" : "text-numeric-price";
  return (
    <bdi
      dir="ltr"
      data-testid={testId}
      data-direction={directionOf(change)}
      data-flash={flash}
      className={`${size} ${stale ? "text-text-muted" : "text-text"}`}
    >
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
      {formatPrice(price)}
    </bdi>
  );
}
