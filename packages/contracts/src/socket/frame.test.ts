import { describe, expect, it } from "vitest";
import { aaplQuote, pennyQuote } from "../fixtures.ts";
import type { ClientMessage } from "./client.ts";
import { encodeFrame, parseClientFrame, parseServerFrame } from "./frame.ts";
import { PROTOCOL_VERSION, type ServerMessage } from "./server.ts";

const serverMessages: ServerMessage[] = [
  {
    type: "welcome",
    protocolVersion: PROTOCOL_VERSION,
    feedMode: "simulated",
    marketStatus: "open",
    heartbeatIntervalMs: 5_000,
    maxSubscriptions: 100,
    serverTime: 1_764_000_000_000,
  },
  { type: "snapshot", requestId: 1, quotes: [aaplQuote, pennyQuote] },
  { type: "snapshot", requestId: 2, quotes: [] },
  { type: "quotes", quotes: [aaplQuote] },
  { type: "heartbeat", serverTime: 1_764_000_005_000 },
  { type: "heartbeat", serverTime: 1_764_000_005_000, skippedFrames: 3 },
  { type: "market_status", marketStatus: "closed" },
  {
    type: "error",
    code: "unknown_symbol",
    message: "Unknown symbols",
    requestId: 3,
    symbols: ["ZZZZ"],
  },
  {
    type: "error",
    code: "subscription_limit",
    message: "Limit is 100",
    requestId: 3,
    symbols: ["MSFT"],
  },
  { type: "error", code: "unavailable", message: "No quote yet", requestId: 3, symbols: ["NVDA"] },
  { type: "error", code: "rate_limited", message: "Too many messages", requestId: 4 },
  { type: "error", code: "rate_limited", message: "Too many messages" },
  { type: "error", code: "invalid_message", message: "Could not parse" },
  { type: "error", code: "unsupported_version", message: "Use v=1" },
];

const clientMessages: ClientMessage[] = [
  { type: "subscribe", requestId: 1, symbols: ["AAPL", "MSFT"] },
  { type: "unsubscribe", symbols: ["AAPL"] },
  { type: "chaos", action: "drop" },
  { type: "chaos", action: "freeze", enabled: true },
  { type: "chaos", action: "tick_spike", enabled: true },
  { type: "chaos", action: "history_latency", enabled: false },
  { type: "chaos", action: "history_failure_rate", rate: 50 },
  { type: "chaos", action: "history_failure_rate", rate: 100 },
  { type: "chaos", action: "history_failure_rate", rate: 0 },
  { type: "chaos", action: "force_closed", enabled: true },
];

describe("round trips", () => {
  it.each(serverMessages.map((message) => [message.type, message] as const))(
    "server %s",
    (_type, message) => {
      expect(parseServerFrame(encodeFrame(message))).toEqual({ ok: true, message });
    },
  );

  it.each(clientMessages.map((message) => [message.type, message] as const))(
    "client %s",
    (_type, message) => {
      expect(parseClientFrame(encodeFrame(message))).toEqual({ ok: true, message });
    },
  );

  it("drops unknown fields so older clients survive new ones", () => {
    const frame = JSON.stringify({ type: "market_status", marketStatus: "open", extra: 1 });
    expect(parseServerFrame(frame)).toEqual({
      ok: true,
      message: { type: "market_status", marketStatus: "open" },
    });
  });

  it("keeps unknown but well-formed symbols for the catalogue to judge", () => {
    const frame = JSON.stringify({ type: "subscribe", requestId: 1, symbols: ["aapl", "BRK.B"] });
    expect(parseClientFrame(frame).ok).toBe(true);
  });
});

describe("invalid frames", () => {
  it.each([undefined, 42, null, new Uint8Array([123, 125])])("rejects non-text input %#", (raw) => {
    expect(parseServerFrame(raw)).toEqual({
      ok: false,
      error: { kind: "invalid_json", detail: "Frame is not text" },
    });
  });

  it.each(["", "{", "not json", "{'type':'heartbeat'}"])("rejects bad JSON %j", (raw) => {
    const result = parseClientFrame(raw);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("invalid_json");
  });

  it.each([
    ["an unknown type", { type: "tick", quotes: [] }],
    ["a missing type", { quotes: [] }],
    ["a float price", { type: "quotes", quotes: [{ ...aaplQuote, price: 187.42 }] }],
    ["a price in exponent form", { type: "quotes", quotes: [{ ...aaplQuote, price: "1e3" }] }],
    ["a negative price", { type: "quotes", quotes: [{ ...aaplQuote, price: "-1.00" }] }],
    ["a fractional timestamp", { type: "quotes", quotes: [{ ...aaplQuote, timestamp: 1.5 }] }],
    ["an unknown error code", { type: "error", code: "boom", message: "x" }],
    ["an unknown feed mode", { ...serverMessages[0], feedMode: "mixed" }],
    ["a negative skipped count", { type: "heartbeat", serverTime: 1, skippedFrames: -1 }],
    ["a market status of halted", { type: "market_status", marketStatus: "halted" }],
    ["a snapshot without a request ID", { type: "snapshot", quotes: [] }],
    [
      "an unavailable error without symbols",
      { type: "error", code: "unavailable", message: "x", requestId: 1 },
    ],
    [
      "a symbol error without a request ID",
      { type: "error", code: "unknown_symbol", message: "x", symbols: ["ZZZZ"] },
    ],
    [
      "a rate limit with a zero request ID",
      { type: "error", code: "rate_limited", message: "x", requestId: 0 },
    ],
    ["an array", []],
  ])("rejects a server frame with %s", (_name, value) => {
    const result = parseServerFrame(JSON.stringify(value));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("invalid_message");
  });

  it.each([
    ["no symbols", { type: "subscribe", requestId: 1, symbols: [] }],
    ["a symbol that is not a string", { type: "subscribe", requestId: 1, symbols: [1] }],
    ["a subscribe without a request ID", { type: "subscribe", symbols: ["AAPL"] }],
    ["a zero request ID", { type: "subscribe", requestId: 0, symbols: ["AAPL"] }],
    ["a fractional request ID", { type: "subscribe", requestId: 1.5, symbols: ["AAPL"] }],
    ["a request ID as a string", { type: "subscribe", requestId: "1", symbols: ["AAPL"] }],
    ["an empty symbol", { type: "unsubscribe", symbols: [""] }],
    ["a failure rate of 30", { type: "chaos", action: "history_failure_rate", rate: 30 }],
    ["an offline action", { type: "chaos", action: "offline", enabled: true }],
    ["a freeze without a setting", { type: "chaos", action: "freeze" }],
    ["a server message", { type: "heartbeat", serverTime: 1 }],
  ])("rejects a client frame with %s", (_name, value) => {
    const result = parseClientFrame(JSON.stringify(value));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe("invalid_message");
  });

  it("strips a request ID from errors that cannot carry one", () => {
    const frame = JSON.stringify({
      type: "error",
      code: "invalid_message",
      message: "x",
      requestId: 1,
    });
    expect(parseServerFrame(frame)).toEqual({
      ok: true,
      message: { type: "error", code: "invalid_message", message: "x" },
    });
  });

  it("names the failing field in the detail", () => {
    const result = parseServerFrame(JSON.stringify({ type: "error", code: "boom", message: "" }));
    expect(!result.ok && result.error.detail).toContain("code");
  });
});
