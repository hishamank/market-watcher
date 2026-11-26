import { z } from "zod";
import { DecimalStringSchema, EpochMsSchema, SymbolSchema } from "./primitives.ts";

export const EarningsQuarterSchema = z
  .object({
    fiscalQuarter: z.int().min(1).max(4),
    fiscalYear: z.int().min(1900).max(9999),
    periodEnd: EpochMsSchema,
    actual: DecimalStringSchema.nullable(),
    estimate: DecimalStringSchema.nullable(),
  })
  .refine((quarter) => quarter.actual !== null || quarter.estimate !== null);

export const StockEarningsSchema = z
  .object({
    currency: z.literal("USD").nullable(),
    basis: z.enum(["gaap", "nongaap", "unknown"]),
    nextReport: z
      .object({
        dates: z.array(EpochMsSchema).min(1).max(2),
        confidence: z.enum(["scheduled", "estimated", "unknown"]),
      })
      .nullable(),
    quarters: z.array(EarningsQuarterSchema).max(4),
  })
  .refine((earnings) => earnings.quarters.length === 0 || earnings.currency === "USD");

export const StockEarningsResponseSchema = z.object({
  symbol: SymbolSchema,
  source: z.enum(["yahoo", "simulated"]),
  fetchedAt: EpochMsSchema,
  earnings: StockEarningsSchema.nullable(),
});

export type EarningsQuarter = z.infer<typeof EarningsQuarterSchema>;
export type StockEarnings = z.infer<typeof StockEarningsSchema>;
export type StockEarningsResponse = z.infer<typeof StockEarningsResponseSchema>;
