# Stock page data sources

Checked 2026-11-26. Research and proposals only; no provider configuration or product scope changed. Authenticated endpoints were documentation-inspected, not tested with account credentials. Public RSS endpoints were fetched directly from this workspace and parsed as XML.

Owner decision on 2026-11-27: proceed with Yahoo profiles as a temporary demo adapter, with the approved gateway dependency. The original recommendation below records the research assessment; [ADR 0054](../adr/0054-yahoo-company-overviews-stay-separate-from-prices.md) records the accepted trade-off. Live AAPL and SPY profile requests subsequently succeeded through yahoo-finance2 4.0.6.

## Original recommendation

Keep Alpaca for prices and history. Extend the gateway to expose suitable session statistics and derived performance before adding another price provider. Add a separate fundamentals source if company descriptions, valuation ratios and earnings dates are required. Yahoo's unofficial finance API is not recommended as a new dependency for the hosted demo. Yahoo RSS is a distinct, potentially useful news source, subject to its RSS and applicable product terms.

See [supplemental provider research](stock-data-alternatives.md) for official fundamentals APIs and their plan restrictions.

## What Alpaca supplies

- The [US stock snapshot](https://docs.alpaca.markets/us/reference/stocksnapshotsingle) includes latest trade, quote, minute bar, daily bar and previous daily bar. Daily OHLC provides the inputs for open/high/low. Check the session date before labelling a bar as today, especially before open and on holidays.
- [Historical bars](https://docs.alpaca.markets/us/reference/stockbars) provide OHLC with split/dividend adjustment options and pagination. A complete year of daily highs/lows can support a feed-specific 52-week range; closing values support price performance. Do not derive extremes from a downsampled line chart. Match session definitions and corporate-action adjustments, and distinguish price return from total return.
- [Asset metadata](https://docs.alpaca.markets/us/reference/get-v2-assets-symbol_or_asset_id) provides identity and exchange information. The [current product page](https://alpaca.markets/data) still lists fundamentals as coming soon; do not assume company descriptions, P/E, dividend yield or a forward earnings calendar are supplied today.
- [Basic market data](https://docs.alpaca.markets/us/docs/about-market-data-api) is IEX-only for real-time equities. Local `apps/gateway/src/feeds/alpaca/config.ts` selects `iex`, and history requests use split adjustment. IEX highs/lows are not consolidated all-exchange highs/lows. Keep feed provenance explicit.

The existing ADR 0003 separates LiveFeed and HistorySource and treats Yahoo only as optional history fallback. Adding fundamentals or news should not require changing the price feed mode. This is a design proposal, not an adopted ADR.

## Alpaca news

The [news endpoint](https://docs.alpaca.markets/us/reference/news-3) is `GET https://data.alpaca.markets/v1beta1/news`. It supports symbol filters, date intervals, pagination, limits up to 50, and optional article content. For a stock page, request recent history explicitly rather than accepting the current-day default, which can produce empty results on quiet days. Example shape: `?symbols=AAPL&start=<date>&limit=5&sort=desc&include_content=false`.

[News documentation](https://docs.alpaca.markets/us/docs/historical-news-data) describes headline, URL, symbols, source and optional summary/images. News is listed as included on the product page, but the reference documents subscription-dependent access, possible delay and HTTP 403. Our account's actual access, latency and coverage remain unverified.

Recent change: Alpaca's head of market data [confirmed on November 24](https://forum.alpaca.markets/t/news-feed-changes/20059) that Benzinga was replaced by Fiscal due to a licensing issue, and acknowledged shorter history. ETF tagging gaps in the same thread are user reports, not reproduced here. Do not hard-code Benzinga attribution or assume old coverage/history. Probe AAPL, MSFT and SPY with the intended account before selecting this source.

[Alpaca's redistribution support answer](https://alpaca.markets/support/redistribute-alpaca-api) says API data cannot be redistributed; current product documentation distinguishes Trading and Broker offerings. A personal API key is not sufficient evidence of public-display permission. Confirm the intended deployment's rights with Alpaca rather than assuming endpoint availability grants those rights.

## Yahoo finance API versus RSS

[yahoo-finance2](https://github.com/gadicc/yahoo-finance2) supports Node and exposes quote/quoteSummary functionality, including company profile modules. Its maintainers explicitly describe it as unofficial, without Yahoo availability or API consistency guarantees. The library's software license does not license underlying data.

[Yahoo terms](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html) restrict automated data collection without express prior permission and commercial reuse unless otherwise authorized. This is a material reason not to build hosted fundamentals on undocumented Yahoo endpoints. No authenticated Yahoo finance endpoint was tested.

Yahoo's terms separately address RSS: preserve supplied content, attribute Yahoo's source site, link to the article, do not insert advertising into the feed, and account for additional product terms. Yahoo can withdraw feeds. This makes RSS a separate integration decision from unofficial quote scraping; it is not blanket clearance for every commercial use or for republishing full articles.

## RSS probes

One direct GET per feed using Python urllib with a browser user-agent, followed by XML parsing. Results prove availability at the time of the probe, not uptime, topical relevance, or redistribution rights.

| Feed | HTTP | Parsed items | Use |
| --- | --- | --- | --- |
| [Yahoo AAPL](https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL&region=US&lang=en-US) | 200 | 20 | Symbol-focused stock news |
| [CNBC top news](https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114) | 200 | 30 | Broad market/business news |
| [MarketWatch top stories](https://feeds.content.dowjones.io/public/rss/mw_topstories) | 200 | 10 | Broad market news |
| [Google News Apple stock search](https://news.google.com/rss/search?q=Apple%20stock&hl=en-US&gl=US&ceid=US:en) | 200 | 100 | Text search, not a verified symbol taxonomy |

The web research fetcher returned 404 for Yahoo RSS, while the direct workspace request returned valid RSS with 20 articles. Do not report the feed as unavailable based only on the web fetcher. Latest Yahoo item date was November 26; CNBC November 25; MarketWatch November 26. Google search items were not ordered strictly by recency (first item November 24). CNBC, MarketWatch and Google display terms were not cleared in this research; successful responses are technical evidence only.

## Proposed integration

- Gateway-only requests and caching; keep keys out of web/mobile bundles. Separate profile/fundamentals and news responses from the live quote socket.
- Suggested cache policies: profile 24 hours, valuation metrics/earnings 1 hour, news 5–15 minutes. These are proposed app settings, not vendor guarantees or quotas.
- Display five recent headlines, publisher/source, published date and original link. Add only licensed supplied summaries/images; do not scrape full articles or invent a reason the stock moved.
- News failure must not blank the quote/chart. Support no articles and stale cached results. Treat upstream XML/HTML as untrusted input; parse bounded responses and render plain text with safe links.
- Simulator mode should remain deterministic with clearly labelled sample news and statistics. Real news beside a simulated chart could imply a causal relationship; do not introduce that combination silently.
- Fundamentals need currency, units, as-of date and missing-value handling. ETF overview/fees/holdings need a separate field set; do not force company P/E or earnings dates onto ETFs.

## Remaining checks before implementation

1. Confirm account entitlement and public-display terms for the selected provider(s).
2. Probe actual responses for normal equities, ETFs, missing metrics, recent splits and a no-news case.
3. Decide IEX-specific versus consolidated statistics, price versus total return, and session boundaries.
4. Record the accepted provider decision and new feature scope, then implement and verify the affected web/mobile features.
