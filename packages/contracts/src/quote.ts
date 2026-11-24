import { z } from "zod";
import {
  DecimalStringSchema,
  EpochMsSchema,
  PriceStringSchema,
  SymbolSchema,
} from "./primitives.ts";

export const QuoteSchema = z.object({
  symbol: SymbolSchema,
  price: PriceStringSchema,
  change: DecimalStringSchema,
  changePercent: DecimalStringSchema,
  previousClose: PriceStringSchema,
  timestamp: EpochMsSchema,
});

export type Quote = z.infer<typeof QuoteSchema>;
