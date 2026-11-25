import { z } from "zod";
import {
  EpochMsSchema,
  FeedModeSchema,
  MarketStatusSchema,
  RequestedSymbolSchema,
} from "../primitives.ts";
import { QuoteSchema } from "../quote.ts";

export const PROTOCOL_VERSION = 1;

export const SymbolErrorCodeSchema = z.enum(["unknown_symbol", "subscription_limit"]);
export const PlainErrorCodeSchema = z.enum([
  "rate_limited",
  "invalid_message",
  "unsupported_version",
]);
export const ErrorCodeSchema = z.enum([
  ...SymbolErrorCodeSchema.options,
  ...PlainErrorCodeSchema.options,
]);

export const WelcomeMessageSchema = z.object({
  type: z.literal("welcome"),
  protocolVersion: z.int().positive(),
  feedMode: FeedModeSchema,
  marketStatus: MarketStatusSchema,
  heartbeatIntervalMs: z.int().positive(),
  maxSubscriptions: z.int().positive(),
  serverTime: EpochMsSchema,
});

export const SnapshotMessageSchema = z.object({
  type: z.literal("snapshot"),
  quotes: z.array(QuoteSchema),
});

export const QuotesMessageSchema = z.object({
  type: z.literal("quotes"),
  quotes: z.array(QuoteSchema),
});

export const HeartbeatMessageSchema = z.object({
  type: z.literal("heartbeat"),
  serverTime: EpochMsSchema,
  skippedFrames: z.int().nonnegative().optional(),
});

export const MarketStatusMessageSchema = z.object({
  type: z.literal("market_status"),
  marketStatus: MarketStatusSchema,
});

export const ErrorMessageSchema = z.discriminatedUnion("code", [
  z.object({
    type: z.literal("error"),
    code: SymbolErrorCodeSchema,
    message: z.string(),
    symbols: z.array(RequestedSymbolSchema).min(1),
  }),
  z.object({ type: z.literal("error"), code: PlainErrorCodeSchema, message: z.string() }),
]);

export const ServerMessageSchema = z.discriminatedUnion("type", [
  WelcomeMessageSchema,
  SnapshotMessageSchema,
  QuotesMessageSchema,
  HeartbeatMessageSchema,
  MarketStatusMessageSchema,
  ErrorMessageSchema,
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type WelcomeMessage = z.infer<typeof WelcomeMessageSchema>;
export type SnapshotMessage = z.infer<typeof SnapshotMessageSchema>;
export type QuotesMessage = z.infer<typeof QuotesMessageSchema>;
export type HeartbeatMessage = z.infer<typeof HeartbeatMessageSchema>;
export type MarketStatusMessage = z.infer<typeof MarketStatusMessageSchema>;
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
