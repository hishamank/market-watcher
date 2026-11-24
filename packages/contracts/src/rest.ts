import { z } from "zod";
import {
  EpochMsSchema,
  FeedModeSchema,
  MarketStatusSchema,
  PriceStringSchema,
  SymbolSchema,
} from "./primitives.ts";
import { QuoteSchema } from "./quote.ts";
import { BAR_SIZE_BY_RANGE, BarSizeSchema, RangeSchema } from "./range.ts";

const envelope = { feedMode: FeedModeSchema, marketStatus: MarketStatusSchema };

export const StockSchema = z.object({
  symbol: SymbolSchema,
  name: z.string(),
  quote: QuoteSchema,
});

export const StockListResponseSchema = z.object({ ...envelope, stocks: z.array(StockSchema) });

export const StockDetailResponseSchema = z.object({ ...envelope, stock: StockSchema });

export const BarSchema = z.object({ time: EpochMsSchema, close: PriceStringSchema });

export const SessionSchema = z
  .object({ open: EpochMsSchema, close: EpochMsSchema })
  .refine((session) => session.open < session.close, {
    message: "A session opens before it closes",
    path: ["close"],
  });

const history = {
  ...envelope,
  symbol: SymbolSchema,
  previousClose: PriceStringSchema,
  bars: z.array(BarSchema),
  ageMs: z.int().nonnegative().optional(),
};

const DayHistorySchema = z.object({
  ...history,
  range: z.literal("1D"),
  barSize: z.literal(BAR_SIZE_BY_RANGE["1D"]),
  session: SessionSchema,
});

const MultiDayHistorySchema = z
  .object({
    ...history,
    range: RangeSchema.exclude(["1D"]),
    barSize: BarSizeSchema,
  })
  .refine((response) => response.barSize === BAR_SIZE_BY_RANGE[response.range], {
    message: "Bar size does not match the range",
    path: ["barSize"],
  });

export const HistoryResponseSchema = z.discriminatedUnion("range", [
  DayHistorySchema,
  MultiDayHistorySchema,
]);

export type Stock = z.infer<typeof StockSchema>;
export type StockListResponse = z.infer<typeof StockListResponseSchema>;
export type StockDetailResponse = z.infer<typeof StockDetailResponseSchema>;
export type Bar = z.infer<typeof BarSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;
