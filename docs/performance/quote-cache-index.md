# Quote fallback benchmark

Measured 2026-11-27 against baseline `96f6d0d9d8f76aad12fe58633afb28b76cb01b44`.

## Method and limits

Node 26.12.0, production React, Linux, 14 logical CPUs; load average before measurement 0.63 / 0.87 / 0.89. Seven alternating A/B rounds after one warmup per side, 20 independent cold caches per round. Fixture creation and output assertions are outside the timed region; index construction is inside it. Each cache holds pages of 50 stocks, a duplicate first-page list, and 20 history queries. The measured rows are the last 50 stocks.

Snapshots: 50 rows, three reads per row. SSR fixture: React renderToString of 50 minimal price spans using useSyncExternalStore with the real fallback as the snapshot reader. This fixture is **not the application's full page render**, browser hydration, frame timing or a phone benchmark. No page-load speedup is claimed. Normal paging seeds the store before rendering and bypasses this fallback; the large-cache scenario represents a cold provider over a retained/hydrated catalogue.

The hypothesis was that eliminating repeated page traversal would reduce cold-cache row-batch time beyond the run-to-run spread. A separate, excluded CPU-profile run found baseline cachedQuotes/quotesIn dominating self samples (3,630 combined), followed by allocation/GC work. The indexed side pays the catalogue traversal and map construction once per unchanged cache. Its remaining cost includes that initial construction and query-reference checks. Both sides use identical input and validated outputs: 144,960 output checks, zero failures, including warmups. Every snapshot output has the expected price and every SSR output contains exactly 50 priced spans.

## Results

Milliseconds per batch; each sample averages 20 cold-cache batches. Ranges are min–max across seven samples, not latency percentiles.

| Cached stocks | Workload | Before median (range), ms | Indexed median (range), ms |
| --- | --- | --- | --- |
| 50 | snapshots | 0.433 (0.371–0.561) | 0.078 (0.074–0.090) |
| 50 | ssr-fixture | 0.181 (0.172–0.198) | 0.067 (0.061–0.089) |
| 500 | snapshots | 1.377 (1.346–1.403) | 0.118 (0.112–0.240) |
| 500 | ssr-fixture | 0.513 (0.501–0.538) | 0.112 (0.106–0.114) |
| 10,000 | snapshots | 25.252 (24.692–26.598) | 1.911 (1.780–2.632) |
| 10,000 | ssr-fixture | 8.714 (8.548–9.887) | 1.915 (1.832–2.047) |

The 10,000-stock snapshot batch fell from 25.25 ms to 1.91 ms (about 13.2×). At 50 stocks the absolute saving is only about 0.36 ms. The measured advantage exceeds the spread at all three sizes. The persistent index adds O(N + Q) references; heap retention was not measured.

## Reproduce

From the repository root, with the pinned dependencies installed:

```sh
git show 96f6d0d9d8f76aad12fe58633afb28b76cb01b44:packages/core/src/rest/quote-cache-sync.ts > packages/core/src/rest/quote-cache-baseline.ts
NODE_ENV=production pnpm --filter @mini/gateway exec tsx ../../apps/web/scripts/quote-cache-benchmark.ts ../../packages/core/src/rest/quote-cache-baseline.ts
rm packages/core/src/rest/quote-cache-baseline.ts
```

For a separate profile, add `--cpu-prof --cpu-prof-dir=../../.verify/quote-index` after `tsx`. Do not report timings from that run. The original helper is placed beside its imports temporarily and must not be committed.

## Raw samples

