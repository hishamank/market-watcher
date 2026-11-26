# The price flash follows the tick

Amends the price flash in `docs/DESIGN.md` and feature L2.

The flash used to ring the day-change pill in the day's colour on every tick. In a walk of the list at 1440 px, 8 to 18 prices were flashing in every 100 ms sample, so the ring read as a flickering border, not as news. It also lied: Apple down on the day but ticking up flashed red.

Now the flash marks one thing: this price just moved, and which way. Take Apple at $265.10 ticking to $265.14. The flash is green because $265.14 is above $265.10, whatever the day did. It is a short tint behind the price digits, `color.gainTint` or `color.lossTint` fading from full to nothing over `duration.flash`, so the digits keep `color.text` on a known AA pair at every frame. The digits that changed roll up into place in the same beat.

A row flashes only when its price string changes, and at most once a second. Ticks inside that second update the digits without a flash. That keeps a fast stock readable during a tick spike and means a still screen is calm.

The direction comes from the contracts money module (`subtract`, then `directionOf`), inside each app's `integrations/use-tick-flash.ts`. Core is unchanged, so the frozen API (ADR 0041) holds. `data-flash` keeps its name and values and now carries the tick's direction. Reduced motion shows no tint and no roll, and still sets `data-flash`.

> **Design note:** "A flash should mean 'this price just moved'. When every row flashed all the time it meant nothing, so I colour it by the tick, throttle it to once a second per row, and put it on the price instead of the pill. The cost was a spec change and one rewritten test."

## Considered options

- **Keep the day-direction ring:** matches the old spec, but it is on most of the time and can show the opposite of the move.
- **Flash every tick by tick direction:** honest, but at four ticks a second the screen strobes.
- **Change the text colour for the flash:** louder, but loss text on a white row and gain text on a tinted one need extra contrast checks mid-animation. A tint behind unchanged text keeps one known pair.
- **Compute the direction in core:** one place for both apps, but it adds to the frozen API for a view concern each app already handles in `integrations/`.
