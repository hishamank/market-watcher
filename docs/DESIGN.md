# DESIGN.md: Graphite

The design source for the mini trading app. Engineers and AI agents build from this file. The canvas holds the drawn version of everything here: the design system sheets and every screen state, in light and dark.

Terms follow `docs/glossary.md`. Test IDs and state attributes follow `docs/feature-map.md`.

## Direction

Graphite is a calm, layered interface for reading prices. Surfaces stack in three steps (background, surface, raised) and are separated by a 1 px border and a soft shadow, never by blur. Colour is rationed: neutral greys carry the layout, green and coral carry gain and loss, and amber is reserved for the star and the focus ring. Numbers are the content, so every price, change and time is set in tabular digits that never shift when they tick. Movement is small and purposeful: a tint behind a price that just moved, controls that answer the pointer, and short transitions that all have a reduced-motion alternative (ADR 0048). Light and dark are equal themes built from the same tokens. The layout is written in start and end terms from day one, so Arabic mirrors without rework.

## Rules that always hold

- **Data.** Only draw what the gateway provides. Per stock: symbol, name, price, day change (money and percent), previous close, time of the last update. Charts: one price per bar. Global: feed mode and market status. Search: symbol and name. No volume, market cap, news, logos, holdings or portfolio value.
- **Gain and loss.** Never colour alone. Every change carries a sign (+ or −) and an up or down arrow. Flat shows a dash and no sign.
- **Contrast.** Every text and background pair below passes WCAG AA (4.5:1) in both themes. Two limits: do not put `color.textMuted`, `color.accent` or `color.loss` text on `color.fill` in light, and do not put `color.textMuted` on `color.raised` in dark.
- **Focus.** Every control shows a 2 px `color.focus` outline with a 2 px offset on keyboard focus.
- **Targets.** Every control is at least 44 by 44 px.
- **Numbers.** Tabular digits everywhere. Prices show 2 decimals at $1 and above and 4 below. Percentages show 2 decimals. The minus sign is U+2212. Market times are New York time with an "ET" label. Digits are always Latin (0 to 9), in Arabic too.
- **Direction.** Spacing and alignment use start and end, never left and right.
- **Effects.** No backdrop blur. Everything here can be built in Tailwind v4 and in React Native StyleSheet.

## Tokens

Token names are semantic and shared by web and mobile. `packages/tokens` holds the raw values. Web maps them to Tailwind v4 theme variables (`color.textSecondary` becomes `--color-text-secondary`). Mobile imports the same object.

### Colour

**Surfaces**

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `color.bg` | `#F1F1EF` | `#0E0E0F` | Page background |
| `color.surface` | `#FFFFFF` | `#171718` | Cards, the list, sheets |
| `color.raised` | `#FFFFFF` | `#2C2C30` | Selected segment, dropdown, toast, chart readout |
| `color.fill` | `#E4E3DF` | `#222224` | Neutral control fill: segmented track, search field, chips, skeletons |
| `color.hover` | `#F7F7F5` | `#1D1D1F` | Row hover |

**Text**

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `color.text` | `#1A1A19` | `#F2F1EE` | Primary text |
| `color.textSecondary` | `#51504C` | `#B5B3AD` | Labels, help text, unselected options |
| `color.textMuted` | `#696862` | `#93918B` | Symbols, axis labels, stale prices |

**Lines and focus**

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `color.border` | `#DEDDD9` | `#2E2E31` | Dividers and card borders |
| `color.borderStrong` | `#8A8882` | `#6F6E6A` | Button and control outlines (3:1) |
| `color.focus` | `#9A5600` | `#F5A524` | Focus ring |
| `color.accent` | `#9A5600` | `#F5A524` | Accent text and icons |
| `color.accentFill` | `#B86E00` | `#F5A524` | Filled star |
| `color.accentTint` | `#F3EBE0` | `#322819` | Search match highlight |

