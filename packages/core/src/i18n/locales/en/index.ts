import { profileStrings } from "./profile.ts";
import { chaosStrings } from "./chaos.ts";
import { detailStrings } from "./detail.ts";
import { listStrings } from "./list.ts";
import { searchStrings } from "./search.ts";
import { shellStrings } from "./shell.ts";
import { watchlistStrings } from "./watchlist.ts";

export const en = {
  ...profileStrings,
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

export type Translation<Strings> = {
  [
    Key in keyof Strings as Key extends `${infer Base}_${PluralSuffix}`
      ? `${Base}_${PluralSuffix}`
      : Key
  ]: string;
};

export type MessageKey = StripPluralSuffix<keyof typeof en>;

export type TranslationValues = Readonly<Record<string, string | number>>;

export type Translate = (key: MessageKey, values?: TranslationValues) => string;
