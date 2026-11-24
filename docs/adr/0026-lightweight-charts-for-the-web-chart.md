# TradingView Lightweight Charts for the web chart

The web chart uses TradingView Lightweight Charts. It is canvas-based and built for streaming price data: `update()` replaces or appends the last point without redrawing the series, so a tick never goes through React. It has a crosshair for scrubbing and supports blank points, so the 1D axis can span the whole session. It lives in the app's `integrations/` folder, the one place effects are allowed. Its licence requires attribution, which we meet with its logo option on the chart and the notice in the README. Line and area series only, no candlesticks.

## Considered options

- **Recharts:** SVG rendered through React, so every tick re-renders chart components.
- **uPlot:** fast, but general-purpose and with no release since March 2025.
