import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSearch } from "../index.ts";
import { SEARCH_DEBOUNCE_MS } from "../rest/search-query.ts";
import { createDeferredSearchFetch, createHookRuntime } from "../testing/search-harness.ts";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useCallback: <T>(callback: T) => callback,
    useContext: vi.fn(),
    useEffect: vi.fn(),
    useMemo: <T>(factory: () => T) => factory(),
    useState: vi.fn(),
  };
});

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

function mountRuntime(fetch: ReturnType<typeof createDeferredSearchFetch>["fetch"]) {
  const runtime = createHookRuntime(fetch);
  vi.mocked(useContext).mockReturnValue(runtime.services);
  vi.mocked(useState).mockImplementation(runtime.useStateImpl as typeof useState);
  vi.mocked(useEffect).mockImplementation(runtime.useEffectImpl);
  vi.mocked(useQuery).mockImplementation(
    (options) =>
      runtime.useQueryImpl(options as Parameters<typeof runtime.useQueryImpl>[0]) as ReturnType<
        typeof useQuery
      >,
  );
  return runtime;
}

async function flushQuery(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

describe("useSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces requests by 150 ms and resets the timer on rapid typing", async () => {
    const { calls, fetch } = createDeferredSearchFetch();
    const runtime = mountRuntime(fetch);

    expect(useSearch("")).toMatchObject({ status: "idle", results: [], isFetching: false });

    const typing = useSearch("a");
    expect(typing).toMatchObject({ status: "loading", isFetching: false });
    vi.advanceTimersByTime(100);
    expect(calls).toHaveLength(0);

    useSearch("ap");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    expect(calls).toHaveLength(0);

    vi.advanceTimersByTime(1);
    const fetching = useSearch("ap");
    expect(calls.map((call) => call.path)).toEqual(["/stocks/search?q=ap"]);
    expect(fetching).toMatchObject({ status: "loading", isFetching: true, query: "ap" });

    calls[0]?.resolve([{ symbol: "AAPL", name: "Apple Inc." }]);
    await flushQuery();

    expect(useSearch("ap")).toMatchObject({
      status: "success",
      isFetching: false,
      query: "ap",
      results: [{ symbol: "AAPL", name: "Apple Inc." }],
    });
    expect(runtime.events).toEqual([{ name: "search_performed", queryLength: 2, resultCount: 1 }]);
    runtime.unmount();
  });

  it("cancels superseded requests with AbortSignal and ignores out-of-order responses", async () => {
    const { calls, fetch } = createDeferredSearchFetch();
    const runtime = mountRuntime(fetch);

    useSearch("a");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    useSearch("a");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.signal?.aborted).toBe(false);

    useSearch("ap");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    useSearch("ap");
    expect(calls).toHaveLength(2);
    expect(calls[0]?.signal?.aborted).toBe(true);
    expect(calls[1]?.signal?.aborted).toBe(false);

    useSearch("apple");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    useSearch("apple");
    expect(calls).toHaveLength(3);
    expect(calls[1]?.signal?.aborted).toBe(true);
    expect(calls[2]?.signal?.aborted).toBe(false);

    calls[2]?.resolve([{ symbol: "AAPL", name: "Apple Inc." }]);
    await flushQuery();
    calls[0]?.resolve([{ symbol: "A", name: "Agilent Technologies, Inc." }]);
    calls[1]?.resolve([{ symbol: "APD", name: "Air Products and Chemicals, Inc." }]);
    await flushQuery();

    const finalState = useSearch("apple");
    expect(finalState.status).toBe("success");
    expect(finalState.query).toBe("apple");
    expect(finalState.results).toEqual([{ symbol: "AAPL", name: "Apple Inc." }]);
    expect(runtime.events).toEqual([{ name: "search_performed", queryLength: 5, resultCount: 1 }]);
    runtime.unmount();
  });

  it("aborts in-flight search when cleared and recovers on retry after error", async () => {
    const { calls, fetch } = createDeferredSearchFetch();
    const runtime = mountRuntime(fetch);

    useSearch("nvda");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    useSearch("nvda");
    expect(calls[0]?.signal?.aborted).toBe(false);

    const cleared = useSearch("");
    expect(cleared).toMatchObject({ status: "idle", results: [], isFetching: false });
    expect(calls[0]?.signal?.aborted).toBe(true);
    vi.advanceTimersByTime(0);

    useSearch("msft");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    useSearch("msft");
    calls[1]?.fail(503, "unavailable");
    await flushQuery();

    const errored = useSearch("msft");
    expect(errored.status).toBe("error");
    expect(errored.error).not.toBeNull();

    errored.retry();
    expect(calls).toHaveLength(3);
    calls[2]?.resolve([{ symbol: "MSFT", name: "Microsoft Corporation" }]);
    await flushQuery();

    const recovered = useSearch("msft");
    expect(recovered.status).toBe("success");
    expect(recovered.results).toEqual([{ symbol: "MSFT", name: "Microsoft Corporation" }]);
    runtime.unmount();
  });
});
