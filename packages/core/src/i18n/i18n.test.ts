import { useContext, useSyncExternalStore } from "react";
import { describe, expect, it, vi } from "vitest";
import { formatMarketDate, useLanguage, useLocale, useT, type LocaleSwitch } from "../index.ts";
import { createCoreServices } from "../core-provider.tsx";
import { DEFAULT_LOCALE } from "../format/constants.ts";
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
    useSyncExternalStore: vi.fn(),
  };
});

vi.mocked(useSyncExternalStore).mockImplementation((_subscribe, getSnapshot) => getSnapshot());

function makeServices(locale?: string, switchLocale?: LocaleSwitch) {
  return createCoreServices({
    gatewayUrl: "http://localhost:4000",
    storage: createFakeStorage(),
    network: createFakeNetwork("online"),
    lifecycle: createFakeLifecycle("foreground"),
    socketFactory: createFakeGateway().socketFactory,
    locale,
    switchLocale,
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
    first.i18n.setLocale("ar");
    expect(first.i18n.getLocale()).toBe("ar");
    expect(second.i18n.getLocale()).toBe("en-US");
  });
});

describe("Arabic", () => {
  it("translates with all six plural forms", () => {
    vi.mocked(useContext).mockReturnValue(makeServices("ar"));

    const t = useT();
    expect(t("header.title")).toBe("الأسواق");
    expect([0, 1, 2, 3, 11, 100].map((count) => t("list.count", { count }))).toEqual([
      "لا توجد أسهم",
      "سهم واحد",
      "سهمان",
      "3 أسهم",
      "11 سهمًا",
      "100 سهم",
    ]);
  });

  it("isolates interpolated values so they read left to right", () => {
    vi.mocked(useContext).mockReturnValue(makeServices("ar"));

    expect(useT()("detail.notFound.help", { symbol: "BRK.B" })).toBe(
      "لا يوجد سهم بالرمز \u2066BRK.B\u2069.",
    );
  });

  it("switches language through the platform and keeps Latin digits", () => {
    const switchLocale = vi.fn<LocaleSwitch>((_next, apply) => apply());
    const services = makeServices(undefined, switchLocale);
    vi.mocked(useContext).mockReturnValue(services);

    expect(useLanguage().direction).toBe("ltr");
    useLanguage().setLocale("ar");

    expect(switchLocale).toHaveBeenCalledOnce();
    expect(useLanguage()).toMatchObject({ locale: "ar", direction: "rtl" });
    expect(useT()("list.view.all")).toBe("الكل");
    expect(formatMarketDate(Date.UTC(2026, 10, 26, 15), { locale: useLocale() })).toBe(
      "\u206726 نوفمبر\u2069",
    );
  });

  it("falls back to English for an unknown locale", () => {
    vi.mocked(useContext).mockReturnValue(makeServices("fr"));

    expect(useLocale()).toBe(DEFAULT_LOCALE);
    expect(useT()("header.title")).toBe("Markets");
  });
});
