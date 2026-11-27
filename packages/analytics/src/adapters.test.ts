import { describe, expect, it } from "vitest";
import { createConsoleAnalytics } from "./adapters.ts";

describe("console analytics", () => {
  it("logs the event name with its properties, the platform and the context", () => {
    const lines: [string, Readonly<Record<string, unknown>>][] = [];
    const adapter = createConsoleAnalytics({
      platform: "web",
      log: (label, payload) => void lines.push([label, payload]),
    });

    adapter.track(
      { name: "range_changed", symbol: "AAPL", range: "1Y" },
      { locale: "en-US", feedMode: "simulated" },
    );

    expect(lines).toEqual([
      [
        "[analytics] range_changed",
        { symbol: "AAPL", range: "1Y", platform: "web", locale: "en-US", feedMode: "simulated" },
      ],
    ]);
  });
});
