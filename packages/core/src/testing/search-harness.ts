import type { SearchMatch } from "@mini/contracts";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import type { AnalyticsEvent } from "../analytics/analytics.ts";
import { createCoreServices } from "../core-provider.tsx";
import type { AbortSignalLike, HttpFetch, HttpResponse } from "../rest/rest-client.ts";
import { createFakeGateway } from "./fake-gateway.ts";
import { createFakeLifecycle, createFakeNetwork, createFakeStorage } from "./fake-platform.ts";
import { FAKE_GATEWAY_URL } from "./fake-rest.ts";

export interface PendingSearchRequest {
  readonly path: string;
  readonly signal: AbortSignalLike | undefined;
  resolve(results: readonly SearchMatch[]): void;
  fail(status: number, code: string): void;
}

export function createDeferredSearchFetch() {
  const calls: PendingSearchRequest[] = [];
  const fetch: HttpFetch = (url, init) =>
    new Promise<HttpResponse>((resolve) => {
      const path = url.startsWith(FAKE_GATEWAY_URL) ? url.slice(FAKE_GATEWAY_URL.length) : url;
      calls.push({
        path,
        signal: init.signal,
        resolve: (results) =>
          resolve({
            ok: true,
            status: 200,
            json: async () => ({ feedMode: "simulated", marketStatus: "open", results }),
          }),
        fail: (status, code) =>
          resolve({
            ok: false,
            status,
            json: async () => ({
              feedMode: "simulated",
              marketStatus: "open",
              error: { code, message: "Search failed" },
            }),
          }),
      });
    });
  return { calls, fetch };
}

export function createHookRuntime(fetch: HttpFetch) {
  const queryClient = new QueryClient();
  const events: AnalyticsEvent[] = [];
  const services = createCoreServices(
    {
      gatewayUrl: FAKE_GATEWAY_URL,
      storage: createFakeStorage(),
      network: createFakeNetwork("online"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: createFakeGateway().socketFactory,
      fetch,
      analytics: { track: (event) => events.push(event) },
    },
    queryClient,
  );

  let state = "";
  let prevDeps: readonly unknown[] | undefined;
  let cleanup: (() => void) | undefined;
  let observer: QueryObserver<unknown, unknown, unknown, unknown, readonly unknown[]> | undefined;
  let unsubscribe: (() => void) | undefined;

  return {
    services,
    events,
    useStateImpl: (): [string, (next: unknown) => void] => [
      state,
      (next: unknown) => {
        state = typeof next === "function" ? (next as (prev: string) => string)(state) : `${next}`;
      },
    ],
    useEffectImpl: (effect: () => void | (() => void), deps?: readonly unknown[]) => {
      const changed =
        prevDeps === undefined ||
        deps === undefined ||
        deps.length !== prevDeps.length ||
        deps.some((item, index) => !Object.is(item, prevDeps?.[index]));
      if (changed) {
        cleanup?.();
        prevDeps = deps;
        const nextCleanup = effect();
        cleanup = typeof nextCleanup === "function" ? nextCleanup : undefined;
      }
    },
    useQueryImpl: (options: Parameters<QueryClient["defaultQueryOptions"]>[0]) => {
      const defaulted = queryClient.defaultQueryOptions(options);
      if (observer === undefined) {
        const created = new QueryObserver(queryClient, defaulted);
        observer = created;
        unsubscribe = created.subscribe(() => {});
      } else {
        observer.setOptions(defaulted);
      }
      return observer.getOptimisticResult(defaulted);
    },
    unmount: () => {
      cleanup?.();
      unsubscribe?.();
      observer?.destroy();
      services.socketClient.stop();
    },
  };
}
