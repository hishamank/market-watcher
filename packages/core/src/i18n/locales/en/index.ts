import { chaosStrings } from "./chaos.ts";
import { detailStrings } from "./detail.ts";
import { listStrings } from "./list.ts";
import { searchStrings } from "./search.ts";
import { shellStrings } from "./shell.ts";
import { watchlistStrings } from "./watchlist.ts";

export const en = {
  ...shellStrings,
  ...listStrings,
  ...watchlistStrings,
  ...detailStrings,
  ...searchStrings,
  ...chaosStrings,
} as const;

type PluralSuffix = "zero" | "one" | "two" | "few" | "many" | "other";

type StripPluralSuffix<Key extends string> = Key extends `${infer Base}_${PluralSuffix}`
  ? Base
  : Key;

export type MessageKey = StripPluralSuffix<keyof typeof en>;

export type TranslationValues = Readonly<Record<string, string | number>>;

export type Translate = (key: MessageKey, values?: TranslationValues) => string;
