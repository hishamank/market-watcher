# 0073 Share initial server catalogue reads

Status: accepted

The shell badge and both home query caches requested equivalent catalogue data three times per server render. Viewport prefetch also read stock details that the visitor had not opened, consuming the shared server IP's gateway rate limit.

Use one React request-scoped cached first-page read for shell metadata and home hydration. Populate the list and infinite-page query caches from that validated response. Keep the two-second shell timeout and do not share prices between requests. Stock-row and search-result links fetch their routes only on navigation.

This reduces a home render from three gateway reads to one without increasing rate limits or introducing another cache lifetime. Detail navigation still fetches current data, and failed first-page reads retain the client retry path.
