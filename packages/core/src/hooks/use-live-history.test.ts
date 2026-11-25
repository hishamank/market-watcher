import { changeBetween, type Bar, type HistoryResponse } from "@mini/contracts";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveHistory } from "../index.ts";
import { createCoreServices } from "../core-provider.tsx";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
  makeQuote,
} from "../testing/fake-platform.ts";
import { dayHistoryBody } from "../testing/fake-rest.ts";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useContext: vi.fn(),
    useCallback: <T>(callback: T) => callback,
    useEffect: vi.fn(),
    useMemo: <T>(factory: () => T, deps: readonly unknown[]): T => {
      const hit =
        memo?.deps.length === deps.length && deps.every((d, i) => Object.is(d, memo?.deps[i]));
      if (!hit) memo = { deps, value: factory() };
      return memo?.value as T;
    },
    useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
  };
});

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQuery: vi.fn() };
});

const HOUR_MS = 3_600_000;
let memo: { deps: readonly unknown[]; value: unknown } | undefined;

function servicesWith() {
  return createCoreServices(
    {
      gatewayUrl: "http://localhost:4000",
      storage: createFakeStorage(),
      network: createFakeNetwork("online"),
      lifecycle: createFakeLifecycle("foreground"),
      socketFactory: createFakeGateway().socketFactory,
    },
    new QueryClient(),
  );
}

function weekHistoryBody(symbol: string, bars: readonly Bar[]): HistoryResponse {
  return {
    feedMode: "simulated",
    marketStatus: "open",
    symbol,
    range: "1W",
    barSize: "30m",
    previousClose: "100.00",
    bars: [...bars],
  };
}

function serveHistory(result: Partial<ReturnType<typeof useQuery>>) {
  vi.mocked(useQuery).mockReturnValue({
    status: "success",
    error: null,
    refetch: vi.fn(),
    dataUpdatedAt: 0,
    ...result,
  } as ReturnType<typeof useQuery>);
}

let services: ReturnType<typeof servicesWith>;

beforeEach(() => {
  memo = undefined;
  services = servicesWith();
  vi.mocked(useContext).mockReturnValue(services);
});

describe("useLiveHistory range change", () => {
  it("measures 1D from the previous close, so it equals the quote's day change", () => {
    serveHistory({ data: dayHistoryBody("PROBE", [{ time: HOUR_MS, close: "100.50" }]) });
    const quote = {
      ...makeQuote("PROBE", "101.50", 2 * HOUR_MS),
      ...changeBetween("100.00", "101.50"),
    };
    services.quoteStore.upsert(quote);

    const result = useLiveHistory("PROBE", "1D");

    expect(result.baseline).toBe("100.00");
    expect(result.rangeChange).toEqual({ change: quote.change, changePercent: "1.50" });
    expect(result.session).toEqual({ open: 0, close: 86_400_000 });
  });

  it("measures 1W from the fetched first bar, even when the live point replaces it", () => {
    serveHistory({ data: weekHistoryBody("PROBE", [{ time: 0, close: "200.00" }]) });
    services.quoteStore.upsert(makeQuote("PROBE", "210.00", 60_000));

    const result = useLiveHistory("PROBE", "1W");

    expect(result.bars).toEqual([{ time: 60_000, close: "210.00" }]);
    expect(result.baseline).toBe("200.00");
    expect(result.rangeChange).toEqual({ change: "10.00", changePercent: "5.00" });
    expect(result.session).toBeUndefined();
  });

  it("moves with each newer quote on the live point", () => {
    serveHistory({ data: weekHistoryBody("PROBE", [{ time: 0, close: "200.00" }]) });

    services.quoteStore.upsert(makeQuote("PROBE", "202.00", HOUR_MS));
    expect(useLiveHistory("PROBE", "1W").rangeChange?.change).toBe("2.00");

    services.quoteStore.upsert(makeQuote("PROBE", "198.00", 2 * HOUR_MS));
    expect(useLiveHistory("PROBE", "1W").rangeChange).toEqual({
      change: "-2.00",
      changePercent: "-1.00",
    });
  });

  it("is undefined for a range whose history failed and never loaded", () => {
    serveHistory({ status: "error", error: new Error("unavailable"), data: undefined });
    services.quoteStore.upsert(makeQuote("PROBE", "101.00", HOUR_MS));

    const result = useLiveHistory("PROBE", "1W");

    expect(result.status).toBe("error");
    expect(result.rangeChange).toBeUndefined();
    expect(result.bars).toEqual([]);
  });

  it("keeps exact decimal strings where float subtraction would drift", () => {
    serveHistory({ data: weekHistoryBody("PROBE", [{ time: 0, close: "100.10" }]) });
    services.quoteStore.upsert(makeQuote("PROBE", "100.30", HOUR_MS));

    const result = useLiveHistory("PROBE", "1W");

    expect(100.3 - 100.1).not.toBe(0.2);
    expect(result.rangeChange).toEqual({ change: "0.20", changePercent: "0.20" });
  });

  it("dates a fallback copy from its age", () => {
    serveHistory({
      data: { ...weekHistoryBody("PROBE", [{ time: 0, close: "200.00" }]), ageMs: 5 * HOUR_MS },
      dataUpdatedAt: 6 * HOUR_MS,
    });

    const result = useLiveHistory("PROBE", "1W");

    expect(result.ageMs).toBe(5 * HOUR_MS);
    expect(result.asOf).toBe(HOUR_MS);
  });

  it("keeps a fallback copy's bars as the gateway sent them, even with a newer quote", () => {
    serveHistory({
      data: { ...weekHistoryBody("PROBE", [{ time: 0, close: "200.00" }]), ageMs: 5 * HOUR_MS },
      dataUpdatedAt: 6 * HOUR_MS,
    });
    services.quoteStore.upsert(makeQuote("PROBE", "210.00", 6 * HOUR_MS));

    const result = useLiveHistory("PROBE", "1W");

    expect(result.bars).toEqual([{ time: 0, close: "200.00" }]);
    expect(result.rangeChange).toEqual({ change: "0.00", changePercent: "0.00" });
  });

  it("returns the same result when a parent re-renders with unchanged inputs", () => {
    const data = weekHistoryBody("PROBE", [{ time: 0, close: "200.00" }]);
    const refetch = vi.fn();
    vi.mocked(useQuery).mockImplementation(
      () =>
        ({
          status: "success",
          error: null,
          refetch,
          data,
          dataUpdatedAt: 0,
        }) as unknown as ReturnType<typeof useQuery>,
    );
    services.quoteStore.upsert(makeQuote("PROBE", "202.00", HOUR_MS));

    expect(useLiveHistory("PROBE", "1W")).toBe(useLiveHistory("PROBE", "1W"));
  });
});
