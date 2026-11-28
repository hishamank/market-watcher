import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useRef, useState } from "react";
import { vi } from "vitest";
import { createHookRuntime, type createDeferredSearchFetch } from "./search-harness.ts";

export function mountRuntime(fetch: ReturnType<typeof createDeferredSearchFetch>["fetch"]) {
  const runtime = createHookRuntime(fetch);
  vi.mocked(useContext).mockReturnValue(runtime.services);
  vi.mocked(useState).mockImplementation(runtime.useStateImpl as typeof useState);
  vi.mocked(useEffect).mockImplementation(runtime.useEffectImpl);
  vi.mocked(useRef).mockImplementation(runtime.useRefImpl as typeof useRef);
  vi.mocked(useQuery).mockImplementation(
    (options) =>
      runtime.useQueryImpl(options as Parameters<typeof runtime.useQueryImpl>[0]) as ReturnType<
        typeof useQuery
      >,
  );
  return runtime;
}

export async function flushQuery(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}
