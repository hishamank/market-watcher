# History gets a share of the Alpaca budget

Amends ADR 0021.

Every Alpaca data request shares one budget of 180 a minute (ADR 0021). Quote polling and public history both draw on it. A security review at `07a9bf3` pointed out what that allows in Live mode: history is requested by anyone, costs at least two data calls for an uncached symbol and range, and one address may make 120 REST requests a minute, so one client walking the catalogue could spend the whole budget and stop quote polling for every user.

History requests are now admitted against two counts: the shared 180, and a history share of 60 a minute. Quote polling, snapshots and resyncs can still use all 180. When history reaches its share, the adapter refuses the call before it is sent, and the history cache answers as it does for any source failure: a held copy with its age if it has one, otherwise 503 for that chart only (ADR 0011). The share is a third of the budget because 50 visible symbols polled every 5 seconds cost 12 batch calls a minute, which leaves room on both sides.

This was tested against the fake Alpaca, not the real one: 120 history requests in a minute sent exactly 60 data calls, a quote snapshot after that was still sent, and history worked again after the minute.

Two things are left as they were. A failed data request, from either side, still pauses all data requests with backoff, because a provider that is failing or answering 429 should be left alone by everyone. And the Yahoo-backed routes still retry a failing symbol on each request, limited to eight at a time; caching those failures would make the sections' Retry buttons do nothing for a while, so that needs a product decision before Live mode is hosted.

## Considered options

- **Two separate budgets:** simpler to reason about, but quotes could then never use what history leaves idle.
- **A lower REST limit for history only:** limits one address, not the total, and Alpaca's limit is per key.
- **Leave it until Live mode is hosted:** the hosted demo runs the simulator, so nothing is exposed today; the change is small and has a test, so it does not need to wait.
