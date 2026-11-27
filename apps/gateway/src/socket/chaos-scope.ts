import { type ChaosScope, ChaosScopeSchema } from "@mini/contracts";

export class ChaosScopeError extends Error {}

export function parseChaosScope(value: string | undefined): ChaosScope {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed === "") {
    return "global";
  }
  const parsed = ChaosScopeSchema.safeParse(trimmed);
  if (!parsed.success) {
    throw new ChaosScopeError(
      `CHAOS_SCOPE=${trimmed} is not a chaos scope. Use CHAOS_SCOPE=global or CHAOS_SCOPE=connection.`,
    );
  }
  return parsed.data;
}
