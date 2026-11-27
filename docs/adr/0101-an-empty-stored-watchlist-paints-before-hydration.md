# An empty stored watchlist paints before hydration

Amends the device-only state rule in [ADR 0023](./0023-server-renders-first-frame-socket-takes-over-after-hydration.md) for one case: an empty watchlist.

The watchlist lives in browser storage, so the server renders `/?view=watchlist` without knowing it. Before this change it sent a skeleton, and the empty state appeared only after the JavaScript loaded and hydrated. A first visit always has an empty watchlist, and the empty state's help text became the page's Largest Contentful Paint. Mobile Lighthouse put it at 2.7 s on the hosted demo and scored the view 96, while `/` and `/stocks/[symbol]` scored 100.

The nonce'd script that already sets the colour scheme before first paint now also reads the stored watchlist and sets `data-stored-watchlist="empty"` on `<html>` when it holds no symbols or cannot be read. Until the watchlist store loads, the view renders both the skeleton and the empty state with its suggestions, and the `stored-watchlist-empty` CSS variant shows exactly one of them. The first client render matches the server, so hydration is unchanged. Once the store loads, the same empty-state element stays in place, so no later paint becomes a new LCP candidate.

On a local production build with DevTools throttling, the empty watchlist view went from 88–89 to 99–100 and its LCP from 3.7 s to 1.5 s. Layout shift stayed at 0.

Core now exports `WATCHLIST_STORAGE_KEY`, so the script reads the same key as the store.

The script mirrors the store's rule only loosely: a stored list that is not an array or has no items counts as empty. A list the store would reject for one bad symbol shows the skeleton first, as before. A watchlist with stocks still shows the skeleton until hydration, because the server cannot render rows it does not know. Rendering those rows on the server needs the server to know the watchlist, which is the server-side watchlist of [ADR 0031](./0031-server-side-watchlist-keyed-by-device-id.md).
