import type { MetadataRoute } from "next";
import { allowIndexing, siteUrl } from "../metadata/site.ts";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    ...(allowIndexing ? { sitemap: new URL("/sitemap.xml", siteUrl).href } : {}),
  };
}
