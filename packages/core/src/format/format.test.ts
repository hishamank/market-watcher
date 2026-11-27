import { afterEach, describe, expect, it, vi } from "vitest";
import {
  directionOf,
  formatMarketDate,
  formatMarketDateTime,
  formatMarketTime,
  formatPrice,
  formatSignedAmount,
  formatSignedChange,
  formatSignedPercent,
} from "../index.ts";

describe("money formatters", () => {
  it("formats prices with 2 decimals at or above $1 and 4 below per ADR 0037", () => {
    expect(formatPrice("1")).toBe("$1.00");
    expect(formatPrice("1.00")).toBe("$1.00");
    expect(formatPrice("187.42")).toBe("$187.42");
    expect(formatPrice("1234567.89")).toBe("$1,234,567.89");
    expect(formatPrice("0.99995")).toBe("$1.00");
    expect(formatPrice("0.9999")).toBe("$0.9999");
    expect(formatPrice("0.5")).toBe("$0.5000");
    expect(formatPrice("0.0012")).toBe("$0.0012");
    expect(formatPrice("9007199254740993.01")).toBe("$9,007,199,254,740,993.01");
  });

  it("formats signed changes and amounts with U+2212 minus and unsigned zero", () => {
    expect(formatSignedChange("2.58")).toBe("+$2.58");
    expect(formatSignedChange("-2.58")).toBe(`\u2212$2.58`);
    expect(formatSignedChange("0.00")).toBe("$0.00");
    expect(formatSignedChange("-0.00")).toBe("$0.00");
    expect(formatSignedChange("0.0123", "150.00")).toBe("+$0.01");
    expect(formatSignedChange("0.0123", "0.5000")).toBe("+$0.0123");

    expect(formatSignedAmount("2.58")).toBe("+2.58");
    expect(formatSignedAmount("-2.58")).toBe(`\u22122.58`);
    expect(formatSignedAmount("0.00")).toBe("0.00");
    expect(formatSignedAmount("-0.00")).toBe("0.00");
    expect(formatSignedAmount("-0.0125", "0.4387")).toBe(`\u22120.0125`);
  });

  it("formats signed percents with 2 decimals and U+2212 minus", () => {
    expect(formatSignedPercent("1.36")).toBe("+1.36%");
    expect(formatSignedPercent("-1.36")).toBe(`\u22121.36%`);
    expect(formatSignedPercent("0.00")).toBe("0.00%");
    expect(formatSignedPercent("-0.00")).toBe("0.00%");
    expect(formatSignedPercent("1.235")).toBe("+1.24%");
    expect(formatSignedPercent("-1.235")).toBe(`\u22121.24%`);
    expect(formatSignedPercent("1250")).toBe("+1,250.00%");
  });

  it("derives up, down and flat direction from exact units", () => {
    expect(directionOf("0.0001")).toBe("up");
    expect(directionOf("-0.0001")).toBe("down");
    expect(directionOf("0.00")).toBe("flat");
    expect(directionOf("-0.00")).toBe("flat");
  });
});

describe("market time formatters", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("formats ET times and dates consistently across EST and EDT", () => {
    const estInstant = Date.UTC(2026, 10, 25, 18, 40, 0);
    const edtInstant = Date.UTC(2026, 6, 15, 13, 30, 0);

    expect(formatMarketTime(estInstant)).toBe("13:40 ET");
    expect(formatMarketTime(estInstant, { label: false })).toBe("13:40");
    expect(formatMarketDate(estInstant)).toBe("Nov 25");
    expect(formatMarketDate(estInstant, { includeYear: true })).toBe("Nov 25, 2026");
    expect(formatMarketDateTime(estInstant)).toBe("Nov 25, 13:40 ET");

    expect(formatMarketTime(edtInstant)).toBe("09:30 ET");
    expect(formatMarketDateTime(edtInstant)).toBe("Jul 15, 09:30 ET");
    expect(formatMarketTime(estInstant, { locale: "ar" })).toBe("13:40 ET");
  });

  it("produces identical output under different machine time zones", () => {
    const instant = Date.UTC(2026, 10, 25, 18, 40, 0);
    const snapshots = new Map<
      string,
      { localHour: number; time: string; date: string; dateTime: string }
    >();

    for (const tz of ["UTC", "Asia/Tokyo", "America/Los_Angeles"]) {
      vi.stubEnv("TZ", tz);
      snapshots.set(tz, {
        localHour: new Date(instant).getHours(),
        time: formatMarketTime(instant),
        date: formatMarketDate(instant, { includeYear: true }),
        dateTime: formatMarketDateTime(instant),
      });
    }

    const utc = snapshots.get("UTC");
    const tokyo = snapshots.get("Asia/Tokyo");
    const la = snapshots.get("America/Los_Angeles");

    expect(utc?.localHour).not.toBe(tokyo?.localHour);
    expect(tokyo?.localHour).not.toBe(la?.localHour);

    expect(utc?.time).toBe("13:40 ET");
    expect(tokyo?.time).toBe(utc?.time);
    expect(la?.time).toBe(utc?.time);

    expect(utc?.date).toBe("Nov 25, 2026");
    expect(tokyo?.date).toBe(utc?.date);
    expect(la?.date).toBe(utc?.date);

    expect(utc?.dateTime).toBe("Nov 25, 13:40 ET");
    expect(tokyo?.dateTime).toBe(utc?.dateTime);
    expect(la?.dateTime).toBe(utc?.dateTime);
  });
});
