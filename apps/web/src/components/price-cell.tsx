import { directionOf, formatPrice, type FlashDirection } from "@mini/core";

export interface PriceCellProps {
  price: string;
  change: string;
  stale: boolean;
  flash: FlashDirection | undefined;
  testId: string;
  display?: boolean;
}

export function PriceCell({
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
      {formatPrice(price)}
    </bdi>
  );
}
