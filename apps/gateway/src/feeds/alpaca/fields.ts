export type Fields = Readonly<Record<string, unknown>>;

export function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function text(fields: Fields, key: string): string | undefined {
  const value = fields[key];
  return typeof value === "string" ? value : undefined;
}

export function nested(fields: Fields, key: string): Fields | undefined {
  const value = fields[key];
  return isFields(value) ? value : undefined;
}

export function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function epochMs(iso: string | undefined): number | undefined {
  if (iso === undefined) {
    return undefined;
  }
  const trimmed = iso.replace(/(\.\d{3})\d+/, "$1");
  const time = Date.parse(trimmed);
  return Number.isFinite(time) ? time : undefined;
}
