# 0078 Share initial server catalogue reads

Status: accepted

The shell badge and home default-list cache requested the same catalogue data twice per server render, alongside the separate paginated browse query. Viewport prefetch also read stock details that the visitor had not opened, consuming the shared server IP's gateway rate limit.

Use one React request-scoped cached default-list read for shell metadata and home default-list hydration. Keep this read outside the query client so shell rendering cannot populate unrelated routes' hydration payloads. Home also prefetches the paginated browse query through its own contract, including empty-page handling and cursors. A live catalogue can have fewer default symbols than the page size, so a browse page must not populate the default-list cache.

This reduces a home render from three gateway reads to two without increasing rate limits or introducing another cache lifetime. The two reads serve distinct default-list and browse-page contracts. Detail keeps its existing default-list metadata, stock and history reads. Preserve the two-second shell timeout and client retry paths. Stock-row and search-result links fetch their routes only on navigation.
