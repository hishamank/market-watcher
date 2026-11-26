import { describe, expect, it } from "vitest";
import { changeBetween, fromUnits, percentChange, subtract, toUnits, widenRange } from "./money.ts";

describe("units of 1/10,000 dollar", () => {
  it("parses decimal strings into exact units", () => {
    expect(toUnits("1")).toBe(10_000n);
    expect(toUnits("187.42")).toBe(1_874_200n);
    expect(toUnits("0.0001")).toBe(1n);
    expect(toUnits("-2.5")).toBe(-25_000n);
  });

  it("rounds a fifth decimal half away from zero", () => {
    expect(toUnits("0.00005")).toBe(1n);
    expect(toUnits("0.000049")).toBe(0n);
    expect(toUnits("-0.00005")).toBe(-1n);
    expect(toUnits("0.99995")).toBe(10_000n);
  });

  it("formats units back with four decimals", () => {
    expect(fromUnits(1_874_200n)).toBe("187.4200");
    expect(fromUnits(1n)).toBe("0.0001");
    expect(fromUnits(-25_000n)).toBe("-2.5000");
    expect(fromUnits(0n)).toBe("0.0000");
  });

  it("round-trips every four-decimal string", () => {
    for (const value of ["0.0000", "0.1234", "1.0000", "-0.0500", "98765.4321"]) {
      expect(fromUnits(toUnits(value))).toBe(value);
    }
  });

  it.each(["", " 1", "1 ", "1e3", "1.", ".5", "+1", "1,000", "01", "0x10", "NaN", "-"])(
    "rejects %j",
    (input) => {
      expect(() => toUnits(input)).toThrow(RangeError);
    },
  );
});

describe("no float path", () => {
  it("subtracts exactly where floats drift", () => {
    expect(0.3 - 0.1).not.toBe(0.2);
    expect(subtract("0.3", "0.1")).toBe("0.2000");
    expect(subtract("0.1", "0.3")).toBe("-0.2000");
    expect(subtract("1.1", "1.0")).toBe("0.1000");
  });

  it("keeps cents on values above 2^53", () => {
    expect(String(Number("9007199254740993.01"))).not.toBe("9007199254740993.01");
    expect(subtract("9007199254740993.01", "0.01")).toBe("9007199254740993.0000");
    expect(toUnits("90071992547409930.0001")).toBe(900719925474099300001n);
  });

  it("computes percent change without rounding error", () => {
    expect(percentChange("0.3", "0.33")).toBe("10.00");
    expect(percentChange("3", "1")).toBe("-66.67");
    expect(percentChange("123456789012345.67", "246913578024691.34")).toBe("100.00");
  });
});

describe("percent change", () => {
  it("rounds to two decimals half away from zero", () => {
    expect(percentChange("8", "8.0001")).toBe("0.00");
    expect(percentChange("8", "8.0004")).toBe("0.01");
    expect(percentChange("8", "7.9996")).toBe("-0.01");
    expect(percentChange("200", "200.01")).toBe("0.01");
  });

  it("never reports negative zero", () => {
    expect(percentChange("100", "99.9999")).toBe("0.00");
  });

  it("throws on a zero base", () => {
    expect(() => percentChange("0", "1")).toThrow(RangeError);
  });
});

describe("changeBetween", () => {
  it("measures a negative day change", () => {
    expect(changeBetween("190.00", "187.42")).toEqual({
      change: "-2.58",
      changePercent: "-1.36",
    });
  });

  it("keeps four decimals for a sub-dollar price", () => {
    expect(changeBetween("0.4512", "0.4387")).toEqual({
      change: "-0.0125",
      changePercent: "-2.77",
    });
  });

  it("follows the current price's precision across $1", () => {
    expect(changeBetween("0.95", "1.02")).toEqual({ change: "0.07", changePercent: "7.37" });
    expect(changeBetween("1.02", "0.95")).toEqual({ change: "-0.0700", changePercent: "-6.86" });
  });

  it("reports a flat change as unsigned zero", () => {
    expect(changeBetween("150.004", "150.00")).toEqual({ change: "0.00", changePercent: "0.00" });
  });
});

describe("day range", () => {
  it("starts at the first price", () => {
    expect(widenRange(undefined, "187.42")).toEqual({ low: "187.42", high: "187.42" });
  });

  it("compares by value, not by text", () => {
    const range = widenRange(widenRange(undefined, "9.99"), "10.00");
    expect(widenRange(range, "0.9990")).toEqual({ low: "0.9990", high: "10.00" });
  });

  it("keeps a range that already holds the price", () => {
    const range = { low: "186.10", high: "191.25" };
    expect(widenRange(range, "187.42")).toBe(range);
  });
});
