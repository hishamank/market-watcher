import { z } from "zod";
import { EpochMsSchema, SymbolSchema } from "./primitives.ts";

const ProfileTextSchema = z.string().trim().min(1).max(300);

export const CompanyProfileSchema = z.object({
  kind: z.enum(["company", "fund"]),
  description: z.string().trim().min(1).max(20_000).nullable(),
  sector: ProfileTextSchema.nullable(),
  industry: ProfileTextSchema.nullable(),
  exchange: ProfileTextSchema.nullable(),
  website: z
    .object({
      url: z.url({ protocol: /^https?$/ }).max(2_000),
      label: ProfileTextSchema,
    })
    .nullable(),
});

export const CompanyProfileResponseSchema = z.object({
  symbol: SymbolSchema,
  source: z.enum(["yahoo", "simulated"]),
  fetchedAt: EpochMsSchema,
  profile: CompanyProfileSchema.nullable(),
});

export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;
export type CompanyProfileResponse = z.infer<typeof CompanyProfileResponseSchema>;
