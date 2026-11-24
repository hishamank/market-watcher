import { z } from "zod";
import { SymbolSchema } from "../primitives.ts";

const symbols = z.array(SymbolSchema).min(1);

export const SubscribeMessageSchema = z.object({ type: z.literal("subscribe"), symbols });
export const UnsubscribeMessageSchema = z.object({ type: z.literal("unsubscribe"), symbols });

const chaos = z.literal("chaos");
const enabled = z.boolean();

export const HistoryFailureRateSchema = z.union([z.literal(0), z.literal(50), z.literal(100)]);

export const ChaosMessageSchema = z.discriminatedUnion("action", [
  z.object({ type: chaos, action: z.literal("drop") }),
  z.object({ type: chaos, action: z.literal("freeze"), enabled }),
  z.object({ type: chaos, action: z.literal("tick_spike"), enabled }),
  z.object({ type: chaos, action: z.literal("history_latency"), enabled }),
  z.object({
    type: chaos,
    action: z.literal("history_failure_rate"),
    rate: HistoryFailureRateSchema,
  }),
  z.object({ type: chaos, action: z.literal("force_closed"), enabled }),
]);

export const ClientMessageSchema = z.discriminatedUnion("type", [
  SubscribeMessageSchema,
  UnsubscribeMessageSchema,
  ChaosMessageSchema,
]);

export type SubscribeMessage = z.infer<typeof SubscribeMessageSchema>;
export type UnsubscribeMessage = z.infer<typeof UnsubscribeMessageSchema>;
export type ChaosMessage = z.infer<typeof ChaosMessageSchema>;
export type ChaosAction = ChaosMessage["action"];
export type HistoryFailureRate = z.infer<typeof HistoryFailureRateSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
