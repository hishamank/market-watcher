# Watchlist as a set of symbols behind a storage interface

The watchlist holds symbols only. Prices always come from the quote store, so a watchlist row ticks exactly like a list row. Any catalogue symbol can be starred. A star sits on every list row and detail header (and on search results later), and a toggle updates every star at once. Web shows the watchlist through an All | Watchlist toggle on the list, and mobile through a tab. The most recently starred symbol comes first, and an empty watchlist shows a hint.

In the core build the watchlist is stored on the device through an async key-value interface in core. Web wraps localStorage, and mobile will use native storage. The stored value is versioned (`watchlist:v1`) and validated on read, and a corrupt value starts an empty watchlist rather than crashing. Web tabs stay in sync through the browser's storage event. `GET /stocks?symbols=` returns names and first quotes for watchlist symbols outside the main list, so one endpoint serves both views.

The hook exposes `symbols`, `isStarred(symbol)` and `toggle(symbol)`, and `toggle` returns at once. When the server-side watchlist keyed by an anonymous device ID arrives (extra), the same hook becomes an optimistic update with rollback, and no component changes.
