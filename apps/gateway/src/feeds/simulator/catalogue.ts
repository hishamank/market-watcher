import { toUnits } from "@mini/contracts";
import rawCatalogue from "../../../data/catalogue.json" with { type: "json" };
import type { Catalogue, CatalogueEntry } from "../types.ts";

interface RawCatalogueAsset {
  symbol: string;
  name: string;
  basePrice: string;
}

interface RawCatalogueFile {
  defaultList: string[];
  assets: RawCatalogueAsset[];
}

export interface SimulatorCatalogueHandle {
  readonly catalogue: Catalogue;
  basePriceUnits(symbol: string): bigint | undefined;
}

export function createSimulatorCatalogue(): SimulatorCatalogueHandle {
  const file = rawCatalogue as RawCatalogueFile;
  const entries: CatalogueEntry[] = [];
  const bySymbol = new Map<string, CatalogueEntry>();
  const basePrices = new Map<string, bigint>();

  for (const asset of file.assets) {
    const entry: CatalogueEntry = { symbol: asset.symbol, name: asset.name };
    entries.push(entry);
    bySymbol.set(asset.symbol, entry);
    basePrices.set(asset.symbol, toUnits(asset.basePrice));
  }

  const defaults = Object.freeze([...file.defaultList]);
  const frozenEntries = Object.freeze(entries);

  const catalogue: Catalogue = {
    all: () => frozenEntries,
    get: (symbol) => bySymbol.get(symbol),
    defaultList: () => defaults,
  };

  return {
    catalogue,
    basePriceUnits: (symbol) => basePrices.get(symbol),
  };
}
