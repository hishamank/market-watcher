import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSearch } from "../index.ts";
import { SEARCH_DEBOUNCE_MS, SEARCH_STALE_MS } from "../rest/search-query.ts";
import { createDeferredSearchFetch } from "../testing/search-harness.ts";
import { flushQuery, mountRuntime } from "../testing/search-mount.ts";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useCallback: <T>(callback: T) => callback,
    useContext: vi.fn(),
    useEffect: vi.fn(),
    useMemo: <T>(factory: () => T) => factory(),
    useRef: vi.fn(),
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

describe("useSearch analytics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts a repeated search answered from the cache", async () => {
    const { calls, fetch } = createDeferredSearchFetch();
    const runtime = mountRuntime(fetch);

    useSearch("ap");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    useSearch("ap");
    calls[0]?.resolve([{ symbol: "AAPL", name: "Apple Inc." }]);
    await flushQuery();
    useSearch("ap");

    useSearch("");
    vi.advanceTimersByTime(0);
    useSearch("ap");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    expect(useSearch("ap").status).toBe("success");

    expect(calls).toHaveLength(1);
    expect(runtime.events).toEqual([
      { name: "search_performed", queryLength: 2, resultCount: 1 },
      { name: "search_performed", queryLength: 2, resultCount: 1 },
    ]);
    runtime.unmount();
  });

  it("counts a stale cached search once, after its refresh settles", async () => {
    const { calls, fetch } = createDeferredSearchFetch();
    const runtime = mountRuntime(fetch);

    useSearch("ap");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    useSearch("ap");
    calls[0]?.resolve([{ symbol: "AAPL", name: "Apple Inc." }]);
    await flushQuery();
    useSearch("ap");

    useSearch("");
    vi.advanceTimersByTime(SEARCH_STALE_MS + 1);
    useSearch("ap");
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    useSearch("ap");
    calls[1]?.resolve([]);
    await flushQuery();
    expect(useSearch("ap")).toMatchObject({ status: "success", results: [] });

    expect(calls).toHaveLength(2);
    expect(runtime.events).toEqual([
      { name: "search_performed", queryLength: 2, resultCount: 1 },
      { name: "search_performed", queryLength: 2, resultCount: 0 },
    ]);
    runtime.unmount();
  });
});
