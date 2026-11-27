import { createRestClient } from "@mini/core";
import type { MetadataRoute } from "next";
import { gatewayUrl } from "../gateway/shell-meta.ts";
import { allowIndexing, siteUrl } from "../metadata/site.ts";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!allowIndexing) return [];
  const { stocks } = await createRestClient({ gatewayUrl }).listStocks();
  return ["/", ...stocks.map(({ symbol }) => `/stocks/${encodeURIComponent(symbol)}`)].map(
    (path) => ({ url: new URL(path, siteUrl).href }),
  );
}
