# Rounding, display precision and the baseline rule

The money module rounds half away from zero. A price shows 2 decimals at $1 or more and 4 below, and the precision is chosen after rounding, so 0.99995 becomes 1.00 rather than 1.0000. A change takes the precision of the current price, so a 1-cent move on a $150 stock shows as 0.01, and a percent change always has 2 decimals. Producers round the price and the previous close first, then compute the change from those rounded strings, so the change on screen always equals the price on screen minus the previous close on screen.

A previous close, the baseline for every percent change, must be positive after rounding. The smallest baseline is 0.0001. The quote and history schemas reject a zero or unrounded baseline, so a percent change can never divide by zero. Prices on the wire are capped below 10^12 dollars, which keeps every derived value inside the schema's string limits. The schemas also reject any price, change or percent that is not already at display precision, so every client displays exactly the digits it receives.

## Considered options

- **Banker's rounding (half to even):** standard in accounting totals, but surprising on a single displayed price, and nothing here is summed.
- **Marking percent change as unavailable for a zero baseline:** needs a second representation in every view, for a case no real or simulated quote produces.
