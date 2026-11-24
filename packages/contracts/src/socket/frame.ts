import { z } from "zod";
import { type ClientMessage, ClientMessageSchema } from "./client.ts";
import { type ServerMessage, ServerMessageSchema } from "./server.ts";

export type FrameErrorKind = "invalid_json" | "invalid_message";

export type FrameError = { readonly kind: FrameErrorKind; readonly detail: string };

export type FrameResult<Message> =
  | { readonly ok: true; readonly message: Message }
  | { readonly ok: false; readonly error: FrameError };

function failure(kind: FrameErrorKind, detail: string): FrameResult<never> {
  return { ok: false, error: { kind, detail } };
}

function readJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

function parseFrame<Message>(schema: z.ZodType<Message>, raw: unknown): FrameResult<Message> {
  if (typeof raw !== "string") {
    return failure("invalid_json", "Frame is not text");
  }
  const json = readJson(raw);
  if (!json.ok) {
    return failure("invalid_json", "Frame is not valid JSON");
  }
  const result = schema.safeParse(json.value);
  if (!result.success) {
    return failure("invalid_message", z.prettifyError(result.error));
  }
  return { ok: true, message: result.data };
}

export function parseClientFrame(raw: unknown): FrameResult<ClientMessage> {
  return parseFrame(ClientMessageSchema, raw);
}

export function parseServerFrame(raw: unknown): FrameResult<ServerMessage> {
  return parseFrame(ServerMessageSchema, raw);
}

export function encodeFrame(message: ClientMessage | ServerMessage): string {
  return JSON.stringify(message);
}