**Market**

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `color.gain` | `#0B7049` | `#4ADE9A` | Gain text, arrow |
| `color.gainTint` | `#E7F1ED` | `#1C2B25` | Gain pill background |
| `color.loss` | `#BF3A22` | `#FF8A75` | Loss text, arrow |
| `color.lossTint` | `#F9EBE9` | `#2E2221` | Loss pill background |
| `color.flat` | `#51504C` | `#B5B3AD` | Flat change |

**Status**

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `color.stale` | `#6F5B00` | `#E9D15B` | Stale and warning icons |
| `color.staleTint` | `#EEEBE0` | `#302D20` | Stale banner, as-of note, countdown |
| `color.error` | `#B4233F` | `#FF7A90` | Error icons |
| `color.errorTint` | `#F6E5E8` | `#332326` | Error backgrounds |
| `color.info` | `#1F5FBF` | `#7FB2FF` | Info icons |
| `color.infoTint` | `#E4ECF7` | `#232A34` | Info backgrounds |

**Chart**

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `chart.gainLine` | `#0B7049` | `#4ADE9A` | Line when the range is up |
| `chart.gainArea` | #0B7049 20% to 0% | #4ADE9A 20% to 0% | Area under a gain line, top to bottom |
| `chart.lossLine` | `#BF3A22` | `#FF8A75` | Line when the range is down |
| `chart.lossArea` | #BF3A22 20% to 0% | #FF8A75 20% to 0% | Area under a loss line, top to bottom |
| `chart.grid` | `#EDECEA` | `#242426` | Gridlines |
| `chart.crosshair` | `#51504C` | `#B5B3AD` | Scrub crosshair |
| `chart.previousClose` | `#696862` | `#93918B` | Dashed previous close line |

### Type

One family: **Alexandria** (Google Fonts, weights 300 to 700), for Latin and Arabic. Its digits are tabular with `font-variant-numeric: tabular-nums` and keep the same width at every weight. Fallback: `system-ui, sans-serif`.

| Token | Size / line | Weight | Letter spacing | Arabic size / line |
| --- | --- | --- | --- | --- |
| `type.display` | 40/48 | 600 | -0.02em | 40/64 |
| `type.headingLg` | 22/28 | 600 | 0 | 22/36 |
| `type.headingMd` | 17/24 | 600 | 0 | 17/30 |
| `type.body` | 15/22 | 400 | 0 | 15/28 |
| `type.bodyStrong` | 15/22 | 500 | 0 | 15/28 |
| `type.label` | 13/18 | 500 | 0 | 13/24 |
| `type.caption` | 12/16 | 400 | 0 | 12/22 |
| `type.micro` | 11/14 | 400 | 0 | 11/20 |

Arabic keeps each size and weight but uses the taller Arabic line height, because Arabic marks reach below the Latin line box. Letter spacing is always 0 in Arabic. One-line truncation must clip on the inline axis only (`overflow-x: clip`), so marks are never cut.

Numeric styles, always left to right and tabular:

| Token | Size / line | Weight | Letter spacing | Used for |
| --- | --- | --- | --- | --- |
| `numeric.display` | 40/48 | 600 | -0.02em | Detail price |
| `numeric.price` | 15/20 | 500 | 0 | Row price |
| `numeric.change` | 12/16 | 500 | 0 | Day change, range change in rows |
| `numeric.axis` | 11/14 | 400 | 0 | Chart axis and small times |

### Spacing

| Token | Value |
| --- | --- |
| `space.0` | 0 px |
| `space.2` | 2 px |
| `space.4` | 4 px |
| `space.6` | 6 px |
| `space.8` | 8 px |
| `space.10` | 10 px |
| `space.12` | 12 px |
| `space.14` | 14 px |
| `space.16` | 16 px |
| `space.20` | 20 px |
| `space.24` | 24 px |
| `space.32` | 32 px |
| `space.40` | 40 px |
| `space.48` | 48 px |

### Radii

| Token | Value | Used for |
| --- | --- | --- |
| `radius.xs` | 8 px | Skeleton blocks |
| `radius.sm` | 10 px | Segments, chart readout |
| `radius.md` | 12 px | Buttons, icon buttons, tiles |
| `radius.lg` | 14 px | Search field, segmented track, toast, dropdown |
| `radius.xl` | 20 px | Cards, sheets |
| `radius.pill` | 999 px | Pills, badges, chips |

