import { z } from "zod";
import { EpochMsSchema, SymbolSchema } from "./primitives.ts";

export const NewsUrlSchema = z
  .url({ protocol: /^https?$/ })
  .max(2_000)
  .regex(/^https?:\/\/[^/?#@\\\s]+(?:[/?#]|$)/i);

export const NewsArticleSchema = z.object({
  id: z.string().min(1).max(2_000),
  title: z.string().trim().min(1).max(600),
  url: NewsUrlSchema,
  site: z.string().min(1).max(253),
  publisher: z.string().trim().min(1).max(200).nullable(),
  publishedAt: EpochMsSchema.max(8_640_000_000_000_000),
  thumbnail: NewsUrlSchema.nullable(),
});

export const StockNewsResponseSchema = z.object({
  symbol: SymbolSchema,
  source: z.enum(["yahoo", "simulated"]),
  fetchedAt: EpochMsSchema,
  articles: z.array(NewsArticleSchema).max(9),
});

export type NewsArticle = z.infer<typeof NewsArticleSchema>;
export type StockNewsResponse = z.infer<typeof StockNewsResponseSchema>;
