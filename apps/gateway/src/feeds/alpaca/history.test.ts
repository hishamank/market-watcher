import { BAR_SIZE_BY_RANGE, RANGES } from "@mini/contracts";
import { afterEach, expect, test } from "vitest";
import { type AlpacaRig, SESSION_NOW, startAlpaca } from "./testing.ts";

let rig: AlpacaRig | undefined;

afterEach(() => {
  rig?.feed.close();
  rig = undefined;
});

const TIMEFRAME_BY_BAR_SIZE = {
  "5m": "5Min",
  "30m": "30Min",
  "1h": "1Hour",
  "1d": "1Day",
  "1w": "1Week",
} as const;

test("each range asks Alpaca for its own bar size on the IEX feed", async () => {
  rig = await startAlpaca();
  for (const range of RANGES) {
    await rig.feed.history.history({ symbol: "AAPL", range, now: SESSION_NOW });
    const bars = rig.alpaca.calls("/v2/stocks/bars").at(-1);
    expect(bars?.searchParams.get("timeframe")).toBe(
      TIMEFRAME_BY_BAR_SIZE[BAR_SIZE_BY_RANGE[range]],
    );
    expect(bars?.searchParams.get("feed")).toBe("iex");
    expect(bars?.searchParams.get("symbols")).toBe("AAPL");
  }
});

test("1D covers the regular session across pages, with the previous close", async () => {
  rig = await startAlpaca();
  const series = await rig.feed.history.history({ symbol: "AAPL", range: "1D", now: SESSION_NOW });

  const bars = rig.alpaca.calls("/v2/stocks/bars");
  expect(bars).toHaveLength(2);
  expect(bars[0]?.searchParams.get("start")).toBe("2025-06-24T13:30:00.000Z");
  expect(bars[1]?.searchParams.get("page_token")).toBe("page-2");
  expect(series).toEqual({
    bars: [
      { time: Date.parse("2025-06-24T13:30:00Z"), close: "201.00" },
      { time: Date.parse("2025-06-24T13:35:00Z"), close: "201.11" },
      { time: Date.parse("2025-06-24T13:40:00Z"), close: "201.25" },
    ],
    previousClose: "200.30",
    session: {
      open: Date.parse("2025-06-24T13:30:00Z"),
      close: Date.parse("2025-06-24T20:00:00Z"),
    },
  });
});

test("daily ranges keep every bar and carry no session", async () => {
  rig = await startAlpaca();
  const series = await rig.feed.history.history({ symbol: "AAPL", range: "3M", now: SESSION_NOW });
  expect(series.session).toBeUndefined();
  expect(series.previousClose).toBe("200.30");
  expect(series.bars.map((bar) => bar.close)).toEqual(["199.60", "200.30", "201.50"]);
});

test("history passes the abort signal through to Alpaca", async () => {
  rig = await startAlpaca();
  const controller = new AbortController();
  controller.abort(new Error("superseded"));
  const request = rig.feed.history.history({
    symbol: "AAPL",
    range: "1W",
    now: SESSION_NOW,
    signal: controller.signal,
  });
  await expect(request).rejects.toThrow("superseded");
  const bars = rig.alpaca.requests.find(({ url }) => url.pathname === "/v2/stocks/bars");
  expect(bars?.signal).toBe(controller.signal);
});

function endlessPages(pagesWithToken: number): (url: URL) => string {
  return (url) => {
    const page = Number(url.searchParams.get("page_token") ?? "0");
    const time = new Date(Date.parse("2025-06-20T13:30:00Z") + page * 1_800_000).toISOString();
    const next = page + 1 < pagesWithToken ? String(page + 1) : null;
    return JSON.stringify({ bars: { AAPL: [{ t: time, c: 201 }] }, next_page_token: next });
  };
}

test("history follows short pages to the last token", async () => {
  rig = await startAlpaca((alpaca) => alpaca.routes.set("/v2/stocks/bars", endlessPages(9)));
  const series = await rig.feed.history.history({ symbol: "AAPL", range: "1W", now: SESSION_NOW });
  expect(rig.alpaca.calls("/v2/stocks/bars")).toHaveLength(9);
  expect(series.bars).toHaveLength(9);
});

test("history rejects when ten short pages still carry a token, so nothing truncated is cached", async () => {
  rig = await startAlpaca((alpaca) => alpaca.routes.set("/v2/stocks/bars", endlessPages(1_000)));
  await expect(
    rig.feed.history.history({ symbol: "AAPL", range: "1W", now: SESSION_NOW }),
  ).rejects.toThrow("more pages");
  expect(rig.alpaca.calls("/v2/stocks/bars")).toHaveLength(10);
});
