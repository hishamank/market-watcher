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
    stale: "stale",
    textSecondary: "secondary",
    fill: "fill",
    staleTint: "tint",
  }),
}));
vi.mock("./star-button.tsx", () => ({ StarButton: () => null }));
vi.mock("./flash-ring.tsx", () => ({ FlashRing: () => null }));

function elements(node: ReactNode): React.ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<Record<string, unknown>>(child)
      ? [child, ...elements(child.props["children"] as ReactNode)]
      : [],
  );
}

test("last-known mobile row maps the clock, neutral pill and detail explanation", () => {
  const props = {
    testID: "stock-row-AAPL",
    symbol: "AAPL",
    name: "Apple",
    price: "101.00",
    change: "1.00",
    changePercent: "1.00",
    asOf: "Price as of Nov 25, 16:00 ET",
    stale: false,
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
  ).toBe("Apple, AAPL, $101.00, +1.00, +1.00%, Price as of Nov 25, 16:00 ET");
  expect(row.find((element) => element.type === PriceText)?.props).toMatchObject({
    asOf: props.asOf,
    stale: false,
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
      stale: false,
      asOf: props.asOf,
      testID: "stock-row-price-AAPL",
    }),
  );
  expect(
    price.find((element) => element.props["testID"] === "stock-row-as-of-AAPL")?.props["style"],
  ).toMatchObject({ color: "stale", fontSize: 14 });
  const detail = elements(
    DetailHeader({
      ...props,
      rangeChange: { change: "1.00", changePercent: "1.00" },
      rangeLabel: "Today",
      asOfHelp: "Waiting for the latest price.",
    }),
  );
  expect(detail.find((element) => element.type === QuoteAsOf)?.props).toEqual({
    label: props.asOf,
    help: "Waiting for the latest price.",
  });
  expect(
    elements(QuoteAsOf({ label: props.asOf, help: "Waiting for the latest price." }))[0]?.props[
      "testID"
    ],
  ).toBe("detail-price-as-of");
});
