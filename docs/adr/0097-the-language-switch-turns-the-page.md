# The language switch turns the page

Amends ADR 0051 and ADR 0060 on web, and adds one named exception to ADR 0048. Mobile is unchanged.

On web, switching language now turns the page like a card. The old page rotates away until it is edge-on, and the new page rotates in from the other side. The mirrored layout is the back of the page, so the motion shows what the switch did: what sat at the start now sits at the end. The cross-fade showed both layouts on top of each other for a moment, which read as a blur and explained nothing.

- **It is the same view transition with different keyframes.** ADR 0051 already flips `lang`, `dir` and the strings inside `document.startViewTransition`. The web platform now also sets `data-locale-turn` on `<html>` to the new direction while the transition runs, and CSS scoped to that attribute replaces the root cross-fade. The socket, the query cache and the quote store are untouched, and no dependency is added.
- **Two quarter turns make the half turn.** The old snapshot rotates on the Y axis from 0° to 90°, then the new one from -90° to 0°, each over `duration.slow`: 640 ms in all. The edge where the old page leaves is the edge where the new page arrives, so it reads as one 180° turn. A real two-sided card needs `preserve-3d` across the view-transition pseudo-elements, which is not reliable.
- **The direction follows the language.** The page turns one way to Arabic and the other way back to English, through one `--turn` sign.
- **It reads as a block.** The perspective is 234vw, so the turn looks the same on a phone and on a wide monitor. At the midpoint the page is at 82% of its size and 70% brightness, over a `color.fill` backdrop that differs from the page in both colour schemes.
- **The toggle turns with the page.** ADR 0060 gave the toggle its own view transition, so it glided to its mirrored place while the page cross-faded. Over a turning page that left it floating alone on the backdrop, so it is now part of the page snapshot. The cost is that the fill slides while the page is edge-on, and only the end of the label swipe is seen as the new page arrives. A browser without view transitions still shows the whole slide.
- **Two exceptions to ADR 0048.** `easing.standard` starts from rest, which would leave the new page hanging edge-on, so the halves use an accelerating and a decelerating curve that meet at speed. The dimming animates `filter`, once per switch and never per tick.
- **Reduced motion switches at once.** Every turn rule sits inside `prefers-reduced-motion: no-preference`. A browser without view transitions also switches at once.
- **The old page is a still image.** Prices stop for the first 320 ms and tick again as the new page arrives, which is live. The page takes no clicks until the turn ends.

## Considered options

- **Keep the cross-fade:** quiet and already shipped, but it does not show that the layout mirrored.
- **Keep the toggle's own transition:** the control stays put under the pointer and its slide stays visible, but it floats over an empty backdrop at the midpoint. Built and rejected.
- **One two-sided card with `preserve-3d`:** a single rotation and no hand-off at 90°, but it depends on 3D context across pseudo-elements that the browser builds.
- **The same turn on mobile:** React Native has no view transitions. Rotating the root view with Reanimated leaves native sheets and headers flat, and large perspective transforms can clip on Android. The owner chose web only.