### Elevation

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `elevation.0` | none | none | Rows and sections on the background |
| `elevation.1` | `0 1px 2px rgba(26,26,25,.08), 0 4px 12px rgba(26,26,25,.06)` | `inset 0 1px 0 rgba(255,255,255,.06), 0 1px 2px rgba(0,0,0,.4)` | Cards, the selected segment |
| `elevation.2` | `0 2px 6px rgba(26,26,25,.08), 0 12px 32px rgba(26,26,25,.14)` | `inset 0 1px 0 rgba(255,255,255,.08), 0 12px 32px rgba(0,0,0,.6)` | Dropdown, sheets, toast, chart readout |

In React Native, `elevation.1` and `elevation.2` map to shadow properties, and the dark inset highlight becomes a 1 px top border in `rgba(255,255,255,0.06)`.

### Motion

| Token | Value |
| --- | --- |
| `duration.fast` | 120 ms |
| `duration.base` | 200 ms |
| `duration.slow` | 320 ms |
| `duration.flash` | 400 ms |
| `easing.standard` | cubic-bezier(0.2, 0, 0, 1) |
| `easing.exit` | cubic-bezier(0.4, 0, 1, 1) |

**Price flash.** When a price's displayed value changes, a tint in the tick's direction (`color.gainTint` if the new price is higher than the one before, `color.lossTint` if lower) appears behind the price digits and fades from 100% to 0% opacity over `duration.flash` with `easing.standard`. The digits keep `color.text`, so contrast holds at every frame. On web, the digits that changed roll up 30% of their height into place in the same beat; the others stay still. Mobile shows the tint only. A row flashes at most once a second: ticks inside that second update the digits with no flash (ADR 0047). Nothing flashes on first render. The price element gets `data-flash="up"` or `"down"` for the duration. On mobile the tint is an absolutely positioned view behind the price text.

**Interaction.** Hover motion applies to a fine pointer only. Rows and search results fade their hover fill in over `duration.fast`. Buttons step up 1 px on hover, and sink 1 px and scale to 98.5% while pressed. The star scales to 90% while pressed. The selected segment of every segmented control is one indicator that slides to the new option; its size is measured, because options can differ in width in Arabic.

| Animation | Default | Reduced motion |
| --- | --- | --- |
| Price flash | Tint fades out behind the price, 400 ms; changed digits roll up (web) | No tint, no roll. `data-flash` is still set. |
| Hover fill (rows, results) | Fades in, 120 ms | Changes at once |
| Button | Steps up 1 px on hover; sinks 1 px and scales to 98.5% on press, 120 ms | Colour only |
| Connection banner | Expands and slides in, 200 ms; collapses on exit, 200 ms | Appears and disappears at once |
| Selected segment (view control, range tabs, chaos failure rate) | Indicator slides to the new option, 200 ms | Jumps |
| Star | Scales from 85% to 100%, 120 ms; 90% while pressed | Fills at once |
| Chart first draw | Line reveals from left to right, 450 ms | Appears at once |
| Range change | New line fades in, 200 ms | Swaps at once |
| Live point | Halo pulses, 2 s loop | Static halo |
| Search dropdown (from 768 px) | Drops 6 px and fades in, 200 ms | Fades in, 120 ms |
| List to detail (web) | Name and price move from the row into the detail header, 320 ms (only when opening from a row) | Page changes at once |
| Haptics (mobile) | Light tap on star; selection tick on range change | Unchanged |
| Skeleton | Pulses between 100% and 55% opacity, 1.2 s loop | Static fill |
| Search sheet | Slides up, 320 ms | Fades in, 120 ms |
| Toast | Slides up and fades in, 200 ms | Fades in, 120 ms |
| Reconnecting icon | Rotates, 1 s loop | Static icon |

## Layout