```json
[
  {
    "count": 50,
    "mode": "snapshots",
    "name": "baseline",
    "batches": 20,
    "rounds": 7,
    "medianMs": 0.4334841499999982,
    "minMs": 0.37125164999999927,
    "maxMs": 0.561489499999999,
    "samplesMs": [
      0.44627484999999895,
      0.561489499999999,
      0.4693223000000003,
      0.4334841499999982,
      0.39176985000000003,
      0.39484135000000153,
      0.37125164999999927
    ]
  },
  {
    "count": 50,
    "mode": "snapshots",
    "name": "indexed",
    "batches": 20,
    "rounds": 7,
    "medianMs": 0.07805344999999875,
    "minMs": 0.0743923499999994,
    "maxMs": 0.08987940000000094,
    "samplesMs": [
      0.08103890000000007,
      0.07530350000000112,
      0.0776693999999992,
      0.07805344999999875,
      0.07848685000000159,
      0.08987940000000094,
      0.0743923499999994
    ]
  },
  {
    "count": 50,
    "mode": "ssr-fixture",
    "name": "baseline",
    "batches": 20,
    "rounds": 7,
    "medianMs": 0.18092465000000005,
    "minMs": 0.17186624999999936,
    "maxMs": 0.19835145000000126,
    "samplesMs": [
      0.18680280000000096,
      0.1744377500000013,
      0.17569375000000206,
      0.18092465000000005,
      0.1953862000000015,
      0.17186624999999936,
      0.19835145000000126
    ]
  },
  {
    "count": 50,
    "mode": "ssr-fixture",
    "name": "indexed",
    "batches": 20,
    "rounds": 7,
    "medianMs": 0.06669575000000236,
    "minMs": 0.06092430000000206,
    "maxMs": 0.0889489999999995,
    "samplesMs": [
      0.06669575000000236,
      0.06713914999999986,
      0.06630715000000009,
      0.0889489999999995,
      0.06092430000000206,
      0.08172429999999906,
      0.06535445000000095
    ]
  },
  {
    "count": 500,
    "mode": "snapshots",
    "name": "baseline",
    "batches": 20,
    "rounds": 7,
    "medianMs": 1.3769432999999993,
    "minMs": 1.3460456499999964,
    "maxMs": 1.4034731499999993,
    "samplesMs": [
      1.4034731499999993,
      1.38482415,
      1.370063300000001,
      1.3769432999999993,
      1.3460456499999964,
      1.3944504999999991,
      1.3595447999999977
    ]
  },
  {
    "count": 500,
    "mode": "snapshots",
    "name": "indexed",
    "batches": 20,
    "rounds": 7,
    "medianMs": 0.1180419999999998,
    "minMs": 0.1123025499999983,
    "maxMs": 0.2396479499999998,
    "samplesMs": [
      0.15811780000000225,
      0.1180419999999998,
      0.1123025499999983,
      0.11607329999999934,
      0.11375339999999597,
      0.2396479499999998,
      0.1330675499999984
    ]
  },
  {
    "count": 500,
    "mode": "ssr-fixture",
    "name": "baseline",
    "batches": 20,
    "rounds": 7,
    "medianMs": 0.5129062999999974,
    "minMs": 0.5009413999999992,
    "maxMs": 0.5381665499999997,
    "samplesMs": [
      0.5150394000000006,
      0.5129062999999974,
      0.5176344500000027,
      0.5381665499999997,
      0.5079156000000011,
      0.5030740000000037,
      0.5009413999999992
    ]
  },
  {
    "count": 500,
    "mode": "ssr-fixture",
    "name": "indexed",
    "batches": 20,
    "rounds": 7,
    "medianMs": 0.1116980500000011,
    "minMs": 0.10579650000000243,
    "maxMs": 0.11416749999999638,
    "samplesMs": [
      0.11416749999999638,
      0.11317099999999983,
      0.1136656500000015,
      0.10585254999999734,
      0.1116980500000011,
      0.10579650000000243,
      0.10947810000000117
    ]
  },
  {
    "count": 10000,
    "mode": "snapshots",
    "name": "baseline",
    "batches": 20,
    "rounds": 7,
    "medianMs": 25.252220550000015,
    "minMs": 24.69187474999999,
    "maxMs": 26.597621899999968,
    "samplesMs": [
      25.429485549999992,
      25.252220550000015,
      24.704080750000003,
      24.7479014,
      24.69187474999999,
      26.597621899999968,
      25.43074335000001
    ]
  },
  {
    "count": 10000,
    "mode": "snapshots",
    "name": "indexed",
    "batches": 20,
    "rounds": 7,
    "medianMs": 1.9111009000000194,
    "minMs": 1.779736949999983,
    "maxMs": 2.6324404500000016,
    "samplesMs": [
      1.8391431500000066,
      2.6324404500000016,
      1.779736949999983,
      1.8086512499999798,
      1.9499507500000164,
      1.9111009000000194,
      1.9165600499999982
    ]
  },
  {
    "count": 10000,
    "mode": "ssr-fixture",
    "name": "baseline",
    "batches": 20,
    "rounds": 7,
    "medianMs": 8.713559850000001,
    "minMs": 8.547567799999978,
    "maxMs": 9.886583700000028,
    "samplesMs": [
      8.989031849999993,
      8.724285849999978,
      8.713559850000001,
      8.547567799999978,
      9.886583700000028,
      8.638684200000034,
      8.69205965000001
    ]
  },
  {
    "count": 10000,
    "mode": "ssr-fixture",
    "name": "indexed",
    "batches": 20,
    "rounds": 7,
    "medianMs": 1.9150235000000067,
    "minMs": 1.8324568499999714,
    "maxMs": 2.0473511999999574,
    "samplesMs": [
      1.9806771000000025,
      1.9150235000000067,
      1.8469572999999855,
      1.9414340500000435,
      2.0473511999999574,
      1.851231400000006,
      1.8324568499999714
    ]
  },
  {
    "checked": 144960,
    "errors": 0,
    "node": "v26.12.0"
  }
]
```

