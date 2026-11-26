import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { StockRow } from "./stock-row.tsx";
import { DetailHeader } from "./detail-header.tsx";

vi.mock("./star-button.tsx", () => ({ StarButton: () => null }));
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => createElement("a", {}, children),
}));

test("last-known row and detail show a clock, neutral signed change and visible explanation", () => {
  const props = {
    symbol: "AAPL",
    name: "Apple",
    price: "101.00",
    change: "1.00",
    changePercent: "1.00",
    previousClose: "100.00",
    lastUpdate: "Nov 25, 16:00 ET",
    asOf: "Price as of Nov 25, 16:00 ET",
    stale: false,
    flash: undefined,
    flashKey: undefined,
    starred: false,
    onToggleStar: () => undefined,
  };
  const row = renderToStaticMarkup(<StockRow {...props} />);
  expect(row).toContain('data-testid="stock-row-as-of-AAPL"');
  expect(row).toContain('title="Price as of Nov 25, 16:00 ET"');
  expect(row).toContain("ET, </span>");
  expect(row).toContain("bg-fill text-text-secondary");
  expect(row).toContain("+1.00");
  expect(row).toContain("text-numeric-price text-text");
  const stale = renderToStaticMarkup(<StockRow {...props} stale flash="up" />);
  expect(stale).toContain('data-testid="stock-row-as-of-AAPL"');
  expect(stale).toContain("text-numeric-price text-text-muted");
  expect(stale).not.toContain("animate-flash");
  const detail = renderToStaticMarkup(
    <DetailHeader
      {...props}
      rangeChange={{ change: "1.00", changePercent: "1.00" }}
      changeLoading={false}
      rangeLabel="Today"
      asOfHelp="Waiting for the latest price."
    />,
  );
  expect(detail).toContain('data-testid="detail-price-as-of"');
  expect(detail).toContain("Waiting for the latest price.");
  expect(detail).toContain(props.asOf);
});
