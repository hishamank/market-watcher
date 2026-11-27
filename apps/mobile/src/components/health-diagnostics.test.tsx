import type { ConnectionHealth } from "@mini/core";
import { Children, isValidElement, type ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { HealthDiagnostics } from "./health-diagnostics.tsx";

vi.mock("react-native", () => ({
  ScrollView: "ScrollView",
  View: "View",
  Text: "Text",
  StyleSheet: { create: (styles: object) => styles },
}));
vi.mock("../theme/palette.ts", () => ({ usePalette: () => ({ text: "text" }) }));
vi.mock("../theme/text-styles.ts", () => ({ useTextStyles: () => ({ caption: {} }) }));

function render(diagnostics: ConnectionHealth["diagnostics"]) {
  const viewport = HealthDiagnostics({ diagnostics });
  const text = Children.only(viewport.props.children);
  if (!isValidElement<{ children?: ReactNode; style: unknown[] }>(text)) {
    throw new Error("Missing diagnostic text");
  }
  return { viewport, text };
}

test("diagnostic lines retain JSON content and leave scrolling to the sheet", () => {
  const diagnostics: ConnectionHealth["diagnostics"] = {
    transportStatus: "connected",
    socketOpen: true,
    handshakeComplete: true,
    recoverySettled: true,
    queuedMessages: 0,
    pendingSubscriptions: [],
    symbols: [{ symbol: "AAPL", availability: "available", lastKnown: false }],
    lastRecoveryReason: null,
    lastGatewayError: null,
  };
  const { viewport, text } = render(diagnostics);
  expect(viewport.type).toBe("View");
  expect(viewport.props.style).toEqual({ direction: "ltr" });
  expect(text.props.style).toContainEqual({ textAlign: "left", writingDirection: "ltr" });
  const lines = String(text.props.children).split("\n");
  expect(lines.every((line) => line.startsWith("\u2066") && line.endsWith("\u2069"))).toBe(true);
  expect(lines.map((line) => line.slice(1, -1)).join("\n")).toBe(
    JSON.stringify(diagnostics, null, 2),
  );
});

test("the initial health snapshot can render before diagnostics are available", () => {
  expect(render(undefined).text.props.children).toBeUndefined();
});
