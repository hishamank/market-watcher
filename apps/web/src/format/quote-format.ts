import { formatChange, formatPercent, formatPrice, toUnits } from "@mini/contracts";

export type Direction = "up" | "down" | "flat";

export type FlashDirection = "up" | "down";

const MINUS_SIGN = "−";

export function directionOf(change: string): Direction {
  const units = toUnits(change);
  if (units > 0n) {
    return "up";
  }
  return units < 0n ? "down" : "flat";
}

export function formatPriceText(price: string): string {
  return formatPrice(price).replace("-", MINUS_SIGN);
}

export function formatSignedAmount(change: string): string {
  return formatChange(change).replace("$", "").replace("-", MINUS_SIGN);
}

export function formatSignedPercent(changePercent: string): string {
  return formatPercent(changePercent).replace("-", MINUS_SIGN);
}
