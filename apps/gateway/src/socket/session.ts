import { type ClientMessage, encodeFrame, parseClientFrame } from "@mini/contracts";
import { type RawData, WebSocket } from "ws";
import type { Hub } from "../hub/hub.ts";
import { CLOSE_TIMEOUT_MS, MAX_BUFFERED_BYTES, MESSAGES_PER_SECOND } from "../hub/limits.ts";
import type { Peer } from "../hub/member.ts";
import type { Warn } from "../hub/quote-book.ts";
import { createRateLimit } from "./rate-limit.ts";

export function closeWithDeadline(socket: WebSocket, code: number, reason: string): void {
  if (socket.readyState === WebSocket.CLOSED) {
    return;
  }
  if (socket.readyState === WebSocket.OPEN) {
    socket.close(code, reason);
  }
  const timer = setTimeout(() => {
    if (socket.readyState !== WebSocket.CLOSED) {
      socket.terminate();
    }
  }, CLOSE_TIMEOUT_MS);
  timer.unref();
  socket.once("close", () => clearTimeout(timer));
}

export function toPeer(socket: WebSocket): Peer {
  return {
    send(message) {
      if (socket.readyState === WebSocket.OPEN && socket.bufferedAmount <= MAX_BUFFERED_BYTES) {
        socket.send(encodeFrame(message));
      }
    },
    reply(message) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(encodeFrame(message));
      }
    },
    bufferedAmount: () => socket.bufferedAmount,
    close: (code, reason) => closeWithDeadline(socket, code, reason),
  };
}

async function dispatch(hub: Hub, peer: Peer, message: ClientMessage): Promise<void> {
  switch (message.type) {
    case "subscribe":
      await hub.subscribe(peer, message);
      return;
    case "unsubscribe":
      await hub.unsubscribe(peer, message.symbols);
      return;
    case "chaos":
      peer.send({
        type: "error",
        code: "invalid_message",
        message: "Chaos controls are not available on this gateway",
      });
  }
}

export function openSession(socket: WebSocket, hub: Hub, now: () => number, warn: Warn): void {
  const peer = toPeer(socket);
  const rate = createRateLimit(MESSAGES_PER_SECOND, 1_000, now);

  socket.on("message", (data: RawData, isBinary: boolean) => {
    const verdict = rate();
    const frame = parseClientFrame(isBinary ? data : data.toString());
    if (verdict !== "allowed") {
      if (frame.ok && frame.message.type === "subscribe") {
        void hub.refuse(peer, frame.message.requestId);
      } else if (verdict === "limited") {
        peer.send({ type: "error", code: "rate_limited", message: "Too many messages" });
      }
      return;
    }
    if (frame.ok) {
      void dispatch(hub, peer, frame.message).catch((err: unknown) => {
        warn({ err, type: frame.message.type }, "failed to handle client message");
        peer.send({
          type: "error",
          code: "invalid_message",
          message: "Upstream subscription request failed",
        });
      });
    } else {
      warn({ kind: frame.error.kind, detail: frame.error.detail }, "dropped an invalid frame");
      peer.send({ type: "error", code: "invalid_message", message: frame.error.detail });
    }
  });
  socket.on("close", () => {
    void hub.leave(peer).catch((err: unknown) => {
      warn({ err }, "failed to clean up session on close");
    });
  });
  hub.join(peer);
}
