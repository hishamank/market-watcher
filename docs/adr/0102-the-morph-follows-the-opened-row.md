# The morph follows the opened row

Amends ADR 0048 and feature D1.

The list-to-detail morph used to depend on the `open-stock` transition type. A row's link added it with Next's `transitionTypes`, and each `Morph` shared only under that type. React 19.3 queues transition types on the root, not on the transition that added them, and the first transition commit to finish claims them. While a detail navigation waits for its server response, Next's router can commit a router-state transition of its own on the list page. That commit took `open-stock`. The navigation then committed with no types, every `Morph` resolved to `none`, and React started no view transition, so the page cut over without the morph. It happened more often the slower the response. In CI, the D1 warm-navigation check in `journey-capture.spec.mjs` failed in about a third of runs, on unrelated branches. Delaying the `/stocks/AAPL` server response by 400 ms reproduced it locally at the same rate.

Now the row records which stock is opening, and the morph reads that instead of a type. `integrations/opening-stock.ts` holds one symbol. A row link's `onNavigate` sets it, which Next calls only for a client navigation, so a click that opens a new tab does not. The row updates synchronously before the navigation starts, so its last props share as `morph`. Each `Morph` takes its stock's symbol and shares as `morph` only while that symbol is opening, otherwise `none`. The detail page clears the symbol in an effect once it has mounted, so the header shares while it enters and then rests at `none`. The rules from ADR 0048 stay the same:

- **Opening from a row** morphs the name and price, however slow the response.
- **All and Watchlist** never morph, because no symbol is opening during the switch.
- **Back to the list, and search results**, never morph, because nothing set the symbol or the detail page cleared it.

With the delay on every server response, the D1 check passed 40 of 40 runs. A probe that stars Apple, switches views, opens Apple and goes back saw only the opening start a view transition.

## Considered options

- **Keep the transition type:** it is React's intended API, but any transition that commits first steals it, and Next's router commits its own. Our code cannot hold them back.
- **Share on every navigation, as before ADR 0048:** less code, but starred rows fly on the All and Watchlist switch, which ADR 0048 rules out.
- **Different names in each list view:** a switch would not pair rows, but the detail header would need to know which view the user came from.
- **Allow an empty result in the check, or retry it:** CI goes green, but users still lose the morph on slow networks, and ADR 0096 says a run with no transition proves nothing.
