import type { Range } from "@mini/contracts";
import type { ConnectionStatus, SocketClient } from "../realtime/socket-types.ts";

export type AnalyticsEvent =
  | { readonly name: "stock_opened"; readonly symbol: string }
  | { readonly name: "range_changed"; readonly symbol: string; readonly range: Range }
  | { readonly name: "watchlist_toggled"; readonly symbol: string; readonly starred: boolean }
  | {
      readonly name: "search_performed";
      readonly queryLength: number;
      readonly resultCount: number;
    }
  | {
      readonly name: "connection_status_changed";
      readonly from: ConnectionStatus;
      readonly to: ConnectionStatus;
    };

export interface AnalyticsAdapter {
  track(event: AnalyticsEvent): void;
}

export function createNoopAnalytics(): AnalyticsAdapter {
  return {
    track() {},
  };
}

const defaultAnalytics = createNoopAnalytics();

export function track(event: AnalyticsEvent, adapter: AnalyticsAdapter = defaultAnalytics): void {
  adapter.track(event);
}

export function attachConnectionAnalytics(
  socketClient: Pick<SocketClient, "getStatus" | "subscribeStatus">,
  adapter: AnalyticsAdapter,
): () => void {
  let previousStatus = socketClient.getStatus();
  return socketClient.subscribeStatus(() => {
    const nextStatus = socketClient.getStatus();
    if (nextStatus !== previousStatus) {
      adapter.track({
        name: "connection_status_changed",
        from: previousStatus,
        to: nextStatus,
      });
      previousStatus = nextStatus;
    }
  });
}
