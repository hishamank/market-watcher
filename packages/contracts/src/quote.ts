import { z } from "zod";
import { DECIMAL_PATTERN, UNSIGNED_DECIMAL_PATTERN } from "./money/decimal.ts";
import { rangeHolds, roundPercent, roundToDisplay, toUnits } from "./money/money.ts";
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

const holdsPrice = (range: { low: string; high: string }, price: string) =>
  isDisplayPrice(range.low) &&
  isDisplayPrice(range.high) &&
  isDisplayPrice(price) &&
  rangeHolds(range, price);

const isDisplayPercent = (value: string) =>
  DECIMAL_PATTERN.test(value) && roundPercent(value) === value;

export const DisplayPriceSchema = PriceStringSchema.refine(isDisplayPrice, {
  message: "Prices travel pre-rounded to display precision and below the price cap",
});

export const BaselinePriceSchema = PriceStringSchema.refine(isBaseline, {
  message: "A baseline price must be positive, pre-rounded and below the price cap",
});

export const DayRangeSchema = z.object({
  low: DisplayPriceSchema,
  high: DisplayPriceSchema,
});

export const QuoteSchema = z
  .object({
    symbol: SymbolSchema,
    price: DisplayPriceSchema,
    change: DecimalStringSchema,
    changePercent: DecimalStringSchema,
    previousClose: BaselinePriceSchema,
    timestamp: EpochMsSchema,
    dayRange: DayRangeSchema.optional(),
    lastKnown: z.literal(true).optional(),
  })
  .refine((quote) => isDisplayChange(quote.change, quote.price), {
    message: "Change uses the price's display precision",
    path: ["change"],
  })
  .refine((quote) => isDisplayPercent(quote.changePercent), {
    message: "Percent change has two decimals",
    path: ["changePercent"],
  })
  .refine((quote) => quote.dayRange === undefined || holdsPrice(quote.dayRange, quote.price), {
    message: "The day range holds the price",
    path: ["dayRange"],
  });

export type DayRange = z.infer<typeof DayRangeSchema>;

export type Quote = z.infer<typeof QuoteSchema>;
