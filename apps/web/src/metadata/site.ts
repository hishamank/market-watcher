export const siteUrl = new URL(process.env.SITE_URL ?? "https://stocks-watchlist-puce.vercel.app");

export const allowIndexing =
  process.env.NODE_ENV === "production" &&
  (process.env.VERCEL_ENV === undefined || process.env.VERCEL_ENV === "production");
