import { z } from "zod";
import {
  DecimalStringSchema,
  EpochMsSchema,
  PriceStringSchema,
  SymbolSchema,
} from "./primitives.ts";
import { toUnits } from "./money/money.ts";

export const YearRangeSchema = z
  .object({
    low: PriceStringSchema,
    high: PriceStringSchema,
  })
  .refine(
    (range) =>
      PriceStringSchema.safeParse(range.low).success &&
      PriceStringSchema.safeParse(range.high).success &&
      toUnits(range.high) >= toUnits(range.low),
  );

export const StockStatisticsSchema = z.object({
  currency: z.literal("USD"),
  marketCap: PriceStringSchema.nullable(),
  trailingPE: PriceStringSchema.nullable(),
  trailingEps: DecimalStringSchema.nullable(),
  dividendYield: PriceStringSchema.nullable(),
  averageVolume: z.int().nonnegative().nullable(),
  yearRange: YearRangeSchema.nullable(),
});

export const StockStatisticsResponseSchema = z.object({
  symbol: SymbolSchema,
  source: z.enum(["yahoo", "simulated"]),
  fetchedAt: EpochMsSchema,
  statistics: StockStatisticsSchema.nullable(),
});

export type StockStatistics = z.infer<typeof StockStatisticsSchema>;
export type StockStatisticsResponse = z.infer<typeof StockStatisticsResponseSchema>;
