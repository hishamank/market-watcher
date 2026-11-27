import { parseServerFrame } from "@mini/contracts";
import type { Page } from "@playwright/test";

export async function interceptAvailability(page: Page) {
  let phase: "recovering" | "unavailable" | "last-known" | "available" = "recovering";
  const terminals: (() => void)[] = [];
  await page.routeWebSocket(
    (url) => url.pathname === "/ws",
    (socket) => {
      const server = socket.connectToServer();
      server.onMessage((raw) => {
        const parsed = parseServerFrame(raw.toString());
        if (!parsed.ok) throw new Error("Invalid gateway frame");
        const message = parsed.message;
        if (message.type !== "snapshot" && message.type !== "quotes") {
          socket.send(raw);
          return;
        }
        if (message.type === "snapshot" && message.quotes.some((q) => q.symbol === "AAPL")) {
          const settle = () => {
            socket.send(
              JSON.stringify({
                type: "error",
                code: "unavailable",
                requestId: message.requestId,
                symbols: ["AAPL"],
                message: "Availability regression fixture",
              }),
            );
            socket.send(
              JSON.stringify({
                ...message,
                quotes: message.quotes.filter((q) => q.symbol !== "AAPL"),
              }),
            );
          };
          if (phase === "recovering") terminals.push(settle);
          else settle();
          return;
        }
        const quotes = message.quotes.flatMap((quote) => {
          if (quote.symbol !== "AAPL") return [quote];
          if (phase === "recovering" || phase === "unavailable") return [];
          return [{ ...quote, lastKnown: phase === "last-known" ? (true as const) : undefined }];
        });
        socket.send(JSON.stringify({ ...message, quotes }));
      });
    },
  );
  return {
    pendingSnapshots: () => terminals.length,
    unavailable() {
      phase = "unavailable";
      terminals.splice(0).forEach((settle) => settle());
    },
    lastKnown() {
      phase = "last-known";
    },
    available() {
      phase = "available";
    },
  };
}
