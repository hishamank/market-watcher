import type { AnalyticsAdapter, Track } from "@mini/analytics";
import type { QueryCache, QueryKey } from "@tanstack/react-query";
import type { FeedSession } from "../realtime/feed-session.ts";
import type { SocketClient } from "../realtime/socket-types.ts";
import { RestClientError } from "../rest/rest-client.ts";

export function createTrack(
  adapter: AnalyticsAdapter,
  locale: () => string,
  feedSession: FeedSession,
): Track {
  return (event) => adapter.track(event, { locale: locale(), feedMode: feedSession.mode() });
}

export function attachConnectionAnalytics(
  socketClient: Pick<SocketClient, "getStatus" | "subscribeStatus">,
  track: Track,
): () => void {
  let previousStatus = socketClient.getStatus();
  let enteredAt = Date.now();
  return socketClient.subscribeStatus(() => {
    const nextStatus = socketClient.getStatus();
    if (nextStatus === previousStatus) return;
    const now = Date.now();
    track({
      name: "connection_status_changed",
      from: previousStatus,
      to: nextStatus,
      msInPrevious: now - enteredAt,
    });
    previousStatus = nextStatus;
    enteredAt = now;
  });
}

function resourceOf(queryKey: QueryKey): string {
  const [scope, kind] = queryKey;
  if (scope === "stocks" && typeof kind === "string") return kind;
  return String(scope).replace(/^(stock|company)-/, "");
}

export function attachRequestAnalytics(queryCache: QueryCache, track: Track): () => void {
  return queryCache.subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "error") return;
    const { error } = event.action;
    if (!(error instanceof RestClientError)) return;
    track({ name: "request_failed", resource: resourceOf(event.query.queryKey), code: error.code });
  });
}

const startedSessions = new WeakSet<object>();

export function attachSessionAnalytics(
  owner: object,
  socketClient: Pick<SocketClient, "getStatus" | "subscribeStatus">,
  track: Track,
): () => void {
  const startOnConnect = () => {
    if (startedSessions.has(owner) || socketClient.getStatus() !== "connected") return;
    startedSessions.add(owner);
    track({ name: "session_started" });
  };
  startOnConnect();
  return socketClient.subscribeStatus(startOnConnect);
}
