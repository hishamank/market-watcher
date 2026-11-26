import { describe, expect, it } from "vitest";
import * as core from "./index.ts";

const FROZEN_RUNTIME_EXPORTS = [
  "CoreProvider",
  "MARKET_TIME_ZONE_LABEL",
  "RestClientError",
  "buildRestBaseUrl",
  "createRestClient",
  "directionOf",
  "formatMarketDate",
  "formatMarketDateTime",
  "formatMarketTime",
  "formatPrice",
  "formatSignedAmount",
  "formatSignedChange",
  "formatSignedPercent",
  "historyQueryOptions",
  "localeDirection",
  "parseLocale",
  "stockListQueryOptions",
  "stockQueryKeys",
  "stockQueryOptions",
  "stocksBySymbolsQueryOptions",
  "useChaosControls",
  "useColorScheme",
  "useConnectionHealth",
  "useConnectionStatus",
  "useHistory",
  "useLanguage",
  "useLiveHistory",
  "useLocale",
  "useMarketStatus",
  "useQuote",
  "useSearch",
  "useStock",
  "useStockList",
  "useStocks",
  "useT",
  "useTrack",
  "useWatchlist",
];

describe("core public API", () => {
  it("exports exactly the frozen runtime names", () => {
    expect(Object.keys(core).sort()).toEqual(FROZEN_RUNTIME_EXPORTS);
  });
});