| Width | Layout |
| --- | --- |
| 360 px | One column. The list runs edge to edge on `color.surface`. Search opens as a full-screen sheet. Chaos controls open as a bottom sheet. |
| 768 px | One centred column, at most 720 px wide. The list and the detail sit in cards (`radius.xl`, `elevation.1`). From 768 px to 1279 px the list is a compact table with a header row: name, symbol, price, day change (money and percent) and the star (ADR 0049). Search is a 380 px field in the header with a dropdown. |
| 1440 px | `/` shows the list as a table, at most 1120 px wide, with columns for name, symbol, price, day change, day change %, previous close and last update. `/stocks/[symbol]` keeps the list visible in a 400 px pane at the start, with the detail card beside it. |

The list and the detail stay separate routes at every width. The 1440 px detail layout is a proposal: the list pane is the same list component, with the open symbol marked by `aria-current`. Page padding is `space.16` at 360 px and `space.24` from 768 px.

## Right to left

- The root sets `dir="rtl"` and `lang="ar"`. Layout uses logical properties only, so it mirrors by itself.
- Prices, symbols, percentages, times and charts stay left to right. On web, wrap each value in `<bdi dir="ltr">`. In React Native, put U+2066 before the value and U+2069 after it, and set `writingDirection: 'ltr'`.
- Charts never mirror: time runs left to right and the TradingView mark stays in the bottom left corner of the plot.
- Range tabs and the view control mirror, because they are controls, not values.

| Icon | In Arabic |
| --- | --- |
| Back chevron | Mirrors |
| Open chevron | Mirrors |
| Gain arrow, loss arrow | Never mirror |
| Star, search, retry, reconnecting, clock, offline, chart | Never mirror |

## Components

Each component lists its anatomy, states, spacing, motion and test IDs.

### App header

- **Anatomy.** A 28 px brand mark (a rising line in `color.bg` on a `color.text` square with `radius.sm`, hidden from screen readers) leads the title, except on the 360 px detail route. At 360 px: page title "Markets" (`type.headingMd`), below it the feed mode badge and, when it applies, the Market closed label, and a search button at the end. On the detail route the title is replaced by a back button. From 768 px: one row with title, badge, Market closed label, and the search field at the end.
- **Spacing.** Minimum height 64 px at 360 px and 72 px from 768 px. Inline padding `space.16` start, `space.6` end (the icon button supplies the rest).
- **Feed mode badge.** A pill with a 7 px dot and the word "Simulated" or "Live", `type.caption` at weight 500, `color.textSecondary`. Simulated has a dashed `color.borderStrong` border and a hollow dot. Live has a solid border and a filled dot. It never changes while the page is open and is present in the server render.
- **Market closed label.** A 16 px moon icon and "Market closed", `type.caption` at weight 500, `color.textSecondary`. Absent while the market is open.
- **Test IDs.** `feed-mode-badge`, `market-status-label`, `app-root[data-feed-mode]`, `app-root[data-market-status]`.

### Connection banner

- **Anatomy.** Icon, title, one line of help, and an action at the end. It sits under the header on every page.
- **States.**
  - Connecting or connected: no banner.
  - Stale: `color.staleTint` background, reconnecting icon in `color.stale`, "Reconnecting…", "Prices may be out of date.", and a Retry button.
  - Offline: `color.fill` background, offline icon, "Offline", "Check your connection. Prices may be out of date.", no button, because nothing reconnects while offline.
- **Spacing.** Minimum height 56 px, block padding 6 px, inline padding 14 px start and 6 px end, icon to text gap 10 px. Title is `type.label` at weight 600, help is `type.label` in `color.textSecondary`.
- **Motion.** Expands and slides in. On exit it collapses, so content below glides back instead of jumping. Content below never jumps while the banner stays.
- **Test IDs.** `connection-banner`, `connection-retry`, `app-root[data-connection]`.

### Stock row

