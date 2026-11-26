# Virtualised list with visibility-driven subscriptions

Amended by [ADR 0053](./0053-the-all-list-pages-through-the-catalogue.md): the All list now pages through the whole catalogue, starting with the 50 below.

The stock list shows a curated set of 50 well-known US stocks and ETFs. Search, when it exists, uses a larger catalogue of about 500. The list is virtualised on web and mobile, so a row is mounted only while it is near the viewport. Each row subscribes to its symbol on mount and unsubscribes 2 seconds after unmount, so fast scrolling does not churn subscriptions. Fifty rows would not need virtualisation for rendering cost alone. We virtualise because it makes "subscribed" mean "visible", which keeps upstream usage proportional to what users can see, and because it is the shape that holds when the list grows.

The first paint comes from REST: `GET /stocks` returns the 50 symbols with names and a quote each, so prices are never blank. Socket snapshots then replace those quotes row by row. A connection may hold up to 100 subscriptions, enough for visible rows, the watchlist and an open detail page.
