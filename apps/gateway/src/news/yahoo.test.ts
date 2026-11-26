import { afterEach, expect, it, vi } from "vitest";
import { createYahooNewsSource } from "./yahoo.ts";

afterEach(() => vi.unstubAllGlobals());
it("requests only the Yahoo feed with the normalized ticker and rejects failed/oversized responses", async () => {
  const fetcher = vi.fn<typeof fetch>(
    async () => new Response("<rss><channel><title>Feed</title></channel></rss>"),
  );
  vi.stubGlobal("fetch", fetcher);
  const source = createYahooNewsSource();
  const signal = new AbortController().signal;
  expect(await source.load("BRK.B", signal)).toEqual([]);
  expect(String(fetcher.mock.calls[0]?.[0])).toBe(
    "https://finance.yahoo.com/rss/headline?s=BRK-B&region=US&lang=en-US",
  );
  fetcher.mockResolvedValue(new Response("Unavailable", { status: 429 }));
  await expect(source.load("AAPL", signal)).rejects.toThrow("unavailable");
  fetcher.mockResolvedValue(new Response("x".repeat(1_048_577)));
  await expect(source.load("AAPL", signal)).rejects.toThrow("size limit");
});
