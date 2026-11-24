import { z } from "zod";
import { DECIMAL_PATTERN, UNSIGNED_DECIMAL_PATTERN } from "./money/decimal.ts";

const MAX_DECIMAL_LENGTH = 40;

export const DecimalStringSchema = z.string().max(MAX_DECIMAL_LENGTH).regex(DECIMAL_PATTERN);
export const PriceStringSchema = z.string().max(MAX_DECIMAL_LENGTH).regex(UNSIGNED_DECIMAL_PATTERN);
export const EpochMsSchema = z.int().nonnegative();
export const SymbolSchema = z.string().min(1).max(16);

export const FeedModeSchema = z.enum(["simulated", "live"]);
export const MarketStatusSchema = z.enum(["open", "closed"]);

export type DecimalString = z.infer<typeof DecimalStringSchema>;
export type EpochMs = z.infer<typeof EpochMsSchema>;
export type FeedMode = z.infer<typeof FeedModeSchema>;
export type MarketStatus = z.infer<typeof MarketStatusSchema>;
