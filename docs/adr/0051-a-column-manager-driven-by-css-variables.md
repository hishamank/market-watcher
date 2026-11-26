# A column manager driven by CSS variables

Amends ADR 0049, ADR 0050 and the Layout section of `docs/DESIGN.md`.

A column manager lets the user choose which columns the stock table shows. From 768 px, a **Columns** button next to the All and Watchlist toggle opens a menu with one checkbox per column.

- **Core owns the choice.** `useTableColumns` returns every column in table order, the saved choice (or `undefined` when there is none), which columns are locked, and `toggle` and `reset`. Name and Price are locked, so a saved choice always contains them. The choice is saved under `table-columns:v1` through the `KeyValueStore`, like the watchlist, so it stays on the device and follows to other tabs. Unknown or corrupt values fall back to the default layout.
- **Without a saved choice, nothing changes.** Each width keeps the layout from ADRs 0049 and 0050, drawn by CSS alone. The server render, which cannot know the width or the device's storage, therefore stays correct. The menu shows the current width's layout as checked, so the first toggle starts from what is on screen.
- **With a saved choice, the list reads CSS variables.** The list section sets `data-custom-columns` and a few variables: the grid tracks, the span of the row link, the table's minimum width, and `block` or `none` for each optional column. A `list-custom` Tailwind variant, active from 768 px inside that section, applies them. The header and the rows stay views with no new props, and a toggle re-renders one element instead of every row.
- **Overflow scrolls sideways.** When the chosen columns are wider than the list, the list scrolls inside its card and Name stays pinned at the start, so the page itself never scrolls sideways. A saved choice applies at every table width, so the narrow table can show everything someone asked for.
- **The percent in the day change pill** shows whenever the Day change % column is hidden, so the percent never disappears entirely.
- **The menu is a native popover.** It closes on Escape and on a click outside, with no effect or state in a component, and CSS anchor positioning places it under the button.

The column manager is web only. Mobile shows rows, not a table. The list pane beside the stock page keeps its rows.

> **Design note:** "Core owns the column choice like it owns the watchlist: it validates it, keeps Name and Price locked, and saves it per device. The web turns the choice into a handful of CSS variables on the list, so the rows stay plain views and the server render with no choice is exactly what it was. When someone picks more than fits, the table scrolls sideways with the name pinned, rather than silently hiding what they asked for."

## Considered options

- **Hide columns that do not fit, by priority:** no sideways scroll, but a column someone turned on could still be missing, which the owner rejected.
- **Pass the chosen columns to every row as props:** explicit, but every row would re-render on a toggle and the row view would carry layout logic.
- **Generate a class per column combination:** Tailwind only sees class names written in the source, so runtime combinations need inline variables anyway.
- **Save the choice on the server by device ID (ADR 0031):** survives a cleared browser, but no server-side preferences exist yet, and the watchlist itself is still local.
