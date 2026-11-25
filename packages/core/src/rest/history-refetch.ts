import type { QueryClient } from "@tanstack/react-query";
import type { SocketClient } from "../realtime/socket-types.ts";
import { stockQueryKeys } from "./stock-queries.ts";

export function refetchHistoryOnReconnect(
  socketClient: SocketClient,
  queryClient: QueryClient,
): () => void {
  return socketClient.subscribeReconnect(() => {
    void queryClient.refetchQueries({ queryKey: stockQueryKeys.allHistory, type: "active" });
  });
}
