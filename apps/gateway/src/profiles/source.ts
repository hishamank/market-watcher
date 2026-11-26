import type { CompanyProfile } from "@mini/contracts";

export interface ProfileSource {
  load(symbol: string, signal: AbortSignal): Promise<CompanyProfile | null>;
}