## Verification

`pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `pnpm test` passed. Core executed 163 tests; the final workspace test run reused cached results for the other workspace tasks. Against the original helper, the four new tests give three passes and one expected failure: four page traversals instead of one. Against the index, all four pass.

Production Playwright: 32 selected tests for G1/G3/L1/L2/L3/D1/D2/D3/W2/W3/W7, one gateway-down D1 retry test, and eight D10-related tests passed without retries (41 total). The simulator stack ran with seed 42. No Alpaca credentials or live-feed performance were used.

| Feature | Check | Result | Evidence |
| --- | --- | --- | --- |
| G1, G3 step 1 | Production E2E + connection journey | PASS | `e2e.txt`, `journey-connection.txt` |
| L1, L2, L3 | Production E2E + stock-list journey; screenshots inspected | PASS | `e2e.txt`, `journey-list.txt` |
| D1, D2, D3 | Production E2E + stock-detail journey; screenshot inspected | PASS | `e2e.txt`, `e2e-down.txt`, `journey-detail.txt` |
| D10 | Production E2E; detail screenshot inspected | PASS | `e2e-statistics.txt` |
| W2, W3, W7 | Production E2E + isolated watchlist journey | PASS | `e2e.txt`, `journey-watchlist-fresh.txt` |
| M1, M2, M3 | Expo device walk | BLOCKED | No adb or attached phone in this environment |

Local command logs and the CPU profile are in `.verify/quote-index/`. Journey screenshots, socket frames and console logs are in `.verify/20261127-1112-t3-usequote-fallback-cache-scan/` and `.verify/20261127-1115-t3-usequote-fallback-cache-scan/`.

The first watchlist journey failed after accumulated traffic exhausted the gateway's unchanged 120 requests/minute limit; its console and gateway log record HTTP 429 responses. A fresh, isolated stack running watchlist alone passed with unchanged limits and assertions and no unexpected console errors. The initial failed evidence is retained. The connection journey inadvertently overlapped the end of that failed run; it passed, but the isolated watchlist rerun is the watchlist evidence used above. Both owned stacks were stopped.
