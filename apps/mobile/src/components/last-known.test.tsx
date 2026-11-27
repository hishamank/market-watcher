import { Children, isValidElement, type ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { StockRow } from "./stock-row.tsx";
import { DetailHeader } from "./detail-header.tsx";
import { PriceText } from "./price-text.tsx";
import { QuoteAsOf } from "./quote-as-of.tsx";
import { ChangePill } from "./change-pill.tsx";

vi.mock("react-native", () => ({
  Text: "Text",
  View: "View",
  Pressable: "Pressable",
  StyleSheet: { create: (styles: object) => styles, hairlineWidth: 1 },
}));
vi.mock("../theme/palette.ts", () => ({
  usePalette: () => ({
    text: "text",
    textMuted: "muted",
    stale: "stale",
    textSecondary: "secondary",
    fill: "fill",
    staleTint: "tint",
  }),
}));
vi.mock("@mini/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@mini/core")>()),
  useLocale: () => "en-US",
}));
vi.mock("./star-button.tsx", () => ({ StarButton: () => null }));
vi.mock("./flash-tint.tsx", () => ({ FlashTint: () => null }));

function elements(node: ReactNode): React.ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<Record<string, unknown>>(child)
      ? [child, ...elements(child.props["children"] as ReactNode)]
      : [],
  );
}

test.each([
  { asOf: "Price as of Nov 25, 16:00 ET", stale: false, help: "Waiting for the latest price." },
  { asOf: "Current price unavailable", stale: true, help: "This symbol has no current quote." },
])(
  "mobile warning $asOf maps the clock, price tone and detail explanation",
  ({ asOf, stale, help }) => {
    const props = {
      testID: "stock-row-AAPL",
      symbol: "AAPL",
      name: "Apple",
      price: "101.00",
      change: "1.00",
      changePercent: "1.00",
      asOf,
      stale,
      flash: undefined,
      flashKey: undefined,
      starred: false,
      onOpen: () => undefined,
      onToggleStar: () => undefined,
    };
    const row = elements(StockRow(props));
    expect(
      row.find((element) => element.props["accessibilityRole"] === "link")?.props[
        "accessibilityLabel"
      ],
    ).toBe(`Apple, AAPL, $101.00, +1.00, +1.00%, ${asOf}`);
    expect(row.find((element) => element.type === PriceText)?.props).toMatchObject({
      asOf: props.asOf,
      stale,
    });
    expect(row.find((element) => element.type === ChangePill)?.props).toMatchObject({
      stale: true,
      change: "1.00",
      changePercent: "1.00",
    });
    expect(
      row.some((element) => String(element.props["accessibilityLabel"]).includes(props.asOf)),
    ).toBe(true);
    const price = elements(
      PriceText({
        price: props.price,
        stale,
        asOf: props.asOf,
        testID: "stock-row-price-AAPL",
      }),
    );
    expect(
      price.find((element) => element.props["testID"] === "stock-row-as-of-AAPL")?.props["style"],
    ).toMatchObject({ color: "stale", fontSize: 14 });
    expect(
      price.find((element) => element.props["testID"] === "stock-row-price-AAPL")?.props["style"],
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: stale ? "muted" : "text" })]),
    );
    const detail = elements(
      DetailHeader({
        ...props,
        rangeChange: { change: "1.00", changePercent: "1.00" },
        rangeLabel: "Today",
        asOfHelp: help,
      }),
    );
    expect(detail.find((element) => element.type === QuoteAsOf)?.props).toEqual({
      label: props.asOf,
      help,
    });
    expect(elements(QuoteAsOf({ label: props.asOf, help }))[0]?.props["testID"]).toBe(
      "detail-price-as-of",
    );
  },
);
