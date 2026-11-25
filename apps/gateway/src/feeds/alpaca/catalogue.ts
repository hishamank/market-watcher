import { SymbolSchema } from "@mini/contracts";
import simulatorCatalogue from "../../../data/catalogue.json" with { type: "json" };
import type { Catalogue, CatalogueEntry } from "../types.ts";
import { isFields, list, text } from "./fields.ts";
import type { AlpacaHttp } from "./http.ts";

export interface AlpacaCatalogue extends Catalogue {
  refresh(): Promise<void>;
}

interface Listing {
  readonly entries: readonly CatalogueEntry[];
  readonly bySymbol: ReadonlyMap<string, CatalogueEntry>;
  readonly defaults: readonly string[];
}

const PREFERRED_DEFAULTS: readonly string[] = simulatorCatalogue.defaultList;

function toEntry(item: unknown): CatalogueEntry[] {
  if (!isFields(item) || item["tradable"] !== true) {
    return [];
  }
  const symbol = text(item, "symbol");
  const name = text(item, "name")?.trim();
  const listed =
    text(item, "status") === "active" &&
    text(item, "class") === "us_equity" &&
    text(item, "exchange") !== "OTC";
  if (!listed || symbol === undefined || !SymbolSchema.safeParse(symbol).success) {
    return [];
  }
  return [{ symbol, name: name === undefined || name === "" ? symbol : name }];
}

function toListing(body: unknown): Listing {
  const entries = list(body)
    .flatMap(toEntry)
    .sort((a, b) => (a.symbol < b.symbol ? -1 : 1));
  if (entries.length === 0) {
    throw new Error("Alpaca returned no tradable US equities");
  }
  const bySymbol = new Map(entries.map((entry) => [entry.symbol, entry]));
  const defaults = PREFERRED_DEFAULTS.filter((symbol) => bySymbol.has(symbol));
  return { entries, bySymbol, defaults };
}

async function fetchListing(http: AlpacaHttp): Promise<Listing> {
  const body = await http.get("trading", "/v2/assets", {
    status: "active",
    asset_class: "us_equity",
  });
  return toListing(body);
}

export async function loadAlpacaCatalogue(
  http: AlpacaHttp,
  warn: (detail: object, message: string) => void,
): Promise<AlpacaCatalogue> {
  let listing = await fetchListing(http);
  return {
    all: () => listing.entries,
    get: (symbol) => listing.bySymbol.get(symbol),
    defaultList: () => listing.defaults,
    async refresh() {
      try {
        listing = await fetchListing(http);
      } catch (err) {
        warn({ err }, "Alpaca asset list refresh failed, keeping the previous list");
      }
    },
  };
}
