# Feed mode in a status strip below desktop

Amends the App header section of `docs/DESIGN.md`. ADR 0004 still holds: the header always shows Simulated or Live.

At 360 px the space beside "Markets" is about 165 px, but the Simulated pill needs about 100 px and the pill with Market closed about 214 px. The status dropped under the title as a second line, a third line appeared when the market closed and the header grew, and on the detail route the stack floated beside the back button. At 768 px the 380 px search left about 81 px, so the pill ran into the language toggle and Market closed wrapped to two lines.

Below 1280 px the feed mode and Market closed now sit in a 28 px strip in `color.fill` above the header row, on every route. Both labels fit on one line in English and Arabic, and the header height no longer changes when the market closes. The strip sits above the row, not below, so it never merges with the connection banner, which uses the same fill under the header. In the strip the badge is a dot and the word; the pill border returns from 1280 px, where the status sits inline after the title as before. Each test ID renders once and moves by CSS: from 1280 px the header row becomes `display: contents` and the title takes the first place.

> **Design note:** "The status never fit beside the title on a phone, so it got its own slim strip above the header. It is the only place both labels fit on one line in both languages, the header stops jumping when the market closes, and ADR 0004's always-visible promise holds without hiding the word behind an icon."

## Considered options

- **A narrower search field:** helps only at 768 px. Search would need to drop to about 245 px, which clips its placeholder, and at 360 px search is already an icon.
- **A tidier second line under the title:** still a second line, needs a shorter "Closed" string in both languages, and has no title to sit under on the detail route.
- **A dot on the brand mark or an icon-only label:** saves the most space, but a dot with a tooltip does not tell a touch user whether prices are real, which ADR 0004 requires, and a lone moon reads as the theme switch.