- **Anatomy.** Name (`type.bodyStrong`, one line, truncated) over symbol (`type.caption`, `color.textMuted`). At the end: price (`numeric.price`) over the day change pill (`numeric.change`: arrow, signed money, signed percent in brackets). A star button closes the row. The name area and numbers are one link to the detail route.
- **Spacing.** Minimum height 68 px. Inline padding `space.16` start, `space.6` end. 12 px between name and numbers. The pill has 2 px by 8 px padding, `radius.pill`, a 9 px arrow and a 5 px gap. Rows are separated by a 1 px `color.border` line.
- **States.**
  - Ticking up or down: the flash tint behind the price (see Price flash). `data-direction` on the price is `up`, `down` or `flat`, the day's direction.
  - Flat: dash icon, "0.00 (0.00%)", `color.flat` on `color.fill`.
  - Stale: price in `color.textMuted`, pill in `color.textSecondary` on `color.fill` (muted text on fill fails AA in light), arrow and sign kept, no flash.
  - Last-known quote: 14 px clock in `color.stale` before the LTR price; digits remain `color.text`. Neutral change pill keeps arrow, sign and numbers. The clock has a native title and screen-reader text on web, and the sentence joins the mobile row accessibility label. No nested tap target. Desktop Last update includes date and time. Connection stale wins for digits and keeps the clock.
  - Hovered: `color.hover` background.
  - Focused: focus outline on the link area, inset by 2 px.
  - Current (1440 px list pane): `color.fill` background and `aria-current`.
  - Star loading: see Star.
- **Table row (1440 px list).** Minimum height 56 px, one grid row per stock with the columns named under Layout. Numbers align to the end.
- **Test IDs.** `stock-row-{SYMBOL}`, `stock-row-name-{SYMBOL}`, `stock-row-price-{SYMBOL}` (with `data-direction` and `data-flash`), `stock-row-change-{SYMBOL}`. In the watchlist: `watchlist-row-{SYMBOL}`.

### Star

- **Anatomy.** A 44 px button with a 20 px star icon, `aria-pressed`, label "Star {name}".
- **States.** Off: outline in `color.textMuted`. On: filled in `color.accentFill`. Loading, before the watchlist is known: outline in `color.border`, not interactive, same size so nothing shifts when it resolves. Focused: focus outline.
- **Motion.** On: scales from 85% to 100%.
- **Test IDs.** `star-{SYMBOL}`, `detail-star`, `search-result-star-{SYMBOL}`.

### All and Watchlist control

- **Anatomy.** A two-option segmented control. Each option is a link, because the view lives in the URL.
- **Spacing.** Track: `color.fill`, `radius.lg`, 4 px padding, 2 px gap. Option: minimum height 44 px, `radius.sm`, `type.label`.
- **States.** Selected: `color.raised` with `elevation.1`, weight 600, `aria-current="page"`. Unselected: `color.textSecondary`. Focused: focus outline.
- **Test IDs.** `view-toggle-all`, `view-toggle-watchlist`.

### Search

- **Field.** Minimum height 48 px, `radius.lg`, `color.fill`, a 20 px search icon, placeholder "Search symbol or company". Active: 1 px `color.focus` border plus a 1 px ring. With text: a Clear button at the end. While a request is in flight: a spinner replaces Clear.
- **Results.** One row per result, minimum height 56 px: symbol (weight 600, 60 px column), name (`type.label` weight 400, `color.textSecondary`, truncated) and a star. The matched part is marked with `color.accentTint` and weight 600 in `color.text`. The keyboard-highlighted result has a `color.fill` background. At most 10 results.
- **States.** Idle: "Find a stock", "Search by symbol or company name." Loading: skeleton result rows. No results: 'No results for "{query}"', "Check the spelling, or search by symbol or company name." Error: "Search isn't available", "Something went wrong. Try again.", Retry.
- **Placement.** At 360 px: a full-screen sheet with a back button beside the field. From 768 px: a 380 px field in the header and a dropdown of the same width, 8 px below it, `radius.lg`, `elevation.2`.
- **Test IDs.** `search-input`, `search-result-{SYMBOL}`, `search-result-star-{SYMBOL}`.

### Range tabs

