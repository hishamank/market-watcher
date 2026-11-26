# A motion layer for Graphite

Amends the Motion section of `docs/DESIGN.md`.

A design review found that almost nothing in the app moved. Every control snapped, so the app read as a static table. Motion here has two jobs only: confirm what the user did and show what changed. It never decorates, and it never plays because the page scrolled.

**Rules.** Motion moves `transform` and `opacity` wherever it can, uses the token durations and `easing.standard`, and has a reduced-motion form that rests in the final state. Hover motion applies only to a fine pointer. Nothing animates on first render, so server-rendered rows and rows scrolling into the virtual list appear still. Three named exceptions animate other properties, each once per user action and never per tick: the chart's first-draw reveal uses `clip-path`, the segment indicator transitions `width` and `height` when options differ in width, and the connection banner transitions its grid row height so the content below glides instead of jumping.

**What moves.**

- **Hover and press:** rows and results fade their hover fill in `duration.fast`. Buttons step up 1 px on hover, and sink 1 px and scale to 98.5% while pressed. The star shrinks while pressed and pops when it fills.
- **Selected segment:** one indicator slides to the chosen option in the view control, range tabs and the chaos failure-rate control. It is measured from the DOM, because range tabs can differ in width in Arabic.
- **Chart:** the first draw reveals the line from left to right, and a range change fades the new line in (ADR 0029). The live point's halo pulses slowly. On 1D the part of the session still to come is shaded, and scrubbing stops at the last bar instead of in that empty future.
- **Shell:** the connection banner collapses on exit as it expanded on entry, so the content below glides instead of jumping. The desktop search dropdown drops 6 px and fades in.
- **List to detail (web):** the stock's name and price move from the row into the detail header, through React's `ViewTransition` (React 19.3, no Next flag). Only a row's link tags its navigation with the `open-stock` transition type, and only that type morphs, so switching between All and Watchlist never sends rows flying. Without browser support, the page changes as before.
- **Mobile:** the same sliding range indicator and press feedback, plus haptic feedback on star and range change through `expo-haptics`, which ships in Expo Go (ADR 0033). This dependency is added with the change. Tab and star icons move from text glyphs to SVG on the existing `react-native-svg`.

> **Design note:** "Motion confirms an action or shows a change, nothing else. It is transform and opacity wherever possible, with three named exceptions that run once per click, never per tick, and every piece has a still version under reduced motion. The one new dependency is Expo's own haptics module, which runs in Expo Go."

## Considered options

- **A motion library (Framer Motion, Motion One):** layout animations and exit presence for free, but a dependency on web for what CSS transitions and one measured indicator already do.
- **Equal-width segment indicator in pure CSS:** no measuring, but it slides to the wrong place when an Arabic range label widens its tab.
- **Staggered rows on load:** more visible, but it delays reading prices and fights the virtual list. Ruled out.
- **Hand-rolled `document.startViewTransition` around navigation:** works in older React, but React 19.3 and Next 16 already coordinate it with routing.
