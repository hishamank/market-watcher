# Yahoo company overviews stay separate from prices

For the project, use Yahoo Finance as a temporary supplemental profile source in live mode. Keep Alpaca prices and history unchanged. A separate gateway endpoint and shared profile contract let a licensed provider replace Yahoo without changing the views. The yahoo-finance2 dependency is gateway-only, with a shared core hook for web and mobile.

Cache profiles for 24 hours, coalesce concurrent requests, bound upstream work and fail within eight seconds. Empty profiles are cached for five minutes. Show the retrieval time rather than claiming it is the issuer's update time. A profile failure never blocks the quote or chart. Simulator mode uses labelled fictional fixtures and never contacts Yahoo. ETFs use fund wording and omit sector and industry.

This deliberately extends ADR 0003's Yahoo history-only scope to supplemental profiles. Yahoo remains unofficial; this demo choice does not establish public-display rights or guarantee that a paid Alpaca subscription supplies equivalent fundamentals. Statistics and news are separate follow-up increments after design review.
