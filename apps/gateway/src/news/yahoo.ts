import type { NewsSource } from "./source.ts";
import { parseYahooRss } from "./rss.ts";

async function readFeed(response: Response): Promise<string> {
  if (!response.ok || !response.body) throw new Error("News feed is unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1_048_576) throw new Error("News feed exceeds size limit");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function createYahooNewsSource(): NewsSource {
  return {
    async load(symbol, signal) {
      const url = new URL("https://finance.yahoo.com/rss/headline");
      url.search = new URLSearchParams({
        s: symbol.replaceAll(".", "-"),
        region: "US",
        lang: "en-US",
      }).toString();
      const response = await fetch(url, {
        signal,
        headers: {
          "User-Agent": "MiniTradingApp/1.0 (RSS reader)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
      });
      return parseYahooRss(await readFeed(response));
    },
  };
}
