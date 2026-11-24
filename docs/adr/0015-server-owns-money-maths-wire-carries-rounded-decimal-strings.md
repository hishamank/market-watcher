# No floats for money, one shared money module, and pre-rounded decimal strings on the wire

Prices travel as decimal strings already rounded by the gateway to display precision: 2 decimals at or above $1, 4 below $1. Change uses the same precision, and percent change has 2 decimals. Money arithmetic exists once, in a shared money module in `packages/contracts` that the gateway and core both import. It parses decimal strings into exact integer units of 1/10,000 of a dollar, subtracts, computes percentages, rounds and formats. Floats never touch money anywhere. The gateway computes quote changes against the previous close. Clients use the same module only for values that depend on live data on the device, such as the change across a chart range at the live point or at a scrubbed point. We send pre-rounded strings because Hermes converts a decimal string to a float before formatting it, so an unrounded string would not be safe on mobile. A string that already carries exactly the digits we show survives that conversion unchanged, so web and mobile always display the same value. The chart converts prices to numbers only for drawing.

Times on the wire are UTC epoch milliseconds. Market times, such as the chart axis and "as of" labels, are displayed in New York time with an ET label, which is the convention for US markets wherever the user is.

## Considered options

- **Integer minor units on the wire:** exact, but every client then needs scale-aware formatting, and sub-dollar prices need a second scale.
- **Unrounded decimal strings, formatted on the client:** looks safe but is not on Hermes.
- **The gateway precomputes every change, including per bar:** cannot cover the live point, whose range change moves with every tick on the device, so clients would need a second implementation anyway.
