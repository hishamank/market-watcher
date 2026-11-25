# The as-of range change measures to the live price

Amends ADRs 0029 and 0041.

When the gateway serves a fallback copy of a range's history (one with `ageMs`, shown with an "As of" note), the detail header still shows the live price. Its range change now measures from the range's baseline to that live price, not to the copy's last bar. On 1D the baseline is the previous close, so the header keeps matching the list's day change, as ADR 0029 requires. The copy's bars stay exactly as the gateway sent them, with no live point, so the muted chart never shows a price newer than its "as of" time.

`useLiveHistory` computes this in core, through the contracts money module's `changeBetween`, so web and mobile give the same answer for the same stock and range. When no live quote exists yet, it falls back to the copy's last bar. The returned shape is unchanged. This changes the meaning of the frozen hook (ADR 0041).

## Considered options

- **Measure to the copy's last bar, as before:** consistent with the chart, but the header would pair the live price with a change from an older price, and on 1D it would disagree with the list's day change.
- **Recompute it in each app:** what the first version of the web header did, but it splits client logic between apps, so mobile would show a different number from web.
