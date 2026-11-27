import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { QueryClient } from "@tanstack/react-query";
import { createElement, useSyncExternalStore } from "react";
import { renderToString } from "react-dom/server";
import { findCachedQuote as indexed } from "../../../packages/core/src/rest/quote-cache-sync.ts";
import { stockQueryKeys } from "../../../packages/core/src/rest/stock-queries.ts";
import { makeQuote } from "../../../packages/core/src/testing/fake-platform.ts";
import { stockListBody } from "../../../packages/core/src/testing/fake-rest.ts";

const baselinePath = process.argv[2];
assert(baselinePath, "Pass the original quote-cache-sync.ts module path");
const { findCachedQuote: baseline } = await import(pathToFileURL(resolve(baselinePath)).href);
const variants: Array<[string, typeof indexed]> = [
  ["baseline", baseline],
  ["indexed", indexed],
];
const rounds = 7;
const batches = 20;
let checked = 0;

function fixture(count: number) {
  const client = new QueryClient();
  const quotes = Array.from({ length: count }, (_, i) => makeQuote(`S${i}`, "190", i));
  const pages = [];
  for (let i = 0; i < count; i += 50) {
    pages.push({ ...stockListBody(quotes.slice(i, i + 50)), nextCursor: `S${i + 49}` });
  }
  client.setQueryData(stockQueryKeys.pages(), {
    pages,
    pageParams: pages.map((_, i) => (i === 0 ? undefined : `S${i * 50 - 1}`)),
  });
  client.setQueryData(stockQueryKeys.list(), stockListBody(quotes.slice(0, 50)));
  for (let i = 0; i < 20; i += 1) {
    client.setQueryData(stockQueryKeys.history(`S${i}`, "1D"), { bars: [] });
  }
  return client;
}

function run(count: number, find: typeof indexed, mode: string) {
  const clients = Array.from({ length: batches }, () => fixture(count));
  const symbols = Array.from({ length: 50 }, (_, i) => `S${count - 50 + i}`);
  const outputs: Array<unknown> = [];
  const start = performance.now();
  for (const client of clients) {
    const cache = client.getQueryCache();
    if (mode === "snapshots") {
      for (const symbol of symbols) {
        for (let read = 0; read < 3; read += 1) outputs.push(find(cache, symbol));
      }
    } else {
      function Row({ symbol }: { symbol: string }) {
        const snapshot = () => find(cache, symbol);
        const quote = useSyncExternalStore(() => () => {}, snapshot, snapshot);
        return createElement("span", { "data-symbol": symbol }, quote?.price);
      }
      outputs.push(
        renderToString(
          createElement(
            "div",
            null,
            symbols.map((symbol) => createElement(Row, { key: symbol, symbol })),
          ),
        ),
      );
    }
  }
  const duration = (performance.now() - start) / batches;
  for (const output of outputs) {
    if (mode === "snapshots") {
      assert(output && typeof output === "object" && "price" in output && output.price === "190");
    } else {
      assert(typeof output === "string");
      assert.equal((output.match(/>190<\/span>/g) ?? []).length, 50);
    }
    checked += 1;
  }
  clients.forEach((client) => client.clear());
  return duration;
}

for (const count of [50, 500, 10_000]) {
  for (const mode of ["snapshots", "ssr-fixture"]) {
    for (const [, find] of variants) run(count, find, mode);
    const samples = new Map<string, number[]>(variants.map(([name]) => [name, []]));
    for (let round = 0; round < rounds; round += 1) {
      for (const [name, find] of round % 2 ? [...variants].reverse() : variants) {
        samples.get(name)?.push(run(count, find, mode));
      }
    }
    for (const [name, times] of samples) {
      const sorted = [...times].sort((a, b) => a - b);
      console.log(
        JSON.stringify({
          count,
          mode,
          name,
          batches,
          rounds,
          medianMs: sorted[3],
          minMs: sorted[0],
          maxMs: sorted.at(-1),
          samplesMs: times,
        }),
      );
    }
  }
}
console.log(JSON.stringify({ checked, errors: 0, node: process.version }));
