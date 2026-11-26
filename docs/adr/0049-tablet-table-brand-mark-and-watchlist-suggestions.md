# Tablet table, brand mark and watchlist suggestions

Amends the Layout, App header and Empty state sections of `docs/DESIGN.md`.

Three layout gaps made the app look unfinished in the design review.

- **768 to 1279 px:** each row stacked the price over the pill at the far end of a 720 px card, leaving about 400 px of empty middle. These widths now show a compact table: name, symbol, price, day change (money and percent) and the star, with a header row. The full seven-column table still starts at 1280 px, and the 1280 px list pane keeps the phone row.
- **Header:** "Markets" sat alone. A small mark (a rising line in a rounded square, drawn in `color.text`) now leads the title. It is decoration, hidden from screen readers, and hidden on the phone detail route where the back button takes its place.
- **Empty watchlist:** the empty state now lists the first three stocks of the catalogue as live rows with stars, under "Start with one of these", so the first star is one tap away. Starring one turns the view into the watchlist at once.

> **Design note:** "The tablet table fills the width with the data people scan, the mark gives the shell an identity, and the empty watchlist offers the next action instead of a dead end. All three reuse existing components and data, so there is no new state."

## Considered options

- **Two-column card grid at tablet widths:** fills the space, but breaks the scan of a price column and needs a third row design.
- **Top movers in the empty watchlist:** more interesting, but sorting the catalogue is logic that belongs in core and would add to the frozen API (ADR 0041). The first three stocks need no new logic.
