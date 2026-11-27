export const UNKNOWN_REVISION = "unknown";

const COMMIT = /^[0-9a-f]{7,40}$/;

export function parseRevision(value: string | undefined): string {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return COMMIT.test(trimmed) ? trimmed : UNKNOWN_REVISION;
}
