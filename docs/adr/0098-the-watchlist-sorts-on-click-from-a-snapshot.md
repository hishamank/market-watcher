# The watchlist sorts on click from a snapshot

Amends ADRs 0041 and 0053, and feature W2.

From 768 px, every label in the watchlist header is a sort button. The All list keeps its fixed order (ADR 0053). Each button cycles through three states: first direction, reverse, then the watchlist's own order (most recently starred first). Name and Symbol start ascending; prices, changes and Last update start descending. Rows without a day range sort last on Day high and Day low in both directions.

The arrow sits outside the label, in the gap between columns, so showing it never moves a label. It is hidden until the pointer is over the label or the button has keyboard focus, when it shows faintly in the direction a click would sort. The sorted column shows it solid. Pressing All from a sorted watchlist draws that arrow once more in the All header and fades it out over `duration.fast`, so it does not vanish in a frame. The list page keeps the leaving sort from the click, because the All header is a new element and has nothing to transition from. The fade plays once: after it has shown on All, returning to any watchlist entry forgets it, so moving through history never replays it. Only a plain click arms it, not one that opens a new tab. With reduced motion it disappears at once.

The order is worked out once, when the sort changes, from each row's quote in the quote store at that moment. It then stays still while prices tick. Unstarring keeps the order of the rest and forgets the removed symbol. A render with no stocks, such as a brief loading state, keeps the held order. Starring a symbol that is not in the held order, turning the sort off and on, or changing language sorts again. Below 768 px there is no header, so a `sort` in the URL is ignored and the watchlist keeps its starred order. Prices compare through `compareDecimal` in the contracts money module, so `9.99` sorts below `10.00`.

The sort lives in the URL as `?view=watchlist&sort=change-desc`, beside the view (ADR 0023). A click changes it with `history.pushState`, as the view toggle does (ADR 0050). Detail links and the back link carry it, so returning from a stock keeps the sort.

Core exports `useSortedStocks`, `nextStockSort`, `firstStockSortDirection`, `STOCK_SORT_FIELDS` and the `StockSort`, `StockSortField` and `StockSortDirection` types. The comparator and the click cycle are shared policy that mobile can reuse. The web header and the URL format stay in web.

## Considered options

- **Re-sort on every tick:** the order always matches the prices, but rows jump under the pointer several times a second. It also needs a hook that watches every watchlist symbol, and off-screen rows can hold older quotes (ADR 0007).
- **Sort by the fetched REST quote:** no store read, but the order drifts from the prices on screen after the first tick.
- **An arrow inline after the label:** the label jumps sideways when a column becomes sorted, and end-aligned labels stop lining up with their numbers.
- **Keep the sort in `localStorage`:** survives a visit to All, but a shared link would not show the same order.