- **Anatomy.** Six equal segments: 1D, 1W, 1M, 3M, 1Y, 5Y. Same track and option as the view control, with `role="tablist"` and `aria-selected`. Segments share the width but grow to fit their label, and labels never wrap. This matters in Arabic, where "5 سنوات" is wider than "5Y".
- **Test IDs.** `range-tab-1D`, `range-tab-1W`, `range-tab-1M`, `range-tab-3M`, `range-tab-1Y`, `range-tab-5Y`.

### Price chart

- **Anatomy.** A line with an area fill under it, two horizontal gridlines, a live point, and an axis row below. Always left to right.
- **Size.** Plot height 176 px at 360 px and 320 px from 768 px. A 36 px strip above the plot is always reserved for the scrub readout and the "as of" note, and a 24 px axis row sits below, so no state changes the height.
- **Line and fill.** 2 px line with round joins in `chart.gainLine` or `chart.lossLine`, chosen by the selected range's direction. The area runs from 20% to 0% of the same colour.
- **1D.** The x-axis spans the whole session as the gateway's history response reports it (09:30 to 16:00 ET in Live mode, one full UTC day in Simulated mode), and the line grows across it. A 1 px dashed `chart.previousClose` line marks the previous close, with a small "Previous close 230.28" label at the end.
- **Live point.** An 8 px dot with a 20 px halo at 22% opacity that pulses outward every 2 s. It equals the header price at every tick.
- **Future (1D).** The part of the session after the live point is shaded with `color.fill` at 35% opacity, so the empty half reads as time still to come.
- **Scrubbing.** A 1 px `chart.crosshair` line and a 10 px hollow dot. The readout shows time in ET, price, and change from the start of the range with arrow and sign. It sits in the strip above the plot, follows the crosshair and stops at the chart edges. The crosshair never goes past the last bar: in the future part of 1D it rests on the live point. The chart is focusable, and the arrow keys move the crosshair one bar.
- **Attribution.** The TradingView mark keeps the bottom left corner of the plot. Keep about 72 by 20 px clear there.
- **States.** Loading: a skeleton at the exact final size (`radius.lg`) and an axis skeleton. Error: a dashed-border box with an alert icon, "Couldn't load this chart" and Retry, while the header keeps ticking. Older copy: the line in `color.textMuted`, no fill and no live point, with a note "As of 13:40 ET" on `color.staleTint` in the strip.
- **Motion.** The first draw reveals the line from left to right. A range change fades the new line in.
- **Test IDs.** `price-chart[data-state]`, `chart-last-price`, `chart-readout`, `chart-retry`.

### Detail header

- **Anatomy.** Symbol chip (`type.caption` weight 500 on `color.fill`), name (`type.body`, `color.textSecondary`), price (`numeric.display`), then the range change pill (13/18, 3 px by 10 px padding) with its label. The star sits at the end of the first row.
- **Labels.** 1D "Today", 1W "Past week", 1M "Past month", 3M "Past 3 months", 1Y "Past year", 5Y "Past 5 years".
- **States.**
  - Ticking: the flash tint behind the price.
  - Scrubbing: the price and change show the scrubbed point, and the label shows its time in ET.
  - Chart loading: a skeleton pill of the final size.
  - Chart error on a range never loaded: a neutral pill with a dash, because the range change is unknown.
  - Last-known quote: always-visible `detail-price-as-of` note below the change, with the ChartAsOf staleTint pill, stale clock, text label and textSecondary help. Last update includes date and time. No animation or “Last close” caption; chart fallback remains visible independently.
  - Market closed (separate pending ticket): a line under the change with the moon icon, "Market closed" and "Last close {time} ET", where the time is the session close the gateway reports.
  - Stale: price and pill in `color.textMuted`.
- **Below the tabs.** Two facts from the quote: "Previous close" and "Last update" (time in ET).
- **Test IDs.** `detail-header`, `detail-name`, `detail-price`, `detail-change`, `detail-change-label`, `detail-star`.

### Skeletons

- Blocks in `color.fill` with `radius.xs` (pills keep `radius.pill`). They match the final size of what they replace: list rows (68 px), the chart plot and axis, the detail header.
- **Test IDs.** `watchlist-skeleton`.

