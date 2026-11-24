import { z } from "zod";
import { DECIMAL_PATTERN, UNSIGNED_DECIMAL_PATTERN } from "./money/decimal.ts";
import { roundPercent, roundToDisplay, toUnits } from "./money/money.ts";
import {
  DecimalStringSchema,
  EpochMsSchema,
  PriceStringSchema,
  SymbolSchema,
} from "./primitives.ts";

export const MAX_PRICE_UNITS = 10n ** 16n;

const isDisplayPrice = (value: string) =>
  UNSIGNED_DECIMAL_PATTERN.test(value) &&
  toUnits(value) < MAX_PRICE_UNITS &&
  roundToDisplay(value) === value;

const isBaseline = (value: string) => isDisplayPrice(value) && toUnits(value) > 0n;

const isDisplayChange = (change: string, price: string) =>
  DECIMAL_PATTERN.test(change) && isDisplayPrice(price) && roundToDisplay(change, price) === change;

const isDisplayPercent = (value: string) =>
  DECIMAL_PATTERN.test(value) && roundPercent(value) === value;

export const DisplayPriceSchema = PriceStringSchema.refine(isDisplayPrice, {
  message: "Prices travel pre-rounded to display precision and below the price cap",
});

export const BaselinePriceSchema = PriceStringSchema.refine(isBaseline, {
  message: "A baseline price must be positive, pre-rounded and below the price cap",
});

export const QuoteSchema = z
  .object({
    symbol: SymbolSchema,
    price: DisplayPriceSchema,
    change: DecimalStringSchema,
    changePercent: DecimalStringSchema,
    previousClose: BaselinePriceSchema,
    timestamp: EpochMsSchema,
  })
  .refine((quote) => isDisplayChange(quote.change, quote.price), {
    message: "Change uses the price's display precision",
    path: ["change"],
  })
  .refine((quote) => isDisplayPercent(quote.changePercent), {
    message: "Percent change has two decimals",
    path: ["changePercent"],
  });

export type Quote = z.infer<typeof QuoteSchema>;
