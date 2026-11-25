import { changeBetween, type Quote } from "@mini/contracts";
import { expect, test, vi } from "vitest";
import type { LiveFeed, MarketCalendar } from "../feeds/types.ts";
import { createFakeFeed } from "./fake-feed.ts";
import { createQuoteBook } from "./quote-book.ts";
import { isCurrentQuote } from "./quote-phase.ts";

function hungFeed(): LiveFeed & { reads: string[][] } {
  const reads: string[][] = [];
  return {
    reads,
    subscribe: () => {},
    unsubscribe: () => {},
    onQuote: () => () => {},
    snapshot: (symbols) => {
      reads.push([...symbols]);
      return new Promise<Quote[]>(() => {});
    },
  };
}

test("a retry never waits on a read that is still in flight", async () => {
  const live = hungFeed();
  const book = createQuoteBook(
    live,
    createFakeFeed().calendar,
    Date.now,
    () => true,
    () => {},
  );
  void book.fetch(["AAPL"]);
  const retries = Array.from({ length: 1_000 }, () => book.refresh(["AAPL"]));

  await expect(Promise.all(retries)).resolves.toEqual(retries.map(() => []));
  expect(live.reads).toEqual([["AAPL"]]);
});

const open = Date.parse("2025-06-20T13:30:00Z");
const close = Date.parse("2025-06-20T20:00:00Z");

function quoteAt(timestamp: number, price = "202.13"): Quote {
  return {
    symbol: "AAPL",
    price,
    previousClose: "200.30",
    ...changeBetween("200.30", price),
    timestamp,
  };
}

test.each([
  ["open", open, "open", open],
  ["at the close", close, "closed", close],
  ["next pre-market", Date.parse("2025-06-23T12:00:00Z"), "closed", close],
  ["weekend", Date.parse("2025-06-21T16:00:00Z"), "closed", close],
  ["forced close", open + 1, "closed", open],
] as const)("%s accepts timestamps starting at the phase boundary", (_name, now, status, floor) => {
  const calendar = {
    ...createFakeFeed().calendar,
    status: () => status,
    session: () => ({ open, close }),
  };
  expect(isCurrentQuote(quoteAt(floor - 1), calendar, now)).toBe(false);
  expect(isCurrentQuote(quoteAt(floor), calendar, now)).toBe(true);
});

test("the book drops the intraday trade and re-asks for the close until it recovers", async () => {
  let time = close - 1;
  const snapshot = vi
    .fn<LiveFeed["snapshot"]>()
    .mockRejectedValueOnce(new Error("unreachable"))
    .mockResolvedValueOnce([quoteAt(close, "201.50")]);
  const feed = createFakeFeed();
  const calendar: MarketCalendar = {
    ...feed.calendar,
    session: () => ({ open, close }),
    status: (now) => (now < close ? "open" : "closed"),
  };
  const book = createQuoteBook(
    { ...feed.live, snapshot },
    calendar,
    () => time,
    () => true,
    () => {},
  );
  const intraday = quoteAt(time);
  expect(book.remember(intraday)).toBe(true);
  expect(book.latest.get("AAPL")).toEqual(intraday);
  time = close;
  expect(book.expire()).toEqual(["AAPL"]);
  expect(book.remember(intraday)).toBe(false);
  await expect(book.fetch(["AAPL"])).resolves.toEqual([]);
  expect(book.latest.has("AAPL")).toBe(false);
  await expect(book.refresh(["AAPL"])).resolves.toEqual([quoteAt(close, "201.50")]);
  expect(snapshot.mock.calls).toEqual([[["AAPL"]], [["AAPL"]]]);
  expect(book.latest.get("AAPL")).toEqual(quoteAt(close, "201.50"));
});
