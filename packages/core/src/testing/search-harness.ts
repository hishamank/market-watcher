import type { SearchMatch } from "@mini/contracts";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import type { AnalyticsEvent } from "@mini/analytics";
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
  let effectIndex = 0;
  let refIndex = 0;
  const refs: { current: unknown }[] = [];
  const effects: { deps: readonly unknown[] | undefined; cleanup: (() => void) | undefined }[] = [];
  let observer: QueryObserver<unknown, unknown, unknown, unknown, readonly unknown[]> | undefined;
  let unsubscribe: (() => void) | undefined;

  return {
    services,
    events,
    useStateImpl: (): [string, (next: unknown) => void] => {
      effectIndex = 0;
      refIndex = 0;
      return [
        state,
        (next: unknown) => {
          state =
            typeof next === "function" ? (next as (prev: string) => string)(state) : `${next}`;
        },
      ];
    },
    useRefImpl: (initial: unknown) => {
      refs[refIndex] ??= { current: initial };
      refIndex += 1;
      return refs[refIndex - 1];
    },
    useEffectImpl: (effect: () => void | (() => void), deps?: readonly unknown[]) => {
      const slot = effects[effectIndex];
      effectIndex += 1;
      const prevDeps = slot?.deps;
      const changed =
        slot === undefined ||
        prevDeps === undefined ||
        deps === undefined ||
        deps.length !== prevDeps.length ||
        deps.some((item, index) => !Object.is(item, prevDeps[index]));
      if (!changed) return;
      slot?.cleanup?.();
      const nextCleanup = effect();
      effects[effectIndex - 1] = {
        deps,
        cleanup: typeof nextCleanup === "function" ? nextCleanup : undefined,
      };
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
      for (const slot of effects) slot.cleanup?.();
      unsubscribe?.();
      observer?.destroy();
      services.socketClient.stop();
    },
  };
}
