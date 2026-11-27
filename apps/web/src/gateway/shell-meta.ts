import { type FeedMode, type MarketStatus } from "@mini/contracts";
import { cache } from "react";
import { readInitialStocks } from "./initial-stocks.ts";

export { gatewayUrl } from "./initial-stocks.ts";

export interface ShellMeta {
  readonly feedMode: FeedMode | null;
  readonly marketStatus: MarketStatus | null;
}

async function fetchShellMeta(): Promise<ShellMeta> {
  try {
    const { feedMode, marketStatus } = await readInitialStocks();
    return { feedMode, marketStatus };
  } catch {
    return { feedMode: null, marketStatus: null };
  }
}

export const readShellMeta = cache(fetchShellMeta);
