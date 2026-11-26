import type { CompanyProfile } from "@mini/contracts";
import type { ProfileSource } from "./source.ts";

const company: CompanyProfile = {
  kind: "company",
  description:
    "This sample company designs consumer electronics and software, with services that connect its products. Its business spans personal devices, digital subscriptions and tools for work and everyday life. Customers buy its products through online stores, retail locations and distribution partners. This fictional overview demonstrates the company section without contacting an external data provider.",
  sector: "Technology",
  industry: "Consumer electronics",
  exchange: "NASDAQ",
  website: null,
};

const fund: CompanyProfile = {
  kind: "fund",
  description:
    "This sample exchange-traded fund follows a broad basket of large US companies. It gives investors exposure to multiple industries through a single listed security. This fictional overview demonstrates the fund section without contacting an external data provider.",
  sector: null,
  industry: null,
  exchange: "NYSE Arca",
  website: null,
};

export const simulatorProfileSource: ProfileSource = {
  async load(symbol) {
    if (["AAPL", "MSFT"].includes(symbol)) return company;
    if (["SPY", "QQQ", "VTI"].includes(symbol)) return fund;
    return null;
  },
};