### Empty state, inline error, not found

- **Anatomy.** Centred: a 56 px round icon on `color.fill`, a title (`type.headingMd`), one line of help (`type.label`, `color.textSecondary`, at most 280 px wide) and one action.
- **Watchlist empty.** "Your watchlist is empty", "Tap the star next to any stock to add it here.", link "See all stocks". Below it, under "Start with one of these" (`type.label`, `color.textSecondary`), the first three stocks of the catalogue as live stock rows with stars (ADR 0049). Test IDs `watchlist-empty`, `watchlist-suggestions`.
- **List error.** "Couldn't load stocks", "Check your connection and try again.", solid Retry button. Test IDs `list-error`, `list-retry`.
- **Not found.** "Stock not found", "There's no stock with the symbol {SYMBOL}.", solid link "Back to all stocks". Test ID `not-found`.

### Toast

- **Anatomy.** `color.raised`, 1 px border, `radius.lg`, `elevation.2`, an alert icon in `color.error`, one line of text and a Dismiss button. Used when a star could not be saved and was rolled back: "Couldn't update your watchlist. Try again."

### Buttons

- Minimum height 44 px, `radius.md`, inline padding `space.16`, `type.label` at weight 600. Default: 1 px `color.borderStrong` border on a transparent background. Solid: `color.text` background with `color.bg` text.

### Chaos controls

- **Placement.** Opened with `?debug=1` in Simulated mode only. At 360 px it is a bottom sheet with `radius.xl` top corners over a 45% black scrim. From 768 px it is the same panel as a 360 px card in the bottom end corner (specified here, not drawn on the canvas).
- **Anatomy.** Header with a bolt icon, "Chaos controls", "Simulated mode only" and Close. Three sections:
  - "Your connection": buttons "Drop connection" and "Freeze feed", and a "Go offline" switch.
  - "Everyone, reverts after 60 seconds": switches for "Tick spike", "History latency" (help: "Adds 2 seconds") and "Force market closed", and a three-option control Off, 50%, 100% for "History failures".
  - "Connection health": four tiles for Reconnects, Frames per second, Latency and Skipped frames.
- **Countdown.** An active control shows a pill with a clock icon and the seconds left ("48 s") on `color.staleTint`.
- **Switch.** 44 by 26 px track in a 52 by 44 px target. Off: `color.fill` track with a `color.textSecondary` knob. On: `color.text` track with a `color.bg` knob.
- **Test IDs.** `chaos-panel`, `chaos-drop`, `chaos-freeze`, `chaos-offline`, `chaos-tick-spike`, `chaos-force-closed`, `health-reconnects`, `health-fps`, `health-latency`, `health-skipped`.

## Screens on the canvas

- **Design system.** Colour, type, spacing, radii, elevation, motion, right-to-left rules, Arabic lengths, and one sheet per component group.
- **Screens, light** and **Screens, dark.** The same 43 artboards in each theme:
  - List at 360 px: first load, ticking, stale, offline, load error, market closed, chaos controls open.
  - Watchlist: loading, empty, newest star first. Not found.
  - Detail at 360 px: 1D, 1W, 1M, 3M, 1Y, 5Y, chart loading, scrubbing, chart error, older copy, market closed, stale.
  - Search sheet at 360 px: idle, typing, loading, results, no results, error.
  - 768 px: list, detail. 1440 px: list, detail with the list beside it, search results over the list.
  - Search dropdown states for desktop: idle, typing, loading, no results, error.
  - Arabic: list, detail, search at 360 px, and detail at 1440 px.

All sample prices are made-up Simulated values.

## Open points

- **1D baseline (decided).** On 1D the header change and the scrub readout measure from the previous close, as drawn (ADR 0029). Every other range measures from its first bar.
- **Range change when history fails (decided).** For a range that never loaded, the header shows a dash in place of the change. The quote stays as it is: sending each range's first bar with it would change the contract for a rare failure.
- **Arabic copy.** All Arabic strings on the canvas are placeholders for layout. They need a translator.
