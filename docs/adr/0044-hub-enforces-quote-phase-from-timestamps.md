# The hub enforces the quote phase from its timestamp

Every `LiveFeed` must stamp a closing quote at `session.close`, an opening quote at `session.open` and an intraday trade at its trade time. The hub uses the market calendar and that timestamp to decide whether it can serve the quote. From the open, it accepts timestamps at or after the session open. Once the session ends and the market is closed, it accepts timestamps at or after the session close. That close remains valid through pre-market, weekends and holidays until the next session opens. A simulator force-close during a UTC day keeps that day's open as the lower bound.

## Decision

We chose Design B in #52 because the quote book serves every feed and the timestamp already identifies the phase. Design A checked only the adapter. During an outage at the close, REST omitted the stock while the socket could serve a cached intraday price. Design C would add a phase and withdrawal message to the wire and require a new waiting state in core and both apps. The existing subscribe protocol already handles a missing quote.

## Consequences

- The hub rejects late prior-phase quotes and expires cached quotes on status changes, during retry and before flushing ticks. It checks before fetching and answering a subscribe, including when the reply waited for a slow socket.
- During an outage at a boundary, new subscribers receive `unavailable` for each affected symbol and a snapshot containing only available quotes. They stay subscribed under ADR 0038. The next current quote reaches existing and waiting subscribers through ordinary conflation under ADR 0008.
- An open screen keeps its last real trade until the closing quote ticks in. At a failed open it keeps the previous close until a new-session quote arrives. Visual flagging of prices awaiting the new phase is tracked in #58. Connection staleness still describes the device's link to the gateway.
