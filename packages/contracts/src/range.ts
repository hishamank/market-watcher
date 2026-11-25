import { z } from "zod";

export const RangeSchema = z.enum(["1D", "1W", "1M", "3M", "1Y", "5Y"]);
export const BarSizeSchema = z.enum(["5m", "30m", "1h", "1d", "1w"]);

export type Range = z.infer<typeof RangeSchema>;
export type BarSize = z.infer<typeof BarSizeSchema>;

export const RANGES = RangeSchema.options;

export const BAR_SIZE_BY_RANGE = {
  "1D": "5m",
  "1W": "30m",
  "1M": "1h",
  "3M": "1d",
  "1Y": "1d",
  "5Y": "1w",
} as const satisfies Record<Range, BarSize>;
