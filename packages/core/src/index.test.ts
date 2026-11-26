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
  "stockPagesQueryOptions",
  "stockQueryKeys",
  "stockQueryOptions",
  "stocksBySymbolsQueryOptions",
  "useChaosControls",
  "useColorScheme",
  "useCompanyProfile",
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
  "useStockPages",
  "useStockStatistics",
  "useStocks",
  "useT",
  "useTableColumns",
  "useTrack",
  "useWatchlist",
];

describe("core public API", () => {
  it("exports exactly the frozen runtime names", () => {
    expect(Object.keys(core).sort()).toEqual(FROZEN_RUNTIME_EXPORTS);
  });
});
