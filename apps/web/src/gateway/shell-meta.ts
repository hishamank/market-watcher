import {
  FeedModeSchema,
  MarketStatusSchema,
  type FeedMode,
  type MarketStatus,
} from "@mini/contracts";
import { buildRestBaseUrl } from "@mini/core";
import { cache } from "react";

export interface ShellMeta {
  readonly feedMode: FeedMode | null;
  readonly marketStatus: MarketStatus | null;
}

const SHELL_META_TIMEOUT_MS = 2_000;

export const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:4000";

async function fetchShellMeta(): Promise<ShellMeta> {
  try {
    const response = await fetch(`${buildRestBaseUrl(gatewayUrl)}/stocks`, {
      cache: "no-store",
      signal: AbortSignal.timeout(SHELL_META_TIMEOUT_MS),
    });
    const body: { feedMode?: unknown; marketStatus?: unknown } = await response.json();
    return {
      feedMode: FeedModeSchema.safeParse(body.feedMode).data ?? null,
      marketStatus: MarketStatusSchema.safeParse(body.marketStatus).data ?? null,
    };
  } catch {
    return { feedMode: null, marketStatus: null };
  }
}

export const readShellMeta = cache(fetchShellMeta);
