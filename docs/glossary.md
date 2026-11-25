# Mini Trading App

A small trading app that shows live US stock prices, price history and a personal watchlist on web and mobile, fed by a market data gateway.

## Market data

**Gateway**:
Our own backend server between market data providers and users' devices. It holds provider keys, shares one upstream connection across all users, and is the only thing the apps talk to.
_Avoid_: server, backend, proxy, API

**Conflation**:
Collapsing many ticks for a symbol into its latest quote, so a slow client receives current prices rather than a backlog.
_Avoid_: throttling, debouncing, batching

**Feed mode**:
Where all prices in a running system come from: Simulated or Live. It is fixed for the life of the gateway, and the two are never mixed.
_Avoid_: data source, environment

**Market status**:
Whether a session is currently open according to the market calendar: open or closed.
_Avoid_: trading status, market state

**Market calendar**:
The source of truth for when sessions open and close in the current feed mode: the exchange calendar in Live mode, and an always-open calendar of UTC days in Simulated mode.
_Avoid_: schedule, trading hours

**Session**:
One trading day as the market calendar defines it, with an open, a close and a previous close.
_Avoid_: trading day, market day

**Regular session**:
In Live mode, the New York session from 09:30 to 16:00 Eastern Time on exchange trading days. Pre-market and after-hours are outside it.
_Avoid_: trading hours, market hours

**Last close**:
A symbol's final price at the end of the most recent session.
_Avoid_: closing price, EOD price

## Prices

**Symbol**:
The ticker that identifies one stock or ETF, such as AAPL.
_Avoid_: ticker, instrument, asset

**Catalogue**:
Every symbol the current feed mode can price. It is the universe for search and for detail pages.
_Avoid_: universe, asset list, symbol list

**Quote**:
What is currently known about one symbol's price: price, change and percent change against the previous close, and the time it was observed. Its timestamp places it in a trading phase. Opening and closing quotes carry the session open and close times respectively.
_Avoid_: price (as a noun for the whole record), ticker data

**Snapshot**:
A full quote sent the moment a client starts watching a symbol, so it never shows a blank price.
_Avoid_: initial price, seed

**Tick**:
A change to a quote delivered while a client is watching that symbol.
_Avoid_: update, event, price change

## Charts

**Range**:
The time window a chart shows: 1D, 1W, 1M, 3M, 1Y or 5Y. Each range has a fixed bar size.
_Avoid_: period, timeframe, interval

**Bar**:
One point of price history: a symbol's price over one fixed slice of time within a range.
_Avoid_: candle, data point, tick (which is live)

**Live point**:
The last point of a chart, at the time of the newest quote. The gateway's last bar is the live point when the history was fetched. On the device, a quote in the same bar-size slice replaces it, and a quote in a later slice adds a new one. Slices line up with the gateway's bars, and weekly slices start on Monday at 00:00 UTC. On 1D, only a quote inside the chart's session counts, from its open up to but not including its close.
_Avoid_: current bar, latest candle

**Previous close**:
The last close of the session before the current one. Today's change is measured against it.
_Avoid_: yesterday's close, open

**Day change**:
A quote's change, in money and percent, against the previous close.
_Avoid_: daily change, today's performance

**Range change**:
The change across a range up to its last point, which on the live point moves with every tick. It is measured from the previous close on 1D and from the first bar on every other range. For a fallback copy shown "as of" an earlier time, it measures from the same baseline to the live price instead, while the chart keeps the copy's bars.
_Avoid_: performance, return

## Watchlist

**Watchlist**:
The set of symbols a user has starred on a device, most recent first.
_Avoid_: favourites, portfolio (which means holdings)

**Star**:
The act, and the control, of adding a symbol to or removing it from the watchlist.
_Avoid_: favourite, follow, watch

## Connection

**Connection status**:
How a device's link to the gateway is doing, as shown to the user: connecting, connected, stale or offline.
_Avoid_: live (reserved for the feed mode), online

**Stale**:
The connection status when the link to the gateway has closed or gone silent past the heartbeat window. Prices stay on screen but may be out of date.
_Avoid_: frozen, delayed, disconnected

**Offline**:
The connection status when the device itself has no network.
_Avoid_: disconnected, stale

**Subscription**:
A client's request to receive the snapshot and ticks for a symbol until it stops watching.
_Avoid_: watch (which belongs to the watchlist), listener

**Request ID**:
The positive integer a client puts on each subscribe, unique within one connection. Every reply to that subscribe echoes it, so replies are matched by identity, not arrival order.
_Avoid_: correlation ID, sequence number

## Demo

**Chaos controls**:
The debug panel, available only in Simulated mode, that triggers dropped connections, frozen feeds, offline, tick spikes, slow or failing history, and a closed market on demand.
_Avoid_: debug menu, dev tools
