import { useContext } from "react";
import { describe, expect, it, vi } from "vitest";
import { createCoreServices, DEFAULT_LOCALE, useLocale, useT } from "../index.ts";
import { createFakeGateway } from "../testing/fake-gateway.ts";
import {
  createFakeLifecycle,
  createFakeNetwork,
  createFakeStorage,
} from "../testing/fake-platform.ts";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useContext: vi.fn(),
  };
});

function makeServices(locale?: string) {
  return createCoreServices({
    gatewayUrl: "http://localhost:4000",
    storage: createFakeStorage(),
    network: createFakeNetwork("online"),
    lifecycle: createFakeLifecycle("foreground"),
    socketFactory: createFakeGateway().socketFactory,
    locale,
  });
}

describe("useT and i18next catalogue", () => {
  it("translates keys and interpolates values without HTML-escaping", () => {
    const services = makeServices();
    vi.mocked(useContext).mockReturnValue(services);

    const t = useT();
    expect(useLocale()).toBe(DEFAULT_LOCALE);
    expect(t("header.title")).toBe("Markets");
    expect(t("feedMode.simulated")).toBe("Simulated");
    expect(t("marketStatus.closed")).toBe("Market closed");
    expect(t("star.label", { name: "AT&T" })).toBe("Star AT&T");
    expect(t("detail.notFound.help", { symbol: "NOPE123" })).toBe(
      "There's no stock with the symbol NOPE123.",
    );
    expect(t("search.noResults.title", { query: "nvda" })).toBe('No results for "nvda"');
  });

  it("handles plural forms through i18next and Intl.PluralRules", () => {
    const services = makeServices();
    vi.mocked(useContext).mockReturnValue(services);

    const t = useT();
    expect(t("watchlist.count", { count: 0 })).toBe("0 stocks");
    expect(t("watchlist.count", { count: 1 })).toBe("1 stock");
    expect(t("watchlist.count", { count: 5 })).toBe("5 stocks");

    expect(t("search.resultsCount", { count: 0 })).toBe("0 results");
    expect(t("search.resultsCount", { count: 1 })).toBe("1 result");
    expect(t("search.resultsCount", { count: 10 })).toBe("10 results");
  });

  it("creates an independent i18n instance per provider", () => {
    const first = makeServices("en-US");
    const second = makeServices("en-GB");

    expect(first.i18n).not.toBe(second.i18n);
    expect(first.i18n.locale).toBe("en-US");
    expect(second.i18n.locale).toBe("en-GB");
    expect(first.i18n.t("header.title")).toBe("Markets");
    expect(second.i18n.t("header.title")).toBe("Markets");
  });
});
