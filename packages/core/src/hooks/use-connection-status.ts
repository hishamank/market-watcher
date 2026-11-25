import { useCallback, useSyncExternalStore } from "react";
import { useCore } from "../core-provider.tsx";
import type { ConnectionStatus } from "../realtime/socket-types.ts";

export interface ConnectionStatusResult {
  readonly status: ConnectionStatus;
  readonly retryNow: () => void;
}

function getServerSnapshot(): ConnectionStatus {
  return "connecting";
}

export function useConnectionStatus(): ConnectionStatusResult {
  const { socketClient } = useCore();

  const subscribe = useCallback(
    (listener: () => void) => socketClient.subscribeStatus(listener),
    [socketClient],
  );

  const getSnapshot = useCallback(() => socketClient.getStatus(), [socketClient]);

  const status = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return { status, retryNow: socketClient.retryNow };
}
