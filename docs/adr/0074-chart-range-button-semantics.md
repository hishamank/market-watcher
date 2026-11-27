# 0074 Chart range button semantics

Status: accepted

Historical ranges change one chart and its header rather than selecting independently labelled tab panels. Expose the web controls as a labelled group of native buttons with `aria-pressed` for the selected range. Tab moves between buttons; Enter and Space select a range. This avoids incomplete tab semantics and does not require a separate keyboard model.

At widths below 360 pixels, arrange the six ranges in three columns and two rows. Arabic labels remain fully visible with at least 44-pixel targets; wider layouts keep the existing single row and moving selection indicator. URLs, history and header values still share the same selected range.
