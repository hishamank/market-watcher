import type { Quote } from "@mini/contracts";
import { expect, test } from "vitest";
import type { LiveFeed } from "../feeds/types.ts";
import { createQuoteBook } from "./quote-book.ts";

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
    () => true,
    () => {},
  );
  void book.fetch(["AAPL"]);
  const retries = Array.from({ length: 1_000 }, () => book.refresh(["AAPL"]));

  await expect(Promise.all(retries)).resolves.toEqual(retries.map(() => []));
  expect(live.reads).toEqual([["AAPL"]]);
});
