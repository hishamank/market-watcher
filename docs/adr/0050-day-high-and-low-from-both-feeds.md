# Day high and low from both feeds, shown from 1440 px

Amends ADR 0049 and the Layout section of `docs/DESIGN.md`.

The wide table showed price, day change, day change %, previous close and last update. A quote now carries an optional `dayRange: { low, high }`, and from 1440 px the table shows them as "Day high" and "Day low" columns after "Previous close".

- **Contract:** `dayRange` is optional, so a quote without it stays valid, and clients built before it ignore it. The schema requires both ends to be display-rounded prices and the range to hold the price. The gateway widens the range to the price before it sends a quote, so the rule can never drop one. Comparing and widening happen in the money module (`widenRange`, `joinRanges`, `rangeHolds`).
- **Alpaca:** the snapshot's `dailyBar` already carries `h` and `l`, so the range costs no extra request. Only the bar dated to the session being priced counts, so yesterday's range never shows as today's. Each streamed trade widens the held range, and a later poll joins its bar with the held range rather than replacing it, so a high never falls during a session. Outside the session, the quote prices the last session at its close, and the range is that session's bar. A symbol with no IEX bar for that session, because nothing traded on IEX, carries no range, and the table shows a dash.
- **Simulator:** the range is the lowest and highest price on the same 5-minute grid the 1D chart draws, from 00:00 UTC up to now, widened by the current price. The chart's line therefore never goes above the day high or below the low. The grid is sampled once per symbol and day and then extended by one sample every 5 minutes. The first sampling is the cost: about 10 ms per symbol late in the UTC day, so a cold gateway answers its first 50-symbol list about 0.5 s slower, once per process per day. The live feed also keeps the widest range it has sent for each symbol that day, so a peak between two grid points stays the high after the price falls back. That memory lives in the process, so a gateway restart can lower a high to the grid value.
- **Layout:** from 1280 px to 1439 px the table is unchanged. From 1440 px the list grows from 1120 px to at most 1344 px, so the two new 104 px columns fit and the name keeps about 250 px. The compact table and the list pane beside the detail are unchanged.
- **Strings:** three message keys join `MessageKey`: `list.column.dayHigh`, `list.column.dayLow` and `list.dayRange.none`.

There is no open column. The simulator's day is one continuous price path, so its open always equals its previous close, and the hosted demo would show a column that repeats another. Volume and bid and ask are left out too. The free plan sees only IEX, which handles a few percent of US volume, so those numbers would look exact and be wrong.

> **Design note:** "I added only what both feeds can fill honestly from data we already fetch. Alpaca's daily bar gives the high and low for free, and each trade keeps them live. The simulator takes them from the same grid the chart draws, so the chart never leaves the range the table shows. The extra columns appear only where the width exists, so nothing else in the layout moved."

## Considered options

- **One "Day range" column at 1280 px:** fits by widening the cap, but the owner preferred separate high and low columns.
- **Open, high and low together:** open repeats previous close in Simulated mode, where the demo runs.
- **Track the range in the hub for both feeds:** one place, but the hub would need each feed's session rules, which already live in the feeds.
- **Sample the simulator every minute:** a tighter range, but about 45 ms per symbol for a full day, and the chart would then dip under a low it never draws.
