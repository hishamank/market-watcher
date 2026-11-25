import { useContext, useSyncExternalStore } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  type AnalyticsAdapter,
  createCoreServices,
  useWatchlist,
  WATCHLIST_STORAGE_KEY,
} from "../index.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
  settle,
} from "../testing/fake-platform.ts";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useCallback: <T>(callback: T) => callback,
    useContext: vi.fn(),
    useSyncExternalStore: vi.fn(),
  };
});

function servicesWith(storage = createFakeStorage(), analytics?: AnalyticsAdapter) {
  return createCoreServices({
    gatewayUrl: "http://localhost:4000",
    storage,
    analytics,
    network: createFakeNetwork("online"),
    lifecycle: createFakeLifecycle("foreground"),
    socketFactory: createFakeGateway().socketFactory,
  });
}

function mountWatchlist(services: ReturnType<typeof servicesWith>) {
  vi.mocked(useContext).mockReturnValue(services);
  const listeners: Array<() => void> = [];
  vi.mocked(useSyncExternalStore).mockImplementation((subscribe, getSnapshot) => {
    const listener = vi.fn();
    listeners.push(listener);
    subscribe(listener);
    return getSnapshot();
  });
  return {
    notified: () => listeners.some((listener) => vi.mocked(listener).mock.calls.length > 0),
  };
}

describe("watchlist hook", () => {
  it("updates when another tab changes the stored watchlist", async () => {
    const storage = createFakeStorage();
    const mounted = mountWatchlist(servicesWith(storage));
    expect(useWatchlist().isLoaded).toBe(false);
    await settle();
    expect(useWatchlist().isLoaded).toBe(true);
    expect(useWatchlist().symbols).toEqual([]);

    await storage.setItem(WATCHLIST_STORAGE_KEY, '["TSLA","AAPL"]');
    await settle();

    const result = useWatchlist();
    expect(mounted.notified()).toBe(true);
    expect(result.symbols).toEqual(["TSLA", "AAPL"]);
    expect(result.isStarred("TSLA")).toBe(true);
    expect(result.isStarred("MSFT")).toBe(false);
  });

  it("renders a neutral, stable watchlist on the server", () => {
    mountWatchlist(servicesWith());
    useWatchlist();
    const [, , getServerSnapshot] = vi.mocked(useSyncExternalStore).mock.lastCall ?? [];

    expect(getServerSnapshot?.()).toEqual({ symbols: [], loaded: false });
    expect(getServerSnapshot?.()).toBe(getServerSnapshot?.());
  });

  it("toggles at once through the hook", () => {
    mountWatchlist(servicesWith());

    useWatchlist().toggle("PLTR");

    expect(useWatchlist().symbols).toEqual(["PLTR"]);
  });

  it("tracks each toggle with the starred state it produced", () => {
    const track = vi.fn();
    mountWatchlist(servicesWith(createFakeStorage(), { track }));

    useWatchlist().toggle("PLTR");
    useWatchlist().toggle("PLTR");

    expect(track.mock.calls).toEqual([
      [{ name: "watchlist_toggled", symbol: "PLTR", starred: true }],
      [{ name: "watchlist_toggled", symbol: "PLTR", starred: false }],
    ]);
  });
});
