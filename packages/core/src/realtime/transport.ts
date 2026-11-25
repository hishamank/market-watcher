import { PROTOCOL_VERSION } from "@mini/contracts";

export const SOCKET_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

export interface SocketMessageEvent {
  readonly data: unknown;
}

export interface SocketCloseEvent {
  readonly code?: number;
  readonly reason?: string;
}

export interface RealtimeSocket {
  readonly readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: SocketMessageEvent) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: SocketCloseEvent) => void) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export type SocketFactory = (url: string) => RealtimeSocket;

interface GlobalWithWebSocket {
  WebSocket?: new (url: string) => RealtimeSocket;
}

export function createDefaultSocket(url: string): RealtimeSocket {
  const SocketConstructor = (globalThis as unknown as GlobalWithWebSocket).WebSocket;
  if (typeof SocketConstructor !== "function") {
    throw new Error("Global WebSocket constructor is not available");
  }
  return new SocketConstructor(url);
}

export function buildSocketUrl(gatewayUrl: string): string {
  const trimmed = gatewayUrl.replace(/\/+$/, "");
  const withScheme = trimmed.replace(/^https:\/\//i, "wss://").replace(/^http:\/\//i, "ws://");
  const query = `?v=${PROTOCOL_VERSION}`;
  if (withScheme.endsWith(`/ws${query}`)) {
    return withScheme;
  }
  if (withScheme.endsWith("/ws")) {
    return `${withScheme}${query}`;
  }
  return `${withScheme}/ws${query}`;
}
