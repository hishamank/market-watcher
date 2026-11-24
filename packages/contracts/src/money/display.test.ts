import { describe, expect, it } from "vitest";
import { formatChange, formatPercent, formatPrice } from "./format.ts";
import { displayDecimals, roundPercent, roundToDisplay } from "./money.ts";

describe("display precision", () => {
  it("uses two decimals at or above $1 and four below", () => {
    expect(displayDecimals("1")).toBe(2);
    expect(displayDecimals("187.42")).toBe(2);
    expect(displayDecimals("0.9999")).toBe(4);
    expect(displayDecimals("0.0012")).toBe(4);
  });

  it.each([
    ["0.99995", "1.00"],
    ["0.99994", "0.9999"],
    ["0.999949", "0.9999"],
    ["1.00005", "1.00"],
    ["1.004999", "1.00"],
    ["1.005", "1.01"],
    ["0.12345", "0.1235"],
    ["187.425", "187.43"],
    ["187.4249", "187.42"],
    ["7", "7.00"],
    ["0.5", "0.5000"],
    ["123456789012345678.995", "123456789012345679.00"],
  ])("rounds price %s to %s", (input, expected) => {
    expect(roundToDisplay(input)).toBe(expected);
  });

  it("rounds negatives half away from zero", () => {
    expect(roundToDisplay("-1.005")).toBe("-1.01");
    expect(roundToDisplay("-1.004")).toBe("-1.00");
    expect(roundToDisplay("-0.00005")).toBe("-0.0001");
  });

  it("rounds a change at the price's precision, not its own", () => {
    expect(roundToDisplay("0.0123", "150")).toBe("0.01");
    expect(roundToDisplay("0.0123", "0.5")).toBe("0.0123");
    expect(roundToDisplay("-0.004", "150")).toBe("0.00");
  });

  it("is idempotent on pre-rounded wire strings", () => {
    for (const value of ["1.00", "0.9999", "187.42", "0.0001"]) {
      expect(roundToDisplay(value)).toBe(value);
    }
  });

  it("rounds percent to two decimals", () => {
    expect(roundPercent("1.235")).toBe("1.24");
    expect(roundPercent("-1.235")).toBe("-1.24");
    expect(roundPercent("-0.004")).toBe("0.00");
    expect(roundPercent("12")).toBe("12.00");
  });
});

describe("format", () => {
  it("formats a price with the dollar sign and thousands separators", () => {
    expect(formatPrice("187.42")).toBe("$187.42");
    expect(formatPrice("1234567.89")).toBe("$1,234,567.89");
    expect(formatPrice("0.0012")).toBe("$0.0012");
    expect(formatPrice("1000.00")).toBe("$1,000.00");
    expect(formatPrice("999.99")).toBe("$999.99");
  });

  it("keeps the digits it is given", () => {
    expect(formatChange("0.01")).toBe("+$0.01");
    expect(formatPrice("1.0000")).toBe("$1.0000");
  });

  it("signs a change and a percent", () => {
    expect(formatChange("2.58")).toBe("+$2.58");
    expect(formatChange("-2.58")).toBe("-$2.58");
    expect(formatChange("-1234.50")).toBe("-$1,234.50");
    expect(formatPercent("1.36")).toBe("+1.36%");
    expect(formatPercent("-1.36")).toBe("-1.36%");
    expect(formatPercent("1250.00")).toBe("+1,250.00%");
  });

  it("never signs zero", () => {
    expect(formatChange("0.00")).toBe("$0.00");
    expect(formatChange("-0.00")).toBe("$0.00");
    expect(formatPercent("-0.00")).toBe("0.00%");
    expect(formatPrice("-0.0000")).toBe("$0.0000");
  });

  it("rejects strings that are not decimals", () => {
    expect(() => formatPrice("1e3")).toThrow(RangeError);
    expect(() => formatPercent("12%")).toThrow(RangeError);
  });
});
