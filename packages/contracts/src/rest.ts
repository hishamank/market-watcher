import { z } from "zod";
import {
  EpochMsSchema,
  FeedModeSchema,
  MarketStatusSchema,
  PriceStringSchema,
  RequestedSymbolSchema,
  SymbolSchema,
} from "./primitives.ts";
import { BaselinePriceSchema, QuoteSchema } from "./quote.ts";
import { BAR_SIZE_BY_RANGE, BarSizeSchema, RangeSchema } from "./range.ts";

const envelope = { feedMode: FeedModeSchema, marketStatus: MarketStatusSchema };

export const StockSchema = z.object({
  symbol: SymbolSchema,
  name: z.string(),
  quote: QuoteSchema,
});

export const StockListResponseSchema = z.object({ ...envelope, stocks: z.array(StockSchema) });

export const StockPageResponseSchema = StockListResponseSchema.extend({
  nextCursor: SymbolSchema.nullable(),
});

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
  previousClose: BaselinePriceSchema,
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

export const MAX_STOCKS_QUERY_SYMBOLS = 100;
export const STOCK_PAGE_SIZE = 50;
export const MAX_STOCK_PAGE_SIZE = 100;
export const MAX_SEARCH_QUERY_LENGTH = 100;
export const MAX_SEARCH_RESULTS = 10;

export const SearchMatchSchema = z.object({
  symbol: SymbolSchema,
  name: z.string(),
});

export const SearchResponseSchema = z.object({
  ...envelope,
  results: z.array(SearchMatchSchema).max(MAX_SEARCH_RESULTS),
});

export const SearchQuerySchema = z.object({
  q: z
    .string()
    .max(MAX_SEARCH_QUERY_LENGTH)
    .transform((value) => value.trim())
    .pipe(z.string().min(1)),
});

export const RestErrorCodeSchema = z.enum([
  "invalid_request",
  "not_found",
  "origin_not_allowed",
  "rate_limited",
  "unavailable",
  "internal_error",
]);

export const RestErrorResponseSchema = z.object({
  ...envelope,
  error: z.object({
    code: RestErrorCodeSchema,
    message: z.string().min(1),
  }),
});

export const StockListQuerySchema = z
  .object({
    symbols: z
      .string()
      .transform((value) =>
        value
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      )
      .pipe(z.array(RequestedSymbolSchema).max(MAX_STOCKS_QUERY_SYMBOLS))
      .optional(),
    cursor: SymbolSchema.optional(),
    limit: z.coerce.number().int().min(1).max(MAX_STOCK_PAGE_SIZE).optional(),
  })
  .refine(
    (query) =>
      query.symbols === undefined || (query.cursor === undefined && query.limit === undefined),
    { message: "symbols cannot be combined with cursor or limit", path: ["symbols"] },
  );

export const StockSymbolParamsSchema = z.object({
  symbol: RequestedSymbolSchema,
});

export const HistoryQuerySchema = z.object({
  range: RangeSchema.default("1D"),
});

export const HealthResponseSchema = z.object({
  connections: z.int().nonnegative(),
  upstreamSymbols: z.int().nonnegative(),
  historyCacheHitRate: z.number().min(0).max(1),
  revision: z.string().min(1).max(40).optional(),
});

export type Stock = z.infer<typeof StockSchema>;
export type StockListResponse = z.infer<typeof StockListResponseSchema>;
export type StockPageResponse = z.infer<typeof StockPageResponseSchema>;
export type StockDetailResponse = z.infer<typeof StockDetailResponseSchema>;
export type Bar = z.infer<typeof BarSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type HistoryResponse = z.infer<typeof HistoryResponseSchema>;
export type RestErrorCode = z.infer<typeof RestErrorCodeSchema>;
export type RestErrorResponse = z.infer<typeof RestErrorResponseSchema>;
export type StockListQuery = z.infer<typeof StockListQuerySchema>;
export type StockSymbolParams = z.infer<typeof StockSymbolParamsSchema>;
export type HistoryQuery = z.infer<typeof HistoryQuerySchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type SearchMatch = z.infer<typeof SearchMatchSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
