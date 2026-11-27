import type { ErrorMessage } from "@mini/contracts";
import type { QuoteStore } from "./quote-store.ts";
import type { RecoveryGate } from "./recovery-gate.ts";
import type { ManagedConnection } from "./socket-connection.ts";
import type { ConnectionStatus } from "./socket-types.ts";
import type { SubscriptionManager } from "./subscription-types.ts";

export type RecoveryReason =
  | "silence_timeout"
  | "socket_error"
  | "socket_closed"
  | "subscription_deadline"
  | "network_offline"
  | "background_pause";

interface DiagnosticsOptions {
  getStatus(): ConnectionStatus;
  getConnection(): ManagedConnection;
  getSubscriptions(): SubscriptionManager;
  gate: RecoveryGate;
  quoteStore: QuoteStore;
}

export type SocketDiagnostics = ReturnType<ReturnType<typeof createSocketDiagnostics>["snapshot"]>;

export function createSocketDiagnostics(options: DiagnosticsOptions) {
  let lastRecoveryReason: RecoveryReason | null = null;
  let lastGatewayError: { code: string; symbols: readonly string[] } | null = null;
  return {
    recovery(reason: RecoveryReason) {
      lastRecoveryReason = reason;
    },
    gatewayError(message: ErrorMessage) {
      lastGatewayError = {
        code: message.code,
        symbols: "symbols" in message ? [...message.symbols] : [],
      };
    },
    snapshot() {
      const connection = options.getConnection();
      const subscriptions = options.getSubscriptions();
      const referenced = subscriptions.getReferencedSymbols();
      return {
        transportStatus: options.getStatus(),
        socketOpen: connection.isOpen(),
        handshakeComplete: options.gate.isWelcomed(),
        recoverySettled: options.gate.isOpen(referenced),
        queuedMessages: connection.queuedMessages(),
        pendingSubscriptions: subscriptions.getPending(),
        symbols: referenced.map((symbol) => ({
          symbol,
          availability: options.quoteStore.getAvailability(symbol),
          lastKnown: options.quoteStore.getQuote(symbol)?.lastKnown ?? false,
        })),
        lastRecoveryReason,
        lastGatewayError: lastGatewayError && {
          ...lastGatewayError,
          symbols: [...lastGatewayError.symbols],
        },
      };
    },
  };
}
