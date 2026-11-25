import { RangeSchema, type Range } from "@mini/contracts";

export function parseRange(value: unknown): Range {
  return RangeSchema.safeParse(value).data ?? "1D";
}
