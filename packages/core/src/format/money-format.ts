import {
  formatChange,
  formatPercent,
  formatPrice as formatContractPrice,
  roundPercent,
  roundToDisplay,
  toUnits,
} from "@mini/contracts";
import { MINUS_SIGN } from "./constants.ts";

export type Direction = "up" | "down" | "flat";

export type FlashDirection = "up" | "down";

function toTypographicMinus(value: string): string {
  return value.replace("-", MINUS_SIGN);
}

export function directionOf(change: string): Direction {
  const units = toUnits(change);
  if (units > 0n) {
    return "up";
  }
  return units < 0n ? "down" : "flat";
}

export function formatPrice(price: string): string {
  return toTypographicMinus(formatContractPrice(roundToDisplay(price)));
}

export function formatSignedChange(change: string, referencePrice?: string): string {
  const display = referencePrice === undefined ? change : roundToDisplay(change, referencePrice);
  return toTypographicMinus(formatChange(display));
}

export function formatSignedAmount(change: string, referencePrice?: string): string {
  return formatSignedChange(change, referencePrice).replace("$", "");
}

export function formatSignedPercent(changePercent: string): string {
  return toTypographicMinus(formatPercent(roundPercent(changePercent)));
}
