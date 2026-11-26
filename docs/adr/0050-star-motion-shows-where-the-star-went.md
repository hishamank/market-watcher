# Star motion shows where the star went

Amends ADR 0048 and the Motion and Star sections of `docs/DESIGN.md`.

Starring a suggestion on the empty watchlist swapped the whole card in one frame, and unstarring the last row swapped it back. Starring on the All list gave no sign of where the stock went. Both are changes the user caused, so under ADR 0048 they get motion. Each tap plays at most one of the effects below.

- **Empty to list (web).** The starred suggestion row moves into the first slot of the watchlist. The empty state's star fills amber, then the empty state shrinks to 94% and fades. The other suggestions fade out. Unstarring the last row plays this in reverse: the row moves back to its suggestion slot, and the empty state fades in while its star pops. Only these two swaps animate. Removing one row from a longer watchlist stays instant.
- **Star flies to the Watchlist control (web).** Starring anywhere else sends a copy of the star along a curve into the Watchlist option of the view control, which then bumps to 106%. This happens only when that control is on screen and not the current view, so it never stacks with the row move.
- **Mobile.** The Watchlist tab has no suggestions (ADR 0049 is web only). The swap between the empty state and the list fades in over `duration.base`, and the empty state's star pops when it comes back. Neither plays on the first render after the watchlist loads. The tab bar stays still, because the haptic tap already confirms the star.

**How it works on web.** The watchlist store reaches React through `useSyncExternalStore`, and React applies those updates synchronously, never as a transition. React's `ViewTransition` therefore cannot animate a star toggle, as it does the list-to-detail morph. `integrations/star-motion.ts` calls `document.startViewTransition` and applies the toggle inside it with `flushSync`. During that transition only, a `data-star-motion` attribute on the root names each row (`star-row-{SYMBOL}`) and the empty state. The names are absent the rest of the time, so the `open-stock` navigation morph never captures a row. The browser ignores clicks on the page while a view transition runs, so a second tap within those 320 ms is lost. That is the reason only the two swaps get a transition, and removing a row from a longer list does not. The flying star is a temporary clone driven by the Web Animations API and removed when it lands. All of this is transform and opacity. Under reduced motion, or without `startViewTransition`, the toggle applies at once and nothing flies.

> **Design note:** "Star motion shows where the star went: into the watchlist when the card is empty, or into the Watchlist control from anywhere else. One tap gets one effect. The store updates synchronously, so React's view transitions can't see it. I start the view transition by hand for that one swap, and the row names exist only while it runs, so the existing navigation morph is untouched."

## Considered options

- **Wrap the toggle in `startTransition` and use React's `ViewTransition`:** this is the path ADR 0048 chose for navigation. It does not work here, because a mutation of an external store inside a transition falls back to a blocking update.
- **Row names always on:** less code, but the `open-stock` navigation would capture every row and send rows flying on a view switch, which ADR 0048 rules out.
- **A count badge on the Watchlist control:** it shows how many, not where the stock went, and it needs a new string, while the core message keys are frozen (ADR 0041).
- **Fly to the mobile tab bar:** this needs window measurements across the navigator and an overlay above the tabs, for a cue that the haptic tap already gives.
