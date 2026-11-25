import { epochMs, type Fields, isFields, list, text } from "./fields.ts";
import { parseExactJson } from "./http.ts";

export type StreamEvent =
  | { readonly kind: "connected" }
  | { readonly kind: "authenticated" }
  | { readonly kind: "error"; readonly code: string | undefined; readonly msg: string | undefined }
  | {
      readonly kind: "trade";
      readonly symbol: string;
      readonly price: string;
      readonly time: number;
    };

function toEvent(item: Fields): StreamEvent | undefined {
  const kind = text(item, "T");
  const msg = text(item, "msg");
  if (kind === "success" && (msg === "connected" || msg === "authenticated")) {
    return { kind: msg };
  }
  if (kind === "error") {
    return { kind: "error", code: text(item, "code"), msg };
  }
  const symbol = text(item, "S");
  const price = text(item, "p");
  const time = epochMs(text(item, "t"));
  if (kind === "t" && symbol !== undefined && price !== undefined && time !== undefined) {
    return { kind: "trade", symbol, price, time };
  }
  return undefined;
}

export function parseStreamMessage(data: string): StreamEvent[] {
  let items: unknown[];
  try {
    items = list(parseExactJson(data));
  } catch {
    return [];
  }
  return items.flatMap((item) => {
    const event = isFields(item) ? toEvent(item) : undefined;
    return event === undefined ? [] : [event];
  });
}
