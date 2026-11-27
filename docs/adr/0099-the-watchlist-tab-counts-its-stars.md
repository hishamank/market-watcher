# The Watchlist tab counts its stars

Amends ADR 0062 and the Motion section of `docs/DESIGN.md`.

ADR 0062 turned down a count badge on the Watchlist control, because it showed how many stocks were starred rather than where the stock went, and because it seemed to need a new string while the core message keys are frozen (ADR 0041). The owner now wants both: the star still flies, and it lands on a count. The count needs no new key, because the screen reader text reuses `list.count`, the existing plural "{{count}} stocks".

- **Badge (web).** The Watchlist option shows a 24 px circle with the number of starred stocks. The server renders it with 0, because stars are device-only state, and the 24 px slot holds two digits, so the saved count arriving after hydration does not move the label. That arrival changes the number without motion.
- **Landing.** The flying star from ADR 0062 now targets the badge instead of the whole option, and the badge bumps to 130%. The count does not change until the star lands: `integrations/star-motion.ts` keeps the symbols still in flight, and the badge subtracts those that are still starred. The digits then flip, upward when the count grows and downward when it shrinks.
- **Unstar mid-flight.** Unstarring a symbol cancels its flight, so the count drops at once and no other saved star is hidden. An unstar from elsewhere, such as another tab, is covered by subtracting only symbols still on the watchlist.
- **No flight.** Unstarring, reduced motion, a hidden or current Watchlist option and the detail page change the number at once. Under reduced motion the digits swap without flipping.

## Considered options

- **Change the number on tap:** simpler, but the number turns over while the star is still in the air, so the landing confirms nothing.
- **Delay the flip with `animation-delay`:** the old number has left the DOM during the delay, and changing the delay on a running CSS animation retimes it.
- **Render the badge only after the watchlist loads:** the label moves when the badge appears on every reload.
