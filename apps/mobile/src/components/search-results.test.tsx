import { Children, isValidElement, type ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { ltr } from "./ltr.ts";
import { SearchResultRow } from "./search-result-row.tsx";
import { SearchResults, type SearchResultsProps } from "./search-results.tsx";
import { SearchMessage, SearchSkeleton } from "./search-states.tsx";
import { StarButton } from "./star-button.tsx";

vi.mock("react-native", () => ({
  Text: "Text",
  View: "View",
  Pressable: "Pressable",
  FlatList: "FlatList",
  StyleSheet: { create: (styles: object) => styles, hairlineWidth: 1 },
}));
vi.mock("../theme/palette.ts", () => ({ usePalette: () => ({}) }));
vi.mock("../theme/text-styles.ts", () => ({ useTextStyles: () => ({}) }));
vi.mock("@mini/core", () => ({
  useT: () => (key: string, params?: object) => (params ? `${key} ${JSON.stringify(params)}` : key),
}));
vi.mock("./star-button.tsx", () => ({ StarButton: () => null }));
vi.mock("./button.tsx", () => ({ Button: () => null }));
vi.mock("./skeleton.tsx", () => ({ SkeletonBlock: () => null }));
vi.mock("./icon.tsx", () => ({ Icon: () => null }));

type Element = React.ReactElement<Record<string, unknown>>;

function elements(node: ReactNode): Element[] {
  return Children.toArray(node).flatMap((child) =>
    isValidElement<Record<string, unknown>>(child)
      ? [child, ...elements(child.props["children"] as ReactNode)]
      : [],
  );
}

const apple = { symbol: "AAPL", name: "Apple Inc." };
const amazon = { symbol: "AMZN", name: "Amazon.com, Inc." };

function props(overrides: Partial<SearchResultsProps>): SearchResultsProps {
  return {
    status: "success",
    query: "a",
    results: [apple, amazon],
    starred: () => false,
    onOpen: vi.fn(),
    onToggleStar: vi.fn(),
    onRetry: vi.fn(),
    ...overrides,
  };
}

function rendered(overrides: Partial<SearchResultsProps>): Element {
  const node = SearchResults(props(overrides));
  if (!isValidElement<Record<string, unknown>>(node)) throw new Error("no element");
  return node;
}

test("search states map to their views, and Retry calls the hook's retry", () => {
  const idle = rendered({ status: "idle" });
  expect(idle.type).toBe(SearchMessage);
  expect(idle.props).toMatchObject({ testID: "search-idle", title: "search.idle.title" });
  expect(rendered({ status: "loading" }).type).toBe(SearchSkeleton);
  expect(rendered({ results: [] }).props).toMatchObject({
    testID: "search-no-results",
    title: 'search.noResults.title {"query":"a"}',
  });
  const onRetry = vi.fn();
  const error = rendered({ status: "error", onRetry });
  const action = error.props["action"] as { testID: string; onPress: () => void };
  expect(error.props["testID"]).toBe("search-error");
  expect(action.testID).toBe("search-retry");
  action.onPress();
  expect(onRetry).toHaveBeenCalledOnce();
});

test("results keep the first tap, open the symbol and share the watchlist star", () => {
  const onOpen = vi.fn();
  const onToggleStar = vi.fn();
  const list = rendered({
    starred: (symbol) => (symbol === "AAPL" ? true : undefined),
    onOpen,
    onToggleStar,
  });
  expect(list.props["keyboardShouldPersistTaps"]).toBe("handled");
  const renderItem = list.props["renderItem"] as (info: { item: typeof apple }) => Element;
  const appleRow = renderItem({ item: apple });
  expect(appleRow.type).toBe(SearchResultRow);
  expect(appleRow.props["starred"]).toBe(true);
  expect(renderItem({ item: amazon }).props["starred"]).toBeUndefined();
  (appleRow.props["onOpen"] as () => void)();
  (appleRow.props["onToggleStar"] as () => void)();
  expect(onOpen).toHaveBeenCalledWith("AAPL");
  expect(onToggleStar).toHaveBeenCalledWith("AAPL");
});

test("a result row shows the symbol and name left to right with its star", () => {
  const onToggleStar = vi.fn();
  const row = elements(
    SearchResultRow({ match: apple, starred: false, onOpen: vi.fn(), onToggleStar }),
  );
  expect(row[0]?.props["testID"]).toBe("search-result-AAPL");
  const texts = row.filter((element) => element.type === "Text").map((t) => t.props["children"]);
  expect(texts).toEqual([ltr("AAPL"), ltr("Apple Inc.")]);
  expect(row.find((element) => element.type === StarButton)?.props).toMatchObject({
    testID: "search-result-star-AAPL",
    starred: false,
    onToggle: onToggleStar,
  });
});
