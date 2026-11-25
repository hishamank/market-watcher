export interface HighlightParts {
  readonly before: string;
  readonly match: string;
  readonly after: string;
}

const ALPHANUMERIC = /[a-z0-9]/i;

function findMatchIndex(lowerText: string, needle: string, mode: "prefix" | "word"): number {
  if (mode === "prefix") {
    return lowerText.startsWith(needle) ? 0 : -1;
  }
  let index = lowerText.indexOf(needle);
  while (index !== -1) {
    if (index === 0 || !ALPHANUMERIC.test(lowerText[index - 1] ?? "")) {
      return index;
    }
    index = lowerText.indexOf(needle, index + 1);
  }
  return -1;
}

export function splitHighlight(
  text: string,
  query: string,
  mode: "prefix" | "word",
): HighlightParts {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return { before: text, match: "", after: "" };
  }
  const index = findMatchIndex(text.toLowerCase(), needle, mode);
  if (index === -1) {
    return { before: text, match: "", after: "" };
  }
  return {
    before: text.slice(0, index),
    match: text.slice(index, index + needle.length),
    after: text.slice(index + needle.length),
  };
}
