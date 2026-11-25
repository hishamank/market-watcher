import { parseExact } from "./decimal.ts";

type Parts = { readonly sign: "" | "+" | "-"; readonly magnitude: string };

function groupThousands(whole: string): string {
  const groups: string[] = [];
  for (let end = whole.length; end > 0; end -= 3) {
    groups.unshift(whole.slice(end > 3 ? end - 3 : 0, end));
  }
  return groups.join(",");
}

function grouped(magnitude: string): string {
  const point = magnitude.indexOf(".");
  if (point === -1) {
    return groupThousands(magnitude);
  }
  return `${groupThousands(magnitude.slice(0, point))}${magnitude.slice(point)}`;
}

function parts(display: string, positiveSign: "" | "+"): Parts {
  const { digits } = parseExact(display);
  const magnitude = display.startsWith("-") ? display.slice(1) : display;
  if (digits === 0n) {
    return { sign: "", magnitude };
  }
  return { sign: digits < 0n ? "-" : positiveSign, magnitude };
}

export function formatPrice(display: string): string {
  const { sign, magnitude } = parts(display, "");
  return `${sign}$${grouped(magnitude)}`;
}

export function formatChange(display: string): string {
  const { sign, magnitude } = parts(display, "+");
  return `${sign}$${grouped(magnitude)}`;
}

export function formatPercent(display: string): string {
  const { sign, magnitude } = parts(display, "+");
  return `${sign}${grouped(magnitude)}%`;
}
