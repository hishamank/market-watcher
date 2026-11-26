# Language

The header toggle switches the app between English and Arabic in place. Strings, `html[lang]` and `html[dir]` change together while the socket stays connected, and a `locale` cookie makes the server render the same language on the next load (ADR 0051).

## Sub-features

- `G6` the toggle flips language and direction in place, the server keeps the choice, values stay left to right, and the indicators follow the flip.

## How to get to it (user POV)

- Open `/` and press "ع" beside search. Press "EN" to switch back.
- From a detail page the toggle is in the same place.

## Driving it with bin/journey

Preconditions: the baseline in the README, and a fresh context with no `locale` cookie.

- **Flip (G6).** Wait for `app-root[data-connection="connected"]`, press `language-option-ar`, then wait for `html[dir="rtl"]` and `html[lang="ar"]`. `language-toggle[data-locale="ar"]` still reads "EN" then "ع", left to right, and `language-option-ar` has `aria-pressed="true"`. `app-root` is still `connected` and prices keep changing. Evidence: `G6-list-1440.png`.
- **Server render (G6).** Fetch `/` with the same context. The HTML has `lang="ar"` and `dir="rtl"` on `<html>`. Reload: the page is Arabic with no hydration warning.
- **Values (G6).** Open `/stocks/AAPL?range=5Y`. Axis dates read "5 يونيو" with Latin digits. Scrub the chart: the header label reads the date first, with "09:30 ET" kept together. The view control and range tab indicators sit under their selected options before and after a flip.
- **Widths.** Repeat at 360 × 740 with a `locale=ar` cookie: no horizontal scroll on the list or the detail page.

## Gotchas

- The flip runs inside `document.startViewTransition`, so `dir` changes a frame after the click. Wait for the attribute; don't read it straight after the click.
- Arabic dates carry Unicode isolates (U+2067 … U+2069) and a left-to-right mark before "ET". Text assertions must include them or match with a regular expression.
- Company names are Latin with `dir="auto"`. A downscaled screenshot can make "Apple Inc." look like ".Apple Inc"; check the element on its own before calling it a bidi bug.
