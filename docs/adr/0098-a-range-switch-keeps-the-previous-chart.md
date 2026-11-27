# A range switch keeps the previous chart

Switching to a range that is not cached replaced the chart and the header's change with skeletons until the new history arrived. Against the simulator on the same machine that is a blink of 20 to 35 ms; against the hosted gateway a history request takes 0.5 to 1.3 s, so the page dropped a chart the reader was looking at, showed a skeleton, then faded the new line in from nothing. It read as flicker.

The web stock page now keeps the previous range on screen while the next one loads. `useLiveHistory(symbol, range, { keepPrevious: true })` passes TanStack Query placeholder data to `useHistory`, limited to the same symbol so another stock's chart is never shown. The result reports `updating` while that placeholder is shown and `range` for the range the bars belong to, so the chart, its tick format, the 1D previous-close line and the header label all follow the data rather than the selected button. The selected button moves at once.

While updating, the chart and the header's change row dim to 40% and a spinner fades in over the plot, both after 150 ms in CSS, so a fast answer shows neither. Scrubbing pauses, because the readout would mix the old bars with the new range. When the new range arrives the line brightens from 40% instead of fading in from 0. `asOf` is left out while updating, since the placeholder's age belongs to the old query. If the new range fails, the placeholder is dropped and the usual error with Retry shows (ADR 0011). The first load of a page still shows the skeleton, because there is nothing to keep.

The option is opt-in, so mobile keeps its skeleton until it adopts the same treatment.

## Considered options

- **Keep the skeleton and show it only after a delay:** removes the local blink but still drops the chart for a second on the hosted gateway.
- **Load every range in advance:** makes switches instant but spends up to eight Alpaca history calls per stock opened in Live mode, against a share of 60 a minute (ADR 0093). Starting a request when a range is pressed is left for a later change.
- **Placeholder data for every caller:** simpler, but mobile would draw the old bars with the new range's axis until it handles `updating`.
